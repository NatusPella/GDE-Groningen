// De baan van de zeilregatta (#197): vier tonnen op een cirkel in open water bij een jachthaven.
// Pure keuze, Node-safe: `wateralOk(x, y)` zegt of daar bevaarbaar open water is. De baan is
// vast voor een jachthaven (dezelfde kandidaten, dezelfde volgorde).
import { rondBaan, REGATTA } from './zeilrules.js';

export const BAAN = { straal: 55, stralen: [55, 42, 30], tonnen: 4, zoek: [80, 130, 190, 260, 340], richtingen: 16, controle: 6 };

// Alle punten op de cirkel en tussen de tonnen moeten water zijn, zodat de boot er langs kan.
// Rond elke ton moet ook water zijn (RUIMTE m, acht richtingen): een ton aan de kade kun je niet ronden.
const RUIMTE = 10;
const ruimteRond = (t, wateralOk) => {
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; if (!wateralOk(t.x + Math.cos(a) * RUIMTE, t.y + Math.sin(a) * RUIMTE)) return false; }
  return true;
};

export function baanIsVrij(tonnen, wateralOk, stap = 12) {
  for (const t of tonnen) if (!ruimteRond(t, wateralOk)) return false;
  for (let i = 0; i < tonnen.length; i++) {
    const a = tonnen[i], b = tonnen[(i + 1) % tonnen.length];
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / stap));
    for (let k = 0; k <= n; k++) if (!wateralOk(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) return false;
  }
  return true;
}

// { tonnen, midden } of null als er geen vrije baan in de buurt is.
export function kiesBaan(x, y, wateralOk, o = {}) {
  for (const straal of o.straal ? [o.straal] : BAAN.stralen) {
    for (const d of BAAN.zoek) for (let k = 0; k < BAAN.richtingen; k++) {
      const a = (k / BAAN.richtingen) * Math.PI * 2, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      const tonnen = rondBaan(cx, cy, straal, BAAN.tonnen, a + Math.PI);
      if (baanIsVrij(tonnen, wateralOk)) return { tonnen, midden: { x: cx, y: cy }, straal };
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
