import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** True when the page is running inside an installed PWA (standalone window). */
export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // @ts-expect-error iOS Safari legacy flag
    window.navigator.standalone === true
  );
}

/**
 * Install the app. Uses the browser's native beforeinstallprompt when Chrome
 * provides it; otherwise (iframe preview, iOS Safari, Firefox) returns false so
 * the UI can show manual instructions instead.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) {
      setChecked(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setChecked(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // If no prompt within 3s, this browser can't do it natively — fall back.
    const t = setTimeout(() => setChecked(true), 3000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
      return true;
    }
    return false;
  }, [deferred]);

  return { canInstall: deferred !== null && !installed, install, installed, checked };
}
