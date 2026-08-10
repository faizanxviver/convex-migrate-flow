import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { getProfileByUserId, logAudit, pushNotification, requireAdmin } from "./helpers";
import { round2 } from "./helpers";

/**
 * Admin activates a leader plan for a user with a team-investment deadline.
 * Mirrors the SQL `admin_activate_leader_plan(...)` — no upline commission.
 */
export const adminActivateLeaderPlan = mutation({
  args: {
    userId: v.id("users"),
    planId: v.string(),
    amount: v.number(),
    checkHours: v.number(),
    requiredInvestment: v.number(),
  },
  handler: async (ctx, { userId, planId, amount, checkHours, requiredInvestment }) => {
    const admin = await requireAdmin(ctx);
    const target = await getProfileByUserId(ctx, userId);
    if (!target) throw new Error("User not found");

    const plan = await ctx.db.query("plans").withIndex("by_slug", (q) => q.eq("slug", planId)).unique();
    if (!plan) throw new Error("Plan not found");

    const amt = round2(amount);
    const hours = Math.max(1, Math.round(checkHours));
    const req = round2(requiredInvestment);
    const now = Date.now();

    const invId = await ctx.db.insert("investments", {
      userId,
      planId: plan.slug,
      planName: plan.name,
      amount: amt,
      dailyRoi: plan.dailyRoi,
      durationDays: plan.durationDays,
      earned: 0,
      startedAt: now,
      lastPayoutAt: now,
      createdAt: now,
    });

    await ctx.db.patch(target._id, {
      invested: round2(target.invested + amt),
      updatedAt: now,
    });

    const lpId = await ctx.db.insert("leaderPlans", {
      userId,
      investmentId: invId,
      planId: plan.slug,
      planName: plan.name,
      amount: amt,
      checkHours: hours,
      requiredInvestment: req,
      deadlineAt: now + hours * 3600000,
      status: "active",
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });

    await pushNotification(
      ctx,
      userId,
      "Leader plan activated 🏆",
      `${plan.name} plan has been activated for you. Bring Rs ${req.toLocaleString(
        "en-PK",
      )} of level-1 team investment within ${hours} hours to keep it.`,
      "success",
      true,
    );

    await logAudit(ctx, admin, "Activated leader plan", {
      targetId: userId,
      targetName: target.name,
      detail: `${plan.name} · ${fmt(amt)}`,
    });
    return lpId;
  },
});

/** Admin removes an active leader plan and rolls back its investment. */
export const adminRemoveLeaderPlan = mutation({
  args: { id: v.id("leaderPlans") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const lp = await ctx.db.get(id);
    if (!lp) throw new Error("Leader plan not found");

    if (lp.investmentId) {
      await ctx.db.delete(lp.investmentId);
    }
    const target = await getProfileByUserId(ctx, lp.userId);
    if (target) {
      await ctx.db.patch(target._id, {
        invested: Math.max(0, round2(target.invested - lp.amount)),
        updatedAt: Date.now(),
      });
    }
    await ctx.db.patch(id, { status: "removed", updatedAt: Date.now() });
    await pushNotification(
      ctx,
      lp.userId,
      "Leader plan removed",
      `Your ${lp.planName} leader plan has been removed by support.`,
      "error",
      true,
    );
    await logAudit(ctx, admin, "Removed leader plan", {
      targetId: lp.userId,
      targetName: target?.name ?? "",
      detail: lp.planName,
    });
  },
});

/**
 * Internal — evaluate every leader plan whose deadline passed. Passes when the
 * direct team invested at least the required amount since activation; otherwise
 * the investment is rolled back and the plan is marked failed.
 */
async function performLeaderPlanChecks(ctx: MutationCtx) {
  const now = Date.now();
    const active = await ctx.db
      .query("leaderPlans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const due = active.filter((lp) => lp.deadlineAt <= now);

    let removed = 0;
    for (const lp of due) {
      const owner = await getProfileByUserId(ctx, lp.userId);
      if (!owner) continue;

      const team = await ctx.db
        .query("profiles")
        .withIndex("by_referredBy", (q) => q.eq("referredBy", owner.referralCode))
        .collect();
      const teamInvested = team
        .filter((p) => p.createdAt >= lp.createdAt)
        .reduce((sum, p) => sum + p.invested, 0);

      if (teamInvested >= lp.requiredInvestment) {
        await ctx.db.patch(lp._id, { status: "passed", updatedAt: now });
        await pushNotification(
          ctx,
          lp.userId,
          "Leader plan secured ✅",
          `You met the team requirement. Your ${lp.planName} plan stays active.`,
          "success",
          true,
        );
      } else {
        if (lp.investmentId) await ctx.db.delete(lp.investmentId);
        await ctx.db.patch(owner._id, {
          invested: Math.max(0, round2(owner.invested - lp.amount)),
          updatedAt: now,
        });
        await ctx.db.patch(lp._id, { status: "failed", updatedAt: now });
        await pushNotification(
          ctx,
          lp.userId,
          "Leader plan expired",
          `Your ${lp.planName} leader plan was removed because the required Rs ${lp.requiredInvestment.toLocaleString(
            "en-PK",
          )} level-1 team investment was not completed in time.`,
          "error",
          true,
        );
        removed += 1;
      }
    }
    return removed;
}

/** Admin-triggered leader plan requirement sweep. */
export const runLeaderPlanChecks = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await performLeaderPlanChecks(ctx);
  },
});

/** Scheduled sweep used by crons.ts (system context, no auth check). */
export const cronRunLeaderPlanChecks = mutation({
  args: {},
  handler: async (ctx) => {
    return await performLeaderPlanChecks(ctx);
  },
});

export const listLeaderPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("leaderPlans").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const myLeaderPlans = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("leaderPlans").collect();
    return rows.filter((lp) => lp.status === "active").sort((a, b) => b.createdAt - a.createdAt);
  },
});

function fmt(n: number) {
  return "Rs " + round2(n).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
