export interface MinedParams {
  totalUrls: number;
  paramNames: string[];
  urlsWithParams: string[];
  // One representative URL per unique path+parameter-set, with every value
  // replaced by FUZZ - ready to paste into a fuzzer or FuzzBuild.
  fuzzTemplates: string[];
}

// Pulls query-string parameters out of a list of (historical) URLs. Parameter
// names are the real prize: they're the untested input surface a target has
// exposed over time, most of which is no longer linked from the live site.
export function mineParams(urls: string[]): MinedParams {
  const names = new Set<string>();
  const withParams = new Set<string>();
  const templates = new Set<string>();

  for (const raw of urls) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    const keys: string[] = [];
    parsed.searchParams.forEach((_value, key) => {
      names.add(key);
      keys.push(key);
    });
    if (keys.length === 0) continue;

    withParams.add(raw);

    const template = new URL(parsed.origin + parsed.pathname);
    for (const key of keys) template.searchParams.set(key, 'FUZZ');
    templates.add(template.toString());
  }

  return {
    totalUrls: urls.length,
    paramNames: Array.from(names).sort(),
    urlsWithParams: Array.from(withParams).sort(),
    fuzzTemplates: Array.from(templates).sort(),
  };
}
