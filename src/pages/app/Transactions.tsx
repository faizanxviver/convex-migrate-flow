import { LedgerHeader, MoneyStat } from "@/components/hopex/glass";
import { TxList } from "@/components/hopex/tx-list";
import { useHope } from "@/hooks/use-hope";
import { money } from "@/lib/hopex";
import { ReceiptText, TrendingDown, TrendingUp } from "lucide-react";

export default function TransactionsPage() {
  const { transactions } = useHope();
  const incoming = transactions.filter((t) =>
    ["deposit", "commission", "bonus", "payout"].includes(t.type),
  );
  const outgoing = transactions.filter((t) => t.type === "withdraw" || t.type === "investment");

  return (
    <div className="space-y-4 pb-24">
      <LedgerHeader
        title="All transactions"
        subtitle="Your complete account ledger, newest first."
        icon={<ReceiptText className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <MoneyStat
          label="Money in"
          value={money(incoming.reduce((a, t) => a + t.amount, 0))}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MoneyStat
          label="Money out"
          value={money(outgoing.reduce((a, t) => a + t.amount, 0))}
          tone="primary"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      <TxList rows={transactions} empty="No transactions yet." />
    </div>
  );
}
