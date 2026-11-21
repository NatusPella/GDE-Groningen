// De baan van de 3D-routelijn voor een auto: rechts houden. Los van scene3d zodat de audit
// (scripts/world/route_gebouw_audit.mjs) dezelfde code meet als de wereld tekent.
import { insideBuilding } from './buildinghit.js';

// Driving routes follow the right-hand lane (Dutch traffic): shift each
// point to the lane centre of the road it lies on; one-way roads stay centred.
export function keepRight(pts, map) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const [x, y] = pts[i];
    let best = null, bestD = 16;
    for (const road of map.roadsNear(x, y, 4)) {
      if (road.cat === 'foot' || road.cat === 'cycle') continue;
      const rp = road.pts;
      for (let k = 0; k < rp.length - 1; k++) {
        const ex = rp[k + 1][0] - rp[k][0], ey = rp[k + 1][1] - rp[k][1];
        const l2 = ex * ex + ey * ey || 1;
        const t = Math.max(0, Math.min(1, ((x - rp[k][0]) * ex + (y - rp[k][1]) * ey) / l2));
        const d = (x - rp[k][0] - ex * t) ** 2 + (y - rp[k][1] - ey * t) ** 2;
        if (d < bestD) { bestD = d; best = road; }
      }
    }
    let off = best && !best.oneway ? Math.min(2.2, (best.width || 6) / 4) : 0;
    // Het schuiven mag de lijn nooit in een gevel zetten (een straat die tegen de huizen ligt, een hoek): halveer tot het buiten
    // het gebouw valt, en blijf anders op het hart van de weg (21-11: de route liep door een gebouw).
    let nx = x - (dy / len) * off, ny = y + (dx / len) * off;
    for (let k = 0; k < 3 && off > 0 && !insideBuilding(map, x, y) && insideBuilding(map, nx, ny); k++) {
      off = k === 2 ? 0 : off / 2;
      nx = x - (dy / len) * off; ny = y + (dx / len) * off;
    }
    out.push([nx, ny]);
  }
  // Ook het stuk tussen twee verschoven punten mag geen hoek afsnijden door een gevel: zo'n stuk blijft op het hart van de weg.
  for (let i = 1; i < out.length; i++) {
    if (!segmentHitsBuilding(map, out[i - 1], out[i])) continue;
    out[i] = pts[i];
    out[i - 1] = pts[i - 1];
  }
  return out;
}

// Raakt het stuk a-b een gevel? Om de halve meter een punt: een hoek van een pand is soms maar een paar decimeter breed.
function segmentHitsBuilding(map, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
  for (let k = 0; k <= n; k++) {
    if (insideBuilding(map, a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)) return true;
  }
  return false;
}

// Route points can be 50 m apart on a straight road; a ramp climbs more than
// groundHeightAt's step-up between two of them, so resample every 2 m.
export function resamplePath(pts, step = 2) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(L / step);
    for (let k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n)]);
    out.push(b);
  }
  return out;
}

// Een route die op een weg eindigt die in een gebouw ligt (het doel is een pand, de dichtstbijzijnde weg loopt door de hal) eindigt
// bij de gevel: het laatste stuk binnen (hooguit maxM) wordt afgekapt op het punt waar de lijn het gebouw in gaat, de deur van het
// pand. Alleen de staart; een passage midden in de route blijft zoals de router hem koos.
export function trimPathEnd(map, pts, maxM = 60, windowM = 25) {
  if (pts.length < 2) return pts;
  // vanaf het eind terug: elk stuk dat een gevel raakt binnen windowM van het eind, en een aaneengesloten reeks daarvoor (het vroegste telt)
  let first = -1, cum = 0;
  for (let i = pts.length - 1; i > 0; i--) {
    if (segmentHitsBuilding(map, pts[i - 1], pts[i])) first = i - 1;
    else if (cum >= windowM) break;
    cum += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  if (first < 0) return pts;
  // op het stuk first -> first + 1: het punt waar de lijn het gebouw in gaat
  const a = pts[first], b = pts[first + 1];
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
  let last = a;
  for (let k = 1; k <= n; k++) {
    const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n];
    if (insideBuilding(map, p[0], p[1])) break;
    last = p;
  }
  // de staart mag niet langer zijn dan maxM: een doorgaande weg door een groot complex blijft zoals hij is
  let tail = Math.hypot(b[0] - last[0], b[1] - last[1]);
  for (let i = first + 1; i < pts.length - 1; i++) tail += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  if (tail > maxM) return pts;
  const out = pts.slice(0, first + 1);
  if (last !== a) out.push(last);
  return out.length >= 2 ? out : pts;
}
