import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { shodanFaviconHash } from '@/lib/mmh3';
import type { ModuleComponentProps } from '@/types';

export function FaviconHash({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [path, setPath] = useState('/favicon.ico');
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<number | null>(null);
  const [iconUrl, setIconUrl] = useState('');
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setHash(null);
    try {
      const url = `https://${target}${path.startsWith('/') ? path : `/${path}`}`;
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const result = await sendToBackground({ type: 'FETCH_FAVICON', url });
      if (!result.ok || !result.base64) {
        setNote(result.error ?? 'Could not fetch favicon.');
        return;
      }
      setHash(shodanFaviconHash(result.base64));
      setIconUrl(url);
    } finally {
      setLoading(false);
    }
  }

  const shodanLink = hash !== null ? `https://www.shodan.io/search?query=${encodeURIComponent(`http.favicon.hash:${hash}`)}` : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="FaviconHash"
        description="Compute the Shodan-compatible MurmurHash3 of a site's favicon to find related infrastructure."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Favicon path</Label>
          <div className="flex gap-2">
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/favicon.ico" />
            <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="shrink-0">
              {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
              Fetch & hash
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fetched from {target ? `https://${target}${path}` : '(set a target)'}
          </p>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {hash !== null && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {iconUrl && <img src={iconUrl} alt="favicon" className="size-6 shrink-0 rounded border border-border" />}
              <code className="rounded bg-muted p-2 text-sm font-semibold">{hash}</code>
              <CopyButton text={String(hash)} />
            </div>
            <a href={shodanLink} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="w-fit">
                <ExternalLink className="size-3" /> Search on Shodan
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default FaviconHash;
