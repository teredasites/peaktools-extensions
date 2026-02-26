# PeakTools License Worker — MASTERFILE

## What It Does

A single Cloudflare Worker that powers license verification and payment processing for **all** PeakTools Chrome extensions (100+). It sits between Stripe and the extensions, handling:

1. **Checkout** -- Creates Stripe Checkout sessions so users can purchase plans.
2. **Webhooks** -- Receives Stripe events to create, update, and deactivate licenses automatically.
3. **License checks** -- Extensions call this endpoint to verify if a user has an active license.

Everything is stored in a Cloudflare D1 (SQLite) database. No external databases or servers needed.

---

## Architecture

```
Chrome Extension  -->  GET /api/license?email=...&ext=...  -->  Worker  -->  D1
       |
       v
User clicks "Upgrade"
       |
       v
POST /api/checkout  -->  Worker  -->  Stripe Checkout
       |
       v
Stripe sends webhook  -->  POST /api/webhook  -->  Worker  -->  D1
```

---

## All Routes

### `POST /api/checkout`

Creates a Stripe Checkout session.

**Request:**
```json
{
  "extensionSlug": "copyunlock",
  "plan": "monthly",
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_live_..."
}
```

**Errors:**
- `400` -- Missing fields, invalid plan, invalid email, plan not configured for extension
- `404` -- Extension slug not found in the `extensions` table
- `502` -- Stripe API error

**Notes:**
- `plan` must be `"monthly"`, `"annual"`, or `"lifetime"`
- Lifetime plans use Stripe's `payment` mode (one-time charge)
- Monthly/annual plans use Stripe's `subscription` mode
- The extension's Stripe Price IDs must be configured in the `extensions` D1 table

---

### `POST /api/webhook`

Receives Stripe webhook events. **Do not call this manually.**

**Headers required:**
- `Stripe-Signature` -- Stripe's HMAC signature header

**Events handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates or updates a license in D1 (active = 1) |
| `customer.subscription.deleted` | Deactivates the license (active = 0) |
| `customer.subscription.updated` | Updates plan, expiry, and active status |
| `invoice.payment_failed` | Logs warning (Stripe retries automatically) |

**Response (200):**
```json
{
  "received": true
}
```

**Duplicate protection:** Each event ID is stored in the `webhook_events` table. If the same event is received twice, it returns `{ "received": true, "duplicate": true }` without reprocessing.

---

### `GET /api/license?email={email}&ext={slug}`

License check endpoint. Called by extensions to verify if a user has an active license.

**Request:**
```
GET /api/license?email=user@example.com&ext=copyunlock
```

**Response (active):**
```json
{
  "active": true,
  "plan": "monthly",
  "expiresAt": "2026-03-26T00:00:00.000Z"
}
```

**Response (no license or expired):**
```json
{
  "active": false
}
```

**Notes:**
- Lifetime plans return `"expiresAt": null`
- CORS is enabled for `chrome-extension://` and `moz-extension://` origins
- Email comparison is case-insensitive (lowercased on write and query)

---

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2026-02-26T12:00:00.000Z"
}
```

---

## How to Deploy

### 1. Prerequisites

- Node.js 18+
- Cloudflare account with Workers and D1 enabled
- Stripe account with products/prices created
- Wrangler CLI (`npm install -g wrangler`)

### 2. Install dependencies

```bash
cd license-worker
npm install
```

### 3. Create the D1 database

```bash
wrangler d1 create peaktools-licenses
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "peaktools-licenses"
database_id = "YOUR-DATABASE-ID-HERE"
```

### 4. Initialize the schema

```bash
npm run db:init
```

### 5. Set secrets

```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste your Stripe secret key (sk_live_...)

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste your Stripe webhook signing secret (whsec_...)
```

### 6. Deploy

```bash
npm run deploy
```

### 7. Configure Stripe webhook

In the Stripe Dashboard:
1. Go to **Developers > Webhooks**
2. Add endpoint: `https://peaktools-license.YOUR-SUBDOMAIN.workers.dev/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
4. Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET` (step 5 above)

---

## How to Add a New Extension

### 1. Create products in Stripe

In the Stripe Dashboard, create a Product for the extension with up to 3 prices:
- **Monthly** recurring price
- **Annual** recurring price
- **Lifetime** one-time price

Note the Price IDs (`price_...`).

### 2. Insert into the `extensions` table

Use Wrangler to run SQL against D1:

```bash
wrangler d1 execute peaktools-licenses --command "INSERT INTO extensions (slug, name, stripe_product_id, stripe_price_monthly, stripe_price_annual, stripe_price_lifetime) VALUES ('my-extension', 'My Extension', 'prod_XXXXX', 'price_MONTHLY', 'price_ANNUAL', 'price_LIFETIME');"
```

That is it. The extension is now live. Users can purchase via `/api/checkout` and the extension can verify via `/api/license`.

---

## How Extensions Call the License API

### From a Chrome Extension (background script or content script):

```javascript
const WORKER_URL = "https://peaktools-license.YOUR-SUBDOMAIN.workers.dev";

// Check license
async function checkLicense(email) {
  const resp = await fetch(
    `${WORKER_URL}/api/license?email=${encodeURIComponent(email)}&ext=my-extension`
  );
  const data = await resp.json();
  return data.active === true;
}

// Open checkout
async function openCheckout(email, plan) {
  const resp = await fetch(`${WORKER_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extensionSlug: "my-extension",
      plan: plan,       // "monthly" | "annual" | "lifetime"
      email: email,
    }),
  });
  const data = await resp.json();
  if (data.url) {
    chrome.tabs.create({ url: data.url });
  }
}
```

### Recommended caching strategy:

1. Check license on extension install/startup
2. Cache the result in `chrome.storage.local` with a TTL (e.g., 24 hours)
3. Re-check on each browser session start or when the user opens settings
4. Never block extension functionality on a network call -- use the cached value

---

## D1 Schema Explanation

### `licenses` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `email` | TEXT | User's email (lowercased) |
| `extension_slug` | TEXT | Which extension this license is for |
| `plan` | TEXT | `monthly`, `annual`, or `lifetime` |
| `stripe_customer_id` | TEXT | Stripe Customer ID for this user |
| `stripe_subscription_id` | TEXT | Stripe Subscription ID (null for lifetime) |
| `active` | INTEGER | 1 = active, 0 = deactivated |
| `created_at` | TEXT | ISO timestamp when license was first created |
| `expires_at` | TEXT | ISO timestamp when license expires (null for lifetime) |

**Unique constraint:** `(email, extension_slug)` -- one license per user per extension.

### `extensions` table

| Column | Type | Description |
|--------|------|-------------|
| `slug` | TEXT | Primary key, URL-safe identifier (e.g., `copyunlock`) |
| `name` | TEXT | Human-readable name |
| `stripe_product_id` | TEXT | Stripe Product ID |
| `stripe_price_monthly` | TEXT | Stripe Price ID for monthly plan |
| `stripe_price_annual` | TEXT | Stripe Price ID for annual plan |
| `stripe_price_lifetime` | TEXT | Stripe Price ID for lifetime plan |

### `webhook_events` table

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | TEXT | Stripe event ID (primary key, for idempotency) |
| `event_type` | TEXT | Event type string |
| `processed_at` | TEXT | When we processed it |

Periodically clean up old events:
```sql
DELETE FROM webhook_events WHERE processed_at < datetime('now', '-7 days');
```

---

## Rate Limiting

Basic in-memory rate limiter: **60 requests per minute per IP**. Resets when the Worker cold-starts (which is fine for the Workers execution model -- each isolate has its own counter). This protects against casual abuse. For production hardening, consider adding Cloudflare Rate Limiting rules in the dashboard.

---

## Security Notes

- Stripe webhook signatures are verified using HMAC-SHA256 with constant-time comparison
- Events older than 5 minutes are rejected (replay protection)
- Duplicate events are detected and skipped (idempotency table)
- Error responses never expose internal details
- CORS is restricted to `chrome-extension://`, `moz-extension://`, and `localhost` origins
- Stripe secret key is stored as a Wrangler secret (never in code or `wrangler.toml`)
- Email is lowercased before storage and query to prevent case-sensitivity issues
