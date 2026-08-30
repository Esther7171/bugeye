import type { DorkQuery } from '@/lib/googledork';

export function buildGitHubDorks(company: string): DorkQuery[] {
  const c = company.trim();
  return [
    { id: 'gh-password', label: 'Hardcoded password', query: `${c} password` },
    { id: 'gh-apikey', label: 'API key', query: `${c} api_key OR apikey` },
    { id: 'gh-awssecret', label: 'AWS secret key', query: `${c} AWS_SECRET_ACCESS_KEY` },
    { id: 'gh-env', label: '.env file contents', query: `${c} filename:.env` },
    { id: 'gh-internal', label: 'Internal hostnames', query: `${c} "internal" hostname` },
    { id: 'gh-bearer', label: 'Bearer tokens', query: `${c} "Bearer " token` },
    { id: 'gh-privatekey', label: 'Private key blocks', query: `${c} "BEGIN RSA PRIVATE KEY" OR "BEGIN OPENSSH PRIVATE KEY"` },
    { id: 'gh-dbconn', label: 'Database connection strings', query: `${c} "mongodb://" OR "postgres://" OR "mysql://"` },
    { id: 'gh-slack', label: 'Slack webhook / token', query: `${c} hooks.slack.com` },
    { id: 'gh-config', label: 'Config files', query: `${c} filename:config OR filename:settings` },
  ];
}

export function githubSearchUrl(query: string): string {
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=code`;
}

export function gitlabSearchUrl(query: string): string {
  return `https://gitlab.com/search?search=${encodeURIComponent(query)}&scope=blobs`;
}
