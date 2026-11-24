// Past een auto tussen de gebouwen en door het water? (#1047, docs/VERKEER-AUDIT-21-11.md)
// De verkeers-AI mocht elke weg op die breed genoeg was (canUseRoad). In de echte tegels lopen smalle straten en
// serviceweggetjes soms op 1 m van een voetafdruk of dwars door een sloot: de auto schaafde dan elke ronde langs de gevel
// of reed het water in. Deze toets loopt een keer langs de hartlijn en onthoudt het resultaat op de weg
// (road._fit); hij vervalt als er een gebouw bij of af komt (map._buildingVer); het water-deel (wet, endWet) ook bij nieuw water (map._waterVer). Geen DOM, geen three.
//
//   roadClearance(map, road)       { c, p, wet }: kleinste afstand hartlijn tot een voetafdruk (m, max 6; 0 = erdoor), en of de
//                                  hartlijn door open water loopt zonder brug of tunnel
//   (road._fit.endWet: bit 1 begin, bit 2 einde van de hartlijn ligt aan open water; de AI mijdt zo'n einde als het een doodlopend einde is)
//   (road._fit.endRoom: [begin, einde] afstand van het uiteinde van de hartlijn tot de dichtstbijzijnde voetafdruk (m, max 6): ruimte
//   om te keren; de AI mijdt een doodlopend einde waar een auto niet kan keren zonder langs de gevel te schaven, #1049)
//   roadFitsBody(map, road, wid)   mag een voertuig van deze breedte (m) hier rijden

import { pointInPolygon } from '../util.js';
import { inPassage } from '../passages.js';

const STEP = 2.5;           // m tussen de steekproeven langs de hartlijn
const CAP = 6;              // verder dan dit telt als vrij
const MARGE = 0.25;         // m speling naast de halve breedte van de auto
const WIDE_ROAD = 7.5;      // breder dan dit is een hoofdweg met eigen stroken: geen toets nodig

// een weg echt boven of onder het straatniveau (viaduct, tunnel, brug): daar staat geen gevel in de weg (vehicle.js offLevel: z > 4 of < -3.5)
const offGrade = (r) => !!(r.bridge || r.tunnel || (r.z && r.z.some((z) => z > 3.5 || z < -3)));

function distToPoly(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], ay = pts[i][1], ex = pts[i + 1][0] - ax, ey = pts[i + 1][1] - ay;
    const L2 = ex * ex + ey * ey;
    const u = L2 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)) : 0;
    const d = Math.hypot(ax + ex * u - x, ay + ey * u - y);
    if (d < best) best = d;
  }
  return best;
}

// Water tegen een weg: (endWet, wet) hangen af van de watertegels (map._waterVer), niet van de gebouwen. Water dat later
// binnenkomt (tegels stromen) haalde met alleen _buildingVer een verouderde uitkomst niet weg; nu rekent dit deel opnieuw
// bij een nieuwe waterversie, zonder de gebouwenlus (node: ca. 3 us per weg van 240 m tegen 0,17 ms voor alles).
function waterFit(map, road, out) {
  out.wver = map._waterVer || 0;
  out.endWet = 0;
  out.wet = false;
  const P = road.pts;
  if (!P || P.length < 2 || offGrade(road) || !map.inWaterRaw) return;
  if (!road.layer) {
    // een uiteinde dat bijna in het water ligt (een landweg die bij de sloot ophoudt): wie daar keert, rijdt erin (bit 1 begin, bit 2 einde)
    for (let e = 0; e < 2; e++) {
      const a = e ? P[P.length - 1] : P[0], b = e ? P[P.length - 2] : P[1];
      const hd = Math.atan2(a[1] - b[1], a[0] - b[0]);
      for (const d of [0, 1.5, 3, 4.5]) if (map.inWaterRaw(a[0] + Math.cos(hd) * d, a[1] + Math.sin(hd) * d)) { out.endWet |= 1 << e; break; }
      // ook water opzij van het einde (een keerbeweging zwaait de neus de sloot in): acht richtingen op 3 m
      if (!(out.endWet & (1 << e))) for (let k = 0; k < 8; k++) if (map.inWaterRaw(a[0] + Math.cos(k * Math.PI / 4) * 3, a[1] + Math.sin(k * Math.PI / 4) * 3)) { out.endWet |= 1 << e; break; }
    }
    for (let i = 0; i < P.length - 1 && !out.wet; i++) {
      const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay;
      const n = Math.max(1, Math.ceil(Math.hypot(ex, ey) / STEP));
      for (let k = 0; k <= n; k++) if (map.inWaterRaw(ax + ex * (k / n), ay + ey * (k / n))) { out.wet = true; break; }
    }
  }
}

export function roadClearance(map, road) {
  const ver = map._buildingVer || 0;
  const wver = map._waterVer || 0;
  const c0 = road._fit;
  if (c0 && c0.ver === ver) {
    if (c0.wver !== wver) waterFit(map, road, c0);
    return c0;
  }
  const out = { ver, wver, c: CAP, wet: false, p: CAP, endWet: 0, endRoom: [CAP, CAP] };
  road._fit = out;
  if (!road.pts || road.pts.length < 2) return out;
  waterFit(map, road, out);
  const grade = offGrade(road);
  const P = road.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], ex = P[i + 1][0] - ax, ey = P[i + 1][1] - ay;
    const len = Math.hypot(ex, ey);
    const n = Math.max(1, Math.ceil(len / STEP));
    for (let k = 0; k <= n; k++) {
      const x = ax + ex * (k / n), y = ay + ey * (k / n);
      if (grade) continue;
      for (const b of map.buildingsNear(x, y, CAP)) {
        if (b.type === 'houseboat') continue;
        const [minx, miny, maxx, maxy] = b.bounds;
        if (x < minx - CAP || x > maxx + CAP || y < miny - CAP || y > maxy + CAP) continue;
        if (pointInPolygon(x, y, b.pts)) {
          // een doorgang onder een gebouw (passages.js): de auto moet er zijwaarts in passen, dus zoek hoe breed de doorgang om de hartlijn is
          if (!inPassage(map, b, x, y, 0.35, 'car')) { out.c = 0; continue; }
          const hd = Math.atan2(ey, ex), nx = -Math.sin(hd), ny = Math.cos(hd);
          let h = 0.25;
          while (h < CAP && inPassage(map, b, x + nx * h, y + ny * h, 0.35, 'car') && inPassage(map, b, x - nx * h, y - ny * h, 0.35, 'car')) h += 0.25;
          if (h - 0.25 < out.p) out.p = h - 0.25;
          continue;
        }
        const d = distToPoly(x, y, b.pts);
        if (d < out.c) out.c = d;
      }
    }
  }
  // ruimte om te keren aan elk uiteinde: de dichtstbijzijnde voetafdruk (een doorgang telt niet, daar keert niemand)
  if (!grade) for (let e = 0; e < 2; e++) {
    const [x, y] = e ? P[P.length - 1] : P[0];
    for (const b of map.buildingsNear(x, y, CAP)) {
      if (b.type === 'houseboat') continue;
      const d = pointInPolygon(x, y, b.pts) ? 0 : distToPoly(x, y, b.pts);
      if (d < out.endRoom[e]) out.endRoom[e] = d;
    }
  }
  return out;
}

export function roadFitsBody(map, road, wid) {
  if (!map || !road || (road.width || 0) > WIDE_ROAD) return true;
  const f = roadClearance(map, road);
  if (f.wet) return false;
  return f.c >= wid / 2 + MARGE && f.p >= wid / 2;
}

// #1047: on a narrow street the facade can stand closer to the centreline than the right lane plus half a car
// (road._fit.c, worked out once per road by canUseRoad): there the car keeps to the middle, so its flank stays
// LANE_GAP off the wall instead of scraping it every lap (the audit's service roads at 1.5 m). Used by vehicle.js laneOffset.
const LANE_GAP = 0.25;
export function fitLane(road, lane, halfWid) {
  const f = road._fit;
  if (!f || (road.width || 0) > 7.5) return lane;
  return Math.min(lane, Math.max(0, f.c - halfWid - LANE_GAP));
}
