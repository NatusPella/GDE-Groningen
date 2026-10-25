// Reizen met de boot (#438): waar komt een boot neer als je met de kaart springt of met de
// boot ergens aankomt? Puur: geen three.js en geen wereld. De kaart levert `isWater` en
// `vrij` (past de romp daar, zonder kade, brug of ondiepte); hier staat alleen de zoektocht,
// in ringen van het doel naar buiten, zodat je zo dicht mogelijk bij de aangewezen plek komt.
// scripts/bootplek_test.mjs.

import { isInWater, boatDryPoints } from './util.js';

export const BOOT_ZOEK = { maxR: 240, stap: 12 };

// { x, y, afstand } van het eerste water waar de boot vrij ligt, of null.
// `vrij(px, py)` is optioneel; zonder die proef telt elk water.
export function vindBootPlek({ x, y, isWater, vrij = null, maxR = BOOT_ZOEK.maxR, stap = BOOT_ZOEK.stap } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || typeof isWater !== 'function') return null;
  if (!(maxR >= 0) || !(stap > 0)) return null;
  for (let r = 0; r <= maxR + 1e-9; r += stap) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / stap));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!isWater(px, py)) continue;
      if (vrij && !vrij(px, py)) continue;
      return { x: px, y: py, afstand: r };
    }
  }
  return null;
}

// De kaart-kant: water bij (x, y) waar deze boot met koers `hoek` vrij ligt, of null.
// Een smalle gracht vraagt soms net een andere koers, dus we proberen er een paar.
// Past de romp nergens (een grote boot in een smalle vaart), dan telt alleen het water:
// de sprong gaat voor, de romp schuift zelf wel van de kant.
export function bootPlekOpKaart(map, boot, x, y, hoek = boot && boot.angle, opts = {}) {
  if (!map || !boot) return null;
  const a0 = Number.isFinite(hoek) ? hoek : 0;
  let best = null;
  for (const h of [a0, a0 + 0.4, a0 - 0.4, a0 + Math.PI / 2, a0 - Math.PI / 2]) {
    const p = vindBootPlek({
      x, y, ...opts,
      isWater: (px, py) => isInWater(map, px, py),
      // een boot zonder model (of een kaart zonder kades) mag de sprong niet laten stuklopen
      vrij: (px, py) => { try { return boatDryPoints(map, boot, px, py, h) === 0; } catch (e) { return true; } },
    });
    if (p && (!best || p.afstand < best.afstand)) best = { ...p, hoek: h };
    if (best && best.afstand === 0) break;
  }
  if (best) return best;
  const water = vindBootPlek({ x, y, ...opts, isWater: (px, py) => isInWater(map, px, py) });
  return water ? { ...water, hoek: a0 } : null;
}
