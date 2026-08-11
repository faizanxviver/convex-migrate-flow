import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight realtime "typing…" indicator for a 1:1 support thread.
 * Both sides join the same BroadcastChannel keyed by the customer's user id,
 * so typing state is shared between the user's tab and the admin's tab.
 */
export function useTyping(threadId: string | null, me: "user" | "support") {
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSent = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!threadId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`hopex-typing:${threadId}`);
    channel.onmessage = (ev) => {
      const from = (ev.data as { from?: string })?.from;
      if (from === me) return;
      setPeerTyping(true);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setPeerTyping(false), 2500);
    };
    channelRef.current = channel;
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      channelRef.current = null;
      setPeerTyping(false);
      channel.close();
    };
  }, [threadId, me]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 900) return;
    lastSent.current = now;
    try {
      channelRef.current?.postMessage({ from: me });
    } catch {
      // channel closed — ignore
    }
  }, [me]);

  return { peerTyping, notifyTyping };
}
