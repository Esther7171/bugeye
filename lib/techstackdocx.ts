import {
  docxHeading,
  docxText,
  docxSpacer,
  docxTable,
  assembleDocxBlob,
  bugeyeReportFilename,
  isHttpUrl,
  DocxRelCollector,
  DOCX_COLOR,
  type DocxCell,
} from '@/lib/docx';
import { downloadBlob, formatTimestamp } from '@/lib/utils';
import type { TechHit } from '@/lib/techstack';

// Mirrors the grouping/order used by TechStack.tsx so the Word export reads
// the same as the on-screen list.
const CATEGORY_ORDER = [
  'Frameworks',
  'JS libraries',
  'UI',
  'Analytics',
  'Tag managers',
  'CDN',
  'Security',
  'Payment',
  'CMS / Ecommerce',
  'Hosting',
  'Monitoring',
  'Chat / Support',
  'Fonts',
  'Server / backend',
  'Other / raw signals',
];

function cell(text: string, opts: { color?: string; bold?: boolean; url?: string } = {}): DocxCell {
  return { text, ...opts };
}

function linkableCell(text: string): DocxCell {
  return isHttpUrl(text) ? cell(text, { url: text }) : cell(text);
}

function buildBody(target: string, hits: TechHit[], collector: DocxRelCollector): string {
  const parts: string[] = [];
  const push = (...xml: string[]) => parts.push(...xml);

  push(docxHeading(`TechStack report - ${target}`, 1));
  push(docxText(`Generated: ${formatTimestamp()}`, { color: DOCX_COLOR.neutral, italic: true }));
  push(docxSpacer());

  if (hits.length === 0) {
    push(
      docxText('No technology signatures detected from headers, cookies, meta tags, scripts, styles or page globals.', {
        color: DOCX_COLOR.neutral,
        italic: true,
      }),
    );
    return parts.join('');
  }

  const grouped = new Map<string, TechHit[]>();
  for (const h of hits) {
    const cat = h.category ?? 'Other / raw signals';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(h);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  for (const category of orderedCategories) {
    push(docxHeading(category, 2));
    push(
      docxTable(
        ['Name', 'Source', 'Detail'],
        grouped.get(category)!.map((h) => [cell(h.name, { bold: true }), cell(h.source), linkableCell(h.detail ?? '')]),
        collector,
      ),
    );
  }

  return parts.join('');
}

export function exportTechStackDocx(target: string, hits: TechHit[]) {
  const collector = new DocxRelCollector();
  const blob = assembleDocxBlob(buildBody(target, hits, collector), collector);
  downloadBlob(`${bugeyeReportFilename(target)}.docx`, blob);
}
