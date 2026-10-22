// Scheepswerf De Kielhaal (#398): af en toe wordt hier een zeeschip te water gelaten. Puur en zonder wereld:
// de plek, de tijdlijn van het schip (wachten, over de helling glijden, tippen, het water in, uitwiegen), de golf
// die over de kade slaat en wat die met iemand op de kade doet (wegduwen, nooit het water in, nooit leed).
// De wereldlaag (werflive.js) en het beeld (werf3d.js) vragen hier alleen "waar staat het schip op tijd u" en
// "wat betekent de golf op punt (x, y) op tijd u". Verzonnen werf, verzonnen schepen; de plek is echt: een kade bij
// het brede water van de Reitdiep-monding bij Zoutkamp (op de tegels gecontroleerd door scripts/werf_wereld_test.mjs). Tests: scripts/werf_test.mjs.
//
// Het assenstelsel van de werf: K is het punt op de kade, n de eenheidsrichting naar het water, t langs de kade.
// q = meters landinwaarts vanaf de kade (positief op het land, negatief op het water), l = meters langs de kade.

export const WERF = {
  id: 'werf-kielhaal',
  naam: 'Scheepswerf De Kielhaal',
  plaats: 'Zoutkamp',
  kade: { x: -18261, y: -12382 },
  water: { x: 0.7576, y: -0.6527 }, // eenheidsrichting naar het water (naar het zuidoosten)
  hub: 'Waddenzee bij Lauwersoog', // het vaarnet-knooppunt waar het schip heen vaart (vaarnet.json hubs)
};

// De tewaterlatingen staan in de agenda van evenementen.js (soort 'tewaterlating'); dit is het uur waarop het schip loskomt.
export const LANCEERUUR = 15;
// Wie te laat komt ziet het schip niet meer: een uur na de lancering is de helling leeg en is het schip weg.
export const LANCEER_NAVENSTER_UUR = 0.6;
// Binnen deze afstand (m) van de helling begint de lancering; verder weg wacht het schip op de helling.
export const START_AFSTAND = 330;

const UNIT = (() => { const L = Math.hypot(WERF.water.x, WERF.water.y); return { x: WERF.water.x / L, y: WERF.water.y / L }; })();
export const N = UNIT;                                  // naar het water
export const T = { x: -UNIT.y, y: UNIT.x };             // langs de kade
export const KOERS = Math.atan2(UNIT.y, UNIT.x) - Math.PI / 2; // de koers van het schip: de stuurboordkant (+z) kijkt naar het water

// werf-assen -> wereld en terug
export const naarWereld = (l, q) => ({ x: WERF.kade.x + T.x * l - N.x * q, y: WERF.kade.y + T.y * l - N.y * q });
export function naarWerf(x, y) {
  const dx = x - WERF.kade.x, dy = y - WERF.kade.y;
  return { l: dx * T.x + dy * T.y, q: -(dx * N.x + dy * N.y) };
}

// Het hart van het evenement: 85 m landinwaarts, achter het hek (de menigte staat dus buiten de golf, buitenGolf), in graden voor de agenda.
export const HART_Q = 85;

// --- het schip ---------------------------------------------------------------------------

export const SCHIP = {
  model: 'zeeNieuw',          // BOAT_KINDS (boattypes.js)
  lengte: 90, breedte: 13.6,
  naam: 'MS Wadmeeuw',     // verzonnen
  kiel: 4.1,                  // m onder de waterlijn
};

export const HELLING = { lengte: 28, helling: 0.02, bok: 0.6 }; // m landinwaarts, m hoogte per m (laag: wie op de helling staat zit niet in het beton), m hoogte van de slede
export const WATERVLAK = -2.3;                                   // WATER_Y (util.js): de kade ligt 2,3 m hoger
export const KADE_HOOGTE = 0;

// De tijdlijn in seconden sinds het begin van de lancering.
export const TIJD = {
  wacht: 5,        // de sirene gaat, het schip staat nog
  glijA: 1.2,      // m/s2 versnelling over de helling
  startQ: 20,      // m landinwaarts van het hart van het schip aan het begin
  randQ: SCHIP.breedte / 2, // het hart ligt zo ver landinwaarts als de rand van de romp bij de kade is
  tip: 1.7,        // s van de rand tot de plons
  rolMax: 0.49,    // rad (28 graden) naar het water
  eindQ: -19,      // m: het schip drijft hier tot rust (6 m uit de kade, ook waar de oever uitbuigt)
  uitwieg: 20,     // s tot het schip rustig ligt
};

const glijTijd = Math.sqrt((2 * (TIJD.startQ - TIJD.randQ)) / TIJD.glijA);
export const T_RAND = TIJD.wacht + glijTijd;                    // de rand van de romp bij de kade
const V_RAND = TIJD.glijA * glijTijd;
export const T_PLONS = T_RAND + TIJD.tip;                       // de romp slaat op het water
export const T_RUST = T_PLONS + TIJD.uitwieg;
export const T_GOLF_EINDE = T_PLONS + 16;                       // daarna is de kade droog

export const hoogteOpHelling = (q) => (KADE_HOOGTE - WATERVLAK) + HELLING.helling * Math.max(0, Math.min(HELLING.lengte, q)) + HELLING.bok + SCHIP.kiel;

// Waar het schip staat op tijd u: { q, l, rol, stamp, dy (m boven het wateroppervlak), fase }
// fase: 'wacht' | 'glijdt' | 'valt' | 'drijft' | 'rust'
export function schipOp(u) {
  const v = u - TIJD.wacht;
  if (u < TIJD.wacht) return { q: TIJD.startQ, rol: 0, stamp: 0, dy: hoogteOpHelling(TIJD.startQ), fase: 'wacht', snelheid: 0 };
  if (u < T_RAND) {
    const q = TIJD.startQ - 0.5 * TIJD.glijA * v * v;
    return { q, rol: 0, stamp: 0, dy: hoogteOpHelling(q), fase: 'glijdt', snelheid: TIJD.glijA * v };
  }
  if (u < T_PLONS) {
    const w = u - T_RAND, f = w / TIJD.tip;
    const q = TIJD.randQ - (V_RAND * w - 0.5 * 1.1 * w * w);
    const val = Math.max(0, w - 0.3);
    const dy = Math.max(0, hoogteOpHelling(TIJD.randQ) - 4.0 * val * val);
    return { q, rol: TIJD.rolMax * f * f, stamp: -0.04 * f, dy, fase: 'valt', snelheid: V_RAND - 1.1 * w };
  }
  const x = u - T_PLONS;
  const q = TIJD.eindQ + (TIJD.randQ - V_RAND * TIJD.tip + 0.5 * 1.1 * TIJD.tip * TIJD.tip - TIJD.eindQ) * Math.exp(-x / 3.4);
  const rol = TIJD.rolMax * Math.exp(-0.32 * x) * Math.cos((2 * Math.PI * x) / 5.6);
  const dy = 1.6 * Math.exp(-0.55 * x) * Math.sin((2 * Math.PI * x) / 3.0);
  const stamp = 0.05 * Math.exp(-0.4 * x) * Math.sin((2 * Math.PI * x) / 4.2);
  return { q, rol, stamp, dy, fase: u >= T_RUST ? 'rust' : 'drijft', snelheid: Math.abs(q - TIJD.eindQ) * 0.3 };
}

// --- de golf -----------------------------------------------------------------------------

export const GOLF = {
  reik: 75,        // m landinwaarts waar de golf nog te merken is
  breed: 52,       // m langs de kade, vanaf het midden van het schip, waar de golf vol staat
  uitloop: 30,     // m waarover de golf aan de zijkanten uitdooft
  hoogte: 2.6,     // m diepte van de watertong aan de kade
  snelheid: 16,    // m/s van de golffront landinwaarts (x^0,85)
  duw: 11,         // m/s landwaartse duw op wie door het front gaat
  duwMax: 12,
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const glad = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

// Waar het front van de golf is x seconden na de plons (m landinwaarts van de kade).
export const frontOp = (x) => (x <= 0 ? 0 : GOLF.snelheid * Math.pow(x, 0.85));

// Hoe sterk de golf aan de kant ligt (0 buiten de strook, 1 midden): l = meters langs de kade vanaf het midden van het schip.
export const zijfactor = (l) => 1 - glad((Math.abs(l) - GOLF.breed) / GOLF.uitloop);

// De diepte (m) van het water dat over de kade is gespoeld op werfpunt (q, l), x seconden na de plons.
export function golfDiepte(q, l, x) {
  if (x <= 0 || q < 0 || q > GOLF.reik) return 0;
  const aanloop = glad((frontOp(x) - q) / 9);
  if (aanloop <= 0) return 0;
  const weg = Math.exp(-0.2 * x);
  const afloop = 1 - glad((x - 9 - q / 18) / 6); // het water loopt terug de basin in
  return GOLF.hoogte * Math.exp(-q / 30) * aanloop * weg * afloop * zijfactor(l);
}

// De landwaartse duw (m/s) op werfpunt (q, l): alleen waar het front net langskomt, nooit richting het water.
export function golfDuw(q, l, x) {
  if (x <= 0 || q < 0 || q > GOLF.reik) return 0;
  const afstand = frontOp(x) - q;
  if (afstand < -2 || afstand > 22) return 0;
  const band = Math.exp(-(((afstand - 6) / 9) ** 2));
  return Math.min(GOLF.duwMax, GOLF.duw * Math.exp(-q / 42) * band * zijfactor(l) * Math.exp(-0.1 * x));
}

// Het water gaat nooit over het eindpunt van iemands duw heen: de verplaatsing (m) van iemand op (x, y) in dt seconden,
// langs -N (landinwaarts). ok(x, y) zegt of daar land en ruimte is (geen water, geen gebouw); wie niet verder kan blijft staan.
export function duwStap(x, y, u, dt, ok) {
  const p = naarWerf(x, y), x0 = u - T_PLONS;
  const v = golfDuw(p.q, p.l, x0);
  if (v <= 0.05) return { x, y, v: 0 };
  const stap = v * dt;
  const nx = x - N.x * stap, ny = y - N.y * stap;
  return ok(nx, ny) ? { x: nx, y: ny, v } : { x, y, v };
}

// Staat (x, y) buiten het gebied dat de golf bestrijkt (plus een marge)? Menigte en hekken van het evenement staan daar.
export function buitenGolf(x, y) {
  const p = naarWerf(x, y);
  return !(p.q > -4 && p.q < GOLF.reik + 6 && Math.abs(p.l) < GOLF.breed + GOLF.uitloop + 8);
}

// --- de dag ------------------------------------------------------------------------------

// Wat doet de werf nu? Uit de agenda (activeEvents van evenementen.js, soort 'tewaterlating') en het uur.
// 'leeg' geen lancering vandaag of ze is voorbij; 'wacht' het schip staat klaar op de helling (de lancering is om
// LANCEERUUR); 'nu' het uur van de lancering is begonnen en het schip mag loskomen; 'voorbij' te laat: de helling is leeg.
export function werfFase(actief, hour) {
  if (!actief) return 'leeg';
  if (hour < LANCEERUUR) return 'wacht';
  return hour < LANCEERUUR + LANCEER_NAVENSTER_UUR ? 'nu' : 'voorbij';
}
