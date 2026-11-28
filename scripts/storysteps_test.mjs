// The continuous step list of the story (#1359) and the decision per existing step (#1360), pure data, no game:
//   node scripts/storysteps_test.mjs
// - the list: 60 to 90 steps, chapters 1 to 16 in order and then the free summer, unique ids, valid areas, a goal
//   that starts with a capital and has at most 25 words, at most one new figure per step and no figure twice
// - nothing is lost: every step of the live story (storyarc.js STEPS) has exactly one place in the list, with a
//   decision and a voice status; a rewritten step is silent until the next recording round; every bridge has a plan
// - walking the whole list step by step: after every step the next goal, the diary and the recap card are filled
//   and grow; the walk ends on the last step
// - the first hour (H1 to H3): a hint to Jelle, a first win, a first side job, a first trip outside the city
// - the live story is untouched: walking it with nextStoryStep still visits every step, MISSION_IDS keep their indices
// What this cannot see (Electron, in beeld): how it plays and reads; this is the data and its consistency.
import './node3d.mjs';

const A = await import('../game/js/storyarc.js');
const S = await import('../game/js/storysteps.js');
const { STEPS, MISSION_IDS, BRIDGES, nextStoryStep } = A;
const { STORY_STEPS, AREAS, CHAPTERS, CHAPTER_KEYS, BRIDGE_PLAN, nextPlanStep, stepCards, stepsOfChapter, isNewStep } = S;
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

// --- the list
const main = STORY_STEPS.filter((x) => x.ch !== 'nazomer');
ok(main.length >= 60 && main.length <= 90, 'between 60 and 90 steps in the main line', main.length);
const ids = STORY_STEPS.map((x) => x.id);
ok(new Set(ids).size === ids.length, 'unique ids', ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
let rank = 0;
for (const x of STORY_STEPS) {
  const r = CHAPTER_KEYS.indexOf(x.ch);
  ok(r >= 0, `known chapter ${x.id}`, x.ch);
  ok(r >= rank, `chapters in order at ${x.id}`);
  rank = Math.max(rank, r);
  ok(AREAS.includes(x.area), `valid area ${x.id}`, x.area);
  ok(/^[A-Z]/.test(x.goal) && words(x.goal) <= 25, `goal of ${x.id} starts with a capital, at most 25 words`, words(x.goal));
  ok(x.fn && x.fn.length > 10, `diary line of ${x.id}`);
  ok(x.knows && x.knows.length > 10, `what the player knows after ${x.id}`);
  ok(x.figure === null || (typeof x.figure === 'string' && x.figure.length > 1), `one new figure or none at ${x.id}`);
}
for (let c = 1; c <= 16; c++) ok(stepsOfChapter(c).length >= 3, `chapter ${c} has at least 3 steps`, stepsOfChapter(c).length);
ok(stepsOfChapter('nazomer').length >= 5, 'the free summer has steps');
ok(CHAPTER_KEYS.every((k) => CHAPTERS[k] && CHAPTERS[k].title), 'every chapter has a title');
const figures = STORY_STEPS.map((x) => x.figure).filter(Boolean);
ok(new Set(figures).size === figures.length, 'no figure is introduced twice', figures.filter((x, i) => figures.indexOf(x) !== i).join(','));

// --- nothing is lost (#1360)
const live = new Set(STEPS.map((x) => x.id));
for (const id of live) ok(ids.filter((x) => x === id).length === 1, `live step ${id} has exactly one place`);
for (const x of STORY_STEPS) {
  if (live.has(x.id) && !isNewStep(x)) {
    ok(['keep', 'rewrite', 'move'].includes(x.decision), `decision of ${x.id}`, x.decision);
    ok(['recorded', 'silent'].includes(x.voice), `voice status of ${x.id}`, x.voice);
    ok(x.decision !== 'rewrite' || x.voice === 'silent' || x.id === 'M00', `a rewritten step is silent until the next round (${x.id})`);
    ok(x.decision === 'rewrite' || x.voice === 'recorded', `a kept or moved step keeps its recording (${x.id})`);
  } else {
    // a new step (a plan step, or one the chapter line already built into the live story: it has no decision)
    ok(isNewStep(x) && /^h\d+-[a-z0-9]+$/.test(x.id), `a new step has the id h<chapter>-<name> (${x.id})`);
    ok(x.id.startsWith(`h${x.ch}-`), `new step ${x.id} lives in its own chapter`);
  }
}
for (const b of BRIDGES) ok(BRIDGE_PLAN[b.id] && ['keep', 'rewrite', 'move'].includes(BRIDGE_PLAN[b.id].decision), `bridge ${b.id} has a plan`);
for (const id of Object.keys(BRIDGE_PLAN)) ok(BRIDGES.some((b) => b.id === id), `plan bridge ${id} exists`);

// --- the walk: after every step the cards are filled
const done = new Set();
let prev = { diary: 0, recap: 0 };
let steps = 0;
for (let next = nextPlanStep(done); next; next = nextPlanStep(done)) {
  done.add(next.id);
  steps++;
  const c = stepCards(next.id);
  ok(c && c.diary.length > prev.diary, `diary grows after ${next.id}`);
  ok(c && c.recap.length >= prev.recap, `recap does not shrink after ${next.id}`);
  ok(c && c.recap.every((r) => r.length > 0), `recap lines filled after ${next.id}`);
  const last = steps === STORY_STEPS.length;
  ok(c && (last ? c.goal === '' : c.goal.length > 5), `target marker after ${next.id}`);
  if (c) prev = { diary: c.diary.length, recap: c.recap.length };
}
ok(steps === STORY_STEPS.length, 'the walk visits every step once', steps);
ok(nextPlanStep(done) === null, 'the walk ends');
ok(stepCards('niet-bestaand') === null, 'an unknown step has no cards');

// --- the first hour
const h = [1, 2, 3].flatMap((c) => stepsOfChapter(c));
const first = stepsOfChapter(1);
ok(first[0].id === 'M00' && first[1].id === 'h1-vismarkt' && /Us Mem Snacks/.test(first[1].fn), 'the first walk after the opening hints at the snack brand');
ok(/Vrije standplaats/.test(first[1].fn), 'the first walk shows the free-pitch sign');
ok(first.some((x) => x.id === 'M01'), 'a first win in chapter 1');
ok(first.some((x) => x.unlocks === 'klussen'), 'a first side job in chapter 1');
ok(first.some((x) => x.area !== 'stad'), 'a first trip outside the city in chapter 1');
ok(h.length >= 15, 'the first hours have enough steps', h.length);

// --- the live story is untouched
const walked = [];
const have = new Set();
for (let s = nextStoryStep((id) => have.has(id), () => false, () => true); s && !s.end; s = nextStoryStep((id) => have.has(id), () => false, () => true)) {
  if (walked.includes(s.id)) break;
  walked.push(s.id); have.add(s.id);
}
ok(walked.length >= STEPS.filter((x) => A.stepAvailable(x)).length - 1, 'the live story still walks to the end', walked.length);
ok(MISSION_IDS.length >= 30 && new Set(MISSION_IDS).size === MISSION_IDS.length, 'MISSION_IDS stay unique and complete', MISSION_IDS.length);
for (const x of STEPS.filter((q) => q.kind === 'mission')) ok(A.missionIndexOf(x.mission) >= 0, `mission ${x.id} still has its index`);

console.log(fails ? `${fails} of ${n} checks failed` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
