import sharp from 'sharp';
import { createHash } from 'node:crypto';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_NOTE_IMAGE_BYTES = 12 * 1024 * 1024;
export class ImageError extends Error {}

// Decode actual pixels, reject animation and oversized dimensions, strip metadata.
// No file supplied by a client is written to a public directory or served verbatim.
export async function prepareImages(images = []) {
  let total = 0;
  const result = [];
  for (const image of images) {
    if (!image.data) { result.push(image); continue; }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length % 4) throw new ImageError('La imagen no contiene datos válidos.');
    const buffer = Buffer.from(image.data, 'base64');
    total += buffer.length;
    if (buffer.length > MAX_IMAGE_BYTES || total > MAX_NOTE_IMAGE_BYTES) throw new ImageError('Límite: 4 MB por imagen y 12 MB de imágenes por nota.');
    try {
      const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
      const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
      if (!png && !jpeg && !webp) throw new Error('signature');
      // APNG may be reported as a single-page PNG by some decoder builds.
      if (png) for (let offset = 8; offset + 12 <= buffer.length; offset += 12 + buffer.readUInt32BE(offset)) {
        if (buffer.toString('ascii', offset + 4, offset + 8) === 'acTL') throw new Error('animation');
      }
      const decoder = sharp(buffer, { limitInputPixels: 24000000, failOn: 'warning' });
      const meta = await decoder.metadata();
      if (!['png', 'jpeg', 'webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error('format');
      const { data, info } = await decoder.rotate().webp({ lossless: true, effort: 2 }).toBuffer({ resolveWithObject: true });
      if (data.length > MAX_IMAGE_BYTES) throw new ImageError('La imagen procesada supera 4 MB; reduce sus dimensiones.');
      result.push({ ...image, data: data.toString('base64'), mime: 'image/webp', width: info.width, height: info.height, size: data.length, hash: createHash('sha256').update(data).digest('hex') });
    } catch (e) { if (e instanceof ImageError) throw e; throw new ImageError('Imagen inválida: usa PNG, JPG o WebP sin animación, hasta 24 megapíxeles.'); }
  }
  return result;
}
