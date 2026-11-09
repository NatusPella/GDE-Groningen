// #804: de frame-pacing-meting. Pure test op de indeling die scripts/perf/hook.js in elke perf-run
// meegeeft: vallen de frame-intervallen op veelvouden van de schermperiode (16,7 ms) of ertussenin,
// en is de hoofdthread zelf over het beeldbudget gegaan? Zo kan een volgende hardwaremeting
// onderscheiden of een hapering een planningsfout is of werk.
//   node scripts/frame_pacing_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const bron = fs.readFileSync(new URL('./perf/hook.js', import.meta.url), 'utf8');
const m = /const pacingStats = \(frames\) => \{([\s\S]*?)\n  \};/.exec(bron);
assert.ok(m, 'de pacingfunctie staat in scripts/perf/hook.js');
const pacingStats = new Function('frames', m[1]);

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

// Twee nette beelden op 60 Hz: één vsync-emmer, en de CPU blijft onder één beeld.
let p = pacingStats([[0, 0], [16.7, 10], [33.4, 12]]);
ok(p.frames === 2, 'twee intervallen');
ok(p.beeldMs === 16.7, 'het beeldbudget is 16,7 ms');
ok(p.buckets.een === 2 && p.buckets.twee === 0 && p.buckets.anders === 0, 'beide op de 16,7-emmer', JSON.stringify(p.buckets));
ok(p.cpuOnderEenBeeld === 2 && p.cpuBovenEenBeeld === 0, 'de CPU blijft onder het beeldbudget');
ok(p.metVsyncWacht >= 1, 'een deel van het interval is vsync-wacht');

// Drie dubbele vsyncs en één interval ertussenin: dat laatste is geen cadans.
p = pacingStats([[0, 0], [33.3, 30], [66.6, 16], [99.9, 40], [139.9, 50]]);
ok(p.buckets.twee === 3, 'drie intervallen op 33,3 ms', JSON.stringify(p.buckets));
ok(p.buckets.anders === 1, 'het 40 ms-interval valt tussen de emmers');
ok(p.cpuOnderEenBeeld === 1 && p.cpuBovenEenBeeld === 3 && p.cpuBovenTweeBeelden === 2, 'de CPU-tellers', JSON.stringify(p.cpuOnderEenBeeld + '/' + p.cpuBovenEenBeeld + '/' + p.cpuBovenTweeBeelden));
ok(p.cpuBovenEenBeeld + p.cpuOnderEenBeeld === p.frames, 'elke frame heeft een CPU-oordeel');

// De emmers gaan uit van 60 Hz (de perf-vensters draaien op 1920x1080/60): een 8,3 ms-interval
// valt daarbuiten en blijft zichtbaar in de ruwe p25/p50 van de run.
p = pacingStats([[0, 0], [8.3, 3], [16.7, 4]]);
ok(p.buckets.anders === 2 && p.buckets.een === 0, 'snellere beeldperiodes staan in de ruwe cijfers, niet in de 60Hz-emmers');
ok(p.cpuOnderEenBeeld === 2, 'korte beelden blijven onder het budget');

// leeg of één frame: geen deling door nul
p = pacingStats([[10, 5]]);
ok(p.frames === 0 && p.buckets.een === 0 && p.cpuBovenEenBeeld === 0, 'één frame levert geen intervallen');
p = pacingStats([]);
ok(p.frames === 0, 'geen frames');

console.log(fails ? `${fails} van ${n} frame-pacing-checks mislukt` : `frame_pacing_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
