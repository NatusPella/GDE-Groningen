// TileWorld.dropTile bezoekt alleen de rijen van de tegel (de lijst van addTile) in plaats van elke rij van de wereld (#379, #247): na dezelfde
// reeks addTile en dropTile is de wereld gelijk aan die van de oude manier (world.scanDrops), ook voor rijen die in twee tegels liggen.
//   node scripts/tiledrop_test.mjs
import './node3d.mjs';
const G = await import('../game/js/gdt.js');
const { TileWorld } = await import('../game/js/tileworld.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const global = { sections: [{ type: G.SECTION.META, json: { counts: { buildings: 0, green: 0, furniture: 0 }, meta: {} } }] };
const mk = () => {
  const tw = TileWorld.fromTiles(global, []);
  tw.resident = new Set(['pin']);
  return tw;
};
// vier tegels op een rij; gid 100 (een gebouw) en 200 (groen) liggen in twee tegels, de rest in een
const tile = (i) => ({ i, j: 0, sections: [
  { type: G.SECTION.BUILDINGS, rows: [{ gid: i * 10 + 1, pts: sq(i * 1000 + 10, 10, 20), h: 8 }, { gid: i * 10 + 2, pts: sq(i * 1000 + 100, 10, 20), h: 8 }, ...(i === 1 || i === 2 ? [{ gid: 100, pts: sq(1990, 10, 20), h: 8 }] : [])] },
  { type: G.SECTION.GREEN, rows: [{ gid: i * 10 + 3, pts: sq(i * 1000 + 300, 50, 40), k: 'park' }, ...(i === 2 || i === 3 ? [{ gid: 200, pts: sq(2990, 50, 40), k: 'park' }] : [])] },
  { type: G.SECTION.FURNITURE, rows: [{ gid: i * 10 + 4, k: 'hedge', pts: [[i * 1000 + 400, 100], [i * 1000 + 450, 100]], osm: 1 }, { gid: i * 10 + 5, k: 'lamp', pts: [[i * 1000 + 5, 5]] }] },
] });
const state = (tw) => JSON.stringify({
  res: Object.fromEntries(Object.entries(tw._res).map(([k, m]) => [k, [...m.entries()].map(([g, e]) => [g, [e.t, ...(e.more || [])].filter((x) => x !== undefined).sort()]).sort((a, b) => a[0] - b[0])])),
  grids: ['buildingGrid', 'greenGrid', 'hedgeGrid'].map((g) => { const all = new Set(); if (tw[g]) for (const a of tw[g].map.values()) for (const o of a) all.add(o); return all.size; }),
  furniture: tw.furniture ? tw.furniture.length : 0, resident: [...tw.resident].sort(),
});

const seq = [['add', 0], ['add', 1], ['add', 2], ['drop', 1], ['add', 3], ['drop', 2], ['drop', 0], ['add', 1], ['drop', 3], ['drop', 1]];
const run = (scan) => {
  const tw = mk();
  tw.scanDrops = scan;
  const states = [];
  for (const [what, i] of seq) {
    if (what === 'add') tw.addTile(tile(i), `${i},0`); else tw.dropTile(`${i},0`);
    states.push(state(tw));
  }
  return { tw, states };
};
const a = run(true), b = run(false);
ok(a.states.every((s, k) => s === b.states[k]), 'na elke stap dezelfde wereld als de oude scan', String(a.states.findIndex((s, k) => s !== b.states[k])));
ok(JSON.parse(b.states[2]).res.buildings.some(([g, t]) => g === 100 && t.length === 2), 'een gebouw in twee tegels telt beide tegels');
ok(JSON.parse(b.states[3]).res.buildings.some(([g, t]) => g === 100 && t.length === 1), 'na het loslaten van een van de twee blijft het gebouw staan');
ok(!JSON.parse(b.states[5]).res.buildings.some(([g]) => g === 100), 'na het loslaten van de tweede is het gebouw weg');
const last = JSON.parse(b.states[b.states.length - 1]);
ok(last.res.buildings.length === 0 && last.res.green.length === 0 && last.furniture === 0 && last.grids.every((x) => x === 0), 'na alle tegels los is de wereld leeg (rijen, rasters, meubilair)', b.states[b.states.length - 1].slice(0, 200));
ok(b.tw._tileRows.size === 0, 'de rijenlijsten zijn opgeruimd', String(b.tw._tileRows.size));
// een tegel zonder lijst (uit de vaste set) valt terug op de scan
const c = mk();
c.addTile(tile(0), '0,0');
c._tileRows.delete('0,0');
c.dropTile('0,0');
ok(c._res.buildings.size === 0 && c._res.green.size === 0, 'zonder lijst valt dropTile terug op de scan');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
