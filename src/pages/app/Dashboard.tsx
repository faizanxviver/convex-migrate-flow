import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Crown,
  Gem,
  HandCoins,
  PiggyBank,
  Rocket,
  Share2,
  TicketPercent,
  Timer,
  TrendingUp,
  UsersRound,
  Wallet2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useHope } from "@/hooks/use-hope";
import { useT } from "@/lib/i18n";
import {
  activeInvestments,
  countdown,
  dailyIncome,
  depositBalance,
  liveEarnings,
  money,
  nextPayoutIn,
  salaryStatus,
} from "@/lib/hopex";
import { GlassCard } from "@/components/hopex/glass";
import { DashboardPopup } from "@/components/hopex/community";

export default function DashboardPage() {
  const {
    user,
    profile,
    settings,
    investments,
    transactions,
    network,
    loading,
  } = useHope();
  const claimEarnings = useMutation(api.investments.claimEarnings);
  const claimSalary = useMutation(api.rewards.claimSalary);
  const { t } = useT(profile?.language ?? "en");
  const [tick, setTick] = useState(() => Date.now());
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const running = useMemo(
    () => (profile ? activeInvestments(investments, profile.userId) : []),
    [investments, profile],
  );
  const live = profile ? liveEarnings(investments, profile.userId, tick) : 0;
  const nextIn = profile ? nextPayoutIn(investments, profile.userId, tick) : null;

  // Auto-claim whenever a 24-hour cycle completes while the dashboard is open.
  useEffect(() => {
    if (nextIn !== 0) return;
    void claimEarnings();
  }, [nextIn, claimEarnings]);

  if (loading || !profile || !user) return null;

  const directTeam = network?.levels[0] ?? [];
  const salary = salaryStatus(
    profile,
    transactions,
    directTeam,
    settings?.salaryTiers ?? [],
    tick,
  );

  const teamInvested = salary.invested;

  const handleClaimSalary = async () => {
    setClaiming(true);
    try {
      const amount = await claimSalary();
      toast.success(`${t("Salary credited")} — ${money(amount)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message.replace(/^.*?:\s*/, "") : "Could not claim salary");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-5">
      <DashboardPopup />

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-base font-black text-primary-foreground">
          {profile.name[0]}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("Good to see you")}</p>
          <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{profile.name}</h1>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: "/dashboard/deposit", label: "Deposit", icon: ArrowDownToLine },
          { to: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
          { to: "/dashboard/plans", label: "Plans", icon: Gem },
          { to: "/dashboard/referrals", label: "Refer", icon: UsersRound },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="glass flex flex-col items-center gap-1.5 rounded-2xl p-3.5 transition-all hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Balance hero */}
      <GlassCard className="relative overflow-hidden p-6 sm:p-8" glow>
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("Withdrawable balance")}
          </p>
          <p className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">
            {money(profile.balance)}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl glass-soft px-3 py-2">
            <PiggyBank className="h-4 w-4 shrink-0 text-gold" />
            <span className="text-xs text-muted-foreground">{t("Deposit balance")}</span>
            <span className="text-sm font-bold">{money(depositBalance(transactions, profile.userId))}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link to="/dashboard/deposit" className="btn-glass btn-glass-primary grid h-14 place-items-center text-base font-bold">
              {t("Deposit")}
            </Link>
            <Link to="/dashboard/withdraw" className="btn-glass grid h-14 place-items-center text-base font-bold text-foreground">
              {t("Withdraw")}
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { to: "/dashboard/plans", icon: Gem, label: "Invest" },
              { to: "/dashboard/referrals", icon: Share2, label: "Refer" },
              { to: "/dashboard/promo", icon: TicketPercent, label: "Promo code" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="btn-glass flex h-[4.5rem] flex-col items-center justify-center gap-1.5 text-[11px] font-bold text-foreground"
              >
                <a.icon className="h-5 w-5 text-primary" />
                {t(a.label)}
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Live earnings */}
      {running.length > 0 ? (
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-14 -bottom-10 h-40 w-40 rounded-full bg-success/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Coins className="h-4 w-4 text-success" /> {t("Live earnings")}
              </p>
              <span className="animate-tick inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> live
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-black tabular-nums text-success transition-none sm:text-4xl">
              {live.toFixed(8)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl glass-soft px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> {t("Next payout in")}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">
                  {nextIn === null ? "—" : countdown(nextIn)}
                </p>
              </div>
              <div className="rounded-2xl glass-soft px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <HandCoins className="h-3.5 w-3.5" /> {t("Daily income")}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold">
                  {money(dailyIncome(investments, profile.userId))}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("Auto-credited to your withdrawable balance every 24 hours.")}
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold">{t("Activate a plan to start earning")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Your income ticker starts the moment your first plan goes live.")}
            </p>
          </div>
          <Link to="/dashboard/plans" className="btn-glass btn-glass-gold grid h-12 shrink-0 place-items-center px-6 text-sm font-bold">
            {t("Invest")}
          </Link>
        </GlassCard>
      )}

      {/* Rank salary */}
      <GlassCard className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
                <Crown className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("Rank salary")}</p>
                <p className="truncate font-display text-lg font-extrabold">
                  {salary.current ? salary.current.rank : t("Unranked")} ·{" "}
                  <span className="text-gold">{money(salary.current?.salary ?? 0)}</span>
                </p>
              </div>
            </div>
            {salary.claimable ? (
              <button
                onClick={handleClaimSalary}
                disabled={claiming}
                className="btn-glass btn-glass-gold h-10 shrink-0 px-4 text-xs font-bold disabled:opacity-60"
              >
                {claiming ? "…" : t("Claim")}
              </button>
            ) : (
              <Link to="/dashboard/salary" className="btn-glass grid h-10 shrink-0 place-items-center px-4 text-xs font-bold text-foreground">
                {t("Details")}
              </Link>
            )}
          </div>
          {salary.next ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full gradient-brand"
                  style={{ width: `${Math.min(100, (teamInvested / salary.next.invested) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {money(teamInvested)}/{money(salary.next.invested)} invested → {salary.next.rank} ·{" "}
                {money(salary.next.salary)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{t("Highest rank reached")}</p>
          )}
        </div>
      </GlassCard>

      {/* Compact wallet strip */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" /> {t("Referral income")}
          </p>
          <p className="mt-1 truncate font-display text-xl font-extrabold text-gold">
            {money(profile.referralEarnings)}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Wallet2 className="h-3.5 w-3.5" /> {t("Active plans")}
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">
            {running.length}
            <span className="ml-2 text-xs font-semibold text-muted-foreground">
              <TrendingUp className="mr-0.5 inline h-3 w-3" />
              {money(profile.invested)} invested
            </span>
          </p>
        </GlassCard>
      </div>

      <Link
        to="/dashboard/transactions"
        className="btn-glass flex h-12 items-center justify-center gap-2 text-sm font-semibold text-foreground"
      >
        <TicketPercent className="h-4 w-4" /> {t("All transactions")}
      </Link>
    </div>
  );
}
