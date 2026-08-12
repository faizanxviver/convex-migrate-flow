import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ROLES } from "./schema";

/** Round money to paisa so stored values never drift on display. */
export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const MIN_REFERRAL_LEN = 4;

/** Deterministic greeting-style referral code, e.g. HPX7K3QF. */
export function generateReferralCode(prefix = "HPX"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${code}`;
}

/** Resolve the signed-in user's Convex user id, or null. */
export async function getUserId(ctx: QueryCtx | MutationCtx) {
  return await getAuthUserId(ctx);
}

/** The full users row for the signed-in user, or null. */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  return user ?? null;
}

export async function requireUser(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId as Id<"users">;
}

/** True when the signed-in user holds the admin role. */
export async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  return user?.role === ROLES.ADMIN;
}

export async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const user = await getAuthUser(ctx);
  if (!user || user.role !== ROLES.ADMIN) throw new Error("Forbidden");
  return user as Doc<"users"> & { role: "admin" };
}

/** Admin + user profile row for the signed-in user. Throws when missing. */
export async function requireProfile(ctx: MutationCtx | QueryCtx) {
  const userId = await requireUser(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function getProfileByUserId(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function getProfileByCode(ctx: QueryCtx | MutationCtx, code: string) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
    .unique();
}

export async function getSettings(ctx: QueryCtx | MutationCtx) {
  // Settings is a singleton table — take the single row (if any).
  const rows = await ctx.db.query("settings").collect();
  return rows[0] ?? null;
}

export async function pushNotification(
  ctx: MutationCtx,
  userId: Id<"users">,
  title: string,
  body: string,
  kind: string = "info",
  popup = false,
  image?: string,
) {
  await ctx.db.insert("notifications", {
    userId,
    title,
    body,
    kind,
    image: image || undefined,
    read: false,
    popup,
    createdAt: Date.now(),
  });
}

export async function logAudit(
  ctx: MutationCtx,
  admin: Doc<"users">,
  action: string,
  opts: { targetId?: Id<"users">; targetName?: string; detail?: string } = {},
) {
  await ctx.db.insert("auditLog", {
    adminId: admin._id,
    adminName: admin.name ?? admin.email ?? "Admin",
    action,
    targetId: opts.targetId,
    targetName: opts.targetName ?? "",
    detail: opts.detail ?? "",
    createdAt: Date.now(),
  });
}

/** Insert a transaction row with the standard shape. */
export async function addTransaction(
  ctx: MutationCtx,
  userId: Id<"users">,
  tx: {
    type: "deposit" | "withdraw" | "investment" | "commission" | "bonus" | "payout";
    amount: number;
    method?: string;
    status?: "pending" | "processing" | "approved" | "completed" | "rejected";
    note?: string;
    reference?: string;
    proofUrl?: string;
  },
) {
  return await ctx.db.insert("transactions", {
    userId,
    type: tx.type,
    amount: round2(tx.amount),
    method: tx.method,
    status: tx.status ?? "pending",
    note: tx.note,
    reference: tx.reference,
    proofUrl: tx.proofUrl,
    createdAt: Date.now(),
  });
}

// ============================================================================
// Public API
// ============================================================================

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const [user, profile] = await Promise.all([
      ctx.db.get(userId),
      getProfileByUserId(ctx, userId),
    ]);
    return { user, profile };
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/** Upload tickets for proof screenshots and chat attachments (Convex storage). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Deletes a stored file (used when an upload is replaced). */
export const deleteFile = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
  },
});
