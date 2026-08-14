import { api } from "@/convex/_generated/api";
import { useHope } from "@/hooks/use-hope";
import { money, planDaily } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ExternalLink,
  Megaphone,
  Rocket,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

/**
 * WhatsApp community section (groups + channels) used below the plans grid and
 * inside the dashboard popup. Links come from Admin → Channels.
 */
export function CommunityLinks({ className }: { className?: string }) {
  const channels = useQuery(api.channels.listChannels);
  const { settings } = useHope();
  const support = settings?.supportWhatsapp?.trim() ?? "";
  if (!channels || (channels.length === 0 && !support)) return null;

  return (
    <section className={cn("mx-auto max-w-6xl px-4 py-8", className)}>
      <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#25D366]/15 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-[#128C7E]/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#25D366]/15 text-[#25D366]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-black">Join our community</h2>
              <p className="text-xs text-muted-foreground">
                Get updates, signals and instant support on WhatsApp.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <a
                key={c._id}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl glass-soft p-4 transition-all hover:-translate-y-0.5"
              >
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg",
                    c.kind === "channel" ? "bg-[#25D366]" : "bg-[#128C7E]",
                  )}
                >
                  {c.kind === "channel" ? <Megaphone className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {c.kind === "channel" ? "WhatsApp Channel" : "WhatsApp Group"}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#25D366]/15 px-3 py-2 text-xs font-black text-[#25D366] transition group-hover:bg-[#25D366] group-hover:text-white">
                  Join <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ))}
          </div>

          {support ? (
            <a
              href={support}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-black text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:brightness-110"
            >
              <UsersRound className="h-4 w-4" /> Chat with support on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Welcome popup shown EVERY time the dashboard opens: site logo, top plans,
 * min limits, community links and a "Continue" CTA with a close (X) at top.
 */
export function DashboardPopup() {
  const { plans, settings } = useHope();
  const channels = useQuery(api.channels.listChannels);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Every dashboard visit — no session gate, per the owner's request.
    // Skipped entirely when the admin turns the popup off.
    if (settings?.popupEnabled === false) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [settings?.popupEnabled]);

  if (!open) return null;

  const name = settings?.siteName || "HopeX";
  const logo = settings?.siteLogo;
  const popupTitle = settings?.popupTitle?.trim() || "Your daily income is working for you";
  const popupSubtitle =
    settings?.popupSubtitle?.trim() ||
    "Every active plan credits earnings automatically every 24 hours — check your balance below.";
  const popupButtonText = settings?.popupButtonText?.trim() || "Continue to Dashboard";
  const featured = plans.filter((p) => p.active).slice(0, 3);
  const group = channels?.find((c) => c.kind === "group");
  const channel = channels?.find((c) => c.kind === "channel");
  const support = settings?.supportWhatsapp?.trim() ?? "";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-background/75 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="animate-rise relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-[var(--shadow-elegant)]">
        <span className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -right-14 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />

        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-7 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-3xl gradient-brand font-display text-2xl font-black text-primary-foreground shadow-[0_10px_40px_-10px_var(--primary)]">
            {logo ? <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" /> : name[0]}
          </span>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3 w-3" /> Welcome back to {name}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-snug break-words">
            {popupTitle}
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {popupSubtitle}
          </p>
        </div>

        <div className="relative space-y-2.5 px-7">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl glass p-3.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min deposit</p>
              <p className="mt-1 font-display text-lg font-black text-primary">
                Rs {(settings?.minDeposit ?? 300).toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-2xl glass p-3.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min withdraw</p>
              <p className="mt-1 font-display text-lg font-black text-success">
                Rs {(settings?.minWithdraw ?? 50).toLocaleString("en-PK")}
              </p>
            </div>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {featured.map((p, i) => (
                <div
                  key={p.slug}
                  className={
                    i === 0
                      ? "relative overflow-hidden rounded-2xl gradient-brand p-3 text-center text-primary-foreground shadow-lg shadow-primary/25"
                      : "rounded-2xl glass p-3 text-center"
                  }
                >
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{p.name}</p>
                  <p className="mt-0.5 font-display text-base font-black">{money(planDaily(p))}</p>
                  <p className="text-[9px] opacity-80">daily</p>
                  <p className="mt-0.5 text-[10px] font-semibold opacity-90">
                    Rs {p.minAmount.toLocaleString("en-PK")}+
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative space-y-2 px-7 pb-6 pt-3">
          {group || channel ? (
            <div className="flex gap-2">
              {group ? (
                <a
                  href={group.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-black text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:brightness-110"
                >
                  <UsersRound className="h-4 w-4" /> Join WhatsApp Group
                </a>
              ) : null}
              {channel ? (
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#128C7E] py-3 text-sm font-black text-white shadow-[0_10px_30px_-8px_rgba(18,140,126,0.7)] transition hover:brightness-110"
                >
                  <Megaphone className="h-4 w-4" /> Join WhatsApp Channel
                </a>
              ) : null}
            </div>
          ) : null}

          <Link
            to="/dashboard/plans"
            onClick={() => setOpen(false)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl glass-soft text-sm font-black text-foreground"
          >
            View plans <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl btn-glass btn-glass-primary px-4 text-sm font-black"
          >
            <Rocket className="h-4 w-4 shrink-0" /> {popupButtonText}
          </button>
          {support ? (
            <a
              href={support}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-[11px] font-semibold text-muted-foreground underline-offset-2 transition hover:text-[#25D366] hover:underline"
            >
              Need help? Chat on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
