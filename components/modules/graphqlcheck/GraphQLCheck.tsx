import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import {
  GRAPHQL_PATHS,
  INTROSPECTION_BODY,
  parseIntrospectionResponse,
  graphqlResultsToMarkdown,
  type GraphQLProbeResult,
} from '@/lib/graphql';
import { mapLimit } from '@/lib/concurrency';
import { exportJson, exportMarkdown } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const VERDICT_LABEL: Record<GraphQLProbeResult['verdict'], string> = {
  'introspection-enabled': 'Introspection ON',
  'introspection-disabled': 'Introspection off',
  'graphql-error': 'GraphQL error',
  'not-graphql': 'Not GraphQL',
};

export function GraphQLCheck({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<GraphQLProbeResult[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function check() {
    if (!target) return;
    setChecking(true);
    setResults([]);
    setNote('');
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const rows = await mapLimit(GRAPHQL_PATHS, 3, async (def) => {
        const url = `https://${target}${def.path}`;
        const res = await sendToBackground({ type: 'HTTP_POST_PROBE', url, body: INTROSPECTION_BODY });
        const parsed = res.body ? parseIntrospectionResponse(res.body) : null;
        return {
          path: def.path,
          label: def.label,
          url,
          status: res.status,
          verdict: parsed?.verdict ?? 'not-graphql',
          summary: parsed?.summary ?? null,
          errorMessage: parsed?.errorMessage ?? res.error ?? null,
        } satisfies GraphQLProbeResult;
      });
      setResults(rows);
    } finally {
      setChecking(false);
    }
  }

  const enabled = results.filter((r) => r.verdict === 'introspection-enabled');

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="GraphQLCheck"
        description="Sends one introspection query to a small set of common GraphQL paths, to see whether schema introspection is left enabled."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          This sends a single, read-only GraphQL introspection query (never a mutation) to each candidate path. It
          is an active probe, not purely passive reading, but it never writes or modifies any data.
        </ModuleNote>
        <Button size="sm" onClick={check} disabled={!target || checking || pending} className="w-fit">
          {checking || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Check {target || '(set a target)'}
        </Button>
        {note && <ModuleNote tone="error">{note}</ModuleNote>}
        {results.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {enabled.length} of {results.length} candidate path{results.length === 1 ? '' : 's'} have introspection
              enabled.
            </p>
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {results.map((r) => (
                  <div key={r.path} className="flex flex-col gap-1.5 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs font-medium">{r.url}</p>
                      <Badge
                        variant={r.verdict === 'introspection-enabled' ? 'destructive' : 'muted'}
                        className="shrink-0 gap-1"
                      >
                        {r.verdict === 'introspection-enabled' ? (
                          <ShieldAlert className="size-2.5" />
                        ) : (
                          <CheckCircle2 className="size-2.5" />
                        )}
                        {VERDICT_LABEL[r.verdict]}
                      </Badge>
                    </div>
                    {r.summary && (
                      <p className="text-[11px] text-muted-foreground">
                        Query type: {r.summary.queryTypeName ?? 'unknown'}, {r.summary.typeCount} types
                        {r.summary.hasMutation ? ', has Mutation root' : ''}
                        {r.summary.hasSubscription ? ', has Subscription root' : ''}
                      </p>
                    )}
                    {!r.summary && r.errorMessage && (
                      <p className="truncate text-[11px] text-muted-foreground">{r.errorMessage}</p>
                    )}
                  </div>
                ))}
                {results.every((r) => r.verdict === 'not-graphql') && (
                  <div className="flex items-center gap-2 p-2 text-[11px] text-muted-foreground">
                    <XCircle className="size-3" /> None of the candidate paths responded like a GraphQL endpoint.
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMarkdown('graphqlcheck', graphqlResultsToMarkdown(target, results))}
              >
                Export Markdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('graphqlcheck', results)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GraphQLCheck;
