# CopyUnlock — Extension Masterfile

## Identity
- **Name**: CopyUnlock
- **Slug**: `copyunlock`
- **Tagline**: Copy & Paste Unlocker & Clipboard Manager
- **Category**: Productivity
- **Version**: 1.0.0

## Store
- **CWS Item ID**: `fepnibopopogakkkjaimedepnpkgcgbb`
- **CWS Status**: Uploaded (draft) — pending manual publish
- **CWS URL** (after publish): `https://chromewebstore.google.com/detail/fepnibopopogakkkjaimedepnpkgcgbb`

## Payments
- **Stripe Product ID**: (pending — needs pk/sk keys)
- **Stripe Monthly Price ID**: (pending)
- **Stripe Annual Price ID**: (pending)
- **Stripe Lifetime Price ID**: (pending)
- **Free Tier**: All 29 unlock methods, 200 clipboard items, 24h retention
- **Pro Monthly**: $3.99/mo
- **Pro Annual**: $29.99/yr (37% savings)
- **Pro Lifetime**: $49.99 (first 90 days only)

## Build
- **Directory**: `chrome extensions/clipunlock/`
- **Tests**: 117/117 passing (11 suites)
- **Build**: 6 bundles via esbuild
- **Package**: copyunlock-v1.0.0.zip (40.1 KB)
- **Tech**: TypeScript strict, esbuild, vitest, Manifest V3

## Features — Free
- 29 copy/paste detection methods (CSS, JS, DOM, Clipboard API, overlay)
- Smart Mode auto-detection on page load
- Counter-observer with exponential backoff
- Watermark stripping (11 Unicode character types)
- CSS ::before/::after content extraction
- Overlay detector and neutralizer
- Safe Mode (YouTube, Google Docs, Netflix, Figma)
- Keyboard shortcuts (Alt+Shift+U, Alt+Shift+C, Alt+Shift+S)
- 5 languages (EN, ES, PT, ZH, FR)
- 200 clipboard history items, 24h retention

## Features — Pro
- Unlimited clipboard history (100,000+ items)
- Permanent retention
- Fuzzy search
- Tags & pin favorites
- Export/import (JSON)
- Dark mode side panel
- Per-site unlock profiles

## Website
- **URL**: https://peaktools.dev/copyunlock (pending site rebuild)
- **Privacy**: https://peaktools.dev/privacy/copyunlock

## Icons
- 16/32/48/128px in `assets/icons/`
- Store icon: `assets/store-icon-128.png`
- Design: Indigo-violet gradient (NEEDS REDESIGN — new brand colors TBD)

## Known Issues
- ExtPay removed — no payment integration yet (blocked on Stripe key setup)
- No E2E browser testing done
- No real-world manual testing
- Icons are placeholder quality
- CWS listing needs screenshots (1280x800)

## To Publish
1. Fill Privacy practices in CWS dashboard
2. Upload store icon
3. Add 1280x800 screenshots
4. Set category: Productivity
5. Paste description from CWS-LISTING.md
6. Click Publish

## Changelog
- 2026-02-26: Built, tested (117/117), uploaded to CWS as draft
- 2026-02-26: Renamed from ClipUnlock to CopyUnlock (26 files)
- 2026-02-26: Icons generated, re-packaged, re-uploaded to CWS
