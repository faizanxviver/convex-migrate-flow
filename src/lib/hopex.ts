import { Doc } from "@/convex/_generated/dataModel";

export type Profile = Doc<"profiles">;
export type Plan = Doc<"plans">;
export type Investment = Doc<"investments">;
export type Transaction = Doc<"transactions">;
export type AppNotification = Doc<"notifications">;
export type ChatMessage = Doc<"chatMessages">;
export type PaymentMethod = Doc<"paymentMethods">;
export type PromoCode = Doc<"promoCodes">;
export type Settings = Doc<"settings">;

export const DAY_MS = 86400000;

/** Every amount in HopeX is Pakistani Rupees. Whole amounts show without
 *  decimals (Rs 1,000 not Rs 1,000.00) so nothing gets cut off on mobile. */
export const money = (n: number) => {
  const v = Number(n || 0);
  return (
    "Rs " +
    v.toLocaleString("en-PK", {
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Exact daily income of a plan. Prefers the admin-set dailyAmount so the
 *  figure shown never drifts from what the admin entered; falls back to
 *  price × daily % (rounded) for older rows. */
export const planDaily = (p: { minAmount: number; dailyRoi: number; dailyAmount?: number }) =>
  p.dailyAmount !== undefined ? round2(p.dailyAmount) : round2((p.minAmount * p.dailyRoi) / 100);

/** Exact daily income of an active investment, rounded to paisa. */
export const investmentDaily = (i: { amount: number; dailyRoi: number }) =>
  round2((i.amount * i.dailyRoi) / 100);

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtDateTime = (ts: number) => `${fmtDate(ts)} · ${fmtTime(ts)}`;

/** Total funds deposited and approved by an admin. */
export function depositBalance(txs: Transaction[], userId: string) {
  return round2(
    txs
      .filter(
        (t) =>
          t.userId === userId &&
          t.type === "deposit" &&
          (t.status === "approved" || t.status === "completed"),
      )
      .reduce((a, t) => a + t.amount, 0),
  );
}

/**
 * Withdrawable balance = wallet balance minus the deposit principal that is
 * still locked (deposits not yet invested into plans). The moment a deposit
 * is invested, that amount stops being locked, so the first income credited
 * at activation shows up as withdrawable immediately.
 */
export function withdrawableBalance(
  balance: number,
  txs: Transaction[],
  invested: number,
  userId: string,
) {
  const locked = Math.max(0, depositBalance(txs, userId) - (Number(invested) || 0));
  return round2(Math.max(0, (Number(balance) || 0) - locked));
}

/**
 * Amount that can fund a new plan: any wallet funds that are backed by
 * deposits, capped by the current wallet balance. Once your deposits are
 * invested, earnings that land in the wallet can fund further plans too —
 * the wallet is the single pool, and it is always deposit-backed up to the
 * deposited total.
 */
export function investableBalance(
  balance: number,
  txs: Transaction[],
  _invested: number,
  userId: string,
) {
  const deposited = depositBalance(txs, userId);
  return round2(Math.max(0, Math.min(Number(balance) || 0, deposited)));
}

export function pendingDeposits(txs: Transaction[], userId: string) {
  return round2(
    txs
      .filter(
        (t) =>
          t.userId === userId &&
          t.type === "deposit" &&
          (t.status === "pending" || t.status === "processing"),
      )
      .reduce((a, t) => a + t.amount, 0),
  );
}

/** Investments that still have income cycles remaining. */
export function activeInvestments(investments: Investment[], userId: string) {
  return investments.filter((i) => {
    if (i.userId !== userId) return false;
    const daily = investmentDaily(i);
    if (daily <= 0) return false;
    return Math.round(i.earned / daily) < i.durationDays;
  });
}

/** Income accrued in real time since the last credited cycle (live ticker). */
export function liveEarnings(investments: Investment[], userId: string, atMs = Date.now()) {
  return activeInvestments(investments, userId).reduce((sum, i) => {
    const daily = investmentDaily(i);
    const elapsed = Math.max(0, atMs - i.lastPayoutAt);
    return sum + daily * Math.min(1, elapsed / DAY_MS);
  }, 0);
}

/** Milliseconds until the next automatic payout, or null. */
export function nextPayoutIn(investments: Investment[], userId: string, atMs = Date.now()) {
  const times = activeInvestments(investments, userId).map(
    (i) => i.lastPayoutAt + DAY_MS - atMs,
  );
  if (!times.length) return null;
  return Math.max(0, Math.min(...times));
}

/** Total daily income across every running plan. */
export function dailyIncome(investments: Investment[], userId: string) {
  return round2(activeInvestments(investments, userId).reduce((s, i) => s + investmentDaily(i), 0));
}

export function investmentProgress(inv: Investment) {
  const elapsed = (Date.now() - inv.startedAt) / DAY_MS;
  const pct = Math.min(100, (elapsed / inv.durationDays) * 100);
  return { pct, daysLeft: Math.max(0, Math.ceil(inv.durationDays - elapsed)) };
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Processing",
  processing: "Processing",
  approved: "Successful",
  completed: "Successful",
  rejected: "Declined",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

/** Pakistan Standard Time hour (UTC+5, no DST). */
export function pakistanHour(at = new Date()) {
  return (at.getUTCHours() + 5) % 24;
}

export function hour12(h: number) {
  const suffix = h >= 12 ? "PM" : "AM";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}:00 ${suffix}`;
}

export function isWithdrawWindowOpen(open: number, close: number, at = new Date()) {
  const h = pakistanHour(at);
  return h >= open && h < close;
}

export function pakistanClock(at = new Date()) {
  const h = pakistanHour(at);
  const m = at.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} PKT`;
}

export interface SalaryStatus {
  tiers: { rank: string; team: number; invested: number; salary: number }[];
  current: { rank: string; team: number; invested: number; salary: number } | null;
  next: { rank: string; team: number; invested: number; salary: number } | null;
  team: number;
  invested: number;
  lastClaimAt: number | null;
  nextClaimIn: number;
  claimable: boolean;
}

export function salaryStatus(
  user: Profile,
  txs: Transaction[],
  team: { invested: number }[],
  tiers: { rank: string; team: number; invested: number; salary: number }[],
  atMs = Date.now(),
): SalaryStatus {
  const sorted = [...tiers].sort((a, b) => a.invested - b.invested);
  const invested = team.reduce((sum, p) => sum + p.invested, 0);
  const reached = sorted.filter((t) => invested >= t.invested);
  const current = reached.length ? reached[reached.length - 1] : null;
  const next = sorted.find((t) => !reached.includes(t)) ?? null;

  const last = txs
    .filter((t) => t.userId === user.userId && t.type === "bonus" && (t.method ?? "").startsWith("Salary"))
    .map((t) => t.createdAt)
    .sort((a, b) => b - a)[0];

  const nextClaimIn = last ? Math.max(0, last + 7 * DAY_MS - atMs) : 0;

  return {
    tiers: sorted,
    current,
    next,
    team: team.length,
    invested,
    lastClaimAt: last ?? null,
    nextClaimIn,
    claimable: Boolean(current) && nextClaimIn === 0,
  };
}

export const TX_TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdraw: "Withdraw",
  investment: "Investment",
  commission: "Commission",
  bonus: "Bonus",
  payout: "Income",
};

export const txTypeLabel = (t: string) => TX_TYPE_LABEL[t] ?? t;

export function countdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "H";
