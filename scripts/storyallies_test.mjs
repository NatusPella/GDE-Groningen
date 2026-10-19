// De onthouden keuze van M23 (bondgenoot) in story.js: één antwoord per groep, bewaard in de save, en de
// stagelogica die M18, M23 en M26 erop bouwen (stagechoice.js, stagetiming.js).
//   node scripts/storyallies_test.mjs
import './node3d.mjs';
const { rememberStoryChoice, storyFlag, getStorySave, applyStorySave } = await import('../game/js/story.js');
const { enterChoice, stepChoice } = await import('../game/js/stagechoice.js');
const { enterTiming, stepTiming, needleAt } = await import('../game/js/stagetiming.js');
const { buildAkte4Defs } = await import('../game/js/missions_akte4.js');
const { buildAkte5Defs, applyAkte5 } = await import('../game/js/missions_akte5.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// the remembered choice: one per group, kept in the save, back after a load
rememberStoryChoice('bond-bus');
ok(storyFlag('keuze:bond-bus') && !storyFlag('keuze:bond-trekker'), 'the bus is remembered');
rememberStoryChoice('bond-trekker');
ok(storyFlag('keuze:bond-trekker') && !storyFlag('keuze:bond-bus'), 'a replay can choose again: the earlier ally is gone');
const save = JSON.parse(JSON.stringify(getStorySave()));
ok(save.flags.includes('keuze:bond-trekker'), 'the choice is in the save');
rememberStoryChoice('bond-scooter');
applyStorySave(save);
ok(storyFlag('keuze:bond-trekker') && !storyFlag('keuze:bond-scooter'), 'the choice comes back after a load');
applyStorySave({ v: 1, done: [], skipped: [], fails: {}, waived: [], voorschot: [], cards: [], flags: [] });
ok(!storyFlag('keuze:bond-trekker'), 'an older save has no ally and loads fine');

// M23: each answer carries the tag the later steps read
const defs5 = buildAkte5Defs({ map: { nearestRoadPoint: () => null }, walk: (x, y) => ({ x, y }), drive: (x, y) => ({ x, y }) });
const col = defs5.find((d) => d.label === 'De colonne');
const pick = (st, keys) => { const S = {}; enterChoice(S); let r = null; for (const k of keys) { r = stepChoice(st, S, k, 0.1); for (let i = 0; i < 40 && !r && S.cphase === 'reply'; i++) r = stepChoice(st, S, null, 0.1); } return { r, S, tag: st.rounds[0].options[S.picks[0]].tag }; };
for (const [key, tag] of [['1', 'bond-bus'], ['2', 'bond-trekker'], ['3', 'bond-scooter']]) {
  const p = pick(col.stages[0], [key]);
  ok(p.r === 'done' && p.tag === tag && p.S.wrong === 0, `M23: option ${key} is ${tag} and never wrong`);
}

// M18: the number of wrong answers per route, and what each costs
const wieb = buildAkte4Defs({ map: {}, walk: (x, y) => ({ x, y }), drive: (x, y) => ({ x, y }) }).find((d) => d.label === 'Wie draaide de camera\'s uit?');
const intake = wieb.stages.find((q) => q.kind === 'choice');
const answers = (keys) => { const S = {}; enterChoice(S); let r = null; for (const k of keys) { r = stepChoice(intake, S, k, 0.1); for (let i = 0; i < 40 && !r && S.cphase === 'reply'; i++) r = stepChoice(intake, S, null, 0.1); if (r) break; } return { r, wrong: S.wrong }; };
ok(answers(['2', '2', '1']).wrong === 0, 'M18: three right answers, no suspicion');
ok(answers(['1', '2', '1']).wrong === 1, 'M18: one wrong answer, suspicion 1');
ok(answers(['1', '1', '1']).wrong === 2 && answers(['1', '1', '1']).r === 'done', 'M18: two wrong answers, suspicion 2, still through');
ok(answers(['1', '1', '2']).r && answers(['1', '1', '2']).r.fail, 'M18: three wrong answers fail the intake with the manager\'s reason');
ok(wieb.tagAdjust.argwaan2 < wieb.tagAdjust.argwaan1 && wieb.tagAdjust.argwaan1 < 0, 'M18: more suspicion costs more');

// M18: the hard hall can still be passed by pressing in the zone, and two misses fail it
const hard = wieb.stages.find((q) => q.kind === 'timing' && q.ifTag === 'argwaan1');
const play = (st, hitEvery) => {
  const S = {}; enterTiming(S, st, () => false); let r = null; let t = 0, guard = 0;
  while (!r && guard++ < 40000) {
    const round = st.rounds[Math.min(S.ti, st.rounds.length - 1)];
    const inZ = (() => { const v = needleAt(round, S.needleT + 0.05); return v >= round.zone[0] && v <= round.zone[1]; })();
    const press = S.tphase === 'ask' && (hitEvery ? inZ : !inZ);
    r = stepTiming(st, S, press, 0.05); t += 0.05;
  }
  return { r, S };
};
ok(play(hard, true).r === 'done' && play(hard, true).S.hits === 3, 'M18 hard hall: pressing in the zone passes all three cameras');
ok(play(hard, false).r && play(hard, false).r.fail, 'M18 hard hall: two misses end the mission');

// M26: the street timing gives the chosen ally the wider zone, and the others stay as written
const fin = (() => { const list = [{ label: 'Ontzet, net als in 1672', stages: [{ kind: 'bake' }, { kind: 'hold' }, { kind: 'chase', route: [] }], start: {} }]; applyAkte5(list); return list[0]; })();
const streets = fin.stages.filter((q) => q.kind === 'timing')[1];
for (const tag of ['bond-bus', 'bond-trekker', 'bond-scooter']) {
  const S = {}; enterTiming(S, streets, (t) => t === tag);
  const widened = streets.rounds.map((r, i) => S.rounds[i].zone[1] - S.rounds[i].zone[0] > r.zone[1] - r.zone[0]);
  ok(widened.filter(Boolean).length === 1 && widened[streets.rounds.findIndex((r) => r.zoneIf === tag)], `M26: only ${tag}'s street gets the wider zone`);
}
ok(streets.rounds.every((r) => r.zone[0] - 0.09 > 0 && r.zone[1] + 0.09 < 1), 'M26: a widened zone stays on the bar');
const lim = fin.stages.find((q) => q.kind === 'chase');
ok(Object.values(lim.timeIf).every((s) => s > lim.time), 'M26: every ally gives the chase more time than none');

console.log(fails ? `${fails} of ${n} failed` : `storyallies_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
