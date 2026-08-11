import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAudit, requireAdmin } from "./helpers";

/**
 * Community channels (WhatsApp groups / channels) surfaced in the landing
 * welcome popup and the in-app "Channels & Groups" menu. Links are managed by
 * admins from the Admin console → Channels tab.
 */

/** Active channels with a real link, ordered for display. Public. */
export const listChannels = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("channels").collect();
    return rows
      .filter((c) => c.active && c.url.trim().length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ _id: c._id, name: c.name, kind: c.kind, url: c.url, sortOrder: c.sortOrder }));
  },
});

/** Every channel (including inactive / empty links) for the admin manager. */
export const adminListChannels = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("channels").collect();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** Create or update a channel. */
export const adminUpsertChannel = mutation({
  args: {
    id: v.optional(v.id("channels")),
    name: v.string(),
    kind: v.string(),
    url: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, { id, name, kind, url, active, sortOrder }) => {
    const admin = await requireAdmin(ctx);
    if (id) {
      await ctx.db.patch(id, { name, kind, url, active, sortOrder });
    } else {
      await ctx.db.insert("channels", { name, kind, url, active, sortOrder, createdAt: Date.now() });
    }
    await logAudit(ctx, admin, "Saved channel", { detail: name });
    return true;
  },
});

/** Delete a channel. */
export const adminDeleteChannel = mutation({
  args: { id: v.id("channels") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.delete(id);
    await logAudit(ctx, admin, "Deleted channel", { detail: id });
    return true;
  },
});
