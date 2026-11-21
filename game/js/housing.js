// Woningen om te kopen en te verhuren (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md hoofdstuk 14). De pandindex bevat alleen bedrijfspanden: de ruim
// 200.000 gewone woningen zouden de index tienvoudig maken. Daarom telt bezit_index.mjs alleen hoeveel woningen elke woonplaats heeft (places[i][3]) en
// maakt het spel daar een koopbare "woning in de buurt" van: een gesynthetiseerd pand-ID per woonplaats en nummer, met een vast grondvlak, een vaste plek
// in de buurt van de plaats en de gewone woningprijs van business.js. Het aantal koopbare woningen per plaats is het gemeten aantal: je kunt nooit meer
// woningen kopen dan er in een plaats staan. Een gekochte woning staat in bezit.buildings als een gewoon pand (cls 'rent', type 'woning'): de verhuur,
// leegstand en het onderhoud zijn die van business.js. Het ID ligt boven 2^33, ver boven elk OSM-id, zodat het nooit een echt pand raakt.
// Puur: geen DOM, geen THREE, geen klok, geen opslag, geen Math.random (scripts/housing_test.mjs). Een wereld zonder woningtelling (oude bouw): geen woningen te koop.

import { hashUnit, clamp, finite } from './bezithash.js';

export const SYNTH_BASE = 2 ** 33;                  // 8.589.934.592: boven elk OSM-id
export const KEY_SPACE = 100000;                    // plaatsnummers
export const SLOT_SPACE = 10000;                    // woningen per plaats (hoogstens 9.999 koopbaar)
export const MAX_HOME_M2 = 150, MIN_HOME_M2 = 45;
export const NEAR_M = 6000;                         // de dichtstbijzijnde plaats binnen zoveel meter levert de woningen

export const isHomeId = (id) => Number.isSafeInteger(id) && id >= SYNTH_BASE && id < SYNTH_BASE + KEY_SPACE * SLOT_SPACE;
export const parseHomeId = (id) => (isHomeId(id) ? { key: Math.floor((id - SYNTH_BASE) / SLOT_SPACE), slot: (id - SYNTH_BASE) % SLOT_SPACE } : null);

// De woningmarkt van een woonplaatsenlijst ([naam, x, y, woningen]): de plaatsnummers (vast uit de naam; een botsing schuift naar het volgende vrije nummer,
// in volgorde van naam zodat het resultaat niet van de bestandsvolgorde afhangt), de rij van een woning en het aanbod rond een punt.
export function createHomeMarket(places = []) {
  const list = (Array.isArray(places) ? places : []).filter((q) => Array.isArray(q) && typeof q[0] === 'string' && Number.isFinite(q[1]) && Number.isFinite(q[2]) && Number.isFinite(q[3]) && q[3] > 0);
  const byKey = new Map(), keyOf = new Map();
  for (const q of [...list].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]))) {
    if (keyOf.has(q[0])) continue;                                    // twee plaatsen met één naam: de eerste wint
    let k = Math.floor(hashUnit('plaats', q[0]) * KEY_SPACE);
    while (byKey.has(k)) k = (k + 1) % KEY_SPACE;
    byKey.set(k, q); keyOf.set(q[0], k);
  }
  const capacity = (q) => clamp(Math.floor(finite(q && q[3], 0)), 0, SLOT_SPACE - 1);
  const idOf = (q, slot) => SYNTH_BASE + keyOf.get(q[0]) * SLOT_SPACE + slot;
  // De rij van een woning in de vorm van de pandindex ({ osm, x, y, m2, type, h, landmark }) plus synth: de plaats en het nummer. null als de plaats of het nummer niet bestaat.
  function rowOf(id) {
    const p = parseHomeId(id);
    const q = p && byKey.get(p.key);
    if (!q || p.slot >= capacity(q)) return null;
    const m2 = Math.round(MIN_HOME_M2 + (MAX_HOME_M2 - MIN_HOME_M2) * hashUnit('woning-m2', q[0], p.slot));
    return { osm: id, x: Math.round(q[1] + (hashUnit('woning-x', q[0], p.slot) - 0.5) * 800), y: Math.round(q[2] + (hashUnit('woning-y', q[0], p.slot) - 0.5) * 800),
      m2, type: 'house', h: 3 + 3 * Math.floor(hashUnit('woning-h', q[0], p.slot) * 2), landmark: 0, synth: 1, place: q[0], slot: p.slot };
  }
  return {
    size: byKey.size, rowOf,
    placeOfId: (id) => { const p = parseHomeId(id); return (p && byKey.get(p.key)) || null; },
    // De koopbare woningen rond (x, y): de dichtstbijzijnde plaats met woningen binnen NEAR_M; hoogstens max rijen die jij nog niet hebt. owned: Set van OSM-id's.
    near(x, y, owned = new Set(), max = 6) {
      let best = null, bd = Infinity;
      for (const q of byKey.values()) { const d = Math.hypot(q[1] - x, q[2] - y); if (d < bd) { bd = d; best = q; } }
      if (!best || bd > NEAR_M) return [];
      const cap = capacity(best), start = Math.floor(hashUnit('woning-start', best[0]) * cap), out = [];
      for (let k = 0; k < cap && out.length < max && k < 400; k++) {
        const id = idOf(best, (start + k) % cap);
        if (!owned.has(id)) out.push(rowOf(id));
      }
      return out;
    },
    available: (q) => (q ? capacity(q) : 0),
  };
}
