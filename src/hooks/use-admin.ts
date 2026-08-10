import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

/** All admin queries. Only mount inside an admin-gated component. */
export function useAdminData() {
  const users = useQuery(api.admin.adminListUsers);
  const transactions = useQuery(api.transactions.adminListTransactions);
  const stats = useQuery(api.admin.adminGetStats);
  const threads = useQuery(api.chat.adminThreads);
  const rewardClaims = useQuery(api.rewards.adminListRewardClaims);
  const proofs = useQuery(api.proofs.adminListWithdrawalProofs);
  const leaderPlans = useQuery(api.leaderPlans.listLeaderPlans);
  const apiKeys = useQuery(api.admin.adminListApiKeys);
  const audit = useQuery(api.admin.adminAuditLog);
  const promos = useQuery(api.promoCodes.listPromoCodes);
  const plans = useQuery(api.plans.listPlans);

  return {
    users: users ?? [],
    transactions: transactions ?? [],
    stats: stats ?? null,
    threads: threads ?? [],
    rewardClaims: rewardClaims ?? [],
    proofs: proofs ?? [],
    leaderPlans: leaderPlans ?? [],
    apiKeys: apiKeys ?? [],
    audit: audit ?? [],
    promos: promos ?? [],
    plans: plans ?? [],
    loading:
      users === undefined ||
      transactions === undefined ||
      stats === undefined ||
      threads === undefined ||
      rewardClaims === undefined ||
      proofs === undefined ||
      leaderPlans === undefined ||
      apiKeys === undefined ||
      audit === undefined ||
      plans === undefined,
  };
}
