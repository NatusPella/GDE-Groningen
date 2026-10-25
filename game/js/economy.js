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

export const SPEED_FINE = [10, 25];
export const SIDEJOB_ACCIDENT_FINE = 10;

// Side jobs: base pay times this, plus LEVEL_BONUS per level above 1.
export const SIDEJOB_PAY_MULT = 1.5;
export const SIDEJOB_LEVEL_BONUS = 0.15;

// Post-game: challenge prize per medal, and the Fjord Frituur shift bonus
// on top of the takings.
export const PG_PRIZE = [0, 200, 400, 700];
export const FJORD_SHIFT_BONUS = [0, 120, 250, 450];

// After the story the Fjord Frituur earns a daily wage (paid at FJORD_DAY_HOUR).
export const FJORD_DAY_PAY = 250;
export const FJORD_DAY_HOUR = 7;

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
