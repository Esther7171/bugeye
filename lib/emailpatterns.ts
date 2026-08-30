export function guessEmailPatterns(fullName: string, domain: string): string[] {
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || !domain) return [];
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : '';
  const f = first[0] ?? '';
  const l = last[0] ?? '';

  const patterns = new Set<string>();
  patterns.add(`${first}@${domain}`);
  if (last) {
    patterns.add(`${first}.${last}@${domain}`);
    patterns.add(`${first}${last}@${domain}`);
    patterns.add(`${first}_${last}@${domain}`);
    patterns.add(`${f}${last}@${domain}`);
    patterns.add(`${f}.${last}@${domain}`);
    patterns.add(`${first}${l}@${domain}`);
    patterns.add(`${first}.${l}@${domain}`);
    patterns.add(`${last}.${first}@${domain}`);
    patterns.add(`${last}${first}@${domain}`);
    patterns.add(`${last}@${domain}`);
  }
  return Array.from(patterns);
}
