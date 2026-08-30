# Changelog

## 0.1.0 (2026-08-30)

Initial public build.

- Renamed the project from its internal ReconKit codename to BugEye, with the
  tagline "BugEye - spot what others miss".
- Shell: side panel UI, 8-pillar sidebar, sticky target bar, Ctrl+K command
  palette, dark mode default, dismissible authorized-targets banner,
  permission-explanation dialog.
- Full module set across all 8 pillars: Tab Inspector, Page Recon, List
  Triage, Traffic, Encode/Payload, CLI Bridge, OSINT and Utility. See the
  README for the complete, per-pillar list.
- Traffic pillar (HeaderInject, UASwitch, RefControl, ReqLogger) added on top
  of the `declarativeNetRequest` permission, scoped per tab and cleared when
  toggled off or when the tab closes.
- Code-split every module behind `React.lazy`, cutting the initial side panel
  bundle from roughly 800 KB to under 300 KB; heavy per-module dependencies
  (libphonenumber-js, exifr) now load only with the module that needs them.
- Runtime audit pass: every module surfaces loading, empty and error states
  instead of failing silently; external API handlers (crt.sh, ipwho.is/ip-api,
  Shodan InternetDB, XposedOrNot/HIBP, DoH, Wayback CDX) distinguish timeouts,
  rate limits and empty results.
- Added the BugEye logo (`assets/bugeye_logo.png`, source art, not shipped in
  the built extension) and generated the icon set (16/32/48/96/128) from it.
- Added LICENSE (BSD 3-Clause) and this changelog.
- Replaced QuickRecon with AutoFinder: runs every domain-based check (DNS,
  subdomains, headers, CSP, clickjacking, CORS, HTTP methods, TLS cert,
  favicon hash, IP geolocation, Shodan InternetDB, robots.txt, sitemap.xml,
  well-known paths, admin/sensitive paths, exposed .git/.svn/.env, Wayback
  archive, tech fingerprint, outdated JS libraries, cloud storage references)
  in one pass with live progress, then compiles everything into a single
  exportable Markdown or JSON report.
- Target bar now auto-follows the active tab's site by default; typing a
  target manually pauses auto-follow until "use current tab" is clicked again.
- IPGeo: added a manual IP/domain/URL lookup box independent of the target
  bar, plus "Send to BulkOpen" for the resolved IP.
- Fixed low-contrast/hard-to-read rows in JSList.
- Added a module error boundary: a module that fails to load (e.g. a stale
  chunk after rebuilding the extension while the panel was open) or throws
  during render now shows a clear message instead of leaving the panel blank.
- RobotsPeek now alive-checks every Disallow path it finds and flags ones
  that look like admin/login panels (e.g. WordPress's /wp-admin/). PanelHunt
  and AutoFinder now merge robots.txt-disclosed paths into the same admin
  path probe instead of treating them as two separate checks.
- Fixed the Ctrl+K command palette ranking a module's own description above
  its exact name (searching "AutoFinder" surfaced FormAudit first).
- Added a v4 batch of attack-surface modules: TakeoverCheck (subdomain
  takeover detection via CNAME fingerprint plus body-signature confirmation,
  24 provider fingerprints), DNSRecords (full A/AAAA/CNAME/MX/NS/TXT/SOA/CAA
  lookup plus SPF/DMARC/DKIM/PTR), DNSSECCheck, HostCluster (groups
  subdomains by shared IP, flags ones outside the apex's apparent range), and
  TrackerScan (third-party tracker/analytics detection). ShodanPeek and
  CookieJar were extended in place instead of adding near-duplicate modules
  for passive port viewing and cookie scope categorization.
- Replaced the logo with a new design and regenerated the icon set
  (16/32/48/96/128) from it.
- Added WAFDetect (Tab Inspector): passive WAF/CDN fingerprinting via
  response headers, cookies and block-page signatures (Cloudflare, Akamai,
  Imperva/Incapsula, AWS WAF/ALB/CloudFront, Sucuri, F5 BIG-IP ASM,
  Barracuda, Fortinet FortiWeb, Wordfence, generic). No active probing;
  outputs a copy-paste `wafw00f` command for active confirmation. Linked from
  HeaderGrade's report.
