// Samen spelen (#452, #429): elke verhaalstap die geen missie is (N, T, A, J, F, E) heeft een Samen-regel (game/js/storymultiplayer.js), en een
// reisstap telt alleen met het lichaam van wie het spel opende. Pure test, geen Electron: node scripts/multiplayerstorysteps_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { STEPS } = await import('../game/js/storyarc.js');
const { STEP_MULTIPLAYER, stepMultiplayerRule, stepKind } = await import('../game/js/storymultiplayer.js');
const { makeReisGoals } = await import('../game/js/storyreis.js');
const { coopRule, auditSteps } = await import('../game/js/cooproles.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const tussen = STEPS.filter((s) => s.kind === 'activity');

t('elke tussenstap heeft een Samen-regel: van wie, wat een gast ziet, beloning en wegvallen', () => {
  assert.ok(tussen.length >= 30, `er zijn ${tussen.length} tussenstappen`);
  const ontbreekt = tussen.filter((s) => !stepMultiplayerRule(s)).map((s) => `${s.id} (${stepKind(s)})`);
  assert.deepEqual(ontbreekt, [], 'een nieuw doeltype zonder Samen-regel in storymultiplayer.js: ' + ontbreekt.join(', '));
  for (const [soort, r] of Object.entries(STEP_MULTIPLAYER)) {
    assert.ok(['wereld', 'lokaal'].includes(r.van), soort);
    for (const k of ['gast', 'beloning', 'wegval']) assert.ok(typeof r[k] === 'string' && r[k].length >= 5, `${soort}.${k}`);
    assert.ok(!/gastheer/i.test(r.gast), 'in het spel zeg je wie het spel opende, nooit gastheer');
  }
});
t('geen regel voor een soort die niet bestaat (geen dode regels)', () => {
  const gebruikt = new Set(tussen.map(stepKind));
  for (const soort of Object.keys(STEP_MULTIPLAYER)) assert.ok(gebruikt.has(soort), `de regel ${soort} hoort bij geen enkele stap`);
});
t('de stappen N, T, A, J, F, V en E zitten er allemaal bij en de regelkeuring is schoon', () => {
  const ids = new Set(tussen.map((s) => s.id));
  for (const voorloop of ['N', 'T', 'A', 'J', 'F', 'V']) assert.ok([...ids].some((i) => i.startsWith(voorloop)), voorloop);
  assert.ok(ids.has('E'));
  assert.deepEqual(auditSteps(STEPS), []);
  for (const s of tussen) assert.equal(coopRule(s).presence, 'dichtstbij', `${s.id}: een tussenstap houdt niemand op`);
});
t('reisstappen: alleen het lichaam van wie het spel opende telt, een gast bij de bestemming doet niets', () => {
  const stap = tussen.find((s) => s.id === 'N1');
  const [x, y] = wgsToWorld(stap.goal.at[0], stap.goal.at[1]);
  const gesproken = [];
  const w = { player: { x: x + 5000, y, angle: 0 }, coopFigures: { 1: { slot: 1, x, y } } };
  const goals = makeReisGoals({ getWorld: () => w, busy: () => false, playLines: (id) => gesproken.push(id) });
  const b = {}; goals.reis.begin(stap, b);
  assert.equal(goals.reis.met(stap, b), false, 'een gast die al bij de bestemming staat telt niet');
  assert.deepEqual(gesproken, []);
  w.player.x = x + 10; w.player.y = y;
  assert.equal(goals.reis.met(stap, b), true, 'wie het spel opende komt aan');
  assert.deepEqual(gesproken, [stap.goal.scene], 'de scène speelt één keer, lokaal bij hem');
});
t('de bron stuurt geen netwerkbericht voor een tussenstap en rekent niet met een gast-lichaam', () => {
  for (const f of ['storyreis.js', 'storytravel.js']) {
    const bron = fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/sendEvent|announce\(/.test(bron), `${f} stuurt niets over het net`);
    assert.ok(!/coopFigures/.test(bron), `${f} leest geen gast-figuren`);
  }
});

console.log(`multiplayerstorysteps_test: ${n} ok`);
process.exit(0);
