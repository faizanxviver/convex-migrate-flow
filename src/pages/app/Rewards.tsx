import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle, StatusBadge } from "@/components/hopex/glass";
import { useUploader } from "@/components/hopex/storage-image";
import { useHope } from "@/hooks/use-hope";
import { fmtDateTime, money } from "@/lib/hopex";
import { useMutation } from "convex/react";
import { CheckCircle2, Gift, ImagePlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RewardsPage() {
  const { profile, settings, rewardClaims } = useHope();
  const submit = useMutation(api.rewards.submitRewardClaim);
  const upload = useUploader();
  const [whatsapp, setWhatsapp] = useState<File | null>(null);
  const [facebook, setFacebook] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const amount = settings?.rewardAmount ?? 100;
  const active = settings?.rewardActive ?? true;
  const pending = rewardClaims.some((c) => c.status === "pending");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp || !facebook) return toast.error("Both screenshots are required");
    setBusy(true);
    try {
      const [w, f] = await Promise.all([upload(whatsapp), upload(facebook)]);
      await submit({ whatsappProof: w, facebookProof: f });
      setWhatsapp(null);
      setFacebook(null);
      toast.success("Task submitted — awaiting review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not submit task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Free reward task" subtitle="Complete one simple task and earn free balance." />

      <GlassCard className="reward-3d relative overflow-hidden p-6 text-center">
        <div className="reward-coin mx-auto grid h-24 w-24 place-items-center rounded-full text-4xl shadow-xl">
          <Gift className="h-10 w-10 text-white drop-shadow" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-black">
          Earn <span className="text-gradient">{money(amount)}</span> free
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Share our page on WhatsApp and Facebook, screenshot both, and upload them below. Your
          reward is added after admin review.
        </p>
        {!active ? (
          <p className="mt-4 rounded-2xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">
            The reward task is currently closed.
          </p>
        ) : pending ? (
          <p className="mt-4 rounded-2xl bg-primary/15 px-4 py-3 text-sm font-semibold text-primary">
            Your previous submission is still under review.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-md space-y-3 text-left">
            <ProofField label="WhatsApp screenshot" file={whatsapp} setFile={setWhatsapp} />
            <ProofField label="Facebook screenshot" file={facebook} setFile={setFacebook} />
            <button
              disabled={busy || !whatsapp || !facebook}
              className="btn-glass btn-glass-primary flex h-12 w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              Submit task
            </button>
          </form>
        )}
      </GlassCard>

      {rewardClaims.length > 0 ? (
        <GlassCard className="p-2">
          <p className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Your submissions
          </p>
          {rewardClaims.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-3 border-t border-border/40 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {money(c.amount)} task{" "}
                  <StatusBadge status={c.status} />
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Submitted {fmtDateTime(c.createdAt)}
                  {c.adminNote ? ` · ${c.adminNote}` : ""}
                </span>
                {(c.whatsappProof || c.facebookProof) ? (
                  <span className="mt-1.5 flex gap-2">
                    {c.whatsappProof ? (
                      <img src={c.whatsappProof} alt="WhatsApp proof" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                    ) : null}
                    {c.facebookProof ? (
                      <img src={c.facebookProof} alt="Facebook proof" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                    ) : null}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </GlassCard>
      ) : null}
    </div>
  );
}

function ProofField({
  label,
  file,
  setFile,
}: {
  label: string;
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  return file ? (
    <div className="flex items-center justify-between gap-3 rounded-2xl glass-soft px-4 py-3">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <ImagePlus className="h-4 w-4 shrink-0 text-success" />
        <span className="truncate">{file.name}</span>
      </span>
      <button type="button" onClick={() => setFile(null)} aria-label="Remove">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  ) : (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/30 py-4 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
      <ImagePlus className="h-5 w-5" /> {label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
