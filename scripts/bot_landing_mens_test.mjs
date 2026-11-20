// M15 Laag over het graan, het landen (#955): kan een MENS de landing halen? Een gescript menselijk traject tegen de echte
// vliegregels (arcadeplane.js stepPlane) en de echte strook (planecontrol.js makeStrip, 520 x 34 m): reactietijd van 0,35 s,
// handruis op roer, gas en neus, wind van 0 tot 7 m/s (zomerWind) in een willekeurige richting en een aanvliegpunt tot 40 m naast
// de hartlijn. Geen Electron, geen wereld: vlakke grond. Slaagt als de kist op de strook staat met minder dan 2 m/s (planestage.js).
// De regels staan hier als aanname uit het spel: stal 22 m/s, een landing onder 0,8 x de overtreksnelheid, met te veel zinkgang,
// scheef of buiten de strook is een crash (de stap begint dan opnieuw, zonder tijdslimiet).
import { makePlane, stepPlane } from '../game/js/arcadeplane.js';
import { makeStrip } from '../game/js/planecontrol.js';
import { rng, gauss } from './bot/mens.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const strip = makeStrip({ x: 0, y: 0, heading: 0, length: 520, width: 34 });
const ground = () => 0;
const onRunway = (x, y) => strip.contains(x, y);

// een run: 'zorg' 1 = een geoefende piloot, 2 = een rommelige speler (dubbele ruis en reactietijd)
function landing(seed, { zorg = 1, windMax = 7, gasEraf = false } = {}) {
  const r = rng(seed);
  const p = makePlane(-800, (r() - 0.5) * 80, 70, 0);
  p.onGround = false; p.speed = 45; p.pitch = 0;
  const wsp = r() * windMax, wdir = r() * Math.PI * 2;
  let ruisRoll = 0, ruisPitch = 0, ruisGas = 0;
  const vertraging = Math.round(0.35 * zorg / 0.05);
  const rij = [];
  let t = 0, uit = 'tijd';
  const DT = 0.05;
  for (; t < 120; t += DT) {
    const along = p.x, across = p.y;
    const agl = p.z;
    // doel: de glijlijn naar 80 m op de strook (3,5 graden), daarna uitvlakken
    const dx = 80 - along;
    const zWens = Math.max(0, dx * Math.tan(0.061));
    let vzWens = clamp((zWens - agl) * 0.35, -4, 4) - (dx > 0 ? Math.min(3, 0.061 * p.speed) : 1);
    if (agl < 7) vzWens = Math.max(vzWens, -1.6);
    const pitchIn = clamp(Math.asin(clamp(vzWens / (0.6 * Math.max(20, p.speed)), -1, 1)) / 0.55, -1, 1);
    // zij: een koers die de hartlijn opzoekt, met de wind eruit gestuurd
    const yFout = across + (p.speed > 0 ? 0 : 0);
    const koersWens = clamp(-yFout * 0.004, -0.25, 0.25) - Math.atan2(wsp * Math.sin(wdir), Math.max(20, p.speed));
    const rollIn = clamp((koersWens - p.heading) * 2.2, -1, 1);
    const gasIn = gasEraf && agl < 40 ? 0 : clamp(0.25 + 0.08 * (30 - p.speed), 0, 1);
    ruisRoll = ruisRoll * 0.95 + 0.04 * zorg * gauss(r); ruisPitch = ruisPitch * 0.95 + 0.04 * zorg * gauss(r); ruisGas = ruisGas * 0.97 + 0.03 * zorg * gauss(r);
    rij.push({ roll: clamp(rollIn + ruisRoll, -1, 1), pitch: clamp(pitchIn + ruisPitch, -1, 1), throttle: clamp(gasIn + ruisGas, 0, 1) });
    const cmd = rij.length > vertraging ? rij[rij.length - 1 - vertraging] : rij[0];
    const voor = { v: p.speed, vz: p.vz, pitch: p.pitch, roll: p.roll, x: p.x, y: p.y, stalled: p.stalled };
    const inp = { ...cmd, yaw: 0, flaps: 0, gear: true, brake: p.onGround, wind: { x: Math.cos(wdir) * wsp, y: Math.sin(wdir) * wsp } };
    if (p.onGround) { inp.pitch = 0; inp.throttle = 0; inp.yaw = clamp(-p.y * 0.05, -1, 1); }
    stepPlane(p, inp, DT, ground, onRunway);
    if (p.crashed) { const oorzaak = !strip.contains(voor.x, voor.y) ? 'naast de strook' : voor.vz <= -9 ? 'te snel zakken' : Math.abs(voor.roll) >= 0.25 || Math.abs(voor.pitch) >= 0.3 ? 'scheef' : voor.v < 17.6 ? 'te langzaam (onder 0,8 x overtrek)' : 'harde landing'; uit = `crash: ${oorzaak} x=${Math.round(p.x)}`; break; }
    if (p.onGround && p.speed < 2) { uit = strip.contains(p.x, p.y) ? 'ok' : `buiten de strook x=${Math.round(p.x)} y=${Math.round(p.y)}`; break; }
    if (p.x > 700) { uit = 'voorbij'; break; }
  }
  return { uit, t, landing: p.landing };
}

function reeks(opties, aantal = 300) {
  let goed = 0; const fouten = {};
  for (let s = 1; s <= aantal; s++) {
    const r = landing(s, opties);
    if (r.uit === 'ok') goed++; else { const k = r.uit.replace(/ x=.*/, ''); fouten[k] = (fouten[k] || 0) + 1; }
  }
  return { goed, aantal, fouten };
}

const geoefend = reeks({ zorg: 1 });
const rommelig = reeks({ zorg: 2 });
const windstil = reeks({ zorg: 2, windMax: 0 });
const gasEraf = reeks({ zorg: 2, gasEraf: true });
console.log('geoefend', JSON.stringify(geoefend));
console.log('rommelig (dubbele ruis en reactietijd)', JSON.stringify(rommelig));
console.log('windstil, rommelig', JSON.stringify(windstil));
console.log('gas eraf op 40 m, rommelig', JSON.stringify(gasEraf));
ok(geoefend.goed / geoefend.aantal >= 0.8, 'een geoefende piloot landt op de strook in minstens 80% van de pogingen', `${geoefend.goed}/${geoefend.aantal}`);
ok(rommelig.goed / rommelig.aantal >= 0.4, 'ook een rommelige speler (dubbele ruis en reactietijd) landt in minstens de helft van de pogingen, en elke mislukte poging begint zonder tijdslimiet opnieuw', `${rommelig.goed}/${rommelig.aantal}`);
console.log(fails ? `bot_landing_mens_test: ${fails} van ${n} mislukt` : `bot_landing_mens_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
