export interface DecodedJwt {
  header: unknown;
  payload: unknown;
  signature: string;
  parts: number;
}

export type JwtSeverity = 'fail' | 'warn' | 'info';

export interface JwtFinding {
  id: string;
  severity: JwtSeverity;
  title: string;
  detail: string;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('Not a valid JWT (expected header.payload.signature)');
  const header = JSON.parse(base64UrlDecode(parts[0]!));
  const payload = JSON.parse(base64UrlDecode(parts[1]!));
  return { header, payload, signature: parts[2] ?? '', parts: parts.length };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const WEAK_KIDS = new Set(['', '1', '0', 'key', 'secret', 'hmac', 'default', 'test', 'dev', 'kid', 'none']);

export function auditJwt(token: string): { decoded: DecodedJwt; findings: JwtFinding[] } {
  const decoded = decodeJwt(token);
  const header = asRecord(decoded.header);
  const payload = asRecord(decoded.payload);
  const findings: JwtFinding[] = [];

  const alg = String(header.alg ?? '');
  if (/^none$/i.test(alg)) {
    findings.push({
      id: 'alg-none',
      severity: 'fail',
      title: 'alg:none',
      detail: `Header alg is "${alg}". A verifier that accepts the "none" algorithm treats this as an unsigned token.`,
    });
  }
  if (decoded.parts === 2 || decoded.signature === '') {
    findings.push({
      id: 'unsigned',
      severity: 'fail',
      title: 'Missing signature',
      detail: 'Token has no signature segment (or it is empty).',
    });
  }

  if (!('exp' in payload)) {
    findings.push({
      id: 'no-exp',
      severity: 'fail',
      title: 'Missing expiry',
      detail: 'No exp claim. A stolen token never times out on the server if expiry is not checked.',
    });
  } else {
    const exp = Number(payload.exp);
    if (Number.isFinite(exp) && exp * 1000 < Date.now()) {
      findings.push({
        id: 'expired',
        severity: 'info',
        title: 'Already expired',
        detail: `exp ${exp} (${new Date(exp * 1000).toISOString()}) is in the past.`,
      });
    }
  }

  if ('nbf' in payload) {
    const nbf = Number(payload.nbf);
    if (Number.isFinite(nbf) && nbf * 1000 > Date.now() + 120_000) {
      findings.push({
        id: 'nbf-future',
        severity: 'info',
        title: 'nbf in the future',
        detail: `nbf ${nbf} is more than two minutes ahead of now.`,
      });
    }
  }

  const kid = header.kid === undefined ? undefined : String(header.kid);
  if (kid !== undefined) {
    const reasons: string[] = [];
    if (WEAK_KIDS.has(kid.toLowerCase()) || /^\d+$/.test(kid)) reasons.push('trivial/numeric kid');
    if (/\.\.|[/\\]/.test(kid) || /\.(pem|key|pub|jwk)$/i.test(kid)) {
      reasons.push('looks like a filesystem path');
    }
    if (/^https?:\/\//i.test(kid)) reasons.push('kid is a URL');
    if (reasons.length) {
      findings.push({
        id: 'weak-kid',
        severity: 'warn',
        title: 'Weak kid',
        detail: `"${kid}" - ${reasons.join('; ')}. Path-like kids are a classic key-confusion/file-read signal.`,
      });
    }
  }

  if (header.jku || header.x5u || header.jwk) {
    findings.push({
      id: 'remote-key',
      severity: 'warn',
      title: 'Key material in header',
      detail: 'jku, x5u or jwk is present. If the verifier fetches or trusts this, an attacker who can mint tokens controls the key. Inspect; do not fetch the URL from this panel.',
    });
  }

  if (/^HS/i.test(alg) && kid && (/[/\\]|\.pem$/i.test(kid))) {
    findings.push({
      id: 'hs-path-kid',
      severity: 'warn',
      title: 'HMAC alg + path kid',
      detail: `alg ${alg} with kid "${kid}". Worth confirming the verifier does not treat kid as a file path.`,
    });
  }

  return { decoded, findings };
}

export const JWT_RE = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]*)?/g;
