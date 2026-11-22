// Eigenschappen van de verhaalstappen (kwaliteit 22-11):  node scripts/story_eigenschappen_test.mjs
// Op willekeurige voortgang (vast zaadje) gelden voor nextStoryStep en passedBetweenSteps altijd dezelfde regels:
// het gooit nooit, een rondje "speel de volgende stap" eindigt, meer voortgang zet het verhaal nooit terug,
// en wat een oude save als tussenstap krijgt hoort bij de tussenstappen.
import * as A from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; if (fails < 30) console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); } };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry(0x5707);
const ids = A.STEPS.map((s) => s.id);
const index = (r) => (r && !r.end ? ids.indexOf(r.id) : ids.length);
const nextOf = (done, passed = new Set(), seen = null) => A.nextStoryStep((id) => done.has(id), (i) => passed.has(i), seen);

ok(ids.length > 40 && new Set(ids).size === ids.length, 'de stappen hebben unieke id\'s');
// 1. spelen tot het einde: elke stap precies een keer, daarna een einde
{
  const done = new Set(); const gespeeld = [];
  for (let i = 0; i < ids.length + 5; i++) {
    const r = nextOf(done);
    if (r.end) break;
    ok(!done.has(r.id), 'een gespeelde stap komt niet terug', r.id);
    gespeeld.push(r.id); done.add(r.id);
  }
  const r = nextOf(done);
  ok(!!r.end, 'na het spelen van alle bereikbare stappen staat er een einde');
  ok(gespeeld.length > 0 && gespeeld.every((id) => ids.includes(id)), 'alleen bestaande stappen worden gespeeld');
  const volgorde = gespeeld.map((id) => ids.indexOf(id));
  ok(volgorde.every((v, i) => i === 0 || v > volgorde[i - 1]), 'de stappen komen in de volgorde van het verhaal');
}
// 2. willekeurige voortgang: gooit nooit, en meer voortgang zet het verhaal niet terug
for (let i = 0; i < 1500; i++) {
  const done = new Set(ids.filter(() => R() < 0.4));
  if (R() < 0.2) done.add('bestaat-niet'); 
  const passed = new Set(Array.from({ length: Math.floor(R() * 6) }, () => Math.floor(R() * (A.MISSION_IDS.length + 3)) - 1));
  let r, groter;
  try {
    r = nextOf(done, passed, R() < 0.5 ? () => R() < 0.5 : null);
    const meer = new Set([...done, ...ids.filter(() => R() < 0.2)]);
    const meerPassed = new Set([...passed, ...Array.from({ length: 3 }, () => Math.floor(R() * A.MISSION_IDS.length))]);
    groter = [nextOf(done, passed, () => false), nextOf(meer, meerPassed, () => false)];
  } catch (e) { ok(false, 'nextStoryStep gooit', String(e && e.message)); continue; }
  ok(r && (r.end || ids.includes(r.id)), 'het resultaat is een stap of een einde');
  ok(index(groter[1]) >= index(groter[0]), 'meer voortgang zet het verhaal niet terug', index(groter[0]) + ' -> ' + index(groter[1]));
}
// 3. de tussenstappen van een v1-save
for (let i = 0; i < 800; i++) {
  const done = new Set(ids.filter(() => R() < 0.5));
  const passed = new Set(Array.from({ length: Math.floor(R() * 8) }, () => Math.floor(R() * A.MISSION_IDS.length)));
  let r;
  try { r = A.passedBetweenSteps(done, (k) => passed.has(k)); } catch (e) { ok(false, 'passedBetweenSteps gooit', String(e && e.message)); continue; }
  ok(Array.isArray(r) && r.every((id) => A.BETWEEN_STEPS.includes(id)), 'passedBetweenSteps geeft alleen tussenstappen');
  ok(new Set(r).size === r.length, 'passedBetweenSteps geeft geen dubbele id\'s');
}
// 4. tabelregels van de stappen zelf
for (const s of A.STEPS) {
  ok(typeof s.id === 'string' && s.id.length > 0 && !!A.PARTS[s.part], 'stap ' + s.id + ' heeft een deel dat bestaat', String(s.part));
  if (s.kind === 'mission') ok(!s.mission || A.missionIndexOf(s.mission) >= 0, 'missiestap ' + s.id + ' wijst naar een bestaande missie', String(s.mission));
}
for (const id of A.BETWEEN_STEPS) ok(A.STEP_BY_ID.has(id), 'tussenstap ' + id + ' bestaat');
console.log('story_eigenschappen_test: ' + n + ' controles, ' + fails + ' mislukt');
process.exit(fails ? 1 : 0);
