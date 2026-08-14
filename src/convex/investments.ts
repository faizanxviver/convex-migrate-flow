import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  addTransaction,
  getProfileByCode,
  getProfileByUserId,
  getSettings,
  getUserId,
  pushNotification,
  requireUser,
  round2,
} from "./helpers";

/**
 * Purchase an investment plan from wallet balance. Mirrors the SQL
 * `buy_plan(text, numeric)` function:
 *  - validates plan, amount range, blocked status and balance
 *  - deducts principal, credits day-1 income instantly
 *  - creates the investment + ledger entries
 *  - pays 4-level referral commissions from the settings.levels table
 */
export const buyPlan = mutation({
  args: { planId: v.string(), amount: v.number() },
  handler: async (ctx, { planId, amount }) => {
    const userId = await requireUser(ctx);
    const me = await getProfileByUserId(ctx, userId);
    if (!me) throw new Error("Profile not found");
    if (me.blocked) throw new Error("Account suspended");

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", planId))
      .unique();
    if (!plan || !plan.active) throw new Error("Plan unavailable");

    const amt = round2(amount);
    if (amt < plan.minAmount || amt > plan.maxAmount) throw new Error("Amount outside plan range");

    // Plans are funded from deposit-backed wallet funds: the wallet must
    // cover the amount and the user must have deposited at least that much.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    const deposited = round2(
      txs
        .filter((t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"))
        .reduce((a, t) => a + t.amount, 0),
    );
    const investable = round2(Math.max(0, Math.min(me.balance, deposited)));
    if (amt > investable)
      throw new Error(
        `You have ${fmt(investable)} available for plans. Please deposit more to activate this plan.`,
      );

    const now = Date.now();
    const firstIncome = round2((amt * plan.dailyRoi) / 100);

    await ctx.db.patch(me._id, {
      balance: round2(me.balance - amt + firstIncome),
      invested: round2(me.invested + amt),
      earnings: round2(me.earnings + firstIncome),
      updatedAt: now,
    });

    const invId = await ctx.db.insert("investments", {
      userId,
      planId: plan.slug,
      planName: plan.name,
      amount: amt,
      dailyRoi: plan.dailyRoi,
      durationDays: plan.durationDays,
      earned: firstIncome,
      startedAt: now,
      lastPayoutAt: now,
      createdAt: now,
    });

    await addTransaction(ctx, userId, {
      type: "investment",
      amount: amt,
      method: `${plan.name} Plan`,
      status: "completed",
    });
    await addTransaction(ctx, userId, {
      type: "payout",
      amount: firstIncome,
      method: `${plan.name} — day 1 income`,
      status: "completed",
    });
    await pushNotification(
      ctx,
      userId,
      "First income credited",
      `Your day 1 income of ${fmt(firstIncome)} was added to your withdrawable balance.`,
      "success",
    );

    // Referral commissions — 4 levels up the upline chain.
    const settings = await getSettings(ctx);
    const rates = settings?.levels ?? [10, 2, 1, 4];
    let code = me.referredBy;
    let lvl = 1;
    while (code && lvl <= 4) {
      const up = await getProfileByCode(ctx, code);
      if (!up) break;
      const commission = round2((amt * (rates[lvl - 1] ?? 0)) / 100);
      if (commission > 0) {
        await ctx.db.patch(up._id, {
          balance: round2(up.balance + commission),
          referralEarnings: round2(up.referralEarnings + commission),
          updatedAt: now,
        });
        await addTransaction(ctx, up.userId, {
          type: "commission",
          amount: commission,
          method: `Level ${lvl} — ${me.name}`,
          status: "completed",
        });
        await pushNotification(
          ctx,
          up.userId,
          "Commission received",
          `You earned ${fmt(commission)} from a Level ${lvl} investment.`,
          "success",
        );
      }
      code = up.referredBy;
      lvl += 1;
    }

    return invId;
  },
});

/**
 * Credits every completed 24-hour income cycle to the withdrawable balance.
 * Mirrors the SQL `claim_earnings()` function.
 */
export const claimEarnings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const me = await getProfileByUserId(ctx, userId);
    if (!me) throw new Error("Profile not found");

    const now = Date.now();
    const DAY = 86400000;
    const investments = await ctx.db
      .query("investments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let total = 0;
    for (const inv of investments) {
      const daily = round2((inv.amount * inv.dailyRoi) / 100);
      if (daily <= 0) continue;

      const paidCycles = Math.floor(inv.earned / daily);
      const maxCycles = inv.durationDays - paidCycles;
      if (maxCycles <= 0) continue;

      const cycles = Math.floor((now - inv.lastPayoutAt) / DAY);
      if (cycles <= 0) continue;

      const capped = Math.min(cycles, maxCycles);
      const payout = round2(daily * capped);
      total += payout;

      await ctx.db.patch(inv._id, {
        earned: round2(inv.earned + payout),
        lastPayoutAt: inv.lastPayoutAt + capped * DAY,
      });
      await addTransaction(ctx, userId, {
        type: "payout",
        amount: payout,
        method: `${inv.planName} — daily income`,
        status: "completed",
      });
    }

    if (total > 0) {
      await ctx.db.patch(me._id, {
        balance: round2(me.balance + total),
        earnings: round2(me.earnings + total),
        updatedAt: now,
      });
      await pushNotification(
        ctx,
        userId,
        "Daily income credited",
        `${fmt(total)} of investment income was added to your withdrawable balance.`,
        "success",
      );
    }

    return round2(total);
  },
});

/** My investments, newest first. */
export const myInvestments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("investments")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Income accrued in real time since the last credited cycle (client ticker). */
export const liveEarnings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.db.get(userId);
    if (!me) return 0;
    const investments = await ctx.db
      .query("investments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    return round2(
      investments.reduce((sum, inv) => {
        const daily = round2((inv.amount * inv.dailyRoi) / 100);
        if (daily <= 0) return sum;
        const paidCycles = Math.floor(inv.earned / daily);
        if (paidCycles >= inv.durationDays) return sum;
        const elapsed = Math.max(0, now - inv.lastPayoutAt);
        return sum + daily * Math.min(1, elapsed / 86400000);
      }, 0),
    );
  },
});

function fmt(n: number) {
  return "Rs " + round2(n).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
