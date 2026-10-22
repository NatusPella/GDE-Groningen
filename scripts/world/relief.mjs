// The relief of the AHN terrain (#269): the height of the ground above a smooth local datum, not m NAP.
//
// The game's whole world is built flat: buildings, trees, water and props stand at y = 0, the street level of the place. A terrain
// that is drawn and driven in m NAP (a polder at -1, the city at +2, a village on a wierde at +4, a dyke at +6) would leave all of
// that 1 to 6 m below or over the ground. What ?terrain shows is the relief: how far the ground rises above what is around it.
//   datum  = the opening of the terrain (the lowest ground within RADIUS m, then the highest of that: a mound or dyke narrower
//            than twice RADIUS is gone, a slope is kept), smoothed over BLUR m
//   relief = max(0, terrain - datum - DEADBAND)
// A wierde, a dyke, an approach ramp or a hill stand out at their height; the plain is 0, as the flat world has it. It is the one
// field the height solver (profile.mjs onTerrain), the game (mapdata.js terrainAt), the drawn ground and the audits share; the
// build writes it as the RASTER section of a tile (pack_tiles.mjs) so the game needs no datum of its own.
import { decodeTerrainRaster, encodeTerrainRaster, sampleRaster } from '../../game/js/terrainraster.js';

export const GRID = 25;        // m: the cell of the datum grid
export const RADIUS = 250;     // m: the opening
export const BLUR = 100;       // m
export const SMOOTH = 60;      // m
export const DEADBAND = 0.15;  // m of relief that is taken for noise of the ground

// separable running min / max / mean over a (2k + 1) window on a w x h grid; NaN cells are skipped
function filter(src, w, h, k, kind) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const pass = (a, b, n, len, stride, step) => {
    for (let line = 0; line < n; line++) {
      const base = line * step;
      for (let i = 0; i < len; i++) {
        let m = kind === 'min' ? Infinity : kind === 'max' ? -Infinity : 0, c = 0;
        const lo = Math.max(0, i - k), hi = Math.min(len - 1, i + k);
        for (let j = lo; j <= hi; j++) {
          const v = a[base + j * stride];
          if (v !== v) continue;
          if (kind === 'min') { if (v < m) m = v; } else if (kind === 'max') { if (v > m) m = v; } else m += v;
          c++;
        }
        b[base + i * stride] = c ? (kind === 'mean' ? m / c : m) : NaN;
      }
    }
  };
  pass(src, tmp, h, w, 1, w);     // along x
  pass(tmp, out, w, h, w, 1);     // along y
  return out;
}

// The datum grid of a set of decoded rasters (Map key -> raster with z): { x0, y0, nx, ny, cell, z }
export function datumGrid(rasters, { cell = GRID, radius = RADIUS, blur = BLUR } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const R of rasters.values()) {
    x0 = Math.min(x0, R.x0); y0 = Math.min(y0, R.y0);
    x1 = Math.max(x1, R.x0 + R.w * R.cell); y1 = Math.max(y1, R.y0 + R.h * R.cell);
  }
  x0 = Math.floor(x0 / cell) * cell; y0 = Math.floor(y0 / cell) * cell;
  const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell);
  const g = new Float32Array(nx * ny).fill(NaN);
  for (const R of rasters.values()) {
    const i0 = Math.max(0, Math.floor((R.x0 - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((R.x0 + R.w * R.cell - x0) / cell));
    const j0 = Math.max(0, Math.floor((R.y0 - y0) / cell)), j1 = Math.min(ny - 1, Math.ceil((R.y0 + R.h * R.cell - y0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const wx = x0 + (i + 0.5) * cell, wy = y0 + (j + 0.5) * cell;
      if (wx < R.x0 || wy < R.y0 || wx >= R.x0 + R.w * R.cell || wy >= R.y0 + R.h * R.cell) continue;
      const v = sampleRaster(R, wx, wy);
      if (v !== null) g[j * nx + i] = v;
    }
  }
  const k = Math.round(radius / cell), kb = Math.round(blur / cell);
  // (the ground is smoothed first: the bottom of a ditch is not the level of the field)
  const smooth = filter(g, nx, ny, Math.max(1, Math.round(SMOOTH / cell)), 'mean');
  const opened = filter(filter(smooth, nx, ny, k, 'min'), nx, ny, k, 'max');
  // (the opening is only defined where the terrain is: elsewhere the blur skips the cell)
  const z = filter(opened, nx, ny, kb, 'mean');
  return { x0, y0, nx, ny, cell, z };
}

// bilinear datum at (x, y); null outside the grid or where it has no value
export function datumAt(D, x, y) {
  const u = (x - D.x0) / D.cell - 0.5, v = (y - D.y0) / D.cell - 0.5;
  const i = Math.max(0, Math.min(D.nx - 2, Math.floor(u))), j = Math.max(0, Math.min(D.ny - 2, Math.floor(v)));
  const fu = Math.max(0, Math.min(1, u - i)), fv = Math.max(0, Math.min(1, v - j));
  const a = D.z[j * D.nx + i], b = D.z[j * D.nx + i + 1], c = D.z[(j + 1) * D.nx + i], d = D.z[(j + 1) * D.nx + i + 1];
  const ok = [a, b, c, d].filter((q) => q === q);
  if (!ok.length) return null;
  if (ok.length < 4) return ok.reduce((s, q) => s + q, 0) / ok.length;
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}

export const reliefOf = (t, datum) => (datum === null ? 0 : Math.max(0, t - datum - DEADBAND));

// Rasters in m NAP (terrain.mjs loadTerrainRasters, encoded) -> the same rasters as relief (int16 cm, same cells)
export function reliefRasters(rasters, opts) {
  const dec = new Map([...rasters].map(([k, r]) => [k, decodeTerrainRaster(r)]));
  const D = datumGrid(dec, opts);
  const out = new Map();
  for (const [k, R] of dec) {
    const values = new Array(R.w * R.h);
    for (let j = 0; j < R.h; j++) for (let i = 0; i < R.w; i++) {
      const t = R.z[j * R.w + i];
      values[j * R.w + i] = Number.isFinite(t) ? reliefOf(t, datumAt(D, R.x0 + (i + 0.5) * R.cell, R.y0 + (j + 0.5) * R.cell)) : NaN;
    }
    out.set(k, encodeTerrainRaster({ x0: R.x0, y0: R.y0, cell: R.cell, w: R.w, h: R.h, values }));
  }
  return { rasters: out, datum: D };
}
