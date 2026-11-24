// Passanten en de claxon (22-11, beleving): wie voor je auto loopt als je toetert, kijkt om en moppert terug.
// Pure regels, Node-safe: pedestrians.js scant, zet de toestand 'angry' en laat de passant een regel zeggen.
// Samen spelen: lokaal, alleen voor de bestuurder van het eigen spel (passanten zijn per spel).

const HORN_MIN_DIST = 3;        // m voor de neus: dichterbij is een aanrijding, geen toeter
const HORN_MAX_DIST = 16;       // m
const HORN_CONE = 0.35;         // sinus van de hoek (ca. 20 graden) naast de rijrichting
export const HORN_SCAN_S = 0.35;
export const HORN_PED_COOLDOWN_S = 8;  // dezelfde passant moppert niet bij elke toeter
export const HORN_GLOBAL_GAP_S = 2.5;  // niet twee mopperaars tegelijk
const HORN_CHANCE = 0.55;
export const HORN_ANGRY_S = 1.6;
export const HORN_LINES = ['Ja, ja, ik loop al!', 'Rustig maar, joh!', 'Ik hoor je wel!', 'Niet zo toeteren!', 'Je hoeft niet te schreeuwen!', 'Ja, ja, momentje!'];

export function makeHornState() { return { nextScanAt: 0, lastAt: -99 }; }

// v: { x, y, angle, horn, isBike, isBoat, wrecked }, p: { x, y, state, isCop, scene, ragdoll, pose, speechUntil, _hornAt }
export function hornTarget(h, now, v, p, roll = 1) {
  if (!v || !v.horn || v.wrecked || v.isBoat) return false;
  if (now - h.lastAt < HORN_GLOBAL_GAP_S) return false;
  if (p.isCop || p.scene || p.ragdoll || p.pose || p.state !== 'wander') return false;
  if (p.speechUntil > now) return false;
  if (now - (p._hornAt ?? -99) < HORN_PED_COOLDOWN_S) return false;
  const dx = p.x - v.x, dy = p.y - v.y;
  const d = Math.hypot(dx, dy);
  if (!(d >= HORN_MIN_DIST && d <= HORN_MAX_DIST)) return false;
  const fwd = (dx * Math.cos(v.angle) + dy * Math.sin(v.angle)) / d;
  const side = Math.abs((dy * Math.cos(v.angle) - dx * Math.sin(v.angle)) / d);
  if (!(fwd > 0 && side <= HORN_CONE)) return false;
  return roll < HORN_CHANCE;
}

export const hornLine = (r = 0) => HORN_LINES[Math.floor(r * HORN_LINES.length) % HORN_LINES.length];
export function markHorned(h, p, now) { h.lastAt = now; p._hornAt = now; }
