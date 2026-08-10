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

/** Upload a payout screenshot linked to a withdrawal. */
export const submitWithdrawalProof = mutation({
  args: {
    transactionId: v.id("transactions"),
    imageUrl: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { transactionId, imageUrl, amount }) => {
    const userId = await requireUser(ctx);
    const tx = await ctx.db.get(transactionId);
    if (!tx || tx.userId !== userId) throw new Error("Transaction not found");
    if (tx.type !== "withdraw") throw new Error("Proof belongs to a deposit");

    const now = Date.now();
    return await ctx.db.insert("withdrawalProofs", {
      userId,
      transactionId,
      imageUrl,
      amount: round2(amount),
      status: "pending",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Admin review of a payout screenshot. On approval the user earns the small
 * proof reward configured in settings (mirror of review_withdrawal_proof).
 */
export const reviewWithdrawalProof = mutation({
  args: { id: v.id("withdrawalProofs"), approve: v.boolean(), note: v.optional(v.string()) },
  handler: async (ctx, { id, approve, note }) => {
    const admin = await requireAdmin(ctx);
    const p = await ctx.db.get(id);
    if (!p) throw new Error("Proof not found");
    if (p.status !== "pending") throw new Error("Proof already reviewed");

    const now = Date.now();
    let pay = 0;

    if (approve) {
      const settings = await getSettings(ctx);
      pay = settings?.proofRewardAmount ?? 0;
      await ctx.db.patch(p._id, {
        status: "approved",
        amount: pay,
        reviewedAt: now,
        adminNote: note?.trim() ?? "",
        updatedAt: now,
      });
      const profile = await getProfileByUserId(ctx, p.userId);
      if (profile) {
        await ctx.db.patch(profile._id, {
          balance: round2(profile.balance + pay),
          earnings: round2(profile.earnings + pay),
          updatedAt: now,
        });
      }
      await addTransaction(ctx, p.userId, {
        type: "bonus",
        amount: pay,
        method: "Withdrawal proof reward",
        status: "completed",
      });
      await pushNotification(
        ctx,
        p.userId,
        "Proof approved 🎉",
        `Rs ${pay} proof reward was added to your balance.`,
        "success",
        true,
      );
    } else {
      await ctx.db.patch(p._id, {
        status: "rejected",
        reviewedAt: now,
        adminNote: note?.trim() ?? "",
        updatedAt: now,
      });
      await pushNotification(
        ctx,
        p.userId,
        "Proof rejected",
        note?.trim() || "Your payout screenshot was not accepted.",
        "error",
        true,
      );
    }

    const target = await getProfileByUserId(ctx, p.userId);
    await logAudit(ctx, admin, `${approve ? "Approved" : "Rejected"} withdrawal proof`, {
      targetId: p.userId,
      targetName: target?.name ?? "",
      detail: note?.trim() || "",
    });
    return pay;
  },
});

export const myWithdrawalProofs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db.query("withdrawalProofs").collect();
    return rows.filter((p) => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Approved payout proofs — shown on the public proofs wall. */
export const approvedProofs = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("withdrawalProofs").collect();
    return rows
      .filter((p) => p.status === "approved")
      .sort((a, b) => b.reviewedAt! - a.reviewedAt!)
      .slice(0, 24);
  },
});

export const adminListWithdrawalProofs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("withdrawalProofs").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});
