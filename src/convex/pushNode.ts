"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

/** Public VAPID key so the browser can subscribe. Stored once in the Keys tab
 *  as VAPID_PUBLIC_KEY and served to the app at runtime — no VITE_ duplicate.
 *  (Node runtime files can only expose actions, hence the action type.) */
export const getVapidPublicKey = action({
  args: {},
  handler: () => process.env.VAPID_PUBLIC_KEY ?? "",
});

/**
 * Admin: send a push notification to subscribed phones — even when the app is
 * closed (web push is delivered by the browser/Android even offline). When
 * `userIds` is omitted it goes to every subscribed device.
 *
 * Requires VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in env
 * (set them in the Freebuff Keys tab). Expected failures throw ConvexError so
 * the admin sees the real reason (production deployments redact plain Errors
 * to a generic "Server Error").
 */
export const adminSendPush = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    userIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, { title, body, url, userIds }) => {
    // 1. Admin check — auth is available directly on the action context; the
    //    role lookup runs as a plain DB read (no auth dependency).
    const adminId = await getAuthUserId(ctx);
    if (adminId === null) throw new ConvexError("Not authenticated");
    const isAdmin = await ctx.runQuery(internal.push.isAdmin, { userId: adminId });
    if (!isAdmin) throw new ConvexError("Forbidden");

    // 2. Read the VAPID keys from the environment (Freebuff Keys tab / Convex env).
    const publicKey = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
    const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
    const subject = (process.env.VAPID_SUBJECT ?? "").trim() || "mailto:admin@hopex.site";
    if (!publicKey || !privateKey) {
      throw new ConvexError(
        "VAPID keys are not set. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the Keys tab, then try again.",
      );
    }

    // 3. Load the target subscriptions.
    const subs = await ctx.runQuery(internal.push.listSubscriptions, { userIds });
    if (subs.length === 0) {
      throw new ConvexError(
        "No subscriptions found for the selected users. Users must tap Allow notifications in the app first.",
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url ?? "/dashboard" },
    });

    // 4. Send to each device. 404/410 means the subscription is dead — drop it.
    //    Other failures are collected so a single bad device can't mask a
    //    genuine key/network problem.
    let sent = 0;
    let failed = 0;
    const errorSet = new Set<string>();
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          try {
            await ctx.runMutation(internal.push.deletePushSubscription, {
              endpoint: s.endpoint,
            });
          } catch {
            /* dropping a dead subscription is best-effort */
          }
          continue;
        }
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        if (message) errorSet.add(message);
      }
    }

    // 5. Audit — never fail the send because the audit log write failed.
    try {
      await ctx.runMutation(internal.push.logAuditPush, {
        adminId,
        detail: `${title} · ${sent} sent / ${failed} failed`,
      });
    } catch {
      /* best-effort audit */
    }

    // 6. Report. If nothing went through, say exactly why (real message,
    //    not a redacted "Server Error").
    if (sent === 0 && failed > 0) {
      const reasons = [...errorSet].slice(0, 3).join(" | ");
      throw new ConvexError(
        `Push failed for ${failed} device(s). ${reasons || "Unknown error"}`,
      );
    }
    return sent;
  },
});
