import sharp from 'sharp';

export async function convertToWebP(file: File): Promise<Buffer> {
  if (file.type === 'image/webp') {
    return Buffer.from(await file.arrayBuffer());
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const isGif = file.type === 'image/gif';
  return sharp(buffer, { animated: isGif }).webp({ quality: 85 }).toBuffer();
}

export function toWebPFilename(originalName: string): string {
  return originalName.replace(/\.[^.]+$/, '') + '.webp';
}
