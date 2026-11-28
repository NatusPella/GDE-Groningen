// Navigatie in de lucht: in een vliegtuig, helikopter of als duif loopt de route niet langs de wegen
// maar als een RECHTE lijn van de neus naar het doel (op de kaart, in de scene en op de navigatiekaart).
// Hier staat het pure deel, los van THREE en de DOM, zodat het te testen is:
//  - welke reiswijze een luchtvaartuig heeft (isAirCraft),
//  - de rechte lijn, bijgesneden tot N meter vooruit (airLine),
//  - peiling, afstand, tijd en hoogteadvies voor de navigatiekaart (airGuide),
//  - aankomst op afstand en hoogte (airArrival),
//  - en de waakhondregel voor de luchtlijn (airLineFault; de grondstrook zit in pathribbonwatch.js).
//
// Wereldas: x oost, y zuid; de hoek van een voertuig loopt kloksgewijs (plus is rechts).
// Samen spelen: de route is lokaal per speler; elke speler ziet zijn eigen luchtlijn.
// Het hoogteprofiel boven de gebouwen (de lijn klimt en daalt mee) staat in airprofile.js.
import { airNeedAdvice } from './airprofile.js';

// Zoveel meter vooruit tekent de lijn (de rest van de weg zie je aan het doelmarker).
export const AIR_LINE_AHEAD_M = 700;
// Aankomst: binnen deze straal horizontaal en deze hoogte-afwijking.
export const AIR_ARRIVE_R = 45;
export const AIR_ARRIVE_DZ = 30;
// Binnen deze afwijking (graden) is het "rechtdoor".
export const AIR_STRAIGHT_DEG = 12;
// Minder hoogteverschil dan dit is "hoogte houden".
export const AIR_ALT_BAND = 15;
const TYPICAL_AIR_SPEED = 30;

const norm = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// Vliegt de speler? (vliegtuig, helikopter, ballon, duif, heli-run.) Voor de reiswijze van de route.
export function isAirCraft(world, p) {
  if (world && (world.pigeonMode || world.heliRun)) return true;
  const v = p && p.inVehicle;
  return !!(v && (v.isHeli || v.isPlane || v.isBalloon));
}

// De rechte lijn van het luchtvaartuig naar het doel, bijgesneden tot `aheadM` meter vooruit.
// from: { x, y, z }, to: { x, y }, goalZ: de hoogte aan het eind (de aanbevolen vlieghoogte).
// Geeft { x0, y0, z0, x1, y1, z1, len, total, clipped } of null als er niets te tekenen valt.
export function airLine(from, to, goalZ, aheadM = AIR_LINE_AHEAD_M) {
  if (!from || !to) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const total = Math.hypot(dx, dy);
  if (!(total > 1)) return null;
  const len = Math.min(total, aheadM);
  const k = len / total;
  const z0 = from.z || 0;
  const zEnd = Number.isFinite(goalZ) ? goalZ : z0;
  return { x0: from.x, y0: from.y, z0, x1: from.x + dx * k, y1: from.y + dy * k, z1: z0 + (zEnd - z0) * k, len, total, clipped: total > aheadM };
}

// Wat de navigatiekaart zegt. me: { x, y, z, angle, speed }, target: { x, y, name }, opts: { alt }
export function airGuide(me, target, opts = {}) {
  const dx = target.x - me.x, dy = target.y - me.y;
  const dist = Math.hypot(dx, dy);
  // kompaspeiling (0 = noord, 90 = oost): de y-as wijst naar het zuiden
  const bearing = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360) % 360;
  const rel = Number.isFinite(me.angle) ? norm(Math.atan2(dy, dx) - me.angle) : 0;
  const relDeg = Math.round((rel * 180) / Math.PI);
  const abs = Math.abs(relDeg);
  const side = abs <= AIR_STRAIGHT_DEG ? 'recht voor je' : abs >= 135 ? 'achter je' : relDeg > 0 ? 'rechts voor je' : 'links voor je';
  const name = target.name || 'je doel';
  const title = abs <= AIR_STRAIGHT_DEG ? `Rechtdoor naar ${name}` : abs >= 135 ? `Draai om naar ${name}` : relDeg > 0 ? `Draai naar rechts, ${name}` : `Draai naar links, ${name}`;
  const speed = Math.abs(me.speed || 0);
  const v = Math.max(TYPICAL_AIR_SPEED * 0.6, speed > 5 ? speed : TYPICAL_AIR_SPEED);
  const etaS = dist / v;
  const alt = opts.alt;
  const dz = Number.isFinite(alt) && Number.isFinite(me.z) ? alt - me.z : 0;
  let altAdvice = !Number.isFinite(alt) ? '' : Math.abs(dz) <= AIR_ALT_BAND ? 'Hoogte goed' : dz > 0 ? `Stijg naar ${alt} m` : `Daal naar ${alt} m`;
  // het hoogteprofiel boven de gebouwen (airprofile.js): zit er voor je een obstakel dat hoger is dan je vliegt, dan
  // gaat dat advies voor ("Stijg naar 120 m: Martinitoren voor je")
  let dzOut = dz;
  const need = opts.need && airNeedAdvice(opts.need, me.z);
  if (need) { altAdvice = need; dzOut = opts.need.z - me.z; }
  return { dist, bearing, relDeg, side, title, etaS, dz: dzOut, altAdvice };
}

export function airDistText(m) {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function airEtaText(etaS) {
  return `± ${Math.max(1, Math.round(etaS / 60))} min`;
}

// De tweede regel van de kaart: koers, peiling en hoogteadvies.
export function airSub(g) {
  return [`Koers ${String(g.bearing).padStart(3, '0')}°`, g.side, g.altAdvice].filter(Boolean).join(' · ');
}

// Aangekomen? Binnen R meter horizontaal; heeft het doel een hoogte (z), dan ook binnen DZ meter.
export function airArrival(me, target, opts = {}) {
  const r = opts.r ?? AIR_ARRIVE_R;
  const dzMax = opts.dz ?? AIR_ARRIVE_DZ;
  const d = Math.hypot(target.x - me.x, target.y - me.y);
  if (d > r) return false;
  if (!Number.isFinite(target.z) || !Number.isFinite(me.z)) return true;
  return Math.abs(me.z - target.z) <= dzMax;
}

// Waakhond voor de luchtlijn (scene3d/airline3d.js). s: { wanted, meshExists, inScene, visible, vertexCount, finite }
// wanted = je vliegt, er is een actieve route en de navigatie hoort zichtbaar te zijn.
export const AIR_FAULTS = ['geen-mesh', 'niet-in-scene', 'verborgen', 'leeg', 'niet-eindig'];
export function airLineFault(s) {
  if (!s || !s.wanted) return null;
  if (!s.meshExists) return 'geen-mesh';
  if (!s.inScene) return 'niet-in-scene';
  if (!s.visible) return 'verborgen';
  if (!(s.vertexCount > 0)) return 'leeg';
  if (s.finite === false) return 'niet-eindig';
  return null;
}

// Hoort de grondstrook er te zijn? Niet zolang je vliegt: dan is "geen grondstrook" geen fout.
export function groundRibbonWanted(route, flying) {
  return !!route && !flying && route.mode !== 'fly' && route.mode !== 'boat';
}
