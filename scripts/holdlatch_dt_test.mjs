// Tikstand rennen: "een poos stilstaan" is tijd, geen aantal beelden.  node scripts/holdlatch_dt_test.mjs
// De stilstand telde beelden (45): op 60 Hz is dat 0,75 s, op 144 Hz maar 0,31 s en op 240 Hz 0,19 s. Op een snel scherm
// viel het rennen dus al weg bij even omkeren. Met een dt telt de schakelaar tijd; zonder dt blijft het per beeld.
const listeners = { window: {}, document: {} };
const mk = (name) => ({ addEventListener: (t, f) => { (listeners[name][t] = listeners[name][t] || []).push(f); }, removeEventListener() {} });
globalThis.window = mk('window');
globalThis.document = { ...mk('document'), pointerLockElement: null, activeElement: null, hidden: false, getElementById: () => null };
let clock = 1000;
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true });
const { makeLatch, IDLE_FRAMES } = await import('../game/js/holdlatch.js');
const { Input } = await import('../game/js/input.js');

let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };
const IDLE_S = IDLE_FRAMES / 60;

// 1. de schakelaar zelf: met dt telt hij tijd
for (const hz of [30, 60, 144, 240]) {
  const l = makeLatch();
  l.press();
  let t = 0, frames = 0;
  while (l.on && frames < 2000) { l.step({ moving: false, idleReleases: true, dt: 1 / hz }); t += 1 / hz; frames++; }
  ok(!l.on && Math.abs(t - IDLE_S) <= 1 / hz + 1e-9, `${hz} Hz: het rennen laat los na ${IDLE_S} s stilstaan`, `${t.toFixed(3)} s`);
}
// zonder dt: per beeld, zoals het was (holdlatch_test.mjs)
{
  const l = makeLatch();
  l.press();
  for (let i = 0; i < IDLE_FRAMES - 1; i++) l.step({ moving: false, idleReleases: true });
  ok(l.on, 'zonder dt: nog aan na IDLE_FRAMES - 1 beelden');
  l.step({ moving: false, idleReleases: true });
  ok(!l.on, 'zonder dt: los na IDLE_FRAMES beelden');
}

// 2. door Input.endFrame heen: 144 Hz, een halve seconde stilstaan houdt het rennen aan
function stilstaan(hz, seconden) {
  const inp = new Input(window);
  inp._tik = { rennen: true, richten: false };
  inp.padHold('shift', true); // a fresh press of Shift: the tap latch goes on
  inp.padHold('shift', false);
  const n = Math.round(seconden * hz);
  for (let i = 0; i < n; i++) { clock += 1000 / hz; inp.endFrame(); }
  return inp._lr.on;
}
ok(stilstaan(144, 0.5) === true, '144 Hz: een halve seconde stilstaan houdt het rennen aan');
ok(stilstaan(240, 0.5) === true, '240 Hz: een halve seconde stilstaan houdt het rennen aan');
ok(stilstaan(60, 0.5) === true, '60 Hz: een halve seconde stilstaan houdt het rennen aan');
ok(stilstaan(144, 1.0) === false, '144 Hz: een seconde stilstaan laat het rennen los');
ok(stilstaan(60, 1.0) === false, '60 Hz: een seconde stilstaan laat het rennen los');
// een lange hapering (tabwissel) telt als hooguit één traag beeld
{
  const inp = new Input(window);
  inp._tik = { rennen: true, richten: false };
  inp.padHold('shift', true); inp.padHold('shift', false);
  clock += 16; inp.endFrame();
  clock += 30000; inp.endFrame();
  ok(inp._lr.on, 'één beeld na een lange hapering laat het rennen niet los');
}

console.log(fails ? `\n${fails} FOUT` : '\nholdlatch_dt_test: alles goed');
process.exit(fails ? 1 : 0);
