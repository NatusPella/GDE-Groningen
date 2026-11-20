// Pure test van de penaltyserie in de Euroborg (#981): scripts/penalty_test.mjs
// Regels (penaltyrules.js), HUD-model (penaltystatus.js), medailles en de aansluiting op de bestaande tabellen.
import assert from 'node:assert/strict';
import { makeRng } from '../game/js/minigamekit.js';
import {
  SCHOTEN, KRACHT_DOEL, schiet, keeperKeuze, keeperBereik, keeperPlek, nieuweSerie, noteer, doelpunten, genomen, klaar, nogTeHalen, penaltyMedaille, medailleBij, goalsTekst, UITKOMSTEN,
} from '../game/js/penaltyrules.js';
import { penaltyHudModel, schotPop, watNu, STAPPEN, UITLEG } from '../game/js/penaltystatus.js';
import { simHudHtml } from '../game/js/simhud.js';
import { medailleTeksten } from '../game/js/difficulty_medals.js';

const vast = (...w) => { let i = 0; return () => w[i++ % w.length]; }; // een vaste reeks "toevalsgetallen" (0,5 = geen afwijking)

// het schot: een rustig schot in de hoek is een doelpunt als de keeper naar de andere kant duikt
const goal = schiet({ u: 0.85, v: 0.6, kracht: KRACHT_DOEL, rng: vast(0.5), duik: -1 });
assert.equal(goal.uitkomst, 'goal'); assert.equal(goal.duik, -1);
assert.equal(schiet({ u: 0.85, v: 0.6, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 1 }).uitkomst, 'redding', 'de keeper raadt de hoek');
assert.equal(schiet({ u: 0, v: 0.3, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'redding', 'een keeper die blijft staan houdt het midden');
assert.equal(schiet({ u: 0, v: 0.3, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 1 }).uitkomst, 'goal', 'een keeper die weg duikt laat het midden vrij');
// de bovenhoek: de keeper reikt maar half zo ver
assert.ok(keeperBereik(1, 0.9, KRACHT_DOEL) < keeperBereik(1, 0.3, KRACHT_DOEL));
assert.equal(schiet({ u: -0.9, v: 0.88, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 1 }).uitkomst, 'goal', 'de bovenhoek weg van de keeper');
assert.ok(keeperBereik(0, 0.3, 0.2) > keeperBereik(0, 0.3, KRACHT_DOEL), 'een slap schot is makkelijk te houden');
// mis, paal en lat
assert.equal(schiet({ u: 1.3, v: 0.4, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'naast');
assert.equal(schiet({ u: -1.3, v: 0.4, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'naast');
assert.equal(schiet({ u: 0.2, v: 1.25, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'over');
assert.equal(schiet({ u: 1.0, v: 0.5, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'paal');
assert.equal(schiet({ u: 0.3, v: 1.0, kracht: KRACHT_DOEL, rng: vast(0.5), duik: 0 }).uitkomst, 'lat');
// elke uitkomst heeft een woord en alleen een doelpunt is goed
for (const k of ['goal', 'redding', 'paal', 'lat', 'naast', 'over']) assert.ok(UITKOMSTEN[k].tekst.length > 3);
assert.deepEqual(Object.keys(UITKOMSTEN).filter((k) => UITKOMSTEN[k].goed), ['goal']);

// te hard of te zacht schieten geeft meer spreiding; bij 0 of 1 van het toeval wijkt het schot het verst af
const zuiver = schiet({ u: 0, v: 0.5, kracht: KRACHT_DOEL, rng: vast(1), duik: 1 });
const hard = schiet({ u: 0, v: 0.5, kracht: 1, rng: vast(1), duik: 1 });
assert.ok(Math.abs(hard.u) > Math.abs(zuiver.u), 'te hard wijkt verder af');
const stand = (s) => Math.abs(schiet({ u: 0, v: 0.5, kracht: KRACHT_DOEL, rng: vast(1), duik: 1, stand: s }).u);
assert.ok(stand('ontspannen') < stand('standaard') && stand('standaard') < stand('uitdagend'), 'de stand bepaalt de spreiding');

// de keeper: kijkt soms mee, gokt anders, en blijft zelden in het midden staan
const rng = makeRng(7);
const keuzes = { '-1': 0, '0': 0, '1': 0 };
for (let i = 0; i < 3000; i++) keuzes[keeperKeuze(0, rng, 'standaard')]++;
assert.ok(keuzes['0'] < keuzes['-1'] && keuzes['0'] < keuzes['1'], JSON.stringify(keuzes));
assert.equal(keeperKeuze(-0.9, vast(0), 'standaard'), -1, 'als hij meeleest duikt hij naar jouw kant');
assert.equal(keeperKeuze(0.9, vast(0), 'uitdagend'), 1);
assert.equal(keeperPlek(1), 0.62); assert.equal(keeperPlek(0), 0);

// een serie en de medailles
const serie = nieuweSerie();
assert.equal(serie.schoten.length, SCHOTEN); assert.equal(genomen(serie), 0); assert.ok(!klaar(serie)); assert.equal(nogTeHalen(serie), 5);
for (const u of ['goal', 'redding', 'goal', 'naast']) assert.ok(noteer(serie, u));
assert.equal(doelpunten(serie), 2); assert.equal(genomen(serie), 4); assert.equal(nogTeHalen(serie), 3);
assert.ok(noteer(serie, 'goal')); assert.ok(klaar(serie)); assert.equal(noteer(serie, 'goal'), false, 'niet meer dan vijf schoten');
assert.equal(doelpunten(serie), 3);
assert.equal(penaltyMedaille(1), 0); assert.equal(penaltyMedaille(2), 1); assert.equal(penaltyMedaille(3), 2); assert.equal(penaltyMedaille(4), 2); assert.equal(penaltyMedaille(5), 3);
assert.deepEqual(medailleBij('standaard'), [2, 3, 5]);
assert.ok(medailleBij('uitdagend').every((v) => v >= 1 && v <= SCHOTEN), 'de drempel gaat nooit boven vijf');
assert.ok(medailleBij('ontspannen')[2] <= medailleBij('uitdagend')[2] + 0, 'ontspannen is niet strenger dan uitdagend');
assert.equal(goalsTekst(3), '3 van 5');
// de startkaart en het schermtekst komen uit dezelfde bron
assert.deepEqual(medailleTeksten('penalty', 'standaard'), ['2 doelpunten', '3 doelpunten', '5 doelpunten']);
assert.ok(medailleTeksten('penalty', 'uitdagend').every((t) => /^[1-5] doelpunten$/.test(t)));

// het HUD-model
assert.equal(penaltyHudModel(null), null);
const basis = { fase: 'richten', laden: false, lading: 0, schot: 2, goals: 1, gemist: 0, laatste: null, tekst: '', uitleg: false };
const richten = penaltyHudModel(basis);
assert.equal(richten.stappen.length, STAPPEN.length); assert.equal(richten.stappen.filter((s) => s.stand === 'nu').length, 1); assert.equal(richten.stappen[0].stand, 'nu');
assert.ok(richten.meter && richten.meter.label.startsWith('Doel')); assert.equal(richten.cijfers.filter((c) => c.primair).length, 1);
assert.ok(richten.cijfers.every((c) => c.icoon)); assert.equal(richten.uitleg.length, 0);
assert.match(richten.nu, /{SPATIE}/);
const laden = penaltyHudModel({ ...basis, laden: true, lading: 0.5 });
assert.equal(laden.stappen[1].stand, 'nu'); assert.match(laden.nu, /78%/);
assert.match(watNu({ ...basis, laden: true, lading: 0.95 }), /Te hard/); assert.equal(penaltyHudModel({ ...basis, laden: true, lading: 0.95 }).meter.staat, 'laag');
const uitkomst = penaltyHudModel({ ...basis, fase: 'uitkomst', laatste: 'redding', tekst: 'Gered door de keeper' });
assert.equal(uitkomst.stappen[2].stand, 'nu'); assert.equal(uitkomst.meter, null); assert.ok(uitkomst.slecht); assert.equal(uitkomst.nu, 'Gered door de keeper');
assert.ok(!penaltyHudModel({ ...basis, fase: 'uitkomst', laatste: 'goal' }).slecht, 'een doelpunt is niet slecht');
assert.equal(penaltyHudModel({ ...basis, uitleg: true }).uitleg.length, UITLEG.length);
assert.equal(penaltyHudModel({ ...basis, fase: 'intro', uitleg: true }).uitleg.length, 0, 'de uitleg staat bij het richten');
assert.equal(schotPop('goal', 3).tekst, 'GOAL! 3 van 5'); assert.equal(schotPop('goal', 3).geluid, 'ui_verzameld'); assert.equal(schotPop('goal', 5).geluid, 'ui_loopbaan');
assert.equal(schotPop('naast', 3).geluid, null); assert.equal(schotPop('onbekend', 0), null);
const html = simHudHtml(laden);
assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(html), 'alleen ds-tokens in de strook'); assert.match(html, /role="progressbar"/); assert.equal((html.match(/<li data-stand/g) || []).length, 3);
// toetsplaatjes: de strook toont {SPATIE} als toetsplaatje, nooit als ruwe accolades
assert.ok(!/\{[A-Z]+\}/.test(simHudHtml(penaltyHudModel({ ...basis, uitleg: true }))));
console.log('penalty_test ok');
