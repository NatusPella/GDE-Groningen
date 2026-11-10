// Disc golf extensions (minigames batch 3): pure rules on top of discgolfrules.js,
// no DOM, no THREE; node-tested in scripts/minigames3_test.mjs.
//   - de achterkant: the nine holes of the Stadspark course played backwards
//     (basket becomes tee), and the volle ronde of all eighteen in a row;
//   - dichtbij (closest to the basket): three throws at one hole, the nearest
//     disc counts, with a bonus for landing inside the circle.
import { medalFrom } from './minigamekit.js';
import { parFor, CIRCLE_M } from './discgolfrules.js';

export const MEDAL_REL_18 = [12, 2, -4];
import { scaleTargetSignedRound } from './difficulty.js'; // #800
export const medalRel18For = (mode = 'standaard') => MEDAL_REL_18.map((v) => scaleTargetSignedRound(v, mode, true));

// holes as given by courseHoles(); returns the back nine as holes 10..18
export function reverseHoles(holes) {
  return holes.map((h, i) => {
    const tee = h.basket, basket = h.tee;
    const len = Math.hypot(basket.x - tee.x, basket.y - tee.y);
    return { n: holes.length + i + 1, tee: { ...tee }, basket: { ...basket }, len, par: parFor(len), heading: Math.atan2(basket.y - tee.y, basket.x - tee.x) };
  });
}

// forward nine, then the back nine from the last hole to the first
export function fullRound(holes) {
  const back = reverseHoles(holes).reverse().map((h, i) => ({ ...h, n: holes.length + i + 1 }));
  return [...holes, ...back];
}

export const roundMedal = (rel, holes, mode = 'standaard') => {
  const t = holes >= 18 ? medalRel18For(mode) : [6, 1, -2].map((v) => scaleTargetSignedRound(v, mode, true));
  return medalFrom(rel, t, true);
};

export const CTP = { throws: 3, maxPoints: 100, bonusInside: 25, falloff: 40 };
export const CTP_MEDAL_AT = [90, 150, 210];
import { scaleTarget } from './difficulty.js'; // #800
export const ctpMedalAt = (mode = 'standaard') => CTP_MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false)));

// Points for one throw that ended `dist` metres from the basket (null when it
// landed in the water or out of play).
export function ctpPoints(dist) {
  if (dist == null || !Number.isFinite(dist)) return 0;
  const base = Math.max(0, CTP.maxPoints * (1 - dist / CTP.falloff));
  return Math.round(base + (dist <= CIRCLE_M ? CTP.bonusInside : 0));
}

// The round: the best of the throws counts fully, the others half.
export function ctpRound(dists, mode = 'standaard') {
  const pts = dists.slice(0, CTP.throws).map(ctpPoints).sort((a, b) => b - a);
  const total = pts.reduce((a, p, i) => a + (i === 0 ? p : Math.round(p / 2)), 0);
  return { points: total, best: Math.min(...dists.filter(Number.isFinite), Infinity), medal: medalFrom(total, ctpMedalAt(mode)) };
}
