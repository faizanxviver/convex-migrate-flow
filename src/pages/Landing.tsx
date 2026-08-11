import { api } from "@/convex/_generated/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useHope } from "@/hooks/use-hope";
import { money, planDaily, round2 } from "@/lib/hopex";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  ChartLine,
  Lock,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

const steps = [
  { icon: Wallet, title: "Fund", body: "Deposit via bank, JazzCash or EasyPaisa — approval in minutes." },
  { icon: ChartLine, title: "Activate", body: "Pick a plan — your first daily income lands instantly." },
  { icon: UsersRound, title: "Multiply", body: "Earn across 4 referral levels on every purchase." },
];

export default function Landing() {
  const { user, plans, settings } = useHope();
  const name = settings?.siteName || "HopeX";
  const logo = settings?.siteLogo;
  const visible = plans.filter((p) => p.active).slice(0, 4);

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <WelcomePopup name={name} logo={logo} />

      <header className="sticky top-0 z-40 glass-soft rounded-none">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
              {logo ? (
                <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
              ) : (
                name[0]
              )}
            </span>
            <span className="font-display text-lg font-extrabold">{name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={user ? "/dashboard" : "/auth?mode=login"}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              to={user ? "/dashboard/plans" : "/auth?mode=signup"}
              className="btn-glass btn-glass-primary px-5 py-2 text-sm font-bold"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 text-center">
        <span className="animate-rise inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-gold" /> Trusted by 42,000+ investors
        </span>
        <h1 className="animate-rise mx-auto mt-5 max-w-3xl font-display text-4xl font-black leading-[1.05] sm:text-6xl">
          Capital that compounds <span className="text-gradient">every single day.</span>
        </h1>
        <p className="animate-rise mx-auto mt-4 max-w-lg text-base text-muted-foreground">
          Daily ROI credited automatically every 24 hours, fast payouts and four levels of affiliate
          income.
        </p>
        <div className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth?mode=signup"
            className="btn-glass btn-glass-primary inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold"
          >
            Start investing <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#plans" className="btn-glass px-7 py-3.5 text-base font-bold text-foreground">
            View plans
          </a>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {[
            { k: "Rs 5.2B+", v: "Assets under management" },
            { k: "3.1%", v: "Peak daily ROI" },
            { k: "< 2 hrs", v: "Average payout time" },
          ].map((s) => (
            <div key={s.k} className="glass rounded-3xl p-5">
              <p className="font-display text-2xl font-black text-gradient">{s.k}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="glass flex items-start gap-3 rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Step {i + 1}</p>
                <h2 className="text-sm font-bold">{s.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-center font-display text-3xl font-black">Investment plans</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Principal returned at maturity. No hidden fees.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p, i) => {
            const d = planDaily(p);
            const featured = i === 2;
            return (
              <div
                key={p.slug}
                className={
                  featured
                    ? "glass rounded-3xl border-gold/40 p-5 transition-all duration-300 hover:-translate-y-0.5"
                    : "glass rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5"
                }
              >
                <h3 className="font-display text-base font-extrabold">{p.name}</h3>
                <p className="mt-2 font-display text-3xl font-black text-gradient">{money(d)}</p>
                <p className="text-xs text-muted-foreground">
                  daily income · {p.durationDays} days
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Rs {p.minAmount.toLocaleString("en-PK")} – Rs {p.maxAmount.toLocaleString("en-PK")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.features.slice(0, 2).map((f) => (
                    <span key={f} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {f}
                    </span>
                  ))}
                </div>
                <Link
                  to="/auth?mode=signup"
                  className="btn-glass btn-glass-primary mt-4 block px-4 py-2.5 text-center text-sm font-bold"
                >
                  Invest now
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Referral + trust + FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-2xl font-black">
              4 levels of <span className="text-gradient">referral income</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Commission is paid the moment anyone in your network activates a plan.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {[["L1", "10%"], ["L2", "2%"], ["L3", "1%"], ["L4", "4%"]].map(([l, v]) => (
                <div key={l} className="glass-soft rounded-2xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</p>
                  <p className="mt-1 font-display text-lg font-black text-gold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2">
              {[
                { icon: ShieldCheck, t: "Segregated custody" },
                { icon: Lock, t: "256-bit encryption" },
                { icon: BadgeCheck, t: "Audited monthly" },
              ].map((x) => (
                <p key={x.t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <x.icon className="h-4 w-4 shrink-0 text-gold" /> {x.t}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-black">FAQ</h2>
            <Accordion type="single" collapsible className="mt-3 rounded-3xl glass px-6">
              {[
                ["When do I get my first income?", "Immediately — day 1 income is credited the moment your plan activates, then every 24 hours automatically."],
                ["How fast are payouts?", "Most payouts settle within 2 hours. An active plan is required to withdraw."],
                ["Is my principal returned?", "Yes — principal returns to your balance when the plan matures."],
                ["Which payment methods work?", "Bank transfer, JazzCash and EasyPaisa — choose one at deposit time."],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-sm font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="glass relative overflow-hidden rounded-[2.5rem] p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-black sm:text-4xl">
              Start compounding <span className="text-gradient">today.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {name} pays daily — every plan, every day. Your first income lands the moment you
              activate.
            </p>
            <Link
              to="/auth?mode=signup"
              className="btn-glass btn-glass-primary mx-auto mt-6 inline-flex items-center gap-2 px-8 py-4 text-base font-bold"
            >
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg gradient-brand font-display text-xs font-black text-primary-foreground">
              {logo ? (
                <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" />
              ) : (
                name[0]
              )}
            </span>
            <span className="font-display text-base font-extrabold">{name}</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["About", "Terms", "Privacy", "Support"].map((l) => (
              <a key={l} href="#" className="transition hover:text-foreground">
                {l}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">© 2026 {name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- welcome popup (once per session) ---------------- */

function WelcomePopup({ name, logo }: { name: string; logo?: string }) {
  const { user, plans, settings } = useHope();
  const channels = useQuery(api.channels.listChannels);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("hopex-welcome-seen")) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    sessionStorage.setItem("hopex-welcome-seen", "1");
  };

  if (!open) return null;

  const featured = plans.filter((p) => p.active).slice(0, 3);
  const group = channels?.find((c) => c.kind === "group");
  const channel = channels?.find((c) => c.kind === "channel");
  const support = settings?.supportWhatsapp?.trim() ?? "";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-background/75 backdrop-blur-sm" onClick={close} />
      <div className="animate-rise relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-border/60 bg-background shadow-[var(--shadow-elegant)]">
        <span className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -right-14 h-56 w-56 rounded-full bg-gold/25 blur-3xl" />

        <button
          onClick={close}
          aria-label="Close welcome"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl glass-soft text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-7 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-3xl gradient-brand font-display text-2xl font-black text-primary-foreground shadow-[0_10px_40px_-10px_var(--primary)]">
            {logo ? <img src={logo} alt={`${name} logo`} className="h-full w-full object-cover" /> : name[0]}
          </span>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3 w-3" /> Welcome to {name}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black">
            Earn <span className="text-gradient">daily income</span>, starting today
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">
            Pick a plan, deposit, and your first day's earnings credit automatically — then every 24
            hours.
          </p>
        </div>

        <div className="relative space-y-2.5 px-7">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl glass p-3.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Minimum deposit
              </p>
              <p className="mt-1 font-display text-lg font-black text-primary">
                Rs {(settings?.minDeposit ?? 300).toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-2xl glass p-3.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Minimum withdraw
              </p>
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
            to={user ? "/dashboard/plans" : "/auth?mode=signup"}
            onClick={close}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl btn-glass btn-glass-primary text-sm font-black"
          >
            <Rocket className="h-4 w-4" /> Start investing now
          </Link>
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
