import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Active imgbb keys for a purpose, least-used first (simple load spreading).
 * Mirrors the original api-keys.server.ts pickKeys().
 */
export const listImgbbKeys = query({
  args: { purpose: v.string() },
  handler: async (ctx, { purpose }) => {
    const rows = await ctx.db.query("apiKeys").collect();
    return rows
      .filter(
        (k) =>
          k.provider === "imgbb" &&
          k.active &&
          (k.purpose === "all" || k.purpose === purpose),
      )
      .sort((a, b) => a.uploads - b.uploads)
      .map((k) => ({ _id: k._id, apiKey: k.apiKey }));
  },
});

/** Best-effort usage tracking on a pool key (mirrors recordUsage). */
export const recordKeyUsage = mutation({
  args: {
    id: v.id("apiKeys"),
    ok: v.boolean(),
    bytes: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ok, bytes, error }) => {
    const key = await ctx.db.get(id);
    if (!key) return;
    await ctx.db.patch(id, {
      uploads: key.uploads + (ok ? 1 : 0),
      failures: key.failures + (ok ? 0 : 1),
      bytes: key.bytes + (ok ? bytes : 0),
      lastUsedAt: Date.now(),
      lastError: ok ? undefined : (error ?? "Upload failed").slice(0, 300),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Uploads a base64 image to imgbb and returns the hosted URL. Keys come from
 * the admin-managed pool (table api_keys); the IMGBB_API_KEY secret is used as
 * a fallback when the pool is empty. If a key fails, the next one is tried —
 * the exact port of the original uploads.functions.ts server fn.
 */
export const uploadImage = action({
  args: {
    base64: v.string(),
    name: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, { base64, name, purpose }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    if (!base64 || base64.length > 14_000_000) {
      throw new Error("Image is too large (max 10MB)");
    }

    const purposeKey = purpose ?? "all";
    const bytes = Math.round((base64.length * 3) / 4);

    const pool = await ctx.runQuery(api.upload.listImgbbKeys, { purpose: purposeKey });
    const candidates: { id: Id<"apiKeys"> | null; key: string }[] = pool.map((k) => ({
      id: k._id,
      key: k.apiKey,
    }));
    const envKey = process.env.IMGBB_API_KEY;
    if (envKey) candidates.push({ id: null, key: envKey });
    if (!candidates.length) throw new Error("Image hosting is not configured");

    let lastError = "Upload failed";
    for (const c of candidates) {
      try {
        const body = new FormData();
        body.append("key", c.key);
        body.append("image", base64);
        if (name) body.append("name", name.slice(0, 60));

        const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { url?: string; display_url?: string };
          error?: { message?: string };
        };
        if (res.ok && json.success && json.data?.url) {
          if (c.id) {
            await ctx.runMutation(api.upload.recordKeyUsage, { id: c.id, ok: true, bytes });
          }
          return { url: json.data.display_url ?? json.data.url };
        }
        lastError = json.error?.message ?? `Upload failed (${res.status})`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Upload failed";
      }
      if (c.id) {
        await ctx.runMutation(api.upload.recordKeyUsage, {
          id: c.id,
          ok: false,
          bytes: 0,
          error: lastError,
        });
      }
    }
    throw new Error(lastError);
  },
});
