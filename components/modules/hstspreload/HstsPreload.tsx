import { useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { normalizeDomain } from '@/lib/utils';
import { parseHstsPreload, type HstsPreloadResult } from '@/lib/hstspreload';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function HstsPreload({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [domain, setDomain] = useState(target);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HstsPreloadResult | null>(null);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function run() {
    const clean = normalizeDomain(domain);
    if (!clean) return;
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      const granted = await ensure('https://hstspreload.org/*');
      if (!granted) {
        setNote('Host permission for hstspreload.org was not granted.');
        return;
      }
      const res = await sendToBackground({
        type: 'FETCH_JSON',
        url: `https://hstspreload.org/api/v2/status?domain=${encodeURIComponent(clean)}`,
      });
      if (!res.ok || !res.data) {
        setNote(res.error ?? 'Preload-list lookup failed.');
        return;
      }
      setResult(parseHstsPreload(clean, res.data));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HstsPreload"
        description="Queries the public Chromium HSTS preload list via hstspreload.org (not a local copy of the list)."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
          <Button size="sm" onClick={run} disabled={loading || pending || !domain} className="shrink-0">
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Check
          </Button>
        </div>
        {note && <ModuleNote tone="error">{note}</ModuleNote>}
        {result && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              {result.preloaded ? (
                <Badge variant="success" className="w-fit gap-1">
                  <ShieldCheck className="size-2.5" /> preloaded
                </Badge>
              ) : (
                <Badge variant="warning" className="w-fit gap-1">
                  <ShieldAlert className="size-2.5" /> {result.status}
                </Badge>
              )}
              <p className="text-xs">{result.detail}</p>
              <p className="text-[11px] text-muted-foreground">API status: {result.status}</p>
              <a
                href={`https://hstspreload.org/?domain=${encodeURIComponent(result.domain)}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="size-3" /> Open hstspreload.org
              </a>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('hstspreload', result)}>
                Export JSON
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default HstsPreload;
