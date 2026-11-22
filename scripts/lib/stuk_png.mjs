// Kleine software-renderer voor het kledingvoorbeeld (scripts/ui/kledingvoorbeeld_blad.mjs): tekent een object van buildClothingObject
// (clothingpreview.js) zoals de gedeelde renderer het zou kadreren (zelfde hoek, zelfde camerahoogte, dezelfde fit), zonder Electron of
// browser, naar een stuk van een RGB-beeld. Orthografisch en met een eenvoudig licht: alleen om zelf naar de voorbeelden te kijken, niet
// bedoeld als pixelexact. Gebruikt de vendored three (scripts/node3d.mjs) voor de matrices.
import { deflateSync } from 'node:zlib';

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
export function pngVan(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Alle driehoeken van object `obj` (THREE.Object3D met meshes), in wereldruimte. Geeft { P: Float32Array, C: Float32Array } (9 getallen per driehoek).
export function driehoeken(THREE, obj) {
  obj.updateMatrixWorld(true);
  const P = [], C = [], v = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isMesh || !m.geometry.attributes.position) return;
    const p = m.geometry.attributes.position, c = m.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      P.push(v.x, v.y, v.z);
      if (c) C.push(c.getX(i), c.getY(i), c.getZ(i)); else C.push(0.6, 0.6, 0.6);
    }
  });
  return { P: Float32Array.from(P), C: Float32Array.from(C) };
}

// Tekent in een RGB-buffer (W x H, vol) met de achtergrond bg. fit = { c: [x,y,z], r }: de bol die in beeld moet; elev: camerahoogte (28 procent van de afstand).
export function teken({ P, C }, W, H, fit, { bg = [34, 40, 52], elev = Math.atan(0.28) } = {}) {
  const img = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { img[i * 3] = bg[0]; img[i * 3 + 1] = bg[1]; img[i * 3 + 2] = bg[2]; }
  const zb = new Float32Array(W * H).fill(-1e9);
  const ce = Math.cos(elev), se = Math.sin(elev);
  const sc = (H / 2) / (fit.r * 0.99);
  const proj = (x, y, z) => {
    const dx = x - fit.c[0], dy = y - fit.c[1], dz = z - fit.c[2];
    const yy = dy * ce - dz * se, zz = dy * se + dz * ce;
    return [W / 2 + dx * sc, H / 2 - yy * sc, zz];
  };
  const n = P.length / 9;
  for (let t = 0; t < n; t++) {
    const w = [0, 1, 2].map((k) => [P[t * 9 + k * 3], P[t * 9 + k * 3 + 1], P[t * 9 + k * 3 + 2]]);
    const e1 = [w[1][0] - w[0][0], w[1][1] - w[0][1], w[1][2] - w[0][2]], e2 = [w[2][0] - w[0][0], w[2][1] - w[0][1], w[2][2] - w[0][2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz); if (nl < 1e-12) continue; nx /= nl; ny /= nl; nz /= nl;
    // achterkant weg (de camera kijkt in de wereld langs -z, een beetje van boven)
    const vz = nz * ce - ny * se; // z-component van de normaal in cameraruimte (positief = naar de camera)
    if (vz < -0.02) continue;
    const lit = 0.42 + 0.58 * Math.max(0, nx * 0.45 + ny * 0.72 + nz * 0.52) + 0.12 * Math.max(0, -nx * 0.5 - nz * 0.8);
    const rgb = [0, 1, 2].map((ch) => Math.min(255, Math.round(255 * Math.pow(Math.max(0, C[t * 9 + ch]), 1 / 2.2) * lit)));
    const S = w.map((q) => proj(q[0], q[1], q[2]));
    const minX = Math.max(0, Math.floor(Math.min(S[0][0], S[1][0], S[2][0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(S[0][0], S[1][0], S[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(S[0][1], S[1][1], S[2][1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(S[0][1], S[1][1], S[2][1])));
    const den = (S[1][1] - S[2][1]) * (S[0][0] - S[2][0]) + (S[2][0] - S[1][0]) * (S[0][1] - S[2][1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const a = ((S[1][1] - S[2][1]) * (px - S[2][0]) + (S[2][0] - S[1][0]) * (py - S[2][1])) / den;
        const b = ((S[2][1] - S[0][1]) * (px - S[2][0]) + (S[0][0] - S[2][0]) * (py - S[2][1])) / den;
        const c = 1 - a - b;
        if (a < -0.002 || b < -0.002 || c < -0.002) continue;
        const z = a * S[0][2] + b * S[1][2] + c * S[2][2];
        const idx = y * W + x;
        if (z > zb[idx]) { zb[idx] = z; img[idx * 3] = rgb[0]; img[idx * 3 + 1] = rgb[1]; img[idx * 3 + 2] = rgb[2]; }
      }
    }
  }
  return img;
}

// Zet een tegel (RGB, w x h) in een groot beeld op (x0, y0).
export function plak(groot, GW, tegel, w, h, x0, y0) {
  for (let y = 0; y < h; y++) tegel.copy(groot, ((y0 + y) * GW + x0) * 3, y * w * 3, (y + 1) * w * 3);
}

// Een eenvoudig 3x5-lettertje voor een onderschrift (alleen cijfers en kleine letters, voor de nummering van het contactblad).
const GLYPH = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
  '.': '000000000000010', '-': '000000111000000', ' ': '000000000000000',
};
export function tekst(img, GW, x0, y0, s, kleur = [230, 230, 230], schaal = 2) {
  let x = x0;
  for (const ch of String(s)) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') {
      const gx = i % 3, gy = Math.floor(i / 3);
      for (let dy = 0; dy < schaal; dy++) for (let dx = 0; dx < schaal; dx++) { const o = ((y0 + gy * schaal + dy) * GW + x + gx * schaal + dx) * 3; img[o] = kleur[0]; img[o + 1] = kleur[1]; img[o + 2] = kleur[2]; }
    }
    x += 4 * schaal;
  }
}
