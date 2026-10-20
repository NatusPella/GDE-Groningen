// Every fixed place the player has to reach (mission starts and targets,
// activities, side jobs, shops, garages, post-game challenges, pigeon, heli,
// station and Fjord Frituur spots, eierballen, respawn points (where
// respawn.js puts you at every reachable facility), the Ommeland
// extras' wereldeinden and dorpsuitjes), checked for
// being on open ground you can walk away from: not inside a building
// footprint (a mapped passage is fine), not in the water unless it is a boat
// spot, not in a pocket the footprints close off, and out in the Ommelanden
// not inside what is solid there (the real building boxes, farmsteads,
// villages, turbines, pylons: the same countryplan.js query collision.js
// uses, with the map-edge mask built first). `validateSpots(world)`
// returns the offenders; the story test fails on any (desktop
// --validate-spots runs only this check).
import { getHomeSpots } from './home.js';
import { pointInPolygon, isInWater, closestPointOnSegment } from './util.js';
import { inPassage } from './passages.js';
import { getMissionDefs, resolveMissionTarget } from './missions.js';
import { getShopsForRender } from './shops.js';
import { getGaragesForRender } from './garages.js';
import { getHorecaForRender } from './horeca.js';
import { getSideJobList } from './sidejobs.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getHeliSpotsForRender } from './helirun.js';
import { getPadelSpotsForRender } from './padel.js';
import { getStationsForRender } from './stationtravel.js';
import { getEierballen } from './achievementtracker.js';
import { CHALLENGES } from './postgame.js';
import { activitySpots } from './activities.js';
import { ensureCountryEdge, pushOutOfPlan } from './countryplan.js';
import { countryWeight } from './countryfield.js';
import { coveredByTiles } from './provinceworld.js';
import { getOmmelandSpots } from './ommelandfun.js';
import { reachableFacilities, FAC } from './facilities.js';
import { roadNear, roadKind, tilesIn, withTiles } from './tileplace.js';
import { respawnArrival } from './respawn.js';

const DRIVE_REACH = 25;
const WALK_REACH = 45;

function buildingAt(map, x, y) {
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy || !pointInPolygon(x, y, b.pts)) continue;
    if (inPassage(map, b, x, y)) continue;
    return b;
  }
  return null;
}

function driveDist(map, x, y) {
  let best = Infinity;
  for (const r of map.roadsNear(x, y, DRIVE_REACH + 10)) {
    // a car gets down a pedestrian street (the Poelestraat) too
    if (r.z || r.cat === 'cycle' || (r.cat === 'foot' && !(r.type === 'pedestrian' && (r.width || 0) >= 4))) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      best = Math.min(best, Math.sqrt(cp.dist2) - (r.width || 6) / 2);
    }
  }
  return best;
}

// Out in the Ommelanden (countryWeight > 0.5) the countryside colliders are
// solid for walkers and vehicles alike (collision.js resolveWalker).
function countrySolid(x, y) {
  if (countryWeight(x, y) <= 0.5 || coveredByTiles(x, y)) return null;
  const o = { x, y };
  if (!pushOutOfPlan(o, 0.35)) return null;
  return 'in een erf, dorp, molen of mast in de Ommelanden';
}

// What is wrong with the spot, or null.
export function spotProblem(map, s) {
  const { x, y, mode } = s;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'geen positie';
  if (mode === 'air') return null;
  // (a canal's water polygons often stop under a bridge: the boat sails on through)
  if (mode === 'boat') return isInWater(map, x, y) || map.isOnBridge(x, y) || map.inWaterRaw(x, y) ? null : 'niet op het water';
  const wet = isInWater(map, x, y);
  if (wet) return 'in het water';
  const b = buildingAt(map, x, y);
  if (b) return `in een gebouw${b.name ? ' (' + b.name + ')' : ''}`;
  const solid = countrySolid(x, y);
  if (solid) return solid;
  if (!map.canWalkOut(x, y, WALK_REACH)) return 'ingesloten, je kunt er niet weg';
  if (mode === 'drive' && driveDist(map, x, y) > DRIVE_REACH && !roadNear(map, x, y, DRIVE_REACH, (r) => roadKind(r) > 2)) return 'te ver van een rijweg';
  return null;
}

function stageMode(st) {
  if (st.kind === 'pigeon' || st.kind === 'heli') return 'air';
  if (st.mode === 'boat' || st.kind === 'boatchase') return 'boat';
  if (st.mode === 'vehicle' || st.kind === 'garage') return 'drive';
  return 'walk';
}

// Targets that only exist while a mission runs (your boat, the skûtsje, the
// nearest quay) are left out.
const RUNTIME = ['rental', 'route', 'shore', 'skutsje'];

// fn() with the tiles round the spot in (a spot far from the player is on tiles that are not in)
const onTiles = async (map, s, radius, fn) => (tilesIn(map, [[s.x, s.y]], radius) ? fn() : withTiles(map, [[s.x, s.y]], fn, { radius, token: 'spotcheck' }));

export async function collectSpots(world) {
  const out = [];
  const add = (kind, id, p, mode = 'walk') => { if (p) out.push({ kind, id, x: p.x, y: p.y, mode }); };
  const defs = getMissionDefs() || [];
  defs.forEach((d, i) => {
    const tag = d.id || d.label || `#${i}`;
    add('missie-start', tag, d.start, d.startAt === 'rental' ? 'air' : 'walk');
    if (d.dest) add('missie-doel', tag, d.dest, d.onFoot ? 'walk' : 'drive');
    for (const s of d.stops || []) add('missie-stop', `${tag} ${s.name || ''}`, s, 'drive');
    for (const c of d.crowds || []) add('missie-menigte', tag, c);
    // the ring race runs on the ring's decks and cuttings (ringcheck.js); a bike
    // race may use cycle paths
    const wpMode = d.type === 'boat' ? 'boat' : d.onFoot || d.requires === 'bike' ? 'walk' : 'drive';
    if (d.race !== 'ring') (d.waypoints || []).forEach((w, k) => add('missie-checkpoint', `${tag} #${k}`, w, wpMode));
    if (d.heist) {
      add('missie-heist', `${tag} stroomkast`, resolveMissionTarget(world, d.heist.fuse, d.start));
      add('missie-heist', `${tag} vitrine`, resolveMissionTarget(world, d.heist.vitrine, d.start));
    }
    (d.stages || []).forEach((st, k) => {
      const mode = stageMode(st);
      for (const t of [st.target, ...(st.kind === 'pigeon' ? [] : st.targets || [])]) {
        if (!t || RUNTIME.some((r) => t[r])) continue;
        const p = resolveMissionTarget(world, t, d.start);
        add('missie-doel', `${tag} stage ${k} ${st.kind}${st.label ? ' "' + st.label + '"' : ''}`, p, t.z != null ? 'air' : mode);
      }
    });
  });
  for (const s of getShopsForRender()) add('winkel', `${s.type} ${s.name || ''}`, s);
  for (const g of getGaragesForRender()) add('garage', g.name, g, 'drive');
  for (const h of getHomeSpots(world)) add('thuis', h.name, h, h.mode);
  for (const h of getHorecaForRender() || []) add('horeca', h.name, h);
  for (const j of getSideJobList()) add('bijbaan', j.name, j);
  for (const p of getPigeonSpotsForRender()) add('duivenplek', p.name, p);
  for (const h of getHeliSpotsForRender()) add('heli', 'traumaheli', h);
  for (const p of getPadelSpotsForRender()) add('padel', p.name, p);
  for (const a of activitySpots()) add(a.kind, a.id, a, a.mode);
  for (const s of getStationsForRender() || []) add('station', s.name, s);
  for (const e of getEierballen()) add('eierbal', e.id, e);
  for (const c of CHALLENGES) {
    let list = [];
    try { list = c.spots(world) || []; } catch (e) { list = []; }
    for (const q of list) add('postgame', `${c.id} ${q.name || ''}`, q, c.vehicle ? 'drive' : 'walk');
  }
  for (const o of getOmmelandSpots(world)) add(o.kind, o.id, o);
  // every hospital, GP post, doctor and police station a death or an arrest
  // can lead to (facilities.js), where respawn.js puts the player
  const meta = world.map.meta || {};
  const sites = FAC.ready
    ? [...reachableFacilities('medical'), ...reachableFacilities('police')]
    : [...(meta.policeStations || []), ...(meta.careSites || []), ...(meta.hospital ? [{ ...meta.hospital, umcg: true }] : [])];
  const probe = { ...world, vehicles: [] };
  for (const s of sites) add('respawn', s.name || `${Math.round(s.x)},${Math.round(s.y)}`, await onTiles(world.map, s, 200, () => respawnArrival(probe, s).player));
  return out;
}

export async function validateSpots(world) {
  // the Ommelanden masks are built lazily in play; the check needs them now
  ensureCountryEdge(world.map);
  const spots = await collectSpots(world);
  const bad = [];
  for (const s of spots) {
    const why = await onTiles(world.map, s, 90, () => spotProblem(world.map, s));
    if (why) {
      // the nearest spot that passes, so a fix is one edit away (rings of 8 probes, 10 m apart, out to 200 m)
      const fix = await onTiles(world.map, s, 220, () => {
        for (let r = 10; r <= 200; r += 10) {
          for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4, q = { ...s, x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r };
            if (!spotProblem(world.map, q)) return { x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10, d: r };
          }
        }
        return null;
      });
      bad.push({ ...s, x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10, why, ...(fix ? { fix } : {}) });
    }
  }
  return { total: spots.length, bad };
}

