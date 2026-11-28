// Migratie van de nieuwe stappen J1 tot en met J6 (ronde 5, Jelle en de romance in akte 3 en 4): een oude save kent ze niet.
// Een oude save voorbij het invoegpunt herhaalt ze niet (een latere stap is gedaan, dus ze tellen als gedaan, zonder beloning), een oude
// save ervoor krijgt ze te spelen; de missie-ID's en hun volgorde blijven stabiel; de stappen geven geen geld, kosten of vlaggen.
// Zelfde techniek als storymigratie_test (N1 tot en met N8). node scripts/storymigratie_jelle_test.mjs
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf, passedBetweenSteps } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const J = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];

ok(J.every((id) => ADDED_STEPS.includes(id)) && J.every((id) => idx(id) >= 0), 'zes nieuwe stappen J1 tot en met J6 zijn toegevoegde stappen');
ok(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join() === ['M01', 'M02', 'M03', 'M05', 'M04', ...[...Array(25)].map((_, i) => 'M' + String(i + 6).padStart(2, '0'))].join(), 'de dertig missies staan in de volgorde van de hoofdstuklijn (28-11: M05 staat voor M04, de rest ongewijzigd)');
// hoofdstuklijn 28-11: J1 (de eerste brief) staat in H2, voor M02
ok(idx('J1') < idx('M02') && idx('M14') < idx('J2') && idx('J2') < idx('T3') && idx('A2') < idx('J3') && idx('J3') < idx('M17')
  && idx('M17') < idx('J4') && idx('J4') < idx('M18') && idx('M18') < idx('J5') && idx('J5') < idx('M19') && idx('M19') < idx('J6') && idx('J6') < idx('T4'), 'de stappen staan op hun invoegpunt');
ok(J.every((id) => { const s = STEPS.find((x) => x.id === id); return s.kind === 'activity' && s.built && !s.reward && !s.cost && !s.unlocks && s.scenes.includes(id); }), 'elke nieuwe stap is een activiteit met een scène, zonder beloning, kosten of vlag');
ok(J.every((id) => { const g = STEPS[idx(id)].goal; return (g.type === 'reis' && g.scene === id) || (g.type === 'home' && STEPS[idx(id)].homeScene.id === id); }), 'elke stap speelt zijn scène bij aankomst of in de flat');

// een save van vóór ronde 5: alle stappen behalve J1 tot en met J6
const OUD = STEPS.filter((s) => !J.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };

// J1 is naar H2 verhuisd: een oude save voorbij het nieuwe invoegpunt heeft hem als gedaan (geen herhaling, geen blokkade); een save vóór M02 speelt hem
ok(huidige('M12').id === 'M13', 'een oude save na M12 heeft J1 als gedaan (J1 is naar H2 verhuisd)', huidige('M12').id);
ok(huidige('M01').id === 'N1' && stepDone(idx('J1'), (x) => saveTot('M01').done.has(x), saveTot('M01').mp) === false, 'een oude save na M01 speelt J1 nog in H2 (het is geen gedane stap)', huidige('M01').id);
ok(huidige('M13').id !== 'J1' && huidige('M13').id !== 'M13', 'een oude save voorbij M13 herhaalt J1 niet', huidige('M13').id);
ok(huidige('M14').id === 'J2', 'een oude save na M14 krijgt de envelop in Appingedam (J2)', huidige('M14').id);
ok(huidige('T3').id === 'M15', 'voorbij T3 geen herhaling van J2', huidige('T3').id);
ok(huidige('A2').id === 'J3', 'een oude save na de kermisrit (A2) krijgt de koffie bij Tessa\'s ouders (J3)', huidige('A2').id);
ok(huidige('M17').id === 'J4', 'na M17 volgt de dubbele date (J4)', huidige('M17').id);
ok(huidige('M18').id === 'N9' && stepDone(idx('N9'), (x) => saveTot('N9').done.has(x), saveTot('N9').mp) && huidige('N9').id === 'J5', 'na M18 volgt eerst de nacht op een dijk (N9), daarna de wielklem (J5)', huidige('M18').id);
ok(huidige('M19').id === 'J6', 'na M19 volgt Beppe aan de deur (J6)', huidige('M19').id);
ok(huidige('T4').id === 'M20', 'voorbij T4 geen herhaling van J6', huidige('T4').id);
const s21 = saveTot('M21');
ok(J.every((id) => stepDone(idx(id), (x) => s21.done.has(x), s21.mp)), 'een save voorbij M21 heeft alle J-stappen als gedaan (geen blokkade)');
ok(huidige('M30') && huidige('M30').id === 'F6', 'een uitgespeelde oude save krijgt alleen het slot F6 nog te spelen (verhaal-eind)');

// geen dubbele beloning of vlag: de mijlpaalvlaggen en het tussenstuk reageren niet op de nieuwe stappen
const tot = (laatste) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === laatste) + 1).map((s) => s.id));
ok(milestoneFlagsForDone(new Set([...tot('M12'), 'J1'])).join() === milestoneFlagsForDone(tot('M12')).join()
  && milestoneFlagsForDone(new Set([...tot('M21'), ...J])).join() === milestoneFlagsForDone(tot('M21')).join(), 'de nieuwe stappen geven geen extra wagen-vlaggen');
ok(passedBetweenSteps(tot('M17'), () => false).includes('A2'), 'het v:1-tussenstuk leest een oude save in de oude volgorde (A2 gaat dicht na M17)');

console.log(`storymigratie_jelle_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
