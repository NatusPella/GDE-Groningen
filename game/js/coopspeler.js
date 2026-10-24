// Samen spelen (#434): wat een speler laat zien behalve zijn plek. Pure logica, geen three.js, getest in scripts/coopspeler_test.mjs.
//  - springen en bukken van een gast: de gast stuurt twee knoppen (bit 2 en 3 van de invoer), de host laat het lichaam van de gast springen
//    en bukken (stapSprong) en zet hoogte en bukvlag in het snapshot;
//  - passagiers: in welk voertuig en op welke stoel (stoelNaam) iemand zit, voor iedereen zichtbaar;
//  - wapen en aanval van een speler (wapenCode, aanvalCode), met de bestaande aanvalshoudingen uit coopextra3d.
// In het snapshot zit dit in bytes die al gereserveerd waren (codec.js): geen nieuwe wireversie.
import { WEAPON_KEYS } from './weapons.js';
import { FX_SOORTEN, SWINGS } from './coopextra.js';
import { EXTRA_CHARS, charInfo } from './coopplayers.js';
import { schoonNaam } from './net/serverlijst.js';
import { isVerhaalrol } from './cooproles.js';

export const KNOP_RENNEN = 1, KNOP_HANDREM = 2, KNOP_SPRING = 4, KNOP_BUK = 8, KNOP_AANVAL = 16, KNOP_ZICHT = 32; // aanval: de aanvalsknop van een gast met een wapen (coopwapen.js); zicht: rechtermuisknop vast met een wapen met een kijker (jachtgeweer): richten door de kijker
export const SPRONG_SNELHEID = 3.45; // m/s omhoog, zoals player.js (JUMP_SPEED): ongeveer 0,6 m hoog
export const ZWAARTEKRACHT = 9.8;    // zoals player.js (GRAVITY)
export const BUK_TEMPO = 0.55;       // een gast die bukt loopt zo veel langzamer (player.js CROUCH_SPEED)

// ---------------------------------------------------------------- online-avatar (#455)
// Iedereen ziet een medespeler als zijn online-avatar: een eigen personage met een
// zelfgekozen naam, kleur en kleding, los van de verhaalrol (Tammo/Tessa). De avatar
// wordt nooit als verhaalfiguur getekend; anderen herkennen hem aan het naamlabel.
const STORY_NAMEN = ['tammo', 'tessa', 'anita'];
const isVerhaalnaam = (n) => STORY_NAMEN.includes(String(n || '').trim().toLowerCase());
const hexInt = (k) => parseInt(String(k).replace('#', ''), 16);

// De avatar van een speler, met veilige standaard: een figuur uit de vaste lijst
// (coopplayers.EXTRA_CHARS) op basis van de gewenste figuur of anders de plek.
// De naam gaat door hetzelfde filter als een sessienaam (constitutie 10).
export function avatarVan(speler = {}, slot = 0) {
  const bron = speler && typeof speler === 'object' ? speler : {};
  const av = bron.avatar && typeof bron.avatar === 'object' ? bron.avatar : {};
  const wens = [av.char, typeof bron.avatar === 'string' ? bron.avatar : null, bron.char].find((id) => typeof id === 'string' && !isVerhaalrol(id));
  const basis = (wens && charInfo(wens)) || EXTRA_CHARS[Math.abs(slot | 0) % EXTRA_CHARS.length];
  const ruw = [av.naam, bron.onlineNaam, bron.naam].find((n) => typeof n === 'string' && n.trim() && !isVerhaalnaam(n));
  const schoon = schoonNaam(ruw || basis.naam);
  return {
    char: basis.id,
    naam: schoon.ok && !isVerhaalnaam(schoon.naam) ? schoon.naam : basis.naam,
    kleur: /^#[0-9a-f]{6}$/i.test(av.kleur || '') ? av.kleur : basis.kleur,
    kleding: typeof av.kleding === 'string' && av.kleding.trim() ? av.kleding.slice(0, 40) : basis.kleding,
    huid: basis.huid, seed: basis.seed, variant: basis.variant,
  };
}

// Uiterlijk voor models3d_people.buildPersonMesh: altijd een eigen figuur (seed en
// kleur), nooit het model van een verhaalfiguur.
export function avatarLook(avatar) {
  const a = avatar && avatar.seed != null ? avatar : avatarVan(avatar);
  return { karakter: null, shirt: hexInt(a.kleur), skin: a.huid, opts: { seed: a.seed, variant: a.variant } };
}
export const avatarLabel = (avatar) => { const a = avatar && avatar.naam ? avatar : avatarVan(avatar); return { tekst: a.naam, kleur: a.kleur }; };

// Knoppen van de gast: rennen, handrem (met het stuur), springen en bukken (te voet).
export function knoppen({ rennen = false, handrem = false, springen = false, bukken = false, aanval = false, zicht = false } = {}) {
  return (rennen ? KNOP_RENNEN : 0) | (handrem ? KNOP_HANDREM : 0) | (springen ? KNOP_SPRING : 0) | (bukken ? KNOP_BUK : 0) | (aanval ? KNOP_AANVAL : 0) | (zicht ? KNOP_ZICHT : 0);
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
