import { api } from "@/convex/_generated/api";
import { useHope } from "@/hooks/use-hope";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronRight,
  Headset,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Compact WhatsApp community strip (groups + channels) — one slim row with
 * Channel / Group buttons, used at the bottom of Plans & Promo pages.
 * Links come from Admin → Channels.
 */
export function CommunityLinks({ className }: { className?: string }) {
  const channels = useQuery(api.channels.listChannels);
  const { settings } = useHope();
  const support = settings?.supportWhatsapp?.trim() ?? "";
  if (!channels || (channels.length === 0 && !support)) return null;

  const channel = channels.find((c) => c.kind === "channel");
  const group = channels.find((c) => c.kind === "group");

  return (
    <section className={cn("mt-4", className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl glass p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
          <WhatsAppIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">Join our WhatsApp</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Official Channel &amp; Group — updates &amp; promo codes
          </p>
        </div>
        {channel ? (
          <a
            href={channel.url}
            target="_blank"
            rel="noreferrer"
            className="btn-glass flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-foreground transition active:scale-95"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" /> Channel
          </a>
        ) : null}
        {group ? (
          <a
            href={group.url}
            target="_blank"
            rel="noreferrer"
            className="btn-glass flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-foreground transition active:scale-95"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" /> Group
          </a>
        ) : null}
        {!channel && !group && support ? (
          <a
            href={support}
            target="_blank"
            rel="noreferrer"
            className="btn-glass flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-foreground transition active:scale-95"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" /> Support
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Official WhatsApp glyph (lucide has no brand icons). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Platform Guidelines popup — shown when the dashboard opens. Recreates the
 * reference notification: dark navy header (logo + site name + "Platform
 * Guidelines"), five guideline rows with pastel icon cards, a green WhatsApp
 * card with the official Channel/Group rows, and a full-width green "Got It!"
 * button. Dismissed by the button, the overlay, or turning off popupEnabled in
 * Admin → Settings.
 */
export function DashboardPopup() {
  const { settings, plans } = useHope();
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
  const minDeposit = settings?.minDeposit ?? 300;
  const minWithdraw = settings?.minWithdraw ?? 50;
  const minInvest =
    plans.filter((p) => p.active).reduce((m, p) => Math.min(m, p.minAmount), minDeposit) || minDeposit;
  // listChannels already returns only active channels.
  const group = channels?.find((c) => c.kind === "group");
  const channel = channels?.find((c) => c.kind === "channel");
  const support = settings?.supportWhatsapp?.trim() ?? "";

  const rs = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

  const guidelines = [
    {
      icon: ArrowDownToLine,
      tone: "bg-sky-100 text-sky-600",
      title: `Min Deposit: ${rs(minDeposit)}`,
      desc: `Start investing with as low as ${rs(minDeposit)}`,
    },
    {
      icon: ArrowUpFromLine,
      tone: "bg-green-100 text-green-600",
      title: `Min Withdrawal: ${rs(minWithdraw)}`,
      desc: `Withdraw your profits anytime — minimum ${rs(minWithdraw)}`,
    },
    {
      icon: Wallet,
      tone: "bg-amber-100 text-amber-600",
      title: `Min Investment: ${rs(minInvest)}`,
      desc: `Invest in plans starting from just ${rs(minInvest)}`,
    },
    {
      icon: Zap,
      tone: "bg-purple-100 text-purple-600",
      title: "Fast Withdrawals",
      desc: "Quick and convenient withdrawal processing",
    },
    {
      icon: Headset,
      tone: "bg-orange-100 text-orange-600",
      title: "24/7 Support",
      desc: "Contact us anytime via in-app support",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88vh] w-[92vw] max-w-[540px] overflow-y-auto overflow-x-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(2,10,25,0.6)]"
      >
        {/* ---------- dark navy header ---------- */}
        <div className="rounded-t-[28px] bg-[#071B3A] px-5 pb-4 pt-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
            {logo ? (
              <img referrerPolicy="no-referrer" src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl font-black text-white">{name[0]}</span>
            )}
          </span>
          <h2 className="mt-2 font-display text-[20px] font-extrabold leading-tight text-white">{name}</h2>
          <p className="mt-0.5 text-[12px] font-medium text-slate-300/80">Platform Guidelines</p>
        </div>

        {/* ---------- white content ---------- */}
        <div className="bg-white pb-4 pt-2">
          {/* guideline rows */}
          <div className="space-y-0 px-4">
            {guidelines.map((g) => (
              <div key={g.title} className="flex items-center gap-3 rounded-xl px-0.5 py-1">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", g.tone)}>
                  <g.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-snug text-slate-900">{g.title}</p>
                  <p className="text-[11px] leading-snug text-slate-500">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- WhatsApp card ---------- */}
          {group || channel ? (
            <div className="mx-4 mt-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5">
              <div className="flex items-center gap-2.5 px-1 py-0.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#25D366] shadow-sm">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-snug text-emerald-800">Follow Our WhatsApp</p>
                  <p className="text-[11px] leading-snug text-slate-500">Join our official Channel &amp; Group</p>
                </div>
              </div>
              <div className="mt-1 flex gap-1.5">
                {channel ? (
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-2 py-1.5 text-[12px] font-semibold text-emerald-800 transition hover:bg-white"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />
                    <span className="truncate">Channel</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  </a>
                ) : null}
                {group ? (
                  <a
                    href={group.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/70 px-2 py-1.5 text-[12px] font-semibold text-emerald-800 transition hover:bg-white"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />
                    <span className="truncate">Group</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : support ? (
            <a
              href={support}
              target="_blank"
              rel="noreferrer"
              className="mx-4 mt-2.5 flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#25D366] shadow-sm">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-emerald-800">Follow Our WhatsApp</p>
                <p className="text-[11px] text-slate-500">Join our official Channel &amp; Group</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-emerald-500" />
            </a>
          ) : null}

          {/* ---------- Got It ---------- */}
          <div className="px-4 pt-3">
            <button
              onClick={() => setOpen(false)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] text-[15px] font-bold text-white shadow-[0_14px_30px_-10px_rgba(34,197,94,0.6)] transition hover:bg-[#16a34a] active:scale-[0.99]"
            >
              <Check className="h-[18px] w-[18px]" strokeWidth={3} /> Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
