---
title: BugEye Store Listing Copy
permalink: /store-listing
---

# BugEye — store submission copy

Ready-to-paste text for the Chrome Web Store / Edge Add-ons / AMO dashboards.
Keep this in sync with the manifest and PRIVACY.md.

- Privacy policy URL: **https://esther7171.github.io/bugeye/privacy**
- Category: **Developer Tools**
- Version: **1.2.0**

---

## Single purpose (required)

BugEye is a passive reconnaissance, OSINT, and web-application pentest-triage
toolkit for authorized security testing. It observes the page and domain the
user is already testing — headers, cookies, certificates, DNS, exposed paths,
outdated libraries — and returns findings plus copy-paste reference material. It
does not send exploits, brute-force logins, or attack targets on the user's
behalf.

## Short description (≤132 chars)

Passive recon, OSINT & pentest-triage toolkit for authorized security testing. Observes and reports — never auto-attacks.

## Detailed description

BugEye is a minimal-permission browser extension for authorized VAPT, bug-bounty
work, and assets you own. It puts 80+ focused tools in a side panel, organized
into nine "pillars":

- Tab Inspector — grade security headers, audit cookies and CSP, inspect JWTs, test clickjacking/CORS, read storage.
- Page Recon — extract links, scripts, forms, hidden fields, secrets and exposed source maps from the current page.
- List Triage — normalize, alive-check and bulk-open large URL lists.
- Traffic — rewrite request headers, swap the User-Agent, control the Referer, and log requests on the active tab.
- Encode / Payload — encode/decode/hash toolkit and JWT auditing.
- CLI Bridge — build copy-paste commands for common CLI tools (nothing runs inside the extension).
- OSINT — subdomains, DNS, WHOIS/RDAP, certificates, breach checks, and deep links into 30+ public recon search engines.
- Vuln Hunting — reference payloads, access-control diffing, outdated-JS and WordPress checks, GraphQL introspection.
- Utility — AutoFinder one-pass scans, the Bug Bounty Playbook methodology reference, saved targets, and exports.

Privacy-first: no analytics, no telemetry, and no BugEye-run servers. Every
lookup goes straight from your browser to the public service you chose to query.
Anything you enter (targets, notes, optional API keys) stays in local browser
storage.

For authorized use only. BugEye is recon and triage — it does not auto-send
exploit payloads, run denial-of-service, or brute-force logins.

## Justification per permission (Chrome Web Store "Privacy practices")

- **storage** — Save the user's own targets, notes, settings, and optional API keys in local browser storage. Never transmitted to the developer.
- **cookies** — CookieJar reads the active tab's cookies so the user can audit Secure / HttpOnly / SameSite flags and `__Host-`/`__Secure-` prefixes. Read-only; cookies are not exfiltrated.
- **tabs** — Read the active tab's URL to set the testing target, and open user-provided URLs in bulk (BulkOpen).
- **activeTab** — Act on the current tab only when the user explicitly runs a tool against it.
- **scripting** — Inject read-only scans into the current page to read the DOM and loaded resources (list scripts, extract links/forms/secrets, find source maps, read storage). No page modification.
- **webRequest** — Observe response headers of the active tab for header grading, trace redirect chains, and log the tab's own requests for the user to inspect. Observation only.
- **declarativeNetRequest** — Apply user-configured request-header / User-Agent / Referer changes to the active tab for testing, via session rules scoped to that tab. User-initiated and reversible.
- **sidePanel** (Chromium) / **sidebar_action** (Firefox) — The entire BugEye UI is a side panel / sidebar.
- **Optional host access (`http://*/*`, `https://*/*`)** — Requested once, on demand (not at install), so tools can fetch from public recon APIs and from the specific target the user is testing. No static host permissions are declared.

## Remote code

**No.** All code is bundled in the package. No `eval`, no remotely hosted or
dynamically loaded scripts. External links (e.g. documentation, exploit
references) open in the user's browser; they are never fetched and executed by
the extension.

## Data usage / privacy disclosures

- Does this item collect or use user data? **It stores user-entered data (targets, notes, optional API keys) locally in the browser and does not transmit it to the developer.** No analytics or telemetry.
- Data sold to third parties: **No.**
- Data used or transferred for purposes unrelated to the item's core functionality: **No.**
- Data used or transferred to determine creditworthiness or for lending: **No.**
- Network activity: lookups the user triggers go directly from the browser to the chosen third-party public service (each has its own privacy policy). There is no BugEye backend.

## AMO (addons.mozilla.org) submission notes

- Upload `bugeye-<version>-firefox.zip` (from the GitHub release or `npm run zip:firefox`).
- The add-on is bundled/minified, so attach the source: `bugeye-<version>-sources.zip` (on the release).
- Build steps for reviewers:

  ```bash
  npm ci
  npm run zip:firefox
  ```

  Reproduces the reviewed add-on at `.output/bugeye-<version>-firefox.zip`. Node 20+ only; no API keys or network services needed to build.
- Data collection: the manifest declares `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`.
