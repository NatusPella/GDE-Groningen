// Kleine feel-laag (#216): snelheids-FOV, korte timescale-dip bij zware klappen,
// sprongbuffer met coyote time en de "Rakelings"-beloning. Pure regels, Node-safe,
// zonder THREE of wereld; scene3d.js, main.js, player.js en achievementtracker.js
// roepen ze aan. `fx` is effectsFor() uit a11ylogic.js: bij bewegingsreductie
// is alles wat beweegt of vertraagt uit (de sprongbuffer en de beloning blijven,
// want die veranderen niets aan beeld of tempo).

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// --- snelheids-FOV ---------------------------------------------------------------
export const FOV_MAX_BONUS = 8;       // graden
// de auto's halen 24-33 m/s (arcade): de toeslag moet daar al zichtbaar zijn, vliegtuigen zitten er ver boven
const FOV_FROM = 12, FOV_TO = 36; // m/s
const FOV_RATE = 2.2;           // per seconde naar het doel toe

export function fovTarget(speed, fx = { cameraSway: 1 }) {
  if (!fx.cameraSway) return 0;
  return FOV_MAX_BONUS * clamp((Math.abs(speed) - FOV_FROM) / (FOV_TO - FOV_FROM), 0, 1);
}

// Gedempte stap naar het doel; schiet er nooit voorbij.
export function stepFov(cur, speed, dt, fx) {
  const goal = fovTarget(speed, fx);
  const k = 1 - Math.exp(-FOV_RATE * Math.max(0, dt));
  return cur + (goal - cur) * k;
}

// --- timescale-dip -----------------------------------------------------------------
const DIP_STRENGTH = 0.6;      // lastImpact.strength moet hierboven zijn
export const DIP_SCALE = 0.3;
const DIP_MIN_MS = 60, DIP_MAX_MS = 90;
const DIP_GAP_S = 0.6;         // geen tweede dip meteen na de eerste

export function makeDip() { return { until: 0, last: -99 }; }

// Roep aan als er een klap is (of een melee-raak); now in seconden echte tijd.
// Geeft de duur in ms van de dip of 0.
export function triggerDip(d, now, { strength = 0, melee = false } = {}, fx = { cameraShake: 1 }) {
  if (!fx.cameraShake) return 0;
  if (!melee && !(strength > DIP_STRENGTH)) return 0;
  if (now - d.last < DIP_GAP_S) return 0;
  const k = melee ? 0.4 : clamp((strength - DIP_STRENGTH) / (1 - DIP_STRENGTH), 0, 1);
  const ms = Math.round(DIP_MIN_MS + (DIP_MAX_MS - DIP_MIN_MS) * k);
  d.until = now + ms / 1000;
  d.last = now;
  return ms;
}

export const dipScale = (d, now) => (now < d.until ? DIP_SCALE : 1);

// --- sprongbuffer en coyote time -----------------------------------------------------
export const JUMP_BUFFER_S = 0.1;
export const COYOTE_S = 0.08;

export function makeJumpAssist() { return { pressedAt: -99, groundedAt: -99 }; }

// Elke frame: pressed = er is net op springen gedrukt, grounded = de speler staat op de grond.
// Geeft true als er nu gesprongen moet worden.
export function jumpStep(a, now, pressed, grounded) {
  if (pressed) a.pressedAt = now;
  if (grounded) a.groundedAt = now;
  const buffered = now - a.pressedAt <= JUMP_BUFFER_S;
  const coyote = now - a.groundedAt <= COYOTE_S;
  if (buffered && coyote) {
    a.pressedAt = -99;   // verbruikt
    a.groundedAt = -99;  // geen dubbele sprong via coyote
    return true;
  }
  return false;
}

// --- Rakelings ---------------------------------------------------------------------------
const NEAR_MIN_SPEED = 14;        // m/s (~50 km/u)
const NEAR_MAX_GAP = 1.2;         // m tussen de carrosserieen
export const NEAR_COOLDOWN_S = 12;       // per voertuigpaar
const NEAR_BONUS_MIN = 5, NEAR_BONUS_MAX = 15;

export function makeNearMiss() { return { at: new Map() }; }

// Een geslaagde rakelings: je rijdt snel, het andere voertuig rijdt dezelfde kant op (geen
// tegenliggers: dat is te misbruiken) en de ruimte ertussen is klein. Geeft het bonusbedrag of 0.
// pair: stabiele sleutel van de twee voertuigen. sameDir: cos tussen de rijrichtingen.
export function nearMissBonus(n, now, { pair, speed, gap, sameDir }) {
  if (!(Math.abs(speed) >= NEAR_MIN_SPEED)) return 0;
  if (!(gap > 0 && gap <= NEAR_MAX_GAP)) return 0;
  if (!(sameDir > 0.5)) return 0;
  const last = n.at.get(pair);
  if (last != null && now - last < NEAR_COOLDOWN_S) return 0;
  n.at.set(pair, now);
  if (n.at.size > 64) for (const [k, t] of n.at) if (now - t > NEAR_COOLDOWN_S) n.at.delete(k);
  const k = clamp((Math.abs(speed) - NEAR_MIN_SPEED) / 30, 0, 1);
  return Math.round(NEAR_BONUS_MIN + (NEAR_BONUS_MAX - NEAR_BONUS_MIN) * k);
}
