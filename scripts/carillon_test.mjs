// Carillon in de Martinitoren: the rules (pure file, no browser).
//   node scripts/carillon_test.mjs
import { makeRng } from '../game/js/minigamekit.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../game/js/carillonrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const play = (id, skill, seed) => {
  const rng = makeRng(seed), st = C.createCarillon(id);
  while (st.phase !== 'done') C.stepCarillon(st, C.botPresses(st, skill, rng), 1 / 60);
  return st;
};

check('three tunes with valid bells', C.TUNES.length === 3 && C.TUNES.every((t) => t.notes.every(([b, l]) => b >= 0 && b < 8 && l > 0)));
check('every bell has its own key', new Set(C.BELL_KEYS).size === 8 && C.BELL_NAMES.length === 8);
check('the octave bell is twice the base', Math.abs(C.bellHz(7) - 2 * C.BASE_HZ) < 1e-6 && C.bellHz(0) === C.BASE_HZ);
check('notes come in time order', C.TUNES.every((t) => { const ns = C.tuneNotes(t); return ns.every((x, i) => i === 0 || x.t > ns[i - 1].t); }));

for (const t of C.TUNES) {
  const pro = play(t.id, 1, 5), meh = play(t.id, 0.4, 6), none = play(t.id, 0, 7);
  check(`${t.id}: a perfect player wins gold`, C.carillonMedal(pro) === 3, C.accuracy(pro));
  check(`${t.id}: a clumsy player gets less`, C.carillonMedal(meh) < 3 && none.miss > 0);
  check(`${t.id}: score grows with skill`, pro.score > meh.score);
  check(`${t.id}: all notes are resolved`, pro.notes.every((x) => x.state !== 'wait') && pro.perfect + pro.good + pro.late + pro.miss === t.notes.length);
}

{
  const st = C.createCarillon('broeder');
  check('a stray bell breaks the combo', C.strike(st, 3).type === 'stray' && st.wrong === 1 && st.combo === 0);
  st.t = st.notes[0].t;
  const e = C.strike(st, st.notes[0].bell);
  check('on-time strike is perfect and scores', e.grade === 'perfect' && st.score === 100 && st.combo === 1);
  check('the same note cannot be struck twice', C.strike(st, st.notes[0].bell).type === 'stray');
  const s2 = C.createCarillon('broeder');
  s2.t = s2.notes[0].t + 0.2;
  check('a late strike counts as late', C.strike(s2, s2.notes[0].bell).grade === 'late');
  const s3 = C.createCarillon('broeder');
  s3.t = s3.notes[0].t + 0.4;
  check('far too late is a miss', C.stepCarillon(s3, [], 0.001).some((x) => x.type === 'miss'));
}
check('combo multiplier is capped', (() => { const st = C.createCarillon('broeder'); st.combo = 500; st.t = st.notes[0].t; return C.strike(st, st.notes[0].bell).points === 100 * C.CARILLON.comboCap; })());

{
  // the stand is open ground of the city map: no building, no water, clear of the walls
  const here = path.dirname(fileURLToPath(import.meta.url));
  const { loadStadData } = await import('./lib/loadworld.mjs');
  const map = await loadStadData();
  const inPoly = (x, y, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) r = !r; } return r; };
  const s = C.CARILLON_STAND;
  const blocked = [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].some(([dx, dy]) => map.buildings.concat(map.water).some((b) => inPoly(s.x + dx, s.y + dy, b.pts)));
  check('the carillon stand is on open ground of the city map', !blocked);
  const tower = map.buildings.find((b) => b.name === 'Martinitoren');
  check('the tower of the city map stands where the rules say', !!tower && tower.pts.some((p) => Math.hypot(p[0] - C.TOWER.x, p[1] - C.TOWER.y) < 14));
}

console.log(bad ? `${bad} of ${n} checks failed` : `carillon_test: ${n} checks ok`);
process.exit(bad ? 1 : 0);
