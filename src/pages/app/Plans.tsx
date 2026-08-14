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

const STAT_TONE = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  gold: "bg-gold/15 text-gold",
} as const;

export default function PlansPage() {
  const { profile, plans, transactions, investments } = useHope();
  const buyPlan = useMutation(api.investments.buyPlan);
  const navigate = useNavigate();
  const [active, setActive] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const deposited = depositBalance(transactions, profile.userId);
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
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] glass p-6">
        <span className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -right-10 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand shadow-lg shadow-primary/25">
            <Rocket className="h-7 w-7 text-primary-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-black sm:text-3xl">Investment plans</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick any plan — or several at once — and start earning daily income.
            </p>
          </div>
        </div>
      </div>

      {/* Multiple activations banner */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Layers className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Multiple activations allowed</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            You can activate every plan as many times as you like — all your plans run at the same
            time and each one pays its own daily income. Your first income is added to your
            withdrawable balance the moment you activate.
          </p>
        </div>
      </div>

      {/* Balance + active plans */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl gradient-brand p-5 text-primary-foreground">
          <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary-foreground/80">
              <Wallet2 className="h-3.5 w-3.5" /> Deposit balance
            </p>
            <p className="mt-2 font-display text-3xl font-black">{money(investable)}</p>
            <p className="mt-1 text-xs text-primary-foreground/75">
              Total deposited {money(deposited)} — available to fund new plans
            </p>
            <button
              onClick={() => navigate("/dashboard/deposit")}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-xs font-bold backdrop-blur transition hover:bg-white/25"
            >
              Deposit funds <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col rounded-3xl glass p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Your active plans
          </p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="font-display text-3xl font-black">{running.length}</p>
            <p className="text-right text-xs text-muted-foreground">
              <span className="block font-bold text-success">{money(totalDaily)}/day</span>
              combined income
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/investments")}
            className="mt-auto inline-flex h-10 items-center gap-1.5 self-start rounded-xl bg-primary/10 px-4 text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            View my investments <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans
          .filter((p) => p.active)
          .map((p, i) => {
            const d = planDaily(p);
            const affordable = investable >= p.minAmount;
            const gradient = PLAN_GRADIENTS[p.slug] ?? PLAN_GRADIENTS.starter;
            return (
              <div key={p.slug} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <GlassCard className="group flex h-full flex-col overflow-hidden p-0">
                <div className="relative h-36 overflow-hidden" style={{ background: gradient }}>
                  <span className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
                  <span className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl drop-shadow-lg transition-transform duration-700 group-hover:scale-110">
                      {PLAN_ICONS[p.slug] ?? "📊"}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="font-display text-xl font-extrabold drop-shadow">{p.name}</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="rounded-2xl glass-soft p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Plan price
                      </span>
                      <span className="font-display text-2xl font-extrabold">{money(p.minAmount)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Stat label="Daily income" value={money(d)} tone="success" />
                      <Stat label="First income" value={money(d)} tone="primary" />
                      <Stat label="Days" value={String(p.durationDays)} tone="gold" />
                    </div>
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total return</span>
                        <span className="font-bold text-gold">{money(round2(d * p.durationDays))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">First income paid</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-success">
                          <Zap className="h-3.5 w-3.5" /> Instantly
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/15">
                          <Check className="h-2.5 w-2.5 text-success" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl bg-primary/10 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-primary">
                    You can activate this plan again and again — multiple active plans run at the
                    same time, each paying its own daily income.
                  </div>

                  <button
                    onClick={() => (affordable ? setActive(p) : navigate("/dashboard/deposit"))}
                    className="btn-glass btn-glass-primary mt-auto flex h-12 items-center justify-center gap-2 text-sm font-bold"
                  >
                    {affordable ? "Activate plan" : "Deposit & activate"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  </div>
                </GlassCard>
              </div>
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
              <Row label="Deposit available" value={money(investable)} />
              <Row label="Price" value={money(price)} />
              <Row label="Daily income" value={money(daily)} />
              <Row label="First income" value={money(daily)} accent />
              <Row label="Days" value={String(active.durationDays)} />
              <Row label="Total return" value={money(total)} accentGold />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {money(price)} is funded from your deposit balance and your first income of{" "}
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className={`rounded-xl ${STAT_TONE[tone]} p-2.5 text-center`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-bold">{value}</p>
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
