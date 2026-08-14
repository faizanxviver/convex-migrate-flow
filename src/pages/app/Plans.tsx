import { api } from "@/convex/_generated/api";
import { GlassCard } from "@/components/hopex/glass";
import { CommunityLinks } from "@/components/hopex/community";
import { useHope } from "@/hooks/use-hope";
import {
  activeInvestments,
  dailyIncome,
  depositBalance,
  investableBalance,
  money,
  planDaily,
  remainingDeposit,
  round2,
  type Plan,
} from "@/lib/hopex";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Check,
  Layers,
  Rocket,
  TrendingUp,
  Wallet2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLAN_GRADIENTS: Record<string, string> = {
  starter: "linear-gradient(135deg, #2dd4bf44, #0ea5e944)",
  growth: "linear-gradient(135deg, #6366f144, #8b5cf644)",
  premium: "linear-gradient(135deg, #f59e0b46, #ef444446)",
  vip: "linear-gradient(135deg, #a855f746, #d946ef46)",
};

const PLAN_ICONS: Record<string, string> = { starter: "🌱", growth: "📈", premium: "💎", vip: "👑" };

export default function PlansPage() {
  const { profile, plans, transactions, investments } = useHope();
  const buyPlan = useMutation(api.investments.buyPlan);
  const navigate = useNavigate();
  const [active, setActive] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const totalDeposited = depositBalance(transactions, profile.userId);
  const remaining = remainingDeposit(profile.balance, transactions, profile.invested, profile.userId);
  const investable = investableBalance(profile.balance, transactions, profile.invested, profile.userId);
  const running = activeInvestments(investments, profile.userId);
  const totalDaily = dailyIncome(investments, profile.userId);

  const price = active ? active.minAmount : 0;
  const daily = active ? planDaily(active) : 0;
  const total = active ? round2(daily * active.durationDays) : 0;

  const invest = async () => {
    if (!active) return;
    if (price > investable)
      return toast.error("Insufficient deposit balance. Please deposit more to activate this plan.");
    setBusy(true);
    try {
      await buyPlan({ planId: active.slug, amount: price });
      toast.success(`${active.name} plan is now live — first income added to your withdraw balance.`);
      setActive(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not activate plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact hero + balances */}
      <div className="relative overflow-hidden rounded-[1.75rem] glass p-5">
        <span className="pointer-events-none absolute -left-14 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand shadow-lg shadow-primary/25">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-black sm:text-2xl">Investment plans</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick any plan — or several at once — and start earning daily income.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl glass-soft px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                <Wallet2 className="h-3 w-3" /> Deposit balance
              </p>
              <p className="mt-0.5 truncate font-display text-2xl font-black">{money(remaining)}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                of {money(totalDeposited)} deposited — drops when you activate
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard/deposit")}
              className="btn-glass btn-glass-primary grid h-11 shrink-0 place-items-center px-5 text-xs font-bold"
            >
              Deposit
            </button>
          </div>

          <button
            onClick={() => navigate("/dashboard/investments")}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-2.5 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="font-bold text-foreground">{running.length}</span> active plans
              <span className="text-muted-foreground">·</span>
              <span className="font-bold text-success">{money(totalDaily)}/day</span>
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>

      {/* Slim multiple-activation note */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-success/25 bg-success/10 px-3.5 py-2.5">
        <Layers className="h-4 w-4 shrink-0 text-success" />
        <p className="text-xs leading-snug text-muted-foreground">
          Activate any plan <b className="text-foreground">multiple times</b> — your plans run
          together, each pays its own daily income, and your first income is credited to your
          withdraw balance instantly.
        </p>
      </div>

      {/* Compact plan cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plans
          .filter((p) => p.active)
          .map((p) => {
            const d = planDaily(p);
            const affordable = investable >= p.minAmount;
            const gradient = PLAN_GRADIENTS[p.slug] ?? PLAN_GRADIENTS.starter;
            return (
              <GlassCard key={p.slug} className="group flex flex-col overflow-hidden p-0">
                <div className="relative h-24 overflow-hidden" style={{ background: gradient }}>
                  <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
                      {PLAN_ICONS[p.slug] ?? "📊"}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute bottom-2 left-4">
                    <h2 className="font-display text-lg font-extrabold drop-shadow">{p.name}</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Price
                      </p>
                      <p className="truncate font-display text-2xl font-black">{money(p.minAmount)}</p>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center">
                      <Mini label="Daily" value={money(d)} className="bg-success/10 text-success" />
                      <Mini label="First" value={money(d)} className="bg-primary/10 text-primary" />
                      <Mini label="Days" value={String(p.durationDays)} className="bg-gold/15 text-gold" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl glass-soft px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Total return</span>
                    <span className="font-bold text-gold">{money(round2(d * p.durationDays))}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <Zap className="h-3 w-3" /> Instant first income
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"
                      >
                        <Check className="h-2.5 w-2.5" /> {f}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => (affordable ? setActive(p) : navigate("/dashboard/deposit"))}
                    className="btn-glass btn-glass-primary mt-auto flex h-11 items-center justify-center gap-2 text-sm font-bold"
                  >
                    {affordable ? "Activate plan" : "Deposit & activate"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
      </div>

      {/* Confirm modal */}
      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-xl font-extrabold">Confirm activation</h3>
            <p className="mt-1 text-sm text-muted-foreground">{active.name}</p>
            <div className="mt-4 space-y-2 rounded-2xl glass-soft p-4 text-sm">
              <Row label="Available to invest" value={money(investable)} />
              <Row label="Price" value={money(price)} />
              <Row label="Daily income" value={money(daily)} />
              <Row label="First income" value={money(daily)} accent />
              <Row label="Days" value={String(active.durationDays)} />
              <Row label="Total return" value={money(total)} accentGold />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {money(price)} is funded from your available balance and your first income of{" "}
              {money(daily)} is credited to your withdrawable balance instantly. You can activate
              this plan again any time — multiple active plans run together.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setActive(null)}
                className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void invest()}
                disabled={busy}
                className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold disabled:opacity-60"
              >
                {busy ? "Processing…" : "Confirm & activate"}
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      <CommunityLinks />
    </div>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className={`min-w-[3.4rem] rounded-lg p-1.5 ${className}`}>
      <p className="text-[9px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-px truncate text-xs font-black">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  accentGold,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentGold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          accent ? "font-bold text-success" : accentGold ? "font-bold text-gold" : "font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}
