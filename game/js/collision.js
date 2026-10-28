// Shared on-foot collision for everything that walks (player, companion,
// pedestrians, animals): building footprints - minus the passages that
// footways and streets cut through them - and solid street props.
import { closestPointOnSegment, pointInPolygon, isInWater, inMapWater } from './util.js';
import { buildingAt } from './tileplace.js';
import { resolveWalkerProps } from './breakables.js';
import { countryWeight } from './countryfield.js';
import { pushOutOfPlan } from './countryplan.js';
import { pushOutOfTrunks, pushOutOfWalls } from './countrywalls.js';
import { pushOutOfRails, COUNTRY_RAIL_H } from './countryrails.js';
import { resolveRailings } from './bridgerails.js';
import { resolveElevWalls } from './elevation.js';
import { pushOutOfWaterObstacles } from './waterindex.js';
import { passagesOf, nearestCorridor, inPassage } from './passages.js';
import { rectDist, clampToRect, inDoorway } from './museumplan.js';

export { passagesOf, inPassage };

// how far past the corridor's half-width a walker already inside the
// footprint is still pulled back into the corridor rather than out of the
// building
const PASSAGE_SLACK = 0.6;

// Onder deze hoogte (absolute m) ligt de voet van een zwemmer in het water:
// kades en straten liggen op 0, het water van de grachten op WATER_Y (-2,3).
// Een hek of leuning op de kade is dan niet iets waar hij tegenaan loopt (#502).
const STREET_LEVEL_Z = -0.4;
// En boven deze hoogte loopt hij over een viaduct of een dek: het hek op de
// grond eronder telt dan niet mee. Tot 1,5 m is het gewone straatniveau.
const STREET_LEVEL_TOP = 1.5;

// Push a circle out of any nearby building polygon it overlaps - including
// when its centre is already inside, where the nearest-edge vector points
// outward rather than away from the wall. Inside a passage the circle is
// kept within the corridor instead. Out in the Ommeland the countryplan
// solids, tree trunks and bridge railings (unless jumped over: hop) hold it
// too, and with `walls` the field hedges and fences (the player vaults
// those, countryside.js).
// z is the walker's absolute height. The polder railings and field fences
// stand at street level: someone under a bridge or in a sluis (z below the
// quay) must not bump into the railing above the water (#502, playtest 27-10:
// "onder een hekje").
export function resolveBuildingCollisions(x, y, radius, map, hop = 0, walls = false, z = 0) {
  const nearby = map.buildingsNear(x, y, radius + 2);
  // several passes: in a tight gap between two buildings one push can land
  // against the other wall
  for (let iter = 0; iter < 5; iter++) {
    for (const b of nearby) {
      const [minx, miny, maxx, maxy] = b.bounds;
      if (x < minx - radius || x > maxx + radius || y < miny - radius || y > maxy + radius) continue;
      const pts = b.pts;
      let bestDist2 = Infinity, bestX = 0, bestY = 0, bestI = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; bestX = cp.x; bestY = cp.y; bestI = i; }
      }
      const d = Math.sqrt(bestDist2);
      const inside = pointInPolygon(x, y, pts);
      if (!inside && d >= radius) continue;
      if (b.rooms) {
        // walkable rooms (the museum): free well inside one, else held in the
        // one it is most inside; walking in from outside through a doorway
        let best = null, bd = Infinity;
        for (const r of b.rooms) { if (r.shut) continue; const rd = rectDist(r, x, y); if (rd < bd) { bd = rd; best = r; } }
        if (bd <= -radius) continue;
        if (inside && inDoorway(b.rooms, x, y, radius)) continue;
        if (inside ? bd < PASSAGE_SLACK : rectDist(best, bestX, bestY) < 0) {
          if (inside) [x, y] = clampToRect(best, x, y, radius);
          continue;
        }
      }
      const passages = passagesOf(map, b);
      if (passages.length) {
        if (inside) {
          const c = nearestCorridor(passages, x, y);
          if (c.d < c.hw + PASSAGE_SLACK) {
            const lim = Math.max(0.05, c.hw - radius);
            if (c.d > lim) { x = c.x + (x - c.x) / c.d * lim; y = c.y + (y - c.y) / c.d * lim; }
            continue;
          }
        } else {
          const c = nearestCorridor(passages, bestX, bestY);
          if (c.d < c.hw) continue;
        }
      }
      let ox, oy;
      if (d > 1e-6) {
        ox = (x - bestX) / d;
        oy = (y - bestY) / d;
        if (inside) { ox = -ox; oy = -oy; }
      } else {
        const ex = pts[bestI + 1][0] - pts[bestI][0], ey = pts[bestI + 1][1] - pts[bestI][1];
        const el = Math.hypot(ex, ey) || 1;
        ox = -ey / el;
        oy = ex / el;
        if (pointInPolygon(bestX + ox * radius, bestY + oy * radius, pts)) { ox = -ox; oy = -oy; }
      }
      x = bestX + ox * radius;
      y = bestY + oy * radius;
    }
  }
  // Ommelanden farmsteads, houses, silos, masts and terps (countryplan)
  if (countryWeight(x, y) > 0.5) {
    // De hekken en leuningen van het land staan op straatniveau (0 m). Wie in
    // het water onder een brug of in een sluis zit, of over een viaduct loopt,
    // hoort daar niet tegenaan te botsen (#502).
    const atStreet = z > STREET_LEVEL_Z && z < STREET_LEVEL_TOP;
    const o = { x, y };
    if (pushOutOfPlan(o, radius)) { x = o.x; y = o.y; }
    o.x = x; o.y = y;
    if (pushOutOfTrunks(o, radius)) { x = o.x; y = o.y; }
    o.x = x; o.y = y;
    if (atStreet && hop < COUNTRY_RAIL_H && pushOutOfRails(o, radius)) { x = o.x; y = o.y; }
    o.x = x; o.y = y;
    if (atStreet && walls && hop < 0.5 && pushOutOfWalls(o, radius)) { x = o.x; y = o.y; }
  }
  return [x, y];
}

// One walker step: props first (a bumped post nudges you sideways), then the
// buildings, which always win. `vx, vy` is the walker's velocity - fast enough
// and light props get kicked over instead of blocking; `opts.kick` false keeps
// every prop solid, `opts.skipSeats` lets a ped reach its bench or chair.
// z: the walker's absolute height (ring viaducts, cuttings - elevation.js);
// up on a deck or down in a cutting the street-level buildings don't apply.
// hop: feet height above the ground while jumping; low props and railings
// under the feet are jumped over.
export function resolveWalker(x, y, radius, map, vx = 0, vy = 0, opts = null, z = 0, hop = 0) {
  if (map.elev && map.elev.has) {
    const w = map.terrainOn ? map.resolveWalls(x, y, z, radius) : resolveElevWalls(map.elev, x, y, z, radius);
    if (w) [x, y] = w;
  }
  // Above the street nothing of the street applies: the flat of home.js and the room behind the door of a safehouse (#458,
  // KAMER_FLOOR) sit above the ground floor, and the building under them is hidden from view while you are in it (a pand only
  // blocks where it is drawn). This does not depend on the map having a height model.
  if (z > 4 || z < -3.5) return [x, y];
  [x, y] = resolveWalkerProps(x, y, radius, vx, vy, opts, hop, z);
  // Een leuning staat op het dek; wie eronder zwemt (onder een brug of in een
  // sluis) of over een hoger viaduct loopt, hoort niet tegen de leuning boven
  // het water te botsen (#502).
  if (z > STREET_LEVEL_Z && z < STREET_LEVEL_TOP) [x, y] = resolveRailings(x, y, radius, map, hop);
  // moored houseboats along the quays are solid too
  const hb = pushOutOfWaterObstacles(map, x, y, radius);
  if (hb) [x, y] = hb;
  return resolveBuildingCollisions(x, y, radius, map, hop, !(opts && opts.noWalls), z);
}

function isInsideBuilding(map, x, y) {
  return !!buildingAt(map, x, y);
}

// Sides as multipliers of the vehicle's (-sin, cos) normal, which is its
// right-hand side (three.z = world.y). Drivers get out on the left (NL),
// passengers on the right.
export const EXIT_LEFT_FIRST = [-1, 1];
export const EXIT_RIGHT_FIRST = [1, -1];

export function findExitSpot(v, radius, map, sides = EXIT_LEFT_FIRST) {
  const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  const off = v.halfWid + 0.7;
  // Een boot vaart op het water: onder een brug zegt isInWater 'droog' (het
  // dek erboven), maar een stap uit de boot hoort daar niet op het water te
  // landen. Voor een boot telt daarom het water zelf (#502, playtest 27-10:
  // bij de sluis door de grond zakken).
  const dry = v.isBoat ? (x, y) => !inMapWater(map, x, y) : (x, y) => !isInWater(map, x, y);
  for (const s of sides) {
    const ex = v.x + nx * off * s, ey = v.y + ny * off * s;
    if (isInsideBuilding(map, ex, ey) || !dry(ex, ey)) continue;
    return resolveBuildingCollisions(ex, ey, radius, map);
  }
  // an alley narrower than the car: out the front or the back instead
  const hl = (v.halfLen || v.halfWid * 2) + 0.7, fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  for (const s of [1, -1]) {
    const ex = v.x + fx * hl * s, ey = v.y + fy * hl * s;
    if (!isInsideBuilding(map, ex, ey) && dry(ex, ey)) return resolveBuildingCollisions(ex, ey, radius, map);
  }
  // Een sluis is smal en ligt vaak onder een brug: de kant is een paar meter
  // verder. Zonder deze stap zet een boot in de kolk de speler op het water
  // onder de brug (waar isInWater 'droog' zegt) en ziet hij door de grond (#502).
  if (v.isBoat) {
    const bank = nearestBank(map, v.x, v.y, radius, BOAT_STEP_REACH);
    if (bank) return bank;
  }
  return map.escapeBuilding(v.x + nx * off * sides[0], v.y + ny * off * sides[0]);
}

// Droge plek op de kant voor een boot: ringen naar buiten tot `reach` m. De
// eerste is de dichtstbijzijnde oever; water en gebouwen tellen niet mee.
const BOAT_STEP_REACH = 10;
function nearestBank(map, x, y, radius, reach) {
  for (let r = Math.max(1, radius + 0.4); r <= reach; r += 0.5) {
    const n = Math.max(12, Math.ceil(r * 8));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (inMapWater(map, px, py) || isInsideBuilding(map, px, py)) continue;
      if (map.isOpenSpot && !map.isOpenSpot(px, py)) continue;
      return resolveBuildingCollisions(px, py, radius, map);
    }
  }
  return null;
}
