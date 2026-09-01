import {
  docxHeading,
  docxText,
  docxSpacer,
  docxTable,
  assembleDocxBlob,
  colorForCheckState,
  colorForGrade,
  bugeyeReportFilename,
  DocxRelCollector,
  DOCX_COLOR,
  type DocxCell,
} from '@/lib/docx';
import { downloadBlob, formatTimestamp } from '@/lib/utils';
import type { HeaderGradeReport } from '@/lib/headergrade';

function cell(text: string, opts: { color?: string; bold?: boolean } = {}): DocxCell {
  return { text, ...opts };
}

function targetHost(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function buildBody(url: string, r: HeaderGradeReport, collector: DocxRelCollector): string {
  const parts: string[] = [];
  const push = (...xml: string[]) => parts.push(...xml);

  push(docxHeading(`HeaderGrade report - ${url}`, 1));
  push(docxText(`Generated: ${formatTimestamp()}`, { color: DOCX_COLOR.neutral, italic: true }));
  push(docxSpacer());

  push(docxText(`Grade: ${r.grade} (${r.score}/100)`, { color: colorForGrade(r.grade), bold: true }));
  push(docxSpacer());

  push(
    docxTable(
      ['Header', 'Status', 'Detail'],
      r.checks.map((c) => [
        cell(c.label),
        cell(c.state.toUpperCase(), { color: colorForCheckState(c.state), bold: true }),
        cell(c.detail),
      ]),
      collector,
    ),
  );

  return parts.join('');
}

export function exportHeaderGradeDocx(url: string, report: HeaderGradeReport) {
  const collector = new DocxRelCollector();
  const blob = assembleDocxBlob(buildBody(url, report, collector), collector);
  downloadBlob(`${bugeyeReportFilename(targetHost(url))}.docx`, blob);
}
