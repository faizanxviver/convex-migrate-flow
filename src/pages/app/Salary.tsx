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
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useState, Fragment } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/** Full weekly countdown: 6d 04h 12m 05s */
function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export default function SalaryPage() {
  const { profile, transactions, network, settings } = useHope();
  const claimSalary = useMutation(api.rewards.claimSalary);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!profile) return null;

  const directTeam = network?.levels[0] ?? [];
  const s = salaryStatus(profile, transactions, directTeam, settings?.salaryTiers ?? [], tick);
  const WEEK = 7 * 86400000;
  const elapsed = s.lastClaimAt ? Math.min(WEEK, Math.max(0, tick - s.lastClaimAt)) : WEEK;
  const cyclePct = s.claimable ? 100 : Math.round((elapsed / WEEK) * 100);

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

  const rankIndex = s.current ? s.tiers.findIndex((t) => t.rank === s.current?.rank) : -1;

  return (
    <div className="space-y-5 pb-20">
      <SectionTitle
        title="Weekly rank salary"
        subtitle="Your rank depends only on your level 1 team's total investment — the more your direct team invests, the bigger your weekly salary."
      />

      {/* ---------- Hero ---------- */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gold">
              <Crown className="h-3.5 w-3.5" /> {s.current ? s.current.rank : "Unranked"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
              <CalendarClock className="h-3.5 w-3.5" />
              {s.claimable ? "Ready to claim" : `Next claim in ${countdown(s.nextClaimIn)}`}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-display text-5xl font-black tracking-tight sm:text-6xl">
              {money(s.current?.salary ?? 0)}
            </p>
            <p className="pb-1.5 text-sm font-semibold text-muted-foreground">your weekly salary</p>
          </div>

          {/* L1 investment → salary mapping */}
          <div className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl glass-soft px-4 py-2.5 text-sm">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">L1 team invested</span>
            <span className="font-black tabular-nums">{money(s.invested)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-black text-gold">{money(s.current?.salary ?? 0)}/week</span>
          </div>

          {/* Cycle progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Salary cycle</span>
              <span className="font-black tabular-nums">{cyclePct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  s.claimable ? "gradient-brand" : "bg-gold/60",
                )}
                style={{ width: `${cyclePct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => void claim()}
            disabled={!s.claimable || busy}
            className="btn-glass btn-glass-primary mt-5 flex h-14 w-full items-center justify-center gap-2 text-base font-black disabled:opacity-50"
          >
            <HandCoins className="h-5 w-5" />
            {s.claimable
              ? busy
                ? "Claiming…"
                : "Claim salary"
              : s.current
                ? `Next claim in ${countdown(s.nextClaimIn)}`
                : "Reach a rank to claim"}
          </button>

          {s.lastClaimAt ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Last claimed {new Date(s.lastClaimAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </GlassCard>

      {/* ---------- Rank ladder ---------- */}
      {s.tiers.length > 1 ? (
        <GlassCard className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Your rank path
          </p>
          <div className="mt-5 flex items-start">
            {s.tiers.map((tier, i) => {
              const reached = s.invested >= tier.invested;
              const isCurrent = s.current?.rank === tier.rank;
              const isNext = s.next?.rank === tier.rank;
              return (
                <Fragment key={tier.rank}>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-sm font-black transition",
                        isCurrent
                          ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15"
                          : reached
                            ? "bg-success/15 text-success"
                            : isNext
                              ? "glass-soft text-gold ring-1 ring-gold/40"
                              : "glass-soft text-muted-foreground",
                      )}
                    >
                      {isCurrent ? <Crown className="h-5 w-5" /> : reached ? <BadgeCheck className="h-5 w-5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate text-[11px] font-black",
                        isCurrent ? "text-foreground" : reached ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {tier.rank}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{money(tier.salary)}</span>
                  </div>
                  {i < s.tiers.length - 1 ? (
                    <div className="relative top-5 h-0.5 min-w-4 flex-1 rounded-full bg-border/60">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          s.invested >= s.tiers[i + 1].invested ? "gradient-brand" : "bg-border/60",
                        )}
                        style={{ width: "100%" }}
                      />
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Target className="h-3 w-3" /> L1 investment
          </p>
          <p className="mt-1 truncate font-display text-lg font-black">{money(s.invested)}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <UsersRound className="h-3 w-3" /> Direct team
          </p>
          <p className="mt-1 font-display text-lg font-black">{s.team}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Next rank
          </p>
          <p className="mt-1 truncate font-display text-lg font-black">{s.next ? s.next.rank : "Max"}</p>
        </GlassCard>
      </div>

      {s.next ? (
        <GlassCard>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-widest text-muted-foreground">
              Progress to {s.next.rank}
            </span>
            <span className="font-black">
              {money(s.invested)} / {money(s.next.invested)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-brand transition-all duration-700"
              style={{ width: `${Math.min(100, (s.invested / Math.max(1, s.next.invested)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Still needed: <span className="font-bold text-foreground">{money(Math.max(0, s.next.invested - s.invested))}</span>{" "}
            of L1 investment to unlock {money(s.next.salary)}/week
          </p>
        </GlassCard>
      ) : null}

      {/* ---------- All ranks ---------- */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">All ranks</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.tiers.map((tier) => {
            const reached = s.invested >= tier.invested;
            const isCurrent = s.current?.rank === tier.rank;
            const canClaim = reached && isCurrent && s.claimable;
            const pct = Math.min(100, (s.invested / Math.max(1, tier.invested)) * 100);
            return (
              <GlassCard
                key={tier.rank}
                className={cn(
                  "relative overflow-hidden p-4 transition",
                  isCurrent && "ring-1 ring-gold/50",
                  reached && !isCurrent && "ring-1 ring-success/40",
                )}
              >
                {reached ? (
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-success/15 blur-2xl" />
                ) : null}
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-display text-base font-extrabold">
                      {isCurrent ? (
                        <Crown className="h-4 w-4 text-gold" />
                      ) : reached ? (
                        <BadgeCheck className="h-4 w-4 text-success" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      {tier.rank}
                      {isCurrent ? (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gold">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="font-display text-base font-extrabold text-gold">
                      {money(tier.salary)}
                      <span className="ml-1 text-[10px] font-bold text-muted-foreground">/week</span>
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>L1 investment needed</span>
                      <span className="font-bold">
                        {money(Math.min(s.invested, tier.invested))} / {money(tier.invested)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", reached ? "gradient-brand" : "bg-gold/30")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => void claim()}
                    disabled={(!canClaim && (!reached || !isCurrent)) || busy}
                    className={cn(
                      "btn-glass mt-3 flex h-11 w-full items-center justify-center gap-2 text-xs font-black",
                      canClaim ? "btn-glass-primary" : "text-muted-foreground disabled:opacity-60",
                    )}
                  >
                    <HandCoins className="h-4 w-4" />
                    {canClaim
                      ? "Claim salary"
                      : !reached
                        ? `Locked · need ${money(tier.invested)}`
                        : isCurrent
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
        className="btn-glass flex h-12 items-center justify-center gap-2 text-sm font-semibold text-foreground"
      >
        <UsersRound className="h-4 w-4" /> Invite your team to grow your rank
      </Link>
    </div>
  );
}
