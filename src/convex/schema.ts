import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ============================================================================
// Enums — ported 1:1 from the HopeX Supabase schema (supabase/migrations)
// ============================================================================

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;
export const roleValidator = v.union(v.literal(ROLES.ADMIN), v.literal(ROLES.USER));
export type Role = Infer<typeof roleValidator>;

export const txTypeValidator = v.union(
  v.literal("deposit"),
  v.literal("withdraw"),
  v.literal("investment"),
  v.literal("commission"),
  v.literal("bonus"),
  v.literal("payout"),
);
export type TxType = Infer<typeof txTypeValidator>;

export const txStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("approved"),
  v.literal("completed"),
  v.literal("rejected"),
);
export type TxStatus = Infer<typeof txStatusValidator>;

export const kycStatusValidator = v.union(
  v.literal("not_submitted"),
  v.literal("pending"),
  v.literal("verified"),
);
export type KycStatus = Infer<typeof kycStatusValidator>;

export const promoTypeValidator = v.union(v.literal("percent"), v.literal("fixed"));
export type PromoType = Infer<typeof promoTypeValidator>;

export const chatSenderValidator = v.union(v.literal("user"), v.literal("support"));
export type ChatSender = Infer<typeof chatSenderValidator>;

export const paymentKindValidator = v.union(v.literal("wallet"), v.literal("bank"));
export type PaymentKind = Infer<typeof paymentKindValidator>;

export const promoAudienceValidator = v.union(
  v.literal("all"),
  v.literal("depositors"),
  v.literal("active_plan"),
  v.literal("new"),
);
export type PromoAudience = Infer<typeof promoAudienceValidator>;

export const claimStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);
export type ClaimStatus = Infer<typeof claimStatusValidator>;

export const leaderPlanStatusValidator = v.union(
  v.literal("active"),
  v.literal("passed"),
  v.literal("failed"),
  v.literal("removed"),
);
export type LeaderPlanStatus = Infer<typeof leaderPlanStatusValidator>;

export const salaryTierValidator = v.object({
  rank: v.string(),
  // Legacy field kept for schema stability — NOT used by the UI. Ranks are
  // earned from the Level 1 team's TOTAL investment, no head-count needed.
  team: v.number(),
  invested: v.number(),
  salary: v.number(),
});
export type SalaryTier = Infer<typeof salaryTierValidator>;

// ============================================================================
// Settings — the singleton doc (mirrors public.settings WHERE id = 1)
// ============================================================================

const settingsFields = {
  siteName: v.string(),
  siteTitle: v.string(),
  siteLogo: v.optional(v.string()),
  siteFavicon: v.optional(v.string()),
  seoDescription: v.string(),
  seoKeywords: v.string(),
  ogImage: v.optional(v.string()),
  appDownloadUrl: v.optional(v.string()),
  // Dashboard welcome popup — content editable by the admin.
  popupEnabled: v.boolean(),
  popupTitle: v.string(),
  popupSubtitle: v.string(),
  popupButtonText: v.string(),
  supportWhatsapp: v.string(),
  minDeposit: v.number(),
  minWithdraw: v.number(),
  levels: v.array(v.number()), // referral commission % per level (L1..L4)
  quickAmounts: v.array(v.number()),
  announcementText: v.string(),
  announcementActive: v.boolean(),
  maintenanceMode: v.boolean(),
  maintenanceMessage: v.string(),
  salaryTiers: v.array(salaryTierValidator),
  rewardAmount: v.number(),
  rewardCooldownHours: v.number(),
  rewardActive: v.boolean(),
  proofRewardAmount: v.number(),
  showProofsSection: v.boolean(),
  withdrawOpenHour: v.number(),
  withdrawCloseHour: v.number(),
  updatedAt: v.number(),
};

// ============================================================================
// Schema
// ============================================================================

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    // the users table is the default users table that is brought in by authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator), // admin | user (user_roles equivalent)
      phone: v.optional(v.string()), // mobile number captured at signup
      referredBy: v.optional(v.string()), // referral code captured at signup
    }).index("email", ["email"]),

    // ---- profiles (was public.profiles) -----------------------------------
    profiles: defineTable({
      userId: v.id("users"),
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      verified: v.boolean(),
      blocked: v.boolean(),
      kyc: kycStatusValidator,
      twoFactor: v.boolean(),
      language: v.string(), // "en" | "ur"
      referralCode: v.string(), // unique, e.g. HPX7F3KQ
      referredBy: v.optional(v.string()), // the code that referred this user
      balance: v.number(), // withdrawable balance
      invested: v.number(),
      earnings: v.number(),
      referralEarnings: v.number(),
      bankName: v.optional(v.string()),
      accountName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_userId", ["userId"])
      .index("by_referralCode", ["referralCode"])
      .index("by_referredBy", ["referredBy"]),

    // ---- plans (was public.plans) ------------------------------------------
    plans: defineTable({
      slug: v.string(), // "starter" | "growth" | "premium" | "vip"
      name: v.string(),
      minAmount: v.number(),
      maxAmount: v.number(),
      dailyRoi: v.number(), // percent
      dailyAmount: v.optional(v.number()), // exact daily income set by admin
      durationDays: v.number(),
      features: v.array(v.string()),
      active: v.boolean(),
      sortOrder: v.number(),
      imageUrl: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_slug", ["slug"]),

    // ---- investments (was public.investments) ------------------------------
    investments: defineTable({
      userId: v.id("users"),
      planId: v.string(), // plan slug
      planName: v.string(),
      amount: v.number(),
      dailyRoi: v.number(),
      durationDays: v.number(),
      earned: v.number(),
      startedAt: v.number(),
      lastPayoutAt: v.number(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    // ---- transactions (was public.transactions) ----------------------------
    transactions: defineTable({
      userId: v.id("users"),
      type: txTypeValidator,
      amount: v.number(),
      method: v.optional(v.string()),
      status: txStatusValidator,
      note: v.optional(v.string()),
      reference: v.optional(v.string()),
      proofUrl: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_status", ["status"])
      .index("by_type_status", ["type", "status"]),

    // ---- push subscriptions (web push, for phone notifications) ------------
    pushSubscriptions: defineTable({
      userId: v.id("users"),
      endpoint: v.string(),
      p256dh: v.string(),
      auth: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_endpoint", ["endpoint"]),

    // ---- notifications (was public.notifications) ---------------------------
    notifications: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
      kind: v.string(), // "success" | "info" | "warning" | "error"
      image: v.optional(v.string()),
      read: v.boolean(),
      popup: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    // ---- chat messages (was public.chat_messages) ---------------------------
    chatMessages: defineTable({
      userId: v.id("users"),
      sender: chatSenderValidator, // "user" | "support"
      text: v.string(),
      status: v.optional(v.string()), // "sent" | "delivered" | "read"
      attachment: v.optional(
        v.object({
          name: v.string(),
          kind: v.union(v.literal("image"), v.literal("file"), v.literal("audio")),
          url: v.optional(v.string()),
          duration: v.optional(v.number()),
        }),
      ),
      replyTo: v.optional(
        v.object({
          from: chatSenderValidator,
          text: v.string(),
        }),
      ),
      createdAt: v.number(),
    }).index("by_user_created", ["userId", "createdAt"]),

    // ---- promo codes (was public.promo_codes) -------------------------------
    promoCodes: defineTable({
      code: v.string(), // uppercase
      type: promoTypeValidator,
      value: v.number(),
      usageLimit: v.number(),
      used: v.number(),
      expiresAt: v.optional(v.number()),
      active: v.boolean(),
      // New (2026-08-11): audience targeting, per-user limit and a note.
      audience: v.optional(promoAudienceValidator), // "all" | "depositors" | "active_plan" | "new"
      perUserLimit: v.optional(v.number()), // redemptions allowed per user
      description: v.optional(v.string()), // admin note / campaign label
      createdAt: v.number(),
    }).index("by_code", ["code"]),

    // ---- promo redemptions (was public.promo_redemptions) ---------------------
    promoRedemptions: defineTable({
      promoId: v.id("promoCodes"),
      userId: v.id("users"),
      amount: v.number(),
      createdAt: v.number(),
    })
      .index("by_promo", ["promoId"])
      .index("by_user_promo", ["userId", "promoId"]),

    // ---- settings (was public.settings — single row, keyed implicitly) ------
    settings: defineTable({
      ...settingsFields,
    }),

    // ---- payment methods (was public.payment_methods) ------------------------
    paymentMethods: defineTable({
      name: v.string(),
      kind: paymentKindValidator,
      accountName: v.string(),
      accountNumber: v.string(),
      imageUrl: v.optional(v.string()),
      instructions: v.string(),
      active: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),

    // ---- community channels (WhatsApp groups/channels in popups) ---------------
    channels: defineTable({
      name: v.string(),
      kind: v.string(), // "group" | "channel"
      url: v.string(),
      active: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
    })
      .index("by_active", ["active"]),

    // ---- audit log (was public.audit_log) ------------------------------------
    auditLog: defineTable({
      adminId: v.id("users"),
      adminName: v.string(),
      action: v.string(),
      targetId: v.optional(v.id("users")),
      targetName: v.string(),
      detail: v.string(),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    // ---- reward claims (was public.reward_claims) ------------------------------
    rewardClaims: defineTable({
      userId: v.id("users"),
      amount: v.number(),
      whatsappProof: v.optional(v.string()),
      facebookProof: v.optional(v.string()),
      status: claimStatusValidator,
      adminNote: v.string(),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"])
      .index("by_status", ["status"]),

    // ---- leader plans (was public.leader_plans) ---------------------------------
    leaderPlans: defineTable({
      userId: v.id("users"),
      investmentId: v.optional(v.id("investments")),
      planId: v.string(),
      planName: v.string(),
      amount: v.number(),
      checkHours: v.number(),
      requiredInvestment: v.number(),
      deadlineAt: v.number(),
      status: leaderPlanStatusValidator,
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // ---- api keys (was public.api_keys) ------------------------------------------
    apiKeys: defineTable({
      provider: v.string(),
      label: v.string(),
      apiKey: v.string(),
      purpose: v.string(),
      active: v.boolean(),
      uploads: v.number(),
      failures: v.number(),
      bytes: v.number(),
      lastUsedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),

    // ---- withdrawal proofs (was public.withdrawal_proofs) ---------------------------
    withdrawalProofs: defineTable({
      userId: v.id("users"),
      transactionId: v.optional(v.id("transactions")),
      imageUrl: v.string(),
      amount: v.number(),
      status: claimStatusValidator,
      adminNote: v.string(),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // ---- checkout sessions (was public.checkout_sessions) ---------------------------
    checkoutSessions: defineTable({
      token: v.string(),
      orderNo: v.string(),
      userId: v.id("users"),
      amount: v.number(),
      status: v.string(),
      siteUrl: v.optional(v.string()), // the website origin that created this session (for the gateway return_url)
      methodId: v.optional(v.string()),
      methodName: v.optional(v.string()),
      proofUrl: v.optional(v.string()),
      gatewayReference: v.optional(v.string()),
      transactionId: v.optional(v.id("transactions")),
      expiresAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_token", ["token"])
      .index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
