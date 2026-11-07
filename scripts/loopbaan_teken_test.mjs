// #674: het hoogste loopbaanniveau is buiten het Loopbanen-scherm zichtbaar (titel naast je eigen
// plek op de kaart) en geeft één concreet niet-geldelijk voordeel per groep, zonder de loonfactor
// te verhogen. Deze test dekt de pure regel en de bedrading.
//   node scripts/loopbaan_teken_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from '../game/js/loopbaan.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const profiel = (vakken = {}) => { const p = L.nieuwProfiel(); for (const [vak, xp] of Object.entries(vakken)) p.vakken[vak].xp = xp; return p; };
const TOP = L.XP_DREMPELS[L.MAX_NIVEAU - 1]; // net op het hoogste niveau

t('zonder hoogste niveau is er geen teken', () => {
  const p = profiel({ klus: TOP - 1 });
  assert.equal(L.niveauVoorVak(p, 'klus'), L.MAX_NIVEAU - 1);
  assert.equal(L.loopbaanTeken(p), null);
  assert.deepEqual(L.voordelenVan(p), []);
});

t('op het hoogste niveau staat de titel en de kleur van de groep klaar', () => {
  const werk = L.loopbaanTeken(profiel({ klus: TOP }));
  assert.equal(werk.vak, 'klus');
  assert.equal(werk.titel, 'Meesterklusser');
  assert.equal(werk.niveau, L.MAX_NIVEAU);
  assert.equal(werk.groep, 'werk');
  assert.equal(werk.kleur, L.TITEL_GROEP_KLEUR.werk);
  assert.equal(L.loopbaanTeken(profiel({ trein: TOP })).kleur, L.TITEL_GROEP_KLEUR.vervoer);
  assert.equal(L.loopbaanTeken(profiel({ race: TOP })).kleur, L.TITEL_GROEP_KLEUR.spel);
});

t('per groep één concreet voordeel, alleen op niveau 6', () => {
  assert.equal(L.garageKorting(profiel({ trein: TOP })), 0.2, 'vervoer: garagekorting');
  assert.equal(L.garageKorting(profiel({ trein: TOP - 1 })), 0, 'nog geen korting onder het hoogste niveau');
  assert.equal(L.kermisGratis(profiel({ klus: TOP })), true, 'werk: gratis botsauto\'s');
  assert.equal(L.kermisGratis(profiel({ trein: TOP })), false, 'een ander groepsvak geeft dat voordeel niet');
  const voordelen = L.voordelenVan(profiel({ trein: TOP, klus: TOP, race: TOP })).map((v) => v.id).sort();
  assert.deepEqual(voordelen, ['garage', 'kermis', 'titel']);
  assert.equal(L.GROEP_VOORDELEN.spel.id, 'titel', 'spel: zichtbaarheid, geen geld');
  for (const g of L.GROEPEN) assert.ok(L.GROEP_VOORDELEN[g.id] && L.GROEP_VOORDELEN[g.id].tekst, `${g.naam} heeft een voordeel met tekst`);
});

t('de loonfactor blijft begrensd op +30%', () => {
  const p = profiel({ klus: TOP });
  assert.equal(L.LOON_FACTOR[L.MAX_NIVEAU - 1], 1.3);
  assert.equal(L.loonFactor(p, 'klus'), 1.3);
  assert.ok(Math.max(...L.LOON_FACTOR) <= 1.3);
});

t('de kaart, de garage en de kermis gebruiken het teken en de voordelen', () => {
  const map = read('mapview.js'), garages = read('garages.js'), kermis = read('kermis.js'), live = read('loopbaanlive.js'), eco = read('economy.js');
  assert.match(live, /export const loopbaanTeken = \(\) => L\.loopbaanTeken\(getProfiel\(\)\)/);
  assert.match(map, /loopbaanTeken\(\)/);
  assert.match(map, /mijnTitel/);
  // de garage leest de korting via de haak in economy.js (zodat garages.js de loopbaan niet importeert)
  assert.match(eco, /export function garageKorting|export const zetGarageKorting/);
  assert.match(live, /zetGarageKorting\(\(\) => L\.garageKorting\(getProfiel\(\)\)\)/);
  assert.match(garages, /garageKorting\(\)/);
  assert.match(kermis, /loopbaanKermisGratis\(\)/);
  assert.match(kermis, /free: storyRide\(w\) \|\| loopbaanKermisGratis\(\)/);
});

t('een gast heeft zijn eigen titel; de opener neemt die niet over', () => {
  // De titel komt uit het eigen loopbaanprofiel (één profiel per apparaat), niet uit de wereld van de
  // opener: twee profielen geven ieder hun eigen teken.
  const opener = L.loopbaanTeken(profiel({ trein: TOP }));
  const gast = L.loopbaanTeken(profiel({ race: TOP }));
  assert.equal(opener.titel, 'Spoorbaas van het Noorden');
  assert.equal(gast.titel, 'Racelegende');
  assert.notEqual(opener.titel, gast.titel);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
