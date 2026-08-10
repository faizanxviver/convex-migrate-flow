import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { money, salaryStatus } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Crown, Loader2, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SalaryPage() {
  const { profile, transactions, network, settings } = useHope();
  const claimSalary = useMutation(api.rewards.claimSalary);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const directTeam = network?.levels[0] ?? [];
  const status = salaryStatus(
    profile,
    transactions,
    directTeam,
    settings?.salaryTiers ?? [],
    Date.now(),
  );

  const handleClaim = async () => {
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
    <div className="space-y-5">
      <SectionTitle title="Rank salary" subtitle="Weekly income based on your rank and team investment." />

      <GlassCard className="relative overflow-hidden" glow>
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
            <Crown className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Current rank</p>
            <p className="truncate font-display text-2xl font-black">
              {status.current ? (
                <>
                  {status.current.rank} <span className="text-gold">· {money(status.current.salary)}</span>
                </>
              ) : (
                "Unranked"
              )}
            </p>
          </div>
          {status.claimable ? (
            <button
              onClick={handleClaim}
              disabled={busy}
              className="btn-glass btn-glass-gold h-12 shrink-0 px-6 text-sm font-bold disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim salary"}
            </button>
          ) : (
            <span className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
              {status.lastClaimAt ? "Claimed this week" : "Not eligible yet"}
            </span>
          )}
        </div>
        <p className="relative mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersRound className="h-3.5 w-3.5" /> {status.team} direct members ·{" "}
          {money(status.invested)} level-1 team investment
        </p>
      </GlassCard>

      <GlassCard className="p-2">
        <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Rank tiers
        </p>
        {status.tiers.map((tier) => {
          const reached = (status.invested ?? 0) >= tier.invested;
          const isCurrent = status.current?.rank === tier.rank;
          return (
            <div
              key={tier.rank}
              className={cn(
                "border-t border-border/40 p-4",
                isCurrent && "bg-gold/5",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-display text-sm font-black",
                      reached ? "bg-gold/20 text-gold" : "glass-soft text-muted-foreground",
                    )}
                  >
                    {reached ? "✓" : tier.rank[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {tier.rank}
                      {isCurrent ? <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">current</span> : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {money(tier.invested)} level-1 team investment
                    </p>
                  </div>
                </div>
                <p className="shrink-0 font-display text-lg font-extrabold text-gold">{money(tier.salary)}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", reached ? "gradient-brand" : "bg-gold/30")}
                  style={{ width: `${Math.min(100, ((status.invested ?? 0) / tier.invested) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
}
