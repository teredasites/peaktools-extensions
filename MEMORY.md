# Chrome Extensions Project — Session Memory

## Google Chrome Web Store OAuth (PeakTools Publishing)

**Publisher Name**: PeakTools Publishing
**Google Cloud Project**: PeakTools (project number: 1007179758652)
**OAuth Scope**: `https://www.googleapis.com/auth/chromewebstore`

### Credentials (stored in `.env.chrome`)
- **Client ID**: `1007179758652-466dr7gkh3t2nvea4mb9u5ckr62r8ohn.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Refresh Token**: `1//05UOCbsJLCrXqCgYIARAAGAUSNwF-L9IrSK5-95PjMrl5jTOngxNv1XZLAs7NASqbSwdkUadv9-eSm8ERnbfOdqL8NJG2jrYEKg4`
- **Redirect URI**: `http://localhost:8844`

### OAuth Callback Script
- `_oauth_callback.js` — Node.js script that runs local server on port 8844, exchanges auth code for refresh token, saves to `.env.chrome`

### What This Enables
- Upload new extensions to Chrome Web Store via API
- Update existing extensions
- Publish extensions
- All via `https://www.googleapis.com/auth/chromewebstore` API

### How to Get Access Token
```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=1007179758652-466dr7gkh3t2nvea4mb9u5ckr62r8ohn.apps.googleusercontent.com" \
  -d "client_secret=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" \
  -d "refresh_token=1//05UOCbsJLCrXqCgYIARAAGAUSNwF-L9IrSK5-95PjMrl5jTOngxNv1XZLAs7NASqbSwdkUadv9-eSm8ERnbfOdqL8NJG2jrYEKg4" \
  -d "grant_type=refresh_token"
```

---

## Project Structure
```
chrome extensions/
├── .env.chrome              # OAuth credentials (DO NOT COMMIT)
├── _oauth_callback.js       # OAuth flow script
├── 01-top-20-profitable-extensions.md
├── 02-market-viability.md
├── 03-government-programs.md
├── 04-TOP-10-BUILD-LIST.md
├── 05-ZAFTO-STRATEGIC-EXTENSIONS.md
├── 06-MONETIZATION-PLAYBOOK.md
└── sprints/                 # 10 sprint docs (all at 9/10+)
    ├── SPRINT-01-*.md
    ├── SPRINT-02-*.md
    ├── ...
    └── SPRINT-10-*.md
```

## Sprint Status (All Rebuilt to 9/10+)
| Sprint | Extension | Score | Lines |
|--------|-----------|-------|-------|
| 01 | TabVault | 9/10+ (original pass) | — |
| 02 | ClipGenius | 9/10+ (original pass) | — |
| 03 | FocusForge | 9/10+ (rebuilt from 7/10) | ~9,500 |
| 04 | CookieForge | 9/10+ (rebuilt from 2/10) | ~9,500 |
| 05 | ConsentKill | 9/10+ (rebuilt from 8/10) | ~9,500 |
| 06 | PageDigest | 9.5/10 (rebuilt from 8/10) | ~9,500 |
| 07 | DarkShift | 9.5/10 (rebuilt from 8.5/10) | 9,127 |
| 08 | PricePulse | 9/10+ (original pass) | — |
| 09 | FormFill Pro | 9/10+ (original pass) | — |
| 10 | DevLens | 9/10+ (original pass) | — |

## Cloudflare Account

**Account ID**: `994d8feead9adc26f56abdc72e2fe4bd`
**Dashboard**: `https://dash.cloudflare.com/994d8feead9adc26f56abdc72e2fe4bd`
**Domain**: `peaktools.dev`
**Active API Token**: `3nuZLk7iWF6S27Qc2CuS-YbW70gRhs1Jv7fMf1bE`
**Token Permissions**: Account / Cloudflare Pages / Edit + Zone / DNS / Edit
**Pages Project**: `peaktools` (ID: `fece0029-0aa9-44aa-b593-defeafbbb236`)
**Pages Subdomain**: `https://peaktools.pages.dev`
**Live URLs**: `https://peaktools.dev`, `https://www.peaktools.dev`
**DNS Zone ID**: `78d3c1db7ad0a2abeb3a6792900b63be`
**Website Plan**: PeakTools publisher portfolio site — one domain, per-extension product pages (/copyunlock, /tabvault, etc.)
**Deploy Command**: `wrangler pages deploy . --project-name peaktools` (from website/ dir, with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars)

### How to Create New API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Custom → Permissions: Account / Cloudflare Pages / Edit + Zone / DNS / Edit
3. Zone: peaktools.dev
4. Save token to `.env.cloudflare` or paste to Claude

---

## Built Extensions

### Extension #1: CopyUnlock (SPRINT-01) — BUILT & UPLOADED
- **CWS Item ID**: `fepnibopopogakkkjaimedepnpkgcgbb`
- **Status**: Uploaded to CWS as CopyUnlock, pending manual publish
- **Directory**: `chrome extensions/clipunlock/` (dir name not renamed, contents renamed)
- **Tests**: 117/117 passing (11 suites)
- **Build**: 6 bundles, 40.1 KB packaged
- **Pricing**: Free forever (unlock) + $3.99/mo or $29.99/yr Pro (clipboard manager)
- **Listing docs**: `CWS-LISTING.md`, `PRIVACY-POLICY.md`
- **Icons**: Indigo-violet gradient, document + open padlock design (16/32/48/128px)
- **Website**: `clipunlock/website/` — DEPLOYED to `https://peaktools.dev` (Cloudflare Pages)
- **Note**: ExtPay dependency removed (SSH auth issues) — needs alternative payment integration before Pro tier goes live
- **Name**: Renamed from ClipUnlock to CopyUnlock (26 files updated, all tests passing)

### To Publish CopyUnlock
1. Go to https://chrome.google.com/webstore/devconsole
2. Find item `fepnibopopogakkkjaimedepnpkgcgbb`
3. Fill Privacy practices tab (no data collected, justify host_permissions)
4. Upload store icon from `clipunlock/assets/store-icon-128.png`
5. Add screenshots (1280x800)
6. Set category: Productivity
7. Copy description from `clipunlock/CWS-LISTING.md`
8. Click Publish

---

## Stripe (Tereda Software LLC)

**Dashboard**: https://dashboard.stripe.com
**Business**: Tereda Software LLC
**Publishable Key**: `pk_live_51SwbVnCqKgR2sHD4panyEJIx5GP5LtiXlo8vs3aiKFeYVVRc6CeNrQNxOmCOpSjrUd1MVti8Ed6UDEm6D1KKIRfN00vuqHWe5c`
**Secret Key**: `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`
**Webhook Endpoint ID**: `we_1T52M9CqKgR2sHD4bfUAQI48`
**Webhook Secret**: `whsec_RMSRR2safe3CSnnYmoke73Y22P4I8lSl`
**Webhook URL**: `https://peaktools-license.teredasoftware.workers.dev/api/webhook`
**Events**: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated, invoice.payment_failed
**Note**: Stripe powers ALL extension Pro payments via Cloudflare Worker + D1 license system

### CopyUnlock Stripe IDs
- **Product**: `prod_U38dTFnfVZxrlX`
- **Monthly Price ($3.99)**: `price_1T52NaCqKgR2sHD4q1eGzttf`
- **Annual Price ($29.99)**: `price_1T52NaCqKgR2sHD4rVvY9WcN`
- **Lifetime Price ($49.99)**: `price_1T52NaCqKgR2sHD40lU7ZMfj`

### License Worker (Cloudflare Workers + D1)
- **Worker URL**: `https://peaktools-license.teredasoftware.workers.dev`
- **D1 Database**: `peaktools-licenses` (ID: `9de3579b-780c-4107-ac08-ea8c99171589`)
- **Secrets**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (set via `wrangler secret put`)
- **Endpoints**: POST /api/checkout, POST /api/webhook, GET /api/license, GET /api/health
- **Tables**: licenses, extensions, webhook_events

### GitHub Repository
- **Repo**: `teredasites/peaktools-extensions` (PRIVATE)
- **URL**: https://github.com/teredasites/peaktools-extensions
- **Secrets Set**: CLOUDFLARE_API_TOKEN, CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_ITEM_ID_CLIPUNLOCK
- **CI/CD**: 3 GitHub Actions workflows (ci.yml, deploy-worker.yml, publish-extension.yml)
- **Auto-publish**: Push to master auto-publishes changed extensions to CWS (no manual trigger needed)

### Adding a New Extension to Payment System
1. Run: `STRIPE_SECRET_KEY=sk_live_... node license-worker/scripts/create-stripe-product.mjs --name "ExtName" --slug ext-slug --monthly X.XX --annual XX.XX --lifetime XX.XX`
2. Insert the SQL output into D1: `npx wrangler d1 execute peaktools-licenses --remote --file=insert.sql`
3. In the new extension's constants.ts, set `LICENSE_API_BASE` and `EXTENSION_SLUG`
4. Wire up same `checkLicense()` / `openCheckout()` pattern from CopyUnlock's service-worker.ts

---

## PeakTools Website — peaktools.dev

**Stack**: Static site generator (`build.mjs`) + Cloudflare Pages Functions
**Source**: `Digital Empire/peaktools-site/`
**Templates**: `templates/` — home.html, extension.html, contact.html, ops.html, privacy.html
**Data**: `extensions.json` — all extension configs (pricing, features, highlights, FAQ)
**Build**: `node build.mjs` → outputs to `dist/`
**Deploy**: `npx wrangler pages deploy dist/ --project-name peaktools`

### Live Pages
- **Homepage**: https://peaktools.dev
- **CopyUnlock**: https://peaktools.dev/copyunlock/
- **Contact Form**: https://peaktools.dev/contact/
- **Ops Portal**: https://peaktools.dev/ops/ (password-protected)
- **Privacy**: https://peaktools.dev/privacy/copyunlock/

### Ops Portal (Ticket Management System)
- **URL**: https://peaktools.dev/ops/
- **Password**: `Warmia.Tereda.PWD11!` (stored as `OPS_PASSWORD` env var on Cloudflare)
- **Features**: Stats dashboard, ticket list with filters (status/extension/search), ticket detail panel, update status (new → in-progress → resolved → closed), internal notes, delete tickets
- **Scales automatically**: Any extension added to `extensions.json` auto-appears in filters when tickets arrive
- **Storage**: Cloudflare KV namespace `TICKETS` (90-day TTL auto-cleanup)

### API Endpoints (Cloudflare Pages Functions)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/contact` | POST | No | Submit support ticket (public form) |
| `/api/checkout` | GET | No | Create Stripe Checkout Session, redirect to Stripe |
| `/api/tickets` | GET | Bearer token | List all tickets with stats, filtering, pagination |
| `/api/ticket` | GET | Bearer token | Get single ticket by `?id=` |
| `/api/ticket` | PATCH | Bearer token | Update ticket status/notes by `?id=` |
| `/api/ticket` | DELETE | Bearer token | Delete ticket by `?id=` |

### Environment Variables (Cloudflare Pages Production)
| Variable | Type | Purpose |
|----------|------|---------|
| `STRIPE_SECRET_KEY` | secret | Stripe live secret key for checkout |
| `OPS_PASSWORD` | secret | Ops portal authentication |

### KV Namespaces
| Binding | Namespace ID | Purpose |
|---------|-------------|---------|
| `TICKETS` | `5f14c15d101e4f26a5144090794f3cc2` | Support ticket storage |

### Adding a New Extension
1. Add entry to `extensions.json` with slug, name, pricing, features, highlights, FAQ, etc.
2. Add pricing config to `functions/api/checkout.js` EXTENSIONS object
3. Run `node build.mjs` — auto-generates product page + privacy page
4. Deploy with `npx wrangler pages deploy dist/ --project-name peaktools`
5. Tickets for the new extension will auto-appear in the ops portal

### Email Routing
- `support@peaktools.dev` → `teredasoftware@outlook.com` (Cloudflare Email Routing)

---

## Documentation System

- **Master Directory**: `Digital Empire/MASTER-DIRECTORY.md` — top-level map of everything
- **Extension Masterfiles**: Each extension gets `MASTERFILE.md` in its root dir
- **This File**: Chrome extensions session memory (credentials, sprint status)
- **CopyUnlock Masterfile**: `clipunlock/MASTERFILE.md`

---

## Tech Stack (All Extensions)
- TypeScript strict mode, zero `any`
- esbuild (ESM for service workers, IIFE for content/UI)
- vitest + puppeteer for testing
- Chrome Manifest V3
- Stripe + Cloudflare Workers + D1 for freemium monetization
- peaktools.dev for all extension product pages (template-driven)

## CWS SEO Standard — HARD RULE
**Every extension listing MUST score 10/10 SEO before publishing. No exceptions.**
- Full checklist: `chrome extensions/CWS-SEO-STANDARD.md`
- Name must pack 2-3 high-volume keywords (75 char max — use all of it)
- Short description must max out 132 chars with primary action + trust signals
- Detailed description: keyword-dense, 2,000-5,000 chars, competitor weaknesses addressed
- Screenshots: 1280x800, text overlays readable at thumbnail size, dark theme
- Research competitors' 1-star reviews before writing ANY listing copy
- This standard applies to ALL 10 extensions — CopyUnlock, TabVault, ClipGenius, FocusForge, CookieForge, ConsentKill, PageDigest, DarkShift, PricePulse, DevLens

---

## Session Log — 2026-02-26

### Accomplished
- Fixed Stripe Checkout `subscription_data` bug for lifetime/payment mode
- Built full Ops Portal at `/ops/` — password-protected admin dashboard
  - Stats cards (total, new, in-progress, resolved)
  - Ticket table with status/extension/search filters
  - Slide-out detail panel with full ticket info
  - Update status, add internal notes, delete tickets
  - Self-contained (inline CSS/JS), dark theme matching site design
- Created 3 API endpoints: `/api/tickets` (list), `/api/ticket` (CRUD)
- All APIs auth-gated with Bearer token (OPS_PASSWORD env var)
- Set OPS_PASSWORD env var on Cloudflare Pages production
- Updated build.mjs (5 templates, ops page generation)
- Deployed and tested all endpoints end-to-end
- Previous session: centered product hero, bigger buttons, Stripe checkout, contact form, KV ticket storage

### Accomplished (Session 2 — CopyUnlock Hardening)
- **Fixed CSP inline script violation**: Removed ALL `createElement('script')` patterns from unlocker.ts, replaced with CustomEvent dispatch to MAIN world page-world.ts
- **Fixed ISOLATED/MAIN world gap (ROOT CAUSE of most test failures)**: detector.ts was reading `window.__copyunlock_tracked_listeners` from ISOLATED world where it doesn't exist. Added CustomEvent bridge: MAIN world reports tracked listeners, document.onXxx state via `__copyunlock_report` event. Added `MainWorldData` interface to types.ts.
- **Rewrote detector.ts strategy builder**: Auto mode now adds ALL core unlocks when ANY protection detected. Aggressive adds everything.
- **Fixed test 12 (text selection blocking)**: Added mousedown + dragstart to selective-intercept with smart interactive element filtering
- **Fixed test 13 (overlay blocking context menu)**: Used `setProperty('pointer-events', 'none', 'important')` to beat CSS !important specificity
- **Fixed test 14 (paste length restriction)**: Added dual-layer fix — stopImmediatePropagation on input events + Object.defineProperty override on HTMLInputElement.prototype.value setter to block programmatic reverts for 500ms after paste
- **Fixed service-worker.ts tabId bugs**: Added `if (!tabId || tabId <= 0) return;` guard to updateBadge()
- **Ran full stub audit**: Found 22 issues (5 critical, 6 medium, 11 low) — documented above
- **Test results**: 13/16 methods passing on webbrowsertools.com/test-right-click/ (tests 12, 13, 14 were the last fixed — test 14 needs retest)

### Accomplished (Session 3 — Infrastructure & Deployment)
- **Implemented 3 real features** (were deleted by mistake, recreated from scratch):
  - CSS content extraction (`css-content-extractor.ts`): scans ::before/::after, injects real text nodes
  - Font cipher reversal (`font-reversal.ts`): detects custom fonts, builds char maps via canvas, intercepts copy
  - OCR text detection (`ocr-extractor.ts`): edge/contrast analysis, overlays selectable text on images
- **Wired real Stripe payment**: Replaced `initExtPay()` stub with `checkLicense()` using chrome.identity + license worker API
  - 3 plan buttons (monthly/annual/lifetime) in options page
  - Daily license re-check alarm, 24-hour cache in chrome.storage.local
- **Initialized git monorepo**: `chrome extensions/` as root with clipunlock + license-worker + sprints
- **Pushed to GitHub**: teredasites/peaktools-extensions (private)
- **Set up GitHub Actions CI/CD**: 3 workflows (ci, deploy-worker, publish-extension)
- **Set 5 GitHub repo secrets**: Cloudflare token, CWS OAuth (client ID, secret, refresh token), CWS item ID
- **Deployed license-worker to Cloudflare**: Worker live at peaktools-license.teredasoftware.workers.dev
- **Created D1 database** (peaktools-licenses): schema with licenses, extensions, webhook_events tables
- **Created Stripe webhook**: endpoint we_1T52M9CqKgR2sHD4bfUAQI48 listening for 4 event types
- **Created CopyUnlock Stripe product + 3 prices**: All 3 tiers live in Stripe + D1
- **Fixed LICENSE_API_BASE**: Updated from incorrect `.peaktools.workers.dev` to `.teredasoftware.workers.dev`
- **Fixed create-stripe-product.mjs**: Removed bug where `recurring: undefined` was sent as form param
- **Verified end-to-end**: Health check + license check endpoints both responding correctly
- **All 117 tests still passing**, build clean

### Accomplished (Session 4 — UI Redesign & Fixes)
- **Fixed Canvas2D `willReadFrequently` warnings**: Added `{ willReadFrequently: true }` to `canvas.getContext('2d')` in:
  - `font-reversal.ts` line 90 (buildCharMap)
  - `ocr-extractor.ts` line 133 (extractFromElement for canvas elements)
- **Complete popup redesign** — Premium dark UI:
  - Power button with radial glow ring animation
  - Status pill (Active/Off) with pulsing green dot
  - Sliding mode selector with animated track indicator
  - Shield icon protection badge with slide-in animation
  - Clipboard items with hover gradient reveal, type badges
  - Footer actions with SVG icons (sidepanel, settings)
  - Deep dark theme (`#0c0c14` base), accent `#6366f1` (indigo)
- **Complete settings page redesign** — Tabbed navigation:
  - 5 tabs: General, Clipboard, Sites, Pro, Data (with SVG icons)
  - Custom iOS-style toggle switches (replaced native checkboxes)
  - Every setting has label + descriptive hint subtitle
  - Pro section: gradient hero banner, 2x2 feature grid, 3 plan cards with hover lift
  - Data section: export/import/clear rows with danger zone highlighting
  - Stats dashboard: 3 stat cards with large accent numbers
  - Keyboard shortcuts section with `kbd` styled keys
  - Responsive design (collapses on mobile)
- **Verified all 20 settings functions** — every control wired correctly:
  - Tab navigation, save/load, overrides CRUD, export/import/clear
  - Shortcuts link, Stripe checkout (3 plans), license refresh (2 buttons)
  - Version display, stats loading, pro status loading
- **Build clean**, committed & pushed to GitHub

---

## Architecture — How Updates Flow

### The Update Pipeline (FULLY AUTOMATED)
```
Local code → git push → GitHub (teredasites/peaktools-extensions)
                              ↓ (automatic on push)
                         CI runs (build + test)
                              ↓ (automatic — detects changed extensions)
                    publish-extension.yml auto-triggers
                              ↓ (builds, tests, packages, uploads)
                   Chrome Web Store API (via OAuth)
                              ↓ (Chrome auto-updates every few hours)
                         Users' browsers
```

### Key Points
- **GitHub is the source of truth** — all code lives in `teredasites/peaktools-extensions` (private monorepo)
- **Auto-publish on push to master** — when any extension's `src/`, `assets/`, `manifest.json`, or `package.json` changes, the publish workflow auto-detects and publishes ONLY the changed extensions
- **CI also runs automatically** on every push (builds, tests, typechecks) — separate from publish
- **Manual trigger still available**: GitHub.com → Actions tab → "Publish Extensions to Chrome Web Store" → Run workflow → optionally specify folder name
- **License worker auto-deploys**: Any push that changes `license-worker/` triggers `deploy-worker.yml` automatically
- **Chrome auto-updates**: CWS pushes updates to users within hours of publish
- **Per-extension CWS secrets**: Each extension has its own `CWS_ITEM_ID_<NAME>` secret (e.g., `CWS_ITEM_ID_CLIPUNLOCK`)

### Per-Extension Safety
- Each extension has its own CWS Item ID (stored as GitHub secret `CWS_ITEM_ID`)
- Each extension has its own Stripe Product + Prices
- Each extension has its own slug in D1 database
- Extensions can't affect each other — separate builds, separate packages, separate CWS listings
- Deleting from CWS requires manual dashboard action (no API for delete)
