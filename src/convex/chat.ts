import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getProfileByUserId, getUserId, requireAdmin, requireUser } from "./helpers";

const attachmentValidator = v.object({
  name: v.string(),
  kind: v.union(v.literal("image"), v.literal("file"), v.literal("audio")),
  url: v.optional(v.string()),
  duration: v.optional(v.number()),
});

/** My own 1:1 support thread, oldest first. */
export const myChat = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** Send a message as the signed-in user. */
export const sendUserMessage = mutation({
  args: {
    text: v.string(),
    attachment: v.optional(attachmentValidator),
    replyTo: v.optional(
      v.object({ from: v.union(v.literal("user"), v.literal("support")), text: v.string() }),
    ),
  },
  handler: async (ctx, { text, attachment, replyTo }) => {
    const userId = await requireUser(ctx);
    const clean = text.trim();
    if (!clean && !attachment) throw new Error("Message is empty");
    return await ctx.db.insert("chatMessages", {
      userId,
      sender: "user",
      text: clean,
      status: "sent",
      attachment,
      replyTo,
      createdAt: Date.now(),
    });
  },
});

/** Admin: every user thread, flattened with profile names for the inbox. */
export const adminThreads = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const messages = await ctx.db.query("chatMessages").collect();
    messages.sort((a, b) => a.createdAt - b.createdAt);

    const profiles = await ctx.db.query("profiles").collect();
    const nameById = new Map<Id<"users">, string>(profiles.map((p) => [p.userId, p.name]));

    const byUser = new Map<Id<"users">, typeof messages>();
    for (const m of messages) {
      const list = byUser.get(m.userId) ?? [];
      list.push(m);
      byUser.set(m.userId, list);
    }

    return Array.from(byUser.entries())
      .map(([userId, msgs]) => ({
        userId,
        name: nameById.get(userId) ?? "User",
        messages: msgs,
        lastAt: msgs[msgs.length - 1]?.createdAt ?? 0,
        // A user message is unread until the admin opens the thread (status -> "read").
        unread: msgs.filter((m) => m.sender === "user" && m.status !== "read").length,
      }))
      .sort((a, b) => b.lastAt - a.lastAt);
  },
});

/** Admin: reply to a user's thread as support. */
/** User: mark every support message in my thread as read (blue double-tick). */
export const markUserRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    for (const m of rows) {
      if (m.sender === "support" && m.status !== "read") {
        await ctx.db.patch(m._id, { status: "read" });
      }
    }
    return rows.filter((m) => m.sender === "support").length;
  },
});

/** Admin: mark every user message in a thread as read (clears the inbox badge). */
export const markAdminRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    for (const m of rows) {
      if (m.sender === "user" && m.status !== "read") {
        await ctx.db.patch(m._id, { status: "read" });
      }
    }
    return rows.filter((m) => m.sender === "user").length;
  },
});

/** User: permanently delete my own support thread ("Clear chat"). */
export const clearMyChat = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();
    for (const m of rows) await ctx.db.delete(m._id);
    return rows.length;
  },
});

export const adminReply = mutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    attachment: v.optional(attachmentValidator),
    replyTo: v.optional(
      v.object({ from: v.union(v.literal("user"), v.literal("support")), text: v.string() }),
    ),
  },
  handler: async (ctx, { userId, text, attachment, replyTo }) => {
    await requireAdmin(ctx);
    const profile = await getProfileByUserId(ctx, userId);
    if (!profile) throw new Error("User not found");
    const clean = text.trim();
    if (!clean && !attachment) throw new Error("Message is empty");
    return await ctx.db.insert("chatMessages", {
      userId,
      sender: "support",
      text: clean,
      status: "delivered",
      attachment,
      replyTo,
      createdAt: Date.now(),
    });
  },
});
