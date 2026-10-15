// RD New (EPSG:28992) and the game frame (docs/PROVINCIE-PLAN.md 1.5).
//
// The game frame is RD shifted to the old origin and flipped so y is south:
//   x = RD_x - 233670,  y = -(RD_y - 582075)
// (233670, 582075) is the RD point of 53.2195 N / 6.565 E, the centre of the
// original city core, rounded to the metre.
//
// wgsToRd/rdToWgs are the Schreutelkamp & Strang van Hees approximation
// (~0.5 m against RDNAPTRANS round Groningen, see scripts/rdnew_test.mjs).
// Only + and * on doubles, in a fixed order, so this module and
// scripts/world/rdnew.py give bit-identical results.
//
// The "legacy" frame is the equirectangular projection the game used up to
// 0.28 (origin 53.2195 / 6.565, 110574 m per degree of latitude,
// 111320 cos(53.2195) per degree of longitude). legacyToWorld converts a
// position from that frame; it is the one function for the map builder,
// the hand-placed coordinates (P in worldframe.js) and old saves.

export const RD_ORIGIN_X = 233670;
export const RD_ORIGIN_Y = 582075;

export const LEGACY_LAT0 = 53.2195;
export const LEGACY_LON0 = 6.5649999999999995;
export const LEGACY_M_LAT = 110574.0;
export const LEGACY_M_LON = 66652.96616805792;

const PHI0 = 52.15517440, LAM0 = 5.38720621;

export function wgsToRd(lat, lon) {
  const dp = 0.36 * (lat - PHI0), dl = 0.36 * (lon - LAM0);
  const dp2 = dp * dp, dp3 = dp2 * dp, dp4 = dp3 * dp;
  const dl2 = dl * dl, dl3 = dl2 * dl, dl4 = dl3 * dl;
  const x = 155000 + (190094.945 * dl + -11832.228 * dp * dl + -114.221 * dp2 * dl + -32.391 * dl3
    + -0.705 * dp + -2.340 * dp3 * dl + -0.608 * dp * dl3 + -0.008 * dl2 + 0.148 * dp2 * dl3);
  const y = 463000 + (309056.544 * dp + 3638.893 * dl2 + 73.077 * dp2 + -157.984 * dp * dl2
    + 59.788 * dp3 + 0.433 * dl + -6.439 * dp2 * dl2 + -0.032 * dp * dl + 0.092 * dl4 + -0.054 * dp * dl4);
  return [x, y];
}

function rdToWgsApprox(x, y) {
  const dx = (x - 155000) * 1e-5, dy = (y - 463000) * 1e-5;
  const dx2 = dx * dx, dx3 = dx2 * dx, dx4 = dx3 * dx, dx5 = dx4 * dx;
  const dy2 = dy * dy, dy3 = dy2 * dy, dy4 = dy3 * dy;
  const lat = PHI0 + (3235.65389 * dy + -32.58297 * dx2 + -0.24750 * dy2 + -0.84978 * dx2 * dy
    + -0.06550 * dy3 + -0.01709 * dx2 * dy2 + -0.00738 * dx + 0.00530 * dx4 + -0.00039 * dx2 * dy3
    + 0.00033 * dx4 * dy + -0.00012 * dx * dy) / 3600;
  const lon = LAM0 + (5260.52916 * dx + 105.94684 * dx * dy + 2.45656 * dx * dy2 + -0.81885 * dx3
    + 0.05594 * dx * dy3 + -0.05607 * dx3 * dy + 0.01199 * dy + -0.00256 * dx3 * dy2
    + 0.00128 * dx * dy4 + 0.00022 * dy2 + -0.00022 * dx2 + 0.00026 * dx5) / 3600;
  return [lat, lon];
}

// The approximate inverse, refined twice against wgsToRd so that
// wgsToRd(rdToWgs(p)) == p to well under a millimetre.
export function rdToWgs(x, y) {
  let [lat, lon] = rdToWgsApprox(x, y);
  for (let i = 0; i < 2; i++) {
    const [fx, fy] = wgsToRd(lat, lon);
    const [la, lo] = rdToWgsApprox(fx, fy);
    const [ta, to] = rdToWgsApprox(x, y);
    lat += ta - la;
    lon += to - lo;
  }
  return [lat, lon];
}

export const rdToWorld = (rx, ry) => [rx - RD_ORIGIN_X, RD_ORIGIN_Y - ry];
export const worldToRd = (x, y) => [x + RD_ORIGIN_X, RD_ORIGIN_Y - y];

export function wgsToWorld(lat, lon) {
  const [rx, ry] = wgsToRd(lat, lon);
  return [rx - RD_ORIGIN_X, RD_ORIGIN_Y - ry];
}

export function worldToWgs(x, y) {
  return rdToWgs(x + RD_ORIGIN_X, RD_ORIGIN_Y - y);
}

export const legacyToWgs = (x, y) => [LEGACY_LAT0 - y / LEGACY_M_LAT, LEGACY_LON0 + x / LEGACY_M_LON];
export const wgsToLegacy = (lat, lon) => [(lon - LEGACY_LON0) * LEGACY_M_LON, (LEGACY_LAT0 - lat) * LEGACY_M_LAT];

export function legacyToWorld(x, y) {
  const [lat, lon] = legacyToWgs(x, y);
  return wgsToWorld(lat, lon);
}

export function worldToLegacy(x, y) {
  const [lat, lon] = worldToWgs(x, y);
  return wgsToLegacy(lat, lon);
}

// A heading (radians, 0 = +x, y south) at legacy point (x, y), turned into
// the world frame: the direction of a 1 m step through the projection.
export function legacyAngleToWorld(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const [x0, y0] = legacyToWorld(x, y);
  const [x1, y1] = legacyToWorld(x + c, y + s);
  return a + Math.atan2(Math.sin(Math.atan2(y1 - y0, x1 - x0) - a), Math.cos(Math.atan2(y1 - y0, x1 - x0) - a));
}

// Angle (radians) from the world frame's grid north (-y) to true north at
// world point (x, y), positive when true north is turned towards +x.
// Sun, moon and compass are true north; the map grid is RD.
export function gridConvergenceAt(x, y) {
  const [lat, lon] = worldToWgs(x, y);
  const [ax, ay] = wgsToWorld(lat - 0.0005, lon);
  const [bx, by] = wgsToWorld(lat + 0.0005, lon);
  return Math.atan2(bx - ax, -(by - ay));
}

export const GRID_CONVERGENCE = gridConvergenceAt(0, 0);
