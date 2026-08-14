import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { hour12, isWithdrawWindowOpen, money, withdrawableBalance } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowUpFromLine,
  BadgeCheck,
  CheckCircle2,
  Clock4,
  Info,
  Lock,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { PayoutAccountCard } from "./Profile";


export default function WithdrawPage() {
  const { profile, settings, investments, transactions } = useHope();
  const requestWithdraw = useMutation(api.transactions.requestWithdraw);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const myWithdrawals = useMemo(
    () => (profile ? transactions.filter((t) => t.userId === profile.userId && t.type === "withdraw") : []),
    [transactions, profile],
  );
  const latest = myWithdrawals[0];
  const pending =
    latest && (latest.status === "processing" || latest.status === "pending") ? latest : null;

  if (!profile) return null;

  const open = settings?.withdrawOpenHour ?? 9;
  const close = settings?.withdrawCloseHour ?? 19;
  const minWithdraw = settings?.minWithdraw ?? 500;
  const planActive = investments.some((i) => i.userId === profile.userId);
  const bound = Boolean(profile.accountNumber && profile.accountName);
  const windowOpen = isWithdrawWindowOpen(open, close, new Date(tick));
  const withdrawable = withdrawableBalance(profile.balance, transactions, profile.invested, profile.userId);

  /* ---------- account binding first ---------- */
  if (!bound) {
    return (
      <div className="space-y-5 pb-24">
        <SectionTitle
          title="Bind your payout account"
          subtitle="Add the JazzCash or Easypaisa account that will receive every payout."
        />
        <GlassCard className="mx-auto flex max-w-lg items-center gap-3" glow>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Once bound, withdrawals always go to this account. You can change it later in More →
            Profile &amp; settings.
          </p>
        </GlassCard>
        <div className="mx-auto max-w-lg">
          <PayoutAccountCard />
        </div>
      </div>
    );
  }

  /* ---------- pending review ---------- */
  if (pending) {
    return (
      <div className="space-y-5 pb-24">
        <SectionTitle
          title="Withdrawal in progress"
          subtitle="You already have a pending withdrawal — it will be completed first. You can place another one once it is completed."
        />
        <GlassCard className="relative mx-auto max-w-lg overflow-hidden text-center" glow>
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Request received
            </span>

            <div className="mt-6">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold/15 text-gold">
                <Clock4 className="h-9 w-9" />
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold">
              {money(pending.amount)} <span className="text-muted-foreground">· {pending.method}</span>
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Payouts are processed within{" "}
              <span className="font-semibold text-foreground">1–24 hours</span>, daily from {hour12(open)} to{" "}
              {hour12(close)} Pakistan time. Your next withdrawal can be placed after this one is completed.
            </p>

            <div className="mt-6 rounded-2xl glass-soft p-4 text-left text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Payout account</p>
              <p className="mt-1 font-semibold">{profile.bankName} · {profile.accountName}</p>
              <p className="font-mono text-xs text-muted-foreground">{profile.accountNumber}</p>
            </div>

            <Link
              to="/dashboard/withdraw-history"
              className="btn-glass mt-6 flex h-12 items-center justify-center text-sm font-semibold text-foreground"
            >
              Withdraw history
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minWithdraw) {
      return toast.error(`Minimum withdrawal is ${money(minWithdraw)}.`);
    }
    if (value > withdrawable) {
      return toast.error(`You can only withdraw your earnings (${money(withdrawable)}).`);
    }
    if (!planActive) {
      return toast.error(
        "Please activate an investment plan first to withdraw. You can bind your payout account here and invest from the Plans page.",
      );
    }
    if (!windowOpen) {
      return toast.error(
        `Withdrawals are open daily from ${hour12(open)} to ${hour12(close)} Pakistan time. Please try again then.`,
      );
    }
    setBusy(true);
    try {
      await requestWithdraw({ amount: value });
      toast.success("Withdrawal submitted — review starts now.");
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not submit withdrawal");
    } finally {
      setBusy(false);
    }
  };

  const quick = (settings?.quickAmounts.length ? settings.quickAmounts : [1000, 3000, 5000, 10000, 25000, 50000]).slice(0, 6);

  return (
    <div className="space-y-4 pb-24">
      {/* Balance hero — clean, balance only */}
      <div className="relative overflow-hidden rounded-[2rem] gradient-brand p-6 text-primary-foreground shadow-[0_24px_60px_-24px_rgba(139,92,246,0.55)] sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-gold/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">
            <ArrowUpFromLine className="h-3 w-3" /> Fast payouts
          </span>
          <h1 className="mt-3 font-display text-2xl font-black leading-tight sm:text-3xl">Withdraw funds</h1>
          <p className="mt-1 max-w-sm text-xs text-primary-foreground/75 sm:text-sm">
            Your earnings, paid to your bound {profile.bankName} account.
          </p>
          <div className="mt-5 rounded-2xl border border-white/20 bg-white/15 px-4 py-4 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
              Withdraw balance
            </p>
            <p className="mt-1 font-display text-3xl font-black tabular-nums sm:text-4xl">
              {money(withdrawable)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <GlassCard>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">Amount (PKR)</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="h-14 w-full rounded-2xl border border-input bg-background/40 px-4 font-display text-xl font-extrabold outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {quick.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      "btn-glass h-11 text-xs font-bold text-foreground",
                      Number(amount) === q && "btn-glass-primary",
                    )}
                  >
                    Rs {q.toLocaleString("en-PK")}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.max(minWithdraw, Math.floor(withdrawable))))}
                  className="btn-glass h-11 text-xs font-bold text-foreground"
                >
                  Max
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                No tax or fee — you receive the full amount.
              </p>
            </div>

            <div className="rounded-2xl glass-soft p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Payout account</p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{profile.accountName}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {profile.bankName} · {profile.accountNumber}
                  </span>
                </span>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                To change this account go to More → Profile &amp; settings.
              </p>
            </div>

            <button
              disabled={busy}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-50"
            >
              <ArrowUpFromLine className="h-5 w-5" />
              {busy ? "Submitting…" : "Request withdrawal"}
            </button>
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="font-display text-base font-extrabold">Withdraw rules</p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Requests are accepted daily from {hour12(open)} to {hour12(close)} (Pakistan time)
              </li>
              <li className="flex items-start gap-2">
                <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Payouts are processed within 1–24 hours.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                No tax or fee — you receive the full amount.
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                At least one investment plan must be active to withdraw.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Minimum withdrawal is {money(minWithdraw)}
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                Only your earnings (plan income, commissions, bonuses, rewards) are withdrawable.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Only one withdrawal can be pending at a time — the next one starts after it is completed.
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                Declined requests are refunded instantly.
              </li>
            </ul>
          </GlassCard>

          <Link
            to="/dashboard/withdraw-history"
            className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
          >
            Withdraw history
          </Link>
        </div>
      </div>
    </div>
  );
}
