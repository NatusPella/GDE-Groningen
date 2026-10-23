// Parkeergarages (#418): de pure plattegrond. Geen THREE, geen DOM, geen wereld: alleen getallen, zodat de indeling te testen is
// (scripts/garageplan_test.mjs) en parkeergarage.js haar alleen nog hoeft te bouwen.
//
// Een garage heeft twee delen:
//  - de HAL, een ondergrondse verdieping (vloer FLOOR_Z, plafond CEIL_Z) onder de plek waar de garage in de kaart staat (de omtrek in
//    facilities.js, soort 'garagepark'). Ze bestaat alleen terwijl je erin bent. Lokaal frame: u langs de lange as, 0 bij de uitritwand,
//    v dwars, 0 in het midden.
//  - de POORT, een klein gebouw bovengronds op een vrije plek in de buurt, met de in- en uitrit. Wie erin rijdt of loopt, komt met een korte
//    zwarte overgang in de hal; wie bij de uitrit van de hal komt, staat weer voor de poort. Geen helling en geen sleuf in het terrein.
// Lokaal frame van de poort: a naar buiten (de kant waar de straat ligt), b dwars.
// Een frame is { x, y, angle }: lokaal (p, q) ligt op x + p cos(angle) - q sin(angle), y + p sin(angle) + q cos(angle).

export const FLOOR_Z = -5.0;
export const CEIL_Z = -1.6;      // 3,4 m boven de vloer
// onder deze hoogte tellen de gebouwen boven de hal niet mee (vehicle.js offLevel)
export const HALL_L = 46;
export const HALL_W = 32;
export const BAY_W = 2.6;
export const BAY_D = 5.0;
export const AISLE = 6.0;
export const WALL_T = 0.5;
export const COLUMN = 0.6;
const END = 5.5;                 // vrije strook aan beide korte kanten: de dwarsgangen
const OPENING_W = 7.0;           // de uitrit in de wand u = 0
// rijen van plekken (dwars: v van, tot) met de gangen ertussen: plekken, gang, twee rijen rug aan rug, gang, plekken
const ROWS = [[-16, -11], [-5, 0], [0, 5], [11, 16]];

export const toWorld = (f, p, q) => [f.x + p * Math.cos(f.angle) - q * Math.sin(f.angle), f.y + p * Math.sin(f.angle) + q * Math.cos(f.angle)];
export const toLocal = (f, x, y) => {
  const dx = x - f.x, dy = y - f.y, c = Math.cos(f.angle), s = Math.sin(f.angle);
  return [dx * c + dy * s, -dx * s + dy * c];
};

// De hal in lokale getallen: wanden, uitrit, kolommen, plekken (hoek: de kant waarop een auto staat, in het frame van de hal), lampen, pijlen.
export function hallLayout() {
  const L = HALL_L, W = HALL_W, hw = W / 2;
  const n = Math.floor((L - 2 * END) / BAY_W);
  const u0 = END + (L - 2 * END - n * BAY_W) / 2;
  const bays = [];
  ROWS.forEach(([v0, v1], row) => {
    for (let k = 0; k < n; k++) bays.push({ row, k, u: u0 + (k + 0.5) * BAY_W, v: (v0 + v1) / 2, along: Math.PI / 2, len: BAY_D, wid: BAY_W });
  });
  // kolommen op de scheidingslijnen tussen plekken: elke derde, op de rand van beide gangen en op de rug-aan-rug lijn
  const columns = [];
  for (let k = 0; k <= n; k += 3) for (const v of [-11, -5, 0, 5, 11]) columns.push({ u: u0 + k * BAY_W, v });
  // lampbalken langs het plafond, boven de gangen
  const lights = [];
  for (let u = 4; u < L - 2; u += 6) for (const v of [-8, 8]) lights.push({ u, v, len: 3.2 });
  // pijlen op de vloer van de gangen: de rijrichting is rechts aanhouden (+u in de gang bij v < 0, -u bij v > 0)
  const arrows = [];
  for (let u = END + 3; u < L - END - 2; u += 12) { arrows.push({ u, v: -8, angle: 0 }); arrows.push({ u: u + 6, v: 8, angle: Math.PI }); }
  return {
    L, W, hw, n, u0, bays, columns, lights, arrows,
    // de uitrit: een opening in de wand u = 0, over de breedte OPENING_W
    opening: { v0: -OPENING_W / 2, v1: OPENING_W / 2, h: CEIL_Z - FLOOR_Z - 0.4 },
    // waar je aankomt (voorin de middelste gang), en de zone waarin je naar buiten gaat
    arrive: { u: 5.2, v: -8, angle: 0 },
    exitZone: { u0: 0, u1: 2.2, v0: -OPENING_W / 2 + 0.3, v1: OPENING_W / 2 - 0.3 },
    // de zone van de hal waar de aankomst uit de buurt blijft van de wanden: de gang, voor de plekken van een auto
    rowsV: ROWS,
  };
}

// De poort in lokale getallen (a naar buiten, b dwars): een blok van 11 bij 9 m met aan de buitenkant een opening van 6,4 m.
export const GATE = {
  depth: 9, width: 11, height: 4.2, opening: 6.4, openingH: 3.4, wall: 0.5,
  // de zone achter de opening waarin de overgang begint (binnen de poort, de auto er helemaal in)
  zone: { a0: -3.6, a1: -1.2, b0: -2.9, b1: 2.9 },
  // waar je weer staat na de uitrit: voor de opening, kijkend naar buiten
  out: { a: 4.2, b: -1.6 },
  // vrije ruimte die de plek nodig heeft: de poort zelf en een strook ervoor (waar de auto's en mensen aankomen)
  clearA0: -9, clearA1: 9, clearB: 7,
};

// ---- de plek van de poort -------------------------------------------------------------------------------------------------------------------

// Zoekt een vrije plek voor de poort rond (cx, cy), liefst dicht bij de hal en met de opening naar een straat.
//   free(x, y)        mag er gebouwd worden (geen gebouw, geen water, geen autoweg)
//   roadDir(x, y)     { x, y, dist, angle } het dichtstbijzijnde stuk weg (angle: de richting van de weg) of null
//   opts: { radius, step, maxRoad, penalty(f, probe) }; penalty telt erbij op (bijvoorbeeld voetpaden onder de poort)
// Een generator (elke 60 kandidaten een yield, zodat het spel er een stukje per beeld aan kan werken); planGate loopt hem uit.
// Geeft { x, y, angle, score } met angle de kant waarop de opening wijst (van het gebouw af), of null.
export function* planGateSteps(free, roadDir, cx, cy, opts = {}) {
  const radius = opts.radius || 140, step = opts.step || 3, maxRoad = opts.maxRoad || 60;
  let best = null, count = 0;
  const probe = [];
  for (let a = GATE.clearA0; a <= GATE.clearA1; a += 3) for (let b = -GATE.clearB; b <= GATE.clearB; b += 3) probe.push([a, b]);
  const diff = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));
  for (let dx = -radius; dx <= radius; dx += step) {
    for (let dy = -radius; dy <= radius; dy += step) {
      if (++count % 60 === 0) yield;
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const x = cx + dx, y = cy + dy;
      if (!free(x, y)) continue;
      const road = roadDir(x, y);
      if (!road || road.dist > maxRoad) continue;
      // uitgelijnd op de weg: de richting haaks op de weg die het dichtst bij de kant van de weg ligt
      const toRoad = Math.atan2(road.y - y, road.x - x);
      const n1 = road.angle + Math.PI / 2, n2 = road.angle - Math.PI / 2;
      const angle = diff(n1, toRoad) < diff(n2, toRoad) ? n1 : n2;
      const f = { x, y, angle };
      let ok = true;
      for (const [a, b] of probe) {
        const [px, py] = toWorld(f, a, b);
        if (!free(px, py)) { ok = false; break; }
      }
      if (!ok) continue;
      const score = d + road.dist * 0.6 + (opts.penalty ? opts.penalty(f, probe) : 0);
      if (!best || score < best.score) best = { x, y, angle, score };
    }
  }
  return best;
}

export function planGate(free, roadDir, cx, cy, opts = {}) {
  const it = planGateSteps(free, roadDir, cx, cy, opts);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}

// ---- de auto's in de hal ---------------------------------------------------------------------------------------------------------------------

// Wie er staat: per plek een kans (fill), een model uit `models` en een kant (neus naar de gang of juist achteruit ingeparkeerd).
// rng() geeft [0, 1). Een model dat niet in de plek past (lengte of breedte) komt er niet.
export function carSlots(layout, models, rng, fill = 0.55) {
  const out = [];
  for (const b of layout.bays) {
    if (rng() > fill) continue;
    const fits = models.filter((m) => m.len <= b.len - 0.4 && m.wid <= b.wid - 0.5);
    if (!fits.length) continue;
    const m = fits[Math.floor(rng() * fits.length) % fits.length];
    // een plek in de rij links (v < 0) en rechts (v > 0) van het midden: de neus naar het midden, of de andere kant (een kwart van de auto's)
    const nose = rng() < 0.25 ? -1 : 1;
    const toward = b.v < -10 ? 1 : b.v > 10 ? -1 : b.v < 0 ? -1 : 1;
    out.push({ u: b.u + (rng() - 0.5) * 0.3, v: b.v + (rng() - 0.5) * 0.4, angle: toward > 0 ? (nose > 0 ? Math.PI / 2 : -Math.PI / 2) : (nose > 0 ? -Math.PI / 2 : Math.PI / 2), model: m, row: b.row });
  }
  return out;
}

// Ligt (x, y) in de hal (de binnenkant van de wanden, `pad` m ruimer)?
export function inHall(f, x, y, pad = 0) {
  const [u, v] = toLocal(f, x, y);
  return u >= -pad && u <= HALL_L + pad && Math.abs(v) <= HALL_W / 2 + pad;
}

// Ligt (x, y) in de uitritzone van de hal?
export function inExitZone(layout, f, x, y) {
  const [u, v] = toLocal(f, x, y);
  const z = layout.exitZone;
  return u >= z.u0 && u <= z.u1 && v >= z.v0 && v <= z.v1;
}

// Ligt (x, y) in de ingangszone van de poort?
export function inGateZone(g, x, y) {
  const [a, b] = toLocal(g, x, y);
  return a >= GATE.zone.a0 && a <= GATE.zone.a1 && b >= GATE.zone.b0 && b <= GATE.zone.b1;
}

// Het frame van de hal: de lange as van de omtrek (poly), het midden van de omtrek, u = 0 aan de ene korte kant. Zonder omtrek: `angle` en het punt.
export function hallFrame(poly, point, angleHint = 0) {
  if (!poly || poly.length < 4) return { x: point[0] - Math.cos(angleHint) * HALL_L / 2, y: point[1] - Math.sin(angleHint) * HALL_L / 2, angle: angleHint };
  // de langste zijde bepaalt de richting
  let best = 0, ang = angleHint;
  for (let i = 0; i < poly.length - 1; i++) {
    const L = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
    if (L > best) { best = L; ang = Math.atan2(poly[i + 1][1] - poly[i][1], poly[i + 1][0] - poly[i][0]); }
  }
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of poly) {
    const u = x * ux + y * uy, v = -x * uy + y * ux;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
  const cx = mu * ux - mv * uy, cy = mu * uy + mv * ux;
  return { x: cx - Math.cos(ang) * HALL_L / 2, y: cy - Math.sin(ang) * HALL_L / 2, angle: ang };
}
