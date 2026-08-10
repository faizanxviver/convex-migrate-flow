import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const ALLOWED_ORIGINS = [
  "https://mintage.site",
  "https://www.mintage.site",
  "https://freebuff.com",
  "https://www.freebuff.com",
];

function corsHeaders(origin: string | null, methods: string) {
  const allow =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "content-type,x-gateway-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as Record<string, string>;
}

/** Constant-time string compare (no length leak beyond equality). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const TOKEN_RE = /^tk_[a-f0-9]{20,80}$/;

const sessionOptions = httpAction(async (ctx, request) => {
  const headers = corsHeaders(request.headers.get("origin"), "GET,OPTIONS");
  return new Response(null, { status: 204, headers });
});

const sessionGet = httpAction(async (ctx, request) => {
  const headers = {
    ...corsHeaders(request.headers.get("origin"), "GET,OPTIONS"),
    "content-type": "application/json",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!TOKEN_RE.test(token)) {
    return json({ status: "invalid", message: "Invalid token" }, 400);
  }

  const result = await ctx.runQuery(api.checkout.getCheckoutSession, { token });
  if (result.status === "invalid") return json(result, 404);
  if (result.status === "consumed") return json(result, 409);
  if (result.status === "expired") return json(result, 410);
  return json(result);
});

const submitOptions = httpAction(async (ctx, request) => {
  const headers = corsHeaders(request.headers.get("origin"), "POST,OPTIONS");
  return new Response(null, { status: 204, headers });
});

const submitPost = httpAction(async (ctx, request) => {
  const headers = {
    ...corsHeaders(request.headers.get("origin"), "POST,OPTIONS"),
    "content-type": "application/json",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  // Env secret wins; fall back to the admin-managed key pool (provider
  // "gateway") so the seeded secret works out of the box.
  let sharedKey = process.env["GATEWAY_SHARED_SECRET"] ?? "";
  if (!sharedKey) {
    sharedKey =
      (await ctx.runQuery(internal.upload.getGatewaySecretKey, {})) ?? "";
  }
  if (!sharedKey) {
    return json({ status: "misconfigured", message: "Gateway secret not configured" }, 503);
  }
  const provided =
    request.headers.get("x-gateway-key") ?? request.headers.get("x-gateway-secret") ?? "";
  if (!safeEqual(provided, sharedKey)) {
    return json({ status: "unauthorized", message: "Invalid gateway key" }, 401);
  }

  let parsed:
    | {
        token: string;
        method_name: string;
        proof_url: string;
        method_id?: string;
        gateway_reference?: string;
      }
    | null = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.token === "string" &&
      TOKEN_RE.test(body.token) &&
      typeof body.method_name === "string" &&
      body.method_name.trim().length > 0 &&
      typeof body.proof_url === "string" &&
      body.proof_url.length <= 500
    ) {
      parsed = {
        token: body.token,
        method_name: body.method_name.trim().slice(0, 60),
        proof_url: body.proof_url,
        method_id: typeof body.method_id === "string" ? body.method_id : undefined,
        gateway_reference:
          typeof body.gateway_reference === "string"
            ? body.gateway_reference.trim().slice(0, 60)
            : undefined,
      };
    }
  } catch {
    // invalid JSON → fall through to the 400 below
  }
  if (!parsed) return json({ status: "invalid", message: "Invalid request body" }, 400);

  try {
    const result = await ctx.runMutation(api.checkout.submitCheckout, {
      token: parsed.token,
      methodName: parsed.method_name,
      proofUrl: parsed.proof_url,
      methodId: parsed.method_id,
      gatewayReference: parsed.gateway_reference,
    });
    return json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "Unknown token") return json({ status: "invalid", message: "Unknown token" }, 404);
    if (msg === "Already submitted") return json({ status: "consumed", message: "Already submitted" }, 409);
    if (msg === "Session expired") return json({ status: "expired", message: "Session expired" }, 410);
    return json({ status: "error", message: msg }, 500);
  }
});

http.route({ path: "/checkout/session", method: "OPTIONS", handler: sessionOptions });
http.route({ path: "/checkout/session", method: "GET", handler: sessionGet });
http.route({ path: "/checkout/submit", method: "OPTIONS", handler: submitOptions });
http.route({ path: "/checkout/submit", method: "POST", handler: submitPost });

export default http;
