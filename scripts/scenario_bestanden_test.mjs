// Elk muziekbestand in game/audio/scenario/ wordt ergens gebruikt: een vaste track in audio/scenario.js
// (SCENARIO_TRACKS) of een missiesfeer (missiesfeer.js) die aan minstens een verhaalmoment of bijbaan hangt.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { SFEER_BESTAND, BESCHIKBARE_SFEREN, MISSIE_EIGEN_MUZIEK, BIJBAAN_EIGEN_MUZIEK, sfeerTracks } from '../game/js/missiesfeer.js';

const dir = new URL('../game/audio/scenario/', import.meta.url);
const bron = readFileSync(new URL('../game/js/audio/scenario.js', import.meta.url), 'utf8');
const vast = new Set([...bron.matchAll(/\.\/audio\/scenario\/([\w.-]+\.mp3)/g)].map((m) => m[1]));
const sfeerGebruikt = new Set([
  ...MISSIE_EIGEN_MUZIEK.map((e) => e.sfeer), ...Object.values(BIJBAAN_EIGEN_MUZIEK),
].filter((k) => BESCHIKBARE_SFEREN.includes(k)).map((k) => SFEER_BESTAND[k]));

const opSchijf = readdirSync(dir).filter((f) => f.endsWith('.mp3'));
assert.ok(opSchijf.length >= 24);
for (const f of opSchijf) assert.ok(vast.has(f) || sfeerGebruikt.has(f), f + ': dit bestand wordt nergens afgespeeld');
for (const f of vast) assert.ok(opSchijf.includes(f), f + ': in scenario.js maar niet op schijf');
for (const k of BESCHIKBARE_SFEREN) assert.ok(Object.keys(sfeerTracks()).includes(k), k + ': geen track');
console.log('scenario_bestanden_test: ok (' + opSchijf.length + ' bestanden)');
