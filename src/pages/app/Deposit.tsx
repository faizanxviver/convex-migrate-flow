import { api } from "@/convex/_generated/api";
import { GlassCard, LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { useUploader } from "@/components/hopex/storage-image";
import { useHope } from "@/hooks/use-hope";
import { depositBalance, money, pendingDeposits } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function DepositPage() {
  const { profile, settings, methods, transactions } = useHope();
  const requestDeposit = useMutation(api.transactions.requestDeposit);
  const upload = useUploader();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [methodId, setMethodId] = useState<string | null>(
    methods[0]?._id ?? null,
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const quick = settings?.quickAmounts?.length ? settings.quickAmounts : [1000, 3000, 5000, 10000, 25000, 50000];
  const minDeposit = settings?.minDeposit ?? 1000;
  const deposited = depositBalance(transactions, profile.userId);
  const pending = pendingDeposits(transactions, profile.userId);
  const method = methods.find((m) => m._id === methodId) ?? methods[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minDeposit) {
      return toast.error(`Minimum deposit is ${money(minDeposit)}.`);
    }
    setBusy(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        proofUrl = await upload(proofFile);
      }
      await requestDeposit({
        amount: value,
        methodId: method?._id,
        proofUrl,
      });
      toast.success("Deposit submitted — awaiting admin approval.");
      navigate("/dashboard/deposit-history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not submit deposit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Deposit funds"
        subtitle={`Pick an amount and a payment method. Minimum ${money(minDeposit)}.`}
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
          <form onSubmit={submit} className="relative space-y-5">
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

            {/* Payment method */}
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Payment method
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {methods.map((m) => (
                  <button
                    type="button"
                    key={m._id}
                    onClick={() => setMethodId(m._id)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition",
                      method?._id === m._id
                        ? "border-primary bg-primary/10"
                        : "border-border glass-soft",
                    )}
                  >
                    <p className="text-sm font-bold">{m.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {m.accountName}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{m.accountNumber}</p>
                  </button>
                ))}
              </div>
            </div>

            {method ? (
              <div className="rounded-2xl glass-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{method.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{method.instructions}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(method.accountNumber);
                      toast.success("Account number copied");
                    }}
                    className="shrink-0 rounded-xl bg-primary/15 p-2.5 text-primary transition hover:bg-primary/25"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 rounded-xl bg-background/50 px-3 py-2 font-mono text-sm font-bold">
                  {method.accountName} · {method.accountNumber}
                </p>
              </div>
            ) : null}

            {/* Proof upload */}
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Payment screenshot (recommended)
              </p>
              {proofFile ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl glass-soft px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <ImagePlus className="h-4 w-4 shrink-0 text-success" />
                    <span className="truncate">{proofFile.name}</span>
                  </span>
                  <button type="button" onClick={() => setProofFile(null)} aria-label="Remove">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/30 py-5 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                  <ImagePlus className="h-5 w-5" /> Tap to attach a screenshot
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setProofFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <button
              disabled={busy}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-black disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit deposit request"
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" /> Funds credit to your
              balance after admin verification.
            </p>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] glass p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <CheckCircle2 className="h-4 w-4 text-gold" /> How it works
            </p>
            <ol className="mt-4 space-y-3">
              {[
                "Pick an amount and a payment method.",
                "Send the exact amount to the displayed account.",
                "Attach your payment screenshot.",
                "Submit — funds credit after admin approval.",
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
        </div>
      </div>
    </div>
  );
}
