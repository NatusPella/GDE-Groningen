// #825: de provincie per speler ontdekken, zonder de wereld te verbergen. Pure checks op
// verkenpunten.js (profiel, onthullen, stand per streek, stempel, reisvoordeel, kaartselectie) en
// bronchecks op de haken: de kaart verbergt van een onbekende streek alleen de naam, het streeklabel
// en de activiteiten-iconen; de wegen, het water, de eigen positie en de missies blijven staan.
// Geen DOM en geen scherm: wat hier niet in staat, is niet bekeken (staat als "nog niet bekeken" in
// het issue).
//   node scripts/verken_ontdekking_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  uitkijkpunten, installeerUitkijkpunten,
  newExplorationProfile, normaliseExploration, mergeExploration, knownAreas,
  areaIsKnown, revealArea, usesPoint, hasAreaStamp, areaForPoint, areaName, pointArea, viewpointKey,
  areasFromVisits, areaProgress, awardAreaStamp, areaLabels, travelFactor, isHiddenOnMap,
  isAreaId, EXPLORATION_VERSION, TRAVEL_BONUS,
} from '../game/js/verkenpunten.js';
import { STREKEN } from '../game/js/regioleven.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { MENU_PLEKKEN } from '../game/js/menuplekken.js';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', naam, extra); } };
const world = (la, lo) => wgsToWorld(la, lo);
const heart = (id) => { const s = STREKEN.find((q) => q.id === id); return world(s.at[0], s.at[1]); };
const city = world(53.2194, 6.5665); // de Grote Markt: de stad hoort bij geen streek
const kits = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url), 'utf8')).items;
const punten = uitkijkpunten(kits, MENU_PLEKKEN, STREKEN);

// 1. Het eigen profiel: vers, oud, kapot en van een tweede tabblad.
{
  assert.deepEqual(newExplorationProfile(), { v: EXPLORATION_VERSION, streken: [], punten: [], stempels: [] });
  for (const raw of [null, undefined, '', '{kapot', 'null', 7, [], { v: 0 }, { v: 999, streken: ['hogeland'] }]) {
    assert.deepEqual(normaliseExploration(raw), newExplorationProfile(), `kapot profiel ${JSON.stringify(raw)}`);
  }
  const p = normaliseExploration(JSON.stringify({ v: EXPLORATION_VERSION, streken: ['hogeland', 'hogeland', 'nergens', 7, ''], punten: ['uitkijkpunt:hogeland', 3, ''], stempels: ['hogeland'] }));
  assert.deepEqual(p.streken, ['hogeland'], 'dubbele en onbekende streken vallen weg');
  assert.deepEqual(p.punten, ['uitkijkpunt:hogeland']);
  assert.deepEqual(p.stempels, ['hogeland']);
  ok(normaliseExploration('{"v":1,"streken":["hogeland"]}').v === EXPLORATION_VERSION, 'een profiel uit JSON is geldig');
  // twee tabbladen: wat een van beide zag, is gezien
  const m = mergeExploration({ v: EXPLORATION_VERSION, streken: ['hogeland'], punten: ['uitkijkpunt:hogeland'] }, { v: EXPLORATION_VERSION, streken: ['oldambt'], punten: ['uitkijkpunt:oldambt'], stempels: ['oldambt'] });
  assert.deepEqual(m.streken.sort(), ['hogeland', 'oldambt']);
  assert.deepEqual(m.punten.sort(), ['uitkijkpunt:hogeland', 'uitkijkpunt:oldambt']);
  assert.deepEqual(m.stempels, ['oldambt']);
  ok(mergeExploration(null, '{kapot').streken.length === 0, 'samenvoegen met een kapot profiel blijft heel');
}

// 2. De acht uitkijkpunten (#807): elk punt heeft een id en hoort bij zijn eigen streek, ook als het
//    net buiten de reach van die streek valt (westerkwartier: Piloersemaborg). Zo werkt de E-actie
//    overal, ook waar de cirkel van de streek het punt niet haalt.
{
  ok(punten.length === STREKEN.length, 'elke streek heeft een uitkijkpunt', String(punten.length));
  ok(new Set(punten.map((p) => p.id)).size === punten.length, 'elk uitkijkpunt heeft een eigen id');
  ok(punten.every((p) => p.id === `uitkijkpunt:${p.streek}` && isAreaId(p.streek)), 'de id is de streek');
  const zonder = punten.filter((p) => pointArea(p) !== p.streek);
  ok(!zonder.length, 'pointArea geeft de eigen streek van het punt', zonder.map((p) => p.streek + '->' + pointArea(p)).join(', '));
  ok(punten.every((p) => viewpointKey(p) === p.id), 'de sleutel in het profiel is de id van het punt');
  const map = { meta: {} };
  const gezet = installeerUitkijkpunten(map, kits, { plekken: MENU_PLEKKEN, streken: STREKEN });
  ok(map.meta.uitkijkpunten === gezet && gezet.every((p) => typeof p.id === 'string'), 'de kaartlaag krijgt de id mee');
}

// 3. Ontdekken: door er te komen (een plek) of door het uitkijkpunt te gebruiken.
{
  const [hx, hy] = heart('hogeland');
  ok(areaForPoint(hx, hy) === 'hogeland', 'de plek van een streekhart hoort bij die streek');
  ok(areaForPoint(...city) === null && areaForPoint(NaN, 0) === null && areaForPoint(0, 1e9) === null, 'de stad en de leegte horen bij geen streek');
  ok(areaName('hogeland') === 'Hogeland' && areaName('nergens') === '', 'streeknamen');
  const p = newExplorationProfile();
  ok(isHiddenOnMap(p, hx, hy), 'een onbekende streek is op de kaart verborgen');
  ok(!isHiddenOnMap(p, ...city), 'de stad is nooit verborgen: daar begint de speler');
  ok(revealArea(p, 'hogeland') === true, 'de streek onthullen');
  ok(revealArea(p, 'hogeland') === false, 'twee keer onthullen is geen nieuwe streek');
  ok(revealArea(p, 'nergens') === false, 'een onbekend streek-id komt er niet in');
  ok(areaIsKnown(p, 'hogeland') && knownAreas(p).join() === 'hogeland', 'de streek staat in het eigen profiel');
  ok(!isHiddenOnMap(p, hx, hy), 'een bekende streek is niet meer verborgen');
  ok(!usesPoint(p, viewpointKey(punten.find((q) => q.streek === 'hogeland'))), 'alleen onthullen gebruikt nog geen uitkijkpunt');
  const q = newExplorationProfile();
  revealArea(q, 'hogeland', { point: 'uitkijkpunt:hogeland' });
  ok(usesPoint(q, 'uitkijkpunt:hogeland'), 'het uitkijkpunt telt als gebruikt');
  // per speler: een gast heeft zijn eigen ontdekkingen, zonder netwerkbericht
  const gast = newExplorationProfile();
  ok(!areaIsKnown(gast, 'hogeland') && !areaIsKnown(newExplorationProfile(), 'hogeland'), 'ontdekking is van deze speler');
  ok(JSON.stringify(gast) === JSON.stringify(newExplorationProfile()), 'een ander profiel verandert niet mee');
}

// 4. Wie hier al was begint niet bij nul: de bezochte buurten van gebieden.js zijn het startpunt.
{
  const [hx, hy] = heart('hogeland');
  const [ox, oy] = heart('oldambt');
  const ind = { gebied: new Map([
    ['bu:hogeland', { x: hx, y: hy }],
    ['bu:oldambt', { x: ox, y: oy }],
    ['bu:stad', { x: city[0], y: city[1] }],
    ['bu:kapot', { x: NaN, y: 0 }],
  ]) };
  const bezoek = { bezocht: ['bu:hogeland', 'bu:sta', 'bu:stad', 'bu:kapot', 'bu:hogeland'] };
  const areas = areasFromVisits(bezoek, ind);
  assert.deepEqual(areas.sort(), ['hogeland'], 'alleen de buurten in een echte streek tellen');
  assert.deepEqual(areasFromVisits({ bezocht: [] }, ind), []);
  assert.deepEqual(areasFromVisits(bezoek, null), []);
  assert.deepEqual(areasFromVisits(bezoek, { gebied: new Map() }), []);
  const p = newExplorationProfile();
  for (const a of areas) revealArea(p, a);
  ok(areaIsKnown(p, 'hogeland'), 'een oude speler krijgt de streken die hij al zag');
}

// 5. Helemaal verkend: alle missies van de streek klaar en alle uitkijkpunten gebruikt. Dan een
//    stempel (een keer) en 10% korter reizen naar die streek.
{
  const p = newExplorationProfile();
  const [hx, hy] = heart('hogeland');
  const missions = [
    { start: { x: hx, y: hy }, done: false },
    { start: { x: hx + 10, y: hy }, done: true },
    { start: { x: city[0], y: city[1] }, done: false }, // een missie in de stad hoort bij geen streek
  ];
  const point = { id: 'uitkijkpunt:hogeland', streek: 'hogeland', x: hx, y: hy };
  let stand = areaProgress(p, 'hogeland', { missions, points: [point] });
  ok(!stand.complete && !stand.discovered, 'onbekend is niet verkend');
  revealArea(p, 'hogeland');
  stand = areaProgress(p, 'hogeland', { missions, points: [point] });
  ok(stand.discovered && stand.missionsTotal === 2 && stand.missionsDone === 1 && stand.pointsTotal === 1 && stand.pointsUsed === 0, 'de stand per streek telt alleen de eigen missies en punten', JSON.stringify(stand));
  ok(!stand.complete, 'een missie en het uitkijkpunt ontbreken nog');
  revealArea(p, 'hogeland', { point: 'uitkijkpunt:hogeland' });
  stand = areaProgress(p, 'hogeland', { missions, points: [point] });
  ok(!stand.complete, 'nog niet alle missies klaar');
  missions[0].done = true;
  stand = areaProgress(p, 'hogeland', { missions, points: [point] });
  ok(stand.complete, 'alle missies en het uitkijkpunt: de streek is verkend');
  ok(travelFactor(p, hx, hy) === 1, 'een verkende streek zonder stempel geeft nog geen reisvoordeel');
  ok(awardAreaStamp(p, 'hogeland', { missions, points: [point] }) === true, 'de stempel');
  ok(awardAreaStamp(p, 'hogeland', { missions, points: [point] }) === false, 'de stempel maar één keer');
  ok(hasAreaStamp(p, 'hogeland'), 'de stempel staat in het profiel');
  ok(Math.abs(travelFactor(p, hx, hy) - (1 - TRAVEL_BONUS)) < 1e-9, 'een helemaal verkende streek reist 10% sneller', String(TRAVEL_BONUS));
  ok(travelFactor(p, city[0], city[1]) === 1, 'de stad krijgt geen reisvoordeel');
  ok(travelFactor(newExplorationProfile(), hx, hy) === 1, 'zonder streek geen voordeel');
  // de missies van een andere streek tellen niet mee
  ok(areaProgress(p, 'oldambt', { missions, points: [point] }).missionsTotal === 0, 'missies van een andere streek tellen niet mee');
  // de stempel zonder dat de punten van de kaart bekend zijn: nog geen stempel (de kits laden later)
  const q = newExplorationProfile();
  revealArea(q, 'hogeland', { point: 'uitkijkpunt:hogeland' });
  ok(!awardAreaStamp(q, 'hogeland', { missions: [], points: [] }), 'zonder bekende uitkijkpunten geen stempel');
}

// 5b. De missies van een streek komen ook uit de missielijst van het spel (start met x/y of een
//     eigen streekveld), en een missie zonder plek telt nergens mee.
{
  const [hx, hy] = heart('hogeland');
  const point = { id: 'uitkijkpunt:hogeland', streek: 'hogeland', x: hx, y: hy };
  const p = newExplorationProfile();
  revealArea(p, 'hogeland', { point: 'uitkijkpunt:hogeland' });
  const missions = [
    { x: hx, y: hy, done: true },
    { streek: 'hogeland', done: true },
    { done: true }, // geen plek: telt niet mee, en maakt de streek niet onverwacht onvolledig
  ];
  const stand = areaProgress(p, 'hogeland', { missions, points: [point] });
  ok(stand.missionsTotal === 2 && stand.missionsDone === 2 && stand.complete, 'missies met een plek of een eigen streek', JSON.stringify(stand));
}

// 6. De kaart van deze speler: alleen bekende streken met een naam, een stempel als ze klaar zijn.
{
  const p = newExplorationProfile();
  assert.deepEqual(areaLabels(p), [], 'zonder ontdekkingen geen streeknamen op de kaart');
  revealArea(p, 'hogeland');
  revealArea(p, 'oldambt');
  const labels = areaLabels(p);
  assert.deepEqual(labels.map((l) => l.id), ['oldambt', 'hogeland'], 'de namen in de volgorde van de streken');
  ok(labels.every((l) => l.name && Number.isFinite(l.x) && Number.isFinite(l.y)), 'elke naam staat op het bestaande streekhart');
  ok(labels.every((l) => l.stamp === false), 'nog geen stempel');
  // alleen de eigen streken: een onbekende streek staat er niet bij
  ok(!labels.some((l) => l.id === 'eemsdelta'), 'onbekende streken houden hun naam weg');
  const [hx, hy] = heart('hogeland');
  const point = { id: 'uitkijkpunt:hogeland', streek: 'hogeland', x: hx, y: hy };
  revealArea(p, 'hogeland', { point: point.id });
  awardAreaStamp(p, 'hogeland', { missions: [{ start: { x: hx, y: hy }, done: true }], points: [point] });
  const met = areaLabels(p).find((l) => l.id === 'hogeland');
  ok(met && met.stamp === true, 'een verkende streek krijgt een stempel naast de naam');
}

// 7. Wat de kaart verbergt: welk punt hoort bij een onbekende streek? De stad blijft altijd zichtbaar.
{
  const p = newExplorationProfile();
  for (const punt of punten) {
    const area = areaForPoint(punt.x, punt.y);
    ok(isHiddenOnMap(p, punt.x, punt.y) === !!area, `uitkijkpunt ${punt.streek}: verborgen zolang de streek op die plek onbekend is`);
    ok(isAreaId(punt.streek), `uitkijkpunt ${punt.streek}: hoort bij een bestaande streek`);
  }
  // het punt in de reach van een andere streek (veenkolonien ligt in die van oldambt): de plek telt
  const buiten = punten.filter((q) => areaForPoint(q.x, q.y) !== q.streek);
  ok(buiten.every((q) => pointArea(q) === q.streek), 'de E-actie kent het punt zijn eigen streek, ook buiten de reach', buiten.map((q) => q.streek).join(', '));
  ok(!isHiddenOnMap(p, ...city), 'de stad (en alles buiten een streek) blijft zichtbaar');
  ok(!isHiddenOnMap(p, NaN, NaN), 'een onbekende plek is niet verborgen');
  revealArea(p, 'hogeland');
  const [hx, hy] = heart('hogeland');
  ok(!isHiddenOnMap(p, hx, hy), 'een bekende streek is zichtbaar');
  // een onbekende streek blijft verborgen tot je hem kent
  ok(isHiddenOnMap(p, ...heart('oldambt')), 'een andere onbekende streek is nog verborgen');
  // de uitkijkpunten zelf blijven altijd op de kaart: juist daarmee ontdek je een onbekende streek
  const view0 = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(view0.includes("drawMapIcon(ctx, 'uitkijkpunt'") && !view0.includes('if (isAreaHidden(u.x, u.y))'), 'een uitkijkpunt in een onbekende streek blijft zichtbaar');
}

// 8. De kaartwiring: de kaart vraagt de selectie aan de live-laag, verbergt de activiteiten-iconen
//    van een onbekende streek en tekent de namen van de bekende streken; de wereld blijft staan.
{
  const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const view = read('mapview.js');
  ok(view.includes("from './explorationlive.js'"), 'de kaart importeert de verkenlaag');
  ok(view.includes('if (isAreaHidden(a.x, a.y)) continue;'), 'de kaart slaat de activiteiten-iconen van een onbekende streek over');
  ok(view.indexOf('activityMapIcons(world)') >= 0 && view.indexOf('activityMapIcons(world)') < view.indexOf('isAreaHidden(a.x, a.y)'), 'de activiteiten-iconen gaan door de verkenlaag');
  ok(view.includes('for (const area of explorationLabels())') && view.includes('drawAreaStamp(ctx'), 'de kaart tekent de namen en de stempel van bekende streken');
  ok(view.includes('if (provinceMapOn() && names.regions)') && view.includes('explorationLabels()'), 'de streeknamen staan bij de regiokaart, niet boven de dorpen');
  ok(view.includes("const streek = isAreaKnown(u.streek)") && view.includes('isViewpointUsed(u)'), 'de hover van een uitkijkpunt noemt de streek pas als je hem kent');
  ok(view.includes('onExplorationChange(() => { if (state) state.dirty = true; })'), 'de kaart tekent meteen opnieuw als er een streek bij komt');
  // de wereld blijft: de wegen, het water en de eigen positie worden niet door de verkenlaag geraakt
  for (const teken of ['drawCountryBase', 'drawProvinceBase', 'drawSea', 'drawDynamicMarkers', "icon(null, 'player'", 'hierHtml']) {
    ok(view.includes(teken), 'de kaart tekent ' + teken + ' nog');
  }
  ok(!view.includes('fogVanStreek') && !view.includes('strekenFog'), 'geen mistlaag over de wereld: alleen namen en iconen');
  const hud = read('hud_panel.js');
  ok(hud.includes("from './explorationlive.js'") && hud.includes('const sichtbaar = (x, y) => !isAreaHidden(x, y)') && hud.includes('if (sichtbaar(a.x, a.y))'), 'de minikaart verbergt dezelfde activiteiten-iconen');
  const map = read('mapview.js');
  ok(map.includes('const onbekend = (x, y) => isAreaHidden(x, y)') && map.includes('if (onbekend(sj.x, sj.y)) continue'), 'de kaart verbergt ook bijbanen van onbekende streken (#834)');
  ok(map.includes('if (onbekend(q.x, q.y)) continue') && map.includes('if (onbekend(e.x, e.y)) continue'), 'de kaart verbergt ook vondsten en overige spots (#834)');
  ok(map.includes('for (const sj of getSideJobSpotsForRender()) { if (isAreaHidden(sj.x, sj.y)) continue; entries.push'), 'de zoeklijst verbergt bijbanen van onbekende streken (#834)');
  ok(hud.includes("getSideJobSpotsForRender().filter((sj) => sichtbaar(sj.x, sj.y))"), 'de minikaart verbergt ook bijbanen (#834)');
  const reis = read('reiskaart.js');
  ok(reis.includes('travelFactorFor(target.x, target.y)') && reis.includes('o.etaS = Math.round(o.etaS * voordeel)'), 'het reisvoordeel zit op de bestaande reisoptie (10% korter)');
  ok(reis.includes('streekvoordeel'), 'de reiziger ziet waar het voordeel vandaan komt');
  const dorp = read('regiolevenrt.js');
  ok(dorp.includes('updateExploration(dt, w)') && dorp.includes('tryViewpointInteract(w)'), 'de opener ontdekt en gebruikt uitkijkpunten via de bestaande streek-laag');
  const gast = read('coopgastlokaal.js');
  ok(gast.includes('updateExploration(dt, world)') && gast.includes('tryViewpointInteract(world)'), 'een gast ontdekt op zijn eigen scherm');
  const prompts = read('prompts.js');
  ok(prompts.includes('viewpointPrompt(world)') && prompts.includes("from './explorationlive.js'"), 'de E-hint bij het uitkijkpunt');
  const live = read('explorationlive.js');
  ok(live.includes('KEYS.exploration') && read('storagekeys.js').includes("exploration: 'gde-verkenning-v1'"), 'het eigen profiel heeft een eigen opslagsleutel');
  ok(!/sendEvent|coopnet|addMessage\(.*samen/i.test(live), 'geen netwerkbericht: de ontdekking is lokaal');
  ok(live.includes('mergeExploration(profile, bestaand)'), 'een tweede tabblad verliest geen ontdekking');
}

// 9. De changelog noemt de wijziging in het Nederlands en de Samen spelen-regel staat erbij.
{
  const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const unreleased = changelog.slice(changelog.indexOf('## [Unreleased]'), changelog.indexOf('## [0.60.1]'));
  ok(/#825/.test(unreleased), 'de changelog noemt #825');
  ok(/onbekend/i.test(unreleased) && /uitkijkpunt/i.test(unreleased) && /streek/i.test(unreleased), 'de regel leest als spelers tekst');
  ok(/Samen spelen|gast/i.test(unreleased), 'de Samen spelen-regel staat erbij');
}

console.log(fails ? `${fails} of ${n} verken-ontdekkingschecks failed` : `verken_ontdekking_test: ${n} checks ok (${punten.length} uitkijkpunten, ${STREKEN.length} streken)`);
process.exit(fails ? 1 : 0);
