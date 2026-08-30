import { downloadText } from '@/lib/utils';

export function exportJson(filenameBase: string, data: unknown) {
  downloadText(`${filenameBase}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function exportMarkdown(filenameBase: string, markdown: string) {
  downloadText(`${filenameBase}.md`, markdown, 'text/markdown');
}

export function exportText(filenameBase: string, text: string) {
  downloadText(`${filenameBase}.txt`, text, 'text/plain');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

// Minimal, dependency-free converter for the small markdown subset the
// report builders actually emit: #/##/### headings, "- " bullet lists,
// **bold**, _italic_ and plain paragraphs.
function markdownToHtml(markdown: string): string {
  const parts: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  };
  for (const line of markdown.split('\n')) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      parts.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`);
      continue;
    }
    const item = /^-\s+(.*)$/.exec(line);
    if (item) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${inlineMarkdown(item[1]!)}</li>`);
      continue;
    }
    closeList();
    if (line.trim() === '') continue;
    parts.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList();
  return parts.join('\n');
}

// Word opens an HTML document saved with a .doc extension and the
// application/msword MIME type directly, no OOXML/.docx generation needed
// and no new dependency or permission.
export function exportWord(filenameBase: string, markdown: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(filenameBase)}</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
h1 { font-size: 20pt; }
h2 { font-size: 15pt; margin-top: 16pt; }
h3 { font-size: 12.5pt; margin-top: 10pt; }
li { margin-bottom: 2pt; }
</style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>`;
  downloadText(`${filenameBase}.doc`, html, 'application/msword');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
