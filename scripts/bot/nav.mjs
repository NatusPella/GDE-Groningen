// Spelbot (#312): de pure besturing voor de heli en voor een zeilboot, zonder Electron of DOM.
// bot.page.js krijgt deze functies mee via run.mjs (als window.__botNav), zodat de spellogica in
// game/js blijft en de bot alleen toetsen en timing hoeft te geven.
// De waarden komen uit heliflight.js (CRUISE/BOOST/CLIMB/SINK, Z_MAX) en uit zeilvaren.js +
// zeilrules.js (wind, polair, besteTrim). Ze staan hier omdat de bot geen game/js mag inladen.
// Tests: scripts/botlogic_test.mjs (deze functies) en scripts/bot/sim_nav.mjs (een simulatie).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
export const bearing = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// --- heli -------------------------------------------------------------------------
// Besturing van de eigen heli (heliflight.js): W/S vooruit/remmen, A/D gieren, Space/Ctrl
// stijgen/dalen, Shift de boost. De toetsen zijn aan/uit en lopen via helictl.js zacht op.
// p = { x, y, z, angle, speed, vz, onGround, rotor, groundZ }, o = { goal, mode: 'fly' | 'land',
// alt, stop } (alt = gewenste hoogte boven de grond, standaard 45; stop = afstand waarop hij
// stilhangt, standaard 6). Geeft de toetsen die deze tik ingedrukt moeten zijn.
export const HELI = { alt: 45, maxAlt: 118, cruise: 30, boost: 40, climb: 8, sink: 7, approach: 40, landR: 10 };
export function heliKeys(p, o = {}) {
  const keys = new Set();
  const goal = o.goal;
  const agl = Number.isFinite(o.agl) ? o.agl : (Number.isFinite(p.groundZ) ? p.z - p.groundZ : p.z);
  const land = o.mode === 'land';
  const d = goal ? dist(p, goal) : Infinity;
  // op de grond: eerst de rotor op toeren (het spel doet dat zelf), dan Spatie; bij een landing
  // alleen remmen en wachten tot hij stil staat
  if (p.onGround) {
    if (land && d < 12) { if (Math.abs(p.speed || 0) > 0.8) keys.add('s'); return keys; }
    if ((p.rotor ?? 1) < 0.85) return keys;
    if (agl < 4) keys.add(' ');
    return keys;
  }
  if (!goal) { keys.add('control'); return keys; }
  const err = wrap(bearing(p, goal) - p.angle);
  // gieren: eerst de neus naar het doel, dan pas vooruit (de heli vliegt in zijn eigen richting)
  if (Math.abs(err) > 0.06) keys.add(err > 0 ? 'd' : 'a');
  const aligned = Math.abs(err) < 0.7;
  const alt = Number.isFinite(o.alt) ? o.alt : land ? (d > 200 ? 35 : d > 60 ? Math.max(12, d * 0.15) : 8) : HELI.alt;
  const stop = Number.isFinite(o.stop) ? o.stop : land ? 3 : 6;
  // dalen op de laatste meters: eerst afremmen tot stilhangen, dan zakken
  const near = d < Math.max(stop, land ? HELI.landR : 6);
  if (land && near) {
    // boven de plek: niet meer stijgen, alleen zakken; de landing assist van het spel zet hem neer
    if (agl > 0.05) keys.add('control');
    return keys;
  }
  if (!near) {
    if (aligned) keys.add('w');
    if (aligned && d > 320 && agl < 100) keys.add('shift');
  } else if ((p.speed || 0) > 2.2) keys.add('s');
  // hoogte: met een marge, zodat hij niet steeds op en neer pompt; nooit boven het luchtruim
  if (agl < alt - 4) keys.add(' ');
  else if (agl > alt + 5) keys.add('control');
  // boven het doel: blijven zakken met Ctrl; de landing assist van het spel zet hem zacht neer
  if (agl > HELI.maxAlt) { keys.delete(' '); keys.add('control'); }
  return keys;
}

// --- zeilen ------------------------------------------------------------------------
// De wind waait uit `wind.dir` (radialen) met `wind.speed` (m/s), zoals windOp in zeilrules.js.
// b = { angle, speed, sailTop, zeilTrim, omgeslagen }, o = { goal, wind }.
// Geeft { steer, throttle, trim, tacking, note }: steer/throttle als carControls (-1..1, 1 is
// gas), trim -1 (Z, vieren), 0 of 1 (Q, aanhalen). In de dode hoek (< 35 graden van de wind)
// kruist hij: 50 graden naast de wind, en na 12 s van boeg wisselen als de andere boeg dichter
// bij het doel ligt (dezelfde regel als stepBot in zeilrules.js).
export const SAIL = { dead: 0.45, tackDeg: 50 * Math.PI / 180, tackHold: 12, trimBand: 0.06 };
export function sailControls(b, o = {}) {
  const out = { steer: 0, throttle: 0, trim: 0, tacking: false, note: '' };
  if (b.omgeslagen > 0) { out.note = 'omgeslagen'; return out; }
  const goal = o.goal, wind = o.wind;
  if (!goal) return out;
  const dt = Number.isFinite(o.dt) ? o.dt : 0.1;
  b.slagT = (b.slagT || 0) + dt;
  const want = bearing(b, goal);
  const d = dist(b, goal);
  let heading = want;
  out.throttle = d < 12 ? 0 : 1;
  if (wind && Number.isFinite(wind.dir) && Number.isFinite(wind.speed)) {
    if (zeilRendement(want, wind) < SAIL.dead) {
      out.tacking = true;
      const voor = (k) => wrap(wind.dir - k * SAIL.tackDeg);
      const beste = Math.abs(wrap(voor(1) - want)) <= Math.abs(wrap(voor(-1) - want)) ? 1 : -1;
      // houd eerst de boeg waarop hij vaart: over de wind draaien lukt alleen met vaart
      if (b.slag == null) b.slag = Math.sign(windHoek(b.angle, wind)) || 1;
      else if (b.slag !== beste && (b.slagT || 0) > SAIL.tackHold && b.speed > 2) b.slag = beste;
      heading = voor(b.slag);
      if (b.slagT == null) b.slagT = 0;
    } else { b.slag = null; b.slagT = 0; }
    // trim naar de beste stand voor de koers die hij nu vaart (niet die van het doel)
    const hoek = windHoek(b.angle, wind);
    const wil = besteTrim(hoek);
    const heb = Number.isFinite(b.zeilTrim) ? b.zeilTrim : 0.6;
    if (heb < wil - SAIL.trimBand) out.trim = 1;
    else if (heb > wil + SAIL.trimBand) out.trim = -1;
    // te veel helling bij veel wind en een strakke schoot: even vieren, anders slaat hij om
    if ((b.helling || 0) > 0.42 && wind.speed > 7) out.trim = -1;
    out.note = out.tacking ? 'kruisen' : 'zeilen';
  } else out.note = 'varen';
  const e = wrap(heading - b.angle);
  out.steer = clamp(e * 2, -1, 1);
  // scherp aan de wind of net na een slag: iets langzamer, dan verliest hij geen vaart in de bocht
  if (Math.abs(e) > 0.7) out.throttle = Math.min(out.throttle, 0.5);
  return out;
}

// De regels van zeilrules.js, hier nodig zonder import (alleen voor de bot).
export const windHoek = (heading, wind) => wrap(wind.dir - heading);
export function polair(hoek) {
  const a = Math.abs(hoek) * 180 / Math.PI;
  if (a < 35) return 0;
  if (a < 60) return 0.45 * ((a - 35) / 25);
  if (a < 90) return 0.45 + 0.55 * ((a - 60) / 30);
  if (a < 115) return 1;
  if (a < 150) return 1 - 0.25 * ((a - 115) / 35);
  return 0.75 - 0.15 * ((a - 150) / 30);
}
export const besteTrim = (hoek) => clamp(1 - ((Math.abs(hoek) * 180 / Math.PI - 30) / 150) * 0.85, 0.15, 1);
export const zeilRendement = (heading, wind) => polair(windHoek(heading, wind));

// --- roeien ------------------------------------------------------------------------
// Een roeiboot (M17) vaart op ritme (zeilvaren.js roeiStap): elke tik op W tussen 0,9 en 1,6 s
// na de vorige is een slag. rowDue zegt wanneer de volgende tik mag; 1,25 s is het midden.
export const ROW_GAP = 1.25;
export const rowDue = (now, last, gap = ROW_GAP) => !Number.isFinite(last) || now - last >= gap;
