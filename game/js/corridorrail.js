// The proefstrook's rail lines (docs/PROVINCIE-PLAN.md 3.2: "alle lijnen
// echt"): the Ommeland's train routes (ommeland.json routes, spliced onto
// the city's in countryreal.js applyRoutes) run on over the corridor
// layer's track (index-corridor.json global.routes, scripts/world/
// build_corridor.mjs) to every station the data reaches: Appingedam and
// Delfzijl, Baflo ... Uithuizen, Roodeschool and Eemshaven. Pure data, no
// side effects: main.js applies it to the Ommeland data before initReal.

// corridor line id -> the Ommeland route it continues
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
    const route = routes.find((r) => r.name === LINE_ROUTE[line.id]);
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
    let j = 0, jd = Infinity;
    for (let i = 0; i < A.length; i++) {
      if (Math.abs(A[i][2] - line.stops[k].s) > 800) continue;
      const d = Math.hypot(A[i][0] - ex, A[i][1] - ey);
      if (d < jd) { jd = d; j = i; }
    }
    if (jd > 60) continue;
    const sL = A[j][2];
    const tail = A.slice(j + 1);
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
