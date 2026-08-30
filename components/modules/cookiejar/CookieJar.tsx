import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useTarget } from '@/components/shell/TargetProvider';
import { useActiveTab } from '@/lib/useActiveTab';
import { useHostPermission } from '@/lib/useHostPermission';
import {
  cookiePermissionPatterns,
  cookiesToNetscape,
  cookiesToHeader,
  parseImportInput,
  cookieSetUrl,
  cookieRemoveUrl,
  type CookieRecord,
} from '@/lib/cookies';
import { exportJson, exportText } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function CookieJar({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const { url: activeTabUrl } = useActiveTab();
  const activeHostname = activeTabUrl ? new URL(activeTabUrl).hostname : '';
  const [cookies, setCookies] = useState<CookieRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState('');
  const [deletingKey, setDeletingKey] = useState('');
  const { ensureMany, pending } = useHostPermission();

  async function loadCookies() {
    if (!target) return;
    setLoading(true);
    setLoadError('');
    try {
      const granted = await ensureMany(cookiePermissionPatterns(target));
      if (!granted) {
        setLoadError('Host permission was not granted.');
        return;
      }
      const list = await browser.cookies.getAll({ domain: target });
      setCookies(list);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCookie(cookie: CookieRecord) {
    const key = `${cookie.domain}-${cookie.name}-${cookie.path}`;
    const ok = confirm(`Delete cookie "${cookie.name}" for ${cookie.domain}? This cannot be undone from here.`);
    if (!ok) return;
    setDeletingKey(key);
    try {
      await browser.cookies.remove({ url: cookieRemoveUrl(cookie), name: cookie.name, storeId: cookie.storeId });
      setCookies((prev) => prev.filter((c) => `${c.domain}-${c.name}-${c.path}` !== key));
    } finally {
      setDeletingKey('');
    }
  }

  async function importCookies() {
    setImportResult('');
    try {
      const parsed = parseImportInput(importText);
      if (parsed.length === 0) {
        setImportResult('No cookies parsed from input.');
        return;
      }
      const domains = Array.from(new Set(parsed.map((c) => c.domain.replace(/^\./, ''))));
      const patterns = domains.flatMap(cookiePermissionPatterns);
      const granted = await ensureMany(patterns);
      if (!granted) {
        setImportResult('Host permission was not granted.');
        return;
      }
      let ok = 0;
      for (const cookie of parsed) {
        try {
          await browser.cookies.set({
            url: cookieSetUrl(cookie),
            name: cookie.name,
            value: cookie.value,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
          });
          ok += 1;
        } catch {
          // skip cookies that fail (invalid domain/path combos)
        }
      }
      setImportResult(`Imported ${ok}/${parsed.length} cookies.`);
      loadCookies();
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CookieJar"
        description="Inspect, export and import cookies for the current target domain. Flags cookies scoped to a different subdomain than the active tab."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={loadCookies} disabled={!target || loading || pending}>
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Load cookies for {target || '(set a target)'}
          </Button>
        </div>

        {loadError && <ModuleNote tone="error">{loadError}</ModuleNote>}

        {loaded && cookies.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No cookies found for {target}. Make sure you've visited the site and the permission
            prompt (if shown) was accepted.
          </p>
        )}

        {cookies.length > 0 && (
          <>
            {activeHostname && (
              <p className="text-[11px] text-muted-foreground">
                {cookies.filter((c) => c.domain.replace(/^\./, '') !== activeHostname).length} of {cookies.length}{' '}
                cookies belong to a different subdomain than the page you're currently on ({activeHostname}). BugEye
                can only see cookies within this domain's own tree; it cannot see true third-party tracker cookies
                set by unrelated domains (a browser API restriction).
              </p>
            )}
            <Card>
              <CardContent className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto p-0">
                {cookies.map((c) => {
                  const missing = [
                    !c.secure && 'Secure',
                    !c.httpOnly && 'HttpOnly',
                    !c.sameSite || c.sameSite === 'no_restriction' ? 'SameSite' : null,
                  ].filter(Boolean) as string[];
                  const bareDomain = c.domain.replace(/^\./, '');
                  const otherSubdomain = activeHostname && bareDomain !== activeHostname;
                  const key = `${c.domain}-${c.name}-${c.path}`;
                  return (
                    <div key={key} className="flex flex-col gap-1 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{c.name}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {otherSubdomain && <Badge variant="outline">other subdomain</Badge>}
                          {missing.length === 0 ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="size-2.5" /> secure
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="size-2.5" /> missing {missing.join(', ')}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-6 p-0 text-destructive hover:text-destructive"
                            disabled={deletingKey === key}
                            onClick={() => deleteCookie(c)}
                            title="Delete this cookie"
                          >
                            {deletingKey === key ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {c.domain}
                        {c.path}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={cookiesToHeader(cookies)} label="Copy as Cookie: header" />
              <Button size="sm" variant="outline" onClick={() => exportJson('cookies', cookies)}>
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportText('cookies', cookiesToNetscape(cookies))}
              >
                Export cookies.txt
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium">Import cookies</p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste JSON cookie array or Netscape cookies.txt content..."
            className="min-h-20"
          />
          <Button size="sm" onClick={importCookies} className="w-fit" disabled={pending}>
            Import
          </Button>
          {importResult && <p className="text-xs text-muted-foreground">{importResult}</p>}
        </div>
      </div>
    </div>
  );
}

export default CookieJar;
