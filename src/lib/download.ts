import { toPinCard, toSvg, type PinVariant } from '@/lib/color/export';
import type { Palette } from '@/lib/color/types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next frame so Safari has time to start the download.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export function downloadText(text: string, filename: string, type = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

export function downloadSvg(palette: Palette, filename: string) {
  downloadText(toSvg(palette), filename, 'image/svg+xml');
}

/** Rasterises an SVG card through a canvas — no external deps. */
async function rasteriseToBlob(svg: string, width: number, height: number, scale: number): Promise<Blob> {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not rasterise the palette card'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the PNG');
  return blob;
}

export async function downloadPng(palette: Palette, filename: string, scale = 2) {
  downloadBlob(await rasteriseToBlob(toSvg(palette, { width: 1200, height: 630 }), 1200, 630, scale), filename);
}

/** The 2:3 card, for palettes with no prebuilt image (generated or shared by URL). */
export async function downloadPinCard(palette: Palette, filename: string, variant: PinVariant = 'stripes') {
  downloadBlob(await rasteriseToBlob(toPinCard(palette, variant), 1000, 1500, 1), filename);
}

/**
 * A real PNG object URL for the pin card. An <img> pointed at an SVG data URI
 * looks identical but behaves badly: right-click "save image" gives you SVG,
 * and social scrapers skip it entirely.
 */
export async function pinCardObjectUrl(palette: Palette, variant: PinVariant = 'stripes'): Promise<string> {
  return URL.createObjectURL(await rasteriseToBlob(toPinCard(palette, variant), 1000, 1500, 1));
}
