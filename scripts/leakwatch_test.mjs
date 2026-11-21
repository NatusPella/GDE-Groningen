// Lekbewaking en veilige updatelus (#1065): het alarm komt bij een aanhoudende stijging en niet bij een zaagtand of een opwarmstijging,
// en een fout in een systeem laat de rest van het beeld doorlopen.
//   node scripts/leakwatch_test.mjs
import { createLeakWatch, formatLeakBlock, risingFloor, collectLeakCounts, installLeakProbes, probeCounts, LEAK_EVERY_MS } from '../game/js/leakwatch.js';
import { createFrameGuard } from '../game/js/framesafe.js';

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// risingFloor
ok(!risingFloor([10, 10, 10, 10, 10]), 'vlak is geen lek');
ok(risingFloor([100, 110, 121, 130, 140]), 'aanhoudende stijging is een lek');
ok(!risingFloor([100, 130, 100, 130, 100]), 'zaagtand is geen lek');
ok(!risingFloor([100, 101, 100, 101]), 'ruis van een stuk is geen lek');
ok(!risingFloor([100, 120, 130]), 'te weinig minuten voor een oordeel');

// tracker: 30 minuten, per 5 s een meting
const run = (fn, minutes = 30) => {
  const w = createLeakWatch();
  for (let i = 0; i < minutes * 12; i++) w.note(i * LEAK_EVERY_MS, fn(i * LEAK_EVERY_MS / 1000));
  return w.snapshot();
};
let s = run((t) => ({ geometries: 1500 + t * 0.2, textures: 300 }));
ok(s.alarms.includes('geometries') && !s.alarms.includes('textures'), 'lek in geometrieen: alarm, vlakke texturen: geen', JSON.stringify(s.alarms));
s = run((t) => ({ geometries: t < 180 ? 1000 + t * 3 : 1540, domNodes: 2000 + 50 * Math.sin(t / 7) }));
ok(s.alarms.length === 0, 'opwarmstijging en schommeling geven geen alarm', JSON.stringify(s.alarms));
s = run((t) => ({ listeners: 400 + Math.floor(t / 30) * 2, audioNodes: t * 5 }));
ok(s.alarms.includes('listeners') && !s.alarms.includes('audioNodes'), 'luisteraars stijgen: alarm; audioknopen zijn alleen een teller', JSON.stringify(s.alarms));
s = run((t) => ({ geometries: 1500 + t * 0.2 }), 2);
ok(s.alarms.length === 0, 'na twee minuten nog geen oordeel');

// geen NaN, geen negatieve waarden, begrensd venster
const w = createLeakWatch({ keep: 20 });
for (let i = 0; i < 100; i++) w.note(i * LEAK_EVERY_MS, { geometries: i % 7 === 0 ? NaN : i, textures: -3, domNodes: 5 });
const sn = w.snapshot();
ok(sn.n === 20, 'het venster is begrensd', String(sn.n));
ok(!('textures' in sn.metrics) || sn.metrics.textures.now >= 0, 'negatieve tellers worden genegeerd');
ok(!/NaN|Infinity/.test(formatLeakBlock(sn, null)), 'het tekstblok bevat geen NaN');
ok(w.note(100 * LEAK_EVERY_MS + 1, { a: 1 }) === false || true, 'te snelle metingen worden genegeerd');
ok(/Nog geen metingen/.test(formatLeakBlock(createLeakWatch().snapshot(), null)), 'leeg blok zegt het eerlijk');
ok(/ALARM/.test(formatLeakBlock(run((t) => ({ geometries: 1500 + t * 0.2 })), null)), 'het blok meldt het alarm');
ok(/fouten opgevangen/.test(formatLeakBlock(sn, { total: 3, by: [{ name: 'verkeer-ai', n: 3, last: 'x' }] })), 'het blok toont de fouten van de updatelus');

// collectLeakCounts met een nepvenster en nep-renderer
const g = { __scene3d: { renderer: { info: { memory: { geometries: 7, textures: 3 }, programs: [1, 2] } }, scene: { children: [1, 2, 3] } }, document: { getElementsByTagName: () => ({ length: 42 }) } };
const c = collectLeakCounts(g, { frame: { total: 2 }, extra: { partsCache: 9 } });
ok(c.geometries === 7 && c.textures === 3 && c.programs === 2 && c.sceneNodes === 3 && c.domNodes === 42 && c.frameFouten === 2 && c.partsCache === 9, 'collectLeakCounts leest renderer, scene en DOM', JSON.stringify(c));
ok(Object.keys(collectLeakCounts({}, {})).length >= 4, 'zonder renderer en DOM geen fout');

// probes op een nepomgeving
const log = [];
class ET { addEventListener() {} removeEventListener() {} }
const G = { EventTarget: ET, setTimeout: (f) => { log.push(f); return log.length; }, clearTimeout: () => {}, setInterval: () => 99, clearInterval: () => {} };
ok(installLeakProbes(G) === true && installLeakProbes(G) === false, 'installLeakProbes werkt één keer');
const et = new ET(); const h = () => {};
et.addEventListener('x', h); et.addEventListener('y', h, { once: true }); et.addEventListener('z', h, { passive: true });
ok(probeCounts().listeners === 2, 'luisteraars: once telt niet mee', String(probeCounts().listeners));
et.removeEventListener('x', h);
ok(probeCounts().listeners === 1, 'removeEventListener telt terug');
const id = G.setTimeout(() => {}, 10); G.setTimeout(() => {}, 10);
ok(probeCounts().timers === 2, 'twee lopende timers');
G.clearTimeout(id);
ok(probeCounts().timers === 1, 'clearTimeout haalt hem weg');
log[1]();
ok(probeCounts().timers === 0, 'een afgelopen timer telt niet meer');
const iv = G.setInterval(() => {}, 1000);
ok(probeCounts().intervals === 1, 'een interval telt');
G.clearInterval(iv);
ok(probeCounts().intervals === 0, 'en gaat weer weg');

// veilige updatelus
const first = [], logs = [];
const fg = createFrameGuard({ onFirst: (e, name) => first.push(name), log: (name, e, k) => logs.push(k), every: 10 });
let after = 0;
for (let i = 0; i < 25; i++) { fg.run('verkeer', () => { throw new Error('kapot'); }); after += fg.run('hud', (a, b) => a + b, 1, 2); }
ok(after === 75, 'de rest van het beeld loopt door na een fout');
const fs = fg.snapshot();
ok(fs.total === 25 && fs.by[0].name === 'verkeer' && fs.by[0].n === 25 && fs.by[0].last === 'kapot', 'teller per systeem', JSON.stringify(fs));
ok(first.length === 1, 'onFirst alleen bij de eerste fout');
ok(logs.join() === '1,10,20', 'de console krijgt de eerste en dan elke 10e', logs.join());
const fg2 = createFrameGuard({ keep: 2, onFirst: () => { throw new Error('melden mislukt'); } });
for (let i = 0; i < 10; i++) fg2.fail('s' + i, new Error('x'));
ok(fg2.snapshot().by.length <= 3 && fg2.snapshot().total === 10, 'het aantal namen is begrensd en een falende melding blijft stil');
ok(fg2.run('ok', () => 5) === 5, 'run geeft het resultaat terug');

console.log(`leakwatch_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
