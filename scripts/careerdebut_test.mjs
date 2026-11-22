// De begincutscenes van de voetbalcarrière en van Bezit (22-11, docs/CARRIERESCENES-22-11.md): de regels (Nederlands, verzonnen, kort), de regie
// (geldig en compileerbaar, elke beat vindt zijn regel), de tijdlijn met overlap, het clubtenue van Tessa (amateur), de voorwaarden (eenmaal per speler,
// alleen aan het begin), de blokkades (laadscherm, menu, melding, poort), de gastbeschrijving (een scène is data) en de stemlijst.
// node scripts/careerdebut_test.mjs
import fs from 'node:fs';
import {
  FOOTBALL_LINES, FARM_LINES, SCENES, SPEAKER_NAME, DEBUT_LINES, FOOTBALL_FLAG, FARM_FLAG, FOOTBALL_ID, FARM_ID, MAX_BOUGHT,
  debutTimeline, readSeconds, footballSpec, farmSpec, clubLook, teamLooks, footballDue, farmDue, firstParcel, debutBlockers, debutDecide,
  DEBUT_CALM_S, debutCatalog, stubLooks,
} from '../game/js/careerdebut.js';
import { missionScene } from '../game/js/cutscenes_akte1.js';
import { validateScene, compileScene, ACTOR_ANIMS } from '../game/js/cutscript.js';
import { KIT_LEVELS, levelOfDivision } from '../game/js/clothingkit.js';
import { makeParkIndex, fallbackIndex } from '../game/js/voetbalparken.js';
import { newBezit } from '../game/js/bezit.js';
import { createCareer } from '../game/js/voetbalcarriere.js';
import { collect, isVoicedOrWaiting } from './voicelines_collect.mjs';
import { npcNamesFromSource } from '../game/js/cutpreview.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const NPC = npcNamesFromSource(src('game/js/missionstory.js'));

// --- de regels ---------------------------------------------------------------------------------------------------------
for (const [id, s] of Object.entries(SCENES)) {
  ok(s.lines.length >= 20 && s.lines.length <= 40, `${id}: een scène van 60 tot 90 seconden heeft 20 tot 40 regels`, s.lines.length);
  const tl = debutTimeline(s.lines);
  ok(tl.total >= 60 && tl.total <= 110, `${id}: de leestijd past bij een korte scène (stemmen maken hem korter)`, tl.total);
  for (const [who, text, o] of s.lines) {
    ok(Object.prototype.hasOwnProperty.call(SPEAKER_NAME, who), `${id}: sprekersleutel ${who} is bekend`);
    ok(typeof text === 'string' && text.length >= 3 && text.length <= 110, `${id}: regel heeft een redelijke lengte`, text);
    ok(!/[{}<>]/.test(text) && !/—/.test(text), `${id}: geen tags of lange streepjes in "${text}"`);
    ok(!o || (Number.isFinite(o.ov) && o.ov >= 0.1 && o.ov <= 1.2), `${id}: ov binnen de grenzen van dialoogvorm.js`, JSON.stringify(o));
    ok(!/\b(de Grunn|winter|sneeuw|ijs|kerst)\b/i.test(text), `${id}: geen verboden woorden`, text);
  }
  const keys = new Set(s.lines.map(([who]) => who));
  ok(keys.has('T') && keys.has('A'), `${id}: Tammo en Tessa praten allebei`);
  ok(s.lines.filter(([who]) => who !== 'T' && who !== 'A').length >= 4, `${id}: de NPC heeft zijn eigen beurten`);
  // korte beurten: geen regel van meer dan 18 woorden, de helft van de regels heeft er hooguit 9
  const words = s.lines.map(([, t]) => t.split(/\s+/).length);
  ok(Math.max(...words) <= 18, `${id}: geen lange speech`, Math.max(...words));
  ok(words.filter((k) => k <= 9).length >= s.lines.length / 2, `${id}: korte beurten`);
}
// de verhaalkern: eierbal en zaakwaarnemer voor voetbal; Beppe, koeien en een plekje voor Bezit
ok(FOOTBALL_LINES.some(([, t]) => /eierbal/i.test(t)) && FOOTBALL_LINES.some(([, t]) => /zaakwaarnemer/i.test(t)) && FOOTBALL_LINES.some(([, t]) => /Talentenklasse/.test(t)), 'voetbal: eierbal, zaakwaarnemer en Talentenklasse');
ok(FARM_LINES.some(([, t]) => /geen verstand van koeien/.test(t)) && FARM_LINES.some(([, t]) => /Beppe/.test(t)) && FARM_LINES.some(([, t]) => /plekje/.test(t)) && FARM_LINES.some(([, t]) => /sleutel/.test(t)), 'bezit: koeien, Beppe, een plekje en de sleutel');
// geen echte merken of personen: alleen verzonnen namen (Aldert en Eppo zijn voornamen van verzonnen figuren)
const ALL = [...FOOTBALL_LINES, ...FARM_LINES].map(([, t]) => t).join(' ');
ok(!/\b(Ajax|PSV|Feyenoord|FC Groningen|Heerenveen|FIFA|Nike|Adidas|John Deere|Fendt|Claas|Lely)\b/i.test(ALL), 'geen echte merken of clubs in de regels');
ok(/Moi/.test(ALL) && !/\bnait\b|\bmoar\b/.test(ALL), 'een Gronings woord (Moi) en verder gewoon Nederlands');
// overlap in de tijdlijn
{
  const a = debutTimeline([['T', 'Eerste regel hier.'], ['A', 'Tweede regel hier.']]);
  const b = debutTimeline([['T', 'Eerste regel hier.', { ov: 0.5 }], ['A', 'Tweede regel hier.']]);
  ok(Math.abs((a.lines[1].at - b.lines[1].at) - 0.5) < 0.011, 'ov laat de volgende regel 0,5 s eerder beginnen', `${a.lines[1].at} ${b.lines[1].at}`);
  ok(b.lines[1].at < b.lines[0].at + b.lines[0].dur, 'bij overlap begint de volgende regel voor het einde van de vorige');
  ok(readSeconds('x') === 2.2 && readSeconds('x'.repeat(500)) === 8, 'leestijd heeft een onder- en bovengrens');
  const c = debutTimeline([['T', 'Een.', { ov: 5 }], ['A', 'Twee.']]);
  ok(c.lines[1].at > c.lines[0].at, 'ov is begrensd: de volgende regel begint nooit voor de vorige');
}

// --- de regie ------------------------------------------------------------------------------------------------------------
const L = { ...NPC, ...stubLooks() };
for (const [id, spec, lines] of [[FOOTBALL_ID, footballSpec(), FOOTBALL_LINES], [FARM_ID, farmSpec(), FARM_LINES]]) {
  const tl = debutTimeline(lines);
  const def = missionScene(null, tl.lines, { looks: L, spec });
  ok(!!def, `${id}: missionScene bouwt een definitie`);
  const probs = validateScene(def, { lines: tl.lines, duration: tl.total });
  ok(probs.length === 0, `${id}: de scène valideert`, probs.join(' | '));
  let sc = null;
  try { sc = compileScene(def, { lines: tl.lines, duration: tl.total }); } catch (e) { ok(false, `${id}: compileert`, e.message); }
  ok(!!sc, `${id}: compileert`);
  // elke beat en elke geforceerde shot vindt zijn regel (een bewerkte tekst slaat hem anders stil over)
  for (const b of spec.beats || []) ok(typeof b.on !== 'string' || tl.lines.some((l) => l.text.startsWith(b.on)), `${id}: beat "${b.on}" vindt zijn regel`);
  for (const s of spec.shots || []) ok(typeof s.on !== 'string' || tl.lines.some((l) => l.text.startsWith(s.on)), `${id}: shot "${s.on}" vindt zijn regel`);
  // de gebaren bestaan en elke NPC-sleutel staat in de NPC-tabel
  for (const b of spec.beats || []) ok(!b.anim || ACTOR_ANIMS.includes(b.anim), `${id}: gebaar ${b.anim} bestaat`);
  for (const c of Object.values(spec.cast || {})) ok(c.key.startsWith('ploeg') || !!NPC[c.key], `${id}: ${c.key} staat in de NPC-tabel van missionstory.js`);
  // de gasten krijgen de scène als data: de definitie is gewone JSON en blijft gelijk na verzenden
  ok(JSON.stringify(JSON.parse(JSON.stringify(def))) === JSON.stringify(def), `${id}: de definitie is gewone data (gast kijkt lokaal na)`);
  // niemand staat ver buiten de plek: de scène blijft binnen 30 m van het anker (de camera-eis van cutpreview.js)
  const far = [...Object.values(spec.cast || {})].filter((c) => Math.hypot(c.at[0], c.at[1]) > 30);
  ok(far.length === 0, `${id}: de figuranten staan dichtbij`);
}
{
  const cat = debutCatalog(NPC);
  ok(cat.length === 2 && cat.every((e) => e.def && !e.missing), 'de catalogus heeft twee scènes met een definitie');
  const kat = debutCatalog({});
  ok(kat.every((e) => e.def === null && e.missing && e.missing.length), 'zonder uiterlijk van de trainer en de buurman meldt de catalogus een ontbrekende acteur');
}
// de bezit-scène is een scène aan de weg (het veld ligt vooruit); de voetbalscène staat op het veld met de trainer van ver
ok(footballSpec().cast.eppo.at[0] > 8 && farmSpec().cast.aldert.at[0] > 8, 'de NPC komt van ver naar het duo toe');
ok(footballSpec().beats.some((b) => b.prop === 'bal' && b.path), 'voetbal: de bal rolt van de trainer naar Tessa');
ok(Object.values(footballSpec().props).some((p) => p.kind === 'hek') && Object.values(farmSpec().props).some((p) => p.kind === 'trekker'), 'hek bij het veld, trekker bij het perceel');

// --- het clubtenue -------------------------------------------------------------------------------------------------------
{
  const idx = fallbackIndex();
  const club = idx.clubs[0];
  const base = { shirt: 0x9e3027, skin: 0xaa8866, variant: 'female', character: 'anita', pants: 0x26262a, shoes: 0x2a1d14, hairStyle: 'long', seed: 23 };
  const look = clubLook(club, { base, number: 10 });
  ok(look.shirt !== base.shirt || look.shirtBands !== undefined, 'Tessa draagt het shirt van de club');
  ok(look.skin === base.skin && look.variant === 'female', 'haar eigen huid en uiterlijk blijven');
  ok(look.look && look.look.age === 'adult', 'ze is een volwassene in de scène');
  ok(levelOfDivision('talent') === 'amateur' && !!KIT_LEVELS.amateur, 'de Talentenklasse is het kitniveau amateur');
  ok(look.shirtBands === null || (look.shirtBands && look.shirtBands.number === 10), 'rugnummer 10 op het amateurtenue (met de hand) of effen', JSON.stringify(look.shirtBands && look.shirtBands.number));
  const own = clubLook(club, { base, number: 10, human: { hair: 'kort-bruin', body: 'normaal' } });
  ok(typeof own === 'object', 'een eigen kapsel en lichaam geven geen fout');
  const team = teamLooks(club);
  ok(Object.keys(team).join() === 'ploeg1,ploeg2,ploeg3', 'drie ploeggenoten');
  ok(new Set(Object.values(team).map((t) => t.seed)).size === 3, 'ze zien er verschillend uit (eigen seed)');
  ok(Object.values(team).every((t) => t.name === 'Teamgenoot' && t.shirt === Object.values(team)[0].shirt), 'ze dragen allemaal het clubtenue');
  // de duo-override komt in de definitie
  const spec = footballSpec({ tessaLook: look });
  const def = missionScene(null, debutTimeline(FOOTBALL_LINES).lines, { looks: { ...NPC, ...team }, spec });
  ok(def && def.actors.tessa.look === look, 'Tessa krijgt haar clubtenue in de scène');
  ok(footballSpec().duo.tessa.look === undefined, 'zonder tenue blijft ze zichzelf');
}

// --- de voorwaarden (eenmaal per speler, alleen aan het begin) ------------------------------------------------------------
{
  const idx = fallbackIndex();
  const c = createCareer({ char: 'anita', index: idx });
  const flags = new Set();
  ok(footballDue(c, flags), 'een nieuwe carrière zonder wedstrijd: de scène is aan de beurt');
  ok(!footballDue(c, new Set([FOOTBALL_FLAG])), 'eenmaal gezien (ook overgeslagen): nooit meer');
  ok(!footballDue({ ...c, stats: { ...c.stats, matches: 1 } }, flags), 'na een eerste wedstrijd is het geen begin meer');
  ok(!footballDue({ ...c, stats: { ...c.stats, simulated: 1 } }, flags), 'ook niet na een berekende wedstrijd');
  ok(!footballDue({ ...c, seasonNr: 2 }, flags), 'ook niet in seizoen 2');
  ok(!footballDue({ started: false }, flags) && !footballDue(null, flags), 'zonder carrière niets');
  const b = newBezit();
  ok(farmDue(b, flags) === null, 'zonder aankoop geen scène');
  b.parcels.p1 = { k: 'a', ha: 2, t: 5, p: 4000, a: [100, 200], c: [130, 210], m: 'self' };
  b.parcels.start = { k: 'a', ha: 1, t: 0, p: 0, a: [1, 2], c: [3, 4], m: 'self', lg: 1 };
  b.totals.bought = 1;
  const due = farmDue(b, flags);
  ok(due && due.id === 'p1' && due.ax === 100 && due.cy === 210, 'het eerste gekochte perceel (niet het startperceel) is aan de beurt', JSON.stringify(due));
  ok(farmDue(b, new Set([FARM_FLAG])) === null, 'eenmaal gezien: nooit meer');
  b.totals.bought = MAX_BOUGHT + 1;
  ok(farmDue(b, flags) === null, 'een oud bezit met veel aankopen krijgt hem niet meer (te laat voor een begin)');
  b.totals.bought = 2;
  b.parcels.p2 = { k: 'a', ha: 2, t: 9, p: 4000, a: [900, 900], c: [930, 910], m: 'self' };
  ok(farmDue(b, flags).id === 'p1', 'bij twee aankopen vóór de scène telt het vroegste perceel');
  ok(firstParcel({ parcels: { x: { k: 'a', ha: 1, t: 1, p: 1, lg: 1, a: [1, 1], c: [1, 1] } } }) === null, 'alleen een startperceel geeft niets');
  ok(firstParcel({ parcels: { x: { k: 'a', ha: 1, t: 1, p: 1 } } }) === null, 'een perceel zonder punten geeft niets (geen plek om de scène te zetten)');
  ok(firstParcel(null) === null && farmDue(null, flags) === null, 'zonder bezit niets');
}

// --- de blokkades --------------------------------------------------------------------------------------------------------
{
  const rustig = { started: true, loading: false, held: [], noticeShown: false, openingDue: false, missionActive: false, cinematicActive: false, sinceCinematicS: 99, pigeon: false, activity: false, respawn: false, wanted: 0, sinceDeathS: 999, menuOpen: false, recapOpen: false, dataReady: true };
  ok(debutBlockers(rustig).length === 0, 'rustig: niets blokkeert');
  for (const [k, v, naam] of [['started', false, 'spel nog niet gestart'], ['loading', true, 'het laadscherm'], ['held', ['screen'], 'de meldingenpoort (schermvullende kaart)'], ['held', ['startup'], 'de meldingenpoort (opstart)'], ['noticeShown', true, 'een melding in beeld'],
    ['openingDue', true, 'de opening'], ['missionActive', true, 'een missie'], ['cinematicActive', true, 'een film'], ['sinceCinematicS', 1, 'een film die net afliep'], ['pigeon', true, 'de duifstand'], ['activity', true, 'een minigame'],
    ['respawn', true, 'het terugzetten'], ['wanted', 2, 'de politie'], ['sinceDeathS', 3, 'vlak na de dood'], ['menuOpen', true, 'een menu'], ['recapOpen', true, 'de recapkaart'], ['dataReady', false, 'verhaaldata die nog laadt']]) {
    ok(debutBlockers({ ...rustig, [k]: v }).length > 0, `blokkeert bij ${naam}`);
  }
  // Samen spelen: een sessie of een meespeler blokkeert niet (wie start ziet hem), anders dan een overgangsscène
  ok(debutBlockers({ ...rustig, session: true, client: true }).length === 0, 'een sessie of een meespeler blokkeert niet: wie de carrière start ziet hem');
  ok(debutDecide({ blockers: ['menu open'], calmS: 99 }) === 'wacht', 'met een blokkade wacht hij');
  ok(debutDecide({ blockers: [], calmS: DEBUT_CALM_S - 0.1 }) === 'wacht', 'pas na een rustige tijd speelt hij');
  ok(debutDecide({ blockers: [], calmS: DEBUT_CALM_S }) === 'speel', 'rustig genoeg: speel');
}

// --- de stemlijst en de koppeling -------------------------------------------------------------------------------------------
{
  const regels = DEBUT_LINES;
  ok(regels.length === FOOTBALL_LINES.length + FARM_LINES.length, 'alle regels staan in de stemlijst');
  const entries = collect().filter((e) => e.area.startsWith('Carrièrescènes'));
  ok(entries.length === regels.length, 'voicelines_collect ziet alle regels', `${entries.length}/${regels.length}`);
  ok(entries.every((e) => e.manifest === 'lines'), 'de opnames komen in het lines-manifest');
  const spk = new Set(entries.map((e) => e.speakers[0]));
  ok(['Tammo', 'Anita', 'Trainer Eppo', 'Buurman Aldert'].every((s) => spk.has(s)), 'Tessa heet in de bank Anita; de twee nieuwe sprekers staan erbij');
  const lijst = src('scripts/tts_lines_list.mjs');
  ok(lijst.includes("'Trainer Eppo':") && lijst.includes("'Buurman Aldert':"), 'beide nieuwe sprekers hebben een stem in tts_lines_list.mjs');
  ok(NPC.trainer && NPC.trainer.name === 'Trainer Eppo' && NPC.buurman && NPC.buurman.name === 'Buurman Aldert', 'de NPC-tabel van missionstory.js heeft de trainer en de buurman');
  const run = src('game/js/careerdebutrun.js');
  ok(run.includes('noticeHeldBy') && run.includes('noticeQueue.shown()'), 'de loper wacht op de meldingenpoort en op een melding in beeld');
  ok(run.includes('view.flags.add(FOOTBALL_FLAG)') && run.includes('view.flags.add(FARM_FLAG)'), 'de vlag gaat erin zodra de scène begint (overslaan telt als gezien)');
  ok(src('game/js/main.js').includes('updateCareerDebuts('), 'main.js roept de loper aan');
  ok(src('game/js/cutpreview.js').includes('debutCatalog('), 'de catalogus van cutpreview.js bevat de scènes (dus ook de linter)');
  ok(entries.every((e) => isVoicedOrWaiting(e)), 'elke regel heeft een opname of wacht op de TTS-ronde (voice_wacht.json)');
}

console.log(`${n - fails}/${n} careerdebut`);
if (fails) process.exit(1);
