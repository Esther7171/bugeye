export interface GitFinderCheckDef {
  id: string;
  label: string;
  path: string;
  validate: (text: string) => boolean;
  dumpCommand: (target: string) => string;
}

export const GITFINDER_CHECKS: GitFinderCheckDef[] = [
  {
    id: 'git-head',
    label: 'Exposed .git/HEAD',
    path: '/.git/HEAD',
    validate: (text) => /^ref:\s*refs\//.test(text.trim()),
    dumpCommand: (target) => `git-dumper https://${target}/.git/ ./${target}-git-dump`,
  },
  {
    id: 'git-config',
    label: 'Exposed .git/config',
    path: '/.git/config',
    validate: (text) => /\[core\]/.test(text),
    dumpCommand: (target) => `git-dumper https://${target}/.git/ ./${target}-git-dump`,
  },
  {
    id: 'svn-entries',
    label: 'Exposed .svn/entries',
    path: '/.svn/entries',
    validate: (text) => text.trim().length > 0 && /^\d/.test(text.trim()),
    dumpCommand: (target) => `svn checkout https://${target}/.svn/ ./${target}-svn-dump --force`,
  },
  {
    id: 'env',
    label: 'Exposed .env',
    path: '/.env',
    validate: (text) => /^[A-Z0-9_]+\s*=/m.test(text) && !/<html/i.test(text),
    dumpCommand: (target) => `curl -s https://${target}/.env`,
  },
];
