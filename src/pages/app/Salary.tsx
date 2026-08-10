import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { money, salaryStatus } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  BadgeCheck,
  CalendarClock,
  Crown,
  HandCoins,
  Lock,
  Target,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SalaryPage() {
  const { profile, transactions, network, settings } = useHope();
  const claimSalary = useMutation(api.rewards.claimSalary);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(i);
  }, []);

  if (!profile) return null;

  const directTeam = network?.levels[0] ?? [];
  const s = salaryStatus(profile, transactions, directTeam, settings?.salaryTiers ?? [], tick);

  const claim = async () => {
    setBusy(true);
    try {
      const amount = await claimSalary();
      toast.success(`Salary credited — ${money(amount)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not claim salary");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      <SectionTitle
        title="Weekly rank salary"
        subtitle="Your rank depends only on the total investment of your level 1 team. Claim every 7 days."
      />

      {/* Hero */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold text-gold">
            <Crown className="h-3 w-3" /> {s.current ? s.current.rank : "Unranked"}
          </span>
          <p className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
            {money(s.current?.salary ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Your weekly salary</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl glass-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Target className="h-3 w-3" /> Level 1 investment
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-extrabold">{money(s.invested)}</p>
            </div>
            <div className="rounded-2xl glass-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <UsersRound className="h-3 w-3" /> Direct team
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold">{s.team}</p>
            </div>
          </div>

          <button
            onClick={() => void claim()}
            disabled={!s.claimable || busy}
            className="btn-glass btn-glass-primary mt-4 flex h-14 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-50"
          >
            <HandCoins className="h-5 w-5" />
            {s.claimable
              ? "Claim salary"
              : s.current
                ? `Next claim in ${countdown(s.nextClaimIn)}`
                : "Reach a rank to claim"}
          </button>

          {s.lastClaimAt ? (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Last claim {new Date(s.lastClaimAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </GlassCard>

      {s.next ? (
        <GlassCard>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Next rank · {s.next.rank}
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span>Level 1 investment</span>
              <span className="font-bold">
                {money(s.invested)} / {money(s.next.invested)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-brand"
                style={{ width: `${Math.min(100, (s.invested / Math.max(1, s.next.invested)) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Still needed: {money(Math.max(0, s.next.invested - s.invested))}
            </p>
          </div>
        </GlassCard>
      ) : null}

      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">All ranks</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.tiers.map((tier) => {
            const reached = s.invested >= tier.invested;
            const canClaim = reached && s.claimable && s.current?.rank === tier.rank;
            return (
              <GlassCard key={tier.rank} className={cn("relative overflow-hidden p-4", reached && "ring-1 ring-success/40")}>
                {reached ? (
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-success/15 blur-2xl" />
                ) : null}
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-display text-base font-extrabold">
                      {reached ? <BadgeCheck className="h-4 w-4 text-success" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      {tier.rank}
                    </p>
                    <p className="font-display text-base font-extrabold text-gold">
                      {money(tier.salary)}
                      <span className="ml-1 text-[10px] font-bold text-muted-foreground">/week</span>
                    </p>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Level 1 investment</span>
                      <span className="font-bold">
                        {money(Math.min(s.invested, tier.invested))} / {money(tier.invested)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", reached ? "gradient-brand" : "bg-gold/30")}
                        style={{ width: `${Math.min(100, (s.invested / Math.max(1, tier.invested)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => void claim()}
                    disabled={!canClaim || busy}
                    className={cn(
                      "btn-glass mt-3 flex h-11 w-full items-center justify-center gap-2 text-xs font-bold",
                      canClaim ? "btn-glass-primary" : "text-muted-foreground disabled:opacity-60",
                    )}
                  >
                    <HandCoins className="h-4 w-4" />
                    {canClaim
                      ? "Claim salary"
                      : !reached
                        ? "Locked"
                        : s.current?.rank === tier.rank
                          ? `Next claim in ${countdown(s.nextClaimIn)}`
                          : "Higher rank active"}
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <Link
        to="/dashboard/referrals"
        className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
      >
        Invite your team
      </Link>
    </div>
  );
}
