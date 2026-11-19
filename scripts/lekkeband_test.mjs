// QoL (#985): een lekke band wordt uitgelegd (één keer, na de eerste waarschuwing) en de dichtstbijzijnde garage wordt aangewezen.
//   node scripts/lekkeband_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';

const G = await import('../game/js/garages.js');
let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

t('zonder lekke band, een boot of een heli wijst niets', () => {
  assert.equal(G.lekkeBandGarage(null, 0, 0), null);
  assert.equal(G.lekkeBandGarage({ flat: false }, 0, 0), null);
  assert.equal(G.lekkeBandGarage({ flat: true, isBoat: true }, 0, 0), null);
  assert.equal(G.lekkeBandGarage({ flat: true, isHeli: true }, 0, 0), null);
});

t('de uitleg noemt wat de band doet en de garage; een fiets heeft zijn eigen zin', () => {
  const auto = G.lekkeBandUitleg({ flat: true }, { name: 'Garage Knalpot' });
  assert.match(auto, /trager en trekt scheef/);
  assert.match(auto, /gloeiende garage op je minimap: Garage Knalpot/);
  assert.match(G.lekkeBandUitleg({ flat: true, isBike: true }, null), /fiets rijdt zwaar/);
  assert.match(G.lekkeBandUitleg({ flat: true }, null), /Zoek een garage/);
});

t('de uitleg komt één keer, na de wachttijd, en begint opnieuw na een reparatie', () => {
  const v = { flat: true };
  assert.equal(G.lekkeBandStap(v, 100, 0, 0), '', 'de eerste waarschuwing doet het voertuig zelf');
  assert.equal(G.lekkeBandStap(v, 100 + G.LEKKE_BAND_UITLEG_NA_S - 1, 0, 0), '');
  assert.match(G.lekkeBandStap(v, 100 + G.LEKKE_BAND_UITLEG_NA_S + 0.1, 0, 0), /Lekke band/);
  assert.equal(G.lekkeBandStap(v, 200, 0, 0), '', 'niet nog een keer');
  v.flat = false;
  assert.equal(G.lekkeBandStap(v, 210, 0, 0), '');
  v.flat = true;
  assert.equal(G.lekkeBandStap(v, 300, 0, 0), '');
  assert.match(G.lekkeBandStap(v, 305, 0, 0), /Lekke band/, 'een nieuwe lekke band wordt weer uitgelegd');
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
