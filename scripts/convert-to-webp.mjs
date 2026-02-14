import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const IMG_DIR = 'public/img';
// PWA icons must stay PNG (apple-touch-icon, manifest)
const SKIP = ['icon-192.png', 'icon-512.png'];

const files = await readdir(IMG_DIR);
const pngs = files.filter(f => f.endsWith('.png') && !SKIP.includes(f));

for (const file of pngs) {
  const input = join(IMG_DIR, file);
  const output = join(IMG_DIR, file.replace('.png', '.webp'));

  const before = (await stat(input)).size;

  await sharp(input)
    .webp({ quality: 85 })
    .toFile(output);

  const after = (await stat(output)).size;
  const saved = ((1 - after / before) * 100).toFixed(1);

  console.log(`${file} → ${file.replace('.png', '.webp')}  |  ${(before/1024).toFixed(1)} KB → ${(after/1024).toFixed(1)} KB  (${saved}% smaller)`);
}

console.log('\nDone! PWA icons (icon-192.png, icon-512.png) kept as PNG.');
