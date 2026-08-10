import { useAuth } from "@/hooks/use-auth";
import { rememberReferral } from "@/hooks/use-hope";
import { type Value } from "convex/values";
import { Gift, Loader2, Lock, Phone, User as UserIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

/**
 * Normalize the sign-in identifier exactly like the original app: emails are
 * lowercased as-is, mobile numbers become <digits>@hopex.pk so the same
 * account is reachable from any formatting of the phone.
 */
export function authEmail(identifier: string) {
  const raw = identifier.trim();
  if (raw.includes("@")) return raw.toLowerCase();
  return `${raw.replace(/\D/g, "")}@hopex.pk`;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Phone }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-input bg-background/40 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const isSignup = mode === "signup";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    ref: searchParams.get("ref") ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = form.phone.trim();
    const isEmail = identifier.includes("@");
    const digits = identifier.replace(/\D/g, "");
    const validId = isSignup
      ? digits.length >= 10
      : isEmail
        ? /\S+@\S+\.\S+/.test(identifier)
        : digits.length >= 10;
    if (!validId || form.password.length < 6) {
      toast.error(
        isSignup
          ? "Enter a valid mobile number and a password of at least 6 characters."
          : "Enter a valid mobile number or email and a password of at least 6 characters.",
      );
      return;
    }
    if (isSignup && form.name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const signUpOptions: Record<string, Value> = {
          flow: "signUp",
          identifier: authEmail(identifier),
          password: form.password,
          name: form.name.trim(),
          phone: identifier,
        };
        if (form.ref.trim()) signUpOptions.referredBy = form.ref.trim().toUpperCase();
        await signIn("password", signUpOptions);
        rememberReferral(form.ref);
        toast.success("Account created — welcome to HopeX!");
      } else {
        await signIn("password", {
          flow: "signIn",
          identifier: authEmail(identifier),
          password: form.password,
        });
        toast.success("Welcome back!");
      }
      navigate(redirect);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast.error(
        /invalid credentials|incorrect|password/i.test(msg)
          ? "Wrong mobile number / email or password."
          : msg,
      );
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="aurora" />
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand font-display text-sm font-black text-primary-foreground">
              H
            </span>
            <span className="font-display text-lg font-extrabold">HopeX</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            ← Home
          </Link>
        </div>

        <div className="glass glow rounded-3xl p-7">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/50 p-1">
            {(["login", "signup"] as const).map((m) => (
              <Link
                key={m}
                to={`/auth?mode=${m}`}
                className={cn(
                  "rounded-xl py-2 text-center text-sm font-semibold transition",
                  mode === m ? "gradient-cool text-primary-foreground shadow" : "text-muted-foreground",
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </Link>
            ))}
          </div>

          <h1 key={mode} className="animate-rise font-display text-2xl font-extrabold">
            {isSignup ? "Start earning today" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Just your name and mobile number — your account is verified instantly."
              : "Sign in with your mobile number or email."}
          </p>

          <form key={mode + "-form"} onSubmit={submit} className="animate-rise mt-6 space-y-3">
            {isSignup ? (
              <Field
                icon={UserIcon}
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
              />
            ) : null}
            <Field
              icon={Phone}
              type="text"
              inputMode={isSignup ? "tel" : "text"}
              placeholder={isSignup ? "Mobile number (03XX XXXXXXX)" : "Mobile number or email"}
              value={form.phone}
              onChange={set("phone")}
              autoComplete="username"
            />
            <Field
              icon={Lock}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            {isSignup ? (
              <Field
                icon={Gift}
                placeholder="Referral code (optional)"
                value={form.ref}
                onChange={set("ref")}
              />
            ) : null}
            <button
              disabled={loading || authLoading}
              className="btn-glass btn-glass-primary flex h-12 w-full items-center justify-center gap-2 text-base font-bold disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by bank-grade encryption. By continuing you agree to our terms and privacy
            policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
