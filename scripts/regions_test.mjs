// regions.js: the region and the shown name at sample places (fallback data;
// with a built province layer in game/world the layer's own data as well).
import fs from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { regionAt, areaNameAt, setRegionData, regionLabels, seaRing } from '../game/js/regions.js';
import { setWorldPlaces } from '../game/js/worldplaces.js';

let bad = 0;
const fail = (m) => { bad++; console.error('FAIL', m); };

const P = (la, lo) => wgsToWorld(la, lo);
const CASES = [
  ['Lauwersoog', 53.4025, 6.2, 'groningen'],
  ['Groningen stad', 53.2194, 6.5665, 'groningen'],
  ['Zuidwolde-kant', 53.17, 6.75, 'groningen'],
  ['Leeuwarden-kant (Friesland)', 53.2, 5.8, 'friesland'],
  ['Drachten (Friesland)', 53.1, 6.1, 'friesland'],
  ['Emmen-kant (Drenthe)', 52.79, 6.9, 'drenthe'],
  ['Assen (Drenthe)', 53.0, 6.56, 'drenthe'],
  ['Bad Nieuweschans', 53.1833, 7.1900, 'groningen'],
  ['Duitsland (Bunde-kant)', 53.15, 7.3, 'duitsland'],
  ['Waddenzee', 53.47, 6.45, 'waddenzee'],
  ['Noordzee', 53.65, 6.3, 'noordzee'],
  ['Eems', 53.43, 6.95, 'eems'],
  ['Dollard', 53.28, 7.12, 'dollard'],
];

function run(label) {
  for (const [name, la, lo, want] of CASES) {
    const [x, y] = P(la, lo);
    const r = regionAt(x, y);
    if (r.id !== want) fail(`${label}: ${name} is ${r.id}, want ${want}`);
  }
}
run('fallback');

// the place names win over the region name where a place is near
setWorldPlaces([
  { name: 'Lauwersoog', kind: 'village', x: P(53.4045, 6.2)[0], y: P(53.4045, 6.2)[1] },
  { name: 'Bolsward', kind: 'town', x: P(53.06, 5.52)[0], y: P(53.06, 5.52)[1] },
]);
{
  const [x, y] = P(53.4045, 6.2);
  const a = areaNameAt(x, y);
  if (a.name !== 'Lauwersoog' || a.region !== 'groningen') fail('Lauwersoog name ' + JSON.stringify(a));
  const [fx, fy] = P(53.2, 5.8);
  const f = areaNameAt(fx, fy);
  if (f.name !== 'Friesland') fail('open Friesland should be named Friesland: ' + JSON.stringify(f));
  const [wx, wy] = P(53.47, 6.45);
  const w = areaNameAt(wx, wy);
  if (w.name !== 'Waddenzee') fail('Waddenzee name ' + JSON.stringify(w));
  const [ox, oy] = P(53.17, 6.75);
  if (areaNameAt(ox, oy).name === 'Friesland') fail('Groningen land named Friesland');
}
setWorldPlaces([]);

// labels: only regions that are really under their anchor
{
  const [x0, y0] = P(53.6, 5.9), [x1, y1] = P(52.8, 7.3);
  const L = regionLabels(x0, y0, x1, y1);
  const ids = L.map((l) => l.id);
  for (const id of ['groningen', 'friesland', 'drenthe']) if (!ids.includes(id)) fail('label ' + id + ' missing: ' + ids);
  if (!seaRing() || seaRing().length < 10) fail('no sea ring');
}

// with the built province layer the same answers
const idx = new URL('../game/world/index-provincie.json', import.meta.url);
if (fs.existsSync(idx)) {
  const g = JSON.parse(fs.readFileSync(idx, 'utf8')).global;
  setRegionData(g);
  run('layer');
  setRegionData(null);
}

if (bad) { console.error(`${bad} failed`); process.exit(1); }
console.log('regions_test: ok');
