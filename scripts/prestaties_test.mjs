// Prestaties: vorm van de lijst en de haken voor drift en meerijden (#30).
//   node scripts/prestaties_test.mjs
import fs from 'node:fs';
import { ACHIEVEMENTS, CATEGORIES, getAchievementSummary, getAchievementView, isRetiredMission, MISSION_GOALS, toastDuur } from '../game/js/achievements.js';

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

// #611: één voortgangsweergave per scherm, als leesbare tekst, en beeld bij de cijfers
const pcss = read('pausemenu.css');
check('de kop toont de voortgang als één balk met het getal ernaast', /class="pa-total">\$\{bar\('total'/.test(ui) && /van \$\{sum\.total\} behaald/.test(ui));
check('de detailvoortgang is een balk met het getal, geen tweede ring', /bar\('d-' \+ it\.id/.test(ui) && /class="pa-prog">/.test(ui));
check('de gebiedenstanden zijn balken met het getal ernaast', /bar\('g-' \+ id/.test(ui) && /\$\{klaar\} van \$\{totaal\}/.test(ui));
check('nergens in Prestaties nog een voortgangsring', !/pa-ring/.test(ui) && !/function ring\(/.test(ui) && !/pa-ring/.test(pcss) && !/ringDash/.test(ui));
check('de cijfercellen hebben een eigen icoon per regel', /pa-fig-k/.test(ui) && /figIco\(ico\)/.test(ui) && /ICON_PATHS\[name\]/.test(ui));
check('de medaille noemt zijn naam als tekst, niet alleen als kleur', /MEDALS\[m\] : 'Geen medaille'/.test(ui) && /m-medal m\$\{m\}" aria-hidden="true"/.test(ui));
// #840: een grotere, visuelere prestatiekaart met eigen geluid, zonder de HUD-budgetten te breken
check('de prestatiekaart heeft een badge, stralen en vonken', /ach-badge/.test(ach) && /ach-rays/.test(ach) && /ach-spark s1/.test(ach));
check('de titel komt oplopen en het geheel zweeft binnen', /@keyframes ach-rise/.test(ach) && /@keyframes ach-in/.test(ach) && /ach-shimmer/.test(ach));
check('de decoratie is aria-hidden en de Nederlandse tekst blijft', /ach-badge" aria-hidden="true"/.test(ach) && ach.includes('PRESTATIE ONTGRENDELD') && ach.includes('dualHtml(a.title)'));
check('de kaart respecteert beweging beperken en prefers-reduced-motion', /html\.reduce-motion #hud \.ach-toast/.test(ach) && /prefers-reduced-motion: reduce/.test(ach) && /animation: none !important/.test(ach));
check('de kaart blijft binnen het HUD-budget en de zone', /max-width: calc\(100vw/.test(ach) && /zones\.occupy\('E', 'ach', P3\)/.test(ach) && /font-size: 31px/.test(ach));
check('goud heeft een eigen gloed en de gouden variant', /\.ach-toast\.gold \.ach-rays/.test(ach) && /\.ach-toast\.gold \.ach-title/.test(ach));
check('de kaartduur is een pure functie van titel en omschrijving', toastDuur('Kort', 'x') === 4.2 && toastDuur('Een veel langere titel voor de kaart', 'en een langere omschrijving erbij') > 4.2 && toastDuur() === 4.2);
check('de ontgrendelmelding stuurt goud mee naar het geluid', /kind: 'prestatie'[\s\S]{0,80}goud: !!gold/.test(ach));
check('audio.js speelt het eigen register op de sting-bus', /from '\.\/achievementgeluid\.js'/.test(read('audio.js')) && /playPrestatieSting/.test(read('audio.js')) && /bus: stingBus/.test(read('audio.js')));

process.exit(fail ? 1 : 0);
