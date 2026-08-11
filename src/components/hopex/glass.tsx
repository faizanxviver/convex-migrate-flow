import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/hopex";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  glow,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5",
        glow && "glow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "gold" | "success";
}) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div
        className={cn(
          "absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-40",
          accent === "gold" ? "bg-gold" : accent === "success" ? "bg-success" : "bg-primary",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            {icon}
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-primary/12 text-primary border-primary/30",
    processing: "bg-primary/12 text-primary border-primary/30",
    approved: "bg-success/15 text-success border-success/30",
    completed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        map[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

type Tone = "primary" | "success" | "destructive" | "gold" | "muted";

const TONE: Record<Tone, { text: string; blob: string; chip: string; bar: string }> = {
  primary: {
    text: "text-primary",
    blob: "bg-primary/25",
    chip: "bg-primary/12 text-primary",
    bar: "bg-primary",
  },
  success: {
    text: "text-success",
    blob: "bg-success/25",
    chip: "bg-success/12 text-success",
    bar: "bg-success",
  },
  destructive: {
    text: "text-destructive",
    blob: "bg-destructive/25",
    chip: "bg-destructive/12 text-destructive",
    bar: "bg-destructive",
  },
  gold: {
    text: "text-gold",
    blob: "bg-gold/25",
    chip: "bg-gold/15 text-gold",
    bar: "bg-gold",
  },
  muted: {
    text: "text-foreground",
    blob: "bg-muted-foreground/20",
    chip: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground",
  },
};

/** Page hero header with icon badge — shared by ledger/history screens. */
export function LedgerHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] glass p-5">
      <span className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-24 -right-10 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex items-center gap-3">
        {icon ? (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground shadow-lg shadow-primary/25">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-black sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}

/** Compact, glassy money/status tile used across ledger + history screens. */
export function MoneyStat({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  count,
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  count?: number;
  className?: string;
}) {
  const c = TONE[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] glass p-4 transition-all duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl opacity-70 transition-opacity group-hover:opacity-100",
          c.blob,
        )}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", c.chip)}>
            {icon}
          </span>
        ) : null}
      </div>

      <p className={cn("relative mt-2 truncate font-display text-xl font-black sm:text-2xl", c.text)}>
        {value}
      </p>

      <div className="relative mt-2 flex items-center justify-between gap-2">
        {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : <span />}
        {typeof count === "number" ? (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black", c.chip)}>
            {count}
          </span>
        ) : null}
      </div>

      <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-foreground/5">
        <span className={cn("block h-full w-1/2 rounded-full opacity-70", c.bar)} />
      </div>
    </div>
  );
}
