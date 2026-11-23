// De tuningwerkplaats pauzeert de wereld zolang hij open is (#1292, #1299 punt 7). phone.js refreshPause schreef
// world.uiPaused elk beeld opnieuw, zodat de pauze na één beeld verdween. Nu houdt world.pauseHolds hem vast.
// Bronregels: phone.js en tuningworkshopui.js laden niet in node (DOM, three).
//   node scripts/pauzehouders_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok    ' + naam); } catch (e) { fails++; console.log('FAIL  ' + naam + ' :: ' + e.message); } };

const phone = bron('phone.js'), tuning = bron('tuningworkshopui.js');
const refresh = phone.slice(phone.indexOf('function refreshPause()'), phone.indexOf('function refreshPause()') + 900);

t('refreshPause telt de pauzehouders mee', () => assert.match(refresh, /world\.uiPaused = [^\n]*world\.pauseHolds && world\.pauseHolds\.size/));
t('de werkplaats zet zijn houder bij openen', () => assert.match(tuning, /\(world\.pauseHolds \|\| \(world\.pauseHolds = new Set\(\)\)\)\.add\('tuning'\)/));
t('en haalt hem weg bij sluiten', () => {
  const sluit = tuning.slice(tuning.indexOf('function closeTuningWorkshop()'), tuning.indexOf('function closeTuningWorkshop()') + 600);
  assert.match(sluit, /world\.pauseHolds\.delete\('tuning'\)/);
});
t('de regel zelf: open werkplaats houdt de pauze over beelden heen, dicht niet meer', () => {
  // dezelfde uitdrukking als in refreshPause, met alle andere schermen dicht
  const regel = (world) => false || false || false || false || false || !!(world.pauseHolds && world.pauseHolds.size);
  const world = { pauseHolds: new Set(['tuning']) };
  for (let i = 0; i < 5; i++) world.uiPaused = regel(world);
  assert.equal(world.uiPaused, true);
  world.pauseHolds.delete('tuning');
  world.uiPaused = regel(world);
  assert.equal(world.uiPaused, false);
  assert.equal(regel({}), false, 'zonder houders geen pauze');
});

console.log(fails ? `pauzehouders_test: ${fails} van ${n} mislukt` : `pauzehouders_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
