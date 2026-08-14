import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Branded full-screen "Securing your payment…" boot page. The deposit flow
 * opens this in a new tab (a real same-origin page, so the viewport meta is
 * applied and the layout always fills the screen — unlike the old
 * document.write approach that rendered tiny in the corner on mobile).
 *
 * Supports ?name= / ?logo= to brand it from the site settings, and an optional
 * ?url= that auto-redirects after a beat (used as a fallback when the opener
 * cannot reach the tab).
 */
export default function GatewayBootPage() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const name = params.get("name") || "HopeX";
  const logo = params.get("logo") || "";
  const target = params.get("url");

  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => {
      window.location.replace(target);
    }, 700);
    return () => clearTimeout(t);
  }, [target]);

  return (
    <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center overflow-y-auto bg-white p-5">
      {/* soft brand blobs */}
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#8B5CF6]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-[#F59E0B]/20 blur-3xl" />

      <div className="animate-rise relative w-full max-w-md rounded-[2rem] border border-border/60 bg-white p-8 text-center shadow-[0_24px_60px_-24px_rgba(30,41,59,0.28)]">
        {/* logo with spinning rings */}
        <div className="relative mx-auto h-32 w-32">
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-[#8B5CF6]/20 border-t-[#8B5CF6] [animation-duration:1.1s]" />
          <span className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-t-[#F59E0B] [animation-duration:1.6s] [animation-direction:reverse]" />
          <span className="absolute inset-4 grid place-items-center overflow-hidden rounded-[1.6rem] gradient-brand font-display text-5xl font-black text-primary-foreground shadow-[0_14px_44px_-10px_rgba(139,92,246,0.6)]">
            {logo ? (
              <img
                referrerPolicy="no-referrer"
                src={logo}
                alt={`${name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              (name[0] ?? "H")
            )}
          </span>
        </div>

        <h2 className="mt-7 font-display text-[28px] font-black leading-snug">
          Securing your payment…
        </h2>
        <p className="mx-auto mt-2.5 max-w-[20rem] text-[15px] leading-relaxed text-muted-foreground">
          Preparing your secure session. The payment page is loading — you will be
          redirected automatically, please keep this tab open.
        </p>

        <div className="mx-auto mt-7 h-3 w-full max-w-[340px] overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[scroll_0.8s_linear_infinite] rounded-full gradient-brand" />
        </div>

        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/10 px-5 py-2.5 text-[13px] font-bold text-[#8B5CF6]">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Encrypted MPay session
        </p>
      </div>
    </div>
  );
}
