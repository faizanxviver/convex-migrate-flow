import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useChatUi, copyText } from "@/components/hopex/dashboard-layout";
import { useHope } from "@/hooks/use-hope";
import { fmtDate, money } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Copy,
  Crown,
  Headset,
  Link2,
  Search,
  Share2,
  Sparkle,
  Ticket,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function ReferralsPage() {
  const { profile, network, settings } = useHope();
  const { setOpen: setChatOpen } = useChatUi();
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");

  const levels = settings?.levels ?? [10, 2, 1, 4];

  if (!profile || !network) return null;

  const tree = network.levels;
  const referralCode = network.referralCode;
  const link = `${window.location.origin}/auth?mode=signup&ref=${referralCode}`;
  const teamSize = tree.reduce((a, l) => a + l.length, 0);
  const levelEarnings = tree.map((members, i) =>
    members.reduce((sum, m) => sum + (m.invested * levels[i]) / 100, 0),
  );
  const teamVolume = tree.reduce((a, l) => a + l.reduce((s, m) => s + m.invested, 0), 0);
  const activeMembers = tree.flat().filter((m) => m.invested > 0).length;

  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(`${label} copied`);
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "HopeX",
          text: `Join HopeX with my code ${referralCode}`,
          url: link,
        });
        return;
      } catch {
        /* user dismissed */
      }
    }
    copy(link, "Referral link");
  };

  const members = tree[tab].filter((m) =>
    q.trim() ? m.name.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="space-y-5">
      <SectionTitle title="Team" subtitle="Grow your network and earn commission four levels deep." />

      {/* Hero invite card */}
      <GlassCard glow className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-extrabold">Invite & earn</p>
              <p className="text-xs text-muted-foreground">
                Commission is credited the moment your member invests.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gold/10 to-transparent p-[1px]">
              <button
                onClick={() => copy(referralCode, "Referral code")}
                className="relative flex w-full items-center justify-between gap-4 rounded-[2.5rem] bg-background/40 px-8 py-6 backdrop-blur-md"
              >
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                    Unique Referral Code
                  </span>
                  <span className="mt-1 font-display text-4xl font-black tracking-tighter text-gold">
                    {referralCode}
                  </span>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold transition-transform group-hover:scale-110">
                  <Ticket className="h-7 w-7" />
                </div>
              </button>
            </div>
          </div>

          <div className="mt-3 flex h-12 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-4">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input readOnly value={link} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => copy(link, "Referral link")}
              className="btn-glass btn-glass-primary flex h-12 items-center justify-center gap-2 text-sm font-bold"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              onClick={() => void share()}
              className="btn-glass flex h-12 items-center justify-center gap-2 text-sm font-bold text-foreground"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Team size", value: String(teamSize), icon: Users, tone: "text-primary" },
          { label: "Active members", value: String(activeMembers), icon: UserPlus, tone: "text-success" },
          { label: "Team volume", value: money(teamVolume), icon: TrendingUp, tone: "text-foreground" },
          {
            label: "Referral income",
            value: money(network.income.referralEarnings),
            icon: Sparkle,
            tone: "text-gold",
          },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest">{s.label}</p>
            </div>
            <p className={cn("mt-2 truncate font-display text-xl font-extrabold sm:text-2xl", s.tone)}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Level ladder */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {levels.map((rate, i) => {
          const share = teamSize ? (tree[i].length / teamSize) * 100 : 0;
          return (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={cn(
                "relative overflow-hidden rounded-3xl p-4 text-left transition duration-300 hover:-translate-y-1",
                tab === i ? "reward-3d shadow-[var(--shadow-elegant)]" : "glass hover:shadow-[var(--shadow-elegant)]",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl transition",
                  tab === i ? "bg-gold/40" : "bg-primary/20",
                )}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="rounded-full glass-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Level {i + 1}
                  </span>
                  <span className="font-display text-xl font-black text-gradient">{rate}%</span>
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold tabular-nums">{tree[i].length}</p>
                <p className="text-[11px] text-muted-foreground">members</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full gradient-brand transition-all duration-500"
                    style={{ width: `${Math.max(6, share)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-success">{money(levelEarnings[i])}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Members */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-extrabold">Level {tab + 1} members</p>
          <span className="rounded-full glass-soft px-3 py-1 text-xs font-semibold">{tree[tab].length}</span>
        </div>

        {tree[tab].length > 0 ? (
          <div className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search member"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        ) : null}

        <div className="mt-3 divide-y divide-border/40">
          {tree[tab].length === 0 ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                No members at this level yet — share your link to grow your team.
              </p>
              <button
                onClick={() => void share()}
                className="btn-glass btn-glass-primary mx-auto mt-4 flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          ) : (
            members.map((m, j) => (
              <div key={j} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 font-bold text-primary">
                    {m.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {m.name}
                      {m.invested > 0 ? (
                        <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                          active
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{fmtDate(m.joinedAt)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold">{money(m.invested)}</p>
                  <p className="text-xs text-success">+{money((m.invested * levels[tab]) / 100)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/leaderboard"
          className="group relative overflow-hidden rounded-[2rem] glass p-5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-gold/10"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/10 blur-2xl group-hover:bg-gold/20" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold transition-transform group-hover:rotate-12">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Leaderboard</p>
              <p className="text-[11px] text-muted-foreground">Compete for top referrer rank</p>
            </div>
          </div>
        </Link>
        <Link
          to="/dashboard/withdraw"
          className="group relative overflow-hidden rounded-[2rem] glass p-5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:rotate-12">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Payout Hub</p>
              <p className="text-[11px] text-muted-foreground">Available: {money(profile.balance)}</p>
            </div>
          </div>
        </Link>
      </div>

      <button
        onClick={() => setChatOpen(true)}
        className="group relative w-full overflow-hidden rounded-[2rem] border border-success/10 bg-success/5 p-5 text-left transition hover:bg-success/10"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Headset className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-background bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-success">Concierge Support</p>
            <p className="text-[11px] text-muted-foreground/80">24/7 dedicated assistance for your team growth.</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success transition-transform group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </button>
    </div>
  );
}
