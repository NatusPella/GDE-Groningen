// Het doel van een opdrachtstap: een plek uit een spec ({ x, y }, { landmark }, { shop }, ...)
// naar een punt in de wereld, plus de wegpunthulpjes die daarbij horen. Afgesplitst uit
// missions.js (#497), zonder inhoudelijke wijziging; missions.js exporteert resolveMissionTarget
// nog steeds. De ketenstaat en de dichtstbijzijnde winkel komen via createMissionTargets()
// binnen (zoals missiongates.js), zodat er geen cyclus terug naar missions.js is.
import { dist, pointInPolygon, isInWater } from './util.js';
import { wgsToWorld } from './rdnew.js';
import { getGaragesForRender, GARAGE_BAY_DEPTH } from './garages.js';
import { doorPoint } from './garageguide.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { helipadById } from './heliflight.js';
import { getHeliSpotsForRender } from './helirun.js';
import { routeAt, ROUTE_LENGTH } from './rondvaartchase.js';
import { heistSpotAt } from './heist.js';

// The nearest road point, unless that lies inside a building or a closed-off
// courtyard: then the nearest street you can actually reach (findOpenSpawn).
export function roadSpot(map, x, y, drivable = false) {
  const p = map.nearestRoadPoint(x, y, 120, drivable) || { x, y, road: null };
  if (!map.isOpenSpot || map.isOpenSpot(p.x, p.y)) return p;
  return map.findOpenSpawn(p.x, p.y, 200, drivable) || p;
}

export function rentalBoat(world) {
  return world.vehicles.find((v) => v.isBoat && v.playerOwned && !v.wrecked && !v.sinking) || null;
}


// Progress s along the Diepenring route (rondvaartchase.js) nearest to (x, y).
export function routeS(x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s <= ROUTE_LENGTH; s += 4) {
    const q = routeAt(s);
    const d = (q.x - x) ** 2 + (q.y - y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return { s: best, d: Math.sqrt(bd) };
}


// A dry spot right at the water's edge near (x, y), outside buildings: where
// Jelle takes his run-up for a jump over the water.
function bankNear(map, x, y) {
  const inside = (px, py) => map.buildingsNear(px, py, 1).some((b) => pointInPolygon(px, py, b.pts));
  for (let r = 0; r <= 160; r += 4) {
    const n = Math.max(1, Math.round(r / 3));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (isInWater(map, px, py) || inside(px, py)) continue;
      for (let j = 0; j < 8; j++) {
        if (isInWater(map, px + Math.cos(j * Math.PI / 4) * 4, py + Math.sin(j * Math.PI / 4) * 4)) return { x: px, y: py };
      }
    }
  }
  return roadSpot(map, x, y);
}

// state: de ketenstaat (chainState); nearestShopOf: de winkel die het dichtst bij de speler ligt (missiongates.js).
export function createMissionTargets({ state: chainState, nearestShopOf }) {
  function resolveTarget(world, spec, from) {
    if (!spec) return null;
    const map = world.map;
    const snap = (x, y) => (spec.snap ? roadSpot(map, x, y, spec.snap === 'drive') : { x, y });
    if (Number.isFinite(spec.x) && Number.isFinite(spec.y)) return spec;
    if (spec.at) return { ...snap(spec.at[0], spec.at[1]), label: spec.label };
    // a real place by latitude and longitude (the new arc's tile world, akte 4); snapped to a road when `snap` says so
    if (spec.ll) { const [wx, wy] = wgsToWorld(spec.ll[0], spec.ll[1]); return { ...snap(wx, wy), label: spec.label }; }
    if (spec.shop) {
      const s = nearestShopOf({ player: from }, spec.shop);
      return s ? { x: s.x, y: s.y, name: s.name, label: spec.label || s.name } : null;
    }
    if (spec.garage) {
      let best = null, bd = Infinity;
      for (const g of getGaragesForRender()) {
        const d = dist(g.x, g.y, from.x, from.y);
        if (d < bd) { bd = d; best = g; }
      }
      return best ? { x: best.x, y: best.y, door: doorPoint(best, GARAGE_BAY_DEPTH), name: best.name, label: spec.label || best.name } : null;
    }
    if (spec.landmark) {
      const lm = (map.meta.landmarks || []).find((l) => l.name === spec.landmark);
      if (!lm) return null;
      const [dx, dy] = spec.off || [0, 0];
      return { ...snap(lm.x + dx, lm.y + dy), label: spec.label || spec.landmark, z: spec.z, r: spec.r };
    }
    if (spec.heistSpot) return heistSpotAt(map, spec.heistSpot);
    if (spec.pigeonSpot) {
      const ps = getPigeonSpotsForRender().find((q) => q.id === spec.pigeonSpot);
      return ps ? { x: ps.x, y: ps.y, label: ps.name } : null;
    }
    if (spec.helipad) {
      const hp = helipadById(spec.helipad);
      return hp ? { x: hp.x, y: hp.y, label: spec.label || hp.name } : null;
    }
    if (spec.heli) {
      const hs = getHeliSpotsForRender()[0];
      return hs ? { x: hs.x, y: hs.y, label: spec.label || 'Traumaheli' } : null;
    }
    if (spec.rental) {
      const b = rentalBoat(world);
      return b ? { x: b.x, y: b.y, label: spec.label || 'Je huurboot' } : null;
    }
    if (spec.route) {
      const r = routeS(from.x, from.y);
      const q = routeAt(r.s);
      return { x: q.x, y: q.y, label: spec.label };
    }
    if (spec.shore) return { ...roadSpot(map, from.x, from.y), label: spec.label };
    if (spec.skutsje) return chainState().skutsje ? { x: chainState().skutsje.x, y: chainState().skutsje.y, label: spec.label } : null;
    if (spec.storyBoat) return chainState().storyBoat ? { x: chainState().storyBoat.x, y: chainState().storyBoat.y, label: spec.label || 'De rubberboot van Klaas' } : null;
    if (spec.bank) return { ...bankNear(map, spec.bank[0], spec.bank[1]), label: spec.label };
    return null;
  }
  return resolveTarget;
}
