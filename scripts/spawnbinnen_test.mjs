// Binnenspawn (spawnbinnen.js, docs/SPAWN-BINNEN-22-11.md): de spawnkeuze voor alle situaties, de plek in de flat (loopbaar, niet in
// een meubel, binnen het pand, de lift bereikbaar), de plek in zes andere woningen (gewone interieurs), de wacht van het laadscherm met
// time-out en terugval, de save en de oude saves, en de bedrading in home.js, de instelling en de Samen-regel. Pure test, geen Electron.
// node scripts/spawnbinnen_test.mjs
import fs from 'node:fs';
import { SITUATIES, interieurType, chooseSpawn, binnenOpslag, readIndoorSave, makeIndoorWait, tickBinnenWacht, binnenPending, BINNEN_MAX_S, stepPlaysAtHome, playRule, flatSpotOk, flatBereikbaar, chooseFlatSpawn, chooseHomePropertySpawn, pandSpawnOk } from '../game/js/spawnbinnen.js';
import { makeFlatPlan } from '../game/js/flatplan.js';
import { homes, homeOf, registerHome, resetHomes, DEFAULT_HOME } from '../game/js/homebase.js';
import { planInterior } from '../game/js/interiorrules.js';
import { inHall } from '../game/js/interiorscene.js';
import { toLocal } from '../game/js/interiorframe.js';
import { loadPending } from '../game/js/loadlogic.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const flat = homeOf(DEFAULT_HOME);

// --- 1. de spawnmatrix: elke situatie -----------------------------------------------------------------------------------
ok(SITUATIES.length === 11, 'elf situaties in de matrix', SITUATIES.length);
const k = (o) => chooseSpawn({ thuis: flat, ...o });
// laden: save bij het huis (oud, zonder veld) en een save die binnen stond komen binnen
ok(k({ situatie: 'laden', saveCtx: 'home' }).plek === 'binnen', 'laden: een oude save bij het huis (geen binnen-veld) begint boven');
ok(k({ situatie: 'laden', saveCtx: undefined }).plek === 'binnen', 'laden: een oude save zonder context begint boven');
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: true }).plek === 'binnen', 'laden: een save die binnen stond laadt weer binnen');
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: false }).plek === 'buiten', 'laden: een save die buiten stond blijft buiten');
ok(k({ situatie: 'laden', saveCtx: 'busy' }).plek === 'houd' && k({ situatie: 'laden', saveCtx: 'free' }).plek === 'houd', 'laden: midden in een missie of ergens anders houdt de plek');
ok(k({ situatie: 'laden', saveCtx: 'busy', binnenSave: true }).plek === 'houd', 'laden: een missie gaat voor binnen');
ok(k({ situatie: 'laden', saveCtx: 'home', rol: 'gast' }).plek === 'buiten', 'laden: een gast staat bij de host, niet in zijn woning');
ok(k({ situatie: 'laden', saveCtx: 'home', rol: 'host' }).plek === 'binnen', 'laden: de host begint zelf boven');
ok(k({ situatie: 'laden', saveCtx: 'home', instelling: false }).plek === 'buiten', 'laden: met Start binnen uit begint hij buiten');
// nieuw spel en opening
ok(k({ situatie: 'nieuw-spel' }).plek === 'buiten' && k({ situatie: 'opening' }).plek === 'buiten', 'nieuw spel en opening beginnen voor de deur (de film eindigt daar)');
// slapen, naar huis, reis, missie, ziekenhuis, hostwissel, gast
ok(k({ situatie: 'slapen' }).plek === 'houd', 'slapen: je blijft in de woning');
ok(k({ situatie: 'naar-huis' }).plek === 'binnen', 'Naar huis: je staat boven');
ok(k({ situatie: 'naar-huis', instelling: false }).plek === 'buiten', 'Naar huis met de instelling uit: voor de deur');
ok(k({ situatie: 'reis-thuis' }).plek === 'buiten', 'een taxi of kaartreis naar Thuis zet je voor de deur');
ok(k({ situatie: 'missie-thuis' }).plek === 'buiten', 'een missie die thuis eindigt: bij de deur');
ok(k({ situatie: 'ziekenhuis' }).plek === 'buiten', 'na het ziekenhuis sta je niet thuis');
ok(k({ situatie: 'hostwissel' }).plek === 'houd', 'een hostwissel verplaatst niemand');
ok(k({ situatie: 'gast-aansluit' }).plek === 'buiten', 'een gast die aansluit komt naast de host');
ok(k({ situatie: 'bestaat-niet' }).plek === 'buiten', 'een onbekende situatie valt terug op buiten');
ok(SITUATIES.every((s) => ['binnen', 'buiten', 'houd'].includes(k({ situatie: s, saveCtx: 'home' }).plek) && k({ situatie: s }).reden.length > 10), 'elke situatie geeft een plek en een reden');
// de woning bestaat niet of kan niet gebouwd worden: terugval
ok(chooseSpawn({ situatie: 'naar-huis', thuis: null }).plek === 'buiten', 'zonder thuis: buiten');
ok(k({ situatie: 'naar-huis', interieurKlaar: false }).plek === 'buiten', 'een interieur dat niet te bouwen is: terugval op buiten');

// --- 2. de andere woningen (homebase.js): welk type interieur? ----------------------------------------------------------
{
  const typ = Object.fromEntries(homes().map((h) => [h.id, interieurType(h)]));
  ok(typ.paddepoel === 'flat' && typ.paddepoel_stel === 'flat', 'beide Paddepoel-huizen hebben het flat-interieur', JSON.stringify(typ));
  ok(typ.oma_noorderhaven === 'geen' && typ.oma_keuken === 'geen' && typ.havenkantoor === 'geen' && typ.schuur_tinus === 'geen', "Oma's kamer, Oma's keuken, het havenkantoor en de schuur hebben nog geen interieur");
  for (const id of ['oma_noorderhaven', 'oma_keuken', 'havenkantoor', 'schuur_tinus']) ok(chooseSpawn({ situatie: 'naar-huis', thuis: homeOf(id) }).plek === 'buiten', `${id}: geen interieur, dus voor de deur`);
  registerHome({ id: 'bezit_test', name: 'Huis van de speler', kind: 'pand', ref: 123456 });
  registerHome({ id: 'bezit_zonder_ref', name: 'Pand zonder verwijzing', kind: 'pand' });
  ok(interieurType(homeOf('bezit_test')) === 'pand' && chooseSpawn({ situatie: 'naar-huis', thuis: homeOf('bezit_test') }).plek === 'binnen', 'een Bezit-woning met een pand: binnen via het gewone interieur');
  ok(interieurType(homeOf('bezit_zonder_ref')) === 'geen', 'een pand zonder verwijzing heeft geen interieur');
  resetHomes();
}

// --- 3. de flat: de plek, de botsing en de lift --------------------------------------------------------------------------
{
  const P = makeFlatPlan();
  const c0 = chooseFlatSpawn(P);
  ok(!c0.terugval && c0.kijk[1] === -1, 'de flat kiest de woonkamer en kijkt naar het glas', JSON.stringify(c0));
  const woonkamer = P.rooms.find((r) => r.name === 'woonkamer');
  ok(c0.lx > woonkamer.x0 && c0.lx < woonkamer.x1 && c0.lz > woonkamer.z0 && c0.lz < woonkamer.z1, 'de plek ligt in de woonkamer');
  for (const [lx, lz] of P.spawn) {
    ok(flatSpotOk(P, lx, lz), `kandidaat ${lx},${lz}: niet in een wand of meubel, binnen het pand`);
    ok(flatBereikbaar(P, lx, lz), `kandidaat ${lx},${lz}: de lift is bereikbaar`);
    ok(lx > 0.4 && lx < P.w - 0.4 && lz > 0.5 && lz < P.d - 0.4, `kandidaat ${lx},${lz}: binnen de buitenmuren`);
  }
  ok(flatSpotOk(P, ...P.entry), 'de liftuitgang is zelf een geldige plek (de terugval)');
  // een EIKEA-stuk of een Sloapstee-bed op de eerste plek: de volgende kandidaat
  const blokkeer = (lx, lz) => [lx - 0.6, lz - 0.6, lx + 0.6, lz + 0.6];
  const c1 = chooseFlatSpawn(P, [...P.solids, blokkeer(...P.spawn[0])]);
  ok(!c1.terugval && (c1.lx !== P.spawn[0][0] || c1.lz !== P.spawn[0][1]), 'een meubel op de eerste plek: de volgende kandidaat', JSON.stringify(c1));
  ok(flatSpotOk(P, c1.lx, c1.lz, [...P.solids, blokkeer(...P.spawn[0])]), 'de gekozen plek staat vrij van dat meubel');
  // alles dichtgezet: de liftuitgang
  const c2 = chooseFlatSpawn(P, [...P.solids, ...P.spawn.map(([a, b]) => blokkeer(a, b))]);
  ok(c2.terugval && c2.lx === P.entry[0] && c2.lz === P.entry[1], 'alle kandidaten bezet: de speler komt uit de lift');
  // een kandidaat in een wand of buiten de muur wordt afgewezen, ook als hij op de goede kamer lijkt
  ok(!flatSpotOk(P, 3.7, 5.0), 'een punt op de wand tussen woonkamer en gang is geen plek');
  ok(!flatSpotOk(P, 0.2, 3), 'een punt tegen de buitenmuur is geen plek');
  ok(!flatSpotOk(P, 3.7, 3.9), 'een punt in de bank is geen plek');
  ok(!flatSpotOk(P, 8.2, 3.4), 'een punt in de tafel is geen plek');
  ok(!flatBereikbaar(P, 5.9, 2.6, [...P.solids, [0, 4.9, 11, 5.5]]), 'een dichtgebouwde doorgang: niet bereikbaar');
  // de flat in home.js gebruikt precies dit plan
  const src = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
  ok(/makeFlatPlan\(\)/.test(src) && /flat\.spawn = FP\.spawn/.test(src), 'home.js bouwt de flat uit flatplan.js');
}

// --- 4. zes woningen met een gewoon interieur ------------------------------------------------------------------------------
{
  const rnd = mulberry32(22);
  const maten = [[6, 8], [7.5, 10], [9, 12], [12, 14], [5.2, 6.6], [14, 16]];
  const welke = [['woning', null], ['woning', null], ['woning', null], ['woning', 'studentenkamer'], ['woning', null], ['woning', null]];
  let geslaagd = 0;
  maten.forEach(([w, d], i) => {
    const [kind, sub] = welke[i];
    const { b, spot } = building(kind, sub, w, d, rnd);
    const plan = planInterior(b, { spot });
    if (!plan.ok) { ok(false, `woning ${w}x${d}: planbaar`, plan.why); return; }
    const sp = chooseHomePropertySpawn(plan);
    ok(!!sp, `woning ${w}x${d}: er is een plek`);
    if (!sp) return;
    geslaagd++;
    const chk = pandSpawnOk(plan, sp);
    ok(chk.ok, `woning ${w}x${d}: loopbaar, niet in een meubel, deur bereikbaar`, chk.why);
    ok(inHall(plan, sp.x, sp.y, 0.3), `woning ${w}x${d}: binnen het pand (in de hal)`);
    const loc = toLocal(plan.frame, sp.x, sp.y);
    ok(Math.abs(loc[0] - sp.u) < 1e-6 && Math.abs(loc[1] - sp.v) < 1e-6, `woning ${w}x${d}: wereldplek en hal-plek horen bij elkaar`);
    ok(sp.vrij >= 0.55, `woning ${w}x${d}: minstens 0,55 m vrij`, sp.vrij.toFixed(2));
    // kijkend naar de deurwand: de blik wijst naar de gevel (v neemt af)
    const ax = Math.cos(sp.angle), ay = Math.sin(sp.angle);
    const voor = toLocal(plan.frame, sp.x + ax, sp.y + ay);
    ok(voor[1] < sp.v - 0.9, `woning ${w}x${d}: de speler kijkt naar de deur en de ramen`);
  });
  ok(geslaagd === 6, 'zes woningen kregen een plek', geslaagd);
  // en een brede steekproef: 120 woningen van willekeurige maat en zaad
  let tot = 0, slecht = 0;
  for (let i = 0; i < 120; i++) {
    const { b, spot } = building('woning', null, 4.5 + rnd() * 12, 5.5 + rnd() * 12, rnd);
    const plan = planInterior(b, { spot });
    if (!plan.ok) continue;
    tot++;
    const sp = chooseHomePropertySpawn(plan);
    if (!sp || !pandSpawnOk(plan, sp).ok) slecht++;
  }
  ok(tot > 60 && slecht === 0, 'steekproef van 120 woningen: elke planbare woning heeft een geldige plek', `${tot} planbaar, ${slecht} zonder plek`);
  ok(chooseHomePropertySpawn(null) === null && chooseHomePropertySpawn({ ok: false }) === null, 'zonder plan geen plek (de aanroeper valt terug op buiten)');
  ok(!pandSpawnOk(null, null).ok, 'pandSpawnOk zonder plan: niet ok');
}

// --- 5. de wacht van het laadscherm ----------------------------------------------------------------------------------------
{
  const w = makeIndoorWait();
  ok(w.staat === 'wacht' && binnenPending(w) === 1, 'de wacht begint open: het laadscherm blijft staan');
  tickBinnenWacht(w, { dt: 1 });
  ok(w.staat === 'wacht' && binnenPending(w) === 1, 'een seconde later wacht hij nog');
  tickBinnenWacht(w, { dt: 0.1, klaar: true });
  ok(w.staat === 'klaar' && binnenPending(w) === 0, 'het interieur staat: het laadscherm mag weg');
  tickBinnenWacht(w, { dt: 99, mislukt: true });
  ok(w.staat === 'klaar', 'een eindstand blijft staan');
  const t = makeIndoorWait();
  for (let i = 0; i < 100; i++) tickBinnenWacht(t, { dt: BINNEN_MAX_S / 100 + 1e-9 });
  ok(t.staat === 'terugval' && t.reden === 'time-out' && binnenPending(t) === 0, 'te lang bouwen: time-out en terugval op buiten voor de deur');
  const m = makeIndoorWait();
  tickBinnenWacht(m, { dt: 0.016, mislukt: true });
  ok(m.staat === 'terugval' && m.reden === 'mislukt', 'bouwen mislukt: meteen terugval');
  tickBinnenWacht(makeIndoorWait(), { dt: NaN });
  ok(BINNEN_MAX_S > 0 && BINNEN_MAX_S < 12, 'de wacht is korter dan de absolute grens van het laadscherm (12 s)');
  const lp = (b) => loadPending({ buildings: 0, roads: 0 }, 0, 0, b);
  ok(lp(1) === 1 && lp(0) === 0 && lp(undefined) === 0 && lp(NaN) === 0, 'loadPending telt de binnenwacht mee (en negeert rommel)');
  ok(loadPending({ buildings: 2, roads: 1 }, 3, 4) === 10, 'loadPending zonder vierde argument werkt als voorheen');
}

// --- 6. de save en de oude saves -------------------------------------------------------------------------------------------
{
  ok(binnenOpslag(true).binnen === true && binnenOpslag(false).binnen === false && binnenOpslag(undefined).binnen === false, 'binnenOpslag schrijft altijd een boolean');
  ok(readIndoorSave({ thuis: { front: [], binnen: true } }) === true && readIndoorSave({ thuis: { binnen: false } }) === false, 'een nieuwe save leest binnen of buiten');
  ok(readIndoorSave({}) === undefined && readIndoorSave({ thuis: { front: ['a'] } }) === undefined && readIndoorSave(null) === undefined && readIndoorSave({ thuis: { binnen: 'ja' } }) === undefined, 'een oude of rare save heeft geen binnen-veld: undefined');
  // een oude save gaat zonder verlies door dezelfde keuze: boven, zoals "doorgaan" altijd thuis was
  ok(chooseSpawn({ situatie: 'laden', thuis: flat, saveCtx: 'home', binnenSave: readIndoorSave({ thuis: { front: ['x'] } }) }).plek === 'binnen', 'een oude save begint boven');
  const src = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
  ok(/\.\.\.binnenOpslag\(!!inside\)/.test(src) && /readIndoorSave\(d\)/.test(src), 'home.js schrijft en leest thuis.binnen');
  ok(/saveCtx: laadtOpOpslagplek\(d\)/.test(src), 'een save midden in een missie of in de provincie houdt zijn plek (laadtOpOpslagplek)');
  ok(/situatie: 'naar-huis'/.test(src) && /w\.homeLaad = /.test(src) && /w\.coopVrij = /.test(src), 'home.js bedraadt Naar huis, de laadwacht en de gastplek');
  // de save slaat nooit een positie in een niet-geladen interieur op: de flat staat alleen in het spel als de wereld hem bouwt
  ok(/exitFlatNow\(w\);\n  binnenWacht = null;/.test(src), 'een load breekt eerst een oude flat af en wist de wacht');
}

// --- 7. de instelling en het laadscherm -----------------------------------------------------------------------------------
{
  const set = fs.readFileSync(new URL('../game/js/settings.js', import.meta.url), 'utf8');
  const menu = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  const ls = fs.readFileSync(new URL('../game/js/loadscreen.js', import.meta.url), 'utf8');
  ok(/startBinnen: true/.test(set), 'Start binnen (thuis) staat standaard aan');
  ok(/toggle\('startBinnen', 'Start binnen \(thuis\)'/.test(menu), 'de schakelaar staat in Instellingen > Spel');
  ok(/world\.homeLaad/.test(ls) && /loadPending\(st, tiles, prewarmPending\(\), binnen\)/.test(ls), 'het laadscherm wacht op het interieur');
  // de openingsfilm blijft zoals hij was: hij eindigt bij de deur (homeSpawnPoint) en raakt de binnenspawn niet
  const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
  ok(/homeSpawnPoint\(\)/.test(story) && !/spawnInFlat/.test(story), 'de opening speelt voor de deur en raakt de flatbouw niet');
}

// --- 8. Doorgaan bij een verhaalstap die thuis speelt, en de cutscene-startvoorwaarde -----------------------------------------
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: false, verhaalThuis: true }).plek === 'binnen', 'Doorgaan: een save van buiten komt boven uit als de volgende stap thuis speelt');
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: false, verhaalThuis: false }).plek === 'buiten', 'Doorgaan: zonder thuisstap blijft een save van buiten buiten');
ok(k({ situatie: 'laden', saveCtx: 'busy', binnenSave: false, verhaalThuis: true }).plek === 'houd', 'Doorgaan: een missie gaat voor de thuisstap');
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: false, verhaalThuis: true, instelling: false }).plek === 'buiten', 'Doorgaan: Start binnen uit blijft buiten (de scene wacht dan)');
ok(k({ situatie: 'laden', saveCtx: 'home', binnenSave: false, verhaalThuis: true, rol: 'gast' }).plek === 'buiten', 'Doorgaan als gast: lokaal buiten bij de host');
ok(k({ situatie: 'opening-na-laden' }).plek === 'binnen' && k({ situatie: 'opening-na-laden', instelling: false }).plek === 'buiten', 'na de opening van een geladen spel ga je weer naar boven (instelling aan)');
ok(stepPlaysAtHome({ goal: { type: 'home' } }) && stepPlaysAtHome({ goal: { type: 'night' }, homeScene: { id: 'M06.0' } }), 'een home-stap en een stap met homeScene spelen thuis');
ok(!stepPlaysAtHome({ goal: { type: 'opening' } }) && !stepPlaysAtHome({ goal: { type: 'train' } }) && !stepPlaysAtHome(null), 'de opening en andere stappen spelen niet thuis');
ok(playRule({ speeltThuis: true, binnen: true }).actie === 'start', 'cutscene thuis, speler binnen: start');
ok(playRule({ speeltThuis: false, binnen: false }).actie === 'start', 'cutscene op straat: start');
ok(playRule({ speeltThuis: true, binnen: false, thuis: flat }).actie === 'breng-binnen', 'cutscene thuis, speler buiten: eerst naar binnen brengen');
ok(playRule({ speeltThuis: true, binnen: false, thuis: flat, instelling: false }).actie === 'wacht', 'cutscene thuis, instelling uit: wachten, nooit stil starten');
ok(playRule({ speeltThuis: true, binnen: false, thuis: flat, rol: 'gast' }).actie === 'wacht', 'cutscene thuis, gast buiten: wachten');
ok(playRule({ speeltThuis: true, binnen: false, thuis: null }).actie === 'wacht', 'cutscene thuis zonder interieur: wachten');
{
  const home = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
  const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
  ok(/verhaalThuis/.test(home) && /setVerhaalThuisBron\(\(\) => stepPlaysAtHome\(currentStep\(\)\)\)/.test(story), 'applyHomeOnLoad leest de thuisstap via de hook van story.js');
  ok(/inHomeFlat\(\)\) stepOutForCutscene/.test(story) && /!flatStage\(\)/.test(story), 'de opening verlaat de flat eerst en een flatscene speelt nooit zonder flatstage');
}

console.log(fails ? `spawnbinnen_test: ${fails} van ${n} mislukt` : `spawnbinnen_test: ${n} controles ok`);
if (fails) process.exitCode = 1;
