// Rit over de echte tegels met het streamingwerk per frame (#1016, #1052, #1008): voor (losse budgetten per systeem, zoals main)
// tegen na (één framebudget-planner, streamplanner.js, en de ring met uitzonderingen, lodstable.js).
//   node scripts/perf/streamsoepel.mjs <map met world/> --variant=voor|na [--route=stad|provincie] [--speed=30] [--hz=60] [--km=3]
// Echt: de tegels van schijf met echte decodering en de echte FrameQueue-rijen (tilestore.js, tileworld.js), de gebouwen en wegen
// uit de rasters rond de auto (buildingsNear, roadsNear), de late tegels. GEMODELLEERD (constanten hieronder, niet gemeten in het
// spel): wat het kost om een gebouwmesh, een weg, een verre tegel en een voertuig te bouwen. De tegelrijen zijn echte tijd (ms),
// de rest is modeltijd; samen is dat "streamingwerk per frame". Dit is een vergelijking van beleid, geen frametijdmeting.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const VARIANT = arg('variant', 'voor'), ROUTE = arg('route', 'stad');
const SPEED = Number(arg('speed', 30)), HZ = Number(arg('hz', 60)), KM = Number(arg('km', 3));
const dir = path.resolve(process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || '.', 'world');
const ROOT = new URL('../../', import.meta.url);
const js = (f) => import(pathToFileURL(path.join(ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'game/js', f)).href);
const TW = await js('tileworld.js');
const SB = await js('streambudget.js');
const PL = await js('streamplanner.js');
const LS = await js('lodstable.js');

// ---- het model (aannames, in ms) ----
const M = {
  building: (id) => 0.7 + (id % 10) * 0.1,        // een gebouwmesh: 0,7 tot 1,6 ms
  linkSlow: (id) => id % 20 === 0,                // 5% heeft een stijl die nog niet gelinkt is: 1 s wachten na de bouw
  linkMs: 1000,
  road: 1.0, roadHeavyEvery: 17, roadHeavy: 6,    // een weg 1 ms; elke 17e is zwaar (6 ms)
  farTile: 6, farStep: 0.5,                       // een verre tegel (320 m) 6 ms, in stukken van 0,5 ms
  actor: 0.8, actorEvery: 4,                      // elke 4 frames een voertuig of voetganger
};
// de budgetten van main (scene3d.js, streambudget.js): bouwen 4 (9 na een sprong), weg 2,5 met een cap van 4, de verre laag 2,5, actoren 3
const OLD = { building: 4, road: 2.5, roadCap: 4, far: 2.5, actors: 3 };
const WANT = { tile: 4, building: 4, road: 2.5, far: 2.5, actors: 3 };
const DRAW = 140, VIEW = 190, FAR_START = VIEW + Math.max(VIEW * 0.3, 80), FAR_TILE = 320;

const source = {
  async read(file, off, len) { const fd = fs.openSync(path.join(dir, file), 'r'); const b = new Uint8Array(len); fs.readSync(fd, b, 0, len, off); fs.closeSync(fd); return b; },
  async readAll(file) { return new Uint8Array(fs.readFileSync(path.join(dir, file))); },
};
let clock = 0;
const { world, store, index } = await TW.loadTileWorld('world/', { source, pool: false, now: () => clock, extra: [{ name: 'index-provincie.json' }, { name: 'index-corridor.json' }] });
const g = index.layers.provincie.global;
const place = (n) => { const q = g.places.find((x) => x.name === n) || g.stations.find((x) => x.name === n || x.key === n); if (!q) throw new Error('no place ' + n); return [q.x, q.y]; };
const A7 = ['Groningen', 'Hoogezand', 'Zuidbroek', 'Scheemda', 'Winschoten', 'Bad Nieuweschans'].map(place);
const acc = [0];
for (let i = 1; i < A7.length; i++) acc.push(acc[i - 1] + Math.hypot(A7[i][0] - A7[i - 1][0], A7[i][1] - A7[i - 1][1]));
const at = (s) => { let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = Math.min(1, Math.max(0, (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1))); return [A7[i - 1][0] + (A7[i][0] - A7[i - 1][0]) * t, A7[i - 1][1] + (A7[i][1] - A7[i - 1][1]) * t]; };
const S0 = ROUTE === 'provincie' ? 15000 : 0;
const dt = 1000 / HZ;
const nframes = Math.floor(KM * 1000 / SPEED * HZ);

const isNew = VARIANT === 'na';
const planner = PL.createFramePlanner();
const budgetState = SB.createStreamBudget();
const ahead = SB.createStreamAhead();
const smoother = LS.createRingSmoother();

// de toestand van het model
const built = new Map(), firstSeen = new Map(), waits = [];      // gebouw -> { at (ms klok), slow }
const roadsBuilt = new Set();
const farBuilt = new Set(), farJob = new Map();
let roadHeavyN = 0, actorDebt = 0;
const keyOfFar = (i, j) => i + ',' + j;
const rowsMs = [], totalMs = [], buildMs = [], tileQ = [], bMissingQ = [];
const ringHist = [];
let late = 0, farLate = 0, holes = 0, ringBelow90 = 0, bare = 0, bareMax = 0, minRing = DRAW, frames = 0, frameOver4 = 0, frameOver8 = 0;
let lastFrameMs = 8, pressureNow = 0;

// de eerste ring rond het begin binnen halen (zoals het spel bij het starten)
const [x0, y0] = at(S0);
store.prefetch(x0, y0, { radius: 1500 });
for (let k = 0; k < 120; k++) { clock += 20; await new Promise((r) => setImmediate(r)); world.tileQueue.run(1e9); }

// de laadsluier: het begin staat gebouwd (zoals het spel achter het zwarte scherm doet)
for (const b of world.buildingsNear(x0, y0, VIEW)) built.set(b, { at: -1e9, slow: false });
for (const r of world.roadsNear(x0, y0, VIEW)) roadsBuilt.add(r);
for (let i = Math.floor((x0 - FAR_START) / FAR_TILE); i <= Math.floor((x0 + FAR_START) / FAR_TILE); i++) for (let j = Math.floor((y0 - FAR_START) / FAR_TILE); j <= Math.floor((y0 + FAR_START) / FAR_TILE); j++) farBuilt.add(keyOfFar(i, j));

for (let f = 0; f < nframes; f++) {
  const s = S0 + f * dt / 1000 * SPEED, [x, y] = at(s), [x1, y1] = at(s + SPEED * 0.1);
  clock += dt;
  SB.noteStreamFocus(x, y, dt / 1000);
  SB.advanceStreamAhead(ahead, x, y, dt / 1000);
  const speed = Math.hypot(x1 - x, y1 - y) * 10;
  const boost = f * dt < 1500;
  if (isNew) planner.beginFrame({ frameMs: lastFrameMs, boost, pressure: pressureNow });
  let frameMs = 0;

  // ---- tegels (echt) ----
  store.prefetch(x, y, { vx: (x1 - x) * 10, vy: (y1 - y) * 10, radius: 1500 });
  const tileBudget = isNew ? planner.grant('tile', WANT.tile) : SB.streamFrameMs(budgetState, clock, lastFrameMs, speed);
  const tq0 = performance.now();
  world.tileQueue.run(tileBudget);
  const tileMs = performance.now() - tq0;
  if (isNew) planner.spend('tile', tileMs);
  rowsMs.push(tileMs); frameMs += tileMs; tileQ.push(world.tileQueue.items.length);
  await new Promise((r) => setImmediate(r));

  // ---- gebouwen (model op echte gebouwen) ----
  const view = world.buildingsNear(x, y, DRAW);
  const seen = new Set();
  const missing = [];
  for (const b of view) {
    if (b.landmark) continue;
    seen.add(b);
    const e = built.get(b);
    const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
    const d = Math.hypot(cx - x, cy - y);
    // klaar = gebouwd en (niet traag, of het linken is voorbij)
    if (!e && !firstSeen.has(b)) firstSeen.set(b, clock);
    if (!e || (e.slow && clock - e.at < M.linkMs)) missing.push([d, b, SB.streamRank(ahead, cx, cy), !!e]);
  }
  for (const b of built.keys()) if (!seen.has(b)) { const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2; if (Math.hypot(cx - x, cy - y) > VIEW) built.delete(b); }
  const order = missing.filter((m) => !m[3]).sort((a, b) => a[2] - b[2]);
  const bGrant = isNew ? planner.grant('building', WANT.building) : (boost ? 9 : OLD.building);
  let bSpent = 0, bn = 0;
  for (const [, b] of order) {
    const id = b.id !== undefined ? Number(b.id) || 0 : bn;
    const c = M.building(id);
    if (bn > 0 && bSpent + c > bGrant && (isNew || bSpent >= bGrant)) break;
    if (bn === 0 && isNew && bGrant <= 0) break;
    built.set(b, { at: clock, slow: M.linkSlow(id) });
    if (firstSeen.has(b)) { waits.push(clock - firstSeen.get(b) + (M.linkSlow(id) ? M.linkMs : 0)); firstSeen.delete(b); }
    bSpent += c; bn++;
    if (!isNew && bSpent >= bGrant) break;
  }
  if (isNew) planner.spend('building', bSpent);
  frameMs += bSpent; buildMs.push(bSpent);
  // de ring (voor: tot het dichtstbijzijnde gebouw dat mist; na: de eerste K houden hun verre kopie)
  const still = missing.filter((m) => !(built.has(m[1]) && !(built.get(m[1]).slow && clock - built.get(m[1]).at < M.linkMs))).sort((a, b) => a[0] - b[0]);
  let ring = DRAW;
  if (isNew) {
    const sel = LS.selectRing(still, DRAW);
    ring = smoother.update(sel.ring, clock);
    // gat = een gebouw binnen de ring dat mist en geen uitzondering is
    for (let i = sel.keep; i < still.length; i++) if (still[i][0] <= ring) holes++;
  } else {
    for (const m of still) ring = Math.min(ring, m[0] - 0.01);
  }
  minRing = Math.min(minRing, ring); if (ring < DRAW * 0.9) ringBelow90++;
  ringHist.push(ring);
  pressureNow = Math.min(1, still.filter((m) => m[0] < 100).length / 12);
  bare += still.length; bareMax = Math.max(bareMax, still.length); bMissingQ.push(still.length);

  // ---- wegen ----
  const rview = world.roadsNear(x, y, DRAW);
  const rmiss = rview.filter((r) => !roadsBuilt.has(r));
  rmiss.sort((a, b) => SB.streamRank(ahead, (a.bounds[0] + a.bounds[2]) / 2, (a.bounds[1] + a.bounds[3]) / 2) - SB.streamRank(ahead, (b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2));
  const rGrant = isNew ? planner.grant('road', WANT.road) : (boost ? OLD.road * 2 : OLD.road);
  let rSpent = 0, rn = 0;
  for (const r of rmiss) {
    const heavy = (++roadHeavyN % M.roadHeavyEvery) === 0;
    const c = heavy ? M.roadHeavy : M.road;
    if (rn > 0 && (rSpent + (isNew ? c : 0) > rGrant || rSpent >= rGrant)) break;
    if (rn === 0 && isNew && rGrant <= 0) break;
    if (!isNew && rn >= OLD.roadCap) break;
    roadsBuilt.add(r); rSpent += c; rn++;
  }
  if (isNew) planner.spend('road', rSpent);
  frameMs += rSpent;
  if (roadsBuilt.size > 4000) roadsBuilt.clear();

  // ---- de verre laag ----
  const fGrant = isNew ? planner.grant('far', WANT.far) : OLD.far;
  let fSpent = 0;
  const lead = isNew ? SB.streamLead(ahead) : null;
  const ci0 = Math.floor((x - FAR_START - 400) / FAR_TILE), ci1 = Math.floor((x + FAR_START + 400) / FAR_TILE), cj0 = Math.floor((y - FAR_START - 400) / FAR_TILE), cj1 = Math.floor((y + FAR_START + 400) / FAR_TILE);
  const want = [];
  for (let i = ci0; i <= ci1; i++) for (let j = cj0; j <= cj1; j++) {
    const rx = (px, py) => Math.hypot(Math.max(i * FAR_TILE - px, 0, px - (i + 1) * FAR_TILE), Math.max(j * FAR_TILE - py, 0, py - (j + 1) * FAR_TILE));
    const dP = rx(x, y), dA = isNew && lead ? LS.farBuildDist(dP, rx(lead.x, lead.y)) : dP;
    if (dA < FAR_START) want.push([dA, i, j, dP]);
    if (dP < VIEW && !farBuilt.has(keyOfFar(i, j))) farLate++;
  }
  want.sort((a, b) => a[0] - b[0]);
  for (const [, i, j] of want) {
    const k = keyOfFar(i, j);
    if (farBuilt.has(k)) continue;
    let left = farJob.get(k) ?? M.farTile;
    while (left > 0 && fSpent < fGrant) { const c = Math.min(M.farStep, left); left -= c; fSpent += c; }
    if (left <= 0) { farBuilt.add(k); farJob.delete(k); } else farJob.set(k, left);
    if (fSpent >= fGrant) break;
  }
  if (isNew) planner.spend('far', fSpent);
  frameMs += fSpent;

  // ---- voertuigen en voetgangers ----
  const aGrant = isNew ? planner.grant('actors', WANT.actors) : OLD.actors;
  if (f % M.actorEvery === 0) actorDebt += M.actor;
  let aSpent = 0;
  while (actorDebt > 0 && (aSpent === 0 ? (!isNew || aGrant > 0) : aSpent + M.actor <= aGrant)) { aSpent += M.actor; actorDebt -= M.actor; if (aSpent >= aGrant) break; }
  if (isNew) planner.spend('actors', aSpent);
  frameMs += aSpent;

  // ---- te late tegels (echt): binnen 250 m niet in de rasters ----
  for (const k of store.keysAround(x, y, 250)) if (!store.ready(k) || !world.resident.has(`${store.index.tiles[k].i},${store.index.tiles[k].j}`)) late++;

  totalMs.push(frameMs); frames++;
  if (frameMs > 4) frameOver4++;
  if (frameMs > 8) frameOver8++;
  lastFrameMs = 8 + Math.min(60, frameMs) * 1; // een frame is het spel (8 ms) plus het streamingwerk
}

const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return +(b[Math.min(b.length - 1, Math.floor(b.length * p))] || 0).toFixed(2); };
const mean = (a) => +(a.reduce((x, y) => x + y, 0) / (a.length || 1)).toFixed(2);
const out = {
  variant: VARIANT, route: ROUTE, speed: SPEED, hz: HZ, km: KM, frames,
  streamMs: { mean: mean(totalMs), p50: q(totalMs, 0.5), p95: q(totalMs, 0.95), p99: q(totalMs, 0.99), max: q(totalMs, 1) },
  framesOver4ms: frameOver4, framesOver8ms: frameOver8,
  tileRowsMs: { mean: mean(rowsMs), p99: q(rowsMs, 0.99), max: q(rowsMs, 1) },
  tileQueue: { max: Math.max(...tileQ), mean: mean(tileQ) },
  lateTilesWithin250m: late, farTilesLateWithin190m: farLate,
  ring: { min: +minRing.toFixed(1), p5: q(ringHist, 0.05), p50: q(ringHist, 0.5), framesBelow90pct: ringBelow90, pctBelow90: +(100 * ringBelow90 / frames).toFixed(1) },
  waitToDetailMs: { n: waits.length, p50: q(waits, 0.5), p95: q(waits, 0.95), max: q(waits, 1) },
  tileQueueStats: world.tileQueue.stats.byKind,
  bareBuildings: { meanPerFrame: +(bare / frames).toFixed(2), max: bareMax }, holesInRing: holes,
  planner: isNew ? planner.stats() : null,
};
console.log(JSON.stringify(out));
