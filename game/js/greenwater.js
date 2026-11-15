// Water altijd boven groen (#918) en verharding boven groen (#883): de driehoeken van een
// groenvlak die in water of op de verharding liggen gaan eruit, zodat gras de plek waar je zwemt
// of rijdt nooit bedekt. Eén bron voor alle groenlezers (grass.js, tilegreenery.js).
import { waterIndexAt } from './waterindex.js';

export function dryIndices(pos, idx, inWater) {
  const out = [];
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (!inWater(x, z)) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  return out;
}

// De verharding waar groen niet over mag liggen: alle wegen, paden, fietspaden en stoepen van de
// kaart, als afstand tot de aslijn binnen de halve breedte. `op = { roads, reach }` wordt één keer
// per groenvlak gevuld met de wegen in de buurt (map.roadsNear), zodat elk driehoekje alleen die
// korte lijst hoeft te bekijken.
export function pavedTester(map, cx, cy, radius) {
  const near = map && map.roadsNear ? map.roadsNear(cx, cy, radius) : [];
  const roads = [];
  for (const r of near) {
    if (!r || !r.pts || r.pts.length < 2) continue;
    // eigen omhullende doos, zodat een punt buiten een weg die doos meteen afvalt (een groot
    // groenvlak met veel wegen in de buurt hoeft niet elke weg af te lopen)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const h = (r.width || 0) / 2 + 0.05;
    for (const p of r.pts) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
    roads.push({ pts: r.pts, x0: x0 - h, y0: y0 - h, x1: x1 + h, y1: y1 + h, h });
  }
  if (!roads.length) return null;
  return (x, y) => {
    for (const r of roads) {
      if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
      const P = r.pts, h = r.h;
      for (let i = 0; i < P.length - 1; i++) {
        const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
        const l2 = dx * dx + dy * dy || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const ex = ax + dx * t - x, ey = ay + dy * t - y;
        if (ex * ex + ey * ey <= h * h) return true;
      }
    }
    return false;
  };
}

// Zelfde als dryIndices, met een tweede test erbij (de verharding).
export function dryPavedIndices(pos, idx, inWater, onPaved) {
  const out = [];
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (inWater && inWater(x, z)) continue;
    if (onPaved && onPaved(x, z)) continue;
    out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  return out;
}

// Een watertoets over de buurt van een vlak of cel (#918): eerst de (goedkope) doos van elk
// waterpolygoon in de buurt, en pas binnen zo'n doos de index van de tegel (waterIndexAt, die het
// vaste water én de gestroomde tegels kent). Null als er geen water in de buurt ligt, dan kost de
// toets niets.
export function waterTester(map, cx, cy, r) {
  const near = map && map.waterNear ? map.waterNear(cx, cy, Math.max(1, r)) : null;
  if (!near || !near.length) return null;
  const boxes = [];
  for (const w of near) {
    if (!w.pts || w.pts.length < 3) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
    boxes.push([x0, y0, x1, y1]);
  }
  if (!boxes.length) return null;
  return (x, y) => {
    let inside = false;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) { inside = true; break; }
    }
    return inside ? waterIndexAt(map, x, y).inWater(x, y) : false;
  };
}
