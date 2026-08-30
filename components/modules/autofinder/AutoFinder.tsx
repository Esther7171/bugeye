import { useEffect, useState } from 'react';
import { Loader2, Zap, CheckCircle2, XCircle, Circle, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import {
  runAutoFinder,
  autoFinderToMarkdown,
  AUTOFINDER_TASKS,
  type AutoFinderReport,
  type AutoFinderTaskId,
  type ProgressMap,
  type TaskStatus,
} from '@/lib/autofinder';
import { exportMarkdown, exportJson, exportWord } from '@/lib/export';
import { bulkListStore, autoFinderReportStore } from '@/lib/storage';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

function emptyProgress(): ProgressMap {
  return Object.fromEntries(AUTOFINDER_TASKS.map((t) => [t.id, { status: 'pending' as TaskStatus }])) as ProgressMap;
}

function TaskIcon({ status }: { status: TaskStatus }) {
  if (status === 'running') return <Loader2 className="size-3 shrink-0 animate-spin text-primary" />;
  if (status === 'done') return <CheckCircle2 className="size-3 shrink-0 text-success" />;
  if (status === 'error') return <XCircle className="size-3 shrink-0 text-muted-foreground" />;
  return <Circle className="size-3 shrink-0 text-muted-foreground/40" />;
}

function Section({ title, stat, children }: { title: string; stat?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border border-border" open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2.5 text-xs font-medium">
        <span>{title}</span>
        {stat && <Badge variant="outline">{stat}</Badge>}
      </summary>
      <div className="border-t border-border p-2.5 text-[11px] text-muted-foreground">{children}</div>
    </details>
  );
}

export function AutoFinder({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>(emptyProgress());
  const [report, setReport] = useState<AutoFinderReport | null>(null);
  const [cachedAt, setCachedAt] = useState('');
  const [note, setNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  // Restored from chrome.storage.local whenever the target matches a
  // previously completed scan, so switching tabs and back (or navigating
  // away to another module and back) does not lose the result and force a
  // rescan. A stored report for a different domain is left untouched in
  // storage, not deleted, for whenever the user switches back to it.
  //
  // Skipped entirely while a scan is running: auto-follow can change target
  // mid-scan (switching tabs), and this must not clobber the in-progress
  // run's own display. Once the run finishes and this re-fires, if the
  // report on screen no longer matches the (possibly now different) target,
  // it is replaced with whatever is actually cached for the current target,
  // or cleared, rather than silently continuing to show another site's data
  // under the current target's name.
  useEffect(() => {
    if (running) return;
    if (!target) return;
    autoFinderReportStore.get().then((stored) => {
      if (stored && stored.domain === target) {
        setReport(stored.report);
        setProgress(stored.progress);
        setCachedAt(stored.generatedAt);
      } else {
        setReport((prev) => (prev && prev.domain !== target ? null : prev));
        setCachedAt((prev) => (prev ? '' : prev));
      }
    });
  }, [target, running]);

  async function run() {
    if (!target) return;
    setNote('');
    setReport(null);
    setCachedAt('');
    setProgress(emptyProgress());
    const granted = await ensureMany([`https://${target}/*`, 'https://crt.sh/*', 'https://crt.name/*', 'https://web.archive.org/*']);
    if (!granted) {
      setNote('Host permission was not granted.');
      return;
    }
    setRunning(true);
    let finalProgress = emptyProgress();
    try {
      const result = await runAutoFinder(target, (id: AutoFinderTaskId, patch) => {
        finalProgress = { ...finalProgress, [id]: patch };
        setProgress(finalProgress);
      });
      setReport(result);
      autoFinderReportStore.set({ domain: target, report: result, progress: finalProgress, generatedAt: formatTimestamp() });
    } finally {
      setRunning(false);
    }
  }

  function sendWaybackToBulkOpen() {
    if (!report?.wayback.sample.length) return;
    bulkListStore.set(report.wayback.sample.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  function sendPanelhuntToBulkOpen() {
    if (!report) return;
    const urls = report.panelhunt.filter((p) => p.interesting).map((p) => `https://${report.domain}${p.path}`);
    if (urls.length === 0) return;
    bulkListStore.set(urls.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="AutoFinder"
        description="Runs every domain-based check in one pass and compiles a single exportable report."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={run} disabled={!target || running || pending} className="w-fit">
          {running || pending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
          Run AutoFinder on {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {(running || report) && (
          <Card>
            <CardContent className="grid grid-cols-2 gap-x-3 gap-y-1 p-3">
              {AUTOFINDER_TASKS.map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                  <TaskIcon status={progress[t.id].status} />
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  {progress[t.id].summary && (
                    <span className="shrink-0 truncate text-muted-foreground">{progress[t.id].summary}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            {cachedAt && (
              <p className="text-[11px] text-muted-foreground">
                Showing the cached result from {cachedAt} for this target. Click Run again for a fresh
                scan.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <CopyButton text={autoFinderToMarkdown(report)} label="Copy Markdown" />
              <Button size="sm" variant="outline" onClick={() => exportMarkdown(`autofinder-${report.domain}`, autoFinderToMarkdown(report))}>
                Export Markdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson(`autofinder-${report.domain}`, report)}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportWord(`autofinder-${report.domain}`, autoFinderToMarkdown(report))}>
                Export Word
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Section title="DNS + subdomains" stat={`${report.dns.addresses.length} IP, ${report.subdomains.list.length} subdomains`}>
                <p>IPs: {report.dns.addresses.join(', ') || 'none'}</p>
                <p className="mt-1 max-h-32 overflow-y-auto">{report.subdomains.list.slice(0, 100).join(', ') || 'none found'}</p>
              </Section>

              <Section title="Security headers" stat={report.headerGrade ? `${report.headerGrade.grade} (${report.headerGrade.score}/100)` : undefined}>
                {report.headerGrade ? (
                  <div className="flex flex-col gap-1">
                    {report.headerGrade.checks.map((c) => (
                      <p key={c.id}>
                        <span className="font-medium text-foreground">{c.label}</span>: {c.state} - {c.detail}
                      </p>
                    ))}
                  </div>
                ) : (
                  'Could not fetch headers.'
                )}
              </Section>

              <Section title="CSP audit" stat={report.csp?.present ? `${report.csp.grade} (${report.csp.score}/100)` : 'none'}>
                {report.csp?.findings.map((f, i) => (
                  <p key={i}>
                    <span className="font-medium text-foreground">{f.directive}</span>: {f.state} - {f.detail}
                  </p>
                )) ?? 'Not evaluated.'}
              </Section>

              <Section title="Clickjacking" stat={report.clickjack?.verdict}>
                {report.clickjack?.detail ?? 'Not evaluated.'}
              </Section>

              <Section title="CORS" stat={report.cors?.reflected ? 'reflected' : 'not reflected'}>
                ACAO: {report.cors?.acao ?? '(none)'}, Credentials: {report.cors?.acac ?? '(none)'}
              </Section>

              <Section title="HTTP methods" stat={report.httpMethods?.allow?.join(', ')}>
                {report.httpMethods?.allow?.join(', ') ?? 'Not disclosed via OPTIONS.'}
              </Section>

              <Section title="TLS certificate" stat={report.ssl ? `${report.ssl.daysUntilExpiry}d left` : undefined}>
                {report.ssl ? (
                  <>
                    <p>Issuer: {report.ssl.latest.issuerName}</p>
                    <p>Valid until: {report.ssl.latest.notAfter}</p>
                    <p>SANs: {report.ssl.sans.length}</p>
                  </>
                ) : (
                  'No CT log entries found.'
                )}
              </Section>

              <Section title="Favicon hash" stat={report.faviconHash?.toString()}>
                {report.faviconHash !== null ? (
                  <a
                    href={`https://www.shodan.io/search?query=${encodeURIComponent(`http.favicon.hash:${report.faviconHash}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Search on Shodan
                  </a>
                ) : (
                  'Could not fetch favicon.'
                )}
              </Section>

              <Section title="IP + geolocation" stat={report.ip ?? undefined}>
                {report.ipgeo?.ok
                  ? `${report.ipgeo.country ?? '?'}, ${report.ipgeo.city ?? '?'} - ${report.ipgeo.isp ?? report.ipgeo.org ?? '?'} (ASN ${report.ipgeo.asn ?? '?'})`
                  : 'Not resolved.'}
              </Section>

              <Section title="Shodan InternetDB" stat={report.shodan ? `${report.shodan.ports.length} ports` : undefined}>
                {report.shodan ? (
                  <>
                    <p>Ports: {report.shodan.ports.join(', ') || 'none'}</p>
                    <p>CVEs: {report.shodan.vulns.join(', ') || 'none'}</p>
                  </>
                ) : (
                  'Not available.'
                )}
              </Section>

              <Section title="robots.txt" stat={report.robots.found ? `${report.robots.disallow.length} rules` : 'not found'}>
                {report.robots.found ? report.robots.disallow.slice(0, 30).join(', ') : 'Not found.'}
              </Section>

              <Section title="sitemap.xml" stat={`${report.sitemap.urls.length} URLs`}>
                {report.sitemap.urls.slice(0, 30).join(', ') || 'Not found or empty.'}
              </Section>

              <Section title=".well-known paths" stat={`${report.wellknown.filter((w) => w.found).length}/${report.wellknown.length}`}>
                {report.wellknown.filter((w) => w.found).map((w) => `${w.path} (${w.status})`).join(', ') || 'None found.'}
              </Section>

              <Section title="Admin/sensitive paths" stat={`${report.panelhunt.filter((p) => p.interesting).length} interesting`}>
                <div className="flex flex-col gap-1">
                  {report.panelhunt.filter((p) => p.interesting).map((p) => (
                    <p key={p.path}>
                      {p.looksAdmin && <span className="text-warning">[admin?] </span>}
                      {p.path} - {p.status} ({p.label})
                    </p>
                  ))}
                  {report.panelhunt.some((p) => p.interesting) && (
                    <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={sendPanelhuntToBulkOpen}>
                      <Send className="size-3" /> Send to BulkOpen
                    </Button>
                  )}
                </div>
              </Section>

              <Section title="Exposed .git/.svn/.env" stat={`${report.gitfinder.filter((g) => g.exposed).length} exposed`}>
                {report.gitfinder.filter((g) => g.exposed).map((g) => g.label).join(', ') || 'Nothing exposed.'}
              </Section>

              <Section title="Wayback archive" stat={`${report.wayback.count} URLs`}>
                <div className="flex flex-col gap-1">
                  <p className="max-h-32 overflow-y-auto">{report.wayback.sample.slice(0, 30).join(', ') || 'None found.'}</p>
                  {report.wayback.sample.length > 0 && (
                    <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={sendWaybackToBulkOpen}>
                      <Send className="size-3" /> Send to BulkOpen
                    </Button>
                  )}
                </div>
              </Section>

              <Section title="Tech fingerprint" stat={`${report.techHits.length + report.techGuesses.length} signals`}>
                {[...report.techHits.map((h) => h.name), ...report.techGuesses].join(', ') || 'Nothing detected.'}
              </Section>

              <Section title="Outdated JS libraries" stat={`${report.retireFindings.length} vulnerable`}>
                {report.retireFindings.map((f) => `${f.library} v${f.version}`).join(', ') || 'None matched known-vulnerable versions.'}
              </Section>

              <Section title="Cloud storage references" stat={`${report.buckets.length}`}>
                {report.buckets.map((b) => `[${b.type}] ${b.url}`).join(', ') || 'None found on homepage.'}
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AutoFinder;
