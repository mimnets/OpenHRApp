import sharp from 'sharp';
import { stat } from 'fs/promises';
import { join } from 'path';

const IMG_DIR = 'public/img';
const ICONS = ['icon-192.png', 'icon-512.png'];

for (const file of ICONS) {
  const filePath = join(IMG_DIR, file);
  const before = (await stat(filePath)).size;

  await sharp(filePath)
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toFile(filePath + '.tmp');

  // Replace original with optimized version
  const { rename } = await import('fs/promises');
  await rename(filePath + '.tmp', filePath);

  const after = (await stat(filePath)).size;
  const saved = ((1 - after / before) * 100).toFixed(1);

  console.log(`${file}: ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB  (${saved}% smaller)`);
}

console.log('\nPWA icons optimized (kept as PNG for iOS compatibility).');
