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

**This section is for testers, not programmers.** You do not need to install
Node.js, npm, or run any commands - just download a file and click a few
buttons in your browser's settings. (If you're a developer who wants to run
the code from source instead, skip down to the [Develop](#develop) section.)

BugEye isn't published to the Chrome Web Store or Firefox Add-ons yet, so
until then, this "sideloading" process is the only way to install it.

### Step 1: Download the file

Go to the [**Releases page**](https://github.com/Esther7171/bugeye/releases/latest)
and click the file for your browser to download it:

- **Chrome, Edge, Brave, or Opera** → click the file ending in `-chrome.zip`
- **Firefox** → click the file ending in `-firefox.zip`

It'll save to your computer's Downloads folder, same as any other download.

### Step 2: Unzip it

A `.zip` file is a compressed folder - your computer needs to unpack it
before the files inside can be used.

- **Windows:** find the downloaded file in File Explorer, right-click it,
  and choose **Extract All...** This creates a new, uncompressed folder
  next to it.
- **Mac:** find it in Finder and double-click it. This creates a new folder
  next to it automatically.

Keep track of where that new folder ends up (usually right there in
Downloads) - you'll pick it in Step 4.

> **Don't run `npm install` or any other command here.** This folder is
> already a finished, ready-to-use extension - that's what "unpacked" means.
> There's nothing left to build; the next steps just point your browser at
> this folder directly.

### Step 3: Turn on Developer mode

This is a normal, safe setting built into every Chromium/Firefox browser
for installing extensions that aren't from the official store. It doesn't
make your browser less secure by itself.

**Chrome, Edge, Brave, Opera:**
1. Copy this into your address bar and press Enter: `chrome://extensions`
   (Edge: `edge://extensions`, Brave: `brave://extensions`, Opera:
   `opera://extensions`)
2. In the top-right corner of that page, find the **Developer mode** switch
   and turn it on.

**Firefox:**
1. Copy this into your address bar and press Enter:
   `about:debugging#/runtime/this-firefox`
   (Nothing extra to turn on for Firefox - go straight to Step 4.)

### Step 4: Load the extension

**Chrome, Edge, Brave, Opera:**
1. On the extensions page, click the **Load unpacked** button that
   appeared after you turned on Developer mode.
2. A file picker opens - select the folder you unzipped in Step 2 (select
   the folder itself, not a file inside it), then confirm.
3. BugEye now appears in your list of extensions.

**Firefox:**
1. On the page from Step 3, click **Load Temporary Add-on...**
2. In the file picker, open the folder you unzipped and select the
   `manifest.json` file inside it (this time it's a specific file, not the
   folder).
3. BugEye now appears in your list of add-ons.

### Step 5: Open it

- Click the puzzle-piece icon in your browser's toolbar, find BugEye, and
  click the pin icon so it stays visible.
- Click the BugEye icon (or press `Ctrl+Shift+K`) to open its side panel.

### Keeping it working

- **Chrome/Edge/Brave/Opera:** this install stays put even if you restart
  your browser. To get a future update, download the new zip, unzip it over
  the same folder, then click the refresh icon on BugEye's card on the
  extensions page.
- **Firefox:** add-ons loaded this way ("temporary") are removed every time
  Firefox fully restarts - you'll need to repeat Steps 3-4 again afterward.
  That's a Firefox rule for unsigned extensions, not a BugEye bug. It goes
  away once BugEye is signed and published on addons.mozilla.org.

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
