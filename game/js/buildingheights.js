// Building heights and roof shapes (docs/PROVINCIE-PLAN.md 0.1): the fallback
// chain from measured to guessed, and what the renderer makes of it. Pure:
// the packer (pack_tiles.mjs joinAttrs), the build step
// (scripts/world/building_heights.mjs) and the game share it.
//
//   3dbag       3D BAG (CC BY 4.0): roof heights above the ground level
//   osm_height  OSM height=*
//   osm_levels  OSM building:levels (+ roof:levels) x 3.1 m
//   default     the map's own guess (b.h levels x 3.1 m)

export const LEVEL_M = 3.1;

// 3D BAG b3_dak_type and OSM roof:shape to the renderer's roof:
// 'gable' | 'hip' | 'flat' | 'shed' | 'mansard' | 'sawtooth' | null (unknown)
const OSM_ROOF = {
  gabled: 'gable', 'double_saltbox': 'gable', saltbox: 'gable', gambrel: 'mansard', mansard: 'mansard',
  hipped: 'hip', 'half-hipped': 'hip', pyramidal: 'hip', 'side_hipped': 'hip', flat: 'flat', skillion: 'shed',
  sawtooth: 'sawtooth', round: 'flat', dome: 'flat', onion: 'flat',
};
export function roofOf(attrs) {
  const r = attrs && attrs.roof;
  if (!r) return null;
  if (OSM_ROOF[r]) return OSM_ROOF[r];
  if (r === 'slanted') return 'gable';
  if (r === 'horizontal' || r === 'multiple horizontal') return 'flat';
  return null;
}

// The height of a building and where it came from: { hm (ridge, m above the
// ground), eave (m: the walls' height; the ridge for a flat roof), src, roof }
// osm: the OSM attribute record (building_attrs.py), bag: the 3D BAG record
// (fetch_3dbag.py), levels: the map's own levels (b.h).
// fits: whether the renderer can put a pitched roof on the footprint
// (pitchedFits); where it cannot, the walls go half way up the roof.
export function heightOf(osm, bag, levels, fits = true) {
  if (bag && Number.isFinite(bag.hmax) && Number.isFinite(bag.hg)) {
    const hm = Math.max(2, bag.hmax - bag.hg);
    let roof = roofOf(osm && osm.roof ? osm : bag) || roofOf(bag);
    let eave = hm;
    if (roof && roof !== 'flat' && Number.isFinite(bag.h50)) {
      // a symmetric pitched roof has its median height half way up: the
      // walls end as far under it as the ridge is above it. A median far
      // under the ridge is no roof but a low wing beside a tall part (one
      // footprint for a tower and its plinth): then the tall part's height,
      // flat on top, as the map always drew it; a median at the ridge is a
      // roof too flat to draw pitched
      const half = hm - (bag.h50 - bag.hg);
      if (half >= 0.4 && half <= Math.min(5, 0.35 * hm)) {
        eave = Math.max(2.4, hm - 2 * half);
        if (!fits) { eave = (eave + hm) / 2; roof = 'flat'; }
      } else roof = 'flat';
    }
    return { hm: round2(hm), eave: round2(eave), src: '3dbag', roof };
  }
  if (osm && osm.h) return { hm: osm.h, eave: osm.h, src: 'osm_height', roof: roofOf(osm) };
  if (osm && osm.lv) {
    const hm = round2(osm.lv * LEVEL_M + (osm.rl || 0) * LEVEL_M);
    return { hm, eave: round2(osm.lv * LEVEL_M), src: 'osm_levels', roof: roofOf(osm) };
  }
  const hm = round2((levels || 1) * LEVEL_M);
  return { hm, eave: hm, src: 'default', roof: roofOf(osm) };
}

// The map's `h` (storeys of LEVEL_M, the renderer's body height) for a
// measured height: the walls; the renderer puts the pitched roof on top.
export function levelsFor(eave) {
  return Math.max(0.8, Math.round((eave / LEVEL_M) * 10) / 10);
}

// Can the renderer draw a pitched roof on this footprint? (models3d_buildings.js
// rectangularFrame: the smallest rectangle along one of its edges, filled at
// least 85 %, and a short side of at most 16 m)
export function pitchedFits(pts) {
  let area2 = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) area2 += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.05) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of pts) {
      const u = p[0] * ux + p[1] * uy, v = -p[0] * uy + p[1] * ux;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, short: Math.min(u1 - u0, v1 - v0) };
  }
  return !!best && Math.abs(area2) / 2 / best.area >= 0.85 && best.short <= 16;
}

// a BAG id as the 3D BAG and OSM write it (leading zeros, a prefix)
export const bagKey = (id) => String(id).replace(/^NL\.IMBAG\.Pand\./, '').replace(/^0+/, '');

const round2 = (v) => Math.round(v * 100) / 100;
