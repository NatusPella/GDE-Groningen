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

// Safehouse in een bestaand pand (#458): liever een woonhuis of woonflat uit de gebouwenlaag dan een los huisje. Alleen echt woongenbruik
// (geen schuur, kerk, winkel of kantoor), niet te klein of te groot, geen beschermd pand en niet het huis van een missie (d.verboden).
export const WOONTYPES = ['house', 'apartments', 'residential', 'dormitory', 'bungalow'];
export const PAND_MIN = 4.5;   // m: de kortste zijde van de footprint
export const PAND_MAX = 34;    // m: de langste zijde (een flatgebouw mag, een hal niet)
export const PAND_RINGEN = [45, 90, 150, 220, 320, 450, 650, 900];
export const DEUR_MARGE = 0.8; // m van de gevel tot de plek bij de deur

// Droog land: binnen het land van de provincie (niet de Eems of de Waddenzee), niet in het water en ook geen water vlak ernaast (de kade).
export const droog = (map, x, y, d) => d.provinceLandAt(x, y) && !d.isInWater(map, x, y) && ![[6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dy]) => d.isInWater(map, x + dx, y + dy));

// Wat de spotcheck voor een looppunt eist, zonder het weglopen: een punt buiten de gebouwen (een doorgang mag), niet in het water en geen
// erf op het platteland. De dure floodfill van canWalkOut komt pas als een punt dit haalt.
export function vrijPunt(map, x, y, d) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || d.isInWater(map, x, y)) return false;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy || !d.pointInPolygon(x, y, b.pts)) continue;
    if (d.inPassage(map, b, x, y)) continue;
    return false;
  }
  if (d.landSolid && d.landSolid(x, y)) return false;
  return true;
}

// Een looppunt als in de spotcheck: vrij en je kunt er weg lopen.
export function bruikbaar(map, x, y, d) {
  return vrijPunt(map, x, y, d) && !!map.canWalkOut(x, y, STAND_REACH);
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

// --- een bestaand pand (#458) ---------------------------------------------------------------------------------------

// De georiënteerde doos van een footprint, net als tileplace.js boxOf (dat bestand laadt het spel, dit moet puur blijven voor de test).
export function pandBox(b) {
  const P = b.pts;
  let best = 0, a = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (L > best) { best = L; a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); }
  }
  const c = Math.cos(a), s = Math.sin(a);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of P) {
    const u = x * c + y * s, v = -x * s + y * c;
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  return { x: cu * c - cv * s, y: cu * s + cv * c, w: u1 - u0, l: v1 - v0, a };
}

// Mag dit pand een safehouse zijn? Een woonbestemming, niet te klein of te groot, geen landmark en niets wat de wereld al gebruikt
// (d.verboden: het huis van Tammo, een interieur, een missiehuis).
export function pandGeschikt(b, d = {}) {
  if (!b || !b.pts || b.pts.length < 3 || !b.bounds) return false;
  if (b.landmark || (d.verboden && d.verboden(b))) return false;
  if (!WOONTYPES.includes(b.type)) return false;
  const q = pandBox(b);
  if (!(q.w >= PAND_MIN && q.l >= PAND_MIN && q.w <= PAND_MAX && q.l <= PAND_MAX)) return false;
  return b.h >= 1;
}

// De deur van een bestaand pand, aan de kant van de weg: een punt op de gevel dat het dichtst bij (tx, ty) ligt, met de naar buiten
// wijzende normaal. We lopen de gevel in stapjes van een meter af, want een deur op een hoek of achter een boom is onbereikbaar.
// Geeft { x, y, ang } (de plek bij de deur) of null.
export function pandDeur(b, tx, ty, map, d) {
  const P = b.pts;
  const kandidaten = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    if (L < 1) continue;
    // de normaal die van het pand af wijst
    let nx = dy / L, ny = -dx / L;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    if (d.pointInPolygon(mx + nx * 0.05, my + ny * 0.05, P)) { nx = -nx; ny = -ny; }
    const n = Math.max(1, Math.round(L));
    for (let k = 0; k <= n; k++) {
      const x = ax + (dx * k) / n, y = ay + (dy * k) / n;
      kandidaten.push({ x: x + nx * DEUR_MARGE, y: y + ny * DEUR_MARGE, nx, ny, d2: (x - tx) ** 2 + (y - ty) ** 2 });
    }
  }
  kandidaten.sort((p, q) => p.d2 - q.d2);
  let vrij = 0;
  for (const c of kandidaten) {
    if (!droog(map, c.x, c.y, d) || opRijweg(map, c.x, c.y) || !vrijPunt(map, c.x, c.y, d)) continue;
    if (++vrij > 8) break;
    if (!map.canWalkOut(c.x, c.y, STAND_REACH)) continue;
    return { x: c.x, y: c.y, ang: Math.atan2(c.ny, c.nx) };
  }
  return null;
}

// Kies een bestaand pand voor een gebied: in ringen om het binnenpunt het dichtstbijzijnde woonpand waar een deur aan de straatkant
// bereikbaar is. `bezet` houdt bij welke panden al een safehouse hebben, zodat twee gebieden nooit hetzelfde pand krijgen. Geeft
// { x, y, ang, deur, pand } of null (dan volgt het losse huisje van zoekPlek).
export function kiesPand(h, map, d, bezet = null) {
  if (!map.buildingsNear || !h.grens) return null;
  const gezien = new Set();
  for (const r of PAND_RINGEN) {
    const kandidaten = [];
    for (const b of map.buildingsNear(h.x0, h.y0, r + 60)) {
      if (gezien.has(b)) continue;
      gezien.add(b);
      if (!pandGeschikt(b, d) || (bezet && bezet.has(b))) continue;
      const q = pandBox(b);
      const dist = Math.hypot(q.x - h.x0, q.y - h.y0);
      if (dist > r) continue;
      if (!d.puntInGebied(h.grens, q.x, q.y) && dist > 120) continue;
      kandidaten.push({ b, q, dist });
    }
    kandidaten.sort((p, q) => p.dist - q.dist || String(p.b.osm).localeCompare(String(q.b.osm)));
    for (const k of kandidaten.slice(0, 40)) {
      const rd = map.nearestRoadPoint ? map.nearestRoadPoint(k.q.x, k.q.y, 90, false, true) : null;
      if (!rd) continue;
      const deur = pandDeur(k.b, rd.x, rd.y, map, d);
      if (!deur) continue;
      return { x: k.q.x, y: k.q.y, ang: deur.ang, deur: { x: deur.x, y: deur.y }, pand: k.b, verdiepingen: Math.max(1, Math.round(k.b.h || 1)), lift: false, soort: 'pand' };
    }
  }
  return null;
}

// Waar het safehouse komt: eerst een bestaand pand (#458), anders het losse huisje van zoekPlek (#414). Beide geven { x, y, ang, deur }
// en soort; het pand zelf zit er alleen bij als het een bestaand pand is.
export function plaatsSafehuis(h, map, d, bezet = null, draai = 0) {
  const pand = kiesPand(h, map, d, bezet);
  if (pand) return pand;
  if (!map.findOpenSpawn) return null;
  const q = zoekPlek(h, map, d, draai);
  return q ? { ...q, deur: deurVan(q.x, q.y, q.ang), soort: 'huisje' } : null;
}

// --- de kamer van een pand (#458) -------------------------------------------------------------------------------------
//
// Een eigen safehouse in een bestaand pand heeft één kamer achter de voordeur, op de eerste verdieping (boven de
// gebouwenbotsing van de straat, die alles boven 4 m laat gaan). Deze getallen zijn puur, zodat safehuisplek_test ze op de
// echte stadspanden kan controleren: de kamer past binnen het pand en de meubels staan de deur niet in de weg.
export const KAMER_MIN = 3.0, KAMER_MAX = 4.4, KAMER_RAND = 1.2, KAMER_FLOOR = 4.2;

// De maat van de kamer: het kleinste vak van het pand min een rand, met een onder- en bovengrens.
export function kamerMaat(box) {
  const maat = box ? Math.min(box.w, box.l) - KAMER_RAND : KAMER_MAX;
  return Math.round(Math.max(KAMER_MIN, Math.min(KAMER_MAX, maat)) * 10) / 10;
}

// De indeling in het frame van de kamer (x langs de gevel, z naar binnen, de oorsprong op de gevel bij de deur): het bed
// tegen de achterwand, de kast links, het keukenblok rechts, een tafel bij de deur.
export function kamerSpots(s) {
  return {
    binnen: { x: 1.7, z: 0.9 }, deur: { x: 1.7, z: 0.7 },
    bed: { x: s / 2 + 0.15, z: s - 0.55 },
    kast: { x: 0.33, z: s - 1.75 },
    keuken: { x: s - 0.33, z: s - 1.75 },
    tafel: { x: s / 2, z: 1.35 },
  };
}

// De meubels als vaste blokken [x0, z0, x1, z1], net als flat.solids van home.js.
export function kamerSolids(sp) {
  return [
    [sp.bed.x - 0.95, sp.bed.z - 0.45, sp.bed.x + 0.95, sp.bed.z + 0.45],
    [sp.kast.x - 0.28, sp.kast.z - 0.65, sp.kast.x + 0.28, sp.kast.z + 0.65],
    [sp.keuken.x - 0.28, sp.keuken.z - 0.7, sp.keuken.x + 0.28, sp.keuken.z + 0.7],
    [sp.tafel.x - 0.35, sp.tafel.z - 0.25, sp.tafel.x + 0.35, sp.tafel.z + 0.25],
  ];
}
