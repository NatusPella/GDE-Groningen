// Komt een romp door? (#343) De route van het vaarnet (game/vaarnet.json) tussen twee punten, gemeten met wat het spel
// zelf weet: een rooster van CELL m in een strook van HALF m aan weerszijden van de lijn, open waar waterClearance
// (de oeverafstand die ook de sloep tegenhoudt) minstens MIN_CLEAR m is. Van het begin af wordt het open water
// uitgebreid; komt het einde van de route niet binnen, dan is de plek waar het stokt een dichte plek (een naad, een
// woonboot, een brugpijler, een dam): die wordt gemeld en overbrugd (12 m open) om verder te zoeken.
//   node scripts/hull_route_audit.mjs [x0 y0 x1 y1] [--kind=sloep] [--max=0]
// Zonder punten: van de binnenstad naar het zeewater bij Lauwersoog. Exit 1 bij meer dan --max dichte plekken.
// Heeft game/world met de provinciewereld nodig; zonder dat SKIP.
import './node3d.mjs';
import fs from 'node:fs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const { setCountryBounds } = await import('../game/js/countryfield.js');
const { waterClearance } = await import('../game/js/waterindex.js');
const { setRegionData, seaAt } = await import('../game/js/regions.js');
const { patchRows, createVaarNet, planVaarRoute } = await import('../game/js/vaarnet.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const G = await import('../game/js/gdt.js');
globalThis.requestAnimationFrame = (f) => setImmediate(f);

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const kind = opt('kind', 'sloep'), MAX = Number(opt('max', 0));
const CELL = 2.5, HALF = Number(opt("half", 40)), MIN_CLEAR = 1.5, PLUG = 12;

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
setCountryBounds(map.meta.bounds);
const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', root), 'utf8'));
setRegionData(idx.global);
map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip));
const net = createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));

const loaded = new Set();
async function loadAround(x, y, r = 700) {
  const keys = new Set();
  for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) {
    const [i, j] = G.tileIndexOf(x + dx, y + dy), k = G.tileKey(i, j);
    if (!loaded.has(k) && T.index.tiles[k]) keys.add(k);
  }
  for (const k of keys) loaded.add(k);
  if (keys.size) { await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 }))); map.tileQueue.run(1e9); }
}

let from, to;
if (args.length >= 4) { from = [Number(args[0]), Number(args[1])]; to = [Number(args[2]), Number(args[3])]; } else {
  const lau = idx.global.places.find((p) => /^Lauwersoog/.test(p.name));
  from = [0, -350]; to = null;
  // het zeewater dat het vaarnet zelf als bestemming kent (de tong voorbij de Robbengatsluis): een punt in open zee naast de dijk heeft geen
  // knoop in de buurt, de route eindigde dan in het Lauwersmeer en liep dwars door de dijk (#349)
  const zee = net.hubs['Waddenzee bij Lauwersoog'];
  if (zee !== undefined) to = [net.nodes[zee].x, net.nodes[zee].y];
  for (let r = 150; r < 2500 && !to; r += 50) for (let a = 0; a < 6.28 && !to; a += 0.3) {
    const x = lau.x + Math.cos(a) * r, y = lau.y + Math.sin(a) * r;
    await loadAround(x, y, 100);
    if (waterClearance(map, x, y, 6) > 3 && seaAt(x, y)) to = [x, y];
  }
}
console.log(`van ${from.map(Math.round)} naar ${to.map(Math.round)}`);
const route = planVaarRoute(net, from, to, kind);
if (!route) { console.log(`GEEN ROUTE voor ${kind} van ${from.map(Math.round)} naar ${to.map(Math.round)}`); process.exit(1); }
const P = route.pts, cum = [0];
for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
const total = cum[cum.length - 1];

// de strook: alle roostercellen binnen HALF m van de lijn, met de afstand langs de lijn van het dichtstbijzijnde punt
const cells = new Map(), key = (cx, cy) => cx * 1000003 + cy;
const X0 = -40000, Y0 = -40000;
for (let i = 0; i + 1 < P.length; i++) {
  const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]), m = Math.max(1, Math.ceil(L / CELL));
  for (let s = 0; s <= m; s++) {
    const px = P[i][0] + (P[i + 1][0] - P[i][0]) * s / m, py = P[i][1] + (P[i + 1][1] - P[i][1]) * s / m, along = cum[i] + L * s / m;
    const r = Math.ceil(HALF / CELL), cx0 = Math.floor((px - X0) / CELL), cy0 = Math.floor((py - Y0) / CELL);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const cx = cx0 + a, cy = cy0 + b, x = X0 + (cx + 0.5) * CELL, y = Y0 + (cy + 0.5) * CELL;
      if (Math.hypot(x - px, y - py) > HALF) continue;
      const k = key(cx, cy), c = cells.get(k), d = Math.hypot(x - px, y - py);
      if (!c) cells.set(k, { cx, cy, x, y, along, d, open: null });
      else if (d < c.d) { c.d = d; c.along = along; } // (de afstand langs de lijn van het dichtstbijzijnde punt erop)
    }
  }
}
for (let i = 0; i + 1 < P.length; i++) { const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]), m = Math.max(1, Math.ceil(L / 1)); for (let t = 0; t <= m; t++) { const c = cells.get(key(Math.floor((P[i][0] + (P[i + 1][0] - P[i][0]) * t / m - X0) / CELL), Math.floor((P[i][1] + (P[i + 1][1] - P[i][1]) * t / m - Y0) / CELL))); if (c) c.route = true; } }
// open of dicht, per tegel geladen
const order = [...cells.values()].sort((p, q) => p.along - q.along);
let n = 0;
for (const c of order) {
  if (n++ % 400 === 0) await loadAround(c.x, c.y, 500);
  c.open = waterClearance(map, c.x, c.y, 4) >= MIN_CLEAR;
}
// uitbreiden vanaf het begin (8-buurt); bij een stokpunt: de verste cel die bereikt is, daar een prop van PLUG m open
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const seen = new Set(), blockers = [];
const first = order.find((c) => c.open) || order[0];
let frontier = [first]; seen.add(key(first.cx, first.cy));
let reachedAlong = first.along;
const goalAlong = total - 150;
for (let guard = 0; guard < 400; guard++) {
  while (frontier.length) {
    const next = [];
    for (const c of frontier) for (const [dx, dy] of NB) {
      const q = cells.get(key(c.cx + dx, c.cy + dy));
      if (!q || !q.open || seen.has(key(q.cx, q.cy))) continue;
      seen.add(key(q.cx, q.cy)); next.push(q);
      if (q.along > reachedAlong) reachedAlong = q.along;
    }
    frontier = next;
  }
  if (reachedAlong >= goalAlong) break;
  // stok: de dichte plek vlak achter het verste punt
  const edge = order.filter((c) => seen.has(key(c.cx, c.cy)) && c.along >= reachedAlong - 2).pop();
  const ahead = order.find((c) => c.along > reachedAlong + 1 && !seen.has(key(c.cx, c.cy)));
  if (!edge || !ahead) break;
  if (blockers.length && blockers[blockers.length - 1].at === Math.round(reachedAlong)) break; // (de prop hielp niet)
  blockers.push({ at: Math.round(reachedAlong), x: Math.round(edge.x), y: Math.round(edge.y) });
  // overbrug: alle cellen binnen PLUG m van het stokpunt open
  for (const c of cells.values()) if (Math.hypot(c.x - edge.x, c.y - edge.y) <= PLUG && !c.open) c.open = true;
  frontier = order.filter((c) => seen.has(key(c.cx, c.cy)) && Math.hypot(c.x - edge.x, c.y - edge.y) <= PLUG + CELL);
}
// --profiel=<van>-<tot>: de vrije ruimte (waterClearance) langs de lijn zelf, per 4 m, tussen twee afstanden van het begin
{
  const pr = opt('profiel', '');
  if (pr) {
    const [a, b] = pr.split('-').map(Number);
    let line = '', last = -1e9;
    for (let i = 0; i + 1 < P.length; i++) {
      const L = cum[i + 1] - cum[i];
      for (let s = 0; s < L; s += 1) {
        const al = cum[i] + s;
        if (al < a || al > b || al - last < 4) continue;
        last = al;
        const x = P[i][0] + (P[i + 1][0] - P[i][0]) * s / L, y = P[i][1] + (P[i + 1][1] - P[i][1]) * s / L;
        await loadAround(x, y, 300);
        console.log(`  ${String(Math.round(al)).padStart(6)} m  (${Math.round(x)}, ${Math.round(y)})  vrij ${waterClearance(map, x, y, 6).toFixed(1)} m`);
      }
    }
  }
}
console.log(`route ${kind}: ${Math.round(total)} m, ${P.length} punten, strook ${HALF} m, vrije ruimte >= ${MIN_CLEAR} m`);
console.log(`dichte plekken waar de romp niet door kan: ${blockers.length}`);
for (const b of blockers) {
  console.log(`  op ${b.at} m van het begin, bij ${b.x},${b.y}`);
  if (process.argv.includes('--kaart')) {
    // kaartje: . open, # dicht, o bereikt, * de route zelf; alles uit het rooster dat er om heen ligt
    for (let dy = -24; dy <= 24; dy++) { let row = ""; for (let dx = -40; dx <= 40; dx++) { const c = cells.get(key(Math.floor((b.x + dx * CELL - X0) / CELL), Math.floor((b.y + dy * CELL - Y0) / CELL))); row += !c ? ' ' : c.route ? '*' : c.open ? (seen.has(key(c.cx, c.cy)) ? 'o' : '.') : '#'; } console.log('   ' + row); }
  }
}
console.log(reachedAlong >= goalAlong || blockers.length ? '' : 'het einde is niet te bereiken (geen plek gevonden)');
process.exit(blockers.length > MAX ? 1 : 0);
