// Buslijnmodel (game/js/busroutes.js, #80): puur, met een synthetische lijn.
//   node scripts/bus_lines_test.mjs
import * as B from '../game/js/busroutes.js';
import fs from 'node:fs';

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// rechte lijn van 1000 m met drie haltes (de middelste dubbel), heen en terug
const raw = { id: 1, ref: '61', name: 'Echte Naam', pts: [[0, 0], [500, 0], [1000, 0]], stops: [{ x: 10, y: 3 }, { x: 500, y: 2 }, { x: 505, y: -2 }, { x: 990, y: 0 }] };
const line = B.prepareLine(raw);
ok(line && Math.abs(line.length - 1000) < 1e-6, 'lengte 1000');
ok(line.stops.length === 3, `dubbele halte samengevoegd (${line.stops.length})`);
ok(!line.loop, 'geen lus');
ok(!/Echte/.test(line.name) && /^Lijn 61 /.test(line.name), `verzonnen naam: ${line.name}`);
ok(B.lineName('61') === B.lineName('61'), 'naam stabiel');
ok(B.prepareLine({ pts: [[0, 0], [50, 0]] }) === null, 'te korte lijn valt af');

// de rit: rijdt, houdt stil bij haltes, keert aan het eind om
const r = B.makeRunner(line, 0, 1);
let x = 0, hold = 0, served = 0, turned = false;
for (let t = 0; t < 600 && !turned; t += 0.5) {
  const o = B.stepRunner(r, x, 0, 0.5);
  if (o.atStop && o.hold > 0 && hold === 0) served++;
  hold = o.hold;
  if (o.hold === 0) x += r.dir * 10 * 0.5;
  if (r.dir < 0) turned = true;
  ok(o.goal.y === 0 && Math.abs(o.goal.x - x) <= B.LOOKAHEAD + 1, `doel ${Math.round(o.goal.x)} bij x ${Math.round(x)}`);
}
ok(turned, 'keert om aan het eind');
ok(served >= 2, `${served} haltes bediend op de heenreis`);
ok(B.nextStop(r) && B.nextStop(r).s < r.s, 'terug: volgende halte ligt achter');

// ronde lijn: loopt door
const lus = B.prepareLine({ id: 2, ref: '5', pts: [[0, 0], [300, 0], [300, 300], [0, 300], [10, 10]], stops: [] });
ok(lus && lus.loop, 'lus herkend');
const rl = B.makeRunner(lus, lus.length - 20, 1);
B.stepRunner(rl, lus.pts[lus.pts.length - 1][0], lus.pts[lus.pts.length - 1][1], 0.1);
ok(rl.s < 50 && rl.trips === 1, 'lus wikkelt');

// smalle stukken
const narrow = B.narrowSpans(line, (px) => (px > 300 && px < 400 ? 3.0 : 7), 2.6);
ok(narrow.length === 1 && narrow[0].from >= 290 && narrow[0].to <= 410, `smal stuk gevonden ${JSON.stringify(narrow)}`);
ok(B.narrowSpans(line, () => null).length === 1, 'geen weg = één smal stuk');

ok(B.nearestLine([line, lus], 600, 40) === line && B.nearestLine([line], 600, 900) === null, 'nearestLine');
ok(B.linesNear([line, lus], 600, 40, 5000).length === 2 && B.linesNear([line, lus], 600, 40, 5000)[0] === line && B.linesNear([line], 600, 900, 100).length === 0, 'linesNear: alle lijnen in bereik, dichtstbij eerst');

// de echte provincielijnen (alleen als de wereld gebouwd is)
const real = new URL('../game/world/provincie-bus.json', import.meta.url);
if (fs.existsSync(real)) {
  const j = JSON.parse(fs.readFileSync(real, 'utf8'));
  const all = B.prepareLines(j.bus);
  ok(j.bus.length >= 200, `${j.bus.length} lijnen in de data`);
  ok(all.length >= 200, `${all.length} bruikbare lijnen`);
  const names = new Set(all.map((l) => l.name));
  ok(all.every((l) => l.name.startsWith('Lijn ') && l.stops.length >= 2 && l.length >= B.MIN_LENGTH), 'elke lijn heeft naam, haltes, lengte');
  ok(names.size > 5, 'lijnnamen verschillen');
  // elke lijn laat zich van begin tot eind rijden zonder vast te lopen
  let stuck = 0;
  for (const l of all) {
    const rr = B.makeRunner(l, 0, 1);
    let x = l.pts[0][0], y = l.pts[0][1], n = 0;
    while (rr.trips < 1 && rr.dir > 0 && n++ < 20000) {
      const o = B.stepRunner(rr, x, y, 0.5);
      if (o.hold === 0) { x = o.goal.x; y = o.goal.y; }
    }
    if (n >= 20000) stuck++;
  }
  ok(stuck === 0, `${stuck} lijnen lopen vast`);
}

if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('bus lines ok');
