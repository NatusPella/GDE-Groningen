// The rules of the `timing` stage (game/js/stagetiming.js) and of the timed answer of the `choice` stage:
//   node scripts/stagetiming_test.mjs
import { enterTiming, stepTiming, timingTag, needleAt, inZone } from '../game/js/stagetiming.js';
import { enterChoice, stepChoice } from '../game/js/stagechoice.js';
import { buildAkte4Defs } from '../game/js/missions_akte4.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const st = {
  kicker: 'Test', failAt: 0, goodAt: 2, tagGood: 'goed', tagLow: 'laag',
  rounds: [{ text: 'a', speed: 1, zone: [0.4, 0.6], ok: 'ja', bad: 'nee' }, { text: 'b', speed: 1, zone: [0.4, 0.6], ok: 'ja', bad: 'nee' }],
};
// the needle starts at the left edge, is in the middle half a sweep later, and is periodic
const r0 = st.rounds[0];
ok(Math.abs(needleAt(r0, 0)) < 1e-9 && Math.abs(needleAt(r0, 0.5) - 1) < 1e-9 && Math.abs(needleAt(r0, 1)) < 1e-9, 'the needle sweeps 0 to 1 and back');
ok(inZone(r0, 0.5) && !inZone(r0, 0.1), 'the zone');

// play: wait for the zone, press; wait through the reply
function play(st, pressAtZone) {
  const S = {}; enterTiming(S);
  let r = null, t = 0;
  while (!r && t < 120) {
    const round = st.rounds[Math.min(S.ti, st.rounds.length - 1)];
    const press = S.tphase === 'ask' && (pressAtZone(S.ti) ? inZone(round, needleAt(round, S.needleT + 0.016)) : !inZone(round, needleAt(round, S.needleT + 0.016)) && S.needleT > 0.2);
    r = stepTiming(st, S, press, 0.016);
    t += 0.016;
  }
  return { r, S };
}
let g = play(st, () => true);
ok(g.r === 'done' && g.S.hits === 2 && g.S.miss === 0, 'two good presses finish with two hits', JSON.stringify(g.r));
ok(timingTag(st, g.S) === 'goed', 'enough hits earn the good tag');
g = play(st, (i) => i === 0);
ok(g.r === 'done' && g.S.hits === 1 && g.S.miss === 1, 'a miss costs but the story goes on');
ok(timingTag(st, g.S) === 'laag', 'too few hits earn the low tag');
const hard = { ...st, failAt: 2, failText: 'weg' };
g = play(hard, () => false);
ok(g.r && g.r.fail === 'weg' && g.S.miss === 2, 'failAt misses end the mission with the failText', JSON.stringify(g.r));
// no press: it waits forever, never finishes by itself
{
  const S = {}; enterTiming(S);
  let r = null;
  for (let i = 0; i < 5000 && !r; i++) r = stepTiming(st, S, false, 0.016);
  ok(r === null && S.tphase === 'ask', 'without a press the stage waits');
}

// the timed answer: the clock picks the second answer when it runs out
{
  const ch = { rounds: [{ who: 'J', time: 3, timeoutPick: 2, text: 'x', options: [{ label: 'a', tag: 'a' }, { label: 'b', tag: 'b' }] }] };
  const S = {}; enterChoice(S);
  let r = null, t = 0;
  while (!r && t < 20) { r = stepChoice(ch, S, null, 0.05); t += 0.05; }
  ok(r === 'done' && S.picks[0] === 1, 'a timed answer picks timeoutPick when the clock runs out', JSON.stringify(S.picks));
  ok(t > 3 && t < 7, 'it waits for the time and shows the reply', String(t));
  const S2 = {}; enterChoice(S2);
  stepChoice(ch, S2, '1', 0.05);
  ok(S2.picks[0] === 0, 'an answer before the clock is the player\'s');
}

// the defs use it
const defs = buildAkte4Defs();
const timings = defs.flatMap((d) => d.stages.filter((q) => q.kind === 'timing').map((q) => ({ d: d.label, q })));
ok(timings.length >= 2, 'the act 4 defs have timing stages', String(timings.length));
for (const { d, q } of timings) {
  ok(q.rounds.length >= 3 && q.rounds.every((r) => r.zone[0] < r.zone[1] && r.zone[1] - r.zone[0] >= 0.1 && r.ok && r.bad), `${d}: rounds with a zone and two replies`);
  ok(typeof q.label === 'string' && q.label.length > 10, `${d}: the goal in the HUD`);
}
const beleg = defs.find((d) => d.label === 'Het beleg van Bourtange');
ok(beleg.stages.some((q) => q.kind === 'timing' && q.tagGood === 'duel-won' && q.tagLow === 'duel-lost') && beleg.tagAdjust['duel-won'] > 0, 'the fierljep duel has a result that pays');

// zoneIf: a round gets a wider zone and its own reply when that choice was made (M26: the ally of M23)
{
  const stI = { rounds: [{ text: 'a', speed: 1, zone: [0.4, 0.6], zoneIf: 'bond-bus', ok: 'ja', okIf: 'mooi', bad: 'nee' }, { text: 'b', speed: 1, zone: [0.4, 0.6], ok: 'ja', bad: 'nee' }] };
  const S1 = {}; enterTiming(S1, stI, (t) => t === 'bond-bus');
  ok(S1.rounds[0].zone[1] - S1.rounds[0].zone[0] > 0.3 && S1.rounds[0].ok === 'mooi' && S1.rounds[1].zone[0] === 0.4, 'zoneIf: the chosen ally widens his round only');
  const S2 = {}; enterTiming(S2, stI, () => false);
  ok(S2.rounds[0].zone[0] === 0.4 && S2.rounds[0].ok === 'ja', 'zoneIf: without the choice the rounds stay as they were');
  const S3 = {}; enterTiming(S3);
  ok(S3.rounds === null, 'enterTiming without arguments still works');
}
console.log(fails ? `${fails} of ${n} failed` : `stagetiming_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
