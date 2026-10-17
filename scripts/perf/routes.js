// Fixed perf routes (desktop --perf-script, see scripts/perf/run.sh): city
// centre on foot, the ring by car, the heli over the Ommeland at 40 m/s, the
// pause menu and a settings sheet open over the city. The player is moved
// along a fixed path each frame, so every run sees the same places. Per route:
// frame times, main-thread time per frame, GPU time (if the timer query
// exists), long tasks and renderer.info per frame.
const H = window.__perfHook;
// on a busy machine the title screen may not have taken the first Enter
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
const VEH = await imp('vehicle');
const HF = await imp('heliflight');
const PM = await imp('pausemenu');
const RR = await imp('ringroute');
// the geometry worker's job counts (builds before it have no geojobs.js)
const GJ = await imp('geojobs').catch(() => null);
// hand-placed points are in the legacy frame; builds before worldframe.js keep them as they are
const { P = (x, y) => [x, y], PL = (l) => l } = await imp('worldframe').catch(() => ({}));
if (window.__perfSim !== undefined && window.__perfSim !== '' && window.__simLoad) window.__simLoad.force(Number(window.__perfSim));
const ONLY = (window.__perfOnly || '').split(',').filter(Boolean);
const DUR = window.__perfDur || 20000;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
const gpu = H.enableGpu(r.getContext());
// a lost pointer lock opens the pause menu; the open-menu routes open it themselves
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let wantMenu = false;

let calls = 0, tris = 0, renders = 0;
const origRender = r.render.bind(r);
r.render = function (s, c) { origRender(s, c); calls += r.info.render.calls; tris += r.info.render.triangles; renders++; };
const frameCount = () => H.frames.length;
// PERF_DIAG=1: draw calls per frame by owner (first named ancestor), shadow pass apart
const diag = new Map();
let inShadow = false;
const origRBD = r.renderBufferDirect.bind(r);
if (window.__perfDiag) {
  const ownerOf = (o) => {
    let a = o, label = '';
    while (a && !label) { label = (a.userData && (a.userData.kind || a.userData.type || a.userData.propKind)) || a.name || ''; a = a.parent; }
    if (label === 'building' || label === 'landmark' || label === 'road' || label === 'water') {
      const g = o.geometry || {}, n = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
      return label + (o.parent && o.parent.userData.facadeDetail === o ? ':detail' : '') + (o.userData.roadStructure ? ':struct' : '') + ' ' + (g.type || '').replace('Geometry', '') + (n < 100 ? '<100' : n < 1000 ? '<1k' : '>1k');
    }
    if (label) return label;
    let top = o; while (top.parent && top.parent !== sc.scene) top = top.parent;
    const g = o.geometry || {};
    const tud = top !== o ? Object.keys(top.userData || {}).filter((k) => k !== 'shadowCasters').slice(0, 3).join('/') : '';
    return 'u:' + (o.isInstancedMesh ? 'inst' : o.isSkinnedMesh ? 'skinned' : o.type) + ' top=' + (top === o ? 'self' : (top.name || top.type) + '{' + tud + '}') +
      ' ud=' + Object.keys(o.userData || {}).slice(0, 3).join('/') + ' geo=' + (g.type || '') + (g.userData && Object.keys(g.userData).length ? '[' + Object.keys(g.userData).slice(0, 2).join('/') + ']' : '') +
      ' v' + (g.attributes && g.attributes.position ? (g.attributes.position.count < 100 ? '<100' : g.attributes.position.count < 1000 ? '<1k' : '>1k') : '?');
  };
  const smRender = r.shadowMap.render.bind(r.shadowMap);
  r.shadowMap.render = (...a) => { inShadow = true; try { smRender(...a); } finally { inShadow = false; } };
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const shadow = inShadow;
    const own = ownerOf(object);
    const k = (shadow ? '[sh] ' : '') + own + ' ' + (material.type || '') + (own.startsWith('u:') && material.color ? ' #' + material.color.getHexString() : '');
    if (H.recording) diag.set(k, (diag.get(k) || 0) + 1);
    return origRBD(camera, scene, geometry, material, object, group);
  };
}

const pathLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
const at = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === pts.length - 1) { const k = Math.min(1, s / Math.max(l, 1e-6)); return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    s -= l;
  }
};
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let mover = null;
const tick = () => {
  if (!wantMenu && PM.isPauseMenuOpen()) PM.closePauseMenu();
  // the camera pitch follows the (uncaptured) mouse height: the same every run
  D.input.mouse.y = innerHeight * 0.4;
  if (mover) mover(performance.now());
  if (!done) requestAnimationFrame(tick);
};
let done = false;
requestAnimationFrame(tick);

const DN = await imp('daynight');
// the same light and weather on every run: 14:00, clear
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};

async function run(name, setup, move, teardown) {
  if (ONLY.length && !ONLY.includes(name)) return null;
  fixWorld();
  const ctx = await setup();
  let t0 = performance.now() + 6000;
  mover = (now) => move(ctx, (now - t0) / 1000);
  await sleep(6000);
  t0 = performance.now();
  fixWorld();
  calls = 0; tris = 0; renders = 0;
  const f0 = frameCount();
  H.start();
  if (window.__hitch) window.__hitch.reset();
  if ((window.__perfProfile || '').split(',').includes(name)) console.log('[profile] ' + Math.min(DUR - 2000, 15000));
  await sleep(DUR);
  const res = H.stop();
  const frames = Math.max(1, res.frames);
  mover = null;
  const out = { ...res, callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), rendersPerFrame: +(renders / frames).toFixed(2),
    programs: r.info.programs.length, textures: r.info.memory.textures, geometries: r.info.memory.geometries,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, at: [Math.round((p.inVehicle || p).x), Math.round((p.inVehicle || p).y)],
    vehicles: w.vehicles.length, peds: w.pedestrians.length, simLevel: window.__simLoad ? window.__simLoad.level() : null, dyn: window.__gfxDyn || null,
    batches: sc.batches ? sc.batches() : null, geo: GJ ? { ...GJ.geoStats } : null,
    shots: globalThis.__shotLog || null, pr: r.getPixelRatio(), canvas: [r.domElement.width, r.domElement.height] };
  if (window.__hitch) {
    const hs = window.__hitch.summary();
    out.hitch = { sections: hs.sections, peaks: hs.peaks, over50: hs.over50, over100: hs.over100, slow: hs.slow.slice(0, 25), programs: hs.programs.slice(0, 20).map((q) => q.name) };
  }
  if (window.__perfDiag) { out.diag = [...diag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, n]) => [k, +(n / frames).toFixed(1)]); diag.clear(); }
  console.log('[capture] ' + name);
  await sleep(400);
  if (teardown) await teardown(ctx);
  console.log('[perf-route]', name, JSON.stringify(out));
  return out;
}

const results = { gpu, longTasks: H.longTaskState || 'on', dpr: devicePixelRatio, css: [innerWidth, innerHeight], settings: JSON.parse(localStorage.getItem('gde-settings') || '{}'), routes: {} };
const FOOT = PL([[167, 283], [121, 193], [105, 161], [100, 77], [124, 7], [134, 36]]);
results.routes.foot = await run('foot', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, (c, t) => {
  const q = at(FOOT, Math.max(0, t) * 6);
  p.x = q.x; p.y = q.y; p.angle = q.ang; w.camYaw = q.ang;
});

const RING = RR.RING_ROUTE.map((q) => [q[0], q[1]]);
const RING_LEN = pathLen(RING);
results.routes.ring = await run('ring', async () => {
  teleport(RING[0][0], RING[0][1]);
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v };
}, (c, t) => {
  const s = Math.max(0, t) * 22 + (window.__perfJump ? Math.floor(Math.max(0, t) / window.__perfJump) * 600 : 0);
  const q = at(RING, s % RING_LEN);
  const v = c.v;
  v.x = q.x; v.y = q.y; v.angle = q.ang; v.speed = t > 0 ? 22 : 0; v.vx = Math.cos(q.ang) * v.speed; v.vy = Math.sin(q.ang) * v.speed;
  w.camYaw = q.ang;
}, async (c) => { p.exitVehicle(map, w); w.vehicles.splice(w.vehicles.indexOf(c.v), 1); });

const HELI = PL([[2494, 3130], [3700, 3150], [4892, 3155]]);
results.routes.heli = await run('heli', async () => {
  teleport(HELI[0][0], HELI[0][1]);
  const gz = map.groundHeightAt(p.x, p.y, 0) || 0;
  const v = HF.makeHeli(p.x, p.y, gz, 0);
  v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v };
}, (c, t) => {
  const q = at(HELI, Math.max(0, t) * 40);
  const v = c.v;
  v.x = q.x; v.y = q.y; v.z = 60; v.angle = q.ang; v.onGround = false; v.airborne = true; v.rotor = 1;
  const sp = t > 0 ? 40 : 0;
  v.vx = Math.cos(q.ang) * sp; v.vy = Math.sin(q.ang) * sp; v.vz = 0; v.speed = sp;
  w.camYaw = q.ang;
}, async (c) => { c.v.z = c.v.groundZ || 0; c.v.vx = c.v.vy = 0; c.v.onGround = true; c.v.airborne = false; await sleep(300); p.exitVehicle(map, w); w.vehicles.splice(w.vehicles.indexOf(c.v), 1); });

// a village centre from the heli (only on request: PERF_ONLY=village), the
// nearest village to the heli route's middle, circling at 45 m
results.routes.village = ONLY.includes('village') ? await run('village', async () => {
  const WP = await imp('worldplaces');
  const [mx, my] = P(3700, 3150);
  const pl = WP.worldPlaceLabels(mx - 6000, my - 6000, mx + 6000, my + 6000).filter((q) => q.kind === 'village').sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my))[0];
  teleport(pl.x + 60, pl.y);
  const gz = map.groundHeightAt(p.x, p.y, 0) || 0;
  const v = HF.makeHeli(p.x, p.y, gz, 0);
  v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v, pl };
}, (c, t) => {
  const a = Math.max(0, t) * 0.12, v = c.v;
  v.x = c.pl.x + Math.cos(a) * 60; v.y = c.pl.y + Math.sin(a) * 60; v.z = 45; v.angle = a + Math.PI / 2;
  v.onGround = false; v.airborne = true; v.rotor = 1; v.vx = v.vy = v.vz = 0; v.speed = 0;
  w.camYaw = a + Math.PI;
}, async (c) => { c.v.z = c.v.groundZ || 0; c.v.onGround = true; c.v.airborne = false; await sleep(300); p.exitVehicle(map, w); w.vehicles.splice(w.vehicles.indexOf(c.v), 1); }) : null;

results.routes.pause = await run('pause', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('game'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });
results.routes.sheet = await run('sheet', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('settings'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });

done = true;
clearInterval(skipper);
r.render = origRender;
r.renderBufferDirect = origRBD;
return JSON.stringify(results);
