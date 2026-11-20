// Pose-clips voor cutscenes (#955 #956): een bibliotheek van gebaren en handelingen als
// keyframe-tabellen, zonder mocap en zonder assets. Puur (geen THREE, geen DOM, geen klok):
// een clip is een functie van de scènetijd, dus de host, de gast en de test zien dezelfde
// stand (Samen spelen: geen extra netwerkverkeer, de gast speelt de scène met dezelfde
// cutscript-definitie en dezelfde klok).
//
// Een clip ({ dur | period, loop, hold, in, out, keys }) kent per kanaal hoeken per keyframe.
// Een keyframe is { u, ease, <kanaal>: [...] }, u is de genormeerde tijd 0..1 binnen de clip
// (dus een cue-duur schaalt de hele clip). Een kanaal dat een keyframe niet noemt, houdt de
// waarde van de keyframes ervoor en erna; een kanaal dat de hele clip niet noemt, blijft
// van de basislaag (idle, lopen, praten, zitten). Kanalen van een mens (zelfde conventie als
// actoranim.js: de mesh kijkt langs +X, arm z > 0 = naar voren, z 2,75 = boven het hoofd):
//   head [x, y, z]   chest [x, y, z]   (y = draaien, z = voorover/achterover, x = zijwaarts kantelen)
//   armL, armR [x, z, e]   (x = zijwaarts, z = heffen naar voren, e = elleboog)
//   legL, legR [z, k]      (heup naar voren, knie; negatief = gebogen)
//   pelvis [drop, z, rx, ry]   (zakken in m, zijwaartse verplaatsing, kanteling, draaiing)
// Kanalen van een dier (kat Sien, de wereldmesh van wildlife.js):
//   body [dx, dy, rz, rx]  head [x, y, z]  tail [x, z]  legs [fl, fr, bl, br] (rotatie z)
// Easing per keyframe (geldt voor het stuk naar dat keyframe toe): smooth (standaard), lin,
// in, out, back (even voorbij het doel), step (blijft staan tot het keyframe).
//
// De cue-regel in cutscript.js: { t, actor, anim: '<clip>', dur, delay, speed, mirror }.
// Een onbekende clip valt terug op de basislaag (geen pose, geen fout): zie clipLayers.
import { HIP_Y } from './actoranim.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };

export const EASES = {
  smooth,
  lin: (k) => clamp01(k),
  in: (k) => clamp01(k) ** 2,
  out: (k) => 1 - (1 - clamp01(k)) ** 2,
  back: (k) => { k = clamp01(k); const c = 1.4; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  step: (k) => (k >= 1 ? 1 : 0),
};

// --- de menselijke clips ------------------------------------------------------
// Rechtshandig geschreven; `mirror: true` in de cue maakt er een linkshandige van.
const K = (u, o) => ({ u, ...o });
export const CLIPS = {
  // -- wijzen, zwaaien, kijken, reageren
  wijzen: { dur: 1.8, out: 0.35, keys: [
    K(0, { armR: [0.05, 0.4, 0.5], chest: [0, 0, 0] }),
    K(0.22, { armR: [0.1, 1.5, 0.08], chest: [0, -0.12, 0.05], head: [0, -0.15, 0.04], ease: 'back' }),
    K(0.8, { armR: [0.12, 1.55, 0.06], chest: [0, -0.12, 0.05], head: [0, -0.15, 0.04] }),
    K(1, { armR: [0.05, 0.6, 0.4], chest: [0, 0, 0], head: [0, 0, 0] }),
  ] },
  zwaaien: { period: 0.8, dur: 2.4, loop: true, keys: [
    K(0, { armR: [0.55, 2.65, 0.65], head: [0, 0, 0.1] }),
    K(0.5, { armR: [0.0, 2.75, 0.25], head: [0, 0, 0.1] }),
  ] },
  schouderophalen: { dur: 1.7, keys: [
    K(0, { armL: [0, 0.2, 0.4], armR: [0, 0.2, 0.4], head: [0, 0, 0], chest: [0, 0, 0] }),
    K(0.3, { armL: [-0.7, 0.55, 1.45], armR: [0.7, 0.55, 1.45], head: [0.18, 0, 0.08], chest: [0, 0, -0.04], pelvis: [0.02, 0, 0, 0] }),
    K(0.72, { armL: [-0.7, 0.55, 1.45], armR: [0.7, 0.55, 1.45], head: [0.18, 0, 0.08], chest: [0, 0, -0.04], pelvis: [0.02, 0, 0, 0] }),
    K(1, { armL: [0, 0.2, 0.4], armR: [0, 0.2, 0.4], head: [0, 0, 0], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },
  rondkijken: { dur: 3.2, keys: [
    K(0, { head: [0, 0, 0], chest: [0, 0, 0] }),
    K(0.22, { head: [0, 0.75, 0.04], chest: [0, 0.22, 0] }),
    K(0.45, { head: [0, 0.78, 0.04], chest: [0, 0.22, 0] }),
    K(0.7, { head: [0, -0.8, 0.06], chest: [0, -0.24, 0], ease: 'smooth' }),
    K(0.88, { head: [0, -0.8, 0.06], chest: [0, -0.24, 0] }),
    K(1, { head: [0, 0, 0], chest: [0, 0, 0] }),
  ] },
  omkijken: { dur: 1.6, out: 0.4, keys: [
    K(0, { head: [0, 0, 0], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
    K(0.3, { head: [0, 0.9, 0.02], chest: [0, 0.4, 0], pelvis: [0, 0, 0, 0.18], ease: 'out' }),
    K(0.8, { head: [0, 0.9, 0.02], chest: [0, 0.4, 0], pelvis: [0, 0, 0, 0.18] }),
    K(1, { head: [0, 0, 0], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },
  schrikken: { dur: 1.5, in: 0.08, out: 0.5, keys: [
    K(0, { chest: [0, 0, 0], head: [0, 0, 0], armL: [-0.2, 0.2, 0.3], armR: [0.2, 0.2, 0.3], pelvis: [0, 0, 0, 0] }),
    K(0.1, { chest: [0, 0, -0.34], head: [0, 0, -0.3], armL: [-0.6, 1.8, 1.2], armR: [0.6, 1.8, 1.2], pelvis: [0.05, 0, 0, 0], ease: 'out' }),
    K(0.4, { chest: [0, 0, -0.26], head: [0, 0, -0.25], armL: [-0.6, 1.7, 1.3], armR: [0.6, 1.7, 1.3], pelvis: [0.03, 0, 0, 0] }),
    K(1, { chest: [0, 0, -0.08], head: [0, 0, -0.05], armL: [-0.2, 0.4, 0.5], armR: [0.2, 0.4, 0.5], pelvis: [0, 0, 0, 0] }),
  ] },
  gieren: { period: 0.28, dur: 2.2, loop: true, in: 0.2, out: 0.4, keys: [
    K(0, { chest: [0, 0, 0.18], head: [0, 0, -0.4], armR: [0.2, 0.55, 1.5], armL: [-0.2, 0.7, 1.4], pelvis: [0.03, 0, 0, 0] }),
    K(0.5, { chest: [0, 0, 0.3], head: [0, 0, -0.55], armR: [0.2, 0.55, 1.5], armL: [-0.2, 0.7, 1.4], pelvis: [0.05, 0, 0, 0] }),
  ] },
  juichen: { period: 0.5, dur: 2.4, loop: true, keys: [
    K(0, { armL: [-0.35, 2.55, 0.35], armR: [0.35, 2.85, 0.2], head: [0, 0, -0.18], chest: [0, 0, -0.06], pelvis: [0.02, 0, 0, 0] }),
    K(0.5, { armL: [-0.35, 2.85, 0.2], armR: [0.35, 2.55, 0.35], head: [0, 0, -0.18], chest: [0, 0, -0.1], pelvis: [0.08, 0, 0, 0] }),
  ] },
  verontwaardigd: { dur: 2.2, keys: [
    K(0, { chest: [0, 0, 0], head: [0, 0, 0], armL: [-0.25, 0.45, 1.5], armR: [0.25, 0.45, 1.5] }),
    K(0.2, { chest: [0, 0, -0.14], head: [0, -0.35, -0.2], armL: [-0.25, 0.45, 1.5], armR: [0.3, 1.2, 0.5], ease: 'back' }),
    K(0.4, { chest: [0, 0, -0.12], head: [0, -0.3, -0.18], armR: [0.3, 1.45, 0.3], armL: [-0.25, 0.45, 1.5] }),
    K(0.55, { armR: [0.3, 1.2, 0.5] }),
    K(0.7, { armR: [0.3, 1.45, 0.3], head: [0, -0.3, -0.18] }),
    K(1, { chest: [0, 0, 0], head: [0, 0, 0], armL: [-0.25, 0.45, 1.5], armR: [0.25, 0.45, 1.5] }),
  ] },
  aarzelen: { dur: 2.6, keys: [
    K(0, { armR: [0.1, 0.3, 0.5], head: [0, 0, 0.05], chest: [0, 0, 0], pelvis: [0, 0.02, 0.03, 0] }),
    K(0.25, { armR: [0.3, 1.6, 2.2], head: [0.1, 0.15, 0.22], chest: [0, 0, 0.05], pelvis: [0, -0.02, -0.03, 0.05] }),
    K(0.6, { armR: [0.3, 1.6, 2.2], head: [-0.1, -0.25, 0.2], chest: [0, 0, 0.05], pelvis: [0, 0.02, 0.03, -0.05] }),
    K(1, { armR: [0.1, 0.3, 0.5], head: [0, 0, 0.05], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },
  nadenken: { dur: 3, hold: true, keys: [
    K(0, { armR: [0.2, 0.4, 0.8], head: [0, 0, 0] }),
    K(0.3, { armR: [0.3, 1.75, 2.35], armL: [-0.2, 0.9, 1.9], head: [0.06, 0.2, 0.12], chest: [0, 0, 0.04] }),
    K(1, { armR: [0.3, 1.75, 2.3], armL: [-0.2, 0.9, 1.9], head: [0.06, 0.2, 0.12], chest: [0, 0, 0.04] }),
  ] },
  zuchten: { dur: 2.2, keys: [
    K(0, { chest: [0, 0, 0], head: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2] }),
    K(0.3, { chest: [0, 0, -0.1], head: [0, 0, -0.18], armL: [-0.3, 0.3, 0.5], armR: [0.3, 0.3, 0.5], pelvis: [-0.01, 0, 0, 0] }),
    K(0.62, { chest: [0, 0, 0.14], head: [0, 0, 0.3], armL: [-0.1, 0.05, 0.1], armR: [0.1, 0.05, 0.1], pelvis: [0.03, 0, 0, 0] }),
    K(1, { chest: [0, 0, 0], head: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2], pelvis: [0, 0, 0, 0] }),
  ] },
  opgelucht: { dur: 2.4, keys: [
    K(0, { armR: [0.1, 0.2, 0.4], head: [0, 0, 0.1], chest: [0, 0, 0.06] }),
    K(0.3, { armR: [0.1, 2.1, 1.9], head: [0, 0, -0.1], chest: [0, 0, -0.1] }),
    K(0.5, { armR: [0.25, 2.2, 1.8], head: [0, 0, -0.15] }),
    K(0.7, { armR: [0.0, 2.15, 1.85] }),
    K(1, { armR: [0.1, 0.2, 0.4], head: [0, 0, 0], chest: [0, 0, 0] }),
  ] },
  duimen: { dur: 1.8, keys: [
    K(0, { armR: [0.1, 0.5, 0.9] }),
    K(0.25, { armR: [0.15, 1.35, 1.4], head: [0, 0, 0.04], ease: 'back' }),
    K(0.75, { armR: [0.15, 1.35, 1.4], head: [0, 0, 0.04] }),
    K(1, { armR: [0.1, 0.5, 0.9], head: [0, 0, 0] }),
  ] },
  buigen: { dur: 1.8, keys: [
    K(0, { chest: [0, 0, 0], head: [0, 0, 0], armR: [0, 0.2, 0.4], armL: [0, 0.2, 0.4] }),
    K(0.4, { chest: [0, 0, 0.7], head: [0, 0, 0.25], armR: [0.2, 0.8, 1.4], armL: [-0.1, -0.2, 0.2] }),
    K(0.65, { chest: [0, 0, 0.7], head: [0, 0, 0.25], armR: [0.2, 0.8, 1.4], armL: [-0.1, -0.2, 0.2] }),
    K(1, { chest: [0, 0, 0], head: [0, 0, 0], armR: [0, 0.2, 0.4], armL: [0, 0.2, 0.4] }),
  ] },
  groeten: { dur: 1.6, keys: [
    K(0, { armR: [0.1, 0.4, 0.8], head: [0, 0, 0] }),
    K(0.3, { armR: [0.3, 2.0, 2.3], head: [0, 0, 0.14] }),
    K(0.6, { armR: [0.4, 1.7, 1.2], head: [0, 0, 0.1] }),
    K(1, { armR: [0.1, 0.4, 0.8], head: [0, 0, 0] }),
  ] },
  wegwuiven: { period: 0.5, dur: 1.5, loop: true, keys: [
    K(0, { armR: [0.2, 1.25, 1.0], head: [0, 0.2, 0.05] }),
    K(0.5, { armR: [0.7, 1.25, 0.9], head: [0, 0.2, 0.05] }),
  ] },
  fluisteren: { dur: 2.4, keys: [
    K(0, { chest: [0, 0, 0], head: [0, 0, 0], armR: [0.1, 0.2, 0.4] }),
    K(0.25, { chest: [0, -0.2, 0.2], head: [0, 0.2, 0.12], armR: [0.3, 1.9, 2.1] }),
    K(0.8, { chest: [0, -0.2, 0.2], head: [0, 0.2, 0.12], armR: [0.3, 1.9, 2.1] }),
    K(1, { chest: [0, 0, 0], head: [0, 0, 0], armR: [0.1, 0.2, 0.4] }),
  ] },
  smeken: { dur: 2.2, hold: true, keys: [
    K(0, { armL: [-0.1, 0.3, 0.6], armR: [0.1, 0.3, 0.6] }),
    K(0.3, { armL: [-0.15, 1.35, 1.5], armR: [0.15, 1.35, 1.5], head: [0, 0, 0.12], chest: [0, 0, 0.08] }),
    K(0.65, { armL: [-0.15, 1.45, 1.4], armR: [0.15, 1.45, 1.4], head: [0.06, 0, 0.14] }),
    K(1, { armL: [-0.15, 1.35, 1.5], armR: [0.15, 1.35, 1.5], head: [0, 0, 0.12] }),
  ] },

  // -- aanraken, pakken, geven, voorwerpen en handelingen
  aanraken: { dur: 2, keys: [
    K(0, { armR: [0.05, 0.3, 0.4], chest: [0, 0, 0] }),
    K(0.35, { armR: [0.08, 1.5, 0.3], chest: [0, 0, 0.12], head: [0, 0, 0.1] }),
    K(0.7, { armR: [0.08, 1.5, 0.45], chest: [0, 0, 0.12], head: [0, 0, 0.1] }),
    K(1, { armR: [0.05, 0.3, 0.4], chest: [0, 0, 0], head: [0, 0, 0] }),
  ] },
  pakken: { dur: 1.5, keys: [
    K(0, { armR: [0.05, 0.3, 0.4], chest: [0, 0, 0] }),
    K(0.4, { armR: [0.1, 1.55, 0.15], chest: [0, 0, 0.22], head: [0, 0, 0.1], ease: 'out' }),
    K(0.55, { armR: [0.1, 1.55, 0.15], chest: [0, 0, 0.22] }),
    K(1, { armR: [0.1, 1.05, 1.3], chest: [0, 0, 0.05], head: [0, 0, 0.05] }),
  ] },
  geven: { dur: 1.8, keys: [
    K(0, { armL: [0, 0.3, 0.6], armR: [0, 0.3, 0.6] }),
    K(0.35, { armL: [-0.15, 1.35, 0.5], armR: [0.15, 1.35, 0.5], chest: [0, 0, 0.12], head: [0, 0, 0.06], ease: 'out' }),
    K(0.7, { armL: [-0.15, 1.35, 0.5], armR: [0.15, 1.35, 0.5], chest: [0, 0, 0.12], head: [0, 0, 0.06] }),
    K(1, { armL: [0, 0.3, 0.6], armR: [0, 0.3, 0.6], chest: [0, 0, 0], head: [0, 0, 0] }),
  ] },
  dooropenen: { dur: 1.6, keys: [
    K(0, { armR: [0.05, 0.3, 0.3], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
    K(0.3, { armR: [0.05, 1.4, 0.2], chest: [0, 0.15, 0.1], pelvis: [0, 0, 0, 0.08], head: [0, 0.1, 0] }),
    K(0.7, { armR: [0.05, 0.85, 0.7], chest: [0, 0.15, -0.1], pelvis: [0, 0, 0, 0.08] }),
    K(1, { armR: [0.05, 0.3, 0.3], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },
  telefoneren: { period: 3.2, dur: 6, loop: true, in: 0.5, keys: [
    K(0, { armR: [0.2, 1.75, 2.0], head: [0.04, 0.05, 0.12], armL: [-0.2, 0.5, 1.5] }),
    K(0.5, { armR: [0.2, 1.8, 2.0], head: [-0.06, -0.1, 0.16], armL: [-0.2, 0.6, 1.4] }),
  ] },
  typen: { period: 0.5, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armL: [-0.15, 1.0, 1.4], armR: [0.15, 1.0, 1.4], head: [0, 0, 0.16], chest: [0, 0, 0.08] }),
    K(0.5, { armL: [-0.15, 1.05, 1.5], armR: [0.15, 0.95, 1.3], head: [0, 0, 0.16], chest: [0, 0, 0.08] }),
  ] },
  eten: { period: 1.6, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armR: [0.1, 0.7, 1.2], head: [0, 0, 0.1] }),
    K(0.4, { armR: [0.1, 1.6, 2.4], head: [0, 0, 0.04] }),
    K(0.6, { armR: [0.1, 1.6, 2.4], head: [0, 0, 0.04] }),
    K(1, { armR: [0.1, 0.7, 1.2], head: [0, 0, 0.1] }),
  ] },
  drinken: { dur: 2.6, keys: [
    K(0, { armR: [0.1, 0.5, 1.0], head: [0, 0, 0] }),
    K(0.3, { armR: [0.1, 1.75, 2.15], head: [0, 0, -0.05] }),
    K(0.55, { armR: [0.1, 1.95, 2.0], head: [0, 0, -0.32], chest: [0, 0, -0.06] }),
    K(0.75, { armR: [0.1, 1.75, 2.15], head: [0, 0, -0.05], chest: [0, 0, 0] }),
    K(1, { armR: [0.1, 0.5, 1.0], head: [0, 0, 0] }),
  ] },
  proosten: { dur: 1.8, keys: [
    K(0, { armR: [0.1, 0.5, 1.0] }),
    K(0.35, { armR: [0.1, 1.9, 1.0], head: [0, 0, 0.05], ease: 'back' }),
    K(0.7, { armR: [0.1, 1.9, 1.0], head: [0, 0, 0.05] }),
    K(1, { armR: [0.1, 0.5, 1.0], head: [0, 0, 0] }),
  ] },
  koken: { period: 1.2, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armR: [0.1, 1.15, 1.2], armL: [-0.2, 0.9, 1.1], chest: [0, 0, 0.14], head: [0, 0, 0.18] }),
    K(0.25, { armR: [0.35, 1.2, 1.2], chest: [0, 0.05, 0.14] }),
    K(0.5, { armR: [0.1, 1.3, 1.1], chest: [0, 0, 0.14] }),
    K(0.75, { armR: [-0.15, 1.2, 1.2], chest: [0, -0.05, 0.14] }),
  ] },
  kloppen: { period: 0.42, dur: 1.7, loop: true, keys: [
    K(0, { armR: [0.05, 1.2, 1.5], chest: [0, 0, 0.04] }),
    K(0.5, { armR: [0.05, 1.45, 0.8], chest: [0, 0, 0.06], ease: 'in' }),
  ] },
  tillen: { dur: 2.4, hold: false, keys: [
    K(0, { armL: [-0.1, 0.3, 0.4], armR: [0.1, 0.3, 0.4], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
    K(0.3, { armL: [-0.1, 1.3, 0.2], armR: [0.1, 1.3, 0.2], chest: [0, 0, 0.45], pelvis: [0.12, 0, 0, 0], head: [0, 0, 0.1] }),
    K(0.6, { armL: [-0.1, 1.05, 1.3], armR: [0.1, 1.05, 1.3], chest: [0, 0, -0.05], pelvis: [0.02, 0, 0, 0], head: [0, 0, 0] }),
    K(1, { armL: [-0.1, 0.3, 0.4], armR: [0.1, 0.3, 0.4], chest: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },
  bukken: { dur: 2.2, keys: [
    K(0, { chest: [0, 0, 0], armR: [0, 0.2, 0.3], head: [0, 0, 0] }),
    K(0.35, { chest: [0, 0, 0.85], armR: [0.1, 1.4, 0.1], head: [0, 0, 0.1], pelvis: [0.04, 0, 0, 0] }),
    K(0.6, { chest: [0, 0, 0.85], armR: [0.1, 1.4, 0.1] }),
    K(1, { chest: [0, 0, 0], armR: [0, 0.4, 0.8], head: [0, 0, 0], pelvis: [0, 0, 0, 0] }),
  ] },

  // -- met anderen
  omhelzen: { dur: 3, keys: [
    K(0, { armL: [-0.2, 0.3, 0.4], armR: [0.2, 0.3, 0.4], chest: [0, 0, 0] }),
    K(0.25, { armL: [-1.0, 1.3, 0.4], armR: [1.0, 1.3, 0.4], chest: [0, 0, 0.05], head: [0, 0, 0] }),
    K(0.45, { armL: [-0.25, 1.4, 1.3], armR: [0.25, 1.4, 1.3], chest: [0, 0, 0.14], head: [0.2, 0, 0.1], ease: 'out' }),
    K(0.8, { armL: [-0.25, 1.4, 1.3], armR: [0.25, 1.4, 1.3], chest: [0, 0, 0.14], head: [0.2, 0, 0.1] }),
    K(1, { armL: [-0.2, 0.3, 0.4], armR: [0.2, 0.3, 0.4], chest: [0, 0, 0], head: [0, 0, 0] }),
  ] },
  highfive: { dur: 1.5, keys: [
    K(0, { armR: [0.1, 0.5, 0.8] }),
    K(0.35, { armR: [0.15, 2.5, 0.4], head: [0, 0, -0.1], ease: 'back' }),
    K(0.55, { armR: [0.15, 2.5, 0.35], head: [0, 0, -0.1] }),
    K(1, { armR: [0.1, 0.5, 0.8], head: [0, 0, 0] }),
  ] },
  handenschudden: { period: 0.5, dur: 2.2, loop: true, keys: [
    K(0, { armR: [0.15, 1.3, 0.55], chest: [0, -0.12, 0.05], head: [0, -0.1, 0.05] }),
    K(0.5, { armR: [0.15, 1.3, 0.85], chest: [0, -0.12, 0.05], head: [0, -0.1, 0.05] }),
  ] },
  applaus: { period: 0.34, dur: 3, loop: true, keys: [
    K(0, { armL: [-0.7, 1.3, 1.0], armR: [0.7, 1.3, 1.0], head: [0, 0, 0.04] }),
    K(0.5, { armL: [-0.1, 1.3, 1.0], armR: [0.1, 1.3, 1.0], head: [0, 0, 0.04], ease: 'in' }),
  ] },
  wiegen: { period: 2.4, dur: 6, loop: true, in: 0.6, keys: [
    K(0, { armL: [-0.3, 1.0, 1.5], armR: [0.3, 1.0, 1.5], pelvis: [0, 0.03, 0.05, 0], chest: [0.06, 0, 0.12], head: [0.06, 0, 0.3] }),
    K(0.5, { armL: [-0.3, 1.0, 1.5], armR: [0.3, 1.0, 1.5], pelvis: [0, -0.03, -0.05, 0], chest: [-0.06, 0, 0.12], head: [-0.06, 0, 0.3] }),
  ] },

  // -- feest en muziek
  dansen: { period: 1.0, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armL: [-0.4, 2.3, 0.7], armR: [0.4, 1.2, 1.2], pelvis: [0.02, 0.05, 0.08, 0.1], chest: [0.08, 0.1, 0], head: [0, 0, -0.05], legL: [0.12, -0.2], legR: [-0.08, -0.35] }),
    K(0.25, { pelvis: [0.06, 0.0, 0, 0] , legL: [0, -0.4], legR: [0, -0.3]}),
    K(0.5, { armL: [-0.4, 1.2, 1.2], armR: [0.4, 2.3, 0.7], pelvis: [0.02, -0.05, -0.08, -0.1], chest: [-0.08, -0.1, 0], head: [0, 0, -0.05], legL: [-0.08, -0.35], legR: [0.12, -0.2] }),
    K(0.75, { pelvis: [0.06, 0.0, 0, 0], legL: [0, -0.3], legR: [0, -0.4] }),
  ] },
  muziekmaken: { period: 0.6, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armL: [-0.3, 1.2, 1.2], armR: [0.2, 1.1, 1.0], chest: [0, 0, 0.06], head: [0, 0.1, 0.12], pelvis: [0, 0, 0.03, 0] }),
    K(0.5, { armL: [-0.3, 1.2, 1.2], armR: [0.2, 1.2, 1.4], chest: [0, 0, 0.06], head: [0, 0.1, 0.12], pelvis: [0, 0, -0.03, 0] }),
  ] },
  dirigeren: { period: 1.1, dur: 6, loop: true, in: 0.4, keys: [
    K(0, { armR: [0.2, 1.6, 1.0], armL: [-0.6, 1.2, 0.8], chest: [0, 0.08, 0.06], head: [0, 0, 0.04] }),
    K(0.25, { armR: [0.1, 1.95, 0.8], armL: [-0.7, 1.4, 0.6], chest: [0, 0, 0.02] }),
    K(0.5, { armR: [0.4, 1.4, 1.2], armL: [-0.5, 1.0, 0.9], chest: [0, -0.08, 0.1], ease: 'in' }),
    K(0.75, { armR: [-0.1, 1.7, 0.9], armL: [-0.7, 1.3, 0.7], chest: [0, 0, 0.04] }),
  ] },

  // -- grote lichaamsbewegingen (beide benen, dus alleen als de acteur niet loopt of zit)
  hurken: { dur: 2.2, hold: true, in: 0.4, keys: [
    K(0, { pelvis: [0, 0, 0, 0], legL: [0, -0.06], legR: [0, -0.06], chest: [0, 0, 0], armL: [0, 0.1, 0.3], armR: [0, 0.1, 0.3] }),
    K(0.4, { pelvis: [0.4, 0, 0, 0], legL: [1.1, -1.9], legR: [1.1, -1.9], chest: [0, 0, 0.38], head: [0, 0, -0.15], armL: [-0.2, 0.6, 1.0], armR: [0.2, 0.6, 1.0] }),
    K(1, { pelvis: [0.4, 0, 0, 0], legL: [1.1, -1.9], legR: [1.1, -1.9], chest: [0, 0, 0.38], head: [0, 0, -0.15], armL: [-0.2, 0.6, 1.0], armR: [0.2, 0.6, 1.0] }),
  ] },
  knielen: { dur: 2.6, hold: true, in: 0.5, keys: [
    K(0, { pelvis: [0, 0, 0, 0], legL: [0, -0.06], legR: [0, -0.06], chest: [0, 0, 0] }),
    K(0.4, { pelvis: [0.46, 0, 0, 0], legR: [1.5, -1.45], legL: [-0.05, -1.5], chest: [0, 0, 0.12], head: [0, 0, 0.05], armL: [-0.1, 0.4, 0.8], armR: [0.1, 0.9, 0.9] }),
    K(1, { pelvis: [0.46, 0, 0, 0], legR: [1.5, -1.45], legL: [-0.05, -1.5], chest: [0, 0, 0.12], head: [0, 0, 0.05], armL: [-0.1, 0.4, 0.8], armR: [0.1, 0.9, 0.9] }),
  ] },
  struikelen: { dur: 1.4, in: 0.06, out: 0.4, keys: [
    K(0, { chest: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2], legR: [0, -0.06], legL: [0, -0.06], pelvis: [0, 0, 0, 0] }),
    K(0.15, { chest: [0, 0, 0.5], head: [0, 0, 0.1], armL: [-0.8, 2.3, 0.3], armR: [0.8, 0.3, 0.3], legL: [0.6, -0.5], legR: [-0.4, -0.9], pelvis: [0.08, 0, 0, 0], ease: 'out' }),
    K(0.5, { chest: [0, 0, 0.4], armL: [-0.6, 0.4, 0.3], armR: [0.8, 2.2, 0.3], legL: [0.1, -0.3], legR: [0.5, -0.6], pelvis: [0.1, 0, 0, 0] }),
    K(1, { chest: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2], legR: [0, -0.06], legL: [0, -0.06], pelvis: [0, 0, 0, 0], head: [0, 0, 0] }),
  ] },
  omvallen: { dur: 2.4, hold: true, in: 0.1, keys: [
    K(0, { chest: [0, 0, 0], pelvis: [0, 0, 0, 0], legL: [0, -0.06], legR: [0, -0.06], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2] }),
    K(0.3, { chest: [0, 0, 0.3], pelvis: [0.3, 0, 0, 0], legL: [0.9, -1.4], legR: [0.7, -1.2], armL: [-0.8, 1.8, 0.4], armR: [0.8, 1.8, 0.4], head: [0, 0, -0.2], ease: 'in' }),
    K(0.6, { chest: [0, 0, 0.9], pelvis: [0.47, 0, 0, 0], legL: [0.1, -1.55], legR: [0.2, -1.5], armL: [-0.6, 1.5, 0.3], armR: [0.6, 1.5, 0.3], head: [0, 0, 0.2] }),
    K(1, { chest: [0, 0, 0.95], pelvis: [0.47, 0, 0, 0], legL: [0.1, -1.55], legR: [0.2, -1.5], armL: [-0.6, 1.5, 0.3], armR: [0.6, 1.5, 0.3], head: [0, 0, 0.2] }),
  ] },
  sprintstart: { dur: 0.9, in: 0.1, out: 0.3, keys: [
    K(0, { chest: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2] }),
    K(0.4, { chest: [0, 0.3, 0.35], armL: [-0.2, -0.6, 1.0], armR: [0.2, -0.6, 1.0], head: [0, 0, 0], pelvis: [0.06, 0, 0, 0.2] }),
    K(1, { chest: [0, 0, 0.25], armL: [-0.2, -0.3, 1.0], armR: [0.2, -0.3, 1.0], pelvis: [0.03, 0, 0, 0] }),
  ] },
  opstaan: { dur: 1.6, keys: [
    K(0, { chest: [0, 0, 0.35], armL: [-0.1, 0.6, 0.7], armR: [0.1, 0.6, 0.7], head: [0, 0, 0.1] }),
    K(0.45, { chest: [0, 0, 0.55], armL: [-0.1, 0.5, 0.2], armR: [0.1, 0.5, 0.2], head: [0, 0, 0] }),
    K(1, { chest: [0, 0, 0], armL: [0, 0.1, 0.2], armR: [0, 0.1, 0.2], head: [0, 0, 0] }),
  ] },
  ontspannen: { dur: 4, hold: true, in: 0.8, keys: [
    K(0, { chest: [0, 0, -0.18], head: [0, 0, -0.08], armL: [-0.5, 2.2, 2.0], armR: [0.5, 2.2, 2.0] }),
    K(1, { chest: [0, 0, -0.22], head: [0, 0, -0.1], armL: [-0.5, 2.2, 2.0], armR: [0.5, 2.2, 2.0] }),
  ] },
};
for (const [name, c] of Object.entries(CLIPS)) c.name = name;

// --- de kat (Sien) --------------------------------------------------------------
// De wereldmesh (wildlife.js buildCatMesh3D): bones body/head/tail/legs. Rust = alles op 0.
export const CAT_CLIPS = {
  'kat-staan': { period: 3.2, dur: 6, loop: true, keys: [
    K(0, { tail: [0.35, -0.3], head: [0, 0.15, 0] }), K(0.5, { tail: [-0.35, -0.5], head: [0, -0.15, 0] }),
  ] },
  'kat-lopen': { period: 0.55, dur: 6, loop: true, in: 0.2, keys: [
    K(0, { legs: [0.5, -0.5, -0.5, 0.5], body: [0, 0.005, 0, 0], tail: [0.2, -0.3] }),
    K(0.25, { legs: [0, 0, 0, 0], body: [0, 0.015, 0, 0] }),
    K(0.5, { legs: [-0.5, 0.5, 0.5, -0.5], body: [0, 0.005, 0, 0], tail: [-0.2, -0.3] }),
    K(0.75, { legs: [0, 0, 0, 0], body: [0, 0.015, 0, 0] }),
  ] },
  'kat-zitten': { dur: 2, hold: true, in: 0.5, keys: [
    K(0, { body: [0, 0, 0, 0], legs: [0, 0, 0, 0] }),
    K(0.5, { body: [-0.05, -0.08, 0.55, 0], legs: [-0.55, -0.55, 0.9, 0.9], head: [0, 0, -0.4], tail: [0.1, -1.2] }),
    K(1, { body: [-0.05, -0.08, 0.55, 0], legs: [-0.55, -0.55, 0.9, 0.9], head: [0, 0, -0.4], tail: [0.1, -1.2] }),
  ] },
  'kat-poetsen': { period: 1.0, dur: 4, loop: true, in: 0.5, keys: [
    K(0, { body: [-0.05, -0.08, 0.55, 0], legs: [0.9, -0.55, 0.9, 0.9], head: [0.3, 0.4, -0.6], tail: [0.1, -1.2] }),
    K(0.5, { body: [-0.05, -0.08, 0.55, 0], legs: [1.15, -0.55, 0.9, 0.9], head: [0.3, 0.4, -0.45], tail: [0.1, -1.2] }),
  ] },
  'kat-springen': { dur: 0.9, in: 0.05, out: 0.2, keys: [
    K(0, { body: [0, -0.06, 0.3, 0], legs: [-0.9, -0.9, 0.9, 0.9], head: [0, 0, -0.1], tail: [0, -0.2] }),
    K(0.3, { body: [0.02, 0.03, -0.5, 0], legs: [1.2, 1.2, -1.1, -1.1], head: [0, 0, 0.3], tail: [0, -1.0], ease: 'out' }),
    K(0.7, { body: [0, 0, 0.3, 0], legs: [0.7, 0.7, -0.4, -0.4], head: [0, 0, 0.05], tail: [0, -0.6] }),
    K(1, { body: [0, 0, 0, 0], legs: [0, 0, 0, 0], head: [0, 0, 0], tail: [0, 0] }),
  ] },
  'kat-kopje': { period: 1.8, dur: 4, loop: true, in: 0.4, keys: [
    K(0, { body: [0.02, 0, 0.1, 0], head: [0.2, -0.3, -0.25], tail: [0.1, -1.0], legs: [0.2, 0, 0, 0] }),
    K(0.5, { body: [0.03, 0, 0.1, 0], head: [-0.2, 0.3, -0.25], tail: [-0.1, -1.1], legs: [0, 0.2, 0, 0] }),
  ] },
  'kat-spinnen': { period: 0.9, dur: 6, loop: true, in: 0.6, keys: [
    K(0, { body: [-0.05, -0.08, 0.55, 0.01], legs: [-0.55, -0.55, 0.9, 0.9], head: [0, 0.2, -0.25], tail: [0.4, -1.1] }),
    K(0.5, { body: [-0.05, -0.08, 0.55, -0.01], legs: [-0.55, -0.55, 0.9, 0.9], head: [0, 0.2, -0.28], tail: [-0.4, -1.2] }),
  ] },
  'kat-schrikken': { dur: 1.6, in: 0.06, out: 0.5, keys: [
    K(0, { body: [0, 0, 0, 0], legs: [0, 0, 0, 0], tail: [0, 0] }),
    K(0.1, { body: [-0.03, 0.07, -0.25, 0], legs: [0.2, 0.2, -0.2, -0.2], head: [0, 0, 0.3], tail: [0, -1.5], ease: 'out' }),
    K(0.5, { body: [-0.02, 0.04, -0.18, 0], legs: [0.1, 0.1, -0.1, -0.1], head: [0, 0.4, 0.2], tail: [0.3, -1.4] }),
    K(1, { body: [0, 0, 0, 0], legs: [0, 0, 0, 0], head: [0, 0, 0], tail: [0, -0.3] }),
  ] },
  'kat-slapen': { dur: 3, hold: true, in: 1.0, keys: [
    K(0, { body: [0, 0, 0, 0] }),
    K(1, { body: [0, -0.1, 0.0, 0], legs: [-0.9, -0.9, 0.9, 0.9], head: [0.3, 0.5, -0.9], tail: [0.9, -0.1] }),
  ] },
  'kat-schoot': { period: 1.4, dur: 6, loop: true, in: 0.6, keys: [
    K(0, { body: [0, -0.1, 0.0, 0], legs: [0.5, -0.2, 0.9, 0.9], head: [0.1, 0.3, -0.5], tail: [0.8, -0.1] }),
    K(0.5, { body: [0, -0.1, 0.0, 0], legs: [-0.2, 0.5, 0.9, 0.9], head: [0.1, 0.3, -0.5], tail: [0.7, -0.15] }),
  ] },
  'kat-kijken': { dur: 3, keys: [
    K(0, { head: [0, 0, 0] }), K(0.2, { head: [0, 0.7, 0.1] }), K(0.55, { head: [0, -0.7, 0.1] }), K(0.8, { head: [0, 0, 0.2], tail: [0.4, -0.6] }), K(1, { head: [0, 0, 0] }),
  ] },
};
for (const [name, c] of Object.entries(CAT_CLIPS)) c.name = name;

// anim: 'stop' in een cue laat een vastgehouden clip los (lopen en gaan zitten doen dat vanzelf)
export const CLIP_STOP = 'stop';
export const CLIP_NAMES = Object.keys(CLIPS);
export const CAT_CLIP_NAMES = Object.keys(CAT_CLIPS);
export const isClip = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(CLIPS, name);
export const isCatClip = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(CAT_CLIPS, name);
export const isAnyClip = (name) => isClip(name) || isCatClip(name);
const def = (name) => (isClip(name) ? CLIPS[name] : isCatClip(name) ? CAT_CLIPS[name] : null);

// --- spiegelen -----------------------------------------------------------------
const SWAP = { armL: 'armR', armR: 'armL', legL: 'legR', legR: 'legL' };
// Een kanaalwaarde van links naar rechts (en andersom): x en y draaien om, z blijft.
export function mirrorChannel(name, v) {
  switch (name) {
    case 'armL': case 'armR': return [-v[0], v[1], v[2]];
    case 'head': case 'chest': return [-v[0], -v[1], v[2]];
    case 'pelvis': return [v[0], -v[1], -v[2], -v[3]];
    case 'body': return [v[0], v[1], v[2], -v[3]];
    case 'tail': return [-v[0], v[1]];
    case 'legs': return [v[1], v[0], v[3], v[2]];
    default: return v.slice();
  }
}
export function mirrorChannels(ch) {
  const out = {};
  for (const [k, v] of Object.entries(ch)) out[SWAP[k] || k] = mirrorChannel(k, v);
  return out;
}

// --- evaluatie -----------------------------------------------------------------
// Een kanaal over de keyframes die het noemen. Loop: de eerste waarde komt na de laatste weer terug.
function channelAt(keys, name, u, loop) {
  const pts = [];
  for (const k of keys) if (k[name]) pts.push(k);
  if (!pts.length) return null;
  if (pts.length === 1) return pts[0][name].slice();
  if (loop) {
    u = ((u % 1) + 1) % 1;
    const first = pts[0];
    pts.push({ u: 1 + first.u, [name]: first[name], ease: first.ease });
    if (u < first.u) u += 1;
  } else if (u <= pts[0].u) return pts[0][name].slice();
  else if (u >= pts[pts.length - 1].u) return pts[pts.length - 1][name].slice();
  let i = 0;
  while (i + 2 < pts.length && pts[i + 1].u <= u) i++;
  const a = pts[i], b = pts[i + 1];
  const span = b.u - a.u || 1;
  const e = (EASES[b.ease] || smooth)((u - a.u) / span);
  return a[name].map((v, n) => lerp(v, b[name][n], e));
}

// De kanalen van een clip op genormeerde tijd u (0..1; bij een loop mag u groter zijn).
export function clipChannels(name, u, { mirror = false } = {}) {
  const c = def(name);
  if (!c) return null;
  const out = {};
  for (const ch of ['head', 'chest', 'armL', 'armR', 'legL', 'legR', 'pelvis', 'body', 'tail', 'legs']) {
    let any = false;
    for (const k of c.keys) if (k[ch]) { any = true; break; }
    if (!any) continue;
    const v = channelAt(c.keys, ch, u, !!c.loop);
    if (v) out[ch] = v;
  }
  return mirror ? mirrorChannels(out) : out;
}

// Standaardduur van een clip in seconden (bij een loop: hoe lang hij loopt zonder cue-duur).
export function clipDuration(name, o = {}) {
  const c = def(name);
  if (!c) return 0;
  const sp = o.speed > 0 ? o.speed : 1;
  return (o.dur > 0 ? o.dur : c.dur) / (c.loop ? 1 : sp);
}

// De stand van één clip op lokale tijd lt (s sinds hij begon): { w, ch } of null (onbekend of nog niet begonnen).
// w is de weging 0..1 (instaprampe, uitrampe; een `hold`-clip blijft op 1 na zijn duur).
export function sampleClip(name, lt, o = {}) {
  const c = def(name);
  if (!c || !Number.isFinite(lt) || lt < 0) return null;
  const sp = o.speed > 0 ? o.speed : 1;
  const runLen = c.loop ? (o.dur > 0 ? o.dur : c.dur) : (o.dur > 0 ? o.dur : c.dur / sp);
  const u = c.loop ? lt * sp / (c.period || 1) : lt / runLen;
  const tin = c.in ?? 0.25, tout = c.out ?? 0.3;
  let w = tin > 0 ? smooth(lt / tin) : 1;
  if (c.loop || !c.hold) { const rest = runLen - lt; w *= tout > 0 ? smooth(rest / tout) : (rest > 0 ? 1 : 0); }
  if (w <= 0) return null;
  return { w, ch: clipChannels(name, c.loop ? u : Math.min(u, 1), o), name };
}

// --- lagen: welke clips staan er op tijd t aan ----------------------------------
// events: [{ t0, name, dur?, delay?, speed?, mirror? }] van één acteur, in elke volgorde. Geeft de
// lagen die op t meewegen: de lopende clip en (bij een overgang) de vorige, die wegvloeit.
// Een onbekende clip telt niet mee (terugval op de basislaag).
export function clipLayers(events, t) {
  if (!events || !events.length) return [];
  // een gebeurtenis zonder (bekende) clipnaam is een loslating: de basislaag neemt het weer over
  const list = events.map((e) => ({ ...e, name: isAnyClip(e.name) ? e.name : null, start: e.t0 + (e.delay || 0) })).sort((a, b) => a.start - b.start);
  let cur = -1;
  for (let i = 0; i < list.length; i++) if (list[i].start <= t + 1e-9) cur = i; else break;
  if (cur < 0) return [];
  const out = [];
  const layer = (e, fade, until) => {
    const c = def(e.name);
    const lt = Math.min(t, until ?? Infinity) - e.start;
    const s = sampleClip(e.name, lt, { dur: e.dur, speed: e.speed, mirror: !!e.mirror });
    if (!s) return;
    out.push({ name: e.name, lt, dur: e.dur, speed: e.speed, mirror: !!e.mirror, fade, w: s.w * fade, loop: !!c.loop });
  };
  const e = list[cur];
  if (!e.name) {
    if (cur > 0 && list[cur - 1].name) { const f = 1 - smooth((t - e.start) / 0.3); if (f > 0) layer(list[cur - 1], f, e.start); }
    return out;
  }
  const tin = def(e.name).in ?? 0.25;
  if (cur > 0 && list[cur - 1].name && t - e.start < tin) layer(list[cur - 1], 1 - smooth((t - e.start) / Math.max(1e-6, tin)), e.start);
  layer(e, 1);
  return out;
}

// --- op de botten --------------------------------------------------------------
const mix = (cur, v, w) => cur + (v - cur) * w;
function setRot(bone, x, y, z) { if (bone && bone.rotation) bone.rotation.set(x, y, z); }

// Zet de lagen van clipLayers op een mensfiguur (buildPersonMesh userData: head/chest/pelvis/armL...).
// upper: alleen hoofd, romp en armen (de acteur loopt, zit of draagt iets: benen en bekken blijven van de basislaag).
export function applyClipsHuman(ud, layers, { upper = false } = {}) {
  if (!ud || !layers || !layers.length) return false;
  let did = false;
  for (const L of layers) {
    const s = sampleClip(L.name, L.lt, { dur: L.dur, speed: L.speed, mirror: L.mirror });
    if (!s || !s.ch || !CLIPS[L.name]) continue;
    const w = s.w * (L.fade ?? 1), ch = s.ch;
    if (w <= 0) continue;
    did = true;
    if (ch.head && ud.head) { const r = ud.head.rotation; setRot(ud.head, mix(r.x, ch.head[0], w), mix(r.y, ch.head[1], w), mix(r.z, ch.head[2], w)); }
    if (ch.chest && ud.chest) { const r = ud.chest.rotation; setRot(ud.chest, mix(r.x, ch.chest[0], w), mix(r.y, ch.chest[1], w), mix(r.z, ch.chest[2], w)); }
    for (const side of ['L', 'R']) {
      const a = ch['arm' + side], arm = ud['arm' + side], el = ud['elbow' + side];
      if (a && arm) { const r = arm.rotation; setRot(arm, mix(r.x, a[0], w), 0, mix(r.z, a[1], w)); if (el) el.rotation.z = mix(el.rotation.z, a[2], w); }
    }
    if (upper) continue;
    for (const side of ['L', 'R']) {
      const l = ch['leg' + side], leg = ud['leg' + side], kn = ud['knee' + side];
      if (l && leg) { leg.rotation.z = mix(leg.rotation.z, l[0], w); if (kn) kn.rotation.z = mix(kn.rotation.z, l[1], w); }
    }
    if (ch.pelvis && ud.pelvis) {
      const p = ud.pelvis, c = ch.pelvis;
      p.position.set(p.position.x, mix(p.position.y, HIP_Y - c[0], w), mix(p.position.z, c[1], w));
      setRot(p, mix(p.rotation.x, c[2], w), mix(p.rotation.y, c[3], w), p.rotation.z);
    }
  }
  return did;
}

// De kat terug op rust: bones op hun beginwaarde (body.userData.rest is de ruststand van wildlife.js).
export function resetCat(ud) {
  const b = ud && ud.bones;
  if (!b || !b.body) return false;
  const rest = b.body.userData && b.body.userData.rest;
  if (rest) b.body.position.copy(rest);
  b.body.rotation.set(0, 0, 0);
  if (b.head) b.head.rotation.set(0, 0, 0);
  if (b.tail) b.tail.rotation.set(0, 0, 0);
  for (const l of ud.legs || []) l.rotation.set(0, 0, 0);
  return true;
}

// Zet de kat-lagen op de wereldmesh van de kat (na resetCat). Eén kanaal-array per bone.
export function applyClipsCat(ud, layers) {
  const b = ud && ud.bones;
  if (!b || !b.body || !layers || !layers.length) return false;
  let did = false;
  for (const L of layers) {
    const s = sampleClip(L.name, L.lt, { dur: L.dur, speed: L.speed, mirror: L.mirror });
    if (!s || !s.ch || !CAT_CLIPS[L.name]) continue;
    const w = s.w * (L.fade ?? 1), ch = s.ch;
    if (w <= 0) continue;
    did = true;
    if (ch.body) {
      const [dx, dy, rz, rx] = ch.body;
      b.body.position.x = mix(b.body.position.x, (b.body.userData.rest ? b.body.userData.rest.x : 0) + dx, w);
      b.body.position.y = mix(b.body.position.y, (b.body.userData.rest ? b.body.userData.rest.y : 0) + dy, w);
      b.body.rotation.set(mix(b.body.rotation.x, rx, w), b.body.rotation.y, mix(b.body.rotation.z, rz, w));
    }
    if (ch.head && b.head) { const r = b.head.rotation; b.head.rotation.set(mix(r.x, ch.head[0], w), mix(r.y, ch.head[1], w), mix(r.z, ch.head[2], w)); }
    if (ch.tail && b.tail) { const r = b.tail.rotation; b.tail.rotation.set(mix(r.x, ch.tail[0], w), r.y, mix(r.z, ch.tail[1], w)); }
    if (ch.legs && ud.legs) ud.legs.forEach((l, i) => { l.rotation.z = mix(l.rotation.z, ch.legs[i], w); });
  }
  return did;
}
