// The province's base map (docs/PROVINCIE-PLAN.md 2.23, F2: "een grove
// piramide z0-z3"): the world builder's features painted into one raster at
// 20 m a pixel while build_province.mjs goes pack by pack, then halved three
// times and cut into 512 px PNG tiles: provmap/z<level>-<tx>_<ty>.png. The
// full map (mapview.js) draws them under its own layers; up close the tiles'
// vectors take over. Transparent where there is only land: the map's meadow
// shows through. Pure Node (zlib), no canvas.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { MAP_PALETTE, toRgba } from '../../game/js/mapstyle.js';

export const TILE_PX = 512;
export const FINE_M = 20; // metres a pixel at the finest level (z3)
export const LEVELS = 4;

// the full map's colours (game/js/mapstyle.js), [r, g, b, a 0..255]; the
// cycleway is the map's own colour (it was a darker red here by mistake)
const P = MAP_PALETTE;
export const STYLE = {
  green: toRgba(P.park, 230), forest: toRgba(P.forest, 240), water: toRgba(P.water), waterEdge: toRgba(P.waterEdge), building: [160, 156, 146, 170],
  minor: toRgba(P.minor, 200), normal: toRgba(P.road), major: toRgba(P.major), cycle: toRgba(P.cycle, 170), rail: toRgba(P.rail),
};
const FOREST = new Set(['forest', 'wood']);

// An RGBA raster over the world box [x0, x0 + w*m) x [y0, y0 + h*m), drawn
// with plain "over" blending; a clip box (world) limits every fill.
export class Raster {
  constructor(x0, y0, w, h, m) {
    Object.assign(this, { x0, y0, w, h, m });
    this.px = new Uint8ClampedArray(w * h * 4);
    this.clip = null;
  }
  setClip(box) { this.clip = box; }
  blend(i, c) {
    const p = this.px, a = c[3] / 255, o = i * 4;
    const ia = 1 - a, da = p[o + 3] / 255;
    const outA = a + da * ia;
    if (outA <= 0) return;
    for (let k = 0; k < 3; k++) p[o + k] = (c[k] * a + p[o + k] * da * ia) / outA;
    p[o + 3] = outA * 255;
  }
  // even-odd scanline fill of rings (world points) at pixel centres
  fill(rings, c) {
    let ymin = Infinity, ymax = -Infinity;
    for (const R of rings) for (const p of R) { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }
    const cl = this.clip;
    if (cl) { ymin = Math.max(ymin, cl[1]); ymax = Math.min(ymax, cl[3]); }
    const j0 = Math.max(0, Math.floor((ymin - this.y0) / this.m - 0.5)), j1 = Math.min(this.h - 1, Math.ceil((ymax - this.y0) / this.m - 0.5));
    const xs = [];
    for (let j = j0; j <= j1; j++) {
      const y = this.y0 + (j + 0.5) * this.m;
      xs.length = 0;
      for (const R of rings) {
        for (let k = 0, n = R.length; k < n; k++) {
          const a = R[k], b = R[(k + 1) % n];
          if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        let xa = xs[k], xb = xs[k + 1];
        if (cl) { xa = Math.max(xa, cl[0]); xb = Math.min(xb, cl[2]); }
        const i0 = Math.max(0, Math.ceil((xa - this.x0) / this.m - 0.5)), i1 = Math.min(this.w - 1, Math.floor((xb - this.x0) / this.m - 0.5));
        for (let i = i0; i <= i1; i++) this.blend(j * this.w + i, c);
      }
    }
  }
  // a dot of at least a pixel (a small building, a thin road's vertex)
  dot(x, y, c) {
    const cl = this.clip;
    if (cl && (x < cl[0] || x >= cl[2] || y < cl[1] || y >= cl[3])) return;
    const i = Math.floor((x - this.x0) / this.m), j = Math.floor((y - this.y0) / this.m);
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.blend(j * this.w + i, c);
  }
  // a polyline of width wM (at least one pixel): a quad per segment
  line(P, wM, c) {
    const hw = Math.max(wM, this.m * 0.9) / 2;
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      // lengthen by half a width so the joins close
      const ux = dx / L, uy = dy / L, nx = -uy * hw, ny = ux * hw, ex = ux * hw, ey = uy * hw;
      this.fill([[[a[0] - ex + nx, a[1] - ey + ny], [b[0] + ex + nx, b[1] + ey + ny], [b[0] + ex - nx, b[1] + ey - ny], [a[0] - ex - nx, a[1] - ey - ny]]], c);
    }
  }
}

// The features of one pack (worldbuilder.js rows) painted, clipped to its box
export function paint(R, feats, box) {
  R.setClip(box);
  const by = { green: [], water: [], buildings: [], roads: [], rails: [] };
  for (const f of feats) if (by[f.kind]) by[f.kind].push(f.row);
  // meadow and grass (Dutch farmland is mapped as either) are the land itself
  for (const g of by.green) if (g.kind !== 'meadow' && g.kind !== 'grass') R.fill([g.pts], FOREST.has(g.kind) ? STYLE.forest : STYLE.green);
  for (const w of by.water) R.fill([w.pts], STYLE.water);
  // the shore line of the city's water (mapview.js WATER_EDGE), only on water wide enough to carry it
  for (const w of by.water) {
    if (w.pts.length < 3) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    if (Math.min(x1 - x0, y1 - y0) >= R.m * 4) R.line([...w.pts, w.pts[0]], R.m * 0.9, STYLE.waterEdge);
  }
  for (const b of by.buildings) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of b.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    if (x1 - x0 < R.m && y1 - y0 < R.m) R.dot((x0 + x1) / 2, (y0 + y1) / 2, STYLE.building);
    else R.fill([b.pts], STYLE.building);
  }
  const order = { foot: 0, cycle: 1, minor: 2, normal: 3, major: 4 };
  for (const r of by.roads.filter((q) => q.cat !== 'foot').sort((a, b) => order[a.cat] - order[b.cat])) {
    const c = r.cat === 'major' ? STYLE.major : r.cat === 'normal' ? STYLE.normal : r.cat === 'cycle' ? STYLE.cycle : STYLE.minor;
    R.line(r.pts, r.cat === 'major' ? Math.max(r.width, 30) : r.cat === 'normal' ? Math.max(r.width, 16) : r.width, c);
  }
  for (const r of by.rails) R.line(r.pts, 10, STYLE.rail);
  R.setClip(null);
}

// half the size, averaging 2 x 2 pixels (alpha-weighted)
export function halve(R) {
  const w = Math.ceil(R.w / 2), h = Math.ceil(R.h / 2);
  const out = new Raster(R.x0, R.y0, w, h, R.m * 2);
  const s = R.px, d = out.px;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
        const x = 2 * i + di, y = 2 * j + dj;
        if (x >= R.w || y >= R.h) continue;
        const o = (y * R.w + x) * 4, al = s[o + 3];
        r += s[o] * al; g += s[o + 1] * al; b += s[o + 2] * al; a += al;
      }
      const o = (j * w + i) * 4;
      if (a > 0) { d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; d[o + 3] = a / 4; }
    }
  }
  return out;
}

// ------------------------------------------------------------- PNG

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// RGBA 8-bit, filter "sub" per row (deterministic: same pixels, same bytes)
export function encodePNG(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let j = 0; j < h; j++) {
    const o = j * (w * 4 + 1);
    raw[o] = 1;
    for (let i = 0; i < w * 4; i++) raw[o + 1 + i] = (px[j * w * 4 + i] - (i >= 4 ? px[j * w * 4 + i - 4] : 0)) & 255;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// The pyramid out of the finest raster into dir/provmap/: -> the meta the
// game reads ({ x0, y0, tile, levels: [{ z, m, w, h, tiles: ['tx_ty', ...] }] })
export function writePyramid(R, dir) {
  const out = path.join(dir, 'provmap');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const levels = [];
  let cur = R, bytes = 0;
  for (let z = LEVELS - 1; z >= 0; z--) {
    const L = { z, m: cur.m, w: cur.w, h: cur.h, tiles: [] };
    for (let ty = 0; ty * TILE_PX < cur.h; ty++) {
      for (let tx = 0; tx * TILE_PX < cur.w; tx++) {
        const w = Math.min(TILE_PX, cur.w - tx * TILE_PX), h = Math.min(TILE_PX, cur.h - ty * TILE_PX);
        const px = new Uint8ClampedArray(w * h * 4);
        let any = false;
        for (let j = 0; j < h; j++) {
          const src = ((ty * TILE_PX + j) * cur.w + tx * TILE_PX) * 4;
          px.set(cur.px.subarray(src, src + w * 4), j * w * 4);
        }
        for (let k = 3; k < px.length; k += 4) if (px[k]) { any = true; break; }
        if (!any) continue;
        const png = encodePNG(w, h, px);
        fs.writeFileSync(path.join(out, `z${z}-${tx}_${ty}.png`), png);
        bytes += png.length;
        L.tiles.push(`${tx}_${ty}`);
      }
    }
    levels.unshift(L);
    if (z > 0) cur = halve(cur);
  }
  return { meta: { x0: R.x0, y0: R.y0, tile: TILE_PX, dir: 'provmap/', levels }, bytes };
}
