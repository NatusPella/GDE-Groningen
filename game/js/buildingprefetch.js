// Voorladen van gebouwmeshes langs de verwachte route (#1016). Puur: geen three.js, zodat
// scripts/popinrules_test.mjs de regels zonder browser keurt.
//
// scene3d.js bouwt de meshes (en start hun shadercompilatie) van gebouwen vlak buiten de detailring alvast, zodat een
// gebouw dat de ring binnenkomt al klaar is. De marge was vast 30 m: bij 30 m/s is dat één seconde, korter dan een
// compilatie van een nog niet geziene gevelstijl (BUILDING_LINK_WAIT_MS, 2 s). Zo'n mesh hield de detailring klein
// (gemeten: in de Binnenstad 10 tot 23% van de frames onder 90% van de straal, kleinste straal 18 m; ramen en gevels
// zijn dan nog het kale verre LOD). Met snelheid groeit de marge VOOR de speler uit (alleen in de rijrichting).
import { streamRank } from './streambudget.js';

export const PREFETCH_EXTRA_MAX = 90; // m extra marge vooruit
export const PREFETCH_EXTRA_FROM = 8; // m/s: vanaf deze snelheid begint de extra marge (lead = snelheid x 3 s)

// De extra marge in meters voor een lead (m, uit advanceStreamAhead): 0 bij stilstand, de lead zelf tot het plafond.
export function prefetchExtra(lead) {
  return lead > PREFETCH_EXTRA_FROM * 3 ? Math.min(PREFETCH_EXTRA_MAX, lead - PREFETCH_EXTRA_FROM * 3 + 30) : 0;
}

// Of een gebouw op afstand d (van de speler) met de projectie `along` op de rijrichting nu voorgeladen moet worden.
export function prefetchWanted(d, along, drawDist, base, extra) {
  if (d <= drawDist) return false; // binnen de ring: de gewone bouwlus
  if (d <= drawDist + base) return true; // de vaste marge, in elke richting
  return extra > 0 && along > 0 && d <= drawDist + base + extra; // verder: alleen vooruit
}

// De kandidaten uit `list` (gebouwen met bounds) in de volgorde waarin ze voorgeladen worden: wat de speler
// tegemoet rijdt eerst (streamRank). `skip(b)` slaat gebouwen over die al klaar zijn of landmark zijn.
export function prefetchOrder(list, px, py, drawDist, base, ahead, skip, out = []) {
  out.length = 0;
  const extra = prefetchExtra(ahead.lead || 0);
  const dx = ahead.dirX || 0, dy = ahead.dirY || 0;
  for (const b of list) {
    if (skip(b)) continue;
    const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
    const d = Math.hypot(cx - px, cy - py);
    if (!prefetchWanted(d, (cx - px) * dx + (cy - py) * dy, drawDist, base, extra)) continue;
    out.push({ b, rank: streamRank(ahead, cx, cy) });
  }
  out.sort((p, q) => p.rank - q.rank);
  return out;
}
