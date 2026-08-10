import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { fmtDate, money } from "@/lib/hopex";
import { useMutation } from "convex/react";
import { BadgePercent, Gift, Loader2, TicketPercent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PromoPage() {
  const { profile, promos } = useHope();
  const redeem = useMutation(api.promoCodes.redeemPromo);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const result = await redeem({ code, amount: 0 });
      if (!result) {
        toast.error("Invalid or expired promo code");
        return;
      }
      toast.success(`${result.code} applied — ${money(result.bonus)} bonus.`);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not redeem code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Promo codes" subtitle="Redeem a bonus code into your wallet." />

      <GlassCard className="relative overflow-hidden" glow>
        <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-destructive/15 blur-3xl" />
        <form onSubmit={submit} className="relative">
          <div className="relative">
            <TicketPercent className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME10"
              className="h-14 w-full rounded-2xl border-none bg-background/40 pl-12 pr-4 font-display text-xl font-black uppercase tracking-widest outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            disabled={busy || !code.trim()}
            className="btn-glass btn-glass-primary mt-4 flex h-12 w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Redeem code
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Percent codes apply to your next deposit; fixed codes add a flat bonus.
          </p>
        </form>
      </GlassCard>

      {promos.length > 0 ? (
        <GlassCard className="p-2">
          <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Available codes
          </p>
          {promos.map((p) => (
            <div key={p._id} className="flex items-center gap-3 border-t border-border/40 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <BadgePercent className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold tracking-wider">{p.code}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {p.type === "percent" ? `${p.value}% of deposit` : `${money(p.value)} flat`} ·{" "}
                  {p.expiresAt ? `valid until ${fmtDate(p.expiresAt)}` : "no expiry"} ·{" "}
                  {p.used}/{p.usageLimit} used
                </span>
              </span>
              <span className={`shrink-0 text-xs font-bold ${p.active ? "text-success" : "text-muted-foreground"}`}>
                {p.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </GlassCard>
      ) : null}
    </div>
  );
}
