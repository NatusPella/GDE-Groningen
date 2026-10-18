// Evenementen in de wereld (#203): de agenda van evenementen.js aan de spelwereld gehangen.
// Per ~1,5 s: wat hier te doen is (melding, eenmaal per evenement, onthouden onder
// gde-evenementen-v1), wat het geluid van het evenement is (world.eventSound, gelezen door
// sfx/ambience.js), en het autoverkeer dat in een afgesloten gebied staat (weg, buiten beeld).
// Het deel dat geen wereld nodig heeft staat in evenementen.js (scripts/evenementen_test.mjs);
// de regels hier in scripts/evenementenlive_test.mjs.
import { eventHere, soundAt, trafficFactor, loadSeen, markSeen, activeEvents, centreOf, KINDS, routePenalty } from './evenementen.js';

export const TICK_S = 1.5;
export const CLEAR_MIN_PLAYER_D = 40; // m: wat dichterbij staat, laten we staan (geen pop-in)

// Is dit een auto die het verkeer is (en niet van de speler of een missie)?
export function isCivilianTraffic(v) {
  return !!v && !v.driver && !v.playerOwned && !v.isHeroCar && !v.missionCar && !v.isPolice && !v.isBoat && !v.isBus && !v.wrecked;
}

// Welke voertuigen moeten uit een afgesloten gebied: pure keuze, geen wereld nodig.
export function vehiclesToClear(vehicles, player, n, hour) {
  const out = [];
  for (const v of vehicles) {
    if (!isCivilianTraffic(v)) continue;
    if (Math.hypot(v.x - player.x, v.y - player.y) < CLEAR_MIN_PLAYER_D) continue;
    if (trafficFactor(v.x, v.y, n, hour) <= 0) out.push(v);
  }
  return out;
}

// De tekst bij het betreden van een evenement.
export function arrivalText(ev) {
  return `${ev.naam}: ${ev.tekst || KINDS[ev.kind].naam}`;
}

export const MAX_CROWD = 60;

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Per evenement: [{ prop, dx, dy, angle }] rond het midden, binnen de afsluiting.
export function propLayout(ev) {
  const k = KINDS[ev.kind], r = rng(hash(ev.id));
  const out = [];
  const count = { kermis: 14, markt: 16, optocht: 18, vuurwerk: 10, concert: 9, wielerronde: 18 }[ev.kind] || 10;
  for (let i = 0; i < count; i++) {
    const prop = k.props[i % k.props.length];
    const a = r() * Math.PI * 2, d = (0.15 + r() * 0.8) * k.closure * 0.7;
    out.push({ prop, dx: Math.cos(a) * d, dy: Math.sin(a) * d, angle: r() * Math.PI * 2 });
  }
  return out;
}

// Menigte-posities (vast per evenement): n plekken, de eerste `count` worden getekend.
export function crowdSpots(ev, n = MAX_CROWD) {
  const k = KINDS[ev.kind], r = rng(hash(ev.id + 'm'));
  return Array.from({ length: n }, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * k.closure * 0.8;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, angle: r() * Math.PI * 2, hue: r() };
  });
}
export const crowdCount = (ev) => Math.round(KINDS[ev.kind].crowd * MAX_CROWD);

let timer = 0;
let seen = null;
const told = new Set();

export function updateEvenementen(dt, world, n) {
  if (!world || !world.player || !world.map) return;
  timer -= dt;
  if (timer > 0) return;
  timer = TICK_S;
  const hour = ((world.clock % 24) + 24) % 24;
  const p = world.player;
  const snd = soundAt(p.x, p.y, n, hour);
  world.eventSound = snd && !world.paused ? snd : null;
  world.eventsNow = activeEvents(n, hour);
  world.eventRouteSig = world.eventsNow.map((e) => e.id).join('|');
  const here = eventHere(p.x, p.y, n, hour, 0);
  if (here && here.live && !told.has(here.ev.id)) {
    told.add(here.ev.id);
    let st = null;
    try { st = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { st = null; }
    if (!seen) seen = loadSeen(st);
    if (!seen.includes(here.ev.id)) world.addMessage(arrivalText(here.ev), 5);
    seen = markSeen(st, seen, here.ev.id);
  }
  if (world.eventsNow.length && Array.isArray(world.vehicles)) {
    for (const v of vehiclesToClear(world.vehicles, p, n, hour)) {
      const i = world.vehicles.indexOf(v);
      if (i >= 0) world.vehicles.splice(i, 1);
    }
  }
}

export { centreOf };
