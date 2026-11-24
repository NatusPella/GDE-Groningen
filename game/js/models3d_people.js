import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { HABBO_PALETTE, SkinBuilder, loftGeometry, composeMatrix, vcMaterial, markShared, tubeGeometry } from './pixelart3d.js';
import { hash2 } from './rng.js';
import { weaponLayers } from './models3d_weapons.js';
import { footContact, turnLean, approachTo, wrapPi, fidgetAt, blinkAmount } from './gait.js';
import { twoBoneIK, twoBoneFK, armIK, armFK, footPlant, wheelGrip, mouthShape, STEER_TURN } from './actorlife.js';
import { animateModular, plantFeetModular, modularSeatContact, buildModularFromAppearance, modularReady, modularHandSocket, MODULAR_GRIP_AT, modularAttackPose, modularHoldPose, setModularGrip, modularReach, modularTurn, modularSetState, modularPlaceProp, modularHandPoint, setModularMood } from './modularpeople.js';
import { idlePose } from './idleclips.js';
import { attachAccessories } from './models3d_clothing.js';
import { buildHairStyle } from './models3d_hair.js';
import { BODY_TYPES } from './clothinghair.js';
import { npcLook } from './clothing.js';
import { propGeometry } from './propmodels3d.js'; // de gitaar van de straatmuzikant: één geometrie uit het propregister

// Low-poly humanoid for the on-foot player, every pedestrian, drivers and
// bike/scooter riders: one SkinnedMesh (one draw call, one shared material)
// on a 13-bone rig (11 body bones + the eyelid bone that blinks + the mouth bone that opens for lipsync, actorlife.js). Origin at ground level between the feet, facing +X.
// userData.legL/legR/armL/armR are the hip/shoulder bones (rotated about Z
// by callers); knees/elbows follow them automatically unless
// animatePersonWalk or a pose sets them explicitly.


const HIP_Y = 0.93;
const KNEE_Y = 0.49;
const ANKLE_Y = 0.08;
const THIGH_LEN = HIP_Y - KNEE_Y;
const SHIN_LEN = KNEE_Y - ANKLE_Y;
const CHEST_Y = 1.07;
const SHOULDER_Y = 1.4;
const UPPER_ARM = 0.29;
const FOREARM = 0.25;
const ARM_SPLAY = 0.06;
const NECK_Y = 1.49;
const HEAD_Y = 1.655;
const DEFAULT_CAP = 0xc8621e;

const BONE = { pelvis: 0, chest: 1, head: 2, thigh: [3, 5], knee: [4, 6], arm: [7, 9], elbow: [8, 10], lids: 11, mouth: 12 };
const LID_Y = HEAD_Y + 0.01; // hoogte van de ogen: de ooglidbot schaalt om deze lijn (schaal 0 = open, 1 = dicht)
const MOUTH_Y = HEAD_Y - 0.049; // bovenlip: het mondbot schaalt van hier omlaag (schaal y 0 = dicht, 1 = open; z = breedte)

// Meetspoor voor scripts/kleding_clipping_audit.mjs: met personProbe.layers aan onthoudt de bouwer welk stuk elke driehoek is (laag, vanaf driehoek n).
// Uit is het niets: tag() kijkt alleen of B.layers bestaat.
export const personProbe = { layers: false };
const tag = (B, name) => { if (B.layers) B.layers.push([B.groups[0].p.length / 9, name]); };

export const PERSON_RIG = { HIP_Y, KNEE_Y, ANKLE_Y, THIGH_LEN, SHIN_LEN, CHEST_Y, SHOULDER_Y, UPPER_ARM, FOREARM, NECK_Y, HEAD_Y };

export const TAMMO_APPEARANCE = { shirt: 0x3f6ea8, skin: HABBO_PALETTE.woodLight, hair: HABBO_PALETTE.woodDark, variant: 'male', character: 'tammo', cap: DEFAULT_CAP, pants: 0x2f3b52, shoes: 0xd8d4cc, hairStyle: 'short', seed: 11 };
export const ANITA_APPEARANCE = { shirt: 0x9e3027, skin: HABBO_PALETTE.woodMid, hair: 0x1b1716, variant: 'female', character: 'anita', pants: 0x26262a, shoes: 0x2a1d14, hairStyle: 'long', seed: 23 };

const HAIR_COLORS = [0x2a1d14, 0x3b2a1e, 0x5a3d26, 0x7a5636, 0xb08f5c, 0xcdb485, 0x93462a, 0x1b1b1d, 0x2a1d14];
const DYED_HAIR = [0x2f6f8a, 0x8a2f6f, 0x4f8a4a, 0xc9694a];
const GREY_HAIR = [0x8a8580, 0xb4afa6, 0xd2cec6, 0x6e6a66];
const PANTS_COLORS = [0x2f3b52, 0x232326, 0x3a3b3f, 0x7f7258, 0x4a3a2a, 0x5b5f63, 0x3b4a3a, 0x6b6250];
const JEANS_COLORS = [0x3a4d6e, 0x2f3f5a, 0x4a5f82, 0x28303f, 0x55657a];
const SKIRT_COLORS = [0x232326, 0x3a3b3f, 0x5c1f1f, 0x2f3b52, 0x6b6250, 0x4a3a54];
const SHOE_COLORS = [0x1e1e1e, 0x3b2a1e, 0xd8d4cc, 0x5a3d26, 0x2a2f38, 0x1e1e1e, 0x8a8478];
const UNDER_COLORS = [0xe3ddd0, 0x2b2f36, 0xb8b2a6, 0x8a8478, 0xc9bfa8, 0x3a3f47];
const BAG_COLORS = [0x232326, 0x3b2a1e, 0x4a5a4a, 0x6b2a24, 0x2f3b52, 0x7a6a4a];
const HAT_COLORS = [0x2b2f36, 0x6b2a24, 0x3f4a3b, 0xb8a27a, 0x1f2a3a, 0x7a2e2e];
const SCARF_COLORS = [0x7a2e2e, 0xc9a227, 0x3f5c8a, 0x8a8478, 0x2f4a3a, 0xb05a3a];
const RAINCOAT_COLORS = [0xc9a227, 0x1f3a52, 0x9e3027, 0x2f4a3a, 0x3a3f47];
const HIJAB_COLORS = [0x2b2f36, 0x5c1f1f, 0x3f5c8a, 0x8a7a6a, 0x4a3a54, 0x1f4a2e];
const UMBRELLA_COLORS = [0x1e1e1e, 0x2f3b52, 0x7a2e2e, 0x3f4a3b];
const COP_BLUE = 0x1c3fae;
const COP_CAR_BLUE = 0x1f3f8f;
const COP_NAVY = 0x1d2433;
const COP_TROUSERS = 0x1b2130;
const REFLECT_YELLOW = 0xd6c43c;
const REFLECT_BLUE = 0x3a5fb8;
const EYE_WHITE = 0xd4cbbd;
const EYE_DARK = 0x19140f;

let rainLevel = 0;
let shadesShare = 0; // aandeel voorbijgangers met zonnebril op een hete of heldere dag (summerday.js)
export function setPeopleWeather(intensity, zonbril = 0) {
  rainLevel = Number.isFinite(intensity) ? intensity : 0;
  shadesShare = Number.isFinite(zonbril) ? zonbril : 0;
}

const leashHolders = new Set();
export function setLeashHolder(seed, on) {
  if (seed === undefined) return;
  if (on) leashHolders.add(seed);
  else leashHolders.delete(seed);
}

function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function mix(a, b, t) {
  const ch = (s) => Math.round(((a >> s) & 0xff) * (1 - t) + ((b >> s) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// Een kleur een paar procent lichter of donkerder en een tikje warm of koel (a, b in 0..1).
function jitterColor(c, a, b) {
  return mix(shade(c, 0.93 + a * 0.14), b < 0.5 ? 0xc9a27a : 0x7c8fa8, 0.03 + Math.abs(b - 0.5) * 0.08);
}

function pick(arr, t) {
  return arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];
}

function choose(t, table) {
  let acc = 0;
  for (const [v, p] of table) {
    acc += p;
    if (t < acc) return v;
  }
  return table[table.length - 1][0];
}

let pedSeedCounter = 0;

function resolveLook(shirt, skin, opts) {
  const seed = opts.seed ?? (++pedSeedCounter * 7.31 + hash2(shirt % 997, skin % 991) * 50);
  const r = (k) => hash2(seed * 1.37 + k * 17.13, seed * 0.71 + k * 5.71);
  const character = opts.character || null;
  const cop = !character && (shirt === COP_BLUE || shirt === COP_CAR_BLUE);
  const female = opts.variant ? opts.variant === 'female' : (!cop && r(1) < 0.5);
  const age = character || cop ? 'adult' : choose(r(15), [['young', 0.3], ['adult', 0.52], ['old', 0.18]]);
  const build = character ? 'avg' : choose(r(14), [['slim', 0.3], ['avg', 0.5], ['heavy', 0.2]]);
  const rainy = !character && !cop && rainLevel > 0.35;

  let top;
  if (cop) top = 'police';
  else if (rainy && r(20) < 0.3) top = 'raincoat';
  else if (female) top = choose(r(3), [['tee', 0.13], ['longsleeve', 0.1], ['sweater', 0.12], ['hoodie', 0.1], ['jacket', 0.18], ['coat', 0.23], ['dress', 0.14]]);
  else top = choose(r(3), [['tee', 0.17], ['longsleeve', 0.12], ['sweater', 0.14], ['hoodie', 0.16], ['jacket', 0.22], ['coat', 0.12], ['blazer', 0.07]]);
  if (age === 'old' && top === 'hoodie') top = 'coat';

  let bottom;
  if (cop) bottom = 'trousers';
  else if (top === 'dress') bottom = 'dress';
  else if (female) bottom = choose(r(6), [['jeans', 0.35], ['trousers', 0.27], ['skirt', 0.3], ['shorts', 0.08]]);
  else bottom = choose(r(6), [['jeans', 0.46], ['trousers', 0.44], ['shorts', 0.1]]);
  if (rainy && bottom === 'shorts') bottom = 'jeans';

  let hairStyle = opts.hairStyle;
  const hijab = !character && !cop && female && r(16) < 0.07;
  if (!hairStyle) {
    const t = r(2);
    if (hijab) hairStyle = 'hijab';
    else if (female) hairStyle = age === 'old' ? (t < 0.5 ? 'bob' : t < 0.8 ? 'bun' : 'short') : choose(t, [['long', 0.3], ['ponytail', 0.2], ['bun', 0.14], ['bob', 0.14], ['curly', 0.1], ['afro', 0.05], ['short', 0.07]]);
    else if (cop) hairStyle = 'buzz';
    else hairStyle = age === 'old' ? (t < 0.45 ? 'bald' : t < 0.8 ? 'short' : 'buzz') : choose(t, [['short', 0.42], ['buzz', 0.16], ['bald', 0.08], ['curly', 0.14], ['afro', 0.06], ['long', 0.06], ['bun', 0.04], ['ponytail', 0.04]]);
  }

  const hatRoll = r(4);
  let hat = null;
  if (cop) hat = 'police';
  else if (!character && hairStyle !== 'hijab') {
    if (age === 'old' && !female && hatRoll < 0.3) hat = 'flatcap';
    else if (hatRoll < 0.09) hat = 'beanie';
    else if (hatRoll < 0.14) hat = 'cap';
  }
  const hoodUp = top === 'raincoat' || (rainy && top === 'hoodie' && r(21) < 0.6);
  if (hoodUp) hat = null;

  const facial = female || cop || character ? 'none' : choose(r(17), age === 'old'
    ? [['none', 0.35], ['moustache', 0.3], ['beard', 0.25], ['stubble', 0.1]]
    : [['none', 0.46], ['stubble', 0.2], ['beard', 0.14], ['moustache', 0.08], ['goatee', 0.12]]);

  // zelden een geverfd kapsel (alleen jong, geen personage): kleur uit een kleine tabel, zodat een menigte niet uit alleen natuurlijke tinten bestaat
  const dyed = !character && !cop && age === 'young' && r(42) < 0.04;
  const hair = opts.hair ?? (dyed ? pick(DYED_HAIR, r(41)) : age === 'old' ? pick(GREY_HAIR, r(5)) : pick(HAIR_COLORS, r(5)));
  const pants = opts.pants ?? (cop ? COP_TROUSERS : bottom === 'jeans' ? pick(JEANS_COLORS, r(7)) : bottom === 'skirt' ? pick(SKIRT_COLORS, r(7)) : pick(PANTS_COLORS, r(7)));
  const shoeType = cop ? 'boot' : choose(r(18), [['sneaker', 0.45], ['leather', 0.35], ['boot', 0.2]]);
  const heightBase = female ? 0.94 : 1;
  return {
    seed, r, cop, female, age, build, top, bottom, hairStyle, hat, hoodUp, facial, character,
    hair,
    hatColor: pick(HAT_COLORS, r(9)),
    pants,
    shoes: opts.shoes ?? (cop ? 0x151515 : pick(SHOE_COLORS, r(8))),
    shoeType,
    under: cop ? 0x9fb4d8 : pick(UNDER_COLORS, r(10)),
    rolled: r(19) < 0.45,
    tights: r(12) < 0.55 ? 0x26262a : shade(skin, 0.94),
    bag: cop || character ? null : (r(11) < 0.15 ? 'backpack' : r(11) < 0.27 ? 'shoulder' : null),
    bagColor: pick(BAG_COLORS, r(13)),
    glasses: !cop && !character && (r(22) < (age === 'old' ? 0.45 : 0.14) || (!rainy && r(29) < shadesShare)),
    shades: !cop && !character && !rainy && r(29) < shadesShare,
    scarf: !cop && !character && hairStyle !== 'hijab' && top !== 'tee' && r(23) < 0.18,
    scarfColor: pick(SCARF_COLORS, r(24)),
    raincoatColor: pick(RAINCOAT_COLORS, r(25)),
    hijabColor: pick(HIJAB_COLORS, r(26)),
    umbrella: rainy && !hoodUp && r(27) < 0.4 ? pick(UMBRELLA_COLORS, r(28)) : null,
    heightScale: character ? (female ? 0.97 : 1.02) : heightBase * (age === 'old' ? 0.95 : 1) * (0.93 + r(13.5) * 0.14), // breder bereik: een lange en een kleine buurman vallen op
    buildScale: character ? 1 : (build === 'slim' ? 0.93 : build === 'heavy' ? 1.08 : 1) * (0.96 + r(14.5) * 0.08),
    // gezichtsuitdrukking in rust (alleen vorm, geen extra bewegende delen): 0 neutraal, 1 vriendelijk, 2 nors
    mood: character || cop ? 0 : choose(r(43), age === 'old' ? [[0, 0.4], [1, 0.25], [2, 0.35]] : [[0, 0.5], [1, 0.35], [2, 0.15]]),
  };
}

// --- body proportions --------------------------------------------------------

function torsoRings(L) {
  const f = L.female, heavy = L.build === 'heavy', slim = L.build === 'slim';
  const belly = heavy ? 1.32 : L.age === 'old' && !f ? 1.12 : 1;
  const sh = f ? 0.172 : 0.198;
  return [
    { y: 0.83, d: 0.075, w: 0.09 },
    { y: 0.9, d: 0.1, w: f ? 0.168 : 0.158 },
    { y: 1.09, d: f ? 0.086 : 0.098, w: f ? 0.128 : 0.146, front: belly },
    { y: 1.19, d: f ? 0.094 : 0.106, w: f ? 0.14 : 0.16, front: f ? 1.08 : belly > 1 ? 1 + (belly - 1) * 0.6 : 1 },
    { y: 1.28, d: f ? 0.1 : 0.116, w: f ? 0.158 : 0.182, sq: 0.8, front: f ? 1.2 : 1.04 },
    { y: 1.35, d: f ? 0.094 : 0.108, w: sh, sq: 0.7 },
    { y: 1.41, d: f ? 0.085 : 0.095, w: sh, sq: 0.75 },
    { y: 1.455, d: 0.074, w: sh * 0.8, sq: 0.8 },
    { y: 1.485, d: 0.058, w: 0.064 },
  ].map((rg) => (slim ? { ...rg, w: rg.w * 0.95 } : heavy ? { ...rg, w: rg.w * 1.06, d: rg.d * 1.06 } : rg));
}

// Het doorsnede-veelhoek van een loft (loftGeometry, zoals loftUp hem bouwt: 10 zijden, fase pi/10) op hoogte y tussen twee ringen: de hoekpunten
// van de twee ringen worden gemengd, precies zoals de driehoeken tussen de ringen lopen.
function loftPolygon(rings, y, sides = 10) {
  let a = rings[0], b = rings[1];
  for (let i = 0; i < rings.length - 1; i++) if (y >= rings[i].y && y <= rings[i + 1].y) { a = rings[i]; b = rings[i + 1]; break; }
  const t = (y - a.y) / (b.y - a.y || 1);
  const ring = (r) => {
    const out = [];
    for (let i = 0; i < sides; i++) {
      const ang = Math.PI / sides + (i / sides) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang), q = r.sq ?? 1;
      out.push([(r.x || 0) + Math.sign(c) * Math.pow(Math.abs(c), q) * r.d * (c > 0 ? (r.front ?? 1) : 1), Math.sign(sn) * Math.pow(Math.abs(sn), q) * r.w]);
    }
    return out;
  };
  const A = ring(a), B2 = ring(b);
  return A.map((p, i) => [p[0] + (B2[i][0] - p[0]) * t, p[1] + (B2[i][1] - p[1]) * t]);
}

// De straal van zo'n veelhoek vanuit de verticale as in richting ang (0 = voor, x; pi/2 = z).
function polygonRadius(poly, ang) {
  const dx = Math.cos(ang), dz = Math.sin(ang);
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const ex = q[0] - p[0], ez = q[1] - p[1], den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (p[0] * ez - p[1] * ex) / den, u = (p[0] * dz - p[1] * dx) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t > best) best = t;
  }
  return best;
}

// Het pad van een ketting op de romp: vanaf de kuil van de hals (voor, laag) over de schouderrand naar de nek (achter, hoog), op het oppervlak van de
// romp van deze lichaamsvorm plus 4 mm. Elk punt heeft ook de normaal van het oppervlak (de schouder is bijna vlak: een kraal moet er bovenop liggen,
// niet erin). Punten: [x, y, z, nx, ny, nz]; models3d_clothing.js bouwt er de ketting op.
function neckPath(L, n = 24) {
  const rings = torsoRings(L), pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    const af = Math.min(a, Math.PI * 2 - a); // symmetrisch links en rechts
    const y = 1.482 - 0.095 * Math.pow(Math.max(0, Math.cos(af * 1.6)), 1.2);
    const R = polygonRadius(loftPolygon(rings, y), a);
    const s = (polygonRadius(loftPolygon(rings, Math.min(1.484, y + 0.003)), a) - polygonRadius(loftPolygon(rings, Math.max(0.9, y - 0.003)), a)) / 0.006; // dR/dy
    const k = 1 / Math.sqrt(1 + s * s), nR = k, nY = -s * k;
    pts.push([(R + 0.004 * nR) * cs, y + 0.004 * nY, (R + 0.004 * nR) * sn, nR * cs, nY, nR * sn]);
  }
  return pts;
}

// De x (voor) van een veelhoek (loftPolygon) op zijpositie z0.
function polygonX(poly, z0, back = false) {
  let best = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    if ((p[1] - z0) * (q[1] - z0) > 0) continue;
    const dz = q[1] - p[1], t = Math.abs(dz) < 1e-9 ? 0 : (z0 - p[1]) / dz;
    best = Math.max(best, (back ? -1 : 1) * (p[0] + (q[0] - p[0]) * t));
  }
  return best === -Infinity ? (back ? -0.1 : 0.1) : (back ? -best : best);
}

// Een strook op het oppervlak van de romp (aan de voorkant): rows = [{ y, z, hw }] (midden en halve breedte per hoogte), lift meter erboven. Het overhemd
// in een open jas, de revers en de rits liggen zo op de romp in plaats van als vlakke plank ervoor (die zweefde tot 4 cm voor de borst).
function surfaceStrip(B, rings, rows, color, lift = 0.004, cols = 2, back = false, sides = 10, oz = 0) {
  const pt = (y, z) => [polygonX(loftPolygon(rings, y, sides), z, back) + (back ? -lift : lift), y, z + oz];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    for (let j = 0; j < cols; j++) {
      const f0 = j / cols * 2 - 1, f1 = (j + 1) / cols * 2 - 1;
      B.quadOut(pt(a.y, a.z + a.hw * f0), pt(a.y, a.z + a.hw * f1), pt(b.y, b.z + b.hw * f1), pt(b.y, b.z + b.hw * f0), [back ? -1 : 1, 0, 0], color);
    }
  }
}

// z van de schouder (de arm hangt daar): afhankelijk van het postuur
function shoulderZ(L) {
  return (L.female ? 0.172 : 0.198) * (L.build === 'heavy' ? 1.06 : L.build === 'slim' ? 0.95 : 1) + 0.03;
}

function ringAt(rings, y) {
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i], b = rings[i + 1];
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) {
      const t = (y - a.y) / (b.y - a.y || 1);
      const lerp = (k, def) => (a[k] ?? def) + ((b[k] ?? def) - (a[k] ?? def)) * t;
      return { y, d: lerp('d', 0), w: lerp('w', 0), x: lerp('x', 0), sq: lerp('sq', 1), front: lerp('front', 1) };
    }
  }
  return { ...rings[y < rings[0].y ? 0 : rings.length - 1], y };
}

// Rings between y0 and y1 (either direction), scaled by k.
function slice(rings, y0, y1, k = 1, dx = 0) {
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  const inner = rings.filter((r) => r.y > lo && r.y < hi);
  const out = [ringAt(rings, y0), ...(y0 < y1 ? inner : inner.reverse()), ringAt(rings, y1)];
  return out.map((r) => ({ ...r, d: r.d * k, w: r.w * k, x: (r.x || 0) + dx }));
}

function loftUp(rings, sides) {
  const sorted = rings[0].y <= rings[rings.length - 1].y ? rings : [...rings].reverse();
  return loftGeometry(sorted, sides, Math.PI / sides);
}

function blend(a, b, y, y0, y1) {
  if (y <= y0) return [a, a, 1];
  if (y >= y1) return [b, b, 1];
  return [a, b, 1 - (y - y0) / (y1 - y0)];
}

const W_TORSO = (x, y) => blend(BONE.pelvis, BONE.chest, y, 1.0, 1.16);
const W_NECK = (x, y) => blend(BONE.chest, BONE.head, y, 1.47, 1.53);
const W_LEG = (k) => (x, y) => blend(BONE.knee[k], BONE.thigh[k], y, KNEE_Y - 0.04, KNEE_Y + 0.05);
const W_ARM = (k) => (x, y) => blend(BONE.elbow[k], BONE.arm[k], y, SHOULDER_Y - UPPER_ARM - 0.03, SHOULDER_Y - UPPER_ARM + 0.03);
const W_PANEL = (k, maxW) => (x, y) => [BONE.thigh[k], BONE.pelvis, Math.min(1, Math.max(0, (HIP_Y + 0.02 - y) / 0.2)) * maxW];

// Half-shell of a loft (rings as in loftGeometry) on one leg's side (s = +1
// for +z), split along the centre line front and back.
function hemPanel(rings, s, segs = 6) {
  const ring = (r) => {
    const out = [];
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI, c = Math.cos(t);
      out.push([c * r.d * (c > 0 ? (r.front ?? 1) : 1), r.y, Math.sin(t) * r.w]);
    }
    return out;
  };
  const rs = rings.map(ring), pos = [];
  for (let n = 0; n < rs.length - 1; n++) {
    const A = rs[n], C = rs[n + 1];
    for (let i = 0; i < segs; i++) pos.push(...A[i], ...C[i + 1], ...A[i + 1], ...A[i], ...C[i], ...C[i + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return s > 0 ? g : flipWinding(g.scale(1, 1, -1));
}

// Coat tails / skirts as two panels, each carried by its own thigh, so
// running legs swing the cloth instead of poking through it.
function hemPanels(B, rings, maxW, color) {
  const prev = B.bone;
  tag(B, 'hem');
  for (let k = 0; k < 2; k++) {
    B.bone = W_PANEL(k, maxW);
    B.geo(hemPanel(rings, k === 0 ? 1 : -1), null, color);
  }
  B.bone = prev;
  tag(B, 'topdetail');
}

function flipWinding(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  return g;
}

function ell(ws, hs, fn, phiStart = 0, phiLen = Math.PI * 2, thStart = 0, thLen = Math.PI) {
  const g = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLen, thStart, thLen);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = fn(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  return g;
}

function headShape(k = 1, dx = 0, dy = 0) {
  return (nx, ny, nz) => {
    let x = nx * 0.097, y = ny * 0.118, z = nz * 0.086;
    if (ny < 0) {
      z *= 1 - 0.3 * Math.pow(-ny, 1.4);
      x *= nx > 0 ? 1 - 0.1 * -ny : 1 - 0.3 * -ny;
    }
    if (nx < 0 && ny > -0.3) x *= 1.07;
    return [x * k + dx, y * k + HEAD_Y + dy, z * k];
  };
}

// Front surface (x) of the head at height dy above HEAD_Y and side offset z,
// so painted-on features sit on the face instead of floating in front of it.
function faceX(dy, z) {
  const ny = Math.max(-0.99, Math.min(0.99, dy / 0.118));
  const zf = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
  const nz = z / (0.086 * zf);
  const nx = Math.sqrt(Math.max(0, 1 - ny * ny - nz * nz));
  return nx * 0.097 * (ny < 0 ? 1 - 0.1 * -ny : 1);
}

// --- builder -----------------------------------------------------------------

function buildHead(B, L, skin) {
  const H = BONE.head;
  B.bone = H;
  tag(B, 'head');
  B.geo(ell(9, 7, headShape()), null, skin);
  B.bone = W_NECK;
  tag(B, 'neck');
  B.geo(loftGeometry([{ y: 1.44, d: 0.06, w: 0.062 }, { y: 1.52, d: 0.054, w: 0.052 }, { y: HEAD_Y - 0.05, d: 0.05, w: 0.048 }], 6), null, shade(skin, 0.94));
  B.bone = H;
  tag(B, 'face');

  const nose = new THREE.CylinderGeometry(0.009, 0.016, 0.042, 3).rotateY(Math.PI / 2);
  B.geo(nose, composeMatrix(faceX(-0.014, 0) - 0.004, HEAD_Y - 0.014, 0, 0, 0, 0.22), shade(skin, 0.96));
  for (const s of [1, -1]) {
    const ez = s * 0.033;
    B.box(faceX(0.034, ez) - 0.006, HEAD_Y + 0.034, ez, 0.014, 0.014, 0.036, shade(skin, 0.95), 0, 0, -s * 0.4, 0);
    plate(B, faceX(0.01, ez) + 0.0015, HEAD_Y + 0.01, ez, 0.0085, 0.013, -s * 0.4, EYE_WHITE);
    plate(B, faceX(0.01, ez) + 0.003, HEAD_Y + 0.009, s * 0.032, 0.0075, 0.0065, -s * 0.4, EYE_DARK);
    plate(B, faceX(0.04, ez) + 0.004, HEAD_Y + 0.04, ez, 0.0045, 0.016, -s * 0.4, shade(L.hair, 0.8), s * (L.mood === 2 ? 0.2 : L.mood === 1 ? 0.06 : 0.12));
    B.box(-0.004, HEAD_Y + 0.002, s * 0.084, 0.03, 0.044, 0.016, shade(skin, 0.92));
    // blosjes (alleen een tint op de wang) en bij ouderen een lachlijn naast de mond
    plate(B, faceX(-0.016, s * 0.056) + 0.001, HEAD_Y - 0.016, s * 0.056, 0.012, 0.013, -s * 0.4, mix(skin, 0xd8766a, L.age === 'old' ? 0.26 : 0.18));
    if (L.age === 'old') plate(B, faceX(-0.036, s * 0.03) + 0.0012, HEAD_Y - 0.036, s * 0.03, 0.011, 0.0022, -s * 0.2, shade(skin, 0.8), -s * 0.35);
  }
  const lipColor = mix(shade(skin, 0.78), 0x8a3a30, 0.3);
  plate(B, faceX(-0.052, 0) + 0.0015, HEAD_Y - 0.052, 0, 0.005, L.mood === 1 ? 0.02 : L.mood === 2 ? 0.014 : 0.017, 0, lipColor);
  // mondhoeken: omhoog bij een vriendelijk gezicht, omlaag bij een nors gezicht (vormen, geen botten: de uitdrukking staat in rust vast)
  if (L.mood) for (const s of [1, -1]) plate(B, faceX(-0.052, s * 0.019) + 0.0016, HEAD_Y - 0.052 + (L.mood === 1 ? 0.002 : -0.002), s * 0.019, 0.0042, 0.0075, 0, lipColor, (L.mood === 1 ? -s : s) * 0.55);
  // oogleden: huidkleurige plaatjes op een eigen bot (11), die om de ooglijn schaalt; open = schaal 0, dus onzichtbaar (blinkLids)
  {
    const prev = B.bone;
    B.bone = BONE.lids;
    for (const s of [1, -1]) plate(B, faceX(0.01, s * 0.033) + 0.0045, LID_Y - 0.001, s * 0.033, 0.0145, 0.0155, -s * 0.4, shade(skin, 0.97));
    // mondopening (lipsync, actorlife.js): een donker plaatje onder de bovenlip op een eigen bot (12); dicht = schaal 0, dus onzichtbaar
    B.bone = BONE.mouth;
    plate(B, faceX(-0.057, 0) + 0.0022, MOUTH_Y - 0.008, 0, 0.008, 0.0135, 0, 0x2a1512);
    B.bone = prev;
  }

  if (L.glasses) {
    tag(B, 'glasses');
    const lens = L.shades ? 0x101214 : mix(shade(skin, 0.7), 0x5d6f7a, 0.6);
    for (const s of [1, -1]) {
      B.box(faceX(0.012, s * 0.034) + 0.007, HEAD_Y + 0.012, s * 0.034, 0.006, 0.03, 0.04, 0x26262a, 0, 0, -s * 0.4, 0);
      B.box(faceX(0.012, s * 0.034) + 0.0105, HEAD_Y + 0.012, s * 0.034, 0.002, 0.022, 0.032, lens, 0, 0, -s * 0.4, 0);
    }
    B.box(faceX(0.02, 0) + 0.006, HEAD_Y + 0.02, 0, 0.006, 0.006, 0.03, 0x26262a);
    for (const s of [1, -1]) {
      const fx = faceX(0.02, s * 0.052) + 0.006;
      B.geo(tubeGeometry([fx, HEAD_Y + 0.018, s * 0.052], [0.05, HEAD_Y + 0.02, s * 0.079], 0.003, 0.003, 3), null, 0x26262a);
      B.geo(tubeGeometry([0.05, HEAD_Y + 0.02, s * 0.079], [-0.01, HEAD_Y + 0.02, s * 0.087], 0.003, 0.003, 3), null, 0x26262a);
    }
  }

  tag(B, 'facial');
  const beardColor = L.facial === 'stubble' ? mix(skin, L.hair, 0.3) : L.hair;
  if (L.facial === 'beard' || L.facial === 'stubble') {
    const k = L.facial === 'beard' ? 1.08 : 1.02;
    B.geo(ell(8, 3, headShape(k, 0.002), Math.PI * 0.5, Math.PI, Math.PI * 0.56, Math.PI * 0.4), null, beardColor);
  }
  if (L.facial === 'moustache' || L.facial === 'beard') B.box(faceX(-0.037, 0) - 0.002, HEAD_Y - 0.037, 0, 0.012, 0.012, 0.046, shade(L.hair, 0.9));
  if (L.facial === 'goatee') {
    B.box(faceX(-0.037, 0) - 0.002, HEAD_Y - 0.037, 0, 0.011, 0.011, 0.042, L.hair);
    B.box(faceX(-0.085, 0) - 0.008, HEAD_Y - 0.085, 0, 0.02, 0.038, 0.034, L.hair);
  }

  tag(B, 'hair');
  const hair0 = B.groups[0].p.length;
  buildHair(B, L);
  const hair1 = B.groups[0].p.length;
  tag(B, 'hat');
  buildHat(B, L, hair0, hair1);
  tag(B, 'end');
}

// Flat quad facing +x (yawed by ry, rolled by rx) for painted-on face details.
function plate(B, x, y, z, h, w, ry, color, rx = 0) {
  const m = composeMatrix(x, y, z, rx, ry, 0);
  const v = (py, pz) => new THREE.Vector3(0, py, pz).applyMatrix4(m).toArray();
  const n = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(rx, ry, 0)).toArray();
  B.quadOut(v(-h, -w), v(-h, w), v(h, w), v(h, -w), n, color);
}

// Tilt about the head centre (not the ground origin), nudged slightly back.
function headTilt(tilt) {
  return composeMatrix(0, HEAD_Y, 0, 0, 0, tilt).multiply(composeMatrix(-0.006, -HEAD_Y, 0));
}

// Hair/cap shell over the scalp; its lower rim is pulled onto the head so
// the shell never reads as a hat floating above it.
// innerColor (hats): the shell gets a second wall below it with its faces turned inwards, so seen from below (a low camera, the underside of a
// cap on a bent head) it has an inside instead of being see-through; the wall thins to nothing at the rim, where the shell meets the head.
const RIM = 1.03; // the rim of a hair or hat shell sits just outside the head (at 0.99 the tilted front rim cut zigzag wedges through the forehead)
function hairCap(B, L, k, tilt, color, thLen = Math.PI * 0.52, innerColor = null) {
  const rimNy = Math.cos(thLen);
  const shell = (kk) => {
    const g = ell(14, 4, (nx, ny, nz) => {
      const t = Math.min(1, Math.max(0, (ny - rimNy) / 0.45));
      return headShape(RIM + (kk - RIM) * t, -0.006 * t, 0.004 * t)(nx, ny, nz);
    }, 0, Math.PI * 2, 0, thLen);
    // tilt about the head centre, then push every point back out of the head: the tilt sinks the front-top of the shell into the forehead (zigzag wedges)
    const p = g.attributes.position, c = Math.cos(tilt), sn = Math.sin(tilt);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) - HEAD_Y, z = p.getZ(i);
      let xr = x * c - y * sn, yr = x * sn + y * c, zr = z;
      const q = Math.hypot(xr / 0.097, yr / 0.118, zr / 0.086);
      if (q < RIM) { const u = RIM / Math.max(q, 1e-3); xr *= u; yr *= u; zr *= u; }
      p.setXYZ(i, xr, yr + HEAD_Y, zr);
    }
    return g;
  };
  B.geo(shell(k), null, color);
  if (innerColor !== null) B.geo(flipWinding(shell(RIM + (k - RIM) * 0.4).toNonIndexed()), null, innerColor);
}

// De schaalhoeden (pet, Stadjerspet, platte pet, mutsje): een schil over de schedel. De onderrand ligt boven de oren en de ogen (wenkbrauwen
// mogen onder het mutsje blijven), de voorkant steekt door de tilt iets hoger. Eén bron voor de schil, het haar eronder en de rand (22-11, clipping).
const HAT_SHELL = {
  cap: { k: 1.12, tilt: 0.12, thLen: Math.PI * 0.4 },
  tammo: { k: 1.12, tilt: 0.12, thLen: Math.PI * 0.4 },
  beanie: { k: 1.14, tilt: 0.22, thLen: Math.PI * 0.4 },
  flatcap: { k: 1.1, tilt: 0.25, thLen: Math.PI * 0.4 },
};

// Haar onder een schaalhoed: elk haarpunt dat onder de schil valt (boven de onderrand) wordt radiaal naar binnen geschoven tot onder de
// binnenwand van de schil, zodat er geen haar door de pet of het mutsje steekt (voorheen tot 7 cm bij een knot of een staart). Wat onder de
// rand uitkomt (lange lokken, krullen aan de zijkant) blijft zoals het was.
function fitHairUnderHat(B, from, to, S) {
  const p = B.groups[0].p, rimNy = Math.cos(S.thLen), c = Math.cos(S.tilt), sn = Math.sin(S.tilt), kin = RIM + (S.k - RIM) * 0.4;
  for (let i = from; i < to; i += 3) {
    const x = p[i], y = p[i + 1] - HEAD_Y, z = p[i + 2];
    const x0 = x * c + y * sn, y0 = -x * sn + y * c; // terug uit de tilt van de schil
    const ny = y0 / 0.118;
    if (ny <= rimNy) continue;
    const q = headQ(x0, y0, z);
    // de schil is een 14-hoek: tussen de hoekpunten ligt het vlak ca. 3 procent onder de bol, daar blijft het haar onder
    const qmax = Math.max(1, (RIM + (kin - RIM) * Math.min(1, (ny - rimNy) / 0.45)) * 0.965 - 0.006);
    if (q > qmax) { const u = qmax / q; p[i] = x * u; p[i + 1] = y * u + HEAD_Y; p[i + 2] = z * u; }
  }
}

// De hoofdellipsoide (headShape) omgekeerd: hoe ver (1 = op het oppervlak) ligt een punt, vanuit het hoofdcentrum (y relatief aan HEAD_Y).
function headQ(x, y, z) {
  const ny = y / 0.118;
  const fz = ny < 0 ? 1 - 0.3 * Math.pow(-ny, 1.4) : 1;
  let fx = 1;
  if (ny < 0) fx *= x > 0 ? 1 - 0.1 * -ny : 1 - 0.3 * -ny;
  if (x < 0 && ny > -0.3) fx *= 1.07;
  return Math.hypot(x / (0.097 * fx), ny, z / (0.086 * fz));
}

// The hood of a hoodie or jacket, hanging at the back of the neck: an open bowl, so it gets an inner wall (faces turned in, a bit smaller) and reads as cloth
// with a lining instead of a see-through fin seen from the side or from above.
function hoodBowl(B, top) {
  tag(B, 'hoodbowl');
  const bowl = (k) => ell(8, 4, (x, y, z) => [x * 0.11 * k - 0.1, y * 0.09 * k + 1.47, z * 0.13 * k], Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62);
  B.geo(bowl(1), null, shade(top, 0.9));
  B.geo(flipWinding(bowl(0.88).toNonIndexed()), null, shade(top, 0.68));
  tag(B, 'topdetail');
}

function lumpyCap(B, k, color, seed, lift = 0) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const j = 1 + (hash2(Math.round(x * 50) + seed, Math.round(y * 50) * 3 + Math.round(z * 50)) - 0.5) * 0.14;
    const [hx, hy, hz] = headShape(k * j, -0.012, lift)(x, Math.max(y, -0.05), z);
    p.setXYZ(i, hx, hy, hz);
  }
  B.geo(g, null, color);
}

function buildHair(B, L) {
  // the 17 styles (models3d_hair.js: scalp shell with a hairline, locks, a highlight); the hijab stays here
  if (L.hairStyle !== 'hijab' && buildHairStyle(B, L, { HEAD_Y, headShape, shade, mix })) return;
  const c = L.hair, style = L.hairStyle;
  const capped = L.hat === 'tammo' || L.hat === 'cap' || L.hat === 'police' || L.hat === 'flatcap' || L.hat === 'beanie' || L.hoodUp;
  switch (style) {
    case 'bald':
      if (L.age === 'old') B.geo(ell(8, 2, headShape(1.03, -0.004), -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.42, Math.PI * 0.16), null, c);
      break;
    case 'buzz':
      hairCap(B, L, 1.015, 0.32, capped ? c : mix(c, 0x6a5a4a, 0.15));
      break;
    case 'curly':
      if (capped) hairCap(B, L, 1.06, 0.4, c);
      else lumpyCap(B, 1.14, c, 3);
      break;
    case 'afro':
      if (capped) hairCap(B, L, 1.08, 0.4, c);
      else lumpyCap(B, 1.42, c, 7, 0.03);
      break;
    case 'hijab':
      break;
    default:
      hairCap(B, L, style === 'short' ? 1.06 : 1.08, 0.3, c);
  }
  if (style === 'short' || style === 'buzz') {
    for (const s of [1, -1]) B.box(0.028, HEAD_Y + 0.004, s * 0.084, 0.022, 0.045, 0.01, c);
  }
  if (style === 'long') {
    hairCurtain(B, c, L.character === 'anita' ? 0.29 : 0.26);
  } else if (style === 'bob') {
    const back = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true, Math.PI * 0.62, Math.PI * 1.76);
    const p = back.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      p.setXYZ(i, p.getX(i) * (top ? 0.106 : 0.112) - 0.01, top ? HEAD_Y + 0.03 : HEAD_Y - 0.085, p.getZ(i) * (top ? 0.097 : 0.108));
    }
    B.geo(back, null, c);
  } else if (style === 'ponytail') {
    B.geo(tubeGeometry([-0.1, HEAD_Y + 0.03, 0], [-0.16, HEAD_Y - 0.2, 0], 0.035, 0.018, 5), null, c);
    B.box(-0.105, HEAD_Y + 0.025, 0, 0.03, 0.03, 0.05, shade(c, 0.6));
  } else if (style === 'bun') {
    B.geo(new THREE.SphereGeometry(1, 6, 4), composeMatrix(-0.075, HEAD_Y + 0.1, 0, 0, 0, 0, 0.052, 0.046, 0.052), c);
  } else if (style === 'hijab') {
    const hc = L.hijabColor;
    B.geo(ell(10, 6, headShape(1.13, -0.004), Math.PI + 0.62, Math.PI * 2 - 1.24, 0, Math.PI * 0.8), null, hc);
    B.geo(ell(10, 3, headShape(1.14, -0.004, 0.004), 0, Math.PI * 2, 0, Math.PI * 0.3), null, hc);
    B.bone = BONE.chest;
    B.geo(loftGeometry([{ y: 1.36, d: 0.13, w: 0.19, sq: 0.8 }, { y: 1.46, d: 0.085, w: 0.1 }, { y: 1.55, d: 0.075, w: 0.08 }], 10), null, shade(hc, 0.92));
    B.bone = BONE.head;
  }
}

// Long hair as one closed shell: an outer and a slightly darker inner
// surface joined along the face opening and the tips, hugging the scalp at
// the top and falling straight onto the back and shoulders. Alternate
// columns are shaded a touch so it reads as tidy strands, not a helmet.
// Pushes a head-local point sideways out of the head ellipsoid (to m times its size), so the inner wall of a hair shell never sinks into the face
// at the temples where the opening of the curtain meets the head (#985).
export function outsideHead(pt, m = 1.03) {
  const ny = (pt[1] - HEAD_Y) / 0.118;
  if (Math.abs(ny) >= 0.99) return pt;
  let hx = 0.097, hz = 0.086;
  if (ny < 0) { hz *= 1 - 0.3 * Math.pow(-ny, 1.4); hx *= pt[0] > 0 ? 1 - 0.1 * -ny : 1 - 0.3 * -ny; }
  if (pt[0] < 0 && ny > -0.3) hx *= 1.07;
  const w = Math.sqrt(1 - ny * ny);
  const q = Math.hypot(pt[0] / (hx * w), pt[2] / (hz * w));
  if (!(q < m)) return pt;
  const s = m / Math.max(q, 1e-3);
  return [pt[0] * s, pt[1], pt[2] * s];
}

function hairCurtain(B, c, len) {
  const COLS = 12, ROWS = 4, T = 0.016;
  const open = 0.34 * Math.PI;
  const inner = shade(c, 0.72);
  const rows = [
    { y: HEAD_Y + 0.05, rx: 0.1, rz: 0.091, dx: -0.014 },
    { y: HEAD_Y - 0.02, rx: 0.108, rz: 0.1, dx: -0.016 },
    { y: HEAD_Y - 0.1, rx: 0.106, rz: 0.106, dx: -0.024 },
    { y: HEAD_Y - 0.19, rx: 0.1, rz: 0.114, dx: -0.036 },
    { y: HEAD_Y - len, rx: 0.092, rz: 0.12, dx: -0.05 },
  ];
  const at = (r, i, off) => {
    const a = open + (i / COLS) * (Math.PI * 2 - open * 2);
    const ca = Math.cos(a), sa = Math.sin(a);
    const front = Math.max(0, ca);
    const rx = r.rx + off, rz = r.rz + off;
    const pt = [ca * rx * (1 - 0.25 * front) + r.dx, r.y, sa * rz];
    return outsideHead(pt, off < 0 ? 1.02 : 1.06); // the inner wall stays outside the head, the outer wall a little further out
  };
  for (let k = 0; k < ROWS; k++) {
    const r0 = rows[k], r1 = rows[k + 1];
    for (let i = 0; i < COLS; i++) {
      const col = i % 2 ? shade(c, 0.93) : c;
      const a0 = at(r0, i, 0), a1 = at(r0, i + 1, 0), b0 = at(r1, i, 0), b1 = at(r1, i + 1, 0);
      const mid = (i + 0.5) / COLS * (Math.PI * 2 - open * 2) + open;
      const out = [Math.cos(mid), 0, Math.sin(mid)];
      B.quadOut(a0, a1, b1, b0, out, col);
      const ia0 = at(r0, i, -T), ia1 = at(r0, i + 1, -T), ib0 = at(r1, i, -T), ib1 = at(r1, i + 1, -T);
      B.quadOut(ia0, ia1, ib1, ib0, [-out[0], 0, -out[2]], inner);
    }
    for (const i of [0, COLS]) {
      const s = i === 0 ? 1 : -1;
      const a = open + (i / COLS) * (Math.PI * 2 - open * 2);
      const side = [-Math.sin(a) * s, 0, Math.cos(a) * s];
      B.quadOut(at(r0, i, 0), at(r1, i, 0), at(r1, i, -T), at(r0, i, -T), side, shade(c, 0.85));
    }
  }
  const last = rows[ROWS], first = rows[0];
  for (let i = 0; i < COLS; i++) {
    B.quadOut(at(last, i, 0), at(last, i + 1, 0), at(last, i + 1, -T), at(last, i, -T), [0, -1, 0], shade(c, 0.8));
    B.quadOut(at(first, i, 0), at(first, i + 1, 0), at(first, i + 1, -T), at(first, i, -T), [0, 1, 0], c);
  }
}

// Een bandje (krans, oren, sluier, kroon) ligt om het haar: de ring is minstens zo wijd als het haar op die hoogte (afro, krullen, hoge kam),
// anders zit hij in het haar. Geeft de factor waarmee de standaardring (d0 diep, w0 breed) groeit; 1 als het haar eronder past.
function bandScale(B, from, to, y0, y1, d0, w0) {
  const p = B.groups[0].p;
  let k = 1;
  for (let i = from; i < to; i += 3) {
    const y = p[i + 1] - HEAD_Y;
    if (y < y0 - 0.02 || y > y1 + 0.02) continue;
    k = Math.max(k, Math.hypot((p[i] + 0.006) / d0, p[i + 2] / w0)); // headTilt schuift de ring 6 mm naar achteren
  }
  return k > 1 ? k + 0.07 : 1;
}

function buildHat(B, L, hair0 = 0, hair1 = 0) {
  const hat = L.hat;
  if (!hat) {
    if (L.hoodUp) {
      tag(B, 'hood');
      const c = L.top === 'raincoat' ? L.raincoatColor : L.topColor;
      B.geo(ell(10, 5, headShape(1.2, -0.012, 0.006), Math.PI + 0.72, Math.PI * 2 - 1.44, 0, Math.PI * 0.7), null, c);
      B.geo(ell(10, 2, headShape(1.21, -0.012, 0.008), 0, Math.PI * 2, 0, Math.PI * 0.24), null, c);
    }
    return;
  }
  tag(B, 'hatshell');
  if (hat === 'beanie') {
    hairCap(B, L, HAT_SHELL.beanie.k, HAT_SHELL.beanie.tilt, L.hatColor, HAT_SHELL.beanie.thLen, shade(L.hatColor, 0.62));
    fitHairUnderHat(B, hair0, hair1, HAT_SHELL.beanie);
    tag(B, 'hattrim');
    B.geo(loftGeometry([{ y: HEAD_Y + 0.02, d: 0.113, w: 0.1 }, { y: HEAD_Y + 0.055, d: 0.114, w: 0.101 }], 10), headTilt(0.12), shade(L.hatColor, 0.85));
  } else if (hat === 'cap' || hat === 'tammo') {
    const c = hat === 'tammo' ? L.capColor : L.hatColor;
    hairCap(B, L, HAT_SHELL.cap.k, HAT_SHELL.cap.tilt, c, HAT_SHELL.cap.thLen, shade(c, 0.62));
    fitHairUnderHat(B, hair0, hair1, HAT_SHELL.cap);
    tag(B, 'hattrim');
    const brim = new THREE.CylinderGeometry(1, 1, 0.014, 8, 1, false, 0, Math.PI);
    B.geo(brim, composeMatrix(0.075, HEAD_Y + 0.045, 0, 0, 0, -0.16, 0.095, 1, 0.098), shade(c, 0.82));
    B.geo(new THREE.SphereGeometry(1, 5, 2, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(-0.01, HEAD_Y + 0.13, 0, 0, 0, 0.12, 0.014, 0.01, 0.014), shade(c, 0.8));
    if (hat === 'tammo') {
      B.geo(loftGeometry([{ y: HEAD_Y + 0.03, d: 0.108, w: 0.098 }, { y: HEAD_Y + 0.05, d: 0.109, w: 0.099 }], 10), headTilt(0.12), shade(c, 0.7));
      // het plaatje van de Stadjer ligt op de schil (plek en hoek volgen de kromming van de schil), niet erboven
      const S = HAT_SHELL.tammo, cs = Math.cos(S.tilt), sn = Math.sin(S.tilt);
      const on = (th) => {
        const t = Math.min(1, (Math.cos(th) - Math.cos(S.thLen)) / 0.45);
        const q = headShape(RIM + (S.k - RIM) * t, -0.006 * t, 0.004 * t)(Math.sin(th), Math.cos(th), 0);
        return [q[0] * cs - (q[1] - HEAD_Y) * sn, q[0] * sn + (q[1] - HEAD_Y) * cs];
      };
      const p1 = on(0.95), p2 = on(0.6), tl = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const tx = (p2[0] - p1[0]) / tl, ty = (p2[1] - p1[1]) / tl;
      B.box((p1[0] + p2[0]) / 2 + ty * 0.0012, HEAD_Y + (p1[1] + p2[1]) / 2 - tx * 0.0012, 0, 0.006, 0.032, 0.044, 0xe6e1d6, 0, 0, 0, Math.atan2(-tx, ty));
    }
  } else if (hat === 'flatcap') {
    hairCap(B, L, HAT_SHELL.flatcap.k, HAT_SHELL.flatcap.tilt, L.hatColor, HAT_SHELL.flatcap.thLen, shade(L.hatColor, 0.62));
    fitHairUnderHat(B, hair0, hair1, HAT_SHELL.flatcap);
    tag(B, 'hattrim');
    B.box(0.075, HEAD_Y + 0.058, 0, 0.1, 0.018, 0.18, shade(L.hatColor, 0.9), 0, 0, 0, -0.28);
  } else if (hat === 'police') {
    const crown = loftGeometry([
      { y: HEAD_Y + 0.035, d: 0.104, w: 0.094 },
      { y: HEAD_Y + 0.075, d: 0.106, w: 0.096 },
      { y: HEAD_Y + 0.12, d: 0.124, w: 0.112 },
      { y: HEAD_Y + 0.13, d: 0.118, w: 0.106 },
    ], 10);
    B.geo(crown, headTilt(0.05), COP_NAVY);
    tag(B, 'hattrim');
    B.geo(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), composeMatrix(-0.006, HEAD_Y + 0.13, 0, 0, 0, 0.05, 0.118, 1, 0.106), shade(COP_NAVY, 1.15));
    B.geo(loftGeometry([{ y: HEAD_Y + 0.045, d: 0.107, w: 0.097 }, { y: HEAD_Y + 0.07, d: 0.108, w: 0.098 }], 10), headTilt(0.05), 0xc8ccd0);
    const brim = new THREE.CylinderGeometry(1, 1, 0.012, 8, 1, false, 0, Math.PI);
    B.geo(brim, composeMatrix(0.07, HEAD_Y + 0.04, 0, 0, 0, -0.3, 0.08, 1, 0.09), 0x111214);
    B.box(0.112, HEAD_Y + 0.1, 0, 0.01, 0.028, 0.022, 0xb8a060);
  } else if (hat === 'krans') {
    // een bloemenkrans (vrijgezellenfeest, vrijgezellen.js): een groen bandje met kleine bloemen eromheen
    const f = bandScale(B, hair0, hair1, 0.06, 0.085, 0.109, 0.099);
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.109 * f, w: 0.099 * f }, { y: HEAD_Y + 0.085, d: 0.111 * f, w: 0.101 * f }], 10), headTilt(0.05), 0x3f8a3c);
    tag(B, 'hattrim');
    const bloem = [L.hatColor, 0xf2c400, 0xffffff, 0xff8a3c];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      B.box(Math.cos(a) * 0.113 * f, HEAD_Y + 0.082 + (k % 2) * 0.012, Math.sin(a) * 0.103 * f, 0.036, 0.036, 0.036, bloem[k % 4], 0, a * 0.5, 0.3, a);
    }
  } else if (hat === 'konijn') {
    // een bandje met twee lange konijnenoren, roze van binnen
    const f = bandScale(B, hair0, hair1, 0.06, 0.072, 0.108, 0.098);
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.108 * f, w: 0.098 * f }, { y: HEAD_Y + 0.072, d: 0.109 * f, w: 0.099 * f }], 10), headTilt(0.05), shade(L.hatColor, 0.8));
    tag(B, 'hattrim');
    for (const s of [1, -1]) {
      B.box(-0.015, HEAD_Y + 0.22, s * 0.055, 0.034, 0.2, 0.05, L.hatColor, 0, 0.18 * s, 0, 0.15);
      B.box(0.003, HEAD_Y + 0.22, s * 0.058, 0.012, 0.15, 0.03, 0xf2a6c0, 0, 0.18 * s, 0, 0.15);
    }
  } else if (hat === 'sluier') {
    // de sluier van de bruid: een kransje en een lichte sluier tot op de schouders
    const f = bandScale(B, hair0, hair1, 0.06, 0.07, 0.108, 0.098);
    B.geo(loftGeometry([{ y: HEAD_Y + 0.06, d: 0.108 * f, w: 0.098 * f }, { y: HEAD_Y + 0.07, d: 0.109 * f, w: 0.099 * f }], 10), headTilt(0.05), 0xf2efe6);
    tag(B, 'hattrim');
    B.box(-0.125 * f, HEAD_Y - 0.06, 0, 0.012, 0.34, 0.21 * f, 0xf8f6f0, 0, 0, 0, 0.06);
    for (const s of [1, -1]) B.box(0.02, HEAD_Y + 0.085, s * 0.075 * f, 0.03, 0.03, 0.03, 0xf4d3de);
  } else if (hat === 'tiara') {
    // een gouden kroontje met vijf puntjes
    const f = bandScale(B, hair0, hair1, 0.07, 0.085, 0.107, 0.097);
    B.geo(loftGeometry([{ y: HEAD_Y + 0.07, d: 0.107 * f, w: 0.097 * f }, { y: HEAD_Y + 0.085, d: 0.108 * f, w: 0.098 * f }], 10), headTilt(0.05), L.hatColor);
    tag(B, 'hattrim');
    for (let k = -2; k <= 2; k++) {
      const a = k * 0.5;
      B.box(Math.cos(a) * 0.112 * f, HEAD_Y + 0.112 - Math.abs(k) * 0.008, Math.sin(a) * 0.1 * f, 0.014, 0.034 - Math.abs(k) * 0.006, 0.014, L.hatColor, 0, 0, 0, 0);
    }
  }
}

// Swimwear: suit colour from the crotch up to the cut (trunks at the waist,
// a bikini low on the hips, a swimsuit up to the chest), bare skin above; a
// bikini adds a band round the chest.
function buildSwimTorso(B, L, skin, rings) {
  const c = L.pants;
  const cut = L.swim === 'swimsuit' ? 1.4 : L.swim === 'bikini' ? 0.93 : 1.0;
  B.bone = W_TORSO;
  B.geo(loftUp(slice(rings, 0.83, cut), 10), null, c);
  B.geo(new THREE.CircleGeometry(1, 10).rotateX(Math.PI / 2), composeMatrix(0, 0.83, 0, 0, 0, 0, 0.075, 1, 0.09), c);
  B.geo(loftUp(slice(rings, cut, 1.485, 1), 10), null, skin);
  if (L.swim === 'bikini') B.geo(loftGeometry(slice(rings, 1.22, 1.32, 1.035), 10, Math.PI / 10), null, c);
  else if (L.swim === 'trunks') B.geo(loftGeometry(slice(rings, 0.975, 1.005, 1.03), 10, Math.PI / 10), null, shade(c, 0.8));
  else B.geo(loftGeometry(slice(rings, 1.37, 1.4, 1.02), 10, Math.PI / 10), null, shade(c, 0.85));
}

function buildTorso(B, L, skin) {
  const rings = torsoRings(L);
  if (L.top === 'swim') { buildSwimTorso(B, L, skin, rings); return; }
  const top = L.topColor, pants = L.bottom === 'skirt' ? L.skirtColor : L.pants;
  const long = L.top === 'coat' || L.top === 'raincoat';
  const tucked = L.top === 'blazer' || L.top === 'police' || (L.top === 'longsleeve' && !L.female);
  const hem = L.top === 'dress' ? 0.84 : long ? 0.95 : tucked ? 1.0 : L.top === 'jacket' || L.top === 'hoodie' ? 0.92 : 0.95;
  B.bone = W_TORSO;
  tag(B, 'torsoLow');
  B.geo(loftUp(slice(rings, 0.83, hem), 10), null, L.top === 'dress' ? top : pants);
  B.geo(new THREE.CircleGeometry(1, 10).rotateX(Math.PI / 2), composeMatrix(0, 0.83, 0, 0, 0, 0, 0.075, 1, 0.09), L.top === 'dress' ? top : pants);
  tag(B, 'top');
  const layer = tucked ? 1.0 : 1.035;
  const topRings = slice(rings, hem, 1.485, 1);
  topRings[0] = { ...topRings[0], d: topRings[0].d * layer, w: topRings[0].w * layer };
  B.geo(loftUp(topRings, 10), null, top);

  const front = (y) => { const rg = ringAt(rings, y); return rg.d * (rg.front ?? 1); };
  tag(B, 'topdetail');
  if (tucked || L.top === 'tee' || L.bottom === 'skirt') {
    const bc = L.top === 'police' ? 0x121212 : shade(L.pants, 0.55);
    B.geo(loftGeometry(slice(rings, 0.985, 1.025, 1.045), 10, Math.PI / 10), null, bc);
    if (L.top !== 'police') B.box(front(1.005) * 1.04 + 0.004, 1.005, 0, 0.01, 0.034, 0.04, 0xb8a060);
  }

  const collarRing = (c, k = 1.12, h = 0.035) => {
    tag(B, 'collar');
    B.geo(loftGeometry([{ y: 1.445, d: 0.075 * k, w: 0.12 * k, sq: 0.8 }, { y: 1.45 + h, d: 0.062 * k, w: 0.07 * k }], 10), null, c);
    tag(B, 'topdetail');
  };
  const det0 = B.groups[0].p.length;
  switch (L.top) {
    case 'tee':
      collarRing(shade(top, 0.85), 1.02, 0.02);
      break;
    case 'longsleeve':
      B.box(front(1.4) + 0.012, 1.42, 0, 0.02, 0.04, 0.12, shade(top, 1.1), 0, 0, 0, -0.5);
      for (let i = 0; i < 3; i++) B.box(front(1.33 - i * 0.1) + 0.004, 1.33 - i * 0.1, 0, 0.006, 0.012, 0.012, 0xd8d4cc);
      break;
    case 'sweater':
      collarRing(shade(top, 0.8), 1.05, 0.04);
      B.geo(loftGeometry(slice(rings, hem, hem + 0.05, 1.07), 10, Math.PI / 10), null, shade(top, 0.8));
      break;
    case 'hoodie':
      surfaceStrip(B, rings, [{ y: 1.11, z: 0, hw: 0.1 }, { y: 1.01, z: 0, hw: 0.1 }], shade(top, 0.9), 0.008, 4); // de buidelzak volgt de buik (een vlakke doos zweefde aan de zijkanten)
      for (const s of [1, -1]) B.box(front(1.33) + 0.01, 1.29, s * 0.03, 0.006, 0.12, 0.008, 0xd8d4cc);
      if (!L.hoodUp) {
        B.bone = BONE.chest;
        hoodBowl(B, top);
        B.bone = W_TORSO;
      }
      collarRing(shade(top, 0.95), 1.1, 0.045);
      break;
    case 'jacket':
    case 'blazer': {
      const open = L.coatOpen !== undefined ? L.coatOpen : (L.top === 'blazer' || L.forceOpen || L.r(30) < 0.6);
      if (open) {
        tag(B, 'under');
        surfaceStrip(B, rings, [1.04, 1.1, 1.16, 1.22, 1.28, 1.34, 1.4].map((y) => ({ y, z: 0, hw: 0.04 })), L.under, 0.003, 3);
        tag(B, 'lapel');
        for (const s of [1, -1]) surfaceStrip(B, rings, [1.425, 1.375, 1.325, 1.275].map((y, i) => ({ y, z: s * (0.032 + i * 0.016), hw: 0.0175 })), shade(top, 0.85), 0.006);
        tag(B, 'topdetail');
      } else {
        surfaceStrip(B, rings, [0.96, 1.08, 1.2, 1.32, 1.44].map((y) => ({ y, z: 0, hw: 0.005 })), 0xb8b4ac, 0.003);
      }
      for (const s of [1, -1]) B.box(front(1.02) * 1.05, 1.02, s * 0.085, 0.012, 0.018, 0.06, shade(top, 0.75));
      if (L.hood) {
        B.bone = BONE.chest;
        hoodBowl(B, top);
        B.bone = W_TORSO;
      }
      collarRing(shade(top, 0.9), 1.12, 0.05);
      break;
    }
    case 'coat':
    case 'raincoat': {
      const c = L.top === 'raincoat' ? L.raincoatColor : top;
      const hemRings = [
        L.shortCoat ? { y: 0.66, d: 0.19, w: 0.25, front: 0.85 } : { y: 0.56, d: 0.2, w: 0.27, front: 0.8 },
        { y: 0.8, d: 0.14, w: 0.2 },
        { y: 0.99, d: 0.112, w: 0.172 },
      ];
      hemPanels(B, hemRings, 0.9, c);
      for (let i = 0; i < 3; i++) B.box(front(1.28 - i * 0.12) + 0.008, 1.28 - i * 0.12, 0.03, 0.01, 0.018, 0.018, L.top === 'raincoat' ? 0xe0ddd4 : 0x2a2622);
      if (L.top === 'coat') {
        B.geo(loftGeometry(slice(rings, 1.04, 1.08, 1.07), 10, Math.PI / 10), null, shade(c, 0.75));
        tag(B, 'lapel');
        for (const s of [1, -1]) surfaceStrip(B, rings, [1.43, 1.38, 1.33, 1.28].map((y, i) => ({ y, z: s * (0.036 + i * 0.017), hw: 0.02 })), shade(c, 0.88), 0.006);
        tag(B, 'topdetail');
      }
      collarRing(shade(c, 0.88), 1.15, 0.06);
      break;
    }
    case 'dress':
      hemPanels(B, [{ y: 0.52, d: 0.17, w: 0.23, front: 0.82 }, { y: 0.84, d: 0.11, w: 0.18 }, { y: 0.99, d: 0.1, w: 0.165 }], 0.9, top);
      collarRing(shade(top, 0.9), 1.0, 0.015);
      break;
    case 'police': {
      B.geo(loftGeometry(slice(rings, 1.15, 1.2, 1.035), 10, Math.PI / 10), null, REFLECT_YELLOW);
      B.geo(loftGeometry(slice(rings, 1.2, 1.225, 1.035), 10, Math.PI / 10), null, REFLECT_BLUE);
      B.geo(loftGeometry(slice(rings, 1.125, 1.15, 1.035), 10, Math.PI / 10), null, REFLECT_BLUE);
      B.box(front(1.2) + 0.01, 1.22, 0, 0.006, 0.44, 0.006, 0x3a4050);
      B.box(front(1.33) + 0.012, 1.33, -0.075, 0.022, 0.07, 0.04, 0x141414);
      B.box(front(1.33) + 0.02, 1.36, -0.075, 0.008, 0.04, 0.008, 0x222222);
      collarRing(shade(COP_NAVY, 1.2), 1.12, 0.05);
      B.bone = BONE.pelvis;
      B.box(0.0, 0.99, -0.165, 0.09, 0.14, 0.05, 0x121212);
      B.box(0.075, 0.99, 0.14, 0.05, 0.08, 0.05, 0x1a1a1a);
      B.bone = W_TORSO;
      break;
    }
  }

  const det1 = B.groups[0].p.length;
  if (L.bottom === 'skirt') {
    hemPanels(B, [{ y: 0.58, d: 0.155, w: 0.21, front: 0.85 }, { y: 0.9, d: 0.112, w: 0.176 }, { y: 1.0, d: 0.1, w: 0.162 }], 0.9, L.skirtColor);
  }

  if (L.scarf) {
    tag(B, 'scarf');
    B.bone = BONE.chest;
    // de sjaal volgt de romp van deze lichaamsvorm (de onderring ligt om de schouders, niet erin), en blijft buiten de kraag
    const sc = (y, k, kw) => { const rg = ringAt(rings, y); return { y, d: rg.d * (rg.front ?? 1) * k + 0.006, w: rg.w * kw + 0.006, sq: rg.sq, x: rg.x }; };
    // revers, zakken en kraag van de kleding eronder (de details die op de romp liggen) passen er ook in: de sjaal wordt zo wijd als nodig
    const r0 = sc(1.4, 1.1, 1.06), r1 = sc(1.455, 1.14, 1.1), pd = B.groups[0].p;
    let fit = 1;
    for (let i = det0; i < det1; i += 3) {
      const y = pd[i + 1];
      if (y < 1.38 || y > 1.5 || pd[i] < 0.02) continue; // alleen de voorkant: de capuchon hangt achter de nek
      const t = Math.min(1, Math.max(0, (y - 1.4) / 0.055)), dd = r0.d + (r1.d - r0.d) * t, ww = r0.w + (r1.w - r0.w) * t;
      fit = Math.max(fit, Math.hypot((pd[i] - (r0.x || 0)) / dd, pd[i + 2] / ww));
    }
    if (fit > 1) { fit += 0.03; for (const r of [r0, r1]) { r.d *= fit; r.w *= fit; } }
    B.geo(loftGeometry([r0, r1, { y: 1.49, d: 0.088 * Math.min(fit, 1.25), w: 0.092 * Math.min(fit, 1.25) }, { y: 1.53, d: 0.07, w: 0.074 }], 10, Math.PI / 10), null, L.scarfColor); // zelfde fase als de romp, zodat de zijvlakken op elkaar liggen
    // het hangende eind ligt op de borst en volgt de romp (een vlakke plank stond voor de bovenborst en in de buik van breed postuur)
    surfaceStrip(B, rings, [{ y: 1.42, z: 0.04, hw: 0.0275 }, { y: 1.32, z: 0.046, hw: 0.0275 }, { y: 1.22, z: 0.052, hw: 0.0275 }], shade(L.scarfColor, 0.9), 0.012);
    B.bone = W_TORSO;
  }

  tag(B, 'bag');
  if (L.bag === 'backpack') {
    B.bone = BONE.chest;
    const bx = -ringAt(rings, 1.22).d - 0.07;
    B.box(bx, 1.2, 0, 0.13, 0.34, 0.27, L.bagColor);
    B.geo(new THREE.CylinderGeometry(1, 1, 0.27, 6, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), composeMatrix(bx, 1.37, 0, 0, 0, 0, 0.065, 0.065, 1), L.bagColor);
    B.box(bx - 0.075, 1.12, 0, 0.03, 0.14, 0.2, shade(L.bagColor, 0.8));
    for (const s of [1, -1]) B.box(0.01, 1.3, s * 0.1, ringAt(rings, 1.3).d * 2.1, 0.035, 0.035, shade(L.bagColor, 0.65), 0, 0, 0, 0);
    B.bone = W_TORSO;
  } else if (L.bag === 'shoulder') {
    B.bone = BONE.pelvis;
    // de tas hangt in de ruimte tussen romp en arm: 5 cm dik en zo ver naar buiten als de arm toelaat (de arm hangt op heuphoogte op shZ + 0,47 sin(splay) - straal)
    const hw = ringAt(rings, 0.95).w, armIn = shoulderZ(L) + 0.47 * Math.sin(0.06) - (L.build === 'heavy' ? 0.044 : L.build === 'slim' ? 0.036 : 0.04);
    const zc = Math.max(hw + 0.029, Math.min(hw + 0.05, armIn - 0.029));
    B.box(0.02, 0.93, zc, 0.25, 0.19, 0.05, L.bagColor);
    B.box(0.02, 1.0, zc + 0.029, 0.2, 0.06, 0.008, shade(L.bagColor, 0.8));
    B.bone = BONE.chest;
    // de band loopt van de rechterschouder schuin over borst en rug naar de tas op de linkerheup, op het oppervlak van de romp (voorheen twee buizen dwars door
    // het lijf: het uiteinde stak als een zwart mes uit de borst)
    for (const back of [false, true]) {
      const zEnd = Math.min(hw * 0.92, 0.14);
      surfaceStrip(B, rings, Array.from({ length: 13 }, (_, i) => ({ y: 1.47 - i * 0.0367, z: -0.07 + (zEnd + 0.07) * i / 12, hw: 0.013 })), shade(L.bagColor, 0.65), 0.004, 2, back);
    }
    B.bone = W_TORSO;
  }
}

function buildLegs(B, L, skin) {
  const f = L.female;
  const legRings = [
    { y: 0.98, d: 0.074, w: 0.064 },
    { y: 0.8, d: f ? 0.08 : 0.078, w: f ? 0.078 : 0.074 },
    { y: 0.57, d: 0.056, w: 0.054 },
    { y: 0.49, d: 0.054, w: 0.05 },
    { y: 0.37, d: 0.058, w: 0.05, x: -0.008 },
    { y: 0.13, d: 0.036, w: 0.034 },
  ].map((r) => (L.build === 'heavy' ? { ...r, d: r.d * 1.1, w: r.w * 1.1 } : L.build === 'slim' ? { ...r, d: r.d * 0.93, w: r.w * 0.93 } : r));
  const bare = L.bottom === 'skirt' || L.bottom === 'dress';
  const legColor = bare ? L.tights : L.pants;
  const hemY = L.bottom === 'swim' ? (L.swim === 'trunks' ? 0.7 : 0.9) : L.bottom === 'shorts' ? 0.6 : bare ? 0.13 : 0.12;
  const hipZ = f ? 0.084 : 0.088;
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const M = composeMatrix(0, 0, s * hipZ);
    B.bone = W_LEG(k);
    tag(B, 'leg');
    const flare = L.bottom === 'jeans' || L.bottom === 'trousers' ? 1.12 : 1;
    const upper = slice(legRings, hemY, 0.98).map((r, i) => (i === 0 ? { ...r, d: r.d * flare, w: r.w * flare } : r));
    B.geo(loftUp(upper, 7), M, legColor);
    if (hemY > 0.13) {
      B.geo(loftUp(slice(legRings, 0.1, hemY), 7), M, skin);
      B.geo(loftGeometry(slice(legRings, hemY - 0.005, hemY + 0.03, 1.12), 7, Math.PI / 7), M, shade(L.pants, 0.85));
    }
    // voetbalkousen tot de knie en scheenbeschermers (voetbalkleding 22-11): over de huid, onder het broekje; 6 procent ruimer dan het been
    if ((L.socks != null || L.guard != null) && hemY >= 0.55) {
      const sockTop = 0.5, sockRings = slice(legRings, 0.1, sockTop, 1.06);
      if (L.socks != null) {
        tag(B, 'sock');
        B.geo(loftUp(sockRings, 7), M, L.socks);
        B.geo(loftGeometry(slice(legRings, sockTop - 0.045, sockTop, 1.1), 7, Math.PI / 7), M, shade(L.socks, 0.8)); // de boord bovenaan
      }
      if (L.guard != null) {
        tag(B, 'guard');
        const gr = slice(legRings, 0.1, sockTop, L.socks != null ? 1.06 : 1);
        surfaceStrip(B, gr, [0.4, 0.34, 0.26, 0.19].map((y, i) => ({ y, z: 0, hw: 0.03 - i * 0.002 })), L.guard, 0.005, 3, false, 7, s * hipZ);
        if (L.socks == null) surfaceStrip(B, gr, [0.4, 0.19].map((y) => ({ y, z: 0, hw: 0.042 })), shade(L.guard, 0.7), 0.003, 1, false, 7, s * hipZ); // de band om het been
      }
      tag(B, 'leg'); // wat hierna komt (de heupbol) hoort weer bij het been
    }
    B.bone = BONE.pelvis;
    const top = upper[upper.length - 1];
    B.geo(new THREE.SphereGeometry(Math.max(top.d, top.w) * 0.85, 8, 6), composeMatrix(0, HIP_Y, s * hipZ), legColor);
    B.bone = BONE.knee[k];
    tag(B, 'shoe');
    if (L.bottom === 'swim') buildFoot(B, M, skin);
    else buildShoe(B, L, M, skin);
  }
}

function buildFoot(B, M, skin) {
  B.geo(new THREE.BoxGeometry(0.22, 0.05, 0.08), M.clone().multiply(composeMatrix(0.05, 0.035, 0)), skin);
  B.geo(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), M.clone().multiply(composeMatrix(0.13, 0.03, 0, 0, 0, 0, 0.05, 0.035, 0.04)), skin);
}

function buildShoe(B, L, M, skin) {
  if (L.shoeType === 'cleat') { buildCleat(B, L, M); return; }
  const sole = L.shoeType === 'sneaker' ? (L.shoes > 0xa00000 ? 0xa8a49c : 0xe0dcd2) : 0x1a1512;
  const c = L.shoes;
  const m = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  B.geo(new THREE.BoxGeometry(0.27, 0.028, 0.098), m(0.055, 0.014, 0), sole);
  const bootH = L.shoeType === 'boot' ? 0.17 : 0.1;
  B.geo(new THREE.BoxGeometry(0.15, bootH - 0.028, 0.088), m(-0.005, 0.028 + (bootH - 0.028) / 2, 0), c);
  B.geo(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), m(0.1, 0.028, 0, 0, 0, 0, 0.09, 0.058, 0.046), c);
  if (L.shoeType === 'sneaker') B.geo(new THREE.BoxGeometry(0.06, 0.012, 0.05), m(0.09, 0.075, 0, 0, 0, -0.45), shade(c, c > 0xa00000 ? 0.8 : 1.5));
}

// Voetbalschoen met noppen (voetbalkleding 22-11): vier uitvoeringen, van dorpsveld (effen, zes noppen) tot topklasse (hielkap, tong, opvallende kleur).
// De noppen staan op de grond (y = 0), de zool erboven; de schacht is dezelfde doos als bij andere schoenen en blijft onder 0,13 (de enkel).
function buildCleat(B, L, M) {
  const c = L.shoes, tier = L.cleat || 1;
  const m = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  const sole = tier >= 4 ? shade(c, 0.55) : 0x1a1512;
  B.geo(new THREE.BoxGeometry(0.27, 0.02, 0.098), m(0.055, 0.018, 0), sole);
  const studs = tier >= 3 ? [[0.17, 0.03], [0.17, -0.03], [0.11, 0.032], [0.11, -0.032], [-0.04, 0.026], [-0.04, -0.026]] : [[0.16, 0.026], [0.16, -0.026], [0.1, 0.0], [-0.04, 0.024], [-0.04, -0.024], [0.13, 0.0]];
  for (const [x, z] of studs) B.geo(new THREE.BoxGeometry(tier >= 3 ? 0.012 : 0.018, 0.009, tier >= 3 ? 0.026 : 0.018), m(x, 0.0045, z), 0xb8b4ac);
  const h = tier >= 3 ? 0.115 : 0.1;
  B.geo(new THREE.BoxGeometry(0.15, h - 0.028, 0.088), m(-0.005, 0.028 + (h - 0.028) / 2, 0), c);
  B.geo(new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2), m(0.1, 0.028, 0, 0, 0, 0, 0.09, 0.058, 0.046), c);
  const accent = tier === 2 ? 0xe8e6e0 : shade(c, tier >= 4 ? 1.5 : 1.35);
  if (tier >= 2) for (const sz of [1, -1]) B.geo(new THREE.BoxGeometry(0.11, 0.022, 0.004), m(0.0, 0.058, sz * 0.0455, 0, 0, -0.18), accent); // de streep op de zijkant
  if (tier >= 3) B.geo(new THREE.BoxGeometry(0.15, 0.02, 0.092), m(-0.005, h + 0.0, 0), shade(c, 0.7)); // de manchet om de enkel
  if (tier >= 4) {
    B.geo(new THREE.BoxGeometry(0.03, 0.05, 0.092), m(-0.07, 0.066, 0), accent);                         // de hielkap
    B.geo(new THREE.BoxGeometry(0.045, 0.012, 0.045), m(0.075, 0.098, 0, 0, 0, -0.4), accent);        // de tong
  }
}

function buildArms(B, L, skin, shZ) {
  const heavy = L.build === 'heavy', slim = L.build === 'slim';
  const g = heavy ? 1.12 : slim ? 0.92 : 1;
  const armRings = [
    { y: 0.01, d: 0.046, w: 0.046 },
    { y: -0.06, d: 0.054 * g, w: 0.052 * g },
    { y: -0.255, d: 0.043 * g, w: 0.042 * g },
    { y: -0.325, d: 0.04 * g, w: 0.039 * g },
    { y: -0.53, d: 0.031, w: 0.028 },
  ];
  const sleeveColor = L.top === 'raincoat' ? L.raincoatColor : L.bib && L.under != null ? L.under : L.topColor;
  let sleeveEnd;
  if (L.top === 'swim') sleeveEnd = -0.04;
  else if (L.top === 'tee' || L.top === 'dress') sleeveEnd = -0.14;
  else if (L.top === 'longsleeve' && L.rolled) sleeveEnd = -0.3;
  else sleeveEnd = -0.5;
  const cuffK = L.top === 'coat' || L.top === 'raincoat' || L.top === 'jacket' || L.top === 'police' || L.top === 'blazer' ? 1.22 : 1.1;

  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const M = composeMatrix(0, SHOULDER_Y, s * shZ, -s * ARM_SPLAY, 0, 0);
    const m = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
    B.bone = W_ARM(k);
    tag(B, 'sleeve');
    const sleeve = slice(armRings, sleeveEnd, 0.01, 1.04);
    if (L.top !== 'tee' && L.top !== 'dress' && L.top !== 'swim' && !(L.top === 'longsleeve' && L.rolled)) sleeve[0] = { ...sleeve[0], d: sleeve[0].d * 1.12, w: sleeve[0].w * 1.12 };
    B.geo(loftUp(sleeve, 6), M, sleeveColor);
    // round cap around the shoulder pivot so no gap opens in any arm pose
    const capR = sleeve[sleeve.length - 2].d * 1.08;
    B.part(new THREE.SphereGeometry(capR, 10, 6), composeMatrix(0, SHOULDER_Y - 0.012, s * (shZ - 0.024), 0, 0, 0, 1.02, 0.88, 1.12), sleeveColor, BONE.chest);
    tag(B, 'armskin');
    B.geo(loftUp(slice(armRings, -0.53, sleeveEnd), 6), M, skin);
    tag(B, 'cuff');
    if (L.top !== 'swim') B.geo(loftGeometry(slice(armRings, sleeveEnd - 0.03, sleeveEnd + 0.005, cuffK), 6), M, shade(sleeveColor, 0.82));
    if (L.cop) B.geo(loftGeometry(slice(armRings, -0.14, -0.1, 1.09), 6), M, REFLECT_YELLOW);
    if (L.captain != null && k === 0 && sleeveEnd < -0.12) { tag(B, 'captainband'); B.geo(loftGeometry(slice(armRings, -0.115, -0.075, 1.08), 6), M, L.captain); } // aanvoerdersband om de linkerbovenarm

    B.bone = BONE.elbow[k];
    tag(B, 'hand');
    const hy = -0.575;
    // de hand loopt taps uit de pols: bovenaan smaller dan de manchet, zodat er nooit een blokhoek uit de mouw steekt (video-QA 23-11, bevinding 7);
    // de punt sluit met een kleine ring (een loft is open)
    B.geo(loftUp([
      { y: hy - 0.07, d: 0.012, w: 0.006, x: 0.014 },
      { y: hy - 0.05, d: 0.032, w: 0.013, x: 0.012 },
      { y: hy - 0.005, d: 0.034, w: 0.015, x: 0.008 },
      { y: hy + 0.055, d: 0.026, w: 0.022 },
    ], 6), M, skin);
    B.geo(new THREE.BoxGeometry(0.02, 0.045, 0.02), m(0.04, hy - 0.012, -s * 0.012, 0, 0, 0.35), shade(skin, 0.95));
    // losjes gekromde vingers aan de palm: de hand leest als hand in plaats van als blok
    B.geo(new THREE.BoxGeometry(0.03, 0.05, 0.026), m(0.026, hy - 0.083, 0, 0, 0, 0.5), shade(skin, 0.97));
  }
}

// Shared by every person: vertex colours carry all the per-person variation.
const PERSON_MAT = markShared(vcMaterial({ roughness: 0.82 }));
const BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5);
// #658: de rompgeometrie hangt alleen van de look af (kleuren zitten in de vertexkleuren). Gelijke
// looks delen daarom één geometry; de rig, het skelet en de bone-texture blijven per persoon.
// De cache is een LRU met een kleine bovengrens. Bij evictie wordt de geometry NIET disposed: hij kan
// nog door levende voetgangers gebruikt worden en is met userData.shared gemarkeerd, zodat
// scene3d.disposeObject hem met rust laat.
export const PERSON_TEMPLATE_CACHE_MAX = 120;
const personGeometries = new Map();
const personCache = { hits: 0, misses: 0, evictions: 0, builds: 0 };
export const personCacheStats = () => ({ ...personCache, size: personGeometries.size });
export function resetPersonCacheStats() { personCache.hits = 0; personCache.misses = 0; personCache.evictions = 0; personCache.builds = 0; }
function geometryKey(shirt, skin, L) {
  // Alle velden die buildTorso/buildHead/buildLegs/buildArms echt in de geometrie bakken.
  return JSON.stringify([personProbe.layers ? 'lagen' : '', shirt, skin, L.coatOpen, L.character, L.cop, L.female, L.age, L.build, L.top, L.topColor,
    L.bottom, L.pants, L.skirtColor, L.hairStyle, L.hair, L.hat, L.hatColor, L.hijabColor, L.hood, L.hoodUp,
    L.scarf, L.scarfColor, L.bag, L.bagColor, L.glasses, L.facial, L.swim, L.raincoatColor, L.shoes, L.shoeType,
    L.under, L.rolled, L.tights, L.forceOpen, L.shortCoat, L.capColor, L.shades, L.socks, L.guard, L.cleat, L.captain, L.bib]);
}

function autoKnee(z) {
  return z > 0 ? -z * 1.05 : z * 0.35;
}

function autoElbow(z) {
  return 0.12 + Math.max(0, z) * 0.35;
}

function linkJoint(parent, child, fn, override = null) {
  const rot = parent.rotation, q = parent.quaternion;
  let busy = false;
  rot._onChange(() => {
    q.setFromEuler(rot, false);
    if (busy) return;
    busy = true;
    if (!override || !override()) child.rotation.z = fn(rot.z);
    busy = false;
  });
}

const BIKE_BB = { x: -0.05, y: 0.3 };
const CRANK = 0.17;

// Bike riders (models3d_vehicles poses only the hip bones): put each foot
// on its pedal, following the bike's crank phase.
function pedalIK(group, k) {
  const bike = group.parent && group.parent.userData;
  if (!bike || !bike.riderLegs) return false;
  const ud = group.userData;
  const ph = (bike.pedalPhase || 0) + (k === 0 ? 0 : Math.PI);
  const sx = group.scale.x || 1, sy = group.scale.y || 1, lean = group.rotation.z;
  const px = BIKE_BB.x + Math.cos(ph) * CRANK - group.position.x;
  const py = BIKE_BB.y + Math.sin(ph) * CRANK + 0.07 - group.position.y - HIP_Y * sy;
  const c = Math.cos(-lean), s = Math.sin(-lean);
  legIK(k === 0 ? ud.legL : ud.legR, k === 0 ? ud.kneeL : ud.kneeR, (px * c - py * s) / sx, (px * s + py * c) / sy);
  return true;
}

function buildRig(L, shZ) {
  const bone = (x, y, z, parent) => {
    const b = new THREE.Bone();
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    return b;
  };
  const pelvis = bone(0, HIP_Y, 0);
  const chest = bone(0, CHEST_Y - HIP_Y, 0, pelvis);
  const head = bone(0, NECK_Y - CHEST_Y, 0, chest);
  const lids = bone(0.0, LID_Y - NECK_Y, 0, head);
  const mouth = bone(0.0, MOUTH_Y - NECK_Y, 0, head);
  const bones = [pelvis, chest, head];
  const hipZ = L.female ? 0.084 : 0.088;
  const limbs = {};
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const thigh = bone(0, 0, s * hipZ, pelvis);
    const knee = bone(0, KNEE_Y - HIP_Y, 0, thigh);
    bones[BONE.thigh[k]] = thigh;
    bones[BONE.knee[k]] = knee;
    const arm = bone(0, SHOULDER_Y - CHEST_Y, s * shZ, chest);
    const elbow = bone(0, -UPPER_ARM * Math.cos(ARM_SPLAY), s * UPPER_ARM * Math.sin(ARM_SPLAY), arm);
    bones[BONE.arm[k]] = arm;
    bones[BONE.elbow[k]] = elbow;
    limbs[k] = { thigh, knee, arm, elbow };
  }
  bones[BONE.lids] = lids;
  bones[BONE.mouth] = mouth;
  return { bones, pelvis, chest, head, lids, mouth, limbs };
}

// Main colours of the look buildPersonMesh(shirt, skin, { seed }) produces.
// Grote koppen (cheats.js): every head bone, held weakly, so a switch
// reaches the people already in the city.
let headScale = 1;
const heads = new Set();
function trackHead(bone) {
  if (typeof WeakRef === 'undefined') return;
  if (heads.size > 1500) for (const r of heads) if (!r.deref()) heads.delete(r);
  heads.add(new WeakRef(bone));
}
export function setHeadScale(k) {
  if (k === headScale) return;
  headScale = k;
  for (const r of heads) {
    const b = r.deref();
    if (b) b.scale.setScalar(k);
    else heads.delete(r);
  }
}

export function personPalette(shirt, skin, seed) {
  const L = resolveLook(shirt, skin, { seed });
  return {
    top: L.cop ? COP_NAVY : L.top === 'raincoat' ? L.raincoatColor : shirt,
    pants: L.pants, shoes: L.shoes, skin,
    hair: L.hairStyle === 'bald' ? null : L.hairStyle === 'hijab' ? L.hijabColor : L.hair,
    hat: L.hat === 'police' ? COP_NAVY : L.hat ? L.hatColor : null,
    cop: L.cop,
  };
}

// Spelerfase (?mensen=q3, ADR 0052): de speelbare personages (opts.character: tammo, anita) worden een modulaire mens, ook in de
// kledingkast, het pashokje, het winkelvoorbeeld en bij medespelers. scene3d.js zet dit aan; zonder rigs blijft het procedureel.
let modularPlayers = false;
export function setModularPlayerLooks(on) { modularPlayers = !!on; }
// De opties van buildPersonMesh als appearance voor de modulaire mens: de rol (clothing.js) geeft kleding, het zaad geslacht en maat.
const hashS = (seed, k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
function modularOptsFor(shirt, skin, opts) {
  if (opts.character || opts.speler) return { ...opts, shirt, skin };
  const seed = opts.seed !== undefined ? opts.seed : Math.floor(((shirt >>> 0) * 31 + (skin >>> 0)) % 9973);
  const a = { ...opts, shirt, skin, seed, vary: true, skinVary: opts.skinVary ?? !!opts.role, variant: opts.variant || (hashS(seed, 1) < 0.5 ? 'female' : 'male') };
  const cop = a.cop || shirt === 0x1c3fae || shirt === 0x1f3f8f;
  if (opts.role && !opts.look && !cop) {
    const old = hashS(seed, 23) < 0.2;
    const n = npcLook(seed, opts.role, { ...(opts.outfitCtx || {}), hair: true, body: !opts.body, old }, {});
    Object.assign(a, { shirt: n.shirt ?? shirt, pants: a.pants ?? n.pants, shoes: a.shoes ?? n.shoes, hair: a.hair ?? n.hair, hairStyle: a.hairStyle ?? n.hairStyle, body: a.body ?? n.body, look: { ...n.look, ...(old ? { age: 'old' } : {}) } });
  }
  return a;
}
// Telling van de procedurele mensen die er tijdens het spel nog bij komen terwijl de modulaire de standaard zijn (audit: personages2_wereld.js,
// scripts/ui): per aanroeper het aantal en de reden. Alleen zwemkleding en opts.procedural horen er expres te zijn en tellen niet mee.
const proceduralLog = new Map();
function noteProcedural(opts, reden) {
  const st = (new Error().stack || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('at ') && !/models3d_people\.js/.test(l));
  const k = reden + ' | ' + (st[0] || '?').replace(/^at /, '').replace(/^.*[\\/]/, '').slice(0, 80);
  proceduralLog.set(k, (proceduralLog.get(k) || 0) + 1);
}
export const proceduralStats = () => Object.fromEntries(proceduralLog);
export function buildPersonMesh(shirt, skin, opts = {}) {
  // de speler (character) en de figuur van een medespeler (speler: coopspeler.js avatarLook, uit zijn kledingcode) worden in de spelerfase een modulaire mens
  // en iedere andere figuur van de wereld (voorbijgangers, wachtenden, publiek, spelers van minigames, chauffeurs): ook modulair, met
  // lengte, bouw en kleding uit het zaad en de rol. Alleen zwemkleding en opts.procedural blijven het eigen model.
  if (modularPlayers && opts && !opts.swim && !opts.procedural && modularReady()) {
    const q = buildModularFromAppearance(modularOptsFor(shirt, skin, opts));
    if (q) return q;
    noteProcedural(opts, 'geen modulaire look');
  } else if (modularPlayers && opts && !opts.swim && !opts.procedural) noteProcedural(opts, 'rigs niet geladen');
  const L = resolveLook(shirt, skin, opts);
  L.topColor = L.cop ? COP_NAVY : shirt;
  L.skirtColor = L.pants;
  if (L.character === 'tammo') {
    Object.assign(L, { hat: 'tammo', capColor: opts.cap ?? DEFAULT_CAP, top: 'jacket', forceOpen: true, hood: true, under: 0xe3ddd0, bottom: 'jeans', shoeType: 'sneaker', facial: 'stubble', hoodUp: false });
  } else if (L.character === 'anita') {
    Object.assign(L, { top: 'coat', shortCoat: true, bottom: 'jeans', shoeType: 'boot', scarf: false });
  }
  // NPC-rol (clothing.js, ROLE_POOLS): kleding uit dezelfde stukken als die van de speler, deterministisch uit zaad en rol
  let bodyId = opts.body;
  if (opts.role && !L.character && !L.cop && !opts.look) {
    const n = npcLook(L.seed, opts.role, { ...(opts.outfitCtx || {}), hair: true, body: !bodyId, old: L.age === 'old' }, {});
    if (!bodyId && n.body) bodyId = n.body;
    Object.assign(L, n.look);
    // sieraden, horloge en handschoenen zijn losse meshes: een NPC in de menigte krijgt ze niet (geen extra drawcalls, ze zijn op afstand niet te zien)
    if (!(opts.outfitCtx && opts.outfitCtx.detail)) L.acc = null;
    // het kapsel uit de outfit (clothinghair.js); een hoofddoek blijft een hoofddoek
    if (L.hairStyle !== 'hijab') { if (n.hairStyle) L.hairStyle = n.hairStyle; if (n.hair != null) L.hair = n.hair; }
    L.topColor = n.shirt;
    if (n.pants != null) { L.pants = n.pants; L.skirtColor = n.pants; }
    if (n.shoes != null) L.shoes = n.shoes;
    if (n.look.hat === 'tammo') { L.hat = 'cap'; L.hatColor = n.look.capColor; }
  }
  // story characters (missionstory.js NPC looks): fixed clothes, hat, build
  if (opts.look) Object.assign(L, opts.look);
  // swimwear (swimmers3d.js): 'trunks', 'swimsuit' or 'bikini' in opts.swimColor, barefoot
  if (opts.swim) {
    Object.assign(L, { top: 'swim', bottom: 'swim', swim: opts.swim, pants: opts.swimColor ?? L.pants, topColor: skin, shoes: skin,
      hat: null, hoodUp: false, scarf: false, bag: null, umbrella: null, glasses: false, facial: L.facial === 'beard' ? 'stubble' : L.facial });
    if (L.hairStyle === 'hijab') L.hairStyle = 'bun';
  }

  // subtiele kleurvariatie per mens (alleen gewone voorbijgangers): tint en helderheid van bovenstuk, broek en huid schuiven een paar procent,
  // zodat twee mensen in hetzelfde rode shirt niet exact dezelfde kleuren hebben. Afgeleid van het zaad, dus geen extra geometrie in de cache.
  if (!L.character && !L.cop && !opts.look && !opts.swim && (!opts.role || opts.role === 'voetganger')) {
    L.topColor = jitterColor(L.topColor, L.r(44), L.r(45));
    L.pants = jitterColor(L.pants, L.r(46), L.r(47));
    L.skirtColor = L.pants;
    skin = shade(skin, 0.96 + L.r(48) * 0.08);
  }

  // lichaamsvorm (clothinghair.js BODY_TYPES): postuur en maat bovenop wat het personage al heeft; kleding is niet aan een geslacht gebonden
  const bt = bodyId && BODY_TYPES[bodyId];
  if (bt) { L.build = bt.build; L.buildScale *= bt.bs; L.heightScale *= bt.hs; }
  // #658: dezelfde look (expliciete seed, kleding, kleuren) hergebruikt dezelfde rompgeometrie.
  L.coatOpen = L.top === 'blazer' || L.forceOpen || L.r(30) < 0.6;
  const shZ = shoulderZ(L);
  const key = geometryKey(shirt, skin, L);
  let geometry = personGeometries.get(key);
  if (geometry) {
    personCache.hits++;
    personGeometries.delete(key); personGeometries.set(key, geometry); // LRU: weer achteraan
  } else {
    personCache.misses++;
    const B = new SkinBuilder(1);
    if (personProbe.layers) B.layers = [];
    buildTorso(B, L, skin);
    buildHead(B, L, skin);
    buildLegs(B, L, skin);
    buildArms(B, L, skin, shZ);
    geometry = markShared(B.build());
    if (B.layers) { B.layers.push([B.groups[0].p.length / 9, 'end']); geometry.userData.layers = B.layers; }
    personCache.builds++;
    // een meetbouw (personProbe.layers: de kledingaudit en het kledingvoorbeeld, clothingpreview.js) blijft uit de cache van de wereld;
    // hij is gemerkt als afgedankt, dus de laatste release geeft hem vrij
    if (personProbe.layers) geometry.userData.personRetired = true;
    else personGeometries.set(key, geometry);
    if (personGeometries.size > PERSON_TEMPLATE_CACHE_MAX) {
      // oudste eruit; niet disposen: een levende voetganger kan hem nog tekenen (userData.shared)
      const oud = personGeometries.keys().next().value;
      const oudGeo = personGeometries.get(oud);
      personGeometries.delete(oud);
      personCache.evictions++;
      // veilig: alleen vrijgeven als geen levende voetganger hem meer gebruikt; anders pas bij de laatste release
      if (oudGeo) { if ((oudGeo.userData.personRefs || 0) > 0) oudGeo.userData.personRetired = true; else oudGeo.dispose(); }
    }
  }
  geometry.userData.personRefs = (geometry.userData.personRefs || 0) + 1;

  const group = new THREE.Group();
  const rig = buildRig(L, shZ);
  group.add(rig.pelvis);
  const mesh = new THREE.SkinnedMesh(geometry, PERSON_MAT);
  mesh.boundingSphere = BOUNDS.clone();
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(rig.bones));
  rig.lids.scale.y = 0; // pas na het binden: de inverse van een bot met schaal 0 bestaat niet
  rig.mouth.scale.y = 0; // idem: de mond is dicht

  if (headScale !== 1) rig.head.scale.setScalar(headScale);
  trackHead(rig.head);
  const ud = group.userData;
  ud.pelvis = rig.pelvis;
  ud.chest = rig.chest;
  ud.head = rig.head;
  ud.lids = rig.lids;
  ud.mouth = rig.mouth;
  ud.legL = rig.limbs[0].thigh;
  ud.legR = rig.limbs[1].thigh;
  ud.kneeL = rig.limbs[0].knee;
  ud.kneeR = rig.limbs[1].knee;
  ud.armL = rig.limbs[0].arm;
  ud.armR = rig.limbs[1].arm;
  ud.elbowL = rig.limbs[0].elbow;
  ud.elbowR = rig.limbs[1].elbow;
  ud.body = mesh;
  if (personProbe.layers) { ud.shZ = shZ; ud.build = L.build; } // meetspoor (scripts/lib/kleding_clipping.mjs)
  ud.stoop = L.age === 'old' ? 0.12 : 0;
  ud.gait = L.age === 'old' ? 0.8 : L.female ? 1.05 : 1;
  ud.female = L.female;
  ud.animOffset = hash2(L.seed, 9.1) * 100;
  for (const k of [0, 1]) {
    linkJoint(rig.limbs[k].thigh, rig.limbs[k].knee, autoKnee, () => pedalIK(group, k));
    linkJoint(rig.limbs[k].arm, rig.limbs[k].elbow, autoElbow);
    rig.limbs[k].thigh.rotation.z = 0;
    rig.limbs[k].arm.rotation.z = 0;
  }
  if (L.umbrella !== null && L.umbrella !== undefined) attachUmbrella(ud, L.umbrella);
  if (L.acc && L.acc.j) { ud.neckPath = neckPath(L); ud.neckKey = `${L.build}|${L.female ? 1 : 0}|${L.age === 'old' ? 1 : 0}`; }
  if (L.acc) attachAccessories(group, L.acc);
  const sb = opts.shirtBands;
  if (sb && ((sb.bands && sb.bands.length) || (sb.cells && sb.cells.length) || sb.number || sb.sponsor)) attachShirtBands(rig.chest, torsoRings(L), sb);

  group.scale.set(L.buildScale, L.heightScale, L.buildScale);
  if (opts.seed !== undefined) ud.lookSeed = opts.seed;
  if (opts.swim || opts.procedural) ud.procedureelBewust = opts.swim ? 'zwemkleding' : 'opts.procedural';   // audit: dit blijft het eigen model, expres
  return group;
}

// Voetbalshirt met patroon (#1115): de rompgeometrie is gedeeld en heeft vertexkleuren, dus een streep of helft komt als eigen laag: een paar dunne dozen in de tweede kleur,
// samengevoegd tot één mesh aan het borstbeen (één drawcall per speler). bands = { bands: [[t0, t1], ...], color } met t een deel van de breedte (0 tot 1, voor het hele shirt).
// Elke doos volgt de doorsnede van de romp op zijn hoogte, hooguit enkele millimeters erboven; geen logo, geen wapen.
const SHIRT_BAND_Y = [0.97, 1.1, 1.22, 1.34, 1.46];
const shirtBandGeos = new Map(), shirtBandMats = new Map();
function shirtBandGeometry(rings, spec, part = 'main') {
  const bands = spec.bands || [];
  const key = JSON.stringify([rings.map((r) => [r.y, r.d, r.w, r.front ?? 1]), bands, spec.cells || null, spec.number || 0, spec.numberStyle || '', !!spec.nameBar, spec.sponsor ? spec.sponsor.size : '', part]);
  let g = shirtBandGeos.get(key);
  if (g) return g;
  const proto = new THREE.BoxGeometry(1, 1, 1);
  const pa = proto.attributes.position, na = proto.attributes.normal, ia = proto.index;
  const pos = [], nor = [], idx = [];
  let k = 0;
  for (let i = 0; part === 'main' && i < SHIRT_BAND_Y.length - 1; i++) {
    const y0 = SHIRT_BAND_Y[i], y1 = SHIRT_BAND_Y[i + 1], rg = ringAt(rings, (y0 + y1) / 2);
    const w = rg.w * 1.0, d = rg.d * (rg.front ?? 1) * 1.045 + 0.004;
    const cells = [...bands.map((b) => [i, b[0], b[1]]), ...(spec.cells || []).filter((c) => c[0] === i)];
    for (const [ci, t0, t1] of cells) {
      if (ci !== i) continue;
      const z0 = -w + 2 * w * Math.min(t0, t1), z1 = -w + 2 * w * Math.max(t0, t1), zc = (z0 + z1) / 2;
      const dx = d * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zc) / w, 2.4)), 1 / 2.4);   // de doorsnede is bijna een rechthoek met ronde hoeken
      if (dx < 0.01) continue;
      for (let v = 0; v < pa.count; v++) {
        pos.push(pa.getX(v) * 2 * dx, (y0 + y1) / 2 + pa.getY(v) * (y1 - y0) - CHEST_Y, (z0 + z1) / 2 + pa.getZ(v) * (z1 - z0));
        nor.push(na.getX(v), na.getY(v), na.getZ(v));
      }
      for (let j = 0; j < ia.count; j++) idx.push(ia.getX(j) + k * pa.count);
      k++;
    }
  }
  // rugnummer, naamstrook en sponsorpaneel (voetbalkleding 22-11): dunne dozen op het oppervlak van de romp (een zijde, geen doorsnede); het oppervlak is
  // dezelfde tienhoek als de romp (polygonX), 3,5 mm erboven. Een brede strook wordt in kolommen van 3 cm gelegd zodat hij de bocht volgt.
  const surfX = (y, z, back) => polygonX(loftPolygon(rings, y), z, back) + (back ? -0.0035 : 0.0035);
  const flat = (cy, cz, sy, sz, back) => {
    const cx = surfX(cy, cz, back) + (back ? -0.002 : 0.002);
    for (let v = 0; v < pa.count; v++) { pos.push(cx + pa.getX(v) * 0.004, cy - CHEST_Y + pa.getY(v) * sy, cz + pa.getZ(v) * sz); nor.push(na.getX(v), na.getY(v), na.getZ(v)); }
    for (let j = 0; j < ia.count; j++) idx.push(ia.getX(j) + k * pa.count);
    k++;
  };
  const strip = (cy, hw, hh, back) => { const n = Math.max(1, Math.round(hw * 2 / 0.03)), cw = hw * 2 / n; for (let c = 0; c < n; c++) flat(cy, -hw + cw * (c + 0.5), hh * 2, cw, back); };
  if (part === 'main' && spec.number) {
    const digits = String(spec.number).split('').map(Number), n = digits.length;
    const big = spec.numberStyle === 'speciaal' ? 1.2 : spec.numberStyle === 'hand' ? 0.9 : 1, dh = 0.17 * big, dw = 0.06 * big, th = 0.017 * (spec.numberStyle === 'hand' ? 0.8 : 1);
    const SEG = [[1, 1, 1, 0, 1, 1, 1], [0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1], [1, 1, 0, 1, 1, 1, 1], [1, 0, 1, 0, 0, 1, 0], [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1]];
    const yc = spec.nameBar ? 1.22 : 1.24;
    digits.forEach((dg, di) => {
      const zc = (di - (n - 1) / 2) * (dw + 0.02), s7 = SEG[dg];
      const parts = [[0, 0, dh / 2 - th / 2, dw, th], [1, -dw / 2 + th / 2, dh / 4, th, dh / 2 - th], [2, dw / 2 - th / 2, dh / 4, th, dh / 2 - th], [3, 0, 0, dw, th], [4, -dw / 2 + th / 2, -dh / 4, th, dh / 2 - th], [5, dw / 2 - th / 2, -dh / 4, th, dh / 2 - th], [6, 0, -dh / 2 + th / 2, dw, th]];
      for (const [si, dz, dy, sw, sh2] of parts) if (s7[si]) flat(yc + dy, zc + dz, sh2, sw, true);
    });
    if (spec.nameBar) strip(1.37, 0.06, 0.008, true);
  }
  if (part === 'sponsor' && spec.sponsor) {
    const big = spec.sponsor.size === 'groot' ? 1.3 : spec.sponsor.size === 'klein' ? 0.8 : 1;
    strip(1.2, 0.07 * big, 0.026 * big, false);
    strip(1.2 - 0.05 * big, 0.045 * big, 0.007, false);
  }
  proto.dispose();
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.userData.shared = true;   // gedeeld tussen spelers en wedstrijden: disposeObject laat hem staan
  if (shirtBandGeos.size > 64) shirtBandGeos.clear();
  shirtBandGeos.set(key, g);
  return g;
}
function attachShirtBands(chest, rings, spec) {
  const mat = (color) => {
    let m = shirtBandMats.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); m.userData.shared = true; shirtBandMats.set(color, m); }
    return m;
  };
  let first = null;
  // de laag in de tweede kleur (patroon, rugnummer, naamstrook) en het sponsorpaneel in de kleur van de sponsor: elk een mesh, hoogstens twee per speler
  const main = (spec.bands && spec.bands.length) || (spec.cells && spec.cells.length) || spec.number;
  if (main) { const mesh = new THREE.Mesh(shirtBandGeometry(rings, spec, 'main'), mat(spec.color)); mesh.name = 'shirtBands'; mesh.userData.kit = true; chest.add(mesh); first = mesh; }
  if (spec.sponsor) { const mesh = new THREE.Mesh(shirtBandGeometry(rings, spec, 'sponsor'), mat(spec.sponsor.color)); mesh.name = 'shirtSponsor'; mesh.userData.kit = true; chest.add(mesh); first = first || mesh; }
  return first;
}

// #658/#788: elke mesh die een gedeelde rompgeometrie tekent geeft hem bij het weggaan terug.
// De laatste gebruiker van een geëvictte template ruimt hem op; zolang iemand hem tekent blijft
// hij staan. scene3d.disposeObject roept dit voor elk persoonsmesh aan (speler, metgezel,
// chauffeur, missie-acteur, gast), niet alleen voor voetgangers. Per mesh maar één keer, zodat
// een tweede opruimronde de teller niet onder nul brengt.
export function releasePersonGeometry(mesh) {
  if (!mesh || !mesh.userData) return false;
  const body = mesh.userData.body; // de SkinnedMesh onder de groepsmesh (buildPersonMesh)
  const node = body || mesh;
  // #796: dezelfde persoon kan via twee routes langskomen: als groep (releasePersonGeometry(group)) en
  // als mesh (scene3d.disposeObject loopt over de kinderen). Markeer daarom zowel de groep als de mesh,
  // anders telt de tweede route dezelfde gedeelde geometrie nog eens af.
  if (mesh.userData.personRefsGiven || node.userData.personRefsGiven) return false;
  const g = body ? body.geometry : mesh.geometry;
  if (!g || !g.userData || typeof g.userData.personRefs !== 'number') return false;
  mesh.userData.personRefsGiven = true;
  if (body && body.userData) body.userData.personRefsGiven = true;
  g.userData.personRefs--;
  if (g.userData.personRefs <= 0 && g.userData.personRetired) { g.dispose(); return true; }
  return false;
}

const umbrellaGeos = new Map();
const UMBRELLA_CANOPY = [{ y: 0.52, d: 0.5, w: 0.5 }, { y: 0.63, d: 0.41, w: 0.41 }, { y: 0.73, d: 0.24, w: 0.24 }, { y: 0.78, d: 0.02, w: 0.02 }];

// Origin at the grip, shaft along +Y: 1 m canopy about 0.75 m above the hand.
function umbrellaGeometry(color) {
  let g = umbrellaGeos.get(color);
  if (!g) {
    const B = new SkinBuilder(1);
    B.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), composeMatrix(0, 0.33, 0), 0x2a2a2a);
    B.geo(tubeGeometry([0, -0.12, 0], [0.035, -0.165, 0], 0.012, 0.012, 4), null, 0x4a3222);
    B.geo(tubeGeometry([0.035, -0.165, 0], [0.065, -0.125, 0], 0.012, 0.012, 4), null, 0x4a3222);
    B.geo(loftGeometry(UMBRELLA_CANOPY, 8), null, color);
    B.geo(flipWinding(loftGeometry(UMBRELLA_CANOPY.map((r) => ({ ...r, y: r.y - 0.006 })), 8)), null, shade(color, 0.6));
    B.geo(new THREE.CylinderGeometry(0.005, 0.009, 0.06, 4), composeMatrix(0, 0.8, 0), 0x2a2a2a);
    g = markShared(B.build());
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    umbrellaGeos.set(color, g);
  }
  return g;
}

function attachUmbrella(ud, color) {
  const m = new THREE.Mesh(umbrellaGeometry(color), PERSON_MAT);
  m.position.set(0, -0.27, 0.015);
  ud.elbowL.add(m);
  ud.umbrella = m;
}

// Seated poses. SEAT_CONTACT is the mesh-local height of the underside of
// the thighs/seat in a seated pose, so a person sits ON a surface at height
// h when the mesh origin is at seatedY(mesh, h). A spec gives the recline
// (chest tipped back), the ankle target relative to the hip joint (footX
// forward, footY up; mesh-local, unscaled) and what the arms do.
export const SEAT_CONTACT = HIP_Y - 0.09;
export const SEAT_CAR = { recline: 0.26, footX: 0.74, footY: -0.07, arms: 'lap' };

export function seatedY(mesh, seatTop) {
  if (mesh.userData && mesh.userData.qRig) return seatTop - modularSeatContact(mesh); // modulaire mens: het zitvlak van de zit-clip
  return seatTop - SEAT_CONTACT * (mesh.scale.y || 1);
}

export function seatPose(mesh, spec = SEAT_CAR, t = 0) {
  const ud = mesh.userData;
  // modulaire mens (ADR 0051): de zit-clip uit de state-machine; seatedY zet hem op de zitting
  if (ud.qRig) { ud.qParams = ud.qSitP || (ud.qSitP = { seated: true }); animateModular(mesh, 0, 1 / 60); return; }
  if (!ud.pelvis) return;
  resetSpine(ud);
  const rec = spec.recline || 0;
  ud.chest.rotation.set(0, 0, rec);
  ud.head.rotation.set(0, 0, -rec * 0.7);
  let fx = spec.footX ?? 0.74, fy = spec.footY ?? -0.07;
  let fx2 = fx, fy2 = fy;
  if (spec.pedal) {
    const ph = t * 5.5;
    fx = spec.footX + Math.cos(ph) * 0.1; fy = spec.footY + Math.sin(ph) * 0.1;
    fx2 = spec.footX - Math.cos(ph) * 0.1; fy2 = spec.footY - Math.sin(ph) * 0.1;
  }
  legIK(ud.legL, ud.kneeL, fx, fy);
  legIK(ud.legR, ud.kneeR, fx2 - 0.03, fy2 + 0.01);
  if (spec.splay) { ud.legL.rotation.x = -spec.splay; ud.legR.rotation.x = spec.splay; }
  const lean = rec;
  ud.wheelArms = spec.arms === 'wheel';
  switch (spec.arms) {
    case 'wheel':
      setArm(ud.armL, ud.elbowL, 0.95 + lean * 0.8, 0.55, -0.1);
      setArm(ud.armR, ud.elbowR, 0.95 + lean * 0.8, 0.55, 0.1);
      // handen aan het stuur (actorlife.js): de rusthouding hierboven legt het wiel vast, de stuurhoek draait de grepen erover
      if (ud.steer) steerHands(mesh, ud.steer);
      break;
    case 'helm':
      setArm(ud.armL, ud.elbowL, 0.62 + lean * 0.6, 0.75, -0.08);
      setArm(ud.armR, ud.elbowR, 0.62 + lean * 0.6, 0.75, 0.08);
      break;
    case 'tiller':
      setArm(ud.armL, ud.elbowL, 0.3 + lean, 1.0);
      setArm(ud.armR, ud.elbowR, 0.55 + lean, 0.35, 0.35);
      break;
    case 'paddle': {
      const s = Math.sin(t * 2.6);
      setArm(ud.armL, ud.elbowL, 0.95 + 0.2 * s + lean, 0.75 - 0.25 * s, -0.25);
      setArm(ud.armR, ud.elbowR, 0.95 - 0.2 * s + lean, 0.75 + 0.25 * s, 0.25);
      ud.chest.rotation.y = 0.18 * s;
      if (!ud.paddleProp) {
        ud.paddleProp = new THREE.Mesh(PADDLE_GEO, ROD_MAT);
        ud.chest.add(ud.paddleProp);
      }
      ud.paddleProp.visible = true;
      ud.paddleProp.position.set(0.4, 0.1, 0);
      ud.paddleProp.rotation.set(0.3 * s, 0, 0);
      break;
    }
    case 'row': {
      // rowing, facing aft: k 0 = the catch (arms out, knees up, leaning in),
      // 1 = the finish (hands to the chest, legs flat, leaning back)
      const k = (1 + Math.sin(t * 2.1)) / 2;
      ud.chest.rotation.z = -0.32 + 0.66 * k;
      ud.head.rotation.z = 0.2 - 0.3 * k;
      setArm(ud.armL, ud.elbowL, 1.42 - 0.62 * k, 0.12 + 1.5 * k, -0.18);
      setArm(ud.armR, ud.elbowR, 1.42 - 0.62 * k, 0.12 + 1.5 * k, 0.18);
      legIK(ud.legL, ud.kneeL, fx * (0.62 + 0.38 * k), fy + 0.12 * (1 - k));
      legIK(ud.legR, ud.kneeR, fx * (0.62 + 0.38 * k) - 0.03, fy + 0.12 * (1 - k) + 0.01);
      break;
    }
    case 'hug':
      setArm(ud.armL, ud.elbowL, 1.05 + lean, 1.2, 0.15);
      setArm(ud.armR, ud.elbowR, 1.05 + lean, 1.2, -0.15);
      break;
    case 'behind':
      // leaning back on the hands, palms on the ground behind the hips
      setArm(ud.armL, ud.elbowL, -0.5 - lean * 0.4, 0.08, -0.22);
      setArm(ud.armR, ud.elbowR, -0.5 - lean * 0.4, 0.08, 0.22);
      break;
    case 'rail':
      setArm(ud.armL, ud.elbowL, 0.25 + lean, 0.9, -0.45);
      setArm(ud.armR, ud.elbowR, 0.35 + lean, 1.05);
      break;
    default:
      setArm(ud.armL, ud.elbowL, 0.35 + lean, 1.05);
      setArm(ud.armR, ud.elbowR, 0.35 + lean, 1.05);
  }
  if (ud.umbrella) ud.umbrella.visible = false;
  setPropVisible(ud, 'phoneProp', false);
  setPropVisible(ud, 'rodProp', false);
  setPropVisible(ud, 'guitarProp', false);
  if (spec.arms !== 'paddle') setPropVisible(ud, 'paddleProp', false);
  setPropVisible(ud, 'supPaddle', false);
  ud.seated = true;
}

// ---- levendigheid (actorlife.js, epic 'Personages die leven') ----------------------------------------------

const HAND_REACH = FOREARM + 0.07;   // pols tot het midden van de handpalm
const _arm = { x: 0, z: 0, e: 0, reach: true }, _h = { x: 0, y: 0, z: 0 }, _g = { x: 0, y: 0, z: 0 }, _c = { x: 0, y: 0, z: 0 };

// Hand k (0 of 1) naar een punt in de borstassen (x voor, y op, z opzij; oorsprong = het borstbot). Twee-bot-IK met grenzen.
function reachChest(ud, k, x, y, z) {
  const arm = k === 0 ? ud.armL : ud.armR, elbow = k === 0 ? ud.elbowL : ud.elbowR;
  if (!arm) return false;
  armIK(x - arm.position.x, y - arm.position.y, z - arm.position.z, UPPER_ARM, HAND_REACH, _arm);
  setArm(arm, elbow, _arm.z, _arm.e, _arm.x);
  return _arm.reach;
}

// Hand k naar een punt in de assen van de mens zelf (de groep van buildPersonMesh, zonder zijn schaal): door het bekken en de
// borst heen (alleen hun kanteling om z, zoals bij zitten en fietsen). Geeft false als het punt buiten bereik lag (de arm strekt dan).
export function reachHand(mesh, k, x, y, z) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.pelvis) return false;
  const pel = ud.pelvis, ch = ud.chest;
  let px = x - pel.position.x, py = y - pel.position.y, pz = z - pel.position.z;
  let c = Math.cos(pel.rotation.z), s = Math.sin(pel.rotation.z);
  let qx = px * c + py * s, qy = -px * s + py * c;
  px = qx - ch.position.x; py = qy - ch.position.y; pz -= ch.position.z;
  c = Math.cos(ch.rotation.z); s = Math.sin(ch.rotation.z);
  qx = px * c + py * s; qy = -px * s + py * c;
  return reachChest(ud, k, qx, qy, pz);
}

// Zoals reachHand, maar het punt in de assen van de ouder van de mens (een fiets, een stoel): positie, kanteling om z en schaal eraf.
export function reachHandFromParent(mesh, k, x, y, z) {
  const sx = mesh.scale.x || 1, sy = mesh.scale.y || 1, lean = mesh.rotation.z || 0;
  const dx = x - mesh.position.x, dy = y - mesh.position.y, c = Math.cos(lean), s = Math.sin(lean);
  return reachHand(mesh, k, (dx * c + dy * s) / sx, (-dx * s + dy * c) / sy, (z - mesh.position.z) / sx);
}

// Handen aan het stuur bij stuurinvoer steer (-1..1, + = rechtsaf): het wiel ligt waar de rusthouding van 'wheel' de handen legt,
// de grepen draaien met de stuurhoek mee over de rand (geen overpakken). Alleen de armen; roep na seatPose aan, elk frame dat het stuur beweegt.
export function steerHands(mesh, steer) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.armL || !ud.chest) return;
  const rec = ud.chest.rotation.z;
  const z0 = 0.95 + rec * 0.8;
  // de rustgrepen (voorwaartse kinematica van de rusthouding) leggen middelpunt en straal van het wiel vast
  armFK(-0.1, z0, 0.55, UPPER_ARM, HAND_REACH, _h);
  const ax = ud.armL.position.x, ay = ud.armL.position.y, az = ud.armL.position.z;
  _c.x = ax + _h.x; _c.y = ay + _h.y; _c.z = az + _h.z;
  const rad = Math.max(0.12, Math.abs(_c.z));
  const ang = -Math.max(-1, Math.min(1, Number.isFinite(steer) ? steer : 0)) * STEER_TURN;
  const tilt = 0.5 - rec;
  for (const k of [0, 1]) {
    wheelGrip(_c.x, _c.y, rad, tilt, ang, k === 0 ? 1 : -1, _g);
    reachChest(ud, k, _g.x, _g.y, _g.z);
  }
}

// Mond: open 0..1 (kaak), wide = breedte (1 = rust). Schrijft alleen als de stand verandert (de skeletontextuur blijft dan staan).
export function setMouth(ud, open, wide = 1) {
  const m = ud && ud.mouth;
  if (!m) return;
  const y = open > 0.01 ? Math.min(1, open) : 0, z = y > 0 ? wide : 1;
  if (m.scale.y !== y) m.scale.y = y;
  if (m.scale.z !== z) m.scale.z = z;
}
const _mouth = { open: 0, wide: 1 };
// Kaak 0..1 plus een stemming ('lach', 'schrik', 'boos' of niets) naar de mond (actorlife.js mouthShape).
export function speakMouth(ud, jaw, mood = null) {
  mouthShape(jaw, mood, _mouth);
  setMouth(ud, _mouth.open, _mouth.wide);
}

// Voeten op de grond (twee-bot-IK met heupcompensatie): ground(x, y) geeft de hoogte van het oppervlak op wereldpunt (x, y)
// (map.surfaceAt, één hoogtevraag per voet). Na animatePersonWalk; de heup zakt zo ver als de laagste voet onder het middelpunt
// ligt en elk been reikt naar zijn eigen grond, zodat iemand op een helling of trap niet met één voet zweeft. w = gewicht 0..1.
// Geeft true als er iets veranderde. Geen allocaties.
const _plant = { drop: 0, liftL: 0, liftR: 0 }, _ank = [{ x: 0, y: 0 }, { x: 0, y: 0 }], _leg = { a: 0, b: 0, reach: true };
export function plantFeet(mesh, ground, w = 1) {
  const ud = mesh && mesh.userData;
  if (ud && ud.qRig) return plantFeetModular(mesh, ground, w);
  if (!ud || !ud.pelvis || !ud.legL || !(w > 0) || typeof ground !== 'function') return false;
  const sx = mesh.scale.x || 1, sy = mesh.scale.y || 1;
  const h = -mesh.rotation.y, ch = Math.cos(h), sh = Math.sin(h);
  const pel = ud.pelvis, pc = Math.cos(pel.rotation.z), ps = Math.sin(pel.rotation.z);
  const base = mesh.position.y;
  let dL = 0, dR = 0;
  for (let k = 0; k < 2; k++) {
    const thigh = k === 0 ? ud.legL : ud.legR, knee = k === 0 ? ud.kneeL : ud.kneeR;
    const a = _ank[k];
    twoBoneFK(thigh.rotation.z, knee.rotation.z, THIGH_LEN, SHIN_LEN, a);
    const lx = (pel.position.x + a.x * pc - a.y * ps) * sx, lz = (pel.position.z + thigh.position.z) * sx;
    const g = ground(mesh.position.x + ch * lx - sh * lz, mesh.position.z + sh * lx + ch * lz);
    const d = Number.isFinite(g) ? (g - base) / sy : 0;
    if (k === 0) dL = d; else dR = d;
  }
  if (Math.abs(dL) < 0.008 && Math.abs(dR) < 0.008) return false;
  footPlant(dL, dR, _plant);
  pel.position.y -= _plant.drop * w;
  for (let k = 0; k < 2; k++) {
    const thigh = k === 0 ? ud.legL : ud.legR, knee = k === 0 ? ud.kneeL : ud.kneeR;
    const a = _ank[k], lift = k === 0 ? _plant.liftL : _plant.liftR;
    // de lift is verticaal in de wereld; in de assen van het (gekantelde) bekken
    twoBoneIK(a.x + lift * ps, a.y + lift * pc, THIGH_LEN, SHIN_LEN, -1, _leg);
    const k0 = knee.rotation.z, t0 = thigh.rotation.z;
    thigh.rotation.z = t0 + (_leg.a - t0) * w;
    knee.rotation.z = k0 + (_leg.b - k0) * w;
  }
  return true;
}

// Legacy entry point: the car pose, hands on the wheel when driving.
export function seatPerson(mesh, driving = false, spec = SEAT_CAR) {
  seatPose(mesh, driving ? { ...spec, arms: 'wheel' } : spec);
}

// Standing on a step deck behind the rider, holding on.
export function standBehindPose(mesh) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  ud.chest.rotation.set(0, 0, -0.12);
  ud.legL.rotation.set(0, 0, 0.08);
  ud.legR.rotation.set(0, 0, -0.1);
  ud.kneeL.rotation.z = -0.12;
  ud.kneeR.rotation.z = -0.1;
  setArm(ud.armL, ud.elbowL, 0.9, 1.1, 0.12);
  setArm(ud.armR, ud.elbowR, 0.9, 1.1, -0.12);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Standing on a paddle board with a long single-blade paddle (held by the
// chest, so it swings with the body): knees soft, a slow stroke on one side,
// switching sides every few strokes. Hands stay below the head.
const SUP_PADDLE_GEO = markShared((() => {
  const parts = [new THREE.CylinderGeometry(0.014, 0.014, 2.0, 5).translate(0, -1.0, 0), new THREE.BoxGeometry(0.05, 0.03, 0.12).translate(0, 0, 0),
    new THREE.BoxGeometry(0.02, 0.42, 0.19).translate(0, -1.86, 0)];
  const pos = [];
  for (const g of parts) pos.push(...(g.index ? g.toNonIndexed() : g).attributes.position.array);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
})());

export function supPose(mesh, t = 0) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const ph = t * 1.5;
  const s = Math.sin(ph);
  const side = Math.sin(ph / 8) >= 0 ? 1 : -1;
  ud.chest.rotation.set(0, side * (0.15 + 0.1 * s), -0.12 - 0.1 * Math.max(0, s));
  ud.legL.rotation.set(-0.09, 0, 0.12);
  ud.legR.rotation.set(0.09, 0, 0.12);
  ud.kneeL.rotation.z = ud.kneeR.rotation.z = -0.22;
  // top hand at chin height, the other lower down the shaft on the stroke side
  const top = side > 0 ? [ud.armL, ud.elbowL, -1] : [ud.armR, ud.elbowR, 1];
  const low = side > 0 ? [ud.armR, ud.elbowR, 1] : [ud.armL, ud.elbowL, -1];
  setArm(top[0], top[1], 1.25 + 0.2 * s, 1.15, top[2] * 0.2);
  setArm(low[0], low[1], 0.75 + 0.35 * s, 0.35, low[2] * 0.15);
  ud.head.rotation.set(0, 0, 0.1);
  let p = ud.supPaddle;
  if (!p) {
    p = ud.supPaddle = new THREE.Mesh(SUP_PADDLE_GEO, ROD_MAT);
    ud.chest.add(p);
  }
  p.visible = true;
  p.position.set(0.34, 0.42, side * 0.2);
  p.rotation.set(-side * 0.12, 0, 0.15 + 0.4 * s);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Blend from whatever pose the bones hold now (a walk frame) towards a
// seated spec by k (0..1): enter/exit animations.
const _blend = new Float32Array(40);
export function blendSeatPose(mesh, spec, k, t = 0) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  if (k >= 1) { seatPose(mesh, spec, t); return; }
  const bones = [ud.pelvis, ud.chest, ud.head, ud.legL, ud.kneeL, ud.legR, ud.kneeR, ud.armL, ud.elbowL, ud.armR, ud.elbowR];
  let i = 0;
  for (const b of bones) { _blend[i++] = b.rotation.x; _blend[i++] = b.rotation.y; _blend[i++] = b.rotation.z; }
  const py = ud.pelvis.position.y, pz = ud.pelvis.position.z;
  seatPose(mesh, spec, t);
  i = 0;
  for (const b of bones) {
    const x = _blend[i++], y = _blend[i++], z = _blend[i++];
    b.rotation.set(x + (b.rotation.x - x) * k, y + (b.rotation.y - y) * k, z + (b.rotation.z - z) * k);
  }
  ud.pelvis.position.y = py + (HIP_Y - py) * k;
  ud.pelvis.position.z = pz * (1 - k);
}

// Right arm raised, hand swaying: a wave/greeting over whatever pose the
// body has (seated, swimming, walking). k fades it in and out.
export function waveOverlay(mesh, t, k = 1) {
  const ud = mesh.userData;
  if (!ud.armR || k <= 0) return;
  const sway = Math.sin(t * 9);
  const z = ud.armR.rotation.z + (2.75 - ud.armR.rotation.z) * k;
  const x = ud.armR.rotation.x + (0.3 + 0.28 * sway - ud.armR.rotation.x) * k;
  setArm(ud.armR, ud.elbowR, z, (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - k) + (0.45 + 0.2 * sway) * k, x);
  if (ud.head) ud.head.rotation.z += 0.12 * k;
}

// Een boze vuist in de lucht achter het stuur (trafficreact.js, #1315): de rechterarm omhoog, schuddend, het hoofd iets opzij.
// Absolute stand per beeld (geen opstapeling); seatPose zet hem daarna terug.
export function fistOverlay(mesh, t) {
  const ud = mesh.userData;
  if (!ud.armR) return;
  const shake = Math.sin(t * 15);
  setArm(ud.armR, ud.elbowR, 1.65 + shake * 0.12, 1.55 + shake * 0.25, 0.2);   // vooruit en omhoog tot gezichtshoogte: niet door het dak
  if (ud.head) ud.head.rotation.set(0, 0.25, 0.08);
}

// Juichen (vrijgezellenfeest, vrijgezellen.js): beide armen om en om de lucht in, een beetje op en neer. k 0..1.
export function juichOverlay(mesh, t, links, rechts, spring, k = 1) {
  const ud = mesh.userData;
  if (!ud.armR || !ud.armL || k <= 0) return;
  setArm(ud.armL, ud.elbowL, ud.armL.rotation.z + (links - ud.armL.rotation.z) * k, (ud.elbowL ? ud.elbowL.rotation.z : 0) * (1 - k) + 0.3 * k, 0.15 * k);
  setArm(ud.armR, ud.elbowR, ud.armR.rotation.z + (rechts - ud.armR.rotation.z) * k, (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - k) + 0.3 * k, -0.15 * k);
  if (ud.head) ud.head.rotation.z += 0.1 * Math.sin(t * 6) * k;
  mesh.position.y += spring;
}

// Arms forward under a load (side-job boxes).
export function carryOverlay(mesh) {
  const ud = mesh.userData;
  if (ud.qRig) { modularHoldPose(mesh, 'front'); return; }
  if (!ud.armL) return;
  setArm(ud.armL, ud.elbowL, 0.75, 1.15, 0.12);
  setArm(ud.armR, ud.elbowR, 0.75, 1.15, -0.12);
}

// Treading water / breaststroke for ambient swimmers: the caller tilts and
// lowers the mesh like the player's swim (swimDepth in player.js). The
// stroke stays in front of the chest and under the surface: hands over the
// head would read as someone in trouble.
export function swimPose(mesh, t, moving) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const s = Math.sin(t * (moving ? 2.6 : 1.6));
  const c = Math.cos(t * (moving ? 2.6 : 1.6));
  if (moving) {
    // breaststroke: reach forward, sweep out and round, elbows in, glide
    const out = Math.max(0, -s);
    setArm(ud.armL, ud.elbowL, 2.05 + 0.5 * s, 0.25 + 0.7 * Math.max(0, c) * out, -0.35 - 0.45 * out);
    setArm(ud.armR, ud.elbowR, 2.05 + 0.5 * s, 0.25 + 0.7 * Math.max(0, c) * out, 0.35 + 0.45 * out);
    ud.legL.rotation.set(-0.15 - 0.25 * Math.max(0, c), 0, -0.1 + 0.3 * Math.max(0, s));
    ud.legR.rotation.set(0.15 + 0.25 * Math.max(0, c), 0, -0.1 + 0.3 * Math.max(0, s));
    ud.kneeL.rotation.z = ud.kneeR.rotation.z = -0.15 - 0.9 * Math.max(0, s);
  } else {
    // calm treading water: hands sculling low at the sides, a slow bicycle kick
    setArm(ud.armL, ud.elbowL, 0.7 + 0.18 * s, 0.55, -0.75 - 0.15 * c);
    setArm(ud.armR, ud.elbowR, 0.7 + 0.18 * s, 0.55, 0.75 + 0.15 * c);
    ud.legL.rotation.set(0, 0, 0.3 + 0.25 * s);
    ud.legR.rotation.set(0, 0, 0.3 - 0.25 * s);
    ud.kneeL.rotation.z = -0.55 - 0.3 * s;
    ud.kneeR.rotation.z = -0.55 + 0.3 * s;
  }
  ud.head.rotation.set(0, 0, moving ? 0.7 : 0.15);
  if (ud.umbrella) ud.umbrella.visible = false;
}

// Floating on the back (the caller lays the mesh flat, face up): arms out to
// the sides, legs a little apart, hands sculling gently.
export function floatPose(mesh, t) {
  const ud = mesh.userData;
  if (!ud.pelvis) return;
  resetSpine(ud);
  const s = Math.sin(t * 1.3);
  setArm(ud.armL, ud.elbowL, -0.2 + 0.06 * s, 0.1, -1.2 - 0.08 * s);
  setArm(ud.armR, ud.elbowR, -0.2 + 0.06 * s, 0.1, 1.2 + 0.08 * s);
  ud.legL.rotation.set(-0.14, 0, 0.06);
  ud.legR.rotation.set(0.14, 0, 0.06);
  ud.kneeL.rotation.z = -0.12;
  ud.kneeR.rotation.z = -0.18;
  ud.head.rotation.set(0, 0, -0.2);
  if (ud.umbrella) ud.umbrella.visible = false;
}

function resetSpine(ud) {
  if (!ud.pelvis) return;
  ud.pelvis.position.set(0, HIP_Y, 0);
  ud.pelvis.rotation.set(0, 0, 0);
  ud.chest.position.set(0, CHEST_Y - HIP_Y, 0);
  ud.chest.rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, 0);
}

// Pose hook: gameplay code registers the object (a Pedestrian) whose `pose`
// field should drive the mesh built with the same appearance seed.
const poseSources = new Map();
export function registerPoseSource(seed, src) { poseSources.set(seed, src); }
export function unregisterPoseSource(seed) { poseSources.delete(seed); }
export function prunePoseSources(alive) {
  // review 22-11 P2: een bron met `persistent` (een interieur-NPC) hoort bij geen voetganger en wordt door zijn eigenaar vrijgegeven
  for (const [seed, src] of poseSources) if (!alive.has(src) && !src.persistent) poseSources.delete(seed);
}

// the folded Pixie Vouw 11: narrow, tall and a bit thick
const PHONE_GEO = markShared(new THREE.BoxGeometry(0.068, 0.145, 0.019));
const PHONE_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, emissive: 0x33506a, emissiveIntensity: 0.6 }));
const ROD_GEO = markShared((() => {
  const g = new THREE.CylinderGeometry(0.008, 0.016, 2.4, 4);
  g.translate(0, 1.2, 0);
  return g;
})());
const ROD_MAT = markShared(new THREE.MeshStandardMaterial({ color: 0x3a2c1f, roughness: 0.8 }));
const GUITAR_MAT = markShared(vcMaterial({ roughness: 0.6 }));
// double-bladed paddle across the body, shaft along z
const PADDLE_GEO = markShared((() => {
  const shaft = new THREE.CylinderGeometry(0.016, 0.016, 2.0, 5).rotateX(Math.PI / 2);
  const parts = [shaft];
  for (const s of [1, -1]) parts.push(new THREE.BoxGeometry(0.16, 0.02, 0.4).translate(0, 0, s * 1.08));
  const pos = [];
  for (const g of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...ng.attributes.position.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
})());

function propOn(ud, key, geo, mat, build) {
  let m = ud[key];
  if (!m) {
    m = new THREE.Mesh(geo, mat);
    build(m);
    (ud.elbowR || ud.armR).add(m);
    ud[key] = m;
  }
  m.visible = true;
  return m;
}

// Phone in the right hand while riding (NPC cyclists): the arm stays on the bar side, the forearm lifts.
export function holdPhoneRiding(person) {
  const ud = person.userData;
  propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
  ud.phoneProp.rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, -0.35);
  setArm(ud.armR, ud.elbowR, 0.85, 1.4, -0.1);
}

function setPropVisible(ud, key, on) {
  if (ud[key]) ud[key].visible = on;
}

// Two-bone leg IK in the sagittal plane: puts the ankle at (fx, fy) relative
// to the hip joint (mesh-local, unscaled; +x forward, +y up).
function legIK(thigh, knee, fx, fy) {
  const d = Math.min(THIGH_LEN + SHIN_LEN - 1e-3, Math.max(0.05, Math.hypot(fx, fy)));
  const aim = Math.atan2(fx, -fy);
  const cosA = (THIGH_LEN * THIGH_LEN + d * d - SHIN_LEN * SHIN_LEN) / (2 * THIGH_LEN * d);
  const cosK = (THIGH_LEN * THIGH_LEN + SHIN_LEN * SHIN_LEN - d * d) / (2 * THIGH_LEN * SHIN_LEN);
  thigh.rotation.set(0, 0, aim + Math.acos(Math.max(-1, Math.min(1, cosA))));
  if (knee) knee.rotation.z = -(Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK))));
}

function setArm(arm, elbow, z, e, x = 0) {
  arm.rotation.set(x, 0, z);
  if (elbow) elbow.rotation.z = e;
}

// Guns in the right hand. The models (parts, materials, merged per material) live in models3d_weapons.js, built along the forearm
// bone: -y runs down the forearm towards the fingers (forward once the arm is raised), +x is the back of the hand (up when
// aiming). userData.muzzle marks the barrel tip.
const HAND_Y = -0.575;
// tip: distance of the muzzle / business end from the palm (m); rest: tilt forward while carried (rad); two: second hand on it
// when aimed; melee: a swing weapon.
const GUN_SPECS = {
  pistol: { tip: 0.2 },
  uzi: { tip: 0.29, two: true },
  shotgun: { tip: 0.68, two: true },
  jachtgeweer: { tip: 0.96, two: true },
  waterpistool: { tip: 0.27 },
  knuppel: { tip: 0.71, rest: 2.5, melee: true },
  hockeystick: { tip: 0.8, rest: 0.55, melee: true },
  bezem: { tip: 1.08, rest: 0.35, melee: true },
  fietspomp: { tip: 0.5, rest: 0.9, melee: true },
  klomp: { tip: 0.31, rest: 1.5, melee: true },
  polsstok: { tip: 2.3, rest: 1.35, melee: true, two: true },
  carbidbus: { tip: 0.37, rest: 0 },
  vuurwerk: { tip: 0.26, rest: 2.8 },
};

// A loose weapon for the shop preview: length along +x, back of the hand up.
export function buildWeaponMesh(key) {
  const layers = GUN_SPECS[key] && weaponLayers(key);
  if (!layers) return null;
  const inner = new THREE.Group();
  for (const l of layers) inner.add(new THREE.Mesh(l.geometry, l.material));
  inner.rotation.z = key === 'carbidbus' ? Math.PI : Math.PI / 2;
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

// Shows the held weapon (null / 'fists' hides it).
export function setHeldWeapon(mesh, weapon) {
  const ud = mesh && mesh.userData;
  if (!ud || !(ud.elbowR || ud.qRig)) return;
  const key = GUN_SPECS[weapon] ? weapon : null;
  if (ud.gunKey === key) return;
  ud.gunKey = key;
  if (ud.qRig) setModularGrip(mesh, !!key);   // modulaire mens (ADR 0050): de hand sluit zich om de greep
  if (!ud.guns) ud.guns = {};
  for (const k in ud.guns) ud.guns[k].visible = false;
  ud.muzzle = null;
  if (!key) return;
  let g = ud.guns[key];
  if (!g) {
    g = new THREE.Group();
    const spec = GUN_SPECS[key];
    for (const l of weaponLayers(key)) { const m = new THREE.Mesh(l.geometry, l.material); m.castShadow = true; g.add(m); }
    // pivot in the palm, so the gun can tilt forward while the arm hangs (modulair: in de houder aan de pols, modularpeople.js)
    if (ud.qRig) g.position.fromArray(MODULAR_GRIP_AT); else g.position.set(0.01, HAND_Y, 0);
    const tip = new THREE.Object3D();
    tip.position.set(0.035, -spec.tip, 0);
    g.add(tip);
    g.userData.tip = tip;
    (ud.qRig ? modularHandSocket(mesh) : ud.elbowR).add(g);
    ud.guns[key] = g;
  }
  g.visible = true;
  ud.muzzle = g.userData.tip;
}

// Attack overlay on top of the walk cycle: an alternating jab for fists, an
// aimed arm with a recoil kick for guns (two-handed for uzi/shotgun) that
// stays up while `aiming`. fx is combat.js's last effect {type, start, side,
// weapon}; now = world.time.
const PUNCH_S = 0.32;
const AIM_HOLD_S = 0.7;
const RECOIL = { pistol: [0.34, 0.5, 0.12], uzi: [0.16, 0.25, 0.06], shotgun: [0.62, 0.8, 0.22], jachtgeweer: [0.7, 0.7, 0.26], waterpistool: [0.05, 0.08, 0.01] };

// Melee swings, u = 0..1 over SWING_S[swing]; w = wind-up share. The curve
// runs 0 -> -1 (cocked back) -> +1 (the hit) -> 0.
const SWING_S = { bat: 0.55, slap: 0.45, sweep: 0.5, stab: 0.3, overhead: 0.55, thrust: 0.9, throw: 0.45 };
const SWING_W = { bat: 0.26, slap: 0.26, sweep: 0.2, stab: 0.2, overhead: 0.33, thrust: 0.38, throw: 0.3 };
function swingCurve(u, w) {
  if (u < w) return -smoothstep(0, w, u);
  if (u < w + 0.14) return -1 + 2 * smoothstep(w, w + 0.14, u);
  return 1 - smoothstep(w + 0.14, 1, u);
}

function swingPose(ud, swing, u, gun) {
  const f = swingCurve(u, SWING_W[swing]);
  const back = Math.max(0, -f), hit = Math.max(0, f);
  const blend = u < 0.12 ? u / 0.12 : u > 0.85 ? (1 - u) / 0.15 : 1;
  const chest = ud.chest;
  switch (swing) {
    case 'bat': // two-handed, a flat swing through the chest twist
      setArm(ud.armR, ud.elbowR, 1.05 + back * 0.5, 0.9 - hit * 0.6, -0.3 * back);
      setArm(ud.armL, ud.elbowL, 1.05 + back * 0.4, 1.1 - hit * 0.5, 0.3);
      if (chest) chest.rotation.y = (-0.9 * back + 1.1 * hit) * blend;
      if (gun) gun.rotation.z = 1.9 - hit * 0.5;
      break;
    case 'slap': // hockey: low, stick raised behind, slapped through
      setArm(ud.armR, ud.elbowR, 0.4 + back * 1.3 + hit * 0.4, 0.4, 0);
      setArm(ud.armL, ud.elbowL, 0.6 + back * 0.8, 0.9, 0.2);
      if (chest) chest.rotation.y = (-0.6 * back + 0.7 * hit) * blend;
      if (gun) gun.rotation.z = 0.5 - back * 0.3;
      break;
    case 'sweep': { // the broom: low side-to-side, like chasing the cat off the stoep
      const s = Math.sin(u * Math.PI * 2) * blend;
      setArm(ud.armR, ud.elbowR, 0.6 + hit * 0.3, 0.6, s * 0.35);
      setArm(ud.armL, ud.elbowL, 0.75, 1.1, 0.25);
      if (chest) chest.rotation.y = s * 0.55;
      if (gun) gun.rotation.z = 0.5 + hit * 0.4;
      break;
    }
    case 'stab': // the pump jabbed forward like a lance
      setArm(ud.armR, ud.elbowR, 0.7 + 0.85 * hit + back * 0.1, 1.7 - 1.6 * hit, 0);
      setArm(ud.armL, ud.elbowL, 0.95, 2.1);
      if (chest) chest.rotation.y = -0.25 * hit * blend;
      if (gun) gun.rotation.z = 0.15;
      break;
    case 'overhead': // the klomp brought down from above the head
      setArm(ud.armR, ud.elbowR, 1.5 + back * 1.4 - hit * 0.7, 0.3 + back * 1.1, 0);
      setArm(ud.armL, ud.elbowL, 0.9, 1.6);
      if (chest) { chest.rotation.z += (back * 0.25 - hit * 0.35) * blend; chest.rotation.y = -0.2 * hit * blend; }
      if (gun) gun.rotation.z = 1.5 + back * 0.4;
      break;
    case 'thrust': // the polsstok: drawn back, then driven forward with both hands
      setArm(ud.armR, ud.elbowR, 1.15 - back * 0.45 + hit * 0.35, 0.3 + back * 1.3 - hit * 0.25, 0);
      setArm(ud.armL, ud.elbowL, 1.3 - back * 0.3 + hit * 0.2, 0.9 + back * 0.8 - hit * 0.6, 0.15);
      if (chest) chest.rotation.y = (0.25 * back - 0.15 * hit) * blend;
      if (gun) gun.rotation.z = 1.35 - (1 - back) * 1.2 * blend;
      break;
    case 'throw': // overhand lob
      setArm(ud.armR, ud.elbowR, 1.5 + back * 1.2 - hit * 0.4, 0.4 + back * 1.2, 0);
      setArm(ud.armL, ud.elbowL, 1.1 * (1 - hit), 0.6);
      if (chest) chest.rotation.y = (0.35 * back - 0.4 * hit) * blend;
      if (gun) gun.rotation.z = 0.2;
      break;
    default:
      break;
  }
}

export function applyAttackPose(mesh, fx, now, aiming = null) {
  const ud = mesh && mesh.userData;
  if (ud && ud.qRig) { modularAttack(mesh, ud, fx, now, aiming); return; }
  if (!ud || !ud.armR || !ud.armL) return;
  const spec = ud.gunKey ? GUN_SPECS[ud.gunKey] : null;
  const gun = spec && ud.guns ? ud.guns[ud.gunKey] : null;
  const shot = fx && (fx.type === 'muzzle' || fx.type === 'squirt');
  if (gun) {
    const firing = shot && now - fx.start < AIM_HOLD_S;
    gun.rotation.z = (aiming || firing) && !spec.melee ? 0 : spec.rest ?? 0.95;
  }
  const swing = fx && fx.start !== undefined && (fx.type === 'throw' ? 'throw' : fx.type === 'melee' && fx.swing !== 'jab' ? fx.swing : null);
  if (swing && SWING_S[swing]) {
    const u = (now - fx.start) / SWING_S[swing];
    if (u >= 0 && u < 1) { swingPose(ud, swing, u, gun); return; }
  }
  if (aiming && (!shot || now - fx.start >= AIM_HOLD_S - 0.2)) {
    // raised, steady aim between shots
    setArm(ud.armR, ud.elbowR, 1.55, 0.06);
    if (spec && spec.two) setArm(ud.armL, ud.elbowL, 1.4, 0.55, 0);
    return;
  }
  if (spec && spec.two && spec.melee) setArm(ud.armL, ud.elbowL, 0.7, 1.2, 0.2);
  if (!fx || fx.start === undefined) return;
  const dt = now - fx.start;
  if (fx.type === 'melee') {
    if (dt < 0 || dt >= PUNCH_S || (fx.swing && fx.swing !== 'jab')) return;
    const u = dt / PUNCH_S;
    const ext = u < 0.3 ? smoothstep(0, 0.3, u) : 1 - smoothstep(0.3, 1, u);
    const right = fx.side > 0;
    const [pa, pe] = right ? [ud.armR, ud.elbowR] : [ud.armL, ud.elbowL];
    const [ga, ge] = right ? [ud.armL, ud.elbowL] : [ud.armR, ud.elbowR];
    setArm(pa, pe, 0.5 + 1.05 * ext, 1.9 - 1.82 * ext);
    setArm(ga, ge, 0.95, 2.1);
    if (ud.chest) ud.chest.rotation.y = (right ? -1 : 1) * 0.28 * ext;
    return;
  }
  if (shot) {
    if (dt < 0 || (dt >= AIM_HOLD_S && !aiming)) return;
    const hold = aiming ? 1 : 1 - smoothstep(AIM_HOLD_S - 0.2, AIM_HOLD_S, dt);
    const [armK, elbowK, chestK] = RECOIL[fx.weapon] || RECOIL.pistol;
    // sharp snap up, slower settle
    const kick = dt < 0.03 ? dt / 0.03 : Math.exp(-(dt - 0.03) * 14);
    const z = ud.armR.rotation.z + (1.55 + armK * kick - ud.armR.rotation.z) * hold;
    const e = (ud.elbowR ? ud.elbowR.rotation.z : 0) * (1 - hold) + (0.06 + elbowK * kick) * hold;
    setArm(ud.armR, ud.elbowR, z, e);
    if (spec && spec.two) {
      const zl = ud.armL.rotation.z + (1.4 + armK * 0.7 * kick - ud.armL.rotation.z) * hold;
      setArm(ud.armL, ud.elbowL, zl, (0.55 + elbowK * 0.5 * kick) * hold, 0);
    }
    if (ud.chest) ud.chest.rotation.z += chestK * kick * hold;
    if (ud.head) ud.head.rotation.z += chestK * 0.6 * kick * hold;
  }
}

// Aanvallen op een modulaire mens (modularpeople.js modularAttackPose): dezelfde tijden als hierboven, de bewegingen uit de UAL-clips.
function modularAttack(mesh, ud, fx, now, aiming) {
  const spec = ud.gunKey ? GUN_SPECS[ud.gunKey] : null;
  const gun = spec && ud.guns ? ud.guns[ud.gunKey] : null;
  const shot = fx && (fx.type === 'muzzle' || fx.type === 'squirt');
  if (gun) gun.rotation.z = (aiming || (shot && now - fx.start < AIM_HOLD_S)) && !spec.melee ? 0 : spec.rest ?? 0.95;
  const dt = fx && fx.start !== undefined ? now - fx.start : -1;
  const swing = fx && dt >= 0 && (fx.type === 'throw' ? 'throw' : fx.type === 'melee' && fx.swing !== 'jab' ? fx.swing : null);
  if (swing && SWING_S[swing] && dt < SWING_S[swing]) { modularAttackPose(mesh, 'cross', dt / SWING_S[swing]); return; }
  if (fx && fx.type === 'melee' && dt >= 0 && dt < PUNCH_S) { modularAttackPose(mesh, fx.side > 0 ? 'cross' : 'jab', dt / PUNCH_S); return; }
  if (shot && dt >= 0 && dt < AIM_HOLD_S) { modularAttackPose(mesh, 'shoot', dt / AIM_HOLD_S, aiming ? 1 : 1 - smoothstep(AIM_HOLD_S - 0.2, AIM_HOLD_S, dt)); return; }
  if (aiming) modularAttackPose(mesh, 'aim', 0, 1);
}

// Hit reaction for someone shot but still standing: the torso snaps away
// from the bullet, the head whips and the arms flinch, easing out in ~0.45 s.
// react = { t, dx, dy, k } (dx, dy: bullet direction), angle = body facing.
const REACT_S = 0.45;
export function applyHitReaction(mesh, react, now, angle) {
  const ud = mesh && mesh.userData;
  if (!ud || !react || !ud.chest) return;
  const dt = now - react.t;
  if (dt < 0 || dt >= REACT_S) return;
  const env = (dt < 0.05 ? dt / 0.05 : 1 - smoothstep(0.05, REACT_S, dt)) * (react.k || 1);
  const c = Math.cos(angle), sn = Math.sin(angle);
  const fwd = react.dx * c + react.dy * sn;
  const side = -react.dx * sn + react.dy * c;
  ud.chest.rotation.z += -fwd * 0.55 * env;
  ud.chest.rotation.x += side * 0.45 * env;
  ud.head.rotation.z += -fwd * 0.5 * env;
  ud.head.rotation.x += side * 0.35 * env;
  ud.armL.rotation.z += 0.7 * env;
  ud.armR.rotation.z += 0.55 * env;
  if (ud.elbowL) ud.elbowL.rotation.z += 0.8 * env;
  if (ud.elbowR) ud.elbowR.rotation.z += 0.8 * env;
}

const POSE_DROP = { crouch: 0.42, sit: 0.46, fish: 0.5 };

// De hengelhouding van de speler (#437): alleen het lichaam, de hengel zelf tekent hengelanim.js. Per fase een korte
// beweging: uitwerpen (eerst naar achteren, dan de zwiep naar voren), de ruk aan de hengel bij een beet en het
// binnenhalen. Pure getallen (geen THREE), zodat scripts/hengelhouding_test.mjs ze kan natrekken. `t` is in seconden
// sinds de fase begon; de hoeken zijn als bij de andere houdingen (arm.rotation.z > 0 is naar voren, 2,75 = boven het
// hoofd). De fases kiest hengelen.js (HENGEL_POSE), de posehook zet ze op de botten van de speler.
export function hengelHouding(pose, t = 0) {
  const o = { armL: 0.9, elbowL: 0.85, armLx: 0, armR: 1.15, elbowR: 0.55, armRx: 0, chest: -0.06, head: 0.08, legL: 0.06, legR: -0.04 };
  const tot = (d) => Math.max(0, Math.min(1, t / d));
  if (pose === 'hengel-uit') {
    // eerst naar achteren (inhalen), dan de zwiep naar voren, daarna komt de arm tot rust
    const k = tot(0.8);
    if (k < 0.35) {
      const a = k / 0.35;
      o.armR = 1.15 - 1.0 * a; o.elbowR = 0.55 + 0.6 * a; o.chest = -0.06 + 0.1 * a;
    } else {
      const a = (k - 0.35) / 0.65;
      const zweep = Math.min(1, a / 0.4), terug = Math.max(0, (a - 0.4) / 0.6); // de zwiep is snel, daarna zakt hij terug
      o.armR = 0.15 + 1.6 * zweep * (1 - 0.45 * terug);
      o.elbowR = 1.15 - 0.7 * zweep + 0.1 * terug;
      o.chest = 0.04 - 0.1 * zweep + 0.06 * terug;
    }
    const zwaai = Math.sin(k * Math.PI);
    o.armL = 0.75 + 0.15 * zwaai; o.elbowL = 0.7 + 0.3 * zwaai;
    o.legL = 0.12 * zwaai; o.legR = -0.1 * zwaai;
  } else if (pose === 'hengel-ruk') {
    // meteen een korte ruk omhoog (de vis haakt), daarna terug naar klaar
    const jerk = Math.sin(Math.min(1, tot(0.45) * 2.5) * Math.PI);
    o.armR = 1.15 + 0.55 * jerk; o.elbowR = 0.55 + 0.35 * jerk;
    o.chest = -0.06 - 0.16 * jerk; o.head = 0.08 - 0.12 * jerk;
    o.armL = 0.9 + 0.25 * jerk; o.elbowL = 0.85 - 0.25 * jerk;
  } else if (pose === 'hengel-haal') {
    // binnenhalen: de slinger van de molen draait, de hengel licht op en neer
    const slag = Math.sin(t * 9);
    o.armR = 1.25 - 0.1 * tot(0.9); o.elbowR = 0.7 + 0.35 * slag;
    o.armL = 0.95; o.elbowL = 0.85 + 0.3 * Math.sin(t * 9 + Math.PI);
    o.chest = -0.12 + 0.05 * slag;
  } else {
    // klaar: rustig ademen met de hengel voor je uit
    const bob = Math.sin(t * 1.4) * 0.03;
    o.armR = 1.15 + bob; o.elbowR = 0.55 + bob; o.armL = 0.9 + bob * 0.6; o.elbowL = 0.85 + bob;
  }
  return o;
}

function applyPose(mesh, pose, t) {
  const ud = mesh.userData;
  // een nieuwe houding begint zijn eigen beweging (uitwerpen, de ruk, binnenhalen)
  if (pose !== ud.poseName) { ud.poseName = pose; ud.poseStart = t; }
  const poseT = Math.max(0, t - (ud.poseStart ?? t));
  const drop = POSE_DROP[pose] || 0;
  mesh.position.y -= drop;
  if (ud.shadow) {
    if (ud.shadowBaseY === undefined) ud.shadowBaseY = ud.shadow.position.y;
    ud.shadow.position.y = ud.shadowBaseY + drop / (mesh.scale.y || 1);
  }
  mesh.rotation.z = 0;
  const sy = mesh.scale.y || 1;
  const hipH = HIP_Y - drop / sy;
  setPropVisible(ud, 'phoneProp', pose === 'phone' || pose === 'call');
  setPropVisible(ud, 'rodProp', pose === 'fish');
  setPropVisible(ud, 'guitarProp', pose === 'muziek');
  if (ud.umbrella) ud.umbrella.visible = !pose;
  if (pose === 'crouch' || pose === 'sit' || pose === 'fish' || pose === 'haul' || /^hengel/.test(pose || '')) {
    ud.pelvis.position.set(0, HIP_Y, 0);
    ud.pelvis.rotation.set(0, 0, 0);
  }
  switch (pose) {
    case 'crouch': {
      const shake = Math.sin(t * 23) * 0.03;
      ud.chest.rotation.set(0, 0, -0.75 + shake);
      ud.head.rotation.set(0, 0, 0.3);
      legIK(ud.legL, ud.kneeL, 0.3, ANKLE_Y - hipH);
      legIK(ud.legR, ud.kneeR, 0.22, ANKLE_Y - hipH);
      setArm(ud.armL, ud.elbowL, 2.3, 1.9, -0.25);
      setArm(ud.armR, ud.elbowR, 2.3, 1.9, 0.25);
      break;
    }
    case 'phone':
      propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
      ud.phoneProp.rotation.set(0, 0, 0);
      ud.head.rotation.set(0, 0, -0.35);
      setArm(ud.armR, ud.elbowR, 0.3, 1.35, -0.2);
      setArm(ud.armL, ud.elbowL, 0.25, 1.2, 0.15);
      break;
    case 'call':
      propOn(ud, 'phoneProp', PHONE_GEO, PHONE_MAT, (m) => m.position.set(0.045, -0.3, 0.0));
      ud.phoneProp.rotation.set(0, 0, 0);
      ud.head.rotation.set(0.12, 0, 0);
      setArm(ud.armR, ud.elbowR, 1.3, 2.4, 0.12);
      setArm(ud.armL, ud.elbowL, 0.1, 0.3);
      break;
    case 'sit':
      ud.chest.rotation.set(0, 0, 0.05);
      legIK(ud.legL, ud.kneeL, 0.44, ANKLE_Y - hipH);
      legIK(ud.legR, ud.kneeR, 0.38, ANKLE_Y - hipH + 0.01);
      setArm(ud.armL, ud.elbowL, 0.35 + Math.sin(t * 0.7) * 0.06, 0.9);
      setArm(ud.armR, ud.elbowR, 0.4 + Math.sin(t * 1.3 + 1) * 0.12, 1.0 + Math.sin(t * 1.3 + 1) * 0.2);
      break;
    case 'fish': {
      propOn(ud, 'rodProp', ROD_GEO, ROD_MAT, (m) => { m.position.set(0.02, -0.3, 0); m.rotation.z = -1.8; });
      legIK(ud.legL, ud.kneeL, 0.3, -0.75);
      legIK(ud.legR, ud.kneeR, 0.34, -0.72);
      ud.chest.rotation.set(0, 0, -0.1);
      const bob = Math.sin(t * 0.9) * 0.05;
      setArm(ud.armL, ud.elbowL, 0.55 + bob, 0.9);
      setArm(ud.armR, ud.elbowR, 0.65 + bob, 0.95);
      break;
    }
    case 'haul': {
      const pull = (Math.sin(t * 2.2) + 1) * 0.5;
      mesh.rotation.z = 0.15 + pull * 0.2;
      setArm(ud.armL, ud.elbowL, 1.1 + pull * 0.5, 0.3 + (1 - pull) * 0.4);
      setArm(ud.armR, ud.elbowR, 1.1 + pull * 0.5, 0.3 + (1 - pull) * 0.4);
      ud.legL.rotation.set(0, 0, 0.35);
      ud.legR.rotation.set(0, 0, -0.25);
      break;
    }
    case 'hengel':
    case 'hengel-uit':
    case 'hengel-ruk':
    case 'hengel-haal': {
      const h = hengelHouding(pose, poseT);
      ud.chest.rotation.set(0, 0, h.chest);
      ud.head.rotation.set(0, 0, h.head);
      setArm(ud.armL, ud.elbowL, h.armL, h.elbowL, h.armLx);
      setArm(ud.armR, ud.elbowR, h.armR, h.elbowR, h.armRx);
      ud.legL.rotation.set(0, 0, h.legL);
      ud.legR.rotation.set(0, 0, h.legR);
      break;
    }
    case 'angry':
      setArm(ud.armR, ud.elbowR, 2.6 + Math.sin(t * 14) * 0.2, 0.9 + Math.sin(t * 14) * 0.3);
      setArm(ud.armL, ud.elbowL, 0.25, 1.9, -0.35);
      ud.head.rotation.set(0, 0, 0.1);
      break;
    case 'vendor':
      setArm(ud.armL, ud.elbowL, 0.4 + Math.sin(t * 1.1) * 0.25, 0.9 + Math.sin(t * 1.1) * 0.3);
      setArm(ud.armR, ud.elbowR, 0.4 + Math.sin(t * 1.7 + 2) * 0.35, 1.0 + Math.sin(t * 1.7 + 2) * 0.35);
      break;
    case 'talk': {
      // praten in een groepje (dailyrhythm.js 'praten', #1314): handen op borsthoogte die om en om iets uitleggen, af en toe knikken
      const a = Math.sin(t * 2.3 + (ud.animOffset || 0)), b = Math.sin(t * 1.7 + 1.3 + (ud.animOffset || 0));
      setArm(ud.armL, ud.elbowL, 0.45 + Math.max(0, a) * 0.45, 1.35 + a * 0.25, -0.1);
      setArm(ud.armR, ud.elbowR, 0.4 + Math.max(0, b) * 0.5, 1.4 + b * 0.25, 0.1);
      ud.head.rotation.set(0, Math.sin(t * 0.6) * 0.15, Math.sin(t * 3.1) * 0.05);
      break;
    }
    case 'muziek': {
      // straatmuzikant (streetevents.js): de gitaar uit het propregister schuin voor de buik, rechts tokkelen, links op de hals
      if (!ud.guitarProp && ud.chest) {
        const g = new THREE.Mesh(propGeometry('gitaar'), GUITAR_MAT);
        g.position.set(0.17, -0.42, 0.02);
        g.rotation.set(1.05, 0, 0);
        ud.chest.add(g);
        ud.guitarProp = g;
      }
      if (ud.guitarProp) ud.guitarProp.visible = true;
      const strum = Math.sin(t * 9);
      setArm(ud.armR, ud.elbowR, 0.55 + strum * 0.12, 1.45, 0.25);
      setArm(ud.armL, ud.elbowL, 1.15, 1.2, -0.55);
      ud.head.rotation.set(0, 0, 0.18 + Math.sin(t * 1.9) * 0.06);
      break;
    }
  }
}

function updatePose(mesh) {
  const ud = mesh.userData;
  const src = ud.lookSeed !== undefined ? poseSources.get(ud.lookSeed) : null;
  const pose = src && src.state !== 'dead' ? src.pose : null;
  if (pose) {
    ud.posed = true;
    applyPose(mesh, pose, performance.now() / 1000);
  } else if (ud.posed) {
    ud.posed = false;
    if (!src || src.state !== 'dead') mesh.rotation.z = 0;
    if (ud.shadow && ud.shadowBaseY !== undefined) ud.shadow.position.y = ud.shadowBaseY;
    setPropVisible(ud, 'phoneProp', false);
    setPropVisible(ud, 'rodProp', false);
    setPropVisible(ud, 'guitarProp', false);
    if (ud.umbrella) ud.umbrella.visible = true;
  }
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const TAU = Math.PI * 2;
// (#463) De heupzwaai blijft binnen een stap: met de volle zwaai las het lopen
// als een spreidstand in plaats van een stap. Hardlopen mag ruimer dan lopen.
const MAX_HIP_SWING = 0.34, MAX_HIP_SWING_RUN = 0.55;
const _uq = new THREE.Quaternion();
// Shaft leans back and in so the canopy centres over the head.
const UMBRELLA_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0.17));

// ---- houdingen van modulaire voorbijgangers (ADR 0051): zitten, bellen, praten, hurken, vissen, sjouwen, een kraam, muziek ---------------
// De state-machine kiest de basis (zitten = de zit-clip, hurken = de hurkclip, praten = idle met gebaren); de armen volgen daarna met IK
// naar punten in de assen van de mens (x voor, y omhoog, z naar rechts, ongeschaald), met een prop in de hand waar het hoort. Geen pose
// zonder basis: wat geen eigen clip heeft blijft in rust met de ademhaling van de clip, nooit een stijve T-pose.
const POSE_SIT = new Set(['sit', 'fish']);
const MP_PHONE_GEO = markShared(new THREE.BoxGeometry(0.145, 0.019, 0.068));
const _mpw = new THREE.Vector3();
function modularProp(ud, key, mk) {
  let m = ud.qProps && ud.qProps[key];
  if (!m) { m = mk(); (ud.qProps || (ud.qProps = {}))[key] = m; }
  m.visible = true;
  return m;
}
function modularPropsOff(ud) { if (ud.qProps) for (const k in ud.qProps) ud.qProps[k].visible = false; }
function modularPosed(mesh, ud, pose, speed, dt) {
  if (pose) {
    const p = ud.qPoseP || (ud.qPoseP = { seated: false, talk: false });
    const t0 = performance.now() / 1000 + (ud.animOffset || 0);
    p.seated = POSE_SIT.has(pose);
    p.talk = pose === 'talk' || pose === 'angry' || (pose === 'vendor' && Math.sin(t0 * 0.35) > 0.2);
    if (!ud.qParams || ud.qParams === p) ud.qParams = p;
    if (pose === 'crouch') { ud.crouch = true; ud.qPoseCrouch = true; }
    if (ud.qPosed !== pose && p.seated && !ud.qPosed) modularSetState(mesh, 'sit');   // geen opstaan-en-zitten bij het verschijnen
    ud.qPosed = pose;
    // de uitdrukking volgt de situatie: lachen bij praten, mokken bij boos
    if (ud.qLod === 0) { const m = pose === 'talk' || pose === 'muziek' ? 'vrolijk' : pose === 'angry' ? 'mokkend' : null; if (m) setModularMood(mesh, m); else if (ud.qMoodBase) setModularMood(mesh, ud.qMoodBase); }
  } else {
    ud.qPosed = null;
    if (ud.qMoodBase) setModularMood(mesh, ud.qMoodBase);
    if (ud.qParams === ud.qPoseP) ud.qParams = null;
    if (ud.qPoseCrouch) { ud.crouch = false; ud.qPoseCrouch = false; }
    modularPropsOff(ud);
  }
  animateModular(mesh, pose ? 0 : speed, dt);
  if (!pose) return;
  if (ud.qLod > 0) { modularPropsOff(ud); return; }   // vanaf het eerste LOD-niveau (25 m): de basis van de houding, zonder IK en props
  mesh.updateMatrixWorld(true);
  modularPoseArms(mesh, ud, pose, 1);
  mesh.updateMatrixWorld(true);
}
// De armen en props van een houding, met gewicht k (0..1: 1 bij een vaste houding, een verloop bij een alledaags gebaar).
function modularPoseArms(mesh, ud, pose, k) {
  const t = performance.now() / 1000 + (ud.animOffset || 0);
  const R = (at, w = 1, pole) => modularReach(mesh, 'R', at, w * k, pole), L = (at, w = 1, pole) => modularReach(mesh, 'L', at, w * k, pole);
  const turn = (n, a) => modularTurn(mesh, n, a * k);
  const sw = (a, f, o = 0) => Math.sin(t * f + o) * a;
  if (pose !== 'phone' && pose !== 'call' && ud.qProps && ud.qProps.phone) ud.qProps.phone.visible = false;
  if (pose !== 'fish' && !/^hengel/.test(pose)) if (ud.qProps && ud.qProps.rod) ud.qProps.rod.visible = false;
  if (pose !== 'muziek') if (ud.qProps && ud.qProps.guitar) ud.qProps.guitar.visible = false;
  switch (pose) {
    case 'phone':
    case 'call':
    case 'horloge':
    case 'krabben': {
      const call = pose === 'call';
      if (pose === 'horloge') { turn('Head', -0.2); L([0.26, 1.2, -0.12], 1, [0, -1, 0.5]); break; }   // een blik op het horloge
      if (pose === 'krabben') { turn('Head', 0.05); R([0.04, 1.62, 0.1], 1, [0, -1, 0.9]); break; }   // even achter het hoofd krabben
      turn('Head', call ? 0.05 : -0.32 + sw(0.03, 0.9));
      R(call ? [0.07, 1.57, 0.13] : [0.3, 1.24 + sw(0.01, 1.3), 0.05], 1, [0, -1, 0.9]);
      if (call) L([0.1, 0.96, -0.2], 0.6, [0, -1, 0.6]);
      const ph = modularProp(ud, 'phone', () => new THREE.Mesh(PHONE_GEO, PHONE_MAT));
      modularPlaceProp(mesh, ph, 'WristR', modularHandPoint(mesh, 'R', _mpw, call ? [0.0, 0.0, 0.03] : [0.0, 0.03, 0.0]), call ? [0, 0, 0.12] : [0, Math.PI / 2, -0.55]);
      break;
    }
    case 'fish':
    case 'hengel':
    case 'hengel-uit':
    case 'hengel-ruk':
    case 'hengel-haal': {
      const poseT = Math.max(0, t - (ud.qPoseStart ?? (ud.qPoseStart = t)));
      if (ud.qPoseName !== pose) { ud.qPoseName = pose; ud.qPoseStart = t; }
      const h = pose === 'fish' ? null : hengelHouding(pose, Math.max(0, t - ud.qPoseStart));
      const lift = h ? Math.max(0, Math.min(1.8, h.armR)) : 1.1 + sw(0.03, 1.4);
      const seated = pose === 'fish';
      R([0.16 + 0.2 * lift, (seated ? 0.78 : 0.88) + 0.12 * lift, 0.15], 1, [0, -1, 0.8]);
      L([0.3, (seated ? 0.74 : 0.86) + 0.05 * lift + (pose === 'hengel-haal' ? sw(0.05, 9) : 0), -0.1], 1, [0, -1, 0.8]);
      const rod = modularProp(ud, 'rod', () => new THREE.Mesh(ROD_GEO, ROD_MAT)), ang = 0.95 + 0.25 * (lift - 1.1);
      modularPlaceProp(mesh, rod, 'WristR', modularHandPoint(mesh, 'R', _mpw, [-0.3 * Math.sin(ang), -0.3 * Math.cos(ang), 0.0]), [0, 0, -ang]);
      break;
    }
    case 'haul': {
      // trekken aan een touw: achterover, de handen laag voor je uit, het hele lijf in de ruk
      const pull = (Math.sin(t * 2.2) + 1) * 0.5;
      turn('Torso', 0.1 + 0.16 * pull);
      R([0.5 - 0.1 * pull, 0.86, 0.16], 1, [0, -1, 0.7]);
      L([0.5 - 0.1 * pull, 0.86, -0.16], 1, [0, -1, 0.7]);
      break;
    }
    case 'angry': {
      turn('Head', -0.08);
      R([0.42, 1.78 + sw(0.05, 14), 0.2], 1, [0, -1, 0.8]);
      L([0.1, 0.98, -0.3], 0.7, [0, -1, 0.9]);
      break;
    }
    case 'vendor': {
      // handen op het kraam- of krantenblad voor je, en af en toe een gebaar (het praten hierboven)
      const rest = Math.sin(t * 0.35) <= 0.2 ? 1 : 0.15;
      R([0.42, 0.98 + sw(0.01, 1.1), 0.2], rest, [0, -1, 0.8]);
      L([0.42, 0.98 + sw(0.01, 1.7, 2), -0.2], rest, [0, -1, 0.8]);
      break;
    }
    case 'muziek': {
      const g = modularProp(ud, 'guitar', () => new THREE.Mesh(propGeometry('gitaar'), GUITAR_MAT));
      mesh.localToWorld(_mpw.set(0.17, 0.9, 0.26));
      modularPlaceProp(mesh, g, 'Chest', _mpw, [-1.13, 0, 0]);
      const strum = Math.sin(t * 9);
      R([0.3, 0.98 + strum * 0.04, 0.2], 1, [0, -1, 0.8]);
      L([0.58, 1.2, -0.12], 1, [0, -1, 0.8]);
      break;
    }
    default: break;   // sit, talk en crouch: de basis is genoeg
  }
}

// Alledaagse gebaren van wie stilstaat (een wachtende, iemand bij een kruispunt): na een tijd stil even de telefoon, een blik op het
// horloge, achter het hoofd krabben of rondkijken. Per mens een eigen ritme uit het zaad (6 tot 22 s tussen twee gebaren, nooit synchroon),
// zachtjes erin en eruit (0,4 s), alleen dichtbij (LOD 0) en zonder vaste houding of eigen parameters van een beller.
const frac = (x) => ((x % 1) + 1) % 1;
const FIDGETS = [['phone', 6.5, 3], ['horloge', 2.6, 2], ['krabben', 2.2, 2], ['rond', 3.2, 3]];
function modularFidget(mesh, ud, speed, dt) {
  const f = ud.qFid || (ud.qFid = { still: 0, next: 6 + 16 * frac(Math.sin((ud.lookSeed || 0) * 12.9898 + 91.7) * 43758.5453), name: null, t: 0, dur: 0, k: 0 });
  if (speed > 0.15 || ud.qLod > 0 || ud.qParams || ud.qPosed || ud.qInSeat) {
    if (f.name) { f.name = null; f.k = 0; if (ud.qProps && ud.qProps.phone) ud.qProps.phone.visible = false; }
    f.still = 0;
    return;
  }
  f.still += dt;
  if (!f.name) {
    if (f.still < f.next) return;
    const pick = FIDGETS[Math.floor(frac(Math.sin(f.still * 7.31 + (ud.lookSeed || 0) * 3.7) * 43758.5453) * FIDGETS.length) % FIDGETS.length];
    f.name = pick[0]; f.dur = pick[1]; f.t = 0;
  }
  f.t += dt;
  const e = Math.min(1, f.t / 0.4, (f.dur - f.t) / 0.4);
  f.k = Math.max(0, e) * Math.max(0, e) * (3 - 2 * Math.max(0, e));
  if (f.t >= f.dur) {
    f.name = null; f.k = 0; f.still = 0; f.next = 6 + 16 * frac(Math.sin(f.t * 5.17 + (ud.lookSeed || 0)) * 43758.5453);
    if (ud.qProps && ud.qProps.phone) ud.qProps.phone.visible = false;
    return;
  }
  if (f.name === 'rond') {   // het hoofd langzaam naar links, dan naar rechts
    const ph = f.t / f.dur;
    modularTurn(mesh, 'Head', 0);
    ud.qFidGaze = Math.sin(ph * Math.PI * 2) * 0.9 * f.k;
    return;
  }
  mesh.updateMatrixWorld(true);
  modularPoseArms(mesh, ud, f.name, f.k);
  mesh.updateMatrixWorld(true);
}

// Walk/run cycle plus idle life (breathing, weight shift, glancing around)
// for a mesh built by buildPersonMesh(). Phase advances with distance;
// walk/run weights ease in and out so starts and stops blend smoothly.
export function animatePersonWalk(mesh, speed, dt) {
  const ud = mesh && mesh.userData;
  if (ud && ud.qRig) { // modulaire mens (modularpeople.js, ADR 0050)
    const src = ud.lookSeed !== undefined && poseSources.size ? poseSources.get(ud.lookSeed) : null;
    const pose = src && src.state !== 'dead' ? src.pose : null;
    if (pose || ud.qPosed) modularPosed(mesh, ud, pose || null, speed, dt);
    else {
      // rondkijken: de blik van een wachtende (hieronder), bovenop de blik naar de speler (gait.js glanceAt)
      if (ud.qFidGaze) { if (!(ud.gazeT === ud.gazeT) || ud.gazeT === undefined) ud.gazeT = ud.qFidGaze; ud.qFidGaze = 0; }
      animateModular(mesh, speed, dt);
      if (ud.qFidget && (ud.qLod === 0 && speed < 0.15 || (ud.qFid && ud.qFid.name))) modularFidget(mesh, ud, speed, dt);
    }
    return;
  }
  if (!ud || !ud.legL || !ud.legR || !ud.armL || !ud.armR) return;

  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  if (ud.umbrella && !ud.posed) ud.umbrella.visible = true;
  if (ud.paddleProp) ud.paddleProp.visible = false;
  if (!ud.pelvis) {
    const sw = Math.sin((ud.walkPhase = ((ud.walkPhase || 0) + s * 2.2 * step) % TAU)) * Math.min(1, s / 1.5);
    ud.legL.rotation.z = sw * 0.55; ud.legR.rotation.z = -sw * 0.55;
    ud.armL.rotation.z = -sw * 0.35; ud.armR.rotation.z = sw * 0.35;
    updatePose(mesh);
    return;
  }

  ud.animT = (ud.animT || 0) + step;
  const t = ud.animT + ud.animOffset;
  const gait = ud.gait || 1;
  const cb = ud.crouchBlend = approach(ud.crouchBlend || 0, ud.crouch ? 1 : 0, step / CROUCH_BLEND_TIME);
  const crouch = cb * cb * (3 - 2 * cb);
  const cadence = Math.min(2.1, (0.42 + 0.3 * s) * gait) * (1 - crouch) + Math.min(1.6, 0.35 + s / 1.1) * crouch;
  const moving = Math.min(1, s / 0.25);
  const prevPhase = ud.walkPhase || 0;
  const phase = (prevPhase + TAU * cadence * step * moving) % TAU;
  ud.walkPhase = phase;
  // hielcontact (gait.js): sfx/foley.js speelt de stap bij deze voet, niet bij een eigen teller
  if (s > 0.3 && step > 0) { const fc = footContact(prevPhase, phase); if (fc) { ud.footN = (ud.footN || 0) + 1; ud.footSide = fc - 1; } }
  // bocht en blik (gait.js): de heading verandert per seconde, de romp helt mee en de blik loopt de bocht vooruit
  let yawRate = 0;
  if (step > 0) {
    const yaw = mesh.rotation.y;
    if (ud.prevYaw !== undefined) yawRate = -wrapPi(yaw - ud.prevYaw) / step;
    ud.prevYaw = yaw;
  }
  const tl = turnLean(yawRate, s);
  ud.turnLean = approachTo(ud.turnLean || 0, tl.lean, 1.2, step);
  ud.turnHead = approachTo(ud.turnHead || 0, tl.head, 2.5, step);
  const gz = ud.gazeT;
  ud.gazeS = approachTo(ud.gazeS || 0, gz === undefined || gz !== gz ? 0 : gz, 3.2, step);

  const ease = Math.min(1, step * 8);
  const w = (ud.walkBlend || 0) + (Math.min(1, s / 1.0) - (ud.walkBlend || 0)) * ease;
  const r = (ud.runBlend || 0) + (smoothstep(2.0, 5.6, s) - (ud.runBlend || 0)) * ease;
  ud.walkBlend = w;
  ud.runBlend = r;
  const idle = 1 - w;
  const dead = Math.abs(mesh.rotation.z) > 1;

  const thighAmp = Math.min(MAX_HIP_SWING + (MAX_HIP_SWING_RUN - MAX_HIP_SWING) * r, (0.42 + 0.43 * r) * w);
  const thighBias = 0.1 * r;
  const kneeSwing = (0.95 + 0.95 * r) * w;
  const kneeStance = (0.08 + 0.25 * r) * w;
  const armAmp = (0.3 + 0.45 * r) * w * (ud.stoop ? 0.6 : 1);
  const elbowBase = 0.12 + (0.14 + 1.25 * r) * w;

  const breath = Math.sin(t * 1.7);
  const shift = Math.sin(t * 0.33) * idle;
  const look = dead ? 0 : Math.sin(t * 0.23) * Math.sin(t * 0.37 + 1.3) * 0.55;

  const pelvis = ud.pelvis, chest = ud.chest, head = ud.head;
  const bob = (0.018 + 0.03 * r) * w;
  pelvis.position.set(0, HIP_Y - 0.035 * r * w + bob * Math.cos(2 * phase), 0.022 * shift);
  pelvis.rotation.set(0.035 * shift, 0.1 * w * Math.sin(phase), 0);
  // gewicht bij het optrekken en afremmen: wie begint te lopen duikt kort naar voren, wie stopt wiegt even terug (dw = hoe snel de loopmix verandert)
  const dw = step > 0 ? (w - (ud.wPrev === undefined ? w : ud.wPrev)) / step : 0;
  ud.wPrev = w;
  const weight = dw > 0 ? -Math.min(0.07, dw * 0.012) : Math.min(0.06, -dw * 0.01);
  const lean = -(ud.stoop || 0) - 0.03 * w - 0.2 * r * w + weight;
  chest.position.set(0, CHEST_Y - HIP_Y + 0.006 * breath * idle, 0);
  chest.rotation.set(-0.03 * shift, -0.2 * w * Math.sin(phase), lean - 0.02 * breath * idle);
  const gazeW = Math.min(1, Math.abs(ud.gazeS) * 4);
  head.rotation.set(0.02 * shift, look * (1 - 0.6 * w) * (1 - gazeW) - chest.rotation.y - pelvis.rotation.y - ud.turnHead - ud.gazeS, -lean * 0.6 + 0.02 * w * Math.cos(2 * phase));
  chest.rotation.x += ud.turnLean;

  const legRoll = -pelvis.rotation.x + pelvis.position.z / (HIP_Y - ANKLE_Y);
  const legs = [[ud.legL, ud.kneeL, phase, 1], [ud.legR, ud.kneeR, phase + Math.PI, -1]];
  for (const [leg, knee, ph, side] of legs) {
    leg.rotation.set(legRoll, 0, thighBias + thighAmp * Math.sin(ph));
    const c = Math.max(0, Math.cos(ph + 0.5));
    const relax = 0.03 + 0.14 * Math.max(0, -side * Math.sin(t * 0.33));
    knee.rotation.z = -(kneeStance + kneeSwing * Math.pow(c, 1.5)) - relax * idle;
  }

  const leash = leashHolders.has(ud.lookSeed);
  const arms = [[ud.armL, ud.elbowL, phase, 1], [ud.armR, ud.elbowR, phase + Math.PI, -1]];
  for (const [arm, elbow, ph, side] of arms) {
    if (side === 1 && ud.umbrella && !ud.posed) {
      arm.rotation.set(-0.05, 0.7, 0.3 + 0.03 * Math.sin(ph) * w);
      elbow.rotation.z = 2.0;
      _uq.copy(pelvis.quaternion).multiply(chest.quaternion).multiply(arm.quaternion).multiply(elbow.quaternion);
      ud.umbrella.quaternion.copy(_uq.invert()).multiply(UMBRELLA_TILT);
      continue;
    }
    if (side === -1 && leash) {
      arm.rotation.set(0.12, 0, 0.3 + 0.05 * Math.sin(ph) * w);
      elbow.rotation.z = 0.45;
      continue;
    }
    const swing = -armAmp * Math.sin(ph);
    arm.rotation.set(-side * (0.03 + 0.1 * r * w), 0, swing + 0.08 * r * w + 0.02 * breath * idle);
    elbow.rotation.z = elbowBase + 0.35 * w * Math.max(0, Math.sin(-ph)) * (1 - r) + 0.06 * idle;
  }
  // wie lang stilstaat kijkt rond, op zijn horloge of wipt (gait.js fidgetAt, idleclips.js); als overlay op de rustpose
  if (w < 0.05 && crouch === 0 && !ud.umbrella && !leash && !ud.posed && !(ud.air > 0) && !dead) {
    ud.stillT = (ud.stillT || 0) + step;
    if (ud.stillT > 5 && fidgetAt(ud.stillT, ud.animOffset * 0.01, _fid)) fidgetOverlay(ud);
  } else ud.stillT = 0;
  if (crouch > 0) applyCrouch(ud, crouch, phase, w, s, cadence);
  blinkLids(ud, t, dead ? 1 : 0);
  const air = ud.airBlend = approach(ud.airBlend || 0, Math.max(0, Math.min(1, ud.air || 0)), step / 0.08);
  if (air > 0) applyAirPose(ud, air);
  updatePose(mesh);
}

// Knipperen (gait.js blinkAmount): ud.lids schaalt om de ooglijn, alleen schrijven als de stand verandert. closed = 1 houdt de ogen dicht (dood).
export function blinkLids(ud, t, closed = 0) {
  const lid = ud && ud.lids;
  if (!lid) return;
  const v = closed ? 1 : blinkAmount(t, ud.animOffset || 0);
  if (lid.scale.y !== v) lid.scale.y = v;
}

const _fid = { clip: '', tl: 0, dur: 1 };
const _fp = { pelvisDrop: 0, pelvisZ: 0, pelvisRX: 0, pelvisRY: 0, chest: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 }, armL: { x: 0, z: 0.08, e: 0.15 }, armR: { x: 0, z: 0.08, e: 0.15 }, legL: { z: 0, k: -0.06 }, legR: { z: 0, k: -0.06 } };
// The idle clip of _fid on top of the resting pose, as differences from the neutral stand (zero at the start and end of the clip).
function fidgetOverlay(ud) {
  idlePose(_fp, _fid.clip, _fid.tl, _fid.dur);
  ud.head.rotation.x += _fp.head.x; ud.head.rotation.y += _fp.head.y;
  ud.chest.rotation.y += _fp.chest.y;
  ud.armL.rotation.z += _fp.armL.z - 0.08; ud.elbowL.rotation.z += _fp.armL.e - 0.15;
  ud.pelvis.position.y -= _fp.pelvisDrop;
  ud.kneeL.rotation.z += _fp.legL.k + 0.06; ud.kneeR.rotation.z += _fp.legR.k + 0.06;
}

// Jump / vault tuck: knees pulled up, arms reaching forward and down onto
// whatever is being vaulted.
function applyAirPose(ud, a) {
  for (const [leg, knee, k] of [[ud.legL, ud.kneeL, 1], [ud.legR, ud.kneeR, 0.7]]) {
    leg.rotation.z += (0.95 * k - leg.rotation.z) * a;
    knee.rotation.z += (-1.5 * k - knee.rotation.z) * a;
  }
  for (const [arm, elbow] of [[ud.armL, ud.elbowL], [ud.armR, ud.elbowR]]) {
    if (arm === ud.armL && ud.umbrella && !ud.posed) continue;
    arm.rotation.z += (0.9 - arm.rotation.z) * a;
    elbow.rotation.z += (0.25 - elbow.rotation.z) * a;
  }
  ud.chest.rotation.z -= 0.25 * a;
}

const CROUCH_BLEND_TIME = 0.2;
const CROUCH_DROP = 0.36;

function approach(v, target, maxStep) {
  return v < target ? Math.min(target, v + maxStep) : Math.max(target, v - maxStep);
}

// Thigh/knee angles that put the ankle at (fx, fy) from the hip (see legIK).
function legAngles(fx, fy) {
  const d = Math.min(THIGH_LEN + SHIN_LEN - 1e-3, Math.max(0.05, Math.hypot(fx, fy)));
  const cosA = (THIGH_LEN * THIGH_LEN + d * d - SHIN_LEN * SHIN_LEN) / (2 * THIGH_LEN * d);
  const cosK = (THIGH_LEN * THIGH_LEN + SHIN_LEN * SHIN_LEN - d * d) / (2 * THIGH_LEN * SHIN_LEN);
  return [Math.atan2(fx, -fy) + Math.acos(Math.max(-1, Math.min(1, cosA))), -(Math.PI - Math.acos(Math.max(-1, Math.min(1, cosK))))];
}

// Crouched stance blended over the walk cycle: pelvis dropped and tipped
// forward, feet kept on the ground by leg IK, with short sneaking steps whose
// length matches the ground speed so the planted foot doesn't slide.
function applyCrouch(ud, c, phase, w, s, cadence) {
  const pelvis = ud.pelvis, chest = ud.chest, head = ud.head;
  const pitch = -0.2 * c;
  const hipY = pelvis.position.y + (HIP_Y - CROUCH_DROP + 0.012 * w * Math.cos(2 * phase) - pelvis.position.y) * c;
  pelvis.position.set(-0.05 * c, hipY, pelvis.position.z * (1 - c));
  pelvis.rotation.z = pitch;
  const lean = -0.3 * c;
  chest.rotation.z += lean;
  head.rotation.z -= (pitch + lean) * 0.8;

  const stride = cadence > 0 ? Math.min(0.3, s / (4 * cadence)) : 0;
  const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const legs = [[ud.legL, ud.kneeL, phase, 0.1], [ud.legR, ud.kneeR, phase + Math.PI, -0.04]];
  for (const [leg, knee, ph, stagger] of legs) {
    const fx = stride * Math.sin(ph) * w + stagger * (1 - w) + 0.05 * c;
    const fy = ANKLE_Y + 0.07 * w * Math.max(0, Math.cos(ph)) - hipY;
    const [tz, kz] = legAngles(fx * cp - fy * sp, fx * sp + fy * cp);
    const k0 = knee.rotation.z;
    leg.rotation.z += (tz - leg.rotation.z) * c;
    knee.rotation.z = k0 + (kz - k0) * c;
  }
  for (const [arm, elbow] of [[ud.armL, ud.elbowL], [ud.armR, ud.elbowR]]) {
    if (arm === ud.armL && ud.umbrella && !ud.posed) continue;
    const e0 = elbow.rotation.z;
    arm.rotation.z = arm.rotation.z * (1 - 0.5 * c) + 0.45 * c;
    elbow.rotation.z = e0 + (0.9 - e0) * c;
  }
}
