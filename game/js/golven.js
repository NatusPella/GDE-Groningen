// Golven op zee en het kielzog dat kleine vaartuigen laat wiebelen (#417). Het water zelf (water3d.js) kent al een deining die naar de
// oever toe uitdooft; hier komt erbij: (1) op open water, 12 tot 24 m van de kust, wordt de deining hoger met de windsterkte
// (seaExtra, de shader en de CPU-hoogtevraag waterSwellAt delen die factor), en (2) een snelle boot trekt een V-vormig kielzog
// (kielzogHoogte) dat een supper, kano of kajak in de buurt laat wiebelen, wegduwt of, bij de speler, laat omvallen: je valt nat
// in het water, zonder leed, en klimt met E terug op de plank (player.js swimInteract). Het kielzog tilt ook het water zelf op
// (kielzogveld.js): de brede golf die je ziet, laat lege boten deinen en wiebelt de supper die erin vaart. Alles blijft lokaal
// (geen gast-sync; de bootpositie zelf blijft synchroon) en per frame beperkt tot boten binnen GOLF_REIKWIJDTE van de speler.
// Puur op de wereld: geen THREE, geen DOM. Tests: scripts/golven_test.mjs.

import { bouwKielzogVeld, setKielzogVeld } from './kielzogveld.js';

export const GOLF_REIKWIJDTE = 90;      // m rond de speler: verder wordt er niets berekend
export const KIELZOG_MIN_SNELHEID = 5;  // m/s: eerder maakt een boot geen merkbaar kielzog
export const KIELZOG_HOEK = 0.36;       // tan(19,5 graden): zijwaartse spreiding per meter achter de boot (net als boatwake3d.js)
export const KIELZOG_MAX_ACHTER = 70;   // m: daarachter is het kielzog uitgedoofd
export const KLEIN_VAARTUIG = { sup: 0.2, supWit: 0.2, kano: 0.28, kajak: 0.28, waterfiets: 0.4 }; // golfhoogte (m) waarbij het omslaat
export const KLEINE_SOORTEN = ['sup', 'kano', 'kajak', 'waterfiets'];
export const OMVAL_RISICO_PER_S = 1.1;  // hoe snel het risico oploopt boven de drempel
export const GENADE_S = 5;              // na het terugklimmen kan je even niet weer omvallen
const MAX_DOELEN = 6;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// 0 (windstil) tot 1 (storm) uit het weer van de wereld: regen en bewolking duwen hem op, met een traag opkomende vlaag.
export function windSterkte(weather, tijd = 0) {
  const regen = weather && Number.isFinite(weather.intensity) ? weather.intensity : 0;
  const bewolkt = weather && Number.isFinite(weather.overcast) ? weather.overcast : 0;
  return clamp(0.25 + 0.55 * regen + 0.2 * bewolkt + 0.12 * Math.sin(tijd * 0.011), 0, 1);
}

// Hoeveel de deining op open water extra groeit (factor 1 + dit): 0,6 bij windstil tot 2,6 bij storm.
export const seaExtraVoorWind = (wind) => 0.6 + 2.0 * clamp(wind, 0, 1);
export const seaExtra = (world) => (world && world.weather !== undefined ? seaExtraVoorWind(windSterkte(world.weather, world.time || 0)) : 0.6);

// Golfhoogte (m, top tot dal gedeeld door twee, dus de amplitude) op een plek: de basisdeining groeit met de afstand tot de
// kust en de windsterkte. Zelfde vorm als waterSwellAt in water3d.js, zonder de tijdsafhankelijke sinussen.
export function golfAmplitude(afstandKust, wind, regen = 0, basis = 0.12, regenBasis = 0.08) {
  const k = smooth((afstandKust - 0.15) / 4.85);
  const o = smooth((afstandKust - 12) / 12);
  return (basis + regenBasis * clamp(regen, 0, 1)) * k * (1 + seaExtraVoorWind(wind) * o);
}

// Hoogte (m) van het kielzog van boot `f` op plek (x, y): niets voor de boot of buiten de V, anders sterker bij een lange, snelle
// boot, bij de armen van de V (de kuif van het kielzog) en dichter achter de boot.
export function kielzogHoogte(f, x, y) {
  const snel = Math.abs(f.speed || 0);
  if (snel < KIELZOG_MIN_SNELHEID) return 0;
  const dx = x - f.x, dy = y - f.y;
  const c = Math.cos(f.angle), s = Math.sin(f.angle);
  const achter = -(dx * c + dy * s);
  if (achter < 1.5 || achter > KIELZOG_MAX_ACHTER) return 0;
  const opzij = Math.abs(-dx * s + dy * c);
  const breedte = achter * KIELZOG_HOEK + 1.5;
  if (opzij > breedte) return 0;
  const lengte = f.model && f.model.len ? f.model.len : 6;
  const basis = 0.12 * Math.sqrt(lengte) * clamp(snel / 6, 0, 1.6);
  const kuif = 1 - Math.min(1, Math.abs(opzij / (achter * KIELZOG_HOEK + 0.001) - 1) * 0.5);
  return (basis * (0.65 + 0.35 * kuif)) / (1 + achter * 0.12);
}

// De som van de kielzogen van alle snelle boten in `boten` (al begrensd tot de buurt) op de plek van `doel`.
export function kielzogOp(doel, boten) {
  let h = 0;
  for (const f of boten) if (f !== doel) h += kielzogHoogte(f, doel.x, doel.y);
  return h;
}

const kleineSoort = (v) => v && v.isBoat && v.model && KLEIN_VAARTUIG[v.model.kind] !== undefined;
export const omvalDrempel = (v) => (kleineSoort(v) ? KLEIN_VAARTUIG[v.model.kind] : Infinity);

// Belasting op een klein vaartuig (m): kielzog plus de zeegang op open water, die zwaarder weegt bij meer vaart.
export function golfBelasting(v, wakeH, zeeAmp) {
  const vaart = clamp(Math.abs(v.speed || 0) / ((v.model && v.model.maxSpeed) || 2), 0, 1);
  return wakeH + zeeAmp * 0.5 * (0.6 + 0.4 * vaart);
}

// Wipbeweging (rad) die animateBoat (scene3d.js) bij roll en pitch optelt: het kielzog schudt het vaartuig, het omslagrisico
// laat het zichtbaar wiebelen. Alleen kleine soorten; de rest krijgt 0.
const NUL = Object.freeze({ roll: 0, pitch: 0 });
export function golfWip(v, tijd) {
  const g = v._golf;
  if (!g || (g.wip < 0.002 && g.risico < 0.05)) return NUL;
  const a = clamp(g.wip * 0.9 + g.risico * 0.2, 0, 0.4);
  return { roll: Math.sin(tijd * 4.3 + (v.id || 0)) * a, pitch: Math.sin(tijd * 3.1 + (v.id || 0) * 0.5) * a * 0.35 };
}

function boten(world, speler) {
  const snel = [], klein = [];
  const px = speler.x, py = speler.y;
  for (const v of world.vehicles) {
    if (!v.isBoat || v.wrecked || v.sinking) continue;
    if (Math.abs(v.x - px) > GOLF_REIKWIJDTE || Math.abs(v.y - py) > GOLF_REIKWIJDTE) continue;
    if (Math.abs(v.speed || 0) >= KIELZOG_MIN_SNELHEID) snel.push(v);
    if (kleineSoort(v) && klein.length < MAX_DOELEN) klein.push(v);
  }
  return { snel, klein };
}

// De speler valt van zijn plank: het vaartuig blijft drijven, de speler ligt nat in het water (E klimt terug).
export function valInHetWater(world, v) {
  const p = world.player;
  v.speed = 0; v.throttle = 0;
  v._golf.risico = 0; v._golf.genade = (world.time || 0) + GENADE_S;
  if (typeof p.ejectIntoWater === 'function') p.ejectIntoWater(v, world);
  if (world.particles) world.particles.push({ kind: 'splash', x: p.x, y: p.y, until: (world.time || 0) + 0.8 });
  world.addMessage('Een golf slaat je eraf. Druk op E om weer op te klimmen.', 5, { kind: 'tip', key: 'golf-omval' });
  return true;
}

// Eén stap per frame. Telt het kielzog en de zeegang op bij kleine vaartuigen in de buurt, duwt lege wiegende vaartuigen weg en
// laat de speler omvallen als de golf te hoog blijft. Alleen binnen de reikwijdte, met een vaste bovengrens aan doelen.
export function updateGolven(world, dt) {
  const speler = world.player;
  if (!speler || !world.vehicles) { setKielzogVeld(null); return; }
  if (!(dt > 0)) return;
  const tijd = world.time || 0;
  const { snel, klein } = boten(world, speler);
  // hetzelfde kielzog tilt het water op dat de supper laat wiebelen (kielzogveld.js, water3d.js)
  setKielzogVeld(bouwKielzogVeld(snel, speler.x, speler.y));
  if (!klein.length) return;
  const wind = windSterkte(world.weather, tijd);
  const regen = world.weather && world.weather.intensity ? world.weather.intensity : 0;
  for (const v of klein) {
    const g = v._golf || (v._golf = { wip: 0, risico: 0, genade: 0 });
    const kielzog = kielzogOp(v, snel);
    const sh = v._shore;
    const zee = sh && sh.open ? golfAmplitude(24, wind, regen) : 0;
    const last = golfBelasting(v, kielzog, zee);
    g.wip += (clamp(last * 1.6, 0, 0.35) - g.wip) * Math.min(1, dt * 2.5);
    const drempel = omvalDrempel(v);
    // wie niet bestuurd wordt drijft met het kielzog mee (v.driftX/driftY: de boot glijdt, de oever houdt hem binnen het water)
    if (kielzog > 0.05 && !v.driver && !v.moored) {
      const c = Math.cos(snel[0].angle), s = Math.sin(snel[0].angle);
      v.driftX = (v.driftX || 0) + c * kielzog * 2.2 * dt * 4;
      v.driftY = (v.driftY || 0) + s * kielzog * 2.2 * dt * 4;
    }
    if (v.driver !== 'player') { g.risico = Math.max(0, g.risico - dt * 0.6); continue; }
    if (tijd < g.genade || speler.inVehicle !== v) { g.risico = 0; continue; }
    if (last > drempel * 0.7) g.risico += (last / drempel - 0.7) * OMVAL_RISICO_PER_S * dt;
    else g.risico = Math.max(0, g.risico - dt * 0.5);
    if (g.risico > 0.45 && !g.gewaarschuwd) {
      g.gewaarschuwd = true;
      world.addMessage('Je wiebelt flink op het water. Vaar rustiger of ga uit de golven.', 4, { kind: 'tip', key: 'golf-wiebel' });
    } else if (g.risico < 0.1) g.gewaarschuwd = false;
    if (g.risico >= 1) valInHetWater(world, v);
  }
}
