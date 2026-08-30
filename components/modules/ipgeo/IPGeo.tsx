import { useState } from 'react';
import { Loader2, MapPin, ExternalLink, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground, type IpGeoResult } from '@/lib/messaging';
import { isIpAddress, normalizeDomain } from '@/lib/utils';
import { bulkListStore } from '@/lib/storage';
import type { ModuleComponentProps } from '@/types';

export function IPGeo({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [manual, setManual] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IpGeoResult | null>(null);
  const [note, setNote] = useState('');

  async function lookup(input: string) {
    if (!input.trim()) return;
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      let ip: string;
      if (isIpAddress(input.trim())) {
        ip = input.trim();
      } else {
        const hostname = normalizeDomain(input);
        const resolved = await sendToBackground({ type: 'DOH_RESOLVE', hostname });
        if (!resolved.ok || !resolved.addresses?.length) {
          setNote(resolved.error ?? `Could not resolve an IPv4 address for ${hostname}.`);
          return;
        }
        ip = resolved.addresses[0]!;
      }
      const geo = await sendToBackground({ type: 'FETCH_IPGEO', ip });
      setResult(geo);
      if (!geo.ok) setNote(geo.error ?? 'Geo lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  function sendToBulkOpen() {
    if (!result?.ok) return;
    bulkListStore.set([`https://${result.ip}`, `http://${result.ip}`].join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  const rows: [string, string][] = result
    ? [
        ['IP', result.ip],
        ['Country', result.country ?? '-'],
        ['Region', result.region ?? '-'],
        ['City', result.city ?? '-'],
        ['ISP', result.isp ?? '-'],
        ['Org', result.org ?? '-'],
        ['ASN', result.asn ?? '-'],
      ]
    : [];

  const mapLink =
    result?.lat !== undefined && result?.lon !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lon}`
      : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="IPGeo"
        description="Resolve a domain (or use an IP directly) and geolocate it via ipwho.is (ip-api.com fallback)."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={() => lookup(target)} disabled={!target || loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Geolocate {target || '(set a target)'}
        </Button>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <Label className="text-muted-foreground">Or check an IP / domain / URL directly</Label>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="8.8.8.8 or example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') lookup(manual);
              }}
            />
            <Button size="sm" variant="outline" onClick={() => lookup(manual)} disabled={!manual.trim() || loading} className="shrink-0">
              Check
            </Button>
          </div>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {result?.ok && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{result.ip}</p>
                  <div className="flex items-center gap-1.5">
                    {result.hosting !== null && result.hosting !== undefined && result.hosting && (
                      <Badge variant="warning">hosting/datacenter</Badge>
                    )}
                    {result.proxy !== null && result.proxy !== undefined && result.proxy && (
                      <Badge variant="warning">proxy/vpn</Badge>
                    )}
                    <Badge variant="muted">{result.source}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                  {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    <MapPin className="size-3" /> View on map <ExternalLink className="size-3" />
                  </Button>
                </a>
              )}
              <Button size="sm" variant="outline" onClick={sendToBulkOpen}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <CopyButton text={JSON.stringify(result, null, 2)} label="Copy JSON" />
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground">
          ip-api.com's free tier is HTTP-only (no HTTPS), used only as a fallback if ipwho.is fails.
        </p>
      </div>
    </div>
  );
}

export default IPGeo;
