// De gebouwen van de tegels als zoekindex, voor de watergaten van het vaarnet (#362): een stuk water dat het vaarnet toevoegt
// (vaarnet.mjs closeGaps, clusterGaps, autoLinks) mag geen gebouw raken, anders vaart een boot door een huis, zwemt een
// speler in een woonkamer en ligt een regattaton op een dak. Woonboten tellen niet mee: die liggen in het water.
//   const huizen = await laadHuizen(dir);   huizen.raakt(veelhoek)   huizen.aantal(veelhoek)
import { leesTegelRijen, heeftTegels } from './tegelrijen.mjs';

const BLOK = 50;
const EPS = 1e-7;

// Is het punt echt binnen de veelhoek (de rand telt niet mee)?
function binnen(x, y, P) {
  let ins = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// Kruisen twee lijnstukken elkaar echt (raken aan de uiteinden telt niet)?
function kruist(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}

// Overlappen twee veelhoeken?
export function veelhoekenRaken(A, B) {
  for (let i = 0, j = A.length - 1; i < A.length; j = i++) {
    for (let k = 0, l = B.length - 1; k < B.length; l = k++) if (kruist(A[j], A[i], B[l], B[k])) return true;
  }
  // geen kruisende randen: de een ligt helemaal in de ander (of ze liggen los); ook de middens van de randen worden getoetst
  // (twee gelijke vlakken delen alle hoekpunten). Randen die precies op elkaar liggen tellen als overlap: liever te streng.
  const mid = (P) => P.map((p, i) => { const q = P[(i + 1) % P.length]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
  for (const p of [...A, ...mid(A)]) if (binnen(p[0], p[1], B)) return true;
  for (const p of [...B, ...mid(B)]) if (binnen(p[0], p[1], A)) return true;
  return false;
}

export function maakHuizenIndex(gebouwen) {
  const grid = new Map(), alle = [];
  for (const b of gebouwen) {
    if (!b.pts || b.pts.length < 3 || b.type === 'houseboat') continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of b.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const h = { pts: b.pts, b: [x0, y0, x1, y1], type: b.type || '' };
    alle.push(h);
    for (let i = Math.floor(x0 / BLOK); i <= Math.floor(x1 / BLOK); i++) for (let j = Math.floor(y0 / BLOK); j <= Math.floor(y1 / BLOK); j++) {
      const k = i * 100003 + j;
      (grid.get(k) || grid.set(k, []).get(k)).push(h);
    }
  }
  // de gebouwen die de veelhoek (of de rechthoek [x0, y0, x1, y1] met marge m) raken
  function lijst(P, m = 0) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    const out = new Set();
    for (let i = Math.floor(x0 / BLOK); i <= Math.floor(x1 / BLOK); i++) for (let j = Math.floor(y0 / BLOK); j <= Math.floor(y1 / BLOK); j++) {
      for (const h of grid.get(i * 100003 + j) || []) {
        if (out.has(h) || h.b[2] < x0 || h.b[0] > x1 || h.b[3] < y0 || h.b[1] > y1) continue;
        out.add(h);
      }
    }
    return [...out];
  }
  const raken = (P, m) => lijst(P, m).filter((h) => veelhoekenRaken(P, h.pts));
  return {
    aantalGebouwen: alle.length,
    raakt: (P, m = 0) => raken(P, m).length > 0,
    aantal: (P, m = 0) => raken(P, m).length,
    gebouwen: (P, m = 0) => raken(P, m),
  };
}

// Leest de gebouwen van een gebouwde wereld (index.json en index-provincie.json); null zonder tegels.
export async function laadHuizen(dir) {
  if (!dir || !heeftTegels(dir)) return null;
  const rows = await leesTegelRijen(dir);
  return maakHuizenIndex(rows.buildings);
}
