// De kaartlaag "Te koop" (epic #1095, #1098; ontwerp docs/BEZIT-21-11.md 7): welke percelen er in beeld staan, met stand, prijsstap en vorm.
// Puur: geen DOM, geen canvas, geen klok (scripts/forsalemap_test.mjs); mapview.js tekent wat dit teruggeeft. De vorm is een schets op
// kaalschaal (perceelVlak van percelen.js) zolang bezit-vormen.json niet geladen is, daarna de echte omtrek (parcelindex shapeOf); alleen wat in beeld is wordt berekend, nooit alle 13.664 tegelijk.
//
// Kleurtaal (DS3): te koop = inktblauwe streeplijn (laagTekoop) met een prijskaartje, van jou = greenLight, medespeler = zijn spelerkleur, niet te koop = grijs
// met een slotje. Geel blijft gereserveerd voor 'volg dit'-doelen. Nooit alleen kleur: elke stand heeft een lijnpatroon (dash) en een vorm.

import { perceelVlak } from './percelen.js';

export const DETAIL_SCALE = 0.12;       // px per meter: vanaf hier losse percelen, daaronder een telling per cel
export const CLUSTER_MIN_SCALE = 0.025; // daaronder niets (de hele provincie in beeld)
export const CLUSTER_CELL_M = 3000;
export const MAX_SHAPES = 250;
export const PRICE_PER_HA_STEPS = [1500, 3000, 6000];   // vier prijsstappen: tot 1.500, tot 3.000, tot 6.000 en daarboven per hectare

// Standen: id, lijnpatroon (px), kleurnaam uit mapstyle INK, vulling (alpha), icoon-id voor het label (Phosphor via icons.js)
export const STATES = {
  forSale: { dash: [8, 4], ink: 'laagTekoop', alpha: 0.16, icon: 'geld', label: 'Te koop' },
  own: { dash: [], ink: 'laagEigen', alpha: 0.26, icon: 'thuis', label: 'Van jou' },
  claimed: { dash: [3, 3], ink: 'laagMedespeler', alpha: 0.14, icon: 'spelers', label: 'Van een medespeler' },
  locked: { dash: [2, 5], ink: 'laagSlot', alpha: 0.08, icon: 'slot', label: 'Niet te koop' },
};
export const priceStep = (price, ha) => { const pha = price / Math.max(0.1, ha); return PRICE_PER_HA_STEPS.filter((s) => pha > s).length; };

// De omtrek van een perceel: de echte, vereenvoudigde vorm uit bezit-vormen.json als die geladen is (real: true), anders de schets op kaalschaal.
function outlineOf(ix, p) {
  const real = ix.shapeOf ? ix.shapeOf(p.id) : null;
  return real && real.length >= 3 ? { punten: real, real: true } : { punten: perceelVlak({ id: p.id, ha: p.ha }, { x: p.x, y: p.y }), real: false };
}

// deps: { parcels (parcelindex), ownsId(id), claimOf(id) -> {name,color}|null, priceOf(parcel) -> euro, showLocked }
export function forSaleLayer(deps) {
  const stateOf = (p) => (deps.ownsId(p.id) ? 'own' : deps.claimOf(p.id) ? 'claimed' : p.access === 'geen' ? 'locked' : 'forSale');
  return {
    // rect = [x0, y0, x1, y1] in wereldmeters, scale = pixels per meter
    view(rect, scale) {
      const ix = deps.parcels;
      if (!ix || !ix.size || !(scale >= CLUSTER_MIN_SCALE)) return { mode: 'none', shapes: [], clusters: [], total: 0 };
      const [x0, y0, x1, y1] = rect;
      const cand = ix.inRect(x0 - 500, y0 - 500, x1 + 500, y1 + 500);   // het binnenpunt ligt soms buiten het beeld terwijl het vlak erin steekt
      if (scale < DETAIL_SCALE) {
        const cells = new Map();
        for (const p of cand) {
          if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
          const st = stateOf(p);
          if (st === 'locked') continue;
          const k = Math.floor(p.x / CLUSTER_CELL_M) + ',' + Math.floor(p.y / CLUSTER_CELL_M);
          let c = cells.get(k);
          if (!c) cells.set(k, (c = { x: 0, y: 0, n: 0, own: 0, forSale: 0, min: Infinity }));
          c.x += p.x; c.y += p.y; c.n++;
          if (st === 'own') c.own++; else if (st === 'forSale') { c.forSale++; c.min = Math.min(c.min, deps.priceOf(p)); }
        }
        const clusters = [...cells.values()].map((c) => ({ x: c.x / c.n, y: c.y / c.n, n: c.n, own: c.own, forSale: c.forSale, min: c.min === Infinity ? 0 : c.min }));
        return { mode: 'clusters', shapes: [], clusters, total: cand.length };
      }
      const shapes = [];
      let total = 0;
      for (const p of cand) {
        if (p.x < x0 - 300 || p.x > x1 + 300 || p.y < y0 - 300 || p.y > y1 + 300) continue;
        total++;
        if (shapes.length >= MAX_SHAPES) continue;
        const st = stateOf(p);
        const price = st === 'forSale' ? deps.priceOf(p) : 0;
        const claim = st === 'claimed' ? deps.claimOf(p.id) : null;
        shapes.push({ id: p.id, state: st, x: p.x, y: p.y, ha: p.ha, kind: p.kind, access: p.access, price, step: st === 'forSale' ? priceStep(price, p.ha) : 0,
          ...outlineOf(ix, p), claim });
      }
      return { mode: 'shapes', shapes, clusters: [], total };
    },
  };
}

// Een klik op de kaart: het perceel onder (wx, wy), het dichtstbijzijnde als het vlak er net naast ligt (binnen 20 m). null als er niets is.
export function pickShape(shapes, wx, wy, within = 20) {
  if (!Array.isArray(shapes)) return null;
  let best = null, bd = Infinity;
  for (const s of shapes) {
    const xs = s.punten.map((q) => q[0]), ys = s.punten.map((q) => q[1]);
    const inBox = wx >= Math.min(...xs) - within && wx <= Math.max(...xs) + within && wy >= Math.min(...ys) - within && wy <= Math.max(...ys) + within;
    if (!inBox) continue;
    const d = Math.hypot(s.x - wx, s.y - wy);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// De regel onder de kaart voor de legenda (Nederlands).
export const LEGEND = [
  { state: 'forSale', note: 'blauw met streeplijn en een prijskaartje: te koop' },
  { state: 'own', note: 'groen en dicht: van jou' },
  { state: 'claimed', note: 'stippellijn in een andere kleur: van een medespeler in deze sessie' },
  { state: 'locked', note: 'grijs met een slotje: niet te koop (geen toegang tot een weg)' },
];
