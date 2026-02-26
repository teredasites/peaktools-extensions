# TOP 10 Chrome Extensions to Build — Final Selection

> Last Updated: 2026-02-25
> Confidence Threshold: 75%+ market penetration probability
> Based on: 5 deep market scans, competitive analysis, revenue benchmarks, gap analysis

---

## Selection Criteria (Scoring Formula)

Each extension scored 0-100 across 5 dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Demand Signal** | 25% | Search volume, Reddit requests, orphaned user bases, "best of" list frequency |
| **Competition Weakness** | 25% | Incumbent ratings, MV2 sunset victims, abandoned extensions, quality gaps |
| **Build Feasibility** | 20% | Can we build it in 2-4 hours? MV3 compatible? No server needed? |
| **Monetization Clarity** | 15% | Proven pricing model? Clear free/paid split? Willingness to pay? |
| **Scalability** | 15% | Can it grow organically via CWS search? Cross-promotion potential? |

**Minimum score to make the list: 75/100**

---

## THE TOP 10

### #1. ClipUnlock — Copy/Paste Unlocker + Clipboard History
**Confidence: 92%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 98 | 16M installs on incumbent with 2.2 stars. Worst quality/demand ratio in entire CWS. |
| Competition | 95 | Current leader breaks YouTube controls, Google Docs, and keyboard shortcuts. Users HATE it but have no alternative. |
| Feasibility | 95 | Content script + clipboard API. 2-3 hours. No server needed. |
| Monetization | 80 | Free: copy unlocker + 50 history items. Pro: unlimited + cloud sync + text expander ($3.99/mo). |
| Scalability | 90 | Universal need. Every knowledge worker copies text. CWS search traffic alone will drive installs. |

**What it does**: Surgical copy/paste enabler (whitelist approach — only activates on sites that block copying, doesn't interfere with anything else) + clipboard history manager with search, pins, and rich text/image support.

**Why 92% confidence**: 16 million users stuck with a 2.2-star extension is the clearest "shoot fish in a barrel" opportunity in the entire Chrome Web Store. The technical bar is LOW. The demand is PROVEN.

**Revenue model**: ExtensionPay. Free core + $3.99/mo Pro.
**Product Hunt**: YES — launch day 1.

---

### #2. TabVault — Session & Tab Group Saver
**Confidence: 88%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 92 | OneTab (2M+ users) famous for losing ALL saved tabs. Session Buddy basic. MV2 sunset killed several tab managers. Chrome added tab groups but no save/restore. |
| Competition | 90 | OneTab data loss is legendary. Toby forced subscriptions + broke features. Tab Session Manager has sync failures. |
| Feasibility | 90 | chrome.tabGroups + chrome.storage APIs. Side Panel UI. 2-3 hours. |
| Monetization | 82 | Free: 5 saved sessions (local). Pro: unlimited + encrypted cloud sync + auto-save ($3.99/mo). |
| Scalability | 85 | Every power user with 20+ tabs needs this. "Tab manager" is a top CWS search category. |

**What it does**: Save and restore Chrome tab groups with one click. Name sessions ("Work", "Research", "Side Project"). Auto-save on browser close. End-to-end encrypted cloud sync. Version history ("my tabs from last Tuesday").

**Why 88% confidence**: OneTab's data loss creates genuine emotional pain. "Your tabs will NEVER be lost" is a powerful positioning. The MV2 sunset killed competitors. Chrome's Side Panel API enables a better UX than anyone has built.

**Revenue model**: ExtensionPay. Free local + $3.99/mo vault.
**Product Hunt**: YES.

---

### #3. FocusForge — Pomodoro Timer + Site Blocker + Stats
**Confidence: 87%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 90 | Appears in literally every "best Chrome extensions" list. Forest app massive. StayFocusd, LeechBlock, BlockSite all 100K+ users. Category is evergreen. |
| Competition | 80 | Existing tools are either timer-only OR blocker-only. No single extension combines both well with stats dashboard. |
| Feasibility | 92 | chrome.alarms + declarativeNetRequest for blocking. Badge countdown. Side Panel stats. 2-3 hours. |
| Monetization | 85 | Free: basic timer + 3 blocked sites. Pro: unlimited blocks + detailed analytics + cross-device sync + streak rewards ($4.99/mo). |
| Scalability | 88 | Students, remote workers, freelancers, ADHD community. Massive TAM. Gamification drives word-of-mouth. |

**What it does**: Pomodoro timer in toolbar badge (25/5 or custom). Blocks distracting sites during focus sessions. Gamification (streaks, daily stats, weekly reports). Side panel dashboard showing productivity trends.

**Why 87% confidence**: The Pomodoro + site blocker combination is universally needed. No single extension nails both. Gamification (Forest's model) is proven to drive retention and reviews. Appears on every "best of" list = guaranteed CWS search traffic.

**Revenue model**: ExtensionPay. Free core + $4.99/mo Pro.
**Product Hunt**: YES.

---

### #4. PageDigest — AI Page Summarizer (Gemini Nano)
**Confidence: 85%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 88 | Eightify (YouTube summarizer) makes $45K/mo. Glasp massive. Google named summarizers as 2025 favorite category. Every "best AI extensions" list includes summarizers. |
| Competition | 78 | Many AI summarizers exist BUT all pay for OpenAI/Claude API calls. Gemini Nano = zero API cost = unlimited free tier that competitors can't match. |
| Feasibility | 85 | Chrome's built-in Summarizer API + Prompt API. Side Panel UI. 3-4 hours. Requires Chrome 131+. |
| Monetization | 82 | Free: 10 summaries/day. Pro: unlimited + custom length + export + "key takeaways" mode ($5.99/mo). |
| Scalability | 90 | Universal need. Students, researchers, professionals. "Summarize this page" is intuitive. |

**What it does**: Side panel that summarizes any webpage, YouTube video transcript, or PDF in one click. Uses Chrome's built-in Gemini Nano — zero API costs, works offline. Multiple output modes: bullet points, executive summary, key takeaways, ELI5.

**Why 85% confidence**: The structural advantage is zero API cost via Gemini Nano. Competitors paying $0.01-0.05 per summary CANNOT offer an unlimited free tier. This is a cost-moat play. Google is actively promoting AI extensions.

**Revenue model**: ExtensionPay. Free (10/day) + $5.99/mo Pro.
**Product Hunt**: YES — strong AI angle for PH audience.

---

### #5. CookieForge — MV3 Cookie Editor
**Confidence: 84%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 90 | EditThisCookie had 3M users before removal. Malicious copycat with fake "Featured" badge took its place. Developers NEED cookie editing for debugging. |
| Competition | 92 | Original removed. Copycat is malicious. Market is literally vacant for a trusted option. |
| Feasibility | 88 | chrome.cookies API. Popup/Side Panel UI. JSON import/export. 2-3 hours. |
| Monetization | 65 | Developer tools are harder to monetize. Free core + Pro for bulk operations, JSON export, cross-profile sync ($2.99/mo). Alternatively: donation-supported. |
| Scalability | 78 | Every web developer needs this. "Cookie editor" is a constant CWS search. But niche is smaller (developers only). |

**What it does**: Clean, MV3-native cookie editor. View, edit, add, delete cookies. JSON import/export. Dark mode. Filter by domain. Bulk operations. Open-source + audited for trust (the malicious copycat destroyed trust in this category).

**Why 84% confidence**: 3M orphaned users with no trusted replacement. The market is VACANT. Being open-source and audited is the differentiator in a category where the current "Featured" extension is literal malware.

**Revenue model**: Donation-supported or ExtensionPay $2.99/mo Pro.
**Product Hunt**: YES — developer audience loves PH.

---

### #6. ConsentKill — Cookie Consent Auto-Dismisser
**Confidence: 82%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 88 | Universal frustration. Every EU website + increasingly US sites show consent banners. "I Don't Care About Cookies" was acquired by Avast (trust eroded). Consent-O-Matic is academic-paced. |
| Competition | 80 | Fragmented: academic projects, acquired extensions, add-on features. No single dominant, well-maintained, privacy-respecting solution. |
| Feasibility | 82 | Content script + community-maintained CSS selector ruleset. 3-4 hours initial + ongoing ruleset maintenance. |
| Monetization | 72 | Privacy tools are hard to monetize. Free core + optional $1.99 one-time "supporter" badge. Or: $2.99/mo Pro with dashboard analytics showing "banners dismissed this month." |
| Scalability | 85 | Every internet user in Europe + privacy-conscious users globally. Banner count badge is viral (people share screenshots of "4,382 banners dismissed"). |

**What it does**: Auto-rejects all non-essential cookies on every site. Community-contributed ruleset (like uBlock filter lists). Badge shows banners dismissed per session. Side panel "privacy savings dashboard." Zero data collection.

**Why 82% confidence**: The pain is universal and intensifying (more sites add banners). The incumbents are fragmented or acquired. The badge gamification ("I dismissed 10,000 banners") drives social sharing and organic growth.

**Revenue model**: Donation/supporter model or ExtensionPay $2.99/mo.
**Product Hunt**: YES — privacy angle resonates strongly on PH.

---

### #7. PriceRadar — Multi-Retailer Price Tracker
**Confidence: 80%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 85 | Honey acquired for $4B proving the shopping extension market. Keepa raised prices to 29EUR/mo creating mass exodus. Phia named Google 2025 Favorite. CamelCamelCamel inaccurate outside US. |
| Competition | 75 | Keepa still strong for Amazon. CamelCamelCamel free but Amazon-only. BuildClub does construction materials. No good MULTI-retailer option. |
| Feasibility | 75 | Content scripts per retailer (Amazon, Walmart, Target, Best Buy, eBay). Price history requires small backend or IndexedDB. 4+ hours. |
| Monetization | 82 | Affiliate commissions (transparent, post-Honey) + Pro tier for unlimited tracking ($3.99/mo). |
| Scalability | 85 | Everyone shops online. Cross-retailer comparison is the hook no one else has. |

**What it does**: Track prices on Amazon, Walmart, Target, Best Buy, eBay, Home Depot, Lowes. Price history charts. Drop alerts. Cross-retailer comparison ("This item is $12 cheaper at Walmart"). Transparent affiliate disclosure.

**Why 80% confidence**: Keepa's price hike ($29/mo) displaced a large user base. Cross-retailer comparison is genuinely novel (everyone else is Amazon-only). The Honey scandal created appetite for transparent alternatives.

**Revenue model**: Affiliate + ExtensionPay $3.99/mo Pro.
**Product Hunt**: YES — everyone loves saving money.

---

### #8. QuickCapture — Screen Recorder (Generous Free Tier)
**Confidence: 78%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 82 | Screencastify free tier gutted to 5 min. Loom expensive ($150/yr). Nimbus has watermarks. Remote work = constant need for screen recording. |
| Competition | 72 | GoFullPage dominates screenshots. Loom dominates paid recording. Gap is: generous free recording (15+ min, no watermark). |
| Feasibility | 78 | chrome.tabCapture + MediaRecorder API. MV3 offscreen documents for processing. 3-4 hours. |
| Monetization | 78 | Free: 15-min recording, no watermark. Pro: cloud storage + team sharing + editing ($6.99/mo). |
| Scalability | 80 | Teachers, remote workers, support teams, content creators. "Free screen recorder no watermark" is a massive search query. |

**What it does**: MV3-native screen recorder. 15-minute free recordings with NO watermark. Tab, window, or full screen. Webcam overlay. Auto-saves locally. Pro adds cloud hosting, team sharing, and trim/crop editing.

**Why 78% confidence**: Screencastify betrayed its free users. Loom is too expensive for individuals. The positioning "Screencastify but actually free" captures a specific, angry audience. The technical challenge is moderate (MV3 screen recording has quirks).

**Revenue model**: ExtensionPay. Free core + $6.99/mo Pro.
**Product Hunt**: YES — screen recording is a PH staple category.

---

### #9. DarkShift — Open-Source Dark Mode
**Confidence: 77%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 85 | Dark Reader is one of the most-installed extensions ever. Night Eye makes $3.1K/mo. Super Dark Mode was hijacked (malware). Dark mode is permanent/evergreen. |
| Competition | 70 | Dark Reader is free and good. Night Eye is paid. But: Dark Reader breaks many sites, Super Dark Mode was compromised, "Dark Mode Google Docs" runs deceptive trials. Trust gap exists. |
| Feasibility | 80 | CSS injection via content scripts. Per-site customization. 3-4 hours. |
| Monetization | 72 | Hard to beat Dark Reader on free. Differentiator: community-maintained site-fix database. Pro: scheduled mode + per-site themes + sync ($2.99/mo). |
| Scalability | 82 | Everyone wants dark mode. "Dark mode for Chrome" is a perennial top search. |

**What it does**: Smart dark mode for all websites. Open-source for trust. Community-maintained fix list for sites that break. Per-site customization. Scheduled activation (auto dark mode after 8pm). Sepia/low-contrast modes.

**Why 77% confidence**: The trust angle differentiates from compromised extensions. Dark Reader going paid for enterprise creates a sliver of opportunity. But Dark Reader free is "good enough" for most — harder to displace than the others on this list.

**Revenue model**: Donation + ExtensionPay $2.99/mo Pro.
**Product Hunt**: YES — open-source angle plays well on PH.

---

### #10. SnipVault — Smart Text Expander
**Confidence: 76%**

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Demand | 80 | Text Blaze has 700K+ users with 4.9 stars. Briskine successful for Gmail. "Text expander" is growing search category. |
| Competition | 68 | Text Blaze is good but broad. Opportunity is in niche-specific pre-built snippet packs (customer support, recruiters, developers, freelancers). |
| Feasibility | 82 | Content scripts + chrome.storage. Keyboard shortcut listener. 3-4 hours. |
| Monetization | 78 | Free: 20 snippets. Pro: unlimited + team sharing + variables + pre-built niche packs ($4.99/mo). |
| Scalability | 72 | Customer support teams, recruiters, salespeople, developers. Smaller TAM than universal tools but higher willingness to pay. |

**What it does**: Type shortcuts like `/sig` → full email signature, `/followup` → follow-up template with dynamic date/name variables. Pre-built packs for specific roles. Rich text support. Clipboard variable insertion.

**Why 76% confidence**: Text Blaze at 700K users proves the market. Niche-specific packs (e.g., "50 customer support snippets") is a differentiation play. But Text Blaze is strong — requires genuine quality to displace.

**Revenue model**: ExtensionPay. Free core + $4.99/mo Pro.
**Product Hunt**: YES.

---

## BUILD ORDER (Optimized for Speed + Impact)

| Order | Extension | Est. Build Time | Cumulative Hours |
|-------|-----------|----------------|-----------------|
| 1 | ClipUnlock | 2-3 hrs | 2-3 |
| 2 | TabVault | 2-3 hrs | 4-6 |
| 3 | FocusForge | 2-3 hrs | 6-9 |
| 4 | CookieForge | 2-3 hrs | 8-12 |
| 5 | ConsentKill | 3-4 hrs | 11-16 |
| 6 | PageDigest | 3-4 hrs | 14-20 |
| 7 | DarkShift | 3-4 hrs | 17-24 |
| 8 | PriceRadar | 4+ hrs | 21-28 |
| 9 | QuickCapture | 3-4 hrs | 24-32 |
| 10 | SnipVault | 3-4 hrs | 27-36 |

**Realistic today (12 hours)**: Extensions #1-5 definitely, #6-7 likely, #8-10 stretch goals.

---

## MONETIZATION SETUP

**Payment system**: ExtensionPay (purpose-built for Chrome extensions, no backend needed, 5% + Stripe's 2.9%+$0.30)
**Pricing strategy**: Freemium subscription ($2.99-$6.99/mo per extension)
**Annual option**: 20% discount on all extensions
**Free tier**: Genuinely useful — not crippled. Drives reviews and organic growth.
**Cross-promotion**: Each extension's settings page lists all other extensions in the portfolio.

---

## LAUNCH CHECKLIST (Per Extension)

- [ ] Build extension (MV3, production-ready)
- [ ] Create Chrome Web Store listing (5 screenshots, description, privacy policy)
- [ ] Translate listing to 5+ languages (multiple search surfaces)
- [ ] Submit to Chrome Web Store (expect 1-3 day review)
- [ ] Prepare Product Hunt launch (tagline, description, screenshots, maker comment)
- [ ] **REMINDER: Launch on Product Hunt on publish day**
- [ ] Post in relevant subreddits (r/chrome, r/productivity, r/webdev, etc.)
- [ ] Cross-promote from other extensions in portfolio

---

## REVENUE PROJECTIONS (Conservative)

### Month 1-3 (Portfolio of 5-10 extensions)
- Combined installs: 5,000-15,000
- Paying users (3% conversion): 150-450
- Average price: $4/mo
- **Revenue: $600-$1,800/mo**

### Month 4-6 (Organic growth + CWS SEO compounding)
- Combined installs: 25,000-75,000
- Paying users: 750-2,250
- **Revenue: $3,000-$9,000/mo**

### Month 7-12 (Established portfolio + reviews + cross-promotion)
- Combined installs: 100,000-300,000
- Paying users: 3,000-9,000
- **Revenue: $12,000-$36,000/mo**

---

## STRATEGIC NOTE

These 10 extensions are pure income plays — maximum revenue with minimum investment. They are NOT Zafto-related.

**However**, the trades/contractor research revealed MASSIVE empty niches that could serve as Zafto acquisition funnels in a future phase:
- Job board enhancer for Thumbtack/Angi (zero competition)
- Contractor new tab dashboard (zero competition)
- "Add to Estimate" on supply house sites (zero competition)
- Home inspector property overlay (zero competition)

Those are documented in `05-ZAFTO-STRATEGIC-EXTENSIONS.md` for future reference.
