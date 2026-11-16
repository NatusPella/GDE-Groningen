// #953: de M30-plekken van Vesting Bourtange op de geladen tegels. De plekken zijn destijds met
// de hand tegen het OSM-uittreksel gecontroleerd, niet op de tegels; deze test doet dat wel:
//  - elk punt is droog (geen waterpolygoon, een brug telt als droog), geen gebouw, open grond;
//  - het is te voet bereikbaar vanaf de Marktplein (vloedvulling over droge grond);
//  - de drie bolwerken liggen ver genoeg van de gracht dat de cirkel van de missiestap (12 m)
//    niet in het water valt -- daar viel de speler bij de marker in de gracht (#953).
//   node scripts/bourtange_test.mjs   (zonder game/world: SKIP)
import fs from 'node:fs';
import './node3d.mjs';

const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP bourtange_test: geen game/world met de provincie'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { isInWater, pointInPolygon } = await import('../game/js/util.js');
const { BOURTANGE } = await import('../game/js/missions_akte6.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
const keys = new Set();
for (let dx = -320; dx <= 320; dx += 100) for (let dy = -320; dy <= 320; dy += 100) {
  const [i, j] = G.tileIndexOf(BOURTANGE.plein[0] + dx, BOURTANGE.plein[1] + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const segDist = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0;
  return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
};
const inBuilding = (x, y) => map.buildingsNear(x, y, 0.4).some((b) => {
  const [minx, miny, maxx, maxy] = b.bounds;
  return x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts);
});
// afstand tot de dichtstbijzijnde waterrand (0 = erin)
const waterDist = (x, y) => {
  if (isInWater(map, x, y)) return 0;
  let best = Infinity;
  for (const w of map.waterNear(x, y, 80)) {
    for (let i = 0, j = w.pts.length - 1; i < w.pts.length; j = i++) {
      const [ax, ay] = w.pts[i], [bx, by] = w.pts[j];
      if (Math.max(ax, bx) < x - best || Math.min(ax, bx) > x + best || Math.max(ay, by) < y - best || Math.min(ay, by) > y + best) continue;
      best = Math.min(best, segDist(x, y, w.pts[j], w.pts[i]));
    }
  }
  return best;
};

// --- 1. elk punt: droog, geen gebouw, open grond --------------------------------------------
for (const [key, [x, y]] of Object.entries(BOURTANGE)) {
  ok(!isInWater(map, x, y), `${key} ligt niet in het water`, `${x},${y}`);
  ok(!inBuilding(x, y), `${key} ligt niet in een gebouw`);
  ok(map.canWalkOut(x, y, 6), `${key} is open grond waar je weg kunt lopen`);
}

// --- 2. te voet bereikbaar vanaf het Marktplein ----------------------------------------------
// droog (een brug telt droog) en geen gebouw: dezelfde regel als canWalkOut, over 2 m-cellen
const CELL = 2, X0 = 42260, Y0 = 22540, X1 = 42690, Y1 = 23010;
const W = Math.ceil((X1 - X0) / CELL), H = Math.ceil((Y1 - Y0) / CELL);
const seen = new Uint8Array(W * H);
const cellOf = (x, y) => [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)];
const free = (x, y) => !isInWater(map, x, y) && !inBuilding(x, y);
const [sx, sy] = cellOf(BOURTANGE.plein[0], BOURTANGE.plein[1]);
const stack = [sy * W + sx];
seen[stack[0]] = 1;
let reached = 0;
while (stack.length) {
  const k = stack.pop(); reached++;
  const i = k % W, j = (k - i) / W;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
    const nk = nj * W + ni;
    if (seen[nk] || !free(X0 + (ni + 0.5) * CELL, Y0 + (nj + 0.5) * CELL)) continue;
    seen[nk] = 1;
    stack.push(nk);
  }
}
ok(reached > 20000, `het Marktplein is met de vesting verbonden (${reached} droge cellen)`);
// hooiberg en gracht liggen aan de aanvallerskant, buiten de gracht; die komen met de reisstap
for (const key of ['plein', 'poort', 'brug', 'bolwerk1', 'bolwerk2', 'bolwerk3']) {
  const [i, j] = cellOf(BOURTANGE[key][0], BOURTANGE[key][1]);
  ok(seen[j * W + i] === 1, `${key} is te voet vanaf het Marktplein te bereiken`);
}

// --- 3. de bolwerken en de poort niet met de cirkel in de gracht ------------------------------
// De missiestap bij de bolwerken heeft radius 12 (missions_akte6.js): daar moet de speler zes
// tellen blijven staan. Zweeft het bolwerk zelf minder dan dat van het water, dan zet de marker
// hem in de gracht (#953). De poort, de ophaalbrug en de gracht liggen per definitie aan het
// water: daar telt alleen dat het punt zelf droog is (punt 1) en niet verder dan een paar meter
// van de kant, want dat is de plek van de scène.
const NEAR = { bolwerk1: 12, bolwerk2: 12, bolwerk3: 12, poort: 2, brug: 2, gracht: 3 };
for (const [key, min] of Object.entries(NEAR)) {
  const d = waterDist(BOURTANGE[key][0], BOURTANGE[key][1]);
  ok(d > 0, `${key} ligt niet in de gracht`);
  ok(d >= min, `${key} ligt ver genoeg van het water (${d.toFixed(1)} m, minstens ${min})`);
}
// de bron van de missie noemt geen grotere radius dan deze test kent
const RADIUS = { gracht: 10, brug: 7, bolwerk1: 12, bolwerk2: 12, bolwerk3: 12, poort: 9 };
{
  const src = fs.readFileSync(new URL('../game/js/missions_akte6.js', import.meta.url), 'utf8');
  for (const [key, r] of Object.entries(RADIUS)) {
    const at = src.indexOf(`bourtangeAt('${key}'`);
    ok(at > 0, `${key} staat in de missie`);
    const win = src.slice(at, at + 220);
    const m = /radius: (\d+)/.exec(win);
    ok(!!m && Number(m[1]) <= r, `${key}: de missie gebruikt radius ${m ? m[1] : '?'} (hooguit ${r})`);
  }
  // de bolwerken: de stapcirkel blijft op de wal
  for (const key of ['bolwerk1', 'bolwerk2', 'bolwerk3']) {
    ok(waterDist(BOURTANGE[key][0], BOURTANGE[key][1]) >= RADIUS[key], `${key}: de cirkel van de stap valt niet in de gracht`);
  }
}

console.log(bad ? `${bad} van ${n} mislukt` : `bourtange_test: ok (${n} controles, ${reached} droge cellen bereikbaar)`);
process.exit(bad ? 1 : 0);
