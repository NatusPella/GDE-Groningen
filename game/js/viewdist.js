// Zichtafstand: the view distance (m) per setting and what follows from it.
// Pure, so scripts/gfx_profile_test.mjs and scripts/viewdist_estimate.mjs can
// use it in Node.

export const VIEW_DISTANCES = { kort: 150, normaal: 350, ver: 600, heelver: 900 };
export const DRAW_DISTANCE_LABELS = { kort: 'kort', normaal: 'normaal', ver: 'ver', heelver: 'heel ver' };

// The view distance in use. 'heel ver' (Ultra) drops back to 'ver' only in the city (ctx 'stad'), and only when the render scale can no
// longer save it: the CPU cannot keep up (cpuLevel 2 or more) or the resolution is already at its floor (VIEW_FALLBACK_SCALE). In the air
// and on the water (ctx 'lucht', 'water') Ultra keeps its view (decision 24-11). Hysteresis: cpuLevel and the scale have their own
// (gfxprofile.js), the context has it in viewContext below.
export const VIEW_FALLBACK_SCALE = 0.6;
// 24-11 (wereldbugs: cpuLevel 3 zette Hoog/normaal op 'kort', 150 m met mist vanaf 60 m: een mistsoep, de klacht van de eigenaar
// "Hoog heeft veel te korte zichtafstand"): de adaptieve terugval verlaagt eerst renderschaal, schaduwen, gevels en drukte
// (gfxprofile.js, scene3d.js); de zichtafstand zakt hooguit één trap en nooit onder viewFloor (de gekozen stand, en minstens 'normaal'
// tenzij de speler zelf 'kort' koos). scripts/viewdist_test.mjs controleert dat voor elk cpuLevel.
const VIEW_ORDER = ['kort', 'normaal', 'ver', 'heelver'];
export function viewFloor(setting) {
  const i = VIEW_ORDER.indexOf(setting);
  if (i <= 0) return VIEW_DISTANCES.kort;
  return Math.max(VIEW_DISTANCES.normaal, VIEW_DISTANCES[VIEW_ORDER[i - 1]]);
}
export function viewDistanceFor(setting, scale = 1, cpuLvl = 0, ctx = 'stad') {
  if (!VIEW_DISTANCES[setting]) setting = 'normaal';
  // cpuLevel 3 (scripts/perf/zwak.mjs): één trap omlaag, niet lager dan viewFloor
  if (cpuLvl >= 3) return Math.max(viewFloor(setting), VIEW_DISTANCES[VIEW_ORDER[Math.max(0, VIEW_ORDER.indexOf(setting) - 1)]]);
  // 'heel ver' zakt alleen in de stad naar 'ver', en pas als de renderschaal het niet meer redt. Tot 23-11 gaf al 90% renderschaal 'ver',
  // zodat Ultra onder belasting stil een Hoog werd.
  if (setting === 'heelver' && ctx === 'stad' && (cpuLvl >= 2 || scale <= VIEW_FALLBACK_SCALE)) setting = 'ver';
  return VIEW_DISTANCES[setting] || VIEW_DISTANCES.normaal;
}

// Waar de camera is, voor viewDistanceFor: 'lucht' (hoog boven de grond), 'water' (op een boot) of 'stad'. Met hysterese op de hoogte:
// pas boven enterM 'lucht', pas onder leaveM weer 'stad', zodat een helikopter op 40 m niet heen en weer wisselt.
export const VIEW_CTX = { enterM: 45, leaveM: 30 };
export function viewContext(prev, camHeight, onBoat, p = VIEW_CTX) {
  if (onBoat) return 'water';
  if (camHeight > p.enterM) return 'lucht';
  if (prev === 'lucht' && camHeight > p.leaveM) return 'lucht';
  return 'stad';
}
// Mist (Hoog en Ultra): zachte atmosferische diepte in plaats van een muur. De mist begint op minstens FOG_NEAR_SHARE van de
// zichtafstand (op 'kort' liep hij van 63 tot 153 m: een muur die het landschap wegsnijdt) en is dicht op de zichtafstand zelf.
// Puur, zodat scripts/viewdist_test.mjs de reeks per stand narekent. drawDist: de detailring (DRAW_DIST in scene3d.js).
export const FOG_NEAR_SHARE = 0.4;
// 24-11: bij 350 m of meer begint de mist nooit binnen FOG_MIN_NEAR (ook niet met de kleine detailring van cpuLevel 3)
export const FOG_MIN_NEAR = 150;
export function fogRange(viewDist, drawDist) {
  const base = drawDist * 0.45 + (viewDist - 150) * 0.25;
  return { near: Math.max(base, viewDist * FOG_NEAR_SHARE, viewDist >= 350 ? FOG_MIN_NEAR : 0), far: viewDist * 1.02 };
}

// The high-detail radius (scene3d.js DRAW_DIST: full buildings, roads, street
// furniture, walkers) per quality profile. It was one 140 m for everyone; a
// better profile with a view distance of 350 m or more gets a bigger ring.
// The cost grows with the area: DETAIL_DIST[q]^2 / 140^2 times the meshes of
// the ring (hoog 1.47x since #1039 (170 m)), which stays inside the Hoog budget (GPU <= 1.2 GB):
// scripts/viewdist_test.mjs keeps that ratio under DETAIL_AREA_MAX.
export const DETAIL_BASE = 140;
// #1039: hoog 190 -> 170 m: de ring kost met het kwadraat van de straal (190 m = 1,84x de meshes van 140 m, 170 m = 1,47x); de verre laag neemt de gebouwen
// tussen 170 en 190 m over (zelfde palet en vensterraster). Ultra tekent daardoor ca. een vijfde minder losse gebouwen, wegen en gevels.
export const DETAIL_DIST = { laag: 140, middel: 160, hoog: 170 };
export const DETAIL_AREA_MAX = 2;
// cpuLevel 3 (viewdist.js viewDistanceFor) also shrinks the ring to DETAIL_WEAK m: a third of the meshes
export const DETAIL_WEAK = 100;
export function detailDistanceFor(quality, viewDist, cpuLvl = 0) {
  if (cpuLvl >= 3) return DETAIL_WEAK;
  if (!(viewDist >= 350)) return DETAIL_BASE;
  return DETAIL_DIST[quality] || DETAIL_BASE;
}

// Rails and trains (railway3d.js) are long thin things that show on the
// horizon, so they reach further than the 190 m they were fixed at: the view
// distance times RAIL_VIEW.factor, within [min, max]. Memory: a chunk of
// track is a few hundred KB of geometry, shared materials; RAIL_CHUNK_MB is
// the budget estimate per chunk (scripts/viewdist_test.mjs keeps the worst
// case far under the GPU budget of 1.2 GB on Hoog).
export const RAIL_VIEW = { min: 190, factor: 1.15, max: 800 };
export const RAIL_CHUNK = 250;
export const RAIL_CHUNK_MB = 0.5;
export function railViewDistance(viewDist, cfg = RAIL_VIEW) {
  return Math.min(cfg.max, Math.max(cfg.min, viewDist * cfg.factor));
}
// whether the chunk centred on (cx, cy) is built and shown with the focus at (px, py) and
// a rail reach of `view`: the square of the reach plus the half diagonal of a chunk
// (railway3d.js syncChunks; pure so scripts/rail_lod_test.mjs can check it per distance)
export function railChunkWanted(cx, cy, px, py, view) {
  const reach = view + RAIL_CHUNK * 0.71;
  return Math.abs(cx - px) < reach && Math.abs(cy - py) < reach;
}
// most chunks that can be resident at that reach (every cell of the square full)
export function railChunkCount(view) {
  const n = Math.ceil((2 * (view + RAIL_CHUNK * 0.71)) / RAIL_CHUNK) + 1;
  return n * n;
}

// Ommeland props (countryside.js) stream a little past the fog; beyond 'ver'
// they stop at 95% of the view distance, where the fog has nearly hidden them
// and the skyline belts take over.
export function propRadius(viewDist) {
  return Math.min(Math.max(620, viewDist * 0.95), Math.max(260, viewDist + 60));
}


