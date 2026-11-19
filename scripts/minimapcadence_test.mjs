// Gedragstest voor de minimapcadans (pure logica, geen canvas):
//   node scripts/minimapcadence_test.mjs
import * as C from '../game/js/minimapcadence.js';

let fout = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };

// Een frame-lus van 60 fps: telt de tekenbeurten over `sec` seconden.
function simuleer({ sec, costMs, beweegt, settling = false }) {
  let lastAt = -1e9, prev = null, draws = 0, t = 0;
  const frames = Math.round(sec * 60);
  for (let f = 0; f < frames; f++, t += 1000 / 60) {
    const cur = { x: beweegt ? f * 0.2 : 10, y: 5, yaw: 0.3 };
    const moved = C.minimapMoved(prev, cur, settling);
    if (!C.minimapRedrawDue(t, lastAt, costMs, moved)) continue;
    prev = cur; lastAt = t; draws++;
  }
  return draws;
}

const stil = simuleer({ sec: 10, costMs: 2, beweegt: false });
const rijdt = simuleer({ sec: 10, costMs: 2, beweegt: true });
ok(stil < rijdt * 0.45, `stilstaand ${stil} tekenbeurten tegen ${rijdt} onderweg: minder dan de helft`);
ok(rijdt >= 280, `een lichte bewegende kaart houdt ~30 fps (${rijdt} in 10 s)`);
ok(stil >= 90, `stilstaand blijft hij animeren (${stil} in 10 s, ~10 fps)`);
ok(simuleer({ sec: 10, costMs: 2, beweegt: false, settling: true }) === rijdt, 'tijdens zoom- of rotatie-easing geldt de bewegende cadans');
const duur = simuleer({ sec: 10, costMs: 6, beweegt: true });
ok(duur < rijdt && duur >= 90, `een dure kaart ververst minder (${duur}), kostenproportioneel`);
ok(C.minimapIntervalMs(5, true) === 50 && C.minimapIntervalMs(12, true) === 120, '5 ms tekenen geeft 50 ms (was 80), 10% kostenbegroting (#804)');
ok(C.minimapIntervalMs(1, true) === C.MM_MIN_INTERVAL_MS && C.minimapIntervalMs(5, true) >= C.MM_HEAVY_INTERVAL_MS, 'cadansvloer licht en zwaar blijft zoals in #804');
ok(C.minimapIntervalMs(1, false) === C.MM_IDLE_INTERVAL_MS, 'stilstaand is rustig');
ok(C.minimapIntervalMs(undefined, true) === C.MM_MIN_INTERVAL_MS, 'ontbrekende kosten crasht niet');

// beweging: positie, draai (ook over de 2pi-naad) en onbekende waarden
const a = { x: 0, y: 0, yaw: 3.1 };
ok(!C.minimapMoved(a, { ...a }), 'zelfde stand is niet bewogen');
ok(C.minimapMoved(a, { ...a, x: 0.5 }), 'verplaatsing telt');
ok(C.minimapMoved(a, { ...a, yaw: 3.2 }), 'draaien telt');
ok(!C.minimapMoved(a, { ...a, yaw: 3.1 + Math.PI * 2 }), 'een hele slag extra draaien is dezelfde stand');
ok(C.minimapMoved(null, a) && C.minimapMoved(a, { x: NaN, y: 0, yaw: 0 }), 'eerste frame en NaN tellen als bewogen (veilig)');
process.exit(fout ? 1 : 0);
