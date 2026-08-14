import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { CommunityLinks } from "@/components/hopex/community";
import { useHope } from "@/hooks/use-hope";
import {
  depositBalance,
  investableBalance,
  money,
  planDaily,
  round2,
  type Plan,
} from "@/lib/hopex";
import { useMutation } from "convex/react";
import { Wallet2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLAN_GRADIENTS: Record<string, string> = {
  starter: "linear-gradient(135deg, #2dd4bf22, #0ea5e922)",
  growth: "linear-gradient(135deg, #6366f122, #8b5cf622)",
  premium: "linear-gradient(135deg, #f59e0b26, #ef444426)",
  vip: "linear-gradient(135deg, #a855f726, #d946ef26)",
};

const PLAN_ICONS: Record<string, string> = { starter: "🌱", growth: "📈", premium: "💎", vip: "👑" };

export default function PlansPage() {
  const { profile, plans, transactions } = useHope();
  const buyPlan = useMutation(api.investments.buyPlan);
  const [active, setActive] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const deposited = depositBalance(transactions, profile.userId);
  const investable = investableBalance(profile.balance, transactions, profile.invested, profile.userId);

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
      toast.success(`${active.name} plan is now live — first income credited.`);
      setActive(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not activate plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionTitle title="Investment plans" subtitle="Pick a plan and start earning daily income." />

      <div className="mb-5">
        <GlassCard className="flex items-center justify-between gap-3 p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Wallet2 className="h-3.5 w-3.5" /> Deposit balance
          </p>
          <p className="truncate font-display text-xl font-extrabold">{money(deposited)}</p>
        </GlassCard>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Plans are funded from your deposit balance — {money(investable)} is available for a new plan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans
          .filter((p) => p.active)
          .map((p) => {
            const d = planDaily(p);
            const affordable = investable >= p.minAmount;
            const gradient = PLAN_GRADIENTS[p.slug] ?? PLAN_GRADIENTS.starter;
            return (
              <GlassCard key={p.slug} className="group flex flex-col overflow-hidden p-0">
                <div className="relative h-36 overflow-hidden" style={{ background: gradient }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl drop-shadow-lg transition-transform duration-700 group-hover:scale-110">
                      {PLAN_ICONS[p.slug] ?? "📊"}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h2 className="font-display text-xl font-extrabold drop-shadow">{p.name}</h2>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="rounded-2xl glass-soft p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</span>
                      <span className="font-display text-2xl font-extrabold">{money(p.minAmount)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-success/10 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Daily income</p>
                        <p className="mt-0.5 font-bold text-success">{money(d)}</p>
                      </div>
                      <div className="rounded-xl bg-primary/10 p-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Days</p>
                        <p className="mt-0.5 font-bold">{p.durationDays}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-sm">
                      <span className="text-muted-foreground">Total return</span>
                      <span className="font-bold text-gold">{money(round2(d * p.durationDays))}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {p.features.map((f) => (
                        <span key={f} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActive(p)}
                    className="btn-glass btn-glass-primary mt-auto flex h-12 items-center justify-center text-sm font-bold"
                  >
                    {affordable ? "Activate plan" : "Deposit & activate"}
                  </button>
                </div>
              </GlassCard>
            );
          })}
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <GlassCard className="animate-rise w-full max-w-sm">
            <h3 className="font-display text-xl font-extrabold">Confirm activation</h3>
            <p className="mt-1 text-sm text-muted-foreground">{active.name}</p>
            <div className="mt-4 space-y-2 rounded-2xl glass-soft p-4 text-sm">
              <Row label="Your deposit balance" value={money(deposited)} />
              <Row label="Price" value={money(price)} />
              <Row label="Daily income" value={money(daily)} />
              <Row label="Days" value={String(active.durationDays)} />
              <Row label="Total return" value={money(total)} accent />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {money(price)} is funded from your deposit balance and your first daily income is
              credited instantly. Active plans cannot be cancelled.
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

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-bold text-success" : "font-semibold"}>{value}</span>
    </div>
  );
}
