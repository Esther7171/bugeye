# BugEye

**BugEye - spot what others miss**

A minimal-permission MV3 browser extension for passive recon, OSINT and web-app
pentest triage. Built with [WXT](https://wxt.dev), React, TypeScript, Tailwind
CSS and shadcn-style components. Original codebase - no code reused from any
other extension.

> **Authorized targets / your own assets only.** No active exploitation, no
> DoS, no brute-force runners, no auto-attacking.

Chromium-first: built and tested for Chrome, Edge and Brave. Firefox and
Safari are not supported yet.

## Stack

- WXT (MV3, side panel primary UI)
- React + TypeScript
- Tailwind CSS v4 + hand-rolled shadcn-style primitives (`components/ui`)
- lucide-react icons
- `chrome.storage.local` for settings/state
- All cross-origin network calls proxied through the background service worker
- Minimal static permissions; site access is requested per-origin, on demand

## Layout

- `entrypoints/background.ts` - service worker: message router, fetch proxy,
  DoH resolver, webRequest header capture, tab opener, permission requests.
- `entrypoints/sidepanel/` - the side panel app shell (`App.tsx`).
- `components/shell/` - sidebar, target bar, command palette, theme, banners.
- `components/modules/<name>/` - one self-contained folder per tool.
- `components/modules/registry.ts` - maps module id → component (drop new
  modules in here for v2/v3).
- `lib/` - messaging types, storage helpers, encoding/hashing, grading logic.
- `public/icon/` - the shipped icon set (16/32/48/96/128), built from the logo.
- `assets/bugeye_logo.png` - source logo art. Not shipped in the built
  extension; only `public/` is copied into `.output`.

## The 8 pillars

Tab Inspector · Page Recon · List Triage · Traffic · Encode/Payload ·
CLI Bridge · OSINT · Utility

## Modules (all live)

- **Tab Inspector**: HeaderGrade, CookieJar, ClickjackCheck, CSPAudit,
  CORSCheck, RetireJS, RedirectTrace, CVELookup, HTTPMethods, StorageDump,
  TechStack, WAFDetect
- **Page Recon**: LinkGrab, JSList, SecretScan, FormAudit, HiddenFind,
  LinkedContent, TrackerScan
- **List Triage**: BulkOpen
- **Traffic**: HeaderInject, UASwitch, RefControl, ReqLogger
- **Encode/Payload**: EncoderKit (Base64/URL/HTML/Hex/JWT/Hash/Chain), ShellGen,
  PayloadLib, BlindXSS
- **CLI Bridge**: ReconBuild, LinuxCmds, PEASGet, FuzzBuild, WordlistPick,
  StegGen
- **OSINT**: SubFinder, BucketSpot, ExifPeek, SSLInspect, FaviconHash, IPGeo,
  ShodanPeek, RobotsPeek, SitemapFind, WellKnownScan, PanelHunt, GitFinder,
  Wayback, ContactGrab, EmailHunter, EmailAnalyze, BreachCheck, PhoneAnalyze,
  GoogleDork, GitDork, TakeoverCheck, DNSRecords, DNSSECCheck, HostCluster
- **Utility**: AutoFinder, GuideBook, UploadTest, TargetSave, ExportAll,
  CopyAsCurl, JSONView

See `components/modules/registry.ts` for the id -> component map.

## Develop

```powershell
npm install
npm run dev        # WXT dev server; prints how to load the unpacked build
npm run build       # production build -> .output/chrome-mv3
npm run compile     # type-check only
```

To load manually: `npm run build`, then open `chrome://extensions`, enable
**Developer mode**, click **Load unpacked**, and select `.output/chrome-mv3`.
Open the side panel via the toolbar icon or `Ctrl+Shift+K`.

## Permissions

Declared upfront: `storage`, `cookies`, `tabs`, `sidePanel`, `activeTab`,
`scripting`, `webRequest`, `declarativeNetRequest`. No `host_permissions` are
declared statically - each module requests access to a specific origin only
when you actually use it against that target (see the "why these
permissions?" info button at the bottom of the sidebar).
