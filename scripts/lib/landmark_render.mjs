// Kleine software-renderer voor het landmarkblad (scripts/landmarks_aaa_blad.mjs): perspectief van schuin boven, vlakke belichting per
// driehoek, z-buffer, dag of avond. Zonder Electron of browser; voor beeld ter vergelijking, niet voor meting van fps.
import { pngBytes } from './kleding_clip_png.mjs';

const srgb = (v) => Math.min(255, Math.round(255 * Math.pow(Math.max(0, v), 1 / 2.2)));

// geometry: niet-geindexeerde BufferGeometry met position en color (lineair), en groups met materialIndex.
// glow: { [materialIndex]: [r, g, b] lineair } wat bij avond gloeit (ramen). opts.yaw/pitch in graden, opts.fit: marge.
export function renderLandmark(geometry, { w = 960, h = 640, yaw = 35, pitch = 24, night = false, glow = {}, fit = 0.78, target = null, dist = null } = {}) {
  const pos = geometry.attributes.position.array, ca = geometry.attributes.color;
  const col = ca.normalized ? Float32Array.from(ca.array, (v) => v / 255) : ca.array;
  const n = pos.length / 9;
  const mat = new Uint8Array(n);
  for (const g of geometry.groups || []) for (let t = g.start / 3; t < (g.start + g.count) / 3; t++) mat[t] = g.materialIndex;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    x0 = Math.min(x0, pos[i]); x1 = Math.max(x1, pos[i]);
    y0 = Math.min(y0, pos[i + 1]); y1 = Math.max(y1, pos[i + 1]);
    z0 = Math.min(z0, pos[i + 2]); z1 = Math.max(z1, pos[i + 2]);
  }
  const c = target || [(x0 + x1) / 2, (y0 + y1) * 0.42, (z0 + z1) / 2];
  const rad = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2;
  const fov = 34 * Math.PI / 180, f = 1 / Math.tan(fov / 2);
  const D = dist || (rad * fit) / Math.sin(fov / 2) * Math.max(1, h / w);
  const yr = yaw * Math.PI / 180, pr = pitch * Math.PI / 180;
  const eye = [c[0] + Math.sin(yr) * Math.cos(pr) * D, c[1] + Math.sin(pr) * D, c[2] + Math.cos(yr) * Math.cos(pr) * D];
  // camera basis
  let fx = c[0] - eye[0], fy = c[1] - eye[1], fz = c[2] - eye[2];
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // right = forward x (0, 1, 0), up = right x forward
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;
  const upx = -rz * fy, upy = rz * fx - rx * fz, upz = rx * fy;
  const proj = (x, y, z) => {
    const dx = x - eye[0], dy = y - eye[1], dz = z - eye[2];
    const cz = dx * fx + dy * fy + dz * fz;
    const cx = dx * rx + dz * rz;
    const cy = dx * upx + dy * upy + dz * upz;
    const k = f / Math.max(0.1, cz);
    return [w / 2 + cx * k * (h / 2), h / 2 - cy * k * (h / 2), cz];
  };
  const img = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const top = night ? [10, 22, 44] : [150, 190, 228], bot = night ? [36, 44, 70] : [228, 232, 230];
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; for (let k = 0; k < 3; k++) img[i + k] = Math.round(top[k] + (bot[k] - top[k]) * t); }
  }
  const zb = new Float32Array(w * h).fill(Infinity);
  const L = [0.45, 0.8, 0.4]; const Ll = Math.hypot(...L); L[0] /= Ll; L[1] /= Ll; L[2] /= Ll;
  // grond: een vlak onder het gebouw
  const ground = night ? [0.012, 0.014, 0.02] : [0.32, 0.34, 0.3];
  const gy = y0 - 0.02, gr = rad * 1.25;
  const gq = [[c[0] - gr, gy, c[2] - gr], [c[0] + gr, gy, c[2] - gr], [c[0] + gr, gy, c[2] + gr], [c[0] - gr, gy, c[2] + gr]];
  const tris = [[gq[0], gq[1], gq[2], ground], [gq[0], gq[2], gq[3], ground]];
  const raster = (P, rgb) => {
    const sx = [P[0][0], P[1][0], P[2][0]], sy = [P[0][1], P[1][1], P[2][1]];
    const minX = Math.max(0, Math.floor(Math.min(...sx))), maxX = Math.min(w - 1, Math.ceil(Math.max(...sx)));
    const minY = Math.max(0, Math.floor(Math.min(...sy))), maxY = Math.min(h - 1, Math.ceil(Math.max(...sy)));
    if (minX > maxX || minY > maxY) return;
    const den = (sy[1] - sy[2]) * (sx[0] - sx[2]) + (sx[2] - sx[1]) * (sy[0] - sy[2]);
    if (Math.abs(den) < 1e-9) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const a = ((sy[1] - sy[2]) * (px - sx[2]) + (sx[2] - sx[1]) * (py - sy[2])) / den;
        const b = ((sy[2] - sy[0]) * (px - sx[2]) + (sx[0] - sx[2]) * (py - sy[2])) / den;
        const cc = 1 - a - b;
        if (a < -0.0005 || b < -0.0005 || cc < -0.0005) continue;
        const z = a * P[0][2] + b * P[1][2] + cc * P[2][2];
        const idx = y * w + x;
        if (z < zb[idx]) { zb[idx] = z; img[idx * 3] = rgb[0]; img[idx * 3 + 1] = rgb[1]; img[idx * 3 + 2] = rgb[2]; }
      }
    }
  };
  for (const [a, b, cc, rgb] of tris) raster([proj(...a), proj(...b), proj(...cc)], rgb.map(srgb));
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const A = [pos[o], pos[o + 1], pos[o + 2]], B = [pos[o + 3], pos[o + 4], pos[o + 5]], Cc = [pos[o + 6], pos[o + 7], pos[o + 8]];
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // dubbelzijdig: de normaal naar de camera
    const vx = eye[0] - A[0], vy = eye[1] - A[1], vz = eye[2] - A[2];
    if (nx * vx + ny * vy + nz * vz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const sun = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const base = [col[o], col[o + 1], col[o + 2]];
    let rgb;
    const gl = glow[mat[t]];
    if (night) {
      const amb = 0.1 + 0.05 * Math.max(0, ny);
      rgb = base.map((v, k) => v * amb * [0.7, 0.8, 1.15][k] + (gl ? gl[k] : 0));
    } else {
      const lit = 0.42 + 0.68 * sun + 0.08 * Math.max(0, ny);
      rgb = base.map((v) => v * lit);
    }
    raster([proj(...A), proj(...B), proj(...Cc)], rgb.map(srgb));
  }
  return pngBytes(w, h, img);
}
