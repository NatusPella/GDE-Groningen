// #653: de actoren-index geeft dezelfde buren als een volledige scan, maar kost
// veel minder checks. node scripts/vehicleindex_test.mjs  (puur)
import fs from 'node:fs';
import { beginVehicleFrame, vehiclesNear, vehicleIndexStats } from '../game/js/vehicleindex.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// 120 voertuigen over 1200 x 1200 m, een paar dicht op elkaar
const vehicles = Array.from({ length: 120 }, (_, i) => ({ id: i, x: (i * 137) % 1200, y: (i * 89) % 1200, halfLen: 2 + (i % 5), halfWid: 1 }));
const world = { vehicles, _vehStamp: 0 };
const out = [];
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// pariteit: dezelfde set en dezelfde volgorde als filteren op afstand
let parity = 0, order = 0;
for (let q = 0; q < 200; q++) {
  beginVehicleFrame(world);
  const x = rnd() * 1400 - 100, y = rnd() * 1400 - 100, r = 8 + rnd() * 20;
  const got = vehiclesNear(world, x, y, r, out).map((v) => v.id);
  const want = vehicles.filter((v) => Math.hypot(v.x - x, v.y - y) <= r).map((v) => v.id);
  const a = [...got].sort((p, q2) => p - q2), b = [...want].sort((p, q2) => p - q2);
  if (a.join() === b.join()) parity++;
  if (got.join() === want.join()) order++;
}
ok(parity === 200, 'elke query geeft dezelfde buren als een volledige scan', parity);
ok(order === 200, 'en in dezelfde volgorde als world.vehicles', order);

// meting: checks per query tegenover de volledige scan
vehicleIndexStats.candidates = 0; vehicleIndexStats.queries = 0;
beginVehicleFrame(world);
for (let q = 0; q < 200; q++) vehiclesNear(world, rnd() * 1200, rnd() * 1200, 16, out);
const candidates = vehicleIndexStats.candidates;
const scan = 200 * vehicles.length;
ok(candidates < scan / 5, 'veel minder kandidaten dan een volledige scan', `${candidates} vs ${scan}`);
console.log(`#653 meting: 200 queries op 120 voertuigen -> ${candidates} kandidaten (volledige scan: ${scan} checks, -${(100 - candidates / scan * 100).toFixed(0)}%)`);

// één rebuild per frame, niet per query
const before = vehicleIndexStats.builds;
for (let f = 0; f < 50; f++) { beginVehicleFrame(world); for (let q = 0; q < 3; q++) vehiclesNear(world, rnd() * 1200, rnd() * 1200, 16, out); }
ok(vehicleIndexStats.builds - before === 50, 'één indexopbouw per frame (3 queries)', vehicleIndexStats.builds - before);

// de drie lezers gebruiken de index echt
for (const [file, loop] of [['game/js/vehicle/traffic.js', /for \(const o of vehiclesNear\(world, v\.x, v\.y, PATH_LEN \+ 5/],
  ['game/js/pedestrians.js', /for \(const v of vehiclesNear\(world, ped\.x, ped\.y, 16/],
  ['game/js/wildlife.js', /for \(const v of vehiclesNear\(world, a\.x, a\.y, 16/]]) {
  const src = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  ok(loop.test(src) && /vehicleindex\.js/.test(src), file + ' leest de buren uit de index');
}

// #752: de spellus zelf moet de index elk frame verversen. Alleen de menu-tick deed het,
// dus in het spel bouwde elke query de index opnieuw op en in de menuroute bevroor hij.
{
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  const frameBody = main.slice(main.indexOf('function frameBody('));
  const call = frameBody.indexOf('beginVehicleFrame(world)');
  const loop = frameBody.indexOf('updateGameplay(gameDt)');
  ok(call !== -1 && loop !== -1 && call < loop, 'main.js frameBody ververst de index één keer per spel-frame', call);
}
console.log(`${n - fails}/${n} vehicleindex`);
process.exit(fails ? 1 : 0);
