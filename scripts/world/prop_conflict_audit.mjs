// Randen van weilanden (palen, draad, heggen) en vee tegen wat de tegels echt hebben
// (#124, #185, #210): over SPOOR, WEG, WATER, GEBOUW en de procedurele SLOOT, dubbele
// palen, gaten op de tegelnaden en vee dat in water, op een weg of op het spoor staat.
// Het onderzoek (weiland-randen-sloten.md) mat 885 palen over spoor buiten 5 km van de stad;
// dit is de herhaalbare versie, met drempels die alleen kunnen dalen.
//
// Sinds #502 keurt de audit ook wat er ná de start gebeurt: of een kudde met haar
// graasbereik (huis plus loopafstand, binnen het perceel) de rijbaan kan halen, en of
// een wandelaar van pedestrians.js op de asfaltstrook van een weg terechtkomt.
//
//   node scripts/world/prop_conflict_audit.mjs [--strict] [--rail N] [--random N] [--seed S] [--json]
//
// Vensters van 1 x 1 km in de provincietegels (>700 m buiten de stad): N met spoor, N willekeurig,
// per streek (dichtstbijzijnde ankerplaats). De echte generator countryside.js wordt gedraaid
// met dezelfde wereldopzet als main.js (provincieblokken, setExtraBlocked met realBlockedAt,
// spoorcellen uit provincie-land.json).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const PW = await import('../../game/js/provinceworld.js');
const CE = await import('../../game/js/countryedge.js');
const CF = await import('../../game/js/countryfield.js');
const CS = await import('../../game/js/countryside.js');
const SF = await import('../../game/js/streetfurniture.js');
const { isOnRoad, CAR_ROAD_CATS } = await import('../../game/js/pedgeom.js');
const { spawnPedestriansNear } = await import('../../game/js/pedestrians.js');

// Wat --strict toestaat: alleen dalen. ZERO: tellers die 0 moeten zijn (over spoor, weg, water, gebouw; vee in
// water, op weg of spoor; een kudde die de rijbaan kan halen; een wandelaar op de rijbaan). RATE: [teller, van wat,
// hoogstens aandeel]: de gemeten waarde op de standaardvensters
// (12 met spoor, 12 willekeurig, seed 7) met een kleine marge; wat de generator nog niet kan (dubbele palen,
// draad net over een sloot, naadgaten van andere hekken) staat hier met het gemeten aandeel.
export const ZERO = [
  'postOnRail', 'wireOnRail', 'hedgeOnRail', 'postOnRoad', 'wireOnRoad', 'hedgeOnRoad',
  'postInWater', 'wireInWater', 'hedgeInWater', 'postInBuilding', 'wireInBuilding', 'hedgeInBuilding',
  'cattleInWater', 'cattleOnRoad', 'cattleOnRail', 'cattleOnFarmland', 'cattleReachOnRoad',
  'osmOnRail', 'osmOnRoad', 'osmInWater', 'osmInBuilding', 'gateOnRail', 'walkersOnRoad',
];
export const RATE = [
  ['seamGaps', 'posts', 0.002], ['doublePosts', 'posts', 0.025], ['postOnDitch', 'posts', 0.001],
  ['wireOnDitch', 'wires', 0.004], ['postOnFarmland', 'posts', 0.02], ['hedgeOnDitch', 'hedges', 0.001],
];
export function overLimits(total) {
  const bad = [];
  for (const k of ZERO) if ((total[k] || 0) > 0) bad.push(`${k}: ${total[k]} (moet 0 zijn)`);
  for (const [k, of, max] of RATE) if ((total[k] || 0) > (total[of] || 0) * max) bad.push(`${k}: ${total[k]} van ${total[of]} (hoogstens ${max * 100}%)`);
  return bad;
}

const ANCHORS = {
  Stad: [[201, 45], [2838, 5353]],
  Hogeland: [[-3437, -12067], [6853, -21038], [1931, -9027], [-18000, -12800]],
  Westerkwartier: [[-12463, 6451], [-10733, -3016]],
  Veenkolonien: [[20602, 12605], [27095, 24744], [12852, 5971], [34069, 37758]],
  Oldambt: [[31789, 7892], [30259, 11886]],
  Eemsdelta: [[23009, -13018], [19323, -11582]],
};
export const streekOf = (x, y) => {
  let best = 'Stad', bd = Infinity;
  for (const [s, pts] of Object.entries(ANCHORS)) for (const [ax, ay] of pts) { const d = Math.hypot(x - ax, y - ay); if (d < bd) { bd = d; best = s; } }
  return best;
};

const bounds = (P) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

function loadTiles(out, index, keys) {
  const fds = new Map(), res = new Map();
  for (const k of keys) {
    const t = index.tiles[k];
    if (!t) continue;
    const f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    const rows = (ty) => ((blob.sections.find((s) => s.type === ty) || { rows: [] }).rows).filter((r) => r.pts && r.pts.length > 1).map((r) => ({ ...r, bounds: bounds(r.pts) }));
    res.set(k, { buildings: rows(G.SECTION.BUILDINGS), roads: rows(G.SECTION.ROADS), water: rows(G.SECTION.WATER), rails: rows(G.SECTION.RAILS), furniture: rows(G.SECTION.FURNITURE), parcels: rows(G.SECTION.PARCELS) });
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return res;
}

const near = (list) => (x, y, r) => list.filter((o) => x >= o.bounds[0] - r && x <= o.bounds[2] + r && y >= o.bounds[1] - r && y <= o.bounds[3] + r);

// a map shaped like TileWorld for realBlockedAt
function mapOf(tiles) {
  const all = (kind) => { const seen = new Set(), out = []; for (const t of tiles.values()) for (const r of t[kind]) { const k = r.gid ?? r; if (r.gid !== undefined) { if (seen.has(k)) continue; seen.add(k); } out.push(r); } return out; };
  const water = all('water'), rails = all('rails');
  return {
    resident: null,
    buildingsNear: near(all('buildings')), roadsNear: near(all('roads')),
    waterNear: near(water.filter((w) => w.nav !== undefined)), flatWaterNear: near(water.filter((w) => w.nav === undefined)),
    railNear: near(rails),
    furniture: all('furniture'),
    parcels: all('parcels'),
    all: { water, rails, roads: all('roads'), buildings: all('buildings') },
  };
}

const segDist = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
};
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };

// de vragen van de audit, over de rijen van de tegels (los van realBlockedAt: een eigen oordeel)
function judge(map) {
  const { roads, rails, water, buildings } = map.all;
  const np = near(map.parcels);
  const nr = near(roads), nl = near(rails), nw = near(water), nb = near(buildings);
  return {
    nearRail: (x, y, d) => nl(x, y, d).some((r) => { for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < d) return true; return false; }),
    onRail: (x, y) => nl(x, y, 3).some((r) => { for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < 2.1) return true; return false; }),
    onRoad: (x, y) => nr(x, y, 12).some((r) => {
      // alleen wegen op maaiveld (geen brug), zoals de generator ze kent
      if (r.bridge) return false;
      const hw = (r.width || 4) / 2;
      for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < hw) return true;
      return false;
    }),
    inWater: (x, y) => nw(x, y, 0.5).some((w) => inPoly(x, y, w.pts)),
    // OSM landuse=farmland at a point (only in a world built with PARCELS, global.osmParcels)
    // a post on the border is the neighbour's fence: only 2 m inside the polygon counts
    onFarmland: (x, y) => np(x, y, 2).some((p) => p.use === 'akker' && inPoly(x, y, p.pts) && !p.pts.some((q, i) => segDist(x, y, q[0], q[1], p.pts[(i + 1) % p.pts.length][0], p.pts[(i + 1) % p.pts.length][1]) < 2)),
    inBuilding: (x, y) => nb(x, y, 0.5).some((b) => inPoly(x, y, b.pts)),
  };
}

const KINDS = { post: 'post', wire: 'wire', hedge: 'hedge' };

// Kan een kudde vanaf haar graasplek de rijbaan halen? De dieren trekken een doel binnen
// `spread` van hun huis, begrensd door het perceel; dat perceel loopt tot de rand van de
// strook en kent de weg niet (#502). Rekent met de echte afstand tot de asfaltstrook.
function reachOnRoad(a, nrb) {
  const r = a.rect, sp = a.spread || 10;
  const x0 = Math.max(r[0], a.hx - sp), x1 = Math.min(r[2], a.hx + sp);
  const y0 = Math.max(r[1], a.hy - sp), y1 = Math.min(r[3], a.hy + sp);
  if (x0 > x1 || y0 > y1) return false;
  for (const rd of nrb(a.hx, a.hy, sp + 15)) {
    if (rd.bridge) continue;
    const hw = (rd.width || 4) / 2, P = rd.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const len = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      const n = Math.max(1, Math.ceil(len / 2));
      for (let k = 0; k <= n; k++) {
        const x = P[i][0] + (P[i + 1][0] - P[i][0]) * (k / n), y = P[i][1] + (P[i + 1][1] - P[i][1]) * (k / n);
        if (x < x0 - hw || x > x1 + hw || y < y0 - hw || y > y1 + hw) continue;
        if (Math.hypot(x - a.hx, y - a.hy) <= sp + hw) return true;
      }
    }
  }
  return false;
}

// Waar een wandelaar vandaan komt (pedestrians.js kiest een punt 1 tot 3 m naast een weg):
// bij een kruising is die berm de rijbaan van de kruisende weg, en daar loopt hij dan (#502).
// De echte spawner wordt op zulke punten losgelaten, met een vaste reeks per venster.
function walkerSample(map, ox, oy, seed) {
  const spots = [], seen = new Set();
  for (const r of map.all.roads) {
    if (seen.has(r)) continue;
    seen.add(r);
    const P = r.pts;
    for (let i = 0; i < P.length - 1 && spots.length < 24; i++) {
      for (const t of [0.05, 0.5, 0.95]) {
        const x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, y = P[i][1] + (P[i + 1][1] - P[i][1]) * t;
        if (x < ox || x > ox + 1000 || y < oy || y > oy + 1000) continue;
        spots.push([x, y]);
        if (spots.length >= 24) break;
      }
    }
    if (spots.length >= 24) break;
  }
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (const [x, y] of spots) out.push(...spawnPedestriansNear(map, x, y, 8, rnd, true));
  return { walkers: out.length, onRoad: out.filter((p) => isOnRoad(map, p.x, p.y, 0, CAR_ROAD_CATS)).length };
}


// de tegels van de provincie met spoor, en willekeurige, buiten de stad
export function pickWindows(index, { rail = 30, random = 30, seed = 7 } = {}) {
  const tiles = Object.entries(index.tiles).filter(([, t]) => t.flags & PW.PFLAG.PROVINCE && t.n);
  const far = tiles.filter(([, t]) => { const [ox, oy] = G.tileOrigin(t.i, t.j); return Math.hypot(ox + 500, oy + 500) > 6000; });
  const withRail = far.filter(([, t]) => t.n.rails > 0 && (t.n.buildings || 0) < 200).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const rest = far.filter(([, t]) => (t.n.buildings || 0) < 200).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const take = (list, n) => { const out = []; const pool = list.slice(); while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0][0]); return out; };
  return { rail: take(withRail, rail), random: take(rest, random) };
}

const nearRailCells = (rails) => ({ meta: { bounds: [-2000, -2000, 2000, 2000] }, railRoutes: [], countryRails: rails, roads: [], buildings: [], water: [], green: [] });

export function auditWindow(out, index, key, { rails = [] } = {}) {
  const t = index.tiles[key];
  const [ci, cj] = [t.i, t.j];
  const keys = [];
  for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) keys.push(G.tileKey(i, j));
  const tiles = loadTiles(out, index, keys);
  const map = mapOf(tiles);
  map.resident = new Set([...tiles.keys()].map((k) => `${index.tiles[k].i},${index.tiles[k].j}`));
  const idx = index.tiles;
  const isTile = (k) => (idx[k] && idx[k].flags & PW.PFLAG.PROVINCE ? idx[k] : null);
  const B = PW.provinceBlocksOf(Object.keys(idx).filter(isTile), isTile);
  CF.setProvinceBlocks(B ? { x0: B.x0, y0: B.y0, w: B.w, h: B.h, data: B.data } : null);
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  CE.setExtraBlocked((px, py, m) => PW.realBlockedAt(map, isTile, px, py, m));
  // like provinceworld.js: the OSM land use steers where the generator fences and herds (a world built with PARCELS)
  const npar = near(map.parcels);
  map.landUseAt = (x, y) => { let best = null, ba = Infinity; for (const q of npar(x, y, 0.5)) { const b = q.bounds; if (x < b[0] || x > b[2] || y < b[1] || y > b[3] || !inPoly(x, y, q.pts)) continue; const ar = (b[2] - b[0]) * (b[3] - b[1]); if (ar < ba) { ba = ar; best = q.use; } } return best; };
  CF.setProvinceDitches(!!(index.global && index.global.osmDitches));
  CE.setExtraHedge((px, py, r) => PW.realHedgeNear(map, px, py, r));
  CE.setExtraUse(index.global && index.global.osmParcels ? (px, py) => PW.realUseAt(map, isTile, px, py) : null);
  const J = judge(map);
  const [ox, oy] = G.tileOrigin(ci, cj);
  const c = { windows: 1, posts: 0, wires: 0, hedges: 0, cattle: 0 };
  const add = (k, n = 1) => { c[k] = (c[k] || 0) + n; };
  const nrb = near(map.all.roads);
  const T = 160;
  const posts = [], farmPosts = [], gatePts = [];
  for (let tx = Math.floor(ox / T); tx <= Math.floor((ox + 1000) / T); tx++) {
    for (let ty = Math.floor(oy / T); ty <= Math.floor((oy + 1000) / T); ty++) {
      const tile = CS.countryTileItems(tx, ty);
      for (const [kind, name] of Object.entries(KINDS)) {
        const m = tile.items[kind] && tile.items[kind].m;
        for (let q = 0; m && q < m.length; q += 16) {
          const px = m[q + 12], py = m[q + 14];
          if (px < ox || px > ox + 1000 || py < oy || py > oy + 1000) continue;
          // a wire is a span: its two ends and its middle; a post or hedge piece a point
          let pts = [[px, py]];
          if (kind === 'wire') { const hx = m[q] / 2, hy = m[q + 2] / 2; pts = [[px - hx, py - hy], [px, py], [px + hx, py + hy]]; add('wires'); }
          else add(kind === 'post' ? 'posts' : 'hedges');
          if (kind === 'post') posts.push([px, py]);
          const N = name;
          if (pts.some(([x, y]) => J.onRail(x, y))) add(N + 'OnRail');
          if (pts.some(([x, y]) => J.onRoad(x, y))) add(N + 'OnRoad');
          if (pts.some(([x, y]) => J.inWater(x, y))) add(N + 'InWater');
          if (pts.some(([x, y]) => J.inBuilding(x, y))) add(N + 'InBuilding');
          if (kind === 'post' && J.onFarmland(px, py)) farmPosts.push([px, py]);
          if (pts.some(([x, y]) => CF.countrySurface(x, y) === 'sloot')) add(N + 'OnDitch');
        }
      }
      // field gates: those at the track are the overweghekken of a fence the track cut; none may stand on it
      { const m = tile.items.gate && tile.items.gate.m; for (let q = 0; m && q < m.length; q += 16) { const gx = m[q + 12], gy = m[q + 14]; if (gx < ox || gx > ox + 1000 || gy < oy || gy > oy + 1000) continue; add('gates'); gatePts.push([gx, gy]); if (J.onRail(gx, gy)) add('gateOnRail'); if (J.nearRail(gx, gy, 30)) add('gateAtRail'); } }
      // grazing animals (a goose or a duck belongs in the water)
      for (const a of (tile.animals || []).filter((q) => q.kind !== 'goose' && q.kind !== 'duck')) {
        add('cattle');
        if (J.inWater(a.x, a.y)) { add('cattleInWater'); if (process.env.AUDIT_DEBUG) console.error('inWater', a.kind, Math.round(a.x), Math.round(a.y), map.all.water.filter((w) => inPoly(a.x, a.y, w.pts)).map((w) => w.kind + '/' + w.nav + '/' + (w.flat ? 'flat' : ''))); }
        if (J.onRoad(a.x, a.y)) add('cattleOnRoad');
        if (J.onRail(a.x, a.y)) add('cattleOnRail');
        if (J.onFarmland(a.x, a.y)) add('cattleOnFarmland');
        // en kan het dier er met een loopdoel komen? (het perceel kent de weg niet, #502)
        if (reachOnRoad(a, nrb)) add('cattleReachOnRoad');
      }
    }
  }
  // wandelaars: de echte spawner op de wegen van dit venster (pedestrians.js)
  { const w = walkerSample(map, ox, oy, 502 + ci * 7919 + cj); add('walkers', w.walkers); add('walkersOnRoad', w.onRoad); }
  // the short wings of a field gate in arable land are meant: only a post with no gate within 7 m counts
  for (const [fx, fy] of farmPosts) if (!gatePts.some(([gx, gy]) => Math.hypot(gx - fx, gy - fy) < 7)) add('postOnFarmland');
  // de gemapte OSM-hekken en -heggen (streetfurniture.js, zoals streetfurniture3d.js ze per tegel zet): over spoor, weg, gebouw, water
  {
    const wr = 1000 * 0.71 + 60, wx = ox + 500, wy = oy + 500;
    const mapped = map.furniture.filter((m) => m.pts && m.pts.some((q) => q[0] >= ox - 50 && q[0] < ox + 1050 && q[1] >= oy - 50 && q[1] < oy + 1050));
    const res = SF.furnitureForTile({
      x0: ox, y0: oy, size: 1000, roads: map.roadsNear(wx, wy, 1000 * 0.71 + 220), mapped,
      water: map.waterNear(wx, wy, wr).concat(map.flatWaterNear(wx, wy, wr)), rails: map.railNear(wx, wy, wr), buildings: map.buildingsNear(wx, wy, wr),
      opts: { towns: [] },
    });
    for (const it of res.items) {
      if ((it.k !== 'fence' && it.k !== 'hedge') || it.src !== 'osm') continue;
      add('osmPieces');
      if (J.onRail(it.x, it.y)) add('osmOnRail');
      if (J.onRoad(it.x, it.y)) add('osmOnRoad');
      if (J.inWater(it.x, it.y)) add('osmInWater');
      if (J.inBuilding(it.x, it.y)) add('osmInBuilding');
    }
  }
  // dubbele palen: een buur binnen 1,5 m
  const cell = new Map();
  for (const [x, y] of posts) { const k = Math.floor(x / 2) * 100003 + Math.floor(y / 2); (cell.get(k) || cell.set(k, []).get(k)).push([x, y]); }
  for (const [x, y] of posts) {
    let dup = false;
    for (let a = -1; a <= 1 && !dup; a++) for (let b = -1; b <= 1 && !dup; b++) for (const [qx, qy] of cell.get((Math.floor(x / 2) + a) * 100003 + Math.floor(y / 2) + b) || []) if ((qx !== x || qy !== y) && Math.hypot(qx - x, qy - y) < 1.5) { dup = true; break; }
    if (dup) add('doublePosts');
  }
  // gaten op de tegelnaden: twee opeenvolgende palen van één rij (zelfde x of zelfde y) met een naad van 160 m
  // ertussen en meer dan 6,5 m (en minder dan 13 m) uit elkaar: de draad en een paal ontbreken er
  for (const axis of [0, 1]) {
    const rows = new Map();
    for (const p of posts) { const k = Math.round(p[axis] * 20); (rows.get(k) || rows.set(k, []).get(k)).push(p[1 - axis]); }
    for (const list of rows.values()) {
      list.sort((u, v) => u - v);
      for (let i = 1; i < list.length; i++) {
        const gap = list[i] - list[i - 1];
        if (gap > 6.5 && gap < 13 && Math.floor(list[i - 1] / 160) !== Math.floor(list[i] / 160)) add('seamGaps');
      }
    }
  }
  CE.setExtraBlocked(null);
  CF.setProvinceBlocks(null);
  return c;
}

export function seamGaps(tiles = [[0, 0], [1, 0], [2, 0]]) {
  // palen van naast elkaar gelegen tegels: de afstand tussen de laatste paal van de ene en de eerste van de volgende
  // langs dezelfde strookrand (zelfde y op 0,05 m) mag niet groter zijn dan de stap
  const rows = new Map();
  for (const [tx, ty] of tiles) {
    const tile = CS.countryTileItems(tx, ty);
    const m = tile.items.post && tile.items.post.m;
    for (let q = 0; m && q < m.length; q += 16) {
      const k = Math.round(m[q + 12] * 10) + ':' + ty;
      (rows.get(k) || rows.set(k, []).get(k)).push(m[q + 14]);
    }
  }
  return rows;
}

export function sumWindows(list) {
  const t = {};
  for (const c of list) for (const [k, v] of Object.entries(c)) t[k] = (t[k] || 0) + v;
  return t;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? Number(args[i + 1]) : d; };
  const out = path.join(ROOT, 'game/world');
  const file = path.join(out, 'index-provincie.json');
  if (!fs.existsSync(file)) { console.log('SKIP geen game/world met de provinciegegevens: draai cd desktop && npm run stage'); return; }
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  // spoorcellen uit provincie-land.json, zoals main.js ze via applyCityRoutes zet
  const land = JSON.parse(fs.readFileSync(path.join(out, 'provincie-land.json'), 'utf8'));
  const pairs = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
  CE.initCountryEdge(nearRailCells((land.rails || []).map(pairs)));
  const W = pickWindows(index, { rail: opt('rail', 12), random: opt('random', 12), seed: opt('seed', 7) });
  const all = [...W.rail.map((k) => ['spoor', k]), ...W.random.map((k) => ['willekeurig', k])];
  const rows = [];
  for (const [kind, key] of all) {
    const t = index.tiles[key], [ox, oy] = G.tileOrigin(t.i, t.j);
    const c = auditWindow(out, index, key);
    rows.push({ kind, key, streek: streekOf(ox + 500, oy + 500), c });
  }
  const total = sumWindows(rows.map((r) => r.c));
  const perStreek = {};
  for (const r of rows) { const s = perStreek[r.streek] || (perStreek[r.streek] = []); s.push(r.c); }
  const keys = ['posts', 'wires', 'hedges', 'cattle', 'postOnRail', 'wireOnRail', 'hedgeOnRail', 'postOnRoad', 'wireOnRoad', 'hedgeOnRoad', 'postInWater', 'wireInWater', 'hedgeInWater', 'postInBuilding', 'wireInBuilding', 'hedgeInBuilding', 'postOnDitch', 'wireOnDitch', 'hedgeOnDitch', 'doublePosts', 'seamGaps', 'postOnFarmland', 'cattleOnFarmland', 'cattleReachOnRoad', 'gates', 'gateAtRail', 'gateOnRail', 'osmPieces', 'osmOnRail', 'osmOnRoad', 'osmInWater', 'osmInBuilding', 'cattleInWater', 'cattleOnRoad', 'cattleOnRail', 'walkers', 'walkersOnRoad'];
  if (args.includes('--json')) { console.log(JSON.stringify({ total, perStreek: Object.fromEntries(Object.entries(perStreek).map(([s, l]) => [s, sumWindows(l)])) })); }
  else {
    console.log(`${all.length} vensters (${W.rail.length} met spoor, ${W.random.length} willekeurig), seed ${opt('seed', 7)}`);
    const names = Object.keys(perStreek);
    console.log(['combinatie'.padEnd(18), ...names.map((n) => n.padStart(14)), 'totaal'.padStart(8)].join(' '));
    for (const k of keys) console.log([k.padEnd(18), ...names.map((n) => String(sumWindows(perStreek[n])[k] || 0).padStart(14)), String(total[k] || 0).padStart(8)].join(' '));
  }
  if (args.includes('--strict')) {
    const bad = overLimits(total);
    for (const m of bad) console.log('TE VEEL ' + m);
    if (bad.length) process.exit(1);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
