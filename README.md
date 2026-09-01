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

## Install for testing (not on any store yet)

BugEye isn't published to the Chrome Web Store or Firefox Add-ons yet, so for
now it's installed manually from a zip - no coding tools required. This is
the "sideloading" step you'd use to share a build with a friend for feedback
before submitting to the stores.

**Get the zip:** download the right one for your browser from the
[**Releases page**](https://github.com/Esther7171/bugeye/releases/latest) -
no account or coding tools needed. (You can also build your own from source
with `npm install` then `npm run zip` / `npm run zip:firefox`, which produces
the same files under `.output/`.)

### Chrome, Edge, Brave, Opera

1. Unzip the chrome zip into its own folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`, Brave:
   `brave://extensions`, Opera: `opera://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the folder you unzipped.
5. Pin BugEye from the puzzle-piece icon in the toolbar, then click it (or
   press `Ctrl+Shift+K`) to open the side panel.

This install persists across restarts. To get updates, unzip a newer build
over the old folder and click the refresh icon on the extension's card in
`chrome://extensions`.

### Firefox

1. Unzip the firefox zip into its own folder.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select the `manifest.json` file
   inside the folder you unzipped (not the folder itself).
4. Open it via the toolbar button, `Ctrl+Shift+K`, or **View > Sidebar >
   BugEye**.

Firefox's "temporary" add-ons are removed when the browser fully restarts -
you'll need to repeat step 2-3 each time. That's a Firefox limitation for
unsigned extensions, not a BugEye bug; it goes away once BugEye is signed
and published on addons.mozilla.org.

### Giving feedback

Recommendations and bugs are welcome as GitHub issues on this repo, or
however you'd normally reach the maintainer - screenshots of anything that
looks wrong are especially useful.

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
