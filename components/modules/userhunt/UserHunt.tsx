import { useRef, useState } from 'react';
import { Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { mapLimit } from '@/lib/concurrency';
import {
  USER_HUNT_SITES,
  classifyUserProbe,
  isValidUsername,
  normalizeUsername,
  type UserHuntHit,
  type UserHuntVerdict,
} from '@/lib/userhunt';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const VERDICT_VARIANT: Record<UserHuntVerdict, 'success' | 'muted' | 'outline'> = {
  found: 'success',
  not_found: 'muted',
  unknown: 'outline',
};

export function UserHunt({ onBack }: ModuleComponentProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [hits, setHits] = useState<UserHuntHit[]>([]);
  const [done, setDone] = useState(0);
  const abortRef = useRef(false);
  const { ensureMany, pending } = useHostPermission();

  async function run() {
    const user = normalizeUsername(username);
    if (!isValidUsername(user)) {
      setNote('Username must be 1–39 characters: letters, digits, dot, underscore, hyphen.');
      return;
    }
    abortRef.current = false;
    setNote('');
    setHits([]);
    setDone(0);
    setLoading(true);
    try {
      const origins = [...new Set(USER_HUNT_SITES.map((s) => s.origin))];
      const granted = await ensureMany(origins);
      if (!granted) {
        setNote('Host permission was not granted. Public profile checks need access to those sites.');
        return;
      }

      await mapLimit(USER_HUNT_SITES, 5, async (site) => {
        if (abortRef.current) {
          return {
            id: site.id,
            name: site.name,
            url: site.profileUrl(user),
            verdict: 'unknown' as const,
            status: null,
            error: 'Stopped',
          };
        }
        const probeUrl = (site.probeUrl ?? site.profileUrl)(user);
        const res = await sendToBackground({ type: 'HTTP_PROBE', url: probeUrl });
        const hit: UserHuntHit = {
          id: site.id,
          name: site.name,
          url: site.profileUrl(user),
          verdict: classifyUserProbe(site, res.status, res.body ?? ''),
          status: res.status,
          error: res.error,
        };
        setHits((prev) => {
          const next = prev.filter((h) => h.id !== hit.id);
          next.push(hit);
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });
        setDone((n) => n + 1);
        return hit;
      });
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    abortRef.current = true;
  }

  const found = hits.filter((h) => h.verdict === 'found');

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="UserHunt"
        description="Checks whether a username has a public profile on common sites (GitHub, GitLab, Reddit, npm, and more). GET only, not a login brute-force."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Authorized OSINT only. Probes public profile URLs; does not submit passwords or reset forms.</p>
        </div>

        <div className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
          {loading ? (
            <Button size="sm" variant="outline" onClick={stop} className="shrink-0">
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={run} disabled={!username.trim() || pending} className="shrink-0">
              {pending ? <Loader2 className="size-3 animate-spin" /> : null}
              Look up
            </Button>
          )}
        </div>

        {loading && (
          <p className="text-[11px] text-muted-foreground">
            {done}/{USER_HUNT_SITES.length} sites checked
            {pending ? ' (requesting permissions)' : ''}
          </p>
        )}

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {found.length > 0 && (
          <p className="text-xs font-medium">
            {found.length} likely hit{found.length === 1 ? '' : 's'}
          </p>
        )}

        {hits.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {hits.map((h) => (
                <div key={h.id} className="flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{h.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{h.url}</p>
                  </div>
                  <Badge variant={VERDICT_VARIANT[h.verdict]} className="shrink-0 normal-case">
                    {h.verdict.replace('_', ' ')}
                    {h.status != null ? ` ${h.status}` : ''}
                  </Badge>
                  <CopyButton text={h.url} label="" className="size-7 shrink-0 p-0" />
                  <a href={h.url} target="_blank" rel="noreferrer" className="shrink-0">
                    <Button size="sm" variant="ghost" className="size-7 p-0">
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {hits.length > 0 && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('userhunt', { username: normalizeUsername(username), hits })}>
            Export JSON
          </Button>
        )}
      </div>
    </div>
  );
}

export default UserHunt;
