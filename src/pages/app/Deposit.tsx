import { api } from "@/convex/_generated/api";
import { LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { depositBalance, money, pendingDeposits } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { ArrowDownLeft, Clock, Loader2, ShieldCheck, Wallet, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function DepositPage() {
  const { profile, settings, transactions } = useHope();
  const createSession = useMutation(api.checkout.createSession);
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);

  if (!profile) return null;

  const quick = settings?.quickAmounts?.length ? settings.quickAmounts : [1000, 3000, 5000, 10000, 25000, 50000];
  const minDeposit = settings?.minDeposit ?? 1000;
  const deposited = depositBalance(transactions, profile.userId);
  const pending = pendingDeposits(transactions, profile.userId);

  const openGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minDeposit) {
      return toast.error(`Minimum deposit is ${money(minDeposit)}.`);
    }
    setBusy(true);
    setConnecting(true);
    // Open a blank tab synchronously inside the click gesture so popup
    // blockers never redirect us to the same tab. We only point it at MPay
    // once the backend session is ready. IMPORTANT: do NOT pass "noopener"
    // here — with noopener, window.open() returns null and we lose the
    // reference, so the tab stays blank forever. We detach the opener
    // ourselves right before navigating instead.
    const tab = window.open("", "_blank");
    try {
      // Tell the backend where the user actually is, so the gateway's
      // "return to site" link points at this website (never at a Convex API
      // domain). The gateway itself only ever needs the token.
      const session = await createSession({ amount: value, siteUrl: window.location.origin });
      // Keep the connecting screen visible for a moment, then send the tab to MPay.
      await new Promise((r) => setTimeout(r, 1200));
      setConnecting(false);
      setBusy(false);
      if (tab && !tab.closed) {
        // Detach the new tab from this window (same effect as noopener) so
        // the gateway can't reach back into the app, then send it to MPay.
        tab.opener = null;
        tab.location.href = session.url;
      } else {
        // No tab (blocked) — never navigate the current page away; give the
        // user a direct link instead.
        toast.success("MPay is ready — click here to open it:", {
          action: { label: "Open MPay", onClick: () => window.open(session.url, "_blank", "noopener,noreferrer") },
        });
        return;
      }
      toast.success("MPay opened in a new tab. Complete your payment there.");
    } catch (err) {
      tab?.close();
      setConnecting(false);
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not open the payment gateway.");
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {connecting ? <ConnectingOverlay amount={Number(amount)} /> : null}

      <LedgerHeader
        title="Deposit funds"
        subtitle={`Pick an amount, then pay inside the secure MPay gateway. Minimum ${money(minDeposit)}.`}
        icon={<ArrowDownLeft className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label="Deposit balance"
          value={money(deposited)}
          tone="success"
          icon={<Wallet className="h-4 w-4" />}
          hint="Approved top-ups"
        />
        <MoneyStat
          label="Awaiting approval"
          value={money(pending)}
          tone="primary"
          icon={<Clock className="h-4 w-4" />}
          hint="In review"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] glass p-5">
          <span className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
          <form onSubmit={openGateway} className="relative space-y-5">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Quick amount
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {quick.map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={cn(
                      "relative overflow-hidden rounded-2xl py-4 text-sm font-black transition-all hover:-translate-y-0.5",
                      Number(amount) === q
                        ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/25"
                        : "glass-soft text-foreground",
                    )}
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    Rs {q.toLocaleString("en-PK")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Or enter a custom amount (PKR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                  Rs
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="h-14 w-full rounded-2xl border-none bg-background/40 pl-12 pr-4 font-display text-xl font-black outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              disabled={busy}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-black disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting to MPay…
                </>
              ) : (
                "Submit & continue — MPay"
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> You'll be taken to our
              automatic gateway to select a method, pay and upload your screenshot.
            </p>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] glass p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Zap className="h-4 w-4 text-gold" /> How it works
            </p>
            <ol className="mt-4 space-y-3">
              {[
                "Pick an amount and submit.",
                "The secure MPay gateway opens.",
                "Choose a method and copy the account number.",
                "Pay, upload the screenshot and submit.",
                "Funds credit after approval.",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/12 text-[11px] font-black text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
            <Link
              to="/dashboard/deposit-history"
              className="mt-5 flex h-11 items-center justify-center rounded-2xl gradient-cool text-sm font-black text-primary-foreground shadow-lg shadow-primary/20"
            >
              Deposit history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectingOverlay({ amount }: { amount: number }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-background/80 p-6 backdrop-blur-xl">
      <div className="animate-rise w-full max-w-sm rounded-[2rem] border border-border/50 bg-background/50 p-8 text-center shadow-[var(--shadow-elegant)] backdrop-blur-2xl">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative grid h-20 w-20 place-items-center rounded-3xl gradient-brand text-primary-foreground">
            <Loader2 className="h-9 w-9 animate-spin [animation-duration:0.5s]" />
          </span>
        </div>
        <h2 className="mt-6 font-display text-2xl font-black">Connecting to MPay</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Securing your session{amount ? ` for ${money(amount)}` : ""} — redirecting to the payment
          gateway…
        </p>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[scroll_0.7s_linear_infinite] rounded-full gradient-cool" />
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Encrypted MPay session
        </p>
      </div>
    </div>
  );
}
