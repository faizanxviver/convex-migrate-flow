import { api } from "@/convex/_generated/api";
import { GlassCard, SectionTitle } from "@/components/hopex/glass";
import { useHope, useTheme } from "@/hooks/use-hope";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  BadgeCheck,
  Clock,
  Languages,
  Lock,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const PAYOUT_METHODS = [
  { id: "JazzCash", icon: Smartphone },
  { id: "Easypaisa", icon: Wallet },
] as const;

export default function ProfilePage() {
  const { profile, user } = useHope();
  const { theme, toggleTheme } = useTheme();
  const updateProfile = useMutation(api.profiles.updateProfile);
  const { t } = useT(profile?.language ?? "en");

  const [lang, setLang] = useState(profile?.language ?? "en");

  if (!profile || !user) return null;

  const setLanguage = async (l: "en" | "ur") => {
    setLang(l);
    try {
      await updateProfile({ language: l });
      toast.success(l === "ur" ? "زبان اردو کر دی گئی۔" : "Language set to English.");
    } catch {
      toast.error("Could not update language");
    }
  };

  return (
    <div>
      <SectionTitle title={t("Profile & settings")} subtitle={t("Your account details, payout account and preferences.")} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Personal details */}
        <GlassCard>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand font-display font-black text-primary-foreground">
              {profile.name[0]}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{t("Personal details")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("Locked for your security — contact support to change these.")}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { label: t("Full name"), value: profile.name, icon: UserRound },
              { label: t("Mobile number"), value: profile.phone ?? "—", icon: Smartphone },
              { label: t("Referral code"), value: profile.referralCode, icon: BadgeCheck },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-2xl glass-soft px-4 py-3">
                <f.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">{f.label}</span>
                  <span className="block truncate text-sm font-semibold">{f.value}</span>
                </span>
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Payout account */}
        <PayoutAccountCard />

        {/* Preferences */}
        <GlassCard>
          <h2 className="text-lg font-bold">{t("Preferences")}</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl glass-soft px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
                <p className="text-sm font-semibold">{theme === "dark" ? t("Light mode") : t("Dark mode")}</p>
              </div>
              <button
                onClick={toggleTheme}
                className={cn(
                  "relative h-7 w-12 rounded-full transition",
                  theme === "dark" ? "bg-primary" : "bg-muted",
                )}
                aria-label="Toggle theme"
              >
                <span
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
                    theme === "dark" ? "left-6" : "left-1",
                  )}
                />
              </button>
            </div>

            <div className="rounded-xl glass-soft px-4 py-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" /> {t("Language")}
              </p>
              <div className="flex gap-2">
                {(
                  [
                    { id: "en", label: "English" },
                    { id: "ur", label: "اردو" },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => void setLanguage(l.id)}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
                      lang === l.id ? "btn-glass btn-glass-primary" : "glass-soft text-muted-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <Link
              to="/dashboard/investments"
              className="flex items-center justify-between rounded-xl glass-soft px-4 py-3 transition hover:bg-accent"
            >
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                {t("Active plans")}
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to="/dashboard/withdraw-history"
              className="flex items-center justify-between rounded-xl glass-soft px-4 py-3 transition hover:bg-accent"
            >
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
                  <Wallet className="h-4 w-4" />
                </span>
                {t("Withdraw history")}
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t("Security")}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            You sign in with a one-time code sent to your email. For password access, sign in with
            email + password on the login screen.
          </p>
          <div className="mt-4 rounded-2xl glass-soft p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">KYC status: {profile.kyc.replace("_", " ")}</p>
            <p className="mt-1">
              {profile.verified ? "Account verified ✓" : "Account not verified"}
              {profile.blocked ? " · ⚠ Blocked — contact support" : ""}
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/** Bind / change the single account every payout is sent to. */
export function PayoutAccountCard() {
  const { profile } = useHope();
  const updatePayout = useMutation(api.profiles.updatePayoutAccount);
  const { t } = useT(profile?.language ?? "en");
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<string>(profile?.bankName || PAYOUT_METHODS[0].id);
  const [holder, setHolder] = useState(profile?.accountName ?? "");
  const [account, setAccount] = useState(profile?.accountNumber ?? "");

  if (!profile) return null;
  const bound = Boolean(profile.accountNumber && profile.accountName);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (holder.trim().length < 3) return toast.error("Enter the account holder name.");
    if (!/^\d{10,15}$/.test(account.trim().replace(/\D/g, "")))
      return toast.error("Enter a valid mobile account number.");
    try {
      await updatePayout({ method, holder: holder.trim(), account: account.trim() });
      setEditing(false);
      toast.success("Payout account saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not save account");
    }
  };

  return (
    <GlassCard>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Wallet className="h-4 w-4 text-gold" /> {t("Payout account")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Every withdrawal is sent to this account only.")}
      </p>

      {bound && !editing ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl glass-soft p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{profile.bankName}</p>
            <p className="mt-1 font-display text-lg font-extrabold">{profile.accountName}</p>
            <p className="font-mono text-sm text-muted-foreground">{profile.accountNumber}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="btn-glass flex h-11 w-full items-center justify-center text-sm font-semibold text-foreground"
          >
            {t("Change account")}
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PAYOUT_METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition",
                  method === m.id ? "border-primary bg-primary/10" : "border-border glass-soft",
                )}
              >
                <m.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{m.id}</span>
              </button>
            ))}
          </div>
          <input
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder={t("Account holder name")}
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            inputMode="numeric"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="03XXXXXXXXX"
            className="h-12 w-full rounded-xl border border-input bg-background/40 px-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            {bound ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-glass flex h-12 flex-1 items-center justify-center text-sm font-semibold text-foreground"
              >
                {t("Cancel")}
              </button>
            ) : null}
            <button className="btn-glass btn-glass-primary flex h-12 flex-1 items-center justify-center text-sm font-bold">
              {t("Save account")}
            </button>
          </div>
        </form>
      )}
    </GlassCard>
  );
}
