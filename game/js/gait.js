// Loopcyclus-logica voor mensen (pure functies, geen three.js, #985): voetcontacten uit de loopfase, bocht-lean, blik naar iets
// interessants en een korte glimp-planning. models3d_people.js animatePersonWalk gebruikt dit voor elke mens; sfx/foley.js koppelt
// de stapgeluiden aan de voetcontacten, zodat beeld en geluid dezelfde voet gebruiken.
//
// Conventies (zoals models3d_people.js): thigh.rotation.z = thighBias + amp * sin(phase), links; rechts is phase + PI. De voet staat het
// verst naar voren (hielcontact) als sin = 1: links bij phase = PI/2, rechts bij phase = 3 PI/2.
// Samen spelen: niets hiervan staat in de pose-snapshot. Alles volgt uit positie, hoek en snelheid die elke speler al ontvangt; de
// gast rekent dezelfde functies met dezelfde ingangen, dus ziet dezelfde stap, lean en blik (zie docs/COOP-GAST.md).

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export const CONTACT_LEFT = Math.PI / 2;
export const CONTACT_RIGHT = Math.PI * 1.5;

// Welke voet raakte de grond tussen twee loopfases (de fase loopt vooruit, modulo TAU)? 0 = geen, 1 = links, 2 = rechts.
// Eén frame is hoogstens 0,1 s bij een cadans van 2,1 cycli/s: minder dan een halve cyclus, dus er valt hooguit één contact in.
export function footContact(p0, p1) {
  if (!Number.isFinite(p0) || !Number.isFinite(p1)) return 0;
  const d = (((p1 - p0) % TAU) + TAU) % TAU;
  if (d <= 0 || d >= Math.PI) return 0;
  const a = (((CONTACT_LEFT - p0) % TAU) + TAU) % TAU;
  if (a > 0 && a <= d) return 1;
  const b = (((CONTACT_RIGHT - p0) % TAU) + TAU) % TAU;
  if (b > 0 && b <= d) return 2;
  return 0;
}

// Het stapgeluid dat bij een contact hoort: dezelfde gewichten als sfx/steps.js tickFoot.
export function contactGain(speed, crouch) {
  return crouch ? 0.08 : speed > 4.5 ? 0.3 : 0.2;
}

// Bochtgedrag. yawRate: rad/s waarmee de heading verandert (positief = naar rechts, kloksgewijs van boven), speed in m/s.
// Retourneert { lean, head } in rad: lean = zijwaartse romphelling in de bocht (positief = naar rechts), head = hoe ver de blik de bocht
// vooruit draait (positief = naar rechts). Alleen bij lopen: wie stilstaat draait zijn hoofd niet mee.
export const MAX_YAW_RATE = 6;
export function turnLean(yawRate, speed) {
  const y = clamp(Number.isFinite(yawRate) ? yawRate : 0, -MAX_YAW_RATE, MAX_YAW_RATE);
  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const k = clamp((s - 0.4) / 1.6, 0, 1);              // zacht aan vanaf 0,4 m/s
  const fast = 0.6 + 0.4 * clamp((s - 2) / 4, 0, 1);    // hardlopers hellen iets verder
  return { lean: clamp(y * 0.055 * k * fast, -0.14, 0.14), head: clamp(y * 0.09 * k, -0.3, 0.3) };
}

// Gladstrijken naar een doel met een maximale snelheid (rad/s), zonder te overschieten.
export function approachTo(v, target, rate, dt) {
  const step = Math.max(0, rate) * Math.max(0, dt);
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

// Blik naar een punt. angle: heading van de mens (atan2(z, x)), (x, y) zijn positie, (tx, ty) het doel, maxDist in m.
// Retourneert de hoek van het doel ten opzichte van de neus (positief = rechts, in rad, geklemd op +-GAZE_MAX), of NaN als het doel te
// ver weg of te ver achter de mens ligt: niemand draait zijn hoofd 180 graden.
export const GAZE_MAX = 1.05;
export const GAZE_CONE = 2.1;
export function gazeToward(angle, x, y, tx, ty, maxDist) {
  const dx = tx - x, dy = ty - y;
  const d2 = dx * dx + dy * dy;
  if (!(d2 <= maxDist * maxDist) || d2 < 0.01) return NaN;
  const rel = wrapPi(Math.atan2(dy, dx) - angle);
  if (Math.abs(rel) > GAZE_CONE) return NaN;
  return clamp(rel, -GAZE_MAX, GAZE_MAX);
}

// Of iemand nu naar het doel kijkt: een glimp van ~1,5 s, ongeveer de helft van de tijd, per mens anders gefaseerd (seed 0 tot 1),
// zodat een groep niet allemaal tegelijk draait.
export function glanceOn(t, seed) {
  const x = Math.sin(t * 0.55 + seed * 17.3) + 0.6 * Math.sin(t * 0.21 + seed * 5.1);
  return x > -0.1;
}

// Wie lang stilstaat doet af en toe iets: rondkijken, op zijn horloge kijken of wippen (de clips van idleclips.js). Na 5 tot 10 s stilstaan
// (per mens anders, seed 0 tot 1) een clip van FIDGET_DUR s, daarna weer FIDGET_CYCLE - FIDGET_DUR s rust, en zo door. Schrijft in `out`
// ({ clip, tl, dur }) en geeft true als er nu een clip loopt.
export const FIDGET_CLIPS = ['rondkijken', 'horloge', 'wippen'];
export const FIDGET_DUR = 4;
export const FIDGET_CYCLE = 11;
export function fidgetAt(still, seed, out) {
  const c = still - (5 + (seed % 1) * 5);
  if (!(c >= 0)) return false;
  const n = Math.floor(c / FIDGET_CYCLE), tl = c - n * FIDGET_CYCLE;
  if (tl > FIDGET_DUR) return false;
  out.clip = FIDGET_CLIPS[(n + Math.floor((seed % 1) * 7)) % FIDGET_CLIPS.length]; out.tl = tl; out.dur = FIDGET_DUR;
  return true;
}

// Naar de wereld toe (scene3d.js): het hielcontact van de getekende loopcyclus op het object van de speler of voetganger, voor sfx/foley.js.
// t = wereldtijd; foley neemt het contact alleen over zolang dit elke frame wordt bijgewerkt (t niet ouder dan 0,3 s).
export function shareFeet(o, ud, t) {
  if (ud.footN !== undefined) { o.footN = ud.footN; o.footSide = ud.footSide; o.footT = t; }
}

// Een voetganger vlakbij glimpt naar de speler: alleen binnen GLANCE_RANGE, niet met iets in de hand en alleen als de speler voor hem staat.
// Zet ud.gazeT (hoek ten opzichte van de neus, of NaN voor geen blik); animatePersonWalk glijdt daarheen.
// Een claxon trekt elk hoofd in het gehoor (HONK_RANGE, ~1,6 s) naar het voertuig, ook van wie niet eerst naar je keek.
export const GLANCE_RANGE = 9;
export const HONK_RANGE = 28;
export const HONK_LOOK = 1.6;
export function glanceAt(ud, p, player, t) {
  const v = player.inVehicle;
  if (v && v.horn) ud.honkUntil = t + HONK_LOOK;
  const honk = ud.honkUntil > t;
  const g = gazeToward(p.angle, p.x, p.y, player.x, player.y, honk ? HONK_RANGE : GLANCE_RANGE); // the cheap range test first: most walkers are far
  ud.gazeT = g === g && !p.pose && !p.carry && !p.heldWeapon && (honk || glanceOn(t, ud.animOffset * 0.01)) ? g : NaN;
}

// Knipperen (zelfde functie voor lopers en cutsceneacteurs): 0 = ogen open, 1 = dicht. Een knip duurt 0,16 s; het ritme is per mens 3 tot 6 s
// (offset = de eigen tijdverschuiving van de mens) en de lange ritmes knipperen twee keer kort na elkaar. Pure functie, geen allocaties.
export const BLINK_TIME = 0.16;
export function blinkAmount(t, offset = 0) {
  if (!Number.isFinite(t) || !Number.isFinite(offset)) return 0;
  const period = 3 + 3 * ((Math.abs(offset) * 0.173) % 1);
  const u = (t + offset) % period;
  if (u < BLINK_TIME) return Math.sin(Math.PI * u / BLINK_TIME);
  if (period > 4.6 && u > 0.3 && u < 0.3 + BLINK_TIME) return Math.sin(Math.PI * (u - 0.3) / BLINK_TIME);
  return 0;
}
