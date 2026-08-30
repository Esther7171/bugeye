import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Info } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { normalizeUrl, originOf } from '@/lib/utils';
import { cookiePermissionPatterns } from '@/lib/cookies';
import {
  analyzeHeaders,
  analyzeCookies,
  analyzeBody,
  groupByVendor,
  wafwoofCommand,
  wafReportToMarkdown,
  type WafReport,
} from '@/lib/waf';
import { exportJson, exportMarkdown } from '@/lib/export';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function grabPageHtml(): string {
  return document.documentElement.outerHTML.slice(0, 300000);
}

export function WAFDetect({ onBack }: ModuleComponentProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WafReport | null>(null);
  const [note, setNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  async function buildReport(target: string, headers: Record<string, string>, cookies: { name: string; value: string }[], body: string | null) {
    const evidence = [...analyzeHeaders(headers), ...analyzeCookies(cookies), ...(body ? analyzeBody(body) : [])];
    const vendors = groupByVendor(evidence);
    setReport({
      target,
      checkedHeaders: Object.keys(headers).length > 0,
      checkedCookies: cookies.length > 0,
      checkedBody: !!body,
      evidence,
      vendors,
      generatedAt: formatTimestamp(),
    });
  }

  async function runCurrentTab() {
    setLoading(true);
    setNote('');
    setReport(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        setNote('No active tab URL available.');
        return;
      }
      const origin = originOf(tab.url);
      if (!origin) {
        setNote('Active tab is not an http(s) page.');
        return;
      }
      const hostname = new URL(tab.url).hostname;
      const granted = await ensureMany([origin, ...cookiePermissionPatterns(hostname)]);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }

      const headersRes = await sendToBackground({ type: 'GET_TAB_HEADERS', tabId: tab.id, url: tab.url });
      const cookies = await browser.cookies.getAll({ domain: hostname });

      let body: string | null = null;
      try {
        const [injection] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: grabPageHtml });
        body = (injection?.result as string | undefined) ?? null;
      } catch {
        // best-effort - page may block scripting (e.g. a restricted page)
      }

      await buildReport(headersRes.url, headersRes.headers, cookies, body);
      if (headersRes.error) setNote(headersRes.error);
    } finally {
      setLoading(false);
    }
  }

  async function runTypedUrl() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setNote('Enter a valid URL.');
      return;
    }
    setLoading(true);
    setNote('');
    setReport(null);
    try {
      const origin = originOf(normalized);
      const hostname = new URL(normalized).hostname;
      if (origin) {
        const granted = await ensureMany([origin, ...cookiePermissionPatterns(hostname)]);
        if (!granted) {
          setNote('Host permission was not granted.');
          return;
        }
      }
      const headersRes = await sendToBackground({ type: 'GET_URL_HEADERS', url: normalized });
      const cookies = await browser.cookies.getAll({ domain: hostname });
      const bodyRes = await sendToBackground({ type: 'FETCH_TEXT', url: normalized });
      const body = bodyRes.ok && bodyRes.data ? bodyRes.data.slice(0, 300000) : null;

      await buildReport(headersRes.url, headersRes.headers, cookies, body);
      if (headersRes.error) setNote(`${headersRes.error} (CORS may limit what is readable for a cross-origin fetch.)`);
    } finally {
      setLoading(false);
    }
  }

  const md = report ? wafReportToMarkdown(report) : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WAFDetect"
        description="Passive WAF/CDN fingerprinting via response headers, cookies and block-page signatures. No probing."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Current tab</TabsTrigger>
            <TabsTrigger value="url">Typed URL</TabsTrigger>
          </TabsList>
          <TabsContent value="current">
            <Button size="sm" onClick={runCurrentTab} disabled={loading || pending}>
              {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
              Check this tab
            </Button>
          </TabsContent>
          <TabsContent value="url">
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" />
              <Button size="sm" onClick={runTypedUrl} disabled={loading || pending}>
                {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
                Check
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <p>
            Passive detection only. A missing signature does NOT prove there is no WAF, many WAFs are silent until a
            malicious request triggers them. For active confirmation, run wafw00f in your terminal.
          </p>
        </div>

        {report && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                {report.vendors.length > 0 ? (
                  report.vendors.map((v) => (
                    <div key={v.vendor} className="flex flex-col gap-1">
                      <Badge variant="warning" className="w-fit gap-1">
                        <ShieldAlert className="size-2.5" /> WAF detected: {v.vendor}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">
                        via {v.evidence.map((e) => e.evidenceLabel).join(', ')}
                      </p>
                    </div>
                  ))
                ) : (
                  <Badge variant="success" className="w-fit gap-1">
                    <ShieldCheck className="size-2.5" /> No WAF signature found (passive check)
                  </Badge>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Checked: {report.checkedHeaders ? 'headers' : 'no headers'},{' '}
                  {report.checkedCookies ? 'cookies' : 'no cookies'},{' '}
                  {report.checkedBody ? 'page body' : 'no page body'}
                </p>
              </CardContent>
            </Card>

            {report.evidence.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium">All evidence ({report.evidence.length})</p>
                <Card>
                  <CardContent className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto p-0">
                    {report.evidence.map((e, i) => (
                      <div key={i} className="flex flex-col gap-0.5 p-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="normal-case">
                            {e.type}
                          </Badge>
                          <span className="text-xs font-medium">{e.vendor}</span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {e.evidenceLabel}: {e.detail}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium">Active confirmation (run yourself)</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">
                  {wafwoofCommand(report.target)}
                </code>
                <CopyButton text={wafwoofCommand(report.target)} label="Copy" />
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">
                  {wafwoofCommand(report.target, true)}
                </code>
                <CopyButton text={wafwoofCommand(report.target, true)} label="Copy -a" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={md} label="Copy report" />
              <Button size="sm" variant="outline" onClick={() => exportMarkdown('wafdetect', md)}>
                Export Markdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('wafdetect', report)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WAFDetect;
