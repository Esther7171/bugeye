import { sendToBackground } from '@/lib/messaging';

export interface SourceMapFinding {
  scriptUrl: string;
  mapUrl: string | null;
  // 'declared' = a //# sourceMappingURL comment pointed at it;
  // 'guessed'  = no comment, but <script>.js.map was reachable anyway;
  // 'none'     = no map found by either route.
  origin: 'declared' | 'guessed' | 'none';
  accessible: boolean;
  httpStatus: number | null;
  sourceCount?: number;
  sources?: string[];
  error?: string;
}

// The last sourceMappingURL comment in a file wins (bundlers append it at the
// very end). Matches both //# and the older //@ form.
function extractDeclaredMapUrl(jsText: string, jsUrl: string): string | null {
  const re = /\/\/[#@]\s*sourceMappingURL=(\S+)/g;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = re.exec(jsText)) !== null) last = match[1] ?? null;
  if (!last) return null;
  if (last.startsWith('data:')) return last;
  try {
    return new URL(last, jsUrl).href;
  } catch {
    return null;
  }
}

interface MapProbe {
  accessible: boolean;
  httpStatus: number | null;
  sources?: string[];
}

function parseSources(json: string): string[] | null {
  try {
    const parsed = JSON.parse(json) as { sources?: unknown };
    if (Array.isArray(parsed.sources)) {
      return parsed.sources.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // not a valid source map
  }
  return null;
}

async function probeMap(mapUrl: string): Promise<MapProbe> {
  // Inline data: URI map - no network fetch needed, decode in place.
  if (mapUrl.startsWith('data:')) {
    try {
      const comma = mapUrl.indexOf(',');
      const meta = mapUrl.slice(5, comma);
      const payload = mapUrl.slice(comma + 1);
      const json = meta.includes('base64') ? atob(payload) : decodeURIComponent(payload);
      const sources = parseSources(json);
      return sources ? { accessible: true, httpStatus: null, sources } : { accessible: false, httpStatus: null };
    } catch {
      return { accessible: false, httpStatus: null };
    }
  }

  const res = await sendToBackground({ type: 'FETCH_TEXT', url: mapUrl });
  if (!res.ok || typeof res.data !== 'string') {
    return { accessible: false, httpStatus: res.status ?? null };
  }
  const sources = parseSources(res.data);
  return sources ? { accessible: true, httpStatus: res.status ?? 200, sources } : { accessible: false, httpStatus: res.status ?? null };
}

// probeGuessed=false skips the extra <file>.js.map request for scripts that
// carry no sourceMappingURL comment, roughly halving requests on script-heavy
// pages at the cost of missing maps that are deployed but not declared.
export async function analyzeScriptForSourceMap(scriptUrl: string, probeGuessed = true): Promise<SourceMapFinding> {
  const jsRes = await sendToBackground({ type: 'FETCH_TEXT', url: scriptUrl });
  if (!jsRes.ok || typeof jsRes.data !== 'string') {
    return {
      scriptUrl,
      mapUrl: null,
      origin: 'none',
      accessible: false,
      httpStatus: jsRes.status ?? null,
      error: jsRes.error ?? 'Could not fetch script',
    };
  }

  const declared = extractDeclaredMapUrl(jsRes.data, scriptUrl);
  if (declared) {
    const probe = await probeMap(declared);
    if (probe.accessible) {
      return {
        scriptUrl,
        mapUrl: declared,
        origin: 'declared',
        accessible: true,
        httpStatus: probe.httpStatus,
        sourceCount: probe.sources?.length,
        sources: probe.sources,
      };
    }
  }

  // No declared map (or it was declared but unreachable): try the conventional
  // <file>.js.map path, which is often left deployed even when the comment is
  // stripped from the bundle.
  const guess = `${scriptUrl.split('#')[0]!.split('?')[0]}.map`;
  if (probeGuessed && guess !== declared) {
    const probe = await probeMap(guess);
    if (probe.accessible) {
      return {
        scriptUrl,
        mapUrl: guess,
        origin: 'guessed',
        accessible: true,
        httpStatus: probe.httpStatus,
        sourceCount: probe.sources?.length,
        sources: probe.sources,
      };
    }
  }

  return {
    scriptUrl,
    mapUrl: declared,
    origin: 'none',
    accessible: false,
    httpStatus: null,
  };
}

export function sourceMapReportToMarkdown(pageUrl: string, findings: SourceMapFinding[]): string {
  const exposed = findings.filter((f) => f.accessible);
  const lines = [
    `# SourceMapFind report - ${pageUrl}`,
    '',
    `Scripts scanned: ${findings.length}`,
    `Accessible source maps: ${exposed.length}`,
    '',
  ];
  for (const f of exposed) {
    lines.push(`## ${f.scriptUrl}`);
    lines.push(`- Map: ${f.mapUrl} (${f.origin})`);
    lines.push(`- Original sources: ${f.sourceCount ?? 0}`);
    if (f.sources && f.sources.length > 0) {
      lines.push('', '```');
      for (const s of f.sources) lines.push(s);
      lines.push('```');
    }
    lines.push('');
  }
  return lines.join('\n');
}
