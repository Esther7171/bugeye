export interface SizeTier {
  id: string;
  label: string;
  side: number; // canvas side length in px, ~4 bytes/px before compression
}

// Filled with random noise (near-incompressible), so PNG output size tracks
// pixel count closely regardless of PNG's deflate compression.
export const SIZE_TIERS: SizeTier[] = [
  { id: 'sm', label: '~2 MB', side: 725 },
  { id: 'md', label: '~5 MB', side: 1146 },
  { id: 'lg', label: '~15 MB', side: 1985 },
];

export async function generateOversizedImage(side: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const imageData = ctx.createImageData(side, side);
  crypto.getRandomValues(imageData.data);
  // Force full alpha so the PNG can't cheaply flatten transparent regions.
  for (let i = 3; i < imageData.data.length; i += 4) imageData.data[i] = 255;
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function generateSmallPng(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.fillText('test', 12, 34);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export const SVG_XSS_SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60">
  <script>alert('SVG-XSS-test: ' + document.domain)</script>
  <text x="10" y="30" font-size="14">SVG upload test</text>
</svg>
`;

export function svgXssBlob(): Blob {
  return new Blob([SVG_XSS_SAMPLE], { type: 'image/svg+xml' });
}
