import { buildZip } from '@/lib/zip';
import { downloadBlob } from '@/lib/utils';

// Shared severity palette so every report (AutoFinder and any module that
// adopts this later) reads consistently: red for anything that needs
// attention now, amber for worth-a-look, green for fine, gray for
// informational/not-applicable. Hex values, no leading '#' (OOXML's format).
export const DOCX_COLOR = {
  critical: 'C0392B',
  warn: 'B9770E',
  good: '196F3D',
  neutral: '5D6D7E',
} as const;

export function colorForCheckState(state: 'pass' | 'warn' | 'fail' | 'na'): string {
  if (state === 'pass') return DOCX_COLOR.good;
  if (state === 'warn') return DOCX_COLOR.warn;
  if (state === 'fail') return DOCX_COLOR.critical;
  return DOCX_COLOR.neutral;
}

export function colorForGrade(grade: string): string {
  switch (grade.toUpperCase()) {
    case 'A':
      return DOCX_COLOR.good;
    case 'B':
      return '52BE80';
    case 'C':
      return 'D4AC0D';
    case 'D':
      return 'E67E22';
    case 'F':
      return DOCX_COLOR.critical;
    default:
      return DOCX_COLOR.neutral;
  }
}

export function colorForBool(good: boolean): string {
  return good ? DOCX_COLOR.good : DOCX_COLOR.critical;
}

// Collects hyperlink relationships as the document body is built, so that
// docxTable/docxHyperlinkRun callers can emit <w:hyperlink r:id="..."> runs
// without threading a manually-incremented rId counter through every call
// site. One collector per document; rId1 is reserved for the styles
// relationship (see DOCUMENT_RELS), so ids here start at rId2. The same URL
// reused across many cells (e.g. a repeated wayback link) collapses to one
// relationship.
export class DocxRelCollector {
  private ids = new Map<string, string>();
  private next = 2;

  linkId(url: string): string {
    const existing = this.ids.get(url);
    if (existing) return existing;
    const id = `rId${this.next++}`;
    this.ids.set(url, id);
    return id;
  }

  entries(): { id: string; url: string }[] {
    return Array.from(this.ids, ([url, id]) => ({ id, url }));
  }
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_');
}

// Shared filename convention for every rich Word report this project
// produces: bugeye_<domain-or-target>_<YYYY-MM-DD>_report.docx.
export function bugeyeReportFilename(target: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `bugeye_${sanitizeFilenamePart(target)}_${date}_report`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Splits a line into runs, honoring the **bold** and `code` spans that the
// project's markdown exporters (autoFinderToMarkdown, wafReportToMarkdown,
// etc.) actually produce - not a general markdown-to-OOXML converter.
function inlineRuns(text: string): string {
  const tokens = text.split(/(\*\*.+?\*\*|`.+?`)/g).filter((t) => t.length > 0);
  return tokens
    .map((tok) => {
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(tok.slice(2, -2))}</w:t></w:r>`;
      }
      if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
        return `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${escapeXml(tok.slice(1, -1))}</w:t></w:r>`;
      }
      return `<w:r><w:t xml:space="preserve">${escapeXml(tok)}</w:t></w:r>`;
    })
    .join('');
}

function paragraph(runsXml: string, style?: string): string {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${pPr}${runsXml}</w:p>`;
}

export function docxHeading(text: string, level: 1 | 2 | 3 = 2): string {
  return paragraph(inlineRuns(text), `Heading${level}`);
}

// A single run of plain (optionally colored/bold) text as its own
// paragraph - the building block for report lines that carry a verdict
// color (clickjack verdict, CORS reflection, days-until-expiry, etc.).
export function docxText(text: string, opts: { color?: string; bold?: boolean; italic?: boolean } = {}): string {
  const rPrParts: string[] = [];
  if (opts.bold) rPrParts.push('<w:b/>');
  if (opts.italic) rPrParts.push('<w:i/>');
  if (opts.color) rPrParts.push(`<w:color w:val="${opts.color}"/>`);
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function docxSpacer(): string {
  return '<w:p/>';
}

// A <w:hyperlink> run pointing at an external URL, styled with the standard
// blue-underline "Hyperlink" character style. Registers the target with
// `collector` so the caller's document-level relationship list picks it up;
// wrap the result in <w:p>...</w:p> to use it as a standalone paragraph, or
// splice it straight into a table cell (see docxTable/DocxCell.url).
export function docxHyperlinkRun(
  collector: DocxRelCollector,
  text: string,
  url: string,
  opts: { color?: string; bold?: boolean } = {},
): string {
  const id = collector.linkId(url);
  const rPrParts = ['<w:rStyle w:val="Hyperlink"/>'];
  if (opts.bold) rPrParts.push('<w:b/>');
  if (opts.color) rPrParts.push(`<w:color w:val="${opts.color}"/>`);
  const rPr = `<w:rPr>${rPrParts.join('')}</w:rPr>`;
  return `<w:hyperlink r:id="${id}" w:history="1"><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:hyperlink>`;
}

// Same as docxText, but the whole line is a clickable hyperlink.
export function docxLinkText(
  collector: DocxRelCollector,
  text: string,
  url: string,
  opts: { color?: string; bold?: boolean } = {},
): string {
  return `<w:p>${docxHyperlinkRun(collector, text, url, opts)}</w:p>`;
}

export interface DocxCell {
  text: string;
  color?: string;
  bold?: boolean;
  url?: string;
}

function tableCellXml(cell: DocxCell, collector: DocxRelCollector | undefined, shade?: string): string {
  const shd = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
  if (cell.url && collector) {
    const run = docxHyperlinkRun(collector, cell.text, cell.url, { color: cell.color, bold: cell.bold });
    return `<w:tc><w:tcPr>${shd}</w:tcPr><w:p>${run}</w:p></w:tc>`;
  }
  const rPrParts: string[] = [];
  if (cell.bold) rPrParts.push('<w:b/>');
  if (cell.color) rPrParts.push(`<w:color w:val="${cell.color}"/>`);
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
  return `<w:tc><w:tcPr>${shd}</w:tcPr><w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(cell.text)}</w:t></w:r></w:p></w:tc>`;
}

const TABLE_BORDERS =
  '<w:tblBorders>' +
  '<w:top w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '<w:left w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '<w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '<w:right w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '<w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '<w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>' +
  '</w:tblBorders>';

// A full-width bordered table with a shaded, bold header row. Returns an
// empty string for an empty row set so callers can unconditionally splice
// this into a section without an extra length check every time.
export function docxTable(headers: string[], rows: DocxCell[][], collector?: DocxRelCollector): string {
  if (rows.length === 0) return '';
  const tblPr = `<w:tblPr><w:tblW w:w="5000" w:type="pct"/>${TABLE_BORDERS}<w:tblLayout w:type="autofit"/></w:tblPr>`;
  const headerRow = `<w:tr>${headers.map((h) => tableCellXml({ text: h, bold: true }, undefined, 'D9D9D9')).join('')}</w:tr>`;
  const bodyRows = rows.map((r) => `<w:tr>${r.map((c) => tableCellXml(c, collector)).join('')}</w:tr>`).join('');
  return `<w:tbl>${tblPr}${headerRow}${bodyRows}</w:tbl><w:p/>`;
}

function markdownToParagraphs(markdown: string): string {
  const out: string[] = [];
  for (const line of markdown.split('\n')) {
    if (line.trim() === '') {
      out.push('<w:p/>');
    } else if (line.startsWith('### ')) {
      out.push(paragraph(inlineRuns(line.slice(4)), 'Heading3'));
    } else if (line.startsWith('## ')) {
      out.push(paragraph(inlineRuns(line.slice(3)), 'Heading2'));
    } else if (line.startsWith('# ')) {
      out.push(paragraph(inlineRuns(line.slice(2)), 'Heading1'));
    } else if (line.startsWith('- ')) {
      out.push(paragraph(inlineRuns(`• ${line.slice(2)}`)));
    } else if (line.length > 1 && line.startsWith('_') && line.endsWith('_')) {
      out.push(
        `<w:p><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${escapeXml(line.slice(1, -1))}</w:t></w:r></w:p>`,
      );
    } else {
      out.push(paragraph(inlineRuns(line)));
    }
  }
  return out.join('');
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// rId1 is always the styles relationship; any hyperlink relationships
// collected while building the body (see DocxRelCollector) are appended
// after it, one per unique URL.
function buildDocumentRelsXml(hyperlinks: { id: string; url: string }[]): string {
  const linkRels = hyperlinks
    .map(
      (r) =>
        `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(r.url)}" TargetMode="External"/>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${linkRels}
</Relationships>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="27"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`;

function buildDocumentXml(bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${bodyXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;
}

// Packages a body of already-built OOXML paragraph/table markup (from
// docxHeading/docxText/docxTable, or from markdownToParagraphs below) into
// a minimal but valid .docx. Shared by every exporter in this file. Pass
// the same DocxRelCollector used while building bodyXml so any hyperlinks
// it collected get declared in word/_rels/document.xml.rels.
export function assembleDocxBlob(bodyXml: string, collector?: DocxRelCollector): Blob {
  const encoder = new TextEncoder();
  const documentXml = buildDocumentXml(bodyXml);
  const bytes = buildZip([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(buildDocumentRelsXml(collector?.entries() ?? [])) },
    { name: 'word/styles.xml', data: encoder.encode(STYLES) },
  ]);
  return new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// Builds a minimal but valid .docx from the same markdown string the
// project's Markdown exporters already produce, so any "Export Markdown"
// button can get a plain "Export Word" sibling for free.
export function markdownToDocxBlob(markdown: string): Blob {
  return assembleDocxBlob(markdownToParagraphs(markdown));
}

export function exportDocx(filenameBase: string, markdown: string) {
  downloadBlob(`${filenameBase}.docx`, markdownToDocxBlob(markdown));
}
