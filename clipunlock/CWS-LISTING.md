# CopyUnlock — Chrome Web Store Publish Guide

This file is the reference doc. The actual copy-paste text is in the /cws-copy/ folder:

    cws-copy/
    ├── 01-detailed-description.txt   ← Paste into "Detailed Description" field
    ├── 02-single-purpose.txt         ← Paste into Privacy tab "Single Purpose"
    ├── 03-permission-justifications.txt ← One per permission in Privacy tab
    └── 04-publish-checklist.txt      ← Step-by-step what to click

## Quick Reference

Name (in manifest.json):
CopyUnlock — Enable Copy, Right Click & Text Selection

Short Description (in manifest.json, 132 chars):
Enable copy paste on any website. Remove right-click restrictions, unblock text selection, strip watermarks. Free.

Category: Productivity
Language: English (US)
Payment: Contains in-app purchases
Visibility: Public
Regions: All regions
Homepage URL: https://peaktools.dev/copyunlock
Support URL: https://peaktools.dev/contact
Privacy Policy URL: https://peaktools.dev/privacy/copyunlock
Store Icon: assets/store-icon-128.png (128x128)

## Screenshots Needed (1280x800 PNG, take in Chrome, add text overlay in Canva)

1. HERO — Popup showing "Page Unlocked" on a protected site
   Overlay text: "Enable Copy & Paste on Any Website"

2. CLIPBOARD HISTORY — Side panel showing time-grouped clips (Today, Yesterday) with pinned items at top
   Overlay text: "Clipboard History — Auto-Saves Every Copy"

3. PROJECTS — Side panel showing project folders with color-coded cards and domain badges
   Overlay text: "Organize Clips into Projects by Domain"

4. RIGHT-CLICK MENU — Context menu on a clip item showing Copy, Pin, Move to Project, Delete options
   Overlay text: "Full Right-Click Menu on Every Item"

5. SETTINGS — In-panel settings modal showing unlock mode, clipboard toggles, Pro status
   Overlay text: "3 Unlock Modes — Auto, Safe, Aggressive"

## Key Features to Highlight in Screenshots

- Time-grouped history (PINNED → TODAY → YESTERDAY → THIS WEEK → OLDER)
- Content-type accent bars (blue=URL, purple=Code, gray=Text, green=Email, orange=HTML)
- Language detection badges on code clips (JS, Python, CSS, SQL, Shell, etc.)
- URL items with one-click Open and Copy buttons
- Project cards with color dots, item counts, and domain badges
- Project detail view with content grouped by type (Text, URLs, Code, etc.)
- Pin to top — pinned items in dedicated PINNED section
- Quick Paste popup overlay on a webpage (Ctrl+Shift+V)
- Clear Data modal with granular toggles (History, Pinned, Projects)
- Manage Subscription button in settings for Pro users
