// QoL (#985): de zoekbalk volgt de krimpende cirkel en de afkoeltijd van het niveau, niet een vaste 24 seconden.
//   node scripts/zoekbalk_test.mjs
import assert from 'node:assert/strict';
import { levelOf, stepUnseen, zoekBalkVulling } from '../game/js/wantedlevels.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

t('de balk is leeg bij het begin en vol als je buiten de cirkel bent en de ster bijna afgaat', () => {
  assert.equal(zoekBalkVulling(0, 70, 0, 10), 0);
  assert.equal(zoekBalkVulling(500, 70, 10, 10), 1);
  assert.equal(zoekBalkVulling(35, 70, 0, 10), 0.25);
  assert.equal(zoekBalkVulling(0, 70, 5, 10), 0.25);
});

t('de tijdhelft gebruikt de afkoeltijd van het niveau: elk niveau haalt vol bij zijn eigen cooldown', () => {
  for (let s = 1; s <= 5; s++) {
    const l = levelOf(s);
    assert.equal(zoekBalkVulling(0, l.searchRadius, l.cooldown, l.cooldown), 0.5, `${s} ster`);
    assert.ok(zoekBalkVulling(0, l.searchRadius, l.cooldown / 2, l.cooldown) < zoekBalkVulling(0, l.searchRadius, l.cooldown, l.cooldown));
  }
});

t('de cirkel krimpt echt terwijl je uit het zicht bent, en de balk groeit mee (ook zonder dat je beweegt)', () => {
  const pol = { unseenFor: 0, searching: false, seenRecently: false, lastSeen: { x: 0, y: 0 }, searchCenter: null, searchRadius: 0 };
  const w = { wanted: 1, wantedDecayTimer: 0 };
  const lvl = levelOf(1);
  for (let i = 0; i < 6 * 10; i++) stepUnseen(pol, w, 0.1, 40, 0); // eerst loseAfter, daarna zoeken
  const r1 = pol.searchRadius, b1 = zoekBalkVulling(40, pol.searchRadius, w.wantedDecayTimer, lvl.cooldown);
  for (let i = 0; i < 3 * 10; i++) stepUnseen(pol, w, 0.1, 40, 0);
  assert.ok(pol.searchRadius < r1, 'de cirkel is kleiner geworden');
  assert.ok(zoekBalkVulling(40, pol.searchRadius, w.wantedDecayTimer, lvl.cooldown) > b1, 'de balk groeit');
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
