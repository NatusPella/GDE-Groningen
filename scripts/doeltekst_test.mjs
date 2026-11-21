// De tekst van de doelbalk (#1175): een bestemming met werkwoord, een lopende opdracht als "Bezig: ...".
//   node scripts/doeltekst_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bestemmingTitel, bezigTitel, doelTitel, reisModus, reisWerkwoord, REIS_WERKWOORD } from '../game/js/doeltekst.js';
import { VEHICLE_KINDS, vehicleKind } from '../game/js/hudlook.js';

const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };

t('elke vervoersmodus heeft een werkwoord (te voet, alle voertuigsoorten en het vliegtuig)', () => {
  for (const k of ['voet', ...VEHICLE_KINDS, 'plane']) assert.ok(REIS_WERKWOORD[k], k);
});
t('te voet Ga naar, auto Rij naar, boot Vaar naar, heli en vliegtuig Vlieg naar', () => {
  assert.equal(bestemmingTitel('Haven Delfzijl', 'voet'), 'Ga naar: Haven Delfzijl');
  assert.equal(bestemmingTitel('Haven Delfzijl', 'car'), 'Rij naar: Haven Delfzijl');
  assert.equal(bestemmingTitel('Haven Delfzijl', 'boat'), 'Vaar naar: Haven Delfzijl');
  assert.equal(bestemmingTitel('Haven Delfzijl', 'heli'), 'Vlieg naar: Haven Delfzijl');
  assert.equal(bestemmingTitel('Eelde', 'plane'), 'Vlieg naar: Eelde');
  assert.equal(bestemmingTitel('Hoofdstation', 'bike'), 'Fiets naar: Hoofdstation');
});
t('een onbekende modus valt terug op Ga naar; zonder naam niets', () => {
  assert.equal(reisWerkwoord('onzin'), 'Ga naar');
  assert.equal(bestemmingTitel('', 'car'), '');
  assert.equal(bestemmingTitel(null), '');
});
t('een naam met eigen werkwoord of voorvoegsel krijgt er geen tweede bij', () => {
  for (const x of ['Ga naar het museum', 'Eerst: koop een fiets', 'Eerst naar de auto, dan: Het Podium', 'Onderduiken: de schuur', 'Rij naar de pomp', 'Bezig: iets']) {
    assert.equal(bestemmingTitel(x, 'car'), x);
    assert.equal(bezigTitel(x), x);
  }
});
t('Bezig voor een lopende opdracht, niet voor een bestemming', () => {
  assert.equal(bezigTitel('Pakketten bezorgen'), 'Bezig: Pakketten bezorgen');
  assert.equal(bezigTitel(''), '');
  assert.equal(doelTitel('job', 'Pakketten bezorgen'), 'Bezig: Pakketten bezorgen');
  assert.equal(doelTitel('mission', 'Controlepunt 2/5'), 'Bezig: Controlepunt 2/5');
  assert.equal(doelTitel('goal', 'Haven Delfzijl', 'car'), 'Rij naar: Haven Delfzijl');
  assert.equal(doelTitel('story', 'Het Podium', 'voet'), 'Ga naar: Het Podium');
  assert.equal(doelTitel('police', 'Ontsnap aan de politie'), 'Ontsnap aan de politie');
});
t('reisModus volgt het voertuig', () => {
  assert.equal(reisModus(null, null), 'voet');
  assert.equal(reisModus({ isPlane: true }, 'car'), 'plane');
  assert.equal(reisModus({ isBoat: true }, vehicleKind({ isBoat: true })), 'boat');
  assert.equal(reisModus({}, 'train'), 'train');
});
t('hud_panel gebruikt de generator voor alle doelsoorten en kent geen kale "Doel: "-titel meer', () => {
  const src = lees('game/js/hud_panel.js');
  for (const s of ["doelTitel('job'", "doelTitel('mission'", "doelTitel('goal'", "doelTitel('story'"]) assert.ok(src.includes(s), s);
  assert.ok(!/title: `Doel: \$\{goal\.name\}`/.test(src));
  assert.ok(/o\.raw \?\? o\.title/.test(src), 'sleutel op de bestemming, niet op het werkwoord');
});

console.log(`doeltekst_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
