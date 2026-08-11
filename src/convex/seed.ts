import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const DEFAULT_SALARY_TIERS = [
  { rank: "Bronze", team: 3, invested: 5000, salary: 500 },
  { rank: "Silver", team: 10, invested: 25000, salary: 2500 },
  { rank: "Gold", team: 25, invested: 75000, salary: 8000 },
  { rank: "Platinum", team: 60, invested: 200000, salary: 25000 },
];

export const DEFAULT_QUICK_AMOUNTS = [300, 700, 1000, 3000, 5000, 10000];

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
 * Default community channels. URLs are empty so nothing broken shows until an
 * admin pastes real WhatsApp group/channel links in Admin → Channels.
 */
const SEED_CHANNELS = [
  { name: "HopeX WhatsApp Group", kind: "group", url: "", sortOrder: 1 },
  { name: "HopeX WhatsApp Channel", kind: "channel", url: "", sortOrder: 2 },
];

/**
 * imgbb keys pre-loaded into the admin-managed key pool so image uploads work
 * out of the box. The upload action tries pool keys first (least-used first),
 * then falls back to the IMGBB_API_KEY secret. Verified working keys.
 */
const SEED_IMGBB_KEYS = [
  {
    label: "imgbb key 1",
    apiKey: "f3c5d58e835417c3ec30462c97bf6354",
  },
  {
    label: "imgbb key 2",
    apiKey: "735fc47c6b6736852f53e9621876aa76",
  },
];

/**
 * MPay gateway shared secret, pre-loaded into the key pool (provider
 * "gateway"). The /checkout/submit HTTP route accepts it as a fallback when
 * the GATEWAY_SHARED_SECRET env secret is not set — set the env secret to take
 * precedence over this value.
 */
const SEED_GATEWAY_SECRET = {
  label: "MPay gateway secret",
  apiKey: "8317f8a10d34ea6625ba41c13226bbf80a91506313faebdefababda5ecb42509",
};

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
        minDeposit: 300,
        minWithdraw: 50,
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

    const channels = await ctx.db.query("channels").collect();
    if (channels.length === 0 || force) {
      for (const ch of SEED_CHANNELS) {
        const exists = channels.some((x) => x.name === ch.name);
        if (!exists) {
          await ctx.db.insert("channels", {
            ...ch,
            active: true,
            createdAt: Date.now(),
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

    // Pre-load the imgbb key pool + gateway secret (idempotent by apiKey).
    const keys = await ctx.db.query("apiKeys").collect();
    const existingKeys = new Set(keys.map((k) => k.apiKey));
    const now = Date.now();
    for (const k of SEED_IMGBB_KEYS) {
      if (existingKeys.has(k.apiKey)) continue;
      await ctx.db.insert("apiKeys", {
        provider: "imgbb",
        label: k.label,
        apiKey: k.apiKey,
        purpose: "all",
        active: true,
        uploads: 0,
        failures: 0,
        bytes: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (!existingKeys.has(SEED_GATEWAY_SECRET.apiKey)) {
      await ctx.db.insert("apiKeys", {
        provider: "gateway",
        label: SEED_GATEWAY_SECRET.label,
        apiKey: SEED_GATEWAY_SECRET.apiKey,
        purpose: "gateway",
        active: true,
        uploads: 0,
        failures: 0,
        bytes: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { seeded: true };
  },
});
