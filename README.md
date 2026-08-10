# HopeX — Investment Platform (Convex migration)

This project is a full migration of the old HopeX app (originally a Lovable +
Supabase project, see `faizanxviver/hopex`) onto this Freebuff stack: **Convex**
replaces Supabase for the database, and **Convex Auth** (password provider —
mobile number/email + password, no verification) replaces Supabase Auth. Old
user data was **not** migrated — every account starts fresh at Rs 0.

## Migration map (Supabase → Convex)

Every original table became a Convex table in `src/convex/schema.ts`:

| Supabase table | Convex table | File |
| --- | --- | --- |
| `auth.users` / `user_roles` | `users` (role field) | `auth.ts`, `profiles.ts` |
| `profiles` | `profiles` | `convex/profiles.ts` |
| `plans` | `plans` | `convex/plans.ts` |
| `investments` | `investments` | `convex/investments.ts` |
| `transactions` | `transactions` | `convex/transactions.ts` |
| `notifications` | `notifications` | `convex/notifications.ts` |
| `chat_messages` | `chatMessages` | `convex/chat.ts` |
| `promo_codes` | `promoCodes` | `convex/promoCodes.ts` |
| `settings` | `settings` (singleton) | `convex/settings.ts`, `seed.ts` |
| `payment_methods` | `paymentMethods` | `convex/admin.ts` |
| `audit_log` | `auditLog` | `convex/helpers.ts` |
| `reward_claims` | `rewardClaims` | `convex/rewards.ts` |
| `leader_plans` | `leaderPlans` | `convex/leaderPlans.ts` |
| `api_keys` | `apiKeys` | `convex/admin.ts` |
| `withdrawal_proofs` | `withdrawalProofs` | `convex/proofs.ts` |
| `checkout_sessions` | `checkoutSessions` | `convex/checkout.ts` (MPay gateway) |

SQL functions were ported 1:1 to Convex mutations, e.g.
`buy_plan()` → `api.investments.buyPlan`, `claim_earnings()` →
`api.investments.claimEarnings`, `claim_salary()` → `api.rewards.claimSalary`,
`handle_new_user()` → `api.profiles.ensureProfile`, `submit_reward_claim()` →
`api.rewards.submitRewardClaim`, `run_leader_plan_checks()` → the hourly cron in
`convex/crons.ts`, and `redeem_promo()` → `api.promoCodes.redeemPromo`.

## Key flows

- **Sign up / sign in** — `/auth` with login/signup tabs (full name, mobile
  number or email, password, optional referral code) — accounts are created
  instantly, no email verification (exactly like the original site). Profile +
  welcome notification are created automatically on first load (`useHope`
  bootstrap). Emails `admin@hopex.io` / `admin@aurum.io` are auto-promoted to
  admin.
- **Deposit** — the user picks an amount and is sent to the external **MPay
  gateway** (`https://mintage.site/checkout?token=...`). The gateway reads the
  order via `GET /checkout/session` and reports the paid proof back via
  `POST /checkout/submit` (protected by `GATEWAY_SHARED_SECRET`), which creates
  a processing deposit transaction; an admin approves it to credit the balance.
- **Invest** — `buyPlan` deducts the balance, credits day-1 income instantly and
  pays 4-level referral commissions (`settings.levels`).
- **Withdraw** — only during the configured PKT window, with a bound payout
  account and an active plan; funds are held until admin approval.
- **Rewards** — free reward task (WhatsApp + Facebook proofs) and weekly rank
  salary, both admin-reviewed with cooldowns.
- **Admin panel** — `/dashboard/admin`: overview, users, transactions, plans &
  promos, support chat, rewards/proofs, leader plans, site settings, payment
  methods, API keys, audit log.

## Pages

- Public: `/` landing, `/auth`, 404.
- App (protected by `RequireAuth` under `/dashboard`): dashboard, plans,
  deposit, deposit-history, withdraw, withdraw-history, transactions,
  investments, leaderboard, referrals, promo, salary, rewards, more, profile,
  admin.

Shared data comes from `src/hooks/use-hope.ts` (user-facing) and
`src/hooks/use-admin.ts` (admin); money/format helpers live in `src/lib/hopex.ts`.
All images (reward proofs, payout proofs, chat attachments) are uploaded to
**imgbb** via `api.upload.uploadImage` (admin-managed key pool in the admin
panel + `IMGBB_API_KEY` fallback) and stored as hosted URLs.

---

## Template overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.

Additional runtime secrets you should add via the Keys/API keys UI:

| Variable | Purpose |
| --- | --- |
| `GATEWAY_SHARED_SECRET` | Shared secret the MPay gateway must send as `x-gateway-key` when calling `POST /checkout/submit`. The gateway also needs the app's callback URL (`https://<deployment>.convex.site/checkout/session` and `/checkout/submit`). |
| `IMGBB_API_KEY` | Fallback imgbb key used when no keys are configured in the admin panel. |
| `SITE_URL` | The app's public origin (used for the gateway's `return_url`); defaults to `https://hopex.site`. |


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth uses the
**Password** provider (`src/convex/auth.ts`) — mobile number/email + password
with instant account creation (no email verification or OTP), matching the
original HopeX site.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`, which sends
signed-out users to `/auth?returnTo=<current route>`. Extend that page for the
product's authenticated experience, and reuse `RequireAuth` when adding another
protected route.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
