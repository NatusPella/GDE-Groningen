// Migratie van de nieuwe stappen N1 tot en met N12 (ronde 4 en 5): een oude save kent ze niet. Een oude save voorbij het invoegpunt herhaalt ze niet
// (een latere missie is gehaald, dus ze tellen als gedaan, zonder beloning), een oude save ervoor krijgt ze te spelen; missie-ID's en volgorde
// blijven stabiel; de stappen geven geen geld of vlaggen. node scripts/storymigratie_test.mjs
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf, passedBetweenSteps } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);

ok([...ADDED_STEPS].filter((id) => /^N/.test(id)).sort((a, b) => a.slice(1) - b.slice(1)).join() === 'N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N11,N12', 'twaalf nieuwe stappen N');
ok([...ADDED_STEPS].filter((id) => /^J/.test(id)).sort().join() === 'J1,J2,J3,J4,J5,J6', 'zes nieuwe stappen J (Jelle en de romantiek)');
ok(ADDED_STEPS.filter((id) => /^F/.test(id)).join() === 'F1,F2,F3,F4,F5,F6', 'zes slotstappen F1 tot en met F6 (verhaal-eind)');
ok(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join() === ['M01', 'M02', 'M03', 'M05', 'M04', ...[...Array(25)].map((_, i) => 'M' + String(i + 6).padStart(2, '0'))].join(), 'de dertig missies staan in de volgorde van de hoofdstuklijn (28-11: M05 staat voor M04, de rest ongewijzigd)');
// hoofdstuklijn 28-11: N1 tot en met W1 staan voor M02 (H1 voor H2), N10 en N8 in H3 voor M04 en M06
ok(idx('N1') < idx('M02') && idx('M02') < idx('N4') && idx('N4') < idx('M03') && idx('M05') < idx('N10') && idx('N8') < idx('M04') && idx('N8') < idx('T1') && idx('N5') < idx('M10') && idx('N7') < idx('T2') && idx('N10') < idx('N8') && idx('A1') < idx('N11') && idx('N11') < idx('N12') && idx('N12') < idx('N6') && idx('M18') < idx('N9') && idx('N9') < idx('M19'), 'de stappen staan op hun invoegpunt (N9 in akte 4, N10 tot en met N12 in akte 2)');
ok(ADDED_STEPS.every((id) => { const s = STEPS.find((x) => x.id === id); return s.kind === 'activity' && s.built && !s.reward && !s.cost && (!s.unlocks || id === 'D2'); }), 'elke nieuwe stap is een activiteit zonder beloning, kosten of vlag (alleen D2 zet de vlag vervoer: een oude save heeft hem niet, dus krijgt de terugblik, vervoer.js)');

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
ok(huidige('M03').id === 'h3-omroeper', 'een oude save voorbij M03 herhaalt N1 tot en met N4 niet (de nieuwe H3-stappen volgen)', huidige('M03').id);
const sT = saveTot('M03');
ok(['N1', 'N2', 'N3', 'N4'].every((id) => stepDone(idx(id), (x) => sT.done.has(x), sT.mp)), 'ze tellen als gedaan (geen blokkade)');
ok(huidige('M08').id === 'N10', 'een oude save na M08 krijgt het terras (N10) en dan de avond bij Oma (N8) nog te spelen', huidige('M08').id);
ok(huidige('T1').id === 'M09' && huidige('M10').id === 'A1', 'voorbij T1 en M10: geen herhaling, het tussenstuk A1 blijft open', `${huidige('T1').id} ${huidige('M10').id}`);
const s9 = saveTot('M09');
ok(!stepDone(idx('N5'), (x) => s9.done.has(x), s9.mp) && huidige('M09').id === 'N5', 'vóór M10 komt de boerderij (N5) nog');
const sA1 = saveTot('A1');
ok(huidige('A1').id === 'N11', 'na A1 volgen de nieuwe stappen N11, N12, N6 en N7 vóór de bus naar Zoutkamp', huidige('A1').id);
const sM11 = saveTot('M11');
ok(['N5', 'N6', 'N7', 'N8', 'N10', 'N11', 'N12'].every((id) => stepDone(idx(id), (x) => sM11.done.has(x), sM11.mp)), 'een save voorbij M11 heeft alle akte-2-stappen als gedaan');
// F6 (de kaart, overgang naar het eindspel) volgt op M30: een oude, uitgespeelde save heeft hem nog niet gezien en krijgt hem als enige te spelen
ok(huidige('M30') && huidige('M30').id === 'F6', 'een uitgespeelde oude save krijgt alleen het slot F6 nog te spelen', String(huidige('M30') && huidige('M30').id));
{
  const k = idx('F6');
  const sF = saveTot('M30');
  const klaar = new Set([...sF.done, 'F6']);
  ok(!stepDone(k, (x) => sF.done.has(x), sF.mp) && stepDone(k, (x) => klaar.has(x), sF.mp) && nextStoryStep((x) => klaar.has(x), sF.mp, () => false).end !== undefined, 'na F6 is de oude save uitgespeeld');
}
// de slotstappen F1 tot en met F5
ok(idx('M21') < idx('F1') && idx('F1') < idx('M22') && idx('M22') < idx('F2') && idx('F2') < idx('M23') && idx('M26') < idx('F3') && idx('F3') < idx('F4') && idx('F4') < idx('F5') && idx('F5') < idx('E') && idx('M30') < idx('F6'), 'F1 tot en met F6 staan op hun invoegpunt');
ok(huidige('M21').id === 'F1', 'een oude save vóór M22 krijgt de ontdekking van de wagen (F1) te spelen', huidige('M21').id);
ok(huidige('M22').id === 'F2' && huidige('M23').id === 'M24', 'voorbij M22 komt F2 nog, voorbij M23 niet meer', `${huidige('M22').id} ${huidige('M23').id}`);
ok(huidige('M26').id === 'F3', 'een oude save die M26 net haalde krijgt de verzoening en de avond (F3 tot en met F5) nog te spelen', huidige('M26').id);
ok(!/^F/.test(String(huidige('E').id)), 'voorbij E geen herhaling van F3 tot en met F5', String(huidige('E').id));
ok(milestoneFlagsForDone(new Set(['M00', 'F1'])).join() === 'wagen:idee,wagen:menu,wagen:stek,wagen:team' && !milestoneFlagsForDone(new Set(['M21', 'F1'])).includes('wagen:naam'), 'F1 geeft geen wagen-vlag: de naam komt pas met het luik (M22)');

// de nacht op een dijk (N9, akte 4): een oude save voor M19 speelt hem, een save voorbij M19 niet
ok(huidige('M18').id === 'N9', 'een oude save na M18 krijgt de nacht op een dijk (N9) nog te spelen', huidige('M18').id);
ok(huidige('M19').id === 'J6' && huidige('M17').id === 'J4', 'voorbij M19 geen herhaling van N9 (de volgende is J6 van Jelle), vóór M18 volgt J4', `${huidige('M19').id} ${huidige('M17').id}`);
const s19 = saveTot('M19');
ok(stepDone(idx('N9'), (x) => s19.done.has(x), s19.mp), 'N9 telt als gedaan voor een save voorbij M19 (geen blokkade)');
ok(milestoneFlagsForDone(new Set(['M00', 'N10', 'N11', 'N12'])).join() === 'wagen:idee,wagen:menu' && milestoneFlagsForDone(new Set(['M00', 'N9'])).join() === 'wagen:idee,wagen:menu,wagen:stek', 'N9 en N10 tot en met N12 geven alleen de vlaggen van de missies ervoor (menu na M08, stek na M13), nooit een eigen vlag');

// geen dubbele beloning: de mijlpaalvlaggen en het tussenstuk reageren niet op de nieuwe stappen
ok(milestoneFlagsForDone(new Set(['M00', 'N1', 'N2'])).join() === 'wagen:idee', 'de nieuwe stappen geven geen wagen-vlaggen');
ok(passedBetweenSteps(new Set(OUD.slice(0, OUD.findIndex((s) => s.id === 'T2') + 1).map((s) => s.id)), () => false).includes('A1'), 'het v:1-tussenstuk leest een oude save in de oude volgorde (A1 gaat dicht na T2)');

console.log(`storymigratie_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
