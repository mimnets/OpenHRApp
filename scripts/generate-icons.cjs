const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const LOGO = path.join(ROOT, 'public', 'img', 'logo.png');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Adaptive icon sizes (108dp base)
const ADAPTIVE_SIZES = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

// Legacy icon sizes (48dp base)
const LEGACY_SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

async function main() {
  // Step 1: Extract just the speech bubble icon from logo (top portion, no text)
  // Logo is 739x576. The icon occupies the top ~365px, "OpenHRApp" text is below.
  const cropped = await sharp(LOGO)
    .extract({ left: 80, top: 0, width: 580, height: 365 })
    .toBuffer();

  // Trim transparent edges in a second pass
  const iconRegion = await sharp(cropped).trim().toBuffer();

  const iconMeta = await sharp(iconRegion).metadata();
  console.log(`Extracted icon: ${iconMeta.width}x${iconMeta.height}`);

  // Make it square by padding the shorter dimension
  const maxDim = Math.max(iconMeta.width, iconMeta.height);
  const squareIcon = await sharp(iconRegion)
    .resize(maxDim, maxDim, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Step 2: Generate adaptive foreground PNGs (48% of canvas)
  for (const [density, size] of Object.entries(ADAPTIVE_SIZES)) {
    const iconSize = Math.round(size * 0.48);
    const resizedIcon = await sharp(squareIcon)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const offset = Math.round((size - iconSize) / 2);
    const output = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: resizedIcon, left: offset, top: offset }])
      .png()
      .toBuffer();

    const outPath = path.join(RES, `mipmap-${density}`, 'ic_launcher_foreground.png');
    fs.writeFileSync(outPath, output);
    console.log(`Written: ${outPath} (${size}x${size}, icon ${iconSize}px)`);
  }

  // Step 3: Generate legacy launcher PNGs (65% of canvas, white bg)
  for (const [density, size] of Object.entries(LEGACY_SIZES)) {
    const iconSize = Math.round(size * 0.65);
    const resizedIcon = await sharp(squareIcon)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const offset = Math.round((size - iconSize) / 2);

    // Regular launcher icon (white bg, slight rounding)
    const regularOutput = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
    })
      .composite([{ input: resizedIcon, left: offset, top: offset }])
      .png()
      .toBuffer();

    const regularPath = path.join(RES, `mipmap-${density}`, 'ic_launcher.png');
    fs.writeFileSync(regularPath, regularOutput);
    console.log(`Written: ${regularPath} (${size}x${size})`);

    // Round launcher icon (circle mask)
    const radius = Math.floor(size / 2);
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
      </svg>`
    );

    const roundOutput = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
    })
      .composite([{ input: resizedIcon, left: offset, top: offset }])
      .png()
      .toBuffer();

    // Apply circle mask
    const maskedRound = await sharp(roundOutput)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    const roundPath = path.join(RES, `mipmap-${density}`, 'ic_launcher_round.png');
    fs.writeFileSync(roundPath, maskedRound);
    console.log(`Written: ${roundPath} (${size}x${size}, round)`);
  }

  console.log('\nDone! All 15 icon PNGs regenerated.');
}

main().catch(err => { console.error(err); process.exit(1); });
