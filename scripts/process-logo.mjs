import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const artifactDir = 'C:\\Users\\furka\\.gemini\\antigravity-ide\\brain\\19720707-6be4-4610-ad6d-81c14ac9c72f';
const inputImage = path.join(artifactDir, 'vardiya_logo_raw_1789221173011.jpg');

async function processLogo() {
  console.log('Loading raw logo image:', inputImage);

  // 1. Load image and get raw RGBA buffer
  const { data, info } = await sharp(inputImage)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Image size: ${width}x${height}, channels: ${channels}`);

  // 2. Flood fill from borders to identify exterior black background
  // This ensures that dark colors INSIDE the logo are strictly preserved.
  const isBackground = new Uint8Array(width * height);
  const queue = [];

  function getPixelBrightness(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return Math.max(r, g, b);
  }

  // Threshold for outer black background
  const BLACK_THRESHOLD = 32;

  // Add all 4 borders to queue
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  while (queue.length > 0) {
    const y = queue.pop();
    const x = queue.pop();
    const idx = y * width + x;

    if (isBackground[idx] === 1) continue;

    const b = getPixelBrightness(x, y);
    if (b <= BLACK_THRESHOLD) {
      isBackground[idx] = 1; // Mark as outer background

      // Check neighbors
      if (x > 0 && isBackground[y * width + (x - 1)] === 0) queue.push(x - 1, y);
      if (x < width - 1 && isBackground[y * width + (x + 1)] === 0) queue.push(x + 1, y);
      if (y > 0 && isBackground[(y - 1) * width + x] === 0) queue.push(x, y - 1);
      if (y < height - 1 && isBackground[(y + 1) * width + x] === 0) queue.push(x, y + 1);
    }
  }

  // 3. Apply smooth edge feathering / anti-aliasing on outer boundary
  // For pixels marked as background, alpha = 0.
  // For border pixels with brightness between 20 and 55 connected to background, smooth alpha.
  const processedData = Buffer.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pIdx = y * width + x;
      const dataIdx = pIdx * channels;

      if (isBackground[pIdx] === 1) {
        // Transparent
        processedData[dataIdx + 3] = 0;
      } else {
        // Check if adjacent to background for soft anti-aliasing
        let hasBgNeighbor = false;
        if (x > 0 && isBackground[y * width + (x - 1)] === 1) hasBgNeighbor = true;
        else if (x < width - 1 && isBackground[y * width + (x + 1)] === 1) hasBgNeighbor = true;
        else if (y > 0 && isBackground[(y - 1) * width + x] === 1) hasBgNeighbor = true;
        else if (y < height - 1 && isBackground[(y + 1) * width + x] === 1) hasBgNeighbor = true;

        if (hasBgNeighbor) {
          const brightness = getPixelBrightness(x, y);
          if (brightness < 60) {
            // Soft blend out near-black edge
            const alpha = Math.max(0, Math.min(255, Math.round(((brightness - 25) / 35) * 255)));
            processedData[dataIdx + 3] = alpha;
          }
        }
      }
    }
  }

  // 4. Save transparent master logo
  const masterTransparentPath = path.join(artifactDir, 'vardiya_logo_transparent.png');
  await sharp(processedData, { raw: { width, height, channels } })
    .png()
    .toFile(masterTransparentPath);
  console.log('✓ Created transparent master logo:', masterTransparentPath);

  // 5. Create app icons for public/ directory
  // Transparent app logo for in-app headers
  const publicLogoPath = path.join(publicDir, 'logo.png');
  await sharp(masterTransparentPath)
    .resize(512, 512)
    .png()
    .toFile(publicLogoPath);
  console.log('✓ Generated public/logo.png');

  // PWA 512x512 icon (on dark rounded background or transparent standalone)
  // For PWA launchers and Apple icons, a subtle dark slate card background or clean transparent:
  // Apple HIG requires solid background for apple-touch-icon.
  // Helper to create icon with dark slate background for PWA / iOS launchers
  async function createLauncherIcon(targetSize, paddingFactor = 0.88, outputPath) {
    const iconSize = Math.round(targetSize * paddingFactor);
    const resizedLogo = await sharp(masterTransparentPath)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // sleek slate-900
      }
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png()
      .toFile(outputPath);
  }

  // 1. Apple Touch Icon (180x180)
  await createLauncherIcon(180, 0.85, path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png (180x180)');

  // 2. PWA 512x512
  await createLauncherIcon(512, 0.85, path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Generated public/pwa-512x512.png (512x512)');

  // 3. PWA 192x192
  await createLauncherIcon(192, 0.85, path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Generated public/pwa-192x192.png (192x192)');

  // 4. Favicon (48x48) & favicon.ico
  await sharp(masterTransparentPath)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'));
  fs.copyFileSync(path.join(publicDir, 'favicon-48x48.png'), path.join(publicDir, 'favicon.ico'));
  console.log('✓ Generated public/favicon.ico & favicon-48x48.png');

  // 5. Update favicon.svg with vector image container
  const logoB64 = fs.readFileSync(publicLogoPath).toString('base64');
  const svgFavicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${logoB64}" width="512" height="512" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon, 'utf8');
  console.log('✓ Generated public/favicon.svg');

  console.log('All icons successfully processed with transparent background!');
}

processLogo().catch((err) => {
  console.error('Error processing logo:', err);
  process.exit(1);
});
