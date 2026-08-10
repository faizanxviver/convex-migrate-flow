import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  generateReferralCode,
  getAuthUser,
  getProfileByUserId,
  getUserId,
  pushNotification,
  requireUser,
  round2,
} from "./helpers";
import { ROLES } from "./schema";

const ADMIN_EMAILS = ["admin@hopex.io", "admin@aurum.io"];

/**
 * Creates the HopeX profile row + welcome data the first time a signed-in user
 * opens the app (the Convex equivalent of the `handle_new_user` DB trigger).
 * Fresh accounts start with a Rs 0 balance — no seeded bonus funds.
 */
export const ensureProfile = mutation({
  args: { referredBy: v.optional(v.string()) },
  handler: async (ctx, { referredBy }) => {
    const userId = await requireUser(ctx);
    const existing = await getProfileByUserId(ctx, userId);
    if (existing) return existing._id;

    const user = (await ctx.db.get(userId))!;

    let code = generateReferralCode();
    // Collision-safe loop.
    for (let i = 0; i < 20; i++) {
      const dup = await ctx.db
        .query("profiles")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
        .unique();
      if (!dup) break;
      code = generateReferralCode();
    }

    const email = user.email ?? "";
    const name = (user.name ?? email.split("@")[0] ?? "Investor").trim() || "Investor";
    const now = Date.now();

    const profileId = await ctx.db.insert("profiles", {
      userId,
      name,
      email: email || undefined,
      phone: undefined,
      verified: true,
      blocked: false,
      kyc: "not_submitted",
      twoFactor: false,
      language: "en",
      referralCode: code,
      referredBy: referredBy?.trim().toUpperCase() || undefined,
      balance: 0,
      invested: 0,
      earnings: 0,
      referralEarnings: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-admin for the reserved operator addresses (mirrors the old trigger).
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      await ctx.db.patch(userId, { role: ROLES.ADMIN });
    }

    await pushNotification(
      ctx,
      userId,
      "Welcome to HopeX 🎉",
      "Fund your wallet and activate a plan to start earning daily income.",
      "success",
      true,
    );

    await ctx.db.insert("chatMessages", {
      userId,
      sender: "support",
      text: "Hi 👋 Welcome to HopeX support. How can we help today?",
      createdAt: now,
    });

    return profileId;
  },
});

/** Update editable personal fields (name, phone, language). */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("ur"))),
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("Profile not found");

    const patch: Partial<Doc<"profiles">> = { updatedAt: Date.now() };
    if (args.name !== undefined && args.name.trim().length >= 2) {
      patch.name = args.name.trim();
      await ctx.db.patch(userId, { name: args.name.trim() });
    }
    if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined;
    if (args.language !== undefined) patch.language = args.language;
    if (args.bankName !== undefined) patch.bankName = args.bankName;
    if (args.accountName !== undefined) patch.accountName = args.accountName?.trim() || undefined;
    if (args.accountNumber !== undefined) patch.accountNumber = args.accountNumber?.trim() || undefined;

    await ctx.db.patch(profile._id, patch);
    return profile._id;
  },
});

/** Bind or change the single payout account (JazzCash / Easypaisa / bank). */
export const updatePayoutAccount = mutation({
  args: {
    method: v.string(),
    holder: v.string(),
    account: v.string(),
  },
  handler: async (ctx, { method, holder, account }) => {
    const userId = await requireUser(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("Profile not found");
    if (holder.trim().length < 3) throw new Error("Enter the account holder name");
    if (!/^\d{10,15}$/.test(account.trim().replace(/\D/g, "")))
      throw new Error("Enter a valid mobile account number");

    await ctx.db.patch(profile._id, {
      bankName: method,
      accountName: holder.trim(),
      accountNumber: account.trim(),
      updatedAt: Date.now(),
    });
    return profile._id;
  },
});

/** My own full profile. */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return null;
    const profile = await getProfileByUserId(ctx, userId);
    return profile ?? null;
  },
});

/** Top 25 performers — mirror of the `leaderboard()` SQL function. */
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter(
        (p) =>
          !p.blocked && (p.earnings > 0 || p.referralEarnings > 0 || p.invested > 0),
      )
      .sort((a, b) =>
        b.referralEarnings === a.referralEarnings
          ? b.earnings - a.earnings
          : b.referralEarnings - a.referralEarnings,
      )
      .slice(0, 25)
      .map((p) => ({
        name: p.name,
        earnings: round2(p.earnings),
        invested: round2(p.invested),
        referralEarnings: round2(p.referralEarnings),
      }));
  },
});

/** 4-level downline network for the caller (mirror of my_network_codes). */
export const getNetwork = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return null;
    const me = await getProfileByUserId(ctx, userId);
    if (!me) return null;

    const all = await ctx.db.query("profiles").collect();
    const byRef = new Map<string, Doc<"profiles">[]>();
    for (const p of all) {
      if (p.referredBy) {
        const list = byRef.get(p.referredBy) ?? [];
        list.push(p);
        byRef.set(p.referredBy, list);
      }
    }

    const levels: { name: string; invested: number; earnings: number; joinedAt: number }[][] = [];
    let codes = [me.referralCode];
    for (let i = 0; i < 4; i++) {
      const members: Doc<"profiles">[] = [];
      for (const c of codes) members.push(...(byRef.get(c) ?? []));
      levels.push(
        members.map((m) => ({
          name: m.name,
          invested: round2(m.invested),
          earnings: round2(m.earnings),
          joinedAt: m.createdAt,
        })),
      );
      codes = members.map((m) => m.referralCode);
      if (!codes.length) break;
    }
    while (levels.length < 4) levels.push([]);

    const direct = levels[0] ?? [];
    return {
      referralCode: me.referralCode,
      levels,
      totalMembers: levels.reduce((a, l) => a + l.length, 0),
      teamInvested: round2(direct.reduce((a, m) => a + m.invested, 0)),
      teamCount: direct.length,
      income: {
        balance: round2(me.balance),
        referralEarnings: round2(me.referralEarnings),
        earnings: round2(me.earnings),
        invested: round2(me.invested),
      },
    };
  },
});

/** Safe check of the current user's auth identity. */
export const getMeLight = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    return user ? { id: user._id, name: user.name, email: user.email, role: user.role } : null;
  },
});
