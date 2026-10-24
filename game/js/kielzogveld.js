// Kielzog als golfveld (#417): het wateroppervlak zelf tilt op achter een hard
// varende boot, in een V die met de vaart meegroeit en met de afstand uitdooft.
// Eén formule voor de shader van het water (KIELZOG_GLSL, in water3d.js) en de
// drijfkracht van de boten (waterSwellAt); golven.js laat suppers en kano's op
// hetzelfde kielzog wiebelen. De golf in het oppervlak is de brede, vreedzame
// helft van wat een romp vlak bij de boot voelt (KIELZOG_VELD_DEEL): hoog
// genoeg om te zien en om een lege boot te laten deinen, geen muur van water.
// Puur: geen THREE, geen DOM. Test: scripts/golven_test.mjs.
//
// Een golf in het veld is { x, y, cx, cy, sterkte }: waar de boot was, welke
// kant hij op vaart (cos en sin van de koers) en hoe hoog (m) de golf naast de
// romp staat. Alleen varende boten bij de speler komen in het veld
// (bouwKielzogVeld), hooguit KIELZOG_VELD_MAX: geen per-frame geometrie en
// geen werk aan de hele zee. De vorm is dezelfde V als het schuim van
// boatwake3d.js, zodat golf en schuim bij elkaar liggen.

export const KIELZOG_VELD_MAX = 4;            // boten met een golf in het oppervlak
export const KIELZOG_VELD_REIK = 70;          // m achter de boot: daar is de golf weg
export const KIELZOG_VELD_MIN_SNELHEID = 5;   // m/s: langzamer maakt geen golf
export const KIELZOG_VELD_HOEK = 0.36;        // tan(19,5 graden): zijwaartse spreiding per meter (net als boatwake3d.js)
export const KIELZOG_VELD_TOP = 0.22;         // m: bovengrens, ook als er vier golven samenvallen
export const KIELZOG_VELD_DEEL = 0.55;        // het oppervlak toont dit deel van wat een romp in het kielzog voelt
export const KIELZOG_VELD_BASIS = 0.12;       // m per vierkantswortel van de scheepslengte bij 6 m/s

const f = (v) => v.toFixed(2);

// De golf (m) van één boot op (x, y): niets voor de boot of buiten de V, een
// kuif op de arm van de V, dwarsgolven erlangs en zwakker met de afstand.
export function kielzogGolf(w, x, y) {
  const dx = x - w.x, dy = y - w.y;
  const achter = -(dx * w.cx + dy * w.cy);
  if (achter < 0.8 || achter > KIELZOG_VELD_REIK) return 0;
  const opzij = Math.abs(-dx * w.cy + dy * w.cx);
  const arm = achter * KIELZOG_VELD_HOEK + 1.4;
  if (opzij > arm + 1.6) return 0;
  const kuif = Math.max(0, 1 - Math.abs(opzij - arm) * 0.7);
  const dwars = 0.6 + 0.4 * Math.cos(achter * 0.9 - 1.2);
  return (w.sterkte * dwars * (0.5 + 0.5 * kuif)) / (1 + achter * 0.07);
}

// De golfhoogte (m) van een boot naast de romp: harder varen en een langer schip
// geven een hogere golf, met een vaste bovengrens.
export function kielzogSterkte(snelheid, lengte) {
  const vaart = Math.min(1.6, Math.max(0, snelheid) / 6);
  return Math.min(KIELZOG_VELD_TOP, KIELZOG_VELD_DEEL * KIELZOG_VELD_BASIS * Math.sqrt(Math.max(1, lengte)) * vaart);
}

// Het veld van de boten die de speler kan voelen: alleen varende boten binnen de
// reikwijdte, de hoogste golven eerst, hooguit `max` stuks.
export function bouwKielzogVeld(boten, px, py, max = KIELZOG_VELD_MAX) {
  const uit = [];
  for (const v of boten || []) {
    const snel = Math.abs(v.speed || 0);
    if (!v.isBoat || v.wrecked || v.sinking || snel < KIELZOG_VELD_MIN_SNELHEID) continue;
    if (Math.abs(v.x - px) > KIELZOG_VELD_REIK || Math.abs(v.y - py) > KIELZOG_VELD_REIK) continue;
    const a = v.angle || 0;
    uit.push({ x: v.x, y: v.y, cx: Math.cos(a), cy: Math.sin(a), sterkte: kielzogSterkte(snel, (v.model && v.model.len) || 6) });
  }
  if (uit.length > max) {
    uit.sort((a, b) => b.sterkte - a.sterkte);
    uit.length = max;
  }
  return uit;
}

// Het veld van dit frame, voor de shader en de drijfkracht (water3d.js). Golven
// leven één frame: valt de boot stil, dan zakt het water meteen weer vlak.
const LEEG = Object.freeze([]);
let veld = LEEG;
export const setKielzogVeld = (v) => { veld = v && v.length ? v : LEEG; };
export const kielzogVeld = () => veld;

// De som van alle golven op (x, y), met de bovengrens erop.
export function veldHoogte(x, y) {
  if (!veld.length) return 0;
  let h = 0;
  for (const w of veld) if (w && w.sterkte > 0 && Number.isFinite(w.sterkte)) h += kielzogGolf(w, x, y);
  return Math.min(h, KIELZOG_VELD_TOP);
}

// Dezelfde formule in GLSL, voor de vertexshader van het wateroppervlak
// (water3d.js). De getallen komen uit de constanten hierboven, zodat de CPU en
// de GPU niet uit elkaar lopen.
export const KIELZOG_GLSL = `
uniform vec4 uWakeA;
uniform vec4 uWakeB;
uniform vec4 uWakeC;
uniform vec4 uWakeD;
uniform vec4 uWakeK;
// de golf van één boot op p (x, z): V achter de boot, kuif op de arm, dwarsgolven erlangs
float kielzogGolf(vec4 w, float s, vec2 p) {
  if (s <= 0.0) return 0.0;
  vec2 d = p - w.xy;
  float achter = -(d.x * w.z + d.y * w.w);
  if (achter < 0.8 || achter > ${f(KIELZOG_VELD_REIK)}) return 0.0;
  float opzij = abs(-d.x * w.w + d.y * w.z);
  float arm = achter * ${f(KIELZOG_VELD_HOEK)} + 1.4;
  if (opzij > arm + 1.6) return 0.0;
  float kuif = max(0.0, 1.0 - abs(opzij - arm) * 0.7);
  float dwars = 0.6 + 0.4 * cos(achter * 0.9 - 1.2);
  return s * dwars * (0.5 + 0.5 * kuif) / (1.0 + achter * 0.07);
}
float kielzogVeld(vec2 p) {
  return min(${f(KIELZOG_VELD_TOP)}, kielzogGolf(uWakeA, uWakeK.x, p) + kielzogGolf(uWakeB, uWakeK.y, p)
    + kielzogGolf(uWakeC, uWakeK.z, p) + kielzogGolf(uWakeD, uWakeK.w, p));
}
`;
