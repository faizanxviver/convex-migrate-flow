import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { GlassCard, StatCard, StatusBadge } from "@/components/hopex/glass";
import { PromoManager } from "@/components/hopex/promo-manager";
import { AdminChat } from "@/components/hopex/admin-chat";
import { AppBroadcastPanel, PushBroadcastPanel } from "@/components/hopex/broadcast";
import { useUploader } from "@/components/hopex/storage-image";
import { useAdminData } from "@/hooks/use-admin";
import { useHope } from "@/hooks/use-hope";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate, fmtDateTime, initials, money, planDaily, round2 } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Database,
  Download,
  Eye,
  EyeOff,
  Gift,
  Globe,
  Hash,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  TrendingUp,
  User2,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useHope();
  if (!user) return null;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AdminConsole />;
}

/* ============================== console shell ============================== */

const TABS = [
  "Overview",
  "Users",
  "Auto Deposit",
  "Withdrawals",
  "Methods",
  "Plans",
  "Promo Codes",
  "Leader Plans",
  "Balance Control",
  "Support Chat",
  "Channels",
  "App Broadcast",
  "Push Broadcast",
  "Audit Log",
  "Tools",
  "SEO",
  "API Keys",
  "Settings",
] as const;

type TabId = (typeof TABS)[number];

const TAB_ICONS: Record<TabId, LucideIcon> = {
  Overview: LayoutDashboard,
  Users: Users,
  "Auto Deposit": ArrowDownToLine,
  Withdrawals: ArrowUpFromLine,
  Methods: Wallet,
  Plans: TrendingUp,
  "Promo Codes": Ticket,
  "Leader Plans": Crown,
  "Balance Control": Wallet,
  "Support Chat": MessageSquare,
  Channels: Link2,
  "App Broadcast": BellRing,
  "Push Broadcast": Megaphone,
  "Audit Log": ScrollText,
  Tools: Wrench,
  SEO: Globe,
  "API Keys": KeyRound,
  Settings: Settings,
};

const GROUPS: { label: string; items: TabId[] }[] = [
  { label: "Operations", items: ["Overview", "Users", "Support Chat"] },
  { label: "Money flow", items: ["Auto Deposit", "Withdrawals", "Balance Control", "Methods"] },
  { label: "Growth", items: ["Plans", "Promo Codes", "Leader Plans", "Channels", "App Broadcast", "Push Broadcast"] },
  { label: "System", items: ["Tools", "SEO", "API Keys", "Audit Log", "Settings"] },
];

function AdminConsole() {
  const { user } = useHope();
  const { signOut } = useAuth();
  const { transactions, threads } = useAdminData();
  const [tab, setTab] = useState<TabId>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [proof, setProof] = useState<string | null>(null);

  const isPending = (s: string) => s === "pending" || s === "processing";
  const pendingDeps = transactions.filter((t) => t.type === "deposit" && isPending(t.status)).length;
  const pendingWds = transactions.filter((t) => t.type === "withdraw" && isPending(t.status)).length;
  const chatUnread = threads.reduce((a, t) => a + t.unread, 0);

  const counts: Partial<Record<TabId, number>> = {
    "Auto Deposit": pendingDeps,
    Withdrawals: pendingWds,
    "Support Chat": chatUnread,
  };

  const navList = (
    <nav className="space-y-3">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {g.label}
          </p>
          {g.items.map((t) => {
            const Icon = TAB_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  tab === t
                    ? "btn-glass btn-glass-gold text-foreground shadow-[var(--shadow-elegant)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t}</span>
                {counts[t] ? (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-black text-destructive-foreground">
                    {counts[t]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* ---------- Console top bar ---------- */}
      <header className="glass-soft z-30 flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-5">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open console menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-soft lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
            {(user?.name?.[0] ?? "H").toUpperCase()}
          </span>
          <span className="hidden font-display text-base font-extrabold sm:block">HopeX Console</span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-success md:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Live
        </span>
        <div className="flex-1" />
        <Link
          to="/dashboard"
          className="btn-glass flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-foreground"
        >
          <Globe className="h-3.5 w-3.5" /> View site
        </Link>
        <button
          onClick={() => void signOut()}
          aria-label="Sign out"
          className="grid h-10 w-10 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------- Sidebar — always open on desktop ---------- */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 p-3 lg:flex">
          <p className="truncate px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {user?.name ?? "Admin"}
          </p>
          <div className="flex-1 overflow-y-auto">{navList}</div>
          <button
            onClick={() => void signOut()}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        {/* ---------- Mobile drawer ---------- */}
        {menuOpen ? (
          <div className="fixed inset-0 z-[120] lg:hidden">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <div className="glass animate-rise absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col overflow-y-auto rounded-r-3xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-base font-extrabold">Console menu</p>
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              {navList}
            </div>
          </div>
        ) : null}

        {/* ---------- Main ---------- */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-5">
            {/* Console header */}
            <div className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
              <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground sm:h-12 sm:w-12">
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate font-display text-xl font-extrabold sm:text-3xl">HopeX Console</h1>
                    <p className="hidden text-sm text-muted-foreground sm:block">
                      Live control over users, money flow, plans and support.
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-auto">
                  <AdminCommandPalette onJump={(t) => setTab(t as TabId)} />
                  <button
                    onClick={() => setTab("Auto Deposit")}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
                      pendingDeps ? "bg-destructive/15 text-destructive" : "glass-soft",
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" /> {pendingDeps}{" "}
                    <span className="hidden sm:inline">deposits waiting</span>
                  </button>
                  <button
                    onClick={() => setTab("Withdrawals")}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold",
                      pendingWds ? "bg-destructive/15 text-destructive" : "glass-soft",
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" /> {pendingWds}{" "}
                    <span className="hidden sm:inline">withdrawals waiting</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Panels */}
            <div>
              {tab === "Overview" ? <OverviewPanel onJump={setTab} /> : null}
              {tab === "Users" ? <UsersManager /> : null}
              {tab === "Auto Deposit" || tab === "Withdrawals" ? (
                <MoneyDesk kind={tab === "Auto Deposit" ? "deposit" : "withdraw"} onViewProof={setProof} />
              ) : null}
              {tab === "Methods" ? <MethodsManager /> : null}
              {tab === "Plans" ? <PlansManager /> : null}
              {tab === "Promo Codes" ? <PromoManager /> : null}
              {tab === "Leader Plans" ? <LeaderPlansPanel /> : null}
              {tab === "Balance Control" ? <BalanceControl /> : null}
              {tab === "Support Chat" ? <AdminChat /> : null}
              {tab === "Channels" ? <ChannelsManager /> : null}
              {tab === "App Broadcast" ? <AppBroadcastPanel /> : null}
              {tab === "Push Broadcast" ? <PushBroadcastPanel /> : null}
              {tab === "Audit Log" ? <AuditLogPanel /> : null}
              {tab === "Tools" ? <ToolsPanel /> : null}
              {tab === "SEO" ? <SeoSettings /> : null}
              {tab === "API Keys" ? <ApiKeysPanel /> : null}
              {tab === "Settings" ? <SettingsPanel /> : null}
            </div>
          </div>
        </main>
      </div>

      {/* Proof lightbox */}
      {proof ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          onClick={() => setProof(null)}
        >
          <div
            className="glass max-h-full w-full max-w-lg overflow-auto rounded-3xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Payment proof</p>
              <div className="flex items-center gap-2">
                <a
                  href={proof}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
                >
                  Open
                </a>
                <button onClick={() => setProof(null)} className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold">
                  Close
                </button>
              </div>
            </div>
            <img src={proof} alt="Payment proof" className="w-full rounded-2xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}



/* ============================== overview ============================== */

/** Cmd/Ctrl+K palette to jump between console sections. */
function AdminCommandPalette({ onJump }: { onJump: (t: TabId) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = TABS.filter((t) => t.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl glass-soft px-3 text-xs font-semibold text-muted-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Jump to…</span>
        <kbd className="hidden rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold sm:inline">Ctrl K</kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[130] grid place-items-start justify-items-center pt-[12vh]">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elegant)]">
            <div className="flex items-center gap-2 border-b border-border/60 px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sections…"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
              <button onClick={() => setOpen(false)} aria-label="Close palette">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No sections found.</p>
              ) : (
                results.map((t) => {
                  const Icon = TAB_ICONS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        onJump(t);
                        setOpen(false);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {t}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function OverviewPanel({ onJump }: { onJump: (t: TabId) => void }) {
  const { stats, users, transactions, threads, audit } = useAdminData();
  const runChecks = useMutation(api.leaderPlans.runLeaderPlanChecks);
  const [busy, setBusy] = useState(false);

  if (!stats) return null;

  const pending = transactions.filter((t) => t.status === "pending" || t.status === "processing");
  const pendingDeps = pending.filter((t) => t.type === "deposit").length;
  const pendingWds = pending.filter((t) => t.type === "withdraw").length;
  const unreadChats = threads.reduce((a, t) => a + t.unread, 0);
  const recentUsers = [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  const handleChecks = async () => {
    setBusy(true);
    try {
      const removed = await runChecks();
      toast.success(`Leader plan check complete — ${removed} expired.`);
    } catch {
      toast.error("Could not run checks");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard label="Total users" value={String(stats.users)} hint={`${stats.activeUsers} active`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total deposits" value={money(stats.totalDeposits)} accent="success" icon={<ArrowDownToLine className="h-5 w-5" />} />
        <StatCard label="Total withdrawals" value={money(stats.totalWithdrawals)} accent="gold" icon={<ArrowUpFromLine className="h-5 w-5" />} />
        <StatCard label="Active investments" value={String(stats.investments)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Capital invested" value={money(stats.aum)} />
        <StatCard label="Platform profit" value={money(Math.max(0, stats.totalDeposits - stats.totalWithdrawals))} accent="success" />
      </div>

      {pendingDeps + pendingWds + unreadChats > 0 ? (
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-destructive/15 blur-3xl" />
          <div className="relative mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Needs attention</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => onJump("Auto Deposit")}
              className="group flex items-center gap-3 rounded-2xl glass-soft p-3.5 text-left transition hover:-translate-y-0.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <ArrowDownToLine className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-muted-foreground">Pending deposits</span>
                <span className="block font-display text-lg font-black">{pendingDeps}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
            <button
              onClick={() => onJump("Withdrawals")}
              className="group flex items-center gap-3 rounded-2xl glass-soft p-3.5 text-left transition hover:-translate-y-0.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                <ArrowUpFromLine className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-muted-foreground">Pending withdrawals</span>
                <span className="block font-display text-lg font-black">{pendingWds}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
            <button
              onClick={() => onJump("Support Chat")}
              className="group flex items-center gap-3 rounded-2xl glass-soft p-3.5 text-left transition hover:-translate-y-0.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-muted-foreground">Unread chats</span>
                <span className="block font-display text-lg font-black">{unreadChats}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent activity</h2>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 6).map((t) => (
            <div key={t._id} className="flex items-center gap-3 rounded-2xl glass-soft px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold capitalize">
                  {t.type} · {users.find((u) => u.userId === t.userId)?.name ?? "—"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{t.method ?? "—"}</span>
              </span>
              <span className="text-sm font-bold">{money(t.amount)}</span>
              <StatusBadge status={t.status} />
            </div>
          ))}
          {transactions.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent signups</h2>
        </div>
        <div className="space-y-2">
          {recentUsers.map((u) => (
            <div key={u.userId} className="flex items-center gap-3 text-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-xs font-black text-primary">
                {u.name[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{u.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-wrap items-center gap-3 p-4">
        <Crown className="h-5 w-5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Leader plan requirement sweep</p>
          <p className="text-xs text-muted-foreground">
            Evaluate every active leader plan whose deadline passed (also runs automatically hourly).
          </p>
        </div>
        <button
          onClick={handleChecks}
          disabled={busy}
          className="btn-glass btn-glass-gold h-10 shrink-0 px-4 text-xs font-bold disabled:opacity-60"
        >
          {busy ? "Running…" : "Run now"}
        </button>
      </GlassCard>

      <GlassCard className="p-2">
        <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent audit log</p>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No admin actions yet.</p>
        ) : (
          audit.slice(0, 8).map((a) => (
            <button
              key={a._id}
              onClick={() => onJump("Audit Log")}
              className="flex w-full items-start gap-3 border-t border-border/40 p-3 text-left text-sm transition hover:bg-accent/40"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.adminName} · {a.targetName} {a.detail ? `· ${a.detail}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
            </button>
          ))
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== users manager ============================== */

function UsersManager() {
  const { users, plans } = useAdminData();
  const updateUser = useMutation(api.admin.adminUpdateUser);
  const adjust = useMutation(api.admin.adminAdjustBalance);
  const setBalance = useMutation(api.admin.adminSetBalance);
  const referralBonus = useMutation(api.admin.adminReferralBonus);
  const activatePlan = useMutation(api.admin.adminActivatePlan);
  const endPlans = useMutation(api.admin.adminEndPlans);
  const clearChat = useMutation(api.admin.adminClearChat);
  const notify = useMutation(api.notifications.adminNotify);

  const [q, setQ] = useState("");
  const [view, setView] = useState<"all" | "new" | "invested" | "frozen">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    user: (typeof users)[number];
    action: "add" | "deduct" | "set" | "bonus" | "plan" | "notify";
  } | null>(null);
  const [value, setValue] = useState("");
  const [extra, setExtra] = useState("");

  const filtered = users
    .filter((u) => u.role === "user")
    .filter((u) =>
      q.trim()
        ? `${u.name} ${u.phone ?? ""} ${u.email ?? ""} ${u.referralCode}`
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    )
    .filter((u) =>
      view === "frozen" ? u.blocked : view === "invested" ? u.invested > 0 : view === "new" ? Date.now() - u.createdAt < 7 * 86400000 : true,
    );

  const withBusy = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const openModal = (
    user: (typeof users)[number],
    action: "add" | "deduct" | "set" | "bonus" | "plan" | "notify",
  ) => {
    setModal({ user, action });
    setValue("");
    setExtra("");
  };

  const submitModal = async () => {
    if (!modal) return;
    const { user, action } = modal;
    const num = Number(value);
    if (action === "add" || action === "deduct" || action === "bonus") {
      if (!num || num <= 0) return toast.error("Enter a valid amount");
      setBusy(user.userId);
      try {
        if (action === "bonus") await referralBonus({ userId: user.userId, amount: num });
        else await adjust({ userId: user.userId, amount: num, kind: action === "add" ? "deposit" : "withdraw", note: extra || undefined });
        toast.success("Done.");
        setModal(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
      } finally {
        setBusy(null);
      }
      return;
    }
    if (action === "set") {
      if (value === "" || isNaN(num) || num < 0) return toast.error("Enter a valid balance");
      setBusy(user.userId);
      try {
        await setBalance({ userId: user.userId, balance: num });
        toast.success("Balance updated.");
        setModal(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
      } finally {
        setBusy(null);
      }
      return;
    }
    if (action === "plan") {
      if (!extra) return toast.error("Select a plan");
      const p = plans.find((x) => x.slug === extra);
      if (!p) return toast.error("Plan not found");
      setBusy(user.userId);
      try {
        await activatePlan({ userId: user.userId, planId: p.slug, amount: num || p.minAmount });
        toast.success(`${p.name} activated.`);
        setModal(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
      } finally {
        setBusy(null);
      }
      return;
    }
    if (action === "notify") {
      if (!extra.trim()) return toast.error("Write a message");
      setBusy(user.userId);
      try {
        await notify({ userId: user.userId, title: "Message from HopeX", body: extra.trim(), popup: true });
        toast.success("Notification sent.");
        setModal(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
      } finally {
        setBusy(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, code…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
        <div className="inline-flex gap-1 rounded-xl glass-soft p-1">
          {(["all", "new", "invested", "frozen"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                view === v ? "btn-glass btn-glass-primary" : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((u) => {
          const open = openId === u.userId;
          return (
            <GlassCard key={u.userId} className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-xs font-black text-primary-foreground">
                  {initials(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.phone ?? u.email}</p>
                </div>
                <StatusBadge status={u.blocked ? "rejected" : "approved"} />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["Balance", money(u.balance)],
                    ["Invested", money(u.invested)],
                    ["Refs", u.referralCode],
                    ["Earned", money(u.earnings)],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="rounded-xl glass-soft px-2 py-2">
                    <p className="truncate text-[9px] uppercase tracking-widest text-muted-foreground">{l}</p>
                    <p className="truncate text-[11px] font-bold">{v}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setOpenId(open ? null : u.userId)}
                className="btn-glass mt-3 flex h-10 w-full items-center justify-center text-xs font-bold text-foreground"
              >
                {open ? "Hide controls" : "Manage user"}
              </button>

              {open ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Ctl label="Add funds" onClick={() => openModal(u, "add")} />
                  <Ctl label="Deduct funds" onClick={() => openModal(u, "deduct")} />
                  <Ctl label="Set balance" onClick={() => openModal(u, "set")} />
                  <Ctl label="Referral bonus" onClick={() => openModal(u, "bonus")} />
                  <Ctl label="Activate plan" onClick={() => openModal(u, "plan")} />
                  <Ctl
                    label="End all plans"
                    onClick={() =>
                      void withBusy(u.userId, async () => {
                        await endPlans({ userId: u.userId });
                        toast.success("Plans removed.");
                      })
                    }
                  />
                  <Ctl label="Notify user" onClick={() => openModal(u, "notify")} />
                  <Ctl
                    label={u.verified ? "Unverify" : "Verify"}
                    onClick={() =>
                      void withBusy(u.userId, async () => {
                        await updateUser({ userId: u.userId, verified: !u.verified });
                        toast.success("Verification updated.");
                      })
                    }
                  />
                  <Ctl
                    label="Clear chat"
                    onClick={() =>
                      void withBusy(u.userId, async () => {
                        await clearChat({ userId: u.userId });
                        toast.success("Chat cleared.");
                      })
                    }
                  />
                  <Ctl
                    label="Copy contact"
                    onClick={() => {
                      void navigator.clipboard.writeText(u.phone ?? u.email ?? "");
                      toast.success("Contact copied.");
                    }}
                  />
                  <Ctl
                    danger
                    label={u.blocked ? "Unfreeze" : "Freeze"}
                    onClick={() =>
                      void withBusy(u.userId, async () => {
                        await updateUser({ userId: u.userId, blocked: !u.blocked });
                        toast.success(u.blocked ? "Account unfrozen." : "Account frozen.");
                      })
                    }
                  />
                  {busy === u.userId ? (
                    <div className="col-span-2 grid place-items-center rounded-xl glass-soft py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </GlassCard>
          );
        })}
        {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No users match this filter.</p> : null}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-lg font-extrabold capitalize">
              {modal.action === "plan" ? `Activate plan — ${modal.user.name}` : modal.action === "notify" ? `Message ${modal.user.name}` : `${modal.action.replace(/_/g, " ")} — ${modal.user.name}`}
            </h3>
            <div className="mt-4 space-y-3">
              {modal.action === "plan" ? (
                <select
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                >
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} — {money(p.minAmount)}
                    </option>
                  ))}
                </select>
              ) : null}
              {modal.action === "notify" ? (
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Message…"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background/40 p-3 text-sm outline-none"
                />
              ) : (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={modal.action === "set" ? "New balance (PKR)" : "Amount (PKR)"}
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
                />
              )}
              {modal.action === "add" || modal.action === "deduct" ? (
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Note (optional)"
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
                />
              ) : null}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setModal(null)} className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                onClick={() => void submitModal()}
                disabled={busy === modal.user.userId}
                className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy === modal.user.userId ? "Saving…" : "Apply"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

function Ctl({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-2 py-2.5 text-[11px] font-bold transition",
        danger ? "bg-destructive/15 text-destructive" : "glass-soft text-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

/* ============================== money desk ============================== */

const isPending = (s: string) => s === "pending" || s === "processing";
const isDone = (s: string) => s === "approved" || s === "completed";

function CopyChip({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1400);
        } catch {
          toast.error("Copy failed");
        }
      }}
      className="group flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-primary/50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="block truncate font-mono text-sm font-bold">{value}</span>
      </span>
      {done ? (
        <Check className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      )}
    </button>
  );
}

function MoneyDesk({ kind, onViewProof }: { kind: "deposit" | "withdraw"; onViewProof: (url: string) => void }) {
  const { transactions, users } = useAdminData();
  const review = useMutation(api.transactions.adminReviewTransaction);
  const [bucket, setBucket] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const all = useMemo(() => transactions.filter((t) => t.type === kind), [transactions, kind]);

  const pending = all.filter((t) => isPending(t.status));
  const done = all.filter((t) => isDone(t.status));
  const rejected = all.filter((t) => t.status === "rejected");

  const counts = { Pending: pending.length, Approved: done.length, Rejected: rejected.length };

  const nameById = useMemo(() => new Map(users.map((u) => [u.userId, u.name])), [users]);
  const phoneById = useMemo(() => new Map(users.map((u) => [u.userId, u.phone ?? ""])), [users]);

  const rows = (bucket === "Pending" ? pending : bucket === "Approved" ? done : rejected).filter((t) => {
    if (!q.trim()) return true;
    const hay = `${nameById.get(t.userId) ?? ""} ${phoneById.get(t.userId) ?? ""} ${t.method ?? ""} ${t.reference ?? ""} ${t.amount}`;
    return hay.toLowerCase().includes(q.trim().toLowerCase());
  });

  const total = rows.reduce((a, t) => a + t.amount, 0);

  const setStatus = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      await review({ id: id as never, approve });
      toast.success(approve ? "Approved." : "Declined.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const bulk = async (approve: boolean) => {
    setBusy("bulk");
    try {
      for (const id of selected) await review({ id: id as never, approve });
      toast.success(approve ? "Bulk approved." : "Bulk declined.");
      setSelected([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Bulk action failed");
    } finally {
      setBusy(null);
    }
  };

  const stats = [
    {
      label: "Pending review",
      value: money(pending.reduce((a, t) => a + t.amount, 0)),
      count: pending.length,
      icon: <Clock className="h-4 w-4" />,
      tone: "text-warning",
      chip: "bg-warning/15 text-warning",
    },
    {
      label: kind === "deposit" ? "Approved" : "Paid out",
      value: money(done.reduce((a, t) => a + t.amount, 0)),
      count: done.length,
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: "text-success",
      chip: "bg-success/15 text-success",
    },
    {
      label: "Declined",
      value: money(rejected.reduce((a, t) => a + t.amount, 0)),
      count: rejected.length,
      icon: <XCircle className="h-4 w-4" />,
      tone: "text-destructive",
      chip: "bg-destructive/15 text-destructive",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-[1.75rem] glass p-4">
            <span className={cn("pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl", s.chip)} />
            <div className="relative flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", s.chip)}>{s.icon}</span>
            </div>
            <p className={cn("relative mt-2 truncate font-display text-xl font-black sm:text-2xl", s.tone)}>{s.value}</p>
            <p className="relative mt-1 text-[11px] text-muted-foreground">{s.count} request{s.count === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[1.75rem] glass p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(["Pending", "Approved", "Rejected"] as const).map((b) => (
            <button
              key={b}
              onClick={() => {
                setBucket(b);
                setSelected([]);
              }}
              className={cn(
                "rounded-xl px-4 py-2.5 text-xs font-black transition",
                bucket === b
                  ? b === "Pending"
                    ? "bg-destructive text-destructive-foreground shadow-[var(--shadow-elegant)]"
                    : "btn-glass btn-glass-primary shadow-[var(--shadow-elegant)]"
                  : "glass-soft text-muted-foreground",
              )}
            >
              {b === "Pending" ? "Pending" : b === "Approved" ? "Successful" : "Declined"} ({counts[b]})
            </button>
          ))}
        </div>
        <label className="flex h-11 min-w-[14rem] flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user, phone, reference…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {bucket === "Pending" && rows.length > 0 ? (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <button
            onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r._id))}
            className="btn-glass px-3 py-2 text-xs font-bold text-foreground"
          >
            {selected.length === rows.length ? "Clear" : "Select all"}
          </button>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          <div className="ml-auto flex gap-2">
            <button
              disabled={!selected.length || busy === "bulk"}
              onClick={() => void bulk(true)}
              className="flex items-center gap-1.5 rounded-xl bg-success/15 px-4 py-2 text-xs font-bold text-success disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Approve selected
            </button>
            <button
              disabled={!selected.length || busy === "bulk"}
              onClick={() => void bulk(false)}
              className="rounded-xl bg-destructive/15 px-4 py-2 text-xs font-bold text-destructive disabled:opacity-40"
            >
              Decline selected
            </button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">Nothing here right now.</GlassCard>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((t) => (
            <MoneyCard
              key={t._id}
              tx={t}
              kind={kind}
              name={nameById.get(t.userId) ?? "Unknown"}
              phone={phoneById.get(t.userId) ?? ""}
              selectable={bucket === "Pending"}
              checked={selected.includes(t._id)}
              busy={busy === t._id}
              onToggle={() => setSelected((s) => (s.includes(t._id) ? s.filter((x) => x !== t._id) : [...s, t._id]))}
              onApprove={() => void setStatus(t._id, true)}
              onReject={() => void setStatus(t._id, false)}
              onViewProof={onViewProof}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MoneyCard({
  tx,
  kind,
  name,
  phone,
  selectable,
  checked,
  busy,
  onToggle,
  onApprove,
  onReject,
  onViewProof,
}: {
  tx: Doc<"transactions">;
  kind: "deposit" | "withdraw";
  name: string;
  phone: string;
  selectable: boolean;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewProof: (url: string) => void;
}) {
  const parts = (tx.reference ?? "").split("·").map((p: string) => p.trim()).filter(Boolean);
  const accountName = kind === "withdraw" ? parts[0] : undefined;
  const accountNumber = kind === "withdraw" ? parts[1] : undefined;
  const note = tx.note?.trim() ?? "";

  return (
    <GlassCard className={cn("relative overflow-hidden transition", checked && "ring-2 ring-primary/60")}>
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          tx.status === "rejected" ? "bg-destructive/50" : isPending(tx.status) ? "bg-warning/50" : "bg-success/50",
        )}
      />
      <div className="pl-2">
        <div className="flex items-start gap-3">
          {selectable ? (
            <input type="checkbox" aria-label="Select row" checked={checked} onChange={onToggle} className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--primary)]" />
          ) : null}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-sm font-black text-primary-foreground">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" /> {phone || "—"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-lg font-black tabular-nums">{money(tx.amount)}</p>
            <StatusBadge status={tx.status} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-bold">
            <Wallet className="h-3 w-3" /> {tx.method || (kind === "deposit" ? "MPay" : "Wallet")}
          </span>
          {(note + " " + (tx.reference ?? "")).toLowerCase().includes("mpay") || kind === "deposit" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 font-black text-success">MPay</span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-muted-foreground">
            <Hash className="h-3 w-3" /> {fmtDateTime(tx.createdAt)}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {kind === "withdraw" ? (
            <>
              <CopyChip label="Account title" value={accountName || "—"} />
              <CopyChip label="Account number" value={accountNumber || "—"} />
            </>
          ) : (
            <CopyChip label="Reference" value={tx.reference || "—"} />
          )}
        </div>

        {note ? (
          <p className="mt-3 rounded-2xl bg-background/40 px-3.5 py-2.5 text-xs text-muted-foreground ring-1 ring-border/50">
            <span className="font-bold text-foreground">Note: </span>
            {note}
          </p>
        ) : null}

        {tx.proofUrl ? (
          <button
            onClick={() => tx.proofUrl && onViewProof(tx.proofUrl)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-2 text-left transition hover:border-primary/50"
          >
            <img src={tx.proofUrl} alt="Payment proof" loading="lazy" className="h-12 w-12 rounded-xl object-cover" />
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              <ImageIcon className="h-3.5 w-3.5" /> View payment proof
            </span>
          </button>
        ) : null}

        {isPending(tx.status) ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onApprove}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-success/15 py-2.5 text-xs font-black text-success transition hover:bg-success/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              onClick={onReject}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/15 py-2.5 text-xs font-black text-destructive transition hover:bg-destructive/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Decline
            </button>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}

/* ============================== payment methods ============================== */

function MethodsManager() {
  const { methods } = useHope();
  const upsert = useMutation(api.admin.adminUpsertPaymentMethod);
  const remove = useMutation(api.admin.adminDeletePaymentMethod);
  const uploader = useUploader();
  const [busy, setBusy] = useState<string | null>(null);

  const patch = (id: Id<"paymentMethods">, key: string, value: unknown) =>
    upsert({
      id,
      name: methods.find((m) => m._id === id)?.name ?? "",
      kind: methods.find((m) => m._id === id)?.kind ?? "wallet",
      accountName: methods.find((m) => m._id === id)?.accountName ?? "",
      accountNumber: methods.find((m) => m._id === id)?.accountNumber ?? "",
      imageUrl: methods.find((m) => m._id === id)?.imageUrl,
      instructions: methods.find((m) => m._id === id)?.instructions ?? "",
      active: methods.find((m) => m._id === id)?.active ?? true,
      sortOrder: methods.find((m) => m._id === id)?.sortOrder ?? 0,
      ...(key === "name" ? { name: value as string } : {}),
      ...(key === "accountName" ? { accountName: value as string } : {}),
      ...(key === "accountNumber" ? { accountNumber: value as string } : {}),
      ...(key === "instructions" ? { instructions: value as string } : {}),
      ...(key === "imageUrl" ? { imageUrl: value as string | undefined } : {}),
      ...(key === "active" ? { active: value as boolean } : {}),
    }).catch((e) => toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Update failed"));

  const pickLogo = async (id: Id<"paymentMethods">, file: File) => {
    setBusy(id);
    try {
      const url = await uploader(file);
      await patch(id, "imageUrl", url);
      toast.success("Logo updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={async () => {
          const name = prompt("Method name (e.g. Easypaisa)");
          if (!name) return;
          setBusy("new");
          try {
            await upsert({
              name,
              kind: "wallet",
              accountName: "HopeX Payments",
              accountNumber: "0000000000",
              instructions: `Send the exact amount to the ${name} account above, then upload your screenshot.`,
              active: true,
              sortOrder: methods.length,
            });
            toast.success("Payment method added.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not add method");
          } finally {
            setBusy(null);
          }
        }}
        className="btn-glass btn-glass-primary inline-flex h-11 items-center px-5 text-sm font-bold"
      >
        <Plus className="mr-2 h-4 w-4" /> Add payment method
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        {methods.map((m) => (
          <GlassCard key={m._id} className="space-y-3">
            <div className="flex items-center gap-3">
              {m.imageUrl ? (
                <div className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
                  <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => void patch(m._id, "imageUrl", undefined)}
                    aria-label="Remove logo"
                    className="absolute inset-0 grid place-items-center bg-background/70 text-destructive opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-cool text-lg font-black text-primary-foreground">
                  {m.name[0]}
                </span>
              )}
              <input
                defaultValue={m.name}
                onBlur={(e) => e.target.value !== m.name && void patch(m._id, "name", e.target.value)}
                className="h-11 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm font-semibold outline-none"
              />
              <StatusBadge status={m.active ? "approved" : "rejected"} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                defaultValue={m.accountName}
                onBlur={(e) => e.target.value !== m.accountName && void patch(m._id, "accountName", e.target.value)}
                placeholder="Account title"
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              />
              <input
                defaultValue={m.accountNumber}
                onBlur={(e) => e.target.value !== m.accountNumber && void patch(m._id, "accountNumber", e.target.value)}
                placeholder="Account number"
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              />
            </div>

            <textarea
              defaultValue={m.instructions}
              onBlur={(e) => e.target.value !== m.instructions && void patch(m._id, "instructions", e.target.value)}
              rows={2}
              placeholder="Instructions shown in the payment gateway"
              className="w-full rounded-xl border border-input bg-background/40 p-3 text-sm outline-none"
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg glass-soft px-3 py-2 text-xs font-semibold">
                {busy === m._id ? "Uploading…" : m.imageUrl ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={busy === m._id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickLogo(m._id, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => void patch(m._id, "active", !m.active)}
                className="rounded-lg glass-soft px-3 py-2 text-xs font-semibold"
              >
                {m.active ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${m.name}?`)) void remove({ id: m._id }).then(() => toast.success("Deleted."));
                }}
                className="rounded-lg bg-destructive/15 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Delete
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ============================== plans manager ============================== */

function PlanEditor({
  plan,
  onSave,
  onCancel,
}: {
  plan: { name: string; price: number; daily: number; days: number };
  onSave: (v: { name: string; price: number; daily: number; days: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price));
  const [daily, setDaily] = useState(String(plan.daily));
  const [days, setDays] = useState(String(plan.days));

  const p = Number(price) || 0;
  const d = Number(daily) || 0;
  const n = Number(days) || 0;
  const total = d * n;

  const field = "h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <GlassCard className="space-y-3">
      <div>
        <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Plan name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className={field} />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Daily income</label>
          <input value={daily} onChange={(e) => setDaily(e.target.value)} type="number" className={field} />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Days</label>
          <input value={days} onChange={(e) => setDays(e.target.value)} type="number" className={field} />
        </div>
      </div>
      <div className="rounded-xl glass-soft p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total return (auto)</span>
          <span className="font-bold text-success">{money(total)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Net profit</span>
          <span className="font-semibold">{money(total - p)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl glass-soft py-2.5 text-sm font-semibold">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!name.trim() || p <= 0 || d <= 0 || n <= 0) return toast.error("Fill name, price, daily income and days.");
            onSave({ name: name.trim(), price: p, daily: d, days: n });
          }}
          className="flex-1 rounded-xl gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
        >
          Save plan
        </button>
      </div>
    </GlassCard>
  );
}

function PlansManager() {
  const { plans } = useAdminData();
  const upsert = useMutation(api.plans.adminUpsertPlan);
  const remove = useMutation(api.plans.adminDeletePlan);
  const [editing, setEditing] = useState<{ id?: string; name: string; price: number; daily: number; days: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (v: { name: string; price: number; daily: number; days: number }, id?: string) => {
    setBusy(true);
    try {
      const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "plan";
      await upsert({
        id: id as never,
        slug,
        name: v.name,
        minAmount: v.price,
        maxAmount: v.price,
        dailyRoi: round2((v.daily / v.price) * 100),
        dailyAmount: round2(v.daily),
        durationDays: v.days,
        features: ["Daily payouts", "Principal returned"],
        active: true,
        sortOrder: 1,
      });
      toast.success("Plan saved.");
      setEditing(null);
      setCreating(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not save plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!creating ? (
        <button onClick={() => setCreating(true)} className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          + Add plan
        </button>
      ) : (
        <div className="max-w-md">
          <PlanEditor
            plan={{ name: "", price: 1000, daily: 50, days: 30 }}
            onCancel={() => setCreating(false)}
            onSave={(v) => void save(v)}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const daily = planDaily(p);
          if (editing?.id === p._id) {
            return (
              <PlanEditor
                key={p._id}
                plan={{ name: p.name, price: p.minAmount, daily, days: p.durationDays }}
                onCancel={() => setEditing(null)}
                onSave={(v) => void save(v, p._id)}
              />
            );
          }
          return (
            <GlassCard key={p._id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
                <StatusBadge status={p.active ? "approved" : "rejected"} />
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">{money(p.minAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily income</span>
                  <span className="font-semibold text-success">{money(daily)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days</span>
                  <span className="font-semibold">{p.durationDays}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Total return</span>
                  <span className="font-bold text-gold">{money(round2(daily * p.durationDays))}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing({ id: p._id, name: p.name, price: p.minAmount, daily, days: p.durationDays })}
                  className="flex-1 rounded-lg glass-soft py-2 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    void upsert({
                      id: p._id,
                      slug: p.slug,
                      name: p.name,
                      minAmount: p.minAmount,
                      maxAmount: p.maxAmount,
                      dailyRoi: p.dailyRoi,
                      durationDays: p.durationDays,
                      features: p.features,
                      active: !p.active,
                      sortOrder: p.sortOrder,
                    }).then(() => toast.success("Plan updated."))
                  }
                  className="flex-1 rounded-lg glass-soft py-2 text-xs font-semibold"
                >
                  {p.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${p.name}?`)) void remove({ id: p._id }).then(() => toast.success("Deleted."));
                  }}
                  className="flex-1 rounded-lg bg-destructive/15 py-2 text-xs font-semibold text-destructive"
                >
                  Delete
                </button>
              </div>
              {busy ? <p className="mt-2 text-center text-[11px] text-muted-foreground">Saving…</p> : null}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== promo codes ============================== */

/* ============================== leader plans ============================== */

function LeaderPlansPanel() {
  const { leaderPlans, users, plans } = useAdminData();
  const activate = useMutation(api.leaderPlans.adminActivateLeaderPlan);
  const remove = useMutation(api.leaderPlans.adminRemoveLeaderPlan);
  const runChecks = useMutation(api.leaderPlans.runLeaderPlanChecks);
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("24");
  const [required, setRequired] = useState("");
  const [busy, setBusy] = useState(false);

  const user = useMemo(() => users.find((u) => u.userId === target) ?? null, [users, target]);

  const find = () => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return toast.error("Enter a phone number.");
    const match = users.find((u) => (u.phone ?? "").replace(/\D/g, "").endsWith(digits.slice(-10)) && u.role === "user");
    if (!match) return toast.error("No user found with that number.");
    setTarget(match.userId);
    toast.success(`${match.name} loaded.`);
  };

  const doActivate = async () => {
    if (!user) return;
    const plan = plans.find((p) => p.slug === planId);
    if (!plan) return toast.error("Select a plan.");
    setBusy(true);
    try {
      await activate({
        userId: user.userId,
        planId: plan.slug,
        amount: Number(amount) || plan.minAmount,
        checkHours: Math.max(1, Number(hours) || 24),
        requiredInvestment: Number(required) || 0,
      });
      toast.success(`${plan.name} activated for ${user.name}.`);
      setTarget(null);
      setPhone("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  const doRunChecks = async () => {
    setBusy(true);
    try {
      const removed = await runChecks();
      toast.success(`Requirement checks executed — ${removed} expired.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Checks failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Crown className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold">Leader plan</p>
            <p className="text-xs text-muted-foreground">Admin-granted plan. No referral commission is paid to the upline.</p>
          </div>
          <button onClick={doRunChecks} disabled={busy} className="btn-glass flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-bold text-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Run checks
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-background/40 px-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="User phone number" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <button onClick={find} className="btn-glass btn-glass-primary flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-bold">
            <Search className="h-4 w-4" /> Find
          </button>
        </div>

        {user ? (
          <div className="mt-4 rounded-2xl glass-soft p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-xs font-black text-primary-foreground">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.phone} · {user.referralCode}
                </p>
              </div>
              <div className="flex gap-2 text-center">
                {(
                  [
                    ["Balance", money(user.balance)],
                    ["Invested", money(user.invested)],
                    ["Team", String(users.filter((u) => u.referredBy === user.referralCode).length)],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-background/50 px-3 py-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{l}</p>
                    <p className="text-[11px] font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan</span>
                <select
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    const p = plans.find((x) => x.slug === e.target.value);
                    if (p) setAmount(String(p.minAmount));
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                >
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} — {money(p.minAmount)}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Amount (Rs)" value={amount} onChange={setAmount} />
              <Field label="Check after (hours)" value={hours} onChange={setHours} />
              <Field label="Required L1 investment" value={required} onChange={setRequired} />
            </div>

            <button
              onClick={doActivate}
              disabled={busy}
              className="btn-glass btn-glass-gold mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Activate leader plan
            </button>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="p-5">
        <p className="font-display text-lg font-extrabold">Granted leader plans</p>
        {leaderPlans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No leader plans yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border/40">
            {leaderPlans.map((p) => {
              const owner = users.find((u) => u.userId === p.userId);
              const left = p.deadlineAt - Date.now();
              return (
                <div key={p._id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {owner?.name ?? "User"} · {p.planName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {money(p.amount)} · needs {money(p.requiredInvestment)} L1 ·{" "}
                      {left > 0 ? `${Math.ceil(left / 3600000)}h left` : fmtDateTime(p.deadlineAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                      p.status === "active"
                        ? "bg-primary/15 text-primary"
                        : p.status === "passed"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {p.status}
                  </span>
                  {p.status === "active" ? (
                    <button
                      onClick={() => void remove({ id: p._id }).then(() => toast.success("Removed."))}
                      className="btn-glass flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-bold text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== balance control ============================== */

function BalanceControl() {
  const { users } = useAdminData();
  const adjust = useMutation(api.admin.adminAdjustBalance);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = users
    .filter((u) => u.role === "user")
    .filter((u) => (q.trim() ? `${u.name} ${u.phone ?? ""} ${u.referralCode}`.toLowerCase().includes(q.toLowerCase()) : false))
    .slice(0, 12);

  const adjustBalance = async (id: Id<"users">, kind: "deposit" | "withdraw") => {
    const raw = prompt(`${kind === "deposit" ? "Add to" : "Deduct from"} balance (Rs)`, "1000");
    const v = Number(raw);
    if (!v || v <= 0) return;
    const note = prompt("Note (optional)") ?? "";
    setBusy(true);
    try {
      await adjust({ userId: id, amount: v, kind, note: note || undefined });
      toast.success(kind === "deposit" ? "Balance credited." : "Balance deducted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold">Balance control</p>
          <p className="text-xs text-muted-foreground">Credits post as a deposit, deductions post as a withdrawal.</p>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search user by name, phone or code…"
        className="mt-4 h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />

      <div className="mt-3 divide-y divide-border/40">
        {rows.map((u) => (
          <div key={u.userId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.phone} · {money(u.balance)}
              </p>
            </div>
            <button onClick={() => void adjustBalance(u.userId, "deposit")} disabled={busy} className="btn-glass btn-glass-primary h-9 shrink-0 px-3 text-xs font-bold disabled:opacity-60">
              Add
            </button>
            <button onClick={() => void adjustBalance(u.userId, "withdraw")} disabled={busy} className="btn-glass h-9 shrink-0 px-3 text-xs font-bold text-destructive disabled:opacity-60">
              Deduct
            </button>
          </div>
        ))}
        {q.trim() && rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No matching user.</p> : null}
      </div>
    </GlassCard>
  );
}

/* ============================== support chat ============================== */

const EMOJIS = ["👍", "🙏", "✅", "❌", "🔥", "💰", "📈", "🎉", "😀", "😎", "🤝", "💎", "⏳", "🧾", "🏦", "💯"];
const CANNED = [
  "Assalam o Alaikum! HopeX support here — how can I help you today?",
  "Your deposit has been verified and credited ✅",
  "Please share a clear payment screenshot so we can verify it.",
  "Withdrawals are processed between 8:00 AM and 8:00 PM (PKT) once a plan is active.",
  "Your request has been forwarded to the finance team.",
  "Thank you for your patience — this is now resolved.",
];

function SupportChatPanel() {
  const { threads, users } = useAdminData();
  const reply = useMutation(api.chat.adminReply);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [emoji, setEmoji] = useState(false);
  const [canned, setCanned] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const list = threads
    .filter((t) => (filter === "unread" ? t.unread > 0 : true))
    .filter((t) => (q.trim() ? t.name.toLowerCase().includes(q.trim().toLowerCase()) : true));

  const active = threads.find((t) => t.userId === activeId) ?? list[0] ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

  const send = async (value?: string) => {
    const msg = (value ?? text).trim();
    if (!active || !msg) return;
    setBusy(true);
    try {
      await reply({ userId: active.userId, text: msg });
      setText("");
      setEmoji(false);
      setCanned(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not send reply");
    } finally {
      setBusy(false);
    }
  };

  const contacts = users
    .filter((u) => u.role === "user")
    .filter((u) => (composeQuery.trim() ? `${u.name} ${u.phone ?? ""} ${u.email ?? ""}`.toLowerCase().includes(composeQuery.toLowerCase()) : true));

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <GlassCard className="p-2">
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl glass-soft px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <button onClick={() => setComposeOpen(true)} aria-label="New chat" className="btn-glass btn-glass-primary grid h-9 w-9 shrink-0 place-items-center rounded-xl">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 p-2 pt-0">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 rounded-full py-1 text-xs font-semibold capitalize transition",
                filter === f ? "btn-glass btn-glass-primary" : "text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-1 px-1 pb-1">
          {list.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No conversations.</p>
          ) : (
            list.map((t) => (
              <button
                key={t.userId}
                onClick={() => setActiveId(t.userId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-accent/40",
                  active?.userId === t.userId && "bg-accent/60",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-xs font-black text-primary">
                  {initials(t.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{t.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{t.messages[t.messages.length - 1]?.text || "…"}</span>
                </span>
                {t.unread > 0 ? (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-background">
                    {t.unread}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="flex h-[520px] flex-col p-0">
        {!active ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a conversation on the left.</div>
        ) : (
          <>
            <div className="border-b border-border/40 px-4 py-3 font-bold">{active.name}</div>
            <div className="wa wa-panel wa-wall min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {active.messages.map((m) => (
                <div key={m._id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("wa-bubble max-w-[80%]", m.sender === "user" ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in")}>
                    {m.attachment?.url ? (
                      <div className="mb-1 overflow-hidden rounded-md">
                        <img src={m.attachment.url} alt={m.attachment.name} className="max-h-40 w-full object-cover" />
                      </div>
                    ) : null}
                    {m.text}
                    <span className="wa-meta">{fmtDateTime(m.createdAt)}</span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="relative border-t border-black/5 p-3">
              {emoji ? (
                <div className="glass absolute -top-16 left-3 flex max-w-[92%] flex-wrap gap-1 rounded-2xl p-2 shadow-[var(--shadow-elegant)]">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setText((t) => t + e)} className="rounded-lg p-1 text-lg transition hover:bg-accent">
                      {e}
                    </button>
                  ))}
                </div>
              ) : null}
              {canned ? (
                <div className="glass absolute -top-36 left-3 z-10 w-[92%] rounded-2xl p-2 shadow-[var(--shadow-elegant)]">
                  {CANNED.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setText(c);
                        setCanned(false);
                      }}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-accent"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <button onClick={() => setCanned((v) => !v)} aria-label="Canned replies" className="btn-glass h-11 w-11 shrink-0 rounded-xl text-base">
                  📋
                </button>
                <button onClick={() => setEmoji((v) => !v)} aria-label="Emoji" className="btn-glass h-11 w-11 shrink-0 rounded-xl text-base">
                  😀
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void send();
                  }}
                  placeholder="Reply as support…"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={() => void send()} disabled={busy || !text.trim()} className="btn-glass btn-glass-primary h-11 shrink-0 px-5 text-sm font-bold disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </GlassCard>

      {composeOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-md">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg font-extrabold">Start a new chat</p>
              <button onClick={() => setComposeOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <input
              value={composeQuery}
              onChange={(e) => setComposeQuery(e.target.value)}
              placeholder="Search users…"
              className="h-11 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {contacts.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => {
                    setActiveId(u.userId);
                    setComposeOpen(false);
                    setComposeQuery("");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-accent/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-xs font-black text-primary">
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{u.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {u.phone ?? u.email} · {u.referralCode}
                    </span>
                  </span>
                </button>
              ))}
              {contacts.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p> : null}
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

/* ============================== channels ============================== */

function ChannelsManager() {
  const channels = useQuery(api.channels.adminListChannels) ?? [];
  const upsert = useMutation(api.channels.adminUpsertChannel);
  const remove = useMutation(api.channels.adminDeleteChannel);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"group" | "channel">("group");
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditId(null);
    setName("");
    setKind("group");
    setUrl("");
    setActive(true);
    setSortOrder(channels.length + 1);
  };

  const save = async () => {
    const n = name.trim();
    const u = url.trim();
    if (!n) return toast.error("Enter a name");
    if (!u) return toast.error("Enter the WhatsApp link");
    setBusy(true);
    try {
      // Omit `id` entirely when creating (matches the payment-method flow).
      const args = {
        ...(editId ? { id: editId as never } : {}),
        name: n,
        kind,
        url: u,
        active,
        sortOrder: Number(sortOrder) || 1,
      };
      await upsert(args);
      toast.success(editId ? "Channel updated." : "Channel added.");
      reset();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      toast.error(raw.replace(/^.*?:\s*/, "").split(" [Request ID")[0] || "Could not save channel");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string, nm: string) => {
    if (!confirm(`Delete "${nm}"?`)) return;
    try {
      await remove({ id: id as never });
      toast.success("Channel deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not delete");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
      <GlassCard className="h-fit space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{editId ? "Edit channel" : "Add channel"}</h2>
          {editId ? (
            <button onClick={reset} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Cancel edit
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          These links power the landing welcome popup and the in-app "Channels &amp; Groups" menu.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HopeX WhatsApp Group"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["group", "channel"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold capitalize transition",
                  kind === k ? "btn-glass btn-glass-primary" : "glass-soft text-muted-foreground",
                )}
              >
                {k === "group" ? <UsersRound className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">WhatsApp link (URL)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/… or https://whatsapp.com/channel/…"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 font-mono text-xs outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 1)}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
          <div className="flex items-end">
            <label className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl glass-soft px-4 text-sm font-semibold">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              Active
            </label>
          </div>
        </div>
        <button
          onClick={() => void save()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-brand text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editId ? "Save changes" : "Add channel"}
        </button>
      </GlassCard>

      <div className="space-y-2.5">
        {channels.length === 0 ? (
          <GlassCard className="p-10 text-center text-sm text-muted-foreground">
            No channels yet — add your first WhatsApp group or channel.
          </GlassCard>
        ) : (
          channels.map((c) => (
            <GlassCard key={c._id} className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white",
                  c.kind === "channel" ? "bg-[#25D366]" : "bg-[#128C7E]",
                )}
              >
                {c.kind === "channel" ? <Megaphone className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {c.name}
                  {!c.active ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">hidden</span> : null}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{c.url || "no link yet"}</p>
              </div>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {c.kind}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">#{c.sortOrder}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setEditId(c._id);
                    setName(c.name);
                    setKind(c.kind === "channel" ? "channel" : "group");
                    setUrl(c.url);
                    setActive(c.active);
                    setSortOrder(c.sortOrder);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-primary"
                  aria-label={`Edit ${c.name}`}
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void del(c._id, c.name)}
                  className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-destructive"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================== audit log ============================== */

function AuditLogPanel() {
  const { audit } = useAdminData();
  return (
    <GlassCard>
      <h2 className="text-lg font-bold">Audit log</h2>
      <p className="text-xs text-muted-foreground">Every admin action, newest first.</p>
      <div className="mt-4 divide-y divide-border/40">
        {audit.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          audit.map((r) => (
            <div key={r._id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {r.action}
                  {r.targetName ? ` · ${r.targetName}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.detail}
                  {r.adminName ? ` — by ${r.adminName}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-[11px] text-muted-foreground">{fmtDateTime(r.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

/* ============================== tools ============================== */

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ToolsPanel() {
  const { users, transactions, plans, audit } = useAdminData();
  const { settings, methods, promos } = useHope();
  const adjust = useMutation(api.admin.adminAdjustBalance);
  const broadcast = useMutation(api.notifications.adminBroadcast);
  const purge = useMutation(api.admin.adminPurgeDeclined);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");
  const [note, setNote] = useState("");
  const [segment, setSegment] = useState<"all" | "active" | "idle">("all");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const regular = users.filter((u) => u.role === "user");
  const pending = transactions.filter((t) => t.status === "pending" || t.status === "processing");

  const segmentUsers = useMemo(
    () => regular.filter((u) => (segment === "all" ? true : segment === "active" ? u.invested > 0 : u.invested === 0)),
    [regular, segment],
  );

  const applyLedger = async () => {
    const amt = Number(amount);
    const u = regular.find((x) => x.userId === target);
    if (!u || !amt || amt <= 0) return toast.error("Pick a user and a valid amount.");
    setBusy(true);
    try {
      await adjust({ userId: u.userId, amount: amt, kind: mode === "credit" ? "deposit" : "withdraw", note: note || "Manual adjustment" });
      setAmount("");
      setNote("");
      toast.success("Ledger entry applied.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const doBroadcast = async () => {
    if (!msg.trim()) return toast.error("Write a message first.");
    setBusy(true);
    try {
      const n = await broadcast({ title: "HopeX update", body: msg.trim(), userIds: segmentUsers.map((u) => u.userId), popup: false });
      setMsg("");
      toast.success(`Sent to ${n} users.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const doPurge = async () => {
    if (!confirm("Delete all declined records older than 30 days?")) return;
    setBusy(true);
    try {
      const n = await purge({ days: 30 });
      toast.success(`${n} old declined records cleared.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Data export</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                download(
                  "hopex-users.csv",
                  toCsv(regular.map((u) => ({ name: u.name, phone: u.phone ?? "", balance: u.balance, invested: u.invested, earnings: u.earnings, referral: u.referralCode, joined: fmtDate(u.createdAt) }))),
                  "text/csv",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              Users CSV
            </button>
            <button
              onClick={() =>
                download(
                  "hopex-transactions.csv",
                  toCsv(transactions.map((t) => ({ user: users.find((u) => u.userId === t.userId)?.name ?? "", type: t.type, amount: t.amount, method: t.method ?? "", status: t.status, date: fmtDateTime(t.createdAt) }))),
                  "text/csv",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              Transactions CSV
            </button>
            <button
              onClick={() =>
                download(
                  `hopex-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify({ users: regular, transactions, plans, audit, exportedAt: new Date().toISOString() }, null, 2),
                  "application/json",
                )
              }
              className="btn-glass rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              JSON snapshot
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">System health</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(
              [
                ["Pending queue", String(pending.length)],
                ["Active plans", String(users.filter((u) => u.invested > 0).length)],
                ["Payment methods", String(methods.filter((m) => m.active).length)],
                ["Promo codes", String(promos.filter((p) => p.active).length)],
                ["Users", String(regular.length)],
                ["Maintenance", settings?.maintenanceMode ? "ON" : "Off"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-2xl glass-soft px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="font-display text-lg font-extrabold">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Manual ledger entry</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-12 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none">
            <option value="">Select user…</option>
            {regular.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} · {u.phone ?? u.email}
              </option>
            ))}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount" className="h-12 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none" />
          <div className="flex gap-1 rounded-xl glass-soft p-1">
            {(["credit", "debit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn("flex-1 rounded-lg text-xs font-bold capitalize transition", mode === m ? "btn-glass btn-glass-primary" : "text-muted-foreground")}
              >
                {m}
              </button>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-12 rounded-xl border border-input bg-background/40 px-4 text-sm outline-none" />
        </div>
        <button onClick={applyLedger} disabled={busy} className="mt-3 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
          Apply entry
        </button>
      </GlassCard>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Segment broadcast</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl glass-soft p-1">
          {(
            [
              ["all", "Everyone"],
              ["active", "With active plan"],
              ["idle", "No plan yet"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSegment(k)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition", segment === k ? "btn-glass btn-glass-primary" : "text-muted-foreground")}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto self-center px-2 text-xs text-muted-foreground">{segmentUsers.length} recipients</span>
        </div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Message to send…" className="mt-3 w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none" />
        <button onClick={doBroadcast} disabled={busy} className="mt-3 flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
          <Send className="h-4 w-4" /> Send broadcast
        </button>
      </GlassCard>

      <GlassCard className="border-destructive/30">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-destructive" />
          <p className="text-sm font-bold text-destructive">Maintenance tools</p>
        </div>
        <button onClick={doPurge} disabled={busy} className="flex items-center gap-2 rounded-xl bg-destructive/15 px-4 py-2.5 text-xs font-bold text-destructive disabled:opacity-60">
          <Trash2 className="h-3.5 w-3.5" /> Clear declined records older than 30 days
        </button>
      </GlassCard>
    </div>
  );
}

/* ============================== SEO ============================== */

function ImageField({ title, value, onChange, hint }: { title: string; value: string | undefined; onChange: (v: string) => void; hint: string }) {
  const uploader = useUploader();
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploader(file);
      onChange(url);
      toast.success(`${title} updated.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{title}</label>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl glass-soft">
          {value ? <img src={value} alt={title} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <label className="btn-glass cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold">
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pick(f);
              e.target.value = "";
            }} />
          </label>
          {value ? (
            <button onClick={() => onChange("")} className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive">
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SeoSettings() {
  const { settings } = useHope();
  const update = useMutation(api.admin.adminUpdateSettings);
  const s = settings;

  const set = async (key: string, value: string | number | undefined) => {
    try {
      await update({ [key]: value } as never);
      toast.success("SEO settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not save");
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Search engine & social preview</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Meta description (shown in Google results)</label>
            <textarea
              defaultValue={s?.seoDescription ?? ""}
              onBlur={(e) => e.target.value !== (s?.seoDescription ?? "") && void set("seoDescription", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Keywords (comma separated)</label>
            <input
              defaultValue={s?.seoKeywords ?? ""}
              onBlur={(e) => e.target.value !== (s?.seoKeywords ?? "") && void set("seoKeywords", e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
          <ImageField
            title="Favicon (browser tab icon)"
            value={s?.siteFavicon}
            onChange={(v) => void set("siteFavicon", v)}
            hint="Square PNG, 64×64 or larger. Replaces the tab icon everywhere."
          />
          <ImageField
            title="Social share image"
            value={s?.ogImage}
            onChange={(v) => void set("ogImage", v)}
            hint="1200×630 works best for WhatsApp, Facebook and X previews."
          />
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Sitemap is served at <span className="font-semibold">/sitemap.xml</span> and crawler rules at{" "}
          <span className="font-semibold">/robots.txt</span>.
        </p>
      </GlassCard>

      <GlassCard>
        <p className="mb-4 text-sm font-bold">Support & withdrawal window</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Support WhatsApp number</label>
            <input
              defaultValue={s?.supportWhatsapp ?? ""}
              placeholder="+92 300 0000000"
              onBlur={(e) => e.target.value !== (s?.supportWhatsapp ?? "") && void set("supportWhatsapp", e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">App download link (APK)</label>
            <input
              defaultValue={s?.appDownloadUrl ?? ""}
              placeholder="https://your-site.com/HopeX.apk"
              onBlur={(e) => e.target.value !== (s?.appDownloadUrl ?? "") && void set("appDownloadUrl", e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Jab user "Install app" par click kare to yahan diya APK download ho. Khali chhoro to native install prompt use hoga.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Withdraw opens (PKT hour)</label>
            <input
              type="number"
              min={0}
              max={23}
              defaultValue={s?.withdrawOpenHour ?? 8}
              onBlur={(e) => void set("withdrawOpenHour", Math.min(23, Math.max(0, Number(e.target.value) || 0)))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Withdraw closes (PKT hour)</label>
            <input
              type="number"
              min={1}
              max={24}
              defaultValue={s?.withdrawCloseHour ?? 19}
              onBlur={(e) => void set("withdrawCloseHour", Math.min(24, Math.max(1, Number(e.target.value) || 24)))}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
          <div className="grid place-items-center rounded-xl glass-soft text-xs font-semibold">
            {s?.withdrawOpenHour ?? 8}:00 — {s?.withdrawCloseHour ?? 19}:00 PKT
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ============================== API keys ============================== */

function ApiKeysPanel() {
  const { apiKeys } = useAdminData();
  const upsert = useMutation(api.admin.adminUpsertApiKey);
  const remove = useMutation(api.admin.adminDeleteApiKey);
  const testKey = useAction(api.upload.testApiKey);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPurpose, setNewPurpose] = useState("all");

  const rows = apiKeys.filter((k) => k.provider === "imgbb");
  const active = rows.filter((r) => r.active).length;
  const uploads = rows.reduce((a, r) => a + r.uploads, 0);
  const failures = rows.reduce((a, r) => a + r.failures, 0);

  const mask = (key: string) => `${key.slice(0, 6)}…${key.slice(-4)}`;

  const add = async () => {
    if (!newKey.trim()) return toast.error("Paste an imgbb API key first");
    setBusy("add");
    try {
      await upsert({ provider: "imgbb", label: newLabel.trim() || "imgbb key", apiKey: newKey.trim(), purpose: newPurpose, active: true });
      setNewKey("");
      setNewLabel("");
      setNewPurpose("all");
      toast.success("Key added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not add key");
    } finally {
      setBusy(null);
    }
  };

  const test = async (id: Id<"apiKeys">) => {
    setBusy(id);
    try {
      const res = await testKey({ id });
      if (res.ok) toast.success("Key is healthy ✅");
      else toast.error(res.error ?? "Key rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Test failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active keys" value={`${active}/${rows.length}`} icon={<KeyRound className="h-4 w-4" />} />
        <StatCard label="Uploads served" value={String(uploads)} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
        <StatCard label="Failures" value={String(failures)} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Purpose" value={newPurpose === "all" ? "All uploads" : newPurpose} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold">Image hosting API keys (imgbb)</h3>
            <p className="text-sm text-muted-foreground">
              Uploads rotate across active keys — add more keys for more storage and higher limits.
            </p>
          </div>
          <button onClick={() => setReveal((v) => !v)} className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold">
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {reveal ? "Hide keys" : "Reveal keys"}
          </button>
        </div>

        <div className="mb-5 grid gap-2 rounded-2xl border border-border/60 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Paste imgbb API key" className="h-11 rounded-xl border border-border bg-background/60 px-3 font-mono text-sm outline-none focus:border-primary" />
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Backup #2)" className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary" />
          <select value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary">
            <option value="all">All uploads</option>
            <option value="proof">Deposit proofs</option>
            <option value="chat">Chat media</option>
            <option value="reward">Reward task proofs</option>
            <option value="branding">Branding / logos</option>
          </select>
          <button onClick={add} disabled={busy === "add"} className="btn-glass flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold gradient-cool text-primary-foreground disabled:opacity-60">
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add key
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No custom keys yet — the built-in key is handling all uploads.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r._id} className={cn("rounded-2xl border p-4 transition", r.active ? "border-success/30 bg-success/5" : "border-border/60 opacity-70")}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    defaultValue={r.label}
                    onBlur={(e) =>
                      e.target.value !== r.label &&
                      void upsert({ id: r._id, provider: r.provider, label: e.target.value, apiKey: r.apiKey, purpose: r.purpose, active: r.active }).then(() => toast.success("Updated."))
                    }
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-sm font-bold outline-none focus:bg-background/60"
                  />
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", r.active ? "border-success/30 bg-success/15 text-success" : "border-border bg-muted text-muted-foreground")}>
                    {r.active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-background/60 px-2.5 py-1 font-mono text-xs">{reveal ? r.apiKey : mask(r.apiKey)}</code>
                  {reveal ? (
                    <button onClick={() => void navigator.clipboard.writeText(r.apiKey).then(() => toast.success("Copied"))} aria-label="Copy key">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {r.uploads} uploads · {r.failures} failures · purpose: {r.purpose}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void test(r._id)} disabled={busy === r._id} className="glass-soft flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold">
                    {busy === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Test
                  </button>
                  <button
                    onClick={() =>
                      void upsert({ id: r._id, provider: r.provider, label: r.label, apiKey: r.apiKey, purpose: r.purpose, active: !r.active }).then(() => toast.success("Updated."))
                    }
                    className="glass-soft rounded-xl px-3 py-1.5 text-xs font-bold"
                  >
                    {r.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete key “${r.label}”?`)) void remove({ id: r._id }).then(() => toast.success("Deleted."));
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-destructive/12 px-3 py-1.5 text-xs font-bold text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== settings ============================== */

function SettingsPanel() {
  const { settings } = useHope();
  const update = useMutation(api.admin.adminUpdateSettings);
  const uploader = useUploader();
  const [busy, setBusy] = useState(false);

  const set = async (key: string, value: unknown) => {
    try {
      await update({ [key]: value } as never);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not save");
    }
  };

  const pickLogo = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploader(file);
      await set("siteLogo", url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold">Platform settings</h2>

      <BrandingSettings settings={settings} set={set} pickLogo={pickLogo} busy={busy} />
      <AnnouncementSettings settings={settings} set={set} />
      <PopupSettings settings={settings} set={set} />
      <MaintenanceSettings settings={settings} set={set} />
      <SalarySettings settings={settings} set={set} />

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["minDeposit", "Minimum deposit"],
            ["minWithdraw", "Minimum withdrawal"],
          ] as const
        ).map(([k, label]) => (
          <div key={k}>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
            <input
              type="number"
              defaultValue={String((settings as never)?.[k] ?? 0)}
              onBlur={(e) => Number(e.target.value) !== Number((settings as never)?.[k]) && void set(k, Number(e.target.value) || 0)}
              className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Quick amounts — deposit & withdraw (comma separated)</label>
        <input
          defaultValue={(settings?.quickAmounts ?? []).join(", ")}
          onBlur={(e) =>
            void set(
              "quickAmounts",
              e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => n > 0),
            )
          }
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>

      <div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">WhatsApp support link</label>
        <input
          defaultValue={settings?.supportWhatsapp ?? ""}
          onBlur={(e) => e.target.value !== (settings?.supportWhatsapp ?? "") && void set("supportWhatsapp", e.target.value)}
          placeholder="https://wa.me/923000000000"
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>

        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Referral commission levels (%)</label>
        <div className="grid grid-cols-4 gap-2">
          {(settings?.levels ?? []).map((lv, i) => (
            <input
              key={i}
              defaultValue={lv}
              type="number"
              onBlur={(e) => {
                const next = [...(settings?.levels ?? [])];
                next[i] = Number(e.target.value) || 0;
                void set("levels", next);
              }}
              className="h-12 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
            />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function BrandingSettings({
  settings,
  set,
  pickLogo,
  busy,
}: {
  settings: ReturnType<typeof useHope>["settings"];
  set: (key: string, value: unknown) => Promise<void>;
  pickLogo: (file: File) => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
      <p className="text-sm font-bold">Site branding</p>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Site name</label>
        <input
          defaultValue={settings?.siteName ?? "HopeX"}
          onBlur={(e) => e.target.value !== (settings?.siteName ?? "HopeX") && void set("siteName", e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Site title (browser tab)</label>
        <input
          defaultValue={settings?.siteTitle ?? ""}
          onBlur={(e) => e.target.value !== (settings?.siteTitle ?? "") && void set("siteTitle", e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Site logo</label>
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl gradient-brand font-display text-base font-black text-primary-foreground">
            {settings?.siteLogo ? (
              <img src={settings.siteLogo} alt={`${settings.siteName} logo`} className="h-full w-full object-cover" />
            ) : (
              (settings?.siteName?.[0] ?? "H")
            )}
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <label className="btn-glass cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold">
              {busy ? "Uploading…" : settings?.siteLogo ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pickLogo(f);
                  e.target.value = "";
                }}
              />
            </label>
            {settings?.siteLogo ? (
              <button onClick={() => void set("siteLogo", "")} className="rounded-xl px-4 py-2 text-xs font-semibold text-destructive">
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementSettings({ settings, set }: { settings: ReturnType<typeof useHope>["settings"]; set: (key: string, value: unknown) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Announcement banner</p>
        <button
          onClick={() => void set("announcementActive", !(settings?.announcementActive ?? false))}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            settings?.announcementActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {settings?.announcementActive ? "Live" : "Off"}
        </button>
      </div>
      <textarea
        defaultValue={settings?.announcementText ?? ""}
        onBlur={(e) => e.target.value !== (settings?.announcementText ?? "") && void set("announcementText", e.target.value)}
        rows={2}
        placeholder="e.g. Withdrawals are processed daily between 8am and 8pm."
        className="mt-3 w-full rounded-xl border border-input bg-background/40 p-3 text-sm outline-none"
      />
    </div>
  );
}

function PopupSettings({
  settings,
  set,
}: {
  settings: ReturnType<typeof useHope>["settings"];
  set: (key: string, value: unknown) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Dashboard welcome popup</p>
        <button
          onClick={() => void set("popupEnabled", !(settings?.popupEnabled ?? true))}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            settings?.popupEnabled === false ? "bg-muted text-muted-foreground" : "bg-success/15 text-success",
          )}
        >
          {settings?.popupEnabled === false ? "Off" : "Live"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Shown on the dashboard every visit — title, subtitle, button and the WhatsApp channels
        below (min deposit / min withdraw come from the settings above).
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Popup title</label>
          <input
            defaultValue={settings?.popupTitle ?? ""}
            onBlur={(e) => e.target.value !== (settings?.popupTitle ?? "") && void set("popupTitle", e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Popup subtitle</label>
          <textarea
            defaultValue={settings?.popupSubtitle ?? ""}
            rows={2}
            onBlur={(e) => e.target.value !== (settings?.popupSubtitle ?? "") && void set("popupSubtitle", e.target.value)}
            className="w-full rounded-xl border border-input bg-background/40 p-4 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Button text</label>
          <input
            defaultValue={settings?.popupButtonText ?? ""}
            onBlur={(e) => e.target.value !== (settings?.popupButtonText ?? "") && void set("popupButtonText", e.target.value)}
            placeholder="Continue to Dashboard"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function MaintenanceSettings({ settings, set }: { settings: ReturnType<typeof useHope>["settings"]; set: (key: string, value: unknown) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Maintenance mode</p>
        <button
          onClick={() => void set("maintenanceMode", !(settings?.maintenanceMode ?? false))}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            settings?.maintenanceMode ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
          )}
        >
          {settings?.maintenanceMode ? "Enabled" : "Disabled"}
        </button>
      </div>
      <input
        defaultValue={settings?.maintenanceMessage ?? ""}
        onBlur={(e) => e.target.value !== (settings?.maintenanceMessage ?? "") && void set("maintenanceMessage", e.target.value)}
        placeholder="We'll be back shortly."
        className="mt-3 h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none"
      />
    </div>
  );
}

function SalarySettings({ settings, set }: { settings: ReturnType<typeof useHope>["settings"]; set: (key: string, value: unknown) => Promise<void> }) {
  const tiers = settings?.salaryTiers ?? [];
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-gold" />
        <p className="text-sm font-bold">Rank salary tiers</p>
      </div>
      <div className="mt-3 space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            {(["rank", "invested", "salary"] as const).map((k) => (
              <input
                key={k}
                defaultValue={String(t[k])}
                onBlur={(e) => {
                  const next = tiers.map((x) => ({ ...x }));
                  if (k === "rank") next[i]!.rank = e.target.value;
                  else next[i] = { ...next[i]!, [k]: Number(e.target.value) || 0 };
                  void set("salaryTiers", next);
                }}
                placeholder={k === "rank" ? "Rank" : k === "invested" ? "L1 invest" : "Salary"}
                className="h-11 rounded-xl border border-input bg-background/40 px-3 text-xs outline-none"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void set("salaryTiers", [...tiers, { rank: "New rank", team: 0, invested: 5000, salary: 500 }])}
          className="btn-glass h-10 px-4 text-xs font-bold text-foreground"
        >
          Add tier
        </button>
        {tiers.length ? (
          <button onClick={() => void set("salaryTiers", tiers.slice(0, -1))} className="btn-glass h-10 px-4 text-xs font-bold text-destructive">
            Remove last
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Columns: rank name, level-1 team investment required, weekly salary. Salary depends only on your direct team's total investment — no team-size requirement.
      </p>
    </div>
  );
}

/* ============================== shared bits ============================== */

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
      />
    </label>
  );
}
