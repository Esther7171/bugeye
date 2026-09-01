import {
  docxHeading,
  docxText,
  docxLinkText,
  docxSpacer,
  docxTable,
  assembleDocxBlob,
  bugeyeReportFilename,
  isHttpUrl,
  DocxRelCollector,
  DOCX_COLOR,
  type DocxCell,
} from '@/lib/docx';
import { downloadBlob } from '@/lib/utils';
import { wafwoofCommand, type WafReport } from '@/lib/waf';

function cell(text: string, opts: { color?: string; bold?: boolean; url?: string } = {}): DocxCell {
  return { text, ...opts };
}

function targetHost(target: string): string {
  try {
    return new URL(target).hostname || target;
  } catch {
    return target;
  }
}

function buildBody(r: WafReport, collector: DocxRelCollector): string {
  const parts: string[] = [];
  const push = (...xml: string[]) => parts.push(...xml);

  push(docxHeading(`WAFDetect report - ${r.target}`, 1));
  push(docxText(`Generated: ${r.generatedAt}`, { color: DOCX_COLOR.neutral, italic: true }));
  push(docxSpacer());

  if (r.vendors.length > 0) {
    for (const v of r.vendors) {
      push(
        docxText(`WAF detected: ${v.vendor} - via ${v.evidence.map((e) => e.evidenceLabel).join(', ')}`, {
          color: DOCX_COLOR.warn,
          bold: true,
        }),
      );
    }
  } else {
    push(docxText('No WAF signature found (passive check).', { color: DOCX_COLOR.good, bold: true }));
  }
  push(docxSpacer());

  push(docxHeading(`Evidence (${r.evidence.length})`));
  if (r.evidence.length) {
    push(
      docxTable(
        ['Type', 'Vendor', 'Evidence', 'Detail'],
        r.evidence.map((e) => [cell(e.type), cell(e.vendor, { bold: true }), cell(e.evidenceLabel), cell(e.detail)]),
        collector,
      ),
    );
  } else {
    push(docxText('None.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  push(docxHeading('Caveat'));
  push(
    docxText(
      'Passive detection only. A missing signature does NOT prove there is no WAF, many WAFs are silent until a malicious request triggers them. For active confirmation, run wafw00f in your terminal.',
      { color: DOCX_COLOR.neutral, italic: true },
    ),
  );

  push(docxHeading('Active confirmation'));
  push(docxText(wafwoofCommand(r.target)));
  push(docxText(wafwoofCommand(r.target, true)));
  push(docxSpacer());

  push(docxHeading('Checked'));
  push(
    docxText(
      `Headers: ${r.checkedHeaders ? 'yes' : 'no'}. Cookies: ${r.checkedCookies ? 'yes' : 'no'}. Page body: ${r.checkedBody ? 'yes' : 'no'}.`,
    ),
  );

  if (isHttpUrl(r.target)) {
    push(docxSpacer());
    push(docxLinkText(collector, r.target, r.target));
  }

  return parts.join('');
}

export function exportWafDocx(report: WafReport) {
  const collector = new DocxRelCollector();
  const blob = assembleDocxBlob(buildBody(report, collector), collector);
  downloadBlob(`${bugeyeReportFilename(targetHost(report.target))}.docx`, blob);
}
