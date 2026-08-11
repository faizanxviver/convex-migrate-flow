import { api } from "@/convex/_generated/api";
import { useHope } from "@/hooks/use-hope";
import { useQuery } from "convex/react";
import { ExternalLink, Megaphone, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Popup listing every community link (WhatsApp groups / channels). Shown from
 * the in-app avatar menu and reused by the landing welcome popup.
 */
export function ChannelsPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const channels = useQuery(api.channels.listChannels);
  const { settings } = useHope();
  if (!open) return null;

  const support = settings?.supportWhatsapp?.trim() ?? "";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-rise relative w-full max-w-md overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-[var(--shadow-elegant)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#25D366]/20 via-transparent to-transparent p-6">
          <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#25D366]/20 blur-3xl" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#25D366]">Community</p>
          <h2 className="mt-1 font-display text-2xl font-black">Channels &amp; Groups</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Join our WhatsApp community for updates, signals and instant support.
          </p>
        </div>

        <div className="max-h-[50vh] space-y-2.5 overflow-y-auto px-6 pb-6">
          {!channels || channels.length === 0 ? (
            <p className="rounded-2xl glass-soft p-4 text-center text-xs text-muted-foreground">
              No community links yet — check back soon.
            </p>
          ) : (
            channels.map((c) => (
              <a
                key={c._id}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl glass p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#25D366]/50"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg",
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
            ))
          )}

          {support ? (
            <a
              href={support}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-black text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:brightness-110"
            >
              <UsersRound className="h-4 w-4" /> Chat with support on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
