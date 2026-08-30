export type CheckState = 'pass' | 'warn' | 'fail' | 'na';

export interface HeaderCheck {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
}

export interface HeaderGradeReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  checks: HeaderCheck[];
}

function get(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export function gradeHeaders(headers: Record<string, string>): HeaderGradeReport {
  const checks: HeaderCheck[] = [];
  let score = 0;

  const csp = get(headers, 'content-security-policy');
  checks.push({
    id: 'csp',
    label: 'Content-Security-Policy',
    state: csp ? 'pass' : 'fail',
    detail: csp ? csp : 'Missing - no mitigation against XSS/injection via resource loading.',
  });
  if (csp) score += 22;

  const hsts = get(headers, 'strict-transport-security');
  checks.push({
    id: 'hsts',
    label: 'Strict-Transport-Security',
    state: hsts ? 'pass' : 'fail',
    detail: hsts ? hsts : 'Missing - connections can be downgraded to HTTP.',
  });
  if (hsts) score += 18;

  const xfo = get(headers, 'x-frame-options');
  const cspFrameAncestors = csp?.includes('frame-ancestors');
  checks.push({
    id: 'xfo',
    label: 'X-Frame-Options',
    state: xfo || cspFrameAncestors ? 'pass' : 'fail',
    detail: xfo
      ? xfo
      : cspFrameAncestors
        ? 'Covered by CSP frame-ancestors'
        : 'Missing - page can be framed (clickjacking risk).',
  });
  if (xfo || cspFrameAncestors) score += 15;

  const xcto = get(headers, 'x-content-type-options');
  checks.push({
    id: 'xcto',
    label: 'X-Content-Type-Options',
    state: xcto?.toLowerCase() === 'nosniff' ? 'pass' : 'fail',
    detail: xcto ?? 'Missing - browsers may MIME-sniff responses.',
  });
  if (xcto?.toLowerCase() === 'nosniff') score += 12;

  const referrer = get(headers, 'referrer-policy');
  checks.push({
    id: 'referrer',
    label: 'Referrer-Policy',
    state: referrer ? 'pass' : 'warn',
    detail: referrer ?? 'Missing - full referrer may leak to third parties.',
  });
  if (referrer) score += 10;

  const permissions = get(headers, 'permissions-policy');
  checks.push({
    id: 'permissions',
    label: 'Permissions-Policy',
    state: permissions ? 'pass' : 'warn',
    detail: permissions ?? 'Missing - no restriction on browser feature access.',
  });
  if (permissions) score += 8;

  const setCookie = get(headers, 'set-cookie');
  if (setCookie) {
    const lower = setCookie.toLowerCase();
    const hasSecure = lower.includes('secure');
    const hasHttpOnly = lower.includes('httponly');
    const hasSameSite = lower.includes('samesite');
    const flags = [
      hasSecure ? 'Secure' : null,
      hasHttpOnly ? 'HttpOnly' : null,
      hasSameSite ? 'SameSite' : null,
    ].filter(Boolean);
    const allSet = hasSecure && hasHttpOnly && hasSameSite;
    checks.push({
      id: 'cookies',
      label: 'Set-Cookie flags',
      state: allSet ? 'pass' : 'warn',
      detail: flags.length ? `Present: ${flags.join(', ')}` : 'No Secure/HttpOnly/SameSite flags found.',
    });
    if (allSet) score += 10;
    else if (flags.length > 0) score += 4;
  } else {
    checks.push({
      id: 'cookies',
      label: 'Set-Cookie flags',
      state: 'na',
      detail: 'No Set-Cookie header observed on this response.',
    });
    score += 10;
  }

  const server = get(headers, 'server');
  const poweredBy = get(headers, 'x-powered-by');
  const leaks = [server, poweredBy].filter(Boolean);
  checks.push({
    id: 'leak',
    label: 'Server / X-Powered-By leak',
    state: leaks.length === 0 ? 'pass' : 'warn',
    detail: leaks.length ? leaks.join(', ') : 'No stack-identifying headers exposed.',
  });
  if (leaks.length === 0) score += 5;

  const grade: HeaderGradeReport['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';

  return { grade, score: Math.min(score, 100), checks };
}

export function headerReportToMarkdown(url: string, report: HeaderGradeReport): string {
  const lines = [
    `# HeaderGrade report - ${url}`,
    '',
    `**Grade:** ${report.grade} (${report.score}/100)`,
    '',
    '| Header | Status | Detail |',
    '|---|---|---|',
    ...report.checks.map(
      (c) => `| ${c.label} | ${c.state.toUpperCase()} | ${c.detail.replace(/\|/g, '\\|')} |`,
    ),
  ];
  return lines.join('\n');
}
