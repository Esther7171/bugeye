export interface RetireVuln {
  belowVersion: string;
  cves: string[];
  info: string;
}

export interface RetireLib {
  name: string;
  contentPattern: RegExp;
  filenamePattern?: RegExp;
  vulnerabilities: RetireVuln[];
}

// A curated subset of widely-deployed front-end libraries with well-documented
// CVEs, not the full retire.js dataset. Detection is filename/content-banner
// based, same technique retire.js itself uses for browser-side scanning.
export const RETIRE_LIBRARIES: RetireLib[] = [
  {
    name: 'jQuery',
    contentPattern: /jQuery\s+JavaScript Library\s+v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /jquery[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [
      { belowVersion: '3.5.0', cves: ['CVE-2020-11022', 'CVE-2020-11023'], info: 'XSS via htmlPrefilter() when untrusted HTML is passed to .html()/.append()/etc.' },
      { belowVersion: '1.9.0', cves: ['CVE-2012-6708'], info: 'XSS via selector-based DOM manipulation.' },
    ],
  },
  {
    name: 'jQuery UI',
    contentPattern: /jQuery UI\s*-\s*v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /jquery-ui[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [
      { belowVersion: '1.13.0', cves: ['CVE-2021-41182', 'CVE-2021-41183', 'CVE-2021-41184'], info: 'XSS in Datepicker, .position() and altField widget options.' },
    ],
  },
  {
    name: 'Bootstrap',
    contentPattern: /Bootstrap\s+v(\d+\.\d+\.\d+)/i,
    filenamePattern: /bootstrap[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [
      { belowVersion: '3.4.1', cves: ['CVE-2018-14040', 'CVE-2018-14041', 'CVE-2018-14042'], info: 'XSS in tooltip/popover, affix and collapse data attributes.' },
      { belowVersion: '4.3.1', cves: ['CVE-2019-8331'], info: 'XSS via tooltip/popover data-template, data-content or data-title attributes.' },
    ],
  },
  {
    name: 'Lodash',
    contentPattern: /lodash(?:\.js)?\s+v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /lodash[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [
      { belowVersion: '4.17.12', cves: ['CVE-2019-10744'], info: 'Prototype pollution in defaultsDeep().' },
      { belowVersion: '4.17.21', cves: ['CVE-2021-23337'], info: 'Command injection via template().' },
    ],
  },
  {
    name: 'Moment.js',
    contentPattern: /moment\.js\s+v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /moment[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [{ belowVersion: '2.29.4', cves: ['CVE-2022-31129'], info: "ReDoS in moment's string-to-date parsing." }],
  },
  {
    name: 'Handlebars',
    contentPattern: /Handlebars\s+v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /handlebars[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [
      { belowVersion: '4.3.0', cves: ['CVE-2019-19919'], info: 'Prototype pollution allowing arbitrary code execution in compiled templates.' },
      { belowVersion: '4.5.3', cves: ['CVE-2019-20920'], info: 'Prototype pollution via the lookup helper.' },
    ],
  },
  {
    name: 'Underscore.js',
    contentPattern: /Underscore\.js\s+(\d+\.\d+\.\d+)/i,
    filenamePattern: /underscore[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [{ belowVersion: '1.12.1', cves: ['CVE-2021-23358'], info: 'Arbitrary code execution via the template() function.' }],
  },
  {
    name: 'AngularJS',
    contentPattern: /angular(?:\.js)?[\s@]v?(\d+\.\d+\.\d+)/i,
    filenamePattern: /angular[.-](\d+\.\d+\.\d+)/i,
    vulnerabilities: [{ belowVersion: '1.6.9', cves: ['CVE-2018-6341'], info: 'SCE sandbox bypass leading to XSS.' }],
  },
];

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export interface RetireFinding {
  url: string;
  library: string;
  version: string;
  vulnerabilities: RetireVuln[];
}

export function detectLibrary(url: string, content: string | null): RetireFinding | null {
  for (const lib of RETIRE_LIBRARIES) {
    let version: string | null = null;
    if (content) {
      const match = content.match(lib.contentPattern);
      if (match?.[1]) version = match[1];
    }
    if (!version && lib.filenamePattern) {
      const match = url.match(lib.filenamePattern);
      if (match?.[1]) version = match[1];
    }
    if (!version) continue;

    const hit = lib.vulnerabilities.filter((v) => compareVersions(version!, v.belowVersion) < 0);
    if (hit.length > 0) {
      return { url, library: lib.name, version, vulnerabilities: hit };
    }
    return null;
  }
  return null;
}
