import { Transaction, fmtDateTime, money, statusLabel, txTypeLabel } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  HandCoins,
  Percent,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "./glass";

const TYPE_META: Record<string, { icon: typeof Gift; tone: string }> = {
  deposit: { icon: ArrowDownLeft, tone: "bg-success/15 text-success" },
  withdraw: { icon: ArrowUpRight, tone: "bg-gold/20 text-gold" },
  investment: { icon: TrendingUp, tone: "bg-primary/15 text-primary" },
  commission: { icon: Percent, tone: "bg-primary/15 text-primary" },
  bonus: { icon: Gift, tone: "bg-gold/20 text-gold" },
  payout: { icon: HandCoins, tone: "bg-success/15 text-success" },
};

export function TxList({
  rows,
  empty,
}: {
  rows: Transaction[];
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl glass p-8 text-center text-sm text-muted-foreground">
        {empty ?? "No transactions yet."}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40 rounded-3xl glass p-2">
      {rows.map((tx) => {
        const meta = TYPE_META[tx.type] ?? TYPE_META.bonus;
        const Icon = meta.icon;
        const incoming =
          tx.type === "deposit" ||
          tx.type === "commission" ||
          tx.type === "bonus" ||
          tx.type === "payout";
        return (
          <div key={tx._id} className="flex items-center gap-3 p-3">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", meta.tone)}>
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-sm font-semibold">
                  {txTypeLabel(tx.type)}
                  {tx.method ? ` · ${tx.method}` : ""}
                </span>
                <StatusBadge status={tx.status} />
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {fmtDateTime(tx.createdAt)}
                {tx.reference ? ` · ${tx.reference}` : ""}
              </span>
              {tx.proofUrl ? (
                <span className="mt-1.5 block">
                  <img
                    src={tx.proofUrl}
                    alt="proof"
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
                  />
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "shrink-0 font-display text-sm font-extrabold",
                incoming ? "text-success" : "text-foreground",
              )}
            >
              {incoming ? "+" : "−"}
              {money(tx.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { statusLabel };
