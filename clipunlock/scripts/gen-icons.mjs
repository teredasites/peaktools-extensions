/**
 * gen-icons.mjs - Generate CopyUnlock Chrome extension icons
 * Produces valid PNG files from scratch (no dependencies)
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(width, height, rgba) {
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(Buffer.from([1]));
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const cur = rgba[idx + c];
        const left = x > 0 ? rgba[idx - 4 + c] : 0;
        row[x * 4 + c] = (cur - left) & 0xff;
      }
    }
    raw.push(row);
  }
  const deflated = deflateSync(Buffer.concat(raw), { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflated), pngChunk("IEND", Buffer.alloc(0))]);
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function roundedRectSDF(px, py, rx, ry, rw, rh, radius) {
  const cx = rx + rw / 2, cy = ry + rh / 2;
  const hx = rw / 2, hy = rh / 2;
  const dx = Math.abs(px - cx) - hx + radius;
  const dy = Math.abs(py - cy) - hy + radius;
  return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0) - radius;
}

function lerp(a, b, t) { return a + (b - a) * t; }

const TOP_COL = [99, 102, 241];
const BOT_COL = [139, 92, 246];

function renderIcon(size) {
  const S = size / 128;
  const rgba = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = (x + 0.5) / S;
      const py = (y + 0.5) / S;

      const bgSDF = roundedRectSDF(px, py, 0, 0, 128, 128, 22);
      const bgAlpha = 1.0 - smoothstep(-0.8, 0.8, bgSDF);

      if (bgAlpha < 0.004) {
        rgba[idx] = rgba[idx+1] = rgba[idx+2] = rgba[idx+3] = 0;
        continue;
      }

      const t = py / 128;
      const bgR = Math.round(lerp(TOP_COL[0], BOT_COL[0], t));
      const bgG = Math.round(lerp(TOP_COL[1], BOT_COL[1], t));
      const bgB = Math.round(lerp(TOP_COL[2], BOT_COL[2], t));

      let white = 0;

      // Document body
      const dL = 30, dT = 16, dR = 78, dB = 104;
      const fSz = 14, fX = dR - fSz, fY = dT + fSz;

      if (px >= dL && px <= dR && py >= dT && py <= dB) {
        const cutLine = dT + ((px - fX) / (dR - fX)) * (fY - dT);
        const inCut = px >= fX && py <= cutLine;
        if (!inCut) white = 1;
      }

      // Fold flap
      if (px >= fX && px <= dR && py >= dT && py <= fY) {
        const dg = dT + ((px - fX) / (dR - fX)) * (fY - dT);
        if (py >= dg && py <= fY) white = Math.max(white, 0.75);
      }

      // Text lines on document
      const lnL = dL + 8, lnR = dR - 10, lnH = 2.2;
      for (const ly of [44, 54, 64, 74, 84]) {
        const tr = ly === 84 ? lnL + (lnR - lnL) * 0.55 : lnR;
        if (px >= lnL && px <= tr && py >= ly && py <= ly + lnH) white = 0.65;
      }

      // Padlock body
      const pCX = 96, pBT = 88, pBB = 110, pBL = 82, pBR = 110;
      {
        const sdf = roundedRectSDF(px, py, pBL, pBT, pBR-pBL, pBB-pBT, 3.5);
        if (sdf < 0.6) white = Math.max(white, 1.0 - smoothstep(-0.6, 0.6, sdf));
      }

      // Shackle
      {
        const sCX = pCX, sCY = pBT, oR = 11, iR = 6, oSh = 9;
        const dx = px - sCX, dy = py - sCY, dist = Math.sqrt(dx*dx+dy*dy);
        if (px >= sCX-oR && px <= sCX-iR && py >= sCY-3 && py <= sCY+2) white = Math.max(white, 1);
        if (px >= sCX+iR && px <= sCX+oR && py >= sCY-oSh-3 && py <= sCY-oSh+2) white = Math.max(white, 1);
        if (py <= sCY && dx <= 0 && dist >= iR && dist <= oR) white = Math.max(white, 1);
        const sdy = py - (sCY - oSh);
        const sdist = Math.sqrt(dx*dx + sdy*sdy);
        if (sdy <= 0 && dx >= 0 && sdist >= iR && sdist <= oR) white = Math.max(white, 1);
      }

      // Keyhole
      {
        const kCX = pCX, kCY = pBT + (pBB-pBT)*0.40, kR = 3.5;
        const dx = px-kCX, dy = py-kCY;
        if (Math.sqrt(dx*dx+dy*dy) <= kR) white = 0;
        if (px >= kCX-1.8 && px <= kCX+1.8 && py >= kCY+1 && py <= kCY+kR+4) white = 0;
      }

      // Composite
      rgba[idx]   = Math.round(lerp(bgR, 255, white));
      rgba[idx+1] = Math.round(lerp(bgG, 255, white));
      rgba[idx+2] = Math.round(lerp(bgB, 255, white));
      rgba[idx+3] = Math.round(bgAlpha * 255);
    }
  }
  return rgba;
}

const BASE = "C:/Users/Developer LLC/Desktop/Digital Empire/chrome extensions/clipunlock";
const outputs = [
  { size: 16,  path: BASE + "/assets/icons/icon-16.png" },
  { size: 32,  path: BASE + "/assets/icons/icon-32.png" },
  { size: 48,  path: BASE + "/assets/icons/icon-48.png" },
  { size: 128, path: BASE + "/assets/icons/icon-128.png" },
  { size: 128, path: BASE + "/assets/store-icon-128.png" },
];

for (const { size, path } of outputs) {
  mkdirSync(dirname(path), { recursive: true });
  const rgba = renderIcon(size);
  const png = makePNG(size, size, rgba);
  writeFileSync(path, png);
  console.log("  wrote " + path + "  (" + png.length + " bytes, " + size + "x" + size + ")");
}
console.log("\nAll icons generated successfully.");
