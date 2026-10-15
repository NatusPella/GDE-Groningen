// RD New and the world frame (game/js/rdnew.js, game/js/worldframe.js).
//   node scripts/rdnew_test.mjs
// - the Amersfoort origin and the plan's frame origin (PROVINCIE-PLAN 1.5)
// - the approximation against a rigorous EPSG:28992 (oblique stereographic on
//   Bessel 1841 + the 7-parameter datum shift) over the whole province
// - bit-identical with the Python twin (scripts/fixtures/rdnew_points.json,
//   written by scripts/world/rdnew_test.py --write)
// - round trips, the grid convergence, and the legacy -> world helpers
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../game/js/rdnew.js';
import { P, PO, P3, PA, PL, PB, L } from '../game/js/worldframe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const d2r = Math.PI / 180;

// rigorous RD: WGS84 -> Bessel (Helmert, position vector) -> oblique stereographic
function rigorousRd(lat, lon) {
  const toEcef = (phi, lam, a, f) => {
    const e2 = 2 * f - f * f, s = Math.sin(phi), N = a / Math.sqrt(1 - e2 * s * s);
    return [N * Math.cos(phi) * Math.cos(lam), N * Math.cos(phi) * Math.sin(lam), N * (1 - e2) * s];
  };
  const [X, Y, Z] = toEcef(lat * d2r, lon * d2r, 6378137, 1 / 298.257223563);
  const sec = d2r / 3600;
  const tx = 565.417, ty = 50.3319, tz = 465.552, rx = -0.398957 * sec, ry = 0.343988 * sec, rz = -1.8774 * sec, sc = 4.0725e-6;
  // X_wgs = T + (1 + s) R X_bes, R = [[1, -rz, ry], [rz, 1, -rx], [-ry, rx, 1]]; invert (R^T, small angles)
  const u = (X - tx) / (1 + sc), v = (Y - ty) / (1 + sc), w = (Z - tz) / (1 + sc);
  const Xb = u + rz * v - ry * w, Yb = -rz * u + v + rx * w, Zb = ry * u - rx * v + w;
  const a = 6377397.155, f = 1 / 299.1528128, e2 = 2 * f - f * f, e = Math.sqrt(e2);
  const p = Math.hypot(Xb, Yb);
  let phi = Math.atan2(Zb, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const s = Math.sin(phi), N = a / Math.sqrt(1 - e2 * s * s);
    phi = Math.atan2(Zb + e2 * N * s, p);
  }
  const lam = Math.atan2(Yb, Xb);
  const phi0 = (52 + 9 / 60 + 22.178 / 3600) * d2r, lam0 = (5 + 23 / 60 + 15.5 / 3600) * d2r, k0 = 0.9999079;
  const s0 = Math.sin(phi0);
  const rho0 = a * (1 - e2) / Math.pow(1 - e2 * s0 * s0, 1.5), nu0 = a / Math.sqrt(1 - e2 * s0 * s0);
  const Rr = Math.sqrt(rho0 * nu0);
  const nn = Math.sqrt(1 + e2 * Math.pow(Math.cos(phi0), 4) / (1 - e2));
  const S1 = (1 + s0) / (1 - s0), S2 = (1 - e * s0) / (1 + e * s0);
  const w1 = Math.pow(S1 * Math.pow(S2, e), nn);
  const sinChi00 = (w1 - 1) / (w1 + 1);
  const c = (nn + s0) * (1 - sinChi00) / ((nn - s0) * (1 + sinChi00));
  const w2 = c * w1;
  const chi0 = Math.asin((w2 - 1) / (w2 + 1));
  const Lam = nn * (lam - lam0) + lam0;
  const sp = Math.sin(phi);
  const Sa = (1 + sp) / (1 - sp), Sb = (1 - e * sp) / (1 + e * sp);
  const ww = c * Math.pow(Sa * Math.pow(Sb, e), nn);
  const chi = Math.asin((ww - 1) / (ww + 1));
  const B = 1 + Math.sin(chi) * Math.sin(chi0) + Math.cos(chi) * Math.cos(chi0) * Math.cos(Lam - lam0);
  return [
    155000 + 2 * Rr * k0 * Math.cos(chi) * Math.sin(Lam - lam0) / B,
    463000 + 2 * Rr * k0 * (Math.sin(chi) * Math.cos(chi0) - Math.cos(chi) * Math.sin(chi0) * Math.cos(Lam - lam0)) / B,
  ];
}

// the reference point of the approximation and of RD itself
{
  const [x, y] = R.wgsToRd(52.15517440, 5.38720621);
  ok(x === 155000 && y === 463000, 'Amersfoort -> RD', `${x}, ${y}`);
  const [la, lo] = R.rdToWgs(155000, 463000);
  ok(Math.abs(la - 52.15517440) < 1e-12 && Math.abs(lo - 5.38720621) < 1e-12, 'RD -> Amersfoort');
  const [rx, ry] = rigorousRd(52.15517440, 5.38720621);
  ok(Math.hypot(rx - 155000, ry - 463000) < 1.5, 'rigorous Amersfoort', `${rx.toFixed(2)}, ${ry.toFixed(2)}`);
}

// the frame origin (the old origin's RD point, PROVINCIE-PLAN 1.5)
{
  const [x, y] = R.wgsToRd(53.2195, 6.565);
  ok(Math.abs(x - R.RD_ORIGIN_X) < 1 && Math.abs(y - R.RD_ORIGIN_Y) < 1, 'origin 53.2195/6.565 -> (233670, 582075) to the metre', `${x.toFixed(2)}, ${y.toFixed(2)}`);
}

// approximation vs rigorous over the province (52.9..53.6 N, 6.1..7.25 E)
{
  let worst = 0, worstAt = '', worstCity = 0;
  for (let lat = 52.9; lat <= 53.6001; lat += 0.05) {
    for (let lon = 6.1; lon <= 7.2501; lon += 0.05) {
      const a = R.wgsToRd(lat, lon), b = rigorousRd(lat, lon);
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > worst) { worst = d; worstAt = `${lat.toFixed(2)},${lon.toFixed(2)}`; }
      if (Math.abs(lat - 53.22) < 0.15 && Math.abs(lon - 6.57) < 0.2) worstCity = Math.max(worstCity, d);
    }
  }
  console.log(`approximation vs rigorous: province worst ${worst.toFixed(2)} m at ${worstAt}, round the city ${worstCity.toFixed(2)} m`);
  ok(worst < 1.5, 'approximation within 1.5 m of rigorous RD over the province', worst.toFixed(2));
  ok(worstCity < 1.0, 'approximation within 1 m round the city', worstCity.toFixed(2));
}

// distances: RD is (nearly) true metres - a 10 km east-west line at 53.22 N
{
  const lat = 53.22, dLon = 10000 / (111412.84 * Math.cos(lat * d2r) - 93.5 * Math.cos(3 * lat * d2r));
  const a = R.wgsToRd(lat, 6.5), b = R.wgsToRd(lat, 6.5 + dLon);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ok(Math.abs(d - 10000) < 1.5, 'RD scale round Groningen within 150 ppm', d.toFixed(2));
}

// round trips
{
  let worst = 0, worstL = 0;
  for (let x = -40000; x <= 45000; x += 2500) {
    for (let y = -42000; y <= 40000; y += 2500) {
      const [la, lo] = R.worldToWgs(x, y);
      const [bx, by] = R.wgsToWorld(la, lo);
      worst = Math.max(worst, Math.hypot(bx - x, by - y));
      const [lx, ly] = R.worldToLegacy(x, y);
      const [cx, cy] = R.legacyToWorld(lx, ly);
      worstL = Math.max(worstL, Math.hypot(cx - x, cy - y));
    }
  }
  ok(worst < 1e-6, 'world -> wgs -> world', worst);
  ok(worstL < 1e-6, 'world -> legacy -> world', worstL);
}

// convergence: true north is turned ~0.94 deg from grid north round Stad
{
  const deg = R.GRID_CONVERGENCE / d2r;
  ok(Math.abs(Math.abs(deg) - 0.937) < 0.01, 'grid convergence at the origin', deg.toFixed(4));
  // east of the RD meridian, true north leans west of grid north: negative
  ok(deg < 0, 'convergence sign');
}

// legacy -> world: same real place
{
  const [x, y] = R.legacyToWorld(0, 0);
  ok(Math.hypot(x, y) < 1, 'legacy origin stays within a metre of the world origin', `${x}, ${y}`);
  for (const [lx, ly] of [[214, 13], [-1270, -1100], [4186, 2553], [-11998, -13214], [12531, 10560]]) {
    const [la, lo] = R.legacyToWgs(lx, ly);
    const [wx, wy] = R.legacyToWorld(lx, ly);
    const [la2, lo2] = R.worldToWgs(wx, wy);
    ok(Math.abs(la - la2) < 1e-9 && Math.abs(lo - lo2) < 1e-9, `legacy (${lx}, ${ly}) keeps its lat/lon`);
  }
  // locally the conversion is a rotation + scale: a 10 m square keeps its shape to a centimetre
  const q = [[1000, 1000], [1010, 1000], [1010, 1010], [1000, 1010]].map(([a, b]) => R.legacyToWorld(a, b));
  const sides = q.map((p, i) => Math.hypot(q[(i + 1) % 4][0] - p[0], q[(i + 1) % 4][1] - p[1]));
  ok(Math.max(...sides) - Math.min(...sides) < 0.06, 'local shape kept', sides.map((s) => s.toFixed(3)).join(' '));
}

// worldframe helpers
{
  const [x, y] = P(214, 13);
  const [ex, ey] = R.legacyToWorld(214, 13);
  ok(Math.abs(x - ex) <= 0.005 && Math.abs(y - ey) <= 0.005 && Math.round(x * 100) === x * 100, 'P rounds to the centimetre');
  const o = PO(214, 13);
  ok(o.x === x && o.y === y, 'PO');
  const t = P3(214, 40, 13);
  ok(t[0] === x && t[1] === 40 && t[2] === y, 'P3');
  const a = PA(214, 13, 0);
  ok(Math.abs(a - R.legacyAngleToWorld(214, 13, 0)) < 1e-4, 'PA');
  ok(Math.abs(a / d2r + 0.94) < 0.1, 'east turns by the convergence', (a / d2r).toFixed(3));
  const l = PL([[214, 13, 3.3], [-1270, -1100]]);
  ok(l[0][2] === 3.3 && l[0][0] === x && l[1].length === 2, 'PL keeps extra fields');
  const b = PB([-3000, -3800, 4200, 2600]);
  for (const [px, py] of [[-3000, -3800], [4200, -3800], [-3000, 2600], [4200, 2600]]) {
    const [qx, qy] = R.legacyToWorld(px, py);
    ok(qx >= b[0] && qx <= b[2] && qy >= b[1] && qy <= b[3], 'PB holds the turned corners');
  }
  const [lx, ly] = L(...P(500, -700));
  ok(Math.abs(lx - 500) < 0.01 && Math.abs(ly + 700) < 0.01, 'L inverts P');
}

// bit-identical with scripts/world/rdnew.py
{
  const file = path.join(ROOT, 'scripts/fixtures/rdnew_points.json');
  const fx = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bad = 0;
  for (const p of fx.wgsToRd) { const r = R.wgsToRd(p.lat, p.lon); if (r[0] !== p.x || r[1] !== p.y) bad++; }
  for (const p of fx.rdToWgs) { const r = R.rdToWgs(p.x, p.y); if (r[0] !== p.lat || r[1] !== p.lon) bad++; }
  for (const p of fx.legacyToWorld) { const r = R.legacyToWorld(p.lx, p.ly); if (r[0] !== p.x || r[1] !== p.y) bad++; }
  ok(bad === 0, 'JS == Python bit for bit', `${bad} of ${fx.wgsToRd.length + fx.rdToWgs.length + fx.legacyToWorld.length} differ`);
}

console.log(`${n - fails}/${n} passed`);
if (fails) process.exit(1);
