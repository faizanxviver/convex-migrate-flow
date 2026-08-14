"use node";

import { v } from "convex/values";
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
 * Requires VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in env
 * (set them in the Freebuff Keys tab).
 */
export const adminSendPush = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    userIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, { title, body, url, userIds }) => {
    const isAdmin = await ctx.runQuery(internal.push.isAdmin, {});
    if (!isAdmin) throw new Error("Forbidden");
    // Read the keys from the environment (Freebuff Keys tab / Convex env).
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@hopex.site";
    if (!publicKey || !privateKey) {
      throw new Error(
        "VAPID keys are not set. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the Keys tab, then try again.",
      );
    }

    const subs = await ctx.runQuery(internal.push.listSubscriptions, { userIds });
    if (subs.length === 0) return 0;

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url ?? "/dashboard" },
    });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 means the subscription is dead — drop it.
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await ctx.runMutation(internal.push.deletePushSubscription, {
            endpoint: s.endpoint,
          });
        }
      }
    }
    await ctx.runMutation(internal.push.logAuditPush, {
      detail: `${title} · ${sent} devices`,
    });
    return sent;
  },
});
