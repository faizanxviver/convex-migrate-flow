import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { initials, money } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { Crown, Medal, TrendingUp, Trophy, Users } from "lucide-react";
import { useState } from "react";

type Metric = "referralEarnings" | "earnings" | "invested";

const METRICS: { key: Metric; label: string; icon: typeof Trophy }[] = [
  { key: "referralEarnings", label: "Top referrers", icon: Users },
  { key: "earnings", label: "Top earners", icon: Trophy },
  { key: "invested", label: "Top investors", icon: TrendingUp },
];

const PODIUM = [
  {
    height: "h-32",
    face: "linear-gradient(160deg, oklch(0.88 0.16 92), oklch(0.72 0.16 72))",
    ring: "ring-gold/60",
    icon: Crown,
    label: "1",
  },
  {
    height: "h-24",
    face: "linear-gradient(160deg, oklch(0.92 0.02 275), oklch(0.74 0.03 275))",
    ring: "ring-foreground/25",
    icon: Medal,
    label: "2",
  },
  {
    height: "h-20",
    face: "linear-gradient(160deg, oklch(0.82 0.11 60), oklch(0.62 0.12 45))",
    ring: "ring-warning/50",
    icon: Medal,
    label: "3",
  },
];

type Row = { name: string; earnings: number; invested: number; referralEarnings: number };

function Podium({ row, place, metric }: { row?: Row; place: 0 | 1 | 2; metric: Metric }) {
  const p = PODIUM[place];
  if (!row) return <div />;
  const Icon = p.icon;
  return (
    <div className="flex flex-col items-center justify-end">
      <div className="relative mb-2 flex flex-col items-center">
        <span
          className={cn(
            "grid place-items-center rounded-full font-display font-black text-background ring-4 shadow-[0_18px_35px_-14px_rgba(0,0,0,.6)]",
            p.ring,
          )}
          style={{
            background: p.face,
            height: place === 0 ? "4rem" : "3.25rem",
            width: place === 0 ? "4rem" : "3.25rem",
            fontSize: place === 0 ? "1.125rem" : "1rem",
          }}
        >
          {initials(row.name)}
        </span>
        <span
          className="absolute -top-3 grid h-7 w-7 place-items-center rounded-full text-background shadow-lg"
          style={{ background: p.face }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="max-w-full px-1 text-center text-[13px] font-extrabold leading-tight break-words">
        {row.name}
      </p>
      <p className="mb-2 text-center font-display text-[13px] font-black text-success">{money(row[metric])}</p>
      <div className="w-full">
        <div
          className={cn("relative w-full rounded-t-xl border border-white/25", p.height)}
          style={{
            background: p.face,
            boxShadow:
              "inset 0 2px 0 rgba(255,255,255,.55), inset -12px 0 24px rgba(0,0,0,.22), 0 26px 40px -22px rgba(0,0,0,.65)",
          }}
        >
          <span className="absolute inset-x-0 top-3 text-center font-display text-3xl font-black text-background/70 drop-shadow">
            {p.label}
          </span>
          <span className="pointer-events-none absolute inset-0 rounded-t-xl bg-gradient-to-b from-white/45 via-transparent to-black/20" />
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { leaderboard } = useHope();
  const [metric, setMetric] = useState<Metric>("referralEarnings");

  const sorted = [...leaderboard].sort((a, b) => b[metric] - a[metric]).slice(0, 20);

  return (
    <div className="space-y-5">
      <SectionTitle title="Leaderboard" subtitle="The highest performing HopeX members this season." />

      <div className="grid grid-cols-3 gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "btn-glass flex h-[4.25rem] flex-col items-center justify-center gap-1.5 text-[11px] font-bold",
              metric === m.key ? "btn-glass-primary" : "text-foreground",
            )}
          >
            <m.icon className="h-4 w-4" />
            {m.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
          No rankings yet — be the first to make the board.
        </GlassCard>
      ) : (
        <>
          <GlassCard className="relative overflow-hidden p-4 pt-6">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gold/25 blur-3xl" />
            <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-4">
              <Podium row={sorted[1]} place={1} metric={metric} />
              <Podium row={sorted[0]} place={0} metric={metric} />
              <Podium row={sorted[2]} place={2} metric={metric} />
            </div>
            <div className="mt-1 h-3 rounded-b-2xl bg-gradient-to-b from-black/20 to-transparent" />
          </GlassCard>

          <GlassCard className="divide-y divide-border/40 p-2">
            {sorted.map((row, i) => (
              <div key={`${row.name}-${i}`} className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black shadow-[0_10px_18px_-12px_rgba(0,0,0,.8)]",
                    i < 3 ? "gradient-brand text-primary-foreground" : "glass-soft",
                  )}
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{row.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    Invested {money(row.invested)}
                  </span>
                </span>
                <span className="shrink-0 font-display text-sm font-extrabold text-success">
                  {money(row[metric])}
                </span>
              </div>
            ))}
          </GlassCard>
        </>
      )}
    </div>
  );
}
