import { sendToBackground } from '@/lib/messaging';
import { mapLimit } from '@/lib/concurrency';

export interface ClusterEntry {
  ip: string;
  subdomains: string[];
}

export interface HostClusterOutlier {
  subdomain: string;
  ip: string;
}

export interface HostClusterResult {
  apexIp: string | null;
  clusters: ClusterEntry[];
  outliers: HostClusterOutlier[];
  unresolved: string[];
}

export async function clusterHosts(domain: string, subdomains: string[]): Promise<HostClusterResult> {
  const apexRes = await sendToBackground({ type: 'DOH_RESOLVE', hostname: domain });
  const apexIp = apexRes.ok ? (apexRes.addresses?.[0] ?? null) : null;

  const resolved = await mapLimit(subdomains, 8, async (sub) => {
    const r = await sendToBackground({ type: 'DOH_RESOLVE', hostname: sub });
    return { sub, ip: r.ok ? (r.addresses?.[0] ?? null) : null };
  });

  const byIp = new Map<string, string[]>();
  const unresolved: string[] = [];
  for (const { sub, ip } of resolved) {
    if (!ip) {
      unresolved.push(sub);
      continue;
    }
    if (!byIp.has(ip)) byIp.set(ip, []);
    byIp.get(ip)!.push(sub);
  }

  const clusters = Array.from(byIp.entries())
    .map(([ip, subs]) => ({ ip, subdomains: subs.sort() }))
    .sort((a, b) => b.subdomains.length - a.subdomains.length);

  // Naive same-/24 heuristic: subdomains resolving outside the apex's /24
  // are flagged as possibly third-party-hosted or shadow IT, not proven to be.
  const apexPrefix = apexIp ? apexIp.split('.').slice(0, 3).join('.') : null;
  const outliers = resolved
    .filter((r): r is { sub: string; ip: string } => !!r.ip && !!apexPrefix && !r.ip.startsWith(`${apexPrefix}.`))
    .map((r) => ({ subdomain: r.sub, ip: r.ip }));

  return { apexIp, clusters, outliers, unresolved };
}
