import {
  Tablet,
  FileSearch,
  ListChecks,
  Activity,
  Binary,
  Terminal,
  Radar,
  Bug,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { PillarId, ModuleMeta } from '@/types';

export interface Pillar {
  id: PillarId;
  name: string;
  icon: LucideIcon;
  // Plain-language one-liner shown at the top of the pillar's tool list, so a
  // newcomer knows what the group is for without opening each tool.
  description: string;
}

export const PILLARS: Pillar[] = [
  { id: 'tab-inspector', name: 'Tab Inspector', icon: Tablet, description: 'Inspect the page you are on: security headers, cookies, tech stack, TLS and CSP.' },
  { id: 'page-recon', name: 'Page Recon', icon: FileSearch, description: 'Pull apart the current page: links, scripts, source maps, secrets and forms.' },
  { id: 'list-triage', name: 'List Triage', icon: ListChecks, description: 'Take a list of URLs and open, alive-check or sort them in bulk.' },
  { id: 'traffic', name: 'Traffic', icon: Activity, description: 'Change the requests your browser sends: headers, User-Agent and Referer.' },
  { id: 'encode-payload', name: 'Encode / Payload', icon: Binary, description: 'Encode and decode data, inspect JWTs, and browse test payloads.' },
  { id: 'cli-bridge', name: 'CLI Bridge', icon: Terminal, description: 'Copy-paste command-line recipes for recon, file transfer and pivoting.' },
  { id: 'osint', name: 'OSINT', icon: Radar, description: 'Learn about a domain from public sources: subdomains, DNS, breaches and people.' },
  { id: 'vuln-hunting', name: 'Vuln Hunting', icon: Bug, description: 'Manual checks and payload references for common web vulnerabilities.' },
  { id: 'utility', name: 'Utility', icon: Wrench, description: 'One-click full scans, the Bug Bounty Playbook, saved targets and exports.' },
];

export const MODULES: ModuleMeta[] = [
  {
    id: 'autofinder',
    pillar: 'utility',
    name: 'AutoFinder',
    description: 'Runs every domain-based check in one pass, compiles a report, and diffs against the last scan of that target.',
    status: 'live',
  },
  {
    id: 'bulkopen',
    pillar: 'list-triage',
    name: 'BulkOpen',
    description: 'Paste, normalize, alive-check and open many endpoints.',
    status: 'live',
  },
  {
    id: 'headergrade',
    pillar: 'tab-inspector',
    name: 'HeaderGrade',
    description: 'Grade security headers A-F for the current tab or a URL.',
    status: 'live',
  },
  {
    id: 'techstack',
    pillar: 'tab-inspector',
    name: 'TechStack',
    description: 'Fingerprints tech from headers, cookies, meta tags, script filenames and page JS globals.',
    status: 'live',
  },
  {
    id: 'cookiejar',
    pillar: 'tab-inspector',
    name: 'CookieJar',
    description: 'Inspect cookies: SameSite, Secure/HttpOnly, and __Host-/__Secure- prefix correctness.',
    status: 'live',
  },
  {
    id: 'subfinder',
    pillar: 'osint',
    name: 'SubFinder',
    description: 'Enumerate subdomains across 5 cross-checked sources: crt.sh, crt.name, CertSpotter, HackerTarget, subdomain.center.',
    status: 'live',
  },
  {
    id: 'paramminer',
    pillar: 'osint',
    name: 'ParamMiner',
    description: 'Mine historical query parameters for a domain from the Wayback Machine - hidden input surface for fuzzing.',
    status: 'live',
  },
  {
    id: 'searchengines',
    pillar: 'osint',
    name: 'SearchEngines',
    description: 'One-click deep links into 30+ recon/OSINT search engines (Shodan, Censys, FOFA, urlscan, VirusTotal...), pre-filled with your target.',
    status: 'live',
  },
  {
    id: 'urlscanpeek',
    pillar: 'osint',
    name: 'UrlScanPeek',
    description: 'Search urlscan.io public scans for a domain: live URLs, subdomains, IPs and page metadata (no API key).',
    status: 'live',
  },
  {
    id: 'bucketspot',
    pillar: 'osint',
    name: 'BucketSpot',
    description: 'Scan the current page for exposed cloud storage buckets.',
    status: 'live',
  },
  {
    id: 'encoderkit',
    pillar: 'encode-payload',
    name: 'EncoderKit',
    description: 'Base64 / URL / HTML entity / Hex / JWT / hashing toolkit.',
    status: 'live',
  },
  {
    id: 'jwtaudit',
    pillar: 'encode-payload',
    name: 'JwtAudit',
    description: 'JWT deep-check: alg:none, missing/expired exp, weak kid, jku/x5u/jwk. Decode-only.',
    status: 'live',
  },
  {
    id: 'reconbuild',
    pillar: 'cli-bridge',
    name: 'ReconBuild',
    description: 'Build copy-paste CLI commands for bbot, httpx, katana & more.',
    status: 'live',
  },
  {
    id: 'netcmds',
    pillar: 'cli-bridge',
    name: 'NetCmds',
    description: 'Ping, traceroute, WHOIS and nmap as copy-paste CLI. Browsers cannot open raw sockets, so nothing is executed here.',
    status: 'live',
  },
  {
    id: 'shellgen',
    pillar: 'encode-payload',
    name: 'ShellGen',
    description: 'Reverse-shell one-liners for every common interpreter, plus TTY upgrades.',
    status: 'live',
  },
  {
    id: 'payloadlib',
    pillar: 'vuln-hunting',
    name: 'PayloadLib',
    description: 'Searchable library of XSS, SQLi, LFI/RFI, SSTI, XXE and redirect payloads.',
    status: 'live',
  },
  {
    id: 'authdiff',
    pillar: 'vuln-hunting',
    name: 'AuthDiff',
    description: 'Fetch a URL with your session and again anonymously, then diff the responses to spot missing access control (IDOR/BOLA).',
    status: 'live',
  },
  {
    id: 'linuxcmds',
    pillar: 'cli-bridge',
    name: 'LinuxCmds',
    description: 'Copy-paste cheats for privesc enumeration, file transfer and pivoting.',
    status: 'live',
  },
  {
    id: 'peasget',
    pillar: 'cli-bridge',
    name: 'PEASGet',
    description: 'Official LinPEAS/WinPEAS download links and run snippets.',
    status: 'live',
  },
  {
    id: 'exifpeek',
    pillar: 'osint',
    name: 'ExifPeek',
    description: 'Parse EXIF metadata from an image entirely client-side.',
    status: 'live',
  },
  {
    id: 'linkgrab',
    pillar: 'page-recon',
    name: 'LinkGrab',
    description: 'Extract and classify every link, script and form action on the page.',
    status: 'live',
  },
  {
    id: 'jslist',
    pillar: 'page-recon',
    name: 'JSList',
    description: 'List every JavaScript file loaded by the current page.',
    status: 'live',
  },
  {
    id: 'sricheck',
    pillar: 'page-recon',
    name: 'SriCheck',
    description: 'Cross-origin script/link tags missing Subresource Integrity (or integrity without crossorigin).',
    status: 'live',
  },
  {
    id: 'secretscan',
    pillar: 'page-recon',
    name: 'SecretScan',
    description: 'Best-effort scan of page HTML/JS for exposed keys and tokens.',
    status: 'live',
  },
  {
    id: 'sourcemapfind',
    pillar: 'page-recon',
    name: 'SourceMapFind',
    description: 'Detects exposed JavaScript source maps (.map) that reconstruct a site\'s original source.',
    status: 'live',
  },
  {
    id: 'guidebook',
    pillar: 'utility',
    name: 'Bug Bounty Playbook',
    description: 'Methodology checklists and guides for upload, recon, auth and headers, with HackTricks links.',
    status: 'live',
  },
  {
    id: 'uploadtest',
    pillar: 'utility',
    name: 'UploadTest',
    description: 'Generate single test files to verify upload validation. Never floods.',
    status: 'live',
  },
  {
    id: 'headerinject',
    pillar: 'traffic',
    name: 'HeaderInject',
    description: 'Add or overwrite request headers on the active tab.',
    status: 'live',
  },
  {
    id: 'uaswitch',
    pillar: 'traffic',
    name: 'UASwitch',
    description: 'Swap the User-Agent sent by the active tab. Desktop, mobile, Googlebot or custom.',
    status: 'live',
  },
  {
    id: 'refcontrol',
    pillar: 'traffic',
    name: 'RefControl',
    description: 'Strip or spoof the Referer header sent by the active tab.',
    status: 'live',
  },
  {
    id: 'reqlogger',
    pillar: 'traffic',
    name: 'ReqLogger',
    description: 'Log requests the active tab makes: method, URL, status. Filter and export.',
    status: 'live',
  },
  {
    id: 'sslinspect',
    pillar: 'osint',
    name: 'SSLInspect',
    description: 'Certificate issuer, validity, expiry countdown and SANs via CT logs.',
    status: 'live',
  },
  {
    id: 'faviconhash',
    pillar: 'osint',
    name: 'FaviconHash',
    description: 'Shodan-compatible favicon MurmurHash3, with a one-click Shodan search link.',
    status: 'live',
  },
  {
    id: 'ipgeo',
    pillar: 'osint',
    name: 'IPGeo',
    description: 'Resolve the target and geolocate its IP: country, ISP, ASN, hosting flag.',
    status: 'live',
  },
  {
    id: 'shodanpeek',
    pillar: 'osint',
    name: 'ShodanPeek',
    description: 'Free InternetDB lookup: open ports, known CVEs, hostnames, tags.',
    status: 'live',
  },
  {
    id: 'clickjackcheck',
    pillar: 'tab-inspector',
    name: 'ClickjackCheck',
    description: 'Tests if the page can be framed. Verdict plus a downloadable PoC HTML.',
    status: 'live',
  },
  {
    id: 'cspaudit',
    pillar: 'tab-inspector',
    name: 'CSPAudit',
    description: 'Parses Content-Security-Policy and grades it, flagging unsafe-inline, unsafe-eval and wildcards.',
    status: 'live',
  },
  {
    id: 'corscheck',
    pillar: 'tab-inspector',
    name: 'CORSCheck',
    description: 'Best-effort test for Origin reflection in Access-Control-Allow-Origin.',
    status: 'live',
  },
  {
    id: 'cachepoison',
    pillar: 'tab-inspector',
    name: 'CachePoison',
    description: 'Canary in unkeyed headers; flags reflection into a cacheable response whose Vary omits that header.',
    status: 'live',
  },
  {
    id: 'hstspreload',
    pillar: 'tab-inspector',
    name: 'HstsPreload',
    description: 'Checks whether the domain is on the public Chromium HSTS preload list (hstspreload.org).',
    status: 'live',
  },
  {
    id: 'retirejs',
    pillar: 'vuln-hunting',
    name: 'RetireJS',
    description: 'Detects outdated JS libraries with known CVEs from a curated signature set.',
    status: 'live',
  },
  {
    id: 'wpcheck',
    pillar: 'vuln-hunting',
    name: 'WPCheck',
    description: 'Detects the WordPress core version, plugins and themes in use, linking each to its WPScan vulnerability page.',
    status: 'live',
  },
  {
    id: 'redirecttrace',
    pillar: 'tab-inspector',
    name: 'RedirectTrace',
    description: 'Follows a redirect chain hop by hop and flags open-redirect or parameter leakage.',
    status: 'live',
  },
  {
    id: 'cvelookup',
    pillar: 'tab-inspector',
    name: 'CVELookup',
    description: 'Builds search links for a tech + version across NVD, MITRE and other CVE databases.',
    status: 'live',
  },
  {
    id: 'httpmethods',
    pillar: 'tab-inspector',
    name: 'HTTPMethods',
    description: 'Safe OPTIONS probe to see which HTTP methods a server advertises as allowed.',
    status: 'live',
  },
  {
    id: 'storagedump',
    pillar: 'tab-inspector',
    name: 'StorageDump',
    description: 'Reads and exports localStorage, sessionStorage and IndexedDB database names.',
    status: 'live',
  },
  {
    id: 'wafdetect',
    pillar: 'tab-inspector',
    name: 'WAFDetect',
    description: 'Passive WAF/CDN fingerprinting via response headers, cookies and block-page signatures.',
    status: 'live',
  },
  {
    id: 'robotspeek',
    pillar: 'osint',
    name: 'RobotsPeek',
    description: 'Fetches robots.txt: Disallow paths and Sitemap references.',
    status: 'live',
  },
  {
    id: 'sitemapfind',
    pillar: 'osint',
    name: 'SitemapFind',
    description: 'Fetches and parses sitemap.xml, following nested sitemap-index files.',
    status: 'live',
  },
  {
    id: 'wellknownscan',
    pillar: 'osint',
    name: 'WellKnownScan',
    description: 'Checks common /.well-known/ paths: security.txt, OpenID config, app links.',
    status: 'live',
  },
  {
    id: 'apispec',
    pillar: 'osint',
    name: 'ApiSpec',
    description: 'Finds exposed swagger.json, openapi.json/yaml, Swagger UI, and Postman collections.',
    status: 'live',
  },
  {
    id: 'panelhunt',
    pillar: 'osint',
    name: 'PanelHunt',
    description: 'Probes a curated list of common admin/login/sensitive paths. Light probing only.',
    status: 'live',
  },
  {
    id: 'graphqlcheck',
    pillar: 'vuln-hunting',
    name: 'GraphQLCheck',
    description: 'Checks common GraphQL paths for introspection left enabled. Single introspection query per path.',
    status: 'live',
  },
  {
    id: 'gitfinder',
    pillar: 'osint',
    name: 'GitFinder',
    description: 'Detects exposed .git, .svn and .env via marker-file validation.',
    status: 'live',
  },
  {
    id: 'wayback',
    pillar: 'osint',
    name: 'Wayback',
    description: 'Queries the Wayback Machine CDX API for archived URLs of the domain.',
    status: 'live',
  },
  {
    id: 'contactgrab',
    pillar: 'osint',
    name: 'ContactGrab',
    description: 'Scrapes the page for emails, phone links and social profile links.',
    status: 'live',
  },
  {
    id: 'emailhunter',
    pillar: 'osint',
    name: 'EmailHunter',
    description: 'Aggregates emails from the page and its internal links, plus pattern-guessing.',
    status: 'live',
  },
  {
    id: 'emailanalyze',
    pillar: 'osint',
    name: 'EmailAnalyze',
    description: 'Format validity, MX/SPF/DMARC lookup, disposable-provider check, Gravatar presence.',
    status: 'live',
  },
  {
    id: 'mailhunt',
    pillar: 'osint',
    name: 'MailHunt',
    description: 'Public email OSINT: Gravatar profile, GitHub search, and search-engine links.',
    status: 'live',
  },
  {
    id: 'userhunt',
    pillar: 'osint',
    name: 'UserHunt',
    description: 'Checks a username against public profiles (GitHub, GitLab, Reddit, npm and more).',
    status: 'live',
  },
  {
    id: 'breachcheck',
    pillar: 'osint',
    name: 'BreachCheck',
    description: 'Checks an email against known breaches via XposedOrNot, or HIBP with your own key.',
    status: 'live',
  },
  {
    id: 'googledork',
    pillar: 'osint',
    name: 'GoogleDork',
    description: 'Ready-to-click Google dork queries for a domain.',
    status: 'live',
  },
  {
    id: 'gitdork',
    pillar: 'osint',
    name: 'GitDork',
    description: 'GitHub/GitLab code-search queries for leaked secrets tied to a company.',
    status: 'live',
  },
  {
    id: 'fuzzbuild',
    pillar: 'cli-bridge',
    name: 'FuzzBuild',
    description: 'Builds ffuf/wfuzz/gobuster/feroxbuster commands for path, param, header, vhost or body fuzzing.',
    status: 'live',
  },
  {
    id: 'wordlistpick',
    pillar: 'cli-bridge',
    name: 'WordlistPick',
    description: 'Common SecLists wordlists: local -w path or a wget command to fetch one.',
    status: 'live',
  },
  {
    id: 'steggen',
    pillar: 'cli-bridge',
    name: 'StegGen',
    description: 'Generates steghide/zsteg/exiftool/binwalk command lines for a given file.',
    status: 'live',
  },
  {
    id: 'blindxss',
    pillar: 'vuln-hunting',
    name: 'BlindXSS',
    description: 'Generates blind-XSS payloads pointing at your collector, plus WAF-bypass variants.',
    status: 'live',
  },
  {
    id: 'blindsqli',
    pillar: 'vuln-hunting',
    name: 'BlindSQLi',
    description: 'Generates out-of-band and time-based blind SQLi payloads pointing at your collector.',
    status: 'live',
  },
  {
    id: 'phpfilterchain',
    pillar: 'vuln-hunting',
    name: 'PHPFilterChain',
    description: 'Generates a php://filter conversion chain that reproduces arbitrary text, for LFI-to-RCE testing.',
    status: 'live',
  },
  {
    id: 'formaudit',
    pillar: 'page-recon',
    name: 'FormAudit',
    description: 'Lists every form: method, action, whether HTTPS, and CSRF token presence.',
    status: 'live',
  },
  {
    id: 'hiddenfind',
    pillar: 'page-recon',
    name: 'HiddenFind',
    description: 'Extracts HTML comments and type=hidden input fields, which often leak info.',
    status: 'live',
  },
  {
    id: 'linkedcontent',
    pillar: 'page-recon',
    name: 'LinkedContent',
    description: 'Lists linked/embedded resources grouped by type, flagging third-party hosts.',
    status: 'live',
  },
  {
    id: 'targetsave',
    pillar: 'utility',
    name: 'TargetSave',
    description: 'Save targets you come back to, with when they were saved and last used.',
    status: 'live',
  },
  {
    id: 'exportall',
    pillar: 'utility',
    name: 'ExportAll',
    description: 'A per-target notes scratchpad, exportable as Markdown or JSON.',
    status: 'live',
  },
  {
    id: 'copyascurl',
    pillar: 'utility',
    name: 'CopyAsCurl',
    description: 'Turns a captured or manually entered request into a curl command.',
    status: 'live',
  },
  {
    id: 'jsonview',
    pillar: 'utility',
    name: 'JSONView',
    description: 'Pretty-print and collapsible tree view for pasted JSON or API responses.',
    status: 'live',
  },
  {
    id: 'takeovercheck',
    pillar: 'osint',
    name: 'TakeoverCheck',
    description: 'Subdomain takeover detection: CNAME fingerprint plus best-effort page-body confirmation.',
    status: 'live',
  },
  {
    id: 'dnsrecords',
    pillar: 'osint',
    name: 'DNSRecords',
    description: 'Full DNS record lookup: A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, plus SPF/DMARC/DKIM and PTR.',
    status: 'live',
  },
  {
    id: 'whoislookup',
    pillar: 'osint',
    name: 'WhoisLookup',
    description: 'Registrar and contact data via RDAP, HackerTarget WHOIS API, and the who.is web page.',
    status: 'live',
  },
  // reversewhois removed: every reverse-WHOIS data source is paid, so the
  // module could never work without the user bringing their own Whoxy key.
  {
    id: 'dnsseccheck',
    pillar: 'osint',
    name: 'DNSSECCheck',
    description: 'Checks whether DNSSEC is enabled and validating for the domain.',
    status: 'live',
  },
  {
    id: 'hostcluster',
    pillar: 'osint',
    name: 'HostCluster',
    description: 'Groups subdomains by shared IP and flags ones outside the apex domain\'s apparent range.',
    status: 'live',
  },
  {
    id: 'trackerscan',
    pillar: 'page-recon',
    name: 'TrackerScan',
    description: 'Scans the page for known third-party trackers and analytics scripts.',
    status: 'live',
  },
];

export function modulesForPillar(pillar: PillarId): ModuleMeta[] {
  return MODULES.filter((m) => m.pillar === pillar);
}

export function pillarById(pillar: PillarId): Pillar | undefined {
  return PILLARS.find((p) => p.id === pillar);
}

export function pillarName(pillar: PillarId): string {
  return pillarById(pillar)?.name ?? pillar;
}

// Ranked search across every module (name and description), used by the
// in-panel "search all tools" box. Name matches outrank description matches so
// an exact tool name always comes first.
export function searchModules(query: string): ModuleMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { mod: ModuleMeta; score: number }[] = [];
  for (const mod of MODULES) {
    const name = mod.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (mod.description.toLowerCase().includes(q)) score = 30;
    if (score > 0) scored.push({ mod, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.mod.name.localeCompare(b.mod.name)).map((s) => s.mod);
}
