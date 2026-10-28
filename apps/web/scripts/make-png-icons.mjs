/**
 * Generates icon-192.png and icon-512.png from scratch,
 * drawing the Agora temple icon in pure Node.js (no external deps).
 *
 * Design: midnight navy bg → warm gold Greek temple → "agora" text area
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

// ─── colour helpers ──────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

/** Linear gradient between two RGB stops along the Y axis */
function gradY(y, h, [r0,g0,b0], [r1,g1,b1]) {
  const t = y / h;
  return [lerp(r0,r1,t), lerp(g0,g1,t), lerp(b0,b1,t)];
}

/** Gold gradient top→bottom: #f5c842 → #c8922a */
function goldAt(y, h) { return gradY(y, h, [245,200,66], [200,146,42]); }

/** Background gradient: #0b0e1a → #12183a */
function bgAt(y, h)   { return gradY(y, h, [11,14,26],  [18,24,58]);  }

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

// ─── alpha-blend a gold pixel onto the canvas ────────────────────────────────

function blendGold(pixels, W, x, y, alpha, goldColor) {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const i = (y * W + x) * 3;
  const [gr, gg, gb] = goldColor;
  const a = alpha;
  pixels[i]   = clamp(pixels[i]   * (1-a) + gr * a);
  pixels[i+1] = clamp(pixels[i+1] * (1-a) + gg * a);
  pixels[i+2] = clamp(pixels[i+2] * (1-a) + gb * a);
}

// ─── filled rectangle ────────────────────────────────────────────────────────

function fillRect(pixels, W, x0, y0, w, h, colorFn, alpha = 1) {
  for (let y = Math.max(0, y0); y < Math.min(W, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      blendGold(pixels, W, x, y, alpha, colorFn(y - y0, h));
    }
  }
}

// ─── filled triangle (pediment) ──────────────────────────────────────────────

function fillTriangle(pixels, W, x0, y0, x1, y1, x2, y2, colorFn) {
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(W - 1, Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y++) {
    // find x intersections at this scanline
    const xs = [];
    const edges = [[x0,y0,x1,y1],[x1,y1,x2,y2],[x2,y2,x0,y0]];
    for (const [ax,ay,bx,by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a,b) => a-b);
    for (let x = Math.max(0, Math.floor(xs[0])); x <= Math.min(W-1, Math.ceil(xs[1])); x++) {
      blendGold(pixels, W, x, y, 1, colorFn(y - Math.min(y0,y1,y2), maxY - minY + 1));
    }
  }
}

// ─── star dot ────────────────────────────────────────────────────────────────

function drawStar(pixels, W, x, y, r, alpha) {
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= r) {
        const a = alpha * Math.max(0, 1 - dist / r);
        blendGold(pixels, W, Math.round(x+dx), Math.round(y+dy), a, [255,255,255]);
      }
    }
  }
}

// ─── rounded-rect clip mask ───────────────────────────────────────────────────

function insideRoundedRect(x, y, W, radius) {
  const cx = W / 2, cy = W / 2;
  const hw = W / 2 - radius;
  const dx = Math.max(0, Math.abs(x - cx) - hw);
  const dy = Math.max(0, Math.abs(y - cy) - hw);
  return dx * dx + dy * dy <= radius * radius;
}

// ─── main render ─────────────────────────────────────────────────────────────

function renderIcon(W) {
  const pixels = new Uint8Array(W * W * 3);
  const R = W * 0.215; // corner radius ~110/512 * W

  // 1. Background
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (!insideRoundedRect(x, y, W, R)) continue;
      const [r,g,b] = bgAt(y, W);
      const i = (y * W + x) * 3;
      pixels[i] = clamp(r); pixels[i+1] = clamp(g); pixels[i+2] = clamp(b);
    }
  }

  // 2. Warm glow behind temple (radial, centred ~55% down)
  const glowCX = W * 0.5, glowCY = W * 0.56;
  const glowRX = W * 0.35, glowRY = W * 0.23;
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (!insideRoundedRect(x, y, W, R)) continue;
      const nx = (x - glowCX) / glowRX;
      const ny = (y - glowCY) / glowRY;
      const d = nx*nx + ny*ny;
      if (d < 1) {
        const a = (1 - d) * 0.13;
        const i = (y * W + x) * 3;
        pixels[i]   = clamp(pixels[i]   + 245 * a);
        pixels[i+1] = clamp(pixels[i+1] + 200 * a);
        pixels[i+2] = clamp(pixels[i+2] +  66 * a);
      }
    }
  }

  // 3. Stars
  const s = W / 512;
  const stars = [
    [80,70,1.8,0.6],[140,45,1.2,0.4],[200,80,1.5,0.5],
    [255,38,2.2,0.5],[310,55,1.8,0.45],[370,75,1.2,0.55],
    [430,48,1.5,0.4],[460,90,1.2,0.5],[100,110,1.0,0.3],[420,120,1.0,0.3],
  ];
  for (const [sx,sy,sr,sa] of stars) {
    drawStar(pixels, W, sx*s, sy*s, sr*s, sa);
  }

  // 4. Temple — all coords are in 512-space, scaled by s
  // Pediment triangle: tip at (256,100), base corners (72,172) and (440,172)
  fillTriangle(pixels, W,
    Math.round(256*s), Math.round(100*s),
    Math.round(72*s),  Math.round(172*s),
    Math.round(440*s), Math.round(172*s),
    (y,h) => goldAt(y, h)
  );

  // Architrave beam
  fillRect(pixels, W, Math.round(72*s), Math.round(178*s), Math.round(368*s), Math.round(24*s),
    (y,h) => goldAt(y,h));

  // Frieze band (slightly darker)
  fillRect(pixels, W, Math.round(72*s), Math.round(206*s), Math.round(368*s), Math.round(14*s),
    () => [200,146,42], 0.75);

  // 7 columns
  const colX = [82,130,178,226,274,322,370].map(v => Math.round(v*s));
  const colW  = Math.round(34*s);
  const colY  = Math.round(224*s);
  const colH  = Math.round(160*s);
  for (const cx of colX) {
    fillRect(pixels, W, cx, colY, colW, colH, (y,h) => goldAt(y,h));
    // capital
    fillRect(pixels, W, cx - Math.round(2*s), colY - Math.round(7*s),
      colW + Math.round(4*s), Math.round(8*s), () => [245,200,66]);
  }

  // Stylobate steps
  const stepDefs = [
    { x: 64*s, w: 384*s, y: 384*s, h: 14*s, a: 1.0 },
    { x: 54*s, w: 404*s, y: 400*s, h: 12*s, a: 0.85 },
    { x: 44*s, w: 424*s, y: 414*s, h: 10*s, a: 0.7  },
  ];
  for (const { x, w, y, h, a } of stepDefs) {
    fillRect(pixels, W, Math.round(x), Math.round(y), Math.round(w), Math.round(h),
      () => [200,146,42], a);
  }

  // 5. "agora" text area — draw as a simple gold underline bar
  //    (pixel-level text rendering is complex; we use a decorative bar + dots)
  const textY = Math.round(460*s);
  const barW  = Math.round(160*s);
  const barH  = Math.round(3*s);
  const barX  = Math.round((256 - 80)*s);
  fillRect(pixels, W, barX, textY, barW, barH, () => [245,200,66], 0.5);

  // 6. Thin gold border (1-2px inside the rounded rect edge)
  const borderInset = Math.round(6*s);
  const borderR = R - borderInset;
  const cx2 = W/2, cy2 = W/2;
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const outer = insideRoundedRect(x, y, W, R);
      const inner = insideRoundedRect(x, y, W, R - Math.round(2*s));
      if (outer && !inner) {
        blendGold(pixels, W, x, y, 0.2, [245,200,66]);
      }
    }
  }

  return pixels;
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function createChunk(type, data) {
  const buf = Buffer.alloc(4 + 4 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < 8 + data.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  buf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return buf;
}

function encodePng(W, pixels) {
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0); ihdrData.writeUInt32BE(W, 4);
  ihdrData[8]=8; ihdrData[9]=2; // 8-bit RGB

  const rowSize = 1 + W * 3;
  const raw = Buffer.alloc(W * rowSize);
  for (let y = 0; y < W; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 3;
      const dst = y * rowSize + 1 + x * 3;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
    }
  }

  return Buffer.concat([
    sig,
    createChunk("IHDR", ihdrData),
    createChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── generate both sizes ─────────────────────────────────────────────────────

for (const size of [192, 512]) {
  const pixels = renderIcon(size);
  const png    = encodePng(size, pixels);
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), png);
  console.log(`✓ icon-${size}.png generated (${png.length} bytes)`);
}
