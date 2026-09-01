// Builds production Chrome and Firefox packages:
//   bugeye-v1/            unpacked Chromium
//   bugeye-v1.zip         Chrome Web Store / Edge zip
//   bugeye-v1-firefox/    unpacked Firefox
//   bugeye-v1-firefox.zip AMO zip
import { execSync } from 'node:child_process';
import { existsSync, rmSync, cpSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = join(root, '.output');

function copyUnpacked(srcName, destName) {
  const src = join(outputDir, srcName);
  const dest = join(root, destName);
  if (!existsSync(src)) throw new Error(`Missing unpacked build: ${src}`);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Unpacked build copied to: ${dest}`);
}

function copyZip(suffix, destName) {
  const zipFile = readdirSync(outputDir).find((f) => f.endsWith(suffix));
  if (!zipFile) throw new Error(`wxt zip did not produce a *${suffix} file in .output/`);
  const dest = join(root, destName);
  copyFileSync(join(outputDir, zipFile), dest);
  console.log(`Store-ready zip copied to: ${dest}`);
}

execSync('npx wxt build', { stdio: 'inherit' });
execSync('npx wxt zip', { stdio: 'inherit' });
execSync('npx wxt build -b firefox', { stdio: 'inherit' });
execSync('npx wxt zip -b firefox', { stdio: 'inherit' });

copyUnpacked('chrome-mv3', 'bugeye-v1');
copyZip('-chrome.zip', 'bugeye-v1.zip');
copyUnpacked('firefox-mv3', 'bugeye-v1-firefox');
copyZip('-firefox.zip', 'bugeye-v1-firefox.zip');
