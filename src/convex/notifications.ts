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
