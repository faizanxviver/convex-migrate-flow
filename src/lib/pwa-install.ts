/**
 * Silent native PWA install prompt.
 *
 * The owner wants the BROWSER itself to ask the user about installing the
 * app — no visible install UI anywhere on the website. Chrome / Edge /
 * Android fire `beforeinstallprompt` when the site is installable (manifest +
 * service worker + HTTPS). We capture that event, suppress the browser's
 * quiet mini-infobar, and after a short beat call the native `prompt()` so
 * the real install dialog appears on its own, like YouTube or other apps.
 *
 * Browsers that never fire the event (iOS Safari, non-supporting browsers,
 * already-installed app) simply see nothing — no fallback UI, per spec.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function initSilentInstallPrompt() {
  if (typeof window === "undefined") return;

  // Already running as an installed app — never prompt inside the app.
  if (window.matchMedia("(display-mode: standalone)").matches) return;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return;

  // Never interrupt the MPay gateway boot tab.
  if (window.location.pathname.startsWith("/gateway-boot")) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    const deferred = event as BeforeInstallPromptEvent;
    // Let the page paint first, then show the browser's native install dialog.
    window.setTimeout(() => {
      void deferred
        .prompt()
        .catch(() => {
          /* browser refused — stay silent */
        })
        .finally(() => {
          /* one shot per page load */
        });
    }, 2000);
  });
}
