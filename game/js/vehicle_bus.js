// Stadsbus en midibus in de stijl van de Quaternius-voertuigen (24-11): afgeronde neus met een gebogen voorruit, een koepeldak
// met rondlopende rand, echte wielkasten met flarderanden, ruiten als gaten in de flank (met glas erachter), en deuropeningen die
// echt dwars door de romp gaan (de schuifdeuren zitten als losse bladen in het model en schuiven open via vehicledoors3d.js).
// Eén sectie loopt van x0 (achter) tot x1 (voor); de gelede bus bouwt er twee (models3d_vehicles.js buildBusMesh). De maten die
// elders gelden blijven gelijk: dorpel 0,34 m, vloer 0,46 m, raamlijn 1,2 tot 2,55 m, dak 3,0 m, wielstraal 0,5 m, deuropening van
// 0,42 tot 2,57 m en 1,2 m breed rond de deurplek (vehicledoors.js DEUR_DEFS.bus, businterieur.js).
// Het interieur (stoelen, stangen, reizigers, binnenhuid) tekent businterieur3d.js tijdens het spel; hier zit alleen de bestuurdersplek.
// Puur geometrie: geen spelstaat, geen eigen materialen (groep 0 lak, 1 glas, 2 lampen: vehicleMaterials in models3d_vehicles.js).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix } from './pixelart3d.js';

const BUS_SILL = 0.34;
const BUS_WHEEL_R = 0.5;
const BUS_ROOF = 3.0;
const WIN_Y0 = 1.2, WIN_Y1 = 2.55, RAIL = 2.62;
const DOOR_Y0 = 0.42, DOOR_Y1 = 2.57, DOOR_HALF = 0.6, WALL_T = 0.08;
const G_GLASS = 1, G_LAMP = 2;
const WHITE = 0xe9e9e4, GREEN = 0x2f7d46, LIME = 0x9cc24a, TRIM = 0x1f2022, DARK = 0x2a2d31, GLASS = 0x2b3740;
const HEADLAMP = 0xf2efe4, TAIL = 0xa3211b, INDICATOR = 0xd9822b, PLATE = 0xe3bb1c, UNIT = 0xd6d6d0, UNIT2 = 0xa9aaa6, BUMPER = 0x34373b;
const STEP_Y = 0xe2b81c;

// De profielen van de uiteinden: [hoogte, verschuiving in x (+ is naar buiten), inzet van de zijkant]. Het onderste deel is de
// bumper (met afschuining), dan de lijn van groen en limoen, dan de voorruit die naar achteren helt, dan het koepeldak.
const FRONT_LV = [[0.34, 0, 0], [0.46, 0.05, 0], [0.58, 0.05, 0], [0.64, 0, 0], [0.85, 0, 0], [0.91, 0, 0], [1.0, 0, 0], [2.55, -0.17, 0], [2.62, -0.19, 0]];
const FRONT_ROOF = [[2.62, -0.19, 0], [2.78, -0.3, 0.1], [2.92, -0.5, 0.3], [3.0, -0.8, 0.55]];
const REAR_LV = [[0.34, 0, 0], [0.44, 0.04, 0], [0.58, 0.04, 0], [0.64, 0, 0], [0.85, 0, 0], [0.91, 0, 0], [1.0, 0, 0], [2.55, -0.08, 0], [2.62, -0.1, 0]];
const REAR_ROOF = [[2.62, -0.1, 0], [2.78, -0.2, 0.1], [2.92, -0.4, 0.3], [3.0, -0.7, 0.55]];
const FLAT_LV = [[0.34, 0, 0], [0.46, 0, 0], [0.58, 0, 0], [0.64, 0, 0], [0.85, 0, 0], [0.91, 0, 0], [1.0, 0, 0], [2.55, 0, 0], [2.62, 0, 0]];
const FLAT_ROOF = [[2.62, 0, 0], [2.78, 0, 0.1], [2.92, 0, 0.3], [3.0, 0, 0.55]];
// de grovere profielen van het eenvoudige niveau (simple)
const FRONT_S = [[0.34, 0, 0], [0.64, 0, 0], [0.9, 0, 0], [1.0, 0, 0], [2.55, -0.17, 0], [2.62, -0.19, 0]];
const REAR_S = [[0.34, 0, 0], [0.64, 0, 0], [0.9, 0, 0], [1.0, 0, 0], [2.55, -0.08, 0], [2.62, -0.1, 0]];
const FLAT_S = [[0.34, 0, 0], [0.64, 0, 0], [0.9, 0, 0], [1.0, 0, 0], [2.55, 0, 0], [2.62, 0, 0]];
const FRONT_ROOF_S = [[2.62, -0.19, 0], [2.85, -0.4, 0.25], [3.0, -0.8, 0.55]];
const REAR_ROOF_S = [[2.62, -0.1, 0], [2.85, -0.3, 0.25], [3.0, -0.7, 0.55]];
const FLAT_ROOF_S = [[2.62, 0, 0], [2.85, 0, 0.25], [3.0, 0, 0.55]];
const NC = 4, NM = 5; // bochtstappen per hoek en tussenpunten op het vlak van de neus
const N_END = 2 * (NC + 1) + NM - 1;

const lerp = (a, b, t) => a + (b - a) * t;
function shiftAt(tab, y) {
  if (y <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (y - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
  return tab[tab.length - 1][1];
}

// Punten van één uiteinde in het platte vlak (x, z): van de rechterkant (z+) rond de hoek over het vlak naar links.
function endPts(xe, dir, hwv, r, bulge) {
  const out = [];
  for (let k = 0; k <= NC; k++) { const t = (k / NC) * Math.PI / 2; out.push([xe - dir * r * (1 - Math.sin(t)), hwv - r * (1 - Math.cos(t))]); }
  for (let k = 1; k < NM; k++) { const u = 1 - (2 * k) / NM; out.push([xe + dir * bulge * (1 - u * u), (hwv - r) * u]); }
  for (let k = NC; k >= 0; k--) { const t = (k / NC) * Math.PI / 2; out.push([xe - dir * r * (1 - Math.sin(t)), -(hwv - r * (1 - Math.cos(t)))]); }
  return out;
}

// De lus rond de sectie op hoogte y: voorste uiteinde van rechts naar links, dan het achterste van links naar rechts.
function loopAt(S, y, sf, sr, ins) {
  const hwv = S.hw - ins, rf = Math.max(0.1, S.rF - ins * 0.9), rr = Math.max(0.1, S.rR - ins * 0.9);
  const f = endPts(S.x1 + sf, 1, hwv, rf, S.bF);
  const r = endPts(S.x0 + sr, -1, hwv, rr, S.bR).reverse();
  return [...f, ...r].map(([x, z]) => [x, y, z]);
}

// Een strook tussen twee lussen (zelfde aantal punten) over de indexen i0..i1. up: de strook helt naar boven.
function strip(B, A, C, i0, i1, color, group = 0, up = 0) {
  const n = A.length;
  for (let i = i0; i < i1; i++) {
    const j = (i + 1) % n;
    const tx = A[j][0] - A[i][0], tz = A[j][2] - A[i][2], l = Math.hypot(tx, tz) || 1;
    B.quadOut(A[i], A[j], C[j], C[i], [-tz / l, up, tx / l], color, group);
  }
}

function chamfBox(B, cx, cy, cz, sx, sy, sz, c, color, group = 0) {
  const hx = sx / 2, hy = sy / 2;
  const s = new THREE.Shape();
  s.moveTo(-hx + c, -hy); s.lineTo(hx - c, -hy); s.lineTo(hx, -hy + c); s.lineTo(hx, hy - c);
  s.lineTo(hx - c, hy); s.lineTo(-hx + c, hy); s.lineTo(-hx, hy - c); s.lineTo(-hx, -hy + c);
  B.geo(new THREE.ExtrudeGeometry(s, { depth: sz, bevelEnabled: false, curveSegments: 1 }).translate(cx, cy, cz - sz / 2), null, color, group);
}

// Een veelhoek met afgeschuinde hoeken (voor een raam of een deuropening).
function chamfRect(x0, y0, x1, y1, c) {
  return [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
}

// Vrije stukken van [a, b] zonder de verboden stukken.
function freeSpans(a, b, banned) {
  let spans = [[a, b]];
  for (const [p, q] of banned) {
    const next = [];
    for (const [s, e] of spans) {
      if (q <= s || p >= e) { next.push([s, e]); continue; }
      if (p > s) next.push([s, p]);
      if (q < e) next.push([q, e]);
    }
    spans = next;
  }
  return spans.filter(([s, e]) => e - s > 0.05);
}

function archPts(x, R, cy, n = 9) {
  const pts = [[x - R, BUS_SILL], [x - R, cy]];
  for (let k = 1; k < n; k++) { const a = Math.PI - (k / n) * Math.PI; pts.push([x + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  pts.push([x + R, cy], [x + R, BUS_SILL]);
  return pts;
}

// De zijwand: een plaat met de wielkasten onderin, ruiten en deuropeningen als gaten. side = +1 of -1 (gespiegeld).
function sideWall(B, S, side, arches, doors, wins, simple = false) {
  const ys = (tab) => tab.filter(([y]) => y > BUS_SILL && y <= RAIL);
  const xs1 = S.x1 - S.rF, xs0 = S.x0 + S.rR;
  const pts = [[xs0 + shiftAt(S.rt, BUS_SILL), BUS_SILL]];
  for (const a of arches) pts.push(...archPts(a.x, a.r, a.cy, simple ? 4 : 9));
  pts.push([xs1 + shiftAt(S.ft, BUS_SILL), BUS_SILL]);
  for (const [y, sf] of ys(S.ft)) pts.push([xs1 + sf, y]);
  for (const [y, sr] of ys(S.rt).reverse()) pts.push([xs0 + sr, y]);
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of [...wins, ...doors]) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  // simple (niveau 1 van de lodkit): een vlakke plaat zonder dikte rond de gaten
  const g = simple ? new THREE.ShapeGeometry(shape, 1).translate(0, 0, S.hw) : new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, S.hw - WALL_T);
  B.geo(g, side > 0 ? null : composeMatrix(0, 0, 0, 0, 0, 0, 1, 1, -1), WHITE);
}

// Eén deurblad: onderpaneel in lak, glas, een zwarte rand. x0..x1 op de flank, absolute coordinaten.
function leafBlad(L, x0, x1, hw, simple = false) {
  const xm = (x0 + x1) / 2, w = x1 - x0, z = hw - 0.04;
  L.box(xm, (DOOR_Y0 + 1.1) / 2, z, w - 0.01, 1.1 - DOOR_Y0, 0.035, WHITE);
  L.box(xm, (1.1 + 2.52) / 2, z, w - 0.01, 2.52 - 1.1, 0.012, 0x5f8299, G_GLASS);
  if (simple) { L.box(xm, 1.5, z + 0.004, 0.04, 2.1, 0.045, TRIM); return; }
  for (const e of [x0 + 0.02, x1 - 0.02]) L.box(e, (DOOR_Y0 + DOOR_Y1) / 2, z + 0.004, 0.04, DOOR_Y1 - DOOR_Y0, 0.045, TRIM);
  L.box(xm, DOOR_Y1 - 0.02, z + 0.004, w, 0.04, 0.045, TRIM);
  L.box(xm, 1.1, z + 0.004, w, 0.035, 0.045, TRIM);
  L.box(xm, DOOR_Y0 + 0.02, z + 0.004, w, 0.04, 0.045, TRIM);
  L.box(xm, (DOOR_Y0 + DOOR_Y1) / 2, z - 0.035, w - 0.02, DOOR_Y1 - DOOR_Y0 - 0.04, 0.008, 0x3a3f46);
}

export function busWheelGeometry(r, w) {
  const B = new GeoBuilder(1);
  const axle = (geo) => geo.rotateX(Math.PI / 2);
  B.geo(axle(new THREE.CylinderGeometry(r, r, w, 16, 1)), null, 0x1b1b1c);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.92, r * 0.92, w + 0.03, 16, 1)), null, 0x2a2a2c);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w + 0.05, 10, 1)), null, 0x9ea2a6);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.34, r * 0.34, w + 0.07, 10, 1)), null, 0xd6d8da);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w + 0.1, 8, 1)), null, 0x55585c);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    B.box(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0, r * 0.12, r * 0.12, w + 0.06, 0x55585c, 0, 0, 0, a);
  }
  B.box(r * 0.8, 0, 0, r * 0.16, r * 0.18, w + 0.04, 0x3a3c3e);
  return B.build();
}

// De bestuurderscabine: dashboard, stuur, stoel en een vloerplaat (de rest van de binnenruimte komt van businterieur3d.js).
function driverCab(B, x1, hw) {
  const dx = x1 - 0.5;
  B.box(x1 - 1.0, 0.45, 0, 1.55, 0.02, hw * 2 - 0.2, 0x3b3f46);
  chamfBox(B, dx - 0.1, 1.12, 0, 0.5, 0.36, hw * 2 - 0.24, 0.07, 0x2c2f35);
  B.geo(new THREE.TorusGeometry(0.19, 0.02, 4, 10).rotateY(Math.PI / 2).rotateZ(0.3), composeMatrix(dx - 0.45, 1.36, -0.57), 0x16171a);
  B.box(dx - 0.36, 1.26, -0.57, 0.04, 0.2, 0.04, 0x16171a, 0, 0, 0, -0.5);
  chamfBox(B, dx - 1.0, 0.95, -0.57, 0.5, 0.1, 0.5, 0.03, 0x2b2d32);
  chamfBox(B, dx - 1.25, 1.3, -0.57, 0.1, 0.62, 0.5, 0.03, 0x2b2d32);
  B.box(dx - 1.0, 0.7, -0.57, 0.12, 0.45, 0.12, 0x2b2d32);
  B.box(dx - 0.55, 1.0, 0.18, 0.28, 0.3, 0.2, 0x4a4e56);
  B.box(dx - 0.42, 1.08, 0.18, 0.02, 0.12, 0.14, 0x3fc6d4, G_LAMP);
}

// De flarderand (donkere band) rond de bovenkant van een wielkast, en het binnenste van de kast.
function archFlare(B, a, hw) {
  const ro = a.r + 0.08, steps = 9;
  for (const s of [1, -1]) {
    const z = s * (hw + 0.012);
    for (let k = 0; k < steps; k++) {
      const a0 = Math.PI - (k / steps) * Math.PI, a1 = Math.PI - ((k + 1) / steps) * Math.PI;
      const p = (rr, an) => [a.x + Math.cos(an) * rr, a.cy + Math.sin(an) * rr, z];
      B.quadOut(p(a.r, a0), p(a.r, a1), p(ro, a1), p(ro, a0), [0, 0, s], 0x232427);
    }
  }
  const geo = new THREE.CylinderGeometry(a.r - 0.035, a.r - 0.035, hw * 2 - 0.16, 10, 1, true, Math.PI / 2, Math.PI);
  geo.rotateX(Math.PI / 2);
  geo.scale(1, 1, -1);
  B.geo(geo, composeMatrix(a.x, a.cy, 0), 0x151516);
}

// De sectie zelf. opts: { front, rear, wheelXs, doors: [{ x, id }] (id null = blad blijft in de romp), leafOut } (leafOut vult per id de bladen).
export function busSection(B, x0, x1, W, opts) {
  const { front = false, rear = false, wheelXs = [], doors = [], leafOut = null, simple = false } = opts; // simple: het eenvoudige niveau 1 van de lodkit (vehiclelod3d.js userData.lodRomp)
  const rectOf = (x0_, y0_, x1_, y1_, c) => (simple ? [[x0_, y0_], [x1_, y0_], [x1_, y1_], [x0_, y1_]] : chamfRect(x0_, y0_, x1_, y1_, c));
  const hw = W / 2;
  const S = { x0, x1, hw, rF: front ? 0.2 : 0.08, rR: rear ? 0.5 : 0.08, bF: front ? 0.2 : 0, bR: rear ? 0.06 : 0 };
  S.ft = simple ? (front ? FRONT_S : FLAT_S) : front ? FRONT_LV : FLAT_LV; S.rt = simple ? (rear ? REAR_S : FLAT_S) : rear ? REAR_LV : FLAT_LV;
  const froof = simple ? (front ? FRONT_ROOF_S : FLAT_ROOF_S) : front ? FRONT_ROOF : FLAT_ROOF, rroof = simple ? (rear ? REAR_ROOF_S : FLAT_ROOF_S) : rear ? REAR_ROOF : FLAT_ROOF;
  const arches = wheelXs.slice().sort((a, b) => a - b).map((x) => ({ x, r: BUS_WHEEL_R + 0.1, cy: BUS_WHEEL_R }));

  // --- de zijwanden met ruiten en deuropeningen
  const xs1 = x1 - S.rF + shiftAt(S.ft, 2.0), xs0 = x0 + S.rR + shiftAt(S.rt, 2.0);
  const doorBan = doors.map((d) => [d.x - DOOR_HALF - 0.6, d.x + DOOR_HALF + 0.6]);
  const mkWins = (spans) => {
    const out = [];
    for (const [a, b] of spans) {
      const n = Math.max(1, Math.round((b - a) / (simple ? 2.6 : 1.55))), pw = (b - a - (n - 1) * 0.1) / n;
      for (let i = 0; i < n; i++) { const xa = a + i * (pw + 0.1); out.push(rectOf(xa, WIN_Y0, xa + pw, WIN_Y1, 0.09)); }
    }
    return out;
  };
  const winsR = mkWins(freeSpans(xs0 + 0.45, xs1 - (front ? 0.55 : 0.4), doorBan));
  const winsL = mkWins(freeSpans(xs0 + 0.45, xs1 - (front ? 0.55 : 0.4), []));
  const doorHoles = doors.map((d) => rectOf(d.x - DOOR_HALF - 0.02, DOOR_Y0, d.x + DOOR_HALF + 0.02, DOOR_Y1, 0.05));
  sideWall(B, S, 1, arches, doorHoles, winsR, simple);
  sideWall(B, S, -1, arches, [], winsL, simple);
  for (const [side, wins] of [[1, winsR], [-1, winsL]]) {
    const z = side * (hw - 0.045);
    for (const h of wins) {
      for (let i = 1; i + 1 < h.length; i++) B.triOut([h[0][0], h[0][1], z], [h[i][0], h[i][1], z], [h[i + 1][0], h[i + 1][1], z], [0, 0, side], GLASS, G_GLASS);
      if (simple) continue;
      // een zwarte ruitrand om elk raam, op de buitenkant van de wand
      const n = h.length, zr = side * (hw + 0.004);
      const cxm = h.reduce((s, p) => s + p[0], 0) / n, cym = h.reduce((s, p) => s + p[1], 0) / n;
      const out = (p) => [p[0] + Math.sign(p[0] - cxm) * 0.035, p[1] + Math.sign(p[1] - cym) * 0.035];
      for (let i = 0; i < n; i++) {
        const a = h[i], b = h[(i + 1) % n], ao = out(a), bo = out(b);
        B.quadOut([a[0], a[1], zr], [b[0], b[1], zr], [bo[0], bo[1], zr], [ao[0], ao[1], zr], [0, 0, side], TRIM);
      }
    }
  }

  // --- uiteinden: bumper, lijn, voorruit of achterwand, en het koepeldak
  const loopF = (y, sf) => loopAt(S, y, sf, 0, 0);
  const loopR = (y, sr) => loopAt(S, y, 0, sr, 0);
  const COL_F = simple ? [BUMPER, GREEN, WHITE, null, WHITE] : [BUMPER, BUMPER, BUMPER, GREEN, LIME, WHITE, null, WHITE];
  const COL_R = simple ? [BUMPER, GREEN, WHITE, WHITE, WHITE] : [BUMPER, BUMPER, BUMPER, GREEN, LIME, WHITE, WHITE, WHITE];
  for (let i = 0; i + 1 < S.ft.length; i++) {
    const A = loopF(S.ft[i][0], S.ft[i][1]), C = loopF(S.ft[i + 1][0], S.ft[i + 1][1]);
    if (front && COL_F[i] === null) strip(B, A, C, 0, N_END - 1, GLASS, G_GLASS);
    else strip(B, A, C, 0, N_END - 1, front ? COL_F[i] : (i < 3 ? DARK : WHITE));
  }
  for (let i = 0; i + 1 < S.rt.length; i++) {
    const A = loopR(S.rt[i][0], S.rt[i][1]), C = loopR(S.rt[i + 1][0], S.rt[i + 1][1]);
    strip(B, A, C, N_END, A.length - 1, rear ? COL_R[i] : (i < 3 ? DARK : WHITE));
  }
  const roofLoop = (i) => loopAt(S, froof[i][0], froof[i][1], rroof[i][1], froof[i][2]);
  for (let i = 0; i + 1 < froof.length; i++) { const A = roofLoop(i); strip(B, A, roofLoop(i + 1), 0, A.length, WHITE, 0, 0.6); }
  const top = roofLoop(froof.length - 1), mid = top.reduce((s, p) => [s[0] + p[0] / top.length, s[1] + p[1] / top.length, s[2] + p[2] / top.length], [0, 0, 0]);
  for (let i = 0; i < top.length; i++) B.triOut(top[i], top[(i + 1) % top.length], mid, [0, 1, 0], WHITE);
  if (front) {
    for (const idx of (simple ? [0, N_END - 1] : [0, NC, N_END - 1 - NC, N_END - 1])) {
      const a = loopF(1.0, 0)[idx], b = loopF(2.55, -0.17)[idx];
      B.box((a[0] + b[0]) / 2, 1.78, (a[2] + b[2]) / 2, 0.07, 1.6, 0.07, WHITE, 0, 0, 0, Math.atan2(-(b[0] - a[0]), 1.55));
    }
    const face = (y) => x1 + shiftAt(FRONT_LV, y);
    if (!simple) for (const z of [-0.5, 0.45]) B.box(face(1.3) + 0.2, 1.3, z, 0.02, 0.025, 0.7, TRIM, 0, 0, 0, 0.12);
    // bestemmingsbord in de dakrand boven de voorruit en een lijnbord rechts
    B.box(face(2.5) - 0.1, 2.42, 0, 0.04, 0.2, W * 0.66, TRIM);
    B.box(face(2.5) - 0.075, 2.42, -W * 0.06, 0.012, 0.13, W * 0.5, 0xf0b33a, G_LAMP);
    if (!simple) B.box(face(2.5) - 0.075, 2.42, W * 0.3, 0.012, 0.13, W * 0.12, 0xf5f3e8, G_LAMP);
    // koplampen, richtingaanwijzers, mistlampen, spiegels, kenteken en rooster
    for (const s of [1, -1]) {
      if (simple) { B.box(x1 + 0.055, 0.7, s * (hw - 0.34), 0.05, 0.3, 0.34, HEADLAMP, G_LAMP); B.box(x1 - 0.55, 2.05, s * (hw + 0.38), 0.1, 0.62, 0.18, TRIM); continue; }
      chamfBox(B, x1 + 0.055, 0.73, s * (hw - 0.34), 0.05, 0.16, 0.34, 0.03, HEADLAMP, G_LAMP);
      B.box(x1 + 0.052, 0.55, s * (hw - 0.34), 0.05, 0.07, 0.2, INDICATOR, G_LAMP);
      B.box(x1 + 0.066, 0.46, s * (hw - 0.45), 0.04, 0.07, 0.1, HEADLAMP, G_LAMP);
      const mx = x1 - 0.55, mz = s * (hw + 0.38);
      B.box(mx, 2.22, s * (hw + 0.17), 0.05, 0.05, 0.4, TRIM);
      chamfBox(B, mx, 2.05, mz, 0.1, 0.62, 0.18, 0.04, TRIM);
      B.box(mx + 0.052, 2.05, mz, 0.012, 0.56, 0.15, 0x6f8c9b, G_GLASS);
      B.box(mx - 0.01, 1.5, s * (hw + 0.3), 0.04, 0.04, 0.3, TRIM);
      B.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8).rotateX(Math.PI / 2), composeMatrix(mx + 0.02, 1.5, s * (hw + 0.46)), TRIM);
    }
    B.box(x1 + 0.05, 0.4, 0, 0.04, 0.1, 0.52, PLATE);
    if (!simple) {
      B.box(x1 + 0.06, 0.46, 0, 0.03, 0.02, 0.8, 0x1a1b1d);
      for (let k = 0; k < 4; k++) B.box(x1 + 0.058, 0.52, (k - 1.5) * 0.17, 0.03, 0.09, 0.1, 0x1a1b1d);
      driverCab(B, x1, hw);
    }
  }
  if (rear) {
    const xr = x0 + shiftAt(REAR_LV, 1.5);
    B.quadOut([xr - 0.013, 1.6, 0.7], [xr - 0.02, 1.6, -0.7], [xr - 0.02, 2.4, -0.7], [xr - 0.013, 2.4, 0.7], [-1, 0, 0], GLASS, G_GLASS);
    for (const s of [1, -1]) {
      B.box(x0 - 0.05, 1.0, s * (hw - 0.27), 0.04, 0.5, 0.16, TAIL, G_LAMP);
      B.box(x0 - 0.05, 1.32, s * (hw - 0.27), 0.04, 0.12, 0.16, INDICATOR, G_LAMP);
      B.box(x0 - 0.05, 0.5, s * (hw - 0.3), 0.04, 0.08, 0.22, 0xe8e8e2, G_LAMP);
    }
    chamfBox(B, x0 - 0.05, 0.42, 0, 0.04, 0.1, 0.52, 0.02, PLATE);
    if (!simple) for (let k = 0; k < 6; k++) B.box(x0 - 0.045, 1.05 + k * 0.05, 0, 0.03, 0.025, 1.0, DARK);
  }

  // --- wielkasten, onderstel en de lijn van groen en limoen op de flanken
  if (!simple) for (const a of arches) archFlare(B, a, hw);
  if (!simple) B.box((x0 + x1) / 2, BUS_SILL - 0.05, 0, x1 - x0 - 0.2, 0.08, W - 0.3, 0x1c1d1f);
  if (!simple) for (const a of arches) B.geo(new THREE.CylinderGeometry(0.07, 0.07, W - 0.9, 8).rotateX(Math.PI / 2), composeMatrix(a.x, BUS_WHEEL_R, 0), 0x2a2b2e);
  const archBan = arches.map((a) => [a.x - a.r - 0.1, a.x + a.r + 0.1]);
  const doorBand = doors.map((d) => [d.x - DOOR_HALF - 0.05, d.x + DOOR_HALF + 0.05]);
  for (const s of [1, -1]) {
    const z = s * (hw + 0.008);
    for (const [a, b] of freeSpans(xs0, xs1, s > 0 ? [...archBan, ...doorBand] : archBan)) {
      B.box((a + b) / 2, 0.58, z, b - a, 0.36, 0.014, GREEN);
      if (!simple) B.box((a + b) / 2, 0.82, z, b - a, 0.07, 0.014, LIME);
      if (!simple) B.box((a + b) / 2, 0.37, z, b - a, 0.06, 0.016, DARK);
    }
  }
  if (!simple) B.box(x0 + (x1 - x0) * 0.32, 0.95, -(hw + 0.01), 0.5, 0.36, 0.014, 0xc9c9c3);

  // --- de deuropeningen: drempel met gele rand, kader en de bladen
  for (const d of doors) {
    const x = d.x;
    const gb = (suffix) => (d.id === null || leafOut === null ? B : (leafOut[d.id + suffix] || (leafOut[d.id + suffix] = new GeoBuilder(3))));
    if (simple) { leafBlad(B, x - DOOR_HALF, x + DOOR_HALF, hw, true); continue; }
    B.box(x, DOOR_Y0 - 0.03, hw - 0.18, 2 * DOOR_HALF + 0.04, 0.03, 0.34, 0x3b3f46);
    B.box(x, DOOR_Y0 + 0.011, hw - 0.04, 2 * DOOR_HALF + 0.04, 0.012, 0.1, STEP_Y);
    for (const e of [-1, 1]) {
      B.box(x + e * (DOOR_HALF + 0.045), (DOOR_Y0 + DOOR_Y1) / 2, hw + 0.006, 0.05, DOOR_Y1 - DOOR_Y0, 0.02, TRIM);
      B.geo(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6), composeMatrix(x + e * (DOOR_HALF - 0.05), 1.4, hw - 0.26), STEP_Y);
    }
    B.box(x, DOOR_Y1 + 0.03, hw + 0.006, 2 * DOOR_HALF + 0.14, 0.05, 0.02, TRIM);
    B.box(x + DOOR_HALF + 0.14, 1.35, hw + 0.02, 0.06, 0.1, 0.03, 0xc43a2b);
    leafBlad(gb('b'), x - DOOR_HALF, x, hw);
    leafBlad(gb('a'), x, x + DOOR_HALF, hw);
  }

  // --- het dak: airco- en techniekblok, ventilatoren, luikjes en antenne
  const cxm = (x0 + x1) / 2 + (front ? 0.6 : -0.3), podLen = Math.min(4.2, (x1 - x0) * 0.48);
  if (simple) { B.box(cxm, BUS_ROOF + 0.14, 0, podLen, 0.28, W * 0.5, UNIT); return; }
  chamfBox(B, cxm, BUS_ROOF + 0.14, 0, podLen, 0.28, W * 0.5, 0.08, UNIT);
  chamfBox(B, cxm + podLen * 0.14, BUS_ROOF + 0.3, 0, podLen * 0.66, 0.06, W * 0.4, 0.025, UNIT2);
  for (const dx of [-1, 1]) {
    B.geo(new THREE.CylinderGeometry(0.28, 0.3, 0.07, 10), composeMatrix(cxm + dx * podLen * 0.28, BUS_ROOF + 0.31, 0), 0x6b6e72);
    B.geo(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8), composeMatrix(cxm + dx * podLen * 0.28, BUS_ROOF + 0.36, 0), DARK);
  }
  for (const z of [-1, 1]) chamfBox(B, cxm - podLen * 0.58, BUS_ROOF + 0.07, z * W * 0.26, 0.5, 0.1, 0.4, 0.03, UNIT2);
  if (front) B.geo(new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(x1 - 1.6, BUS_ROOF + 0.02, W * 0.3), 0xd0d0cc);
  else B.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), composeMatrix(x0 + 1.0, BUS_ROOF + 0.15, -W * 0.28), TRIM);
}

// Het harmonicaschot tussen de twee delen van de gelede bus: een afgeronde balg met plooien en de draaitafel in de vloer.
export function busBellows(B, jointX, W, simple = false) {
  const hwb = W / 2 * 0.95, y0 = 0.5, y1 = 2.9, rr = 0.3;
  const prof = (hz, ya, yb) => {
    const pts = [];
    for (let k = 0; k <= 4; k++) { const t = (k / 4) * Math.PI / 2; pts.push([hz - rr * (1 - Math.cos(t)), yb - rr * (1 - Math.sin(t))]); }
    for (let k = 4; k >= 0; k--) { const t = (k / 4) * Math.PI / 2; pts.push([hz - rr * (1 - Math.cos(t)), ya + rr * (1 - Math.sin(t))]); }
    return pts;
  };
  const folds = simple ? [[-0.17, 0.0], [0.0, 0.07], [0.17, 0.0]] : [[-0.17, 0.0], [-0.1, 0.07], [0.0, 0.0], [0.1, 0.07], [0.17, 0.0]];
  const loopF = (dx, e) => {
    const r = prof(hwb - e, y0 + e, y1 - e);
    return [...r.map(([z, y]) => [jointX + dx, y, z]), ...r.slice().reverse().map(([z, y]) => [jointX + dx, y, -z])];
  };
  for (let i = 0; i + 1 < folds.length; i++) {
    const A = loopF(folds[i][0], folds[i][1]), C = loopF(folds[i + 1][0], folds[i + 1][1]);
    for (let k = 0; k < A.length; k++) {
      const j = (k + 1) % A.length;
      const tz = A[j][2] - A[k][2], ty = A[j][1] - A[k][1], l = Math.hypot(tz, ty) || 1;
      B.quadOut(A[k], A[j], C[j], C[k], [0, ty / l, -tz / l], i % 2 ? 0x34363a : 0x26282b);
      B.quadOut(A[k], C[k], C[j], A[j], [0, -ty / l, tz / l], 0x1a1b1d);
    }
  }
  B.geo(new THREE.CylinderGeometry(W * 0.4, W * 0.4, 0.05, 14), composeMatrix(jointX, 0.45, 0), 0x3b3f46);
  B.geo(new THREE.TorusGeometry(W * 0.4, 0.025, 3, 14).rotateX(Math.PI / 2), composeMatrix(jointX, 0.47, 0), STEP_Y);
  chamfBox(B, jointX, 2.98, 0, 0.9, 0.12, W * 0.62, 0.04, 0x26282b);
}

// De deurbladen als hangbare delen: per id een geometrie, plus alle samen (dicht) en de rechthoeken voor de deurtests.
export function busDoorKnip(leafOut, hw, doorDefs) {
  const panelen = {}, rects = {}, zs = {};
  const alle = new GeoBuilder(3);
  for (const [id, L] of Object.entries(leafOut)) {
    panelen[id] = L.build();
    panelen[id].userData.shared = true;
    zs[id] = hw;
    for (let g = 0; g < 3; g++) { alle.groups[g].p.push(...L.groups[g].p); alle.groups[g].c.push(...L.groups[g].c); alle.groups[g].uv.push(...L.groups[g].uv); }
  }
  for (const d of doorDefs || []) rects[d.id] = [d.x - DOOR_HALF - 0.05, DOOR_Y0, d.x + DOOR_HALF + 0.05, DOOR_Y1];
  const dicht = alle.build();
  dicht.userData.shared = true;
  return { dicht, panelen, rects, zs };
}
