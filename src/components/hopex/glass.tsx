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
    <div className="flex items-center gap-3">
      {icon ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-primary-foreground shadow-lg shadow-primary/20">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MoneyStat({
  label,
  value,
  hint,
  count,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  count?: number;
  icon?: ReactNode;
  tone?: "primary" | "success" | "gold";
}) {
  const tones = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    gold: "bg-gold/20 text-gold",
  };
  return (
    <GlassCard className="relative overflow-hidden p-4 sm:p-5">
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 truncate font-display text-xl font-extrabold sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tones[tone])}>
          {icon}
        </span>
      </div>
      {count !== undefined ? (
        <span className="absolute right-4 top-4 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {count}
        </span>
      ) : null}
    </GlassCard>
  );
}
