import type { PillarId } from '@/types';

export type NetFamily = 'windows' | 'unix';

const SAFE_HOST = /^[A-Za-z0-9._:[\]-]+$/;

export function hostForCli(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withScheme).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
}

export function isSafeCliHost(host: string): boolean {
  return host.length > 0 && host.length < 256 && SAFE_HOST.test(host);
}

export interface NetCrossLink {
  pillar: PillarId;
  moduleId: string;
  label: string;
}

export interface NetCommand {
  id: string;
  name: string;
  whyNotInBrowser: string;
  inBrowserAlt?: NetCrossLink;
  build: (host: string, family: NetFamily) => string;
}

export const NET_COMMANDS: NetCommand[] = [
  {
    id: 'ping',
    name: 'Ping (ICMP)',
    whyNotInBrowser:
      'ICMP echo needs a raw socket. A Chrome extension cannot send ping packets.',
    build: (host, family) =>
      family === 'windows' ? `ping -n 4 ${host}` : `ping -c 4 ${host}`,
  },
  {
    id: 'traceroute',
    name: 'Traceroute',
    whyNotInBrowser:
      'Traceroute uses ICMP or UDP probes with TTL tricks. Same raw-socket wall as ping.',
    build: (host, family) =>
      family === 'windows' ? `tracert ${host}` : `traceroute ${host}`,
  },
  {
    id: 'whois',
    name: 'WHOIS (TCP 43)',
    whyNotInBrowser:
      'Legacy WHOIS is a raw TCP conversation on port 43. Browsers cannot open that socket. Use WhoisLookup for RDAP (HTTP/JSON) inside the panel.',
    inBrowserAlt: {
      pillar: 'osint',
      moduleId: 'whoislookup',
      label: 'Open WhoisLookup (RDAP)',
    },
    build: (host) => `whois ${host}`,
  },
  {
    id: 'nmap',
    name: 'Port scan (nmap)',
    whyNotInBrowser:
      'A real TCP/SYN scan needs sockets the browser will not give an extension. Fetching http://host:port is not a port scan: it only speaks HTTP, hits CORS, and lies about closed ports.',
    inBrowserAlt: {
      pillar: 'osint',
      moduleId: 'shodanpeek',
      label: 'Open ShodanPeek (passive ports)',
    },
    build: (host, family) =>
      family === 'windows'
        ? `nmap -sT -sV --top-ports 1000 ${host}`
        : `nmap -sV --top-ports 1000 ${host}`,
  },
  {
    id: 'naabu',
    name: 'Port scan (naabu)',
    whyNotInBrowser:
      'Same limit as nmap. This is copy-paste only; nothing is executed here. ReconBuild also builds naabu with extra flags.',
    inBrowserAlt: {
      pillar: 'cli-bridge',
      moduleId: 'reconbuild',
      label: 'Open ReconBuild (naabu flags)',
    },
    build: (host) => `naabu -host ${host} -top-ports 1000`,
  },
];
