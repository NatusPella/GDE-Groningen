// #640/ADR 0027: de meetbare taalkeuze. Draait in de lichte fase.
//   node scripts/naamtaal_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nederlandseNaam, coopNaam, fautenVoor } from './naamtaal_check.mjs';

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

// De poort van de review van 22-11: achtervoegsel coop, de Nederlandse stammen sinds v0.64.0, scripts/ en de allowlist.
t('coop als achtervoegsel of midden in de naam wordt herkend', () => {
  for (const s of ['bezitcoop.js', 'interior_coop_test.mjs', 'coop_coverage_audit.mjs', 'coopwedstrijd_voetbal_test.mjs', 'nieuwcoopje.js']) assert.equal(coopNaam(s), true, s);
  for (const s of ['multiplayer.js', 'bezit_multiplayer_test.mjs']) assert.equal(coopNaam(s), false, s);
});

t('de Nederlandse modules sinds v0.64.0 worden herkend', () => {
  for (const s of ['bezitcoop.js', 'voetbalsamen.js', 'samenposten.js', 'kapperkeuze.js', 'jellebaas.js', 'busmelding.js', 'busbron.js', 'navpijl.js', 'spullenraster.js', 'uitlegiconen.js']) assert.equal(nederlandseNaam(s), true, s);
  for (const f of ['leesBody', 'meldSleutel', 'varintGroot', 'kiesFetch', 'wis']) assert.equal(nederlandseNaam(f), true, f);
  for (const s of ['a11ylogic.js', 'listnav.js', 'keycap.js', 'handheldOffset', 'trapTabInCard']) assert.equal(nederlandseNaam(s), false, s);
});

t('een NIEUW bestand met een coop-naam of Nederlandse naam faalt, ook in scripts/', () => {
  assert.ok(fautenVoor('game/js/nieuwecoop.js', '').length >= 1);
  assert.ok(fautenVoor('game/js/bezitcoopje.js', '').length >= 1);
  assert.ok(fautenVoor('game/js/fine.js', 'const leesBody = 1;').some((f) => f.includes('leesBody')));
  assert.ok(fautenVoor('scripts/nieuw_coop_test.mjs').length === 1);
  assert.ok(fautenVoor('scripts/coop_coverage_audit.mjs').length === 1);
  assert.deepEqual(fautenVoor('scripts/dekking_test.mjs'), [], 'scripts mogen een Nederlandse naam houden');
  assert.deepEqual(fautenVoor('game/js/modules.js', 'const trapTabInCard = 1; function nearest() {}'), []);
});

t('de bestaande overtreders staan vast in de baseline-allowlist (geen massale hernoeming)', () => {
  const b = JSON.parse(fs.readFileSync(new URL('./naamtaal_baseline.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(b.uitzonderingen) && b.uitzonderingen.length >= 100, 'allowlist met de bestaande overtreders');
  for (const f of ['game/js/bezitcoop.js', 'game/js/voetbalsamen.js', 'scripts/bezitcoop_test.mjs', 'scripts/coop_coverage_audit.mjs']) assert.ok(b.uitzonderingen.includes(f), f);
  assert.ok(!b.uitzonderingen.includes('game/js/world.js'), 'schone bestanden horen er niet in');
  // alle uitzonderingen zijn echte overtreders van de huidige regels (de lijst mag alleen kleiner worden)
  for (const f of b.uitzonderingen) if (fs.existsSync(new URL('../' + f, import.meta.url))) {
    const src = f.startsWith('game/js/') ? fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8') : '';
    assert.ok(fautenVoor(f, src).length > 0, `${f} is geen overtreder meer: haal hem uit de allowlist`);
  }
});

console.log(`naamtaal_test: ${n}/${n} ok`);
