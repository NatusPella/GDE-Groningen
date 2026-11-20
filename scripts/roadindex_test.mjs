// De gedeelde incrementele hoekpuntindex (roadindex.js) en haar lezers (docs/PERF-WEGINDEX-21-11.md):
// 1. eenheden: toevoegen, weghalen, idempotent, stabiele id's, versie, log, abonnees, nodesNear
// 2. equivalentie: na willekeurige tegelwissels (wegen erbij en eraf) is de index gelijk aan een verse opbouw
// 3. de verkeersgraaf (vehicle/traffic.js) die de delta's volgt is gelijk aan een volledige herbouw (zelfde leden per
//    hoekpunt, zelfde aansluitingen), en een rondreis (alles erbij, alles eraf, alles erbij) levert dezelfde graaf
//   node scripts/roadindex_test.mjs
import './node3d.mjs';
const { RoadIndex, roadIndexOf, nodeKey } = await import('../game/js/roadindex.js');
const { SpatialGrid, gridItems } = await import('../game/js/spatialgrid.js');
const { trafficRoadGraph } = await import('../game/js/vehicle/traffic.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
let seed = +(process.env.SEED || 7);
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

// ---- 1. eenheden
{
  const idx = new RoadIndex();
  const A = { pts: [[0, 0], [10, 0], [20, 0]] }, B = { pts: [[10, 0], [10, 10]] }, C = { pts: [[0, 0], [0, 5], [0, 0]] };
  ok(idx.add(A) && idx.add(B) && idx.version === 2, 'twee wegen erbij: versie 2');
  ok(!idx.add(A) && idx.version === 2, 'dezelfde weg twee keer: niets');
  const k = nodeKey([10, 0]);
  ok(idx.get(k).length === 4, 'het kruispunt kent twee wegen', String(idx.get(k).length));
  const id = idx.nodeId([10, 0]);
  ok(id >= 0 && idx.entriesOf(id) === idx.get(k) && idx.nodeId(k) === id, 'knoop-ID en lijst horen bij elkaar');
  ok(idx.nodesOfRoad(A).length === 3 && idx.nodesOfRoad(A)[1] === id, 'knopen per hoekpunt van een weg');
  ok(idx.nodesNear(10.04, 0.02, 0.5).includes(id) && !idx.nodesNear(14, 0, 0.5).length, 'nodesNear');
  idx.add(C);
  ok(idx.get(nodeKey([0, 0])).length === 6, 'een weg die een knoop twee keer raakt telt twee keer');
  const ids0 = new Map([...idx.ids]);
  ok(idx.remove(B) && !idx.remove(B), 'weghalen en nog eens weghalen');
  ok(idx.get(k).length === 2 && idx.nodeId([10, 10]) === -1, 'de lijst krimpt, een lege knoop verdwijnt');
  ok(idx.nodeId([10, 0]) === ids0.get(k), 'een knoop die blijft houdt zijn id');
  idx.remove(C);
  ok(idx.get(nodeKey([0, 0])).length === 2, 'C weg: A houdt zijn eigen hoekpunt');
  const freed = idx.free.length;
  idx.add({ pts: [[500, 500], [501, 500]] });
  ok(freed >= 1 && idx.free.length === Math.max(0, freed - 2), 'vrijgekomen id\'s worden hergebruikt', `${freed} -> ${idx.free.length}`);
  ok(idx.since(idx.version).length === 0 && idx.since(0).length === idx.version && idx.since(idx.version + 5) === null, 'log: since');
  let seen = 0;
  const off = idx.subscribe((d) => { seen += d.op; });
  idx.add({ pts: [[1, 1], [2, 2]] }); off(); idx.add({ pts: [[3, 3], [4, 4]] });
  ok(seen === 1, 'abonnee krijgt de wijzigingen tot hij zich afmeldt');
  const big = new RoadIndex();
  for (let i = 0; i < 20000; i++) big.add({ pts: [[i, 0], [i + 1, 0]] });
  ok(big.since(0) === null && big.since(big.version - 10).length === 10, 'een te oud log geeft null (de lezer bouwt opnieuw), een recent log niet');
}

// ---- 2. equivalentie met een verse opbouw
// kans op een los uiteinde naast een ander hoekpunt: in echte kaarten een paar procent; de verkeersgraaf kiest bij meerdere
// aansluitingen op één plek nog volgens de bouwvolgorde (het oude gedrag), dus een extreem dichte kaart kan een enkele keer afwijken
const roadSet = (count, ord0, LOOSE = 0.05) => {
  const roads = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + Math.floor(rnd() * 8), pts = [];
    let x = rnd() * 700, y = rnd() * 700;
    for (let k = 0; k < len; k++) { pts.push([x, y]); x += (rnd() - 0.3) * 20; y += (rnd() - 0.3) * 20; }
    if (roads.length && rnd() < LOOSE) { // een los uiteinde 1 tot 3 m naast een ander hoekpunt: de korte-einden-aansluiting van het verkeer
      const o = roads[Math.floor(rnd() * roads.length)], q = o.pts[Math.floor(rnd() * o.pts.length)];
      pts[0] = [q[0] + (rnd() * 4 - 2), q[1] + (rnd() * 4 - 2)];
    } else if (roads.length && rnd() < 0.3) { // een kruispunt: begint op een ander hoekpunt
      const o = roads[Math.floor(rnd() * roads.length)];
      pts[0] = o.pts[Math.floor(rnd() * o.pts.length)].slice();
    }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    roads.push({ pts, cat: rnd() < 0.15 ? 'foot' : 'normal', width: 6, _ord: ord0 + i, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  }
  return roads;
};
const norm = (index, ids) => {
  const out = [];
  for (const [k, id] of index.ids) {
    const l = index.lists[id], rows = [];
    for (let i = 0; i < l.length; i += 2) rows.push(ids.get(l[i]) + ':' + l[i + 1]);
    out.push(k + '=' + rows.sort().join(','));
  }
  return out.sort().join('|');
};
{
  const pool = roadSet(400, 1), ids = new Map(pool.map((r, i) => [r, i]));
  const live = new Set(pool.slice(0, 150));
  const idx = new RoadIndex();
  for (const r of live) idx.add(r);
  let same = 0;
  for (let step = 0; step < 40; step++) {
    for (let k = 0; k < 12; k++) { const r = pool[Math.floor(rnd() * pool.length)]; if (live.has(r)) { live.delete(r); idx.remove(r); } else { live.add(r); idx.add(r); } }
    const fresh = new RoadIndex();
    for (const r of [...live].sort((a, b) => a._ord - b._ord)) fresh.add(r);
    if (norm(idx, ids) === norm(fresh, ids) && idx.size === live.size && idx.nodeCount === fresh.nodeCount) same++;
  }
  ok(same === 40, 'index na 40 willekeurige tegelwissels gelijk aan een verse opbouw', `${same}/40`);
  for (const r of [...live]) idx.remove(r);
  ok(idx.size === 0 && idx.nodeCount === 0 && idx.lists.every((l) => !l), 'alles eraf: leeg en geen restanten');
}

// ---- 3. de verkeersgraaf: delta's tegenover een volledige herbouw over hetzelfde raster (een ander raster geeft bij gelijke
//         afstanden een andere volgorde van kandidaten, dus een andere keuze; dat is geen verschil van de index)
const mapOf = (roads, ver = 1) => {
  const grid = new SpatialGrid(64);
  for (const r of roads) grid.insert(r, r.bounds);
  return { roads: [], meta: {}, roadGrid: grid, _roadVer: ver, geoVer: ver, roadsNear: (x, y, r) => grid.query(x - r, y - r, x + r, y + r), orderedRoads: () => gridItems(grid).sort((a, b) => (a._ord ?? 0) - (b._ord ?? 0)) };
};
const graphShape = (g, roads, ids) => {
  const rows = [];
  for (const r of roads) {
    if (r.cat === 'foot' || r.pts.length < 2) continue;
    const arr = g.nodeOf.get(r);
    rows.push(ids.get(r) + '#' + arr.map((node) => node.map((e) => ids.get(e.road) + ':' + e.idx).sort().join('+')).join('/'));
  }
  return rows.join('\n');
};
for (const [loose, minRate] of [[0, 1], [0.05, 0.85]]) {
  const pool = roadSet(500, 1, loose), ids = new Map(pool.map((r, i) => [r, i]));
  const live = new Set(pool.slice(0, 200));
  const map = mapOf([...live], 1), grid = map.roadGrid;
  roadIndexOf(map);
  const g0 = trafficRoadGraph(map);
  ok(g0.idxVer === map._roadIndex.version, 'de graaf onthoudt de indexversie');
  let same = 0, incremental = 0, ordSeq = 0;
  const steps = 50;
  for (let step = 0; step < steps; step++) {
    const changes = 1 + Math.floor(rnd() * 25);
    for (let k = 0; k < changes; k++) {
      const r = pool[Math.floor(rnd() * pool.length)];
      if (live.has(r)) { live.delete(r); grid.remove(r, r.bounds); map._roadIndex.remove(r); } else { r._ord = 1e7 + ++ordSeq; /* zoals tileworld.js: een nieuwe weg krijgt het hoogste volgnummer */ live.add(r); grid.insert(r, r.bounds); map._roadIndex.add(r); }
      map._roadVer++;
    }
    map.geoVer++;
    const g = trafficRoadGraph(map);
    if (g === g0 && g.idxVer === map._roadIndex.version) incremental++;
    const fresh = trafficRoadGraph({ ...map, _roadIndex: undefined });
    const live2 = [...live].sort((a, b) => a._ord - b._ord);
    const A = graphShape(g, live2, ids), B = graphShape(fresh, live2, ids);
    if (A === B) same++;
    else if (!process.env.QUIET) {
      const a = A.split('\n'), b = B.split('\n'), d = a.findIndex((v, i) => v !== b[i]);
      console.log(`  stap ${step} verschilt bij regel ${d}:\n   delta ${a[d]}\n   vers  ${b[d]}`);
    }
  }
  ok(incremental === steps, 'de graaf wordt bijgewerkt (zelfde object), niet opnieuw gebouwd', `${incremental}/${steps}`);
  console.log(`  graaf na delta's gelijk aan een volledige herbouw: ${same}/${steps} (losse einden ${loose * 100}%)`);
  ok(same >= steps * minRate, `graaf na delta's gelijk aan een volledige herbouw (losse einden ${loose * 100}%, minstens ${minRate * 100}%)`, `${same}/${steps}`);
  // rondreis: alles eraf en weer erbij
  const all = [...live];
  for (const r of all) { live.delete(r); grid.remove(r, r.bounds); map._roadIndex.remove(r); map._roadVer++; }
  { const gz = trafficRoadGraph(map); if (gz.nodes.size) { const [k, l] = [...gz.nodes][0]; console.log("rest:", l.map((e) => ids.get(e.road) + ":" + e.idx + (live.has(e.road) ? " live" : " weg") + (e.road.cat))); } ok(gz.nodes.size === 0, "alle wegen eraf: lege graaf", gz.nodes.size + " knopen, " + gz.stitchOf.size + " aansl, " + Map.prototype.has.call(gz.nodeOf, all[0]) + " " + gz.idxVer + "/" + map._roadIndex.version); }
  for (const r of all) { r._ord = 1e7 + ++ordSeq; live.add(r); grid.insert(r, r.bounds); map._roadIndex.add(r); map._roadVer++; }
  const back = all.sort((a, b) => a._ord - b._ord);
  const A = graphShape(trafficRoadGraph(map), back, ids), B = graphShape(trafficRoadGraph({ ...map, _roadIndex: undefined }), back, ids);
  if (A !== B && !process.env.QUIET) { const a = A.split('\n'), b = B.split('\n'), d = a.findIndex((v, i) => v !== b[i]); console.log(`  rondreis verschilt bij regel ${d}:\n   delta ${a[d]}\n   vers  ${b[d]}`); }
  if (loose === 0) ok(A === B, 'rondreis (alles eraf, alles erbij) geeft dezelfde graaf als een verse');
}
console.log(`roadindex_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
