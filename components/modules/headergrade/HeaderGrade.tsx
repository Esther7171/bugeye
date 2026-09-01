import { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { normalizeUrl, originOf } from '@/lib/utils';
import { gradeHeaders, headerReportToMarkdown, type HeaderGradeReport, type CheckState } from '@/lib/headergrade';
import { exportMarkdown } from '@/lib/export';
import { exportHeaderGradeDocx } from '@/lib/headergradedocx';
import type { ModuleComponentProps } from '@/types';

const gradeColor: Record<HeaderGradeReport['grade'], string> = {
  A: 'text-success',
  B: 'text-success',
  C: 'text-warning',
  D: 'text-warning',
  F: 'text-destructive',
};

function CheckIcon({ state }: { state: CheckState }) {
  if (state === 'pass') return <CheckCircle2 className="size-3.5 text-success" />;
  if (state === 'warn') return <AlertTriangle className="size-3.5 text-warning" />;
  if (state === 'na') return <MinusCircle className="size-3.5 text-muted-foreground" />;
  return <XCircle className="size-3.5 text-destructive" />;
}

export function HeaderGrade({ onBack, onNavigate }: ModuleComponentProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HeaderGradeReport | null>(null);
  const [reportUrl, setReportUrl] = useState('');
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, url: activeUrl, origin: activeOrigin } = useActiveTab();

  async function runCurrentTab() {
    if (!tabId || !activeUrl) {
      setNote('No active tab URL available.');
      return;
    }
    if (!activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setLoading(true);
    setNote('');
    try {
      // ensure() must be the first await in this handler (nothing before it
      // may await), or its user-gesture status is lost. Reading tabId/
      // activeOrigin from useActiveTab's already-current state, instead of
      // freshly querying tabs here, is what makes that possible.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const result = await sendToBackground({ type: 'GET_TAB_HEADERS', tabId, url: activeUrl });
      setReport(gradeHeaders(result.headers));
      setReportUrl(result.url);
      if (result.error) setNote(result.error);
      if (result.method === 'fetch') {
        setNote((prev) => prev || 'Used best-effort fetch (Set-Cookie flags may be hidden).');
      }
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
    try {
      const origin = originOf(normalized);
      if (origin) {
        const granted = await ensure(origin);
        if (!granted) {
          setNote('Host permission was not granted.');
          return;
        }
      }
      const result = await sendToBackground({ type: 'GET_URL_HEADERS', url: normalized });
      setReport(gradeHeaders(result.headers));
      setReportUrl(result.url);
      if (result.error) setNote(`${result.error} (Set-Cookie is never visible via fetch - use current tab mode for that.)`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HeaderGrade"
        description="Grades security headers A-F. Current tab uses webRequest to see Set-Cookie flags."
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
              Grade this tab
            </Button>
          </TabsContent>
          <TabsContent value="url">
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" />
              <Button size="sm" onClick={runTypedUrl} disabled={loading || pending}>
                {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
                Grade
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {report && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="truncate text-xs text-muted-foreground">{reportUrl}</p>
                  <p className={`text-2xl font-bold ${gradeColor[report.grade]}`}>
                    {report.grade}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {report.score}/100
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CopyButton
                    text={headerReportToMarkdown(reportUrl, report)}
                    label="Copy report"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportMarkdown('headergrade', headerReportToMarkdown(reportUrl, report))}
                  >
                    Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportHeaderGradeDocx(reportUrl, report)}>
                    Export Word
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('tab-inspector', 'wafdetect')}>
                    Check for WAF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('tab-inspector', 'hstspreload')}>
                    HSTS preload list
                  </Button>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {report.checks.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 py-2">
                    <CheckIcon state={check.state} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{check.label}</span>
                        <Badge
                          variant={
                            check.state === 'pass'
                              ? 'success'
                              : check.state === 'warn'
                                ? 'warning'
                                : check.state === 'na'
                                  ? 'muted'
                                  : 'destructive'
                          }
                        >
                          {check.state}
                        </Badge>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default HeaderGrade;
