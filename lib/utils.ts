import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeDomain(input: string): string {
  let value = input.trim();
  value = value.replace(/^https?:\/\//i, '');
  value = value.replace(/\/.*$/, '');
  value = value.replace(/:.*$/, '');
  return value.toLowerCase();
}

export function normalizeUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return null;
  }
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-f:]+:[0-9a-f:]*$/i;

export function isIpAddress(input: string): boolean {
  const value = input.trim();
  const v4 = value.match(IPV4_RE);
  if (v4) return v4.slice(1).every((n) => Number(n) >= 0 && Number(n) <= 255);
  return IPV6_RE.test(value) && value.includes(':');
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function formatTimestamp(date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}
