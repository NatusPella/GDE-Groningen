// QoL (#985): dure aankopen vragen een tweede druk en bedragen hebben overal duizendscheiding.
//   node scripts/tweedruk_test.mjs
import assert from 'node:assert/strict';
import { koopVraag, tweedeDruk, TWEEDE_DRUK_MS } from '../game/js/tweedruk.js';
import { euro } from '../game/js/geldtekst.js';
import { buyLabel, brokeMessage } from '../game/js/shoplist.js';
import * as B from '../game/js/boerderij.js';
import * as PC from '../game/js/percelen.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

t('euro zet de duizendscheiding op zijn nl-NL', () => {
  assert.equal(euro(25000), '€25.000');
  assert.equal(euro(999), '€999');
  assert.equal(euro(1234567.4), '€1.234.567');
  assert.equal(euro(undefined), '€0');
});

t('de vraag begint bij €1.000 en noemt naam en bedrag', () => {
  assert.equal(koopVraag('Trekker', 999), '');
  assert.match(koopVraag('Korenwolf M3', 38000), /^Korenwolf M3 kopen voor €38\.000\? Druk nog een keer/);
  assert.equal(koopVraag('Gratis', 0), '');
});

t('twee drukken: eerst wapenen, dan uitvoeren; te laat of een ander ding wapent opnieuw', () => {
  const vraag = koopVraag('Akker', 15000);
  const a = tweedeDruk(null, 'akker', vraag, 1000);
  assert.equal(a.uitvoeren, false);
  const b = tweedeDruk(a.armed, 'akker', vraag, 1000 + 500);
  assert.equal(b.uitvoeren, true);
  assert.equal(b.armed, null);
  assert.equal(tweedeDruk(a.armed, 'akker', vraag, 1000 + TWEEDE_DRUK_MS + 1).uitvoeren, false, 'te laat');
  assert.equal(tweedeDruk(a.armed, 'ander', vraag, 1500).uitvoeren, false, 'een ander ding');
  assert.equal(tweedeDruk(null, 'goedkoop', '', 0).uitvoeren, true, 'zonder vraag meteen');
});

t('de boerderijmeldingen met een groot bedrag hebben duizendscheiding', () => {
  const r = B.leen({ boek: { lening: { schuld: 0, opgenomen: 0 } } }, 999999);
  assert.equal(r.ok, false);
  assert.match(r.reden, /Je kunt nog €\d{1,3}(\.\d{3})+ lenen/);
  assert.ok(PC.MACHINE_CATALOGUS.maaidorser.koop >= 1000);
});

t('de winkelknop en de te-weinig-geldmelding tonen grote bedragen met duizendscheiding', () => {
  const it = { price: 12500, label: 'Sportwagen' };
  assert.equal(buyLabel(it, 'auto'), 'Kopen voor €12.500');
  assert.equal(buyLabel(it, 'auto', true), 'Zeker? Nog eens: €12.500');
  assert.equal(buyLabel({ income: 1500 }, 'auto'), 'Verkopen voor €1.500');
  assert.match(brokeMessage(it, 100), /je mist nog €12\.400/);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
