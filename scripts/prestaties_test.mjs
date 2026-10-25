// Prestaties: vorm van de lijst en de haken voor drift en meerijden (#30).
//   node scripts/prestaties_test.mjs
import fs from 'node:fs';
import { ACHIEVEMENTS, CATEGORIES, getAchievementSummary, getAchievementView, isRetiredMission, MISSION_GOALS } from '../game/js/achievements.js';

let fail = 0;
const check = (name, ok, extra = '') => { if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

const ids = ACHIEVEMENTS.map((a) => a.id);
check('ids zijn uniek', new Set(ids).size === ids.length);
const cats = new Set(CATEGORIES.map((c) => c[0]));
check('elke prestatie heeft een bekende categorie', ACHIEVEMENTS.every((a) => cats.has(a.cat)));
check('titel en omschrijving zijn gevuld', ACHIEVEMENTS.every((a) => a.title && a.desc));

const by = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
for (const id of ['drift_1', 'drift_10', 'drift_goud', 'trein_stations', 'trein_dorp']) check(`${id} bestaat`, by.has(id));
check('drift_1 en drift_10 tellen driftRuns', by.get('drift_1').stat === 'driftRuns' && by.get('drift_10').goal === 10);
check('trein_stations telt unieke haltes', by.get('trein_stations').set === 'trainStations' && by.get('trein_stations').goal === 5);

const dz = read('driftzone.js'), st = read('stationtravel.js');
check('driftzone: goud ontgrendelt drift_goud', /medal >= 3\) unlockAchievement\(w, 'drift_goud'\)/.test(dz));
check('stationtravel: aankomst telt halte en dorp', /recordUnique\(w, 'trainStations'/.test(st) && /unlockAchievement\(w, 'trein_dorp'\)/.test(st));

const nl = /[a-z]/i;
check('geen Engelse restwoorden in de nieuwe teksten', ['drift_1', 'drift_10', 'drift_goud', 'trein_stations', 'trein_dorp'].every((i) => nl.test(by.get(i).desc) && !/\b(the|and|win)\b/i.test(by.get(i).desc)));
// missies die het verhaal niet meer speelt (#187): hun prestaties zijn onbereikbaar en tellen niet mee in het totaal
const retired = ACHIEVEMENTS.filter((a) => a.retired);
check('15 prestaties van 5 vervallen missies zijn retired', retired.length === 15 && MISSION_GOALS.filter((g, i) => isRetiredMission(i)).length === 5, String(retired.length));
check('totaal telt de vervallen prestaties niet', getAchievementSummary().total === ACHIEVEMENTS.length - retired.length);
check('overzicht verbergt ze', getAchievementView().flatMap((c) => c.items).every((i) => !retired.some((a) => a.id === i.id)));

// #435: de hele kaart verkend telt de bezochte buurten (gebieden.js), en de gebieden hangen met ringen aan de prestaties
const ach = read('achievements.js'), ui = read('achievementsui.js'), tr = read('achievementtracker.js'), gb = read('gebieden.js');
check('kaart_alle telt de bezochte buurten', by.get('kaart_alle').stat === 'kaartVerkend' && by.get('kaart_alle').goal === 100);
check('de vijf lagen hebben elk een prestatie', ['buurt', 'wijk', 'woonplaats', 'gemeente', 'provincie'].every((laag) => by.get(`gebied_${laag}`) && by.get(`gebied_${laag}`).stat === `gebied_${laag}`));
check('de ringen komen uit de gebiedenstand', ach.includes('export function setGebiedStand') && tr.includes('setGebiedStand(gebiedStand)') && ui.includes('gebiedenBlock') && ui.includes("from './gebiedenlive.js'"));
check('de tracker telt de bezochte buurt en het deel van de kaart', tr.includes('bezoekPlek') && /setStatMax\(w, 'kaartVerkend'/.test(tr));
check('de kaart telt buurten, geen mist', gb.includes('export function kaartVerkend') && gb.includes('export function bezoek') && gb.includes('MAX_BEZOEKT'));
check('de prestaties van een laag tonen de laag als ring', /if \(s && a\.goal === 1\) \{ cur = s\.klaar; goal = s\.totaal; \}/.test(ach));
process.exit(fail ? 1 : 0);
