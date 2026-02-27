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

## Screenshots — Ready to Upload

All photos are in: `C:\Users\Developer LLC\Desktop\Peaktools photos\CopyUnlock photos\`

Upload them in this order (CWS shows first image as the main listing image):

1. **Card 2.png** (use as MAIN/HERO image)
   Browser mockup showing a copy-protected article with "COPY DISABLED" badge.
   CopyUnlock popup overlay active with "3 restrictions removed".
   Right side: "Unlock any copy-protected page", "Built-in clipboard history",
   "Zero data collection", "100% free — no upsells".
   ⚠️ NOTE: "100% free — no upsells" may conflict with "Contains in-app purchases"
   declaration. Consider updating to "Free forever — Pro optional" to avoid rejection.

2. **Card 1 (1).png** (feature overview)
   Popup mockup with power button, Auto/Safe/Aggressive modes.
   "Copy anything from any website." headline.
   Stats: <10ms execution, 0 data collected, 500+ clip history.
   Feature pills: Auto-detect, Clipboard History, PDF Cleanup, Zero Tracking.

3. **Screenshot 2026-02-27 023828.png** (right-click context menu)
   Real screenshot of the CopyUnlock right-click submenu on peaktools.dev.
   Shows: Lock Page (revert), Copy Save, Pin Selection, Save to Project submenu
   with existing projects and "+ New Project" option.

4. **Screenshot 2026-02-27 023933.png** (sidepanel / clipboard history)
   Real screenshot of the sidepanel showing the full UI:
   - Recent / Pinned / Projects tabs (Projects tab active with badge)
   - PINNED section at top with pinned items (pin icons visible)
   - TODAY section with time-grouped clips
   - Projects section showing "peaktools.dev" project (4 items, domain badge)
   - Footer: + Project, + Add, Clear All, Settings

### Screenshot Size Requirements
CWS requires 1280x800 or 640x400 PNG/JPEG screenshots.
The Card images should already be the right size.
The raw screenshots may need to be resized/cropped to 1280x800 in Canva or similar.
