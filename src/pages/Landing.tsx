import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useHope } from "@/hooks/use-hope";
import { money, planDaily, round2 } from "@/lib/hopex";
import {
  ArrowRight,
  BadgeCheck,
  ChartLine,
  Lock,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const steps = [
  { icon: Wallet, title: "Fund", body: "Deposit via bank, JazzCash or EasyPaisa — approval in minutes." },
  { icon: ChartLine, title: "Activate", body: "Pick a plan — your first daily income lands instantly." },
  { icon: UsersRound, title: "Multiply", body: "Earn across 4 referral levels on every purchase." },
];

export default function Landing() {
  const { user, plans, settings } = useHope();
  const name = settings?.siteName || "HopeX";
  const visible = plans.filter((p) => p.active).slice(0, 4);

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />

      <header className="sticky top-0 z-40 glass-soft rounded-none">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
              {name[0]}
            </span>
            <span className="font-display text-lg font-extrabold">{name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              to={user ? "/dashboard/plans" : "/auth"}
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
            to="/auth"
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
                  to="/auth"
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
              to="/auth"
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
            <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand font-display text-xs font-black text-primary-foreground">
              {name[0]}
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
