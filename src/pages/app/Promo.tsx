import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { money } from "@/lib/hopex";
import { useMutation } from "convex/react";
import { ArrowRight, BellRing, Clock, Gift, Sparkles, TicketPercent } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function PromoPage() {
  const { profile } = useHope();
  const redeem = useMutation(api.promoCodes.redeemPromo);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const redeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Enter a promo code.");
    setBusy(true);
    try {
      const res = await redeem({ code: code.trim(), amount: 0 });
      if (!res || res.bonus <= 0) {
        toast.error("This promo code is invalid, used up or expired.");
        return;
      }
      toast.success(`${money(res.bonus)} bonus credited!`);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not redeem code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Promo codes"
        subtitle="Have a code? Redeem it here for an instant wallet bonus."
      />

      <GlassCard glow className="relative overflow-hidden p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-brand text-primary-foreground shadow-[var(--shadow-elegant)]">
            <TicketPercent className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-black sm:text-3xl">Redeem a promo code</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Bonuses land instantly in your withdrawable balance.
          </p>

          <form onSubmit={redeemCode} className="mx-auto mt-6 max-w-md space-y-3">
            <div className="relative">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="HOPEX2026"
                className="h-16 w-full rounded-2xl border border-border/60 bg-background/40 px-5 text-center font-display text-xl font-black uppercase tracking-[0.35em] outline-none backdrop-blur focus:ring-2 focus:ring-ring"
              />
              <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
            </div>
            <button
              disabled={busy || !code.trim()}
              className="btn-glass btn-glass-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-60"
            >
              {busy ? "Checking…" : "Redeem code"}
              {!busy ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </form>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Gift, t: "Instant bonus", d: "Credited to your withdrawable balance right away." },
          { icon: Clock, t: "Limited window", d: "Every code has limited uses and an expiry date." },
          { icon: BellRing, t: "Stay tuned", d: "New codes drop in notifications and support chat." },
        ].map((x) => (
          <GlassCard key={x.t} className="p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <x.icon className="h-4.5 w-4.5" />
            </span>
            <p className="mt-3 text-sm font-bold">{x.t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{x.d}</p>
          </GlassCard>
        ))}
      </div>

      <Link
        to="/dashboard/transactions"
        className="btn-glass flex h-12 items-center justify-center text-sm font-semibold text-foreground"
      >
        View bonus history
      </Link>
    </div>
  );
}
