export type ClickjackVerdict = 'framable' | 'protected' | 'partial';

export interface ClickjackResult {
  verdict: ClickjackVerdict;
  xfo?: string;
  frameAncestors?: string;
  detail: string;
}

function get(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export function assessClickjacking(headers: Record<string, string>): ClickjackResult {
  const xfo = get(headers, 'x-frame-options');
  const csp = get(headers, 'content-security-policy');
  const frameAncestorsMatch = csp?.match(/frame-ancestors[^;]*/i);
  const frameAncestors = frameAncestorsMatch?.[0];

  if (frameAncestors && /'none'|'self'/i.test(frameAncestors) && !frameAncestors.includes('*')) {
    return {
      verdict: 'protected',
      frameAncestors,
      detail: `CSP frame-ancestors restricts framing: ${frameAncestors}`,
    };
  }

  if (xfo && /deny|sameorigin/i.test(xfo)) {
    return { verdict: 'protected', xfo, detail: `X-Frame-Options: ${xfo}` };
  }

  if (xfo || frameAncestors) {
    return {
      verdict: 'partial',
      xfo,
      frameAncestors,
      detail: 'A framing header is present but does not clearly deny all framing. Verify manually.',
    };
  }

  return {
    verdict: 'framable',
    detail: 'No X-Frame-Options or CSP frame-ancestors found. The page can likely be framed by any origin.',
  };
}

export function clickjackPoc(url: string): string {
  return `<!doctype html>
<html>
  <head>
    <title>BugEye clickjacking PoC</title>
    <style>
      body { margin: 0; font-family: sans-serif; }
      .banner { background: #111; color: #fff; padding: 8px 12px; font-size: 13px; }
      iframe { width: 100%; height: 90vh; border: 0; opacity: 0.85; }
    </style>
  </head>
  <body>
    <div class="banner">BugEye clickjacking PoC for ${url}. Authorized testing only.</div>
    <iframe src="${url}"></iframe>
  </body>
</html>
`;
}
