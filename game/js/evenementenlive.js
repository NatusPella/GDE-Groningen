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

// Zet elk item van propLayout/crowdSpots op een vrije plek: free(dx, dy) is waar als daar geen huis
// of water staat. Een bezette plek schuift deterministisch op (tot TRIES pogingen, ring voor ring
// groter); lukt het niet, dan valt het item weg. Het midden van het evenement blijft de maatstaf:
// een plek verder dan de afsluiting (radius) telt niet.
export const FIT_TRIES = 24;
export function fitLayout(ev, items, free, radius = KINDS[ev.kind].closure) {
  const r = rng(hash(ev.id + 'f'));
  const out = [];
  for (const it of items) {
    if (free(it.dx, it.dy)) { out.push(it); continue; }
    for (let t = 0; t < FIT_TRIES; t++) {
      const a = r() * Math.PI * 2, d = Math.min(radius * 0.9, Math.hypot(it.dx, it.dy) + 4 + t * 3 + r() * 6);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      if (free(dx, dy)) { out.push({ ...it, dx, dy }); break; }
    }
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
// Een plek voor een groepje voetgangers bij een lopend evenement (spawnlaag, pedestrians.js):
// binnen de menigtestraal, groepsgrootte 2-4. rand() geeft [0,1).
export function groupSpot(ev, rand = Math.random) {
  const k = KINDS[ev.kind], c = centreOf(ev);
  const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * k.closure * 0.7;
  return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, n: 2 + Math.floor(rand() * 3) };
}
// Hoeveel evenementsvoetgangers rond de speler mogen staan: de menigtedichtheid van het evenement.
export const crowdPedCap = (ev) => Math.round(KINDS[ev.kind].crowd * 24);

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
  if (world.coopRole !== 'client' && world.eventsNow.length && Array.isArray(world.vehicles)) { // een gast ruimt niets op: zijn voertuigen komen uit het snapshot (#452)
    for (const v of vehiclesToClear(world.vehicles, p, n, hour)) {
      const i = world.vehicles.indexOf(v);
      if (i >= 0) world.vehicles.splice(i, 1);
    }
  }
}

export { centreOf };
