// Safehouses (#414): waar een huisje mag staan. Pure regels, geen THREE en geen spelmodules (de afhankelijkheden komen binnen als d), zodat scripts/safehuisplek_test.mjs
// ze op de echte stadskaart kan draaien. safehuizen.js geeft de echte functies mee.
//
// Dezelfde eisen als de spotcheck (spotcheck.js spotProblem, de verhaaltest "all spots reachable"): geen water, geen gebouw (een doorgang mag), niet in een erf, dorp of
// mast in de Ommelanden en een plek waar je weg kunt lopen. Het huisje zelf (het midden en de vier hoeken) en de plek bij de deur moeten er allemaal aan voldoen.
//   d = { isInWater(map, x, y), pointInPolygon(x, y, pts), inPassage(map, b, x, y), landSolid(x, y), provinceLandAt(x, y), puntInGebied(g, x, y) }

export const DEUR_AFSTAND = 3.2;   // m van het midden van het huisje tot de plek bij de deur
export const HX = 2.25, HZ = 2.75; // halve diepte (naar voren) en halve breedte van het huisje
export const SNAP_R = 60;
export const STAND_REACH = 45;     // m waarover je vanaf de plek weg moet kunnen lopen (spotcheck WALK_REACH)
export const ZOEK_RINGEN = [0, 40, 80, 140, 220, 320, 450, 650, 900];

// Droog land: binnen het land van de provincie (niet de Eems of de Waddenzee), niet in het water en ook geen water vlak ernaast (de kade).
export const droog = (map, x, y, d) => d.provinceLandAt(x, y) && !d.isInWater(map, x, y) && ![[6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dy]) => d.isInWater(map, x + dx, y + dy));

// Wat de spotcheck voor een looppunt eist (zonder de rijweg: een huisje is een looppunt).
export function bruikbaar(map, x, y, d) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || d.isInWater(map, x, y)) return false;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy || !d.pointInPolygon(x, y, b.pts)) continue;
    if (d.inPassage(map, b, x, y)) continue;
    return false;
  }
  if (d.landSolid && d.landSolid(x, y)) return false;
  return !!map.canWalkOut(x, y, STAND_REACH);
}

// Ligt een punt op een rijweg (een weg die geen voetpad of fietspad is)? Een huisje op de rijbaan sluit de weg af (#436: Hoogkerk).
export const WEG_MARGE = 0.4; // m naast de rand van de rijbaan waar het huisje nog te dicht staat
export function opRijweg(map, x, y) {
  if (!map.roadsNear) return false;
  for (const r of map.roadsNear(x, y, 12)) {
    if (!r.pts || r.cat === 'foot' || r.cat === 'cycle' || r.bridge || r.tunnel) continue;
    const lim = (r.width || 5) / 2 + WEG_MARGE;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      if (Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < lim) return true;
    }
  }
  return false;
}

// Staat een huisje met zijn midden op (x, y) en zijn voorkant naar ang goed: het midden, de vier hoeken en de plek bij de deur.
export function huisVrij(map, x, y, ang, d) {
  const fx = Math.cos(ang), fy = Math.sin(ang), rx = -fy, ry = fx;
  const punten = [[x, y], [x + fx * HX + rx * HZ, y + fy * HX + ry * HZ], [x + fx * HX - rx * HZ, y + fy * HX - ry * HZ], [x - fx * HX + rx * HZ, y - fy * HX + ry * HZ], [x - fx * HX - rx * HZ, y - fy * HX - ry * HZ],
    [x + fx * DEUR_AFSTAND, y + fy * DEUR_AFSTAND]];
  // ook de middens van de zijden: een huisje van 4,5 bij 5,5 m kan met alleen de hoeken op een smalle weg liggen
  const zijden = [[x + fx * HX, y + fy * HX], [x - fx * HX, y - fy * HX], [x + rx * HZ, y + ry * HZ], [x - rx * HZ, y - ry * HZ]];
  if ([[x, y], ...zijden, ...punten.slice(1, 5)].some(([px, py]) => opRijweg(map, px, py))) return false;
  return punten.every(([px, py]) => droog(map, px, py, d) && bruikbaar(map, px, py, d));
}

// De plek bij de deur van een huisje op (x, y) met voorkant ang.
export const deurVan = (x, y, ang) => ({ x: x + Math.cos(ang) * DEUR_AFSTAND, y: y + Math.sin(ang) * DEUR_AFSTAND });

// Land in het gebied zelf (het landraster van de provincie, zonder tegels), het dichtst bij het binnenpunt (h.x0, h.y0) eerst: [[x, y, afstand2]].
export function droogeKandidaten(h, d) {
  const g = h.grens;
  if (!g || !g.b) return [];
  const [x0, y0, x1, y1] = g.b;
  const stap = Math.max(120, Math.max(x1 - x0, y1 - y0) / 45);
  const uit = [];
  for (let y = y0 + stap / 2; y < y1; y += stap) for (let x = x0 + stap / 2; x < x1; x += stap) {
    if (d.provinceLandAt(x, y) && d.puntInGebied(g, x, y)) uit.push([x, y, (x - h.x0) ** 2 + (y - h.y0) ** 2]);
  }
  return uit.sort((p, q) => p[2] - q[2]);
}

// De plek voor een huisje { x0, y0, ang, grens }: in ringen om het binnenpunt de dichtstbijzijnde open plek waar het huisje helemaal past, met de voorkant naar de
// dichtstbijzijnde weg (of een kwartslag verder als het zo niet past); lukt dat niet, dan met een raster door het hele gebied. Geeft { x, y, ang } of null.
export function zoekPlek(h, map, d, draai = 0) {
  const probeer = (cx, cy) => {
    const sp = map.findOpenSpawn(cx, cy, SNAP_R);
    const q = sp ? { x: sp.x, y: sp.y } : { x: cx, y: cy };
    const rd = map.nearestRoadPoint ? map.nearestRoadPoint(q.x, q.y, 80, false, true) : null;
    const hoek = rd ? Math.atan2(rd.y - q.y, rd.x - q.x) : h.ang;
    for (const extra of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      if (huisVrij(map, q.x, q.y, hoek + extra, d)) return { ...q, ang: hoek + extra };
    }
    return null;
  };
  for (const r of ZOEK_RINGEN) {
    for (let k = 0; k < (r ? 12 : 1); k++) {
      const a = (k / 12) * Math.PI * 2 + draai;
      const q = probeer(h.x0 + Math.cos(a) * r, h.y0 + Math.sin(a) * r);
      if (q) return q;
    }
  }
  for (const [cx, cy] of droogeKandidaten(h, d).slice(0, 400)) { const q = probeer(cx, cy); if (q) return q; }
  return null;
}
