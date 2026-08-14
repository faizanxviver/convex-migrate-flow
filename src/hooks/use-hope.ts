import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

const THEME_KEY = "hopex-theme";

/** Theme with localStorage persistence (defaults to light). */
export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

/**
 * The single source of data for the HopeX app. Bootstraps the profile on first
 * sign-in (Convex equivalent of handle_new_user) and seeds reference data.
 */
export function useHope() {
  const ensureProfile = useMutation(api.profiles.ensureProfile);
  const seed = useMutation(api.seed.seedReferenceData);

  const me = useQuery(api.helpers.getMe);
  const profile = useQuery(api.profiles.getMyProfile);
  const plans = useQuery(api.plans.listPlans);
  const settings = useQuery(api.settings.getPublicSettings);
  const methods = useQuery(api.admin.listPaymentMethods);
  const transactions = useQuery(api.transactions.myTransactions);
  const investments = useQuery(api.investments.myInvestments);
  const notifications = useQuery(api.notifications.myNotifications);
  const unreadCount = useQuery(api.notifications.unreadCount);
  const chat = useQuery(api.chat.myChat);
  const network = useQuery(api.profiles.getNetwork);
  const leaderboard = useQuery(api.profiles.getLeaderboard);
  const rewardClaims = useQuery(api.rewards.myRewardClaims);
  const myProofs = useQuery(api.proofs.myWithdrawalProofs);
  const approvedProofs = useQuery(api.proofs.approvedProofs);
  const promos = useQuery(api.promoCodes.listPromoCodes);
  const leaderPlans = useQuery(api.leaderPlans.myLeaderPlans);
  // True when this user has a live push subscription (app installed + notifications
  // allowed) — used to hide the "Download the app" banner from app users.
  const myPushEnabled = useQuery(api.push.myPushEnabled);

  // Seed reference data (plans / settings / methods / promos) once per load.
  useEffect(() => {
    void seed({});
  }, [seed]);

  // Bootstrap the profile on every authenticated load — the mutation is
  // idempotent (it returns the existing profile) and re-applies operator
  // (admin) promotion, so reserved phones/emails get admin even if their
  // account was created before the operator list was updated.
  useEffect(() => {
    if (me?.user) {
      const ref = localStorage.getItem("hopex-referral") ?? undefined;
      void ensureProfile({ referredBy: ref }).then(() => {
        if (ref) localStorage.removeItem("hopex-referral");
      });
    }
  }, [me, ensureProfile]);

  const loading =
    profile === undefined ||
    plans === undefined ||
    settings === undefined ||
    methods === undefined ||
    transactions === undefined ||
    investments === undefined ||
    notifications === undefined;

  return {
    loading,
    me,
    user: me?.user ?? null,
    profile: profile ?? null,
    plans: plans ?? [],
    settings,
    methods: methods ?? [],
    transactions: transactions ?? [],
    investments: investments ?? [],
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    chat: chat ?? [],
    network: network ?? null,
    leaderboard: leaderboard ?? [],
    rewardClaims: rewardClaims ?? [],
    myProofs: myProofs ?? [],
    approvedProofs: approvedProofs ?? [],
    promos: promos ?? [],
    leaderPlans: leaderPlans ?? [],
    myPushEnabled: myPushEnabled ?? false,
  };
}

/** Store the referral code captured at signup so the profile bootstrap can use it. */
export function rememberReferral(code: string) {
  const clean = code.trim().toUpperCase();
  if (clean) localStorage.setItem("hopex-referral", clean);
}
