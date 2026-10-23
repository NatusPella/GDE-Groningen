// De houding van de hengel per fase van het hengelen (#437): pure getallen, geen THREE, geen DOM (scripts/hengelpose_test.mjs).
// hengelanim.js tekent er de hengel, de lijn, het dobbertje en de plons van. Hoeken in radialen vanaf de verticaal (0 = recht
// omhoog), `u` is de voortgang binnen de fase (0..1).

export const UITGOOI_T = 0.8;      // s: gelijk aan HENGEL.castT (hengelrules.js)
export const VANG_T = 0.7;         // s: de vis springt van het water naar je hand en gaat terug
export const REIK = 7;             // m: zo ver gooi je uit
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const mix = (a, b, u) => a + (b - a) * u;

// phase: idle | cast | wait | bite | scare; t: seconden sinds de fase begon; bijt: 0..1 hoe ver de beet is (1 = net begonnen).
// Terug: rod (hoek), uit (0..1 hoe ver de lijn uit is), boog (m hoogte van het dobbertje in de lucht), dip (m onder de waterlijn),
// spanning (0..1: strakke lijn), hang (0..1: slappe lijn, de doorhang), bob (m) en trilling (0..1).
export function hengelPose(phase, t = 0, bijt = 0) {
  const o = { rod: 0.7, uit: 0, boog: 0, dip: 0, spanning: 0, hang: 0.3, bob: 0, trilling: 0, zichtbaar: false };
  if (phase === 'cast') {
    const u = clamp(t / UITGOOI_T, 0, 1);
    // eerst naar achteren (inhalen), dan de zwiep naar voren
    o.rod = u < 0.35 ? mix(0.7, -0.35, u / 0.35) : mix(-0.35, 1.25, (u - 0.35) / 0.65);
    const vlucht = clamp((u - 0.35) / 0.65, 0, 1);
    o.uit = vlucht; o.boog = Math.sin(vlucht * Math.PI) * 3.2; o.zichtbaar = vlucht > 0;
    o.hang = 0.15 * (1 - vlucht);
  } else if (phase === 'wait') {
    o.rod = 0.95; o.uit = 1; o.zichtbaar = true; o.hang = 0.22;
    o.bob = Math.sin(t * 2.3) * 0.035 + Math.sin(t * 0.9) * 0.02;
  } else if (phase === 'bite') {
    // het dobbertje zakt weg en trilt, de lijn spant; hoe langer de beet, hoe strakker
    const k = clamp(bijt, 0, 1);
    o.rod = 0.95 - 0.12 * Math.sin(t * 22) * 0.4 - 0.1; o.uit = 1; o.zichtbaar = true;
    o.dip = 0.28 + 0.1 * Math.sin(t * 30) * 0.5; o.spanning = clamp(0.55 + (1 - k) * 0.45, 0, 1);
    o.hang = 0.02; o.trilling = 1;
  } else if (phase === 'scare') {
    const u = clamp(t / 1.6, 0, 1);
    // te vroeg: de lijn gaat snel binnen, het dobbertje spat weg
    o.rod = mix(0.2, 0.7, u); o.uit = clamp(1 - u * 2.2, 0, 1); o.zichtbaar = o.uit > 0; o.hang = 0.4; o.boog = Math.sin(clamp(u * 2.2, 0, 1) * Math.PI) * 0.6;
  }
  return o;
}

// De vis die je vangt springt in een boog van het dobbertje naar je toe en gaat daarna terug het water in (nooit leed in beeld).
// Terug: { p: 0..1 positie langs de boog, hoogte (m), terug: bool }; null als de animatie klaar is.
export function vangstBoog(t) {
  if (t < 0 || t > VANG_T) return null;
  const u = t / VANG_T;
  return { p: clamp(u * 1.2, 0, 1) * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3 * 0.6), hoogte: Math.sin(u * Math.PI) * 1.7, terug: u > 0.7 };
}

// Het dobbertje: waar het in de wereld hoort, van de punt van de hengel naar het water (lineair plus de boog).
export function dobberPositie(tip, doel, uit, boog) {
  return { x: mix(tip.x, doel.x, uit), y: mix(tip.y, doel.y, uit), h: mix(tip.h, doel.h, uit) + boog };
}

// De lijn als punten van de hengelpunt naar het dobbertje, met doorhang (hang 0..1 van de lengte tot 1,2 m) en spanning (die haalt hem weg).
export function lijnPunten(tip, dobber, hang, spanning, n = 10) {
  const out = [];
  const zak = hang * (1 - clamp(spanning, 0, 1)) * 1.2;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    out.push({ x: mix(tip.x, dobber.x, s), y: mix(tip.y, dobber.y, s), h: mix(tip.h, dobber.h, s) - Math.sin(s * Math.PI) * zak });
  }
  return out;
}
