import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useHope, useTheme } from "@/hooks/use-hope";
import { useInstallPrompt } from "@/hooks/use-install";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BellRing,
  ChevronDown,
  Gem,
  Headset,
  House,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageCircle,
  Moon,
  ShieldHalf,
  Sun,
  UsersRound,
  WalletMinimal,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { initials } from "@/lib/hopex";
import { ChannelsPopup } from "./channels";
import { LiveChat } from "./live-chat";

/* ---------------- chat UI state (shared by shell + pages) ---------------- */

const ChatUiContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export const useChatUi = () => useContext(ChatUiContext);

/* ---------------- navigation ---------------- */

export const primaryNav = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: House },
  { to: "/dashboard/plans", label: "Plans", short: "Plans", icon: Gem },
  { to: "/dashboard/deposit", label: "Deposit", short: "Deposit", icon: WalletMinimal },
  { to: "/dashboard/referrals", label: "Referrals", short: "Team", icon: UsersRound },
  { to: "/dashboard/more", label: "More", short: "More", icon: LayoutGrid },
] as const;

export function Brand({ compact }: { compact?: boolean }) {
  const { settings } = useHope();
  const name = settings?.siteName || "HopeX";
  const logo = settings?.siteLogo;

  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
        {logo ? (
          <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
        ) : (
          (name[0] ?? "H")
        )}
      </span>
      {!compact ? <span className="font-display text-lg font-extrabold">{name}</span> : null}
    </Link>
  );
}

/* ---------------- announcement ---------------- */

function AnnouncementBanner() {
  const { settings, user } = useHope();
  const [closed, setClosed] = useState(false);
  const maintenance = settings?.maintenanceMode && user?.role !== "admin";
  const text = settings?.announcementText.trim() ?? "";

  if (maintenance) {
    return (
      <div className="relative mx-auto mt-3 flex max-w-7xl items-center gap-3 overflow-hidden rounded-2xl bg-warning/15 px-4 py-2.5 text-warning">
        <Megaphone className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 text-xs font-semibold">
          {settings?.maintenanceMessage ?? "Under scheduled maintenance"}
        </div>
        <button
          onClick={() => setClosed(true)}
          aria-label="Dismiss"
          className="shrink-0 transition hover:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!settings?.announcementActive || !text || closed) return null;
  return (
    <div className="relative mx-auto mt-3 flex max-w-7xl items-center gap-3 overflow-hidden rounded-2xl glass px-4 py-2.5">
      <Megaphone className="h-4 w-4 shrink-0 text-primary" />
      <div className="marquee min-w-0 flex-1 text-xs font-semibold">
        <span>{text}</span>
      </div>
      <button
        onClick={() => setClosed(true)}
        aria-label="Dismiss announcement"
        className="shrink-0 text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------------- popup notifications (broadcast-style) ---------------- */

const seenPopupIds = new Set<string>();

/**
 * Watch for notifications the admin flagged `popup: true` (broadcasts, direct
 * messages) and surface them as a push-style notification that slides in from
 * the TOP of the screen — like a phone notification. Once per session.
 */
function PopupNotifier() {
  const { notifications, settings } = useHope();
  const [current, setCurrent] = useState<Doc<"notifications"> | null>(null);
  const [queue, setQueue] = useState<Doc<"notifications">[]>([]);

  // Push newly-arrived popup notifications into the queue (once per session).
  useEffect(() => {
    for (const n of notifications) {
      if (!n.popup || n.read || seenPopupIds.has(n._id)) continue;
      seenPopupIds.add(n._id);
      setQueue((q) => (q.some((x) => x._id === n._id) ? q : [...q, n]));
    }
  }, [notifications]);

  // Show one at a time, auto-dismiss after 8s.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setQueue((q) => q.slice(1));
    const t = setTimeout(() => setCurrent(null), 8000);
    return () => clearTimeout(t);
  }, [current, queue]);

  if (!current) return null;

  const name = settings?.siteName || "HopeX";
  const logo = settings?.siteLogo;
  const kindTone =
    current.kind === "success"
      ? "bg-success/15 text-success"
      : current.kind === "warning"
        ? "bg-warning/20 text-warning"
        : current.kind === "danger"
          ? "bg-destructive/15 text-destructive"
          : "bg-primary/15 text-primary";
  const kindLabel =
    current.kind === "success"
      ? "Success"
      : current.kind === "warning"
        ? "Important"
        : current.kind === "danger"
          ? "Alert"
          : "Announcement";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3">
      <div className="notif-slide pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
        {/* header row */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          {current.image ? (
            <img
              src={current.image}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-border/60"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl gradient-brand font-display text-base font-black text-primary-foreground">
              {logo ? <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" /> : name[0]}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">now</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${kindTone}`}>
            {kindLabel}
          </span>
          <button
            onClick={() => setCurrent(null)}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body — every detail on its own line, nothing truncated */}
        <div className="space-y-2 px-4 py-3">
          <p className="text-[15px] font-extrabold leading-snug break-words">{current.title}</p>
          <p className="text-[13px] leading-relaxed whitespace-pre-line break-words text-muted-foreground">
            {current.body}
          </p>
        </div>

        {/* actions — full-width buttons that never overflow on small phones */}
        <div className="flex flex-col gap-2 border-t border-border/50 px-4 py-3 sm:flex-row">
          <button
            onClick={() => {
              setCurrent(null);
              window.dispatchEvent(new CustomEvent("hopex:open-notifications"));
            }}
            className="btn-glass flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-foreground sm:w-auto sm:flex-1"
          >
            <BellRing className="h-4 w-4" /> View details
          </button>
          <button
            onClick={() => setCurrent(null)}
            className="btn-glass btn-glass-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black sm:w-auto sm:flex-1"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PWA install banner ---------------- */

function InstallBanner() {
  const { canInstall, install, installed, checked } = useInstallPrompt();
  const { settings } = useHope();
  const pushEnabled = useQuery(api.push.myPushEnabled);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Users who already enabled phone notifications have the app — never nag them.
  if (installed || pushEnabled || dismissed || !checked) return null;

  const apkUrl = settings?.appDownloadUrl?.trim();

  const doInstall = async () => {
    if (apkUrl) {
      // Direct APK download — the small file downloads, the phone offers to
      // install it, and the banner disappears.
      const a = document.createElement("a");
      a.href = apkUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDismissed(true);
      toast.success("APK download started — install it from your downloads.");
      return;
    }
    setBusy(true);
    try {
      const ok = await install();
      if (ok) {
        setDismissed(true);
        toast.success("App installed!");
      } else {
        toast.error("App download link set nahi hai. Admin → Settings → App download link (APK) me daalein.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notif-slide pointer-events-none fixed inset-x-0 top-0 z-[99] flex justify-center px-3 pt-3">
      <div className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
        <span className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-success/15 blur-2xl" />
        <button
          onClick={() => setDismissed(true)}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative flex items-center gap-3 p-4 pr-11">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-brand font-display text-lg font-black text-primary-foreground shadow-lg shadow-primary/25">
            H
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Install the HopeX app</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {apkUrl ? "Download the app — deposits open outside, payments stay secure." : "One tap — deposits open outside the app, payments stay secure."}
            </p>
          </div>
          <button
            onClick={() => void doInstall()}
            disabled={busy}
            className="shrink-0 rounded-xl btn-glass btn-glass-primary px-3.5 py-2 text-xs font-black disabled:opacity-60"
          >
            {busy ? "…" : apkUrl ? "Download" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- notifications bell ---------------- */

function NotificationBell() {
  const { notifications, profile } = useHope();
  const { t } = useT(profile?.language ?? "en");
  const [open, setOpen] = useState(false);
  const markAll = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  // Allow popup toasts (PopupNotifier) to open this panel.
  useEffect(() => {
    const openBell = () => setOpen(true);
    window.addEventListener("hopex:open-notifications", openBell);
    return () => window.removeEventListener("hopex:open-notifications", openBell);
  }, []);

  const items = notifications;
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl glass-soft"
      >
        <BellRing className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-rise fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elegant)] sm:inset-x-auto sm:right-4 sm:w-80">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <p className="font-semibold">{t("Notifications")}</p>
              <button className="text-xs text-primary" onClick={() => void markAll()}>
                {t("Mark all read")}
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t("No notifications yet.")}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => {
                      if (!n.read) void markRead({ id: n._id });
                    }}
                    className={cn(
                      "flex w-full gap-3 border-b border-border/40 p-4 text-left transition hover:bg-accent/40",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    {n.image ? (
                      <img src={n.image} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-border/60" />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{n.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{n.body}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

/* ---------------- floating chat button ---------------- */

function ChatFab() {
  const { profile, chat } = useHope();
  const { open, setOpen } = useChatUi();
  // Red badge only when a NEW support message is unread — never when the
  // conversation is just opened/empty. Opening the chat marks them read.
  const unread = chat.filter((c) => c.sender === "support" && c.status !== "read").length;
  if (!profile || open) return null;
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open live chat"
      className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.8)] transition hover:scale-105 md:bottom-8"
    >
      <MessageCircle className="h-6 w-6" fill="currentColor" strokeWidth={0} />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------- shell ---------------- */

export function DashboardLayout({ wide = false }: { wide?: boolean }) {
  const { user, profile, settings } = useHope();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const { t } = useT(profile?.language ?? "en");

  if (!profile || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const maintenance = settings?.maintenanceMode && user.role !== "admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <ChatUiContext.Provider value={{ open: chatOpen, setOpen: setChatOpen }}>
      <div className="min-h-screen">
        <div className="aurora" />

        {maintenance ? (
          <div className="grid min-h-screen place-items-center px-6 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-warning/20 text-warning">
                <Megaphone className="h-7 w-7" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-black">Under maintenance</h1>
              <p className="mt-2 text-sm text-muted-foreground">{settings?.maintenanceMessage}</p>
            </div>
          </div>
        ) : (
          <>
            <header className="sticky top-0 z-40 glass-soft rounded-none px-4 py-3">
              <div className={cn("mx-auto flex items-center gap-3", wide ? "max-w-[100rem]" : "max-w-7xl")}>
                <Brand />

                <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
                  {primaryNav.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                        pathname === l.to
                          ? "btn-glass btn-glass-primary"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <l.icon className="h-4 w-4" />
                      {t(l.label)}
                    </Link>
                  ))}
                  {user.role === "admin" ? (
                    <Link
                      to="/dashboard/admin"
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                        pathname === "/dashboard/admin"
                          ? "btn-glass btn-glass-gold"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <ShieldHalf className="h-4 w-4" />
                      {t("Admin")}
                    </Link>
                  ) : null}
                </nav>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="grid h-10 w-10 place-items-center rounded-xl glass-soft"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  {user.role !== "admin" ? (
                    <button
                      onClick={() => setChatOpen(true)}
                      aria-label="Open live chat"
                      className="grid h-10 w-10 place-items-center rounded-xl glass-soft"
                    >
                      <Headset className="h-4 w-4" />
                    </button>
                  ) : null}
                  <NotificationBell />
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen((v) => !v)}
                      aria-label="Account menu"
                      className="flex h-10 items-center gap-1 rounded-xl gradient-brand pl-2.5 pr-2 font-bold text-primary-foreground transition hover:brightness-110"
                    >
                      {initials(profile.name)}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", profileOpen && "rotate-180")} />
                    </button>
                    {profileOpen ? (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                        <div className="animate-rise absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elegant)]">
                          <div className="border-b border-border/60 px-4 py-3">
                            <p className="truncate text-sm font-bold">{profile.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{profile.phone || user.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setChannelsOpen(true);
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold transition hover:bg-accent/60"
                          >
                            <UsersRound className="h-4 w-4 text-muted-foreground" /> Channels &amp; Groups
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="hidden h-10 w-10 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-destructive md:grid"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            <InstallBanner />
            <PopupNotifier />
            <AnnouncementBanner />

            <main className={cn("mx-auto px-4 pb-32 pt-6 md:pb-12", wide ? "max-w-[100rem]" : "max-w-7xl")}>
              <Outlet />
            </main>

            <ChatFab />

            <LiveChat open={chatOpen} onClose={() => setChatOpen(false)} />

            <ChannelsPopup open={channelsOpen} onClose={() => setChannelsOpen(false)} />

            <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-3xl glass px-2 py-2 md:hidden">
              {primaryNav.map((l) => {
                const active = pathname === l.to;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition",
                      active ? "btn-glass btn-glass-primary" : "text-muted-foreground",
                    )}
                  >
                    <l.icon className="h-[18px] w-[18px]" />
                    {t(l.short)}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </ChatUiContext.Provider>
  );
}

/** Small copy-to-clipboard helper reused across pages. */
export function copyText(text: string, label = "Copied") {
  navigator.clipboard?.writeText(text);
  toast.success(label);
}

/** Preserve ReactNode import for future use. */
export type { ReactNode };
