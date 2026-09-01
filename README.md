# BugEye

<div align="center">
  <img width="250" height="250" alt="logo" src="https://github.com/user-attachments/assets/e26102fa-658e-4d6c-9c80-5f88a726b0f2" />
</div>

**BugEye - spot what others miss**

A minimal-permission MV3 browser extension for passive recon, OSINT and web-app
pentest triage. Built with [WXT](https://wxt.dev), React, TypeScript, Tailwind
CSS and shadcn-style components. Original codebase - no code reused from any
other extension.

> For contracted VAPT, bug bounty, and assets you own or are explicitly
> authorized to test. BugEye is recon and OSINT triage: public records,
> fingerprints, and copy-paste CLI. It does not auto-send exploit payloads,
> run DoS, or brute-force logins.

Chromium and Firefox: built for Chrome, Edge, Brave, and Firefox (MV3). Safari
is not supported.

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
  CORSCheck, CachePoison, HstsPreload, RetireJS, RedirectTrace, CVELookup,
  HTTPMethods, StorageDump, TechStack, WAFDetect
- **Page Recon**: LinkGrab, JSList, SriCheck, SecretScan, FormAudit, HiddenFind,
  LinkedContent, TrackerScan
- **List Triage**: BulkOpen
- **Traffic**: HeaderInject, UASwitch, RefControl, ReqLogger
- **Encode/Payload**: EncoderKit (Base64/URL/HTML/Hex/JWT/Hash/Chain), JwtAudit,
  ShellGen, PayloadLib, BlindXSS, BlindSQLi
- **CLI Bridge**: ReconBuild, NetCmds, LinuxCmds, PEASGet, FuzzBuild,
  WordlistPick, StegGen
- **OSINT**: SubFinder, BucketSpot, ExifPeek, SSLInspect, FaviconHash, IPGeo,
  ShodanPeek, RobotsPeek, SitemapFind, WellKnownScan, ApiSpec, PanelHunt,
  GitFinder, Wayback, ContactGrab, EmailHunter, EmailAnalyze, MailHunt,
  UserHunt, BreachCheck, GoogleDork, GitDork, TakeoverCheck,
  DNSRecords, DNSSECCheck, HostCluster, WhoisLookup
- **Utility**: AutoFinder, GuideBook, UploadTest, TargetSave, ExportAll,
  CopyAsCurl, JSONView

See `components/modules/registry.ts` for the id -> component map.

## Develop

```powershell
npm install
npm run dev          # Chromium WXT dev server
npm run dev:firefox  # Firefox
npm run build        # -> .output/chrome-mv3
npm run build:firefox
npm run compile      # type-check only
```

**Chrome / Edge / Brave:** `npm run build`, then `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`. Open the side panel via the toolbar icon or `Ctrl+Shift+K`.

**Firefox:** `npm run build:firefox`, then `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `.output/firefox-mv3/manifest.json`. Open via the toolbar button, `Ctrl+Shift+K`, or View → Sidebar → BugEye.

## Permissions

Declared upfront: `storage`, `cookies`, `tabs`, `activeTab`, `scripting`,
`webRequest`, `declarativeNetRequest`. Chromium also uses `sidePanel`; Firefox
uses `sidebar_action` instead. No `host_permissions` are declared statically -
each module requests access to a specific origin only
when you actually use it against that target (see the "why these
permissions?" info button at the bottom of the sidebar).

## Privacy

BugEye collects no personal data, has no analytics or telemetry, and runs no
server of its own - every request goes straight from your browser to the
public service you asked it to query. See [PRIVACY.md](PRIVACY.md) for the
full policy, also published at
https://esther7171.github.io/bugeye/privacy.

### Publishing the privacy policy (one-time, manual)

The policy source lives at `docs/privacy.md`. To make it public via GitHub
Pages:

1. Go to the repo's **Settings > Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Set **Branch** to `master` (or `main`) and **Folder** to `/docs`, then
   **Save**.
4. GitHub builds and serves the site within a few minutes. The final URL to
   paste into the Chrome Web Store / Edge Add-ons privacy field is:
   https://esther7171.github.io/bugeye/privacy
   (GitHub Pages runs Jekyll by default on `/docs`; `docs/privacy.md` sets
   `permalink: /privacy` in its front matter so it is served at that exact
   path. If it 404s at first, give the Pages build a minute and check the
   trailing-slash version, https://esther7171.github.io/bugeye/privacy/.)
