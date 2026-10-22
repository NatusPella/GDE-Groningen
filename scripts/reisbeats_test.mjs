// The travel beats of the new arc (game/js/reisbeats.js, #97):  node scripts/reisbeats_test.mjs
import fs from 'node:fs';
import { REISBEATS, beatFor } from '../game/js/reisbeats.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';
import { needsBeat, actBudget } from '../game/js/reistijd.js';
import { travelOptions, RIDES } from '../game/js/reiskeuze.js';
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const ids = new Set(STEPS.map((s) => s.id));
for (const [id, b] of Object.entries(REISBEATS)) {
  ok(ids.has(id), `${id} is a step`);
  ok(needsBeat(b.length), `${id}: a travel beat is only for a jump`, b.length);
  ok(RIDES[b.ride], `${id}: known ride`, b.ride);
  ok(b.to && b.from && b.act >= 1 && b.act <= 6, `${id}: fields`);
  const step = STEPS.find((s) => s.id === id);
  ok(!step || step.part && b.act === ({ kop: 1, romp: 2, staart: 3, zuid: 4, ontzet: 5, nazomer: 6 })[step.part], `${id}: act matches the step's part`);
  if (b.scene) ok(script.scenes.some((s) => s.id === b.scene), `${id}: scene ${b.scene} exists`);
  const r = travelOptions(beatFor(id, script));
  ok(r.required && r.def === 'meerijden', `${id}: required beat, ride along by default`);
  ok(!!b.scene === r.options.some((o) => o.id === 'overslaan'), `${id}: skip exists exactly when there is trip talk`);
}
// the travel activities (T5 is Deel 4's) all have a beat with their own scene
for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) ok(REISBEATS[t]?.scene, `${t} carries its scene`);
// skip lines come from the script, spoken lines only
const l = beatFor('T1', script).lines;
ok(l.length === 4 && l[0].startsWith('Tessa: '), 'T1 skip lines', l[0]);
ok(beatFor('M01', script) === null, 'no beat for a step in the city');
// nothing silently over the 14 minute budget of act 2 when driving everything yourself? report only the heavy one
const act = (a) => Object.values(REISBEATS).filter((b) => b.act === a).map((b) => ({ length: b.length }));
ok(actBudget(4, act(4)).over, 'driving all of act 4 yourself is over budget (that is why riding along is the default)');
console.log(`${n - fails}/${n} reisbeats`);
process.exit(fails ? 1 : 0);
