// Detail comparison city vs Ommeland (desktop --perf-script, see
// scripts/perf/detail.sh): the player stands on foot on a street in each
// area with the same camera framing (heading along the street, fixed pitch,
// 14:00, clear). After the streaming settles: frame and main-thread time,
// GPU time, draw calls and triangles per frame, the distinct materials drawn
// in one frame, and what stands within 150 m: detailed building meshes,
// instanced building boxes, street furniture (lamps, benches, bins, racks,
// clutter, village furniture), trees. One screenshot by day and one at night
// per area ('[capture] <area>' / '<area>-nacht').
const H = window.__perfHook;
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await new Promise((res) => setTimeout(res, 700));
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d; const r = sc.renderer;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const CR = await imp('countryreal');
const CP = await imp('cityprops');
const RM = await imp('realmap').catch(() => null);
const ONLY = (window.__detailOnly || '').split(',').filter(Boolean);
const SETTLE = window.__detailSettle || 10000, DUR = window.__detailDur || 6000, R = 150;
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
const gpu = H.enableGpu(r.getContext());
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let calls = 0, tris = 0, renders = 0, inShadow = false, matSet = null;
const origRender = r.render.bind(r);
r.render = function (s, c) { origRender(s, c); calls += r.info.render.calls; tris += r.info.render.triangles; renders++; };
const smRender = r.shadowMap.render.bind(r.shadowMap);
r.shadowMap.render = (...a) => { inShadow = true; try { smRender(...a); } finally { inShadow = false; } };
const origRBD = r.renderBufferDirect.bind(r);
r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
  if (matSet && !inShadow) matSet.add(material.uuid);
  return origRBD(camera, scene, geometry, material, object, group);
};

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, clock = 14;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = clock; }
  if (!done) requestAnimationFrame(tick);
};
let done = false;
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = clock;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};

// a real street in a village: the residential road near the place centre
// with the most buildings round its middle, standing on it looking along it
function villageSpot(name) {
  const pl = CR.REAL.places.find((q) => q.n === name);
  let best = null;
  for (const rd of CR.REAL.roads) {
    if (rd.kind < 5) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 12 || Math.hypot(mx - pl.x, my - pl.y) > Math.min(350, pl.r * 0.6)) continue;
      let n = 0;
      for (let tx = Math.floor((mx - 60) / 160); tx <= Math.floor((mx + 60) / 160); tx++) {
        for (let ty = Math.floor((my - 60) / 160); ty <= Math.floor((my + 60) / 160); ty++) {
          for (const k of CR.buildingsInTile(tx, ty) || []) if (Math.hypot(CR.REAL.bx[k] - mx, CR.REAL.by[k] - my) < 60) n++;
        }
      }
      const score = n - Math.hypot(mx - pl.x, my - pl.y) / 40;
      if (!best || score > best.score) best = { score, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), street: rd.name };
    }
  }
  return best;
}

const AREAS = [
  { name: 'grotemarkt', x: 70, y: 60, a: 0.15 },
  { name: 'bergstraat', x: -780, y: -583, road: 'Bergstraat' },
  ...[['Ten Boer', 'Kloosterkerk'], ['Zuidhorn', 'Sebastiaan/Fabius'], ['Haren', 'Nicolaaskerk'], ['Winsum', 'Torenkerk'], ['Bedum', 'Walfriduskerk']]
    .map(([n, church]) => ({ name: n.toLowerCase().replace(' ', ''), village: n, church })),
];
// extra landmark views (screenshots only)
const VIEWS = [['tenboer', 'Kloosterkerk', 'Ten Boer'], ['zuidhorn', 'Sebastiaan/Fabius', 'Zuidhorn'], ['haren', 'Nicolaaskerk', 'Haren'], ['winsum', 'Torenkerk', 'Winsum'],
  ['bedum', 'Walfriduskerk', 'Bedum'], ['garmerwolde', 'Kerk van Garmerwolde', 'Garmerwolde']];

// 75 m from the church, on open ground, looking at it
function churchView(church, place) {
  const pl = CR.REAL.places.find((q) => q.n === place);
  const c = CR.REAL.churches.filter((q) => q.n === church).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
  if (!c) return null;
  // the clearest line of sight: fewest building boxes on the way in
  let best = null;
  for (let k = 0; k < 24; k++) {
    const a = 2.4 + (k % 12) * 0.5236, d = k < 12 ? 80 : 60;
    const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (CR.buildingAt(x, y, 3) >= 0) continue;
    let hits = 0;
    for (let t = 4; t < d - 18; t += 3) if (CR.buildingAt(x + (c.x - x) * t / d, y + (c.y - y) * t / d, 0.5) >= 0) hits++;
    if (!best || hits < best.hits) best = { hits, x, y, a: Math.atan2(c.y - y, c.x - x), cx: c.x, cy: c.y };
  }
  if (best) return best;
  return null;
}

function cityRoadSpot(A) {
  let best = null;
  for (const rd of map.roadsNear(A.x, A.y, 80)) {
    if (rd.name !== A.road) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - A.x, my - A.y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  }
  return best;
}

// what stands within R of (x, y)
function census(x, y) {
  const near = (px, py) => Math.hypot(px - x, py - y) < R;
  const out = { bldMeshes: 0, bldBoxes: 0, furniture: 0, lamps: 0, trees: 0 };
  sc.scene.traverse((o) => {
    if ((o.name === 'building' || o.name === 'landmark') && o.parent) {
      let geo = null;
      o.traverse((c) => { if (!geo && c.isMesh && c.geometry) geo = c.geometry; });
      if (geo) {
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        const c = geo.boundingSphere.center;
        if (near(c.x, c.z)) out.bldMeshes++;
      }
    }
    if (!o.isInstancedMesh || !o.visible || !o.count) return;
    const kind = o.userData.kind || '';
    if (kind !== 'country:rbBody' && kind !== 'streetlamp') return;
    const a = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) {
      if (a[i * 16 + 5] === 0 || !near(a[i * 16 + 12], a[i * 16 + 14])) continue;
      if (kind === 'streetlamp') out.lamps++; else out.bldBoxes++;
    }
  });
  // trees: the city map's (all drawn within the detail radius) and the
  // Ommeland tree instances
  out.trees = map.treesNear(x, y, R).filter((t) => near(t[0], t[1])).length;
  if (window.__realMap) out.trees += window.__realMap.treesNear(x, y, R).filter((t) => near(t[0], t[1])).length;
  sc.scene.traverse((o) => {
    const kind = o.userData.kind || '';
    if (!o.isInstancedMesh || !o.visible || !o.count || !/^country:(tree|poplar|willow)$/.test(kind)) return;
    const a = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) if (a[i * 16 + 5] !== 0 && near(a[i * 16 + 12], a[i * 16 + 14])) out.trees++;
  });
  for (const cell of CP.cityPropCells().values()) {
    if (!cell.active) continue;
    for (const it of [...cell.items, ...cell.market]) if (it.prop && near(it.prop.x, it.prop.y)) out.furniture++;
  }
  const V = window.__villages;
  if (V) {
    for (const v of V.villages.values()) {
      for (const [k, it] of Object.entries(v.L.items)) {
        if (k === 'slab' || k === 'pool' || k === 'lampHead' || k.startsWith('sign')) continue;
        for (let i = 0; i < it.m.length; i += 16) {
          if (!near(it.m[i + 12], it.m[i + 14])) continue;
          if (k === 'tree') out.trees++; else if (k === 'lamp') out.lamps++; else out.furniture++;
        }
      }
    }
  }
  out.furniture += out.lamps;
  return out;
}

const results = { gpu, dpr: devicePixelRatio, css: [innerWidth, innerHeight], settings: JSON.parse(localStorage.getItem('gde-settings') || '{}'), areas: {} };
for (const A of AREAS) {
  if ((ONLY.length && !ONLY.includes(A.name)) || ONLY.includes('views')) continue;
  const s = A.village ? villageSpot(A.village) : A.road ? cityRoadSpot(A) : A;
  if (!s) { results.areas[A.name] = { error: 'no spot' }; continue; }
  clock = 14;
  fixWorld();
  teleport(s.x, s.y);
  hold = { x: s.x, y: s.y, a: s.a };
  await sleep(SETTLE);
  fixWorld();
  // DETAIL_TOGGLE=1: the same spot with the real-Ommeland map and the
  // landmark kits switched off and on in turns (one process, one load)
  if (window.__detailToggle) {
    const T = { on: [], off: [] };
    for (let k = 0; k < 6; k++) {
      const off = k % 2 === 1;
      window.__noRealMap = off; window.__noLandmarkKits = off;
      await sleep(1500);
      H.start();
      await sleep(3000);
      T[off ? 'off' : 'on'].push(H.stop());
    }
    window.__noRealMap = false; window.__noLandmarkKits = false;
    const mean = (L, k) => +(L.reduce((a, r) => a + r[k], 0) / L.length).toFixed(2);
    results.toggle = results.toggle || {};
    results.toggle[A.name] = { onCpu: mean(T.on, 'cpuAvg'), offCpu: mean(T.off, 'cpuAvg'), onFrame: mean(T.on, 'avg'), offFrame: mean(T.off, 'avg') };
    console.log('[detail-toggle]', A.name, JSON.stringify(results.toggle[A.name]));
    await sleep(1500);
  }
  calls = 0; tris = 0; renders = 0;
  H.start();
  await sleep(DUR);
  const res = H.stop();
  const frames = Math.max(1, res.frames);
  matSet = new Set();
  await sleep(120);
  const mats = matSet.size;
  matSet = null;
  const out = {
    at: [Math.round(s.x), Math.round(s.y)], street: s.street || A.road || '', ...res,
    callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), materials: mats,
    ...census(s.x, s.y), realMap: RM && RM.realMapStats ? RM.realMapStats() : null,
  };
  console.log('[capture] ' + A.name);
  await sleep(500);
  clock = 22.5;
  fixWorld();
  await sleep(2500);
  console.log('[capture] ' + A.name + '-nacht');
  await sleep(500);
  results.areas[A.name] = out;
  console.log('[detail-area]', A.name, JSON.stringify(out));
}
for (const [name, church, place] of VIEWS) {
  if (ONLY.length && !ONLY.includes(name) && !ONLY.includes('views')) continue;
  const v = churchView(church, place);
  if (!v) continue;
  clock = 14;
  fixWorld();
  teleport(v.x, v.y);
  // a fixed shot: the eye 7 m up, on the church's middle at 11 m
  hold = v;
  const pose = { position: { x: v.x, y: v.y, z: 7 }, lookAt: { x: v.cx, y: v.cy, z: 11 }, cut: true };
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'detail-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(SETTLE * 0.8);
  console.log('[capture] ' + name + '-kerk');
  await sleep(500);
  clock = 22.5;
  fixWorld();
  await sleep(2500);
  console.log('[capture] ' + name + '-kerk-nacht');
  await sleep(500);
  hold = null;
  ownShot = false;
  cine.skipCinematic();
}
results.landmarks = window.__landmarkKits && window.__landmarkKits.layer ? window.__landmarkKits.layer.stats() : null;
hold = null;
done = true;
clearInterval(skipper);
r.render = origRender;
r.renderBufferDirect = origRBD;
return JSON.stringify(results);
