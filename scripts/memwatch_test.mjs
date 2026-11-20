// Geheugenbewaking (#1004): de heaptracker (piek, bodem, trend), het tekstblok van de technische info en de bronnen.
//   node scripts/memwatch_test.mjs
import { createHeapTracker, formatMemBlock, registerMemSource, memSources, MEM_EVERY_MS } from '../game/js/memwatch.js';
import { formatReport } from '../game/js/gpudiag.js';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// piek en bodem bij een zaagtand: de heap groeit tot 960 en valt terug naar 600
{
  const t = createHeapTracker();
  let at = 0;
  for (let k = 0; k < 60; k++) { t.note(at, 600 + (k % 10) * 40); at += MEM_EVERY_MS; }
  const s = t.snapshot();
  ok(s.peakMB === 960 && s.floorMB === 600, 'piek en bodem van de zaagtand', JSON.stringify(s));
  ok(Math.abs(s.slopePerMin) < 1, 'een vlakke bodem geeft geen trend', String(s.slopePerMin));
}
// een lek: de bodem stijgt 20 MB per minuut
{
  const t = createHeapTracker();
  let at = 0;
  for (let k = 0; k < 120; k++) { t.note(at, 500 + (at / 60000) * 20 + (k % 6) * 50); at += MEM_EVERY_MS; }
  const s = t.snapshot();
  ok(s.slopePerMin > 15 && s.slopePerMin < 25, 'een stijgende bodem geeft +20 MB/min', String(s.slopePerMin));
  ok(s.n === 120 && s.spanS === 595, 'venster van 120 metingen', JSON.stringify(s));
}
// te snelle metingen, NaN en nul tellen niet; het venster is begrensd
{
  const t = createHeapTracker({ keep: 10 });
  ok(t.note(0, 100) === true && t.note(1000, 100) === false, 'hooguit een meting per 5 s');
  ok(!t.note(10000, NaN) && !t.note(NaN, 5) && !t.note(20000, 0), 'NaN en nul worden genegeerd');
  for (let k = 2; k < 40; k++) t.note(k * MEM_EVERY_MS, 100 + k);
  ok(t.snapshot().n === 10, 'het venster blijft begrensd');
  const leeg = createHeapTracker().snapshot();
  ok(leeg.n === 0 && leeg.peakMB === 0 && leeg.slopePerMin === 0, 'leeg: alles nul, geen NaN', JSON.stringify(leeg));
}
// bronnen en tekst
{
  registerMemSource('audio', () => ({ buffers: 85, bytes: 6.5 * 1048576, uit: 3, scenarioBytes: 0 }));
  registerMemSource('tiles', () => ({ resident: 77, bytes: 38e6, loads: 400, evictions: 320 }));
  registerMemSource('kapot', () => { throw new Error('x'); });
  const src = memSources();
  ok(src.audio.buffers === 85 && src.kapot === null, 'een kapotte bron geeft null en breekt niets');
  const tr = createHeapTracker();
  for (let k = 0; k < 8; k++) tr.note(k * MEM_EVERY_MS, 900 + k);
  const tekst = formatMemBlock({ heap: { usedMB: 1200, totalMB: 1500, limitMB: 4096, tracker: tr.snapshot() }, render: { geometries: 1288, textures: 161, programs: 245 }, src });
  ok(/JS-heap nu: 1200 MB/.test(tekst) && /Heappiek sinds de start: 907 MB/.test(tekst) && /77 geladen/.test(tekst) && /85 klanken gedecodeerd \(6\.5 MB\)/.test(tekst), 'tekstblok bevat de tellers', tekst);
  ok(!/NaN|undefined/.test(tekst), 'geen NaN of undefined in het blok', tekst);
  const leeg = formatMemBlock({});
  ok(!/NaN|undefined/.test(leeg) && /\[Geheugen\]/.test(leeg), 'leeg blok blijft leesbaar', leeg);
  const rapport = formatReport({ version: '0', mem: { heap: { usedMB: 10, totalMB: 20, limitMB: 30, tracker: tr.snapshot() }, render: {}, src: {} } });
  ok(/\[Geheugen\]/.test(rapport), 'het rapport van de technische info bevat het geheugenblok');
}
console.log(fails ? `memwatch_test: ${fails} van ${n} mislukt` : `memwatch_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
