// Het vliegmodel van een heteluchtballon (#1377, L3a). Puur: geen THREE, geen wereld, geen DOM.
//
// Een ballon stuur je niet: je kiest alleen je hoogte. Branden (de brander) verwarmt de lucht in de
// ballon en dan stijg je; laat je hem afkoelen of open je de klep (vent), dan daal je. Zijwaarts
// drijf je mee met de wind, en die waait op elke hoogte een beetje anders (draait en neemt toe met
// de hoogte). Wie een richting wil, zoekt de hoogte met de juiste wind.
//
// Wereldas: x oost, y zuid; de windhoek is de richting waarheen de wind waait (0 = naar het oosten),
// zoals world.weather.windAngle en skyprops.js hem gebruiken. Hoogte z in meters boven de grond.
// De wereldkant (het voertuig, de HUD, de camera) komt in vehicle_balloon.js en later in het spel.
// Samen spelen: dit is pure rekenkunde; de host draait hem voor de ballon waar de gasten
// als passagier in staan (zie vehicle_balloon.js). Een gast voert hier niets in.
// Tests: scripts/balloonflight_test.mjs.

export const BALLOON_MODEL = {
  ceiling: 600,        // m: hoger komt de ballon niet (de lucht is te ijl voor deze brander)
  maxClimb: 3.5,       // m/s stijgen, hoogstens
  maxSink: 5,          // m/s dalen, hoogstens
  response: 4,         // s: zo traag volgt de verticale snelheid de warmte
  climbGain: 7,        // m/s per eenheid warmteoverschot
  neutralBase: 0.45,   // warmte waarbij de ballon op de grond blijft zweven
  neutralPerM: 0.0004, // ijlere lucht vraagt meer warmte per meter hoogte
  burnRate: 0.12,      // warmte per seconde dat de brander brandt
  ventRate: 0.10,      // warmte per seconde die de klep laat ontsnappen
  coolRate: 0.012,     // warmte per seconde die vanzelf verdwijnt
  fuelPerBurnS: 0.006, // brandstof (1 = vol) per seconde branden: ruim 2,5 minuut aan een stuk
  windLag: 6,          // s: zo traag volgt de ballon de wind
  softLanding: 2.0,    // m/s: zachter dan dit is een nette landing
  groundFriction: 0.8, // per seconde: de mand schuift nog even na op de grond
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// De warmte waarbij de ballon op hoogte z precies blijft hangen.
export const neutralHeat = (z, m = BALLOON_MODEL) => clamp(m.neutralBase + Math.max(0, z) * m.neutralPerM, 0, 1);

// De wind op hoogte z: sterker en gedraaid naarmate je hoger zit. `wind` = { angle, speed } (speed in m/s
// op de grond). Op 0 m is het de grondwind, op 400 m ruim anderhalf keer zo sterk en ongeveer 0,24 rad gedraaid.
export function windAt(z, wind = {}) {
  const h = Math.max(0, Number.isFinite(z) ? z : 0);
  const base = Number.isFinite(wind.speed) ? Math.max(0, wind.speed) : 3.5;
  const angle = (Number.isFinite(wind.angle) ? wind.angle : 0) + h * 0.0006;
  const speed = base * (0.6 + Math.min(h, 600) / 400);
  return { angle, speed, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

// Een ballon op de grond (klaar om te vullen en op te stijgen). fuel: 0 tot 1.
export function newBalloonFlight(x, y, { fuel = 1, heat = 0.2, yaw = 0 } = {}) {
  return { x, y, z: 0, vx: 0, vy: 0, vz: 0, heat, fuel: clamp(fuel, 0, 1), yaw, burning: false, venting: false, onGround: true, airTime: 0, burned: 0, landings: 0, hard: 0 };
}

// Op de grond tanken (alleen als je stilstaat): de vlucht kan opnieuw.
export function refuel(s) {
  if (!s || !s.onGround) return false;
  s.fuel = 1;
  return true;
}

// De ballon draait langzaam in de wind (de mand zwaait mee): geeft de koers van de drift als hoek.
export const driftHeading = (s) => (Math.hypot(s.vx, s.vy) > 0.3 ? Math.atan2(s.vy, s.vx) : s.yaw);
export const groundSpeed = (s) => Math.hypot(s.vx, s.vy);

// Eén stap. input: { burn, vent } (booleans: de brander en de klep). wind: { angle, speed }.
// Geeft de gebeurtenissen: 'opgestegen', 'geland' (met `hard`), 'brandstof-op', 'plafond'.
export function stepBalloon(s, input = {}, dt = 0, wind = {}, m = BALLOON_MODEL) {
  const ev = [];
  if (!s || !(dt > 0)) return ev;
  const step = Math.min(dt, 0.25); // een grote sprong (tabblad op de achtergrond) rekent niet in één keer door
  const wantBurn = !!input.burn && s.fuel > 0;
  const wantVent = !!input.vent && !wantBurn;
  if (input.burn && s.fuel <= 0 && s.burning) ev.push({ type: 'brandstof-op' });
  s.burning = wantBurn;
  s.venting = wantVent;

  // de lucht in de ballon: de brander verwarmt, de klep en de tijd koelen
  if (wantBurn) {
    s.heat += m.burnRate * step;
    s.fuel = Math.max(0, s.fuel - m.fuelPerBurnS * step);
    s.burned += step;
  }
  if (wantVent) s.heat -= m.ventRate * step;
  s.heat = clamp(s.heat - m.coolRate * step, 0, 1);

  // verticaal: de warmte boven de evenwichtswaarde is stijgkracht, traag gevolgd
  const excess = s.heat - neutralHeat(s.z, m);
  let target = clamp(excess * m.climbGain, -m.maxSink, m.maxClimb);
  if (s.z >= m.ceiling && target > 0) { target = 0; if (!s.atCeiling) ev.push({ type: 'plafond' }); s.atCeiling = true; } else if (s.z < m.ceiling - 20) s.atCeiling = false;
  if (s.onGround && target <= 0) target = 0;
  s.vz += (target - s.vz) * Math.min(1, step / m.response);
  const wasGround = s.onGround;
  const vzBefore = s.vz;
  s.z += s.vz * step;
  if (s.z > m.ceiling) { s.z = m.ceiling; s.vz = Math.min(s.vz, 0); }

  if (s.z > 0.05 && wasGround) { s.onGround = false; s.airTime = 0; ev.push({ type: 'opgestegen' }); }
  if (s.z <= 0) {
    s.z = 0;
    if (!wasGround && !s.onGround) {
      const hardness = Math.max(0, -vzBefore);
      s.onGround = true; s.landings++;
      if (hardness > m.softLanding) s.hard++;
      ev.push({ type: 'geland', hard: hardness > m.softLanding, hardness });
    }
    s.vz = Math.max(0, s.vz);
    s.onGround = true;
  }
  if (!s.onGround) s.airTime += step;

  // zijwaarts: mee met de wind van deze hoogte, traag; op de grond schuift hij uit
  if (s.onGround) {
    const f = Math.exp(-m.groundFriction * step);
    s.vx *= f; s.vy *= f;
  } else {
    const w = windAt(s.z, wind);
    const k = Math.min(1, step / m.windLag);
    s.vx += (w.vx - s.vx) * k;
    s.vy += (w.vy - s.vy) * k;
  }
  s.x += s.vx * step;
  s.y += s.vy * step;
  return ev;
}

// Kort voor de HUD: hoogte, stijgsnelheid, brandstof en een woord voor de stand.
export function balloonReadout(s, m = BALLOON_MODEL) {
  const vz = Math.round(s.vz * 10) / 10;
  const stand = s.onGround ? 'aan de grond' : vz > 0.4 ? 'stijgend' : vz < -0.4 ? 'dalend' : 'zwevend';
  return { hoogte: Math.round(s.z), vz, snelheid: Math.round(groundSpeed(s) * 10) / 10, brandstof: Math.round(s.fuel * 100), stand, laag: s.fuel < 0.15, plafond: s.z >= m.ceiling - 1 };
}
