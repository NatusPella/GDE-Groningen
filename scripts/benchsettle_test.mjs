// De benchmark wacht op "world settled" (game/js/benchsettle.js).  node scripts/benchsettle_test.mjs
import fs from 'node:fs';
import { createSettle, settleTick, SETTLE, queueNear } from '../game/js/benchsettle.js';
import { tileOrigin, TILE_M } from '../game/js/gdt.js';
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
const rust = { tilesMissing: 0, prewarmPending: 0, buildings: 0, roads: 0, queue: 0 };

// rustige wereld: pas na minMs en calmMs
{
  const st = createSettle();
  ok(!settleTick(st, rust, 0).settled, 'bij 0 ms nog niet (minimale tijd)');
  ok(!settleTick(st, rust, SETTLE.minMs - 100).settled, 'onder minMs nog niet');
  ok(settleTick(st, rust, SETTLE.minMs + SETTLE.calmMs).settled, 'na minMs en calmMs rust: klaar');
}
// tegels en gebouwen in aanbouw houden de meting tegen
for (const [naam, q] of [['tegels', { ...rust, tilesMissing: 3 }], ['tegelwachtrij', { ...rust, queue: 5 }], ['prewarm', { ...rust, prewarmPending: 2 }], ['gebouwen', { ...rust, buildings: 4 }], ['wegen', { ...rust, roads: 1 }]]) {
  const st = createSettle();
  let t = 0, klaar = false;
  for (; t <= 10000; t += 100) if (settleTick(st, q, t).settled) { klaar = true; break; }
  ok(!klaar, `${naam}: niet klaar zolang het werk loopt`);
}
// een nieuwe uitbarsting zet de rust opnieuw in gang
{
  const st = createSettle();
  settleTick(st, rust, 0);
  settleTick(st, rust, 3000);
  const burst = settleTick(st, { ...rust, tilesMissing: 2 }, 3200);
  ok(!burst.settled || st.done, 'uitbarsting op 3200 ms (nog niet klaar of al klaar op 3000)');
  const st2 = createSettle();
  settleTick(st2, rust, 0);
  settleTick(st2, rust, 2400);
  settleTick(st2, { ...rust, buildings: 1 }, 2600); // rust onderbroken
  ok(!settleTick(st2, rust, 3000).settled, 'na een uitbarsting begint de rusttijd opnieuw');
  ok(settleTick(st2, rust, 3000 + SETTLE.calmMs + 10).settled, 'en is na calmMs klaar');
}
// de bovengrens: een trage schijf laat de benchmark niet hangen en het wordt gemeld
{
  const st = createSettle();
  let res = null;
  for (let t = 0; t <= SETTLE.maxMs + 100; t += 100) { res = settleTick(st, { ...rust, tilesMissing: 9 }, t); if (res.settled) break; }
  ok(res.settled && res.timedOut && res.reason === 'tegels', 'bovengrens: klaar met timedOut en de reden');
  ok(settleTick(st, rust, SETTLE.maxMs + 200).timedOut, 'het oordeel blijft staan');
}
// de bedrading: trailer.js wacht in de benchmark op deze poort voordat de klok start, voor elke stand
const tr = fs.readFileSync(new URL('../game/js/trailer.js', import.meta.url), 'utf8');
ok(tr.includes("import { createSettle, settleTick, queueNear } from './benchsettle.js'"), 'trailer.js gebruikt benchsettle');
// queueNear (24-11): alleen tegelstappen rond de plek tellen, niet de hele tegelrij
{
  const [cx, cy] = tileOrigin(3, 4);
  const f = { x: cx + TILE_M / 2, y: cy + TILE_M / 2 };
  const items = [{ label: 'add:3,4' }, { label: 'add:o3,5' }, { label: 'add:9,9' }, { label: 'drop:3,4' }, { label: '' }, {}, { label: 'add:kapot' }];
  ok(queueNear(items, f, 400) === 2, 'queueNear: de eigen tegel en de buur, niet de verre tegel, de drop of een kapot label');
  ok(queueNear(items, f, 20000) === 3, 'queueNear: met een enorme straal ook de verre tegel');
  ok(queueNear(null, f, 400) === 0 && queueNear(items, null, 400) === 0, 'queueNear: zonder rij of plek nul');
}
ok(/mode === 'benchmark'[\s\S]{0,2500}settleTick\(/.test(tr), 'de warm-up van een benchmark gebruikt de settled-poort');
if (fails) { console.log(`${fails} van ${n} mislukt`); process.exit(1); }
console.log(`benchsettle_test: ${n} gecontroleerd, alles goed`);
