// Het rijtuig van de passagierstreinen (stoptrein, intercity en de tussenmodule) in de stijl van de Quaternius-voertuigen (24-11):
// een afgeronde cabine met schuine voorruit, zijwanden met echte ruitgaten en deuropeningen (met dichte deurbladen erin), een
// koepeldak met airco-units, een gangpadkap tussen de rijtuigen, een pantograaf in neergelaten stand, een koppeling en draaistellen
// met wielstellen. Eén geometrie per (type, wagen), gedeeld door alle treinen. railway3d.js (buildCar) hangt er de lampen, de
// donkere vuller en de materialen aan. Maten blijven die van de oude wagen (TRAIN_HALF_WIDTH, cfg.height, raamband en neus uit
// treinlayout.js), zodat treininterieur.js, de deurplekken en de cabine ongewijzigd kloppen. Alleen geometrie: groep 0 romp met
// vertexkleuren, groep 1 het doorzichtige salonglas, groep 2 het glas van de cabine.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix } from './pixelart3d.js';
import { raamband, noseOf } from './treinlayout.js';

const G_BODY = 0, G_SALOON = 1, G_CAB = 2;
const DARK = 0x26282c, ROOF = 0xa5a8ac, STEEL = 0x6b6e72, TRIM = 0x1b1c1e, RUBBER = 0x1d1e20, SILVER = 0xb9bcbf;
const WALL_T = 0.07;

function chamfBox(B, cx, cy, cz, sx, sy, sz, c, color, group = G_BODY) {
  const hx = sx / 2, hy = sy / 2;
  const s = new THREE.Shape();
  s.moveTo(-hx + c, -hy); s.lineTo(hx - c, -hy); s.lineTo(hx, -hy + c); s.lineTo(hx, hy - c);
  s.lineTo(hx - c, hy); s.lineTo(-hx + c, hy); s.lineTo(-hx, hy - c); s.lineTo(-hx, -hy + c);
  B.geo(new THREE.ExtrudeGeometry(s, { depth: sz, bevelEnabled: false, curveSegments: 1 }).translate(cx, cy, cz - sz / 2), null, color, group);
}
const chamfRect = (x0, y0, x1, y1, c) => [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
function tube(B, a, b, r, color, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  B.geo(new THREE.CylinderGeometry(r, r, d.length(), seg), new THREE.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), color);
}
const beam = (B, a, b, sy, sz, color) => B.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]), sy, sz, color, 0, 0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]));

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
  return spans.filter(([s, e]) => e - s > 0.3);
}

// De doorsnede van een wagen: rechtsonder omhoog, de ronde hoek, over de bovenkant, de linkerhoek en omlaag. Punten [z, y].
function ringPts(w, yb, yt, rc) {
  const pts = [[w, yb]];
  for (let k = 0; k <= 3; k++) { const a = (k / 3) * Math.PI / 2; pts.push([w - rc + rc * Math.cos(a), yt - rc + rc * Math.sin(a)]); }
  for (let k = 0; k <= 3; k++) { const a = Math.PI / 2 + (k / 3) * Math.PI / 2; pts.push([-w + rc + rc * Math.cos(a), yt - rc + rc * Math.sin(a)]); }
  pts.push([-w, yb]);
  return pts;
}
// Een strook tussen twee doorsneden op x = xa en x = xb; colorOf(i, A, C) geeft [kleur, groep] per rand.
function loft(B, xa, xb, A, C, dir, colorOf) {
  for (let i = 0; i + 1 < A.length; i++) {
    const [col, grp] = colorOf(i, A, C);
    const dz = A[i + 1][0] - A[i][0], dy = A[i + 1][1] - A[i][1], l = Math.hypot(dz, dy) || 1;
    B.quadOut([xa, A[i][1], A[i][0]], [xa, A[i + 1][1], A[i + 1][0]], [xb, C[i + 1][1], C[i + 1][0]], [xb, C[i][1], C[i][0]], [dir * 0.3, -dz / l, dy / l], col, grp);
  }
}
function capFan(B, x, A, dir, color, group = G_BODY) {
  const cy = A.reduce((s, p) => s + p[1], 0) / A.length;
  const m = [x, cy, 0];
  for (let i = 0; i + 1 < A.length; i++) B.triOut([x, A[i][1], A[i][0]], [x, A[i + 1][1], A[i + 1][0]], m, [dir, 0, 0], color, group);
  B.triOut([x, A[A.length - 1][1], A[A.length - 1][0]], [x, A[0][1], A[0][0]], m, [dir, 0, 0], color, group);
}

// De ringen van de neus per type: [afstand van de wagenbak, bovenkant, halve breedte, soort van de strook ervoor].
function noseRings(cfg, H, hw) {
  if (cfg.front === 'virm') return { sill: 2.35, yb: 0.55, rings: [[0, H - 0.05, hw - 0.03, ''], [1.0, H - 0.1, hw - 0.05, 'roof'], [1.55, H - 0.25, hw - 0.1, 'roof'], [1.9, 2.35, hw - 0.16, 'glass']] };
  if (cfg.front === 'gtw') return { sill: 1.75, yb: 0.7, rings: [[0, H - 0.05, hw - 0.03, ''], [0.25, H - 0.1, hw - 0.05, 'roof'], [0.95, 2.05, hw - 0.12, 'glass'], [1.45, 1.85, hw - 0.2, 'nose'], [1.6, 1.75, hw - 0.3, 'nose']] };
  return { sill: 1.75, yb: 0.7, rings: [[0, H - 0.05, hw - 0.03, ''], [0.5, H - 0.1, hw - 0.05, 'roof'], [1.3, 2.0, hw - 0.12, 'glass'], [1.5, 1.85, hw - 0.2, 'nose'], [1.6, 1.75, hw - 0.3, 'nose']] };
}

// Een draaistel met twee assen, vier wielen, een frame, veren en remschijven; (x, z=0) is het midden.
function bogie(B, x, long = 2.5) {
  const r = 0.46, gz = 0.7175;
  for (const dx of [-long / 2 + 0.2, long / 2 - 0.2]) {
    for (const s of [1, -1]) {
      B.geo(new THREE.CylinderGeometry(r, r, 0.12, 14).rotateX(Math.PI / 2), composeMatrix(x + dx, r, s * gz), 0x2d2e30);
      B.geo(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.15, 10).rotateX(Math.PI / 2), composeMatrix(x + dx, r, s * gz), 0x77797c);
      B.geo(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.025, 14).rotateX(Math.PI / 2), composeMatrix(x + dx, r, s * (gz - 0.075)), 0x1b1c1e);
      B.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 10).rotateX(Math.PI / 2), composeMatrix(x + dx, r, s * (gz - 0.2)), 0x8d8f92);
      B.box(x + dx, 0.62, s * 0.98, 0.2, 0.2, 0.16, 0x303134); // asbus
      tube(B, [x + dx, 0.7, s * 0.9], [x + dx, 0.9, s * 0.9], 0.07, 0x55585c, 6); // veer
    }
    tube(B, [x + dx, r, -1.0], [x + dx, r, 1.0], 0.06, 0x3a3b3e, 6);
  }
  for (const s of [1, -1]) B.box(x, 0.92, s * 0.98, long, 0.17, 0.13, 0x3a3b3e);
  B.box(x, 0.84, 0, 0.3, 0.14, 1.9, 0x3a3b3e);
  chamfBox(B, x, 0.68, 0, 1.0, 0.3, 1.0, 0.06, 0x2a2b2e);
}

// De pantograaf in neergelaten stand: voetisolatoren, een onderarm, een bovenarm en de sleepstrip.
function pantograph(B, x, y0) {
  for (const z of [-0.45, 0.45]) B.geo(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8), composeMatrix(x, y0 + 0.15, z), 0xb48a4a);
  B.box(x, y0 + 0.32, 0, 1.5, 0.06, 1.1, 0x2a2b2e);
  for (const z of [-0.4, 0.4]) {
    beam(B, [x - 0.65, y0 + 0.38, z], [x + 0.15, y0 + 0.6, z], 0.06, 0.06, STEEL);
    beam(B, [x + 0.15, y0 + 0.6, z], [x - 0.5, y0 + 0.72, z], 0.05, 0.05, STEEL);
  }
  B.box(x - 0.5, y0 + 0.76, 0, 0.1, 0.05, 1.5, 0x3a3b3e);
  B.box(x - 0.5, y0 + 0.81, 0, 0.14, 0.03, 1.5, SILVER);
}

// Een deur: gat in de wand, dichte tweedelige schuifdeur met raam, een donkere rand en een opstapje.
function doorLeaf(B, x, y0, y1, w, hw, color, zeroSide) {
  for (const s of zeroSide) {
    const z = s * (hw - 0.05), n = [0, 0, s];
    const hx = w / 2 - 0.02;
    for (const e of [-1, 1]) {
      const xa = e < 0 ? x - hx : x + 0.015, xb = e < 0 ? x - 0.015 : x + hx;
      B.quadOut([xa, y0, z], [xb, y0, z], [xb, y0 + (y1 - y0) * 0.38, z], [xa, y0 + (y1 - y0) * 0.38, z], n, color);
      B.quadOut([xa + 0.05, y0 + (y1 - y0) * 0.38, z], [xb - 0.05, y0 + (y1 - y0) * 0.38, z], [xb - 0.05, y1 - 0.1, z], [xa + 0.05, y1 - 0.1, z], n, 0x2b3a46);
      B.quadOut([xa, y0 + (y1 - y0) * 0.38, z], [xa + 0.05, y0 + (y1 - y0) * 0.38, z], [xa + 0.05, y1 - 0.1, z], [xa, y1 - 0.1, z], n, color);
      B.quadOut([xb - 0.05, y0 + (y1 - y0) * 0.38, z], [xb, y0 + (y1 - y0) * 0.38, z], [xb, y1 - 0.1, z], [xb - 0.05, y1 - 0.1, z], n, color);
      B.quadOut([xa, y1 - 0.1, z], [xb, y1 - 0.1, z], [xb, y1, z], [xa, y1, z], n, color);
    }
    // donkere naad en rand om de opening, opstap en een knop
    B.box(x, (y0 + y1) / 2, s * (hw + 0.004), 0.03, y1 - y0, 0.012, TRIM);
    for (const e of [-1, 1]) B.box(x + e * (w / 2 + 0.01), (y0 + y1) / 2, s * (hw + 0.004), 0.05, y1 - y0 + 0.06, 0.012, TRIM);
    B.box(x, y1 + 0.03, s * (hw + 0.004), w + 0.12, 0.05, 0.012, TRIM);
    B.box(x, y0 - 0.14, s * (hw - 0.12), w - 0.1, 0.05, 0.3, 0x3a3b3e);
    B.box(x + w / 2 + 0.12, y0 + 1.0, s * (hw + 0.012), 0.08, 0.1, 0.02, 0x3fc6d4);
  }
}

// Zijwand als geëxtrudeerde plaat met gaten (ruiten en deuren); side = 1 of -1.
function sideWall(B, x0, x1, yb, yt, hw, holes, side, color) {
  const shape = new THREE.Shape([new THREE.Vector2(x0, yb), new THREE.Vector2(x1, yb), new THREE.Vector2(x1, yt), new THREE.Vector2(x0, yt)]);
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, hw - WALL_T);
  B.geo(g, side > 0 ? null : composeMatrix(0, 0, 0, 0, 0, 0, 1, 1, -1), color);
}

// Het rijtuig: geeft { geo, lampen: [{ end, x, y, z }] }; de x-as loopt langs het spoor, (0, 0, 0) is het midden van de wagen op de rail.
export function buildCarGeometry(cfg, seg, halfWidth) {
  const B = new GeoBuilder(3);
  const hw = halfWidth, W = hw * 2, L = seg.len, H = cfg.height, cab = seg.cab || 0;
  const power = seg.kind === 'power', dd = !!cfg.doubleDeck;
  const nose = noseOf(cfg);
  const x1 = L / 2 - (cab === 1 ? nose : 0), x0 = -L / 2 + (cab === -1 ? nose : 0), bl = x1 - x0, bx = (x0 + x1) / 2;
  const floor = dd ? 0.5 : 0.7, sideTop = H - 0.5, yb = floor - 0.12;
  const body = power ? cfg.stripe : cfg.body, nosec = cfg.nose, doorc = cfg.door, stripe = cfg.stripe, accent = cfg.accent;
  const lampen = [];

  // --- deuren en ruiten
  const doors = [];
  if (!power) {
    if (dd) for (const e of [-1, 1]) doors.push({ x: e > 0 ? x1 - 4.6 + 1.6 : x0 + 4.6 - 1.6, y0: 0.9, y1: 2.9, w: 1.35 });
    else { const ce = cab || 1; for (const dx of [-ce * (L / 2 - 3.2), ce * (L / 2 - 6.5)]) doors.push({ x: dx, y0: floor + 0.03, y1: floor + 2.2, w: 1.45 }); }
  }
  const bands = raamband(cfg);
  const winHoles = [], panes = [];
  if (!power) {
    const doorBan = doors.map((d) => [d.x - d.w / 2 - 0.5, d.x + d.w / 2 + 0.5]);
    bands.forEach((b, bi) => {
      const ban = [...doorBan];
      if (dd && bi === 0) ban.push([x1 - 4.6, x1 + 1], [x0 - 1, x0 + 4.6]);
      for (const [a, c] of freeSpans(x0 + 0.5, x1 - 0.5, ban)) {
        const n = Math.max(1, Math.round((c - a) / 1.65)), pw = (c - a - (n - 1) * 0.16) / n;
        for (let i = 0; i < n; i++) { const xa = a + i * (pw + 0.16); winHoles.push(chamfRect(xa, b.y0, xa + pw, b.y1, 0.1)); }
      }
    });
  } else {
    // de tussenmodule: een klein raam en roosters in plaats van ruiten
    winHoles.push(chamfRect(bx + L * 0.2, 2.5, bx + L * 0.2 + 0.7, 3.05, 0.06));
  }
  const doorHoles = doors.map((d) => chamfRect(d.x - d.w / 2, d.y0, d.x + d.w / 2, d.y1, 0.06));
  for (const s of [1, -1]) sideWall(B, x0, x1, yb, sideTop, hw, [...winHoles, ...doorHoles], s, body);
  for (const s of [1, -1]) {
    const z = s * (hw - 0.04), zr = s * (hw + 0.004);
    for (const h of winHoles) {
      for (let i = 1; i + 1 < h.length; i++) B.triOut([h[0][0], h[0][1], z], [h[i][0], h[i][1], z], [h[i + 1][0], h[i + 1][1], z], [0, 0, s], 0x20303c, G_SALOON);
      const n = h.length, cxm = h.reduce((a, p) => a + p[0], 0) / n, cym = h.reduce((a, p) => a + p[1], 0) / n;
      const out = (p) => [p[0] + Math.sign(p[0] - cxm) * 0.04, p[1] + Math.sign(p[1] - cym) * 0.04];
      for (let i = 0; i < n; i++) {
        const a = h[i], b = h[(i + 1) % n], ao = out(a), bo = out(b);
        B.quadOut([a[0], a[1], zr], [b[0], b[1], zr], [bo[0], bo[1], zr], [ao[0], ao[1], zr], [0, 0, s], TRIM);
      }
    }
    void panes;
    // livrei: een brede band onder de ruiten en een dunne erboven, over de wand tussen de deuropeningen
    const bandBan = doors.map((d) => [d.x - d.w / 2 - 0.08, d.x + d.w / 2 + 0.08]);
    const strips = dd ? [[0.72, 0.22, stripe], [H - 0.45, 0.1, stripe]] : [[1.0, 0.42, stripe], [2.55, 0.07, stripe], [1.34, 0.05, accent]];
    if (!power) for (const [y, h, col] of strips) for (const [a, c] of freeSpans(x0 + 0.02, x1 - 0.02, bandBan)) B.box((a + c) / 2, y, zr + s * 0.004, c - a, h, 0.012, col);
    else for (let k = 0; k < 4; k++) B.box(bx - L * 0.1, 1.35 + k * 0.28, zr, L * 0.55, 0.09, 0.012, DARK);
  }
  for (const d of doors) doorLeaf(B, d.x, d.y0, d.y1, d.w, hw, doorc, [1, -1]);

  // --- dak: een koepel van vier stappen, met airco-units en een grijs bovenvlak
  const roofY = [[sideTop, 0], [sideTop + 0.13, 0.04], [sideTop + 0.28, 0.17], [sideTop + 0.4, 0.42], [H, 0.9]];
  for (let i = 0; i + 1 < roofY.length; i++) {
    for (const s of [1, -1]) {
      const [ya, ia] = roofY[i], [yc, ic] = roofY[i + 1];
      const A = [hw - ia, ya], C = [hw - ic, yc];
      const dy = C[1] - A[1], l = Math.hypot(C[0] - A[0], dy);
      B.quadOut([x0, ya, s * A[0]], [x1, ya, s * A[0]], [x1, yc, s * C[0]], [x0, yc, s * C[0]], [0, Math.abs(C[0] - A[0]) / l, s * dy / l], i < 3 ? body : ROOF);
    }
  }
  B.quadOut([x0, H, -(hw - 0.9)], [x1, H, -(hw - 0.9)], [x1, H, hw - 0.9], [x0, H, hw - 0.9], [0, 1, 0], ROOF);
  // de roofvlakken sluiten bij elk uiteinde met een kopwand (die ook de gangpadkap draagt)
  if (!power) {
    for (let k = 0; k < (dd ? 3 : 2); k++) chamfBox(B, bx + (k - (dd ? 1 : 0.5)) * 3.6, H + 0.07, 0, 2.2, 0.14, 1.2, 0.04, 0xd8dadc);
    chamfBox(B, bx - 1.4, H + 0.03, 0.55, 0.9, 0.08, 0.35, 0.02, STEEL);
  }
  if (power || (dd && cab === -1)) pantograph(B, bx + (power ? 0.2 : -1), H);
  if (power) { for (const z of [-0.55, 0.55]) B.geo(new THREE.CylinderGeometry(0.34, 0.36, 0.1, 10), composeMatrix(bx - L * 0.28, H + 0.04, z), STEEL); }

  // --- uiteinden: gangpadkap of neus met koppeling
  const jointEnd = (x, dir) => {
    const depth = dd ? 0.5 : 0.2;
    chamfBox(B, x + dir * depth / 2, floor + (sideTop - floor) / 2, 0, depth, sideTop - floor - 0.25, W - 0.5, 0.2, RUBBER);
    if (dd) for (const k of [0.15, 0.32]) chamfBox(B, x + dir * k, floor + (sideTop - floor) / 2, 0, 0.08, sideTop - floor - 0.12, W - 0.42, 0.2, 0x303236);
    capFan(B, x, ringPts(hw - 0.03, floor, H - 0.05, 0.35), dir, body);
  };
  const noseEnd = (dir) => {
    const x = dir > 0 ? x1 : x0, N = noseRings(cfg, H, hw);
    const r = N.rings.map(([d, yt, w, kind]) => ({ x: x + dir * d, pts: ringPts(w, N.yb, yt, Math.min(0.42, w * 0.3)), kind, yt }));
    for (let i = 1; i < r.length; i++) {
      const A = r[i - 1], C = r[i], kind = C.kind;
      loft(B, A.x, C.x, A.pts, C.pts, dir, (e, P, Q) => {
        const ymax = Math.max(P[e][1], P[e + 1][1], Q[e][1], Q[e + 1][1]), side = Math.abs(P[e][0] - P[e + 1][0]) < 1e-6 && Math.abs(P[e][0]) > 0.5;
        const top = Math.abs(P[e][1] - P[e + 1][1]) < 1e-6 && P[e][1] > 2;
        if (kind === 'roof') return [top ? ROOF : body, G_BODY];
        if (kind === 'glass') return side ? [nosec, G_BODY] : (ymax > N.sill + 0.02 ? [0x1c2631, G_CAB] : [nosec, G_BODY]);
        return [side || !top ? nosec : nosec, G_BODY];
      });
    }
    const tip = r[r.length - 1];
    capFan(B, tip.x, tip.pts, dir, nosec);
    const tx = tip.x + dir * 0.012;
    // voorkant: accentband, lichtenstrook, koplamp- en markeringsblokken, bumperkast met koppeling, spoorruimer en wissers
    B.box(tx, dd ? 1.05 : 1.25, 0, 0.03, 0.3, W - 0.7, accent);
    if (dd) B.box(tx, 1.45, 0, 0.03, 0.12, W - 0.7, stripe);
    for (const z of [-0.92, 0.92]) { lampen.push({ end: dir, x: tx + dir * 0.03, y: dd ? 1.75 : 1.55, z }); B.box(tx, dd ? 1.75 : 1.55, z * 0.0 + z, 0.05, 0.2, 0.4, 0x2b2c2f); }
    for (const z of [-0.6, 0.6]) B.box(tx, dd ? 1.2 : 1.0, z, 0.03, 0.08, 0.14, 0xf0d9a0);
    chamfBox(B, tip.x - dir * 0.1, 0.55, 0, 0.5, 0.5, 1.5, 0.12, DARK);
    tube(B, [tip.x + dir * 0.28, 0.55, 0], [tip.x + dir * 0.05, 0.55, 0], 0.06, 0x55585c, 6);
    B.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8).rotateZ(Math.PI / 2), composeMatrix(tip.x + dir * 0.3, 0.55, 0), 0x77797c);
    B.box(tip.x + dir * 0.06, 0.32, 0, 0.12, 0.1, 1.3, 0x303134);
    for (const z of [-0.45, 0.45]) B.box(tx + dir * 0.02, N.sill + (dd ? 0.5 : 0.25), z, 0.02, 0.025, 0.7, TRIM, 0, 0, 0, 0.1);
    // stuurkabel en spiegels naast de cabine
    for (const s of [1, -1]) { B.box(x + dir * 0.45, N.sill + 0.5, s * (hw + 0.1), 0.05, 0.4, 0.14, TRIM); B.box(x + dir * 0.3, N.sill + 0.7, s * (hw + 0.03), 0.04, 0.04, 0.12, TRIM); }
  };
  if (cab === 1) noseEnd(1); else jointEnd(x1, 1);
  if (cab === -1) noseEnd(-1); else jointEnd(x0, -1);

  // --- onderstel: huid tussen de draaistellen, apparatenkasten en de draaistellen zelf
  B.box(bx, floor - 0.08, 0, bl - 0.4, 0.22, W - 0.5, 0x2a2b2e);
  for (let k = 0; k < 3; k++) chamfBox(B, bx - 3 + k * 3, floor - 0.28, 0, 1.6, 0.34, W - 0.9, 0.06, 0x3a3b3e);
  if (power) bogie(B, 0, 2.5);
  else if (dd) for (const e of [-1, 1]) bogie(B, e * (L / 2 - 2.6), 2.6);
  else bogie(B, (cab || 1) * (L / 2 - 3.2), 2.5);
  return { geo: B.build(), lampen };
}
