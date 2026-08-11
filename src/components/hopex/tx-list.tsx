import { fmtDateTime, money, type Transaction } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gem,
  Gift,
  HandCoins,
  Image as ImageIcon,
  Loader2,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "./glass";

const ICONS = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  investment: Gem,
  commission: UsersRound,
  bonus: Gift,
  payout: HandCoins,
} as const;

const TINT = {
  deposit: "bg-success/15 text-success",
  withdraw: "bg-destructive/15 text-destructive",
  investment: "bg-primary/15 text-primary",
  commission: "bg-gold/20 text-gold",
  bonus: "bg-gold/20 text-gold",
  payout: "bg-success/15 text-success",
} as const;

const isMpay = (t: Transaction) =>
  t.type === "deposit" && /mpay|auto gateway/i.test(`${t.note ?? ""} ${t.method ?? ""}`);
const isWaiting = (t: Transaction) => t.status === "pending" || t.status === "processing";

const isDebit = (t: Transaction) => t.type === "withdraw" || t.type === "investment";

export function TxRow({ tx }: { tx: Transaction }) {
  const Icon = ICONS[tx.type] ?? HandCoins;
  const waiting = isWaiting(tx);
  return (
    <div className="group relative overflow-hidden rounded-2xl glass p-3.5 transition-all duration-300 hover:-translate-y-0.5">
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          isDebit(tx) ? "bg-destructive/50" : "bg-success/50",
        )}
      />
      <div className="flex items-center gap-3 pl-1.5">
        <span className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl", TINT[tx.type])}>
          <Icon className="h-5 w-5" />
          {waiting ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </span>
          ) : null}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-black capitalize">{tx.method || tx.type}</p>
            <p
              className={cn(
                "shrink-0 font-display text-base font-black tabular-nums",
                isDebit(tx) ? "text-destructive" : "text-success",
              )}
            >
              {isDebit(tx) ? "−" : "+"}
              {money(tx.amount)}
            </p>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{fmtDateTime(tx.createdAt)}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={tx.status} />
            {isMpay(tx) ? (
              <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-success">
                MPay
              </span>
            ) : null}
            {tx.proofUrl ? (
              <a
                href={tx.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
              >
                <ImageIcon className="h-3 w-3" /> proof
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TxList({ rows, empty }: { rows: Transaction[]; empty?: ReactNode }) {
  if (!rows.length) {
    return (
      <div className="glass rounded-[1.75rem] p-10 text-center text-sm text-muted-foreground">
        {empty ?? "No transactions yet."}
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      {rows.map((t) => (
        <TxRow key={t._id} tx={t} />
      ))}
    </div>
  );
}

export { statusLabel } from "@/lib/hopex";
