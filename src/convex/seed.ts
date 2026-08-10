import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const DEFAULT_SALARY_TIERS = [
  { rank: "Bronze", team: 3, invested: 5000, salary: 500 },
  { rank: "Silver", team: 10, invested: 25000, salary: 2500 },
  { rank: "Gold", team: 25, invested: 75000, salary: 8000 },
  { rank: "Platinum", team: 60, invested: 200000, salary: 25000 },
];

export const DEFAULT_QUICK_AMOUNTS = [1000, 3000, 5000, 10000, 25000, 50000];

const SEED_PLANS = [
  {
    slug: "starter",
    name: "Starter",
    minAmount: 1000,
    maxAmount: 50000,
    dailyRoi: 1.2,
    durationDays: 30,
    features: ["Daily payouts", "Principal returned", "Email support"],
    sortOrder: 1,
  },
  {
    slug: "growth",
    name: "Growth",
    minAmount: 50000,
    maxAmount: 250000,
    dailyRoi: 1.8,
    durationDays: 45,
    features: ["Daily payouts", "Priority support", "Referral boost 5%"],
    sortOrder: 2,
  },
  {
    slug: "premium",
    name: "Premium",
    minAmount: 250000,
    maxAmount: 1000000,
    dailyRoi: 2.4,
    durationDays: 60,
    features: ["Daily payouts", "Dedicated manager", "Referral boost 10%"],
    sortOrder: 3,
  },
  {
    slug: "vip",
    name: "VIP",
    minAmount: 1000000,
    maxAmount: 5000000,
    dailyRoi: 3.1,
    durationDays: 90,
    features: ["Daily payouts", "Private desk", "Custom exit terms", "VIP events"],
    sortOrder: 4,
  },
];

const SEED_METHODS = [
  {
    name: "Easypaisa",
    kind: "wallet" as const,
    accountName: "HopeX Finance",
    accountNumber: "0300-1234567",
    instructions:
      "Send the exact amount to this Easypaisa wallet, then upload your screenshot.",
    sortOrder: 1,
  },
  {
    name: "JazzCash",
    kind: "wallet" as const,
    accountName: "HopeX Finance",
    accountNumber: "0301-7654321",
    instructions:
      "Send the exact amount to this JazzCash wallet, then upload your screenshot.",
    sortOrder: 2,
  },
  {
    name: "Bank Transfer",
    kind: "bank" as const,
    accountName: "HopeX Finance Pvt Ltd",
    accountNumber: "PK36SCBL0000001123456702",
    instructions: "Transfer to this account (Standard Chartered), then upload your receipt.",
    sortOrder: 3,
  },
];

const SEED_PROMOS = [
  { code: "WELCOME10", type: "percent" as const, value: 10, usageLimit: 500 },
  { code: "BOOST50", type: "fixed" as const, value: 50, usageLimit: 100 },
];

/**
 * Seeds the reference data (plans, settings, payment methods, promo codes) the
 * first time it runs. Idempotent — safe to call on every app load.
 */
export const seedReferenceData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existingSettings = (await ctx.db.query("settings").collect())[0];
    const existingPlans = await ctx.db.query("plans").collect();

    if (!existingSettings) {
      await ctx.db.insert("settings", {
        siteName: "HopeX",
        siteTitle: "HopeX — Investment Platform",
        siteLogo: undefined,
        siteFavicon: undefined,
        seoDescription:
          "HopeX is a premium investment platform with daily ROI plans, instant deposits, fast payouts and a 4-level referral program.",
        seoKeywords:
          "investment platform, daily roi, hopex, referral program, pakistan investment",
        ogImage: undefined,
        supportWhatsapp: "",
        minDeposit: 1000,
        minWithdraw: 500,
        levels: [10, 2, 1, 4],
        quickAmounts: DEFAULT_QUICK_AMOUNTS,
        announcementText: "",
        announcementActive: false,
        maintenanceMode: false,
        maintenanceMessage:
          "HopeX is under scheduled maintenance. Please check back shortly.",
        salaryTiers: DEFAULT_SALARY_TIERS,
        rewardAmount: 100,
        rewardCooldownHours: 24,
        rewardActive: true,
        proofRewardAmount: 5,
        showProofsSection: true,
        withdrawOpenHour: 8,
        withdrawCloseHour: 19,
        updatedAt: Date.now(),
      });
    }

    if (existingPlans.length === 0 || force) {
      for (const plan of SEED_PLANS) {
        const dup = await ctx.db
          .query("plans")
          .withIndex("by_slug", (q) => q.eq("slug", plan.slug))
          .unique();
        if (!dup) {
          await ctx.db.insert("plans", {
            ...plan,
            active: true,
            features: plan.features,
            imageUrl: undefined,
            createdAt: Date.now(),
          });
        }
      }
    }

    const methods = await ctx.db.query("paymentMethods").collect();
    if (methods.length === 0 || force) {
      for (const m of SEED_METHODS) {
        const exists = methods.some((x) => x.name === m.name);
        if (!exists) {
          await ctx.db.insert("paymentMethods", {
            name: m.name,
            kind: m.kind,
            accountName: m.accountName,
            accountNumber: m.accountNumber,
            imageUrl: undefined,
            instructions: m.instructions,
            active: true,
            sortOrder: m.sortOrder,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    const promos = await ctx.db.query("promoCodes").collect();
    if (promos.length === 0 || force) {
      for (const p of SEED_PROMOS) {
        const dup = await ctx.db
          .query("promoCodes")
          .withIndex("by_code", (q) => q.eq("code", p.code))
          .unique();
        if (!dup) {
          await ctx.db.insert("promoCodes", {
            code: p.code,
            type: p.type,
            value: p.value,
            usageLimit: p.usageLimit,
            used: 0,
            expiresAt: undefined,
            active: true,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { seeded: true };
  },
});
