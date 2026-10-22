// De baan van de zeilregatta (#197): vier tonnen op een cirkel in open water bij een jachthaven.
// Pure keuze, Node-safe: `wateralOk(x, y)` zegt of daar bevaarbaar open water is. De baan is
// vast voor een jachthaven (dezelfde kandidaten, dezelfde volgorde).
import { rondBaan, REGATTA } from './zeilrules.js';

// (raster: de middens van een ronde baan op een raster van `raster` m binnen `zoekMax` m van de haven; lijn: de heen-en-weer-baan langs smal
// water, tonnen `tussen` m uit elkaar, met `ruimtes` m water rondom, van strak naar krap; #384)
export const BAAN = { straal: 55, stralen: [55, 42, 30], tonnen: 4, zoek: [80, 130, 190, 260, 340], richtingen: 16, controle: 6, raster: 10, zoekMax: 400, lijn: { tussen: 55, ruimtes: [12, 9, 6], richtingen: 32, stap: 10 } };

// Alle punten op de cirkel en tussen de tonnen moeten water zijn, zodat de boot er langs kan.
// Rond elke ton moet ook water zijn (RUIMTE m, acht richtingen): een ton aan de kade kun je niet ronden.
const RUIMTE = 10;
const ruimteRond = (t, wateralOk, ruimte = RUIMTE) => {
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; if (!wateralOk(t.x + Math.cos(a) * ruimte, t.y + Math.sin(a) * ruimte)) return false; }
  return true;
};

export function baanIsVrij(tonnen, wateralOk, stap = 12, ruimte = RUIMTE) {
  for (const t of tonnen) if (!ruimteRond(t, wateralOk, ruimte)) return false;
  for (let i = 0; i < tonnen.length; i++) {
    const a = tonnen[i], b = tonnen[(i + 1) % tonnen.length];
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / stap));
    for (let k = 0; k <= n; k++) if (!wateralOk(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) return false;
  }
  return true;
}

// De punten op een raster van `raster` m rond (x, y) tot `max` m, de dichtstbijzijnde eerst.
function rasterPunten(x, y, max, raster) {
  const out = [], n = Math.ceil(max / raster);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const d = Math.hypot(i, j) * raster;
    if (d <= max) out.push({ x: x + i * raster, y: y + j * raster, d });
  }
  return out.sort((p, q) => p.d - q.d || p.x - q.x || p.y - q.y);
}

// { tonnen, midden, straal, vorm } of null als er geen vrije baan in de buurt is. Eerst de ronde baan op open water (de grote
// stralen eerst, op de vaste richtingen rond de haven), dan dezelfde baan op een fijn raster, dan een heen-en-weer-baan langs het
// vaarwater (smal water is er in de stad genoeg; de ronde baan past er niet, #384).
export function kiesBaan(x, y, wateralOk, o = {}) {
  const stralen = o.straal ? [o.straal] : BAAN.stralen;
  for (const straal of stralen) {
    for (const d of BAAN.zoek) for (let k = 0; k < BAAN.richtingen; k++) {
      const a = (k / BAAN.richtingen) * Math.PI * 2, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      const tonnen = rondBaan(cx, cy, straal, BAAN.tonnen, a + Math.PI);
      if (baanIsVrij(tonnen, wateralOk)) return { tonnen, midden: { x: cx, y: cy }, straal, vorm: 'rond' };
    }
  }
  // (het water per punt onthouden: de meeste punten van het raster liggen op land)
  const memo = new Map();
  const ok = (px, py) => { const k = Math.round(px * 4) + ',' + Math.round(py * 4); let v = memo.get(k); if (v === undefined) memo.set(k, v = !!wateralOk(px, py)); return v; };
  const punten = rasterPunten(x, y, BAAN.zoekMax, BAAN.raster).filter((p) => ok(p.x, p.y));
  for (const straal of stralen) {
    for (const p of punten) {
      const tonnen = rondBaan(p.x, p.y, straal, BAAN.tonnen, Math.atan2(y - p.y, x - p.x));
      if (baanIsVrij(tonnen, ok)) return { tonnen, midden: { x: p.x, y: p.y }, straal, vorm: 'rond' };
    }
  }
  const L = BAAN.lijn;
  for (const ruimte of L.ruimtes) {
    for (const p of punten) {
      for (let k = 0; k < L.richtingen; k++) {
        const a = (k / L.richtingen) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const tonnen = Array.from({ length: BAAN.tonnen }, (_, i) => ({ x: p.x + c * L.tussen * i, y: p.y + s * L.tussen * i }));
        if (!ruimteRond(tonnen[0], ok, ruimte) || !ruimteRond(tonnen[BAAN.tonnen - 1], ok, ruimte)) continue;
        // (ook tussen de tonnen ruimte aan beide kanten van de lijn, elke 20 m)
        let breed = true;
        for (let q = 20; q < L.tussen * (BAAN.tonnen - 1) && breed; q += 20) breed = ruimteRond({ x: p.x + c * q, y: p.y + s * q }, ok, ruimte);
        if (breed && baanIsVrij(tonnen, ok, L.stap, ruimte)) return { tonnen, midden: { x: p.x + c * L.tussen * 1.5, y: p.y + s * L.tussen * 1.5 }, straal: L.tussen * 1.5, vorm: 'lijn' };
      }
    }
  }
  return null;
}

// De richttijd: twee rondes op een gemiddelde snelheid van 2,6 m/s langs de omtrek.
export function richtTijd(tonnen, rondes = REGATTA.rondes, snelheid = 2.6) {
  let omtrek = 0;
  for (let i = 0; i < tonnen.length; i++) { const a = tonnen[i], b = tonnen[(i + 1) % tonnen.length]; omtrek += Math.hypot(b.x - a.x, b.y - a.y); }
  return Math.round((omtrek * rondes) / snelheid);
}
