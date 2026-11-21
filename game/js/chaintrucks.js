// De zichtbare vrachtwagens van een productieketen (Bezit, epic #1095, #1103; docs/BEZIT-21-11.md 14.2): een AI-chauffeur brengt grondstof van je percelen naar je verwerker en
// de verwerkte waar naar je winkel. Het pure deel: uit de ketens (supplychain.js chainView, met de posities van de schakels) een lijst ritten, en uit de speltijd waar elke
// vrachtwagen nu is. Een weergave van wat de dagtik al deed (een schakel met wagens, afstand en een verplaatste hoeveelheid), nooit een tweede simulatie. Hoogstens MAX_TRUCKS
// tegelijk binnen 230 m van de speler (met hysterese). De route is een rechte lijn met wegpunten op het dichtstbijzijnde wegpunt (snap: map.nearestRoadPoint) of zonder snap
// een rechte lijn. Puur en deterministisch: geen THREE, geen DOM, geen klok, geen Math.random (scripts/chaintrucks_test.mjs); chaintrucks3d.js tekent het.
import { TRUCK_SPEED, LOAD_S, SHIFT_S, tripSeconds, DRIVER_NAMES } from './supplychain.js';
import { hashUnit, hashPick, clamp, finite } from './bezithash.js';

export const MAX_TRUCKS = 4;                   // hoogstens vier tegelijk in beeld (de dichtstbijzijnde)
export const SPAWN_R = 230, DESPAWN_R = 330;   // een nieuwe wagen binnen 230 m, weg bij 330 m: geen geflikker aan de rand
export const PLAN_EVERY_S = 0.5;
export const SHIFT_START_H = 7;                // een chauffeur rijdt zijn dienst van tien uur (SHIFT_S) vanaf zeven uur
export const MAX_PER_LINK = 3;                 // hoogstens drie wagens per schakel in beeld

const pt = (p) => (p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null);

// De ritten die vandaag kunnen rijden. chains: [{ id, links: [{ id, trucks, moved, distance, pos }] }] (bezitlive.chainTruckInput); pos van schakel i = waar zijn voorraad ligt.
// Een rit loopt van schakel i naar i + 1 en bestaat als i wagens heeft, over een afstand reed (> 0) en vandaag iets verplaatste. Zonder bekende plek van beide kanten: geen rit.
export function chainTrips(chains) {
  const out = [];
  for (const c of Array.isArray(chains) ? chains : []) {
    const links = (c && Array.isArray(c.links)) ? c.links : [];
    for (let i = 0; i + 1 < links.length; i++) {
      const l = links[i], a = pt(l.pos), b = pt(links[i + 1].pos);
      const trucks = Math.max(0, Math.floor(finite(l.trucks, 0))), dist = finite(l.distance, 0);
      if (!a || !b || trucks < 1 || dist <= 0 || !(finite(l.moved, 0) > 0)) continue;
      for (let j = 0; j < Math.min(trucks, MAX_PER_LINK); j++) {
        out.push({ key: `${c.id}:${l.id}:${j}`, chainId: c.id, linkId: l.id, index: j, of: Math.min(trucks, MAX_PER_LINK), from: a, to: b, distance: dist, secs: tripSeconds(dist), driver: hashPick(DRIVER_NAMES, c.id, l.id, j) });
      }
    }
  }
  return out;
}

// Een route als lijst punten: begin, het dichtstbijzijnde wegpunt bij het begin, het dichtstbijzijnde wegpunt bij het eind, eind. snap(x, y) -> { x, y } | null.
export function routeOf(from, to, snap = null) {
  const pts = [pt(from)];
  if (typeof snap === 'function') { for (const p of [from, to]) { let s = null; try { s = pt(snap(p.x, p.y)); } catch (e) { s = null; } if (s) pts.push(s); } }
  pts.push(pt(to));
  const out = [];
  for (const p of pts) if (p && (!out.length || Math.hypot(p.x - out[out.length - 1].x, p.y - out[out.length - 1].y) > 0.5)) out.push(p);
  // wegpunten in de verkeerde volgorde (dichtstbijzijnde bij het eind eerst) komen nooit voor: de volgorde is begin, snap(begin), snap(eind), eind
  return out.length >= 2 ? out : [pt(from), pt(to)].filter(Boolean);
}
const lengthOf = (r) => { let n = 0; for (let i = 1; i < r.length; i++) n += Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y); return n; };
// De plek en richting op een route bij fractie f (0 tot 1 van de lengte).
export function pointAlong(route, f) {
  const total = lengthOf(route);
  if (!(total > 0)) return { x: route[0].x, y: route[0].y, heading: 0 };
  let want = clamp(f, 0, 1) * total;
  for (let i = 1; i < route.length; i++) {
    const seg = Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
    if (want <= seg || i === route.length - 1) {
      const u = seg > 0 ? clamp(want / seg, 0, 1) : 0;
      return { x: route[i - 1].x + (route[i].x - route[i - 1].x) * u, y: route[i - 1].y + (route[i].y - route[i - 1].y) * u, heading: Math.atan2(route[i].y - route[i - 1].y, route[i].x - route[i - 1].x) };
    }
    want -= seg;
  }
  return { x: route[route.length - 1].x, y: route[route.length - 1].y, heading: 0 };
}

// Is het diensttijd? timeS: speltijd in seconden sinds dag 0 (of een willekeurige vaste nul); alleen binnen de dienst rijden de wagens.
export const onShift = (timeS) => { const s = ((finite(timeS, 0) % 86400) + 86400) % 86400, st = SHIFT_START_H * 3600; return s >= st && s < st + SHIFT_S; };

// Waar een rit nu is: een cyclus van laden (halve LOAD_S bij het begin), rijden met lading, lossen (halve LOAD_S bij het eind) en leeg terug. Elke wagen van dezelfde schakel start
// met een vaste, verschillende fase. Geeft { x, y, heading, loaded, phase: 'laden' | 'heen' | 'lossen' | 'terug' }.
export function tripPose(trip, route, timeS) {
  const secs = Math.max(1, trip.secs), drive = (secs - LOAD_S) / 2, half = LOAD_S / 2;
  const off = (trip.index / Math.max(1, trip.of) + hashUnit('keten-rit', trip.key) * 0.15) * secs;
  const t = (((finite(timeS, 0) + off) % secs) + secs) % secs;
  if (t < half) return { ...pointAlong(route, 0), loaded: false, phase: 'laden' };
  if (t < half + drive) return { ...pointAlong(route, (t - half) / Math.max(1, drive)), loaded: true, phase: 'heen' };
  if (t < half + drive + LOAD_S) return { ...pointAlong(route, 1), loaded: true, phase: 'lossen' };
  const back = pointAlong(route.slice().reverse(), (t - half - drive - LOAD_S) / Math.max(1, drive));
  return { ...back, loaded: false, phase: 'terug' };
}

// De wagens die nu in beeld horen. opts: { timeS, snap, current: Set van sleutels die er al staan, max, routes: Map (cache, door de aanroeper bewaard) }.
// Geeft [{ actorId, key, chainId, linkId, driver, x, y, heading, loaded, phase, distance }] op afstand (gelijk: op sleutel), hoogstens max.
export function planChainTrucks(trips, viewer, { timeS = 0, snap = null, current = null, max = MAX_TRUCKS, routes = null, spawnR = SPAWN_R, despawnR = DESPAWN_R } = {}) {
  if (!viewer || !Number.isFinite(viewer.x) || !Number.isFinite(viewer.y) || !Array.isArray(trips) || !trips.length || !(max > 0) || !onShift(timeS)) return [];
  const out = [];
  for (const trip of trips) {
    // grof filter: de rechte lijn tussen de eindpunten ligt in de buurt; pas dan wordt de route berekend
    const mx = (trip.from.x + trip.to.x) / 2, my = (trip.from.y + trip.to.y) / 2, half = Math.hypot(trip.to.x - trip.from.x, trip.to.y - trip.from.y) / 2;
    if (Math.hypot(mx - viewer.x, my - viewer.y) > half + despawnR + 150) continue;
    let route = routes && routes.get(trip.key);
    if (!route) { route = routeOf(trip.from, trip.to, snap); if (routes) { routes.set(trip.key, route); if (routes.size > 64) routes.delete(routes.keys().next().value); } }
    const pose = tripPose(trip, route, timeS), d = Math.hypot(pose.x - viewer.x, pose.y - viewer.y);
    if (d > ((current && current.has(trip.key)) ? despawnR : spawnR)) continue;
    out.push({ actorId: trip.key, key: trip.key, chainId: trip.chainId, linkId: trip.linkId, driver: trip.driver, distance: d, ...pose });
  }
  out.sort((a, b) => a.distance - b.distance || (a.key < b.key ? -1 : 1));
  return out.slice(0, max);
}
