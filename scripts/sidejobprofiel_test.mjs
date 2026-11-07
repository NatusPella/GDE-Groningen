// Bijbanen (#631/#667/#668): één profiel per baan — vak, sfeer, familie (dienst of kantoorklus) en de
// niveau-regel. Puur: de HUD, "Te doen", de banen-app en deze test gebruiken dezelfde bron.
//   node scripts/sidejobprofiel_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BAAN_IDS, vakVanBaan } from '../game/js/loopbaan.js';
import * as P from '../game/js/sidejobprofiel.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#631/#667: elke baan heeft een profiel met vak, sfeer, familie en uitleg', () => {
  assert.ok(BAAN_IDS.length >= 40, 'de banen: ' + BAAN_IDS.length);
  const gezien = new Set();
  for (const id of BAAN_IDS) {
    const pr = P.sidejobProfiel(id);
    assert.ok(pr, id);
    assert.equal(pr.vak, vakVanBaan(id), id + ': vak');
    assert.ok(pr.sfeer, id + ': sfeer');
    assert.ok(P.FAMILIES[pr.familie], id + ': familie');
    assert.ok(pr.familieNaam === 'Dienst' || pr.familieNaam === 'Kantoorklus', id + ': familieNaam');
    assert.ok(pr.uitleg.length > 20, id + ': uitleg');
    gezien.add(id);
  }
  assert.equal(gezien.size, BAAN_IDS.length, 'geen dubbele profielen');
  assert.equal(P.sidejobProfiel('bestaatniet').vak, 'klus', 'een onbekende baan valt in het klusvak');
  assert.equal(P.sidejobProfiel(null), null);
});

t('#667: de banen zijn verdeeld in dienst en kantoorklus; elke baan hoort bij precies één familie', () => {
  const v = P.familieVerdeling();
  const samen = [...v.dienst, ...v.kantoorklus];
  assert.equal(samen.length, BAAN_IDS.length, 'elke baan is ingedeeld');
  assert.equal(new Set(samen).size, samen.length, 'geen dubbele indeling');
  assert.ok(v.dienst.length > v.kantoorklus.length, 'de meeste banen zijn diensten');
  assert.ok(v.kantoorklus.length >= 15, 'de kantoorklussen: ' + v.kantoorklus.length);
  for (const id of ['loket', 'cabaret', 'rechtbank', 'boa', 'snackoverlast', 'kermisdraai']) {
    assert.equal(P.familieVan(id), 'kantoorklus', id);
  }
  for (const id of ['taxi', 'bus', 'vracht', 'rondvaart', 'veer', 'tjalke', 'bietenoogst']) {
    if (BAAN_IDS.includes(id)) assert.equal(P.familieVan(id), 'dienst', id);
  }
  assert.equal(P.familieVan('bestaatniet'), 'dienst', 'onbekend telt als dienst');
});

t('#631: geen losse hex in de tabel; de sfeer komt uit carrieresfeer.js', () => {
  const src = bron('sidejobprofiel.js');
  const srcZonderCommentaar = src.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(srcZonderCommentaar, /['"]#[0-9a-fA-F]{3,6}['"]/, 'geen hexkleur in de tabel');
  assert.match(src, /from '\.\/carrieresfeer\.js'/, 'de sfeer komt uit carrieresfeer.js');
  assert.match(src, /from '\.\/loopbaan\.js'/, 'het vak komt uit loopbaan.js');
  const sj = bron('sidejobs.js');
  assert.match(sj, /sidejobProfiel\(s\.job\.id\)/, 'de lijst leest het profiel');
  assert.match(sj, /p\.sfeer = pr\.sfeer/, 'de publicatie geeft de sfeer mee aan de HUD');
  assert.match(sj, /p\.familie = pr\.familie/, 'en de familie');
  // #631: de marker volgt de kleurenblindmodus (bestaande regel blijft)
  assert.match(sj, /markerColors\(\)/, 'de marker leest markerColors()');
  const td = bron('todo.js');
  assert.match(td, /familieNaam/, 'Te doen noemt de familie');
  assert.match(bron('sidejobprofiel.js'), /BALKEN_UITLEG/, 'de twee balken staan in één regel klaar');
});

t('#668: de eerste ronde van een baan telt dubbel voor het niveau, daarna één; de drempels blijven gelijk', () => {
  assert.deepEqual(P.LEVEL_AT, [0, 5, 12, 25, 45]);
  assert.equal(P.rondeWaarde(0), 2, 'de eerste ronde telt dubbel');
  assert.equal(P.rondeWaarde(1), 1);
  assert.equal(P.rondeWaarde(4), 1);
  assert.equal(P.jobLevel(0), 1); assert.equal(P.jobLevel(4), 1); assert.equal(P.jobLevel(5), 2);
  assert.equal(P.jobLevel(12), 3); assert.equal(P.jobLevel(25), 4); assert.equal(P.jobLevel(45), 5); assert.equal(P.jobLevel(999), 5);
  assert.equal(P.titelVanNiveau(1), 'Nieuweling'); assert.equal(P.titelVanNiveau(5), 'Legende');
  // hoe de baan het telt: eerste ronde 0 -> 2, daarna +1 per ronde; met 5 gewogen rondes is dat niveau 2
  let gewogen = 0; const stappen = [];
  for (let i = 0; i < 5; i++) { const w = P.rondeWaarde(gewogen); gewogen += w; stappen.push(w); }
  assert.deepEqual(stappen, [2, 1, 1, 1, 1], 'vijf rondes geven zes gewogen punten');
  assert.equal(P.jobLevel(gewogen), 2, 'en dus niveau 2');
  const sj = bron('sidejobs.js');
  assert.match(sj, /rondeWaarde\(gewogen\)/, 'de baan gebruikt dezelfde regel');
  assert.match(sj, /r\.levelRondes = /, 'de gewogen teller gaat apart mee');
  assert.match(sj, /levelRondes: n\(/, 'en overleeft een save');
  assert.ok(P.appRegel('taxi').includes('Deze baan wordt beter als je hem vaak doet.'), 'de banen-app noemt de baanbalk');
  assert.ok(P.appRegel('taxi').includes('Dit vak wordt beter als je varieert'), 'en de vakbalk');
  assert.match(P.appRegel('loket'), /Kantoorklus/, 'de app noemt de familie');
});

console.log(`sidejobprofiel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
