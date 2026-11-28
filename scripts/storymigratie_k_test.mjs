// Migratie van de nieuwe stappen K1 tot en met K3 (verhaalwerkpakketten WP3 en WP4, #1126 #1127, 21-11): het land achter de pastorie (K1, akte 2),
// de kade in de ochtend na de sterren (K2, akte 2) en het havenkantoor met Sjabbe en de eerste sleutel (K3, akte 3, de introductie van Bezit).
// Een oude save kent ze niet: voorbij het invoegpunt tellen ze als gedaan (zonder beloning, kosten of vlag), ervoor worden ze gespeeld.
// Zelfde techniek als storymigratie_test en storymigratie_jelle_test. node scripts/storymigratie_k_test.mjs
import fs from 'node:fs';
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const K = ['K1', 'K2', 'K3'];
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));

ok(K.every((id) => ADDED_STEPS.includes(id) && idx(id) >= 0), 'drie nieuwe stappen K1 tot en met K3 zijn toegevoegde stappen');
ok(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join() === ['M01', 'M02', 'M03', 'M05', 'M04', ...[...Array(25)].map((_, i) => 'M' + String(i + 6).padStart(2, '0'))].join(), 'de dertig missies staan in de volgorde van de hoofdstuklijn (28-11: M05 staat voor M04, de rest ongewijzigd)');
ok(idx('N5') < idx('K1') && idx('K1') < idx('M10') && idx('M11') < idx('K2') && idx('K2') < idx('M12') && idx('M13') < idx('K3') && idx('K3') < idx('M14'), 'de stappen staan op hun invoegpunt');
ok(K.every((id) => { const s = STEPS.find((x) => x.id === id); return s.kind === 'activity' && s.built && s.added === true && !s.reward && !s.cost && !s.unlocks && s.scenes.includes(id); }), 'elke nieuwe stap is een activiteit met een scène, zonder beloning, kosten of vlag');
ok(K.every((id) => { const g = STEPS[idx(id)].goal; return g.type === 'reis' && g.scene === id && g.at.length === 2 && g.r >= 250; }), 'elke stap speelt zijn scène bij aankomst op een reisdoel');
ok(K.every((id) => STEPS[idx(id)].lead && STEPS[idx(id)].lead[1].length > 20), 'elke stap heeft een lead');
ok(STEPS[idx('K1')].part === 'romp' && STEPS[idx('K2')].part === 'romp' && STEPS[idx('K3')].part === 'staart', 'K1 en K2 horen bij akte 2, K3 bij akte 3');

// de scènes: bestaan, hebben de juiste spreker en blijven kort (schrijfregels: hoogstens 14 regels, beurten van 2 tot 12 woorden)
for (const id of K) {
  const sc = scenes.get(id);
  ok(!!sc && sc.step === id, `${id}: de scène bestaat en hoort bij de stap`);
  if (!sc) continue;
  const regels = sc.lines.length + sc.regie.length;
  ok(regels <= 16, `${id}: kort genoeg (${regels} beurten en regies)`);
  ok(sc.lines.every((l) => l.text.split(/\s+/).length <= 14), `${id}: elke beurt is kort`);
}
const sprekers = (id) => new Set(scenes.get(id).lines.map((l) => l.speaker));
ok(sprekers('K1').has('Geesje') && sprekers('K2').size === 2 && sprekers('K3').has('Sjabbe'), 'Geesje in K1, alleen Tammo en Tessa in K2, Sjabbe in K3 (geen nieuwe personages)');
ok(scenes.get('K3').lines.some((l) => /Jelle koopt, jullie beheren/.test(l.text)), 'K3: Sjabbe introduceert Bezit in eigen persoon (Jelle koopt, zij beheren)');
ok(scenes.get('K2').lines.some((l) => /Ik wist het al lang/.test(l.text)) && !scenes.get('K2').lines.some((l) => /verliefd|hou van/i.test(l.text)), 'K2: Tammo weet het al lang, zonder het woord (de kus blijft het kantelpunt in akte 3)');

// een save van vóór deze ronde: alle stappen behalve K1 tot en met K3
const OUD = STEPS.filter((s) => !K.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };

ok(huidige('N5').id === 'K1', 'een oude save na N5 krijgt het land achter de pastorie (K1) te spelen', huidige('N5').id);
ok(huidige('M10').id !== 'K1', 'een oude save voorbij M10 herhaalt K1 niet', huidige('M10').id);
ok(huidige('M11').id === 'K2', 'een oude save na M11 krijgt de kade in de ochtend (K2)', huidige('M11').id);
ok(huidige('M12').id !== 'K2', 'een oude save voorbij M12 herhaalt K2 niet', huidige('M12').id);
ok(huidige('M13').id === 'K3', 'een oude save na M13 krijgt het havenkantoor (K3)', huidige('M13').id);
ok(huidige('M14').id !== 'K3', 'een oude save voorbij M14 herhaalt K3 niet', huidige('M14').id);
const s21 = saveTot('M21');
ok(K.every((id) => stepDone(idx(id), (x) => s21.done.has(x), s21.mp)), 'een save voorbij M21 heeft alle K-stappen als gedaan (geen blokkade)');
ok(huidige('M30').id === 'F6', 'een uitgespeelde oude save krijgt alleen het slot F6 nog te spelen');

// geen dubbele beloning of vlag
const tot = (laatste) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === laatste) + 1).map((s) => s.id));
ok(milestoneFlagsForDone(new Set([...tot('M13'), ...K])).join() === milestoneFlagsForDone(tot('M13')).join()
  && milestoneFlagsForDone(new Set([...tot('M21'), ...K])).join() === milestoneFlagsForDone(tot('M21')).join(), 'de nieuwe stappen geven geen extra wagen-vlaggen');

console.log(`storymigratie_k_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
