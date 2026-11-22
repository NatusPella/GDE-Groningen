// Kleine software-renderer voor de kledingaudit: tekent de driehoeken van een persoonsgeometrie van opzij of voor naar een PNG (zonder
// Electron, zonder browser). Alleen voor het bekijken van een overtreding; de meting zelf gebruikt hem niet.
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
export function pngBytes(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// geometry: THREE.BufferGeometry (niet-geindexeerd, met position en color). view: 'zij' (kijkt langs -z, gezicht naar rechts) of 'voor'
// (kijkt langs -x naar het gezicht). box: [x0, y0, x1, y1] in meter in het beeldvlak; ppm: pixels per meter. hide(t): driehoek t overslaan.
export function renderGeometry(geometry, { view = 'zij', box, ppm = 1200, bg = [236, 232, 224], hide = null } = {}) {
  const pos = geometry.attributes.position.array, col = geometry.attributes.color;
  const [x0, y0, x1, y1] = box;
  const W = Math.round((x1 - x0) * ppm), H = Math.round((y1 - y0) * ppm);
  const img = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { img[i * 3] = bg[0]; img[i * 3 + 1] = bg[1]; img[i * 3 + 2] = bg[2]; }
  const zb = new Float32Array(W * H).fill(-1e9);
  const proj = (x, y, z) => (view === 'zij' ? [x, y, z] : [-z, y, x]); // beeld-x, beeld-y, diepte (groter = dichter bij de camera)
  const n = pos.length / 9;
  for (let t = 0; t < n; t++) {
    if (hide && hide(t)) continue;
    const P = [0, 1, 2].map((k) => proj(pos[t * 9 + k * 3], pos[t * 9 + k * 3 + 1], pos[t * 9 + k * 3 + 2]));
    const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const lit = 0.45 + 0.55 * Math.abs(nz * 0.7 + ny * 0.5 + nx * 0.2);
    const lin = [col.getX(t * 3), col.getY(t * 3), col.getZ(t * 3)].map((v) => Math.min(255, Math.round(255 * Math.pow(v, 1 / 2.2) * lit)));
    const sx = P.map((p) => (p[0] - x0) * ppm), sy = P.map((p) => (y1 - p[1]) * ppm);
    const minX = Math.max(0, Math.floor(Math.min(...sx))), maxX = Math.min(W - 1, Math.ceil(Math.max(...sx)));
    const minY = Math.max(0, Math.floor(Math.min(...sy))), maxY = Math.min(H - 1, Math.ceil(Math.max(...sy)));
    const den = (sy[1] - sy[2]) * (sx[0] - sx[2]) + (sx[2] - sx[1]) * (sy[0] - sy[2]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const a = ((sy[1] - sy[2]) * (px - sx[2]) + (sx[2] - sx[1]) * (py - sy[2])) / den;
        const b = ((sy[2] - sy[0]) * (px - sx[2]) + (sx[0] - sx[2]) * (py - sy[2])) / den;
        const cc = 1 - a - b;
        if (a < -0.001 || b < -0.001 || cc < -0.001) continue;
        const z = a * P[0][2] + b * P[1][2] + cc * P[2][2];
        const idx = y * W + x;
        if (z > zb[idx]) { zb[idx] = z; img[idx * 3] = lin[0]; img[idx * 3 + 1] = lin[1]; img[idx * 3 + 2] = lin[2]; }
      }
    }
  }
  return pngBytes(W, H, img);
}
