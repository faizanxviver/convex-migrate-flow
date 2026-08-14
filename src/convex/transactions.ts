import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  addTransaction,
  getProfileByUserId,
  getSettings,
  getUserId,
  logAudit,
  pushNotification,
  requireAdmin,
  requireUser,
  round2,
} from "./helpers";

/** Pakistan Standard Time hour (UTC+5, no DST). */
function pakistanHour(at = new Date()) {
  return (at.getUTCHours() + 5) % 24;
}

export const isWithdrawWindowOpen = (open: number, close: number, at = new Date()) => {
  const h = pakistanHour(at);
  return h >= open && h < close;
};

/**
 * Request a manual deposit. The user pays to a listed payment method and may
 * attach a proof screenshot. An admin approves it to credit the balance.
 */
export const requestDeposit = mutation({
  args: {
    amount: v.number(),
    methodId: v.optional(v.id("paymentMethods")),
    methodName: v.optional(v.string()),
    proofUrl: v.optional(v.string()),
  },
  handler: async (ctx, { amount, methodId, methodName, proofUrl }) => {
    const userId = await requireUser(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.blocked) throw new Error("Account suspended");

    const settings = await getSettings(ctx);
    const minDeposit = settings?.minDeposit ?? 1000;
    const amt = Math.round(round2(amount));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
    if (amt < minDeposit) throw new Error(`Minimum deposit is ${fmt(minDeposit)}`);
    if (amt > 10_000_000) throw new Error("Amount is too large");

    let method = methodName;
    if (methodId) {
      const m = await ctx.db.get(methodId);
      method = m?.name ?? method;
    }

    const reference =
      "HX" +
      new Date().toISOString().slice(0, 10).replace(/-/g, "") +
      Math.random().toString(16).slice(2, 8).toUpperCase();

    return await addTransaction(ctx, userId, {
      type: "deposit",
      amount: amt,
      method: method ?? "Manual deposit",
      status: "pending",
      note: "Awaiting admin approval",
      reference,
      proofUrl,
    });
  },
});

/**
 * Request a withdrawal. The amount is held (deducted) immediately and refunded
 * if the admin rejects. Requires an active investment plan and a bound payout
 * account, and only during the configured withdrawal window (PKT).
 */
export const requestWithdraw = mutation({
  args: { amount: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { amount, note }) => {
    const userId = await requireUser(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.blocked) throw new Error("Account suspended");

    const settings = await getSettings(ctx);
    const minWithdraw = settings?.minWithdraw ?? 500;
    const open = settings?.withdrawOpenHour ?? 9;
    const close = settings?.withdrawCloseHour ?? 19;

    const hasPlan = await ctx.db
      .query("investments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!hasPlan) throw new Error("An active investment plan is required to withdraw");

    if (!isWithdrawWindowOpen(open, close))
      throw new Error(
        `Withdrawals are open ${hour12(open)} – ${hour12(close)} Pakistan time. Please try again then.`,
      );

    const amt = round2(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
    if (amt < minWithdraw) throw new Error(`Minimum withdrawal is ${fmt(minWithdraw)}`);
    if (amt > 10_000_000) throw new Error("Amount is too large");

    if (!profile.bankName || !profile.accountNumber || !profile.accountName)
      throw new Error("Bind a payout account in Profile before withdrawing");

    // Deposits are locked — only earnings (plan income, commissions, promos,
    // salary, rewards) are withdrawable: withdrawable = balance − approved deposits.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    const deposited = round2(
      txs
        .filter(
          (t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"),
        )
        .reduce((a, t) => a + t.amount, 0),
    );
    // Locked principal = deposits that haven't been invested into plans yet.
    // Once a deposit is invested it stops being locked, so the first income
    // credited at activation is immediately withdrawable.
    const locked = round2(Math.max(0, deposited - (profile.invested || 0)));
    const withdrawable = round2(Math.max(0, profile.balance - locked));
    if (withdrawable < amt)
      throw new Error(`You can only withdraw your earnings (${fmt(withdrawable)}).`);

    // Hold the funds so pending requests cannot be double spent.
    await ctx.db.patch(profile._id, {
      balance: round2(profile.balance - amt),
      updatedAt: Date.now(),
    });

    // The payout account travels inside `reference` ("Account title · Number")
    // exactly like the original Lovable app, so admins see the user's withdraw
    // details on the review card without an extra lookup.
    return await addTransaction(ctx, userId, {
      type: "withdraw",
      amount: amt,
      method: profile.bankName,
      status: "pending",
      note: note?.trim() || undefined,
      reference: `${profile.accountName} · ${profile.accountNumber}`,
    });
  },
});

/** My ledger, newest first. */
export const myTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Approve or reject a pending deposit / withdrawal. */
export const adminReviewTransaction = mutation({
  args: { id: v.id("transactions"), approve: v.boolean(), note: v.optional(v.string()) },
  handler: async (ctx, { id, approve, note }) => {
    const admin = await requireAdmin(ctx);
    const tx = await ctx.db.get(id);
    if (!tx) throw new Error("Transaction not found");
    if (tx.status !== "pending" && tx.status !== "processing")
      throw new Error("Transaction already reviewed");

    const profile = await getProfileByUserId(ctx, tx.userId);
    if (!profile) throw new Error("User profile not found");
    const now = Date.now();

    if (tx.type === "deposit") {
      if (approve) {
        await ctx.db.patch(tx._id, { status: "approved", note: note?.trim() || "Approved" });
        await ctx.db.patch(profile._id, {
          balance: round2(profile.balance + tx.amount),
          updatedAt: now,
        });
        await pushNotification(
          ctx,
          tx.userId,
          "Deposit approved ✅",
          `${fmt(tx.amount)} was credited to your withdrawable balance.`,
          "success",
          true,
        );
      } else {
        await ctx.db.patch(tx._id, { status: "rejected", note: note?.trim() || "Rejected" });
        await pushNotification(
          ctx,
          tx.userId,
          "Deposit rejected",
          note?.trim() || "Your deposit could not be verified. Contact support.",
          "error",
          true,
        );
      }
    } else if (tx.type === "withdraw") {
      if (approve) {
        // Funds were held at request time; finalise the payout.
        await ctx.db.patch(tx._id, { status: "completed", note: note?.trim() || "Paid" });
        await pushNotification(
          ctx,
          tx.userId,
          "Withdrawal paid 💸",
          `${fmt(tx.amount)} was sent to your ${profile.bankName ?? "payout"} account.`,
          "success",
          true,
        );
      } else {
        // Refund the held balance.
        await ctx.db.patch(tx._id, { status: "rejected", note: note?.trim() || "Rejected" });
        await ctx.db.patch(profile._id, {
          balance: round2(profile.balance + tx.amount),
          updatedAt: now,
        });
        await pushNotification(
          ctx,
          tx.userId,
          "Withdrawal rejected",
          note?.trim() || "Your withdrawal was declined and the amount returned to your balance.",
          "error",
          true,
        );
      }
    } else {
      throw new Error("Only deposits and withdrawals can be reviewed");
    }

    await logAudit(ctx, admin, `${approve ? "Approved" : "Rejected"} ${tx.type}`, {
      targetId: tx.userId,
      targetName: profile.name,
      detail: `${fmt(tx.amount)} · ${tx.method ?? ""}`,
    });
    return tx._id;
  },
});

/** Admin: full ledger, newest first. */
export const adminListTransactions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("transactions").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

function fmt(n: number) {
  return "Rs " + round2(n).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function hour12(h: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}:00 ${suffix}`;
}
