// De echte rit (#882 taxi, #926 trein): de pure kant. De speler zit als passagier in een echte taxi of trein
// die door de echte wereld rijdt naar het doel op de kaart. Een lange reis hoeft niet realtime: het begin en
// het einde rijden echt (met gewoon streamen), het midden is een korte tijdsprong ("een kwartier later") en de
// klok van het spel loopt mee. Dit bestand rekent alleen: het tijdsplan, de stand per moment, de klok, de
// tekst van de sprong, de camera op de achterbank en het spoor van de trein. Geen DOM, geen THREE: de wereldlaag
// (reisrit3d.js) tekent het en scripts/ritpad_test.mjs speelt het na.

export const RIT = {
  openS: 9,          // het echte begin, in seconden
  sluitS: 9,         // het echte einde
  houdS: 1.8,        // het zwarte midden met de kloktekst
  fadeS: 1.2,        // zacht uit- en inblenden rond de sprong
  aankomstS: 1.4,    // blijft nog even staan bij de bestemming
  korteMaxS: 36,     // een rit die zo kort is, rijd je helemaal
  korteMinS: 8,
  minSprongM: 250,   // minder dan dit overslaan heeft geen zin: dan helemaal rijden
  snelheid: { taxi: 15, trein: 22 },     // m/s tijdens de echte stukken
  maxSnelheid: { taxi: 26, trein: 26 },  // m/s als een korte rit toch helemaal gereden wordt
  skipGuardS: 0.6,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
// begin: rolt weg uit stilstand en eindigt op kruissnelheid; einde: begint op kruissnelheid en remt tot stilstand
const gEind = (u) => u + u * u - u * u * u;
const gEindV = (u) => 1 + 2 * u - 3 * u * u;
const fBegin = (u) => 1 - gEind(1 - u);
const fBeginV = (u) => gEindV(1 - u);
const hAlles = (u) => u * u * (3 - 2 * u);
const hAllesV = (u) => 6 * u * (1 - u);

// Het tijdsplan voor een rit van lengthM meter. etaS is de echte reistijd (de klok loopt die door).
export function ritTijdplan(lengthM, { mode = 'taxi', etaS = 0 } = {}) {
  const soort = mode === 'trein' ? 'trein' : 'taxi';
  const L = Number.isFinite(lengthM) && lengthM > 0 ? lengthM : 0;
  const v = RIT.snelheid[soort], vMax = RIT.maxSnelheid[soort];
  const clockMin = Math.max(1, Math.round((Number.isFinite(etaS) && etaS > 0 ? etaS : L / v) / 60));
  const kort = L <= vMax * RIT.korteMaxS;
  const basis = { mode: soort, lengthM: L, v, clockMin, aankomstS: RIT.aankomstS, kort };
  if (kort) {
    const vv = clamp(L / 30, v, vMax);
    const rijS = Math.max(RIT.korteMinS, L / vv);
    return { ...basis, rijS, openS: rijS, houdS: 0, sluitS: 0, daM: L, dcM: 0, sprongM: 0, totaalS: rijS + RIT.aankomstS };
  }
  const daM = v * RIT.openS, dcM = v * RIT.sluitS;
  return {
    ...basis, rijS: RIT.openS + RIT.houdS + RIT.sluitS, openS: RIT.openS, houdS: RIT.houdS, sluitS: RIT.sluitS,
    daM, dcM, sprongM: Math.max(0, L - daM - dcM),
    totaalS: RIT.openS + RIT.houdS + RIT.sluitS + RIT.aankomstS,
  };
}

// "Een kwartier later": de tekst bij de tijdsprong. Afgerond op vijf minuten.
export function klokTekst(minuten) {
  const m0 = Math.max(0, Math.round(Number.isFinite(minuten) ? minuten : 0));
  if (m0 < 3) return 'Even later';
  const m = m0 >= 10 ? Math.round(m0 / 5) * 5 : m0;
  if (m < 10) return `${m} minuten later`;
  if (m === 15) return 'Een kwartier later';
  if (m === 30) return 'Een half uur later';
  if (m === 45) return 'Drie kwartier later';
  if (m < 60) return `${m} minuten later`;
  if (m === 60) return 'Een uur later';
  if (m === 90) return 'Anderhalf uur later';
  const u = Math.floor(m / 60), rest = m % 60;
  const uren = u === 1 ? 'Een uur' : `${u} uur`;
  return rest < 10 ? `${uren} later` : `${uren} en ${rest} minuten later`;
}

// "14:05" uit een klokuur (0..24)
export function klokLabel(uur) {
  const h = ((Number.isFinite(uur) ? uur : 0) % 24 + 24) % 24;
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// De stand op tijd t: waar langs het pad (s, in meters vanaf de start), hoe snel, hoe zwart het beeld is en
// hoeveel speltijd er al voorbij is. fase: rijden (korte rit) | open | sprong | sluit | aankomst.
export function ritStand(plan, t) {
  const tt = clamp(Number.isFinite(t) ? t : 0, 0, plan.totaalS);
  const L = plan.lengthM || 1;
  const min = (s) => plan.clockMin * clamp(s / L, 0, 1);
  const uit = (o) => ({ t: tt, u: plan.totaalS > 0 ? tt / plan.totaalS : 1, sprongTekst: '', ...o });
  if (plan.kort) {
    if (tt >= plan.rijS) return uit({ fase: 'aankomst', s: L, v: 0, fade: 0, minuten: plan.clockMin });
    const u = tt / plan.rijS;
    return uit({ fase: 'rijden', s: L * hAlles(u), v: (L / plan.rijS) * hAllesV(u), fade: 0, minuten: min(L * hAlles(u)) });
  }
  const A = plan.openS, H = plan.houdS, C = plan.sluitS, F = RIT.fadeS;
  const sprongMin = plan.clockMin * (plan.sprongM / L);
  if (tt < A) {
    const x = tt / A, s = plan.daM * fBegin(x);
    return uit({ fase: 'open', s, v: (plan.daM / A) * fBeginV(x), fade: tt > A - F ? smooth((tt - (A - F)) / F) : 0, minuten: min(s) });
  }
  if (tt < A + H) {
    const q = (tt - A) / H;
    const sKlok = plan.daM + (L - plan.dcM - plan.daM) * smooth(q);
    return uit({ fase: 'sprong', s: q < 0.5 ? plan.daM : L - plan.dcM, v: 0, fade: 1, minuten: min(sKlok), sprongTekst: klokTekst(sprongMin), sprongMin });
  }
  if (tt < A + H + C) {
    const x = (tt - A - H) / C, s = L - plan.dcM + plan.dcM * gEind(x);
    return uit({ fase: 'sluit', s, v: (plan.dcM / C) * gEindV(x), fade: tt - A - H < F ? 1 - smooth((tt - A - H) / F) : 0, minuten: min(s) });
  }
  return uit({ fase: 'aankomst', s: L, v: 0, fade: 0, minuten: plan.clockMin });
}

// Skippen met Spatie: niet in de eerste momenten (per ongeluk ingedrukt), en nooit twee keer.
export const magSkippen = (t, klaar) => !klaar && t >= RIT.skipGuardS;

// ---- de taxi: het pad en de camera -----------------------------------------------------------------------

// Rechts rijden: het pad een stukje naar rechts van de rijrichting (a in radialen op de kaart, +y naar beneden:
// rechts is (-sin a, cos a), zoals vehicle-local +z in carinterior.js).
export function rechterBaan(q, afstand = 1.3) {
  return { x: q.x - Math.sin(q.a) * afstand, y: q.y + Math.cos(q.a) * afstand, a: q.a };
}

// Het oog van de passagier: op de bijrijdersstoel, naast de bestuurder. eye = interiorEyePose(taxi): het oog van de
// bestuurder in kaartcoördinaten { x, y, z, fx, fy } (z is de hoogte); taxi = { x, y }. Het oog zit op dezelfde hoogte en
// lengte, aan de andere kant van het midden. Op de achterbank (eerst 1,05 m achter de bestuurder) stond de rugleuning van
// de voorstoel 0,56 m voor de lens en vulde het hele beeld (beeldcheck #882): voorin kijk je door de voorruit.
export function bijrijdersOog(eye, taxi, { zijwaarts = 0.4 } = {}) {
  if (!eye || !taxi) return null;
  const rx = -eye.fy, ry = eye.fx;
  const dz = (eye.x - taxi.x) * rx + (eye.y - taxi.y) * ry; // zijwaarts van het midden; de bestuurder zit links of rechts
  const zij = Math.abs(dz) < 0.2 ? zijwaarts : -dz;
  return { x: eye.x + rx * (zij - dz), y: eye.y + ry * (zij - dz), z: eye.z, fx: eye.fx, fy: eye.fy };
}

// Zachte hoofdbeweging van een passagier: een lichte deining en af en toe een blik uit het raam rechts.
// yaw > 0 is naar rechts, pitch < 0 omlaag (radialen).
export function kijkHoek(t) {
  const blik = Math.max(0, Math.sin(t * 0.33 - 0.6));
  const raam = blik * blik * blik * 0.75;
  return {
    yaw: 0.07 * Math.sin(t * 0.9) + 0.05 * Math.sin(t * 0.37 + 1) + raam,
    pitch: -0.06 + 0.02 * Math.sin(t * 0.7 + 0.5) - raam * 0.05,
  };
}

// De camera van de taxi: oog + kijkpunt (30 m verderop) in kaartcoördinaten. hoek = a van de taxi.
export function taxiCamera(oog, t, kijkAfstand = 30) {
  const { yaw, pitch } = kijkHoek(t);
  const fx = oog.fx, fy = oog.fy, rx = -fy, ry = fx;
  const dx = fx * Math.cos(yaw) + rx * Math.sin(yaw), dy = fy * Math.cos(yaw) + ry * Math.sin(yaw);
  return {
    position: { x: oog.x, y: oog.y, z: oog.z },
    lookAt: { x: oog.x + dx * kijkAfstand, y: oog.y + dy * kijkAfstand, z: oog.z + Math.tan(pitch) * kijkAfstand },
    fov: 68,
  };
}

// ---- de trein: het spoor en de camera --------------------------------------------------------------------

function projecteer(route, x, y) {
  const { pts, s } = route;
  let best = Infinity, at = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay;
    const l2 = dx * dx + dy * dy || 1;
    const k = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const d2 = (ax + dx * k - x) ** 2 + (ay + dy * k - y) ** 2;
    if (d2 < best) { best = d2; at = s[i - 1] + (s[i] - s[i - 1]) * k; }
  }
  return { s: at, d: Math.sqrt(best) };
}

export const SPOOR_MAX_AFSTAND_M = 40;

// Eén treinstuk (een leg uit planTrainTrip) op een spoor van de wereld. leg: { line, pts, length }; routes: de
// spoorroutes van railway.js ({ name, pts, s, len, train }). null als het spoor er niet bij te vinden is.
export function treinStuk(leg, routes) {
  if (!leg || !Array.isArray(leg.pts) || leg.pts.length < 2 || !Array.isArray(routes)) return null;
  const a = leg.pts[0], b = leg.pts[leg.pts.length - 1];
  let best = null;
  for (const r of routes) {
    if (!r || !r.pts || r.pts.length < 2 || !r.s) continue;
    const pa = projecteer(r, a[0], a[1]), pb = projecteer(r, b[0], b[1]);
    const d = Math.max(pa.d, pb.d);
    if (d > SPOOR_MAX_AFSTAND_M) continue;
    const eigen = leg.line && r.name === leg.line ? -1 : 0; // dezelfde lijn gaat voor
    const score = d + eigen * 1000;
    if (!best || score < best.score) best = { score, route: r, s0: pa.s, s1: pb.s };
  }
  if (!best) return null;
  const len = Math.abs(best.s1 - best.s0);
  if (len < 100) return null;
  return { route: best.route, naam: best.route.name, type: best.route.train || 'gtw', s0: best.s0, s1: best.s1, dir: Math.sign(best.s1 - best.s0) || 1, len };
}

// De stukken van een treinreis: het eerste treinstuk voor het echte begin, het laatste voor het echte einde.
// Eén treinstuk is het hele pad; bij een overstap zijn het twee spoorlijnen en is de lengte de som.
// -> { A, C, lengthM, enkel } of null (dan de oude scène).
export function treinStukken(legs, routes) {
  const t = (Array.isArray(legs) ? legs : []).filter((l) => l && l.kind === 'train');
  if (!t.length) return null;
  const A = treinStuk(t[0], routes), C = t.length === 1 ? A : treinStuk(t[t.length - 1], routes);
  if (!A || !C) return null;
  const lengthM = t.length === 1 ? A.len : t.reduce((n, l) => n + (l.length || 0), 0);
  return { A, C, lengthM, enkel: t.length === 1 };
}

// Waar op het spoor de trein staat na `afstand` meter van het begin van het stuk.
export const spoorBoog = (stuk, afstand) => clamp(stuk.s0 + stuk.dir * afstand, 0, stuk.route.len);

// Camera bij de trein. car = { x, y, angle, z } (het midden van de trein), dir = rijrichting (+1 of -1; angle is
// de richting van het spoor in toenemende boog), view: 'raam' (bij het raam, uitkijkend en een stukje vooruit) of
// 'zij' (naast de trein, de hele trein in de polder).
export function treinCamera(car, dir, view) {
  const fx = Math.cos(car.angle) * dir, fy = Math.sin(car.angle) * dir, nx = -fy, ny = fx, z0 = car.z || 0;
  if (view === 'zij') {
    return { position: { x: car.x + nx * 18 - fx * 16, y: car.y + ny * 18 - fy * 16, z: z0 + 6 }, lookAt: { x: car.x + fx * 10, y: car.y + fy * 10, z: z0 + 2 }, fov: 52 };
  }
  return { position: { x: car.x + nx * 1.9 - fx * 2, y: car.y + ny * 1.9 - fy * 2, z: z0 + 2.5 }, lookAt: { x: car.x + nx * 40 + fx * 22, y: car.y + ny * 40 + fy * 22, z: z0 + 1.6 }, fov: 62 };
}

// Welk beeld hoort bij welk moment: de eerste en de laatste paar seconden naast de trein (je ziet hem wegrijden
// en binnenrollen), de rest bij het raam.
export const ZIJ_S = 3.5;
export function treinBeeld(plan, stand) {
  if (stand.fase === 'rijden' || stand.fase === 'aankomst') {
    if (plan.kort) return stand.fase === 'aankomst' || stand.t > plan.rijS - ZIJ_S || stand.t < ZIJ_S ? 'zij' : 'raam';
    return 'zij';
  }
  if (stand.fase === 'open') return stand.t < ZIJ_S ? 'zij' : 'raam';
  if (stand.fase === 'sluit') return stand.t > plan.openS + plan.houdS + plan.sluitS - ZIJ_S ? 'zij' : 'raam';
  return 'raam';
}

// ---- terugval en samenspelen -----------------------------------------------------------------------------

// Wat de rit nodig heeft om echt te rijden. Ontbreekt er iets, dan blijft de oude korte scène (reisrit.js).
// pad: de punten van de autoroute, of null. Taxi: een pad van minstens 30 m; trein: de stukken.
export function ritKanEcht(mode, { pad = null, stukken = null } = {}) {
  if (mode === 'taxi') {
    if (!Array.isArray(pad) || pad.length < 2) return false;
    let l = 0;
    for (let i = 1; i < pad.length; i++) l += Math.hypot(pad[i][0] - pad[i - 1][0], pad[i][1] - pad[i - 1][1]);
    return l >= 30 && pad.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }
  if (mode === 'trein') return !!(stukken && stukken.A && stukken.C && stukken.lengthM > 200);
  return false;
}

// Samen spelen (#452): de rit is een eigen scène voor wie hem rijdt; de wereld van de anderen loopt door. De klok
// springt alleen als jij alleen speelt (klokSprongMag in coopgroep.js); anders zegt de sprongtekst alleen "Even later".
export const sprongTekstVoor = (stand, klokMag) => (klokMag ? stand.sprongTekst : 'Even later');
