import { parse } from 'exifr';

export interface ExifSummary {
  fileName: string;
  fileSize: number;
  make?: string;
  model?: string;
  software?: string;
  dateTimeOriginal?: string;
  orientation?: number;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
  raw: Record<string, unknown>;
}

export async function parseExif(file: File): Promise<ExifSummary> {
  const tags = (await parse(file, {
    gps: true,
    tiff: true,
    exif: true,
    translateValues: true,
  })) as Record<string, unknown> | undefined;

  const raw = tags ?? {};
  const dateVal = raw.DateTimeOriginal ?? raw.CreateDate ?? raw.ModifyDate;

  return {
    fileName: file.name,
    fileSize: file.size,
    make: typeof raw.Make === 'string' ? raw.Make : undefined,
    model: typeof raw.Model === 'string' ? raw.Model : undefined,
    software: typeof raw.Software === 'string' ? raw.Software : undefined,
    dateTimeOriginal: dateVal instanceof Date ? dateVal.toISOString() : typeof dateVal === 'string' ? dateVal : undefined,
    orientation: typeof raw.Orientation === 'number' ? raw.Orientation : undefined,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : undefined,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : undefined,
    width: typeof raw.ExifImageWidth === 'number' ? raw.ExifImageWidth : undefined,
    height: typeof raw.ExifImageHeight === 'number' ? raw.ExifImageHeight : undefined,
    raw,
  };
}

export function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v instanceof Uint8Array || v instanceof ArrayBuffer) return `<binary ${(v as ArrayLike<number>).length ?? 0} bytes>`;
      return v;
    },
    2,
  );
}

export function exifToMarkdown(s: ExifSummary): string {
  const lines = [
    `# ExifPeek report - ${s.fileName}`,
    '',
    `File size: ${(s.fileSize / 1024).toFixed(1)} KB`,
    s.width && s.height ? `Dimensions: ${s.width}x${s.height}` : '',
    s.make || s.model ? `Camera: ${[s.make, s.model].filter(Boolean).join(' ')}` : '',
    s.software ? `Software: ${s.software}` : '',
    s.dateTimeOriginal ? `Date taken: ${s.dateTimeOriginal}` : '',
    s.orientation ? `Orientation: ${s.orientation}` : '',
    s.latitude !== undefined && s.longitude !== undefined
      ? `GPS: ${s.latitude}, ${s.longitude} (https://maps.google.com/?q=${s.latitude},${s.longitude})`
      : 'GPS: not present',
    '',
    '## All tags',
    '```json',
    safeStringify(s.raw),
    '```',
  ].filter((l) => l !== '');
  return lines.join('\n');
}
