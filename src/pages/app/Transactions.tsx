import { LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { TxList } from "@/components/hopex/tx-list";
import { useHope } from "@/hooks/use-hope";
import { money } from "@/lib/hopex";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";

const types = [
  "all",
  "deposit",
  "withdraw",
  "investment",
  "commission",
  "bonus",
  "payout",
] as const;

export default function TransactionsPage() {
  const { transactions, profile } = useHope();
  const [type, setType] = useState<(typeof types)[number]>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const rows = useMemo(() => {
    return transactions.filter((tx) => {
      if (profile && tx.userId !== profile.userId) return false;
      if (type !== "all" && tx.type !== type) return false;
      if (q && !`${tx.type} ${tx.method ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      const d = new Date(tx.createdAt).getTime();
      if (from && d < new Date(from).getTime()) return false;
      if (to && d > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [transactions, profile, type, q, from, to]);

  const credits = rows.filter((r) => r.type !== "withdraw" && r.type !== "investment");
  const debits = rows.filter((r) => r.type === "withdraw" || r.type === "investment");
  const inflow = credits.reduce((a, r) => a + r.amount, 0);
  const outflow = debits.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Ledger"
        subtitle="Comprehensive history of all movements."
        icon={<ReceiptText className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label="Total Inflow"
          value={`+${money(inflow)}`}
          tone="success"
          count={credits.length}
          icon={<ArrowDownLeft className="h-4 w-4" />}
          hint="Credited"
        />
        <MoneyStat
          label="Total Outflow"
          value={`−${money(outflow)}`}
          tone="primary"
          count={debits.length}
          icon={<ArrowUpRight className="h-4 w-4" />}
          hint="Debited"
        />
      </div>

      <div className="rounded-[1.75rem] glass p-3">
        <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {types.map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={cn(
                "h-9 shrink-0 rounded-xl px-4 text-xs font-black capitalize transition-all",
                type === ty
                  ? "gradient-brand text-primary-foreground shadow-lg shadow-primary/25"
                  : "glass-soft text-muted-foreground hover:text-foreground",
              )}
            >
              {ty === "all" ? "All" : ty}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by method or ID..."
              className="h-12 w-full rounded-2xl border-none bg-background/40 pl-11 pr-4 text-sm font-medium outline-none ring-1 ring-border/50 focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition",
              showFilters || from || to
                ? "gradient-brand text-primary-foreground"
                : "glass-soft text-muted-foreground",
            )}
            aria-label="Date filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {showFilters ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl bg-background/40 px-3 ring-1 ring-border/50">
              <span className="text-[10px] font-black uppercase text-muted-foreground">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-12 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-background/40 px-3 ring-1 ring-border/50">
              <span className="text-[10px] font-black uppercase text-muted-foreground">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-12 flex-1 bg-transparent text-xs font-bold outline-none"
              />
            </div>
          </div>
        ) : null}
      </div>

      <TxList rows={rows} empty="No records found in this category." />
    </div>
  );
}
