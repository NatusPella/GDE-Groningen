// #955: de vluchtdienst en de vaardienst (activities.js) laten je vanaf de grond instappen in een vrij voertuig, maar nooit in dat
// van een missie. Roelfiens vliegtuig in M15 staat ook op een veld: de dienst zei 'Niet nu: maak eerst je missie af' en at de E
// op waarmee de missie het vliegtuig laat instappen, zodat de eerste stap van M15 niet af te maken was.
//   node scripts/dienstvoertuig_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { dienstVoertuigVrij } = await import('../game/js/activitykit.js');
const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message).split('\n')[0]); process.exitCode = 1; } };

t('een vrij voertuig mag (de Kist op het veld, een boot aan de steiger)', () => {
  assert.equal(dienstVoertuigVrij({ isPlane: true, driver: null }), true);
  assert.equal(dienstVoertuigVrij({ isBoat: true }), true);
});
t('een voertuig van een missie, met bestuurder, wrak of zinkend mag niet', () => {
  assert.equal(dienstVoertuigVrij({ isPlane: true, missionCar: true, driver: null }), false, 'Roelfiens vliegtuig (M15)');
  assert.equal(dienstVoertuigVrij({ driver: 'player' }), false);
  assert.equal(dienstVoertuigVrij({ wrecked: true }), false);
  assert.equal(dienstVoertuigVrij({ sinking: {} }), false);
  assert.equal(dienstVoertuigVrij(null), false);
});
t('activities.js zoekt het dienstvoertuig met dezelfde regel', () => {
  const a = bron('activities.js');
  assert.match(a, /if \(!cfg\.inVoertuig\(v\) \|\| !dienstVoertuigVrij\(v\)\) continue;/);
  assert.doesNotMatch(a, /v\.driver \|\| v\.wrecked \|\| v\.sinking\) continue/);
});
console.log(`dienstvoertuig_test: ${n} checks`);
process.exit(process.exitCode || 0);
