// #990: de ontdekkings- en mistregels van de kaart als pure functies (game/js/kaartonthulling.js):
// wat is verborgen en hoe sterk, de opening (de mist die openrijdt), de lijst van wat nooit verdwijnt,
// de camera naar het gebied, de naamkaart, de wachtrij, en per speler (twee profielen, twee kaarten).
//   node scripts/kaartonthulling_test.mjs
import assert from 'node:assert/strict';
import {
  MIST_ALPHA, mistLevel, mistByte, streekOwnerGrid, applyStreekMist,
  OPEN_MS, OPEN_SOFT_M, openingProgress, openingRadius, openingLevel, openingDone,
  isNeverHidden, focusScale, cameraStep, naamkaart, naamkaartAlpha, NAAMKAART_MS, queueReveal, strekenTekst,
} from '../game/js/kaartonthulling.js';
import { newExplorationProfile, revealArea, isHiddenOnMap, strekenStand, areaForPoint } from '../game/js/verkenpunten.js';
import { hideUnknownAreas } from '../game/js/todofilter.js';
import { STREKEN } from '../game/js/regioleven.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };

t('mistLevel: een onbekende streek is zwaar, een gekende open, buiten de streken een lichte waas', () => {
  assert.equal(mistLevel({ area: { id: 'a' }, areaKnown: false, buurtId: 'b1', buurtSeen: false }), 'onbekend');
  assert.equal(mistLevel({ area: { id: 'a' }, areaKnown: true, buurtId: 'b1', buurtSeen: false }), 'open', 'een gekende streek is helemaal open');
  assert.equal(mistLevel({ area: null, buurtId: 'b1', buurtSeen: false }), 'buurt');
  assert.equal(mistLevel({ area: null, buurtId: 'b1', buurtSeen: true }), 'open', 'een bezochte buurt is open');
  assert.equal(mistLevel({ area: { id: 'a' }, areaKnown: false, buurtId: 'b1', buurtSeen: true }), 'open', 'wie er al was, ziet het');
  assert.equal(mistLevel({}), 'open', 'zonder gebied niets verbergen');
  assert.ok(MIST_ALPHA.onbekend > MIST_ALPHA.buurt && MIST_ALPHA.buurt > MIST_ALPHA.open, 'de mist loopt op met het onbekende');
  assert.ok(mistByte('onbekend') > mistByte('buurt') && mistByte('open') === 0);
  assert.ok(MIST_ALPHA.onbekend < 1, 'nooit helemaal dicht: de kaart eronder blijft te zien');
});

// een klein raster met twee streken
const centers = [{ x: 1000, y: 1000, reach: 900 }, { x: 4000, y: 1000, reach: 900 }];
const grid = { w: 60, h: 30, minx: 0, miny: 0, res: 100 };

t('streekOwnerGrid wijst elke cel de dichtstbijzijnde streek in bereik toe', () => {
  const own = streekOwnerGrid(grid, centers);
  assert.equal(own.length, 60 * 30);
  assert.equal(own[10 * 60 + 10], 1, 'cel bij het hart van de eerste streek');
  assert.equal(own[10 * 60 + 40], 2, 'cel bij het hart van de tweede');
  assert.equal(own[10 * 60 + 25], 0, 'tussen de streken: niemand');
  assert.equal(own[29 * 60 + 59], 0, 'ver weg: niemand');
});

t('applyStreekMist: onbekend zwaar, gekend open, buiten de streken blijft de buurtwaas', () => {
  const own = streekOwnerGrid(grid, centers);
  const buurt = mistByte('buurt');
  const lv = new Uint8Array(own.length).fill(buurt);
  applyStreekMist(lv, own, new Set([1]));
  assert.equal(lv[10 * 60 + 10], 0, 'streek 1 is gekend: open');
  assert.equal(lv[10 * 60 + 40], mistByte('onbekend'), 'streek 2 is onbekend: zwaar');
  assert.equal(lv[10 * 60 + 25], buurt, 'buiten de streken blijft de waas');
});

t('de ontdekking is per speler: twee profielen, twee maskers', () => {
  const own = streekOwnerGrid(grid, centers);
  const maak = (kent) => applyStreekMist(new Uint8Array(own.length).fill(mistByte('buurt')), own, new Set(kent));
  const a = maak([1]), b = maak([2]);
  assert.equal(a[10 * 60 + 10], 0); assert.ok(a[10 * 60 + 40] > 0);
  assert.ok(b[10 * 60 + 10] > 0); assert.equal(b[10 * 60 + 40], 0);
  // en met de echte profielen en streken van het spel
  const s = STREKEN[0];
  const [x, y] = wgsToWorld(s.at[0], s.at[1]);
  const p1 = newExplorationProfile(), p2 = newExplorationProfile();
  revealArea(p1, s.id);
  assert.equal(isHiddenOnMap(p1, x, y), false);
  assert.equal(isHiddenOnMap(p2, x, y), true, 'een andere speler ziet het nog niet: elke speler heeft zijn eigen profiel');
  assert.equal(areaForPoint(x, y), s.id);
});

t('openingProgress en openingRadius: zacht van start tot het hele gebied bedekt is', () => {
  assert.equal(openingProgress(0, 0), 0);
  assert.equal(openingProgress(OPEN_MS, 0), 1);
  assert.equal(openingProgress(OPEN_MS * 5, 0), 1, 'blijft op 1');
  assert.equal(openingProgress(-500, 0), 0, 'vóór de start is er nog niets open');
  let vorige = -1;
  for (let ms = 0; ms <= OPEN_MS; ms += 100) { const p = openingProgress(ms, 0); assert.ok(p >= vorige, 'nooit terug'); vorige = p; }
  assert.equal(openingRadius(OPEN_MS, 0, 9000), 9000 + OPEN_SOFT_M, 'aan het eind is ook de rand voorbij de streek');
  assert.equal(openingRadius(0, 0, 9000), 0);
  assert.ok(openingRadius(OPEN_MS / 2, 0, 9000) > 0.5 * 9000, 'easeOut: halverwege is al het grootste deel open');
});

t('openingLevel: binnen de cirkel nieuw, erbuiten oud, op de rand vloeiend', () => {
  const oud = 199, nieuw = 0, r = 5000;
  assert.equal(openingLevel(oud, nieuw, 100, r), nieuw, 'het midden is open');
  assert.equal(openingLevel(oud, nieuw, 6000, r), oud, 'ver erbuiten is nog mist');
  let vorige = nieuw - 1;
  for (let d = r - OPEN_SOFT_M; d <= r; d += 100) { const l = openingLevel(oud, nieuw, d, r); assert.ok(l >= vorige, 'loopt op naar buiten'); vorige = l; }
  const rand = openingLevel(oud, nieuw, r - OPEN_SOFT_M / 2, r);
  assert.ok(rand > nieuw && rand < oud, 'de rand is een overgang, geen trap');
  assert.equal(openingLevel(oud, nieuw, NaN, r), nieuw, 'een kapotte afstand verbergt niets');
});

t('openingDone telt de duur', () => {
  assert.equal(openingDone(OPEN_MS - 1, 0), false);
  assert.equal(openingDone(OPEN_MS, 0), true);
});

t('nooit-verbergen: missies, verhaal, dorpen, uitkijkpunt, eerbetoon, stations blijven altijd', () => {
  for (const it of [
    { group: 'missies' }, { group: 'verhaal' }, { key: 'om:uitkijk' }, { key: 'om:dorp:Veendam' }, { key: 'om:beppe' },
    { kind: 'uitkijkpunt' }, { kind: 'station' }, { kind: 'beppe' }, { kind: 'mission' }, { kind: 'story' }, { kind: 'eerbetoon' },
  ]) assert.equal(isNeverHidden(it), true, JSON.stringify(it));
  for (const it of [{ group: 'diensten', key: 'job:koerier' }, { key: 'mg:padel' }, { kind: 'shop' }, null]) assert.equal(isNeverHidden(it), false);
});

t('Te doen en de kaart delen de lijst: een onbekende streek verbergt activiteiten, niet de must-finds', () => {
  const s = STREKEN[0];
  const [x, y] = wgsToWorld(s.at[0], s.at[1]);
  const prof = newExplorationProfile();
  const items = [
    { key: 'm:1', group: 'missies', x, y }, { key: 'om:uitkijk', group: 'ommeland', x, y }, { key: 'om:beppe', group: 'ommeland', x, y },
    { key: 'mg:padel', group: '', x, y }, { key: 'job:koerier', group: 'diensten', x, y },
  ];
  const keys = (l) => l.map((i) => i.key);
  assert.deepEqual(keys(hideUnknownAreas(items, (a, b) => isHiddenOnMap(prof, a, b))), ['m:1', 'om:uitkijk', 'om:beppe']);
  revealArea(prof, s.id);
  assert.equal(hideUnknownAreas(items, (a, b) => isHiddenOnMap(prof, a, b)).length, 5, 'na het ontdekken is alles te zien');
});

t('focusScale: de streek vult het scherm met een rand, binnen de grenzen', () => {
  const sc = focusScale(10000, 1600, 900, { fill: 0.8 });
  assert.ok(Math.abs(sc * 2 * 10000 - 900 * 0.8) < 1e-9, 'de korte zijde bepaalt');
  assert.ok(focusScale(10000, 1600, 900, { minScale: 1 }) >= 1, 'niet minder dan de ondergrens');
  assert.ok(focusScale(1, 1600, 900, { maxScale: 0.5 }) <= 0.5, 'niet meer dan de bovengrens');
  assert.equal(focusScale(0, 1600, 900), 0, 'zonder bereik geen schaal');
});

t('cameraStep: zacht van A naar B, geometrisch zoomen', () => {
  const a = { x: 0, y: 0, zoom: 1 }, b = { x: 1000, y: -400, zoom: 16 };
  assert.deepEqual(cameraStep(a, b, 0), a);
  const eind = cameraStep(a, b, 1);
  assert.equal(eind.x, 1000); assert.equal(eind.y, -400); assert.ok(Math.abs(eind.zoom - 16) < 1e-9);
  assert.ok(Math.abs(cameraStep(a, b, 0.5).zoom - 4) < 1e-9, 'halverwege is de geometrische helft');
  assert.deepEqual(cameraStep(a, b, 7), eind, 'buiten 0 tot 1 blijft hij op het einde staan');
});

t('naamkaart: de streek, de voortgang en een zachte in- en uitfade', () => {
  const k = naamkaart('Hogeland', { totaal: 8, ontdekt: 3, verkend: 1 });
  assert.equal(k.naam, 'Hogeland'); assert.equal(k.kicker, 'Nieuwe streek');
  assert.equal(k.regel, '3 van 8 ontdekt'); assert.equal(k.sub, '1 van 8 verkend');
  assert.equal(naamkaart('', null), null);
  assert.equal(naamkaartAlpha(-1, 0), 0);
  assert.equal(naamkaartAlpha(0, 0), 0);
  assert.equal(naamkaartAlpha(NAAMKAART_MS / 2, 0), 1);
  assert.equal(naamkaartAlpha(NAAMKAART_MS + 1, 0), 0);
  assert.ok(naamkaartAlpha(NAAMKAART_MS * 0.9, 0) < 1 && naamkaartAlpha(NAAMKAART_MS * 0.9, 0) > 0);
});

t('queueReveal: een streek één keer, rommel valt weg', () => {
  let q = queueReveal([], { area: 'hogeland', x: 1, y: 2 });
  q = queueReveal(q, { area: 'hogeland', x: 5, y: 5 });
  q = queueReveal(q, { area: 'oldambt', x: 3, y: 4 });
  q = queueReveal(q, { area: 'oldambt', x: NaN, y: 4 });
  q = queueReveal(q, null);
  assert.deepEqual(q.map((e) => e.area), ['hogeland', 'oldambt']);
  assert.equal(queueReveal(undefined, { area: 'a', x: 0, y: 0 }).length, 1);
});

t('de teller: x van 8 verkend volgt het profiel van deze speler', () => {
  const prof = newExplorationProfile();
  assert.equal(strekenStand(prof).totaal, STREKEN.length);
  assert.equal(strekenStand(prof).ontdekt, 0);
  revealArea(prof, STREKEN[0].id);
  assert.equal(strekenStand(prof).ontdekt, 1);
  assert.equal(strekenStand(newExplorationProfile()).ontdekt, 0, 'een tweede speler staat nog op nul');
});

t('strekenTekst: ontdekt en verkend, leeg zonder stand', () => {
  assert.equal(strekenTekst({ totaal: 8, ontdekt: 3, verkend: 1 }), '3 van 8 streken ontdekt · 1 verkend');
  assert.equal(strekenTekst({ totaal: 8, ontdekt: 0, verkend: 0 }), '0 van 8 streken ontdekt · 0 verkend');
  assert.equal(strekenTekst(null), '');
  assert.equal(strekenTekst({ totaal: 0, ontdekt: 0, verkend: 0 }), '');
});

console.log(`kaartonthulling_test: ${n} controles ok`);
