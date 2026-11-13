// #829: de missiecurve is meetbaar: een tak van een heist telt één keer, niet
// alle `only`-takken opgeteld, en een lange missie mag niet direct door een
// korte zonder rustpunt worden gevolgd.
//   node scripts/missioncurve_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { stageCounts, curveRows, longThenShort, SCENERY } from '../game/js/missioncurve.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const stage = (kind, extra = {}) => ({ kind, ...extra });

t('een heist met twee takken telt de zwaarste tak, niet de som', () => {
  const def = { stages: [
    stage('plan'), stage('goto'), stage('fuse'),
    stage('goto', { only: 'sluip' }), stage('lock', { only: 'sluip' }), stage('goto', { only: 'sluip' }),
    stage('pickpocket', { only: 'vermomd' }), stage('goto', { only: 'vermomd' }),
    stage('laser'), stage('crack'), stage('scene'), stage('getaway'),
  ] };
  const c = stageCounts(def);
  assert.equal(c.playable, 8, 'vijf speelbare gewone + drie zwaarste tak');
  assert.equal(c.challenge, 4, 'fuse, laser, crack + lock');
  assert.equal(c.branch, 'sluip');
});

t('scènes en keuzes zijn geen speelbare stappen', () => {
  const c = stageCounts({ stages: [stage('scene'), stage('plan'), stage('choice'), stage('shot'), stage('goto')] });
  assert.equal(c.playable, 1);
  assert.ok(SCENERY.has('scene'));
});

t('curveRows geeft dezelfde telling per definitie', () => {
  const rows = curveRows([{ label: 'A', stages: [stage('goto'), stage('scene')] }, null]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'A');
  assert.equal(rows[0].playable, 1);
});

t('lange missie direct gevolgd door een korte is een curvesignaal', () => {
  const lang = { playable: 9 };
  const kort = { playable: 3, stages: [stage('goto')] };
  const rust = { playable: 3, stages: [stage('scene')] };
  assert.equal(longThenShort(lang, kort), true);
  assert.equal(longThenShort(lang, rust), false);
  assert.equal(longThenShort({ playable: 7 }, kort), false);
});

t('de uitschieters hebben een rustpunt of kortere houd-momenten', () => {
  const mus = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  const a4 = fs.readFileSync(new URL('../game/js/missions_akte4.js', import.meta.url), 'utf8');
  const a6 = fs.readFileSync(new URL('../game/js/missions_akte6.js', import.meta.url), 'utf8');
  const defs = fs.readFileSync(new URL('../game/js/missions_defs.js', import.meta.url), 'utf8');
  assert.match(mus, /kind: 'laser', checkpoint: true/, 'M06 heeft een rustpunt na de entree');
  assert.match(a4, /kind: 'scene', checkpoint: true, target: ll\('bourtangeGracht'/, 'M20 hervat na het fierljep-duel');
  assert.ok(!/time: 16, ticks: \['Het eerste kanon/.test(a4), 'M20: de westwal is ingekort');
  assert.match(a4, /time: 12, ticks: \['Het eerste kanon/);
  assert.match(defs, /radius: 9, time: 22, mode: 'foot'/, 'M26: de vuurwerkhold is 22 s');
  const holds = [...a6.matchAll(/kind: 'hold'[^}]*time: (\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(holds.slice(-3), [6, 6, 6], 'M30: drie bolwerken van 6 s');
});

console.log(`missioncurve_test: ${n}/${n} ok`);
