// QoL (#985): de categorie Upgrades in Spullen toont "3 van 8" (en dus een balk) in plaats van een kaal aantal.
//   node scripts/spullen_upgrades_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';

const { upgradeTotaal } = await import('../game/js/spullen.js');
const { CAR_UPGRADES, upgradeListForStock } = await import('../game/js/shops.js');
const { VEHICLE_STOCK } = await import('../game/js/shopdata.js');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

t('zonder voertuigen telt alleen de Escapade en de snackwagen mee', () => {
  assert.equal(upgradeTotaal({ vehicles: [] }, []), CAR_UPGRADES.length);
  assert.equal(upgradeTotaal({ vehicles: [] }, [{}, {}, {}]), CAR_UPGRADES.length + 3);
  assert.equal(upgradeTotaal(null, []), CAR_UPGRADES.length);
});

t('elk gekocht voertuig voegt zijn eigen lijst toe, een onbekend voertuig niets', () => {
  const fiets = Object.keys(VEHICLE_STOCK).find((k) => VEHICLE_STOCK[k].kind === 'bike');
  const auto = Object.keys(VEHICLE_STOCK).find((k) => VEHICLE_STOCK[k].kind === 'car');
  const totaal = upgradeTotaal({ vehicles: [{ key: fiets }, { key: auto }, { key: 'bestaatniet' }] }, []);
  assert.equal(totaal, CAR_UPGRADES.length + upgradeListForStock(VEHICLE_STOCK[fiets]).length + upgradeListForStock(VEHICLE_STOCK[auto]).length);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
