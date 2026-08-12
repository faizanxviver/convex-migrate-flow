import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

/**
 * Web Push on the frontend. The app asks once (on the dashboard) for
 * notification permission; when granted it registers the service worker and
 * saves the subscription so the admin can push to this phone later.
 */
export function usePush() {
  const save = useMutation(api.push.savePushSubscription);
  const remove = useMutation(api.push.userDeletePushSubscription);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
  );
  const [enabled, setEnabled] = useState(false);

  // Track the permission state live.
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const update = () => setPermission(Notification.permission);
    update();
    const nav = navigator as Navigator & {
      permissions?: { query: (d: { name: string }) => Promise<{ state: string; onChange?: () => void }> };
    };
    nav.permissions
      ?.query({ name: "notifications" })
      .then((s) => {
        s.onchange = update;
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ask for permission + register + save. Returns true on success. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return false;
    try {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== "granted") return false;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // Public VAPID key — supplied by the owner via env; falls back to a
          // placeholder that keeps the UI working until real keys are added.
          (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ??
            "BEl62iUYgUivxIkv69yViEuiBIaIBK5fW0RBK3IkF7qPp9xY3Zx0j2f8VvCxLf0b2xZ2q7F3iY0R6j8Jg6s7h9T",
        ),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys) return false;
      await save({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      setEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [save]);

  /** Unsubscribe + remove from the server. */
  const disable = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch {
      /* ignore */
    }
    setEnabled(false);
  }, [remove]);

  return { permission, enabled, enable, disable };
}

/** Convert a base64url VAPID key into the Uint8Array pushManager expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
