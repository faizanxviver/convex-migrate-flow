import { v } from "convex/values";
import { promoAudienceValidator } from "./schema";
import { mutation, query } from "./_generated/server";
import {
  addTransaction,
  getProfileByUserId,
  logAudit,
  pushNotification,
  requireAdmin,
  requireUser,
  round2,
} from "./helpers";

/**
 * Redeem a promo code. Mirrors the SQL `redeem_promo(text, numeric)` 1:1:
 * percent → % of the purchase amount, fixed → flat value. Enforces the code's
 * audience targeting (all / depositors / active_plan / new) and per-user
 * redemption limit via the promoRedemptions table. Returns null whenever the
 * code is invalid, expired, used up, not for this account, or yields no bonus.
 */
export const redeemPromo = mutation({
  args: { code: v.string(), amount: v.number() },
  handler: async (ctx, { code, amount }) => {
    const userId = await requireUser(ctx);
    const clean = code.trim().toUpperCase();
    if (!clean) throw new Error("Enter a promo code");

    const p = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", clean))
      .unique();
    if (
      !p ||
      !p.active ||
      p.used >= p.usageLimit ||
      (p.expiresAt !== undefined && p.expiresAt < Date.now())
    ) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.blocked) throw new Error("Account suspended");

    // Per-user redemption limit (promo_redemptions).
    const perUserLimit = Math.max(1, p.perUserLimit ?? 1);
    const mine = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_user_promo", (q) => q.eq("userId", userId).eq("promoId", p._id))
      .collect();
    if (mine.length >= perUserLimit) return null;

    // Audience targeting — same rules as the SQL function.
    const audience = p.audience ?? "all";
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const hasDeposit = txs.some(
      (t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed"),
    );
    if (audience === "depositors" && !hasDeposit) return null;
    if (audience === "new" && hasDeposit) return null;
    if (audience === "active_plan") {
      const invs = await ctx.db
        .query("investments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const hasPlan = invs.some((i) => {
        const daily = round2((i.amount * i.dailyRoi) / 100);
        if (daily <= 0) return false;
        return Math.round(i.earned / daily) < i.durationDays;
      });
      if (!hasPlan) return null;
    }

    const bonus = round2(
      p.type === "percent" ? (Number(amount) || 0) * (p.value / 100) : p.value,
    );
    if (bonus <= 0) return null;

    // Consume one use, record the redemption, credit the balance and notify.
    await ctx.db.patch(p._id, { used: p.used + 1 });
    await ctx.db.insert("promoRedemptions", {
      promoId: p._id,
      userId,
      amount: bonus,
      createdAt: Date.now(),
    });
    await ctx.db.patch(profile._id, {
      balance: round2(profile.balance + bonus),
      updatedAt: Date.now(),
    });
    await addTransaction(ctx, userId, {
      type: "bonus",
      amount: bonus,
      method: `Promo ${p.code}`,
      status: "completed",
      note: "Promo code bonus",
    });
    await pushNotification(
      ctx,
      userId,
      "Promo bonus credited",
      `Rs ${bonus.toLocaleString("en-PK")} was added to your withdrawable balance.`,
      "success",
      true,
    );

    return { bonus, code: p.code };
  },
});

export const listPromoCodes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("promoCodes").collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const adminUpsertPromo = mutation({
  args: {
    id: v.optional(v.id("promoCodes")),
    code: v.string(),
    type: v.union(v.literal("percent"), v.literal("fixed")),
    value: v.number(),
    usageLimit: v.number(),
    expiresAt: v.optional(v.number()),
    active: v.boolean(),
    audience: v.optional(promoAudienceValidator),
    perUserLimit: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const code = args.code.trim().toUpperCase();
    if (!code) throw new Error("Enter a code");

    const audience = args.audience ?? "all";
    const perUserLimit = Math.max(1, Math.round(args.perUserLimit ?? 1));
    const description = (args.description ?? "").trim();

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Promo not found");
      await ctx.db.patch(args.id, {
        code,
        type: args.type,
        value: args.value,
        usageLimit: Math.max(1, Math.round(args.usageLimit)),
        expiresAt: args.expiresAt,
        active: args.active,
        audience,
        perUserLimit,
        description,
      });
      await logAudit(ctx, admin, "Updated promo code", { targetName: code });
      return args.id;
    }

    const dup = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (dup) throw new Error("This code already exists");

    const id = await ctx.db.insert("promoCodes", {
      code,
      type: args.type,
      value: args.value,
      usageLimit: Math.max(1, Math.round(args.usageLimit)),
      used: 0,
      expiresAt: args.expiresAt,
      active: args.active,
      audience,
      perUserLimit,
      description,
      createdAt: Date.now(),
    });
    await logAudit(ctx, admin, "Created promo code", { targetName: code });
    return id;
  },
});

export const adminDeletePromo = mutation({
  args: { id: v.id("promoCodes") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const p = await ctx.db.get(id);
    if (!p) throw new Error("Promo not found");
    await ctx.db.delete(id);
    await logAudit(ctx, admin, "Deleted promo code", { targetName: p.code });
  },
});
