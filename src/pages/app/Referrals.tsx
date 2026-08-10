import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope } from "@/hooks/use-hope";
import { copyText } from "@/components/hopex/dashboard-layout";
import { fmtDate, money } from "@/lib/hopex";
import { Copy, Share2, UsersRound } from "lucide-react";
import { useState } from "react";

export default function ReferralsPage() {
  const { profile, network, settings } = useHope();
  const [copied, setCopied] = useState(false);
  const levels = settings?.levels ?? [10, 2, 1, 4];

  if (!profile || !network) return null;

  const copy = () => {
    copyText(network.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareUrl = `${window.location.origin}/auth?ref=${network.referralCode}`;

  return (
    <div className="space-y-5">
      <SectionTitle title="Referral center" subtitle="Earn on every purchase made by your 4-level network." />

      {/* Referral code hero */}
      <GlassCard glow className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Your referral code
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="rounded-2xl glass-soft px-5 py-3 font-display text-2xl font-black tracking-widest text-primary">
              {network.referralCode}
            </p>
            <button onClick={copy} className="btn-glass flex h-12 items-center gap-2 px-5 text-sm font-bold text-foreground">
              <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Share your link — new members who sign up with your code become part of your team:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background/40 px-3 text-xs outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                copyText("Link copied");
              }}
              className="btn-glass btn-glass-primary grid h-11 shrink-0 place-items-center px-4"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniStat label="Team members" value={String(network.totalMembers)} />
            <MiniStat label="Level 1 invested" value={money(network.teamInvested)} />
            <MiniStat label="Referral income" value={money(network.income.referralEarnings)} />
          </div>
        </div>
      </GlassCard>

      {/* Commission levels */}
      <GlassCard>
        <p className="mb-3 text-sm font-bold">Commission levels</p>
        <div className="grid grid-cols-4 gap-2">
          {levels.map((pct, i) => (
            <div key={i} className="glass-soft rounded-2xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">L{i + 1}</p>
              <p className="mt-1 font-display text-lg font-black text-gold">{pct}%</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Network tree */}
      <GlassCard className="p-2">
        {network.levels.every((l) => l.length === 0) ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No team members yet — share your referral code to start building your network.
          </p>
        ) : (
          network.levels.map((level, i) =>
            level.length === 0 ? null : (
              <div key={i} className="border-b border-border/40 p-3 last:border-0">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <UsersRound className="h-3.5 w-3.5" /> Level {i + 1} · {level.length} member{level.length > 1 ? "s" : ""}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {level.map((m, j) => (
                    <div key={j} className="flex items-center gap-3 rounded-2xl glass-soft px-3 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-xs font-black text-primary">
                        {m.name[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{m.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          Joined {fmtDate(m.joinedAt)} · invested {money(m.invested)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-success">{money(m.earnings)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )
        )}
      </GlassCard>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass-soft p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-base font-extrabold">{value}</p>
    </div>
  );
}
