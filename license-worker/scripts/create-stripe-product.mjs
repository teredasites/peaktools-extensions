#!/usr/bin/env node
/**
 * Create Stripe Product + Prices for a PeakTools extension.
 *
 * Usage:
 *   node create-stripe-product.mjs --name "CopyUnlock" --slug copyunlock --monthly 3.99 --annual 29.99 --lifetime 49.99
 *
 * Requires STRIPE_SECRET_KEY env var (sk_live_...)
 */

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const name = getArg('name');
const slug = getArg('slug');
const monthly = parseFloat(getArg('monthly') || '0');
const annual = parseFloat(getArg('annual') || '0');
const lifetime = parseFloat(getArg('lifetime') || '0');
const SK = process.env.STRIPE_SECRET_KEY;

if (!name || !slug || !SK) {
  console.error('Usage: STRIPE_SECRET_KEY=sk_live_... node create-stripe-product.mjs --name "CopyUnlock" --slug copyunlock --monthly 3.99 --annual 29.99 --lifetime 49.99');
  process.exit(1);
}

async function stripe(endpoint, body) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`Stripe error: ${data.error.message}`);
    process.exit(1);
  }
  return data;
}

async function main() {
  console.log(`Creating Stripe product for ${name} (${slug})...\n`);

  // Create product
  const product = await stripe('/products', {
    name: `${name} Pro`,
    description: `${name} Chrome Extension — Pro tier`,
    'metadata[slug]': slug,
    'metadata[publisher]': 'PeakTools Publishing',
  });
  console.log(`Product: ${product.id}`);

  const prices = {};

  // Monthly price
  if (monthly > 0) {
    const p = await stripe('/prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(monthly * 100),
      recurring: JSON.stringify ? undefined : undefined,
      'recurring[interval]': 'month',
      'metadata[slug]': slug,
      'metadata[plan]': 'monthly',
    });
    prices.monthly = p.id;
    console.log(`Monthly ($${monthly}): ${p.id}`);
  }

  // Annual price
  if (annual > 0) {
    const p = await stripe('/prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(annual * 100),
      'recurring[interval]': 'year',
      'metadata[slug]': slug,
      'metadata[plan]': 'annual',
    });
    prices.annual = p.id;
    console.log(`Annual ($${annual}): ${p.id}`);
  }

  // Lifetime price (one-time)
  if (lifetime > 0) {
    const p = await stripe('/prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(lifetime * 100),
      'metadata[slug]': slug,
      'metadata[plan]': 'lifetime',
    });
    prices.lifetime = p.id;
    console.log(`Lifetime ($${lifetime}): ${p.id}`);
  }

  console.log('\n--- Add to extensions.json & D1 ---');
  console.log(JSON.stringify({
    slug,
    stripe_product_id: product.id,
    stripe_price_monthly: prices.monthly || null,
    stripe_price_annual: prices.annual || null,
    stripe_price_lifetime: prices.lifetime || null,
  }, null, 2));

  console.log('\n--- SQL to insert into D1 ---');
  console.log(`INSERT INTO extensions (slug, name, stripe_product_id, stripe_price_monthly, stripe_price_annual, stripe_price_lifetime)`);
  console.log(`VALUES ('${slug}', '${name}', '${product.id}', '${prices.monthly || ''}', '${prices.annual || ''}', '${prices.lifetime || ''}');`);
}

main().catch(console.error);
