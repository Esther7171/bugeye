import {
  docxHeading,
  docxText,
  docxLinkText,
  docxSpacer,
  docxTable,
  assembleDocxBlob,
  colorForCheckState,
  colorForGrade,
  colorForBool,
  isHttpUrl,
  bugeyeReportFilename,
  DocxRelCollector,
  DOCX_COLOR,
  type DocxCell,
} from '@/lib/docx';
import { downloadBlob } from '@/lib/utils';
import type { AutoFinderReport } from '@/lib/autofinder';

const LIST_CAP = 200;

// Kept for backward compatibility with any existing callers; mirrors the
// shared bugeyeReportFilename convention used by every module's Word export.
export function autoFinderReportFilename(domain: string): string {
  return bugeyeReportFilename(domain);
}

function cell(text: string, opts: { color?: string; bold?: boolean; url?: string } = {}): DocxCell {
  return { text, ...opts };
}

// Turns a plain URL cell into a hyperlink cell when it actually looks like
// one (some URL-columns hold relative paths or non-http values too).
function linkCell(text: string, opts: { color?: string; bold?: boolean } = {}): DocxCell {
  return isHttpUrl(text) ? cell(text, { ...opts, url: text }) : cell(text, opts);
}

function daysColor(days: number): string {
  if (days <= 14) return DOCX_COLOR.critical;
  if (days <= 30) return DOCX_COLOR.warn;
  return DOCX_COLOR.good;
}

function buildBody(r: AutoFinderReport, collector: DocxRelCollector): string {
  const parts: string[] = [];
  const push = (...xml: string[]) => parts.push(...xml);

  push(docxHeading(`BugEye Report - ${r.domain}`, 1));
  push(docxText(`Generated: ${r.generatedAt}`, { color: DOCX_COLOR.neutral, italic: true }));
  push(docxSpacer());

  // DNS
  push(docxHeading('DNS'));
  if (r.dns.addresses.length) {
    push(docxTable(['IP address'], r.dns.addresses.map((a) => [cell(a)])));
  } else {
    push(docxText(`None resolved.${r.dns.error ? ` (${r.dns.error})` : ''}`, { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Subdomains
  push(docxHeading(`Subdomains (${r.subdomains.list.length})`));
  if (r.subdomains.list.length) {
    push(docxTable(['Subdomain'], r.subdomains.list.slice(0, LIST_CAP).map((s) => [cell(s)])));
  } else {
    push(docxText(`None found.${r.subdomains.error ? ` (${r.subdomains.error})` : ''}`, { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Security headers
  push(docxHeading('Security headers'));
  if (r.headerGrade) {
    push(
      docxText(`Grade: ${r.headerGrade.grade} (${r.headerGrade.score}/100)`, {
        color: colorForGrade(r.headerGrade.grade),
        bold: true,
      }),
    );
    push(
      docxTable(
        ['Header', 'State', 'Detail'],
        r.headerGrade.checks.map((c) => [
          cell(c.label),
          cell(c.state.toUpperCase(), { color: colorForCheckState(c.state), bold: true }),
          cell(c.detail),
        ]),
      ),
    );
  } else {
    push(docxText('Could not fetch headers.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // CSP audit
  push(docxHeading('CSP audit'));
  if (r.csp) {
    push(
      docxText(
        r.csp.present ? `Grade: ${r.csp.grade} (${r.csp.score}/100)` : 'No CSP header present.',
        { color: r.csp.present ? colorForGrade(r.csp.grade) : DOCX_COLOR.critical, bold: true },
      ),
    );
    push(
      docxTable(
        ['Directive', 'State', 'Detail'],
        r.csp.findings.map((f) => [
          cell(f.directive),
          cell(f.state.toUpperCase(), { color: colorForCheckState(f.state), bold: true }),
          cell(f.detail),
        ]),
      ),
    );
  } else {
    push(docxText('Not evaluated.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Clickjacking
  push(docxHeading('Clickjacking'));
  if (r.clickjack) {
    const color = r.clickjack.verdict === 'protected' ? DOCX_COLOR.good : r.clickjack.verdict === 'partial' ? DOCX_COLOR.warn : DOCX_COLOR.critical;
    push(docxText(`${r.clickjack.verdict}: ${r.clickjack.detail}`, { color, bold: true }));
  } else {
    push(docxText('Not evaluated.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // CORS
  push(docxHeading('CORS'));
  if (r.cors) {
    push(
      docxText(
        `Reflected: ${r.cors.reflected ? 'yes' : 'no'}. ACAO: ${r.cors.acao ?? '(none)'}. Credentials: ${r.cors.acac ?? '(none)'}.`,
        { color: colorForBool(!r.cors.reflected), bold: r.cors.reflected },
      ),
    );
  } else {
    push(docxText('Not evaluated.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // HTTP methods
  push(docxHeading('HTTP methods'));
  push(docxText(r.httpMethods?.allow?.join(', ') || 'Not disclosed via OPTIONS.', { color: DOCX_COLOR.neutral }));

  // TLS certificate
  push(docxHeading('TLS certificate'));
  if (r.ssl) {
    push(docxText(`Issuer: ${r.ssl.latest.issuerName}`));
    push(
      docxText(`Valid until: ${r.ssl.latest.notAfter} (${r.ssl.daysUntilExpiry}d left)`, {
        color: daysColor(r.ssl.daysUntilExpiry),
        bold: true,
      }),
    );
    push(docxText(`SANs: ${r.ssl.sans.length}`));
  } else {
    push(docxText('No CT log entries found.', { color: DOCX_COLOR.neutral, italic: true }));
  }
  push(docxSpacer());

  // Favicon hash
  push(docxHeading('Favicon hash'));
  if (r.faviconHash !== null) {
    const shodanUrl = `https://www.shodan.io/search?query=http.favicon.hash%3A${r.faviconHash}`;
    push(docxText(`${r.faviconHash}`));
    push(docxLinkText(collector, shodanUrl, shodanUrl));
  } else {
    push(docxText('Could not fetch favicon.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // IP + geolocation
  push(docxHeading('IP + geolocation'));
  push(docxText(r.ip ? `IP: ${r.ip}` : 'Not resolved.', { color: r.ip ? undefined : DOCX_COLOR.neutral }));
  if (r.ipgeo?.ok) {
    const flagged = !!(r.ipgeo.hosting || r.ipgeo.proxy);
    push(
      docxText(
        `${r.ipgeo.country ?? '?'}, ${r.ipgeo.region ?? '?'}, ${r.ipgeo.city ?? '?'} - ${r.ipgeo.isp ?? r.ipgeo.org ?? '?'} (ASN ${r.ipgeo.asn ?? '?'})${r.ipgeo.hosting ? ' [hosting]' : ''}${r.ipgeo.proxy ? ' [proxy]' : ''}`,
        { color: flagged ? DOCX_COLOR.warn : undefined },
      ),
    );
  }

  // Shodan InternetDB
  push(docxHeading('Shodan InternetDB'));
  if (r.shodan) {
    push(docxText(`Ports: ${r.shodan.ports.join(', ') || 'none'}`));
    push(docxText(`CVEs: ${r.shodan.vulns.join(', ') || 'none'}`, { color: r.shodan.vulns.length ? DOCX_COLOR.critical : DOCX_COLOR.good, bold: r.shodan.vulns.length > 0 }));
    push(docxText(`Tags: ${r.shodan.tags.join(', ') || 'none'}`));
  } else {
    push(docxText('Not available.', { color: DOCX_COLOR.neutral, italic: true }));
  }
  push(docxSpacer());

  // robots.txt
  push(docxHeading('robots.txt'));
  push(
    docxText(
      r.robots.found
        ? `Found. ${r.robots.disallow.length} Disallow rules. Sitemaps: ${r.robots.sitemaps.join(', ') || 'none listed'}`
        : 'Not found.',
      { color: r.robots.found ? undefined : DOCX_COLOR.neutral },
    ),
  );

  // sitemap.xml
  push(docxHeading('sitemap.xml'));
  push(
    docxText(
      r.sitemap.urls.length ? `${r.sitemap.urls.length} URLs across ${r.sitemap.sitemapFileCount} file(s).` : 'Not found or empty.',
      { color: r.sitemap.urls.length ? undefined : DOCX_COLOR.neutral },
    ),
  );

  // .well-known paths
  const foundWellknown = r.wellknown.filter((w) => w.found);
  push(docxHeading(`.well-known paths (${foundWellknown.length}/${r.wellknown.length} found)`));
  if (foundWellknown.length) {
    push(docxTable(['Path', 'Status'], foundWellknown.map((w) => [cell(w.path), cell(String(w.status ?? ''))])));
  } else {
    push(docxText('None found.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Admin/sensitive paths
  const interesting = r.panelhunt.filter((p) => p.interesting);
  push(docxHeading(`Admin/sensitive paths (${interesting.length} interesting)`));
  if (interesting.length) {
    push(
      docxTable(
        ['Path', 'Status', 'Note'],
        interesting.map((p) => [
          cell(p.path, { color: p.looksAdmin ? DOCX_COLOR.critical : DOCX_COLOR.warn, bold: p.looksAdmin }),
          cell(String(p.status ?? '')),
          cell(`${p.looksAdmin ? '[admin?] ' : ''}${p.label}`),
        ]),
      ),
    );
  } else {
    push(docxText('Nothing interesting found.', { color: DOCX_COLOR.good, italic: true }));
  }

  // Exposed .git/.svn/.env - critical when present
  const exposed = r.gitfinder.filter((g) => g.exposed);
  push(docxHeading('Exposed .git/.svn/.env'));
  if (exposed.length) {
    push(docxTable(['File', 'Path'], exposed.map((g) => [cell(g.label, { color: DOCX_COLOR.critical, bold: true }), cell(g.path, { color: DOCX_COLOR.critical, bold: true })])));
  } else {
    push(docxText('Nothing exposed.', { color: DOCX_COLOR.good, italic: true }));
  }

  // Wayback archive
  push(docxHeading(`Wayback archive (${r.wayback.count} URLs)`));
  if (r.wayback.sample.length) {
    push(docxTable(['Archived URL'], r.wayback.sample.slice(0, 30).map((u) => [linkCell(u)]), collector));
  } else {
    push(docxText('None found.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Tech fingerprint
  push(docxHeading('Tech fingerprint'));
  const techRows: DocxCell[][] = [
    ...r.techHits.map((h) => [cell(h.name), cell(h.source)]),
    ...r.techGuesses.map((g) => [cell(g), cell('page markup')]),
  ];
  if (techRows.length) {
    push(docxTable(['Name', 'Source'], techRows));
  } else {
    push(docxText('Nothing detected.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Outdated JS libraries - critical when present (known CVEs)
  push(docxHeading('Outdated JS libraries'));
  if (r.retireFindings.length) {
    push(
      docxTable(
        ['Library', 'Version', 'CVEs'],
        r.retireFindings.map((f) => [
          cell(f.library, { color: DOCX_COLOR.critical, bold: true }),
          cell(f.version, { color: DOCX_COLOR.critical, bold: true }),
          cell(f.vulnerabilities.map((v) => v.cves.join(',')).join('; ') || 'known-vulnerable', { color: DOCX_COLOR.critical }),
        ]),
      ),
    );
  } else {
    push(docxText('None of the checked libraries matched known-vulnerable versions.', { color: DOCX_COLOR.good, italic: true }));
  }

  // Cloud storage references
  push(docxHeading('Cloud storage references'));
  if (r.buckets.length) {
    push(
      docxTable(
        ['Type', 'URL'],
        r.buckets.map((b) => [cell(b.type, { color: DOCX_COLOR.warn, bold: true }), linkCell(b.url, { color: DOCX_COLOR.warn })]),
        collector,
      ),
    );
  } else {
    push(docxText('None found on homepage.', { color: DOCX_COLOR.good, italic: true }));
  }

  // Links
  push(docxHeading(`Links (${r.links.internal.length} internal, ${r.links.external.length} external)`));
  push(
    docxText(
      'From the static homepage HTML only, not a live-rendered page - see LinkGrab on an open tab for the fuller, post-JS picture.',
      { color: DOCX_COLOR.neutral, italic: true },
    ),
  );
  if (r.links.internal.length) {
    push(docxHeading('Internal', 3));
    push(docxTable(['Tag', 'URL'], r.links.internal.slice(0, LIST_CAP).map((l) => [cell(l.tag), linkCell(l.url)]), collector));
  }
  if (r.links.external.length) {
    push(docxHeading('External', 3));
    push(docxTable(['Tag', 'URL'], r.links.external.slice(0, LIST_CAP).map((l) => [cell(l.tag), linkCell(l.url)]), collector));
  }

  // JavaScript files
  push(docxHeading(`JavaScript files (${r.jsFiles.length})`));
  if (r.jsFiles.length) {
    push(docxTable(['URL'], r.jsFiles.slice(0, LIST_CAP).map((u) => [linkCell(u)]), collector));
  } else {
    push(docxText('None found.', { color: DOCX_COLOR.neutral, italic: true }));
  }

  // Exposed keys/tokens - critical when present
  push(docxHeading(`Exposed keys/tokens, best-effort (${r.secrets.length})`));
  push(
    docxText('Pattern matching only - expect false positives (test fixtures, docs, minified noise). Verify every hit manually.', {
      color: DOCX_COLOR.neutral,
      italic: true,
    }),
  );
  if (r.secrets.length) {
    push(docxTable(['Type', 'Match'], r.secrets.map((s) => [cell(s.type, { color: DOCX_COLOR.critical, bold: true }), cell(s.match, { color: DOCX_COLOR.critical })])));
  } else {
    push(docxText('None found.', { color: DOCX_COLOR.good, italic: true }));
  }

  return parts.join('');
}

export function exportAutoFinderDocx(report: AutoFinderReport) {
  const collector = new DocxRelCollector();
  const blob = assembleDocxBlob(buildBody(report, collector), collector);
  downloadBlob(`${bugeyeReportFilename(report.domain)}.docx`, blob);
}
