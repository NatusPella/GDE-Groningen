// Ghost replay: recording, playback, best-run choice and storage.
//   node scripts/ghost_test.mjs
import { createRecorder, recordGhost, finishGhost, ghostAt, ghostLength, betterGhost, validGhost, loadGhost, saveGhost, GHOST_KEY } from '../game/js/ghostreplay.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

function run(total, speed = 10) {
  const rec = createRecorder();
  for (let t = 0; t <= total + 1e-9; t += 1 / 60) recordGhost(rec, t, t * speed, 5, 0);
  return finishGhost(rec, total);
}
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };

{
  const g = run(10);
  check('recording is valid', validGhost(g));
  check('about ten samples a second', Math.abs(g.s.length / 3 - 101) <= 1, g.s.length / 3);
  const p = ghostAt(g, 4.55);
  check('interpolates the position', p && near(p.x, 45.5, 0.3) && near(p.y, 5), JSON.stringify(p));
  check('ends after the recording', ghostAt(g, ghostLength(g) + 0.5) === null);
  check('not before the start', ghostAt(g, -1) === null);
}
{
  const rec = createRecorder();
  recordGhost(rec, 0, 0, 0, 3.1); recordGhost(rec, 0.1, 1, 0, -3.1); recordGhost(rec, 0.2, 2, 0, -3.0);
  const p = ghostAt(finishGhost(rec, 1), 0.05);
  check('angle takes the short way round', Math.abs(Math.abs(p.a) - Math.PI) < 0.1, p.a);
}
{
  const a = run(30), b = run(25), c = run(35);
  check('shorter time is better', betterGhost(a, b) && !betterGhost(a, c) && !betterGhost(a, a));
  check('anything beats nothing', betterGhost(null, a));
  check('junk is never better', !betterGhost(a, { v: 1, total: 1, step: 0.1, s: [1, 2] }) && !betterGhost(null, null));
  const st = mem();
  check('empty storage: no ghost', loadGhost(st, 'kart') === null);
  check('first run is saved', saveGhost(st, 'kart', a));
  check('slower run is kept out', !saveGhost(st, 'kart', c));
  check('faster run replaces it', saveGhost(st, 'kart', b) && loadGhost(st, 'kart').total === 25);
  check('ids are separate', loadGhost(st, 'drift-x') === null && saveGhost(st, 'drift-x', c) && loadGhost(st, 'kart').total === 25);
  st.setItem(GHOST_KEY, '{kapot');
  check('broken storage reads as empty', loadGhost(st, 'kart') === null);
  check('and can be written over', saveGhost(st, 'kart', a) && loadGhost(st, 'kart').total === 30);
  check('a throwing storage does not crash', saveGhost({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }, 'kart', a) === false);
}
{
  const rec = createRecorder();
  for (let t = 0; t < 3; t += 0.1) recordGhost(rec, t, t, 0, 0);
  const lo = finishGhost(rec, 1200, { higher: true }), hi = finishGhost(rec, 2500, { higher: true });
  check('a higher score is better', betterGhost(lo, hi) && !betterGhost(hi, lo));
  const st = mem();
  saveGhost(st, 'drift-oost', lo);
  check('score ghosts keep the higher run', saveGhost(st, 'drift-oost', hi) && !saveGhost(st, 'drift-oost', lo) && loadGhost(st, 'drift-oost').total === 2500);
}
{
  const rec = createRecorder();
  recordGhost(rec, 700, 1, 1, 0);
  check('absurdly long runs are not recorded', rec.s.length === 0);
}
if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('ghost_test ok');
