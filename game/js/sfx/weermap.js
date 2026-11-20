// Weer en zomerambiance met opnames (#988, ADR 0039): de sturing van de lussen regen_*, wind_gras, zomer_* en de donderslagen donder_*.
// Zuivere getallen, zonder Web Audio (scripts/weer_sfx_test.mjs). sfx/ambience.js past de uitkomst toe op zijn lagen (beds) en
// speelt de donder; ontbreken de opnames, dan blijven de procedurele lagen (bed_rain, bed_roof, bed_wind, thunder_*) de terugval.
// Altijd zomer: er is geen sneeuw of ijs, alleen motregen, bui en plensbui, wind, onweer en een droge warme dag.

export const RAIN_KEYS = ['regen_motregen', 'regen_bui', 'regen_plens'];
export const THUNDER_NEAR = ['donder_dichtbij_0', 'donder_dichtbij_1', 'donder_dichtbij_2'];
export const THUNDER_FAR = ['donder_ver_0', 'donder_ver_1'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function smooth01(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// Regenintensiteit (0 tot 1) naar de drie regenlussen: gelijk-vermogen-kruisfades tussen motregen (piek bij 0,2), bui (0,5) en plensbui (0,85).
// Onder 0,2 komt de motregen uit de stilte op; boven 0,85 klinkt alleen de plensbui. De som van de kwadraten blijft 1 tussen de toppen.
export const RAIN_PEAKS = [0.2, 0.5, 0.85];
export function rainLayers(rain, out = { licht: 0, bui: 0, plens: 0 }) {
  const r = clamp(rain || 0, 0, 1), [a, b, c] = RAIN_PEAKS;
  out.licht = out.bui = out.plens = 0;
  if (r <= 0) return out;
  if (r < a) out.licht = Math.sin((r / a) * Math.PI / 2);
  else if (r < b) { const u = (r - a) / (b - a); out.licht = Math.cos(u * Math.PI / 2); out.bui = Math.sin(u * Math.PI / 2); }
  else if (r < c) { const u = (r - b) / (c - b); out.bui = Math.cos(u * Math.PI / 2); out.plens = Math.sin(u * Math.PI / 2); }
  else out.plens = 1;
  return out;
}

// Doelniveaus van de regenlagen (de lagen hebben dezelfde basis als bed_rain: 0,28 buiten). place: { closed (in een gesloten voertuig), indoors (in de flat) }.
// Binnen (voertuig of flat) klinken de buitenlussen bijna weg en komt het dak of de autoruit ervoor in de plaats.
// Een gesloten voertuig geeft regen_auto, de flat het dak (regen_dak); een open voertuig (fiets, step, boot) klinkt als buiten.
export function rainTargets(rain, place = {}, paused = 1, out = {}) {
  const w = rainLayers(rain), r = clamp(rain || 0, 0, 1);
  const dicht = !!(place.closed || place.indoors);
  const buiten = dicht ? 0.1 : 1;
  out.licht = w.licht * 0.26 * buiten * paused;
  out.bui = w.bui * 0.28 * buiten * paused;
  out.plens = w.plens * 0.3 * buiten * paused;
  out.auto = place.closed ? r * 0.34 * paused : 0;
  out.dak = !place.closed && place.indoors ? r * 0.32 * paused : 0;
  return out;
}

// De zomerlagen: vogels overdag waar groen of bomen zijn, vogels in de stad, insecten op warme dagen op open en groen land. Regen en een gesloten
// voertuig dempen ze. hour: 0 tot 24; place: { green, trees, density, rural, open }; cabin: 1 buiten, 0,45 in een gesloten voertuig.
export function summerTargets(hour, rain, place = {}, cabin = 1, paused = 1, out = {}) {
  const dag = smooth01(5, 8, hour) * (1 - smooth01(19.5, 22, hour));
  const warm = smooth01(9.5, 12.5, hour) * (1 - smooth01(20, 23, hour));
  const droog = 1 - clamp(rain || 0, 0, 1);
  const groen = Math.max(place.green || 0, (place.trees || 0) * 0.8);
  out.vogels = dag * groen * 0.3 * droog * cabin * paused;
  out.stadsvogels = dag * clamp((place.density || 0) * 1.2, 0, 1) * (1 - groen) * (1 - (place.rural || 0)) * 0.22 * droog * cabin * paused;
  out.insecten = warm * Math.max(groen, (place.open || 0) * 0.6, (place.rural || 0) * 0.7) * 0.14 * droog * cabin * paused;
  return out;
}

// Een donderslag op afstand (m): welk bestand, hoeveel vertraging (geluid doet 343 m/s), hoe hard, hoe dof en welke toonhoogte.
// r1 en r2: toevalsgetallen (variant en toonhoogte). place.closed of place.indoors: binnen is het gedempt en zachter.
export function thunderPick(distance, r1 = Math.random(), r2 = Math.random(), place = {}) {
  const near = distance < 900;
  const lijst = near ? THUNDER_NEAR : THUNDER_FAR;
  const dicht = !!(place.closed || place.indoors);
  return {
    key: lijst[Math.floor(r1 * lijst.length) % lijst.length],
    delay: clamp(distance / 343, 0.3, 7),
    gain: (near ? clamp(0.95 - distance / 2400, 0.5, 0.95) : clamp(0.8 - distance / 9000, 0.4, 0.7)) * (dicht ? 0.6 : 1),
    lp: clamp(9000 - distance * 1.6, 1400, 9000) * (dicht ? 0.35 : 1),
    rate: near ? 0.94 + r2 * 0.1 : 0.88 + r2 * 0.14,
    near,
  };
}
