// 32-bit MurmurHash3 (seed 0), matching Python's mmh3.hash() default.
export function murmur3_32(key: string, seed = 0): number {
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let h1 = seed;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);
    i += 4;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;
  }

  let k1 = 0;
  if (remainder >= 3) k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
  if (remainder >= 2) k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
  if (remainder >= 1) {
    k1 ^= key.charCodeAt(i) & 0xff;
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

// Shodan hashes favicons as mmh3(base64.encodebytes(bytes)) with a signed int32 result.
// encodebytes wraps standard base64 to 76-char lines with a trailing newline, unlike
// plain base64 (btoa), so we have to re-wrap before hashing to match Shodan's values.
export function shodanFaviconHash(standardBase64: string): number {
  const lines: string[] = [];
  for (let i = 0; i < standardBase64.length; i += 76) {
    lines.push(standardBase64.slice(i, i + 76));
  }
  const wrapped = lines.join('\n') + '\n';
  return murmur3_32(wrapped) | 0;
}
