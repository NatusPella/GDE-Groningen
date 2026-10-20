// What the map works out from raw footprints, roads, water and rails before
// it draws or collides with them: doubled footprints, roof steps, platform
// roofs (canopies), bridge machinery, moored houseboats and footprints on a
// ring carriageway. The GameMap constructor (mapdata.js) runs it on the
// city; the province tile build (scripts/world/build_province.mjs) runs the
// same code per pack, so a village gets what the city gets.
import { polygonBounds, pointInPolygon } from './util.js';
import { waterPolyIn } from './waterlevels.js';

// OSM sometimes has the same footprint twice (e.g. Forum Groningen). Two
// identical extrusions z-fight over their whole roof, so keep one - the
// landmark-tagged copy if there is one.
function dedupeBuildings(list) {
  const byKey = new Map();
  const out = [];
  for (const b of list) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    const key = `${Math.round(minx * 4)},${Math.round(miny * 4)},${Math.round(maxx * 4)},${Math.round(maxy * 4)},${b.pts.length}`;
    const i = byKey.get(key);
    if (i === undefined) { byKey.set(key, out.length); out.push(b); continue; }
    const prev = out[i];
    if (!prev.landmark && b.landmark) out[i] = b;
    else if (!prev.name && b.name) prev.name = b.name;
    out[i].h = Math.max(prev.h, b.h);
  }
  return out;
}

// A footprint sitting inside another of the same height (OSM building parts)
// would share its roof plane and z-fight; lift the inner one 0.4 m so it
// reads as a deliberate roof step. Renderers add b.lift to the wall depth.
export function liftNestedRoofs(list, grid) {
  for (const b of list) {
    const P = b.pts;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = P.length; i < n; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % n];
      const c = x0 * y1 - x1 * y0;
      a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
    if (Math.abs(a) < 1e-6) continue;
    cx /= 3 * a; cy /= 3 * a;
    for (const o of grid.query(cx, cy, cx, cy)) {
      if (o === b || o.lift || Math.abs(o.h - b.h) > 0.05) continue;
      const [minx, miny, maxx, maxy] = o.bounds;
      if (cx <= minx || cx >= maxx || cy <= miny || cy >= maxy) continue;
      if (pointInPolygon(cx, cy, o.pts)) { b.lift = 0.4; break; }
    }
  }
  // footprints that only partly overlap: the smaller one steps up (pairs met
  // in a fine grid, each judged once in the cell holding their overlap's corner)
  const top = (b) => b.h + (b.lift || 0) / 3.1;
  const area = (b) => (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]);
  const G = 16, cells = new Map();
  for (const b of list) {
    const [x0, y0, x1, y1] = b.bounds;
    for (let i = Math.floor(x0 / G); i <= Math.floor(x1 / G); i++) {
      for (let j = Math.floor(y0 / G); j <= Math.floor(y1 / G); j++) {
        const k = i * 100003 + j;
        const c = cells.get(k);
        if (c) c.push(b); else cells.set(k, [b]);
      }
    }
  }
  const steps = [];
  for (const [k, c] of cells) {
    for (let p = 0; p < c.length; p++) {
      const b = c[p];
      for (let q = p + 1; q < c.length; q++) {
        const o = c[q];
        if (Math.abs(o.h - b.h) > 0.02 || (o.lift || 0) !== (b.lift || 0)) continue;
        const x0 = Math.max(b.bounds[0], o.bounds[0]), y0 = Math.max(b.bounds[1], o.bounds[1]);
        const x1 = Math.min(b.bounds[2], o.bounds[2]), y1 = Math.min(b.bounds[3], o.bounds[3]);
        if (x1 - x0 < 0.5 || y1 - y0 < 0.5 || Math.floor(x0 / G) * 100003 + Math.floor(y0 / G) !== k) continue;
        const inRect = ([x, y]) => x > x0 && x < x1 && y > y0 && y < y1;
        if (!o.pts.some((v) => inRect(v) && pointInPolygon(v[0], v[1], b.pts)) && !b.pts.some((v) => inRect(v) && pointInPolygon(v[0], v[1], o.pts))) continue;
        let hit = 0;
        for (let x = x0 + 0.25; x < x1 && hit < 4; x += 0.5) {
          for (let y = y0 + 0.25; y < y1 && hit < 4; y += 0.5) if (pointInPolygon(x, y, b.pts) && pointInPolygon(x, y, o.pts)) hit++;
        }
        if (hit >= 4) steps.push(area(b) <= area(o) ? b : o);
      }
    }
  }
  for (const b of new Set(steps)) b.lift = (b.lift || 0) + 0.4;
}

function buildingsOverRails(buildings, rails) {
  return buildingsCrossedBy(buildings, rails.map((r) => r.pts || r), 4);
}

// Low footprints a bridge deck runs through at the waterside are bridge
// machinery / abutments mapped as buildings; extruded they become a solid
// wall straight across the carriageway, so they are dropped.
function bridgeStructures(buildings, roads, water) {
  const crossed = buildingsCrossedBy(buildings, roads.filter((r) => r.bridge).map((r) => r.pts), 1);
  const out = new Set();
  const wet = (x, y) => !!waterPolyIn(water, x, y);
  for (const b of crossed) {
    if (b.h > 4 || b.name || b.landmark || b.type === 'houseboat') continue;
    if (b.pts.some(([x, y]) => [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => wet(x + dx, y + dy)))) out.add(b);
  }
  return out;
}

// Houseboats OSM draws (partly) over the bank: slid the shortest way out onto
// open water, clear of other footprints; one that cannot float is dropped.
function mooredHouseboats(buildings, water) {
  const boats = buildings.filter((b) => b.type === 'houseboat');
  if (!boats.length) return new Set();
  const dropped = new Set();
  const box = new Map();
  const boundsOf = (b) => box.get(b) || box.set(b, polygonBounds(b.pts)).get(b);
  // only the footprints near a boat that is (partly) on the bank: a 64 m grid
  let grid = null;
  const G = 64;
  const near = (x0, y0, x1, y1) => {
    if (!grid) {
      grid = new Map();
      for (const o of buildings) {
        // a boat may still slide up to 8 m
        const ob = boundsOf(o), e = o.type === 'houseboat' ? 8 : 0;
        for (let i = Math.floor((ob[0] - e) / G); i <= Math.floor((ob[2] + e) / G); i++) {
          for (let j = Math.floor((ob[1] - e) / G); j <= Math.floor((ob[3] + e) / G); j++) {
            const k = i * 100003 + j, c = grid.get(k);
            if (c) c.push(o); else grid.set(k, [o]);
          }
        }
      }
    }
    const out = new Set();
    for (let i = Math.floor(x0 / G); i <= Math.floor(x1 / G); i++) {
      for (let j = Math.floor(y0 / G); j <= Math.floor(y1 / G); j++) for (const o of grid.get(i * 100003 + j) || []) out.add(o);
    }
    return out;
  };
  for (const b of boats) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    const R = 10;
    const pools = water.filter((w) => {
      const wb = w.bounds || (w.bounds = polygonBounds(w.pts));
      return wb[0] < maxx + R && wb[2] > minx - R && wb[1] < maxy + R && wb[3] > miny - R;
    });
    const wet = (x, y) => !!waterPolyIn(pools, x, y);
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const samples = b.pts.map(([x, y]) => {
      const dx = cx - x, dy = cy - y, l = Math.hypot(dx, dy) || 1, k = Math.min(0.3, l / 2) / l;
      return [x + dx * k, y + dy * k];
    });
    for (let x = minx + 0.4; x < maxx; x += 0.8) for (let y = miny + 0.4; y < maxy; y += 0.8) if (pointInPolygon(x, y, b.pts)) samples.push([x, y]);
    const dry = (ox, oy) => samples.reduce((n, [x, y]) => n + (wet(x + ox, y + oy) ? 0 : 1), 0);
    if (dry(0, 0) <= samples.length * 0.03) continue;
    const others = [...near(minx - R, miny - R, maxx + R, maxy + R)].filter((o) => {
      if (o === b || dropped.has(o)) return false;
      const ob = boundsOf(o);
      return ob[0] < maxx + R && ob[2] > minx - R && ob[1] < maxy + R && ob[3] > miny - R;
    });
    const clear = (ox, oy) => !others.some((o) => {
      const ob = boundsOf(o);
      if (ob[0] > maxx + ox || ob[2] < minx + ox || ob[1] > maxy + oy || ob[3] < miny + oy) return false;
      return samples.some(([x, y]) => pointInPolygon(x + ox, y + oy, o.pts)) || o.pts.some(([x, y]) => pointInPolygon(x - ox, y - oy, b.pts));
    });
    let shift = null;
    for (let d = 0.5; d <= 8 && !shift; d += 0.5) {
      for (let a = 0; a < 16 && !shift; a++) {
        const ox = Math.cos(a * Math.PI / 8) * d, oy = Math.sin(a * Math.PI / 8) * d;
        if (dry(ox, oy) === 0 && clear(ox, oy)) shift = [ox, oy];
      }
    }
    if (shift) { b.pts = b.pts.map(([x, y]) => [x + shift[0], y + shift[1]]); box.delete(b); }
    else dropped.add(b);
  }
  return dropped;
}

const RING_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
export const isRingRoad = (r) => RING_TYPES.has(r.type) || (!!r.z && r.cat === 'major');

// Footprints on a ring carriageway that the road would run into: at street
// level or sunken below it, or a deck too low to clear the roof.
function buildingsOnRing(buildings, roads) {
  const lines = [], zs = [];
  for (const r of roads) {
    if (!isRingRoad(r)) continue;
    const off = Math.max(0, r.width / 2 - 0.8);
    const P = r.pts;
    for (const o of off ? [-off, 0, off] : [0]) {
      const L = [], Z = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        L.push([P[i][0] - dy / l * o, P[i][1] + dx / l * o]);
        Z.push(r.z ? r.z[i] : 0);
      }
      lines.push(L);
      zs.push(Z);
    }
  }
  const out = new Set();
  const hit = buildingsCrossedBy(buildings, lines, 1.5, zs);
  for (const [b, z] of hit) {
    if (b.landmark) continue;
    if (z < b.h + 3.5) out.add(b);
  }
  return out;
}

function buildingsCrossedBy(buildings, lines, step, zs = null) {
  // with zs (a height per line vertex): a Map building -> lowest height hit
  const out = zs ? new Map() : new Set();
  if (!lines.length) return out;
  const samples = [];
  lines.forEach((P, li) => {
    const Z = zs && zs[li];
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let k = 0; k < n; k++) {
        samples.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, Z ? Z[i] + (Z[i + 1] - Z[i]) * k / n : 0]);
      }
    }
  });
  const G = 40, cells = new Map();
  for (const p of samples) {
    const k = Math.floor(p[0] / G) + ',' + Math.floor(p[1] / G);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(p);
  }
  for (const b of buildings) {
    const [minx, miny, maxx, maxy] = polygonBounds(b.pts);
    search: for (let cx = Math.floor(minx / G); cx <= Math.floor(maxx / G); cx++) {
      for (let cy = Math.floor(miny / G); cy <= Math.floor(maxy / G); cy++) {
        for (const [x, y, z] of cells.get(cx + ',' + cy) || []) {
          if (x <= minx || x >= maxx || y <= miny || y >= maxy) continue;
          if (!pointInPolygon(x, y, b.pts)) continue;
          if (!zs) { out.add(b); break search; }
          if (!out.has(b) || z < out.get(b)) out.set(b, z);
        }
      }
    }
  }
  return out;
}

// The buildings and canopies of raw footprints: bridge machinery dropped,
// doubled footprints merged, platform roofs and open canopies (building=roof)
// split off, footprints on a ring carriageway and houseboats that cannot
// float dropped. data: { buildings, roads, water, rails?, ringRoads? }
// (ringRoads: the roads to test footprints on a ring carriageway against;
// the roads, when absent. A map without height profiles leaves out the ones
// that run over or under the street.)
// (Footprints on the ring: the covers the sunken Zuidelijke Ringweg runs
// under and sheds mapped on its carriageways are a block across the road when
// extruded, a roof floating over the cutting as a canopy; the tunnel roof and
// the ground over it are drawn by roadstructures3d / terrain3d.)
export function deriveBuildings(data) {
  const bridgeParts = bridgeStructures(data.buildings, data.roads, data.water);
  const all = dedupeBuildings(data.buildings.filter((b) => !bridgeParts.has(b)));
  const overRails = buildingsOverRails(all, data.rails || []);
  const onRing = buildingsOnRing(all, data.ringRoads || data.roads);
  // (b.canopy: a roof the tile build already derived as one, put back in the city's data by stad_laag.mjs)
  const isCanopy = (b) => b.type === 'roof' || b.canopy === true || overRails.has(b);
  const canopies = all.filter((b) => isCanopy(b) && !onRing.has(b));
  const sunkBoats = mooredHouseboats(all, data.water);
  const buildings = all.filter((b) => !isCanopy(b) && !onRing.has(b) && !sunkBoats.has(b));
  return { buildings, canopies };
}

