// De kleurgrading van de wereld (21-11, ADR 0040, issue "Wereldkleur"): een SUBTIELE, herkenbare kleurtaal die aansluit bij het
// designsysteem (zeefdruk): warme papierachtige lichten, inktachtige schaduwen, een tikje gedempt, in de schaduw een hint van raster en
// over het beeld een lichte papierkorrel. Pure rekenmodule (geen THREE, geen DOM): de dataset hieronder verwijst naar de inkten van
// worldpalette.js (de tokens van het designsysteem), de functies leveren getallen; worldgrade3d.js past ze toe op het licht en op de
// nabewerking, worldgrade_test.mjs en scripts/world/wereldkleur_grading.mjs gebruiken dezelfde wiskunde voor tests en voor-en-na-beelden.
//
// Waar het zit (en wat het kost):
// - materiaalkleuren: worldpalette.js (per rol een gewicht; de stand bepaalt de menging). Gratis, vastgelegd bij het bouwen.
// - licht (Midden en hoger): saturatie, contrast, schaduw- en lichttint, mist, horizon, zenit en grondweerkaatsing uit dit bestand,
//   in de bestaande lichtkleuren (computeLighting) en de bestaande grade-pass. Nul extra passes, nul extra shaderwerk.
// - raster en korrel (alleen Hoog en Ultra): 2 extra uniforms en ongeveer 12 ALU-instructies in de bestaande grade-pass. Geen extra pass.
// - Laag: alleen de materiaalkleuren; de grade-pass bestaat daar niet en blijft ook zo.
import { WERELD_INKTEN } from './worldpalette.js';
import { WORLD_COLOR_STRENGTH } from './worldcolormode.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const pack = (r, g, b) => (Math.round(clamp(r, 0, 255)) << 16) | (Math.round(clamp(g, 0, 255)) << 8) | Math.round(clamp(b, 0, 255));
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Het dagprofiel per zonshoogte (graden; dezelfde sleutels als KEYS in daynight.js, zodat de overgang vloeiend is). Alle waarden zijn
// de bijdrage bij sterkte 1 (Subtiel); een stand met sterkte 1,8 (Drukwerk) schaalt ze op, Uit schaalt ze naar niets.
//  papier: hoeveel van het papier-wit in het licht (de lichttint: zon en lucht lijken op bedrukt papier, niet op een scherm)
//  inkt:   hoeveel inktblauwgroen in de schaduwtint (de schaduw is gedrukte inkt, geen zwart)
//  sat:    de verzadiging wordt dit minder (0,04 = 4% gedempt); nooit meer verzadigd dan de wereld al was
//  con:    het contrast wordt dit hoger (de inkt staat strak)
//  mist:   hoeveel papier in de mist en de horizon (op dezelfde helderheid)
//  zenit:  hoeveel inktblauw in de zenit (de lucht wordt inktiger, niet bleker)
//  grond:  hoeveel papier in de grondweerkaatsing (warme teruggekaatste straat)
//  raster, korrel: de nabewerking in de schaduw en over het beeld (alleen Hoog en Ultra)
export const GRADE_DAYPARTS = Object.freeze([
  { e: 60, naam: 'middag', papier: 0.34, inkt: 0.08, sat: 0.04, con: 0.015, mist: 0.12, zenit: 0.10, grond: 0.12, raster: 1, korrel: 1 },
  { e: 30, naam: 'ochtend', papier: 0.40, inkt: 0.08, sat: 0.04, con: 0.015, mist: 0.12, zenit: 0.10, grond: 0.12, raster: 1, korrel: 1 },
  { e: 14, naam: 'gouden uur', papier: 0.45, inkt: 0.06, sat: 0.03, con: 0.015, mist: 0.10, zenit: 0.09, grond: 0.10, raster: 1, korrel: 1 },
  { e: 6, naam: 'avond', papier: 0.35, inkt: 0.04, sat: 0.02, con: 0.01, mist: 0.06, zenit: 0.07, grond: 0.07, raster: 0.8, korrel: 1 },
  { e: 1, naam: 'avond', papier: 0.25, inkt: 0.03, sat: 0.02, con: 0.01, mist: 0.04, zenit: 0.06, grond: 0.05, raster: 0.5, korrel: 0.9 },
  { e: -3, naam: 'schemering', papier: 0.15, inkt: 0.04, sat: 0, con: 0, mist: 0, zenit: 0.04, grond: 0.03, raster: 0, korrel: 0.8 },
  { e: -7, naam: 'nacht', papier: 0.10, inkt: 0.05, sat: 0, con: 0, mist: 0, zenit: 0.03, grond: 0, raster: 0, korrel: 0.7 },
  { e: -12, naam: 'nacht', papier: 0.05, inkt: 0.05, sat: 0, con: 0, mist: 0, zenit: 0.02, grond: 0, raster: 0, korrel: 0.7 },
  { e: -25, naam: 'nacht', papier: 0, inkt: 0.05, sat: 0, con: 0, mist: 0, zenit: 0.02, grond: 0, raster: 0, korrel: 0.7 },
]);
const PROFILE_KEYS = ['papier', 'inkt', 'sat', 'con', 'mist', 'zenit', 'grond', 'raster', 'korrel'];

// Het weer (altijd zomer) verschuift het profiel: bewolkt en regen krijgen een warmer papier in plaats van een koud grijs, mist wordt
// papierachtig, onweer krijgt meer inkt. Alle ingangen 0..1 (world.weather: intensity, overcast, mist).
export const GRADE_WEATHER = Object.freeze({
  overcast: { papier: 0.25, sat: 0.03 },
  mist: { mist: 0.25, papier: 0.10 },
  storm: { inkt: 0.04, korrel: 0.3 },
});

// Basisbeeld van de nabewerking (bij sterkte 1): rastersterkte (donkerder in de schaduw, 0,04 = 4%) en korrelamplitude (0,02 = 1% op en neer).
export const GRADE_BASE = Object.freeze({ raster: 0.04, korrel: 0.02 });
export const GRADE_HALFTONE_PITCH = 4; // schermpixels per rasterpunt
export const GRADE_TINT_KEYS = Object.freeze({ licht: 'papier', schaduw: 'water' }); // de inkten (WERELD_INKTEN) waar de tinten naartoe gaan

// De dagdeelnaam bij een zonshoogte en uur (voor het verificatiedocument en de debuginfo).
export function gradeDaypart(elevation, hour = 12) {
  if (elevation >= 30) return 'middag';
  if (elevation >= 14) return hour < 12 ? 'ochtend' : 'middag';
  if (elevation >= 5) return 'gouden uur';
  if (elevation >= 0) return 'avond';
  if (elevation >= -6) return 'schemering';
  return 'nacht';
}

// Het profiel bij een zonshoogte: lineair tussen de twee sleutels (continu in e).
export function profileAt(elevation, out = {}) {
  const P = GRADE_DAYPARTS;
  const e = Number.isFinite(elevation) ? elevation : 30;
  let i = 0;
  while (i < P.length - 2 && e < P[i + 1].e) i++;
  const a = P[i], b = P[i + 1];
  const t = clamp((e - a.e) / (b.e - a.e), 0, 1);
  for (const k of PROFILE_KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
}

// De tint als vermenigvuldigingsfactor: de inkt op dezelfde helderheid (alleen de kleurrichting), `amount` ver van wit (1,1,1).
// De uitkomst verandert de helderheid dus nauwelijks: het is kleur, geen belichting.
export function tintFactor(inkHex, amount, out = [1, 1, 1]) {
  const c = rgb(inkHex);
  const l = luma(c[0], c[1], c[2]) || 1;
  for (let i = 0; i < 3; i++) out[i] = lerp(1, c[i] / l, amount);
  return out;
}

// Een hex naar een inkt op dezelfde helderheid gemengd (de rekensom van worldpalette.js matchLuma, hier eenvoudig en continu).
export function mixLumaHex(hex, inkHex, k) {
  if (k <= 0) return hex;
  const s = rgb(hex), t = rgb(inkHex);
  const ls = luma(s[0], s[1], s[2]), lt = luma(t[0], t[1], t[2]) || 1;
  const o = [0, 0, 0];
  for (let i = 0; i < 3; i++) o[i] = lerp(s[i], t[i] * ls / lt, k);
  // begrens zonder de helderheid te laten zakken: vul het tekort bij
  for (let n = 0; n < 2; n++) {
    for (let i = 0; i < 3; i++) o[i] = clamp(o[i], 0, 255);
    const d = ls - luma(o[0], o[1], o[2]);
    if (Math.abs(d) < 0.5) break;
    for (let i = 0; i < 3; i++) o[i] += d;
  }
  return pack(o[0], o[1], o[2]);
}

const NEUTRAL = Object.freeze({
  actief: false, stand: 'uit', niveau: 'laag', dagdeel: 'middag',
  satMul: 1, conMul: 1, lichtMul: [1, 1, 1], schaduwMul: [1, 1, 1], mist: 0, zenit: 0, grond: 0, raster: 0, korrel: 0,
});
export const gradeNeutral = () => ({ ...NEUTRAL, lichtMul: [1, 1, 1], schaduwMul: [1, 1, 1] });

// De hoofdfunctie: de parameters voor dit beeld.
//   ctx = { stand: 'uit'|'subtiel'|'drukwerk', niveau: 'laag'|'middel'|'hoog' (de kwaliteit van de nabewerking), elevation (graden),
//           hour, overcast, mist, storm (0..1), rustig (Rustig drukwerk), kleurenblind (een modus anders dan uit) }
// Per niveau: Laag niets (alleen de materiaalkleuren), Midden licht en kleur, Hoog en Ultra ook raster en korrel.
// Rustig drukwerk: geen raster en geen korrel, en niet sterker dan Subtiel. Kleurenblind: niet gedempt en geen raster.
export function gradeParams(ctx, out = {}) {
  const spec = WORLD_COLOR_STRENGTH[ctx.stand];
  const level = ctx.niveau === 'hoog' || ctx.niveau === 'middel' ? ctx.niveau : 'laag';
  if (!spec || spec.grade <= 0 || level === 'laag') {
    Object.assign(out, gradeNeutral());
    out.stand = ctx.stand || 'uit';
    out.niveau = level;
    return out;
  }
  let sterkte = spec.grade;
  if (ctx.rustig) sterkte = Math.min(sterkte, 1);
  const p = profileAt(ctx.elevation, _p);
  const oc = clamp(ctx.overcast || 0, 0, 1), mi = clamp(ctx.mist || 0, 0, 1), st = clamp(ctx.storm || 0, 0, 1);
  const W = GRADE_WEATHER;
  const papier = p.papier + W.overcast.papier * oc + W.mist.papier * mi;
  const inkt = p.inkt + W.storm.inkt * st;
  const sat = p.sat + W.overcast.sat * oc;
  const mist = p.mist + W.mist.mist * mi;
  const korrel = p.korrel * (1 + W.storm.korrel * st);

  out.actief = true;
  out.stand = ctx.stand;
  out.niveau = level;
  out.dagdeel = gradeDaypart(ctx.elevation, ctx.hour);
  out.satMul = ctx.kleurenblind ? 1 : clamp(1 - sat * sterkte, 0.85, 1);
  out.conMul = clamp(1 + p.con * sterkte, 1, 1.06);
  out.lichtMul = tintFactor(WERELD_INKTEN.papier, clamp(papier * sterkte, 0, 0.8), out.lichtMul || [1, 1, 1]);
  out.schaduwMul = tintFactor(WERELD_INKTEN.water, clamp(inkt * sterkte, 0, 0.3), out.schaduwMul || [1, 1, 1]);
  out.mist = clamp(mist * sterkte, 0, 0.4);
  out.zenit = clamp(p.zenit * sterkte, 0, 0.3);
  out.grond = clamp(p.grond * sterkte, 0, 0.3);
  const postEffects = level === 'hoog' && !ctx.rustig;
  out.raster = postEffects && !ctx.kleurenblind ? GRADE_BASE.raster * p.raster * sterkte : 0;
  out.korrel = postEffects ? GRADE_BASE.korrel * korrel * sterkte : 0;
  return out;
}
const _p = {};

// De pseudo-ruis van de shader (postfx3d.js), hier voor de voor-en-na-beelden en de tests.
export function gradeNoise(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Het rasterpatroon (0..1): een gedraaid puntenraster op GRADE_HALFTONE_PITCH pixels, 0,5 gemiddeld, gelijk aan de shader.
export function halftonePattern(x, y) {
  const k = (Math.PI * 2) / GRADE_HALFTONE_PITCH;
  const u = (x + y) * 0.70710678, v = (x - y) * 0.70710678;
  return 0.5 + 0.5 * Math.sin(u * k) * Math.sin(v * k);
}

// De grading op één pixel van het beeld (display-referred, 0..255 per kanaal): dezelfde wiskunde als de grade-pass. Alleen voor tests en voor
// de BENADERDE voor-en-na-beelden; het echte beeld rekent in de shader. (x, y) zijn schermpixels voor raster en korrel.
export function gradePixel(c, p, x = 0, y = 0) {
  if (!p.actief) return [c[0], c[1], c[2]];
  let r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const l0 = luma(r, g, b);
  r = l0 + (r - l0) * p.satMul; g = l0 + (g - l0) * p.satMul; b = l0 + (b - l0) * p.satMul;
  r = (r - 0.5) * p.conMul + 0.5; g = (g - 0.5) * p.conMul + 0.5; b = (b - 0.5) * p.conMul + 0.5;
  const l = clamp(luma(r, g, b), 0, 1);
  const w = smooth(0.05, 0.75, l);
  r *= lerp(p.schaduwMul[0], p.lichtMul[0], w); g *= lerp(p.schaduwMul[1], p.lichtMul[1], w); b *= lerp(p.schaduwMul[2], p.lichtMul[2], w);
  if (p.raster > 0) {
    const m = (1 - smooth(0.05, 0.30, l)) * halftonePattern(x, y) * p.raster;
    r *= 1 - m; g *= 1 - m; b *= 1 - m;
  }
  if (p.korrel > 0) {
    const n = (gradeNoise(x, y) - 0.5) * p.korrel * (1 - 0.5 * l);
    r += n; g += n; b += n;
  }
  return [clamp(r, 0, 1) * 255, clamp(g, 0, 1) * 255, clamp(b, 0, 1) * 255];
}
