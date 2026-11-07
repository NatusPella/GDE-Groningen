// Shared economy numbers and formulas (docs/verhaal/nieuw/00-OVERZICHT.md:
// money must never be the thing that stops the story). Shop and vehicle prices stay next to their stock in
// shops.js; this holds the costs of bad luck (repairs, wrecks, fines) and
// the income that is not a mission reward. No game imports: storytest.js
// reads it for the money checks.

// A fresh save: enough for the first hours (a first weapon, food, a repair), not a free pass.
export const START_MONEY = 500;

export const HERO_REPLACE_FEE = 50;

// Garage repair: damage 0-100, dents 0-3 (garages.js).
export function repairCost(dmg, dents, twoWheel) {
  if (twoWheel) return Math.max(3, Math.round(dmg * 0.2 + dents * 2));
  return Math.max(10, Math.round((dmg * 1.2 + dents * 10) / 5) * 5);
}

export function platesCost(wanted) {
  return 40 + wanted * 50;
}

// Busted: a fine per star, never more than a fifth of what you carry.
export function bustFine(wanted, money) {
  return Math.min(wanted * 60, Math.floor(Math.max(0, money) * 0.2));
}

// In a car the mission lent you (not your own, not the Escapade) the arrest is free: the
// getaway is the mission's, so no fine on top of the restart (#306).
export const isBorrowedMissionCar = (v) => !!v && !!v.missionCar && !v.playerOwned && !v.isHeroCar;
export function bustFineIn(wanted, money, vehicle) {
  return isBorrowedMissionCar(vehicle) ? 0 : bustFine(wanted, money);
}

// #492: één plek voor een gewone betaling buiten de prijstabellen (de Beleidswinkel): het saldo gaat
// er alleen af als het kan. Zo blijft economy.js de eigenaar van world.money.
export function betaal(world, bedrag) {
  const b = Math.max(0, Math.round(Number(bedrag) || 0));
  if (!world || b <= 0 || (world.money || 0) < b) return false;
  world.money -= b;
  return true;
}

export const SPEED_FINE = [10, 25];
export const SIDEJOB_ACCIDENT_FINE = 10;

// Side jobs: base pay times this, plus LEVEL_BONUS per level above 1.
export const SIDEJOB_PAY_MULT = 1.5;
export const SIDEJOB_LEVEL_BONUS = 0.15;

// Post-game: challenge prize per medal, and the Fjord Frituur shift bonus on top of the takings.
// #675: de revanche-uitdagingen betalen in verhouding tot de missies en Veroverd: goud is nu €1.500.
export const PG_PRIZE = [0, 500, 1000, 1500];
export const FJORD_SHIFT_BONUS = [0, 120, 250, 450];

// #675: geen gratis geldautomaat meer. De Fjord levert passief alleen iets op als de wagen openstaat,
// en de dagomzet groeit met de upgrades (pg_foodtruck.js fjordDagomzet). De oude vaste dagomzet blijft
// als ondergrens staan voor de eerste dag.
export const FJORD_DAY_PAY = 80;
export const FJORD_DAY_HOUR = 7;

// #674: de garagekorting van een meester in een vervoersvak komt via deze haak, zodat garages.js de
// loopbaan niet hoeft te importeren (de balanstest bewaakt dat geld uit reparaties niet via de loopbaan
// loopt). loopbaanlive.js zet de haak; zonder loopbaan is de korting 0.
let garageKortingFn = null;
export const zetGarageKorting = (fn) => { garageKortingFn = typeof fn === 'function' ? fn : null; };
export function garageKorting() {
  try {
    const v = garageKortingFn ? Number(garageKortingFn()) : 0;
    return Number.isFinite(v) && v > 0 && v < 1 ? v : 0;
  } catch (e) { return 0; }
}

// Hidden eierballen.
export const EIERBAL_FIND_PAY = 50;
export const EIERBAL_ALL_BONUS = 1000;

// Replays: a mission already passed pays a klusloon (a share of its reward),
// and each medal tier (brons, zilver, goud) pays a one-time bonus per
// playthrough the first time it is reached for that mission.
const KLUSLOON_SHARE = 0.5;
const MEDAL_BONUS_SHARE = [0, 0.15, 0.25, 0.4];

const round5 = (v) => Math.round(v / 5) * 5;

export function klusloon(reward) {
  return round5(reward * KLUSLOON_SHARE);
}

// Bonus for going from medal `from` to `to` (0 none .. 3 goud) on a mission.
export function medalBonus(reward, from, to) {
  let sum = 0;
  for (let m = from + 1; m <= to; m++) sum += round5(reward * (MEDAL_BONUS_SHARE[m] || 0));
  return sum;
}
