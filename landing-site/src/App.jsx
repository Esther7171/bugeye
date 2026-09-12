import TargetCursor from './components/TargetCursor.jsx';
import bugeyeLogo from './assets/bugeye_logo.png';
import edgeLogo from './assets/edge-logo.svg';
import firefoxLogo from './assets/firefox-logo.svg';
import operaLogo from './assets/opera-logo.svg';

const PILLARS = [
  { code: 'TI', name: 'Tab Inspector', desc: "Headers, cookies, JWTs, CSP, clickjacking, CORS and storage, read straight from the tab you're on." },
  { code: 'PR', name: 'Page Recon', desc: 'Pulls links, scripts, forms, hidden fields and embedded resources out of the rendered page.' },
  { code: 'LT', name: 'List Triage', desc: 'Paste, normalize, alive-check and bulk-open large lists of endpoints in one pass.' },
  { code: 'TR', name: 'Traffic', desc: 'Rewrites headers, spoofs the user agent, strips referrers and logs requests on the active tab.' },
  { code: 'EP', name: 'Encode / Payload', desc: 'An encode, decode and hash toolkit, plus a searchable library of XSS, SQLi and other reference payloads.' },
  { code: 'CB', name: 'CLI Bridge', desc: 'Builds copy-paste commands for nuclei, ffuf, wordlists and more. Nothing runs inside the extension.' },
  { code: 'OS', name: 'OSINT', desc: 'Subdomains, WHOIS, DNS, certificates, breach and leak checks, plus deep links into 30+ recon search engines, all from public sources.' },
  { code: 'VH', name: 'Vuln Hunting', desc: 'Manual checks and payload references: access-control diffing (IDOR/BOLA), outdated JS, WordPress, GraphQL introspection and blind XSS/SQLi.' },
  { code: 'UT', name: 'Utility', desc: "AutoFinder's one-pass domain scan, the Bug Bounty Playbook's methodology reference and the rest of the toolbox." },
];

// The full inventory, grouped by pillar - kept in sync with lib/pillars.ts.
const TOOLS = [
  { code: 'TI', name: 'Tab Inspector', items: ['HeaderGrade', 'TechStack', 'CookieJar', 'ClickjackCheck', 'CSPAudit', 'CORSCheck', 'CachePoison', 'HstsPreload', 'RedirectTrace', 'CVELookup', 'HTTPMethods', 'StorageDump', 'WAFDetect'] },
  { code: 'PR', name: 'Page Recon', items: ['LinkGrab', 'JSList', 'SriCheck', 'SecretScan', 'SourceMapFind', 'FormAudit', 'HiddenFind', 'LinkedContent', 'TrackerScan'] },
  { code: 'LT', name: 'List Triage', items: ['BulkOpen'] },
  { code: 'TR', name: 'Traffic', items: ['HeaderInject', 'UASwitch', 'RefControl', 'ReqLogger'] },
  { code: 'EP', name: 'Encode / Payload', items: ['EncoderKit', 'JwtAudit', 'ShellGen'] },
  { code: 'CB', name: 'CLI Bridge', items: ['ReconBuild', 'NetCmds', 'LinuxCmds', 'PEASGet', 'FuzzBuild', 'WordlistPick', 'StegGen'] },
  { code: 'OS', name: 'OSINT', items: ['SubFinder', 'ParamMiner', 'SearchEngines', 'UrlScanPeek', 'BucketSpot', 'ExifPeek', 'SSLInspect', 'FaviconHash', 'IPGeo', 'ShodanPeek', 'RobotsPeek', 'SitemapFind', 'WellKnownScan', 'ApiSpec', 'PanelHunt', 'GitFinder', 'Wayback', 'ContactGrab', 'EmailHunter', 'EmailAnalyze', 'MailHunt', 'UserHunt', 'BreachCheck', 'GoogleDork', 'GitDork', 'TakeoverCheck', 'DNSRecords', 'WhoisLookup', 'DNSSECCheck', 'HostCluster'] },
  { code: 'VH', name: 'Vuln Hunting', items: ['PayloadLib', 'AuthDiff', 'RetireJS', 'WPCheck', 'GraphQLCheck', 'BlindXSS', 'BlindSQLi', 'PHPFilterChain'] },
  { code: 'UT', name: 'Utility', items: ['AutoFinder', 'Bug Bounty Playbook', 'UploadTest', 'TargetSave', 'ExportAll', 'CopyAsCurl', 'JSONView'] },
];

const TOOL_COUNT = TOOLS.reduce((n, g) => n + g.items.length, 0);

// The custom target cursor hides the native cursor and tracks the mouse - on
// touch / coarse-pointer devices that just leaves a stuck element and no
// visible cursor, so it's only mounted where there's a real hovering pointer.
const FINE_POINTER = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const FEATURES = [
  { id: 'feature-autofinder', title: 'One pass, full picture', desc: 'AutoFinder runs every domain-based check at once, DNS through exposed secrets, diffs the result against your last scan of that target, and exports as Markdown, JSON or a formatted Word report with color-coded findings.' },
  { id: 'feature-reference', title: 'Reference, never automated', desc: 'Every payload, reverse-shell one-liner, and exploit-tool link BugEye surfaces is copy-paste. It does not send payloads, brute force logins, or run anything against a target on its own.' },
  { id: 'feature-permission', title: 'One prompt, not fifty', desc: 'Grant host access once, up front, and every tool works on every site afterward with no repeated per-domain permission nags.' },
  { id: 'feature-guidebook', title: 'Method, not just tools', desc: 'The Bug Bounty Playbook explains what a finding actually means, how to verify it safely, and how to report it, not just how to trigger it, with links out to HackTricks.' },
  { id: 'feature-telemetry', title: 'Nothing phones home', desc: "No telemetry, no BugEye-run servers. Cross-origin lookups go straight from your own background worker to the source you're querying." },
  { id: 'feature-cross-browser', title: 'One codebase, every browser', desc: 'The same source builds a Chromium package for Edge and Opera, and a separate Firefox package, with identical features and permission scope across all three.' },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default function App() {
  return (
    <>
      {FINE_POINTER && <TargetCursor cursorColor="#fbf7ee" cursorColorOnTarget="#f0463a" spinDuration={2.4} />}

      <main>
        <section className="hero wrap">
          <div className="hero-frame">
            <img className="hero-logo" src={bugeyeLogo} alt="BugEye logo, a shadowed detective silhouette with one red eye" />
            <span className="hero-corner-bl"></span>
            <span className="hero-corner-br"></span>
          </div>
          <h1>BugEye</h1>
          <p className="tagline">spot what others miss</p>
          <p className="lede">
            A browser extension for <em>passive recon, OSINT and pentest triage</em>. {TOOL_COUNT} tools across nine pillars,
            built to observe and report, not to attack on your behalf.
          </p>
          <div className="badge-row">
            <a className="badge badge-link cursor-target" href="#deployment">Edge, Firefox &amp; Opera</a>
            <a className="badge badge-link cursor-target" href="#feature-reference">Reference only, nothing auto-sent</a>
            <a className="badge badge-link cursor-target" href="#feature-telemetry">Zero telemetry</a>
          </div>
        </section>

        <section className="section wrap">
          <p className="eyebrow">Case brief</p>
          <div className="case-intro" style={{ marginTop: '18px' }}>
            <div className="stamp">
              FIELD<br />USE<br />ONLY
            </div>
            <div>
              <p>
                <strong>BugEye watches the page you're already looking at</strong> and the domain you're already testing, then
                hands you what it finds: headers, cookies, tokens, forms, exposed paths, outdated libraries, cloud buckets, and
                more, all from public and client-visible signals.
              </p>
              <p>
                It does not brute force logins, spray payloads, or send an exploit for you. Every payload, shell one-liner, and
                exploit link BugEye surfaces is copy-paste: you decide when and where it gets used, and you stay inside the
                scope you were authorized for.
              </p>
            </div>
          </div>
        </section>

        <section className="section wrap">
          <p className="eyebrow">The nine pillars</p>
          <div className="pillar-manifest">
            {PILLARS.map(p => (
              <div className="pillar-row cursor-target" key={p.code}>
                <span className="pillar-code">{p.code}</span>
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap">
          <p className="eyebrow">The full toolset</p>
          <p className="toolset-lede">{TOOL_COUNT} tools, all live, grouped by pillar.</p>
          <div className="toolset">
            {TOOLS.map(g => (
              <div className="toolset-group" key={g.code}>
                <div className="toolset-head">
                  <span className="pillar-code">{g.code}</span>
                  <h3>{g.name}</h3>
                  <span className="toolset-count">{g.items.length}</span>
                </div>
                <ul className="toolset-tags">
                  {g.items.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap">
          <p className="eyebrow">Field notes</p>
          <div className="feature-list">
            {FEATURES.map(f => (
              <div className="feature-row" id={f.id} key={f.id}>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap" id="deployment">
          <p className="eyebrow">Deployment</p>
          <div className="kit-row">
            <div className="kit-card">
              <span className="eyebrow">Field kit A</span>
              <div className="kit-card-head">
                <img className="kit-logo" src={edgeLogo} alt="" />
                <h3>Edge</h3>
              </div>
              <p>Microsoft Edge Add-ons listing.</p>
              <a className="btn cursor-target" href="#">Get it for Edge</a>
              <p className="not-yet">Not yet published, link is a placeholder.</p>
            </div>
            <div className="kit-card">
              <span className="eyebrow">Field kit B</span>
              <div className="kit-card-head">
                <img className="kit-logo" src={firefoxLogo} alt="" />
                <h3>Firefox</h3>
              </div>
              <p>Firefox Browser Add-ons listing.</p>
              <a className="btn cursor-target" href="#">Get it for Firefox</a>
              <p className="not-yet">Not yet published, link is a placeholder.</p>
            </div>
            <div className="kit-card">
              <span className="eyebrow">Field kit C</span>
              <div className="kit-card-head">
                <img className="kit-logo" src={operaLogo} alt="" />
                <h3>Opera</h3>
              </div>
              <p>Opera Add-ons listing.</p>
              <a className="btn cursor-target" href="#">Get it for Opera</a>
              <p className="not-yet">Not yet published, link is a placeholder.</p>
            </div>
          </div>

          <div className="howto">
            <h3>Load it yourself, right now</h3>
            <p>BugEye isn't listed on either store yet. Until it is, download the build for your browser and load it manually, developer mode only takes a minute.</p>
            <div className="howto-cols">
              <div>
                <h4>Edge / Opera</h4>
                <ol>
                  <li>Download and unzip the Chromium build.</li>
                  <li>Open <code>edge://extensions</code> (or <code>opera://extensions</code>).</li>
                  <li>Turn on <strong style={{ color: 'var(--paper-bright)', fontWeight: 600 }}>Developer mode</strong>, top right.</li>
                  <li>Click <strong style={{ color: 'var(--paper-bright)', fontWeight: 600 }}>Load unpacked</strong> and select the unzipped folder.</li>
                </ol>
              </div>
              <div>
                <h4>Firefox</h4>
                <ol>
                  <li>Download and unzip the Firefox build.</li>
                  <li>Open <code>about:debugging#/runtime/this-firefox</code>.</li>
                  <li>Click <strong style={{ color: 'var(--paper-bright)', fontWeight: 600 }}>Load Temporary Add-on</strong> and select <code>manifest.json</code> inside the folder.</li>
                  <li>Temporary add-ons unload on restart, reload it the same way until BugEye is listed on addons.mozilla.org.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="section wrap" style={{ borderBottom: 'none' }}>
          <div className="placard">
            <p>
              BugEye is built for authorized security testing only: your own assets, an authorized VAPT engagement, or an
              in-scope bug bounty program. Recon and OSINT triage, no auto-sent exploits, no denial-of-service, no login
              brute-forcing.
            </p>
            <p>You are responsible for staying inside the scope and authorization you actually have. When in doubt, don't run it.</p>
          </div>
        </section>

        <footer className="wrap">
          <span className="brand">BugEye</span>
          <nav>
            <a className="cursor-target" href="./privacy.html">Privacy Policy</a>
            <a className="cursor-target" href="https://github.com/Esther7171/bugeye">
              <GitHubIcon />
              GitHub
            </a>
          </nav>
          <p className="maintainer">
            Maintained by <a className="cursor-target" href="https://github.com/Esther7171">Esther7171</a>
          </p>
        </footer>
      </main>
    </>
  );
}
