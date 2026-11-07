// #186: de cheat-ladder en de cheats-sweep per missie (code-only), plus de regel in het botrapport.
//   node scripts/cheatplan_test.mjs
import assert from 'node:assert/strict';
import * as C from './bot/cheatplan.mjs';
import { issueComment, metrics, perAct, findings } from './bot/analysis.mjs';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#186: de cheat-ladder: niet zonder vastzitten, nooit dezelfde rung twee keer', () => {
  assert.equal(C.cheatVoor({ vast: false }), null, 'zonder vastzitten geen cheat');
  assert.equal(C.cheatVoor({ vast: true }), 'nudge');
  assert.equal(C.cheatVoor({ vast: true, geprobeerd: ['nudge'] }), 'objective');
  assert.equal(C.cheatVoor({ vast: true, geprobeerd: ['nudge', 'objective', 'win'] }), 'skip');
  assert.equal(C.cheatVoor({ vast: true, geprobeerd: C.SWEEP_RUNGS }), null, 'ladder is op');
});

t('#186: het sweep-plan dekt elke missie met stappen en een cheat-ladder', () => {
  const plan = C.sweepPlan(['M03', 'M04'], { stappen: 2 });
  assert.equal(plan.length, 2);
  assert.deepEqual(plan[0].stappen, [1, 2]);
  assert.deepEqual(plan[0].cheats, ['nudge', 'objective', 'win']);
  assert.match(plan[0].waarom, /zelf proberen/);
  assert.equal(C.sweepPlan([], {}).length, 0);
});

t('#186: de analyse telt cheats per missie (en nudge niet)', () => {
  const events = [
    { type: 'cheat', step: 'M03:2', rung: 'objective' },
    { type: 'cheat', step: 'M03:2', rung: 'win' },
    { type: 'cheat', step: 'M04:1', rung: 'skip' },
    { type: 'cheat', step: 'M04:1', rung: 'nudge' },
    { type: 'cheat', step: 'minigame:kraak', rung: 'objective' },
  ];
  const rijen = C.cheatSweep(events);
  assert.equal(rijen.length, 3);
  const m3 = rijen.find((r) => r.missie === 'M03');
  assert.equal(m3.aantal, 2);
  assert.equal(m3.cheats[0].rung, 'objective');
  const m4 = rijen.find((r) => r.missie === 'M04');
  assert.equal(m4.aantal, 1, 'nudge telt niet mee');
  const tabel = C.cheatSweepTable(events);
  assert.match(tabel, /\| M03 \| 2 \|/);
  assert.match(tabel, /\| M04 \| 1 \|/);
  assert.equal(C.cheatSweepTable([]), 'Geen cheat nodig in deze run.');
});

t('#186: het issuecommentaar noemt de cheats per missie', () => {
  const events = [{ type: 'cheat', step: 'M03:2', rung: 'objective' }];
  const pa = perAct(events);
  const tekst = issueComment({ title: 'test', metrics: { ...metrics(events), cheats: 1 }, acts: pa.acts, extra: pa.extra, findings: findings(events), events });
  assert.match(tekst, /### Cheats per missie/);
  assert.match(tekst, /\| M03 \| 1 \|/);
});

console.log(`cheatplan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
