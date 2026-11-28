// Migratie van de hoofdstuklijn H1 tot en met H3 (28-11, #1368 #1369 #1370): een oude save van vóór de nieuwe volgorde (M02 achter N1 tot en met W1,
// N10 en N8 in H3, J1 in H2, M05 voor M04) en de zes nieuwe stappen h1-vismarkt, h2-scooters, h2-bon, h3-omroeper, h3-bert en h3-kiezelweek.
// Wat hier vastligt (nooit een bestaande migratie wijzigen; de stappen volgen de ADDED_STEPS-aanpak van storyarc.js plus `mootAfter`):
//   - een oude save raakt nooit iets kwijt: alles wat hij deed telt nog als gedaan
//   - een oude save wordt nooit teruggezet naar iets wat hij al deed, en loopt nooit vast: spelen tot het einde bereikt het einde
//   - een activiteit die de oude save nog voor zich had, blijft open (ook al is zijn missie in de nieuwe volgorde eerder); een activiteit die hij al
//     voorbij was, telt als gedaan (zonder beloning, kosten of vlag)
//   - de nieuwe stappen geven geen geld, geen ontgrendeling en geen mijlpaalvlag; de oude saves-fixtures (save_migration_test) blijven op hun oude stap
// node scripts/storymigratie_eerste_uur_test.mjs
import fs from 'node:fs';
import { STEPS, STEP_BY_ID, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf, passedBetweenSteps } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));

const NIEUW = ['h1-vismarkt', 'h2-scooters', 'h2-bon', 'h3-omroeper', 'h3-bert', 'h3-kiezelweek'];

// --- de nieuwe volgorde van het begin
ok(STEPS.slice(0, 23).map((s) => s.id).join() === 'M00,h1-vismarkt,M01,N1,N3,W1,N2,h2-scooters,J1,h2-bon,M02,N4,M03,h3-omroeper,h3-bert,M05,N10,h3-kiezelweek,N8,M04,M06,M07,M08', 'H1 tot en met H3 staan in de volgorde van de hoofdstuklijn (M04 en M06 volgen tot H12 nog direct erna)');
ok(NIEUW.every((id) => ADDED_STEPS.includes(id) && idx(id) >= 0), 'de zes nieuwe stappen zijn toegevoegde stappen (ADDED_STEPS)');
ok(NIEUW.every((id) => { const s = STEP_BY_ID.get(id); return s.kind === 'activity' && s.built && !s.reward && !s.cost && !s.unlocks && s.goal.type === 'reis' && s.goal.scene === id && s.scenes.includes(id) && s.lead && s.lead[1].length > 20; }), 'elke nieuwe stap is een reisactiviteit met een scène en een lead, zonder beloning, kosten of vlag');
ok(NIEUW.every((id) => script.scenes.some((q) => q.id === id && q.step === id && q.lines.length >= 7)), 'elke nieuwe stap heeft zijn scène in script.json (bron: docs/verhaal/nieuw/09-script-akte1.md)');
ok(STEPS.every((s) => !s.mootAfter || (idx(s.mootAfter) > idx(s.id) && ADDED_STEPS.includes(s.id))), 'mootAfter staat alleen op een toegevoegde stap en wijst naar een latere stap');
ok(['N1', 'N3', 'N2', 'N10', 'N8', 'W1', 'h2-scooters', 'h2-bon', 'h3-kiezelweek'].every((id) => STEP_BY_ID.get(id).mootAfter), 'de verplaatste of nieuwe activiteiten kennen hun mootAfter');

// --- een oude save: de oude volgorde (vóór de hoofdstuklijn), met de rest van het verhaal zoals het was
const VERPLAATST = ['M02', 'N1', 'N2', 'N3', 'N4', 'W1', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'N10', 'N8', 'J1'];
const KOP_OUD = ['M00', 'M01', 'M02', 'N1', 'N2', 'N3', 'N4', 'W1', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'N10', 'N8'];
const REST = STEPS.map((s) => s.id).filter((id) => !NIEUW.includes(id) && !VERPLAATST.includes(id) && id !== 'M00' && id !== 'M01');
const OUD = [...KOP_OUD, ...REST];
OUD.splice(OUD.indexOf('M13'), 0, 'J1'); // J1 stond tussen M12 en M13
ok(OUD.length === STEPS.length - NIEUW.length && new Set(OUD).size === OUD.length && OUD.every((id) => STEP_BY_ID.has(id)), 'de oude volgorde bevat elke oude stap precies één keer', OUD.length);

const stand = (k) => {
  const done = new Set(OUD.slice(0, k));
  const passed = new Set([...done].map((id) => STEP_BY_ID.get(id)).filter((s) => s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i), passed };
};
const volgende = (st) => nextStoryStep((id) => st.done.has(id), st.mp, () => true);
const voltooi = (st, s) => { st.done.add(s.id); if (s.kind === 'mission') st.passed.add(missionIndexOf(s.mission)); };

// 1. niets gaat verloren en niets blijft hangen
let verloren = 0, vast = 0, terug = 0;
for (let k = 0; k <= OUD.length; k++) {
  const st = stand(k);
  for (const id of OUD.slice(0, k)) if (!stepDone(idx(id), (x) => st.done.has(x), st.mp)) verloren++;
  const seen = new Set();
  let s = volgende(st), guard = 0;
  while (s && !s.end && guard++ < STEPS.length + 5) {
    if (seen.has(s.id) || st.done.has(s.id)) { vast++; break; }
    seen.add(s.id);
    // de volgende stap is nooit iets wat deze oude save al deed
    if (OUD.indexOf(s.id) >= 0 && OUD.indexOf(s.id) < k) terug++;
    voltooi(st, s);
    s = volgende(st);
  }
  if (!(s && s.end !== undefined)) vast++;
}
ok(verloren === 0, 'een oude save raakt niets kwijt: elke gedane stap blijft gedaan', verloren);
ok(vast === 0, 'elke oude save speelt door tot het einde zonder vast te lopen of een stap te herhalen', vast);
ok(terug === 0, 'een oude save krijgt nooit een stap te spelen die hij al deed', terug);

// 2. waar een oude save op uitkomt (de volgende stap), per stand in de oude volgorde
const na = (laatste) => volgende(stand(OUD.indexOf(laatste) + 1)).id;
const VERWACHT = [
  ['M00', 'h1-vismarkt', 'een nieuw spel of een save net na de opening speelt eerst de Vismarkt (nieuwe stap)'],
  ['M01', 'N1', 'na M01 de klus voor Sjabbe: h1-vismarkt telt voor een save voorbij M01 als gedaan'],
  ['M02', 'N1', 'een oude save na M02 krijgt de klus (N1) nog, M02 sluit hem niet meer'],
  ['N1', 'N3', 'na N1 de soep bij Beppe'],
  ['N2', 'N3', 'na N2 nog steeds de soep bij Beppe (N3 stond in de oude volgorde achter N2)'],
  ['N3', 'W1', 'na N3 het frietmoment (W1); N4 komt daarna'],
  ['N4', 'W1', 'na N4 nog Half drie (W1)'],
  ['W1', 'M03', 'een oude save die de hele straat deed gaat naar het Loket: de nieuwe H2-stappen tellen als gedaan'],
  ['M03', 'h3-omroeper', 'een oude save voorbij M03 krijgt de omroeper van H3'],
  ['M04', 'M05', 'een oude save die M04 al deed (hij kent Bert) slaat de omroeper en Bert over en gaat naar M05'],
  ['M05', 'N10', 'na M05 het terras (N10), dat in de oude volgorde pas na M08 kwam: hij had het nog voor zich'],
  ['M08', 'N10', 'na M08 nog steeds het terras (N10)'],
  ['N10', 'h3-kiezelweek', 'na het terras de Kiezelweek (nieuwe stap)'],
  ['N8', 'h3-kiezelweek', 'na de avond bij Oma nog de Kiezelweek: de nieuwe stap die hij nog niet kent'],
  ['T1', 'M09', 'voorbij T1 geen N10, N8 of Kiezelweek meer: de stappen tellen als gedaan'],
];
for (const [laatste, verwacht, naam] of VERWACHT) ok(na(laatste) === verwacht, naam, `${laatste} -> ${na(laatste)}`);
ok(volgende(stand(OUD.indexOf('M13') )).id === 'M13' && !stepDone(idx('J1'), (x) => stand(OUD.indexOf('M13')).done.has(x), stand(OUD.indexOf('M13')).mp) === false, 'J1 is naar H2 verhuisd: een oude save voorbij M12 heeft hem als gedaan (geen herhaling, geen blokkade)');
ok(volgende(stand(OUD.indexOf('M01') + 1)).id === 'N1' && !stepDone(idx('J1'), (x) => stand(OUD.indexOf('M01') + 1).done.has(x), stand(OUD.indexOf('M01') + 1).mp), 'een oude save na M01 speelt J1 nog in H2');

// 3. een missie die vooruit gespeeld is (de speler pakte M05 al in de wereld) maakt de activiteiten ervoor moot (de bestaande regel van storyarc.js stepDone); M03 blijft zelf open
{
  const st = stand(OUD.indexOf('M02') + 1);
  voltooi(st, STEP_BY_ID.get('M05'));
  ok(volgende(st).id === 'M03', 'M05 vooruit gespeeld: de activiteiten ervoor tellen als moot, het Loket (M03) blijft de volgende missie', volgende(st).id);
}

// 4. geen geld, geen ontgrendeling, geen mijlpaalvlag door de nieuwe stappen
{
  const tot = new Set(OUD.slice(0, OUD.indexOf('M05') + 1));
  ok(milestoneFlagsForDone(new Set([...tot, ...NIEUW])).join() === milestoneFlagsForDone(tot).join(), 'de nieuwe stappen geven geen mijlpaalvlag');
}

// 5. het v:1-tussenstuk (passedBetweenSteps) ziet in de eerste uren nog steeds niets te sluiten (A1, A2 en V1 tot en met V3 komen later)
for (const laatste of ['M01', 'M03', 'M05', 'N8', 'M08']) {
  const st = stand(OUD.indexOf(laatste) + 1);
  ok(passedBetweenSteps(st.done, st.mp).length === 0, `passedBetweenSteps sluit niets voor een v:1-save na ${laatste}`, passedBetweenSteps(st.done, st.mp).join());
}
{
  const st = stand(OUD.indexOf('M11') + 1);
  ok(passedBetweenSteps(st.done, st.mp).join() === 'A1', 'en voorbij M11 sluit hij nog steeds alleen A1 (de volgorde van het tussenstuk is niet veranderd)', passedBetweenSteps(st.done, st.mp).join());
}

console.log(fails ? `${fails} van ${n} controles mislukt` : `storymigratie_eerste_uur_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
