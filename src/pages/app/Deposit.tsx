import { api } from "@/convex/_generated/api";
import { useHope } from "@/hooks/use-hope";
import { money, pendingDeposits } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowDownLeft,
  ArrowRight,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
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
  const pending = pendingDeposits(transactions, profile.userId);

  const openGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minDeposit) {
      return toast.error(`Minimum deposit is ${money(minDeposit)}.`);
    }
    setBusy(true);
    setConnecting(true);
    // Open the branded boot page synchronously inside the click gesture so
    // popup blockers never redirect us to the same tab. It is a REAL
    // same-origin page (with a proper viewport meta), so it always fills the
    // mobile screen — unlike document.write into a blank tab, which rendered
    // tiny in the corner. IMPORTANT: do NOT pass "noopener" here — with
    // noopener, window.open() returns null and we lose the reference, so the
    // tab stays on the boot page forever. We detach the opener ourselves
    // right before navigating instead.
    const bootUrl = `/gateway-boot?name=${encodeURIComponent(settings?.siteName || "HopeX")}&logo=${encodeURIComponent(settings?.siteLogo || "")}`;
    const tab = window.open(bootUrl, "_blank");
    try {
      // Tell the backend where the user actually is, so the gateway's
      // "return to site" link points at this website (never at a Convex API
      // domain). The gateway itself only ever needs the token.
      const session = await createSession({ amount: value, siteUrl: window.location.origin });
      // Keep the connecting screen visible for a moment, then send the tab to MPay.
      await new Promise((r) => setTimeout(r, 700));
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
      {connecting ? (
        <ConnectingOverlay
          amount={Number(amount)}
          name={settings?.siteName || "HopeX"}
          logo={settings?.siteLogo}
        />
      ) : null}

      {/* ---------- hero ---------- */}
      <div className="relative overflow-hidden rounded-[2rem] gradient-brand p-6 text-primary-foreground shadow-[0_24px_60px_-24px_rgba(139,92,246,0.55)] sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-gold/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Secure MPay deposits
          </span>
          <h1 className="mt-3 font-display text-2xl font-black leading-tight sm:text-3xl">
            Add funds to your wallet
          </h1>
          <p className="mt-1 max-w-sm text-xs text-primary-foreground/75 sm:text-sm">
            Deposit as low as {money(minDeposit)} — pay inside the gateway, upload your
            screenshot, and your balance credits after approval.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
                <Wallet className="h-3 w-3" /> Total balance
              </p>
              <p className="mt-1 font-display text-xl font-black sm:text-2xl">{money(profile.balance)}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
                <Clock className="h-3 w-3" /> Awaiting approval
              </p>
              <p className="mt-1 font-display text-xl font-black sm:text-2xl">{money(pending)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------- amount card ---------- */}
        <div className="relative overflow-hidden rounded-[2rem] glass p-5 sm:p-6">
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
                      "relative overflow-hidden rounded-2xl py-4 text-sm font-black transition-all hover:-translate-y-0.5 active:scale-95",
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
              <p className="mt-2 text-[11px] text-muted-foreground">
                Minimum {money(minDeposit)} · no deposit fee
              </p>
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
                <>
                  Submit & continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> You'll be taken to our
              automatic gateway to select a method, pay and upload your screenshot.
            </p>
          </form>
        </div>

        {/* ---------- right column ---------- */}
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
          </div>

          <Link
            to="/dashboard/deposit-history"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl gradient-cool text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            <ArrowDownLeft className="h-4 w-4" /> Deposit history
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConnectingOverlay({ amount, name, logo }: { amount: number; name: string; logo?: string }) {
  return (
    <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center overflow-y-auto bg-white p-4">
      {/* soft brand blobs */}
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#8B5CF6]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#F59E0B]/20 blur-3xl" />

      <div className="animate-rise relative w-full max-w-md rounded-[2rem] border border-border/60 bg-white p-8 text-center shadow-[0_24px_60px_-24px_rgba(30,41,59,0.28)]">
        {/* logo with spinning ring */}
        <div className="relative mx-auto h-28 w-28">
          <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#8B5CF6]/20 border-t-[#8B5CF6] [animation-duration:1.1s]" />
          <span className="absolute inset-[7px] animate-spin rounded-full border-[3px] border-transparent border-t-[#F59E0B] [animation-duration:1.6s] [animation-direction:reverse]" />
          <span className="absolute inset-3 grid place-items-center overflow-hidden rounded-[1.5rem] gradient-brand font-display text-4xl font-black text-primary-foreground shadow-[0_12px_40px_-10px_rgba(139,92,246,0.6)]">
            {logo ? (
              <img referrerPolicy="no-referrer" src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
            ) : (
              (name[0] ?? "H")
            )}
          </span>
        </div>

        <h2 className="mt-6 font-display text-[26px] font-black leading-snug">Securing your payment…</h2>
        <p className="mx-auto mt-2 max-w-[19rem] text-[15px] leading-relaxed text-muted-foreground">
          Preparing your secure session{amount ? ` for ${money(amount)}` : ""}. The payment page is
          loading in the new tab — you will be redirected automatically.
        </p>

        <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[scroll_0.8s_linear_infinite] rounded-full gradient-brand" />
        </div>

        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/10 px-4 py-2 text-[13px] font-bold text-[#8B5CF6]">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Encrypted MPay session
        </p>
      </div>
    </div>
  );
}


