
/**
 * Convert any image (data URL or Blob) to WebP format using Canvas API.
 * Falls back to the original if the browser doesn't support WebP canvas export.
 */
export async function convertToWebP(input: string | Blob, quality = 0.8): Promise<Blob> {
  const blob = typeof input === 'string' ? await dataURLToBlob(input) : input;

  // Only convert image types
  if (!blob.type.startsWith('image/')) return blob;

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
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
