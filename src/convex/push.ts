import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getUserId, requireUser } from "./helpers";

/** Internal: is the given user an admin? (used by the node action — the
 *  userId comes from the action's own auth context, so this is just a DB read). */
export const isAdmin = internalQuery({
  args: { userId: v.id("users") }, /* ok */
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

/**
 * Save the current user's browser push subscription (their phone's address).
 * Called by the app right after the user taps "Allow" on notifications.
 */
export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const userId = await requireUser(ctx);
    // Upsert by endpoint so reinstalls don't pile up rows.
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { p256dh, auth });
      return existing._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint,
      p256dh,
      auth,
      createdAt: Date.now(),
    });
  },
});

/** Remove a subscription (user denied, browser reset, or send failed). */
export const userDeletePushSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** True when the signed-in user has a saved push subscription — used to hide
 *  the "install the app / download APK" prompts from users who already have
 *  notifications on their phone. */
export const myPushEnabled = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return false;
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.length > 0;
  },
});

/**
 * Internal: VAPID keys for web push, as a DB fallback. The admin saves them in
 * the console (API Keys tab, provider "vapid") so push works without touching
 * the Freebuff Keys tab. Environment vars (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
 * still win when present — see pushNode.ts.
 */
export const getVapidKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("apiKeys").collect();
    const find = (purpose: string) => {
      const k = rows.find((r) => r.provider === "vapid" && r.purpose === purpose && r.active);
      return (k?.apiKey ?? "").trim();
    };
    return {
      publicKey: find("VAPID_PUBLIC_KEY"),
      privateKey: find("VAPID_PRIVATE_KEY"),
    };
  },
});

/** Internal: every user id with a profile (broadcast targets). */
export const listAllUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.map((p) => p.userId);
  },
});

/** Internal: subscriptions, optionally limited to specific users. */
export const listSubscriptions = internalQuery({
  args: { userIds: v.optional(v.array(v.id("users"))) },
  handler: async (ctx, { userIds }) => {
    const rows = await ctx.db.query("pushSubscriptions").collect();
    return rows
      .filter((r) => (userIds && userIds.length ? userIds.includes(r.userId) : true))
      .map((r) => ({
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      }));
  },
});

/** Internal: audit entry for a push send. */
export const logAuditPush = internalMutation({
  args: { adminId: v.id("users"), detail: v.string() },
  handler: async (ctx, { adminId, detail }) => {
    const user = await ctx.db.get(adminId);
    if (!user || user.role !== "admin") return;
    await ctx.db.insert("auditLog", {
      adminId,
      adminName: user.name ?? "",
      action: "Push sent",
      targetName: "",
      detail,
      createdAt: Date.now(),
    });
  },
});

/** Internal: drop a dead subscription. */
export const deletePushSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
