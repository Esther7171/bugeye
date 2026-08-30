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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
