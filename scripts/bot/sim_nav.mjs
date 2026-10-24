// Spelbot (#312): een kleine simulatie van de heli- en zeilbesturing uit nav.mjs, zonder
// Electron. Het model volgt de maten van heliflight.js (30 m/s cruise, 8 m/s stijgen, 7 m/s
// dalen) en van zeilvaren.js/zeilrules.js (polair, trim, 12 s per slag). Het bewijst dat de
// toetsen van de bot een doel halen en binnen de tijd landen, niet dat het spel precies zo
// rekent; de echte proef is een run met scripts/bot/run.mjs.
//   node scripts/bot/sim_nav.mjs
import { heliKeys, sailControls, polair, besteTrim, windHoek, wrap } from './nav.mjs';

const DT = 0.1;
let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name, extra); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// --- heli ---------------------------------------------------------------------------
function heliStep(p, keys) {
  const k = (c) => (keys.has(c) ? 1 : 0);
  const up = k(' ') - k('control'), yaw = k('d') - k('a');
  const fwd = k('w') - k('s');
  p.rotor = Math.min(1, (p.rotor || 0) + DT / 2.4);
  const ready = p.rotor >= 0.85;
  p.angle = wrap(p.angle + (p.onGround && !ready ? 0 : yaw * 1.45) * DT);
  if (p.onGround && ready && up > 0) p.onGround = false;
  if (p.onGround) { p.speed = 0; p.vz = 0; }
  else {
    // het spel trekt de horizontale snelheid naar de gevraagde snelheid in de eigen richting
    const wantSpeed = !ready ? 0 : fwd > 0 ? fwd * (keys.has('shift') ? 40 : 30) : fwd < 0 ? -9 : 0;
    p.speed += clamp(wantSpeed - p.speed, -7 * DT, 7 * DT);
    const vzWant = !ready ? 0 : up > 0 ? 8 : up < 0 ? -7 : 0;
    // de landing assist van heliflight.js: vlak boven de grond zakt hij maar langzaam
    const zacht = vzWant < 0 ? Math.max(vzWant, -(1.6 + Math.max(0, p.z) * 0.55)) : vzWant;
    p.vz += clamp(zacht - p.vz, -12 * DT, 12 * DT);
    p.x += Math.cos(p.angle) * p.speed * DT;
    p.y += Math.sin(p.angle) * p.speed * DT;
    p.z += p.vz * DT;
  }
  p.groundZ = 0;
  const agl = p.z - p.groundZ;
  if (!p.onGround && agl <= 0.02) {
    // de landing assist van het spel: zacht dalen mag, hard dalen is een crash
    if (p.vz < -4.5) p.crash = true;
    p.z = 0; p.vz = 0; p.onGround = true;
  }
  if (!p.onGround && ready && up > 0) p.onGround = false;
  return p;
}

function simHeli(goal, mode, budget = 180) {
  const p = { x: 0, y: 0, z: 0, angle: 0, speed: 0, vz: 0, onGround: true, rotor: 0, groundZ: 0 };
  let t = 0, maxAgl = 0;
  while (t < budget) {
    const keys = heliKeys(p, { goal, mode, agl: p.z - p.groundZ });
    heliStep(p, keys);
    t += DT;
    maxAgl = Math.max(maxAgl, p.z - p.groundZ);
    if (p.crash) return { t, ok: false, why: 'crash', p, maxAgl };
    if (mode === 'land' && p.onGround && Math.hypot(goal.x - p.x, goal.y - p.y) < 12) return { t, ok: true, p, maxAgl };
    if (mode !== 'land' && !p.onGround && Math.hypot(goal.x - p.x, goal.y - p.y) < 8 && Math.abs(p.speed) < 4) return { t, ok: true, p, maxAgl };
  }
  return { t, ok: false, why: 'tijd op', p, maxAgl };
}

{
  const goal = { x: 1200, y: 800 };
  const fly = simHeli(goal, 'fly', 120);
  ok(fly.ok, 'heli vliegt naar het doel', `${fly.t.toFixed(1)} s, (${Math.round(fly.p.x)}, ${Math.round(fly.p.y)}), hoogte ${Math.round(fly.maxAgl)}`);
  ok(fly.maxAgl > 20 && fly.maxAgl < 120, 'heli blijft onder het luchtruim');
  const land = simHeli(goal, 'land', 240);
  ok(land.ok, 'heli landt op het doel', `${land.t.toFixed(1)} s, (${Math.round(land.p.x)}, ${Math.round(land.p.y)}), ${land.p.onGround ? 'op de grond' : 'nog in de lucht'}`);
  ok(!land.p.crash, 'heli landt zonder crash');
  // een te krap budget eindigt de poging: de run zegt 'tijd op' in plaats van eeuwig door te vliegen
  const kort = simHeli(goal, 'fly', 20);
  ok(!kort.ok && kort.why === 'tijd op', 'heli: time-out per poging');
}

// --- zeilen -------------------------------------------------------------------------
function zeilStep(b, wind, c) {
  if (b.omgeslagen > 0) { b.omgeslagen = Math.max(0, b.omgeslagen - DT); b.speed *= 1 - 2 * DT; return b; }
  b.zeilTrim = clamp((b.zeilTrim ?? 0.6) + c.trim * 0.5 * DT, 0, 1);
  const hoek = windHoek(b.angle, wind);
  const top = 6.5 * (wind.speed / 9) * polair(hoek) * Math.max(0.35, 1 - Math.abs(b.zeilTrim - besteTrim(hoek)) * 1.1);
  b.sailTop = top;
  b.speed += clamp(top - b.speed, -0.54 * DT, 0.7 * DT);
  b.angle = wrap(b.angle + c.steer * 0.9 * clamp(b.speed / 1.5, 0.5, 1) * DT);
  if (polair(hoek) === 0) b.angle = wrap(b.angle - Math.sign(hoek || 1) * 0.35 * DT);
  b.x += Math.cos(b.angle) * b.speed * DT;
  b.y += Math.sin(b.angle) * b.speed * DT;
  return b;
}

function simSail(goal, wind, budget = 600) {
  const b = { x: 0, y: 0, angle: 0, speed: 0, zeilTrim: 0.6, omgeslagen: 0, sailTop: 0 };
  let t = 0, best = Infinity, stil = 0;
  while (t < budget) {
    const c = sailControls(b, { goal, wind, dt: DT });
    zeilStep(b, wind, c);
    t += DT;
    const d = Math.hypot(goal.x - b.x, goal.y - b.y);
    best = Math.min(best, d);
    if (d < 15) return { t, ok: true, b, best };
    stil = c.throttle > 0 && b.speed < 0.15 ? stil + DT : 0;
    if (stil > 30) return { t, ok: false, why: 'stilgevallen', b, best };
  }
  return { t, ok: false, why: 'tijd op', b, best };
}

{
  // wind uit +x (dir 0): naar +x is pal tegen de wind in, naar -x is voor de wind
  const wind = { dir: 0, speed: 6 };
  const up = simSail({ x: 450, y: 0 }, wind, 900);
  ok(up.ok, 'zeilboot kruist tegen de wind naar het doel', `${up.t.toFixed(0)} s, dichtstbij ${Math.round(up.best)} m`);
  const down = simSail({ x: -450, y: 0 }, wind, 400);
  ok(down.ok, 'zeilboot vaart voor de wind naar het doel', `${down.t.toFixed(0)} s, dichtstbij ${Math.round(down.best)} m`);
  ok(down.t < up.t, 'voor de wind is sneller dan kruisen', `${down.t.toFixed(0)} s < ${up.t.toFixed(0)} s`);
  const dood = sailControls({ x: 0, y: 0, angle: 0, speed: 3, zeilTrim: 0.6 }, { goal: { x: 400, y: 0 }, wind });
  ok(dood.tacking, 'pal tegen de wind in: hij kruist');
  const kort = simSail({ x: 450, y: 0 }, wind, 30);
  ok(!kort.ok && kort.why === 'tijd op', 'zeilboot: time-out per poging');
}

console.log(fails ? `${fails} mislukt` : 'alles goed');
process.exit(fails ? 1 : 0);
