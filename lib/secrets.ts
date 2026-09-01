export interface SecretHit {
  type: string;
  match: string;
  context: string;
}

export const SECRET_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/g },
  { type: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/g },
  { type: 'Slack Token', re: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  { type: 'JWT', re: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g },
  { type: 'Bearer token', re: /Bearer\s+[A-Za-z0-9\-_.=]{10,}/g },
  { type: 'Generic api_key', re: /api[_-]?key["'\s]*[:=]\s*["'][a-zA-Z0-9_\-]{12,}["']/gi },
  { type: 'Generic secret', re: /secret["'\s]*[:=]\s*["'][^"'\s]{8,}["']/gi },
];

// Scans `text` and merges hits into `found` (or a fresh Map), so callers can
// run this across several sources (page HTML, several external JS files) and
// end up with one deduped result set.
export function findSecrets(text: string, found: Map<string, SecretHit> = new Map()): Map<string, SecretHit> {
  for (const { type, re } of SECRET_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const match = m[0];
      const index = m.index ?? 0;
      const context = text.slice(Math.max(0, index - 30), index + match.length + 30).replace(/\s+/g, ' ');
      const key = `${type}:${match}`;
      if (!found.has(key)) found.set(key, { type, match, context });
    }
  }
  return found;
}
