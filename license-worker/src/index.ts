// ============================================================
// PeakTools License Worker — Cloudflare Worker + D1
// Single endpoint powering license/payment for 100+ extensions
// ============================================================

export interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutBody {
  extensionSlug: string;
  plan: "monthly" | "annual" | "lifetime";
  email: string;
}

interface LicenseRow {
  id: number;
  email: string;
  extension_slug: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  active: number;
  created_at: string;
  expires_at: string | null;
}

interface ExtensionRow {
  slug: string;
  name: string;
  stripe_product_id: string | null;
  stripe_price_monthly: string | null;
  stripe_price_annual: string | null;
  stripe_price_lifetime: string | null;
}

// ---------------------------------------------------------------------------
// Rate limiter — simple in-memory per-IP, 60 req/min
// Resets on worker cold-start (acceptable for Workers model)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateBucket>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  bucket.count++;
  if (bucket.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

// Periodic cleanup so the map doesn't grow unbounded
function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap) {
    if (now >= bucket.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

// Known extension IDs — add new extensions here as they're published
const KNOWN_EXTENSION_IDS = new Set([
  'fepnibopopogakkkjaimedepnpkgcgbb', // CopyUnlock (Chrome Web Store)
]);

const ALLOWED_ORIGIN_PATTERNS = [
  // Only allow known Chrome extensions by ID
  (origin: string) => {
    const match = origin.match(/^chrome-extension:\/\/([a-z]+)$/);
    return match !== null && KNOWN_EXTENSION_IDS.has(match[1]);
  },
  // Firefox extensions use random UUIDs — allow all moz-extension:// for now
  (origin: string) => /^moz-extension:\/\//.test(origin),
  // Localhost for development only
  (origin: string) => /^https?:\/\/localhost(:\d+)?$/.test(origin),
  (origin: string) => /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin),
  // PeakTools website (for checkout redirects)
  (origin: string) => /^https:\/\/(www\.)?peaktools\.dev$/.test(origin),
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PATTERNS.some((check) => check(origin));
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  data: unknown,
  status: number,
  request: Request
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

function errorResponse(
  message: string,
  status: number,
  request: Request
): Response {
  return jsonResponse({ error: message }, status, request);
}

// ---------------------------------------------------------------------------
// Stripe helpers — raw fetch, no SDK (Workers-compatible)
// ---------------------------------------------------------------------------

const STRIPE_API_BASE = "https://api.stripe.com/v1";

async function stripeRequest(
  env: Env,
  method: string,
  path: string,
  body?: Record<string, string>
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${STRIPE_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const init: RequestInit = { method, headers };
  if (body) {
    init.body = new URLSearchParams(body).toString();
  }

  const resp = await fetch(url, init);
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

// Flatten nested objects into Stripe's bracket notation for form encoding.
// e.g. { "line_items[0][price]": "price_xxx", "line_items[0][quantity]": "1" }
function flattenForStripe(
  obj: Record<string, any>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenForStripe(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(result, flattenForStripe(item, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = String(item);
        }
      });
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stripe webhook signature verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  // Parse the Stripe-Signature header
  const parts = sigHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    },
    {} as Record<string, string>
  );

  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) {
    return false;
  }

  // Reject events older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (isNaN(age) || age > 300) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  // Convert to hex
  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Route: POST /api/checkout
// ---------------------------------------------------------------------------

async function handleCheckout(
  request: Request,
  env: Env
): Promise<Response> {
  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { extensionSlug, plan, email } = body;

  // Validate required fields
  if (!extensionSlug || !plan || !email) {
    return errorResponse(
      "Missing required fields: extensionSlug, plan, email",
      400,
      request
    );
  }

  // Validate plan
  if (!["monthly", "annual", "lifetime"].includes(plan)) {
    return errorResponse(
      'Invalid plan. Must be "monthly", "annual", or "lifetime"',
      400,
      request
    );
  }

  // Validate email (basic check)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Invalid email address", 400, request);
  }

  // Look up the extension's Stripe price IDs from D1
  const ext = await env.DB.prepare(
    "SELECT * FROM extensions WHERE slug = ?"
  )
    .bind(extensionSlug)
    .first<ExtensionRow>();

  if (!ext) {
    return errorResponse("Extension not found", 404, request);
  }

  // Get the price ID for the requested plan
  let priceId: string | null = null;
  switch (plan) {
    case "monthly":
      priceId = ext.stripe_price_monthly;
      break;
    case "annual":
      priceId = ext.stripe_price_annual;
      break;
    case "lifetime":
      priceId = ext.stripe_price_lifetime;
      break;
  }

  if (!priceId) {
    return errorResponse(
      `Plan "${plan}" is not configured for this extension`,
      400,
      request
    );
  }

  // Determine checkout mode — lifetime is a one-time payment, others are subscriptions
  const mode = plan === "lifetime" ? "payment" : "subscription";

  // Build the Stripe Checkout Session creation payload
  const checkoutParams: Record<string, any> = {
    mode,
    customer_email: email,
    "line_items": [
      { price: priceId, quantity: "1" },
    ],
    success_url: `https://peaktools.dev/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://peaktools.dev/cancel`,
    metadata: {
      extension_slug: extensionSlug,
      plan,
    },
  };

  // For subscriptions, allow promotion codes
  if (mode === "subscription") {
    checkoutParams.allow_promotion_codes = "true";
  }

  const flatParams = flattenForStripe(checkoutParams);
  const result = await stripeRequest(
    env,
    "POST",
    "/checkout/sessions",
    flatParams
  );

  if (!result.ok) {
    console.error("Stripe checkout error:", JSON.stringify(result.data));
    return errorResponse("Failed to create checkout session", 502, request);
  }

  return jsonResponse({ url: result.data.url }, 200, request);
}

// ---------------------------------------------------------------------------
// Route: POST /api/webhook
// ---------------------------------------------------------------------------

async function handleWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return errorResponse("Missing Stripe-Signature header", 400, request);
  }

  const rawBody = await request.text();

  // Verify the webhook signature
  const valid = await verifyStripeSignature(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) {
    return errorResponse("Invalid signature", 401, request);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return errorResponse("Invalid JSON", 400, request);
  }

  // Idempotency: check if we already processed this event
  const existing = await env.DB.prepare(
    "SELECT event_id FROM webhook_events WHERE event_id = ?"
  )
    .bind(event.id)
    .first();

  if (existing) {
    // Already processed, return 200 so Stripe doesn't retry
    return jsonResponse({ received: true, duplicate: true }, 200, request);
  }

  // Record this event as processed
  await env.DB.prepare(
    "INSERT INTO webhook_events (event_id, event_type) VALUES (?, ?)"
  )
    .bind(event.id, event.type)
    .run();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object, env);
        break;

      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object, env);
        break;

      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object, env);
        break;

      case "invoice.payment_failed":
        await onPaymentFailed(event.data.object, env);
        break;

      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Still return 200 so Stripe doesn't endlessly retry
    // The event is recorded; we can investigate and replay manually
  }

  return jsonResponse({ received: true }, 200, request);
}

async function onCheckoutCompleted(session: any, env: Env): Promise<void> {
  const email = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const subscriptionId = session.subscription; // null for one-time payments
  const metadata = session.metadata || {};
  const extensionSlug = metadata.extension_slug;
  const plan = metadata.plan;

  if (!email || !extensionSlug || !plan) {
    console.error(
      "checkout.session.completed missing required metadata:",
      JSON.stringify({ email, extensionSlug, plan })
    );
    return;
  }

  // Calculate expiry
  let expiresAt: string | null = null;
  const now = new Date();
  switch (plan) {
    case "monthly": {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      expiresAt = d.toISOString();
      break;
    }
    case "annual": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      expiresAt = d.toISOString();
      break;
    }
    case "lifetime":
      expiresAt = null; // never expires
      break;
  }

  // Upsert license: if user re-purchases, update the existing row
  await env.DB.prepare(
    `INSERT INTO licenses (email, extension_slug, plan, stripe_customer_id, stripe_subscription_id, active, expires_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(email, extension_slug) DO UPDATE SET
       plan = excluded.plan,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       active = 1,
       expires_at = excluded.expires_at`
  )
    .bind(
      email.toLowerCase(),
      extensionSlug,
      plan,
      customerId || null,
      subscriptionId || null,
      expiresAt
    )
    .run();
}

async function onSubscriptionDeleted(subscription: any, env: Env): Promise<void> {
  const subId = subscription.id;
  if (!subId) return;

  // Deactivate all licenses tied to this subscription
  await env.DB.prepare(
    "UPDATE licenses SET active = 0 WHERE stripe_subscription_id = ?"
  )
    .bind(subId)
    .run();
}

async function onSubscriptionUpdated(subscription: any, env: Env): Promise<void> {
  const subId = subscription.id;
  if (!subId) return;

  // Determine the new status
  const isActive = ["active", "trialing"].includes(subscription.status);

  // Get the current period end for expiry
  let expiresAt: string | null = null;
  if (subscription.current_period_end) {
    expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
  }

  // Determine the plan from the price interval
  let plan: string | null = null;
  const items = subscription.items?.data;
  if (items && items.length > 0) {
    const interval = items[0].price?.recurring?.interval;
    if (interval === "month") plan = "monthly";
    else if (interval === "year") plan = "annual";
  }

  // Build dynamic update
  if (plan) {
    await env.DB.prepare(
      `UPDATE licenses
       SET active = ?, expires_at = ?, plan = ?
       WHERE stripe_subscription_id = ?`
    )
      .bind(isActive ? 1 : 0, expiresAt, plan, subId)
      .run();
  } else {
    await env.DB.prepare(
      `UPDATE licenses
       SET active = ?, expires_at = ?
       WHERE stripe_subscription_id = ?`
    )
      .bind(isActive ? 1 : 0, expiresAt, subId)
      .run();
  }
}

async function onPaymentFailed(invoice: any, env: Env): Promise<void> {
  const subId = invoice.subscription;
  if (!subId) return;

  // On payment failure, we don't immediately deactivate.
  // Stripe will send subscription.deleted after all retries fail.
  // But we can log it or flag it for awareness.
  console.warn(`Payment failed for subscription ${subId}`);
}

// ---------------------------------------------------------------------------
// Route: POST /api/billing-portal
// ---------------------------------------------------------------------------

interface BillingPortalBody {
  email: string;
  extensionSlug: string;
}

async function handleBillingPortal(
  request: Request,
  env: Env
): Promise<Response> {
  let body: BillingPortalBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { email, extensionSlug } = body;

  if (!email || !extensionSlug) {
    return errorResponse(
      "Missing required fields: email, extensionSlug",
      400,
      request
    );
  }

  // Look up the user's Stripe customer ID from their license
  const license = await env.DB.prepare(
    `SELECT stripe_customer_id FROM licenses
     WHERE email = ? AND extension_slug = ? AND active = 1
     LIMIT 1`
  )
    .bind(email.toLowerCase(), extensionSlug)
    .first<{ stripe_customer_id: string | null }>();

  if (!license || !license.stripe_customer_id) {
    return errorResponse(
      "No active subscription found for this email",
      404,
      request
    );
  }

  // Create a Stripe Customer Portal session
  const result = await stripeRequest(env, "POST", "/billing_portal/sessions", {
    customer: license.stripe_customer_id,
    return_url: `https://peaktools.dev/copyunlock`,
  });

  if (!result.ok) {
    console.error("Stripe billing portal error:", JSON.stringify(result.data));
    return errorResponse("Failed to create billing portal session", 502, request);
  }

  return jsonResponse({ url: result.data.url }, 200, request);
}

// ---------------------------------------------------------------------------
// Route: GET /api/license?email={email}&ext={slug}
// ---------------------------------------------------------------------------

async function handleLicenseCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const ext = url.searchParams.get("ext");

  if (!email || !ext) {
    return errorResponse(
      "Missing required query params: email, ext",
      400,
      request
    );
  }

  const license = await env.DB.prepare(
    `SELECT plan, active, expires_at
     FROM licenses
     WHERE email = ? AND extension_slug = ? AND active = 1
     LIMIT 1`
  )
    .bind(email.toLowerCase(), ext)
    .first<{ plan: string; active: number; expires_at: string | null }>();

  if (!license) {
    return jsonResponse({ active: false }, 200, request);
  }

  // Check if the license has expired (for non-lifetime plans)
  if (license.expires_at) {
    const expiry = new Date(license.expires_at);
    if (expiry < new Date()) {
      // License expired — for subscriptions this shouldn't normally happen
      // since Stripe webhooks update the expiry, but handle it defensively.
      // Don't deactivate here (webhook is the source of truth), just report inactive.
      return jsonResponse({ active: false, reason: "expired" }, 200, request);
    }
  }

  return jsonResponse(
    {
      active: true,
      plan: license.plan,
      expiresAt: license.expires_at,
    },
    200,
    request
  );
}

// ---------------------------------------------------------------------------
// Route: GET /api/health
// ---------------------------------------------------------------------------

function handleHealth(request: Request): Response {
  return jsonResponse(
    { ok: true, timestamp: new Date().toISOString() },
    200,
    request
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  // Rate limiting
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return errorResponse("Rate limit exceeded. Try again later.", 429, request);
  }

  // Periodic rate limit cleanup (non-blocking)
  ctx.waitUntil(
    new Promise<void>((resolve) => {
      cleanupRateLimits();
      resolve();
    })
  );

  // Route matching
  try {
    // POST /api/checkout
    if (path === "/api/checkout" && method === "POST") {
      return await handleCheckout(request, env);
    }

    // POST /api/webhook
    if (path === "/api/webhook" && method === "POST") {
      return await handleWebhook(request, env);
    }

    // POST /api/billing-portal
    if (path === "/api/billing-portal" && method === "POST") {
      return await handleBillingPortal(request, env);
    }

    // GET /api/license
    if (path === "/api/license" && method === "GET") {
      return await handleLicenseCheck(request, env);
    }

    // GET /api/health
    if (path === "/api/health" && method === "GET") {
      return handleHealth(request);
    }

    // 404 for everything else
    return errorResponse("Not found", 404, request);
  } catch (err) {
    console.error("Unhandled error:", err);
    return errorResponse("Internal server error", 500, request);
  }
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
