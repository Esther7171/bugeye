export type FuzzPosition = 'path' | 'param' | 'header' | 'vhost' | 'body';

export interface FuzzOptions {
  target: string;
  position: FuzzPosition;
  paramName: string;
  headerName: string;
  bodyTemplate: string;
  wordlist: string;
  matchCodes: string;
  filterCodes: string;
  filterSize: string;
  autoCalibrate: boolean;
  recursion: boolean;
  extensions: string;
  threads: string;
  rate: string;
}

function withFuzzUrl(target: string, position: FuzzPosition, paramName: string): string {
  const base = target.replace(/\/$/, '');
  if (position === 'path') return `${base}/FUZZ`;
  if (position === 'param') return `${base}?${paramName || 'q'}=FUZZ`;
  return base;
}

export function buildFfuf(o: FuzzOptions): string {
  const parts = ['ffuf'];
  const url = withFuzzUrl(o.target, o.position, o.paramName);
  parts.push(`-u '${url}'`);
  parts.push(`-w '${o.wordlist || 'wordlist.txt'}'`);

  if (o.position === 'header') parts.push(`-H '${o.headerName || 'X-Custom-Header'}: FUZZ'`);
  if (o.position === 'vhost') {
    let host: string;
    try {
      host = new URL(o.target).hostname;
    } catch {
      host = o.target;
    }
    parts.push(`-H 'Host: FUZZ.${host}'`);
  }
  if (o.position === 'body') {
    parts.push('-X POST');
    parts.push(`-d '${o.bodyTemplate || 'username=admin&password=FUZZ'}'`);
    parts.push(`-H 'Content-Type: application/x-www-form-urlencoded'`);
  }

  if (o.extensions.trim()) parts.push(`-e ${o.extensions.trim()}`);
  if (o.matchCodes.trim()) parts.push(`-mc ${o.matchCodes.trim()}`);
  if (o.filterCodes.trim()) parts.push(`-fc ${o.filterCodes.trim()}`);
  if (o.filterSize.trim()) parts.push(`-fs ${o.filterSize.trim()}`);
  if (o.autoCalibrate) parts.push('-ac');
  if (o.recursion && o.position === 'path') parts.push('-recursion -recursion-depth 2');
  if (o.threads.trim()) parts.push(`-t ${o.threads.trim()}`);
  if (o.rate.trim()) parts.push(`-rate ${o.rate.trim()}`);

  return parts.join(' ');
}

export function buildWfuzz(o: FuzzOptions): string {
  const parts = ['wfuzz'];
  parts.push(`-w '${o.wordlist || 'wordlist.txt'}'`);
  if (o.matchCodes.trim()) parts.push(`--sc ${o.matchCodes.trim()}`);
  if (o.filterCodes.trim()) parts.push(`--hc ${o.filterCodes.trim()}`);
  if (o.filterSize.trim()) parts.push(`--hh ${o.filterSize.trim()}`);
  if (o.threads.trim()) parts.push(`-t ${o.threads.trim()}`);

  if (o.position === 'header') {
    parts.push(`-H '${o.headerName || 'X-Custom-Header'}: FUZZ'`);
    parts.push(`'${o.target}'`);
  } else if (o.position === 'vhost') {
    let host: string;
    try {
      host = new URL(o.target).hostname;
    } catch {
      host = o.target;
    }
    parts.push(`-H 'Host: FUZZ.${host}'`);
    parts.push(`'${o.target}'`);
  } else if (o.position === 'body') {
    parts.push('-X POST');
    parts.push(`-d '${o.bodyTemplate || 'username=admin&password=FUZZ'}'`);
    parts.push(`'${o.target}'`);
  } else {
    parts.push(`'${withFuzzUrl(o.target, o.position, o.paramName)}'`);
  }

  return parts.join(' ');
}

export function buildGobuster(o: FuzzOptions): string | null {
  if (o.position !== 'path') return null;
  const parts = ['gobuster', 'dir', `-u '${o.target}'`, `-w '${o.wordlist || 'wordlist.txt'}'`];
  if (o.extensions.trim()) parts.push(`-x ${o.extensions.trim()}`);
  if (o.threads.trim()) parts.push(`-t ${o.threads.trim()}`);
  if (o.matchCodes.trim()) parts.push(`-s ${o.matchCodes.trim()}`);
  return parts.join(' ');
}

export function buildFeroxbuster(o: FuzzOptions): string | null {
  if (o.position !== 'path') return null;
  const parts = ['feroxbuster', `-u '${o.target}'`, `-w '${o.wordlist || 'wordlist.txt'}'`];
  if (o.extensions.trim()) parts.push(`-x ${o.extensions.trim()}`);
  if (o.threads.trim()) parts.push(`-t ${o.threads.trim()}`);
  if (o.filterCodes.trim()) parts.push(`--filter-status ${o.filterCodes.trim()}`);
  if (o.recursion === false) parts.push('-n');
  return parts.join(' ');
}
