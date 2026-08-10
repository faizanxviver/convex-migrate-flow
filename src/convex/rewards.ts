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

// ============================================================================
// Free reward task (submit WhatsApp + Facebook proof, admin pays after review)
// ============================================================================

/** Mirror of the SQL `submit_reward_claim(text, text)`. */
export const submitRewardClaim = mutation({
  args: {
    whatsappProof: v.string(),
    facebookProof: v.string(),
  },
  handler: async (ctx, { whatsappProof, facebookProof }) => {
    const userId = await requireUser(ctx);
    const settings = await getSettings(ctx);
    if (settings && !settings.rewardActive) throw new Error("Reward task is currently closed");
    if (!whatsappProof || !facebookProof) throw new Error("Both screenshots are required");

    const existing = await ctx.db
      .query("rewardClaims")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const pending = existing.find((c) => c.status === "pending");
    if (pending) throw new Error("Your previous task is still under review");

    const approved = existing
      .filter((c) => c.status === "approved" && c.reviewedAt)
      .map((c) => c.reviewedAt!)
      .sort((a, b) => b - a)[0];
    const cooldown = (settings?.rewardCooldownHours ?? 24) * 3600000;
    if (approved && Date.now() - approved < cooldown)
      throw new Error("You can do this task again after the cooldown ends");

    const now = Date.now();
    return await ctx.db.insert("rewardClaims", {
      userId,
      amount: settings?.rewardAmount ?? 0,
      whatsappProof,
      facebookProof,
      status: "pending",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Mirror of the SQL `review_reward_claim(uuid, boolean, text)`. */
export const reviewRewardClaim = mutation({
  args: { id: v.id("rewardClaims"), approve: v.boolean(), note: v.optional(v.string()) },
  handler: async (ctx, { id, approve, note }) => {
    const admin = await requireAdmin(ctx);
    const c = await ctx.db.get(id);
    if (!c) throw new Error("Task not found");
    if (c.status !== "pending") throw new Error("Task already reviewed");

    const now = Date.now();
    let pay = 0;

    if (approve) {
      const settings = await getSettings(ctx);
      pay = settings?.rewardAmount ?? 0;
      await ctx.db.patch(c._id, {
        status: "approved",
        amount: pay,
        reviewedAt: now,
        adminNote: note?.trim() ?? "",
        updatedAt: now,
      });
      const profile = await getProfileByUserId(ctx, c.userId);
      if (profile) {
        await ctx.db.patch(profile._id, {
          balance: round2(profile.balance + pay),
          earnings: round2(profile.earnings + pay),
          updatedAt: now,
        });
      }
      await addTransaction(ctx, c.userId, {
        type: "bonus",
        amount: pay,
        method: "Free Reward Task",
        status: "completed",
      });
      await pushNotification(
        ctx,
        c.userId,
        "Reward approved 🎉",
        `Rs ${pay} reward has been added to your withdrawable balance.`,
        "success",
        true,
      );
    } else {
      await ctx.db.patch(c._id, {
        status: "rejected",
        reviewedAt: now,
        adminNote: note?.trim() ?? "",
        updatedAt: now,
      });
      await pushNotification(
        ctx,
        c.userId,
        "Reward task rejected",
        note?.trim() || "Your proof was not accepted. You can submit the task again.",
        "error",
        true,
      );
    }

    const target = await getProfileByUserId(ctx, c.userId);
    await logAudit(ctx, admin, `${approve ? "Approved" : "Rejected"} reward task`, {
      targetId: c.userId,
      targetName: target?.name ?? "",
      detail: note?.trim() || "",
    });
    return pay;
  },
});

export const myRewardClaims = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("rewardClaims")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminListRewardClaims = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("rewardClaims").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================================================
// Weekly rank salary
// ============================================================================

/**
 * Weekly salary based on the highest tier whose invested threshold the direct
 * (level 1) team meets. Mirrors the final `claim_salary()` migration.
 */
export const claimSalary = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const me = await getProfileByUserId(ctx, userId);
    if (!me) throw new Error("Profile not found");
    if (me.blocked) throw new Error("Account suspended");

    const settings = await getSettings(ctx);
    const tiers = [...(settings?.salaryTiers ?? [])].sort((a, b) => a.invested - b.invested);

    // Direct team's total invested amount.
    const team = await ctx.db
      .query("profiles")
      .withIndex("by_referredBy", (q) => q.eq("referredBy", me.referralCode))
      .collect();
    const teamInvested = team.reduce((sum, p) => sum + p.invested, 0);

    const reached = tiers.filter((t) => teamInvested >= t.invested);
    const best = reached.length ? reached[reached.length - 1] : null;
    if (!best) throw new Error("You have not reached a salary rank yet");

    // 7-day cooldown, keyed on bonus transactions whose method starts with "Salary".
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const lastClaim = txs
      .filter((t) => t.type === "bonus" && (t.method ?? "").startsWith("Salary"))
      .map((t) => t.createdAt)
      .sort((a, b) => b - a)[0];
    if (lastClaim && Date.now() - lastClaim < 7 * 86400000)
      throw new Error("Salary already claimed this week");

    const amount = round2(best.salary);
    const now = Date.now();

    await ctx.db.patch(me._id, {
      balance: round2(me.balance + amount),
      earnings: round2(me.earnings + amount),
      updatedAt: now,
    });
    await addTransaction(ctx, userId, {
      type: "bonus",
      amount,
      method: `Salary ${best.rank}`,
      status: "approved",
      note: "Weekly rank salary",
    });
    await pushNotification(
      ctx,
      userId,
      "Salary credited",
      `${best.rank} rank salary of Rs ${amount} added to your balance.`,
      "success",
    );

    return amount;
  },
});
