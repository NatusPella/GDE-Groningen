// Montage of the teaser and main trailer (trailerplan.js): rhythm, spoilers, sound files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAN, PLAN_CUTS, SFX_KINDS, validatePlan, planDuration, sliceTimes, SLICES } from '../game/js/trailerplan.js';

const src = fs.readFileSync(new URL('../game/js/trailer.js', import.meta.url), 'utf8');
const m = /const all = \{([^}]+)\};/.exec(src);
assert.ok(m, 'shotlijst in trailer.js niet gevonden');
const shotIds = m[1].split(',').map((s) => s.trim()).filter(Boolean);
const has = (rel) => fs.existsSync(new URL('../game/' + rel, import.meta.url));

for (const cut of PLAN_CUTS) {
  const problems = validatePlan(cut, { shotIds, has });
  assert.deepEqual(problems, [], `${cut}: ${problems.join('; ')}`);
  console.log(`${cut}: ${PLAN[cut].beats.length} shots, ${planDuration(cut).toFixed(1)} s`);
}

// the slice board strikes eight slices, rising in time, inside the card
const t = sliceTimes(3.1);
assert.equal(t.length, SLICES);
assert.ok(t.every((x, i) => x < 3.1 && (i === 0 || x > t[i - 1])));

// the teaser's chaos stretch gets faster: shots never get longer there
const chaos = PLAN.teaser.beats.filter((b) => ['ommeland', 'chase', 'boat', 'pigeon', 'bijna'].includes(b.shot)).map((b) => b.dur);
assert.ok(chaos.every((d) => d <= 2.2), 'chaos-shots kort');
for (const cut of PLAN_CUTS) for (const b of PLAN[cut].beats) for (const [, k] of b.sfx || []) assert.ok(SFX_KINDS.includes(k));

// every synthesised sound the plan uses is also built for the video export
const vid = fs.readFileSync(new URL('../desktop/trailervideo.js', import.meta.url), 'utf8');
for (const k of SFX_KINDS) assert.ok(vid.includes(`'${k}'`) || vid.includes(`${k}:`), `trailervideo.js mist geluid ${k}`);
console.log('trailerplan_test: ok');
