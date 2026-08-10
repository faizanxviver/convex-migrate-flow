import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useAuth } from "@/hooks/use-auth";
import { useChatUi } from "@/components/hopex/dashboard-layout";
import { useHope } from "@/hooks/use-hope";
import { useT } from "@/lib/i18n";
import { depositBalance, money } from "@/lib/hopex";
import {
  Banknote,
  ChevronRight,
  Copy,
  Crown,
  Gift,
  Headset,
  History,
  Layers,
  LifeBuoy,
  LogOut,
  ReceiptText,
  ShieldHalf,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  Trophy,
  Wallet,
  WalletMinimal,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function MorePage() {
  const { user, profile, transactions, investments } = useHope();
  const { signOut } = useAuth();
  const { setOpen } = useChatUi();
  const { t } = useT(profile?.language ?? "en");
  const navigate = useNavigate();

  if (!profile) return null;
  const hasPlan = investments.some((i) => i.userId === profile.userId);

  const quick = [
    { to: "/dashboard/deposit", label: "Deposit", icon: WalletMinimal, tone: "bg-primary/15 text-primary" },
    { to: "/dashboard/withdraw", label: "Withdraw", icon: Banknote, tone: "bg-gold/20 text-gold" },
    { to: "/dashboard/plans", label: "Invest", icon: TrendingUp, tone: "bg-success/15 text-success" },
    { to: "/dashboard/promo", label: "Promo", icon: Ticket, tone: "bg-destructive/10 text-destructive" },
  ] as const;

  const wallet = [
    { to: "/dashboard/withdraw", label: "Withdraw", desc: "Request a payout", icon: Banknote },
    { to: "/dashboard/transactions", label: "Transactions", desc: "Full account ledger", icon: ReceiptText },
    { to: "/dashboard/deposit-history", label: "Deposit history", desc: "Track every top-up", icon: History },
    { to: "/dashboard/withdraw-history", label: "Withdraw history", desc: "Payout status", icon: Wallet },
  ] as const;

  const account = [
    { to: "/dashboard/investments", label: "Active plans", desc: "Your running investments", icon: Layers },
    { to: "/dashboard/profile", label: "Profile & settings", desc: "Payout account, security, language", icon: SlidersHorizontal },
    { to: "/dashboard/plans", label: "Investment plans", desc: "Compare and invest", icon: TrendingUp },
    { to: "/dashboard/referrals", label: "Referral center", desc: "4-level commissions", icon: Gift },
  ] as const;

  const rewards = [
    { to: "/dashboard/salary", label: "Rank salary", desc: "Weekly income for your rank", icon: Crown },
    { to: "/dashboard/leaderboard", label: "Leaderboard", desc: "Top earners and referrers", icon: Trophy },
    { to: "/dashboard/rewards", label: "Free reward task", desc: "Earn a free bonus", icon: Gift },
    { to: "/dashboard/promo", label: "Promo codes", desc: "Redeem a bonus code", icon: Ticket },
  ] as const;

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="space-y-5">
      <SectionTitle title={t("More")} subtitle={t("Everything else in your HopeX account.")} />

      {/* Profile hero */}
      <GlassCard glow className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-brand font-display text-xl font-black text-primary-foreground">
            {profile.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-extrabold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email ?? "—"}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(profile.referralCode);
              toast.success("Referral code copied");
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            {profile.referralCode} <Copy className="h-3 w-3" />
          </button>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          <Mini label={t("Withdrawable balance")} value={money(profile.balance)} />
          <Mini label={t("Deposit balance")} value={money(depositBalance(transactions, profile.userId))} />
          <Mini label={t("Referral income")} value={money(profile.referralEarnings)} gold />
        </div>
      </GlassCard>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <Link
            key={q.label}
            to={q.to}
            className="btn-glass flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center"
          >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${q.tone}`}>
              <q.icon className="h-5 w-5" />
            </span>
            <span className="truncate text-[11px] font-semibold">{t(q.label)}</span>
          </Link>
        ))}
      </div>

      {/* Live support */}
      <button
        onClick={() => setOpen(true)}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Headset className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Live support chat")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            Average reply under 2 minutes
          </span>
        </span>
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success" />
      </button>

      {/* Wallet */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("Wallet")}</p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {wallet.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {t(l.label)}
                  {l.to === "/dashboard/withdraw" && !hasPlan ? (
                    <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                      locked
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </GlassCard>
      </section>

      {/* Account */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("Account")}</p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {account.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(l.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {user?.role === "admin" ? (
            <Link to="/dashboard/admin" className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                <ShieldHalf className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">Admin panel</span>
                <span className="block truncate text-xs text-muted-foreground">Platform administration</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
        </GlassCard>
      </section>

      {/* Rewards */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("Rewards")}</p>
        <GlassCard className="divide-y divide-border/40 p-2">
          {rewards.map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(l.label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(l.desc)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </GlassCard>
      </section>

      <a
        href="mailto:support@hopex.io"
        className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{t("Help centre")}</span>
          <span className="block truncate text-xs text-muted-foreground">support@hopex.io</span>
        </span>
      </a>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
      >
        <LogOut className="h-4 w-4" /> {t("Sign out")}
      </button>
    </div>
  );
}

function Mini({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-2xl glass-soft px-3 py-2.5">
      <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate font-display text-lg font-extrabold ${gold ? "text-gold" : ""}`}>{value}</p>
    </div>
  );
}


