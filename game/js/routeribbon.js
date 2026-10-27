// De route-ribbon (scene3d.js): de gele chevronstrook die de volgende 80 m van de route op de weg
// legt. Twee vragen horen hier, los van THREE zodat ze te testen zijn:
//
//  - hoe ver ligt een punt van de verharding af (rijbaan of stoep)? En
//  - hoe hard moet de strook daar nog zichtbaar zijn?
//
// Aanleiding (#502 punt 4): de strook volgde de routepunten zonder meer, dus over een gazon of akker
// liep de gele verf gewoon door tot tegen een gevel. Wat een speler daar ziet is geen wegmarkering
// maar de routelijn; die hoort bij de verharding te stoppen.
import { SIDEWALK_EXTRA } from './roadsurface.js';

// 0 = op de verharding, daarboven = meters ervan af.
export function routeOffRoad(map, x, y) {
  if (!map || !map.roadsNear) return 0;
  let best = Infinity;
  for (const r of map.roadsNear(x, y, 10)) {
    if (!r.pts || r.pts.length < 2) continue;
    const hw = (r.width || 6) / 2;
    // een stoep hoort bij de straat; een voet- of fietspad is zelf de verharding
    const paved = r.cat === 'foot' || r.cat === 'cycle' ? hw : hw + SIDEWALK_EXTRA;
    for (let k = 0; k < r.pts.length - 1; k++) {
      const ax = r.pts[k][0], ay = r.pts[k][1];
      const ex = r.pts[k + 1][0] - ax, ey = r.pts[k + 1][1] - ay;
      const l2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
      const d = Math.hypot(x - ax - ex * t, y - ay - ey * t);
      if (d - paved < best) best = d - paved;
    }
  }
  return Number.isFinite(best) ? Math.max(0, best) : 99;
}

// Volledig zichtbaar tot 2,5 m van de verharding, weg vanaf 5 m. Daartussen lineair.
export const RIBBON_FADE_FROM = 2.5;
export const RIBBON_FADE_TO = 5;

export function ribbonFade(offRoad) {
  if (!(offRoad > RIBBON_FADE_FROM)) return 1;
  if (offRoad >= RIBBON_FADE_TO) return 0;
  return 1 - (offRoad - RIBBON_FADE_FROM) / (RIBBON_FADE_TO - RIBBON_FADE_FROM);
}

// De alpha van een punt op de strook: aan beide uiteinden uitfaden, en uitdoven zodra de route de
// verharding verlaat.
export function ribbonAlpha(dist, total, offRoad = 0) {
  const ends = Math.min(1, dist / 3, (total - dist) / 15 + 0.05);
  return Math.max(0, Math.min(1, ends)) * ribbonFade(offRoad);
}
