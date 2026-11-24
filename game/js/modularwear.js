// Kledingdelen bovenop de modulaire mensen (ADR 0052, eis coördinator 23-11): wat het Quaternius-pack niet heeft (een politiepet,
// de details van een uniform) bouwen we hier zelf, op kwaliteitsniveau en met een norm in het register, zoals propregister.js dat voor
// props doet. Elk deel hangt aan één bot van het gedeelde skelet (hoofd, bovenarm, borst, heup) en volgt dus elke animatie.
//
// Pure rekenkunde (geen three.js): buildWear(id, ctx) geeft { pos: [x,y,z,...], col: [hex,...] per vertex, bone: [bot-index per
// vertex], idx: [...] } in de rustassen van de rig (meters, mens kijkt langs +x, links is -z). ctx komt uit modularpeople.js:
//   ctx.cap               het kader van de hoofdkruin { cx, cy, zc, rx, ry, rz } (capFrame)
//   ctx.bone(naam)        { i: bot-index, p: [x,y,z] rustpositie }
//   ctx.profile(c, as, n, delen, botten?)  per sector (n rond de as, beginnend bij +x) de straal van het lijf in het vlak door c (m)
//   ctx.surface(punt, richting, delen)  het verste punt van het lijf vanaf `punt` langs `richting` (binnen 4 cm ernaast)
// scripts/modularwear_test.mjs bouwt elk deel op beide rigs en houdt het aan zijn norm. Samen spelen: puur beeld, volgt uit de look.

export const WEAR_REGISTER = {
  politiepet: {
    nl: 'Politiepet', slot: 'hoofd',
    // maat: lengte met klep, hoogte, breedte (m), op de grote hoofden van het pack (kruin ~26 cm breed)
    norm: { tris: [110, 420], kleuren: 4, maat: [0.34, 0.11, 0.29], eisen: ['bol die bovenaan breder uitloopt dan de band', 'donkere band rond het hoofd', 'zwarte klep schuin naar voren', 'embleem voorop de band', 'kinriem boven de klep'] },
  },
  politieuniform: {
    nl: 'Politie-uniform (details)', slot: 'romp',
    norm: { tris: [160, 900], kleuren: 5, eisen: ['reflecterende band om beide bovenarmen', 'koppel om de heup met tasjes en holster', 'epauletten op beide schouders', 'embleem op de linkerborst', 'naamplaatje op de rechterborst'] },
  },
};

const NAVY = 0x1d2433, NAVY_LIGHT = 0x2a3448, BAND = 0x101318, BLACK = 0x0b0c0f, GOLD = 0xc9a43a, REFLECT = 0xd9de48, WHITE = 0xe8e6de, LEATHER = 0x16171a;

// --- een kleine bouwer ------------------------------------------------------------------------------
function builder() {
  const pos = [], col = [], bone = [], idx = [];
  const v = (p, c, b) => { pos.push(p[0], p[1], p[2]); col.push(c); bone.push(b); return pos.length / 3 - 1; };
  const tri = (a, b, c) => idx.push(a, b, c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  // een vierhoek met zijn voorkant naar `want` (het materiaal tekent alleen de voorkant)
  const quadDir = (a, b, c, d, want) => { const n = cross(sub(P(b), P(a)), sub(P(c), P(a))); if (dot(n, want) >= 0) quad(a, b, c, d); else quad(a, d, c, b); };
  const orient = (from, want) => {
    for (let t = from; t < idx.length; t += 3) {
      const a = P(idx[t]), b = P(idx[t + 1]), c = P(idx[t + 2]);
      const m = mul(add(add(a, b), c), 1 / 3);
      if (dot(cross(sub(b, a), sub(c, a)), want(m)) < 0) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; }
    }
  };
  return { pos, col, bone, idx, v, tri, quad, quadDir, P, orient };
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// twee assen loodrecht op `as`, de eerste zo dicht mogelijk bij +x (voor), zodat sector 0 aan de voorkant ligt
export function basis(as) {
  const n = norm(as);
  let u = sub([1, 0, 0], mul(n, n[0]));
  if (Math.hypot(...u) < 0.2) u = sub([0, 0, 1], mul(n, n[2]));
  u = norm(u);
  return [u, cross(n, u)];
}
// een kist (doos) met middelpunt c, halve maten h en assen ax (drie eenheidsvectoren)
function box(B, c, h, ax, color, b) {
  const p = [];
  for (let i = 0; i < 8; i++) {
    const s = [(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1];
    p.push(B.v(add(c, add(mul(ax[0], s[0] * h[0]), add(mul(ax[1], s[1] * h[1]), mul(ax[2], s[2] * h[2])))), color, b));
  }
  const F = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]];
  for (const f of F) { const m = mul(add(add(B.P(p[f[0]]), B.P(p[f[1]])), add(B.P(p[f[2]]), B.P(p[f[3]]))), 0.25); B.quadDir(p[f[0]], p[f[1]], p[f[2]], p[f[3]], sub(m, c)); }
}
// een band rond een lid of het lijf: n sectoren, per sector de straal uit het profiel plus `lucht`, breedte w langs de as;
// buitenkant en twee randen (een band is dik genoeg om van opzij te zien)
function band(B, c, as, radii, w, lucht, dik, color, b, from = 0, to = radii.length) {
  const n = radii.length, [u, v2] = basis(as), a = norm(as);
  const ring = (off, extra) => {
    const out = [];
    for (let k = from; k <= to; k++) {
      const kk = k % n, t = (kk / n) * Math.PI * 2, r = radii[kk] + lucht + extra;
      out.push(B.v(add(add(c, mul(a, off)), add(mul(u, Math.cos(t) * r), mul(v2, Math.sin(t) * r))), color, b));
    }
    return out;
  };
  const lo = ring(-w / 2, dik), hi = ring(w / 2, dik), loIn = ring(-w / 2, 0), hiIn = ring(w / 2, 0);
  for (let k = 0; k < lo.length - 1; k++) {
    const t = ((from + k + 0.5) / n) * Math.PI * 2, outDir = add(mul(u, Math.cos(t)), mul(v2, Math.sin(t)));
    B.quadDir(lo[k], hi[k], hi[k + 1], lo[k + 1], outDir);
    B.quadDir(loIn[k], lo[k], lo[k + 1], loIn[k + 1], mul(a, -1));
    B.quadDir(hi[k], hiIn[k], hiIn[k + 1], hi[k + 1], a);
  }
}

// --- politiepet ----------------------------------------------------------------------------------------
function politiepet(ctx) {
  const B = builder(), f = ctx.cap, b = ctx.bone('Head').i;
  const S = 16, at = (t, y, k) => [f.cx + f.rx * k * Math.cos(t) + (k > 1.1 ? 0.012 : 0), y, f.zc + f.rz * k * Math.sin(t)];
  const y0 = f.cy - 0.012, y1 = f.cy + 0.03, y2 = f.cy + 0.07;
  const ring = (y, k, c) => Array.from({ length: S }, (_, s) => B.v(at((s / S) * Math.PI * 2, y + (k > 1.1 ? 0.006 * Math.cos((s / S) * Math.PI * 2) : 0), k), c, b));
  // band (donker) en de bol die naar boven uitloopt
  const r0 = ring(y0, 1.04, BAND), r1 = ring(y1, 1.04, BAND), r1b = ring(y1, 1.04, NAVY), r2 = ring(y2, 1.18, NAVY), r2t = ring(y2, 1.18, NAVY_LIGHT);
  const radial = (m) => [m[0] - f.cx, 0, m[2] - f.zc];
  let from = B.idx.length;
  for (let s = 0; s < S; s++) { const s1 = (s + 1) % S; B.quad(r0[s], r1[s], r1[s1], r0[s1]); B.quad(r1b[s], r2[s], r2[s1], r1b[s1]); }
  B.orient(from, radial);
  // de bovenkant, iets bol en naar voren gekanteld
  const top = B.v([f.cx + 0.016, y2 + 0.012, f.zc], NAVY_LIGHT, b);
  from = B.idx.length;
  for (let s = 0; s < S; s++) B.tri(r2t[s], top, r2t[(s + 1) % S]);
  B.orient(from, () => [0, 1, 0]);
  // de klep: een halve ellips voor de band, schuin omlaag, met boven- en onderkant
  const V = 8, vis = [], visU = [];
  for (let k = 0; k <= V; k++) {
    const t = -Math.PI / 2 + (k / V) * Math.PI, e = [f.cx + f.rx * 1.04 * Math.cos(t), y0 + 0.004, f.zc + f.rz * 1.04 * Math.sin(t)];
    const out = [e[0] + 0.07 * Math.cos(t) * Math.cos(t) + 0.012, y0 - 0.02 * Math.cos(t), e[2] + 0.012 * Math.sin(t)];
    vis.push([B.v(e, BLACK, b), B.v(out, BLACK, b)]);
    visU.push([B.v([e[0], e[1] - 0.006, e[2]], BLACK, b), B.v([out[0], out[1] - 0.006, out[2]], BLACK, b)]);
  }
  for (let k = 0; k < V; k++) {
    from = B.idx.length; B.quad(vis[k][0], vis[k][1], vis[k + 1][1], vis[k + 1][0]); B.orient(from, () => [0.25, 1, 0]);
    from = B.idx.length; B.quad(visU[k][0], visU[k + 1][0], visU[k + 1][1], visU[k][1]); B.orient(from, () => [0, -1, 0]);
    from = B.idx.length; B.quad(vis[k][1], visU[k][1], visU[k + 1][1], vis[k + 1][1]); B.orient(from, radial);
  }
  // embleem voorop de band: een klein schild in goud
  const ex = f.cx + f.rx * 1.06 + 0.003, ey = (y0 + y1) / 2 + 0.004, ez = f.zc;
  const e = [[0, 0.016, -0.011], [0, 0.016, 0.011], [0, 0, 0.012], [0, -0.016, 0], [0, 0, -0.012]].map((d) => B.v([ex + 0.004, ey + d[1], ez + d[2]], GOLD, b));
  const ec = B.v([ex + 0.007, ey + 0.002, ez], GOLD, b);
  from = B.idx.length;
  for (let k = 0; k < e.length; k++) B.tri(e[k], e[(k + 1) % e.length], ec);
  B.orient(from, () => [1, 0, 0]);
  // kinriem: een smalle zwarte strook over de voorkant van de band, net boven de klep
  const R = 8, st = [], sb = [];
  for (let k = 0; k <= R; k++) { const t = -0.9 + (k / R) * 1.8; st.push(B.v(at(t, y0 + 0.012, 1.065), BLACK, b)); sb.push(B.v(at(t, y0 + 0.004, 1.065), BLACK, b)); }
  from = B.idx.length;
  for (let k = 0; k < R; k++) B.quad(sb[k], st[k], st[k + 1], sb[k + 1]);
  B.orient(from, radial);
  return B;
}

// --- politie-uniform: reflectiebanden, koppel, epauletten, embleem en naamplaatje ------------------------
function politieuniform(ctx) {
  const B = builder();
  // reflecterende band om elke bovenarm, op 40% van schouder naar elleboog
  for (const sd of ['L', 'R']) {
    const up = ctx.bone('UpperArm' + sd), lo = ctx.bone('LowerArm' + sd);
    const as = sub(lo.p, up.p), c = add(up.p, mul(as, 0.42));
    band(B, c, as, ctx.profile(c, as, 12, ['romp'], ['UpperArm' + sd, 'LowerArm' + sd]), 0.05, 0.004, 0.006, REFLECT, up.i);
  }
  // koppel om de heup: op de hoogte van de broeksband, de straal per sector uit broek en romp
  const hips = ctx.bone('Hips');
  const bc = [hips.p[0], hips.p[1] + 0.055, hips.p[2]], up = [0, 1, 0];
  const radii = ctx.profile(bc, up, 20, ['benen', 'romp'], ['Hips', 'Abdomen', 'Body', 'Root', 'UpperLegL', 'UpperLegR']);
  band(B, bc, up, radii, 0.045, 0.006, 0.008, LEATHER, hips.i);
  // gesp voor, tasjes opzij en achter, holster rechts (aan de heup)
  const rAt = (t) => radii[Math.round(((t / (Math.PI * 2)) * radii.length + radii.length) % radii.length) % radii.length] + 0.014;
  const onBelt = (t, dy = 0) => [bc[0] + Math.cos(t) * rAt(t), bc[1] + dy, bc[2] + Math.sin(t) * rAt(t)];
  const out = (t) => [Math.cos(t), 0, Math.sin(t)], side = (t) => [-Math.sin(t), 0, Math.cos(t)];
  box(B, onBelt(0), [0.008, 0.02, 0.026], [out(0), up, side(0)], GOLD, hips.i);
  for (const t of [-1.25, 1.25 + 0.3, Math.PI - 0.5, Math.PI + 0.5]) box(B, onBelt(t, -0.02), [0.022, 0.035, 0.035], [out(t), up, side(t)], 0x22252b, hips.i);
  box(B, onBelt(1.25, -0.06), [0.025, 0.075, 0.03], [out(1.25), up, side(1.25)], BLACK, hips.i);   // holster rechts, hangt lager
  // epauletten: een plat klepje boven op elke schouder, met een goudkleurige streep
  for (const sd of ['L', 'R']) {
    const sh = ctx.bone('Shoulder' + sd), ua = ctx.bone('UpperArm' + sd), chest = ctx.bone('Chest');
    const mid = add(mul(sh.p, 0.45), mul(ua.p, 0.55));
    const top = ctx.surface([mid[0], mid[1] - 0.05, mid[2]], [0, 1, 0], ['romp']);
    const along = norm([0, 0, ua.p[2] - chest.p[2]]);
    box(B, add(top, [0, 0.004, 0]), [0.03, 0.004, 0.055], [[1, 0, 0], [0, 1, 0], along], NAVY_LIGHT, chest.i);
    box(B, add(top, [0, 0.009, along[2] * 0.035]), [0.031, 0.002, 0.006], [[1, 0, 0], [0, 1, 0], along], GOLD, chest.i);
  }
  // embleem op de linkerborst (een schildje) en een naamplaatje rechts, op de voorkant van de romp
  const ch = ctx.bone('Chest');
  for (const [sd, size, color] of [[-1, [0.004, 0.028, 0.022], GOLD], [1, [0.003, 0.011, 0.034], WHITE]]) {
    const p = ctx.surface([ch.p[0] - 0.05, ch.p[1] + 0.06, ch.p[2] + sd * 0.085], [1, 0, 0], ['romp']);
    box(B, add(p, [size[0] + 0.002, 0, 0]), size, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], color, ch.i);
  }
  return B;
}

const BUILDERS = { politiepet, politieuniform };
export function buildWear(id, ctx) {
  const f = BUILDERS[id];
  if (!f || !WEAR_REGISTER[id]) return null;
  const B = f(ctx);
  return { id, pos: B.pos, col: B.col, bone: B.bone, idx: B.idx, tris: B.idx.length / 3 };
}
export const wearIds = () => Object.keys(WEAR_REGISTER);
