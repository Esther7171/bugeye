import type { AuthDiffSide } from '@/lib/messaging';

export interface AuthDiffSummary {
  statusMatch: boolean;
  lengthDelta: number;
  addedCount: number; // lines the authenticated response has that the anonymous one lacks
  removedCount: number; // lines the anonymous response has that the authenticated one lacks
  onlyInAuthed: string[]; // sample
  onlyInAnon: string[]; // sample
  verdict: string;
  tone: 'ok' | 'attention' | 'info';
}

const SAMPLE = 20;

function lineDiff(authedBody: string, anonBody: string) {
  const authedLines = authedBody.split('\n');
  const anonSet = new Set(anonBody.split('\n'));
  const authedSet = new Set(authedLines);

  const onlyInAuthed: string[] = [];
  for (const line of authedLines) {
    if (!anonSet.has(line) && line.trim()) onlyInAuthed.push(line.trim());
  }
  const onlyInAnon: string[] = [];
  for (const line of anonBody.split('\n')) {
    if (!authedSet.has(line) && line.trim()) onlyInAnon.push(line.trim());
  }
  return { onlyInAuthed, onlyInAnon };
}

export function summarizeAuthDiff(authed: AuthDiffSide, anon: AuthDiffSide): AuthDiffSummary {
  const base: AuthDiffSummary = {
    statusMatch: authed.status === anon.status,
    lengthDelta: (authed.length ?? 0) - (anon.length ?? 0),
    addedCount: 0,
    removedCount: 0,
    onlyInAuthed: [],
    onlyInAnon: [],
    verdict: '',
    tone: 'info',
  };

  if (authed.error || anon.error) {
    base.verdict = `One request failed (authenticated: ${authed.error ?? 'ok'}; anonymous: ${anon.error ?? 'ok'}). Can't compare.`;
    base.tone = 'info';
    return base;
  }

  const { onlyInAuthed, onlyInAnon } = lineDiff(authed.body ?? '', anon.body ?? '');
  base.addedCount = onlyInAuthed.length;
  base.removedCount = onlyInAnon.length;
  base.onlyInAuthed = onlyInAuthed.slice(0, SAMPLE);
  base.onlyInAnon = onlyInAnon.slice(0, SAMPLE);

  const anonDenied = anon.status === 401 || anon.status === 403;
  const bothOk = authed.status === 200 && anon.status === 200;
  const nearlyIdentical = Math.abs(base.lengthDelta) < 32 && base.addedCount === 0 && base.removedCount === 0;

  if (anonDenied && authed.status === 200) {
    base.verdict = `Anonymous request is denied (HTTP ${anon.status}) while the authenticated one succeeds. Access control looks enforced here.`;
    base.tone = 'ok';
  } else if (bothOk && nearlyIdentical) {
    base.verdict = 'Both the authenticated and anonymous requests return the same 200 response. This endpoint does not appear to require a session - if the content should be private, that is a broken-access-control / IDOR lead worth verifying.';
    base.tone = 'attention';
  } else if (bothOk) {
    base.verdict = 'Both return 200 but the bodies differ. Inspect the diff: content the anonymous session can see may be data that should require authentication.';
    base.tone = 'attention';
  } else if (base.statusMatch) {
    base.verdict = `Both requests returned HTTP ${authed.status}. Compare the bodies below for any authorization-dependent differences.`;
    base.tone = 'info';
  } else {
    base.verdict = `Status differs (authenticated: ${authed.status}, anonymous: ${anon.status}). Review both responses.`;
    base.tone = 'info';
  }

  return base;
}

export function authDiffReportToMarkdown(url: string, authed: AuthDiffSide, anon: AuthDiffSide, summary: AuthDiffSummary): string {
  return [
    `# AuthDiff report - ${url}`,
    '',
    `Verdict: ${summary.verdict}`,
    '',
    '| | Authenticated (cookies sent) | Anonymous (no cookies) |',
    '| --- | --- | --- |',
    `| Status | ${authed.status ?? 'error'} | ${anon.status ?? 'error'} |`,
    `| Length | ${authed.length ?? 0} | ${anon.length ?? 0} |`,
    `| Content-Type | ${authed.contentType ?? '-'} | ${anon.contentType ?? '-'} |`,
    `| Final URL | ${authed.finalUrl ?? '-'} | ${anon.finalUrl ?? '-'} |`,
    '',
    `Lines only in the authenticated response: ${summary.addedCount}`,
    `Lines only in the anonymous response: ${summary.removedCount}`,
    '',
  ].join('\n');
}
