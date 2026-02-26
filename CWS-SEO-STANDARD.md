# Chrome Web Store SEO Standard — PeakTools Publishing

> **HARD RULE**: Every extension listing MUST score 10/10 on this checklist before publishing.
> No exceptions. If the SEO isn't perfect, we're losing money on every extension.

---

## The 10-Point SEO Checklist

Every PeakTools extension MUST pass ALL 10 before clicking Publish:

### 1. Name Packs Keywords (75 char max)
- [ ] Extension name includes the #1 search term users type to find this type of tool
- [ ] Name includes 2-3 high-volume keyword phrases separated by commas or dashes
- [ ] Format: `BrandName — Keyword Phrase 1, Keyword Phrase 2 & Keyword Phrase 3`
- [ ] Verified: searched the CWS for each keyword and confirmed competitors rank for them

### 2. Short Description Maxes Out (132 char max)
- [ ] Uses ALL 132 characters (don't waste a single one)
- [ ] First 50 characters contain the primary action keyword (what the extension DOES)
- [ ] Contains "Free" or "No data collected" (trust signals that boost CTR)
- [ ] No fluff words — every word is either a keyword or a conversion driver

### 3. Detailed Description is a Keyword Machine
- [ ] Opens with the primary keyword phrase in the first sentence
- [ ] Primary keyword appears 5-8x naturally throughout (not spammy)
- [ ] Secondary keywords each appear 2-4x
- [ ] Includes "How it works" numbered list (Google indexes these)
- [ ] Features listed with checkmarks (✓) for scannability
- [ ] Includes "Perfect for" section naming target users (students, developers, researchers)
- [ ] Privacy section explicitly states "no data collection"
- [ ] Ends with publisher description and support links
- [ ] Total length: 2,000-5,000 characters (sweet spot for CWS indexing)

### 4. Competitor Research Completed
- [ ] Top 10 competing extensions identified by name and user count
- [ ] Their keywords extracted from names and descriptions
- [ ] Their weaknesses identified from 1-star reviews
- [ ] Our listing addresses those weaknesses explicitly
- [ ] Market gaps documented (delisted extensions, unserved niches)

### 5. Screenshots Are Selling, Not Showing (1280x800 px, max 5)
- [ ] Screenshot 1 (HERO) = main value proposition — readable at thumbnail size
- [ ] Each screenshot has a text overlay explaining the benefit (not just the feature)
- [ ] Dark backgrounds matching the extension theme
- [ ] Text is LARGE — legible without clicking to expand
- [ ] Shows real usage, not mockups (CWS users trust authenticity)

### 6. Category is Correct
- [ ] Matches the category where competitors are listed (usually Productivity)
- [ ] Don't try to be clever with niche categories — go where the traffic is

### 7. Privacy Practices are Bulletproof
- [ ] Single purpose description is clear and honest
- [ ] Every permission has a written justification
- [ ] Remote code declaration is accurate
- [ ] Data usage disclosures match reality
- [ ] Privacy policy URL is live and accessible

### 8. URLs are Live and Professional
- [ ] Homepage URL points to the product page on peaktools.dev
- [ ] Support URL points to /contact (working form)
- [ ] Privacy Policy URL points to /privacy/{slug}
- [ ] All URLs return 200 and look professional

### 9. Pricing Declared Correctly
- [ ] "Contains in-app purchases" checked if extension has Pro tier
- [ ] Pro pricing mentioned in the detailed description with exact amounts
- [ ] Free tier clearly described so users know what they get without paying

### 10. Reviews & Support Strategy Ready
- [ ] Support email (support@peaktools.dev) is monitored
- [ ] Plan to respond to every review within 24 hours
- [ ] Known issues documented so support responses are fast
- [ ] Update cadence planned (CWS rewards active extensions)

---

## SEO Research Template (Do This For Every New Extension)

Before writing ANY listing copy, complete this research:

### Step 1: Find Your Keywords
1. Go to Chrome Web Store and search 10 variations of what the extension does
2. Note the exact names of the top 10 results for each search
3. Extract the keywords that appear in 5+ of the top results — these are your primary keywords
4. Extract keywords that appear in 2-4 results — these are your secondary keywords

### Step 2: Analyze Competitors
1. For each top 10 competitor, note:
   - Name (exact)
   - User count
   - Rating
   - Short description
   - First 3 features listed in their description
2. Read their 1-star reviews — these are YOUR selling points
3. Check if any were recently delisted (market gap opportunity)

### Step 3: Write the Name
- Start with the brand name
- Add a dash or colon
- Pack in 2-3 primary keywords
- Test: if someone searches EACH keyword, will your extension appear?

### Step 4: Write Short Description
- Write 10 versions
- Pick the one that has the most keywords AND reads naturally
- Max out the 132 characters

### Step 5: Write Detailed Description
- Follow the template in CopyUnlock's CWS-LISTING.md
- Sections in order: Hook → How It Works → Free Features → Pro Features → Why Different → Privacy → Safe Mode → Perfect For → Shortcuts → Support → Publisher
- Use section separators (━━━ lines) for visual structure
- Use ✓ for free features, ⚡ for pro features

---

## CWS Dashboard Field Reference

| Field | Location | Limit | Required |
|-------|----------|-------|----------|
| Extension Name | manifest.json `"name"` | 75 chars | Yes |
| Short Description | manifest.json `"description"` | 132 chars | Yes |
| Detailed Description | Store Listing tab | ~16,000 chars | Yes |
| Category | Store Listing tab | Pick 1 of 17 | Yes |
| Language | Store Listing tab | Pick 1 | Yes |
| Store Icon | Store Listing tab | 128x128 px PNG | Yes |
| Screenshots | Store Listing tab | 1280x800 px, 1-5 | Yes (min 1) |
| Small Promo Tile | Store Listing tab | 440x280 px | No |
| Marquee Promo Tile | Store Listing tab | 1400x560 px | No |
| YouTube Video | Store Listing tab | YouTube URL | No |
| Homepage URL | Store Listing tab | URL | No |
| Support URL | Store Listing tab | URL | No |
| Single Purpose | Privacy tab | Free text | Yes |
| Permission Justifications | Privacy tab | Per permission | Yes |
| Remote Code | Privacy tab | Yes/No | Yes |
| Data Disclosures | Privacy tab | Checkboxes | Yes |
| Privacy Policy URL | Privacy tab | URL | If collecting data |
| Payment | Distribution tab | Free / In-app purchases | Yes |
| Visibility | Distribution tab | Public/Unlisted/Private | Yes |
| Regions | Distribution tab | All / Select | Yes |

---

## Anti-Patterns (Never Do These)

1. **Never use the brand name alone as the CWS name** — "CopyUnlock" alone wastes 65 characters of keyword space
2. **Never leave the short description under 120 characters** — you're throwing away free SEO
3. **Never skip competitor research** — you can't beat what you don't understand
4. **Never use generic screenshots** — "Settings page" screenshots don't convert
5. **Never forget the "Perfect for" section** — it captures long-tail searches like "chrome extension for students"
6. **Never publish without live URLs** — broken homepage/support links tank credibility
7. **Never ignore 1-star reviews on competitors** — they're your roadmap to 5 stars
8. **Never use the same description template without re-researching keywords** — each category has different search patterns
9. **Never skip the privacy justifications** — incomplete privacy tab = review rejection
10. **Never publish and forget** — CWS rewards extensions that update regularly
