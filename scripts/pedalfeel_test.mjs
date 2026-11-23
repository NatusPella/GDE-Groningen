// Analoog gas, analoge rem en de stuurcurve van de stick (game/js/pedalfeel.js, rijgevoel 22-11),
// eerst als pure regels en daarna met de echte rijfysica (Vehicle.applyControls) op een vlak:
//   node scripts/pedalfeel_test.mjs [--verbose]
import './node3d.mjs';
import { TRIGGER_DEAD, TRIGGER_FULL, triggerPedal, pedalAxis, stickSteerCurve, pedalSpeedShare, pedalThrottle, STICK_STEER_RATE, isAnalogSteer, steerFollowRate } from '../game/js/pedalfeel.js';

const { Vehicle, HERO_CAR_MODEL, speedCap } = await import('../game/js/vehicle.js');
const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- triggers ---
ok(triggerPedal(0) === 0 && triggerPedal(TRIGGER_DEAD) === 0 && triggerPedal(0.1) === 0, 'een rustende vinger geeft geen gas');
ok(triggerPedal(TRIGGER_DEAD + 0.01) > 0 && triggerPedal(TRIGGER_DEAD + 0.01) < 0.02, 'net voorbij de dode zone begint het pedaal bij nul, zonder sprong', triggerPedal(TRIGGER_DEAD + 0.01));
ok(triggerPedal(TRIGGER_FULL) === 1 && triggerPedal(1) === 1, 'een versleten trigger (0,95) geeft nog vol gas');
ok(triggerPedal(NaN) === 0 && triggerPedal(undefined) === 0 && triggerPedal(-1) === 0, 'onzin is geen gas');
{
  let mono = true, prev = 0;
  for (let i = 0; i <= 100; i++) { const p = triggerPedal(i / 100); if (p < prev) mono = false; prev = p; }
  ok(mono, 'het pedaal loopt alleen op met de trigger');
}
ok(pedalAxis(1, 0) === -1 && pedalAxis(0, 1) === 1 && pedalAxis(0, 0) === 0, 'gas is omhoog (-1), rem is omlaag (+1)');
ok(near(pedalAxis(1, 1), 0), 'beide triggers vol heffen elkaar op');
ok(pedalAxis(0.5, 0) < 0 && pedalAxis(0.5, 0) > -0.6, 'een halve trigger is een half pedaal', pedalAxis(0.5, 0));

// --- stuurcurve ---
ok(stickSteerCurve(0) === 0 && near(stickSteerCurve(1), 1) && near(stickSteerCurve(-1), -1), 'midden is nul, vol blijft vol');
ok(near(stickSteerCurve(-0.4), -stickSteerCurve(0.4)), 'links en rechts zijn gelijk');
ok(stickSteerCurve(0.3) < 0.3 * 0.65 && stickSteerCurve(0.3) > 0.3 * 0.5, 'een kleine uitslag stuurt fijner (maar niet dood)', stickSteerCurve(0.3));
ok(stickSteerCurve(0.9) > 0.8, 'een grote uitslag stuurt bijna vol', stickSteerCurve(0.9));
ok(stickSteerCurve(2) === 1 && stickSteerCurve(NaN) === 0, 'buiten bereik en onzin blijven veilig');
{
  let mono = true, prev = -2;
  for (let i = -100; i <= 100; i++) { const s = stickSteerCurve(i / 100); if (s <= prev) mono = false; prev = s; }
  ok(mono, 'de stuurcurve loopt strikt op');
}

// --- gas doseren ---
ok(pedalThrottle(-1, 0, 40) === 1 && pedalThrottle(1, 0, 40) === -1 && pedalThrottle(0, 10, 40) === 0, 'een toets geeft precies 1, -1 of 0, zoals voorheen');
ok(pedalThrottle(-1, 39.9, 40) === 1 && pedalThrottle(-1, 99, 40) === 1, 'vol gas wordt nooit afgeknepen');
ok(pedalSpeedShare(1) === 1 && pedalSpeedShare(0) === 0 && near(pedalSpeedShare(0.25), 0.5), 'een kwart pedaal hoort bij de halve topsnelheid');
ok(near(pedalThrottle(-0.5, 0, 40), 0.5), 'uit stilstand geeft een half pedaal de halve motor');
ok(pedalThrottle(-0.5, 40 * Math.sqrt(0.5) + 0.1, 40) === 0, 'boven de kruissnelheid van het pedaal: geen gas meer (uitrollen)');
ok(pedalThrottle(-0.5, 27, 40) > 0 && pedalThrottle(-0.5, 27, 40) < 0.5, 'vlak onder de kruissnelheid loopt het gas zacht af', pedalThrottle(-0.5, 27, 40));
ok(near(pedalThrottle(0.4, 20, 40), -0.4), 'remmen tegen de rijrichting in is evenredig met de trigger');
ok(near(pedalThrottle(0.4, 0, 40), -0.4) && pedalThrottle(0.4, -40 * 0.25 * Math.sqrt(0.4) - 0.1, 40) === 0, 'achteruit geldt dezelfde dosering op de achteruit-top');
ok(pedalThrottle(NaN, 5, 40) === 0 && near(pedalThrottle(-0.5, NaN, 40), 0.5) && near(pedalThrottle(-0.5, 5, 0), 0.5), 'onzin in snelheid of top laat het pedaal heel');

// --- met de echte rijfysica ---
const DT = 1 / 120;
const hatch = HERO_CAR_MODEL;
function make() { const v = new Vehicle(0, 0, 0, { ...hatch }); v.driver = 'player'; return v; }
// rijdt `secs` met de pedaal-as `ay` zoals player.js dat doet; geeft de eindsnelheid
function drive(v, ay, secs) {
  let flips = 0, prev = null;
  for (let i = 0; i < secs / DT; i++) {
    const t = pedalThrottle(ay, v.speed, speedCap(v));
    if (prev !== null && (t === 0) !== (prev === 0)) flips++;
    prev = t;
    v.applyControls(DT, t, 0, false);
  }
  return flips;
}
{
  const full = make(); drive(full, -1, 40);
  const half = make(); const flips = drive(half, -0.5, 40);
  const quarter = make(); drive(quarter, -0.25, 40);
  const top = speedCap(full);
  if (VERBOSE) console.log('top', top.toFixed(1), 'vol', full.speed.toFixed(1), 'half', half.speed.toFixed(1), 'kwart', quarter.speed.toFixed(1), 'wissels', flips);
  ok(full.speed > top * 0.97, 'vol gas haalt de topsnelheid', [full.speed, top]);
  ok(half.speed > top * 0.55 && half.speed < top * 0.74, 'een half pedaal houdt een kruissnelheid rond 0,6 tot 0,7 van de top', [half.speed, top]);
  ok(quarter.speed > top * 0.3 && quarter.speed < top * 0.52, 'een kwart pedaal houdt een lagere kruissnelheid', [quarter.speed, top]);
  ok(quarter.speed < half.speed && half.speed < full.speed, 'meer pedaal is sneller');
  ok(flips <= 2, 'het gas klappert niet aan en uit op de kruissnelheid', flips);
  // de kruissnelheid is stabiel: de laatste seconde verandert er bijna niets
  const before = half.speed; drive(half, -0.5, 1);
  ok(Math.abs(half.speed - before) < 0.2, 'de kruissnelheid staat stil', [before, half.speed]);
}
{
  // analoge rem: een lichte trigger remt langer dan een volle
  const stop = (ay) => { const v = make(); drive(v, -1, 12); const v0 = v.speed; let t = 0; while (v.speed > 0.5 && t < 60) { v.applyControls(DT, pedalThrottle(ay, v.speed, speedCap(v)), 0, false); t += DT; } return { t, v0 }; };
  const hard = stop(1), soft = stop(0.3);
  if (VERBOSE) console.log('remtijd vol', hard.t.toFixed(2), 'licht', soft.t.toFixed(2), 'vanaf', hard.v0.toFixed(1));
  ok(soft.t > hard.t * 2 && soft.t < 59, 'een lichte rem remt merkbaar zachter dan een volle', [hard.t, soft.t]);
}

// --- #1288: het stuurwiel volgt een stick directer dan een toets ---
ok(!isAnalogSteer(0) && !isAnalogSteer(1) && !isAnalogSteer(-1) && !isAnalogSteer(NaN), 'een toets (-1, 0, 1) is digitaal');
ok(isAnalogSteer(0.4) && isAnalogSteer(1, 0.9) && isAnalogSteer(-1, -1), 'een stick in gebruik of een tussenwaarde (gast aan het stuur) is analoog');
ok(steerFollowRate(false, 5) === 5 && steerFollowRate(true, 5) === STICK_STEER_RATE && steerFollowRate(true, 20) === 20, 'een stick volgt nooit trager dan een toets');
{
  // 1/15 s na een snelle duim naar 60%: de stick staat bijna op zijn plek, de toets-snelheid zou halverwege zijn
  const stuur = (analog) => { const v = make(); v.speed = 15; v.steerAnalog = analog; for (let i = 0; i < 4; i++) v.applyControls(1 / 60, 0, 0.6, false); return v.steer; };
  const a = stuur(true), d = stuur(false);
  if (VERBOSE) console.log('stuur na 1/15 s: stick', a.toFixed(3), 'toets-tempo', d.toFixed(3));
  ok(a > d * 1.6 && a <= 0.6 + 1e-9, 'met de echte rijfysica volgt het wiel de stick sneller', [a, d]);
}

console.log(fails ? `${fails} FAIL` : 'pedalfeel_test ok');
process.exit(fails ? 1 : 0);
