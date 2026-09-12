import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// --- Helper: Create PNG file from RGBA pixel buffer ---
function createPngBuffer(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression method 0
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace 0
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image scanlines: filter byte 0 + RGBA pixels
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[dstOffset++] = 0; // Filter 0 (None)
    rgbaBuffer.copy(rawScanlines, dstOffset, srcOffset, srcOffset + width * 4);
    srcOffset += width * 4;
    dstOffset += width * 4;
  }

  // Deflate IDAT
  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// --- Render brand icon to RGBA buffer ---
function renderAppIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);

  // Corner radius (maskable has 0 radius or full bleed, regular has smooth rounded corners)
  const cornerRadius = isMaskable ? 0 : Math.round(size * 0.22);
  const center = size / 2;

  // Colors
  // Modern Royal Blue to Indigo Gradient
  const colorTop = [37, 99, 235]; // #2563eb
  const colorBottom = [79, 70, 229]; // #4f46e5

  for (let y = 0; y < size; y++) {
    const t = y / size;
    const bgR = Math.round(colorTop[0] + (colorBottom[0] - colorTop[0]) * t);
    const bgG = Math.round(colorTop[1] + (colorBottom[1] - colorTop[1]) * t);
    const bgB = Math.round(colorTop[2] + (colorBottom[2] - colorTop[2]) * t);

    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle distance
      let inside = true;
      if (cornerRadius > 0) {
        const dx = Math.max(0, Math.abs(x - center) - (center - cornerRadius));
        const dy = Math.max(0, Math.abs(y - center) - (center - cornerRadius));
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerRadius) {
          inside = false;
        }
      }

      if (!inside) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Inside icon background
      buf[idx] = bgR;
      buf[idx + 1] = bgG;
      buf[idx + 2] = bgB;
      buf[idx + 3] = 255;
    }
  }

  // Draw Calendar & Clock Shift Shape inside safe area (center 60% of size)
  const calLeft = Math.round(size * 0.24);
  const calRight = Math.round(size * 0.76);
  const calTop = Math.round(size * 0.25);
  const calBottom = Math.round(size * 0.77);
  const calRadius = Math.round(size * 0.08);
  const headerBottom = Math.round(size * 0.38);

  // Draw calendar body (white card)
  for (let y = calTop; y <= calBottom; y++) {
    for (let x = calLeft; x <= calRight; x++) {
      const dx = Math.max(0, Math.abs(x - (calLeft + calRight) / 2) - ((calRight - calLeft) / 2 - calRadius));
      const dy = Math.max(0, Math.abs(y - (calTop + calBottom) / 2) - ((calBottom - calTop) / 2 - calRadius));
      if (Math.sqrt(dx * dx + dy * dy) <= calRadius) {
        const idx = (y * size + x) * 4;
        if (y <= headerBottom) {
          // Calendar top header: subtle coral/cyan or bright accent (#f43f5e)
          buf[idx] = 244;
          buf[idx + 1] = 63;
          buf[idx + 2] = 94;
          buf[idx + 3] = 255;
        } else {
          // Calendar sheet: crisp white (#ffffff)
          buf[idx] = 255;
          buf[idx + 1] = 255;
          buf[idx + 2] = 255;
          buf[idx + 3] = 255;
        }
      }
    }
  }

  // Draw two top binder pins / rings
  const pinRadius = Math.max(2, Math.round(size * 0.025));
  const pin1X = Math.round(calLeft + (calRight - calLeft) * 0.28);
  const pin2X = Math.round(calLeft + (calRight - calLeft) * 0.72);
  const pinY = calTop;

  for (let py = pinY - pinRadius * 2; py <= pinY + pinRadius; py++) {
    for (let px = pin1X - pinRadius; px <= pin1X + pinRadius; px++) {
      if (Math.hypot(px - pin1X, py - (pinY - pinRadius / 2)) <= pinRadius) {
        const idx = (py * size + px) * 4;
        buf[idx] = 255;
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = 255;
      }
    }
    for (let px = pin2X - pinRadius; px <= pin2X + pinRadius; px++) {
      if (Math.hypot(px - pin2X, py - (pinY - pinRadius / 2)) <= pinRadius) {
        const idx = (py * size + px) * 4;
        buf[idx] = 255;
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = 255;
      }
    }
  }

  // Draw 2x2 calendar grid dots / shift markers on the white sheet
  const dotRadius = Math.max(2, Math.round(size * 0.038));
  const row1Y = Math.round(headerBottom + (calBottom - headerBottom) * 0.35);
  const row2Y = Math.round(headerBottom + (calBottom - headerBottom) * 0.72);
  const col1X = Math.round(calLeft + (calRight - calLeft) * 0.32);
  const col2X = Math.round(calLeft + (calRight - calLeft) * 0.68);

  const dots = [
    { x: col1X, y: row1Y, r: 16, g: 185, b: 129 }, // Emerald shift (#10b981)
    { x: col2X, y: row1Y, r: 59, g: 130, b: 246 }, // Blue shift (#3b82f6)
    { x: col1X, y: row2Y, r: 245, g: 158, b: 11 }, // Amber shift (#f59e0b)
    { x: col2X, y: row2Y, r: 168, g: 85, b: 247 }, // Purple shift (#a855f7)
  ];

  for (const dot of dots) {
    for (let dy = dot.y - dotRadius; dy <= dot.y + dotRadius; dy++) {
      for (let dx = dot.x - dotRadius; dx <= dot.x + dotRadius; dx++) {
        if (Math.hypot(dx - dot.x, dy - dot.y) <= dotRadius) {
          const idx = (dy * size + dx) * 4;
          buf[idx] = dot.r;
          buf[idx + 1] = dot.g;
          buf[idx + 2] = dot.b;
          buf[idx + 3] = 255;
        }
      }
    }
  }

  return buf;
}

// Write SVG files (Vector quality)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- App Icon Background -->
  <rect width="512" height="512" rx="115" fill="url(#bgGradient)"/>
  
  <!-- Calendar Base -->
  <g filter="url(#shadow)">
    <!-- Calendar Body -->
    <rect x="110" y="120" width="292" height="292" rx="42" fill="#ffffff"/>
    <!-- Calendar Top Bar -->
    <path d="M 110 162 C 110 138.8 128.8 120 152 120 L 360 120 C 383.2 120 402 138.8 402 162 L 402 195 L 110 195 Z" fill="#f43f5e"/>
  </g>

  <!-- Binder Rings -->
  <rect x="180" y="98" width="22" height="46" rx="11" fill="#ffffff"/>
  <rect x="310" y="98" width="22" height="46" rx="11" fill="#ffffff"/>

  <!-- Shift Dots Matrix -->
  <!-- Top Left: Work Shift (Emerald) -->
  <circle cx="195" cy="265" r="22" fill="#10b981"/>
  <!-- Top Right: Day Shift (Blue) -->
  <circle cx="317" cy="265" r="22" fill="#3b82f6"/>
  <!-- Bottom Left: Leave (Amber) -->
  <circle cx="195" cy="345" r="22" fill="#f59e0b"/>
  <!-- Bottom Right: Night Shift (Purple) -->
  <circle cx="317" cy="345" r="22" fill="#a855f7"/>
</svg>`;

const maskIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect x="110" y="120" width="292" height="292" rx="42" fill="#000000"/>
  <rect x="180" y="98" width="22" height="46" rx="11" fill="#000000"/>
  <rect x="310" y="98" width="22" height="46" rx="11" fill="#000000"/>
</svg>`;

console.log('Generating App Icons for Apple & Android PWA...');

// 1. Write SVGs
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'mask-icon.svg'), maskIconSvg, 'utf8');

// 2. Generate PNGs
const sizes = [
  { name: 'apple-touch-icon.png', size: 180, isMaskable: false },
  { name: 'pwa-192x192.png', size: 192, isMaskable: false },
  { name: 'pwa-512x512.png', size: 512, isMaskable: false },
  { name: 'favicon-48x48.png', size: 48, isMaskable: false },
];

for (const item of sizes) {
  const rgba = renderAppIcon(item.size, item.isMaskable);
  const png = createPngBuffer(item.size, item.size, rgba);
  fs.writeFileSync(path.join(publicDir, item.name), png);
  console.log(`✓ Generated ${item.name} (${item.size}x${item.size})`);
}

// 3. Simple favicon.ico (can be a copy of 48x48 PNG or written)
// Modern browsers accept PNGs directly in ICO or favicon-48x48.png
fs.copyFileSync(path.join(publicDir, 'favicon-48x48.png'), path.join(publicDir, 'favicon.ico'));
console.log('✓ Generated favicon.ico');

console.log('All icons generated successfully in public/');
