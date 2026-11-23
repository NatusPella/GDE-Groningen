// Een beschadigde motor sputtert (22-11, beleving): onder de 40% gezondheid hoest de motor af en toe terwijl je gas geeft,
// vaker naarmate het erger wordt. Pure regels, Node-safe; player.js telt de tijd en zet een audio-gebeurtenis 'engine_sputter'.
// Samen spelen: lokaal geluid van het voertuig dat jij bestuurt (de gast hoort het via het gewone motorgeluid niet apart).

export const SPUTTER_BELOW = 40;       // gezondheid waaronder het begint (dezelfde grens als de rook uit de motorkap)
const SPUTTER_MIN_SPEED = 3;    // m/s: stilstaand gas geven hoest niet
const GAP_FAR = 6.5, GAP_NEAR = 2.4;   // s tussen hoesten bij 39% en bij bijna kapot

export function sputterGap(health) {
  const k = Math.min(1, Math.max(0, 1 - health / SPUTTER_BELOW));
  return GAP_FAR + (GAP_NEAR - GAP_FAR) * k;
}

export function makeSputter() { return { wait: GAP_FAR }; }

// v: { health, wrecked, speed, throttle, isBoat, isBike, isHeli }. Geeft true als er nu een hoest moet klinken.
// r: toeval 0..1 om het ritme niet metronomisch te maken.
export function sputterStep(s, dt, v, r = 0.5) {
  const on = v && !v.wrecked && !v.isBoat && !v.isBike && !v.isHeli && v.health > 0 && v.health < SPUTTER_BELOW
    && v.throttle > 0 && Math.abs(v.speed || 0) >= SPUTTER_MIN_SPEED;
  if (!on) return false;
  s.wait -= dt;
  if (s.wait > 0) return false;
  s.wait = sputterGap(v.health) * (0.75 + r * 0.5);
  return true;
}
