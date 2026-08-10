import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Value } from "convex/values";

/**
 * HopeX uses mobile number / email + password accounts — exactly like the
 * original Supabase auth. No email verification or OTP is required: signing in
 * with a new identifier creates the account instantly ("signUp" flow), and
 * signing in with an existing one validates the password ("signIn" flow).
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // The original app accepted passwords of at least 6 characters.
      validatePasswordRequirements: (password) => {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
      },
      // Carry the sign-up details into the users row so the profile bootstrap
      // (ensureProfile) can pick up name, phone and referral code on first load.
      profile(params) {
        const identifier =
          typeof params.identifier === "string" ? params.identifier : "";
        const fields: Record<string, Value> = { email: identifier };
        if (typeof params.name === "string" && params.name.trim())
          fields.name = params.name.trim();
        if (typeof params.phone === "string" && params.phone.trim())
          fields.phone = params.phone.trim();
        if (typeof params.referredBy === "string" && params.referredBy.trim())
          fields.referredBy = params.referredBy.trim().toUpperCase();
        // email is always set above; the remaining keys are only added when
        // non-empty, so the runtime object always satisfies `{ email: string }`.
        return fields as { email: string } & Record<string, Value>;
      },
    }),
  ],
});
