// Hoe een helikopter, een vliegtuig en een boot hun opnames sturen (sfx/aircraft.js): zuivere getallen, geen Web Audio,
// zodat scripts/aircraft_sfx_test.mjs de koppeling van gas, toeren en snelheid aan niveau en toonhoogte kan controleren.
// De opnames zijn naadloze lussen uit game/audio/sfx (manifest.json); toonhoogte is de afspeelsnelheid van de lus.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const SOUND_C = 343;

// Doppler: de afspeelfactor voor een bron met snelheid (vx, vy, vz) gezien vanaf de luisteraar; wereldframe x, hoogte, y.
export function dopplerFactor(src, vel, listener) {
  const dx = src.x - listener.x, dy = src.h - listener.h, dz = src.y - listener.y;
  const d = Math.hypot(dx, dy, dz) || 1;
  const radial = (vel.x * dx + vel.h * dy + vel.y * dz) / d;
  return { d, f: SOUND_C / (SOUND_C + clamp(radial, -120, 120)) };
}

// Afstandsrand: 1 binnen het bereik min de rand, 0 aan de grens.
export const edge = (d, range, rand = 300) => clamp((range - d) / rand, 0, 1);

// -- helikopter -------------------------------------------------------------------------------------------------------
// rotor 0..1 (rotortoerental, loopt op en uit via heliflight.js), speed m/s, vz stijgen (+) of dalen (-), up gas/collectief -1..1,
// bank rolhoek in rad. Twee lagen: stationair (zware dreun) en vlucht (wop-wop). De afspeelsnelheid volgt het toerental, dus het
// oplopen en uitlopen na de landing klinkt als een rotor die versnelt en vertraagt.
export function rotorParams({ rotor = 0, speed = 0, vz = 0, up = 0, bank = 0, inside = false }) {
  const r = clamp(rotor, 0, 1);
  const fwd = smooth(2, 22, Math.abs(speed));
  // schuin vliegen en dalen in vooruitvaart geeft de bladen een scherper slaan (blade slap)
  const slap = clamp(-vz / 4, 0, 1) * smooth(5, 16, Math.abs(speed)) + 0.35 * clamp(Math.abs(bank) / 0.5, 0, 1) * fwd;
  const load = clamp(Math.max(up, 0) * 0.8 + Math.max(vz, 0) / 8, 0, 1);
  const rate = lerp(0.35, 1.0, r) * (1 + 0.04 * load);
  return {
    rate,
    flightRate: rate * (1 - 0.06 * clamp(slap, 0, 1)),
    statGain: (1 - 0.65 * fwd) * (0.8 + 0.2 * load),
    flightGain: clamp(0.25 + 0.55 * fwd + 0.25 * load + 0.4 * slap, 0, 1.2),
    level: Math.pow(r, 1.5),
    // in de cabine dof en zonder afstand; buiten opent het filter met de afstand (door aircraft.js)
    cutoff: inside ? 1500 : 4500,
  };
}

// -- vliegtuig --------------------------------------------------------------------------------------------------------
// Toeren (0..1) uit gas en snelheid; twee lagen (stationair en hoge toeren) kruisen in het midden.
export function planeRpmTarget({ running, throttle = 0, speed = 0, vmax = 70 }) {
  if (!running) return 0;
  return clamp(0.22 + 0.62 * clamp(throttle, 0, 1) + 0.16 * clamp(speed / vmax, 0, 1), 0, 1);
}

export function planeParams({ rpm = 0, speed = 0, vmax = 70, onGround = true, surface = 'gras', stalled = false, airborne = false, stallV = 22, inside = false }) {
  const r = clamp(rpm, 0, 1);
  const sp = clamp(speed / vmax, 0, 1);
  const asfalt = surface === 'asfalt' || surface === 'klinkers';
  const rolling = onGround ? smooth(0.6, 14, speed) : 0;
  // overtrek: een zoemer kort voor en tijdens de overtrek, alleen in de lucht
  const warn = airborne ? Math.max(stalled ? 1 : 0, smooth(stallV * 1.18, stallV * 1.02, speed)) : 0;
  return {
    idleGain: (1 - smooth(0.3, 0.75, r)) * smooth(0.02, 0.2, r),
    idleRate: lerp(0.78, 1.45, r),
    highGain: smooth(0.3, 0.85, r) * smooth(0.02, 0.2, r),
    highRate: lerp(0.62, 1.22, r),
    windGain: Math.pow(sp, 1.4) * (onGround ? 0.5 : 0.8) * (inside ? 0.6 : 1),
    windRate: lerp(0.75, 1.5, sp),
    windCutoff: lerp(500, 4500, sp),
    rollAsfaltGain: rolling * (asfalt ? 1 : 0) * lerp(0.3, 1, sp),
    rollGrasGain: rolling * (asfalt ? 0 : 1) * lerp(0.35, 1, sp),
    rollRate: lerp(0.6, 1.5, sp),
    stallGain: warn,
    level: smooth(0.01, 0.12, r),
    cutoff: inside ? 2400 : 7000,
  };
}

// Een gewijzigde stand van het landingsgestel geeft een klank, alleen in de lucht (op de grond staat het altijd uit).
export function gearEvent(prev, now, airborne) {
  return prev !== undefined && prev !== now && !!airborne;
}

// De motorstart: aanslaan als de bestuurder instapt of de motor aangaat; geen start als het toestel al snel beweegt (laden, aansluiten).
export const START_S = 5.6;          // lengte van vliegtuig_start
export const START_IDLE_AT = 3.4;    // vanaf dit moment van de opname valt de motor in en komt de stationair-laag omhoog
export function startNeeded(wasRunning, running, speed) {
  return !wasRunning && running && speed < 4;
}

// Het toerental loopt op met ~0,5 s en uit met ~2,2 s (de schroef draait na); dt in s.
export function rpmStep(rpm, target, dt) {
  const tau = target > rpm ? 0.5 : 2.2;
  return rpm + (target - rpm) * (1 - Math.exp(-dt / tau));
}

// -- boot ---------------------------------------------------------------------------------------------------------------
// Buitenboordmotor: stationair kruist met vol gas op de snelheid; de afspeelsnelheid volgt het toerental.
export function boatParams({ speed = 0, vmax = 14, throttle = 0, inside = false }) {
  const sp = clamp(Math.abs(speed) / vmax, 0, 1);
  const thr = clamp(Math.abs(throttle), 0, 1);
  const rpm = clamp(0.25 + 0.5 * thr + 0.25 * sp, 0, 1);
  return {
    idleGain: (1 - smooth(0.25, 0.7, rpm)),
    idleRate: lerp(0.85, 1.35, rpm),
    fullGain: smooth(0.3, 0.9, rpm),
    fullRate: lerp(0.7, 1.15, rpm),
    cutoff: inside ? 2200 : 7000,
  };
}
