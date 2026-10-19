// Berovingen in een paar wijken, 's avonds en 's nachts (owner's decision of 15
// oktober): the wallet is snatched, you lose a share of your money, nobody is
// hit and nothing violent is shown; run after the thief to get it back. A few
// wijken get a warning on the map after dark. Pure rules (no DOM, no THREE);
// scripts/muggings_test.mjs tests them.
//
// The risky places are chosen for what they are at night, not for who lives
// there: the crowds at the station and in the nightlife streets (pickpockets)
// and the empty business parks (nobody around).

import { nightAtHour } from './sunrules.js';

export const RISKY = {
  Stationsgebied: { tier: 2, why: 'veel drukte rond het station' },
  Binnenstad: { tier: 2, why: 'uitgaansdrukte in de binnenstad' },
  'Binnenstad-Oost': { tier: 2, why: 'uitgaansdrukte in de binnenstad' },
  'A-kwartier': { tier: 2, why: 'uitgaansdrukte in het A-kwartier' },
  Bisschopskwartier: { tier: 1, why: 'smalle straatjes zonder veel mensen' },
  'Martini Trade Park': { tier: 1, why: 'verlaten bedrijventerrein' },
  Eemskanaal: { tier: 1, why: 'verlaten bedrijventerrein' },
  Peizerweg: { tier: 1, why: 'verlaten bedrijventerrein' },
  Hoendiep: { tier: 1, why: 'verlaten bedrijventerrein' },
  Suikerfabriekterrein: { tier: 1, why: 'verlaten terrein' },
  'Kop van Oost': { tier: 1, why: 'verlaten bedrijventerrein' },
  Metalenkwartier: { tier: 1, why: 'verlaten bedrijventerrein' },
};

export const MUG = {
  minMoney: 25,
  share: 0.2,
  min: 10,
  max: 400,
  cooldown: 420,
  firstGrace: 90,
  hazardPerS: 1 / 190,
  approachSpeed: 3.4,
  fleeSpeed: 6.0,
  snatchReach: 1.3,
  catchReach: 1.8,
  catchGrace: 1.2,
  giveUpAfter: 30,
  giveUpDist: 75,
  spawnDist: [10, 15],
  approachMax: 7,
  warnFrom: 0.35,
};

// 0..1: how dark it is, by the sun of today's date (sunrules.js): quiet streets from dusk, deepest at night.
export const nightFactor = (hour) => nightAtHour(hour);


// 0..1 for a wijk name at an hour.
export function riskLevel(wijk, hour) {
  const r = RISKY[wijk];
  if (!r) return 0;
  return (r.tier / 2) * nightFactor(hour);
}

export const warnsOn = (wijk, hour) => riskLevel(wijk, hour) >= MUG.warnFrom;
export const riskWhy = (wijk) => (RISKY[wijk] ? RISKY[wijk].why : '');

// The chance per second, only on foot in a risky wijk at night.
export function hazard(level) {
  return Math.max(0, level) * MUG.hazardPerS;
}

// May a mugging start now? `s` = { onFoot, busy (mission, job, minigame, cinematic, call), wanted, since (s since the last one), time, money }
export function mayMug(s) {
  if (!s || !s.onFoot || s.busy || s.dead || s.wanted > 0) return false;
  if (!(s.money >= MUG.minMoney)) return false;
  if (s.since < MUG.cooldown) return false;
  if (s.time < MUG.firstGrace) return false;
  return true;
}

// The share that is taken, in steps of five and never more than you have.
export function stolenAmount(money) {
  if (!(money >= MUG.minMoney)) return 0;
  const raw = Math.round((money * MUG.share) / 5) * 5;
  return Math.min(Math.floor(money), Math.max(MUG.min, Math.min(MUG.max, raw)));
}

// Caught: within reach, but not in the first moments (the thief has a head start).
export const caught = (d, t = Infinity) => t >= MUG.catchGrace && d <= MUG.catchReach;
export const escaped = (d, t) => d >= MUG.giveUpDist || t >= MUG.giveUpAfter;

export const MUG_TEXT = {
  warnTitle: (wijk) => `Let op in ${wijk}`,
  warnBody: (why) => `'s Nachts: ${why}. Draag niet te veel geld bij je en blijf in drukke straten.`,
  tip: 'Je merkt iets bij je zak',
  snatch: (lost) => `Iemand botst tegen je op en is met je portemonnee weg: €${lost} kwijt. Ren hem achterna!`,
  back: (lost) => `Gepakt! Hij liet de portemonnee vallen: €${lost} terug.`,
  gone: (lost) => `Hij is ontsnapt. Die €${lost} ben je kwijt. Volgende keer minder bij je dragen.`,
  thiefBark: ['Sorry, sorry!', 'Niks aan de hand!', 'Dat was een vergissing!'],
};
