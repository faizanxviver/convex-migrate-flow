import { LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { TxList } from "@/components/hopex/tx-list";
import { useHope } from "@/hooks/use-hope";
import { money } from "@/lib/hopex";
import { ArrowUpRight, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Link } from "react-router";

export default function WithdrawHistoryPage() {
  const { transactions } = useHope();
  const rows = transactions.filter((tx) => tx.type === "withdraw");
  const paid = rows.filter((r) => r.status === "completed" || r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending" || r.status === "processing");

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="Withdraw history"
        subtitle="Track every payout request and its status."
        icon={<ArrowUpRight className="h-5 w-5" />}
        action={
          <Link
            to="/dashboard/withdraw"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-cool text-primary-foreground shadow-lg shadow-primary/20"
            aria-label="New withdrawal"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label="Paid out"
          value={money(paid.reduce((a, r) => a + r.amount, 0))}
          tone="success"
          count={paid.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MoneyStat
          label="Pending"
          value={money(pending.reduce((a, r) => a + r.amount, 0))}
          tone="gold"
          count={pending.length}
          icon={<Loader2 className="h-4 w-4" />}
        />
      </div>

      <TxList rows={rows} empty="No withdrawals yet." />
    </div>
  );
}
