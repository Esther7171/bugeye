export interface SitemapData {
  urls: string[];
  nestedSitemaps: string[];
}

export function parseSitemap(xml: string): SitemapData {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return { urls: [], nestedSitemaps: [] };

  const urls = Array.from(doc.querySelectorAll('urlset > url > loc'))
    .map((el) => el.textContent?.trim())
    .filter((v): v is string => !!v);

  const nestedSitemaps = Array.from(doc.querySelectorAll('sitemapindex > sitemap > loc'))
    .map((el) => el.textContent?.trim())
    .filter((v): v is string => !!v);

  return { urls, nestedSitemaps };
}
