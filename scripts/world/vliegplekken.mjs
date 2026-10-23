// De plekken van de vliegschool (#397), gemeten op de tegels van de provincie: geen gok.
//   node scripts/world/vliegplekken.mjs [--world=game/world] [--write]
// Schrijft (met --write) game/vliegplekken.json, dat vliegschool.js leest:
// Alles ligt hooguit RAND_MAX m buiten de provinciegrens: Eelde ligt in Drenthe en het spel draait een vliegtuig of helikopter terug als hij
// 3 km buiten de grens komt (worldedge.js, de 'lucht'-regel; vanaf 2,5 km komt er al een waarschuwing). `rand` staat bij elke plek.
//   water      rechte stukken open water voor "laag over water": lengte en vrije halve breedte gemeten
//   velden     vlakke weilanden zonder gebouw, water, weg of spoor, voor de noodlanding
//   molens     de ketting molens voor de slalom (uit landmarkkits.json: echte molens)
//   openingen  plekken tussen twee hoge gebouwen (>= 14 m volgens 3D BAG) waar de ruimte klopt: de breedte tussen de
//              gevels, de hoogte van het laagste dak en een vrije aanloop van 160 m zonder gebouw erin
// Alles rond Groningen Airport Eelde (de school staat bij Rotor Roelf). De gemeten waarden staan erbij, zodat de test
// (scripts/vliegplekken_test.mjs) ze kan nalopen en de moeilijkheid kan oplopen: ruim eerst, daarna krap.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await import(pathToFileURL(path.join(ROOT, 'scripts/node3d.mjs')).href);
const G = await import(pathToFileURL(path.join(ROOT, 'game/js/gdt.js')).href);
const { outsideDist } = await import(pathToFileURL(path.join(ROOT, 'game/js/worldedge.js')).href);

export const EELDE = { x: 1764.51, y: 9959.94 };
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const WORLD = path.resolve(ROOT, arg('world', 'game/world'));
const WRITE = process.argv.includes('--write');

const r1 = (v) => Math.round(v * 10) / 10;
const bounds = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return [Math.hypot(ax + dx * t - px, ay + dy * t - py), ax + dx * t, ay + dy * t]; };

// --- de tegels ---------------------------------------------------------------------------------------------
const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const fds = new Map();
function loadBlob(k) {
  const t = index.tiles[k];
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(WORLD, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  return G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
}
const rows = (blob, type) => ((blob.sections.find((s) => s.type === type) || { rows: [] }).rows).filter((r) => r.pts && r.pts.length > 1).map((r) => ({ ...r, b: bounds(r.pts) }));
const tileKeysNear = (x, y, r) => Object.keys(index.tiles).filter((k) => {
  const t = index.tiles[k];
  if (!t.n) return false;
  const [ox, oy] = G.tileOrigin(t.i, t.j);
  return ox + index.tileM >= x - r && ox <= x + r && oy + index.tileM >= y - r && oy <= y + r;
});

// een raster van alles wat een straal om een punt ligt (elke tegel eenmaal)
function world(cx, cy, r) {
  const W = { buildings: [], water: [], roads: [], rails: [] };
  const seen = { b: new Set(), w: new Set(), r: new Set(), l: new Set() };
  for (const k of tileKeysNear(cx, cy, r)) {
    const blob = loadBlob(k);
    for (const [kind, type, set] of [['buildings', G.SECTION.BUILDINGS, seen.b], ['water', G.SECTION.WATER, seen.w], ['roads', G.SECTION.ROADS, seen.r], ['rails', G.SECTION.RAILS, seen.l]]) {
      for (const row of rows(blob, type)) {
        const id = row.gid ?? row.osm ?? JSON.stringify(row.pts[0]);
        if (set.has(id)) continue;
        set.add(id);
        W[kind].push(row);
      }
    }
  }
  const CELL = 200;
  const grid = (list) => {
    const g = new Map();
    list.forEach((o, i) => {
      for (let x = Math.floor(o.b[0] / CELL); x <= Math.floor(o.b[2] / CELL); x++) for (let y = Math.floor(o.b[1] / CELL); y <= Math.floor(o.b[3] / CELL); y++) {
        const key = x + ',' + y;
        if (!g.has(key)) g.set(key, []);
        g.get(key).push(i);
      }
    });
    return (x, y, rr = 0) => {
      const out = new Set();
      for (let gx = Math.floor((x - rr) / CELL); gx <= Math.floor((x + rr) / CELL); gx++) for (let gy = Math.floor((y - rr) / CELL); gy <= Math.floor((y + rr) / CELL); gy++) for (const i of g.get(gx + ',' + gy) || []) out.add(i);
      return [...out].map((i) => list[i]);
    };
  };
  const nb = grid(W.buildings), nw = grid(W.water), nr = grid(W.roads), nl = grid(W.rails);
  return {
    ...W,
    inWater: (x, y) => nw(x, y).some((w) => w.pts.length > 2 && x >= w.b[0] && x <= w.b[2] && y >= w.b[1] && y <= w.b[3] && inPoly(x, y, w.pts)),
    // 0 als er geen gebouw staat, anders de hoogte (m) van het hoogste gebouw waar het punt in of binnen `m` meter van ligt
    buildingTop: (x, y, m = 0) => {
      let top = 0;
      for (const b of nb(x, y, m)) {
        if (x < b.b[0] - m || x > b.b[2] + m || y < b.b[1] - m || y > b.b[3] + m) continue;
        let hit = inPoly(x, y, b.pts);
        if (!hit && m > 0) for (let i = 0; i < b.pts.length && !hit; i++) { const q = b.pts[i], s = b.pts[(i + 1) % b.pts.length]; if (segDist(x, y, q[0], q[1], s[0], s[1])[0] <= m) hit = true; }
        if (hit) top = Math.max(top, Number.isFinite(b.hm) ? b.hm : (b.h || 3) * 3.1);
      }
      return top;
    },
    nearLine: (x, y, d) => [...nr(x, y, d), ...nl(x, y, d)].some((r) => { for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1])[0] < d) return true; return false; }),
  };
}

// de afstand buiten de rand van de provincie (m): negatief binnen de provincie
const EDGE = (index.global && index.global.edge) || null;
export const RAND_MAX = 2000;
const buitenRand = (x, y) => { const q = EDGE ? outsideDist(x, y, (EDGE.coast || []).concat(EDGE.border || [])) : null; return q ? Math.round(q.d) : -9999; };

const places = (index.global && index.global.places) || [];
const nearestPlace = (x, y) => { let best = null, bd = Infinity; for (const p of places) { if (p.kind === 'hamlet' && p.pop === 0) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best && bd < 6000 ? best.name : null; };

// --- water: rechte stukken -------------------------------------------------------------------------------------
function findWater(W) {
  const out = [];
  const big = W.water.map((w) => ({ w, a: (w.b[2] - w.b[0]) * (w.b[3] - w.b[1]) })).filter((o) => o.a > 250000).sort((a, b) => b.a - a.a);
  const rand = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const cands = [];
  for (const o of big.slice(0, 40)) {
    const w = o.w;
    for (let t = 0; t < 30; t++) {
      const sx = w.b[0] + rand() * (w.b[2] - w.b[0]), sy = w.b[1] + rand() * (w.b[3] - w.b[1]);
      if (!W.inWater(sx, sy)) continue;
      for (let a = 0; a < 360; a += 5) {
        const ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180);
        let f = 0, bk = 0;
        while (f < 3200 && W.inWater(sx + ca * (f + 20), sy + sa * (f + 20))) f += 20;
        while (bk < 3200 && W.inWater(sx - ca * (bk + 20), sy - sa * (bk + 20))) bk += 20;
        const len = f + bk;
        if (len < 1400) continue;
        // de vrije halve breedte langs het stuk: het smalste punt van de middelste 1200 m
        let half = Infinity;
        for (let s = -600; s <= 600; s += 40) {
          const px = sx + ca * s, py = sy + sa * s;
          let l = 0, rr = 0;
          while (l < 400 && W.inWater(px - sa * (l + 20), py + ca * (l + 20))) l += 20;
          while (rr < 400 && W.inWater(px + sa * (rr + 20), py - ca * (rr + 20))) rr += 20;
          half = Math.min(half, l, rr);
        }
        if (half >= 100) cands.push({ sx, sy, ca, sa, f, bk, len, half, a });
      }
    }
  }
  cands.sort((p, q) => q.len * Math.sqrt(q.half) - p.len * Math.sqrt(p.half));
  for (const c of cands) {
    // het stuk zelf: 1200 m, gecentreerd in de lengte van het water
    const mid = (c.f - c.bk) / 2;
    const a = { x: c.sx + c.ca * (mid - 600), y: c.sy + c.sa * (mid - 600) }, b = { x: c.sx + c.ca * (mid + 600), y: c.sy + c.sa * (mid + 600) };
    if (out.some((o) => Math.hypot(o.a.x - a.x, o.a.y - a.y) < 1500)) continue;
    if (Math.max(buitenRand(a.x, a.y), buitenRand(b.x, b.y), buitenRand(c.sx - c.ca * (c.bk - 500), c.sy - c.sa * (c.bk - 500))) > RAND_MAX) continue;
    out.push({ a, b, half: c.half, lengte: Math.min(c.len, 3200) });
    if (out.length >= 3) break;
  }
  return out.map((o, i) => ({
    id: 'water-' + (i + 1), naam: nearestPlace((o.a.x + o.b.x) / 2, (o.a.y + o.b.y) / 2),
    a: { x: r1(o.a.x), y: r1(o.a.y) }, b: { x: r1(o.b.x), y: r1(o.b.y) }, lengte: 1200, vrij: o.lengte, halveBreedte: o.half,
    afstandEelde: Math.round(Math.hypot((o.a.x + o.b.x) / 2 - EELDE.x, (o.a.y + o.b.y) / 2 - EELDE.y)),
    rand: Math.max(buitenRand(o.a.x, o.a.y), buitenRand(o.b.x, o.b.y)),
  }));
}

// --- velden: weiland voor een noodlanding --------------------------------------------------------------------------
function findFields(W) {
  const L = 420, B = 80, found = [];
  for (let r = 2800; r <= 9000; r += 120) {
    for (let a = 0; a < 360; a += 15) {
      const cx = EELDE.x + Math.cos(a * Math.PI / 180) * r, cy = EELDE.y + Math.sin(a * Math.PI / 180) * r;
      for (let h = 0; h < 8; h++) {
        const hd = (h / 8) * Math.PI;
        const c = Math.cos(hd), s = Math.sin(hd);
        let ok = true;
        for (let u = -L / 2 - 30; u <= L / 2 + 30 && ok; u += 20) for (let v = -B / 2 - 25; v <= B / 2 + 25 && ok; v += 20) {
          const x = cx + c * u - s * v, y = cy + s * u + c * v;
          if (W.buildingTop(x, y, 12) > 0 || W.inWater(x, y) || W.nearLine(x, y, 10)) ok = false;
        }
        if (!ok) continue;
        if (found.some((f) => Math.hypot(f.x - cx, f.y - cy) < 2500)) break;
        if (buitenRand(cx, cy) > RAND_MAX) break;
        found.push({ x: cx, y: cy, heading: hd, r });
        break;
      }
      if (found.length >= 4) break;
    }
    if (found.length >= 4) break;
  }
  return found.map((f, i) => ({ id: 'veld-' + (i + 1), naam: nearestPlace(f.x, f.y), x: r1(f.x), y: r1(f.y), heading: Math.round(f.heading * 1000) / 1000, lengte: L, breedte: B, afstandEelde: Math.round(f.r), rand: buitenRand(f.x, f.y) }));
}

// --- molens --------------------------------------------------------------------------------------------------------
function findMills() {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/landmarkkits.json'), 'utf8')).items.filter((x) => x.k === 'mill' && x.n && Number.isFinite(x.x));
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const start = items.filter((m) => d(m, EELDE) > 1500).sort((a, b) => d(a, EELDE) - d(b, EELDE))[0];
  const chain = [start];
  while (chain.length < 5) {
    const last = chain[chain.length - 1];
    const next = items.filter((m) => !chain.includes(m) && d(m, last) >= 900 && d(m, last) <= 3200).sort((a, b) => d(a, last) - d(b, last))[0];
    if (!next) break;
    chain.push(next);
  }
  return chain.map((m) => ({ naam: m.n, x: r1(m.x), y: r1(m.y) }));
}

// --- openingen tussen twee hoge gebouwen ---------------------------------------------------------------------------
function findGaps() {
  // alle hoge gebouwen (>= 14 m) van de provincie
  const tall = [];
  const seen = new Set();
  for (const k of Object.keys(index.tiles)) {
    const t = index.tiles[k];
    if (!t.n || !t.n.buildings || (t.maxH || 0) < 3) continue;
    for (const b of rows(loadBlob(k), G.SECTION.BUILDINGS)) {
      const hm = Number.isFinite(b.hm) ? b.hm : (b.h || 3) * 3.1;
      if (hm < 14 || b.pts.length < 3) continue;
      const id = b.gid ?? b.osm ?? JSON.stringify(b.pts[0]);
      if (seen.has(id)) continue;
      seen.add(id);
      tall.push({ pts: b.pts, b: b.b, hm, name: b.name || null });
    }
  }
  const closest = (A, B) => {
    let best = { d: Infinity };
    for (const [P, Q, flip] of [[A, B, false], [B, A, true]]) for (const p of P.pts) for (let i = 0; i < Q.pts.length; i++) {
      const q = Q.pts[i], r = Q.pts[(i + 1) % Q.pts.length];
      const [d, cx, cy] = segDist(p[0], p[1], q[0], q[1], r[0], r[1]);
      if (d < best.d) best = flip ? { d, ax: cx, ay: cy, bx: p[0], by: p[1] } : { d, ax: p[0], ay: p[1], bx: cx, by: cy };
    }
    return best;
  };
  const cands = [];
  for (let i = 0; i < tall.length; i++) for (let j = i + 1; j < tall.length; j++) {
    const A = tall[i], B = tall[j];
    if (A.b[0] - 100 > B.b[2] || B.b[0] - 100 > A.b[2] || A.b[1] - 100 > B.b[3] || B.b[1] - 100 > A.b[3]) continue;
    const c = closest(A, B);
    if (c.d < 22 || c.d > 70) continue;
    cands.push({ A, B, c });
  }
  // de aanloop moet vrij zijn: kijk met alle gebouwen van de omgeving (>= 4 m) langs de vliegrichting
  const good = [];
  const cache = new Map();
  const worldFor = (x, y) => {
    const key = Math.round(x / 1000) + ',' + Math.round(y / 1000);
    if (!cache.has(key)) cache.set(key, world(Math.round(x / 1000) * 1000, Math.round(y / 1000) * 1000, 900));
    return cache.get(key);
  };
  for (const { A, B, c } of cands) {
    const mx = (c.ax + c.bx) / 2, my = (c.ay + c.by) / 2;
    const dx = (c.bx - c.ax) / c.d, dy = (c.by - c.ay) / c.d; // zijwaarts: van gevel A naar gevel B
    const nx = -dy, ny = dx; // vliegrichting
    const D = c.d;
    const W = worldFor(mx, my);
    let clear = true, minGap = D;
    for (let s = -90; s <= 90 && clear; s += 10) for (let t = -D / 2 + 3; t <= D / 2 - 3; t += 4) {
      const x = mx + nx * s + dx * t, y = my + ny * s + dy * t;
      if (W.buildingTop(x, y, 0) >= 4) { clear = false; break; }
    }
    if (!clear) continue;
    // de breedte tussen de gevels op 60 m voor en achter de poort mag niet veel smaller zijn: alles wat 4 m of hoger is telt
    const hi = Math.min(A.hm, B.hm) - 3;
    good.push({ x: mx, y: my, nx, ny, breedte: D, hoogte: hi, daken: [A.hm, B.hm], namen: [A.name, B.name], minGap });
  }
  return good;
}

function pickSite(gaps) {
  // een cluster van poorten binnen 1,4 km van elkaar met een oplopende moeilijkheid (breed tot krap)
  const byDist = (g) => Math.hypot(g.x - EELDE.x, g.y - EELDE.y);
  let best = null;
  for (const seed of gaps) {
    const members = gaps.filter((g) => Math.hypot(g.x - seed.x, g.y - seed.y) < 1400);
    const wide = members.filter((g) => g.breedte >= 54), mid = members.filter((g) => g.breedte >= 36 && g.breedte < 48), tight = members.filter((g) => g.breedte >= 24 && g.breedte < 32);
    if (!wide.length || !mid.length || !tight.length) continue;
    // het hoogste dak telt: een hoge poort is te zien en te vliegen
    const pick = (list) => list.sort((a, b) => b.hoogte - a.hoogte)[0];
    const set = [pick(wide), pick(mid), pick(tight)];
    const score = set.reduce((s, g) => s + g.hoogte, 0) - byDist(seed) / 1000;
    if (!best || score > best.score) best = { set, score };
  }
  return best ? best.set : [];
}

const W0 = world(EELDE.x, EELDE.y, 12000);
console.log('gebouwen', W0.buildings.length, 'water', W0.water.length);
const water = findWater(W0);
console.log('water', JSON.stringify(water));
const velden = findFields(W0);
console.log('velden', JSON.stringify(velden));
const molens = findMills();
console.log('molens', JSON.stringify(molens));
const gaps = findGaps();
console.log('opening-kandidaten met vrije aanloop:', gaps.length);
const site = pickSite(gaps);
console.log('opening-site', JSON.stringify(site));

const outFile = {
  v: 1,
  bron: 'tegels van de provincie (OSM en 3D BAG) en landmarkkits.json',
  eelde: EELDE,
  water,
  velden,
  molens,
  openingen: site.map((g, i) => ({
    id: 'opening-' + (i + 1), naam: nearestPlace(g.x, g.y), x: r1(g.x), y: r1(g.y), nx: Math.round(g.nx * 1000) / 1000, ny: Math.round(g.ny * 1000) / 1000,
    breedte: r1(g.breedte), hoogte: r1(g.hoogte), daken: g.daken.map(r1), namen: g.namen,
  })),
};
if (WRITE) {
  fs.writeFileSync(path.join(ROOT, 'game/vliegplekken.json'), JSON.stringify(outFile, null, 1) + '\n');
  console.log('geschreven: game/vliegplekken.json');
}
