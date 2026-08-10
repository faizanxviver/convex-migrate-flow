import { api } from "@/convex/_generated/api";
import { GlassCard, LedgerHeader } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { isWithdrawWindowOpen, money, pakistanClock } from "@/lib/hopex";
import { useMutation } from "convex/react";
import { ArrowUpRight, Banknote, Clock, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function WithdrawPage() {
  const { profile, settings, investments, transactions } = useHope();
  const requestWithdraw = useMutation(api.transactions.requestWithdraw);
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const now = useMemo(() => new Date(), []);
  const open = settings?.withdrawOpenHour ?? 8;
  const close = settings?.withdrawCloseHour ?? 19;
  const windowOpen = isWithdrawWindowOpen(open, close, now);
  const minWithdraw = settings?.minWithdraw ?? 500;

  if (!profile) return null;
  const hasPlan = investments.some((i) => i.userId === profile.userId);
  const bound = Boolean(profile.accountNumber && profile.accountName);
  const pendingTotal = transactions
    .filter(
      (t) =>
        t.userId === profile.userId &&
        t.type === "withdraw" &&
        (t.status === "pending" || t.status === "processing"),
    )
    .reduce((a, t) => a + t.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minWithdraw) return toast.error(`Minimum withdrawal is ${money(minWithdraw)}.`);
    setBusy(true);
    try {
      await requestWithdraw({ amount: value });
      toast.success("Withdrawal submitted — pending admin approval.");
      navigate("/dashboard/withdraw-history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not submit withdrawal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Withdraw funds"
        subtitle={`Payouts run ${hourLabel(open)} – ${hourLabel(close)} Pakistan time.`}
        icon={<ArrowUpRight className="h-5 w-5" />}
      />

      {!hasPlan ? (
        <GlassCard className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/20 text-warning">
            <Lock className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-lg font-extrabold">Withdrawals require an active plan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Activate any investment plan before requesting a payout.
          </p>
          <Link
            to="/dashboard/plans"
            className="btn-glass btn-glass-primary mx-auto mt-5 flex h-12 max-w-xs items-center justify-center text-sm font-bold"
          >
            Investment plans
          </Link>
        </GlassCard>
      ) : (
        <>
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              windowOpen ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <p className="text-xs font-semibold">
              {windowOpen
                ? `Withdrawal window is open — current time ${pakistanClock()}.`
                : `Withdrawal window is closed — opens ${hourLabel(open)} PKT (current ${pakistanClock()}).`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="relative overflow-hidden rounded-[2rem] glass p-5">
              <span className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
              <form onSubmit={submit} className="relative space-y-5">
                <div className="flex items-center justify-between rounded-2xl glass-soft px-4 py-3">
                  <p className="text-xs text-muted-foreground">Withdrawable balance</p>
                  <p className="font-display text-lg font-extrabold">{money(profile.balance)}</p>
                </div>
                {pendingTotal > 0 ? (
                  <p className="text-[11px] text-warning">
                    {money(pendingTotal)} is already pending review.
                  </p>
                ) : null}

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Amount (PKR)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                      Rs
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Minimum ${minWithdraw}`}
                      className="h-14 w-full rounded-2xl border-none bg-background/40 pl-12 pr-4 font-display text-xl font-black outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {!bound ? (
                  <div className="rounded-2xl bg-warning/15 p-4 text-xs font-semibold text-warning">
                    Bind a payout account in Profile before withdrawing.
                  </div>
                ) : (
                  <div className="rounded-2xl glass-soft p-4">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Payout account
                    </p>
                    <p className="mt-1 text-sm font-bold">{profile.bankName} · {profile.accountName}</p>
                    <p className="font-mono text-sm text-muted-foreground">{profile.accountNumber}</p>
                  </div>
                )}

                <button
                  disabled={busy || !windowOpen || !bound}
                  className="btn-glass btn-glass-gold flex h-14 w-full items-center justify-center gap-2 text-base font-black disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "Request withdrawal"
                  )}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> Amount is held until
                  the admin confirms the payout.
                </p>
              </form>
            </div>

            <div className="rounded-[2rem] glass p-5">
              <p className="flex items-center gap-2 text-sm font-black">
                <Banknote className="h-4 w-4 text-gold" /> Before you withdraw
              </p>
              <ul className="mt-4 space-y-3 text-xs text-muted-foreground">
                {[
                  "An active investment plan is required.",
                  `Minimum withdrawal is ${money(minWithdraw)}.`,
                  "Payouts are sent to your bound JazzCash / Easypaisa account.",
                  "Withdrawals are processed during the daily window.",
                ].map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gold/15 text-[11px] font-black text-gold">
                      {i + 1}
                    </span>
                    <span className="pt-1">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function hourLabel(h: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}:00 ${suffix}`;
}
