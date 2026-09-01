import { useState } from 'react';
import { Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { md5 } from '@/lib/hash';
import {
  EMAIL_FORMAT_RE,
  mailSearchLinks,
  parseGravatarJson,
  parseGithubUserSearch,
  parseGithubCommitSearch,
  type GravatarProfile,
  type GithubUserHit,
  type GithubCommitHit,
} from '@/lib/mailhunt';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function MailHunt({ onBack, onNavigate }: ModuleComponentProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [gravatar, setGravatar] = useState<GravatarProfile | null>(null);
  const [gravatarError, setGravatarError] = useState('');
  const [users, setUsers] = useState<GithubUserHit[]>([]);
  const [commits, setCommits] = useState<GithubCommitHit[]>([]);
  const [githubNote, setGithubNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  async function run() {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_FORMAT_RE.test(trimmed)) {
      setNote('Enter a valid email address.');
      return;
    }
    setNote('');
    setGravatar(null);
    setGravatarError('');
    setUsers([]);
    setCommits([]);
    setGithubNote('');
    setLoading(true);
    try {
      const granted = await ensureMany(['https://en.gravatar.com/*', 'https://api.github.com/*']);
      if (!granted) {
        setNote('Host permission was not granted for Gravatar / GitHub.');
        return;
      }

      const hash = md5(trimmed);
      const [gravRes, ghRes] = await Promise.all([
        sendToBackground({ type: 'FETCH_JSON', url: `https://en.gravatar.com/${hash}.json` }),
        sendToBackground({ type: 'FETCH_GITHUB_EMAIL', email: trimmed }),
      ]);

      if (gravRes.ok && gravRes.data) {
        setGravatar(parseGravatarJson(gravRes.data));
      } else {
        setGravatarError(
          gravRes.status === 404
            ? 'No public Gravatar profile for this address.'
            : (gravRes.error ?? 'Gravatar lookup failed.'),
        );
      }

      if (ghRes.ok) {
        setUsers(parseGithubUserSearch(ghRes.users));
        setCommits(parseGithubCommitSearch(ghRes.commits));
        const bits = [ghRes.usersError, ghRes.commitsError].filter(Boolean);
        if (bits.length) setGithubNote(bits.join(' '));
      } else {
        setGithubNote(ghRes.error ?? 'GitHub search failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  const links = EMAIL_FORMAT_RE.test(email.trim()) ? mailSearchLinks(email.trim().toLowerCase()) : [];
  const username = gravatar?.preferredUsername;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="MailHunt"
        description="Public email OSINT: Gravatar profile, GitHub user/commit search, and search-engine links. Does not hit login or password-reset endpoints."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Only look up addresses you own or are explicitly authorized to investigate.</p>
        </div>

        <div className="flex gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Button size="sm" onClick={run} disabled={!email.trim() || loading || pending} className="shrink-0">
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Look up
          </Button>
        </div>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {gravatar && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3 text-xs">
              <p className="font-medium">Gravatar</p>
              {gravatar.thumbnailUrl && (
                <img src={gravatar.thumbnailUrl} alt="" className="size-12 rounded-md" />
              )}
              {gravatar.displayName && <p>{gravatar.displayName}</p>}
              {username && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@{username}</span>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('osint', 'userhunt')}>
                    Open UserHunt
                  </Button>
                </div>
              )}
              {gravatar.currentLocation && (
                <p className="text-muted-foreground">{gravatar.currentLocation}</p>
              )}
              {gravatar.aboutMe && <p className="text-muted-foreground">{gravatar.aboutMe}</p>}
              {gravatar.accounts.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-border pt-2">
                  <p className="text-[11px] font-medium">Linked accounts</p>
                  {gravatar.accounts.map((a, i) => (
                    <a
                      key={`${a.domain}-${i}`}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {a.display || a.username || a.domain} {a.domain ? `(${a.domain})` : ''}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {gravatarError && <p className="text-[11px] text-muted-foreground">{gravatarError}</p>}

        {(users.length > 0 || commits.length > 0 || githubNote) && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3 text-xs">
              <p className="font-medium">GitHub (public search API)</p>
              {githubNote && <p className="text-[11px] text-muted-foreground">{githubNote}</p>}
              {users.map((u) => (
                <a
                  key={u.login}
                  href={u.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="size-3" /> {u.login}
                  {u.type ? <Badge variant="muted">{u.type}</Badge> : null}
                </a>
              ))}
              {commits.map((c, i) => (
                <a
                  key={`${c.htmlUrl}-${i}`}
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-0.5 text-[11px] text-primary hover:underline"
                >
                  <span>
                    {c.authorLogin ?? 'unknown'} {c.repo ? `in ${c.repo}` : ''}
                  </span>
                  {c.message && <span className="text-muted-foreground">{c.message}</span>}
                </a>
              ))}
              {users.length === 0 && commits.length === 0 && !githubNote && (
                <p className="text-[11px] text-muted-foreground">No public GitHub hits.</p>
              )}
            </CardContent>
          </Card>
        )}

        {links.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              <p className="p-3 text-xs font-medium">Open in a new tab (nothing is scraped)</p>
              {links.map((l) => (
                <div key={l.label} className="flex items-center justify-between gap-2 p-2">
                  <span className="text-xs">{l.label}</span>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="size-3" /> Open
                    </Button>
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onNavigate('osint', 'emailanalyze')}>
            EmailAnalyze (MX/SPF)
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate('osint', 'breachcheck')}>
            BreachCheck
          </Button>
          {(gravatar || users.length > 0 || commits.length > 0) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportJson('mailhunt', { email: email.trim().toLowerCase(), gravatar, users, commits })
              }
            >
              Export JSON
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MailHunt;
