import { Progress } from "@/components/ui/progress";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { fmtDate, investmentDaily, investmentProgress, money, round2 } from "@/lib/hopex";
import { CalendarClock, Coins, Gem, TrendingUp } from "lucide-react";
import { Link } from "react-router";

export default function InvestmentsPage() {
  const { investments, profile } = useHope();
  if (!profile) return null;

  const list = investments
    .filter((i) => i.userId === profile.userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const totalDaily = round2(list.reduce((a, i) => a + investmentDaily(i), 0));
  const totalEarned = list.reduce((a, i) => a + i.earned, 0);
  const totalCapital = list.reduce((a, i) => a + i.amount, 0);

  return (
    <div className="space-y-5">
      <SectionTitle title="My active plans" subtitle="Every plan you own and what it pays." />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Invested", value: money(totalCapital), icon: Gem, tone: "" },
          { label: "Daily income", value: money(totalDaily), icon: Coins, tone: "text-success" },
          { label: "Earned", value: money(totalEarned), icon: TrendingUp, tone: "text-gold" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </p>
            <p className={`mt-1 truncate font-display text-base font-extrabold sm:text-xl ${s.tone}`}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {list.length === 0 ? (
        <GlassCard className="text-center" glow>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Gem className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-lg font-extrabold">No active plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Activate a plan to start earning daily income.</p>
          <Link
            to="/dashboard/plans"
            className="btn-glass btn-glass-primary mx-auto mt-5 flex h-12 max-w-xs items-center justify-center text-sm font-bold"
          >
            Investment plans
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((inv) => {
            const { pct, daysLeft } = investmentProgress(inv);
            const daily = investmentDaily(inv);
            const done = daysLeft <= 0;
            return (
              <GlassCard key={inv._id} className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-extrabold">{inv.planName}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {fmtDate(inv.startedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        done ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
                      }`}
                    >
                      {done ? "Completed" : "Running"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Cell label="Price" value={money(inv.amount)} />
                    <Cell label="Daily" value={money(daily)} tone="text-success" />
                    <Cell label="Earned" value={money(inv.earned)} tone="text-gold" />
                  </div>

                  <Progress value={pct} className="mt-4 h-2" />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% complete</span>
                    <span>{daysLeft} days left</span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl glass-soft p-3">
      <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-bold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
