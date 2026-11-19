// QoL (#985): een eigen voertuig kun je verkopen of slopen, en dure afleveringen vragen een tweede druk.
//   node scripts/vehicle_verkoop_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';

const { applyShopSave, getOwnedEntries, getShopSave } = await import('../game/js/shops.js');
const { VEHICLE_STOCK } = await import('../game/js/shopdata.js');
const { getGarageList, verkoopVoertuig, verkoopWaarde, actieBevestiging, eigenRandMarkers } = await import('../game/js/ownedvehicles.js');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

const kopen = Object.entries(VEHICLE_STOCK).filter(([, sp]) => sp.price > 0 && !sp.unlock && sp.kind === 'car');
const [sleutel, spec] = kopen[0];
const wereld = (money = 0, extra = {}) => ({
  map: { spawnZ: () => 0 }, vehicles: [], time: 0, money, wanted: 0, msgs: [], addMessage(t) { this.msgs.push(t); },
  player: { x: 0, y: 0, angle: 0, inVehicle: null }, ...extra,
});
const zet = (w, vehicles) => applyShopSave(w, { vehicles });

t('de opbrengst: heel tussen 35% en 60%, een wrak 5%, altijd onder de aankoopprijs', () => {
  assert.equal(verkoopWaarde(1000, 100, false), 600);
  assert.equal(verkoopWaarde(1000, 0, false), 350);
  assert.equal(verkoopWaarde(1000, 50, false), 475);
  assert.equal(verkoopWaarde(1000, 100, true), 50);
  assert.equal(verkoopWaarde(38000, 100, true), 1900);
  assert.equal(verkoopWaarde(0, 100, false), 0);
  assert.ok(verkoopWaarde(spec.price, 100, false) < spec.price);
});

t('een gekocht voertuig staat in de garage met een verkoopknop en een opbrengst', () => {
  const w = wereld();
  zet(w, [{ key: sleutel, garage: true }]);
  const e = getGarageList(w).find((x) => x.id === sleutel);
  assert.equal(e.canSell, true);
  assert.equal(e.sellValue, verkoopWaarde(spec.price, 100, false));
  assert.match(e.sellLabel, /^Verkopen · \+€/);
  assert.equal(getGarageList(w).find((x) => x.id === 'hero').canSell, false, 'de Escapade blijft');
});

t('verkopen: geld erbij, voertuig weg uit de collectie en de garagelijst', () => {
  const w = wereld(100);
  zet(w, [{ key: sleutel, garage: true }]);
  const res = verkoopVoertuig(w, sleutel);
  assert.equal(res.ok, true);
  assert.equal(w.money, 100 + verkoopWaarde(spec.price, 100, false));
  assert.equal(getOwnedEntries().some((o) => o.key === sleutel), false);
  assert.equal(getGarageList(w).some((x) => x.id === sleutel), false);
  assert.equal(JSON.stringify(getShopSave().vehicles).includes(`"${sleutel}"`), false, 'ook uit de save');
  assert.match(w.msgs.at(-1), /verkocht voor €/);
  assert.equal(verkoopVoertuig(w, sleutel).ok, false, 'twee keer kan niet');
  assert.equal(w.money, 100 + verkoopWaarde(spec.price, 100, false));
});

t('een afgeschreven voertuig slopen levert sloopwaarde en zegt slopen', () => {
  const w = wereld();
  zet(w, [{ key: sleutel, lost: true }]);
  const e = getGarageList(w).find((x) => x.id === sleutel);
  assert.match(e.sellLabel, /^Slopen/);
  const res = verkoopVoertuig(w, sleutel);
  assert.equal(res.ok, true);
  assert.equal(w.money, verkoopWaarde(spec.price, 100, true));
  assert.match(w.msgs.at(-1), /gesloopt voor/);
});

t('de Escapade, een gast in een sessie en een bestuurder kunnen niet verkopen', () => {
  const w = wereld();
  zet(w, [{ key: sleutel, garage: true }]);
  assert.equal(verkoopVoertuig(w, 'hero').ok, false);
  assert.equal(verkoopVoertuig({ ...w, coopRole: 'client' }, sleutel).ok, false);
  assert.equal(getOwnedEntries().some((o) => o.key === sleutel), true);
  assert.equal(verkoopVoertuig(w, 'bestaatniet').ok, false);
});

t('bijzondere (vrijgespeelde) voertuigen zijn niet te verkopen', () => {
  const uitzondering = Object.entries(VEHICLE_STOCK).find(([, sp]) => sp.unlock);
  if (!uitzondering) return;
  const w = wereld();
  zet(w, [{ key: uitzondering[0], garage: true }]);
  const e = getGarageList(w).find((x) => x.id === uitzondering[0]);
  assert.equal(e ? e.canSell : false, false);
});

t('bevestiging: verkopen altijd, afleveren pas boven de 100 euro, met duizendscheiding', () => {
  const w = wereld();
  zet(w, [{ key: sleutel, garage: true }]);
  const e = getGarageList(w).find((x) => x.id === sleutel);
  assert.match(actieBevestiging(e, 'verkoop'), /Druk nog een keer/);
  assert.equal(actieBevestiging({ ...e, fee: 10 }, 'aflever'), '');
  assert.match(actieBevestiging({ ...e, fee: 5700 }, 'aflever'), /kost €5\.700\. Druk nog een keer/);
  assert.equal(actieBevestiging({ ...e, owned: false }, 'verkoop'), '');
});

t('minimap: een eigen voertuig buiten beeld krijgt een randpijl, de Escapade en het dichtstbijzijnde andere', () => {
  const buiten = (x) => Math.abs(x) > 150;
  const owned = [
    { x: 400, y: 0, hero: false, kind: 'car' }, { x: -900, y: 0, hero: false, kind: 'car' },
    { x: 50, y: 0, hero: false, kind: 'bike' }, { x: 3000, y: 0, hero: true, kind: 'car' },
  ];
  const uit = eigenRandMarkers(owned, 0, 0, (x, y) => buiten(x));
  assert.deepEqual(uit.map((o) => o.x), [3000, 400], 'hero eerst, dan de dichtstbijzijnde buiten beeld; de fiets op 50 m staat gewoon op de minimap');
  assert.deepEqual(eigenRandMarkers([{ x: 10, y: 0, hero: false }], 0, 0, (x) => buiten(x)), []);
  assert.deepEqual(eigenRandMarkers(null, 0, 0, () => true), []);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
