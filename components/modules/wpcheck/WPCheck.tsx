import { useState } from 'react';
import { Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import {
  wpscanPluginUrl,
  wpscanThemeUrl,
  coreVersionCveLinks,
  pluginCveLinks,
  themeCveLinks,
  wpResultToMarkdown,
  type WpScanResult,
  type WpComponentHit,
} from '@/lib/wpcheck';
import { exportJson, exportMarkdown } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
// Uses the live DOM rather than a raw-HTML regex, so it also catches
// plugins/themes injected by client-side JS after initial load.
function collectWordPressInfo(): WpScanResult {
  const generator = document.querySelector('meta[name="generator" i]')?.getAttribute('content') ?? '';
  const coreMatch = generator.match(/WordPress\s+([\d.]+)/i);
  const coreVersion = coreMatch ? coreMatch[1]! : null;

  const plugins = new Map<string, string | null>();
  const themes = new Map<string, string | null>();
  let sawWpPath = false;

  document.querySelectorAll('[src],[href]').forEach((el) => {
    const raw = el.getAttribute('src') || el.getAttribute('href');
    if (!raw) return;
    let abs: URL;
    try {
      abs = new URL(raw, document.baseURI);
    } catch {
      return;
    }
    const path = abs.pathname;
    if (path.includes('/wp-content/') || path.includes('/wp-includes/')) sawWpPath = true;
    const ver = abs.searchParams.get('ver');

    const pluginMatch = path.match(/\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//);
    if (pluginMatch) {
      const slug = pluginMatch[1]!;
      if (!plugins.has(slug) || (!plugins.get(slug) && ver)) plugins.set(slug, ver);
    }
    const themeMatch = path.match(/\/wp-content\/themes\/([a-zA-Z0-9_-]+)\//);
    if (themeMatch) {
      const slug = themeMatch[1]!;
      if (!themes.has(slug) || (!themes.get(slug) && ver)) themes.set(slug, ver);
    }
  });

  const isWordPress = /wordpress/i.test(generator) || sawWpPath || plugins.size > 0 || themes.size > 0;

  return {
    isWordPress,
    coreVersion,
    plugins: Array.from(plugins.entries()).map(([slug, version]) => ({ slug, version })),
    themes: Array.from(themes.entries()).map(([slug, version]) => ({ slug, version })),
  };
}

function ComponentCard({
  hit,
  scanUrl,
  cveLinks,
}: {
  hit: WpComponentHit;
  scanUrl: string;
  cveLinks: { id: string; label: string; url: string }[];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{hit.slug}</p>
          <Badge variant={hit.version ? 'outline' : 'muted'} className="normal-case">
            {hit.version ?? 'version not detected'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href={scanUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
            <ExternalLink className="size-3" /> WPScan vulnerability page
          </a>
          {cveLinks.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <ExternalLink className="size-3" /> {l.label}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WPCheck({ onBack }: ModuleComponentProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<WpScanResult | null>(null);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, origin: activeOrigin, url: activeUrl } = useActiveTab();

  async function scan() {
    if (!tabId) {
      setNote('No active tab available.');
      return;
    }
    if (!activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setNote('');
    setResult(null);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({
        target: { tabId },
        func: collectWordPressInfo,
      });
      const scanResult = injection?.result as WpScanResult | undefined;
      if (!scanResult) {
        setNote('Could not read this page.');
        return;
      }
      setResult(scanResult);
      if (!scanResult.isWordPress) setNote('No WordPress generator tag or wp-content/wp-includes paths found on this page.');
    } finally {
      setScanning(false);
    }
  }

  const md = result ? wpResultToMarkdown(activeUrl ?? '', result) : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WPCheck"
        description="Detects the WordPress core version, plugins and themes in use on the active tab, and links each straight to its WPScan vulnerability page."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>
            Versions are read from the page's own markup (generator tag, `?ver=` query strings) - a site that
            strips or spoofs these will under-report. Verify anything flagged before reporting it.
          </p>
        </div>

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {result?.isWordPress && (
          <>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
              <p className="text-xs font-medium">WordPress core</p>
              <Badge variant={result.coreVersion ? 'outline' : 'muted'} className="normal-case">
                {result.coreVersion ?? 'version not detected'}
              </Badge>
            </div>
            {result.coreVersion && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 pl-2.5">
                {coreVersionCveLinks(result.coreVersion).map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                    <ExternalLink className="size-3" /> {l.label}
                  </a>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium">Plugins ({result.plugins.length})</p>
              {result.plugins.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">None detected from page markup.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {result.plugins.map((p) => (
                    <ComponentCard key={p.slug} hit={p} scanUrl={wpscanPluginUrl(p.slug)} cveLinks={pluginCveLinks(p.slug, p.version)} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium">Themes ({result.themes.length})</p>
              {result.themes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">None detected from page markup.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {result.themes.map((t) => (
                    <ComponentCard key={t.slug} hit={t} scanUrl={wpscanThemeUrl(t.slug)} cveLinks={themeCveLinks(t.slug, t.version)} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <CopyButton text={md} label="Copy report" />
              <Button size="sm" variant="outline" onClick={() => exportMarkdown('wpcheck', md)}>
                Export Markdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('wpcheck', result)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WPCheck;
