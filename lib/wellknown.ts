export interface WellKnownDef {
  path: string;
  label: string;
}

export const WELL_KNOWN_PATHS: WellKnownDef[] = [
  { path: '/.well-known/security.txt', label: 'Security contact policy' },
  { path: '/.well-known/change-password', label: 'Change-password redirect' },
  { path: '/.well-known/openid-configuration', label: 'OpenID Connect discovery' },
  { path: '/.well-known/assetlinks.json', label: 'Android app links' },
  { path: '/.well-known/apple-app-site-association', label: 'iOS universal links' },
  { path: '/.well-known/mta-sts.txt', label: 'Mail Transfer Agent Strict Transport Security' },
  { path: '/.well-known/dnt-policy.txt', label: 'Do Not Track policy' },
  { path: '/.well-known/oauth-authorization-server', label: 'OAuth 2.0 authorization server metadata' },
];
