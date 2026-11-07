// #640/ADR 0027: de meetbare taalkeuze. Draait in de lichte fase.
//   node scripts/naamtaal_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nederlandseNaam, coopNaam } from './naamtaal_check.mjs';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('Nederlandse namen en identifiers worden herkend', () => {
  for (const s of ['boerderijgast', 'sessiekeuze', 'treincontrole', 'ringbaan', 'gewasmarkt', 'maakRace']) assert.equal(nederlandseNaam(s), true, s);
  for (const s of ['spawnVehicle', 'nearestFacility', 'hud_panel', 'cutscenehost']) assert.equal(nederlandseNaam(s), false, s);
});

t('coop-namen zijn herkenbaar; nieuwe code gebruikt multiplayer', () => {
  for (const s of ['coopdeel', 'coopsolo', 'cooptrein', 'coopwedstrijdbaan']) assert.equal(coopNaam(s), true, s);
  for (const s of ['multiplayerhostwissel', 'partnerhud']) assert.equal(coopNaam(s), false, s);
});

t('de baseline bestaat en de check is stil op de bestaande code', () => {
  const b = JSON.parse(fs.readFileSync(new URL('./naamtaal_baseline.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(b.bestanden) && b.bestanden.length > 800, 'baseline met de bestaande modules');
  assert.ok(b.bestanden.includes('game/js/world.js') && b.bestanden.includes('game/js/coopscene.js'));
});

t('ADR 0027 vervangt 0017 en de uitzonderingen staan in de coding-standards', () => {
  const adr = fs.readFileSync(new URL('../.specs-fire/standards/adr/0027-code-taal-meetbaar.md', import.meta.url), 'utf8');
  assert.match(adr, /Status:\*\* besloten/);
  const old = fs.readFileSync(new URL('../.specs-fire/standards/adr/0017-code-in-het-engels.md', import.meta.url), 'utf8');
  assert.match(old, /vervangen door \[0027\]/);
  const coding = fs.readFileSync(new URL('../.specs-fire/standards/coding-standards.md', import.meta.url), 'utf8');
  assert.match(coding, /naamtaal_check/);
  assert.match(coding, /ARCHITECTURE\.md/);
});

console.log(`naamtaal_test: ${n}/${n} ok`);
