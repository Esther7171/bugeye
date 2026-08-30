import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { originOf } from '@/lib/utils';
import { fingerprintFromHeaders, matchCookieSignatures, type TechHit } from '@/lib/techstack';
import { cookiePermissionPatterns } from '@/lib/cookies';
import { RETIRE_LIBRARIES } from '@/lib/retirejs';
import { exportJson } from '@/lib/export';
import { cveQueryStore } from '@/lib/storage';
import type { ModuleComponentProps } from '@/types';

interface PageSignals {
  generator: string | null;
  scriptSrcs: string[];
  styleSrcs: string[];
  globals: string[];
  classHeuristics: { name: string; count: number }[];
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
// globalNames is passed in via `args` for the same reason.
function scanPageSignals(globalNames: string[]): PageSignals {
  const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? null;

  const scriptSrcs: string[] = [];
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (src) scriptSrcs.push(src);
  });

  const styleSrcs: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => {
    const href = el.getAttribute('href');
    if (href) styleSrcs.push(href);
  });

  const globals = globalNames.filter((name) => {
    try {
      return typeof (window as unknown as Record<string, unknown>)[name] !== 'undefined';
    } catch {
      return false;
    }
  });

  // CSS-framework heuristics: no runtime JS object to check, so count how
  // many elements carry class tokens characteristic of each framework.
  const heuristics: Record<string, RegExp> = {
    'Tailwind CSS': /^(?:flex|grid|hidden|absolute|relative|w-|h-|p[xytblr]?-|m[xytblr]?-|text-|bg-|border|rounded|shadow|gap-|justify-|items-|space-[xy]-|font-|leading-|tracking-|opacity-|z-|transition|duration-|ease-|hover:|focus:|dark:|sm:|md:|lg:|xl:)/,
    'Material UI (MUI)': /^Mui[A-Z]/,
    'Ant Design': /^ant-/,
    'Chakra UI': /^chakra-/,
  };
  const counts: Record<string, number> = { 'Tailwind CSS': 0, 'Material UI (MUI)': 0, 'Ant Design': 0, 'Chakra UI': 0 };
  const seenTokens: Record<string, Set<string>> = {
    'Tailwind CSS': new Set(),
    'Material UI (MUI)': new Set(),
    'Ant Design': new Set(),
    'Chakra UI': new Set(),
  };
  const elements = document.querySelectorAll('[class]');
  const sampleSize = Math.min(elements.length, 4000);
  for (let i = 0; i < sampleSize; i++) {
    const cls = elements[i]!.getAttribute('class');
    if (!cls) continue;
    for (const token of cls.split(/\s+/)) {
      if (!token) continue;
      for (const [name, pattern] of Object.entries(heuristics)) {
        if (pattern.test(token)) seenTokens[name]!.add(token);
      }
    }
  }
  for (const name of Object.keys(heuristics)) counts[name] = seenTokens[name]!.size;

  const classHeuristics = Object.entries(counts)
    .filter(([, count]) => count >= 8)
    .map(([name, count]) => ({ name, count }));

  return { generator, scriptSrcs, styleSrcs, globals, classHeuristics };
}

const CATEGORY_ORDER = [
  'Frameworks',
  'JS libraries',
  'UI',
  'Analytics',
  'Tag managers',
  'CDN',
  'Security',
  'Payment',
  'CMS / Ecommerce',
  'Hosting',
  'Monitoring',
  'Chat / Support',
  'Fonts',
  'Server / backend',
  'Other / raw signals',
];

export function TechStack({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<TechHit[]>([]);
  const [note, setNote] = useState('');
  const { ensure, ensureMany, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setHits([]);
    try {
      const patterns = Array.from(new Set([`https://${target}/*`, ...cookiePermissionPatterns(target)]));
      const granted = await ensureMany(patterns);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }

      const [{ matchFingerprints, allJsGlobals }, res, cookieList] = await Promise.all([
        import('@/lib/techfingerprints'),
        sendToBackground({ type: 'GET_URL_HEADERS', url: `https://${target}/` }),
        browser.cookies.getAll({ domain: target }),
      ]);
      const cookieNames = cookieList.map((c) => c.name);

      // Best-effort DOM read: header/cookie-based fingerprints below still
      // work even if this permission is denied or the tab is not the target.
      let pageData: PageSignals = { generator: null, scriptSrcs: [], styleSrcs: [], globals: [], classHeuristics: [] };
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url) {
        const tabOrigin = originOf(tab.url);
        if (tabOrigin && (await ensure(tabOrigin))) {
          const [injection] = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: scanPageSignals,
            args: [allJsGlobals()],
          });
          pageData = (injection?.result as PageSignals | undefined) ?? pageData;
        }
      }

      const found: TechHit[] = [
        ...fingerprintFromHeaders(res.headers),
        ...matchCookieSignatures(cookieNames),
        ...matchFingerprints({
          headers: res.headers,
          cookieNames,
          scriptSrcs: pageData.scriptSrcs,
          styleSrcs: pageData.styleSrcs,
          metaGenerator: pageData.generator,
          globals: pageData.globals,
        }),
      ];

      if (pageData.generator) {
        found.push({ name: pageData.generator, source: 'meta', detail: 'meta[name=generator]', category: 'Other / raw signals' });
      }
      for (const src of pageData.scriptSrcs) {
        for (const lib of RETIRE_LIBRARIES) {
          const match = lib.filenamePattern ? src.match(lib.filenamePattern) : null;
          if (match?.[1]) {
            found.push({ name: `${lib.name} ${match[1]}`, source: 'script', detail: src, category: 'JS libraries' });
            break;
          }
        }
      }
      for (const h of pageData.classHeuristics) {
        found.push({
          name: h.name,
          source: 'dom',
          detail: `Utility-class heuristic (${h.count} distinct classes matched)`,
          category: 'UI',
        });
      }

      setHits(found);
      if (found.length === 0) setNote('No technology signatures detected from headers, cookies, meta tags, scripts, styles or page globals.');
    } finally {
      setLoading(false);
    }
  }

  function lookupCves(name: string) {
    cveQueryStore.set(name);
    onNavigate('tab-inspector', 'cvelookup');
  }

  const grouped = new Map<string, TechHit[]>();
  for (const h of hits) {
    const cat = h.category ?? 'Other / raw signals';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(h);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="TechStack"
        description="Fingerprints tech from response headers, cookies, meta generator tags, script/stylesheet URLs and page JS globals."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Fingerprint {target || '(set a target)'}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Best-effort from public, client-visible signals. Some stacks are not detectable client-side, and false
          positives are possible.
        </p>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {hits.length > 0 && (
          <>
            {orderedCategories.map((category) => (
              <div key={category} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
                <Card>
                  <CardContent className="flex flex-col divide-y divide-border p-0">
                    {grouped.get(category)!.map((h, i) => (
                      <div key={`${h.name}-${i}`} className="flex items-center justify-between gap-2 p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{h.name}</p>
                          {h.detail && <p className="truncate text-[11px] text-muted-foreground">{h.detail}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="outline" className="normal-case">
                            {h.source}
                          </Badge>
                          <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => lookupCves(h.name)}>
                            <Search className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('techstack', hits)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TechStack;
