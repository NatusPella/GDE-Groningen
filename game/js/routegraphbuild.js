// De opbouw van de routegraaf (routing.js buildGraph) als hervatbare stappen (#1008). De volledige opbouw kost ~250 ms op de
// hoofdthread op de echte stadswereld, achter elkaar: een hapering van een kwart seconde bij elke tegelwissel. Hier is dezelfde
// berekening een generator die na een klein aantal wegen en na elke CSR-/componentenstap `yield`t; `runSteps` draait hem
// in porties met een tijdbudget (routing.js ensureGraph, een portie per beeld). Zuiver (geen THREE, geen DOM, geen kaart):
// scripts/routegraphbuild_test.mjs bewijst dat stap voor stap bouwen dezelfde graaf geeft als achter elkaar.
//
// h = { isDrivable, isWalkable, isBikeable, oneWayFor(road, mode), throughOf(road, i, ax, ay, bx, by) -> bool, consts }
// consts = { THROUGH_BUILDING_COST, SERVICE_COST, OFFROAD_COST, STEPS_COST, MOTORWAY_AVOID, BIKE_COST, MOTORWAY_TYPES }
export const ROADS_PER_STEP = 250;
export const EDGES_PER_STEP = 40000;

export function* graphBuildSteps(graphRoads, h) {
  const { THROUGH_BUILDING_COST, SERVICE_COST, OFFROAD_COST, STEPS_COST, MOTORWAY_AVOID, BIKE_COST, MOTORWAY_TYPES } = h.consts;
  const ids = new Map();
  const xs = [], ys = [];
  const roadNodes = new Map();
  const drive = [], driveRoad = [], walk = [], walkRoad = [], mixed = [], bike = [], bikeRoad = [], driveAvoid = [];
  const nodeOf = (x, y) => {
    const key = (Math.round(x * 2) + 32768) * 65536 + (Math.round(y * 2) + 32768);
    let id = ids.get(key);
    if (id === undefined) {
      id = xs.length;
      ids.set(key, id);
      xs.push(x);
      ys.push(y);
    }
    return id;
  };
  for (let ri = 0; ri < graphRoads.length; ri++) {
    if (ri && ri % ROADS_PER_STEP === 0) yield 'wegen';
    const road = graphRoads[ri];
    const n = road.pts.length;
    const rn = new Int32Array(n);
    for (let i = 0; i < n; i++) rn[i] = nodeOf(road.pts[i][0], road.pts[i][1]);
    roadNodes.set(road, rn);
    const canDrive = h.isDrivable(road);
    const canWalk = h.isWalkable(road);
    const canBike = h.isBikeable(road);
    const bikeOne = canBike && h.oneWayFor(road, 'fiets');
    const mw = MOTORWAY_TYPES.has(road.type);
    for (let i = 0; i < n - 1; i++) {
      const a = rn[i], b = rn[i + 1];
      if (a === b) continue;
      const geo = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
      const len = !road.bridge && h.throughOf(road, i, xs[a], ys[a], xs[b], ys[b]) ? geo * THROUGH_BUILDING_COST : geo;
      if (canWalk) {
        walk.push(a, b, len, b, a, len);
        walkRoad.push(ri, ri);
      }
      if (canBike) {
        const bl = len * (BIKE_COST[road.cat] ?? 1);
        bike.push(a, b, bl); bikeRoad.push(ri);
        if (!bikeOne) { bike.push(b, a, bl); bikeRoad.push(ri); }
      }
      if (canDrive) {
        const dl = road.type === 'service' || road.type === 'track' ? len * SERVICE_COST : len;
        drive.push(a, b, dl); driveRoad.push(ri);
        const al = mw ? dl * MOTORWAY_AVOID : dl;
        driveAvoid.push(a, b, al);
        mixed.push(a, b, dl);
        if (!road.oneway) { drive.push(b, a, dl); driveRoad.push(ri); driveAvoid.push(b, a, al); mixed.push(b, a, dl); }
      } else if (!road.busOnly) {
        const ml = len * (road.type === 'steps' ? STEPS_COST : OFFROAD_COST);
        mixed.push(a, b, ml, b, a, ml);
      }
    }
  }
  yield 'wegen klaar';
  const N = xs.length;
  // een CSR van 100.000+ kanten is een enkele stap te groot: ook hier een yield per blok kanten
  const csr = function* (flat, extra = null) {
    const m = flat.length / 3;
    const offsets = new Int32Array(N + 1);
    for (let e = 0; e < m; e++) { offsets[flat[e * 3] + 1]++; if (e && e % EDGES_PER_STEP === 0) yield 'tellen'; }
    for (let i = 0; i < N; i++) offsets[i + 1] += offsets[i];
    const fill = offsets.slice(0, N);
    const to = new Int32Array(m), len = new Float32Array(m);
    const road = extra ? new Int32Array(m) : null;
    for (let e = 0; e < m; e++) {
      if (e && e % EDGES_PER_STEP === 0) yield 'vullen';
      const k = fill[flat[e * 3]]++;
      to[k] = flat[e * 3 + 1];
      len[k] = flat[e * 3 + 2];
      if (road) road[k] = extra[e];
    }
    return { start: offsets, to, len, road };
  };
  const components = (adj) => {
    const comp = new Int32Array(N).fill(-1);
    const stack = [];
    let best = -1, bestSize = 0, id = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (comp[s0] >= 0 || adj.start[s0] === adj.start[s0 + 1]) continue;
      comp[s0] = id;
      stack.push(s0);
      let size = 0;
      while (stack.length) {
        const u = stack.pop();
        size++;
        for (let e = adj.start[u]; e < adj.start[u + 1]; e++) {
          const v = adj.to[e];
          if (comp[v] < 0) { comp[v] = id; stack.push(v); }
        }
      }
      if (size > bestSize) { bestSize = size; best = id; }
      id++;
    }
    return { comp, main: best };
  };
  const walkAdj = yield* csr(walk, walkRoad); yield 'walk';
  const bikeAdj = yield* csr(bike, bikeRoad); yield 'bike';
  const bikeUndirected = [];
  for (let i = 0; i < bike.length; i += 3) { bikeUndirected.push(bike[i], bike[i + 1], bike[i + 2], bike[i + 1], bike[i], bike[i + 2]); if (i && i % (EDGES_PER_STEP * 3) === 0) yield 'bike-ongericht'; }
  const driveUndirected = [];
  for (let i = 0; i < drive.length; i += 3) { driveUndirected.push(drive[i], drive[i + 1], drive[i + 2], drive[i + 1], drive[i], drive[i + 2]); if (i && i % (EDGES_PER_STEP * 3) === 0) yield 'drive-ongericht'; }
  yield 'undirected';
  const driveFree = yield* csr(driveUndirected); yield 'free';
  const walkComp = components(walkAdj); yield 'walkcomp';
  const driveComp = components(driveFree); yield 'drivecomp';
  const driveAdj = yield* csr(drive, driveRoad); yield 'drive';
  const driveAvoidAdj = yield* csr(driveAvoid, driveRoad); yield 'avoid';
  const bikeComp = components(yield* csr(bikeUndirected)); yield 'bikecomp';
  const mixedAdj = yield* csr(mixed);
  return {
    N,
    walkComp,
    driveComp,
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    roadNodes,
    drive: driveAdj,
    driveAvoid: driveAvoidAdj,
    bike: bikeAdj,
    bikeComp,
    free: driveFree,
    mixed: mixedAdj,
    walk: walkAdj,
  };
}

// Draait `gen` tot het budget (ms) op is; minstens één stap per aanroep, zodat het altijd vordert. Geeft { done, value, steps, ms }.
export function runSteps(gen, budgetMs = Infinity, now = () => performance.now()) {
  const t0 = now();
  let steps = 0;
  for (;;) {
    const r = gen.next();
    steps++;
    if (r.done) return { done: true, value: r.value, steps, ms: now() - t0 };
    if (now() - t0 >= budgetMs) return { done: false, value: null, steps, ms: now() - t0 };
  }
}
