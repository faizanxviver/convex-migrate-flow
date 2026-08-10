import { v } from "convex/values";
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
 * Redeem a promo code against a purchase amount. Mirrors the SQL
 * `redeem_promo(text, numeric)`: percent → % of amount, fixed → flat value.
 * Returns the bonus amount and code, or null when the code is invalid.
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

    await ctx.db.patch(p._id, { used: p.used + 1 });
    const bonus = round2(
      p.type === "percent" ? (Number(amount) || 0) * (p.value / 100) : p.value,
    );

    // Credit the bonus to the withdrawable balance and record a ledger entry —
    // the same behaviour as the original client-side update, but server-side
    // so it cannot be tampered with.
    if (bonus > 0) {
      await ctx.db.patch(profile._id, {
        balance: round2(profile.balance + bonus),
        updatedAt: Date.now(),
      });
      await addTransaction(ctx, userId, {
        type: "bonus",
        amount: bonus,
        method: `Promo ${p.code}`,
        status: "completed",
        note: "Promo bonus",
      });
      await pushNotification(
        ctx,
        userId,
        "Promo bonus credited",
        `Rs ${bonus.toLocaleString("en-PK")} was added to your withdrawable balance.`,
        "success",
        true,
      );
    }

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
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const code = args.code.trim().toUpperCase();
    if (!code) throw new Error("Enter a code");

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
