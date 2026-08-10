import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getProfileByUserId,
  getUserId,
  logAudit,
  pushNotification,
  requireAdmin,
  requireUser,
} from "./helpers";

export const myNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.filter((n) => !n.read).length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== userId) throw new Error("Not found");
    if (!n.read) await ctx.db.patch(id, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const n of rows) {
      if (!n.read) await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const n = await ctx.db.get(id);
    if (!n || n.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/** Admin: push a broadcast notification to a user. */
export const adminNotify = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    kind: v.optional(v.string()),
    popup: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, title, body, kind, popup }) => {
    const admin = await requireAdmin(ctx);
    await pushNotification(ctx, userId, title, body, kind ?? "info", popup ?? false);
    const target = await getProfileByUserId(ctx, userId);
    await logAudit(ctx, admin, "Sent notification", {
      targetId: userId,
      targetName: target?.name ?? "",
      detail: title,
    });
  },
});

/**
 * Admin: broadcast a notification to every user (or a chosen subset). Mirror of
 * the original Broadcast tab — when `userIds` is omitted it goes to everyone.
 */
export const adminBroadcast = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    userIds: v.optional(v.array(v.id("users"))),
    kind: v.optional(v.string()),
    popup: v.optional(v.boolean()),
  },
  handler: async (ctx, { title, body, userIds, kind, popup }) => {
    const admin = await requireAdmin(ctx);
    let targets: typeof userIds = userIds;
    if (!targets || targets.length === 0) {
      const profiles = await ctx.db.query("profiles").collect();
      targets = profiles.map((p) => p.userId);
    }
    for (const uid of targets) {
      await pushNotification(ctx, uid, title, body, kind ?? "info", popup ?? false);
    }
    await logAudit(ctx, admin, "Broadcast sent", {
      detail: `${title} · ${targets.length} users`,
    });
    return targets.length;
  },
});
