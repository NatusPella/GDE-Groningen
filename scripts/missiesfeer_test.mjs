// Missiesferen (#988): elke sfeer heeft een bestandsnaam; alleen een kleine lijst verhaalmomenten krijgt eigen muziek,
// al het andere is de radio (null). Een ontbrekend bestand geeft geen fout en geen ophaalpoging.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  SFEER_BESTAND, SFEER_KEYS, BESCHIKBARE_SFEREN, MISSIE_EIGEN_MUZIEK, BIJBAAN_EIGEN_MUZIEK, sfeerBeschikbaar, missieSfeer,
  missieMuziekKey, bijbaanMuziekKey, sfeerTracks,
} from '../game/js/missiesfeer.js';
import { activityMusicKey, createScenarioDirector, ACTIVITY_KEYS } from '../game/js/scenariomusic.js';
import { STEPS } from '../game/js/storyarc.js';

const dir = new URL('../game/audio/scenario/', import.meta.url);
const NAMEN = ['komisch', 'sluipen', 'ontdekken', 'warm', 'feest', 'werk', 'finale', 'nacht', 'water'];

// elke sfeer: sleutel, bestandsnaam missie_<naam>.mp3, en hij zit in de lijst van de director
assert.deepEqual(SFEER_KEYS, NAMEN.map((n) => 'missie_' + n));
for (const k of SFEER_KEYS) {
  assert.equal(SFEER_BESTAND[k], k + '.mp3', k + ': bestandsnaam');
  assert.ok(ACTIVITY_KEYS.includes(k), k + ': in ACTIVITY_KEYS');
}

// de lijst klopt met de map: wat er ligt staat erin, wat erin staat ligt er (alleen neerzetten + de lijst)
const opSchijf = readdirSync(dir).filter((f) => f.startsWith('missie_') && f !== 'missie_spanning_loop.mp3');
for (const k of SFEER_KEYS) assert.equal(existsSync(new URL(SFEER_BESTAND[k], dir)), sfeerBeschikbaar(k), k + ': lijst en map moeten gelijk zijn (BESCHIKBARE_SFEREN in missiesfeer.js)');
for (const f of opSchijf) assert.ok(Object.values(SFEER_BESTAND).includes(f), f + ': onbekende missie_-sfeer in de map');
assert.ok(BESCHIKBARE_SFEREN.every((k) => SFEER_KEYS.includes(k)));
assert.ok(existsSync(new URL('missie_spanning_loop.mp3', dir)), 'de terugval-loop bestaat');

// de lijst van de eigenaar: klein, bekende codes en sferen, per sfeer alleen de verhaalmomenten
const codes = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id);
assert.ok(codes.length >= 30);
assert.ok(MISSIE_EIGEN_MUZIEK.length <= 20, 'houd de lijst klein');
for (const e of MISSIE_EIGEN_MUZIEK) {
  assert.ok(codes.includes(e.code), e.code + ': onbekende missiecode');
  assert.ok(SFEER_KEYS.includes(e.sfeer), e.code + ': onbekende sfeer ' + e.sfeer);
}
for (const k of Object.values(BIJBAAN_EIGEN_MUZIEK)) assert.ok(SFEER_KEYS.includes(k));
const sferenVan = (k) => MISSIE_EIGEN_MUZIEK.filter((e) => e.sfeer === k).map((e) => e.code);
assert.deepEqual(sferenVan('missie_komisch'), ['M01', 'M02', 'M03', 'M04', 'M05'], 'komisch: alleen de kennismakingsmissies');
assert.deepEqual(sferenVan('missie_sluipen'), ['M06', 'M13', 'M14', 'M20', 'M21']);
assert.deepEqual(sferenVan('missie_warm'), ['M27', 'M28', 'M29']);
assert.deepEqual(sferenVan('missie_finale'), ['M30']);
assert.deepEqual(sferenVan('missie_werk'), [], 'werk is niet gekoppeld: klussen houden de radio');
assert.deepEqual(sferenVan('missie_nacht'), []);
assert.equal(missieSfeer('M05'), 'missie_komisch');
assert.equal(missieSfeer('M06'), 'missie_sluipen');
assert.equal(missieSfeer('M26'), 'missie_feest');
assert.equal(missieSfeer('M30'), 'missie_finale');

// elke andere missie, een onbekende code of een missie zonder code: geen eigen sfeer (de radio)
const lijst = new Set(MISSIE_EIGEN_MUZIEK.map((e) => e.code));
for (const c of codes) if (!lijst.has(c)) { assert.equal(missieSfeer(c), null, c + ': geen eigen sfeer'); assert.equal(missieMuziekKey(c), null, c + ': radio'); }
assert.ok(codes.filter((c) => !lijst.has(c)).length >= 10, 'de meeste missies houden de radio');
for (const c of [null, undefined, '', 'M44', 'M09', 'X1']) assert.equal(missieMuziekKey(c), null, String(c));
// een lijstmoment geeft zijn sleutel alleen als het bestand er is (anders de radio, geen 404)
for (const e of MISSIE_EIGEN_MUZIEK) assert.equal(missieMuziekKey(e.code), sfeerBeschikbaar(e.sfeer) ? e.sfeer : null, e.code);
assert.equal(missieMuziekKey('M01'), 'missie_komisch');
assert.equal(missieMuziekKey('M06'), 'missie_sluipen', 'sluipen is goedgekeurd en beschikbaar');
assert.equal(missieMuziekKey('M16'), 'missie_feest', 'feest is goedgekeurd en beschikbaar');
assert.equal(missieMuziekKey('M26'), 'missie_feest');
assert.equal(missieMuziekKey('M17'), null, 'feest alleen voor de feestmomenten');
assert.equal(bijbaanMuziekKey('bruggen'), 'missie_feest', 'de bruggenrace als wedstrijd');
assert.equal(bijbaanMuziekKey('cabaret'), null);
assert.equal(missieMuziekKey('M30'), 'missie_finale', 'finale is goedgekeurd en beschikbaar');
assert.equal(missieMuziekKey('M27'), 'missie_warm', 'warm is goedgekeurd en beschikbaar');
assert.equal(missieMuziekKey('M11'), 'missie_water', 'water is goedgekeurd en beschikbaar');
assert.equal(bijbaanMuziekKey('skutsje'), 'missie_water', 'de skûtsje-sprint als wedstrijd');
// sluipen alleen voor de sluipmomenten, niet als algemene missiemuziek
assert.equal(missieMuziekKey('M07'), null);
assert.equal(missieMuziekKey('M22'), null);

// een regel met stap telt alleen binnen het stageIndex-bereik
MISSIE_EIGEN_MUZIEK.push({ code: 'M09', stap: [2, 3], sfeer: 'missie_komisch' });
assert.equal(missieMuziekKey('M09', 2), 'missie_komisch');
assert.equal(missieMuziekKey('M09', 3), 'missie_komisch');
assert.equal(missieMuziekKey('M09', 1), null);
assert.equal(missieMuziekKey('M09'), null, 'zonder stageIndex telt een stapregel niet');
MISSIE_EIGEN_MUZIEK.pop();

// bijbanen: standaard de radio; alleen een wedstrijd of verhaalmoment een sfeer (en alleen als het bestand er is)
for (const id of ['taxi', 'bezorger', 'vracht', 'lijn', 'cabaret', 'krantenwijk', 'iets_onbekends', null]) assert.equal(bijbaanMuziekKey(id), null, id + ': de radio');
for (const [id, k] of Object.entries(BIJBAAN_EIGEN_MUZIEK)) assert.equal(bijbaanMuziekKey(id), sfeerBeschikbaar(k) ? k : null, id);
assert.deepEqual(Object.keys(sfeerTracks()).sort(), [...BESCHIKBARE_SFEREN].sort(), 'alleen beschikbare sferen worden een track (geen 404)');
for (const p of Object.values(sfeerTracks())) assert.ok(existsSync(new URL(p.replace('./audio/scenario/', ''), dir)));

// activityMusicKey: een gewone actieve missie of bijbaan geeft null (radio), een lijstmoment zijn sfeer
assert.equal(activityMusicKey({ mission: { phase: 'active' }, player: {} }), null, 'een gewone missie is de radio');
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M09', type: 'stages' }, player: {} }), null);
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M06', type: 'stages' }, player: {} }), 'missie_sluipen');
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M02' }, player: {} }), 'missie_komisch');
assert.equal(activityMusicKey({ sideJob: { active: true, id: 'bruggen' }, player: {} }), 'missie_feest');
assert.equal(activityMusicKey({ mission: { phase: 'active', spanning: true }, player: {} }), 'missie', 'de spanningsloop alleen op expliciet verzoek');
assert.equal(activityMusicKey({ mission: { phase: 'inactive', code: 'M06' }, player: {} }), null);
assert.equal(activityMusicKey({ sideJob: { active: true, id: 'taxi' }, player: {} }), null);
assert.equal(activityMusicKey({ mission: { phase: 'inactive' }, sideJob: { active: false, id: 'taxi' }, player: {} }), null);
// in een voertuig wint de radio (null) bij een gewone missie, een verhaalmoment wint bij een lijstmoment
const auto = { inVehicle: { model: { name: 'sedan' } } };
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M09' }, player: auto }), null);
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M06' }, player: auto }), 'missie_sluipen');

// zelfde sfeer in de volgende stap herstart niet; wisselen is een wissel van sleutel (crossfade in scenario.js)
{
  const d = createScenarioDirector();
  const run = (secs, st) => { let r = null; for (let t = 0; t < secs; t += 0.1) r = d.update(0.1, st); return r; };
  const a = missieMuziekKey('M01'), b = missieMuziekKey('M02'), c = missieMuziekKey('M06');
  assert.ok(a && c);
  assert.equal(run(2, { activity: a }), a);
  assert.equal(run(0.1, { activity: b }), b);
  assert.equal(a, b, 'M01 en M02 delen een sfeer: de sleutel verandert niet, dus geen herstart');
  assert.equal(run(1, { activity: c }), c);
}

// de bron van scenario.js voegt de sferen alleen toe via sfeerTracks (nooit een blind pad)
const bron = readFileSync(new URL('../game/js/audio/scenario.js', import.meta.url), 'utf8');
assert.ok(/\.\.\.sfeerTracks\(\)/.test(bron));
assert.ok(!/missie_(komisch|sluipen|ontdekken|warm|feest|werk|finale|nacht|water)/.test(bron), 'geen vaste sfeerpaden in scenario.js');

console.log('missiesfeer_test ok: ' + SFEER_KEYS.length + ' sferen, ' + codes.length + ' missies, ' + BESCHIKBARE_SFEREN.length + ' beschikbaar');
