// Passanten groeten de speler te voet (22-11, beleving): wie rustig langs loopt krijgt af en toe een zwaai of een "Moi!".
// Pure regels, Node-safe, zonder wereld: pedestrians.js roept ze aan en zet greetUntil (scene3d tekent de zwaaiende arm).
// Samen spelen: lokaal per speler (de groet is sfeer, geen voortgang); een gast ziet de zwaai via de bestaande V_GROET-vlag in coopextra.

const GREET_MIN_DIST = 2.2;      // m: dichterbij is een botsing, geen groet
const GREET_MAX_DIST = 7;        // m
export const GREET_MAX_PLAYER_SPEED = 4.5; // m/s: wie sprint of rijdt wordt niet gegroet
export const GREET_PED_COOLDOWN_S = 90; // dezelfde passant groet niet meteen weer
export const GREET_GLOBAL_GAP_S = 7;    // nooit een koor van groeten
const GREET_CHANCE = 0.16;       // per passant die in bereik komt (de scan loopt elke 0,5 s)
export const GREET_SCAN_S = 0.5;
export const GREET_LINES = ['Moi!', 'Goedemorgen!', 'Moi moi!', 'Mooie dag, hè?', 'Hoi!', 'Goeie zomer!'];
const GREET_ARM_S = 2.2;

export function makeGreetState() { return { nextScanAt: 0, lastGreetAt: -99 }; }

// Mag deze passant de speler nu groeten? Geen toeval hier: roll (0..1) komt van de aanroeper.
// p: { state, isCop, scene, ragdoll, pose, carry, speechUntil, _greetedAt }, player: { x, y, speed, inVehicle }
export function canGreet(g, now, p, player, { wanted = 0, armed = false, roll = 1, dist } = {}) {
  if (!player || player.inVehicle || wanted > 0 || armed) return false;
  if (Math.abs(player.speed || 0) > GREET_MAX_PLAYER_SPEED) return false;
  if (now - g.lastGreetAt < GREET_GLOBAL_GAP_S) return false;
  if (p.isCop || p.scene || p.ragdoll || p.pose || p.carry || p.state !== 'wander') return false;
  if (p.speechUntil > now) return false;
  if (now - (p._greetedAt ?? -99) < GREET_PED_COOLDOWN_S) return false;
  const d = dist ?? Math.hypot(p.x - player.x, p.y - player.y);
  if (!(d >= GREET_MIN_DIST && d <= GREET_MAX_DIST)) return false;
  return roll < GREET_CHANCE;
}

// De groet zelf: { until, line }. line is soms null (alleen zwaaien); r1 en r2 zijn toeval 0..1.
export function greetOutcome(now, r1 = 0, r2 = 0) {
  const line = r1 < 0.45 ? GREET_LINES[Math.floor(r2 * GREET_LINES.length) % GREET_LINES.length] : null;
  return { until: now + GREET_ARM_S, line };
}

export function markGreeted(g, p, now) { g.lastGreetAt = now; p._greetedAt = now; }

// --- rakelings voorbij gerend (22-11) -------------------------------------------------------------------
// Wie op een paar decimeter langs een passant sprint (zonder aan te raken: dat is checkBump) krijgt een geschrokken "Hé!" na.
const SPRINT_PASS_MIN_SPEED = 5.5;   // m/s: wandelen is 2-3, rennen ruim erboven
const SPRINT_PASS_MAX_GAP = 1.1;     // m tussen de randen van de twee lichamen
export const SPRINT_PASS_COOLDOWN_S = 14;
export const SPRINT_PASS_LINES = ['Hé, kijk uit!', 'Rustig aan, joh!', 'Waar ren jij naartoe?', 'Hé! Niet zo snel!'];

// gap = afstand tussen de middens min beide stralen; geen aanraking (gap > 0) en geen wanted (dan is rennen logisch).
export function runPastShock(now, p, player, { gap, wanted = 0, roll = 1 }) {
  if (!player || player.inVehicle || wanted > 0) return false;
  if (Math.abs(player.speed || 0) < SPRINT_PASS_MIN_SPEED) return false;
  if (!(gap > 0 && gap <= SPRINT_PASS_MAX_GAP)) return false;
  if (p.isCop || p.scene || p.ragdoll || p.pose || p.carry || p.state !== 'wander') return false;
  if (p.speechUntil > now) return false;
  if (now - (p._sprintPassAt ?? -99) < SPRINT_PASS_COOLDOWN_S) return false;
  return roll < 0.6;
}
