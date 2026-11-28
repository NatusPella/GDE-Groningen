// Migratie van de nieuwe stappen W1 en W2 (verhaalwerkpakketten-audit, #1124 #1139, 22-11): het frietmoment om half drie in de flat (W1, akte 1,
// het motief dat de opening mist) en het bord VERKOCHT op het havenhuis in Delfzijl (W2, akte 3, het panden-plakje van Jelle).
// Een oude save kent ze niet: voorbij het invoegpunt tellen ze als gedaan (zonder beloning, kosten of vlag), ervoor worden ze gespeeld.
// Zelfde techniek als storymigratie_k_test. node scripts/storymigratie_w_test.mjs
import fs from 'node:fs';
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const W = ['W1', 'W2'];
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));

ok(W.every((id) => ADDED_STEPS.includes(id) && idx(id) >= 0), 'W1 en W2 zijn toegevoegde stappen');
ok(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join() === ['M01', 'M02', 'M03', 'M05', 'M04', ...[...Array(25)].map((_, i) => 'M' + String(i + 6).padStart(2, '0'))].join(), 'de dertig missies staan in de volgorde van de hoofdstuklijn (28-11: M05 staat voor M04, de rest ongewijzigd)');
ok(idx('W1') < idx('N4') && idx('N4') < idx('M03') && idx('J2') < idx('W2') && idx('W2') < idx('M15'), 'de stappen staan op hun invoegpunt');
ok(W.every((id) => { const s = STEPS[idx(id)]; return s.kind === 'activity' && s.built && s.added === true && !s.reward && !s.cost && !s.unlocks && s.scenes.includes(id); }), 'elke nieuwe stap is een activiteit met een scène, zonder beloning, kosten of vlag');
ok(STEPS[idx('W1')].goal.type === 'home' && STEPS[idx('W1')].homeScene.id === 'W1' && STEPS[idx('W1')].homeScene.clock === 2.5, 'W1 speelt thuis om half drie');
ok(STEPS[idx('W2')].goal.type === 'reis' && STEPS[idx('W2')].goal.scene === 'W2' && STEPS[idx('W2')].goal.r >= 250, 'W2 speelt zijn scène bij aankomst op een reisdoel');
ok(W.every((id) => STEPS[idx(id)].lead && STEPS[idx(id)].lead[1].length > 20), 'elke stap heeft een lead');
ok(STEPS[idx('W1')].part === 'kop' && STEPS[idx('W2')].part === 'staart', 'W1 hoort bij akte 1, W2 bij akte 3');

for (const id of W) {
  const sc = scenes.get(id);
  ok(!!sc && sc.step === id, `${id}: de scène bestaat en hoort bij de stap`);
  if (!sc) continue;
  ok(sc.lines.length + sc.regie.length <= 16, `${id}: kort genoeg`);
  ok(sc.lines.every((l) => l.text.split(/\s+/).length <= 14), `${id}: elke beurt is kort`);
}
const sprekers = (id) => new Set(scenes.get(id).lines.map((l) => l.speaker));
ok(sprekers('W1').size === 2 && sprekers('W2').has('Durk') && sprekers('W2').has('Douwe'), 'W1 alleen Tammo en Tessa, W2 met Durk en Douwe (geen nieuwe personages)');
ok(scenes.get('W1').lines.some((l) => /thuis met wielen/i.test(l.text)) && scenes.get('W1').lines.some((l) => /Jij bakt/.test(l.text)), 'W1: het motief, Tessa bakt en Tammo rijdt');
ok(scenes.get('W2').lines.some((l) => /Jelle koopt, wij beheren/.test(l.text)) && scenes.get('W2').lines.some((l) => /drievoud/.test(l.text)), 'W2: Jelle koopt het pand, het formulier in drievoud is zijn eigen wapen');

const OUD = STEPS.filter((s) => !W.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };
ok(huidige('N4').id === 'W1', 'een oude save na N4 krijgt Half drie (W1) te spelen', huidige('N4').id);
ok(huidige('M03').id !== 'W1', 'een oude save voorbij M03 herhaalt W1 niet', huidige('M03').id);
ok(huidige('J2').id === 'W2', 'een oude save na J2 krijgt het bord in Delfzijl (W2) te spelen', huidige('J2').id);
ok(huidige('M15').id !== 'W2', 'een oude save voorbij M15 herhaalt W2 niet', huidige('M15').id);
const s21 = saveTot('M21');
ok(W.every((id) => stepDone(idx(id), (x) => s21.done.has(x), s21.mp)), 'een save voorbij M21 heeft alle W-stappen als gedaan (geen blokkade)');
ok(huidige('M30').id === 'F6', 'een uitgespeelde oude save krijgt alleen het slot F6 nog te spelen');

const tot = (laatste) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === laatste) + 1).map((s) => s.id));
ok(milestoneFlagsForDone(new Set([...tot('M21'), ...W])).join() === milestoneFlagsForDone(tot('M21')).join(), 'de nieuwe stappen geven geen extra wagen-vlaggen');

console.log(`storymigratie_w_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
