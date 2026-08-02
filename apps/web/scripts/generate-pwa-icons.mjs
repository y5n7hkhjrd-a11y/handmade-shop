/**
 * Generates PWA icons for the Linus app in pure Node (zero dependencies).
 * Draws an avocado-green gradient rounded square with a white "L" monogram,
 * matching the app's brand palette (avocado #7FA345 → mint).
 *
 * Outputs (into apps/web/public/):
 *   icon-192.png           192x192  (rounded corners, for manifest "any")
 *   icon-512.png           512x512  (rounded corners, for manifest "any")
 *   icon-maskable-512.png  512x512  (full-bleed, safe-zone content, maskable)
 *   apple-touch-icon.png   180x180  (full-bleed square — iOS rounds it itself)
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public');

/* ─── PNG encoder (minimal, RGBA8) ─── */
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

function encodePng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline: filter byte 0 + RGBA pixels
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
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

/* ─── Drawing helpers ─── */
const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, Math.round(v)));

function mix(c1, c2, t) {
  return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
}

// Distance from a point to a rounded-rectangle outline (negative inside)
function roundedRectDist(px, py, x0, y0, x1, y1, r) {
  const cx = clamp(px, x0 + r, x1 - r);
  const cy = clamp(py, y0 + r, y1 - r);
  const dx = px - cx;
  const dy = py - cy;
  return Math.hypot(dx, dy) - r;
}

/**
 * Icon renderer.
 * @param size pixel size
 * @param opts.fullBleed false → rounded corners with transparent background (for "any" icons);
 *                       true → full-bleed square (apple-touch / maskable)
 */
function drawIcon(size, { fullBleed = false } = {}) {
  const corner = size * 0.22;
  // Brand gradient: avocado #8AB253 (top-left) → deep avocado #5F7D38 (bottom-right)
  const cTopLeft = [138, 178, 83];
  const cBottomRight = [95, 125, 56];
  // White monogram
  const white = [255, 255, 255];
  // Monogram geometry (kept inside ~62% safe zone for maskable)
  const m0 = size * 0.30; // left edge of vertical bar
  const m1 = size * 0.42; // right edge of vertical bar
  const m2 = size * 0.30; // top of vertical bar
  const m3 = size * 0.64; // bottom of vertical bar
  const m4 = size * 0.70; // right edge of horizontal bar
  const m5 = size * 0.72; // top of horizontal bar
  const m6 = size * 0.84; // bottom of horizontal bar
  const barR = size * 0.045;

  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    // Background shape
    let inside;
    if (fullBleed) {
      inside = true;
    } else {
      const d = roundedRectDist(px, py, 0, 0, size, size, corner);
      inside = d <= 0;
      if (d > 2) return [0, 0, 0, 0]; // fully outside → transparent
    }

    if (!inside) {
      // soft 1-2px anti-aliased edge (rough)
      const t = Math.max(0, Math.min(1, (roundedRectDist(px, py, 0, 0, size, size, corner) + 2) / 2));
      const [r, g, b] = mix(cTopLeft, cBottomRight, (px + py) / (2 * size));
      return [clamp(r), clamp(g), clamp(b), clamp((1 - t) * 255)];
    }

    // Diagonal gradient background
    const gt = (px + py) / (2 * size);
    const [bgR, bgG, bgB] = mix(cTopLeft, cBottomRight, gt);

    // White "L" monogram — rounded bars via distance to each bar's outline
    const inVert = roundedRectDist(px, py, m0, m2, m1, m3, barR) <= 0;
    const inHoriz = roundedRectDist(px, py, m1, m5, m4, m6, barR) <= 0;
    // tiny pink accent dot (brand pastel pink) at top-right of the vertical bar
    const dotCx = m1 + size * 0.06;
    const dotCy = m2 - size * 0.02;
    const inDot = Math.hypot(px - dotCx, py - dotCy) <= size * 0.045;

    if (inDot) {
      return [244, 151, 188, 255]; // #F497BC pastel pink
    }
    if (inVert || inHoriz) {
      return [...white, 255];
    }
    return [clamp(bgR), clamp(bgG), clamp(bgB), 255];
  };
}

/* ─── Generate & write ─── */
mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, opts: {} },
  { file: 'icon-512.png', size: 512, opts: {} },
  { file: 'icon-maskable-512.png', size: 512, opts: { fullBleed: true } },
  { file: 'apple-touch-icon.png', size: 180, opts: { fullBleed: true } },
];

for (const { file, size, opts } of targets) {
  const png = encodePng(size, size, drawIcon(size, opts));
  const outPath = join(OUT_DIR, file);
  writeFileSync(outPath, png);
  console.log(`✓ ${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
console.log('Done.');
