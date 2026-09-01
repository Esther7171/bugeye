import type { AutoFinderReport } from '@/lib/autofinder';

export interface DiffItem {
  section: string;
  change: 'added' | 'removed' | 'changed';
  detail: string;
}

function setDiff(section: string, before: string[], after: string[]): DiffItem[] {
  const b = new Set(before);
  const a = new Set(after);
  const items: DiffItem[] = [];
  for (const v of a) {
    if (!b.has(v)) items.push({ section, change: 'added', detail: v });
  }
  for (const v of b) {
    if (!a.has(v)) items.push({ section, change: 'removed', detail: v });
  }
  return items;
}

function scalar(section: string, before: string, after: string): DiffItem[] {
  if (before === after) return [];
  return [{ section, change: 'changed', detail: `${before} → ${after}` }];
}

export function diffAutoFinder(previous: AutoFinderReport, current: AutoFinderReport): DiffItem[] {
  const items: DiffItem[] = [];
  items.push(...setDiff('Subdomains', previous.subdomains.list, current.subdomains.list));
  items.push(
    ...scalar(
      'Header grade',
      previous.headerGrade ? `${previous.headerGrade.grade} (${previous.headerGrade.score})` : 'none',
      current.headerGrade ? `${current.headerGrade.grade} (${current.headerGrade.score})` : 'none',
    ),
  );
  items.push(
    ...scalar(
      'CORS reflected',
      previous.cors?.reflected ? 'yes' : 'no',
      current.cors?.reflected ? 'yes' : 'no',
    ),
  );
  items.push(
    ...scalar(
      'Clickjack',
      previous.clickjack?.verdict ?? 'none',
      current.clickjack?.verdict ?? 'none',
    ),
  );
  items.push(
    ...setDiff(
      '.well-known',
      previous.wellknown.filter((w) => w.found).map((w) => w.path),
      current.wellknown.filter((w) => w.found).map((w) => w.path),
    ),
  );
  items.push(
    ...setDiff(
      'Admin/sensitive',
      previous.panelhunt.filter((p) => p.interesting).map((p) => p.path),
      current.panelhunt.filter((p) => p.interesting).map((p) => p.path),
    ),
  );
  items.push(
    ...setDiff(
      'Exposed VCS/env',
      previous.gitfinder.filter((g) => g.exposed).map((g) => g.path),
      current.gitfinder.filter((g) => g.exposed).map((g) => g.path),
    ),
  );
  items.push(
    ...setDiff(
      'Shodan ports',
      (previous.shodan?.ports ?? []).map(String),
      (current.shodan?.ports ?? []).map(String),
    ),
  );
  items.push(
    ...setDiff(
      'Tech',
      [...previous.techHits.map((h) => h.name), ...previous.techGuesses],
      [...current.techHits.map((h) => h.name), ...current.techGuesses],
    ),
  );
  items.push(
    ...setDiff(
      'Outdated JS',
      previous.retireFindings.map((f) => `${f.library}@${f.version}`),
      current.retireFindings.map((f) => `${f.library}@${f.version}`),
    ),
  );
  items.push(
    ...setDiff(
      'Buckets',
      previous.buckets.map((b) => b.url),
      current.buckets.map((b) => b.url),
    ),
  );
  items.push(...setDiff('JS files', previous.jsFiles, current.jsFiles));
  items.push(
    ...setDiff(
      'Secrets',
      previous.secrets.map((s) => `${s.type}:${s.match}`),
      current.secrets.map((s) => `${s.type}:${s.match}`),
    ),
  );
  items.push(...setDiff('IPs', previous.dns.addresses, current.dns.addresses));
  return items;
}
