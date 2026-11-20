// Missiesferen (#988): elke sfeer heeft een bestandsnaam, een mapping en een terugval; een
// ontbrekend bestand geeft geen fout en geen ophaalpoging.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  SFEER_BESTAND, SFEER_KEYS, BESCHIKBARE_SFEREN, sfeerBeschikbaar, sfeerMetTerugval, missieSfeer,
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

// mapping: elke verhaalmissie M01 tot M30 heeft een sfeer, en een terugval op 'missie' als het bestand ontbreekt
const codes = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id);
assert.ok(codes.length >= 30);
const gebruikt = new Set();
for (const c of codes) {
  const s = missieSfeer(c);
  assert.ok(SFEER_KEYS.includes(s), c + ': sfeer ' + s);
  gebruikt.add(s);
  const k = missieMuziekKey(c);
  assert.ok(k === s || k === 'missie', c + ': terugval');
  assert.equal(k, sfeerBeschikbaar(s) ? s : 'missie');
}
for (const k of SFEER_KEYS) if (k !== 'missie_nacht') assert.ok(gebruikt.has(k) || ['missie_nacht'].includes(k), k + ': door geen enkele missie gebruikt');
assert.equal(missieSfeer('M05'), 'missie_komisch');
assert.equal(missieSfeer('M06'), 'missie_sluipen');
assert.equal(missieSfeer('M20'), 'missie_sluipen');
assert.equal(missieSfeer('M26'), 'missie_feest');
assert.equal(missieSfeer('M30'), 'missie_finale');
assert.equal(missieSfeer('M44'), 'missie_finale', 'een onbekende late missie krijgt de standaard');
assert.equal(missieSfeer('M03'), 'missie_komisch');
assert.equal(missieSfeer(null, 'boat'), 'missie_water');
assert.equal(missieSfeer(null, 'x'), 'missie_komisch');

// terugval en bijbanen: een ontbrekende sfeer geeft nooit een fout, een bijbaan houdt dan de radio
assert.equal(sfeerMetTerugval('missie_nacht'), sfeerBeschikbaar('missie_nacht') ? 'missie_nacht' : 'missie');
assert.equal(sfeerMetTerugval('bestaat_niet'), 'missie');
assert.equal(sfeerMetTerugval(null), 'missie');
assert.deepEqual(Object.keys(sfeerTracks()).sort(), [...BESCHIKBARE_SFEREN].sort(), 'alleen beschikbare sferen worden een track (geen 404)');
for (const p of Object.values(sfeerTracks())) assert.ok(existsSync(new URL(p.replace('./audio/scenario/', ''), dir)));
for (const id of ['taxi', 'skutsje', 'bruggen', 'iets_onbekends']) {
  const k = bijbaanMuziekKey(id, true);
  assert.ok(k === null || SFEER_KEYS.includes(k), id);
  if (!BESCHIKBARE_SFEREN.length) assert.equal(k, null, id + ': zonder bestand de radio');
}

// activityMusicKey: huidige gedrag blijft, met en zonder bestand
assert.equal(activityMusicKey({ mission: { phase: 'active' }, player: {} }), sfeerBeschikbaar('missie_komisch') ? 'missie_komisch' : 'missie');
assert.equal(activityMusicKey({ mission: { phase: 'active', code: 'M06', type: 'stages' }, player: {} }), missieMuziekKey('M06', 'stages'));
assert.equal(activityMusicKey({ sideJob: { active: true, id: 'taxi' }, player: {} }), bijbaanMuziekKey('taxi', false));
assert.equal(activityMusicKey({ mission: { phase: 'inactive' }, sideJob: { active: false, id: 'taxi' }, player: {} }), null);

// zelfde sfeer in de volgende stap herstart niet; wisselen is een wissel van sleutel (crossfade in scenario.js)
{
  const d = createScenarioDirector();
  const run = (secs, st) => { let r = null; for (let t = 0; t < secs; t += 0.1) r = d.update(0.1, st); return r; };
  const a = missieMuziekKey('M01'), b = missieMuziekKey('M02'), c = missieMuziekKey('M06');
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
