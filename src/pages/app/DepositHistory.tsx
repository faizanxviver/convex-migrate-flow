import { LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { TxList } from "@/components/hopex/tx-list";
import { useHope } from "@/hooks/use-hope";
import { money } from "@/lib/hopex";
import { ArrowDownLeft, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Link } from "react-router";

export default function DepositHistoryPage() {
  const { transactions, profile } = useHope();
  const rows = transactions.filter((tx) => tx.type === "deposit");
  const successful = rows.filter((r) => r.status === "approved" || r.status === "completed");
  const processing = rows.filter((r) => r.status === "pending" || r.status === "processing");

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Deposit history"
        subtitle="Audit every top-up request and its current status."
        icon={<ArrowDownLeft className="h-5 w-5" />}
        action={
          <Link
            to="/dashboard/deposit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-primary-foreground shadow-lg shadow-primary/20"
            aria-label="New deposit"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label="Successful"
          value={money(successful.reduce((a, r) => a + r.amount, 0))}
          tone="success"
          count={successful.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MoneyStat
          label="Processing"
          value={money(processing.reduce((a, r) => a + r.amount, 0))}
          tone="primary"
          count={processing.length}
          icon={<Loader2 className="h-4 w-4" />}
        />
      </div>

      <TxList
        rows={rows}
        empty={
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">No deposits yet.</p>
            <Link
              to="/dashboard/deposit"
              className="inline-flex h-11 items-center rounded-2xl gradient-brand px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              Make your first deposit
            </Link>
          </div>
        }
      />
    </div>
  );
}
