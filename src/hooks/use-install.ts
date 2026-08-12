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
 * Browser "install app" prompt. Only fires in Chrome/Edge/Samsung Internet;
 * returns false when the app is already installed (standalone mode) or when
 * the browser never emits beforeinstallprompt (iOS, etc.).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) return;

    const onPrompt = (e: Event) => {
      // Prevent the default mini-infobar so we control the UI.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
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

  return { canInstall: deferred !== null && !installed, install, installed };
}
