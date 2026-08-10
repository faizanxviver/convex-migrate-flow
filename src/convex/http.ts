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
    "Access-Control-Allow-Headers": "content-type,x-gateway-key,x-gateway-secret,authorization",
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

/** Strip an arbitrary Origin/Referer down to a bare https?://host. */
function siteOriginOf(raw: string | null): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
}

/** Accept JSON or form-encoded bodies — whichever the gateway sends. */
async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const raw = await request.clone().text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // not JSON — fall through to form encoding
  }
  try {
    const params = new URLSearchParams(raw);
    const out: Record<string, unknown> = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

/** Read the gateway shared key from headers, Bearer auth or the body. */
async function gatewayKeyFrom(request: Request): Promise<string> {
  const header =
    request.headers.get("x-gateway-key") ??
    request.headers.get("x-gateway-secret") ??
    "";
  if (header) return header.trim();
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  try {
    const body = await parseBody(request);
    const k = body?.["gateway_key"] ?? body?.["secret"] ?? body?.["key"];
    return typeof k === "string" ? k.trim() : "";
  } catch {
    return "";
  }
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

  // Best-effort site origin so the gateway's "return to site" lands on the
  // app that created the checkout (SITE_URL env still wins in the query).
  const siteOrigin =
    siteOriginOf(request.headers.get("origin")) ||
    siteOriginOf(request.headers.get("referer")) ||
    "";

  const result = await ctx.runQuery(api.checkout.getCheckoutSession, { token, siteOrigin });
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

  // Secret resolution: env var → admin-managed key pool → whatever the
  // gateway sent (header / Bearer / body field).
  let sharedKey = process.env["GATEWAY_SHARED_SECRET"] ?? "";
  if (!sharedKey) {
    sharedKey =
      (await ctx.runQuery(internal.upload.getGatewaySecretKey, {})) ?? "";
  }
  if (!sharedKey) {
    return json({ status: "misconfigured", message: "Gateway secret not configured" }, 503);
  }
  const provided = await gatewayKeyFrom(request);
  if (!safeEqual(provided, sharedKey)) {
    return json({ status: "unauthorized", message: "Invalid gateway key" }, 401);
  }

  const body = await parseBody(request);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const token = str(body?.["token"]);
  const methodName = str(body?.["method_name"]).trim();
  const proofUrl = str(body?.["proof_url"]);
  if (!TOKEN_RE.test(token) || !methodName || proofUrl.length === 0 || proofUrl.length > 500) {
    return json({ status: "invalid", message: "Invalid request body" }, 400);
  }

  try {
    const result = await ctx.runMutation(api.checkout.submitCheckout, {
      token,
      methodName: methodName.slice(0, 60),
      proofUrl,
      methodId: str(body?.["method_id"]).trim().slice(0, 80) || undefined,
      gatewayReference: str(body?.["gateway_reference"]).trim().slice(0, 60) || undefined,
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

// Modern paths plus the original `/api/public/checkout/*` aliases, so the
// gateway keeps working whether it is pointed at the new or the old-style
// callback URL.
for (const base of ["/checkout", "/api/public/checkout"]) {
  http.route({ path: `${base}/session`, method: "OPTIONS", handler: sessionOptions });
  http.route({ path: `${base}/session`, method: "GET", handler: sessionGet });
  http.route({ path: `${base}/submit`, method: "OPTIONS", handler: submitOptions });
  http.route({ path: `${base}/submit`, method: "POST", handler: submitPost });
}

export default http;
