import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAudit, requireAdmin } from "./helpers";
import { round2 } from "./helpers";

/** Active plans, sorted for display — public read (mirrors plans_public_read). */
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const adminUpsertPlan = mutation({
  args: {
    id: v.optional(v.id("plans")),
    slug: v.string(),
    name: v.string(),
    minAmount: v.number(),
    maxAmount: v.number(),
    dailyRoi: v.number(),
    dailyAmount: v.optional(v.number()),
    durationDays: v.number(),
    features: v.array(v.string()),
    active: v.boolean(),
    sortOrder: v.number(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Plan not found");
      await ctx.db.patch(args.id, {
        slug: args.slug,
        name: args.name,
        minAmount: round2(args.minAmount),
        maxAmount: round2(args.maxAmount),
        dailyRoi: round2(args.dailyRoi),
        dailyAmount: args.dailyAmount === undefined ? undefined : round2(args.dailyAmount),
        durationDays: Math.max(1, Math.round(args.durationDays)),
        features: args.features,
        active: args.active,
        sortOrder: Math.round(args.sortOrder),
        imageUrl: args.imageUrl,
      });
      await logAudit(ctx, admin, "Updated plan", { targetName: args.name });
      return args.id;
    }

    // Slug uniqueness.
    const dup = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (dup) throw new Error("A plan with this slug already exists");

    const id = await ctx.db.insert("plans", {
      slug: args.slug,
      name: args.name,
      minAmount: round2(args.minAmount),
      maxAmount: round2(args.maxAmount),
      dailyRoi: round2(args.dailyRoi),
      dailyAmount: args.dailyAmount === undefined ? undefined : round2(args.dailyAmount),
      durationDays: Math.max(1, Math.round(args.durationDays)),
      features: args.features,
      active: args.active,
      sortOrder: Math.round(args.sortOrder),
      imageUrl: args.imageUrl,
      createdAt: now,
    });
    await logAudit(ctx, admin, "Created plan", { targetName: args.name });
    return id;
  },
});

export const adminDeletePlan = mutation({
  args: { id: v.id("plans") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const plan = await ctx.db.get(id);
    if (!plan) throw new Error("Plan not found");
    await ctx.db.delete(id);
    await logAudit(ctx, admin, "Deleted plan", { targetName: plan.name });
  },
});
