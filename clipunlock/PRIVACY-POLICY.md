# Privacy Policy — CopyUnlock

**Last updated:** February 26, 2026
**Publisher:** PeakTools Publishing

## Overview

CopyUnlock is a Chrome extension that unlocks copy/paste functionality on websites and provides clipboard history management. We are committed to your privacy and do not collect, transmit, or sell any user data.

## Data Collection

**We collect no data.** Specifically:

- No personal information is collected
- No browsing history is tracked
- No analytics or telemetry data is sent
- No cookies are set by the extension
- No user behavior is monitored
- No data is transmitted to any server

## Data Storage

All data created by CopyUnlock is stored locally on your device:

- **Extension settings** are stored in `chrome.storage.sync` (synced across your Chrome profile by Google, not by us)
- **Clipboard history** is stored in IndexedDB on your local machine
- **Per-site unlock profiles** are stored in `chrome.storage.local` on your device

No data ever leaves your browser except through Chrome's built-in sync mechanism for extension settings.

## Permissions Explained

CopyUnlock requests the following permissions:

| Permission | Why It's Needed |
|---|---|
| `activeTab` | To detect and remove copy/paste protections on the current page |
| `scripting` | To dynamically inject content scripts as a fallback when they fail to load |
| `clipboardRead` | To read clipboard contents for clipboard history feature |
| `clipboardWrite` | To write to clipboard when user copies from history |
| `storage` | To save your extension settings and per-site profiles |
| `sidePanel` | To display clipboard history in the Chrome side panel |
| `contextMenus` | To add right-click menu options for copy/paste operations |
| `alarms` | To schedule periodic cleanup of expired clipboard items and license re-checks |
| `offscreen` | To perform clipboard operations in Manifest V3 (required by Chrome) |
| `identity` | To authenticate users for Pro license verification |
| `identity.email` | To look up Pro license status by email (sent only to our license API) |
| `<all_urls>` (host) | To inject the copy/paste unlocker on any website you visit |

### Optional Permission
| Permission | Why It's Needed |
|---|---|
| `tabs` | Only requested if you enable per-site profiles (to read the current tab URL) |

## Third-Party Services

CopyUnlock does not integrate with any third-party services, APIs, or analytics platforms.

## Children's Privacy

CopyUnlock does not knowingly collect any information from children under 13 years of age.

## Changes to This Policy

If we update this privacy policy, the changes will be reflected in the "Last updated" date above. Continued use of the extension after changes constitutes acceptance.

## Contact

For privacy questions or concerns, contact PeakTools Publishing:
- Email: peaktools.publishing@gmail.com
- GitHub: https://github.com/PeakToolsPublishing

## Summary

**CopyUnlock collects zero data. Everything stays on your device. Period.**
