// #661: de geldregel werd elke frame opnieuw geformatteerd (toLocaleString) en de
// wapen-kind-elementen twee keer per frame opgezocht. Alleen formatteren als het
// afgeronde bedrag verandert; de rest is pure rekenregel, los te testen.
export function moneyLabel(rounded) {
  return '€ ' + rounded.toLocaleString('nl-NL');
}

export function moneyNeedsUpdate(rounded, last) {
  return rounded !== last;
}

export function weaponAmmoText(weapon, ammo, noCount) {
  if (weapon === 'fists') return 'geen wapen';
  if (ammo === undefined || noCount.has(weapon)) return 'slaan';
  if (ammo === 0) return 'leeg'; // een leeg wapen zegt het in woorden, niet met een 0 die je mist
  return ammo === Infinity ? '∞' : String(ammo);
}
