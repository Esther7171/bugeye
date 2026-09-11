# Changelog

## 1.2.0 (2026-09-11)

Three new modules:

- **SourceMapFind** (Page Recon): scans the current page's scripts for reachable
  JavaScript source maps (`.map`), via the declared `//# sourceMappingURL`
  comment or the conventional `<file>.js.map` path, and lists the original
  source paths an exposed map reveals.
- **ParamMiner** (OSINT): mines historical query parameters for a domain from
  the Wayback Machine CDX index and builds `FUZZ` templates - hidden input
  surface for fuzzing, often on endpoints no longer linked from the live site.
- **AuthDiff** (Vuln Hunting): fetches a URL once with the browser's session
  cookies and once anonymously (read-only GETs), then diffs the responses to
  surface missing access control (IDOR/BOLA). Verdict plus a body diff.

Navigation & usability:

- Every tool list now shows a header naming the current section and what it is
  for, plus an always-visible "search all tools" box that filters by plain
  words (e.g. "subdomain", "cookies", "headers") across every section, with the
  matching tool's section shown as a tag. Nothing was removed; the icon rail and
  Ctrl+K palette still work as before.
- Wayback lookups (Wayback, ParamMiner) now retry with backoff and give a clear
  "archive temporarily overloaded" message instead of failing silently.
- SourceMapFind gained a toggle for the guessed `.js.map` probing (on by
  default) so it can run leaner on script-heavy pages.

## 1.1.0 (2026-09-11)

First store-submission build.

- SubFinder / AutoFinder: added subdomain.center as a subdomain source and
  removed AlienVault OTX, which now requires authentication for the passive-DNS
  endpoint and returned nothing for anonymous callers. crt.sh remains flaky
  (intermittent 502s), so the extra independent source keeps results coming
  when it is down. Sources are now crt.sh, crt.name, CertSpotter, HackerTarget
  and subdomain.center, cross-checked and de-duplicated.
- Renamed the GuideBook module to "Bug Bounty Playbook" (same checklists and
  guides; saved progress is preserved).
- Playbook: each guide now links out to the relevant HackTricks page, with a
  top-level HackTricks link, and a new "EXIF / Image Metadata Exposure" guide
  (how to test upload flows for unstripped EXIF/GPS, cross-linked to ExifPeek).
- Privacy policy updated to match the current set of external services.

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
- SubFinder and AutoFinder now cross-check subdomains across 5 independent
  sources instead of 2: crt.sh, crt.name, CertSpotter and HackerTarget
  (certificate-transparency and DNS-derived), plus OTX passive DNS, merged
  and de-duplicated. Each result in SubFinder shows which source(s) found it.
  HackerTarget and CertSpotter both send permissive CORS headers, so they
  need no host permission at all, unlike the other three.
- Added WAFDetect (Tab Inspector): passive WAF/CDN fingerprinting via
  response headers, cookies and block-page signatures (Cloudflare, Akamai,
  Imperva/Incapsula, AWS WAF/ALB/CloudFront, Sucuri, F5 BIG-IP ASM,
  Barracuda, Fortinet FortiWeb, Wordfence, generic). No active probing;
  outputs a copy-paste `wafw00f` command for active confirmation. Linked from
  HeaderGrade's report.
- Added PRIVACY.md and a docs/ site (GitHub Pages, /docs, `docs/privacy.md`)
  for the Chrome Web Store / Edge Add-ons privacy-policy URL requirement.
  Added `npm run package`, which builds and copies the unpacked extension to
  `bugeye-v1/` and the store zip to `bugeye-v1.zip`.
- CookieJar: added a per-cookie delete button (confirm-before-delete via the
  existing `confirm()` pattern already used in BulkOpen).
- TechStack moved up to just under HeaderGrade in the Tab Inspector list, and
  its detection was substantially expanded: a new, separately lazy-loaded
  fingerprint dataset (`lib/techfingerprints.ts`, loaded only when a scan
  runs, not with the module itself) matches ~90 technologies across
  Frameworks, JS libraries, UI, Analytics, Tag managers, CDN, Security,
  Payment, CMS/Ecommerce, Hosting, Monitoring, Chat/Support and Fonts,
  against response headers, real cookie names (via `chrome.cookies`, not just
  the Set-Cookie response header), meta generator, script and stylesheet
  URLs, and JS globals read from the page. Adds a small class-token heuristic
  for CSS frameworks with no runtime JS object (Tailwind, MUI, Ant Design,
  Chakra). Results are grouped by category, with an honest best-effort note.
- Fixed the root cause of the target bar not following tab switches: its
  text input committed (and silently locked auto-follow) on every blur, even
  an incidental one from clicking away to switch browser tabs, not just on
  an actual edit. Now it only commits when the draft differs from the
  current target. Added a pin/unpin toggle to lock or resume auto-follow
  explicitly.
- JSList: each script URL now renders on its own row in monospace with a
  title tooltip for the full URL and a per-row copy button, instead of a
  single cramped truncated line. Added "Send to BulkOpen" (same pattern as
  LinkGrab).
- Fixed HeaderInject actually applying rules: `declarativeNetRequest`'s
  `RuleCondition.resourceTypes`, when left unspecified, defaults to "all
  resource types except main_frame" - so with only a `{ tabIds }` condition,
  rules silently never touched the tab's own page navigation, only its
  sub-resources. That's exactly what visiting a URL directly to check
  headers does. Fixed by listing `resourceTypes` explicitly (including
  `main_frame`) on every session rule (HeaderInject, UASwitch, RefControl).
- ShellGen: added a link to revshells.com and several more shell variants
  (Python2, base64-encoded PowerShell, Go, Lua, Node.js, Groovy, Telnet).
  Investigated the "not working" report: the module itself has no bug: this
  machine's Windows Defender has been quarantining every built ShellGen
  chunk on-access (confirmed via `Get-MpThreatDetection`) because it
  contains literal reverse-shell one-liners, a real-time AV false positive
  local to this dev machine, not a code defect.
- PayloadLib: added 13 new reference-only categories (SQLi advanced bypass,
  XSS modern bypasses, path traversal + encoded, command injection encoded,
  SSRF + protocol smuggling, NoSQL injection + advanced, LDAP injection,
  CRLF injection, HTTP parameter pollution, HTTP request smuggling
  (reference/manual only), UTF-8/Unicode bypass, and four header-based
  categories that cross-link to HeaderInject/UASwitch), plus expanded XXE
  and SSTI with framework-specific vectors. All copy-only reference strings;
  BugEye does not send them.
- Added BlindSQLi (Encode/Payload): out-of-band (DNS-exfil via xp_dirtree,
  LOAD_FILE, UTL_INADDR, XXE-via-XMLType) and time-based blind SQLi payload
  generator pointing at a collector domain, mirroring BlindXSS's exact
  generation-only UX. Confirmed BlindXSS/PayloadLib never auto-send payloads
  to a live target before building this, so this mirrors that safe pattern.
- GuideBook: added "WAF Bypass Testing (manual methodology)": one payload at
  a time through a proxy, reading the response, never automated spraying.
  Did not build an active WAF-bypass tester that sends live payloads: that
  would be auto-exploitation, against BugEye's own policy and store rules.
- ContactGrab/EmailHunter: clarified in the UI that both already work off
  the current tab's DOM and existing session, no separate login or
  third-party service involved.
- TechStack: added version extraction where a real signal exists (CDN paths
  with an embedded version, "Name X.Y.Z" meta generator content, and
  version properties read directly off React/Vue/jQuery/Angular globals
  when present), left blank everywhere else rather than guessing. Evaluated
  and declined bundling Wappalyzer's dataset or calling its API: the
  dataset's license and the API are both restrictive/paid; kept the
  hand-authored fingerprint set.
- HTTPMethods: layout polish (more room around the Allow-methods badges, a
  bordered CORS/best-effort caveat box). No behavior change; still OPTIONS
  only.
- Added WhoisLookup (OSINT): registrar, registration/expiry/last-changed
  dates, status flags, nameservers and DNSSEC-signed status, plus a
  color-coded expiry countdown, via RDAP (the IETF/ICANN HTTP+JSON
  replacement for the legacy WHOIS protocol, which needs a raw TCP socket
  a browser cannot open at all). rdap.org's bootstrap and the registries it
  redirects to both send permissive CORS headers, so this needs no host
  permission, same as HackerTarget/CertSpotter. When a domain is not
  currently registered, shows that plainly with buy/check-availability
  links (Namecheap, Porkbun, GoDaddy) instead of an error.
- Fixed AutoFinder's cached-report restore firing mid-scan (or right after
  a target change during one), which could show mismatched or stale data;
  it now only restores/clears once no scan is in flight.
- Fixed exported files sometimes downloading under the blob's internal UUID
  instead of the intended name: the code revoked the blob URL after a fixed
  2-second timer, which could race a "Save As" dialog if the user has "Ask
  where to save each file" on. Delay increased to 60 seconds.
- Fixed SSLInspect: it fetched crt.sh without ever requesting host
  permission for it first, unlike every other crt.sh-consuming module
  (SubFinder, AutoFinder). Found during a full domain recheck against
  broomees.com: SSLInspect silently failed for any user who had not
  already granted crt.sh permission via one of those other modules. Now
  requests it the same way they do before fetching.
- AutoFinder now also covers links/scripts/form actions (LinkGrab-style,
  internal vs external), every JavaScript file referenced, and a
  best-effort exposed-keys/tokens scan (SecretScan-style patterns), all
  three flowing into the Markdown/JSON/Word export like everything else in
  the report. These read the already-fetched static homepage HTML (the
  same way the existing outdated-JS-library and cloud-storage checks
  already do), not a live-rendered tab, so no new permission and no
  requirement to have the site open - the tradeoff is they only see what
  the server actually sent, not anything client-side JS adds after load;
  the standalone LinkGrab/SecretScan modules on an open tab still give the
  fuller, post-render picture, and the report says so.
- Added NetCmds (CLI Bridge): copy-paste ping, traceroute, whois, nmap and
  naabu for the current target, with Windows vs Linux/macOS variants. The
  module exists because those four genuinely cannot run inside an MV3
  extension (no raw sockets, no ICMP, no TCP/43). Cross-links to WhoisLookup
  (RDAP) and ShodanPeek (passive InternetDB ports) as the in-browser
  substitutes. Nothing is executed by the extension.
- WhoisLookup now collects from three HTTP sources in one pass: RDAP
  (rdap.org, including IP RDAP), HackerTarget's free WHOIS API, and the
  who.is web page (host permission on demand). Parses published emails out
  of the raw records. Still no port 43.
- Added MailHunt (OSINT): Gravatar JSON profile plus unauthenticated GitHub
  user/commit search, with Google/Bing/DuckDuckGo/Hunter/Epieos/IntelX
  links. Added UserHunt (OSINT): GET-probes public profile URLs for a
  username (GitHub, GitLab, Reddit, npm, PyPI, and others). Neither module
  hits login or password-reset endpoints.
- Added SriCheck (cross-origin script/link without integrity), ApiSpec
  (exposed swagger/openapi/Postman bodies), JwtAudit (alg:none, missing exp,
  weak kid; decode-only, also wired into EncoderKit's JWT tab), CachePoison
  (one canary request in unkeyed headers; flags reflection into a
  shared-cacheable response, detection, not poisoning other users),
  HstsPreload (public hstspreload.org membership). CookieJar now audits
  SameSite and __Host-/__Secure- prefix rules. AutoFinder keeps the previous
  scan per target and diffs subdomains, grades, CORS, paths, ports, tech,
  JS and secrets.
- Rebuilt Export Word (AutoFinder) as an actual .docx file: a hand-written,
  zero-dependency ZIP writer (`lib/zip.ts`) plus a small markdown-to-
  WordprocessingML converter (`lib/docx.ts`) producing real OOXML parts
  ([Content_Types].xml, _rels/.rels, word/document.xml,
  word/_rels/document.xml.rels). Previously this was an HTML file wearing
  a .doc extension and MIME type, a trick Word happens to open but which
  isn't an actual Word-format file and can get misread or flagged by
  stricter parsers. Verified by extracting the real output with .NET's
  ZipFile class and confirming every XML part is well-formed and the text
  content (458 runs on a real AutoFinder report) is intact.
- Removed AutoFinder Export Word and the in-extension ZIP/OOXML writer
  (`lib/zip.ts`, `lib/docx.ts`). Reports stay Markdown and JSON.
- Firefox MV3: WXT maps the side panel to `sidebar_action`, gecko id
  `bugeye@esther7171.github.io` (min 128), no Chromium-only `sidePanel`
  permission, toolbar click toggles the sidebar, and webRequest header
  capture omits Chrome's `extraHeaders` flag which Firefox rejects. Host
  permission prompts run in the sidebar (not the background) so Firefox
  still sees the click as a user gesture. `npm run package` now also emits
  `bugeye-v1-firefox/` and `bugeye-v1-firefox.zip`.
