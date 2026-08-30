export interface TakeoverProvider {
  id: string;
  name: string;
  cnamePatterns: RegExp[];
  bodySignatures: string[];
}

// A curated subset of the well-known takeover-prone providers (the same
// class of fingerprints as EdOverflow's can-i-take-over-xyz project), not
// the full public list. CNAME match alone is a lead; a body signature match
// too is a strong signal the target is actually unclaimed.
export const TAKEOVER_PROVIDERS: TakeoverProvider[] = [
  {
    id: 'github',
    name: 'GitHub Pages',
    cnamePatterns: [/\.github\.io$/i],
    bodySignatures: ["There isn't a GitHub Pages site here", '404 There isn’t a GitHub Pages site here'],
  },
  {
    id: 'heroku',
    name: 'Heroku',
    cnamePatterns: [/herokuapp\.com$/i, /herokudns\.com$/i, /herokussl\.com$/i],
    bodySignatures: ['no such app', 'There is no app configured at that hostname'],
  },
  {
    id: 's3',
    name: 'AWS S3',
    cnamePatterns: [/\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$/i],
    bodySignatures: ['NoSuchBucket', 'The specified bucket does not exist'],
  },
  {
    id: 'azure',
    name: 'Azure',
    cnamePatterns: [/\.azurewebsites\.net$/i, /\.cloudapp\.azure\.com$/i, /\.blob\.core\.windows\.net$/i, /\.azureedge\.net$/i, /\.trafficmanager\.net$/i],
    bodySignatures: ['404 Web Site not found', 'Error 404 - Web app not found'],
  },
  {
    id: 'fastly',
    name: 'Fastly',
    cnamePatterns: [/\.fastly\.net$/i],
    bodySignatures: ['Fastly error: unknown domain'],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    cnamePatterns: [/\.myshopify\.com$/i],
    bodySignatures: ['Sorry, this shop is currently unavailable'],
  },
  {
    id: 'netlify',
    name: 'Netlify',
    cnamePatterns: [/\.netlify\.app$/i, /\.netlify\.com$/i],
    bodySignatures: ['Not Found - Request ID'],
  },
  {
    id: 'surge',
    name: 'Surge',
    cnamePatterns: [/\.surge\.sh$/i],
    bodySignatures: ['project not found'],
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    cnamePatterns: [/\.zendesk\.com$/i],
    bodySignatures: ['Help Center Closed'],
  },
  {
    id: 'tumblr',
    name: 'Tumblr',
    cnamePatterns: [/\.tumblr\.com$/i],
    bodySignatures: ["Whatever you were looking for doesn't currently exist"],
  },
  {
    id: 'wordpress',
    name: 'WordPress.com',
    cnamePatterns: [/\.wordpress\.com$/i],
    bodySignatures: ['Do you want to register'],
  },
  {
    id: 'unbounce',
    name: 'Unbounce',
    cnamePatterns: [/\.unbouncepages\.com$/i],
    bodySignatures: ['The requested URL was not found on this server'],
  },
  {
    id: 'helpscout',
    name: 'Help Scout',
    cnamePatterns: [/\.helpscoutdocs\.com$/i],
    bodySignatures: ['No settings were found for this company'],
  },
  {
    id: 'statuspage',
    name: 'Statuspage',
    cnamePatterns: [/\.statuspage\.io$/i],
    bodySignatures: ['You are being'],
  },
  {
    id: 'uservoice',
    name: 'UserVoice',
    cnamePatterns: [/\.uservoice\.com$/i],
    bodySignatures: ['This UserVoice subdomain is currently available'],
  },
  {
    id: 'webflow',
    name: 'Webflow',
    cnamePatterns: [/\.webflow\.io$/i],
    bodySignatures: ["The page you are looking for doesn't exist"],
  },
  {
    id: 'ghost',
    name: 'Ghost(Pro)',
    cnamePatterns: [/\.ghost\.io$/i],
    bodySignatures: ['The thing you were looking for is no longer here'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    cnamePatterns: [/\.bitbucket\.io$/i],
    bodySignatures: ['Repository not found'],
  },
  {
    id: 'pantheon',
    name: 'Pantheon',
    cnamePatterns: [/\.pantheonsite\.io$/i],
    bodySignatures: ['404 error unknown site'],
  },
  {
    id: 'flyio',
    name: 'Fly.io',
    cnamePatterns: [/\.fly\.dev$/i],
    bodySignatures: ['404 Not Found', 'app not found'],
  },
  {
    id: 'campaignmonitor',
    name: 'Campaign Monitor',
    cnamePatterns: [/\.createsend\.com$/i],
    bodySignatures: ['Trying to access your account?'],
  },
  {
    id: 'strikingly',
    name: 'Strikingly',
    cnamePatterns: [/\.strikinglydns\.com$/i, /\.s\.strikingly\.com$/i],
    bodySignatures: ['PAGE NOT FOUND'],
  },
  {
    id: 'intercom',
    name: 'Intercom',
    cnamePatterns: [/\.custom\.intercom\.help$/i],
    bodySignatures: ['This page is reserved for artistic dogs'],
  },
  {
    id: 'readme',
    name: 'ReadMe.io',
    cnamePatterns: [/\.readme\.io$/i],
    bodySignatures: ['Project doesnt exist... yet!'],
  },
];

export function matchProvider(cname: string): TakeoverProvider | null {
  const bare = cname.replace(/\.$/, '');
  for (const p of TAKEOVER_PROVIDERS) {
    if (p.cnamePatterns.some((re) => re.test(bare))) return p;
  }
  return null;
}

export type TakeoverVerdict = 'high' | 'medium' | 'none' | 'error';

export interface TakeoverResult {
  subdomain: string;
  cname: string | null;
  provider: string | null;
  verdict: TakeoverVerdict;
  detail: string;
}
