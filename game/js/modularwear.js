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
  bril: { nl: 'Bril', slot: 'hoofd', params: true, norm: { tris: [40, 220], kleuren: 1, eisen: ['monturen om beide ogen, voorop het gezicht', 'brug tussen de glazen', 'pootjes naar de oren', 'zonnebril: donkere glazen'] } },
  sjaal: { nl: 'Sjaal', slot: 'romp', params: true, norm: { tris: [30, 180], kleuren: 1, eisen: ['band om de nek op het lijf', 'slip over de borst'] } },
  rugzak: { nl: 'Rugzak', slot: 'romp', params: true, norm: { tris: [40, 200], kleuren: 2, eisen: ['bak op de rug', 'schouderbanden over beide schouders'] } },
  schoudertas: { nl: 'Schoudertas', slot: 'romp', params: true, norm: { tris: [40, 200], kleuren: 2, eisen: ['tas op de heup', 'band schuin over de borst'] } },
  voetbalshirt: {
    nl: 'Voetbalshirt (patroon, rugnummer, sponsor)', slot: 'romp', params: true,
    norm: { tris: [8, 520], kleuren: 2, eisen: ['strepen, helften en hoepels als vlakken 4 mm boven het shirt, voor en achter', 'rugnummer van zeven-segmentcijfers op de rug', 'naamstrook boven het nummer', 'sponsorpaneel op de borst'] },
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

// --- voetbalshirt: patroon, rugnummer, naamstrook en sponsorpaneel (spec = shirtBands uit clothing.js / footballkit.js) -----------------
// Dunne vlakken 4 mm op het oppervlak van de romp, per rij en kolom van hoogstens 4 cm zodat ze de bocht volgen; zelfde rijen en cijfers
// als het eigen model (models3d_people.js shirtBandGeometry), zodat een club er op beide modellen hetzelfde uitziet.
const KIT_ROWS = [0.97, 1.1, 1.22, 1.34, 1.46], KIT_BONES = ['Hips', 'Abdomen', 'Torso', 'Chest', 'Body', 'Root'];
const KIT_SEG = [[1, 1, 1, 0, 1, 1, 1], [0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1], [1, 1, 0, 1, 1, 1, 1], [1, 0, 1, 0, 0, 1, 0], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1]];
function voetbalshirt(ctx, spec) {
  const B = builder(), ch = ctx.bone('Chest').i, N = 24, cache = new Map();
  const col = (c, d) => (Number.isFinite(c) ? c : d);
  const radii = (y) => { const k = Math.round(y * 100); if (!cache.has(k)) cache.set(k, ctx.profile([0, y, 0], [0, 1, 0], N, ['romp'], KIT_BONES)); return cache.get(k); };
  const half = (y) => { const r = radii(y); return Math.max(0.1, (r[N / 4] + r[(3 * N) / 4]) / 2) * 0.97; };
  // x van het oppervlak (voor of achter) op hoogte y en zijwaarts z; null buiten de romp
  const surfX = (y, z, back) => {
    const r = radii(y), wz = half(y) / 0.97;
    if (Math.abs(z) > wz * 0.97) return null;
    const th = Math.asin(Math.max(-1, Math.min(1, z / wz))), a = ((back ? Math.PI - th : th) + Math.PI * 2) % (Math.PI * 2), s = Math.round((a / (Math.PI * 2)) * N) % N;
    return (back ? -1 : 1) * (r[s] * Math.cos(th) + 0.004);
  };
  const flat = (y0, y1, z0, z1, color, back) => {
    const nc = Math.max(1, Math.ceil(Math.abs(z1 - z0) / 0.04));
    for (let c = 0; c < nc; c++) {
      const za = z0 + ((z1 - z0) * c) / nc, zb = z0 + ((z1 - z0) * (c + 1)) / nc;
      const xa0 = surfX(y0, za, back), xb0 = surfX(y0, zb, back), xa1 = surfX(y1, za, back), xb1 = surfX(y1, zb, back);
      if ([xa0, xb0, xa1, xb1].some((x) => x === null)) continue;
      // één x voor de hele vierhoek (een vlak loodrecht op x): geen gedraaide vierhoek waarvan de helft de verkeerde kant op wijst
      const xq = back ? Math.min(xa0, xb0, xa1, xb1) : Math.max(xa0, xb0, xa1, xb1);
      B.quadDir(B.v([xq, y0, za], color, ch), B.v([xq, y0, zb], color, ch), B.v([xq, y1, zb], color, ch), B.v([xq, y1, za], color, ch), [back ? -1 : 1, 0, 0]);
    }
  };
  const color = col(spec.color, 0xffffff);
  const cells = [];
  for (let i = 0; i < KIT_ROWS.length - 1; i++) {
    for (const b of spec.bands || []) cells.push([i, b[0], b[1]]);
    for (const c of spec.cells || []) if (c[0] === i) cells.push(c);
  }
  for (const [i, t0, t1] of cells) {
    const y0 = KIT_ROWS[i] + 0.002, y1 = KIT_ROWS[i + 1] - 0.002, w = half((y0 + y1) / 2);
    const za = -w + 2 * w * Math.min(t0, t1), zb = -w + 2 * w * Math.max(t0, t1);
    flat(y0, y1, za, zb, color, false); flat(y0, y1, za, zb, color, true);
  }
  // rugnummer (zevensegmentcijfers), naamstrook en sponsorpaneel
  if (spec.number) {
    const digits = String(spec.number).split('').map(Number), n = digits.length, st = spec.numberStyle;
    const big = st === 'speciaal' ? 1.2 : st === 'hand' ? 0.9 : 1, dh = 0.17 * big, dw = 0.06 * big, th = 0.017 * (st === 'hand' ? 0.8 : 1), yc = spec.nameBar ? 1.22 : 1.24;
    digits.forEach((dg, di) => {
      const zc = (di - (n - 1) / 2) * (dw + 0.02), s7 = KIT_SEG[dg] || KIT_SEG[8];
      const parts = [[0, 0, dh / 2 - th / 2, dw, th], [1, -dw / 2 + th / 2, dh / 4, th, dh / 2 - th], [2, dw / 2 - th / 2, dh / 4, th, dh / 2 - th], [3, 0, 0, dw, th], [4, -dw / 2 + th / 2, -dh / 4, th, dh / 2 - th], [5, dw / 2 - th / 2, -dh / 4, th, dh / 2 - th], [6, 0, -dh / 2 + th / 2, dw, th]];
      for (const [si, dz, dy, sw, sh] of parts) if (s7[si]) flat(yc + dy - sh / 2, yc + dy + sh / 2, zc + dz - sw / 2, zc + dz + sw / 2, color, true);
    });
    if (spec.nameBar) flat(1.362, 1.378, -0.06, 0.06, color, true);
  }
  if (spec.sponsor) {
    const big = spec.sponsor.size === 'groot' ? 1.3 : spec.sponsor.size === 'klein' ? 0.8 : 1, sc = col(spec.sponsor.color, 0xdddddd);
    flat(1.2 - 0.026 * big, 1.2 + 0.026 * big, -0.07 * big, 0.07 * big, sc, false);
    flat(1.15 - 0.007, 1.15 + 0.007, -0.045 * big, 0.045 * big, sc, false);
  }
  return B;
}

// --- bril, sjaal, rugzak en schoudertas (kleding die het pack mist; look.glasses, look.scarf, look.bag uit clothing.js outfitToLook) -------
const DARK = 0x16171a, AX3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// bril: twee monturen om de ogen (vier staafjes elk, of een donker glas bij een zonnebril), een brug en twee pootjes naar de oren
function bril(ctx, p) {
  const B = builder(), f = ctx.face, h = ctx.bone('Head').i, shades = !!(p && p.shades);
  if (!f) return B;
  const t = 0.0035, zm = (f.eyes[0].c[2] + f.eyes[1].c[2]) / 2;
  for (const e of f.eyes) {
    const cx = e.x + 0.006, cy = e.c[1], cz = e.c[2], hw = e.w / 2 + 0.014, hh = e.h / 2 + 0.012;
    if (shades) box(B, [cx, cy, cz], [t, hh, hw], AX3, 0x0d0e10, h);
    else {
      box(B, [cx, cy + hh, cz], [t, t, hw + t], AX3, DARK, h); box(B, [cx, cy - hh, cz], [t, t, hw + t], AX3, DARK, h);
      box(B, [cx, cy, cz + hw], [t, hh, t], AX3, DARK, h); box(B, [cx, cy, cz - hw], [t, hh, t], AX3, DARK, h);
    }
    const sd = cz > zm ? 1 : -1;
    box(B, [cx - 0.07, cy + hh * 0.6, cz + sd * (hw + 0.012)], [0.07, t, t], AX3, DARK, h);   // het pootje langs de slaap
  }
  const my = (f.eyes[0].c[1] + f.eyes[1].c[1]) / 2, gap = Math.abs(f.eyes[0].c[2] - f.eyes[1].c[2]) / 2 - f.eyes[0].w / 2 - 0.014;
  box(B, [f.eyes[0].x + 0.006, my + 0.005, zm], [t, t, Math.max(0.004, gap)], AX3, DARK, h);
  return B;
}
// sjaal: een band om de nek met een slip over de borst; kleur uit p.color
function sjaal(ctx, p) {
  const B = builder(), nk = ctx.bone('Neck'), c = [nk.p[0], nk.p[1] + 0.015, nk.p[2]], color = p && Number.isFinite(p.color) ? p.color : 0x7a2e2e;
  const radii = ctx.profile(c, [0, 1, 0], 12, ['hoofd', 'romp'], ['Neck', 'Head', 'Chest']).map((r) => Math.min(r, 0.1));
  band(B, c, [0, 1, 0], radii, 0.085, 0.004, 0.03, color, nk.i);
  const ch = ctx.bone('Chest'), front = ctx.surface([ch.p[0] - 0.1, ch.p[1] + 0.07, ch.p[2]], [1, 0, 0], ['romp']);
  box(B, [front[0] + 0.012, ch.p[1], ch.p[2] + 0.03], [0.012, 0.13, 0.035], AX3, color, ch.i);
  return B;
}
// rugzak: een bak op de rug met twee schouderbanden; kleur uit p.color
function rugzak(ctx, p) {
  const B = builder(), ch = ctx.bone('Chest'), color = p && Number.isFinite(p.color) ? p.color : 0x2f3b52;
  const back = ctx.surface([ch.p[0] + 0.15, ch.p[1] - 0.02, ch.p[2]], [-1, 0, 0], ['romp']);
  box(B, [back[0] - 0.085, ch.p[1] - 0.03, ch.p[2]], [0.085, 0.17, 0.125], AX3, color, ch.i);
  box(B, [back[0] - 0.09, ch.p[1] - 0.17, ch.p[2]], [0.09, 0.04, 0.12], AX3, color, ch.i);
  const front = ctx.surface([ch.p[0] - 0.15, ch.p[1] + 0.07, ch.p[2]], [1, 0, 0], ['romp']);
  for (const s of [1, -1]) {
    box(B, [back[0] - 0.005, ch.p[1] + 0.14, ch.p[2] + s * 0.1], [0.012, 0.13, 0.017], AX3, 0x1c1c1f, ch.i);
    box(B, [(back[0] + front[0]) / 2, ch.p[1] + 0.2, ch.p[2] + s * 0.1], [Math.abs(front[0] - back[0]) / 2 + 0.01, 0.01, 0.017], AX3, 0x1c1c1f, ch.i);
    box(B, [front[0] + 0.01, ch.p[1] + 0.08, ch.p[2] + s * 0.1], [0.01, 0.13, 0.017], AX3, 0x1c1c1f, ch.i);
  }
  return B;
}
// schoudertas: een tas op de linkerheup met een band schuin over de borst; kleur uit p.color
function schoudertas(ctx, p) {
  const B = builder(), ch = ctx.bone('Chest'), hp = ctx.bone('Hips'), color = p && Number.isFinite(p.color) ? p.color : 0x6b2a24;
  const side = ctx.surface([hp.p[0], hp.p[1] + 0.02, hp.p[2]], [0, 0, -1], ['benen', 'romp']);
  box(B, [hp.p[0] + 0.02, hp.p[1] - 0.02, side[2] - 0.03], [0.13, 0.1, 0.03], AX3, color, hp.i);
  box(B, [hp.p[0] + 0.02, hp.p[1] + 0.05, side[2] - 0.03], [0.135, 0.045, 0.034], AX3, color, hp.i);
  const n = 12;   // de band schuin over de borst, van de rechterschouder naar de linkerheup, in overlappende stukjes
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), y = ch.p[1] + 0.2 - u * 0.4, z = 0.09 - u * 0.2, fx = ctx.surface([ch.p[0] - 0.2, y, z], [1, 0, 0], ['romp'])[0];
    box(B, [fx + 0.005, y, z], [0.005, 0.026, 0.014], AX3, 0x3a3a40, ch.i);
  }
  return B;
}

const BUILDERS = { politiepet, politieuniform, voetbalshirt, bril, sjaal, rugzak, schoudertas };
export function buildWear(id, ctx, params = null) {
  const f = BUILDERS[id];
  if (!f || !WEAR_REGISTER[id]) return null;
  const B = f(ctx, params);

  return { id, pos: B.pos, col: B.col, bone: B.bone, idx: B.idx, tris: B.idx.length / 3 };
}
export const wearIds = () => Object.keys(WEAR_REGISTER);
