import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { sendToBackground, type AuthDiffSide } from '@/lib/messaging';
import { summarizeAuthDiff, authDiffReportToMarkdown, type AuthDiffSummary } from '@/lib/authdiff';
import { exportMarkdown } from '@/lib/export';
import { normalizeUrl, originOf } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function AuthDiff({ onBack }: ModuleComponentProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [sides, setSides] = useState<{ authed: AuthDiffSide; anon: AuthDiffSide } | null>(null);
  const [summary, setSummary] = useState<AuthDiffSummary | null>(null);
  const { ensure, pending } = useHostPermission();
  const { url: activeUrl } = useActiveTab();

  useEffect(() => {
    if (!url && activeUrl) setUrl(activeUrl);
  }, [activeUrl, url]);

  async function run() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setNote('Enter a valid http(s) URL.');
      return;
    }
    const origin = originOf(normalized);
    if (!origin) {
      setNote('Could not parse the URL origin.');
      return;
    }
    setLoading(true);
    setNote('');
    setSides(null);
    setSummary(null);
    try {
      const granted = await ensure(origin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const res = await sendToBackground({ type: 'AUTH_DIFF_PROBE', url: normalized });
      if (!res.ok || !res.authed || !res.anon) {
        setNote(res.error ?? 'Probe failed.');
        return;
      }
      setSides({ authed: res.authed, anon: res.anon });
      setSummary(summarizeAuthDiff(res.authed, res.anon));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="AuthDiff"
        description="Fetches a URL with your session cookies and again anonymously, then diffs the responses to spot missing access control."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          Sends two read-only GETs: one with the browser's cookies for that site (your logged-in
          session) and one with none. If the anonymous request returns the same protected content,
          authorization may be missing. Only test URLs you are authorized to assess.
        </ModuleNote>

        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.example.com/api/account" />
          <Button size="sm" onClick={run} disabled={loading || pending || !url}>
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Compare
          </Button>
        </div>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {summary && sides && (
          <>
            <div
              className={
                summary.tone === 'attention'
                  ? 'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive'
                  : summary.tone === 'ok'
                    ? 'flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400'
                    : 'flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground'
              }
            >
              {summary.tone === 'ok' ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{summary.verdict}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SideCard title="Authenticated" subtitle="cookies sent" side={sides.authed} />
              <SideCard title="Anonymous" subtitle="no cookies" side={sides.anon} />
            </div>

            {(summary.onlyInAuthed.length > 0 || summary.onlyInAnon.length > 0) && (
              <Card>
                <CardContent className="flex flex-col gap-2 p-3 text-[11px]">
                  <p className="font-medium">
                    Body diff — {summary.addedCount} line(s) only in authenticated, {summary.removedCount} only in anonymous
                  </p>
                  {summary.onlyInAnon.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Lines the anonymous session sees (potentially unprotected):</p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[10px]">
                        {summary.onlyInAnon.join('\n')}
                      </pre>
                    </div>
                  )}
                  {summary.onlyInAuthed.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Lines only in the authenticated response:</p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[10px]">
                        {summary.onlyInAuthed.join('\n')}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              <CopyButton text={authDiffReportToMarkdown(url, sides.authed, sides.anon, summary)} label="Copy report" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMarkdown('authdiff', authDiffReportToMarkdown(url, sides.authed, sides.anon, summary))}
              >
                Export report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SideCard({ title, subtitle, side }: { title: string; subtitle: string; side: AuthDiffSide }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium">{title}</p>
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
        {side.error ? (
          <p className="text-[11px] text-destructive">{side.error}</p>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>Status</span>
            <span className="font-mono text-foreground">{side.status ?? '-'}</span>
            <span>Length</span>
            <span className="font-mono text-foreground">{side.length ?? 0}</span>
            <span>Type</span>
            <span className="truncate font-mono text-foreground" title={side.contentType}>
              {side.contentType?.split(';')[0] ?? '-'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AuthDiff;
