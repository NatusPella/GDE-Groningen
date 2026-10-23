// Samen spelen (#434): wat een speler laat zien behalve zijn plek. Pure logica, geen three.js, getest in scripts/coopspeler_test.mjs.
//  - springen en bukken van een gast: de gast stuurt twee knoppen (bit 2 en 3 van de invoer), de host laat het lichaam van de gast springen
//    en bukken (stapSprong) en zet hoogte en bukvlag in het snapshot;
//  - passagiers: in welk voertuig en op welke stoel (stoelNaam) iemand zit, voor iedereen zichtbaar;
//  - wapen en aanval van een speler (wapenCode, aanvalCode), met de bestaande aanvalshoudingen uit coopextra3d.
// In het snapshot zit dit in bytes die al gereserveerd waren (codec.js): geen nieuwe wireversie.
import { WEAPON_KEYS } from './weapons.js';
import { FX_SOORTEN, SWINGS } from './coopextra.js';

export const KNOP_RENNEN = 1, KNOP_HANDREM = 2, KNOP_SPRING = 4, KNOP_BUK = 8;
export const SPRONG_SNELHEID = 3.45; // m/s omhoog, zoals player.js (JUMP_SPEED): ongeveer 0,6 m hoog
export const ZWAARTEKRACHT = 9.8;    // zoals player.js (GRAVITY)
export const BUK_TEMPO = 0.55;       // een gast die bukt loopt zo veel langzamer (player.js CROUCH_SPEED)

// Knoppen van de gast: rennen, handrem (met het stuur), springen en bukken (te voet).
export function knoppen({ rennen = false, handrem = false, springen = false, bukken = false } = {}) {
  return (rennen ? KNOP_RENNEN : 0) | (handrem ? KNOP_HANDREM : 0) | (springen ? KNOP_SPRING : 0) | (bukken ? KNOP_BUK : 0);
}

// Eén stap van de verticale beweging van het lichaam van een gast bij de host. s: { z, vz, springWas } (wordt bijgehouden);
// knoppen: de byte uit de invoer. Een sprong begint bij een nieuwe druk op de knop (niet bij vasthouden) en alleen op de grond;
// bukken kan alleen op de grond. Geeft { z, bukt }.
export function stapSprong(s, knop, dt) {
  const spring = !!((knop || 0) & KNOP_SPRING), buk = !!((knop || 0) & KNOP_BUK);
  if (!Number.isFinite(s.z)) s.z = 0;
  if (!Number.isFinite(s.vz)) s.vz = 0;
  const nieuw = spring && !s.springWas; s.springWas = spring;
  if (s.z <= 0 && nieuw) s.vz = SPRONG_SNELHEID;
  if (s.z > 0 || s.vz > 0) {
    s.vz -= ZWAARTEKRACHT * dt;
    s.z = Math.max(0, s.z + s.vz * dt);
    if (s.z <= 0) { s.z = 0; s.vz = 0; }
  }
  return { z: s.z, bukt: buk && s.z <= 0 };
}

// Het wapen in de hand als getal in het snapshot (0 = geen of vuisten).
export function wapenCode(sleutel) {
  if (!sleutel || sleutel === 'fists') return 0;
  const i = WEAPON_KEYS.indexOf(sleutel);
  return i >= 0 && i < 255 ? i + 1 : 0;
}
export const wapenNaam = (code) => (code > 0 && code <= WEAPON_KEYS.length ? WEAPON_KEYS[code - 1] : '');

// Een aanval (het gevechtseffect van de host: { type, swing, start }) als byte: bit 0 tot 2 soort, bit 3 tot 5 zwaai, bit 7 telt om bij elke nieuwe aanval.
export function aanvalCode(fx, nu, teller = 0) {
  if (!fx || fx.start === undefined || !(nu - fx.start < 1.2)) return 0;
  const soort = Math.max(0, FX_SOORTEN.indexOf(fx.type)), zwaai = Math.max(0, SWINGS.indexOf(fx.swing || ''));
  return soort ? (soort & 7) | ((zwaai & 7) << 3) | (teller & 1 ? 128 : 0) : 0;
}
export function leesAanval(b) {
  const code = (b || 0) & 0xff, soort = FX_SOORTEN[code & 7] || '';
  return soort ? { type: soort, swing: SWINGS[(code >> 3) & 7] || undefined, teken: !!(code & 128) } : null;
}

// Stoelnummers: 0 de bestuurder, 1 de bijrijder voorin (Tessa), 2 en hoger de extra spelers achterin. Een byte in het snapshot.
export function volgendeStoel(bezet) {
  const b = new Set(bezet || []);
  for (let i = 2; i < 40; i++) if (!b.has(i)) return i;
  return 2;
}
