// Migratie van de nieuwe stappen N1 tot en met N8 (ronde 4): een oude save kent ze niet. Een oude save voorbij het invoegpunt herhaalt ze niet
// (een latere missie is gehaald, dus ze tellen als gedaan, zonder beloning), een oude save ervoor krijgt ze te spelen; missie-ID's en volgorde
// blijven stabiel; de stappen geven geen geld of vlaggen. node scripts/storymigratie_test.mjs
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf, passedBetweenSteps } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);

ok([...ADDED_STEPS].filter((id) => /^N/.test(id)).sort().join() === 'N1,N2,N3,N4,N5,N6,N7,N8', 'acht nieuwe stappen N1 tot en met N8');
ok(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join() === [...Array(30)].map((_, i) => 'M' + String(i + 1).padStart(2, '0')).join(), 'de dertig missies staan nog in dezelfde volgorde');
ok(idx('M02') < idx('N1') && idx('N4') < idx('M03') && idx('M08') < idx('N8') && idx('N8') < idx('T1') && idx('N5') < idx('M10') && idx('N7') < idx('T2'), 'de stappen staan op hun invoegpunt');
ok(ADDED_STEPS.every((id) => { const s = STEPS.find((x) => x.id === id); return s.kind === 'activity' && s.built && !s.reward && !s.cost && !s.unlocks; }), 'elke nieuwe stap is een activiteit zonder beloning, kosten of vlag');

// een save van vóór de epic: alleen de oude stappen gedaan
const OUD = STEPS.filter((s) => !ADDED_STEPS.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };

ok(huidige('M02').id === 'N1', 'een oude save vóór M03 krijgt de nieuwe stappen te spelen (eerst N1)', huidige('M02').id);
ok(huidige('M03').id === 'M04', 'een oude save voorbij M03 herhaalt N1 tot en met N4 niet', huidige('M03').id);
const sT = saveTot('M03');
ok(['N1', 'N2', 'N3', 'N4'].every((id) => stepDone(idx(id), (x) => sT.done.has(x), sT.mp)), 'ze tellen als gedaan (geen blokkade)');
ok(huidige('M08').id === 'N8', 'een oude save na M08 krijgt de avond bij Oma nog te spelen');
ok(huidige('T1').id === 'M09' && huidige('M10').id === 'A1', 'voorbij T1 en M10: geen herhaling, het tussenstuk A1 blijft open', `${huidige('T1').id} ${huidige('M10').id}`);
const s9 = saveTot('M09');
ok(!stepDone(idx('N5'), (x) => s9.done.has(x), s9.mp) && huidige('M09').id === 'N5', 'vóór M10 komt de boerderij (N5) nog');
const sA1 = saveTot('A1');
ok(huidige('A1').id === 'N6', 'na A1 volgen de nieuwe stappen N6 en N7 vóór de bus naar Zoutkamp', huidige('A1').id);
const sM11 = saveTot('M11');
ok(['N5', 'N6', 'N7', 'N8'].every((id) => stepDone(idx(id), (x) => sM11.done.has(x), sM11.mp)), 'een save voorbij M11 heeft alle akte-2-stappen als gedaan');
ok(huidige('M30') && huidige('M30').end !== undefined, 'een uitgespeelde oude save blijft uitgespeeld');

// geen dubbele beloning: de mijlpaalvlaggen en het tussenstuk reageren niet op de nieuwe stappen
ok(milestoneFlagsForDone(new Set(['M00', 'N1', 'N2'])).join() === 'wagen:idee', 'de nieuwe stappen geven geen wagen-vlaggen');
ok(passedBetweenSteps(new Set(OUD.slice(0, OUD.findIndex((s) => s.id === 'T2') + 1).map((s) => s.id)), () => false).includes('A1'), 'het v:1-tussenstuk leest een oude save in de oude volgorde (A1 gaat dicht na T2)');

console.log(`storymigratie_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
