export interface CveLink {
  id: string;
  label: string;
  url: string;
}

export function buildCveLinks(query: string): CveLink[] {
  const q = encodeURIComponent(query.trim());
  return [
    { id: 'nvd', label: 'NVD search', url: `https://nvd.nist.gov/vuln/search/results?query=${q}` },
    { id: 'mitre', label: 'MITRE CVE search', url: `https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${q}` },
    { id: 'cvedetails', label: 'CVE Details', url: `https://www.cvedetails.com/google-search-results.php?q=${q}` },
    { id: 'osv', label: 'OSV.dev', url: `https://osv.dev/list?q=${q}` },
    { id: 'snyk', label: 'Snyk vulnerability DB', url: `https://security.snyk.io/vuln?search=${q}` },
    { id: 'ghsa', label: 'GitHub Advisory Database', url: `https://github.com/advisories?query=${q}` },
  ];
}
