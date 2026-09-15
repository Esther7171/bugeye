// Post-build prerender: renders the React pages to static HTML and injects the
// markup into the built index.html / features.html so their initial HTML DOM
// contains real content (for SEO and no-JS crawlers) instead of an empty
// <div id="root"></div>. The client bundle then hydrates that markup.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = pathToFileURL(resolve(here, 'dist-server/entry-server.js')).href;
const { render } = await import(serverEntry);

const pages = [
  { file: 'dist/index.html', page: 'home' },
  { file: 'dist/features.html', page: 'features' },
];

const ROOT = '<div id="root"></div>';

for (const { file, page } of pages) {
  const path = resolve(here, file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes(ROOT)) {
    throw new Error(`Prerender: could not find '${ROOT}' in ${file}`);
  }
  const appHtml = render(page);
  writeFileSync(path, html.replace(ROOT, `<div id="root">${appHtml}</div>`));
  console.log(`Prerendered ${file} (${appHtml.length} chars of markup)`);
}
