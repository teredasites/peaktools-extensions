-- ============================================================
-- PeakTools License Worker — D1 Schema
-- ============================================================
-- Run with: npm run db:init
-- Or:       wrangler d1 execute peaktools-licenses --file=schema.sql
-- ============================================================

-- Licenses table: one row per (user, extension) pair
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  extension_slug TEXT NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('monthly', 'annual', 'lifetime')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  UNIQUE(email, extension_slug)
);

-- Fast lookups by email
CREATE INDEX IF NOT EXISTS idx_license_email ON licenses(email);

-- Fast lookups by extension
CREATE INDEX IF NOT EXISTS idx_license_ext ON licenses(extension_slug);

-- Composite index for the license-check query
CREATE INDEX IF NOT EXISTS idx_license_lookup ON licenses(email, extension_slug, active);

-- Index for subscription ID lookups (webhook handling)
CREATE INDEX IF NOT EXISTS idx_license_stripe_sub ON licenses(stripe_subscription_id);

-- Index for customer ID lookups (webhook handling)
CREATE INDEX IF NOT EXISTS idx_license_stripe_cust ON licenses(stripe_customer_id);

-- Extensions table: maps slugs to Stripe product/price IDs
CREATE TABLE IF NOT EXISTS extensions (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_product_id TEXT,
  stripe_price_monthly TEXT,
  stripe_price_annual TEXT,
  stripe_price_lifetime TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Webhook events table: idempotency guard against duplicate Stripe events
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clean up old webhook events periodically (events older than 7 days)
-- Run manually or via cron: DELETE FROM webhook_events WHERE processed_at < datetime('now', '-7 days');
