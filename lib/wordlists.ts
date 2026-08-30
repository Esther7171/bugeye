export interface WordlistDef {
  id: string;
  label: string;
  category: string;
  path: string;
}

const RAW_BASE = 'https://raw.githubusercontent.com/danielmiessler/SecLists/master';

export const SECLISTS_WORDLISTS: WordlistDef[] = [
  { id: 'raft-small-dir', label: 'raft-small-directories.txt', category: 'Directories', path: 'Discovery/Web-Content/raft-small-directories.txt' },
  { id: 'raft-medium-dir', label: 'raft-medium-directories.txt', category: 'Directories', path: 'Discovery/Web-Content/raft-medium-directories.txt' },
  { id: 'common-txt', label: 'common.txt', category: 'Directories', path: 'Discovery/Web-Content/common.txt' },
  { id: 'directory-list-2.3-medium', label: 'directory-list-2.3-medium.txt', category: 'Directories', path: 'Discovery/Web-Content/directory-list-2.3-medium.txt' },
  { id: 'raft-small-words', label: 'raft-small-words.txt', category: 'Parameters', path: 'Discovery/Web-Content/raft-small-words.txt' },
  { id: 'burp-parameter-names', label: 'burp-parameter-names.txt', category: 'Parameters', path: 'Discovery/Web-Content/burp-parameter-names.txt' },
  { id: 'subdomains-top1million-5000', label: 'subdomains-top1million-5000.txt', category: 'Subdomains', path: 'Discovery/DNS/subdomains-top1million-5000.txt' },
  { id: 'subdomains-top1million-110000', label: 'subdomains-top1million-110000.txt', category: 'Subdomains', path: 'Discovery/DNS/subdomains-top1million-110000.txt' },
  { id: 'vhost-common', label: 'common-vhosts.txt', category: 'Vhosts', path: 'Discovery/DNS/vhosts-list.txt' },
  { id: 'common-headers', label: 'common-headers.txt', category: 'Headers', path: 'Discovery/Web-Content/common-headers.txt' },
  { id: 'rockyou', label: 'rockyou.txt (passwords)', category: 'Passwords', path: 'Passwords/Leaked-Databases/rockyou.txt' },
  { id: 'common-passwords-top1000', label: '10k-most-common.txt', category: 'Passwords', path: 'Passwords/Common-Credentials/10k-most-common.txt' },
  { id: 'common-usernames', label: 'top-usernames-shortlist.txt', category: 'Usernames', path: 'Usernames/top-usernames-shortlist.txt' },
];

export function wordlistUrl(def: WordlistDef): string {
  return `${RAW_BASE}/${def.path}`;
}

export function wordlistLocalPath(def: WordlistDef): string {
  return `/usr/share/seclists/${def.path}`;
}
