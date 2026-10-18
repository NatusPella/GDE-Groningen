// Plaatslabel rond Corpus den Hoorn (#212, #162): node scripts/corpus_label_test.mjs
// worldPlaceAt (de plaatsen uit game/world/index-provincie.json) over een raster rond de
// wijk: binnen de stad hoort de plaats 'Groningen' te zijn, nooit leeg of 'dichtbij' (dat
// toont als Ommeland). Geen browser nodig.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setWorldPlaces, worldPlaceAt, worldPlaceNamed } from '../game/js/worldplaces.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'game', 'world', 'index-provincie.json');
if (!fs.existsSync(file)) { console.log('skip: game/world/index-provincie.json ontbreekt (wereld nog niet gebouwd)'); process.exit(0); }
setWorldPlaces(JSON.parse(fs.readFileSync(file, 'utf8')).global.places);

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const names = ['Corpus den Hoorn', 'Hoornse Meer', 'Hoornse Park'];
for (const name of names) {
  const p = worldPlaceNamed(name);
  ok(!!p, `${name} staat in de plaatsen`);
  if (!p) continue;
  const at = worldPlaceAt(p.x, p.y);
  ok(at && at.place === 'Groningen' && !at.near, `${name}: de plaats is Groningen`, JSON.stringify(at));
  ok(at && !!at.district, `${name}: er is een wijk (${at && at.district})`, JSON.stringify(at));
}
// raster rond Corpus den Hoorn: nergens 'dichtbij' of leeg binnen 900 m van het wijkpunt
const c = worldPlaceNamed('Corpus den Hoorn');
if (c) {
  const bad = {};
  let total = 0;
  for (let dx = -900; dx <= 900; dx += 100) for (let dy = -900; dy <= 900; dy += 100) {
    if (Math.hypot(dx, dy) > 900) continue;
    total++;
    const at = worldPlaceAt(c.x + dx, c.y + dy);
    if (!at || at.near || !at.place) bad[`${dx},${dy}`] = at;
  }
  ok(Object.keys(bad).length === 0, `raster (${total} punten) rond Corpus den Hoorn heeft overal een plaats`, JSON.stringify(bad).slice(0, 200));
}
console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
