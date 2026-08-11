import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { addTransaction, pushNotification, requireUser } from "./helpers";

const GATEWAY_BASE = "https://mintage.site";
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes, like the original table default

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `tk_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Never point the gateway's "return to site" at a Convex API domain
 * (*.convex.site / *.convex.cloud) — those only serve API routes and would
 * show "No matching routes found" to the user. Accepts bare https?:// origins.
 */
function cleanReturnBase(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = raw.trim();
  if (!/^https?:\/\/[^/\s]+$/.test(s)) return "";
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".convex.site") || host.endsWith(".convex.cloud")) return "";
    return u.origin;
  } catch {
    return "";
  }
}

function orderNo() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `HX${stamp}${suffix}`;
}

/**
 * Creates a one-time checkout session and returns the external gateway URL.
 * The amount is stored server-side; the gateway can only read it through the
 * token — the exact behaviour of the original createCheckoutSession server fn.
 */
export const createSession = mutation({
  args: { amount: v.number(), siteUrl: v.optional(v.string()) },
  handler: async (ctx, { amount, siteUrl }) => {
    const userId = await requireUser(ctx);

    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
    if (amt > 10_000_000) throw new Error("Amount is too large");

    const token = randomToken();
    const order = orderNo();
    const now = Date.now();

    await ctx.db.insert("checkoutSessions", {
      token,
      orderNo: order,
      userId,
      amount: amt,
      status: "created",
      // Where the user actually is (browser origin) — used for the gateway's
      // "return to site" link. Convex API domains are rejected on the way in.
      siteUrl: cleanReturnBase(siteUrl) || undefined,
      expiresAt: now + SESSION_TTL_MS,
      createdAt: now,
      updatedAt: now,
    });

    return {
      token,
      orderNo: order,
      url: `${GATEWAY_BASE}/checkout?token=${encodeURIComponent(token)}`,
    };
  },
});

/**
 * Public session lookup used by the gateway (GET /checkout/session). Returns
 * the order details plus the active payment methods the gateway can display.
 */
export const getCheckoutSession = query({
  args: { token: v.string(), siteOrigin: v.optional(v.string()) },
  handler: async (ctx, { token, siteOrigin }) => {
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session) return { status: "invalid", message: "Unknown token" } as const;
    if (session.status !== "created") {
      return { status: "consumed", message: "This checkout was already completed" } as const;
    }
    if (session.expiresAt < Date.now()) {
      return { status: "expired", message: "This checkout session has expired" } as const;
    }

    const methods = await ctx.db.query("paymentMethods").collect();
    const active = methods.filter((m) => m.active).sort((a, b) => a.sortOrder - b.sortOrder);

    // Return-to-site URL: explicit SITE_URL wins, then the origin stored when
    // the session was created (the browser the user was actually in), then the
    // origin the gateway called us from, then the legacy domain as a last
    // resort. Every candidate is filtered so a Convex API domain (*.convex.site
    // / *.convex.cloud) can never leak into the return link.
    const base =
      cleanReturnBase(process.env.SITE_URL) ||
      cleanReturnBase(session.siteUrl) ||
      cleanReturnBase(siteOrigin) ||
      "https://hopex.site";

    return {
      status: "ok",
      token: session.token,
      order_no: session.orderNo,
      amount: session.amount,
      currency: "PKR",
      merchant_name: "HopeX",
      return_url: `${base}/dashboard/deposit-history`,
      expires_at: session.expiresAt,
      methods: active.map((m) => ({
        id: m._id,
        name: m.name,
        account_name: m.accountName,
        account_number: m.accountNumber,
        instructions: m.instructions,
        logo_url: m.imageUrl,
      })),
    };
  },
});

/**
 * Gateway callback (POST /checkout/submit). Marks the session submitted,
 * creates the processing deposit transaction and notifies the user — the exact
 * port of the original submit API route.
 */
export const submitCheckout = mutation({
  args: {
    token: v.string(),
    methodName: v.string(),
    proofUrl: v.string(),
    methodId: v.optional(v.string()),
    gatewayReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session) throw new Error("Unknown token");
    if (session.status !== "created") throw new Error("Already submitted");
    if (session.expiresAt < Date.now()) {
      await ctx.db.patch(session._id, { status: "expired", updatedAt: Date.now() });
      throw new Error("Session expired");
    }

    const amount = Number(session.amount);
    const reference = args.gatewayReference || session.orderNo;

    const txId = await addTransaction(ctx, session.userId, {
      type: "deposit",
      amount,
      method: args.methodName,
      status: "processing",
      reference,
      proofUrl: args.proofUrl,
      note: `MPay auto gateway · order ${session.orderNo}`,
    });

    await ctx.db.patch(session._id, {
      status: "submitted",
      methodId: args.methodId,
      methodName: args.methodName,
      proofUrl: args.proofUrl,
      gatewayReference: reference,
      transactionId: txId,
      updatedAt: Date.now(),
    });

    await pushNotification(
      ctx,
      session.userId,
      "MPay deposit received",
      `Rs ${amount.toLocaleString("en-PK")} via ${args.methodName} (MPay) is being verified.`,
      "info",
      false,
    );

    return { status: "ok", reference, amount };
  },
});
