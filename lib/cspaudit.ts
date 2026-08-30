export type CspCheckState = 'pass' | 'warn' | 'fail';

export interface CspFinding {
  directive: string;
  value: string;
  state: CspCheckState;
  detail: string;
}

export interface CspAuditReport {
  present: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  findings: CspFinding[];
  directives: Record<string, string>;
}

const CRITICAL_DIRECTIVES = ['script-src', 'default-src', 'object-src', 'base-uri', 'frame-ancestors'];

function parseDirectives(csp: string): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const part of csp.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...rest] = trimmed.split(/\s+/);
    if (name) directives[name.toLowerCase()] = rest.join(' ');
  }
  return directives;
}

export function auditCsp(csp: string | undefined): CspAuditReport {
  if (!csp) {
    return {
      present: false,
      grade: 'F',
      score: 0,
      findings: [{ directive: 'Content-Security-Policy', value: '', state: 'fail', detail: 'No CSP header present at all.' }],
      directives: {},
    };
  }

  const directives = parseDirectives(csp);
  const findings: CspFinding[] = [];
  let score = 100;

  const scriptSrc = directives['script-src'] ?? directives['default-src'];
  if (scriptSrc === undefined) {
    findings.push({ directive: 'script-src', value: '', state: 'fail', detail: 'No script-src or default-src fallback.' });
    score -= 25;
  } else {
    if (/'unsafe-inline'/.test(scriptSrc)) {
      findings.push({ directive: 'script-src', value: scriptSrc, state: 'fail', detail: `unsafe-inline allows any inline <script>, defeating most XSS mitigation.` });
      score -= 25;
    }
    if (/'unsafe-eval'/.test(scriptSrc)) {
      findings.push({ directive: 'script-src', value: scriptSrc, state: 'warn', detail: `unsafe-eval allows eval()/Function(), widening the attack surface.` });
      score -= 12;
    }
    if (/(^|\s)\*(\s|$)/.test(scriptSrc) || /https:\s*(\*|$)/.test(scriptSrc)) {
      findings.push({ directive: 'script-src', value: scriptSrc, state: 'warn', detail: `Wildcard source allows loading scripts from any host.` });
      score -= 15;
    }
    if (!findings.some((f) => f.directive === 'script-src')) {
      findings.push({ directive: 'script-src', value: scriptSrc, state: 'pass', detail: 'Restricts script sources.' });
    }
  }

  const objectSrc = directives['object-src'];
  if (objectSrc === undefined || !/'none'/.test(objectSrc)) {
    findings.push({
      directive: 'object-src',
      value: objectSrc ?? '(missing)',
      state: 'warn',
      detail: "Should be 'none' to block legacy plugin-based (Flash/Java) injection vectors.",
    });
    score -= 8;
  } else {
    findings.push({ directive: 'object-src', value: objectSrc, state: 'pass', detail: "Set to 'none'." });
  }

  const baseUri = directives['base-uri'];
  if (baseUri === undefined) {
    findings.push({ directive: 'base-uri', value: '(missing)', state: 'warn', detail: 'Missing base-uri lets an injected <base> tag hijack relative URLs.' });
    score -= 8;
  } else {
    findings.push({ directive: 'base-uri', value: baseUri, state: 'pass', detail: 'base-uri restricted.' });
  }

  const frameAncestors = directives['frame-ancestors'];
  if (frameAncestors === undefined) {
    findings.push({ directive: 'frame-ancestors', value: '(missing)', state: 'warn', detail: 'Missing frame-ancestors leaves clickjacking protection to X-Frame-Options only.' });
    score -= 7;
  } else {
    findings.push({ directive: 'frame-ancestors', value: frameAncestors, state: 'pass', detail: 'Framing is restricted.' });
  }

  const defaultSrc = directives['default-src'];
  if (defaultSrc === undefined) {
    findings.push({ directive: 'default-src', value: '(missing)', state: 'warn', detail: 'No default-src fallback for unlisted directives.' });
    score -= 5;
  }

  for (const [name, value] of Object.entries(directives)) {
    if (CRITICAL_DIRECTIVES.includes(name)) continue;
    if (/(^|\s)\*(\s|$)/.test(value)) {
      findings.push({ directive: name, value, state: 'warn', detail: 'Wildcard source in a non-critical directive.' });
      score -= 3;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const grade: CspAuditReport['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return { present: true, grade, score, findings, directives };
}
