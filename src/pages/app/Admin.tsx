import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle, StatusBadge } from "@/components/hopex/glass";
import { StorageImage, isStorageRef } from "@/components/hopex/storage-image";
import { useAdminData } from "@/hooks/use-admin";
import { useHope } from "@/hooks/use-hope";
import {
  fmtDate,
  fmtDateTime,
  money,
  statusLabel,
  txTypeLabel,
} from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  BellRing,
  CheckCircle2,
  Crown,
  Gauge,
  KeyRound,
  Layers,
  Loader2,
  MessageCircle,
  ShieldHalf,
  Settings,
  Sparkles,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useHope();
  if (!user) return null;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AdminPanel />;
}

/* ============================== panel ============================== */

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "users", label: "Users", icon: Users },
  { id: "transactions", label: "Transactions", icon: Wallet },
  { id: "plans", label: "Plans & Promos", icon: Layers },
  { id: "chat", label: "Support Chat", icon: MessageCircle },
  { id: "rewards", label: "Rewards & Proofs", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminPanel() {
  const [tab, setTab] = useState<TabId>("overview");
  const { loading } = useAdminData();

  return (
    <div className="space-y-5">
      <SectionTitle title="Admin panel" subtitle="Platform administration — users, money, content and support." />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.id ? "btn-glass btn-glass-gold" : "btn-glass text-muted-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid min-h-40 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {tab === "overview" ? <OverviewTab /> : null}
          {tab === "users" ? <UsersTab /> : null}
          {tab === "transactions" ? <TransactionsTab /> : null}
          {tab === "plans" ? <PlansTab /> : null}
          {tab === "chat" ? <ChatTab /> : null}
          {tab === "rewards" ? <RewardsTab /> : null}
          {tab === "settings" ? <SettingsTab /> : null}
        </>
      )}
    </div>
  );
}

/* ============================== overview ============================== */

function OverviewTab() {
  const { stats, users, transactions, audit } = useAdminData();
  const runChecks = useMutation(api.leaderPlans.runLeaderPlanChecks);
  const [busy, setBusy] = useState(false);

  if (!stats) return null;

  const pending = transactions.filter((t) => t.status === "pending" || t.status === "processing");
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={String(stats.users)} hint={`${stats.activeUsers} active`} icon={<Users className="h-4 w-4" />} />
        <Stat label="Assets under mgmt" value={money(stats.aum)} hint={`${stats.investments} investments`} icon={<Gauge className="h-4 w-4" />} />
        <Stat label="Pending deposits" value={money(stats.pendingDeposits)} hint={`${pending.filter((t) => t.type === "deposit").length} requests`} icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Pending withdrawals" value={money(stats.pendingWithdrawals)} hint={`${pending.filter((t) => t.type === "withdraw").length} requests`} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <p className="mb-3 text-sm font-bold">Platform totals</p>
          <div className="space-y-2 text-sm">
            <Row label="Total deposits (approved)" value={money(stats.totalDeposits)} />
            <Row label="Total withdrawals (paid)" value={money(stats.totalWithdrawals)} />
            <Row label="Member earnings" value={money(stats.totalEarnings)} />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="mb-3 text-sm font-bold">Recent signups</p>
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
      </div>

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
        <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Recent audit log
        </p>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No admin actions yet.</p>
        ) : (
          audit.slice(0, 12).map((a) => (
            <div key={a._id} className="flex items-start gap-3 border-t border-border/40 p-3 text-sm">
              <ShieldHalf className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.adminName} · {a.targetName} {a.detail ? `· ${a.detail}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== users ============================== */

function UsersTab() {
  const { users } = useAdminData();
  const updateUser = useMutation(api.admin.adminUpdateUser);
  const adjust = useMutation(api.admin.adminAdjustBalance);
  const [q, setQ] = useState("");
  const [adjusting, setAdjusting] = useState<{
    userId: string;
    name: string;
    amount: string;
    kind: "deposit" | "withdraw";
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            (u.email ?? "").toLowerCase().includes(query) ||
            u.referralCode.toLowerCase().includes(query),
        )
      : users;
    return list.slice(0, 100);
  }, [users, q]);

  const doAdjust = async () => {
    if (!adjusting) return;
    const amount = Number(adjusting.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      await adjust({
        userId: adjusting.userId as never,
        amount,
        kind: adjusting.kind,
        note: adjusting.note,
      });
      toast.success("Balance adjusted.");
      setAdjusting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email or referral code…"
        className="h-12 w-full rounded-2xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <GlassCard className="p-2">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No users found.</p>
        ) : (
          filtered.map((u) => (
            <div key={u.userId} className="flex flex-wrap items-center gap-3 border-b border-border/40 p-3 last:border-0">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black",
                  u.blocked ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
                )}
              >
                {u.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 truncate text-sm font-bold">
                  {u.name}
                  {u.role === "admin" ? (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">admin</span>
                  ) : null}
                  {u.blocked ? (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">blocked</span>
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {u.email || "no email"} · {u.referralCode} · bal {money(u.balance)} · invested{" "}
                  {money(u.invested)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  onClick={() => void updateUser({ userId: u.userId, blocked: !u.blocked })}
                  className="rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-accent"
                >
                  {u.blocked ? "Unblock" : "Block"}
                </button>
                <button
                  onClick={() => void updateUser({ userId: u.userId, role: u.role === "admin" ? "user" : "admin" })}
                  className="rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold transition hover:bg-gold/20"
                >
                  {u.role === "admin" ? "Demote" : "Promote"}
                </button>
                <button
                  onClick={() =>
                    setAdjusting({ userId: u.userId, name: u.name, amount: "", kind: "deposit", note: "" })
                  }
                  className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Balance
                </button>
              </div>
            </div>
          ))
        )}
      </GlassCard>

      {adjusting ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-lg font-extrabold">Adjust balance — {adjusting.name}</h3>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                {(["deposit", "withdraw"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setAdjusting({ ...adjusting, kind: k })}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-sm font-bold capitalize transition",
                      adjusting.kind === k ? "btn-glass btn-glass-primary" : "glass-soft text-muted-foreground",
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={adjusting.amount}
                onChange={(e) => setAdjusting({ ...adjusting, amount: e.target.value })}
                placeholder="Amount (PKR)"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={adjusting.note}
                onChange={(e) => setAdjusting({ ...adjusting, note: e.target.value })}
                placeholder="Note (optional)"
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setAdjusting(null)}
                className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void doAdjust()}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? "Saving…" : "Apply"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

/* ============================== transactions ============================== */

function TransactionsTab() {
  const { transactions } = useAdminData();
  const review = useMutation(api.transactions.adminReviewTransaction);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const rows = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All types</option>
          {["deposit", "withdraw", "investment", "commission", "bonus", "payout"].map((t) => (
            <option key={t} value={t}>
              {txTypeLabel(t)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {["pending", "processing", "approved", "completed", "rejected", "all"].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <GlassCard className="p-2">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No transactions match.</p>
        ) : (
          rows.slice(0, 80).map((t) => (
            <div key={t._id} className="flex flex-wrap items-center gap-3 border-b border-border/40 p-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {txTypeLabel(t.type)} · {money(t.amount)}
                  <StatusBadge status={t.status} />
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {fmtDateTime(t.createdAt)} · {t.method || "—"}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
                {t.proofUrl ? (
                  isStorageRef(t.proofUrl) ? (
                    <StorageImage storageId={t.proofUrl} alt="proof" className="mt-1.5 h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
                  ) : (
                    <img src={t.proofUrl} alt="proof" className="mt-1.5 h-16 w-16 rounded-xl object-cover ring-1 ring-border" />
                  )
                ) : null}
              </div>
              {(t.status === "pending" || t.status === "processing") &&
              (t.type === "deposit" || t.type === "withdraw") ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => void review({ id: t._id, approve: true })}
                    className="flex items-center gap-1 rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success transition hover:bg-success/25"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => void review({ id: t._id, approve: false })}
                    className="flex items-center gap-1 rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/25"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== plans & promos ============================== */

const EMPTY_PLAN = {
  slug: "",
  name: "",
  minAmount: 1000,
  maxAmount: 50000,
  dailyRoi: 1.2,
  durationDays: 30,
  features: "Daily payouts",
  active: true,
  sortOrder: 1,
};

function PlansTab() {
  const { plans, promos } = useAdminData();
  const upsertPlan = useMutation(api.plans.adminUpsertPlan);
  const deletePlan = useMutation(api.plans.adminDeletePlan);
  const upsertPromo = useMutation(api.promoCodes.adminUpsertPromo);
  const deletePromo = useMutation(api.promoCodes.adminDeletePromo);
  const [editing, setEditing] = useState<typeof EMPTY_PLAN & { id?: string } | null>(null);
  const [promo, setPromo] = useState<{ id?: string; code: string; type: "percent" | "fixed"; value: string; usageLimit: string; active: boolean }>({
    code: "",
    type: "percent",
    value: "10",
    usageLimit: "100",
    active: true,
  });

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.slug.trim() || !editing.name.trim()) return toast.error("Slug and name are required");
    setBusy(true);
    try {
      await upsertPlan({
        id: editing.id as never,
        slug: editing.slug.trim(),
        name: editing.name.trim(),
        minAmount: Number(editing.minAmount),
        maxAmount: Number(editing.maxAmount),
        dailyRoi: Number(editing.dailyRoi),
        durationDays: Number(editing.durationDays),
        features: editing.features.split(",").map((s) => s.trim()).filter(Boolean),
        active: editing.active,
        sortOrder: Number(editing.sortOrder),
      });
      toast.success("Plan saved.");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save plan");
    } finally {
      setBusy(false);
    }
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promo.code.trim()) return toast.error("Enter a code");
    setBusy(true);
    try {
      await upsertPromo({
        id: promo.id as never,
        code: promo.code,
        type: promo.type,
        value: Number(promo.value),
        usageLimit: Number(promo.usageLimit),
        active: promo.active,
      });
      toast.success("Promo code saved.");
      setPromo({ code: "", type: "percent", value: "10", usageLimit: "100", active: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save promo");
    } finally {
      setBusy(false);
    }
  };

  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      {/* Plans */}
      <GlassCard className="p-2">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plans</p>
          <button onClick={() => setEditing({ ...EMPTY_PLAN })} className="btn-glass btn-glass-primary h-9 px-4 text-xs font-bold">
            + New plan
          </button>
        </div>
        {plans.map((p) => (
          <div key={p.slug} className="flex flex-wrap items-center gap-3 border-t border-border/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                {p.name}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{p.slug}</span>
                {!p.active ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">hidden</span> : null}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Rs {p.minAmount.toLocaleString()} – {p.maxAmount.toLocaleString()} · {p.dailyRoi}%/day · {p.durationDays}d
              </p>
            </div>
            <button
              onClick={() =>
                setEditing({
                  id: p._id,
                  slug: p.slug,
                  name: p.name,
                  minAmount: p.minAmount,
                  maxAmount: p.maxAmount,
                  dailyRoi: p.dailyRoi,
                  durationDays: p.durationDays,
                  features: p.features.join(", "),
                  active: p.active,
                  sortOrder: p.sortOrder,
                })
              }
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
            >
              Edit
            </button>
          </div>
        ))}
      </GlassCard>

      {/* Promos */}
      <GlassCard className="p-2">
        <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Promo codes</p>
        <div className="border-t border-border/40 p-3">
          <form onSubmit={savePromo} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <input
              value={promo.code}
              onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })}
              placeholder="CODE"
              className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={promo.type}
              onChange={(e) => setPromo({ ...promo, type: e.target.value as "percent" | "fixed" })}
              className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
            >
              <option value="percent">percent</option>
              <option value="fixed">fixed</option>
            </select>
            <input
              type="number"
              value={promo.value}
              onChange={(e) => setPromo({ ...promo, value: e.target.value })}
              placeholder="Value"
              className="h-11 w-24 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
            />
            <input
              type="number"
              value={promo.usageLimit}
              onChange={(e) => setPromo({ ...promo, usageLimit: e.target.value })}
              placeholder="Limit"
              className="h-11 w-24 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
            />
            <button className="btn-glass btn-glass-primary h-11 px-4 text-sm font-bold">Save</button>
          </form>
        </div>
        {promos.map((p) => (
          <div key={p._id} className="flex items-center gap-3 border-t border-border/40 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-bold tracking-wider">{p.code}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {p.type === "percent" ? `${p.value}%` : money(p.value)} · {p.used}/{p.usageLimit} used ·{" "}
                {p.active ? "active" : "inactive"}
              </span>
            </span>
            <button onClick={() => void deletePromo({ id: p._id })} className="text-xs font-semibold text-destructive">
              Delete
            </button>
          </div>
        ))}
      </GlassCard>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise my-8 w-full max-w-md">
            <h3 className="font-display text-lg font-extrabold">{editing.id ? "Edit plan" : "New plan"}</h3>
            <form onSubmit={savePlan} className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} />
                <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min (PKR)" value={String(editing.minAmount)} onChange={(v) => setEditing({ ...editing, minAmount: Number(v) })} />
                <Field label="Max (PKR)" value={String(editing.maxAmount)} onChange={(v) => setEditing({ ...editing, maxAmount: Number(v) })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Daily ROI %" value={String(editing.dailyRoi)} onChange={(v) => setEditing({ ...editing, dailyRoi: Number(v) })} />
                <Field label="Days" value={String(editing.durationDays)} onChange={(v) => setEditing({ ...editing, durationDays: Number(v) })} />
                <Field label="Sort" value={String(editing.sortOrder)} onChange={(v) => setEditing({ ...editing, sortOrder: Number(v) })} />
              </div>
              <Field label="Features (comma separated)" value={editing.features} onChange={(v) => setEditing({ ...editing, features: v })} />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active (visible to investors)
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(null)} className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60">
                  {busy ? "Saving…" : "Save plan"}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

/* ============================== chat ============================== */

function ChatTab() {
  const { threads } = useAdminData();
  const reply = useMutation(api.chat.adminReply);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const active = threads.find((t) => t.userId === activeUserId) ?? null;

  const send = async () => {
    if (!active || !text.trim()) return;
    setBusy(true);
    try {
      await reply({ userId: active.userId as never, text: text.trim() });
      setText("");
    } catch {
      toast.error("Could not send reply");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <GlassCard className="p-2">
        {threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          threads.map((t) => (
            <button
              key={t.userId}
              onClick={() => setActiveUserId(t.userId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-accent/40",
                active?.userId === t.userId && "bg-accent/60",
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-xs font-black text-primary">
                {t.name[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{t.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {t.messages[t.messages.length - 1]?.text || "…"}
                </span>
              </span>
              {t.unread > 0 ? (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-background">
                  {t.unread}
                </span>
              ) : null}
            </button>
          ))
        )}
      </GlassCard>

      <GlassCard className="flex h-[480px] flex-col p-0">
        {!active ? (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Select a conversation on the left.
          </div>
        ) : (
          <>
            <div className="border-b border-border/40 px-4 py-3 font-bold">{active.name}</div>
            <div className="wa wa-panel wa-wall min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {active.messages.map((m) => (
                <div key={m._id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("wa-bubble", m.sender === "user" ? "wa-out wa-bubble-out" : "wa-in wa-bubble-in")}>
                    {m.attachment?.url ? (
                      <div className="mb-1 overflow-hidden rounded-md">
                        {isStorageRef(m.attachment.url) ? (
                          <StorageImage storageId={m.attachment.url} alt={m.attachment.name} className="max-h-40 w-full object-cover" />
                        ) : (
                          <img src={m.attachment.url} alt={m.attachment.name} className="max-h-40 w-full object-cover" />
                        )}
                      </div>
                    ) : null}
                    {m.text}
                    <span className="wa-meta">{fmtDateTime(m.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-black/5 p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                placeholder="Reply as support…"
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => void send()}
                disabled={busy || !text.trim()}
                className="btn-glass btn-glass-primary h-11 shrink-0 px-5 text-sm font-bold disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

/* ============================== rewards & proofs ============================== */

function RewardsTab() {
  const { rewardClaims, proofs, leaderPlans, users } = useAdminData();
  const { plans } = useHope();
  const reviewReward = useMutation(api.rewards.reviewRewardClaim);
  const reviewProof = useMutation(api.proofs.reviewWithdrawalProof);
  const activateLeader = useMutation(api.leaderPlans.adminActivateLeaderPlan);
  const removeLeader = useMutation(api.leaderPlans.adminRemoveLeaderPlan);
  const [tab, setTab] = useState<"rewards" | "proofs" | "leaders">("rewards");
  const [leaderForm, setLeaderForm] = useState<{ userId: string; planId: string; amount: string; checkHours: string; required: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(users.map((u) => [u.userId, u.name])),
    [users],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            { id: "rewards", label: `Reward tasks (${rewardClaims.filter((c) => c.status === "pending").length})` },
            { id: "proofs", label: `Payout proofs (${proofs.filter((p) => p.status === "pending").length})` },
            { id: "leaders", label: `Leader plans (${leaderPlans.filter((l) => l.status === "active").length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.id ? "btn-glass btn-glass-primary" : "btn-glass text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rewards" ? (
        <GlassCard className="p-2">
          {rewardClaims.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No reward task submissions.</p>
          ) : (
            rewardClaims.map((c) => (
              <div key={c._id} className="flex flex-wrap items-center gap-3 border-b border-border/40 p-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {nameById.get(c.userId) ?? "User"} · {money(c.amount)} <StatusBadge status={c.status} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(c.createdAt)}</p>
                  <span className="mt-1.5 flex gap-2">
                    {c.whatsappProof ? (
                      isStorageRef(c.whatsappProof) ? (
                        <StorageImage storageId={c.whatsappProof} alt="wa" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                      ) : (
                        <img src={c.whatsappProof} alt="wa" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                      )
                    ) : null}
                    {c.facebookProof ? (
                      isStorageRef(c.facebookProof) ? (
                        <StorageImage storageId={c.facebookProof} alt="fb" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                      ) : (
                        <img src={c.facebookProof} alt="fb" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                      )
                    ) : null}
                  </span>
                </div>
                {c.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void reviewReward({ id: c._id, approve: true })}
                      className="rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success transition hover:bg-success/25"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void reviewReward({ id: c._id, approve: false })}
                      className="rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/25"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </GlassCard>
      ) : null}

      {tab === "proofs" ? (
        <GlassCard className="p-2">
          {proofs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No payout proof submissions.</p>
          ) : (
            proofs.map((p) => (
              <div key={p._id} className="flex flex-wrap items-center gap-3 border-b border-border/40 p-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {nameById.get(p.userId) ?? "User"} · {money(p.amount)} <StatusBadge status={p.status} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(p.createdAt)}</p>
                  <span className="mt-1.5 block">
                    {isStorageRef(p.imageUrl) ? (
                      <StorageImage storageId={p.imageUrl} alt="payout proof" className="h-20 w-20 rounded-xl object-cover ring-1 ring-border" />
                    ) : (
                      <img src={p.imageUrl} alt="payout proof" className="h-20 w-20 rounded-xl object-cover ring-1 ring-border" />
                    )}
                  </span>
                </div>
                {p.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void reviewProof({ id: p._id, approve: true })}
                      className="rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success transition hover:bg-success/25"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void reviewProof({ id: p._id, approve: false })}
                      className="rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/25"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </GlassCard>
      ) : null}

      {tab === "leaders" ? (
        <>
          <button
            onClick={() => setLeaderForm({ userId: "", planId: "", amount: "", checkHours: "24", required: "0" })}
            className="btn-glass btn-glass-gold h-11 px-5 text-sm font-bold"
          >
            + Activate leader plan
          </button>
          <GlassCard className="p-2">
            {leaderPlans.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No leader plans yet.</p>
            ) : (
              leaderPlans.map((lp) => (
                <div key={lp._id} className="flex flex-wrap items-center gap-3 border-b border-border/40 p-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                      {nameById.get(lp.userId) ?? "User"} · {lp.planName} · {money(lp.amount)}
                      <StatusBadge status={lp.status} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Requires {money(lp.requiredInvestment)} team investment by {fmtDateTime(lp.deadlineAt)}
                    </p>
                  </div>
                  {lp.status === "active" ? (
                    <button
                      onClick={() => void removeLeader({ id: lp._id })}
                      className="rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/25"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </GlassCard>
        </>
      ) : null}

      {leaderForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-lg font-extrabold">Activate leader plan</h3>
            <div className="mt-4 space-y-3">
              <select
                value={leaderForm.userId}
                onChange={(e) => setLeaderForm({ ...leaderForm, userId: e.target.value })}
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.referralCode})
                  </option>
                ))}
              </select>
              <select
                value={leaderForm.planId}
                onChange={(e) => setLeaderForm({ ...leaderForm, planId: e.target.value })}
                className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
              >
                <option value="">Select plan…</option>
                {plans.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={leaderForm.amount}
                  onChange={(e) => setLeaderForm({ ...leaderForm, amount: e.target.value })}
                  placeholder="Amount"
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                />
                <input
                  type="number"
                  value={leaderForm.checkHours}
                  onChange={(e) => setLeaderForm({ ...leaderForm, checkHours: e.target.value })}
                  placeholder="Hours"
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                />
                <input
                  type="number"
                  value={leaderForm.required}
                  onChange={(e) => setLeaderForm({ ...leaderForm, required: e.target.value })}
                  placeholder="Req"
                  className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setLeaderForm(null)} className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!leaderForm.userId || !leaderForm.planId || !leaderForm.amount) {
                    return toast.error("Select a user, plan and amount");
                  }
                  setBusy(true);
                  try {
                    await activateLeader({
                      userId: leaderForm.userId as never,
                      planId: leaderForm.planId,
                      amount: Number(leaderForm.amount),
                      checkHours: Number(leaderForm.checkHours || 24),
                      requiredInvestment: Number(leaderForm.required || 0),
                    });
                    toast.success("Leader plan activated.");
                    setLeaderForm(null);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Activation failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? "Activating…" : "Activate"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

/* ============================== settings ============================== */

function SettingsTab() {
  const { apiKeys, audit, users } = useAdminData();
  const { settings, methods } = useHope();
  const updateSettings = useMutation(api.admin.adminUpdateSettings);
  const upsertMethod = useMutation(api.admin.adminUpsertPaymentMethod);
  const deleteMethod = useMutation(api.admin.adminDeletePaymentMethod);
  const upsertKey = useMutation(api.admin.adminUpsertApiKey);
  const deleteKey = useMutation(api.admin.adminDeleteApiKey);
  const notify = useMutation(api.notifications.adminNotify);

  const [form, setForm] = useState(() => ({
    siteName: settings?.siteName ?? "HopeX",
    minDeposit: String(settings?.minDeposit ?? 1000),
    minWithdraw: String(settings?.minWithdraw ?? 500),
    levels: (settings?.levels ?? [10, 2, 1, 4]).join(","),
    announcementText: settings?.announcementText ?? "",
    announcementActive: settings?.announcementActive ?? false,
    maintenanceMode: settings?.maintenanceMode ?? false,
    maintenanceMessage: settings?.maintenanceMessage ?? "",
    supportWhatsapp: settings?.supportWhatsapp ?? "",
    withdrawOpenHour: String(settings?.withdrawOpenHour ?? 8),
    withdrawCloseHour: String(settings?.withdrawCloseHour ?? 19),
    rewardAmount: String(settings?.rewardAmount ?? 100),
    rewardCooldownHours: String(settings?.rewardCooldownHours ?? 24),
    rewardActive: settings?.rewardActive ?? true,
    proofRewardAmount: String(settings?.proofRewardAmount ?? 5),
    showProofsSection: settings?.showProofsSection ?? true,
    salaryTiers: (settings?.salaryTiers ?? []).map((t) => `${t.rank}:${t.invested}:${t.salary}`).join("\n"),
  }));
  const [methodForm, setMethodForm] = useState<{ name: string; kind: "wallet" | "bank"; accountName: string; accountNumber: string; instructions: string; active: boolean } | null>(null);
  const [keyForm, setKeyForm] = useState<{ provider: string; label: string; apiKey: string; purpose: string; active: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateSettings({
        siteName: form.siteName.trim() || "HopeX",
        minDeposit: Number(form.minDeposit) || 0,
        minWithdraw: Number(form.minWithdraw) || 0,
        levels: form.levels.split(",").map(Number),
        announcementText: form.announcementText,
        announcementActive: form.announcementActive,
        maintenanceMode: form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage,
        supportWhatsapp: form.supportWhatsapp,
        withdrawOpenHour: Number(form.withdrawOpenHour) || 8,
        withdrawCloseHour: Number(form.withdrawCloseHour) || 19,
        rewardAmount: Number(form.rewardAmount) || 0,
        rewardCooldownHours: Number(form.rewardCooldownHours) || 24,
        rewardActive: form.rewardActive,
        proofRewardAmount: Number(form.proofRewardAmount) || 0,
        showProofsSection: form.showProofsSection,
        salaryTiers: form.salaryTiers
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [rank, invested, salary] = line.split(":");
            return { rank: rank ?? "Rank", invested: Number(invested) || 0, salary: Number(salary) || 0, team: 0 };
          }),
      });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <p className="mb-4 text-sm font-bold">Site settings</p>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Site name" value={form.siteName} onChange={(v) => setForm({ ...form, siteName: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min deposit" value={form.minDeposit} onChange={(v) => setForm({ ...form, minDeposit: v })} />
            <Field label="Min withdraw" value={form.minWithdraw} onChange={(v) => setForm({ ...form, minWithdraw: v })} />
          </div>
          <Field label="Referral levels % (comma: L1..L4)" value={form.levels} onChange={(v) => setForm({ ...form, levels: v })} />
          <Field label="WhatsApp support" value={form.supportWhatsapp} onChange={(v) => setForm({ ...form, supportWhatsapp: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Withdraw open hour" value={form.withdrawOpenHour} onChange={(v) => setForm({ ...form, withdrawOpenHour: v })} />
            <Field label="Withdraw close hour" value={form.withdrawCloseHour} onChange={(v) => setForm({ ...form, withdrawCloseHour: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reward amount" value={form.rewardAmount} onChange={(v) => setForm({ ...form, rewardAmount: v })} />
            <Field label="Reward cooldown hrs" value={form.rewardCooldownHours} onChange={(v) => setForm({ ...form, rewardCooldownHours: v })} />
          </div>
          <Field label="Proof reward amount" value={form.proofRewardAmount} onChange={(v) => setForm({ ...form, proofRewardAmount: v })} />
          <textarea
            value={form.announcementText}
            onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
            placeholder="Announcement text"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={form.salaryTiers}
            onChange={(e) => setForm({ ...form, salaryTiers: e.target.value })}
            placeholder="Salary tiers (Rank:invested:salary per line)"
            className="min-h-24 w-full rounded-xl border border-input bg-background/40 px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            {(
              [
                { key: "announcementActive", label: "Show announcement" },
                { key: "maintenanceMode", label: "Maintenance mode" },
                { key: "rewardActive", label: "Reward task open" },
                { key: "showProofsSection", label: "Show proofs wall" },
              ] as const
            ).map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form[c.key]}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                  className="h-4 w-4"
                />
                {c.label}
              </label>
            ))}
          </div>
          <div className="sm:col-span-2">
            <button disabled={busy} className="btn-glass btn-glass-primary h-12 px-8 text-sm font-bold disabled:opacity-60">
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Payment methods */}
      <GlassCard className="p-2">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment methods</p>
          <span className="text-[11px] text-muted-foreground">used at deposit</span>
          <button onClick={() => setMethodForm({ name: "", kind: "wallet", accountName: "", accountNumber: "", instructions: "", active: true })} className="btn-glass btn-glass-primary h-9 px-4 text-xs font-bold">
            + Add
          </button>
        </div>
        {methods.map((m) => (
          <div key={m._id} className="flex flex-wrap items-center gap-3 border-t border-border/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {m.name} <span className="text-[10px] font-semibold uppercase text-muted-foreground">{m.kind}</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {m.accountName} · {m.accountNumber} · {m.active ? "active" : "hidden"}
              </p>
            </div>
            <button
              onClick={() => setMethodForm({ name: m.name, kind: m.kind, accountName: m.accountName, accountNumber: m.accountNumber, instructions: m.instructions, active: m.active })}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
            >
              Edit
            </button>
          </div>
        ))}
      </GlassCard>

      {/* API keys */}
      <GlassCard className="p-2">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Image API keys</p>
          <button onClick={() => setKeyForm({ provider: "imgbb", label: "Key", apiKey: "", purpose: "images", active: true })} className="btn-glass btn-glass-primary h-9 px-4 text-xs font-bold">
            + Add key
          </button>
        </div>
        {apiKeys.length === 0 ? (
          <p className="border-t border-border/40 p-4 text-sm text-muted-foreground">
            No keys — image uploads use built-in Convex storage instead.
          </p>
        ) : (
          apiKeys.map((k) => (
            <div key={k._id} className="flex flex-wrap items-center gap-3 border-t border-border/40 p-3">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {k.label} <span className="text-[10px] font-semibold uppercase text-muted-foreground">{k.provider}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {k.uploads} uploads · {k.failures} failures · {k.active ? "active" : "inactive"}
                </p>
              </div>
              <button onClick={() => void deleteKey({ id: k._id })} className="text-xs font-semibold text-destructive">
                Delete
              </button>
            </div>
          ))
        )}
      </GlassCard>

      {/* Broadcast notification */}
      <GlassCard className="p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <BellRing className="h-4 w-4 text-primary" /> Send notification
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const userId = fd.get("userId") as string;
            const title = (fd.get("title") as string) ?? "";
            const body = (fd.get("body") as string) ?? "";
            if (!userId || !title) return toast.error("Select a user and enter a title");
            try {
              await notify({ userId: userId as never, title, body });
              toast.success("Notification sent.");
              (e.currentTarget as HTMLFormElement).reset();
            } catch {
              toast.error("Could not send notification");
            }
          }}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <select name="userId" className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none">
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Title" className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none" />
          <input name="body" placeholder="Message" className="h-11 rounded-xl border border-input bg-background/40 px-3 text-sm outline-none" />
          <button className="btn-glass btn-glass-primary h-11 px-5 text-sm font-bold">Send</button>
        </form>
      </GlassCard>

      {methodForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-lg font-extrabold">{methodForm.name ? "Edit" : "New"} payment method</h3>
            <div className="mt-4 grid gap-3">
              <Field label="Name" value={methodForm.name} onChange={(v) => setMethodForm({ ...methodForm, name: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kind" value={methodForm.kind} onChange={(v) => setMethodForm({ ...methodForm, kind: v as "wallet" | "bank" })} />
                <Field label="Active" value={String(methodForm.active)} onChange={(v) => setMethodForm({ ...methodForm, active: v === "true" })} />
              </div>
              <Field label="Account name" value={methodForm.accountName} onChange={(v) => setMethodForm({ ...methodForm, accountName: v })} />
              <Field label="Account number" value={methodForm.accountNumber} onChange={(v) => setMethodForm({ ...methodForm, accountNumber: v })} />
              <Field label="Instructions" value={methodForm.instructions} onChange={(v) => setMethodForm({ ...methodForm, instructions: v })} />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setMethodForm(null)} className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!methodForm.name.trim()) return toast.error("Enter a name");
                  setBusy(true);
                  try {
                    await upsertMethod({ ...methodForm, sortOrder: methods.length + 1 });
                    toast.success("Payment method saved.");
                    setMethodForm(null);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {keyForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-lg font-extrabold">API key</h3>
            <div className="mt-4 grid gap-3">
              <Field label="Provider" value={keyForm.provider} onChange={(v) => setKeyForm({ ...keyForm, provider: v })} />
              <Field label="Label" value={keyForm.label} onChange={(v) => setKeyForm({ ...keyForm, label: v })} />
              <Field label="API key" value={keyForm.apiKey} onChange={(v) => setKeyForm({ ...keyForm, apiKey: v })} />
              <Field label="Purpose" value={keyForm.purpose} onChange={(v) => setKeyForm({ ...keyForm, purpose: v })} />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setKeyForm(null)} className="btn-glass flex h-11 flex-1 items-center justify-center text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!keyForm.apiKey.trim()) return toast.error("Enter the key");
                  setBusy(true);
                  try {
                    await upsertKey({ ...keyForm });
                    toast.success("API key saved.");
                    setKeyForm(null);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-11 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

/* ============================== shared bits ============================== */

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <GlassCard className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate font-display text-xl font-extrabold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
