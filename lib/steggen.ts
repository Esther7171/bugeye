export interface StegCommand {
  id: string;
  tool: string;
  purpose: string;
  build: (fileName: string, extra: { password: string; outFile: string }) => string;
}

export const STEG_COMMANDS: StegCommand[] = [
  {
    id: 'steghide-embed',
    tool: 'steghide',
    purpose: 'Embed a file inside a JPEG/BMP/WAV/AU carrier',
    build: (f, e) => `steghide embed -cf '${f}' -ef secret.txt${e.password ? ` -p '${e.password}'` : ''}`,
  },
  {
    id: 'steghide-extract',
    tool: 'steghide',
    purpose: 'Extract a hidden payload',
    build: (f, e) => `steghide extract -sf '${f}'${e.password ? ` -p '${e.password}'` : ''}`,
  },
  {
    id: 'steghide-info',
    tool: 'steghide',
    purpose: 'Show embedded-data info without extracting',
    build: (f) => `steghide info '${f}'`,
  },
  {
    id: 'zsteg',
    tool: 'zsteg',
    purpose: 'Detect LSB steganography in PNG/BMP',
    build: (f) => `zsteg -a '${f}'`,
  },
  {
    id: 'zsteg-extract',
    tool: 'zsteg',
    purpose: 'Extract a specific payload once zsteg -a finds one',
    build: (f, e) => `zsteg -E '${e.outFile || 'b1,rgb,lsb,xy'}' '${f}' > extracted.bin`,
  },
  {
    id: 'exiftool-all',
    tool: 'exiftool',
    purpose: 'Dump all metadata (may hide comments/GPS/notes)',
    build: (f) => `exiftool '${f}'`,
  },
  {
    id: 'exiftool-strip',
    tool: 'exiftool',
    purpose: 'Strip all metadata to a new file',
    build: (f, e) => `exiftool -all= '${f}' -o '${e.outFile || 'cleaned_' + f}'`,
  },
  {
    id: 'binwalk-scan',
    tool: 'binwalk',
    purpose: 'Scan for embedded files/signatures',
    build: (f) => `binwalk '${f}'`,
  },
  {
    id: 'binwalk-extract',
    tool: 'binwalk',
    purpose: 'Extract any embedded files found',
    build: (f) => `binwalk -e '${f}'`,
  },
  {
    id: 'strings',
    tool: 'strings',
    purpose: 'Pull printable strings (quick manual triage)',
    build: (f) => `strings -n 8 '${f}' | less`,
  },
];
