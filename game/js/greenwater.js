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

// Afstand (in het kwadraat) van een punt tot een lijnstuk, in het platte vlak.
function pointSeg2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return (ax + dx * t - px) ** 2 + (ay + dy * t - py) ** 2;
}

// Afstand tussen twee lijnstukken (kwadraat); 0 als ze elkaar snijden.
function segSeg2(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) > 1e-12) {
    const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
    const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(pointSeg2(cx, cy, ax, ay, bx, by), pointSeg2(dx, dy, ax, ay, bx, by),
    pointSeg2(ax, ay, cx, cy, dx, dy), pointSeg2(bx, by, cx, cy, dx, dy));
}

const side = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = side(px, py, ax, ay, bx, by), d2 = side(px, py, bx, by, cx, cy), d3 = side(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// Raakt dit driehoekje de verharding? Alleen naar het zwaartepunt kijken (#883) mist de grote
// driehoeken van een akker of weiland die over de rijbaan heen liggen: hun zwaartepunt ligt naast
// de weg en juist die driehoek bedekt het asfalt. Daarom toetsen we de hele driehoek tegen de
// wegsegmenten in de buurt: een wegpunt in de driehoek, een driehoekpunt binnen de halve breedte,
// of een kruisend tweetal lijnstukken. `onPaved` is de toets van pavedTester, die de segmenten in
// een raster van SEG_CELL m houdt zodat een driehoekje alleen de segmenten in zijn buurt ziet.
const SEG_CELL = 24;

function segHitsTriangle(s, ax, ay, bx, by, cx, cy) {
  if (s.x1 < Math.min(ax, bx, cx) || s.x0 > Math.max(ax, bx, cx) || s.y1 < Math.min(ay, by, cy) || s.y0 > Math.max(ay, by, cy)) return false;
  const px = s.ax, py = s.ay, qx = s.bx, qy = s.by, h2 = s.h2;
  // een wegpunt in de driehoek (de weg loopt er dwars doorheen)
  if (inTriangle(px, py, ax, ay, bx, by, cx, cy) || inTriangle(qx, qy, ax, ay, bx, by, cx, cy)) return true;
  // een driehoekpunt binnen de halve breedte, of een kruisend randje
  if (pointSeg2(ax, ay, px, py, qx, qy) <= h2 || pointSeg2(bx, by, px, py, qx, qy) <= h2 || pointSeg2(cx, cy, px, py, qx, qy) <= h2) return true;
  if (segSeg2(ax, ay, bx, by, px, py, qx, qy) <= h2 || segSeg2(bx, by, cx, cy, px, py, qx, qy) <= h2 || segSeg2(cx, cy, ax, ay, px, py, qx, qy) <= h2) return true;
  return false;
}

export function triangleOnPaved(onPaved, ax, ay, bx, by, cx, cy) {
  if (!onPaved) return false;
  if (onPaved((ax + bx + cx) / 3, (ay + by + cy) / 3)) return true;
  const grid = onPaved.grid, segs = onPaved.segs;
  if (!grid || !segs) return onPaved(ax, ay) || onPaved(bx, by) || onPaved(cx, cy);
  const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx);
  const y0 = Math.min(ay, by, cy), y1 = Math.max(ay, by, cy);
  const cell = onPaved.cell, pad = onPaved.maxH;
  const gx0 = Math.floor((x0 - pad) / cell), gx1 = Math.floor((x1 + pad) / cell);
  const gy0 = Math.floor((y0 - pad) / cell), gy1 = Math.floor((y1 + pad) / cell);
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const list = grid.get(gx * 100003 + gy);
      if (!list) continue;
      for (const k of list) if (segHitsTriangle(segs[k], ax, ay, bx, by, cx, cy)) return true;
    }
  }
  return false;
}

// De verharding waar groen niet over mag liggen: alle wegen, paden, fietspaden en stoepen van de
// kaart, als afstand tot de aslijn binnen de halve breedte. `op = { roads, reach }` wordt één keer
// per groenvlak gevuld met de wegen in de buurt (map.roadsNear), zodat elk driehoekje alleen die
// korte lijst hoeft te bekijken.
export function pavedTester(map, cx, cy, radius) {
  const near = map && map.roadsNear ? map.roadsNear(cx, cy, radius) : [];
  const roads = [], segs = [], grid = new Map();
  let maxH = 0;
  for (const r of near) {
    if (!r || !r.pts || r.pts.length < 2) continue;
    // eigen omhullende doos, zodat een punt buiten een weg die doos meteen afvalt (een groot
    // groenvlak met veel wegen in de buurt hoeft niet elke weg af te lopen)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const h = (r.width || 0) / 2 + 0.05;
    if (h > maxH) maxH = h;
    const P = r.pts;
    for (const p of P) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
    roads.push({ pts: P, x0: x0 - h, y0: y0 - h, x1: x1 + h, y1: y1 + h, h });
    // de segmenten in een raster (#883): een driehoek van een akker vraagt alleen de wegranden
    // in zijn eigen buurt op in plaats van elke weg in de wijde omtrek
    const h2 = h * h;
    for (let i = 0; i + 1 < P.length; i++) {
      const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
      const k = segs.length;
      segs.push({ ax, ay, bx, by, h2, x0: Math.min(ax, bx) - h, y0: Math.min(ay, by) - h, x1: Math.max(ax, bx) + h, y1: Math.max(ay, by) + h });
      const gx0 = Math.floor((Math.min(ax, bx) - h) / SEG_CELL), gx1 = Math.floor((Math.max(ax, bx) + h) / SEG_CELL);
      const gy0 = Math.floor((Math.min(ay, by) - h) / SEG_CELL), gy1 = Math.floor((Math.max(ay, by) + h) / SEG_CELL);
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gy = gy0; gy <= gy1; gy++) {
          const key = gx * 100003 + gy;
          (grid.get(key) || grid.set(key, []).get(key)).push(k);
        }
      }
    }
  }
  if (!roads.length) return null;
  const test = (x, y) => {
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
  // de segmenten met hun raster voor de driehoeksproef (#883)
  test.segs = segs;
  test.grid = grid;
  test.cell = SEG_CELL;
  test.maxH = maxH;
  return test;
}

// Zelfde als dryIndices, met een tweede test erbij (de verharding), over de hele driehoek en niet
// alleen het zwaartepunt (#883): een groot groenvlak heeft driehoeken die breder zijn dan de weg.
export function dryPavedIndices(pos, idx, inWater, onPaved) {
  const out = [];
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const x = (pos[a] + pos[b] + pos[c]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    if (inWater && inWater(x, z)) continue;
    if (onPaved && triangleOnPaved(onPaved, pos[a], pos[a + 2], pos[b], pos[b + 2], pos[c], pos[c + 2])) continue;
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
