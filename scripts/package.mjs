// Builds the production extension, then copies the unpacked output into a
// top-level bugeye-v1/ folder and the store-ready zip to bugeye-v1.zip, for
// clarity when uploading to the Chrome Web Store / Edge Add-ons.
import { execSync } from 'node:child_process';
import { existsSync, rmSync, cpSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = join(root, '.output');
const unpackedSrc = join(outputDir, 'chrome-mv3');
const unpackedDest = join(root, 'bugeye-v1');
const zipDest = join(root, 'bugeye-v1.zip');

execSync('npx wxt build', { stdio: 'inherit' });
execSync('npx wxt zip', { stdio: 'inherit' });

if (existsSync(unpackedDest)) rmSync(unpackedDest, { recursive: true, force: true });
cpSync(unpackedSrc, unpackedDest, { recursive: true });

const zipFile = readdirSync(outputDir).find((f) => f.endsWith('-chrome.zip'));
if (!zipFile) throw new Error('wxt zip did not produce a *-chrome.zip file in .output/');
copyFileSync(join(outputDir, zipFile), zipDest);

console.log(`\nUnpacked build copied to: ${unpackedDest}`);
console.log(`Store-ready zip copied to: ${zipDest}`);
