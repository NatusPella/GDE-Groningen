// De vaarroutelijn (game/js/vaarlijn.js): ligt op het water, volgt de route, is bijgesneden,
// herbouwt bij een nieuwe berekening of een bocht, verdwijnt bij aankomst, en de bewaker:
// bij een actieve vaarroute bestaat de lijn. Pure regels, zonder three.
//   node scripts/vaarlijn_test.mjs
import assert from 'node:assert/strict';

const V = await import('../game/js/vaarlijn.js');
const { waterSurfaceAt, BOEZEM_Y } = await import('../game/js/waterlevels.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// een gracht in L-vorm: 12 m breed, eerst 600 m oostwaarts (y 0), dan 400 m zuidwaarts (x 600)
const gracht = [
  { x0: -10, x1: 606, y0: -6, y1: 6 },
  { x0: 594, x1: 606, y0: -6, y1: 406 },
];
const opWater = (x, y) => gracht.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
const map = { waterNear: () => [] };
const yAt = (x, y) => waterSurfaceAt(map, x, y);

const route = (extra = {}) => {
  const pts = [[0, 0], [300, 0], [600, 0], [600, 200], [600, 400]];
  const cum = [0, 300, 600, 800, 1000];
  return { pts, cum, length: 1000, remaining: 1000, mode: 'boat', kind: 'mission', idx: 0, px: 0, py: 0, version: 1, target: { x: 600, y: 400 }, ...extra };
};
// zoals routing.getRouteAhead
const ahead = (r, maxLen) => {
  const out = [[r.px, r.py]]; let acc = 0, prev = out[0];
  for (let i = r.idx + 1; i < r.pts.length; i++) {
    const q = r.pts[i], d = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    if (acc + d >= maxLen) { const k = (maxLen - acc) / (d || 1); out.push([prev[0] + (q[0] - prev[0]) * k, prev[1] + (q[1] - prev[1]) * k]); break; }
    acc += d; out.push(q); prev = q;
  }
  return out;
};
const lengte = (pts) => { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; };
const afstandTotLijn = (pts, x, y) => {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ex = pts[i + 1][0] - pts[i][0], ey = pts[i + 1][1] - pts[i][1], l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((x - pts[i][0]) * ex + (y - pts[i][1]) * ey) / l2));
    best = Math.min(best, Math.hypot(x - pts[i][0] - ex * t, y - pts[i][1] - ey * t));
  }
  return best;
};
const midden = (buf, i) => [(buf.pos[i * 6] + buf.pos[i * 6 + 3]) / 2, (buf.pos[i * 6 + 2] + buf.pos[i * 6 + 5]) / 2];

// --- wanneer is er een lijn -----------------------------------------------------------------
ok(V.vaarlijnGewenst(route()), 'een actieve vaarroute vraagt een lijn');
ok(!V.vaarlijnGewenst(route({ mode: 'drive' })), 'een autoroute krijgt geen vaarlijn');
ok(!V.vaarlijnGewenst(route({ mode: 'walk' })), 'een looproute krijgt geen vaarlijn');
ok(!V.vaarlijnGewenst(null), 'zonder route geen lijn');
ok(!V.vaarlijnGewenst(route({ remaining: 6 })), 'aangekomen (binnen 10 m): de lijn verdwijnt');
ok(!V.vaarlijnGewenst(route({ remaining: 0, px: 600, py: 400, idx: 3 })), 'op het doel: geen lijn');

// --- geometrie: op het water, volgt de route, bijgesneden ------------------------------------
const buf = V.maakLijnBuffers();
const posRef = buf.pos;
const r1 = route();
const a1 = ahead(r1, V.VAARLIJN.AHEAD_M);
const p1 = V.herbemonster(a1);
const g1 = V.vulLijn(buf, p1, yAt, { along0: 0, afgekapt: true });
ok(g1.n === p1.length && g1.nIdx === (g1.n - 1) * 6, 'één doorlopende strook: een quad per stuk');
let allesOpWater = true, volgt = true, opHoogte = true;
for (let i = 0; i < g1.n; i++) {
  const [x, z] = midden(buf, i);
  if (!opWater(x, z)) allesOpWater = false;
  if (afstandTotLijn(r1.pts, x, z) > 0.01) volgt = false;
  if (Math.abs(buf.pos[i * 6 + 1] - (BOEZEM_Y + V.VAARLIJN.LIFT)) > 1e-5) opHoogte = false;
  // ook de randen blijven in de gracht (halve breedte 1,7 m in een gracht van 12 m)
  for (const k of [0, 1]) if (!opWater(buf.pos[i * 6 + k * 3], buf.pos[i * 6 + k * 3 + 2])) allesOpWater = false;
}
ok(allesOpWater, 'de strook ligt overal op het water (midden en randen)');
ok(volgt, 'het midden van de strook ligt op de berekende vaarroute');
ok(opHoogte, 'de strook ligt op waterpeil plus een vaste lift (geen z-fighting, niet in de bodem)');
ok(buf.pos === posRef, 'de buffers worden hergebruikt (geen allocatie bij een herbouw)');
ok(lengte(p1) <= V.VAARLIJN.AHEAD_M + 0.5, `bijgesneden tot ${V.VAARLIJN.AHEAD_M} m vooruit (${lengte(p1).toFixed(0)} m)`);
ok(V.lijnAlfa(0, 240, true) === 0, 'het begin onder de boot is onzichtbaar');
ok(V.lijnAlfa(120, 240, true) === 1, 'midden: vol');
ok(V.lijnAlfa(238, 240, true) < 0.05, 'het bijgesneden eind fadet zacht uit');
ok(V.lijnAlfa(230, 240, true) > V.lijnAlfa(238, 240, true), 'de uitfade loopt geleidelijk');
const alfaEind = buf.col[(g1.n * 2 - 1) * 4 + 3];
ok(alfaEind < 0.05, 'de laatste hoekpunten van de strook zijn doorzichtig');

// --- de bocht: de lijn volgt hem en herbouwt -------------------------------------------------
const r2 = route({ idx: 1, px: 450, py: 0, version: 1 });
const p2 = V.herbemonster(ahead(r2, V.VAARLIJN.AHEAD_M));
const g2 = V.vulLijn(buf, p2, yAt, { along0: 450, afgekapt: true });
let bochtGezien = false, rond = true;
for (let i = 0; i < g2.n; i++) {
  const [x, z] = midden(buf, i);
  if (z > 10) bochtGezien = true;
  if (!opWater(x, z)) rond = false;
}
ok(bochtGezien && rond, 'achter de bocht loopt de lijn mee, nog steeds op het water');
ok(V.lijnSleutel(r1) !== V.lijnSleutel(r2), 'de lijn herbouwt als de boot verder is');
ok(V.lijnSleutel(r1) !== V.lijnSleutel(route({ version: 2 })), 'de lijn herbouwt bij een nieuwe berekening');
ok(V.lijnSleutel(r1) === V.lijnSleutel(route({ px: 0.4 })), 'een halve meter verder: geen herbouw');
ok(buf.uv[(g2.n * 2 - 1) * 2 + 1] > buf.uv[1], 'de chevronfase loopt door in vaarrichting');

// --- terugval: geen vaarroute --------------------------------------------------------------
const rNo = route({ noRoute: true, pts: [[0, 0], [600, 400]], cum: [0, 721], length: 721, remaining: 721 });
ok(V.vaarlijnGewenst(rNo) && V.vaarlijnTerugval(rNo), 'zonder vaarroute: wel een lijn, de gestippelde terugval');
ok(!V.vaarlijnTerugval(route()), 'een gevonden route is geen terugval');
ok(V.lijnSleutel(rNo) !== V.lijnSleutel(route()), 'terugval en vaarlijn hebben een andere sleutel');
const dpts = V.herbemonster(V.terugvalPunten([0, 0], [600, 400]), 0.8);
ok(lengte(dpts) <= V.VAARLIJN.DASH_AHEAD_M + 0.5, 'de terugval is bijgesneden');
const gd = V.vulLijn(buf, dpts, yAt, { afgekapt: true, dash: true });
ok(gd.nIdx > 0 && gd.nIdx < (gd.n - 1) * 6 * 0.6, 'de terugval is gestippeld: stukken ontbreken');

// --- bewaker: bij een actieve vaarroute bestaat de lijn --------------------------------------
// (de scene-kant, vaarlijn3d.js, bouwt de lijn precies uit deze regels; hier de contractregel)
const bewaker = (r) => { const w = V.vaarlijnGewenst(r); if (!w) return true; const pts = V.herbemonster(ahead(r, V.VAARLIJN.AHEAD_M)); return V.vulLijn(buf, pts, yAt, { afgekapt: true }).nIdx > 0; };
ok(bewaker(r1) && bewaker(r2) && bewaker(route({ idx: 3, px: 600, py: 300, remaining: 100 })), 'bij elke actieve vaarroute levert de bouw een lijn');
ok(V.herbemonster([[0, 0]]).length === 1 && V.vulLijn(buf, [[0, 0]], yAt).nIdx === 0, 'een enkel punt: geen lijn, geen fout');

console.log(`vaarlijn_test: ${n} checks ok`);
