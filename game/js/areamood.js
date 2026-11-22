// Region mood (22-11): three special areas get their own light, also in clear weather, so a player can tell
// where he is from the air alone. Always summer: this is haze and colour, never cold.
//   wad      the Wadden coast and the sea behind it: silver-blue salt haze, a bright wide horizon, a stronger sun glow
//   lauwers  the Lauwersmeer: soft green-blue damp air, with a thin extra veil around sunrise and sunset
//   veen     the Veenkoloniën (Veendam to Ter Apel): warm amber peat dust, strongest in the golden hour
// Pure numbers, no THREE and no world data: the zones are simple shapes in world metres (x east, y south, the
// city centre at 0,0; rdnew.js). The weights are continuous in the position, so walking or driving in never shows
// a border; weather.js eases them in time for a jump (fast travel). weather.js multiplies the fog and horizon
// colour by `tint`, shortens the fog distance by `haze` and scales the horizon glow by `glow`: the existing fog and
// sky uniforms only, no draw call, no shader work. Local per player: everyone sees the mood of his own spot.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The zones. `full` is where the mood counts fully, `edge` where it has faded to nothing (metres).
export const MOOD_AREAS = Object.freeze({
  wad: Object.freeze({ naam: 'Waddenkust', edgeY: -16000, fullY: -22000 }),
  lauwers: Object.freeze({ naam: 'Lauwersmeer', x: -23300, y: -15600, full: 4000, edge: 9500 }),
  veen: Object.freeze({ naam: 'Veenkoloniën', x0: 20800, y0: 10600, x1: 34800, y1: 38100, full: 5000, edge: 12000 }),
});
export const MOOD_IDS = Object.freeze(['wad', 'lauwers', 'veen']);

// What each mood does at full weight: tint multiplies the fog and horizon colour (linear), haze is the share the
// fog distance shortens, glow scales the sunrise and sunset glow, lowSun is the extra haze with the sun near the
// horizon (the veil over the Lauwersmeer), golden how much stronger the tint is with a low sun (the listed tint is
// the low-sun one; at noon it is 1 / (1 + golden) of that).
export const MOOD_LOOK = Object.freeze({
  wad: Object.freeze({ tint: [0.92, 1.0, 1.1], haze: 0.12, glow: 1.3, lowSun: 0, golden: 0.4 }),
  lauwers: Object.freeze({ tint: [0.93, 1.06, 1.0], haze: 0.08, glow: 1.15, lowSun: 0.08, golden: 0.4 }),
  veen: Object.freeze({ tint: [1.1, 1.0, 0.86], haze: 0.06, glow: 1.1, lowSun: 0, golden: 0.7 }),
});
export const MOOD_HAZE_MAX = 0.22; // the fog never shortens more than this, however the zones stack
export const MOOD_EASE_S = 5;      // seconds the weights take to follow a jump in position

// Distance from (x, y) to the segment (x0, y0)-(x1, y1).
function segmentDistance(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const t = clamp01(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy));
  return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t));
}

// The weight 0..1 of each mood at a world position. A position that is not a number has no mood.
export function areaMoodWeights(x, y, out = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) { out.wad = 0; out.lauwers = 0; out.veen = 0; return out; }
  const Z = MOOD_AREAS;
  out.wad = smooth(Z.wad.edgeY, Z.wad.fullY, y);
  out.lauwers = smooth(Z.lauwers.edge, Z.lauwers.full, Math.hypot(x - Z.lauwers.x, y - Z.lauwers.y));
  out.veen = smooth(Z.veen.edge, Z.veen.full, segmentDistance(x, y, Z.veen.x0, Z.veen.y0, Z.veen.x1, Z.veen.y1));
  return out;
}

// The strongest mood at a position ('' outside every zone): for debug info and tests.
export function areaMoodId(x, y) {
  const w = areaMoodWeights(x, y, _w);
  let best = '', top = 0.05;
  for (const id of MOOD_IDS) if (w[id] > top) { top = w[id]; best = id; }
  return best;
}
const _w = {};

// The look for a set of weights and a sun height (degrees). out.tint is reused between frames.
//   tint  multiplier per channel for the fog and horizon colour (1,1,1 = unchanged)
//   haze  0..MOOD_HAZE_MAX, the share the fog distance shortens
//   glow  multiplier for the sunrise and sunset glow at the horizon
export function areaMoodLook(weights, elevation = 30, out = {}) {
  const tint = out.tint || (out.tint = [1, 1, 1]);
  tint[0] = 1; tint[1] = 1; tint[2] = 1;
  let haze = 0, glow = 1;
  const e = Number.isFinite(elevation) ? elevation : 30;
  const low = smooth(25, 4, Math.abs(e));      // 1 with the sun near the horizon, 0 high in the sky or deep at night
  const day = 0.35 + 0.65 * smooth(-12, -2, e); // the night keeps a third of the colour: it stays night
  for (const id of MOOD_IDS) {
    const w = clamp01(weights ? weights[id] || 0 : 0);
    if (w <= 0) continue;
    const L = MOOD_LOOK[id];
    const k = w * day * (1 + L.golden * low) / (1 + L.golden);
    for (let i = 0; i < 3; i++) tint[i] += (L.tint[i] - 1) * k;
    haze += w * (L.haze + L.lowSun * low);
    glow += (L.glow - 1) * w;
  }
  out.haze = Math.min(MOOD_HAZE_MAX, haze);
  out.glow = glow;
  return out;
}
