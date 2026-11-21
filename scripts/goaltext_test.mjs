// De tekst van de doelbalk (#1175): een bestemming met werkwoord, een lopende opdracht als "Bezig: ...".
//   node scripts/goaltext_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { destinationTitle, busyTitle, goalTitle, travelMode, travelVerb, TRAVEL_VERB } from '../game/js/goaltext.js';
import { VEHICLE_KINDS, vehicleKind } from '../game/js/hudlook.js';

const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };

t('elke vervoersmodus heeft een werkwoord (te voet, alle voertuigsoorten en het vliegtuig)', () => {
  for (const k of ['voet', ...VEHICLE_KINDS, 'plane']) assert.ok(TRAVEL_VERB[k], k);
});
t('te voet Ga naar, auto Rij naar, boot Vaar naar, heli en vliegtuig Vlieg naar', () => {
  assert.equal(destinationTitle('Haven Delfzijl', 'voet'), 'Ga naar: Haven Delfzijl');
  assert.equal(destinationTitle('Haven Delfzijl', 'car'), 'Rij naar: Haven Delfzijl');
  assert.equal(destinationTitle('Haven Delfzijl', 'boat'), 'Vaar naar: Haven Delfzijl');
  assert.equal(destinationTitle('Haven Delfzijl', 'heli'), 'Vlieg naar: Haven Delfzijl');
  assert.equal(destinationTitle('Eelde', 'plane'), 'Vlieg naar: Eelde');
  assert.equal(destinationTitle('Hoofdstation', 'bike'), 'Fiets naar: Hoofdstation');
});
t('een onbekende modus valt terug op Ga naar; zonder naam niets', () => {
  assert.equal(travelVerb('onzin'), 'Ga naar');
  assert.equal(destinationTitle('', 'car'), '');
  assert.equal(destinationTitle(null), '');
});
t('een naam met eigen werkwoord of voorvoegsel krijgt er geen tweede bij', () => {
  for (const x of ['Ga naar het museum', 'Eerst: koop een fiets', 'Eerst naar de auto, dan: Het Podium', 'Onderduiken: de schuur', 'Rij naar de pomp', 'Bezig: iets']) {
    assert.equal(destinationTitle(x, 'car'), x);
    assert.equal(busyTitle(x), x);
  }
});
t('Bezig voor een lopende opdracht, niet voor een bestemming', () => {
  assert.equal(busyTitle('Pakketten bezorgen'), 'Bezig: Pakketten bezorgen');
  assert.equal(busyTitle(''), '');
  assert.equal(goalTitle('job', 'Pakketten bezorgen'), 'Bezig: Pakketten bezorgen');
  assert.equal(goalTitle('mission', 'Controlepunt 2/5'), 'Bezig: Controlepunt 2/5');
  assert.equal(goalTitle('goal', 'Haven Delfzijl', 'car'), 'Rij naar: Haven Delfzijl');
  assert.equal(goalTitle('story', 'Het Podium', 'voet'), 'Ga naar: Het Podium');
  assert.equal(goalTitle('police', 'Ontsnap aan de politie'), 'Ontsnap aan de politie');
});
t('travelMode volgt het voertuig', () => {
  assert.equal(travelMode(null, null), 'voet');
  assert.equal(travelMode({ isPlane: true }, 'car'), 'plane');
  assert.equal(travelMode({ isBoat: true }, vehicleKind({ isBoat: true })), 'boat');
  assert.equal(travelMode({}, 'train'), 'train');
});
t('hud_panel gebruikt de generator voor alle doelsoorten en kent geen kale "Doel: "-titel meer', () => {
  const src = lees('game/js/hud_panel.js');
  for (const s of ["goalTitle('job'", "goalTitle('mission'", "goalTitle('goal'", "goalTitle('story'"]) assert.ok(src.includes(s), s);
  assert.ok(!/title: `Doel: \$\{goal\.name\}`/.test(src));
  assert.ok(/o\.raw \?\? o\.title/.test(src), 'sleutel op de bestemming, niet op het werkwoord');
});

console.log(`goaltext_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
