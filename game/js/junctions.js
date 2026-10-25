// Junction analysis shared by the traffic lights, road markings, traffic
// signs and the traffic AI, so what the player sees painted on the road is
// what the AI actually obeys:
//   roadPriority(r)        priority class from the OSM road type
//   junctionIndex(map)     car junction nodes with their arms
//   autoSignals(map)       extra signalised junctions (busy crossings of
//                          main roads that OSM left without traffic signals)
//   allSignals(map)        OSM signals + autoSignals
//   yieldArms(map)         arms that must give way (haaientanden + B6 sign)
//   yieldAt(map, road, i)  whether `road` gives way at its vertex i

import { SpatialGrid } from './spatialgrid.js';
import { poiLayerPlaces } from './poisections.js';

const CAR_CATS = new Set(['major', 'normal', 'minor']);
const TYPE_RANK = {
  motorway: 7, trunk: 7, primary: 6, secondary: 5, tertiary: 4,
  motorway_link: 5, trunk_link: 5, primary_link: 5, secondary_link: 4, tertiary_link: 3,
  unclassified: 2, residential: 2, busway: 2, living_street: 1, service: 0, track: 0,
};

const nodeKey = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);

export function roadPriority(r) {
  if (!r) return 0;
  if (r.roundabout) return 9;
  return TYPE_RANK[r.type] ?? 1;
}

const cache = new WeakMap();
function store(map) {
  let s = cache.get(map);
  if (!s) cache.set(map, s = {});
  return s;
}

// key -> { key, x, y, arms: [{ road, idx, d, ux, uy, rank, enter }] }
// ux, uy: unit direction of the arm pointing away from the node;
// enter: traffic can drive along the arm into the node.
export function junctionIndex(map) {
  const s = store(map);
  if (s.nodes) return s.nodes;
  const at = new Map();
  for (const r of map.roads) {
    if (!CAR_CATS.has(r.cat) || r.pts.length < 2) continue;
    r.pts.forEach((p, idx) => {
      const k = nodeKey(p);
      let a = at.get(k);
      if (!a) at.set(k, a = []);
      a.push(r, idx);
    });
  }
  const nodes = new Map();
  for (const [k, list] of at) {
    let n = 0;
    for (let i = 0; i < list.length; i += 2) n += (list[i + 1] > 0) + (list[i + 1] < list[i].pts.length - 1);
    if (n < 3) continue;
    const arms = [];
    for (let i = 0; i < list.length; i += 2) {
      const r = list[i], idx = list[i + 1];
      for (const d of [-1, 1]) {
        const j = idx + d;
        if (j < 0 || j >= r.pts.length) continue;
        const p = r.pts[idx];
        // direction a few metres out, so a tiny kink at the node doesn't skew it
        let q = r.pts[j], acc = Math.hypot(q[0] - p[0], q[1] - p[1]), jj = j;
        while (acc < 6 && jj + d >= 0 && jj + d < r.pts.length) {
          jj += d;
          acc += Math.hypot(r.pts[jj][0] - r.pts[jj - d][0], r.pts[jj][1] - r.pts[jj - d][1]);
          q = r.pts[jj];
        }
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        arms.push({ road: r, idx, d, ux: (q[0] - p[0]) / L, uy: (q[1] - p[1]) / L, rank: roadPriority(r), enter: !r.oneway || d < 0 });
      }
    }
    const p = list[0].pts[list[1]];
    nodes.set(k, { key: k, x: p[0], y: p[1], arms });
  }
  s.nodes = nodes;
  return nodes;
}

function graded(node) {
  return node.arms.some((a) => a.road.z && Math.abs(a.road.z[a.idx]) > 0.3);
}

// Two entering streams that cross (not the same or opposite direction).
function hasConflict(arms) {
  const ent = arms.filter((a) => a.enter);
  for (let i = 0; i < ent.length; i++) {
    for (let j = i + 1; j < ent.length; j++) {
      if (Math.abs(ent[i].ux * ent[j].uy - ent[i].uy * ent[j].ux) > 0.5) return true;
    }
  }
  return false;
}

const AUTO_MIN_GAP = 70;

// Main-road crossings without signals: at least two main roads (secondary
// and up) through the node, or a main road crossed by a busy tertiary.
export function autoSignals(map) {
  const s = store(map);
  if (s.auto) return s.auto;
  const osm = poiLayerPlaces(map, 'trafficLights');
  const taken = osm.filter((l) => !l.bike).map((l) => [l.x, l.y]);
  const cands = [];
  for (const node of junctionIndex(map).values()) {
    if (graded(node) || node.arms.some((a) => a.road.roundabout)) continue;
    const roads = new Set(node.arms.filter((a) => a.road.type !== 'service' && a.road.type !== 'track').map((a) => a.road));
    const names = new Set();
    let main = 0, tert = 0, links = 0, wide = 0;
    for (const r of roads) {
      const k = r.name || r;
      if (names.has(k)) continue;
      names.add(k);
      if (/_link$/.test(r.type)) links++;
      const rk = roadPriority(r);
      if (rk >= 5) main++;
      else if (rk === 4) tert++;
      if ((r.width || 0) >= 8) wide++;
    }
    if (links && main + tert <= links + 1) continue;
    const busy = main >= 2 || (main >= 1 && tert >= 1 && wide >= 1) || tert >= 3;
    if (!busy || !hasConflict(node.arms) || node.arms.filter((a) => a.enter).length < 3) continue;
    cands.push({ x: node.x, y: node.y, score: main * 2 + tert + wide * 0.5 });
  }
  cands.sort((a, b) => b.score - a.score);
  const out = [];
  for (const c of cands) {
    if (taken.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < AUTO_MIN_GAP)) continue;
    taken.push([c.x, c.y]);
    out.push({ x: c.x, y: c.y, auto: true });
  }
  s.auto = out;
  return out;
}

export function allSignals(map) {
  const s = store(map);
  if (!s.all) s.all = [...poiLayerPlaces(map, 'trafficLights'), ...autoSignals(map)];
  return s.all;
}

const SIGNAL_REACH = 30;

function signalised(map, x, y) {
  const s = store(map);
  if (!s.sigGrid) {
    s.sigGrid = new SpatialGrid(50);
    for (const l of allSignals(map)) {
      if (l.bike) continue;
      s.sigGrid.insertPoint(l, l.x, l.y);
    }
  }
  for (const l of s.sigGrid.queryRadius(x, y, SIGNAL_REACH)) if (Math.hypot(l.x - x, l.y - y) < SIGNAL_REACH) return true;
  return false;
}

// Arms that give way at an unsignalised junction: a lower priority class
// than the best other road there. Driveways and living streets are exits
// (uitritten) and get no markings. J: distance from the node to the edge of
// the crossing carriageway, where the teeth and the sign stand.
export function yieldArms(map) {
  const s = store(map);
  if (s.yields) return s.yields;
  const out = [];
  for (const node of junctionIndex(map).values()) {
    if (graded(node) || signalised(map, node.x, node.y)) continue;
    for (const a of node.arms) {
      if (!a.enter || a.rank < 2 || a.road.roundabout) continue;
      let best = -1, J = 0;
      for (const o of node.arms) {
        if (o.road === a.road) continue;
        best = Math.max(best, o.rank);
        const cos = a.ux * o.ux + a.uy * o.uy;
        if (Math.abs(cos) > 0.9) continue;
        J = Math.max(J, ((o.road.width || 6) / 2) / Math.sqrt(1 - cos * cos) + (a.road.width || 6) / 2 * Math.abs(cos) + 1);
      }
      if (best <= a.rank) continue;
      out.push({ node, road: a.road, idx: a.idx, d: a.d, ux: a.ux, uy: a.uy, J: Math.min(16, Math.max(3, J)), roundabout: best === 9 });
    }
  }
  s.yields = out;
  s.yieldSet = new Set(out.map((y) => y.road.pts[y.idx] && (y.idx + ':' + y.d + ':' + nodeKey(y.road.pts[y.idx]) + ':' + mapRoadId(map, y.road))));
  return out;
}

// The junction model (docs/PROVINCIE-PLAN.md 2.13): one object per car
// junction node that the markings, the signs, the traffic AI and the tiles
// read. key -> { key, x, y, control, arms } with
//   control  'signals'    a signal controller (OSM or autoSignals)
//            'roundabout' the ring has right of way, every entry gives way
//            'priority'   a higher class road: the others give way
//                         (haaientanden, B6), driveways and living streets
//                         are exits (uitritten) and give way too
//            'equal'      equal roads: traffic from the right first (NL)
//            'graded'     a node off street level (a slip road joining)
// and per arm { road, idx, d, ux, uy, rank, enter, rule, stop }:
//   rule  'signal' | 'priority' | 'yield' | 'exit' | 'right' | 'free'
//   stop  metres from the node to where an entering car stops: the edge of
//         the crossing carriageway (the teeth, the stop line), 3-16 m
export function junctionModel(map) {
  const s = store(map);
  if (s.model) return s.model;
  const out = new Map();
  for (const node of junctionIndex(map).values()) {
    const sig = !graded(node) && signalised(map, node.x, node.y);
    const ring = node.arms.some((a) => a.road.roundabout);
    const car = node.arms.filter((a) => a.rank >= 2);
    const best = Math.max(-1, ...node.arms.map((a) => a.rank));
    const worstMain = Math.min(...(car.length ? car : node.arms).map((a) => a.rank));
    const control = graded(node) ? 'graded' : sig ? 'signals' : ring ? 'roundabout' : best > worstMain ? 'priority' : 'equal';
    const arms = node.arms.map((a) => {
      let J = 0;
      for (const o of node.arms) {
        if (o.road === a.road) continue;
        const cos = a.ux * o.ux + a.uy * o.uy;
        if (Math.abs(cos) > 0.9) continue;
        J = Math.max(J, ((o.road.width || 6) / 2) / Math.sqrt(1 - cos * cos) + (a.road.width || 6) / 2 * Math.abs(cos) + 1);
      }
      const rule = control === 'graded' ? 'free'
        : control === 'signals' ? 'signal'
          : control === 'roundabout' ? (a.road.roundabout ? 'priority' : a.rank < 2 ? 'exit' : 'yield')
            : control === 'priority' ? (a.rank >= best ? 'priority' : a.rank < 2 ? 'exit' : 'yield')
              : a.rank < 2 && best >= 2 ? 'exit' : 'right';
      return { road: a.road, idx: a.idx, d: a.d, ux: a.ux, uy: a.uy, rank: a.rank, enter: a.enter, rule, stop: Math.min(16, Math.max(3, J)) };
    });
    out.set(node.key, { key: node.key, x: node.x, y: node.y, control, arms });
  }
  s.model = out;
  return out;
}

// The junction model as tile rows (the JUNCTIONS section, pack_tiles.mjs):
// { k: node key, p: [[x, y]], c: control, a: [[road gid, idx, d, rule, stop
// (m), enters], ...] }, the road gid being its place in map.roads.
export const RULES = ['free', 'signal', 'priority', 'yield', 'exit', 'right'];
export function junctionRows(map) {
  const gid = new Map(map.roads.map((r, i) => [r, i]));
  const out = [];
  for (const J of junctionModel(map).values()) {
    out.push({
      k: J.key, p: [[J.x, J.y]], c: J.control,
      a: J.arms.map((a) => [gid.get(a.road), a.idx, a.d, RULES.indexOf(a.rule), Math.round(a.stop * 100) / 100, a.enter ? 1 : 0]),
    });
  }
  return out.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
}

// The arm of the junction at road's vertex idx that traffic travelling
// approachDir along the road (+1: towards higher indices) enters by, or null.
export function junctionArm(map, road, idx, approachDir) {
  const J = junctionModel(map).get(nodeKey(road.pts[idx]));
  if (!J) return null;
  for (const a of J.arms) if (a.road === road && a.idx === idx && a.d === -approachDir) return a;
  return null;
}

let roadIds = new WeakMap();
function mapRoadId(map, r) {
  let id = roadIds.get(r);
  if (id === undefined) {
    const s = store(map);
    s.nextId = (s.nextId || 0) + 1;
    id = s.nextId;
    roadIds.set(r, id);
  }
  return id;
}

// d: +1 when the approach arrives travelling towards higher vertex indices.
export function yieldAt(map, road, idx, approachDir) {
  const s = store(map);
  if (!s.yieldSet) yieldArms(map);
  return s.yieldSet.has(idx + ':' + -approachDir + ':' + nodeKey(road.pts[idx]) + ':' + mapRoadId(map, road));
}
