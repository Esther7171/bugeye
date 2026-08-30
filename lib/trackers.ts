export interface TrackerSignature {
  id: string;
  name: string;
  category: string;
  hostPatterns: string[];
}

export const TRACKER_SIGNATURES: TrackerSignature[] = [
  { id: 'ga', name: 'Google Analytics', category: 'Analytics', hostPatterns: ['google-analytics.com', 'analytics.google.com'] },
  { id: 'gtm', name: 'Google Tag Manager', category: 'Tag Manager', hostPatterns: ['googletagmanager.com'] },
  { id: 'doubleclick', name: 'Google Ads / DoubleClick', category: 'Advertising', hostPatterns: ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com'] },
  { id: 'fbpixel', name: 'Facebook Pixel', category: 'Advertising', hostPatterns: ['connect.facebook.net'] },
  { id: 'hotjar', name: 'Hotjar', category: 'Session Replay', hostPatterns: ['hotjar.com'] },
  { id: 'segment', name: 'Segment', category: 'Analytics', hostPatterns: ['cdn.segment.com', 'api.segment.io'] },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics', hostPatterns: ['cdn.mxpnl.com', 'api.mixpanel.com'] },
  { id: 'amplitude', name: 'Amplitude', category: 'Analytics', hostPatterns: ['cdn.amplitude.com'] },
  { id: 'intercom', name: 'Intercom', category: 'Support / Chat', hostPatterns: ['widget.intercom.io', 'js.intercomcdn.com'] },
  { id: 'drift', name: 'Drift', category: 'Support / Chat', hostPatterns: ['js.driftt.com'] },
  { id: 'hubspot', name: 'HubSpot', category: 'Marketing', hostPatterns: ['js.hubspot.com', 'js.hs-scripts.com', 'js.hsforms.net'] },
  { id: 'crisp', name: 'Crisp', category: 'Support / Chat', hostPatterns: ['client.crisp.chat'] },
  { id: 'sentry', name: 'Sentry', category: 'Error tracking', hostPatterns: ['sentry-cdn.com', 'ingest.sentry.io'] },
  { id: 'cf-insights', name: 'Cloudflare Web Analytics', category: 'Analytics', hostPatterns: ['static.cloudflareinsights.com'] },
  { id: 'clarity', name: 'Microsoft Clarity', category: 'Session Replay', hostPatterns: ['clarity.ms'] },
  { id: 'tiktok', name: 'TikTok Pixel', category: 'Advertising', hostPatterns: ['analytics.tiktok.com'] },
  { id: 'linkedin', name: 'LinkedIn Insight Tag', category: 'Advertising', hostPatterns: ['snap.licdn.com', 'px.ads.linkedin.com'] },
  { id: 'twitter', name: 'X (Twitter) Ads', category: 'Advertising', hostPatterns: ['static.ads-twitter.com', 'analytics.twitter.com'] },
  { id: 'pinterest', name: 'Pinterest Tag', category: 'Advertising', hostPatterns: ['ct.pinterest.com'] },
  { id: 'snapchat', name: 'Snapchat Pixel', category: 'Advertising', hostPatterns: ['sc-static.net', 'tr.snapchat.com'] },
  { id: 'yandex', name: 'Yandex Metrica', category: 'Analytics', hostPatterns: ['mc.yandex.ru'] },
  { id: 'optimizely', name: 'Optimizely', category: 'A/B Testing', hostPatterns: ['cdn.optimizely.com'] },
  { id: 'fullstory', name: 'FullStory', category: 'Session Replay', hostPatterns: ['fullstory.com'] },
  { id: 'newrelic', name: 'New Relic', category: 'Performance monitoring', hostPatterns: ['js-agent.newrelic.com', 'nr-data.net'] },
  { id: 'matomo', name: 'Matomo / Piwik', category: 'Analytics', hostPatterns: ['matomo.cloud'] },
];

export interface TrackerHit {
  id: string;
  name: string;
  category: string;
  matchedHosts: string[];
}

export function matchTrackers(hostnames: string[]): TrackerHit[] {
  const hits = new Map<string, TrackerHit>();
  for (const host of hostnames) {
    for (const sig of TRACKER_SIGNATURES) {
      const matched = sig.hostPatterns.some((p) => host === p || host.endsWith(`.${p}`));
      if (!matched) continue;
      const existing = hits.get(sig.id);
      if (existing) {
        if (!existing.matchedHosts.includes(host)) existing.matchedHosts.push(host);
      } else {
        hits.set(sig.id, { id: sig.id, name: sig.name, category: sig.category, matchedHosts: [host] });
      }
    }
  }
  return Array.from(hits.values()).sort((a, b) => a.category.localeCompare(b.category));
}
