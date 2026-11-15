// #939: hooibalen zijn geen decor maar obstakels. Ze lagen in de wereld als
// plaatjes zonder botsing: je reed er dwars doorheen. Deze ene regel geeft een
// baal dezelfde voetafdruk in de velden (countryside.js, per tegel) en op de
// erven (countryplan.js, als rond vast prop), zodat auto en voetganger er
// tegenaan lopen. Een baal is 1,4 m hoog en 1,7 m in doorsnee (Sx/Sz van het
// model); de botsingsstraal is iets ruimer zodat je niet in de rol klipt.
// Puur, geen THREE (scripts/hooibaal_test.mjs).

export const BALE_HEIGHT = 1.5;
export const BALE_RADIUS = 0.95;

// De schaal van een baal (Sx, Sz van het model) naar de botsingsstraal.
export function baleRadius(sx = 1, sz = 1) {
  const s = Math.max(0.6, Math.min(1.3, Math.max(Number(sx) || 1, Number(sz) || 1)));
  return BALE_RADIUS * s;
}

// Een rond vast prop in het formaat van countrywalls.js: [x, y, x, y, hoogte, straal].
export function baleSolid(x, y, sx = 1, sz = 1) {
  return [x, y, x, y, BALE_HEIGHT, baleRadius(sx, sz)];
}
