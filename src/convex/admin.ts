import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  addTransaction,
  getProfileByUserId,
  getProfileByCode,
  getSettings,
  logAudit,
  pushNotification,
  requireAdmin,
  round2,
} from "./helpers";
import { ROLES, kycStatusValidator } from "./schema";

// ============================================================================
// Users
// ============================================================================

export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const profiles = await ctx.db.query("profiles").collect();
    profiles.sort((a, b) => b.createdAt - a.createdAt);

    // Join auth user rows for role + email.
    const userIds = [...new Set(profiles.map((p) => p.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userById = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    return profiles.map((p) => ({
      profileId: p._id,
      userId: p.userId,
      name: p.name,
      email: p.email ?? userById.get(p.userId)?.email ?? "",
      phone: p.phone,
      role: userById.get(p.userId)?.role ?? ROLES.USER,
      verified: p.verified,
      blocked: p.blocked,
      kyc: p.kyc,
      language: p.language,
      referralCode: p.referralCode,
      referredBy: p.referredBy,
      balance: p.balance,
      invested: p.invested,
      earnings: p.earnings,
      referralEarnings: p.referralEarnings,
      createdAt: p.createdAt,
    }));
  },
});

export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    blocked: v.optional(v.boolean()),
    verified: v.optional(v.boolean()),
    kyc: v.optional(kycStatusValidator),
    role: v.optional(v.union(v.literal(ROLES.ADMIN), v.literal(ROLES.USER))),
  },
  handler: async (ctx, { userId, name, blocked, verified, kyc, role }) => {
    const admin = await requireAdmin(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("User not found");

    const now = Date.now();
    if (name !== undefined && name.trim().length >= 2) {
      await ctx.db.patch(profile._id, { name: name.trim(), updatedAt: now });
      await ctx.db.patch(userId, { name: name.trim() });
    }
    if (blocked !== undefined) await ctx.db.patch(profile._id, { blocked, updatedAt: now });
    if (verified !== undefined) await ctx.db.patch(profile._id, { verified, updatedAt: now });
    if (kyc !== undefined) await ctx.db.patch(profile._id, { kyc, updatedAt: now });
    if (role !== undefined) await ctx.db.patch(userId, { role });

    await logAudit(ctx, admin, "Updated user", {
      targetId: userId,
      targetName: profile.name,
      detail: [
        name !== undefined ? `name` : "",
        blocked !== undefined ? `blocked=${blocked}` : "",
        verified !== undefined ? `verified=${verified}` : "",
        kyc !== undefined ? `kyc=${kyc}` : "",
        role !== undefined ? `role=${role}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    });
  },
});

/** Admin credits or debits a user's balance (mirror of admin_adjust_balance). */
export const adminAdjustBalance = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    kind: v.union(v.literal("deposit"), v.literal("withdraw")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, kind, note }) => {
    const admin = await requireAdmin(ctx);
    if (amount <= 0) throw new Error("Amount must be greater than zero");
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("User not found");

    const amt = round2(amount);
    let delta: number;
    let txType: "deposit" | "withdraw";

    if (kind === "deposit") {
      delta = amt;
      txType = "deposit";
    } else {
      if (profile.balance < amt) throw new Error("Insufficient balance");
      delta = -amt;
      txType = "withdraw";
    }

    const newBalance = round2(profile.balance + delta);
    await ctx.db.patch(profile._id, { balance: newBalance, updatedAt: Date.now() });

    await addTransaction(ctx, userId, {
      type: txType,
      amount: amt,
      method: "Admin adjustment",
      status: "completed",
      note: note?.trim() || "",
    });
    await pushNotification(
      ctx,
      userId,
      delta > 0 ? "Balance credited" : "Balance deducted",
      `Rs ${amt.toLocaleString("en-PK")} ${
        delta > 0 ? "was added to" : "was deducted from"
      } your account by support.`,
      delta > 0 ? "success" : "info",
      true,
    );
    await logAudit(ctx, admin, `${delta > 0 ? "Credited" : "Deducted"} balance`, {
      targetId: userId,
      targetName: profile.name,
      detail: `Rs ${amt.toLocaleString("en-PK")} · ${note?.trim() || kind}`,
    });

    return newBalance;
  },
});

// ============================================================================
// Stats
// ============================================================================

export const adminGetStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [profiles, txs, investments] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("transactions").collect(),
      ctx.db.query("investments").collect(),
    ]);

    const deposits = txs.filter((t) => t.type === "deposit");
    const withdrawals = txs.filter((t) => t.type === "withdraw");
    const pendingTxs = txs.filter((t) => t.status === "pending" || t.status === "processing");
    const pendingDeposits = pendingTxs.filter((t) => t.type === "deposit").reduce((a, t) => a + t.amount, 0);
    const pendingWithdrawals = pendingTxs.filter((t) => t.type === "withdraw").reduce((a, t) => a + t.amount, 0);

    return {
      users: profiles.length,
      activeUsers: profiles.filter((p) => !p.blocked).length,
      aum: round2(profiles.reduce((a, p) => a + p.invested, 0)),
      totalEarnings: round2(profiles.reduce((a, p) => a + p.earnings, 0)),
      totalDeposits: round2(deposits.filter((t) => t.status === "approved" || t.status === "completed").reduce((a, t) => a + t.amount, 0)),
      totalWithdrawals: round2(withdrawals.filter((t) => t.status === "completed").reduce((a, t) => a + t.amount, 0)),
      pendingDeposits,
      pendingWithdrawals,
      pendingCount: pendingTxs.length,
      investments: investments.length,
    };
  },
});

// ============================================================================
// Settings
// ============================================================================

export const adminUpdateSettings = mutation({
  args: {
    siteName: v.optional(v.string()),
    siteTitle: v.optional(v.string()),
    siteLogo: v.optional(v.string()),
    supportWhatsapp: v.optional(v.string()),
    minDeposit: v.optional(v.number()),
    minWithdraw: v.optional(v.number()),
    levels: v.optional(v.array(v.number())),
    quickAmounts: v.optional(v.array(v.number())),
    announcementText: v.optional(v.string()),
    announcementActive: v.optional(v.boolean()),
    maintenanceMode: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
    salaryTiers: v.optional(
      v.array(v.object({ rank: v.string(), team: v.number(), invested: v.number(), salary: v.number() })),
    ),
    rewardAmount: v.optional(v.number()),
    rewardCooldownHours: v.optional(v.number()),
    rewardActive: v.optional(v.boolean()),
    proofRewardAmount: v.optional(v.number()),
    showProofsSection: v.optional(v.boolean()),
    withdrawOpenHour: v.optional(v.number()),
    withdrawCloseHour: v.optional(v.number()),
  },
  handler: async (ctx, patch) => {
    const admin = await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    if (!settings) throw new Error("Settings not found");
    await ctx.db.patch(settings._id, { ...patch, updatedAt: Date.now() });
    await logAudit(ctx, admin, "Updated settings", {
      detail: Object.keys(patch).join(", "),
    });
    return settings._id;
  },
});

// ============================================================================
// Payment methods
// ============================================================================

export const listPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("paymentMethods").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const adminUpsertPaymentMethod = mutation({
  args: {
    id: v.optional(v.id("paymentMethods")),
    name: v.string(),
    kind: v.union(v.literal("wallet"), v.literal("bank")),
    accountName: v.string(),
    accountNumber: v.string(),
    imageUrl: v.optional(v.string()),
    instructions: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Method not found");
      await ctx.db.patch(args.id, {
        name: args.name,
        kind: args.kind,
        accountName: args.accountName,
        accountNumber: args.accountNumber,
        imageUrl: args.imageUrl,
        instructions: args.instructions,
        active: args.active,
        sortOrder: Math.round(args.sortOrder),
        updatedAt: now,
      });
      await logAudit(ctx, admin, "Updated payment method", { targetName: args.name });
      return args.id;
    }
    const id = await ctx.db.insert("paymentMethods", {
      name: args.name,
      kind: args.kind,
      accountName: args.accountName,
      accountNumber: args.accountNumber,
      imageUrl: args.imageUrl,
      instructions: args.instructions,
      active: args.active,
      sortOrder: Math.round(args.sortOrder),
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, admin, "Created payment method", { targetName: args.name });
    return id;
  },
});

export const adminDeletePaymentMethod = mutation({
  args: { id: v.id("paymentMethods") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const m = await ctx.db.get(id);
    if (!m) throw new Error("Method not found");
    await ctx.db.delete(id);
    await logAudit(ctx, admin, "Deleted payment method", { targetName: m.name });
  },
});

// ============================================================================
// API keys (image hosting pool)
// ============================================================================

export const adminListApiKeys = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("apiKeys").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminUpsertApiKey = mutation({
  args: {
    id: v.optional(v.id("apiKeys")),
    provider: v.string(),
    label: v.string(),
    apiKey: v.string(),
    purpose: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Key not found");
      await ctx.db.patch(args.id, {
        provider: args.provider,
        label: args.label,
        apiKey: args.apiKey,
        purpose: args.purpose,
        active: args.active,
        updatedAt: now,
      });
      await logAudit(ctx, admin, "Updated API key", { targetName: args.label });
      return args.id;
    }
    const id = await ctx.db.insert("apiKeys", {
      provider: args.provider,
      label: args.label,
      apiKey: args.apiKey,
      purpose: args.purpose,
      active: args.active,
      uploads: 0,
      failures: 0,
      bytes: 0,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, admin, "Created API key", { targetName: args.label });
    return id;
  },
});

export const adminDeleteApiKey = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const k = await ctx.db.get(id);
    if (!k) throw new Error("Key not found");
    await ctx.db.delete(id);
    await logAudit(ctx, admin, "Deleted API key", { targetName: k.label });
  },
});

// ============================================================================
// Audit log
// ============================================================================

export const adminAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("auditLog").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  },
});

/** Lookup helper: profile by referral code (used by admin tools + signup). */
export const lookupReferral = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    const p = await getProfileByCode(ctx, clean);
    return p ? { name: p.name, referralCode: p.referralCode } : null;
  },
});
