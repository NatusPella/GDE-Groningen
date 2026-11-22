// Simulatie: het laadscherm blijft nooit hangen en de balk loopt nooit terug, ook niet met rare streamingwaarden
// (NaN, negatief, een teller die weer omhoog springt). node scripts/loadlogic_fuzz_test.mjs
import { stepProgress, startProgress, MAX_S, loadPending, loadKind } from '../game/js/loadlogic.js';
let seed = 3;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; if (fails < 10) console.log('FAIL', m, i); } };
const rommel = [NaN, -5, Infinity, undefined, null, 0, 1e9];
for (const kind of ['save', 'travel', 'snel']) {
  for (let run = 0; run < 300; run++) {
    let st = startProgress(), pend = Math.floor(rnd() * 400), vorigBar = 0, klaar = false;
    const dt = 1 / (20 + rnd() * 100);
    for (let t = 0, frame = 0; t < MAX_S + 2; t += dt, frame++) {
      const r = rnd();
      pend = r < 0.03 ? rommel[Math.floor(rnd() * rommel.length)] : r < 0.08 ? Math.floor(rnd() * 600) : Math.max(0, (Number.isFinite(pend) ? pend : 0) - Math.floor(rnd() * 6));
      const p = stepProgress(st, loadPending({ buildings: pend, roads: 0 }, 0, 0), t, kind);
      st = p;
      ok(Number.isFinite(p.bar) && p.bar >= 0 && p.bar <= 1, 'balk tussen 0 en 1', p.bar);
      ok(p.bar >= vorigBar - 1e-9, 'balk loopt nooit terug', `${vorigBar} -> ${p.bar}`);
      vorigBar = p.bar;
      if (p.done) { klaar = true; ok(p.bar === 1, 'klaar betekent een volle balk'); break; }
    }
    ok(klaar, 'het laadscherm is binnen de maximale tijd klaar', kind);
  }
}
ok(loadKind(NaN) === 'travel' || loadKind(NaN) === 'snel', 'afstand NaN geeft een bruikbare soort');
console.log(`loadlogic_fuzz_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
