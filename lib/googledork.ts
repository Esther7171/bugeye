export interface DorkQuery {
  id: string;
  label: string;
  query: string;
}

export function buildGoogleDorks(domain: string): DorkQuery[] {
  const d = domain.trim();
  return [
    { id: 'files', label: 'Exposed documents', query: `site:${d} filetype:pdf OR filetype:doc OR filetype:docx OR filetype:xls OR filetype:xlsx` },
    { id: 'login', label: 'Login pages', query: `site:${d} inurl:login OR inurl:signin OR inurl:admin` },
    { id: 'indexof', label: 'Directory listings', query: `site:${d} intitle:"index of /"` },
    { id: 'configbackup', label: 'Config / backup files', query: `site:${d} ext:env OR ext:bak OR ext:old OR ext:sql OR ext:config OR ext:ini` },
    { id: 'errors', label: 'Error message leaks', query: `site:${d} "sql syntax near" OR "warning: mysql" OR "unhandled exception" OR "stack trace"` },
    { id: 'subdomains', label: 'Indexed subdomains', query: `site:*.${d} -site:www.${d}` },
    { id: 'buckets', label: 'Cloud storage buckets', query: `site:s3.amazonaws.com OR site:blob.core.windows.net OR site:storage.googleapis.com "${d}"` },
    { id: 'apidocs', label: 'API docs / Swagger', query: `site:${d} inurl:swagger OR inurl:api-docs OR inurl:graphql` },
    { id: 'loginforms', label: 'Login forms with password field', query: `site:${d} intext:"password" inurl:login` },
    { id: 'confidential', label: 'Confidential / internal markers', query: `site:${d} "confidential" OR "internal use only" OR "do not distribute"` },
  ];
}
