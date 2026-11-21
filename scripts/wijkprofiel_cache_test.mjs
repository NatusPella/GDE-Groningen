// wijkProfileAt (trafficfleet.js): de cache per cel van 60 m heeft een grens (inefficientie-audit 21-11),
// en het antwoord blijft hetzelfde nadat hij is leeggemaakt.
import './node3d.mjs';
const { wijkProfileAt } = await import('../game/js/trafficfleet.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL ' + m); } };

const map = { meta: { neighbourhoodPoints: [{ x: 0, y: 0, name: 'Binnenstad' }, { x: 5000, y: 0, name: 'Helpman' }] } };
const eerst = wijkProfileAt(map, 10, 10);
ok(eerst && typeof eerst.key === 'string' && eerst.def, 'profiel heeft key en def');
const zelfde = wijkProfileAt(map, 15, 20); // dezelfde cel van 60 m
ok(zelfde === eerst, 'dezelfde cel geeft hetzelfde object terug (cache)');

// 20.000 verschillende cellen: de cache loopt over zijn grens heen en wordt geleegd, zonder dat het antwoord verandert
const t0 = performance.now();
for (let i = 0; i < 20000; i++) wijkProfileAt(map, i * 60 + 1, (i % 7) * 60 + 1);
const ms = performance.now() - t0;
const daarna = wijkProfileAt(map, 10, 10);
ok(daarna.key === eerst.key && daarna.wijk === eerst.wijk, 'na het legen: zelfde profiel voor dezelfde plek');
ok(ms < 2000, `20.000 cellen in ${ms.toFixed(0)} ms`);

if (fails) { console.error(`wijkprofiel_cache_test: ${fails} fout(en)`); process.exit(1); }
console.log('wijkprofiel_cache_test: alles goed');
