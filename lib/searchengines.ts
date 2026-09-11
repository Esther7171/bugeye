import type { PillarId } from '@/types';

export interface SearchEngine {
  id: string;
  name: string;
  desc: string;
  category: string;
  // Builds a deep link for the target, pre-filled where the engine's URL
  // scheme allows. Returns null when it can't meaningfully pre-fill for this
  // target type (e.g. a domain-only engine given a bare IP).
  url: (target: string, isIp: boolean) => string | null;
  // Engine requires a login or API key before results are usable - the link
  // still lands on the right page, but you'll need an account.
  auth?: boolean;
  // BugEye already queries this source natively via its own API.
  native?: { pillar: PillarId; moduleId: string; label: string };
}

const enc = encodeURIComponent;

// Grouped roughly the way the "32 search engines" lists circulate, so the
// categories are familiar. Every link opens in a new tab; nothing is fetched
// or auto-submitted from here.
export const SEARCH_ENGINES: SearchEngine[] = [
  // --- Attack surface & device search ---
  {
    id: 'shodan',
    name: 'Shodan',
    desc: 'IoT / internet-exposed device search engine.',
    category: 'Attack surface & devices',
    url: (t, isIp) => (isIp ? `https://www.shodan.io/host/${enc(t)}` : `https://www.shodan.io/search?query=hostname:${enc(t)}`),
    native: { pillar: 'osint', moduleId: 'shodanpeek', label: 'ShodanPeek' },
  },
  {
    id: 'censys',
    name: 'Censys',
    desc: 'Internet asset / host discovery platform.',
    category: 'Attack surface & devices',
    url: (t) => `https://search.censys.io/search?resource=hosts&q=${enc(t)}`,
  },
  {
    id: 'zoomeye',
    name: 'ZoomEye',
    desc: 'Cyberspace search engine for exposed devices.',
    category: 'Attack surface & devices',
    url: (t) => `https://www.zoomeye.org/searchResult?q=${enc(t)}`,
  },
  {
    id: 'fofa',
    name: 'FOFA',
    desc: 'Cyberspace asset mapping engine.',
    category: 'Attack surface & devices',
    url: (t, isIp) => {
      const query = isIp ? `ip="${t}"` : `domain="${t}"`;
      try {
        return `https://en.fofa.info/result?qbase64=${enc(btoa(query))}`;
      } catch {
        return 'https://en.fofa.info/';
      }
    },
    auth: true,
  },
  {
    id: 'netlas',
    name: 'Netlas',
    desc: 'Attack-surface discovery platform.',
    category: 'Attack surface & devices',
    url: (t) => `https://app.netlas.io/responses/?q=${enc(t)}`,
    auth: true,
  },
  {
    id: 'fullhunt',
    name: 'FullHunt',
    desc: 'Attack-surface discovery.',
    category: 'Attack surface & devices',
    url: (t, isIp) => (isIp ? 'https://fullhunt.io/' : `https://fullhunt.io/search?query=${enc(t)}`),
    auth: true,
  },
  {
    id: 'onyphe',
    name: 'ONYPHE',
    desc: 'Cyber-defense search engine.',
    category: 'Attack surface & devices',
    url: (t) => `https://www.onyphe.io/search?q=${enc(t)}`,
    auth: true,
  },
  {
    id: 'binaryedge',
    name: 'BinaryEdge',
    desc: 'Threat-intelligence data platform.',
    category: 'Attack surface & devices',
    url: () => 'https://app.binaryedge.io/',
    auth: true,
  },
  {
    id: 'criminalip',
    name: 'Criminal IP',
    desc: 'Asset inventory and risk assessment.',
    category: 'Attack surface & devices',
    url: (t) => `https://www.criminalip.io/asset/search?query=${enc(t)}`,
    auth: true,
  },

  // --- DNS & domains ---
  {
    id: 'securitytrails',
    name: 'SecurityTrails',
    desc: 'DNS and domain history platform.',
    category: 'DNS & domains',
    url: (t, isIp) => (isIp ? `https://securitytrails.com/list/ip/${enc(t)}` : `https://securitytrails.com/domain/${enc(t)}/dns`),
    native: { pillar: 'osint', moduleId: 'dnsrecords', label: 'DNSRecords' },
  },
  {
    id: 'dnsdumpster',
    name: 'DNSDumpster',
    desc: 'DNS recon and research.',
    category: 'DNS & domains',
    url: () => 'https://dnsdumpster.com/',
    native: { pillar: 'osint', moduleId: 'subfinder', label: 'SubFinder' },
  },
  {
    id: 'dnsdb',
    name: 'DNSDB',
    desc: 'Historical passive-DNS data.',
    category: 'DNS & domains',
    url: () => 'https://www.dnsdb.info/',
    auth: true,
  },
  {
    id: 'crtsh',
    name: 'crt.sh',
    desc: 'Certificate-transparency search.',
    category: 'DNS & domains',
    url: (t, isIp) => (isIp ? null : `https://crt.sh/?q=${enc(`%.${t}`)}`),
    native: { pillar: 'osint', moduleId: 'subfinder', label: 'SubFinder' },
  },

  // --- Credentials & breaches ---
  {
    id: 'dehashed',
    name: 'DeHashed',
    desc: 'Leaked-credentials search engine.',
    category: 'Credentials & breaches',
    url: (t) => `https://www.dehashed.com/search?query=${enc(t)}`,
    auth: true,
    native: { pillar: 'osint', moduleId: 'breachcheck', label: 'BreachCheck' },
  },
  {
    id: 'leakix',
    name: 'LeakIX',
    desc: 'Information-leaks search engine.',
    category: 'Credentials & breaches',
    url: (t, isIp) => (isIp ? `https://leakix.net/host/${enc(t)}` : `https://leakix.net/domain/${enc(t)}`),
  },
  {
    id: 'intelx',
    name: 'Intelligence X',
    desc: 'OSINT and data-breach search.',
    category: 'Credentials & breaches',
    url: (t) => `https://intelx.io/?s=${enc(t)}`,
    auth: true,
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    desc: 'Email-address finder.',
    category: 'Credentials & breaches',
    url: (t, isIp) => (isIp ? null : `https://hunter.io/search/${enc(t)}`),
    auth: true,
    native: { pillar: 'osint', moduleId: 'emailhunter', label: 'EmailHunter' },
  },

  // --- Code search ---
  {
    id: 'publicwww',
    name: 'PublicWWW',
    desc: 'Source-code / snippet search across sites.',
    category: 'Code search',
    url: (t) => `https://publicwww.com/websites/${enc(`"${t}"`)}/`,
  },
  {
    id: 'grep-app',
    name: 'grep.app',
    desc: 'Code search across public GitHub.',
    category: 'Code search',
    url: (t) => `https://grep.app/search?q=${enc(t)}`,
    native: { pillar: 'osint', moduleId: 'gitdork', label: 'GitDork' },
  },
  {
    id: 'searchcode',
    name: 'searchcode',
    desc: 'Source-code and API search engine.',
    category: 'Code search',
    url: (t) => `https://searchcode.com/?q=${enc(t)}`,
  },
  {
    id: 'grayhatwarfare',
    name: 'GrayHatWarfare',
    desc: 'Public S3 / cloud bucket search.',
    category: 'Code search',
    url: (t) => `https://buckets.grayhatwarfare.com/results/${enc(t)}`,
    native: { pillar: 'osint', moduleId: 'bucketspot', label: 'BucketSpot' },
  },

  // --- Vulnerabilities & exploits ---
  {
    id: 'exploitdb',
    name: 'Exploit-DB',
    desc: 'Exploit and vulnerability archive.',
    category: 'Vulnerabilities & exploits',
    url: (t) => `https://www.exploit-db.com/search?text=${enc(t)}`,
  },
  {
    id: 'vulners',
    name: 'Vulners',
    desc: 'Vulnerability database and search.',
    category: 'Vulnerabilities & exploits',
    url: (t) => `https://vulners.com/search?query=${enc(t)}`,
    native: { pillar: 'osint', moduleId: 'cvelookup', label: 'CVELookup' },
  },
  {
    id: 'packetstorm',
    name: 'Packet Storm',
    desc: 'Security tools, exploits and advisories.',
    category: 'Vulnerabilities & exploits',
    url: (t) => `https://packetstormsecurity.com/search/?q=${enc(t)}`,
  },

  // --- Web scan, archive & threat intel ---
  {
    id: 'urlscan',
    name: 'urlscan.io',
    desc: 'Website and URL scanning service.',
    category: 'Web scan, archive & threat intel',
    url: (t, isIp) => (isIp ? `https://urlscan.io/search/#ip:${enc(t)}` : `https://urlscan.io/domain/${enc(t)}`),
  },
  {
    id: 'archive',
    name: 'Wayback Machine',
    desc: 'Historical web-page archive.',
    category: 'Web scan, archive & threat intel',
    url: (t, isIp) => (isIp ? null : `https://web.archive.org/web/*/${enc(t)}/*`),
    native: { pillar: 'osint', moduleId: 'wayback', label: 'Wayback' },
  },
  {
    id: 'virustotal',
    name: 'VirusTotal',
    desc: 'Malware analysis and domain/IP reputation.',
    category: 'Web scan, archive & threat intel',
    url: (t, isIp) => (isIp ? `https://www.virustotal.com/gui/ip-address/${enc(t)}` : `https://www.virustotal.com/gui/domain/${enc(t)}`),
  },
  {
    id: 'greynoise',
    name: 'GreyNoise',
    desc: 'Internet background-noise / scanner intel (IP).',
    category: 'Web scan, archive & threat intel',
    url: (t, isIp) => (isIp ? `https://viz.greynoise.io/ip/${enc(t)}` : `https://viz.greynoise.io/query/?gnql=${enc(`metadata.rdns:*.${t}`)}`),
  },
  {
    id: 'pulsedive',
    name: 'Pulsedive',
    desc: 'Threat-intelligence indicator search.',
    category: 'Web scan, archive & threat intel',
    url: (t) => `https://pulsedive.com/indicator/?ioc=${enc(t)}`,
    auth: true,
  },
  {
    id: 'polyswarm',
    name: 'PolySwarm',
    desc: 'Threat-detection marketplace.',
    category: 'Web scan, archive & threat intel',
    url: () => 'https://polyswarm.network/',
    auth: true,
  },
  {
    id: 'onyphe-dork',
    name: 'DorkSearch',
    desc: 'Google-dorking query builder.',
    category: 'Web scan, archive & threat intel',
    url: (t, isIp) => (isIp ? 'https://dorksearch.com/' : `https://dorksearch.com/results?q=${enc(`site:${t}`)}`),
    native: { pillar: 'osint', moduleId: 'googledork', label: 'GoogleDork' },
  },
];

export const SEARCH_ENGINE_CATEGORIES = Array.from(new Set(SEARCH_ENGINES.map((e) => e.category)));
