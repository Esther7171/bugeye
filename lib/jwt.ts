export interface DecodedJwt {
  header: unknown;
  payload: unknown;
  signature: string;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('Not a valid JWT (expected header.payload.signature)');
  const header = JSON.parse(base64UrlDecode(parts[0]!));
  const payload = JSON.parse(base64UrlDecode(parts[1]!));
  return { header, payload, signature: parts[2] ?? '' };
}
