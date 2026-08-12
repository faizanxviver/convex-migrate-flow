import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { hour12, isWithdrawWindowOpen, money, pakistanClock } from "@/lib/hopex";
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
  Timer,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { PayoutAccountCard } from "./Profile";

const REVIEW_MS = 5 * 60 * 1000;

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Animated circular countdown — WhatsApp-style "reviewing" timer. */
function ReviewRing({ left, total }: { left: number; total: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, left / total));
  return (
    <div className="relative mx-auto grid h-40 w-40 place-items-center">
      <svg viewBox="0 0 128 128" className="h-40 w-40 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-border/60" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="text-primary transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-4xl font-black tabular-nums">{clock(left)}</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Timer className="h-3 w-3" /> Reviewing
          </p>
        </div>
      </div>
    </div>
  );
}

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

  const open = settings?.withdrawOpenHour ?? 8;
  const close = settings?.withdrawCloseHour ?? 19;
  const minWithdraw = settings?.minWithdraw ?? 500;
  const planActive = investments.some((i) => i.userId === profile.userId);
  const bound = Boolean(profile.accountNumber && profile.accountName);
  const windowOpen = isWithdrawWindowOpen(open, close, new Date(tick));

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
    const left = REVIEW_MS - (tick - new Date(pending.createdAt).getTime());
    return (
      <div className="space-y-5 pb-24">
        <SectionTitle
          title="Withdrawal under review"
          subtitle="Our payouts team is verifying your request — usually under 5 minutes."
        />
        <GlassCard className="relative mx-auto max-w-lg overflow-hidden text-center" glow>
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Request received
            </span>

            <div className="mt-6">
              <ReviewRing left={left} total={REVIEW_MS} />
            </div>

            <p className="mt-4 text-sm font-semibold">
              {money(pending.amount)} <span className="text-muted-foreground">· {pending.method}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {left > 0
                ? "The countdown is running — you don't need to do anything."
                : "Still verifying — we'll credit your balance if anything goes wrong."}
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
    <div className="space-y-5 pb-24">
      <SectionTitle title="Withdraw funds" subtitle="Fast payouts to your bound account." />

      {/* Balance hero */}
      <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Withdrawable balance
          </p>
          <p className="mt-1 font-display text-4xl font-black tracking-tight">{money(profile.balance)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
                windowOpen ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              <Clock4 className="h-3 w-3" />
              {windowOpen ? "Payout window open" : "Payout window closed"} · {pakistanClock(new Date(tick))}
            </span>
            {!planActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 px-3 py-1 text-[11px] font-bold text-warning">
                <Lock className="h-3 w-3" /> Plan required
              </span>
            ) : null}
          </div>
        </div>
      </GlassCard>

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
                  onClick={() => setAmount(String(Math.floor(profile.balance)))}
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
              disabled={busy || !windowOpen || !planActive}
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
                Requests are accepted daily from {hour12(open)} to {hour12(close)} (PKT)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                No tax or fee — you receive the full amount.
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                At least one investment plan must be active.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Minimum withdrawal is {money(minWithdraw)}
              </li>
              <li className="flex items-start gap-2">
                <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Reviewed within about 5 minutes.
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
