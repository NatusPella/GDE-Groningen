// Kleine softwarerenderer voor de duivenmodellen (orthografisch, z-buffer, eenvoudige belichting): zij-, voor- en
// bovenaanzicht naar een PNG, en het aantal gevulde pixels voor de silhouet-test. Geen scène, geen GPU.
import { deflateSync } from 'node:zlib';

// geos: [{ geo: BufferGeometry met position/normal/color/index, matrix?: Matrix4 }]; view: 'zij' | 'voor' | 'boven'
export function renderView(THREE, geos, view, { w = 240, h = 180, scale = 330, bg = [236, 238, 242] } = {}) {
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { rgb[i * 3] = bg[0]; rgb[i * 3 + 1] = bg[1]; rgb[i * 3 + 2] = bg[2]; }
  const zb = new Float32Array(w * h).fill(-1e9);
  const mask = new Uint8Array(w * h);
  const light = new THREE.Vector3(0.4, 0.8, 0.45).normalize();
  // schermas (u rechts, v omhoog, d naar de kijker toe): zij kijkt langs z, voor langs x, boven langs y
  const axes = {
    zij: (v) => [v.x, v.y, v.z], voor: (v) => [v.z, v.y, v.x], boven: (v) => [v.x, -v.z, v.y],
  }[view];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const cx = w / 2, cy = h * 0.52;
  for (const { geo, matrix } of geos) {
    const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color, idx = geo.index;
    const cnt = idx ? idx.count : P.count;
    const at = (i) => (idx ? idx.getX(i) : i);
    for (let t = 0; t < cnt; t += 3) {
      const ids = [at(t), at(t + 1), at(t + 2)];
      const pts = ids.map((i, k) => {
        const v = [a, b, c][k].fromBufferAttribute(P, i);
        if (matrix) v.applyMatrix4(matrix);
        return axes(v);
      });
      // belichting per hoekpunt (Gouraud), zodat afgeronde vormen glad blijven
      const lams = ids.map((i) => {
        n.fromBufferAttribute(N, i);
        if (matrix) n.transformDirection(matrix);
        return 0.35 + 0.65 * Math.max(0, light.dot(n));
      });
      const sx = pts.map((p) => cx + p[0] * scale), sy = pts.map((p) => cy - p[1] * scale), sd = pts.map((p) => p[2]);
      const minx = Math.max(0, Math.floor(Math.min(...sx))), maxx = Math.min(w - 1, Math.ceil(Math.max(...sx)));
      const miny = Math.max(0, Math.floor(Math.min(...sy))), maxy = Math.min(h - 1, Math.ceil(Math.max(...sy)));
      const area = (sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0]);
      if (Math.abs(area) < 1e-9) continue;
      const col = [0, 1, 2].map((k) => [C.getX(ids[k]), C.getY(ids[k]), C.getZ(ids[k])]);
      for (let y = miny; y <= maxy; y++) {
        for (let x = minx; x <= maxx; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((sx[1] - px) * (sy[2] - py) - (sx[2] - px) * (sy[1] - py)) / area;
          const w1 = ((sx[2] - px) * (sy[0] - py) - (sx[0] - px) * (sy[2] - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
          const d = w0 * sd[0] + w1 * sd[1] + w2 * sd[2];
          const i = y * w + x;
          if (d < zb[i]) continue;
          zb[i] = d; mask[i] = 1;
          for (let k = 0; k < 3; k++) {
            const lin = w0 * col[0][k] * lams[0] + w1 * col[1][k] * lams[1] + w2 * col[2][k] * lams[2];
            rgb[i * 3 + k] = Math.min(255, Math.round(Math.pow(Math.max(0, lin * 1.15), 1 / 2.2) * 255));
          }
        }
      }
    }
  }
  let filled = 0, minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { filled++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  return { w, h, rgb, filled, bbox: filled ? { w: maxX - minX + 1, h: maxY - minY + 1 } : { w: 0, h: 0 } };
}

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// contactblad: rijen = modellen, kolommen = aanzichten (elk een eigen renderView-resultaat)
export function sheet(rows) {
  const cols = rows[0].length, w = rows[0][0].w, h = rows[0][0].h;
  const W = w * cols, H = h * rows.length, out = new Uint8Array(W * H * 3);
  rows.forEach((row, r) => row.forEach((im, c) => {
    for (let y = 0; y < h; y++) out.set(im.rgb.subarray(y * w * 3, (y + 1) * w * 3), ((r * h + y) * W + c * w) * 3);
  }));
  return encodePng(W, H, out);
}
