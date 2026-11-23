// Levendigheid voor mensen (epic 'Personages die leven', 23-11): procedurele IK, kijkrichting, lipsync en
// overgangen. Pure functies zonder three.js en zonder allocaties per frame: elke oplosser schrijft in een
// meegegeven `out`. models3d_people.js (spel) en actoranim.js (cutscenes, decorsets, menigte) gebruiken
// dezelfde functies, dus een voet op een trap of een kaak bij een stemclip ziet er overal hetzelfde uit.
//
// Conventies (zoals models3d_people.js): de mens kijkt langs +X, y omhoog. Een been- of armbot draait om z;
// rotation.z > 0 = naar voren. Een knie buigt negatief (naar achteren), een elleboog positief (naar voren).
// Een arm draait daarnaast om x (opzij): de keten ligt dan in het vlak dat die x-draaiing kantelt.
// Modellen en animaties (ADR 0050): de Universal Animation Library (CC0) is referentie voor timing en houdingen; de modulaire
// mensen van Quaternius (CC0) worden gefaseerd de nieuwe basis. Deze laag hangt niet aan een rig: de oplossers rekenen met
// lengtes en hoeken, dus ze liggen ook bovenop clips (zie docs/ANIMATIE-LICENTIES.md).
// Samen spelen: niets hiervan gaat over het netwerk. Alles volgt uit positie, hoek, snelheid en grondhoogte die
// elke speler al heeft; een gast rekent het lokaal uit (docs/COOP-GAST.md).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);

// ---- afstandstrap ------------------------------------------------------------------
// 0 = dichtbij: voeten-IK, handen, lipsync en blik. 1 = middel: alleen blik. 2 = ver: niets extra.
// Afstanden in meters tot de camera (of de speler); d2 = afstand in het kwadraat (geen wortel nodig).
export const LIFE_NEAR = 14;
export const LIFE_MID = 32;
export function lifeTier(d2) {
  if (!(d2 >= 0)) return 2;
  return d2 <= LIFE_NEAR * LIFE_NEAR ? 0 : d2 <= LIFE_MID * LIFE_MID ? 1 : 2;
}

// ---- twee-bot-IK -----------------------------------------------------------------------
// Doel (fx, fy) ten opzichte van de bovenste bol (heup of schouder), in het vlak van de keten.
// bend = -1: knie (buigt naar achteren); bend = 1: elleboog (buigt naar voren).
// out.a = draaiing van het bovenste bot, out.b = draaiing van het gewricht, out.reach = of het doel binnen bereik lag.
// Het gewricht blijft binnen [JOINT_MIN, JOINT_MAX] (geen overstrekking, niet dubbelvouwen).
export const JOINT_MIN = 0.02;
export const JOINT_MAX = 2.6;
export function twoBoneIK(fx, fy, l1, l2, bend, out) {
  fx = finite(fx); fy = finite(fy, -(l1 + l2));
  const dRaw = Math.hypot(fx, fy);
  const minD = Math.max(1e-3, Math.abs(l1 - l2) + 1e-3, Math.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(JOINT_MAX)));
  const maxD = Math.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(JOINT_MIN));
  const d = clamp(dRaw, minD, maxD);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const cosK = clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  const aim = Math.atan2(fx, -fy);
  const inner = Math.acos(cosA), joint = clamp(Math.PI - Math.acos(cosK), JOINT_MIN, JOINT_MAX);
  const s = bend < 0 ? -1 : 1;
  out.a = aim - s * inner;
  out.b = s * joint;
  out.reach = dRaw >= minD - 1e-6 && dRaw <= maxD + 1e-6;
  return out;
}

// Waar het uiteinde van een twee-bot-keten zit (voorwaartse kinematica), zelfde conventies als twoBoneIK.
export function twoBoneFK(a, b, l1, l2, out) {
  out.x = l1 * Math.sin(a) + l2 * Math.sin(a + b);
  out.y = -l1 * Math.cos(a) - l2 * Math.cos(a + b);
  return out;
}

// Arm naar een punt (tx, ty, tz) ten opzichte van de schouder, in het assenstelsel van de borst.
// out.x = draaiing opzij (rotation.x van het armbot), out.z = voorwaarts (rotation.z), out.e = elleboog.
// SPLAY_MAX houdt de arm binnen een natuurlijke kanteling; een punt verder opzij haalt de hand niet.
export const SPLAY_MAX = 0.7;
const _ik = { a: 0, b: 0, reach: true };
export function armIK(tx, ty, tz, l1, l2, out) {
  tx = finite(tx); ty = finite(ty, -(l1 + l2)); tz = finite(tz);
  const r = Math.hypot(ty, tz);
  const py = ty > 0 ? r : -r;
  // (px, py cos x, py sin x) = (tx, ty, tz)
  const want = r < 1e-6 ? 0 : Math.atan2(tz / py, ty / py);
  const x = clamp(want, -SPLAY_MAX, SPLAY_MAX);
  const inPlane = ty * Math.cos(x) + tz * Math.sin(x);   // de component in het gekantelde vlak
  twoBoneIK(tx, inPlane, l1, l2, 1, _ik);
  out.x = x; out.z = _ik.a; out.e = _ik.b; out.reach = _ik.reach && x === want;
  return out;
}

// Waar de hand zit voor een armstand (x, z, e) ten opzichte van de schouder (borstassen).
const _fk = { x: 0, y: 0 };
export function armFK(x, z, e, l1, l2, out) {
  twoBoneFK(z, e, l1, l2, _fk);
  out.x = _fk.x; out.y = _fk.y * Math.cos(x); out.z = _fk.y * Math.sin(x);
  return out;
}

// ---- voeten op de grond --------------------------------------------------------------------
// dL, dR: grond onder de linker- en rechtervoet min de grond onder het middelpunt (m, + = hoger), in de
// schaal van het model. De heup zakt zo ver als de laagste voet onder het middelpunt ligt (heupcompensatie,
// hooguit HIP_DROP_MAX), en elke voet komt LIFT hoger ten opzichte van de gezakte heup.
// out.drop >= 0, out.liftL, out.liftR. Een hoogteverschil groter dan STEP_MAX telt als een rand en wordt
// afgekapt (omlaag op HIP_DROP_MAX): dan staat iemand op de rand, niet met een gestrekt been in de diepte.
export const STEP_MAX = 0.4;
export const HIP_DROP_MAX = 0.3;
export function footPlant(dL, dR, out) {
  const l = clamp(finite(dL), -HIP_DROP_MAX, STEP_MAX), r = clamp(finite(dR), -HIP_DROP_MAX, STEP_MAX);
  const low = Math.min(l, r, 0);
  const drop = Math.min(HIP_DROP_MAX, -low);
  out.drop = drop;
  out.liftL = l + drop;
  out.liftR = r + drop;
  return out;
}

// ---- kijkrichting ------------------------------------------------------------------------
// yaw: hoek van het doel ten opzichte van de neus (rad, + = naar links in de wereldhoek, zoals actoranim's gazeRel),
// pitch: hoek omhoog (+). Verdeelt over romp en hoofd met harde grenzen: de romp draait CHEST_SHARE mee, het
// hoofd de rest tot HEAD_YAW_MAX. Een doel achter de mens (|yaw| > GAZE_BEHIND) geeft geen blik (w = 0).
// out.chestY, out.headY (rotation.y; + draait naar -heading, dus het teken is omgedraaid), out.headZ (rotation.z van het hoofd; + = omhoog,
// want een draaiing om +z brengt de neus (+X) naar boven), out.w (0..1).
export const HEAD_YAW_MAX = 0.95;
export const CHEST_SHARE = 0.3;
export const PITCH_UP = 0.45;
export const PITCH_DOWN = 0.55;
export const GAZE_BEHIND = 2.3;
export function gazeSplit(yaw, pitch, out) {
  yaw = finite(yaw); pitch = finite(pitch);
  if (Math.abs(yaw) > GAZE_BEHIND) { out.chestY = 0; out.headY = 0; out.headZ = 0; out.w = 0; return out; }
  const total = clamp(yaw, -HEAD_YAW_MAX / (1 - CHEST_SHARE), HEAD_YAW_MAX / (1 - CHEST_SHARE));
  const chest = total * CHEST_SHARE;
  out.chestY = -chest;
  out.headY = -clamp(total - chest, -HEAD_YAW_MAX, HEAD_YAW_MAX);
  out.headZ = clamp(pitch, -PITCH_DOWN, PITCH_UP);
  out.w = 1;
  return out;
}

// Hoek omhoog naar een punt op hoogte dy (m) boven de ogen op horizontale afstand dist.
export function pitchTo(dy, dist) {
  return Math.atan2(finite(dy), Math.max(0.3, finite(dist, 1)));
}

// ---- lipsync -------------------------------------------------------------------------------
// Van het niveau van de stem (RMS van het signaal, 0..1) naar een kaakopening 0..1: onder LIP_GATE dicht
// (ruis en adem), daarboven logaritmisch tot LIP_FULL. Een kaak gaat snel open en iets trager dicht.
export const LIP_GATE = 0.012;
export const LIP_FULL = 0.22;
export const LIP_ATTACK = 0.035;   // s
export const LIP_RELEASE = 0.09;   // s
export function jawFromLevel(level) {
  const v = finite(level);
  if (v <= LIP_GATE) return 0;
  return clamp(Math.log(v / LIP_GATE) / Math.log(LIP_FULL / LIP_GATE), 0, 1);
}
export function lipsyncStep(cur, target, dt) {
  const c = finite(cur), t = clamp(finite(target), 0, 1), step = Math.max(0, finite(dt));
  const tau = t > c ? LIP_ATTACK : LIP_RELEASE;
  return c + (t - c) * (1 - Math.exp(-step / tau));
}

// Terugval zonder stemclip (gedempt geluid, een gast zonder audio, tests): lettergrepen van ~0,18 s met een
// korte pauze na elk woord van 2 tot 4 lettergrepen. Deterministisch uit t (s sinds de regel begon) en seed (0..1).
export function babbleEnvelope(t, seed = 0) {
  const tt = finite(t);
  if (tt <= 0) return 0;
  const syl = 0.18;
  const n = Math.floor(tt / syl), u = (tt - n * syl) / syl;
  const h = Math.sin((n + 1) * 12.9898 + finite(seed) * 78.233) * 43758.5453;
  const r = h - Math.floor(h);
  if (n % (3 + Math.floor(r * 2)) === 2 && r < 0.45) return 0;        // woordgrens: even dicht
  return Math.sin(Math.PI * u) * (0.45 + 0.55 * r);
}

// Mimiek bij een regel: hoe breed de mond staat (scale.z van het mondbot) en hoe ver hij open mag.
// mood: 'lach' (breed, wijd open), 'schrik' (rond open), 'boos' (smal), anders neutraal. jaw = kaak 0..1.
export function mouthShape(jaw, mood, out) {
  const j = clamp(finite(jaw), 0, 1);
  if (mood === 'lach') { out.open = 0.35 + 0.65 * j; out.wide = 1.3; }
  else if (mood === 'schrik') { out.open = Math.max(0.8, j); out.wide = 0.75; }
  else if (mood === 'boos') { out.open = 0.8 * j; out.wide = 0.85; }
  else { out.open = j; out.wide = 1 - 0.12 * j; }
  return out;
}

// ---- overgangen ---------------------------------------------------------------------------
// Gewichten van stilstaan, lopen en rennen bij een snelheid (m/s), samen 1: dezelfde drempels als animatePersonWalk.
export function gaitWeights(speed, out) {
  const s = Math.max(0, finite(speed));
  const walk = clamp(s / 1.0, 0, 1);
  const k = clamp((s - 2.0) / 3.6, 0, 1), run = k * k * (3 - 2 * k);
  out.idle = 1 - walk;
  out.run = walk * run;
  out.walk = walk - out.run;
  return out;
}

// Lineaire overgang naar een doel in `time` seconden (een volle wissel duurt altijd even lang, geen exponentiële staart).
export function crossfade(cur, target, dt, time) {
  const step = Math.max(0, finite(dt)) / Math.max(1e-3, finite(time, 0.25));
  const c = finite(cur);
  return c < target ? Math.min(target, c + step) : Math.max(target, c - step);
}

// ---- stuur ---------------------------------------------------------------------------------
// Greeppunt van hand k (s = 1 of -1) op een stuurwiel met middelpunt (cx, cy, 0), straal rad en kanteling tilt
// (0 = rechtop, + = bovenkant naar de bestuurder), gedraaid om angle (rad). Schrijft out.x/y/z.
export function wheelGrip(cx, cy, rad, tilt, angle, s, out) {
  const c = Math.cos(finite(angle)), sn = Math.sin(finite(angle));
  // in het vlak van het wiel: zijas (0, 0, 1) en bovenas (-sin tilt, cos tilt, 0)
  const ux = -Math.sin(tilt), uy = Math.cos(tilt);
  out.x = cx + rad * s * sn * ux;
  out.y = cy + rad * s * sn * uy;
  out.z = rad * s * c;
  return out;
}
export const STEER_TURN = 1.1;   // rad stuurdraai bij volle uitslag
