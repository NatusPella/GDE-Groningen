// The terrain height raster per tile (docs/PROVINCIE-PLAN.md 2.7, 2.11): AHN
// DTM (CC0) resampled to a coarse grid, heights in cm relative to the tile's
// street level. Pure: the fetch script (scripts/world/fetch_ahn.py) writes it,
// the packer puts it in the tile's RASTER section (gdt.js), the solvers
// (profile.mjs, railprofile.mjs: the `terrain` sampler) and the game read it.
//
// Until the renderer draws the terrain (F2) the game keeps it flat: the
// default field answers 0 everywhere, and a tile without a raster is flat.
//
// Raster: { w, h, cell (m), x0, y0 (world frame: the corner of cell (0, 0),
// the tile's north-west corner as y grows south), codec, data } with codec 1:
// int16 LE cm per cell, row by row from y0.

const TILE = 1000, GRID_X0 = 330, GRID_Y0 = 75; // gdt.js: the tile grid

export const RASTER_CODEC = { u8: 0, i16cm: 1, f32: 2 };
export const NODATA = -32768;

export function encodeTerrainRaster({ x0, y0, cell, w, h, values }) {
  const data = new Uint8Array(w * h * 2);
  const dv = new DataView(data.buffer);
  for (let k = 0; k < w * h; k++) {
    const v = values[k];
    dv.setInt16(k * 2, Number.isFinite(v) ? Math.max(-32767, Math.min(32767, Math.round(v * 100))) : NODATA, true);
  }
  return { w, h, cell, x0, y0, codec: RASTER_CODEC.i16cm, data };
}

export function decodeTerrainRaster(r) {
  if (r.z) return r;
  const z = new Float32Array(r.w * r.h);
  const dv = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  for (let k = 0; k < r.w * r.h; k++) {
    const v = r.codec === RASTER_CODEC.f32 ? dv.getFloat32(k * 4, true) : r.codec === RASTER_CODEC.i16cm ? dv.getInt16(k * 2, true) : dv.getUint8(k);
    z[k] = r.codec === RASTER_CODEC.i16cm ? (v === NODATA ? NaN : v / 100) : v;
  }
  return { ...r, z };
}

// A raster of metres relative to something other than the datum, moved by
// `m` (the city's rasters are relative to their tile's street level, the
// province's are m NAP): the field of #78 is one datum everywhere.
export function shiftRaster(r, m) {
  if (!m || r.codec !== RASTER_CODEC.i16cm) return r;
  const data = new Uint8Array(r.data);
  const dv = new DataView(data.buffer);
  const d = Math.round(m * 100);
  for (let k = 0; k < r.w * r.h; k++) {
    const v = dv.getInt16(k * 2, true);
    if (v !== NODATA) dv.setInt16(k * 2, Math.max(-32767, Math.min(32767, v + d)), true);
  }
  return { ...r, data };
}

// bilinear height at (x, y) in metres, or null outside the raster or on no data
export function sampleRaster(R, x, y) {
  const u = (x - R.x0) / R.cell - 0.5, v = (y - R.y0) / R.cell - 0.5;
  if (u < -0.5 || v < -0.5 || u > R.w - 0.5 || v > R.h - 0.5) return null;
  const i = Math.max(0, Math.min(R.w - 2, Math.floor(u))), j = Math.max(0, Math.min(R.h - 2, Math.floor(v)));
  const fu = Math.max(0, Math.min(1, u - i)), fv = Math.max(0, Math.min(1, v - j));
  const a = R.z[j * R.w + i], b = R.z[j * R.w + i + 1], c = R.z[(j + 1) * R.w + i], d = R.z[(j + 1) * R.w + i + 1];
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}

// The terrain of the tiles that are in: rasters by tile key; at(x, y) the
// height (m, 0 where no raster covers it: flat). The `terrain` sampler the
// height solvers take is field.at.
export class TerrainField {
  constructor() { this.rasters = new Map(); this.byTile = new Map(); this.at = this.at.bind(this); }
  add(key, raster) {
    const R = decodeTerrainRaster(raster);
    this.rasters.set(key, R);
    // a raster that is a whole 1 km tile is found by its place, the province has thousands
    if (R.w * R.cell === TILE) this.byTile.set(`${Math.floor((R.x0 - GRID_X0 + 1) / TILE)},${Math.floor((R.y0 - GRID_Y0 + 1) / TILE)}`, R);
  }
  drop(key) {
    const R = this.rasters.get(key);
    if (R) this.byTile.delete(`${Math.floor((R.x0 - GRID_X0 + 1) / TILE)},${Math.floor((R.y0 - GRID_Y0 + 1) / TILE)}`);
    this.rasters.delete(key);
  }
  get size() { return this.rasters.size; }
  at(x, y) {
    const T = this.byTile.get(`${Math.floor((x - GRID_X0) / TILE)},${Math.floor((y - GRID_Y0) / TILE)}`);
    if (T) { const z = sampleRaster(T, x, y); if (z !== null) return z; }
    for (const R of this.rasters.values()) {
      if (R === T) continue;
      if (x < R.x0 || y < R.y0 || x > R.x0 + R.w * R.cell || y > R.y0 + R.h * R.cell) continue;
      const z = sampleRaster(R, x, y);
      if (z !== null) return z;
    }
    return 0;
  }
}

export const flatTerrain = () => 0;
