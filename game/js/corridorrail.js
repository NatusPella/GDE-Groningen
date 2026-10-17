// The rail lines of the tile world (docs/PROVINCIE-PLAN.md 3.2: "alle lijnen
// echt"): the city's train routes run on over the layers' track
// (index-provincie.json / index-corridor.json global.routes, scripts/world/
// build_province.mjs, build_corridor.mjs) to every station the data reaches:
// Appingedam and Delfzijl, Baflo ... Uithuizen, Roodeschool and Eemshaven.
// Pure data, no side effects but applyCityRoutes: the builders run
// extendRoutes / provinceRailLines once (scripts/world/cityroutes.mjs) and
// write the result next to the layer (the rail file); main.js splices it onto
// the city's routes (scripts/world/cityroutes_src.json holds the six routes
// with the track out to their last stop in the old data).

export const LINE_ROUTE = { 'spoor-delfzijl': 'Stoptrein Delfzijl', 'spoor-eemshaven': 'Stoptrein Roodeschool' };

const flat = (P) => P.flatMap(([x, y]) => [x, y]);
const r1 = (v) => Math.round(v * 10) / 10;

// The point index of polyline P (flat [x, y, ...]) at arc length s, and the
// polyline cut there.
function cutAt(P, s) {
  let acc = 0;
  for (let i = 2; i < P.length; i += 2) {
    const d = Math.hypot(P[i] - P[i - 2], P[i + 1] - P[i - 1]);
    if (acc + d >= s) {
      const t = d ? (s - acc) / d : 0;
      return P.slice(0, i).concat([P[i - 2] + (P[i] - P[i - 2]) * t, P[i - 1] + (P[i + 1] - P[i - 1]) * t]);
    }
    acc += d;
  }
  return P.slice();
}

function arcPoints(P) {
  const out = [[P[0][0], P[0][1], 0]];
  for (let i = 1; i < P.length; i++) out.push([P[i][0], P[i][1], out[i - 1][2] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])]);
  return out;
}

// { routes, stations, added } : copies of om.routes and om.stations with the
// lines run on; `added` lists the stations that came in. A route only grows
// when the corridor line passes its last on-map stop.
export function extendRoutes(om, corridor) {
  const routes = (om.routes || []).map((r) => ({ ...r, stops: r.stops.map((q) => ({ ...q })) }));
  const stations = (om.stations || []).map((s) => ({ ...s }));
  const added = [];
  if (!corridor || !corridor.routes) return { routes, stations, added };
  const byKey = new Map((corridor.stations || []).map((s) => [s.key, s]));
  for (const line of corridor.routes) {
    const route = routes.find((r) => r.name === (line.route || LINE_ROUTE[line.id]));
    if (!route || !line.pts || line.pts.length < 2) continue;
    const onmap = route.stops.filter((q) => !q.offmap);
    const last = onmap[onmap.length - 1];
    if (!last) continue;
    const k = line.stops.findIndex((q) => q.name === last.name);
    if (k < 0 || k === line.stops.length - 1) continue;
    // the corridor line after the last stop the Ommeland route knows, from
    // the point of it nearest to where the route is at that stop
    const A = arcPoints(line.pts);
    const head = cutAt(route.pts, last.s);
    const ex = head[head.length - 2], ey = head[head.length - 1];
    // (on the line's segments: a simplified straight track has few vertices)
    let j = 0, jd = Infinity, sL = 0;
    for (let i = 0; i < A.length - 1; i++) {
      if (A[i + 1][2] < line.stops[k].s - 800 || A[i][2] > line.stops[k].s + 800) continue;
      const dx = A[i + 1][0] - A[i][0], dy = A[i + 1][1] - A[i][1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((ex - A[i][0]) * dx + (ey - A[i][1]) * dy) / L2));
      const d = Math.hypot(A[i][0] + dx * t - ex, A[i][1] + dy * t - ey);
      if (d < jd) { jd = d; j = i; sL = A[i][2] + (A[i + 1][2] - A[i][2]) * t; }
    }
    if (jd > 60) continue;
    const tail = A.slice(j + 1).filter((p) => p[2] > sL + 0.05);
    if (!tail.length) continue;
    const pts = head.concat(flat(tail.map((p) => [r1(p[0]), r1(p[1])])));
    const stops = onmap.map((q) => ({ ...q }));
    for (const q of line.stops.slice(k + 1)) {
      stops.push({ name: q.name, s: r1(last.s + (q.s - sL)) });
      const st = byKey.get(q.name);
      if (st && !stations.some((s) => s.name === q.name)) { stations.push({ name: q.name, x: st.x, y: st.y }); added.push(q.name); }
    }
    // the data stops short of the real end: that end stays an off-map stop
    if (!line.reached) {
      const far = line.via[line.via.length - 1];
      if (!stops.some((q) => q.name === far)) stops.push({ name: far, s: r1(stops[stops.length - 1].s + 90), offmap: true });
    }
    route.pts = pts;
    route.stops = stops;
  }
  return { routes, stations, added };
}

// The province's lines (index-provincie.json global.routes, scripts/world/
// build_province.mjs: every OSM train route over the track) for each
// Ommeland route: the line through its last two stops, turned to run
// outward from the city, tagged with the route it continues (extendRoutes
// reads `route`). Branches that have no Ommeland route yet get one: a copy
// of the route they leave the trunk line from (BRANCHES).
export const BRANCHES = [{ name: 'Stoptrein Veendam', from: 'Stoptrein Winschoten', to: 'Veendam' }];
const same = (a, b) => a === b || (/^Groningen( Hoofdstation)?$/.test(a) && /^Groningen( Hoofdstation)?$/.test(b));

function reversed(line) {
  const A = arcPoints(line.pts);
  const L = A.length ? A[A.length - 1][2] : 0;
  return { ...line, pts: line.pts.slice().reverse(), stops: line.stops.slice().reverse().map((q) => ({ ...q, s: r1(L - q.s) })), via: (line.via || []).slice().reverse() };
}

export function provinceRailLines(om, lines) {
  const routes = (om.routes || []).slice();
  for (const b of BRANCHES) {
    const base = routes.find((r) => r.name === b.from);
    if (!base || routes.some((r) => r.name === b.name)) continue;
    const onmap = base.stops.filter((q) => !q.offmap);
    routes.push({ ...base, name: b.name, stops: onmap.map((q) => ({ ...q })).concat([{ name: b.to, s: onmap.length ? onmap[onmap.length - 1].s + 90 : 90, offmap: true }]) });
  }
  const out = [];
  for (const r of routes) {
    const own = r.stops.filter((q) => !q.offmap).map((q) => q.name);
    // an intercity without a stop of its own out here (Zwolle) does not get the stoptrein's
    if (!own.length) continue;
    const seq = (r.keep || []).concat(own);
    const last = seq[seq.length - 1], prev = seq[seq.length - 2];
    const want = r.stops.find((q) => q.offmap);
    let best = null, score = -1;
    for (const line of lines || []) {
      if (!line.reached || !line.pts || line.pts.length < 2) continue;
      const k = line.stops.findIndex((q) => same(q.name, last)), kp = line.stops.findIndex((q) => same(q.name, prev));
      if (k < 0 || kp < 0 || Math.abs(k - kp) !== 1) continue;
      const L = kp < k ? line : reversed(line);
      const at = L.stops.findIndex((q) => same(q.name, last));
      const rest = L.stops.slice(at + 1);
      // the line toward the route's own far end first (Veendam, Winschoten, ...), then the longest
      const s = (want && rest.some((q) => q.name === want.name) ? 1000 : 0) + rest.length;
      if (rest.length && s > score) { score = s; best = L; }
    }
    if (!best) continue;
    // a branch ends at its own far end, not where the trunk line runs on to
    let L = best;
    if (want && BRANCHES.some((b) => b.name === r.name)) {
      const e = L.stops.findIndex((q) => q.name === want.name);
      if (e > 0 && e < L.stops.length - 1) L = { ...L, stops: L.stops.slice(0, e + 1), via: L.stops.slice(0, e + 1).map((q) => q.name) };
    }
    out.push({ ...L, id: `${L.id}>${r.name}`, route: r.name, reached: true });
  }
  return { om: { ...om, routes }, lines: out };
}

// ------------------------------------------------------------------ at load

const pairs = (p) => {
  const out = [];
  for (let i = 0; i < p.length; i += 2) out.push([p[i], p[i + 1]]);
  return out;
};

// The rail file of a layer (scripts/world/cityroutes.mjs): { routes, stations, rails }, or null.
export async function loadLandData(base = 'world/', file) {
  if (!file) return null;
  try {
    const r = await fetch(base + file);
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.warn('rail data not loaded', e);
    return null;
  }
}

// The city's train routes carried on to the real stations and the edge of the
// data: the routes cut where the city's own track ends, the baked track
// (flat points) after it. Sets map.countryStations (the stations those routes
// stop at) and map.countryRails (the countryside's track for railway3d.js).
export function applyCityRoutes(map, data) {
  if (!data) return;
  const byName = new Map((map.railRoutes || []).map((r) => [r.name, r]));
  const out = [];
  for (const e of data.routes || []) {
    const base = byName.get(e.base);
    if (!base) continue;
    const P = base.pts;
    let s = 0, cut = P.length - 1;
    for (let i = 1; i < P.length; i++) {
      s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (s >= e.cutS - 0.5) { cut = i; break; }
    }
    const pts = P.slice(0, cut).concat(pairs(e.pts));
    const stops = base.stops.filter((q) => e.keep.includes(q.name)).map((q) => ({ ...q }));
    for (const q of e.stops) stops.push({ ...q, s: e.cutS + q.s });
    const route = { ...base, name: e.name, pts, stops };
    if (e.train) route.train = e.train;
    out.push(route);
  }
  const replaced = new Set(out.map((r) => r.name));
  map.railRoutes = (map.railRoutes || []).filter((r) => !replaced.has(r.name)).concat(out);
  const stations = data.stations || [];
  map.countryStations = stations.filter((s) => (data.routes || []).some((r) => r.stops.some((q) => q.name === s.name && !q.offmap)));
  map.countryRails = (data.rails || []).map(pairs);
}
