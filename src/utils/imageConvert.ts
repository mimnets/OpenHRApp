
/**
 * Convert any image (data URL or Blob) to WebP format using Canvas API.
 * Falls back to the original if the browser doesn't support WebP canvas export.
 *
 * @param input - data URL string or Blob.
 * @param quality - WebP quality 0..1. Default 0.8 preserves existing behaviour
 *   for all current call sites (avatars, blog covers, logos, screenshots).
 * @param maxDimension - Optional. When provided AND the source's longest edge
 *   exceeds this value, the image is proportionally scaled down to fit. Used
 *   by the attendance selfie pipeline (720) to right-size face photos for
 *   the audit UI. Not applied by default — covers/logos keep their native
 *   resolution.
 */
export async function convertToWebP(
  input: string | Blob,
  quality = 0.8,
  maxDimension?: number
): Promise<Blob> {
  const blob = typeof input === 'string' ? await dataURLToBlob(input) : input;

  // Only convert image types
  if (!blob.type.startsWith('image/')) return blob;

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');

    // Optional proportional downscale. Only shrinks — never enlarges.
    let targetW = bitmap.width;
    let targetH = bitmap.height;
    if (maxDimension && maxDimension > 0) {
      const longest = Math.max(targetW, targetH);
      if (longest > maxDimension) {
        const scale = maxDimension / longest;
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );

    // If toBlob returned null or the browser fell back to PNG, return original
    if (!webpBlob || webpBlob.type !== 'image/webp') return blob;

    return webpBlob;
  } catch {
    // Canvas conversion failed — return original unchanged
    return blob;
  }
}

/**
 * Convert a File to WebP, preserving a .webp filename for FormData uploads.
 */
export async function convertFileToWebP(file: File, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const webpBlob = await convertToWebP(file, quality);

  // If conversion didn't produce webp, return original
  if (webpBlob.type !== 'image/webp') return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([webpBlob], `${baseName}.webp`, { type: 'image/webp' });
}

function dataURLToBlob(dataurl: string): Promise<Blob> {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return Promise.resolve(new Blob([u8arr], { type: mime }));
}
