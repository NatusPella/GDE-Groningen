// Gedeelde speelklok en desync-hash (#95), puur: geen netwerk, geen spel.
import assert from 'node:assert/strict';
import { klokEvent, leesKlokEvent, KlokVolger, hourDiff } from '../game/js/net/speelklok.js';
import { fnv, viewOf, hashView, hashEvent, leesHashEvent, DesyncMonitor, verschil } from '../game/js/net/desync.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

// --- klok
near(hourDiff(23.5, 0.5), 1, 1e-9, 'over middernacht');
near(hourDiff(1, 23), -2, 1e-9, 'terug over middernacht');
const ev = klokEvent({ clock: 13.25, time: 100 });
eq(leesKlokEvent(ev), { t: 100, uur: 13.25 }, 'klok-event rondreis');
eq(leesKlokEvent({ k: 'klok', t: 1, uur: 24 }), null, 'uur 24 is ongeldig');
eq(leesKlokEvent({ k: 'klok', t: NaN, uur: 3 }), null, 'NaN');
eq(leesKlokEvent(null), null, 'null');

// de host loopt 0,02 uur per seconde; de gast ontvangt elke 2 s
const v = new KlokVolger();
let gast = 5; // de gast begint ver weg
for (let t = 0; t <= 40; t += 2) {
  v.observe({ t, uur: 12 + 0.02 * t }, t + 0.05); // 50 ms onderweg
  for (let i = 0; i < 20; i++) gast = v.step(gast, 0.1, t + i * 0.1);
}
near(gast, 12 + 0.02 * 41.9, 0.15, 'gast volgt de host na een snap');
ok(!v.observe({ t: 10, uur: 12.2 }, 99), 'oude melding genegeerd');

// zacht bijsturen: 0,1 uur verschil geeft geen snap
const z = new KlokVolger();
z.observe({ t: 0, uur: 10 }, 0); z.observe({ t: 2, uur: 10.04 }, 2);
let g = 9.9;
const g1 = z.step(g, 0.1, 2.0);
ok(g1 > 9.9 && g1 < 10.04, 'zacht: een stapje richting de host, geen snap');

// een sprong (de host sliep een dag door) snapt meteen
const sp = new KlokVolger();
sp.observe({ t: 0, uur: 10 }, 0); sp.observe({ t: 2, uur: 10.04 }, 2); sp.observe({ t: 4, uur: 18 }, 4);
near(sp.step(10.08, 0.1, 4), 18, 1e-9, 'sprong snapt');
// de meldingen stoppen: de klok schuift maximaal 10 s door
const st = new KlokVolger();
st.observe({ t: 0, uur: 6 }, 0); st.observe({ t: 2, uur: 6.1 }, 2);
near(st.target(2 + 100), 6.1 + 0.05 * 10, 1e-6, 'doorschuiven begrensd');
near(new KlokVolger().step(7, 0.1, 0), 7, 0, 'zonder melding blijft de klok staan');

// --- hash
eq(fnv('a'), 'e40c292c', 'fnv vaste waarde');
const a = viewOf({ story: 'M04', stage: 2, state: 'run', wanted: 1, slots: [1, 0, 2], tiles: 'abc' });
const b = viewOf({ story: 'M04', stage: 2, state: 'run', wanted: 1, slots: [0, 1, 2], tiles: 'abc' });
eq(hashView(a), hashView(b), 'volgorde van plekken doet er niet toe');
ok(hashView(a) !== hashView({ ...a, wanted: 2 }), 'wanted verandert de hash');
const he = hashEvent(7, a);
const gelezen = leesHashEvent(JSON.parse(JSON.stringify(he)));
eq(gelezen.h, he.h, 'hash-event rondreis');
eq(leesHashEvent({ k: 'hash', n: 1, h: 'xyz', v: {} }), null, 'slechte hash');
eq(leesHashEvent({ k: 'hash', n: 1, h: '12345678' }), null, 'geen weergave');
eq(verschil(a, { ...a, stage: 3, slots: [0] }), ['stage', 'slots'], 'verschil benoemt velden');

const m = new DesyncMonitor();
let r = m.check(leesHashEvent(he), b);
ok(r.ok && !r.alarm, 'gelijk is ok');
r = m.check(leesHashEvent(hashEvent(8, a)), { ...b, stage: 9 });
ok(!r.ok && !r.alarm && r.velden[0] === 'stage', 'eerste afwijking: nog geen alarm');
r = m.check(leesHashEvent(hashEvent(9, a)), { ...b, stage: 9 });
ok(!r.ok && !r.alarm, 'tweede');
r = m.check(leesHashEvent(hashEvent(9, a)), { ...b, stage: 9 });
ok(r.overgeslagen, 'dubbele melding telt niet mee');
r = m.check(leesHashEvent(hashEvent(10, a)), { ...b, stage: 9 });
ok(r.alarm, 'derde afwijking achter elkaar geeft alarm');
r = m.check(leesHashEvent(hashEvent(11, a)), { ...b, stage: 9 });
ok(!r.alarm, 'na het alarm opnieuw tellen');
r = m.check(leesHashEvent(hashEvent(12, a)), b);
ok(r.ok, 'weer gelijk: teller terug op nul');
eq(m.count, 0, 'teller nul');
// een vervalste hash met gelijke velden blijft opvallen
const vals = leesHashEvent({ ...hashEvent(13, a), h: '00000000' });
r = m.check(vals, b);
eq(r.velden, ['hash'], 'hash klopt niet maar velden gelijk');

console.log(`net_speelklok_test: ${n} checks ok`);
