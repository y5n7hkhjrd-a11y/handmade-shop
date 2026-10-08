/**
 * Generates PWA icons from apps/web/public/logo.svg in pure Node.js (zero external dependencies).
 * Extracts the brand mark from logo.svg, composites it with proper scaling and safe-zone padding,
 * and encodes crisp RGBA PNGs.
 *
 * Outputs (into apps/web/public/):
 *   icon-192.png           192x192  (rounded squircle / transparent margin, for manifest "any")
 *   icon-512.png           512x512  (rounded squircle / transparent margin, for manifest "any")
 *   icon-maskable-512.png  512x512  (full-bleed safe-zone for Android adaptive icon)
 *   apple-touch-icon.png   180x180  (full-bleed square for iOS home screen)
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */

import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SVG_PATH = join(PUBLIC_DIR, 'logo.svg');

/* ─── PNG Helpers ─── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePngRgba(width, height, getPixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelFn(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterPng(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let srcPos = 0;

  for (let y = 0; y < height; y++) {
    const filterType = raw[srcPos++];
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const xVal = raw[srcPos++];
      const a = x >= bpp ? out[rowStart + x - bpp] : 0;
      const b = y > 0 ? out[prevRowStart + x] : 0;
      const c = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;

      let val = 0;
      switch (filterType) {
        case 0:
          val = xVal;
          break;
        case 1:
          val = (xVal + a) & 0xff;
          break;
        case 2:
          val = (xVal + b) & 0xff;
          break;
        case 3:
          val = (xVal + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          val = (xVal + paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          throw new Error('Unknown PNG filter type: ' + filterType);
      }
      out[rowStart + x] = val;
    }
  }
  return out;
}

function decodePngBuffer(buf) {
  let pos = 8;
  const chunks = [];
  let width = 0, height = 0, colorType = 0;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    }
  }

  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 6 ? 4 : 1;
  const pixels = unfilterPng(raw, width, height, bpp);
  return { width, height, pixels, bpp };
}

/* ─── Extract and Composite Logo from logo.svg ─── */
function loadLogoRgba() {
  const svgText = readFileSync(SVG_PATH, 'utf8');
  const base64Matches = [...svgText.matchAll(/xlink:href="data:image\/[^;]+;base64,([^"]+)"/g)];

  if (base64Matches.length < 2) {
    throw new Error('Could not find base64 images inside logo.svg');
  }

  const maskBuf = Buffer.from(base64Matches[0][1], 'base64');
  const rgbBuf = Buffer.from(base64Matches[1][1], 'base64');

  const maskDecoded = decodePngBuffer(maskBuf);
  const rgbDecoded = decodePngBuffer(rgbBuf);

  const w = rgbDecoded.width;
  const h = rgbDecoded.height;
  const rgba = Buffer.alloc(w * h * 4);

  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rgbIdx = (y * w + x) * 3;
      const maskIdx = y * w + x;
      const rgbaIdx = (y * w + x) * 4;

      const r = rgbDecoded.pixels[rgbIdx];
      const g = rgbDecoded.pixels[rgbIdx + 1];
      const b = rgbDecoded.pixels[rgbIdx + 2];
      const a = maskDecoded.pixels[maskIdx];

      rgba[rgbaIdx] = r;
      rgba[rgbaIdx + 1] = g;
      rgba[rgbaIdx + 2] = b;
      rgba[rgbaIdx + 3] = a;

      if (a > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    fullRgba: rgba,
    fullWidth: w,
    fullHeight: h,
    bbox: { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

/* ─── Distance to rounded rectangle (for anti-aliased squircle) ─── */
const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, Math.round(v)));

function roundedRectDist(px, py, x0, y0, x1, y1, r) {
  const cx = clamp(px, x0 + r, x1 - r);
  const cy = clamp(py, y0 + r, y1 - r);
  const dx = px - cx;
  const dy = py - cy;
  return Math.hypot(dx, dy) - r;
}

/* ─── High-quality Icon Renderer based on logo.svg ─── */
function createIconRenderer(logoData, targetSize, { fullBleed = false, safePaddingRatio = 0.20 } = {}) {
  const { fullRgba, fullWidth, bbox } = logoData;

  // Background color palette: Clean modern luxury white/ivory (#FFFFFF with subtle border)
  const bgR = 255;
  const bgG = 255;
  const bgB = 255;

  // Corner radius for non-fullBleed icons
  const cornerRadius = targetSize * 0.22;

  // Compute scale and centering for the logo
  // The usable logo area inside the icon
  const usableSize = targetSize * (1 - safePaddingRatio * 2);
  const scale = Math.min(usableSize / bbox.width, usableSize / bbox.height);

  const drawW = bbox.width * scale;
  const drawH = bbox.height * scale;
  const offsetX = (targetSize - drawW) / 2;
  const offsetY = (targetSize - drawH) / 2;

  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    // Check background bounds (full-bleed or rounded squircle)
    let bgAlpha = 255;
    if (!fullBleed) {
      const d = roundedRectDist(px, py, 0, 0, targetSize, targetSize, cornerRadius);
      if (d > 1.5) {
        return [0, 0, 0, 0]; // Transparent outside squircle
      } else if (d > -1.5) {
        // Anti-aliased smooth edge
        const t = (d + 1.5) / 3;
        bgAlpha = clamp((1 - t) * 255);
      }
    }

    // Map (px, py) to logo source coordinates with bilinear sampling
    const srcX = bbox.minX + (px - offsetX) / scale;
    const srcY = bbox.minY + (py - offsetY) / scale;

    let logoR = 0, logoG = 0, logoB = 0, logoA = 0;

    if (srcX >= bbox.minX - 1 && srcX <= bbox.maxX + 1 && srcY >= bbox.minY - 1 && srcY <= bbox.maxY + 1) {
      const x0 = Math.floor(srcX);
      const x1 = Math.min(fullWidth - 1, x0 + 1);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(logoData.fullHeight - 1, y0 + 1);

      const tx = srcX - x0;
      const ty = srcY - y0;

      if (x0 >= 0 && x1 < fullWidth && y0 >= 0 && y1 < logoData.fullHeight) {
        const getP = (gx, gy) => {
          const idx = (gy * fullWidth + gx) * 4;
          return [fullRgba[idx], fullRgba[idx + 1], fullRgba[idx + 2], fullRgba[idx + 3]];
        };

        const [r00, g00, b00, a00] = getP(x0, y0);
        const [r10, g10, b10, a10] = getP(x1, y0);
        const [r01, g01, b01, a01] = getP(x0, y1);
        const [r11, g11, b11, a11] = getP(x1, y1);

        // Bilinear interpolation
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;

        logoR = r00 * w00 + r10 * w10 + r01 * w01 + r11 * w11;
        logoG = g00 * w00 + g10 * w10 + g01 * w01 + g11 * w11;
        logoB = b00 * w00 + b10 * w10 + b01 * w01 + b11 * w11;
        logoA = (a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11) / 255;
      }
    }

    // Alpha blend logo over background
    const outR = clamp(logoR * logoA + bgR * (1 - logoA));
    const outG = clamp(logoG * logoA + bgG * (1 - logoA));
    const outB = clamp(logoB * logoA + bgB * (1 - logoA));
    const outA = clamp(bgAlpha);

    return [outR, outG, outB, outA];
  };
}

/* ─── Main Execution ─── */
export function generatePwaIcons() {
  console.log('Reading and parsing logo.svg...');
  const logoData = loadLogoRgba();
  console.log(`Logo bounding box: ${logoData.bbox.width}x${logoData.bbox.height}`);

  mkdirSync(PUBLIC_DIR, { recursive: true });

  const targets = [
    { file: 'icon-192.png', size: 192, opts: { fullBleed: false, safePaddingRatio: 0.16 } },
    { file: 'icon-512.png', size: 512, opts: { fullBleed: false, safePaddingRatio: 0.16 } },
    { file: 'icon-maskable-512.png', size: 512, opts: { fullBleed: true, safePaddingRatio: 0.24 } },
    { file: 'apple-touch-icon.png', size: 180, opts: { fullBleed: true, safePaddingRatio: 0.18 } },
  ];

  for (const { file, size, opts } of targets) {
    const renderer = createIconRenderer(logoData, size, opts);
    const png = encodePngRgba(size, size, renderer);
    const outPath = join(PUBLIC_DIR, file);
    writeFileSync(outPath, png);
    console.log(`✓ Generated ${file} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
  }

  console.log('All PWA icons generated successfully from logo.svg.');
}

// Run directly when called as script
generatePwaIcons();
