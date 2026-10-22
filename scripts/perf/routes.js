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
const allLinked = async (maxMs = 150000) => { const t = performance.now(); let last = -1, stable = 0; while (performance.now() - t < maxMs) { const pr = r.info.programs || []; stable = pr.length === last ? stable + 1 : 0; last = pr.length; if (pr.length && stable >= 6 && pr.every((q) => q.isReady())) return Math.round(performance.now() - t); await sleep(500); } return -1; };
// a lost pointer lock opens the pause menu; the open-menu routes open it themselves
D.input.canLock = () => false;
// the start screen (menu, since the menus of r5) stays up over a started game: hide it so the screenshots show the game
const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'none';
if (document.pointerLockElement) document.exitPointerLock();
let wantMenu = false;

let calls = 0, tris = 0, renders = 0;
const origRender = r.render.bind(r);
// rt: time inside renderer.render, the game scene (with its shadow pass) apart from the one-quad scenes of the post chain (s13)
const rt = { scene: 0, quad: 0, quadN: 0 };
r.render = function (s, c) { const t = performance.now(); origRender(s, c); const d = performance.now() - t; if (s === sc.scene) rt.scene += d; else { rt.quad += d; rt.quadN++; } calls += r.info.render.calls; tris += r.info.render.triangles; renders++; };
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
  window.__ownerOf = ownerOf;
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

// PERF_DEPTH=1: draws that take over 3 ms in renderBufferDirect (a program that was not linked yet blocks there), by kind of material and owner,
// and whether the material had a program at all when it was drawn (results.depth)
const slowDraws = new Map();
if (window.__perfDepth) {
  const own = (o) => { let a = o, label = ''; while (a && !label) { label = (a.userData && (a.userData.kind || a.userData.type || a.userData.propKind)) || a.name || ''; a = a.parent; } if (label) return label; let top = o; while (top.parent && top.parent !== sc.scene) top = top.parent; const g = o.geometry || {}; return 'u:' + (o.isInstancedMesh ? 'inst' : o.type) + ' top=' + (top === o ? 'self' : (top.name || top.type) + '{' + Object.keys(top.userData || {}).slice(0, 3).join('/') + '}') + ' geo=' + (g.type || '') + ' v' + (g.attributes && g.attributes.position ? g.attributes.position.count : '?'); };
  const prev = r.renderBufferDirect;
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const m = Array.isArray(material) ? material[0] : material;
    const pr = r.properties.get(m).programs;
    const had = !!pr;
    const t = performance.now();
    const out = prev.call(this, camera, scene, geometry, material, object, group);
    const ms = performance.now() - t;
    if (H.recording && ms > 3) {
      const k = (m.type || '') + (inShadow ? ' [sh]' : '') + ' ' + own(object) + (had ? '' : ' NOPROG');
      const e = slowDraws.get(k) || { n: 0, ms: 0, max: 0 };
      e.n++; e.ms += ms; e.max = Math.max(e.max, ms); slowDraws.set(k, e);
    }
    return out;
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
// the same light and weather on every run: 14:00, clear (a route can ask for another hour or rain)
let LOOK = { clock: 14, rain: false };
let EJECTS = 0;
const fixWorld = () => {
  w.clock = LOOK.clock;
  w.weather = LOOK.rain ? { active: true, timer: 1e9, kind: 'regenbui', peak: 0.6, intensity: 0.6, wet: 1, overcast: 0.6, mist: 0, windAngle: 0.9, elapsed: 30, duration: Infinity }
    : { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};

// How far the streaming keeps up with the player (#247), per frame of a route: the detail radius of buildings and roads
// as a share of DRAW_DIST (it shrinks to the nearest thing still missing, scene3d.js dists()), what still waits to be built
// (streamPending), the tile store's queue and the longest wait of a frame's tile work. Lower share = more pop-in at the rim.
const SP = await imp('scene3d').catch(() => null);
function streamProbe() {
  const rows = [];
  let on = true;
  const tick = () => {
    if (!on) return;
    const d = sc.dists ? sc.dists() : null, pend = SP && SP.streamPending ? SP.streamPending() : null, st = map.store;
    if (d) rows.push([d.buildingDetailR / d.DRAW_DIST, d.roadDetailR / d.DRAW_DIST, pend ? pend.buildings : 0, pend ? pend.roads : 0, st ? st.queue.length + st.active : 0, map.tileQueue ? map.tileQueue.size : 0, d.DRAW_DIST]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const avg = (i) => rows.length ? +(rows.reduce((a, q) => a + q[i], 0) / rows.length).toFixed(3) : null;
  const mx = (i) => rows.reduce((a, q) => Math.max(a, q[i]), 0);
  const share = (i, lim) => rows.length ? +(rows.filter((q) => q[i] < lim).length / rows.length).toFixed(3) : null;
  return { stop() {
    on = false;
    return { frames: rows.length, drawDist: rows.length ? rows[0][6] : null, bDetailAvg: avg(0), bDetailBelow90: share(0, 0.9), bDetailBelow50: share(0, 0.5), rDetailAvg: avg(1), rDetailBelow90: share(1, 0.9), rDetailBelow50: share(1, 0.5),
      pendBAvg: avg(2), pendBMax: mx(2), pendRAvg: avg(3), pendRMax: mx(3), tileLoadAvg: avg(4), tileLoadMax: mx(4), tileFrameQAvg: avg(5), tileFrameQMax: mx(5) };
  } };
}

async function run(name, setup, move, teardown, opts = {}) {
  if (ONLY.length && !ONLY.includes(name)) return null;
  LOOK = { clock: opts.clock ?? 14, rain: !!opts.rain };
  const DURR = opts.dur || DUR;
  fixWorld();
  const ctx = await setup();
  const SETTLE = window.__perfSettle || 6000;
  let t0 = performance.now() + SETTLE;
  mover = (now) => move(ctx, (now - t0) / 1000);
  await sleep(SETTLE);
  t0 = performance.now();
  fixWorld();
  calls = 0; tris = 0; renders = 0; EJECTS = 0;
  const f0 = frameCount();
  H.start();
  console.error('[perf-mark] start ' + name + ' ' + Date.now());
  if (window.__hitch) window.__hitch.reset();
  if ((window.__perfProfile || '').split(',').includes(name)) console.log('[profile] ' + Math.min(DURR - 2000, 15000));
  const canvasFrames0 = SP && SP.canvasFrameCount ? SP.canvasFrameCount() : null;
  const probe = streamProbe();
  await sleep(DURR);
  const res = H.stop();
  res.stream = probe.stop();
  res.stream.canvasFrames = [canvasFrames0, SP && SP.canvasFrameCount ? SP.canvasFrameCount() : null]; // the link guard of scene3d.js only works after 600
  console.error('[perf-mark] end ' + name + ' ' + Date.now() + ' ' + res.frames);
  const frames = Math.max(1, res.frames);
  mover = null;
  const out = { ...res, callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), rendersPerFrame: +(renders / frames).toFixed(2),
    programs: r.info.programs.length, textures: r.info.memory.textures, geometries: r.info.memory.geometries,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, at: [Math.round((p.inVehicle || p).x), Math.round((p.inVehicle || p).y)],
    ejects: EJECTS, vehicles: w.vehicles.length, peds: w.pedestrians.length, simLevel: window.__simLoad ? window.__simLoad.level() : null, dyn: window.__gfxDyn || null,
    batches: sc.batches ? sc.batches() : null, geo: GJ ? { ...GJ.geoStats } : null,
    tiles: map && map.store ? { ...map.store.stats, queue: map.store.queue.length, active: map.store.active, resident: map.store.residentKeys.length, frameQueue: map.tileQueue ? { ...map.tileQueue.stats, size: map.tileQueue.size } : null } : null,
    shots: globalThis.__shotLog || null, pr: r.getPixelRatio(), canvas: [r.domElement.width, r.domElement.height] };
  if (window.__hitch) {
    const hs = window.__hitch.summary();
    out.hitch = { sections: hs.sections, peaks: hs.peaks, over50: hs.over50, over100: hs.over100, slow: hs.slow.slice(0, 25), programs: hs.programs.slice(0, 20).map((q) => q.name) };
  }
  if (window.__perfDepth) { out.slowDraws = [...slowDraws].sort((a, b) => b[1].ms - a[1].ms).slice(0, 25).map(([k, e]) => [k, e.n, Math.round(e.ms), Math.round(e.max)]); slowDraws.clear(); }
  if (window.__perfDiag) { out.diag = [...diag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, n]) => [k, +(n / frames).toFixed(1)]); diag.clear(); }
  console.log('[capture] ' + name);
  await sleep(400);
  if (teardown) await teardown(ctx);
  console.error('[perf-route-data]', name, JSON.stringify(out)); // error level: the desktop log keeps only errors, and a crashed run still has its finished routes
  return out;
}

const gl0 = r.getContext(); const dbg0 = gl0.getExtension('WEBGL_debug_renderer_info');
const results = { gl: { renderer: dbg0 ? gl0.getParameter(dbg0.UNMASKED_RENDERER_WEBGL) : gl0.getParameter(gl0.RENDERER), vendor: dbg0 ? gl0.getParameter(dbg0.UNMASKED_VENDOR_WEBGL) : null, version: gl0.getParameter(gl0.VERSION), maxTex: gl0.getParameter(gl0.MAX_TEXTURE_SIZE) }, gpu, longTasks: H.longTaskState || 'on', loadMarks: { ...(window.__loadMarks || {}) }, sinceNavMs: Math.round(performance.now()), cores: navigator.hardwareConcurrency, dpr: devicePixelRatio, css: [innerWidth, innerHeight], settings: JSON.parse(localStorage.getItem('gde-settings') || '{}'), routes: {} };
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

// --- province routes (whole province on): named places from worldplaces.js, straight legs between them
const WPL = await imp('worldplaces');
const PLACES = WPL.worldPlaceLabels(-1e7, -1e7, 1e7, 1e7);
const placeAt = (n) => { const q = PLACES.find((x) => x.name === n); if (!q) throw new Error('no place ' + n); return [q.x, q.y]; };
const keepIn = (v) => { if (!p.inVehicle) { EJECTS++; v.sinking = false; v.wrecked = false; p.enterVehicle(v, w); } };
const leave = (v) => { if (p.inVehicle) p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); };
const safe = async (name, fn) => { try { return await fn(); } catch (e) { console.log('[perf-route-error]', name, String((e && e.stack) || e)); mover = null; return { error: String((e && e.message) || e) }; } };
// a car on a polyline at a fixed speed: the same shape as the ring route
const carRoute = (name, pts, speed, opts = {}) => safe(name, () => run(name, async () => {
  teleport(pts[0][0], pts[0][1]);
  let pt = null;
  for (let k = 0; k < 10 && !pt; k++) { await sleep(1500); pt = map.nearestRoadPoint(p.x, p.y, 400, true, true); }
  if (!pt) throw new Error('no road near the start of ' + name);
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v, len: pathLen(pts) };
}, (c, t) => {
  const q = at(pts, (Math.max(0, t) * speed) % c.len);
  const v = c.v;
  keepIn(v);
  const rp = map.nearestRoadPoint(q.x, q.y, 150, true, true);
  v.x = rp ? rp.x : q.x; v.y = rp ? rp.y : q.y; v.angle = q.ang; v.speed = t > 0 ? speed : 0; v.vx = Math.cos(q.ang) * v.speed; v.vy = Math.sin(q.ang) * v.speed;
  w.camYaw = q.ang;
}, async (c) => leave(c.v), opts));
const A7 = ['Groningen', 'Hoogezand', 'Zuidbroek', 'Scheemda', 'Winschoten', 'Bad Nieuweschans'].map(placeAt);
results.routes.a7 = await carRoute('a7', A7, 33, { dur: 60000 });
const LAND = ['Loppersum', 'Appingedam', 'Delfzijl'].map(placeAt);
results.routes.platteland = await carRoute('platteland', LAND, 20, { dur: 40000 });
// the rail line to Roodeschool/Eemshaven, flown low at train speed (a stand-in for the train: same streaming and rail drawing, a higher camera)
const RAIL = ['Groningen', 'Winsum', 'Warffum', 'Uithuizen', 'Roodeschool', 'Eemshaven'].map(placeAt);
results.routes.spoor = await safe('spoor', () => run('spoor', async () => {
  teleport(RAIL[0][0], RAIL[0][1]);
  await sleep(2000);
  const gz = map.groundHeightAt(p.x, p.y, 0) || 0;
  const v = HF.makeHeli(p.x, p.y, gz, 0);
  v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v, len: pathLen(RAIL) };
}, (c, t) => {
  const q = at(RAIL, (Math.max(0, t) * 39) % c.len);
  const v = c.v;
  keepIn(v);
  v.x = q.x; v.y = q.y; v.z = 14; v.angle = q.ang; v.onGround = false; v.airborne = true; v.rotor = 1;
  const sp = t > 0 ? 39 : 0;
  v.vx = Math.cos(q.ang) * sp; v.vy = Math.sin(q.ang) * sp; v.vz = 0; v.speed = sp;
  w.camYaw = q.ang;
}, async (c) => { c.v.z = c.v.groundZ || 0; c.v.vx = c.v.vy = 0; c.v.onGround = true; c.v.airborne = false; await sleep(300); leave(c.v); }, { dur: 45000 }));
// by boat: from Zoutkamp out over the water (the first clear water point on a ray)
results.routes.varen = await safe('varen', () => run('varen', async () => {
  const SK = await imp('sidejobkit');
  const [zx, zy] = placeAt('Zoutkamp');
  teleport(zx, zy);
  await sleep(3000);
  const model = { name: 'boat', len: 6, wid: 2.2, maxSpeed: 14, accel: 3, brake: 6, turnRate: 1.2, color: '#d0d0d0' };
  let boat = null;
  for (const [dx, dy] of [[0, -1], [1, -1], [-1, -1], [0, 1], [1, 0], [-1, 0]]) {
    for (let d = 200; d <= 3000 && !boat; d += 200) boat = SK.spawnJobBoat(w, zx + dx * d, zy + dy * d, Math.atan2(dy, dx), model);
    if (boat) break;
  }
  if (!boat) throw new Error('no water to launch a boat near Zoutkamp');
  boat.perfTemp = true;
  w.vehicles.push(boat);
  p.enterVehicle(boat, w);
  return { v: boat, a: boat.angle, x0: boat.x, y0: boat.y };
}, (c, t) => {
  const v = c.v, s = Math.max(0, t) * 7;
  keepIn(v);
  v.x = c.x0 + Math.cos(c.a) * s; v.y = c.y0 + Math.sin(c.a) * s; v.angle = c.a; v.speed = t > 0 ? 7 : 0; v.vx = Math.cos(c.a) * v.speed; v.vy = Math.sin(c.a) * v.speed;
  w.camYaw = c.a;
}, async (c) => leave(c.v), { dur: 40000 }));
// the busy city on foot (the foot route's path at rush hour), at night, and in the rain
const walkFoot = (c, t) => { const q = at(FOOT, Math.max(0, t) * 6); p.x = q.x; p.y = q.y; p.angle = q.ang; w.camYaw = q.ang; };
// the default walking pace of the game (3 m/s, player.js WALK_SPEED) along the same path: a player strolling through the centre
results.routes.wandel = await safe('wandel', () => run('wandel', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, (c, t) => {
  const q = at(FOOT, Math.max(0, t) * 3);
  p.x = q.x; p.y = q.y; p.angle = q.ang; w.camYaw = q.ang;
}, null, {}));

// standing still in the centre (the batchers have time to merge everything)
results.routes.staan = await safe('staan', () => run('staan', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, () => {}, null, { dur: 25000 }));
results.routes.druk = await safe('druk', () => run('druk', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, walkFoot, null, { clock: 17.5 }));
results.routes.nacht = await safe('nacht', () => run('nacht', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, walkFoot, null, { clock: 23 }));
results.routes.regen = await safe('regen', () => run('regen', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, walkFoot, null, { rain: true }));
// the ring again for three minutes (only with PERF_ONLY=lek): heap, geometries and textures every 15 s; a leak shows as a climb
results.routes.lek = await safe('lek', async () => {
  if (!ONLY.includes('lek')) return null;
  // textures that were uploaded while the route runs and not disposed since: grouped by size, format and name
  const alive = new Set();
  const origCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__stk) this.__stk = (new Error().stack || '').split('\n').slice(2, 5).map((l) => l.trim().replace('at ', '').replace('app://game/js/', '')).join(' < '); return origCtx.apply(this, a); };
  const probeTex = (() => { let t = null; sc.scene.traverse((o) => { if (!t && o.material && o.material.map) t = o.material.map; }); return t; })();
  const ED = probeTex && Object.getPrototypeOf(Object.getPrototypeOf(probeTex));
  const origAdd = ED && ED.addEventListener;
  if (origAdd) ED.addEventListener = function (type, fn, ...rest) { if (type === 'dispose' && this.isTexture && !this.__k1) { this.__k1 = 1; alive.add(this); origAdd.call(this, 'dispose', () => alive.delete(this)); } return origAdd.call(this, type, fn, ...rest); };
  const t0 = performance.now();
  const samples = [];
  const iv = setInterval(() => samples.push([Math.round((performance.now() - t0) / 1000), performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, r.info.memory.geometries, r.info.memory.textures, w.vehicles.length, w.pedestrians.length]), 15000);
  const o = await run('lek', async () => { teleport(RING[0][0], RING[0][1]); const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true); const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt); v.road = null; v.speed = 0; v.perfTemp = true; w.vehicles.push(v); p.enterVehicle(v, w); return { v }; },
    (c, t) => { const q = at(RING, (Math.max(0, t) * 22) % RING_LEN); const v = c.v; v.x = q.x; v.y = q.y; v.angle = q.ang; v.speed = t > 0 ? 22 : 0; v.vx = Math.cos(q.ang) * v.speed; v.vy = Math.sin(q.ang) * v.speed; w.camYaw = q.ang; },
    async (c) => { clearInterval(iv); p.exitVehicle(map, w); w.vehicles.splice(w.vehicles.indexOf(c.v), 1); }, { dur: 180000 });
  if (origAdd) ED.addEventListener = origAdd;
  HTMLCanvasElement.prototype.getContext = origCtx;
  const groups = new Map();
  for (const t of alive) { const im = t.image || {}; const k = ((t.image && t.image.__stk) || '') + ' | ' + (t.name || '') + ' ' + (im.width || (t.source && t.source.data && t.source.data.width) || '?') + 'x' + (im.height || '?') + ' f' + t.format + ' t' + t.type + (t.isCanvasTexture ? ' canvas' : '') + (t.isDataTexture ? ' data' : '') + (t.isCompressedTexture ? ' compressed' : '') + (t.generateMipmaps ? ' mips' : ''); groups.set(k, (groups.get(k) || 0) + 1); }
  return { ...o, samples, aliveTextures: alive.size, aliveGroups: [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25) };
});
// input to image: a synthetic W keydown to the first frame whose state moved (a software estimate: add one frame of display, no photodiode)
results.routes.latentie = await safe('latentie', async () => {
  if (ONLY.length && !ONLY.includes('latentie')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(5000);
  const key = (type) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: 'w', code: 'KeyW', bubbles: true })); };
  const lat = [];
  for (let i = 0; i < 20; i++) {
    const x0 = p.x, y0 = p.y;
    const hit = await new Promise((res) => { key('keydown'); const t1 = performance.now(); const f = () => { if (Math.hypot(p.x - x0, p.y - y0) > 0.001) res(performance.now() - t1); else if (performance.now() - t1 > 1000) res(null); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    key('keyup'); await sleep(400);
    if (hit != null) lat.push(+hit.toFixed(1));
  }
  const s = [...lat].sort((a, b) => a - b);
  return { n: lat.length, p50: s[Math.floor(s.length / 2)] ?? null, max: s[s.length - 1] ?? null, note: 'keydown to first frame whose player position changed, ms; add one frame of display' };
});

// scene census (only with PERF_ONLY=census): objects in the scene by top-level child, to see what the per-frame matrix and culling walk costs
results.routes.census = await safe('census', async () => {
  if (!ONLY.includes('census')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(8000);
  const rows = [];
  let total = 0, auto = 0, meshes = 0, inst = 0, visible = 0;
  const count = (o, acc) => { acc.n++; if (o.isMesh) acc.m++; if (o.matrixAutoUpdate) acc.a++; if (o.visible) acc.v++; for (const c of o.children) count(c, acc); };
  for (const c of sc.scene.children) { const acc = { n: 0, m: 0, a: 0, v: 0 }; count(c, acc); const kid = c.children[0]; rows.push([(kid ? ' kid=' + (kid.name || kid.type) + '/' + Object.keys(kid.userData || {}).slice(0, 3).join('/') + '/' + Object.keys(c.userData || {}).slice(0, 3).join('/') + ' @' + Math.round(c.position.x) + ',' + Math.round(c.position.z) : '') + ' ' + (c.name || c.type + ''), acc.n, acc.m, acc.a, acc.v, c.children.length]); total += acc.n; auto += acc.a; meshes += acc.m; visible += acc.v; }
  rows.sort((a, b) => b[1] - a[1]);
  const sigOf = (m) => [m.type, m.vertexColors ? 'vc' : '', m.map ? 'map' + (m.map.image && m.map.image.width) : '', m.roughness, m.metalness, m.emissive && m.emissive.getHex(), m.emissiveIntensity, m.flatShading ? 'flat' : '', m.side, m.transparent ? 'tr' : '', m.alphaTest, m.polygonOffset ? 'po' : '', m.envMapIntensity, m.onBeforeCompile ? 'obc' : ''].join('/');
  const mats = {};
  for (const grp of sc.scene.children) {
    if (!/batches/.test(grp.name)) continue;
    const e = (mats[grp.name] = { meshes: 0, tris: 0, bySig: {}, colors: new Set(), uuids: new Set() });
    grp.traverse((o) => { if (!o.isMesh) return; e.meshes++; const m = o.material; e.uuids.add(m.uuid); e.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; e.colors.add(m.color && m.color.getHexString()); const s = sigOf(m); e.bySig[s] = (e.bySig[s] || 0) + 1; });
  }
  const matsOut = Object.fromEntries(Object.entries(mats).map(([k, e]) => [k, { meshes: e.meshes, tris: Math.round(e.tris), materials: e.uuids.size, colors: e.colors.size, signatures: Object.entries(e.bySig).sort((a, b) => b[1] - a[1]).slice(0, 12) }]));
  const t0 = performance.now(); for (let i = 0; i < 20; i++) sc.scene.updateMatrixWorld(true); const walk = (performance.now() - t0) / 20;
  const t1 = performance.now(); for (let i = 0; i < 40; i++) sc.scene.updateMatrixWorld(false); const walkSoft = (performance.now() - t1) / 40;
  // which top-level groups never move: local transforms of every node, before and after 4 s of walking
  const snap = () => { const m = new Map(); const rec = (o) => { m.set(o, [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible ? 1 : 0].join(',')); for (const c of o.children) rec(c); }; for (const c of sc.scene.children) rec(c); return m; };
  const tW = performance.now();
  mover = (now) => walkFoot(null, (now - tW) / 1000);
  const s0 = snap(); await sleep(4000); const s1 = snap();
  mover = null;
  const stat = [];
  for (const c of sc.scene.children) {
    let n = 0, moved = 0, auto = 0;
    const rec = (o) => { n++; if (o.matrixAutoUpdate) auto++; if (s0.has(o) && s0.get(o) !== s1.get(o)) moved++; for (const k of o.children) rec(k); };
    rec(c);
    stat.push({ name: c.name || c.type, kids: c.children.length, n, auto, moved, keys: Object.keys(c.userData || {}).slice(0, 4).join('/'), first: c.children[0] ? (c.children[0].name || c.children[0].type) : '' });
  }
  const desc = (o, d = 0) => { const parts = [o.name || o.type, Object.keys(o.userData || {}).slice(0, 3).join('/')]; return d < 3 && o.children[0] ? parts.join(':') + ' > ' + desc(o.children[0], d + 1) : parts.join(':'); };
  const big = sc.scene.children.map((c, i) => ({ c, q: stat[i] })).filter((x) => x.q.auto >= 40 && x.q.moved === 0).sort((a, b) => b.q.auto - a.q.auto).slice(0, 25).map((x) => [x.q.auto, x.q.kids, +x.c.position.x.toFixed(0), +x.c.position.z.toFixed(0), desc(x.c), x.c.matrixWorldAutoUpdate]);
  const leafInfo = (c) => { let first = null, uk = new Set(), nm = new Set(); c.traverse((o) => { for (const k of Object.keys(o.userData || {})) uk.add(k); if (o.name) nm.add(o.name); if (o.isMesh && !first) first = o; }); const e = first ? first.matrixWorld.elements : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; const wp = { x: e[12], z: e[14] }; return { v: first ? first.geometry.attributes.position.count : 0, mat: first ? first.material.type + (first.material.name ? ':' + first.material.name : '') : '', uk: [...uk].slice(0, 8).join('/'), nm: [...nm].slice(0, 8).join('/'), d: Math.round(Math.hypot(wp.x - p.x, wp.z - p.y)), vis: c.visible }; };
  const mid = sc.scene.children.map((c, i) => ({ c, q: stat[i] })).filter((x) => x.q.auto >= 25 && x.q.auto < 169 && x.q.moved === 0).map((x) => [x.q.auto, x.q.kids, JSON.stringify(leafInfo(x.c))]);
  const frozen = stat.filter((q) => q.moved === 0 && q.auto > 0);
  const sumBy = {};
  for (const q of frozen) { const k = q.name + '|' + q.keys + '|' + q.first; const e = sumBy[k] || (sumBy[k] = { groups: 0, auto: 0 }); e.groups++; e.auto += q.auto; }
  return { total, auto, meshes, visible, top: rows.slice(0, 30), updateMatrixWorldMs: +walk.toFixed(2), walkSoftMs: +walkSoft.toFixed(2), batches: matsOut, frozenAuto: frozen.reduce((a, q) => a + q.auto, 0), movingAuto: stat.filter((q) => q.moved > 0).reduce((a, q) => a + q.auto, 0), frozenBy: sumBy, mid, big, moving: stat.filter((q) => q.moved > 0 && q.auto > 20).map((q) => [q.name, q.keys, q.first, q.n, q.auto, q.moved]) };
});
// what each top-level scene child costs the renderer (only with PERF_ONLY=cost): CPU time of 30 direct renders with that child hidden, against all visible
results.routes.cost = await safe('cost', async () => {
  if (!ONLY.includes('cost')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(8000);
  mover = (now) => walkFoot(null, (now - tStart) / 1000);
  const tStart = performance.now();
  const gl = r.getContext();
  const measure = () => { const t0 = performance.now(); for (let i = 0; i < 30; i++) r.render(sc.scene, sc.cam); gl.finish(); const t1 = performance.now(); return (t1 - t0) / 30; };
  await sleep(500);
  const base = []; for (let i = 0; i < 3; i++) base.push(measure());
  const baseMs = base.sort((a, b) => a - b)[1];
  const info0 = { calls: r.info.render.calls, tris: r.info.render.triangles };
  const kids = sc.scene.children.map((c, i) => ({ c, i, n: (() => { let n = 0; c.traverse(() => n++); return n; })() })).sort((a, b) => b.n - a.n).slice(0, 36);
  const rows = [];
  for (const k of kids) {
    const was = k.c.visible; k.c.visible = false;
    const ms = measure(); const calls = r.info.render.calls;
    k.c.visible = was;
    rows.push([(k.c.name || k.c.type) + ' #' + k.i + ' n=' + k.n, +(baseMs - ms).toFixed(2), info0.calls - calls]);
  }
  rows.sort((a, b) => b[1] - a[1]);
  const sm = r.shadowMap.enabled; r.shadowMap.enabled = false; measure(); const noShadow = measure(); r.shadowMap.enabled = sm;
  // the sun's shadow map at other sizes
  const sunL = []; sc.scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sunL.push(o); });
  const sizes = {};
  if (sunL[0]) { const L = sunL[0], s0 = L.shadow.mapSize.x; sizes.start = s0; for (const sz of [2048, 1024, s0]) { L.shadow.mapSize.set(sz, sz); if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null; } measure(); measure(); const a = measure(), b = measure(); sizes[sz] = +Math.min(a, b).toFixed(2); } }
  mover = null;
  return { baseMs: +baseMs.toFixed(2), baseCalls: info0.calls, noShadowMs: +noShadow.toFixed(2), sizes, rows: rows.slice(0, 12) };
});
// six fixed viewpoints in the city (only with PERF_ONLY=spots): one screenshot each, for before/after pixel comparisons
results.routes.spots = await safe('spots', async () => {
  if (!ONLY.includes('spots')) return null;
  fixWorld();
  const names = [];
  for (let i = 0; i < FOOT.length; i++) {
    teleport(FOOT[i][0], FOOT[i][1]);
    w.camYaw = i * 1.1; p.angle = w.camYaw;
    await sleep(9000);
    fixWorld();
    console.log('[capture] spot' + i);
    names.push('spot' + i);
    await sleep(600);
  }
  return { names };
});
// shader programs compiled while walking (only with PERF_ONLY=progs): when a program is first used the renderer blocks on its link
results.routes.progs = await safe('progs', async () => {
  if (!ONLY.includes('progs')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(6000);
  const tStart = performance.now();
  mover = (now) => walkFoot(null, (now - tStart) / 1000);
  const events = []; let n0 = r.info.programs.length, last = performance.now(), maxGap = 0;
  const gl = r.getContext();
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  await new Promise((res) => {
    const f = () => {
      const now = performance.now(), gap = now - last; last = now;
      const n = r.info.programs.length;
      if (n !== n0 || gap > 120) events.push({ t: Math.round(now - tStart), gap: Math.round(gap), newProgs: n - n0, names: n !== n0 ? r.info.programs.slice(n0).map((q) => q.name + ':' + String(q.cacheKey).length).join(',') : '' });
      n0 = n;
      if (now - tStart > 25000) res(); else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  mover = null;
  return { parallelCompile: !!ext, programs: r.info.programs.length, events: events.slice(0, 60), stalls: events.filter((e) => e.gap > 120).length, stallMs: events.filter((e) => e.gap > 120).reduce((a, e) => a + e.gap, 0) };
});
// who calls renderer.render, per frame (only with PERF_ONLY=renders)
results.routes.renders = await safe('renders', async () => {
  if (!ONLY.includes('renders')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(8000);
  const by = new Map(); let frames = 0;
  const prev = r.render;
  r.render = function (sc2, cam2) {
    const t = r.getRenderTarget();
    const k = (sc2.name || sc2.type) + '/' + (cam2.name || cam2.type) + '/' + (t ? t.width + 'x' + t.height + 's' + (t.samples || 0) : 'screen') + '/' + (new Error().stack.split(String.fromCharCode(10)).slice(2, 5).map((l) => l.trim().split('/').pop()).join(' < '));
    by.set(k, (by.get(k) || 0) + 1);
    return prev.call(r, sc2, cam2);
  };
  await new Promise((res) => { const f = () => { frames++; if (frames > 120) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  r.render = prev;
  return { frames, by: [...by].sort((a, b) => b[1] - a[1]).slice(0, 12) };
});
// deterministic counts on fixed camera spots (only with PERF_ONLY=det): GL draw calls (main scene and shadow pass), triangles, program switches,
// geometries and programs, and the CPU time of the scene render call; medians over 60 frames after the batchers have settled
results.routes.det = await safe('det', async () => {
  if (!ONLY.includes('det')) return null;
  const gl = r.getContext();
  const cnt = { draw: 0, use: 0 };
  for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = gl[n].bind(gl); gl[n] = (...a) => { cnt.draw++; return o(...a); }; }
  { const o = gl.useProgram.bind(gl); gl.useProgram = (q) => { cnt.use++; return o(q); }; }
  let inShadow2 = false, sh = 0, rec = null;
  const smR = r.shadowMap.render.bind(r.shadowMap);
  r.shadowMap.render = (...a) => { const d0 = cnt.draw; inShadow2 = true; try { smR(...a); } finally { inShadow2 = false; sh += cnt.draw - d0; } };
  const prevR = r.render;
  r.render = function (s2, c2) {
    if (s2 !== sc.scene || !rec) return prevR.call(r, s2, c2);
    sh = 0; const d0 = cnt.draw, u0 = cnt.use, t0 = performance.now();
    const out = prevR.call(r, s2, c2);
    const ms = performance.now() - t0;
    rec.push({ draws: cnt.draw - d0, shadow: sh, tris: r.info.render.triangles, uses: cnt.use - u0, ms });
    return out;
  };
  const med = (a, k) => { const v = a.map((x) => x[k]).sort((x, y) => x - y); return +v[v.length >> 1].toFixed(2); };
  const spots = [['stad-markt', FOOT[0][0], FOOT[0][1], 0.3], ['stad-straat', FOOT[3][0], FOOT[3][1], 1.9], ['a7-tussen', (A7[1][0] + A7[2][0]) / 2, (A7[1][1] + A7[2][1]) / 2, 0.5], ['dorp-winsum', ...placeAt('Winsum'), 2.2]];
  const out = {};
  for (const [name, x, y, yaw] of spots) {
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(8000); fixWorld();
    // settled: no batch built for 3 s (at most 40 s)
    { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((a, x) => a + x.builds + x.dropped, 0); }; let last = builds(), still = 0; for (let i = 0; i < 80 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
    rec = []; diag.clear(); if (window.__perfDiag) H.recording = true;
    await new Promise((res) => { const f = () => { if (rec.length >= 60) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const rr = rec; rec = null; H.recording = false;
    const ownersAll = [...diag].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / rr.length).toFixed(1)]); const owners = ownersAll;
    const staticDraws = Math.round(ownersAll.filter(([k]) => !k.startsWith('u:') && !k.startsWith('[sh] u:') || k.includes('isTerrain')).reduce((a, [, v]) => a + v, 0));
    out[name] = { staticDraws, batches: sc.batches(), actors: [w.vehicles.length, w.pedestrians.length], draws: med(rr, 'draws'), shadow: med(rr, 'shadow'), tris: med(rr, 'tris'), uses: med(rr, 'uses'), renderMs: med(rr, 'ms'), geometries: r.info.memory.geometries, programs: r.info.programs.length, owners: owners.slice(0, 60) };
  }
  r.render = prevR;
  return out;
});
// PoC multi-draw pool (PERF_POOL=1 with PERF_ONLY=ab): the meshes of the building/facade/road/shore batches that exist now are copied into one
// geometry per material (one THREE.BatchedMesh object with an identity matrix, its draw ranges chosen per frame by a sphere test per cell);
// the originals sit out while the variant is on (perfoff step 'pool' = pool off). Standing only: the batchers keep changing while walking.
function buildPoolPoC() {
  const T = sc.THREE;
  const roots = sc.scene.children.filter((c) => /^(building|facade|road|shore)-batches$/.test(c.name));
  const meshes = [];
  for (const r0 of roots) r0.traverse((o) => { if (o.isMesh && o.userData.staticBatch && !Array.isArray(o.material) && o.geometry.index) meshes.push(o); });
  const buckets = new Map();
  for (const m of meshes) {
    const g = m.geometry; const sig = Object.keys(g.attributes).sort().join(',');
    const key = m.material.uuid + '|' + (m.castShadow ? 1 : 0) + '|' + sig;
    let b = buckets.get(key); if (!b) buckets.set(key, b = { mat: m.material, cast: m.castShadow, names: Object.keys(g.attributes).sort(), items: [], verts: 0, idx: 0 });
    b.items.push(m); b.verts += g.attributes.position.count; b.idx += g.index.count;
  }
  const pools = [];
  let totalEntries = 0;
  for (const b of buckets.values()) {
    const geo = new T.BufferGeometry();
    for (const n of b.names) {
      const a0 = b.items[0].geometry.attributes[n];
      const out = new a0.array.constructor(b.verts * a0.itemSize); let o = 0;
      for (const m of b.items) { const a = m.geometry.attributes[n]; out.set(a.array, o); o += a.array.length; }
      geo.setAttribute(n, new T.BufferAttribute(out, a0.itemSize, a0.normalized));
    }
    const index = new Uint32Array(b.idx); let io = 0, vo = 0;
    const ent = new Float32Array(b.items.length * 4); const start = new Int32Array(b.items.length), count = new Int32Array(b.items.length);
    b.items.forEach((m, i) => {
      const g = m.geometry, ix = g.index.array; start[i] = io; count[i] = ix.length;
      for (let k = 0; k < ix.length; k++) index[io + k] = ix[k] + vo;
      io += ix.length; vo += g.attributes.position.count;
      if (!g.boundingSphere) g.computeBoundingSphere();
      ent[i * 4] = g.boundingSphere.center.x; ent[i * 4 + 1] = g.boundingSphere.center.y; ent[i * 4 + 2] = g.boundingSphere.center.z; ent[i * 4 + 3] = g.boundingSphere.radius;
    });
    geo.setIndex(new T.BufferAttribute(index, 1));
    geo.setAttribute('batchId', new T.BufferAttribute(new Uint16Array(b.verts), 1));
    // three recompiles a program each time a material switches between a batched and a plain mesh: the pool gets its own copy
    const pm0 = b.mat.clone(); pm0.onBeforeCompile = b.mat.onBeforeCompile; { const ck = b.mat.customProgramCacheKey; pm0.customProgramCacheKey = () => (ck ? ck.call(b.mat) : '') + '|pool'; }
    const pool = new T.BatchedMesh(1, 1, 1, pm0);
    pool.geometry = geo; pool.frustumCulled = false; pool.castShadow = b.cast; pool.receiveShadow = true; pool.matrixAutoUpdate = false;
    pool._matricesTexture.image.data.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); pool._matricesTexture.needsUpdate = true;
    pool.userData.poolPoC = true;
    // the shared depth material would flip between batched and plain meshes in the shadow pass
    pool.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
    const starts = new Int32Array(b.items.length), counts = new Int32Array(b.items.length), fr = new T.Frustum(), pm = new T.Matrix4(), sp = new T.Sphere();
    const cull = (camera) => {
      pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
      let n = 0;
      for (let i = 0; i < b.items.length; i++) { sp.center.set(ent[i * 4], ent[i * 4 + 1], ent[i * 4 + 2]); sp.radius = ent[i * 4 + 3]; if (fr.intersectsSphere(sp)) { starts[n] = start[i] * 4; counts[n] = count[i]; n++; } }
      pool._multiDrawStarts = starts; pool._multiDrawCounts = counts; pool._multiDrawCount = n;
    };
    pool.onBeforeRender = (renderer, scene, camera) => cull(camera);
    pool.onBeforeShadow = (renderer, object, camera, shadowCamera) => cull(shadowCamera);
    totalEntries += b.items.length;
    pools.push(pool);
  }
  const grp = new T.Group(); grp.name = 'pool-poc'; grp.matrixAutoUpdate = false;
  for (const q of pools) grp.add(q);
  sc.scene.add(grp);
  const set = (on) => { grp.visible = on; for (const r0 of roots) r0.visible = !on; };
  return { set, info: { pools: pools.length, sources: meshes.length, entries: totalEntries, roots: roots.map((c) => c.name) } };
}
// the pool PoC against the plain batches, render calls only (only with PERF_ONLY=poolrender): 30 direct renders per sample, the variants in turns,
// so the load of the machine is the same for both; median and paired difference over PAIRS pairs
results.routes.poolrender = await safe('poolrender', async () => {
  if (!ONLY.includes('poolrender')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(window.__perfSettle || 12000);
  const pool = buildPoolPoC();
  await sleep(1500);
  const gl = r.getContext();
  const measure = () => { const t0 = performance.now(); for (let i = 0; i < 30; i++) r.render(sc.scene, sc.cam); gl.finish(); return (performance.now() - t0) / 30; };
  const rows = [];
  for (let k = 0; k < 4; k++) { pool.set(false); measure(); pool.set(true); measure(); }
  for (let k = 0; k < (window.__perfPairs || 24); k++) {
    const order = k % 2 ? [true, false] : [false, true];
    const res = {};
    for (const on of order) { pool.set(on); res[on] = measure(); res[on + 'calls'] = r.info.render.calls; res[on + 'tris'] = r.info.render.triangles; }
    rows.push(res);
    await sleep(50);
  }
  pool.set(false);
  const med = (a) => { const v = [...a].sort((x, y) => x - y); return +v[v.length >> 1].toFixed(2); };
  const diffs = rows.map((q) => q.true - q.false);
  return { info: pool.info, off: med(rows.map((q) => q.false)), on: med(rows.map((q) => q.true)), diffMedian: med(diffs), lower: diffs.filter((x) => x < 0).length, pairs: rows.length, callsOff: rows[0].falsecalls, callsOn: rows[0].truecalls, trisOff: rows[0].falsetris, trisOn: rows[0].truetris, diffs: diffs.map((x) => +x.toFixed(2)) };
});
// render-only A/B inside one run (only with PERF_ONLY=renderab, variants as PERF_AB): per variant (perfoff steps) the batchers settle, then SAMPLES samples of
// 20 direct scene renders (the camera standing); the median and the lower quartile of the ms per render (the lower quartile is what the machine's other work disturbs least),
// the GL calls per render and the variants in turns over ROUNDS rounds (the order swaps every round), so the load is the same for all of them
results.routes.renderab = await safe('renderab', async () => {
  if (!ONLY.includes('renderab')) return null;
  const variants = (window.__perfAbFor && window.__perfAbFor.renderab) || window.__perfAb; const ROUNDS = window.__perfAbRounds || 4; const SAMPLES = window.__perfSamples || 40;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3; await sleep(window.__perfSettle || 12000);
  const gl = r.getContext();
  const settle = async () => { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 120 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } };
  // the cull of actors and groups and the matrix-walk switch of update3D go ahead of each render (window.__perfCullPass=1 in the page; s13), as in the game
  // PERF_AB_NODRAW=1: renderBufferDirect does nothing, so what is timed is the scene walk alone (matrices, culling, render lists, sorting, the shadow pass's walk): no draw call and no GPU in it
  const noDraw = window.__perfAbNoDraw ? () => {} : null;
  const sample = () => { const rbd = r.renderBufferDirect; if (noDraw) r.renderBufferDirect = noDraw; const t0 = performance.now(); try { for (let i = 0; i < 20; i++) { if (sc.cullPass) sc.cullPass(); try { r.render(sc.scene, sc.cam); } finally { if (sc.restorePass) sc.restorePass(); } } } finally { r.renderBufferDirect = rbd; } if (!noDraw) gl.finish(); return (performance.now() - t0) / 20; };
  const out = [];
  for (let round = 0; round < ROUNDS; round++) {
    const order = round % 2 ? [...variants].reverse() : variants;
    for (const [name, off] of order) {
      window.__perfOffDyn = new Set(off);
      await sleep(1500); await settle(); fixWorld(); await sleep(500);
      sample(); sample();
      const t = []; let calls = 0, tris = 0;
      // the thread sampler of run.mjs turns the marks into the CPU ms of the main thread per render (threadCpu 'renderab:<name>:<round>')
      console.error('[perf-mark] start renderab:' + name + ':' + round + ' ' + Date.now());
      for (let i = 0; i < SAMPLES; i++) { t.push(sample()); calls = r.info.render.calls; tris = r.info.render.triangles; if (i % 8 === 7) await sleep(30); }
      console.error('[perf-mark] end renderab:' + name + ':' + round + ' ' + Date.now() + ' ' + SAMPLES * 20);
      t.sort((a, b) => a - b);
      out.push({ name, round, median: +t[t.length >> 1].toFixed(2), q1: +t[t.length >> 2].toFixed(2), min: +t[0].toFixed(2), calls, tris, pool: sc.batches().pool });
    }
  }
  window.__perfOffDyn = undefined;
  const summary = {};
  for (const [name] of variants) { const rows = out.filter((q) => q.name === name); const med = (k) => { const v = rows.map((q) => q[k]).sort((a, b) => a - b); return v[v.length >> 1]; }; summary[name] = { median: med('median'), q1: med('q1'), min: med('min'), calls: med('calls'), tris: med('tris') }; }
  return { summary, rows: out };
});
// GL calls per frame by function (only with PERF_ONLY=glcalls): every function of the context is counted over 90 frames of the running game at the standing camera, the shadow pass apart;
// the cost of the renderer's main thread is mostly the writing of these calls, so their number is the deterministic measure of it (docs/PERF-METING-2026-10-19.md, Vervolg 9)
results.routes.glcalls = await safe('glcalls', async () => {
  if (!ONLY.includes('glcalls')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3; await sleep(window.__perfSettle || 12000);
  const variants = (window.__perfAbFor && window.__perfAbFor.glcalls) || (window.__perfAb && window.__perfAb.length ? window.__perfAb : [['', []]]);
  const outAll = {};
  for (const [vname, voff] of variants) {
  window.__perfOffDyn = new Set(voff); await sleep(1500);
  { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 80 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
  fixWorld();
  const gl = r.getContext(); const proto = Object.getPrototypeOf(gl);
  const cnt = { main: new Map(), shadow: new Map(), other: new Map() }; let phase = 'other';
  const origs = [];
  for (const name of Object.getOwnPropertyNames(proto)) {
    let d; try { d = gl[name]; } catch (e) { continue; }
    if (typeof d !== 'function' || name === 'constructor') continue;
    // what the context holds now (an own property of the context is put back afterwards, a prototype method stays where it is)
    const o = d; origs.push([name, o, Object.prototype.hasOwnProperty.call(gl, name)]);
    gl[name] = function (...a) { const m = cnt[phase]; m.set(name, (m.get(name) || 0) + 1); if (owner !== null && phase === 'main') { let q = byOwner.get(owner); if (!q) byOwner.set(owner, q = new Map()); q.set(name, (q.get(name) || 0) + 1); } return o.apply(gl, a); };
  }
  const smR = r.shadowMap.render.bind(r.shadowMap);
  r.shadowMap.render = (...a) => { const was = phase; phase = 'shadow'; try { smR(...a); } finally { phase = was; } };
  const prevR = r.render; let frames = 0;
  // with PERF_DIAG=1 the GL calls of the main pass are attributed to the owner of the draw they belong to (the diag owner names), per function
  let owner = null; const byOwner = new Map();
  // the program of each draw of the main pass in order: the distinct programs and the runs of the same program (a switch re-uploads the lights, fog and shadow uniforms)
  const rbd = r.renderBufferDirect; let seq = [], seqs = [];
  r.renderBufferDirect = function (camera, scene2, geometry, material, object, group) { if (window.__ownerOf && phase === 'main') owner = window.__ownerOf(object).replace(/ (Buffer|Extrude|Box|Cylinder|Plane|Circle|Sphere|Shape)[^ ]*.*$/, '').slice(0, 60); const out = rbd.call(r, camera, scene2, geometry, material, object, group); owner = null; if (phase === 'main') { const pr = r.properties.get(material).currentProgram; seq.push(pr ? pr.id : -1); } return out; };
  r.render = function (s2, c2) { if (s2 !== sc.scene) return prevR.call(r, s2, c2); const was = phase; phase = 'main'; frames++; seq = []; try { return prevR.call(r, s2, c2); } finally { phase = was; seqs.push(seq); } };
  const f0 = frameCount();
  const fst = gl.__glFilter ? { ...gl.__glFilter } : null; // (only a build with a filter of redundant GL calls has this; the one of r42 was taken out again, see Vervolg 9)
  await new Promise((res) => { const f = () => { if (frames >= 90) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const filtered = fst ? { pixelStorei: +((gl.__glFilter.skippedPixelStore - fst.skippedPixelStore) / frames).toFixed(1), texParameteri: +((gl.__glFilter.skippedTexParameter - fst.skippedTexParameter) / frames).toFixed(1) } : null;
  r.render = prevR; r.shadowMap.render = smR; r.renderBufferDirect = rbd;
  for (const [name, o, own] of origs) { if (own) gl[name] = o; else delete gl[name]; }
  const progs = seqs.map((q) => { let runs = 0, last = null; const set = new Set(); for (const id of q) { set.add(id); if (id !== last) runs++; last = id; } return { draws: q.length, distinct: set.size, runs }; });
  const medP = (k) => { const v = progs.map((q) => q[k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const top = (m, n = 28) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +(v / frames).toFixed(1)]);
  const sum = (m) => +([...m.values()].reduce((a, b) => a + b, 0) / frames).toFixed(1);
  void f0;
  const owners = [...byOwner].map(([k, m]) => [k, +([...m.values()].reduce((a, b) => a + b, 0) / frames).toFixed(1), [...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => n + '=' + +(v / frames).toFixed(1)).join(' ')]).sort((a, b) => b[1] - a[1]).slice(0, 24);
  outAll[vname || 'basis'] = { owners, filtered, frames, programs: { draws: medP('draws'), distinct: medP('distinct'), runs: medP('runs') }, mainTotal: sum(cnt.main), shadowTotal: sum(cnt.shadow), otherTotal: sum(cnt.other), main: top(cnt.main), shadow: top(cnt.shadow, 12), other: top(cnt.other, 12), calls: r.info.render.calls };
  }
  window.__perfOffDyn = undefined;
  return outAll;
});
// what one GL call costs the main thread (only with PERF_ONLY=glbench): ns per call of the calls three makes per draw, on a scratch canvas with the same flags as the game's
results.routes.glbench = await safe('glbench', async () => {
  if (!ONLY.includes('glbench')) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
  const vs = g.createShader(g.VERTEX_SHADER); g.shaderSource(vs, '#version 300 es\nin vec3 p; uniform mat4 m; uniform mat3 n; uniform vec3 c; uniform float f; void main(){ gl_Position = m * vec4(p + c * f + n[0], 1.0); }'); g.compileShader(vs);
  const fs2 = g.createShader(g.FRAGMENT_SHADER); g.shaderSource(fs2, '#version 300 es\nprecision mediump float; out vec4 o; void main(){ o = vec4(1.0); }'); g.compileShader(fs2);
  const pr = g.createProgram(); g.attachShader(pr, vs); g.attachShader(pr, fs2); g.linkProgram(pr); g.useProgram(pr);
  const vao = g.createVertexArray(); g.bindVertexArray(vao);
  const vb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, new Float32Array(9 * 64), g.DYNAMIC_DRAW); g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 3, g.FLOAT, false, 0, 0);
  const ib = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint32Array(3 * 64).map((_, i) => i % 3), g.DYNAMIC_DRAW);
  const vao2 = g.createVertexArray();
  const M = new Float32Array(16), N = new Float32Array(9);
  const loc = (n) => g.getUniformLocation(pr, n);
  const md = g.getExtension('WEBGL_multi_draw');
  const starts = new Int32Array(40), counts = new Int32Array(40).fill(3);
  const tex = g.createTexture();
  const tests = {
    uniformMatrix4fv: () => g.uniformMatrix4fv(loc('m'), false, M),
    uniformMatrix3fv: () => g.uniformMatrix3fv(loc('n'), false, N),
    uniform3f: () => g.uniform3f(loc('c'), 1, 2, 3),
    uniform1f: () => g.uniform1f(loc('f'), 1),
    getUniformLocation: () => loc('m'),
    bindVertexArray: (i) => g.bindVertexArray(i & 1 ? vao : vao2),
    bindTexture: (i) => g.bindTexture(g.TEXTURE_2D, i & 1 ? tex : null),
    activeTexture: (i) => g.activeTexture(g.TEXTURE0 + (i & 3)),
    useProgram: (i) => g.useProgram(i & 1 ? pr : null),
    drawElements: () => g.drawElements(g.TRIANGLES, 3, g.UNSIGNED_INT, 0),
    multiDraw40: () => md && md.multiDrawElementsWEBGL(g.TRIANGLES, counts, 0, g.UNSIGNED_INT, starts, 0, 40),
    bufferSubData: () => g.bufferSubData(g.ELEMENT_ARRAY_BUFFER, 0, new Uint32Array(3)),
    disable_enable: (i) => (i & 1 ? g.enable(g.BLEND) : g.disable(g.BLEND)),
  };
  const out = {};
  for (const [name, fn] of Object.entries(tests)) {
    for (let i = 0; i < 2000; i++) fn(i);
    g.finish();
    const best = [];
    for (let rep = 0; rep < 5; rep++) { const N2 = 4000; const t0 = performance.now(); for (let i = 0; i < N2; i++) fn(i); const t1 = performance.now(); best.push((t1 - t0) * 1e6 / N2); g.finish(); }
    best.sort((a, b) => a - b);
    out[name] = { minNs: Math.round(best[0]), medNs: Math.round(best[2]) };
  }
  return out;
});
// CPU profile of nothing but the scene render (only with PERF_ONLY=renderprof, GDE_PROFILE_OUT=<dir> for the raw profile): the camera stands, the scene is rendered
// straight to the canvas in a loop for PERF_DUR ms (default 12 s) while the profiler runs; node scripts/perf/selftime.mjs <dir>/*.cpuprofile shows which functions the time is in
results.routes.renderprof = await safe('renderprof', async () => {
  if (!ONLY.includes('renderprof')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3; await sleep(window.__perfSettle || 12000);
  { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 80 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
  fixWorld();
  const linkedAfter = await allLinked();
  const gl = r.getContext();
  // the first renders straight to the canvas need every program once more (tone mapping and colour space of the target are part of a program): they link in the frame, seconds in all
  const warm0 = performance.now();
  for (let k = 0; k < 4; k++) { r.render(sc.scene, sc.cam); gl.finish(); await sleep(50); }
  const linkedAfter2 = await allLinked(); const warmMs = Math.round(performance.now() - warm0);
  for (let k = 0; k < 3; k++) { r.render(sc.scene, sc.cam); gl.finish(); await sleep(50); }
  const ms = Math.min(15000, window.__perfDur || 12000);
  console.log('[profile] ' + ms);
  await sleep(300);
  const t0 = performance.now(); let n = 0;
  while (performance.now() - t0 < ms) { for (let i = 0; i < 10; i++) { r.render(sc.scene, sc.cam); n++; } gl.finish(); await sleep(0); }
  return { renders: n, msPerRender: +((performance.now() - t0) / n).toFixed(2), linkedAfter, warmMs, linkedAfter2 };
});
// where the frame time of the city on foot goes (only with PERF_ONLY=r46; r46, #246): windows of the same walk with one part of the frame switched off,
// alternating in one process (the machine is never quiet, so only a window next to its neighbours means something). Per window: the interval of the
// frames (histogram: a frame that misses a vsync costs 33 ms), the time inside the rAF callback, the GPU timer, the sections of the hitch probe, and
// the thread sampler of run.mjs (`mcpu` and the GPU process) through the marks `r46:<variant>:<round>`.
// PERF_R46='base;nopostfx;noshadow;pauzesim;hudoff' (variants), PERF_AB_ROUNDS (rounds), PERF_AB_WIN (ms per window), PERF_SETTLE
results.routes.r46 = await safe('r46', async () => {
  if (!ONLY.includes('r46')) return null;
  const WIN = window.__perfAbWin || 6000, ROUNDS = window.__perfAbRounds || 3;
  const VAR = (window.__perfR46 || 'base;nopostfx;noshadow;pauzesim;hudoff').split(';').filter(Boolean);
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3;
  const FLEN = pathLen(FOOT);
  let SPEED = window.__perfAbMove === 9 ? 0 : 3; // PERF_AB_MOVE=9: standing still; a variant 'stand' stands still for its window
  let sAcc = 0, tPrev = performance.now();
  mover = (now) => { // 3 m/s along the path, back and forth
    sAcc += ((now - tPrev) / 1000) * SPEED; tPrev = now;
    const s = sAcc, L = FLEN * 2, m = s % L, back = m > FLEN;
    const q = at(FOOT, back ? L - m : m);
    p.x = q.x; p.y = q.y; p.angle = back ? q.ang + Math.PI : q.ang; w.camYaw = p.angle;
  };
  await sleep(window.__perfSettle || 20000);
  const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); };
  { let last = builds(), still = 0; for (let i = 0; i < 120 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
  await allLinked();
  const hud = document.getElementById('hud');
  const pfx = sc.postfx, pfxRender = pfx.render, shRender = r.shadowMap.render.bind(r.shadowMap);
  const shOrig = r.shadowMap.render;
  // gltime: every function of the context times itself (performance.now() pairs, jittered by the browser, so only the sums over thousands of calls mean anything)
  const gl2 = r.getContext(); let glT = null;
  const glOn = () => {
    glT = new Map();
    const proto = Object.getPrototypeOf(gl2);
    for (const k of Object.getOwnPropertyNames(proto)) {
      let f; try { f = gl2[k]; } catch (e) { continue; }
      if (typeof f !== 'function' || k === 'constructor' || Object.prototype.hasOwnProperty.call(gl2, k)) continue;
      const e = { n: 0, ms: 0 }; glT.set(k, e);
      gl2[k] = function (...a) { const t = performance.now(); const v = f.apply(gl2, a); e.ms += performance.now() - t; e.n++; return v; };
    }
  };
  const glOff = () => { if (!glT) return null; for (const k of glT.keys()) delete gl2[k]; const o = glT; glT = null; return o; };
  // disposewho: who frees geometries and textures (gl.deleteBuffer and deleteVertexArray cost 1 to 2 ms a call), by the first game frames of the stack
  const T = sc.THREE; let dispWho = null; const dispOrig = [];
  const dispOn = () => {
    dispWho = new Map();
    for (const [proto, label] of [[T.BufferGeometry.prototype, 'geometry'], [T.Texture.prototype, 'texture'], [T.WebGLRenderTarget.prototype, 'target']]) {
      const f = proto.dispose; dispOrig.push([proto, f]);
      proto.dispose = function (...a) {
        const st = (new Error().stack || '').split(String.fromCharCode(10)).slice(2, 9).map((l) => /at (\S+) \(?.*?([\w.]+\.js):(\d+)/.exec(l) || []).filter((m) => m[2] && !/three\.module/.test(m[2])).slice(0, 2).map((m) => m[1] + ' ' + m[2] + ':' + m[3]).join(' < ');
        const k = label + ' ' + (label === 'geometry' ? (this.attributes && this.attributes.position ? (this.attributes.position.count < 100 ? '<100' : this.attributes.position.count < 2000 ? '<2k' : '>2k') : '?') : '') + ' ' + st;
        dispWho.set(k, (dispWho.get(k) || 0) + 1);
        return f.apply(this, a);
      };
    }
  };
  const dispOff = () => { if (!dispWho) return null; for (const [proto, f] of dispOrig) proto.dispose = f; dispOrig.length = 0; const o = dispWho; dispWho = null; return o; };
  const SETm = await imp('settings'), SCNm = await imp('scene3d'); let undoSet = null;
  // progcalls: how often three asks for a material's program per frame (getParameters calls the material's customProgramCacheKey each time); by material
  let progC = null, progOrig = null;
  const progOn = () => {
    progC = new Map(); progOrig = T.Material.prototype.customProgramCacheKey;
    T.Material.prototype.customProgramCacheKey = function () { const k = this.type + ' ' + (this.name || '') + ' ' + (this.userData && this.userData.pk !== undefined ? 'pk' : '') + (this.skinning ? 's' : '') + ' #' + this.id; progC.set(k, (progC.get(k) || 0) + 1); return progOrig.call(this); };
  };
  const progOff = () => { if (!progC) return null; T.Material.prototype.customProgramCacheKey = progOrig; const o = progC; progC = null; return o; };
  const apply = (name) => {
    const set = new Set(name.split('+'));
    if (set.has('progcalls') && !progC) progOn();
    SPEED = set.has('stand') ? 0 : window.__perfAbMove === 9 ? 0 : 3;
    // set:<setting>:<value>: that setting for this window only (set:resolution:0.5, set:quality:laag, set:drawDistance:kort)
    if (undoSet) { undoSet(); undoSet = null; }
    const sets = {}; for (const t of set) if (t.startsWith('set:')) { const [, k, v] = t.split(':'); sets[k] = v; }
    if (Object.keys(sets).length) undoSet = SETm.withTempSettings(sets);
    if (set.has('gltime') && !glT) glOn();
    if (set.has('disposewho') && !dispWho) dispOn();
    // off:<step>: the ?perfoff= steps of devflags.js for this window (off:schaduwhaak+off:pool ...)
    window.__perfOffDyn = new Set([...set].filter((t) => t.startsWith('off:')).map((t) => t.slice(4)));
    pfx.render = set.has('nopostfx') ? () => {} : pfxRender;
    r.shadowMap.render = set.has('noshadow') ? () => {} : shOrig;
    w.coopHold = set.has('pauzesim');
    if (hud) hud.style.display = set.has('hudoff') ? 'none' : '';
  };
  const out = [];
  for (let round = 0; round < ROUNDS; round++) {
    const order = round % 2 ? [...VAR].reverse() : VAR;
    for (const name of order) {
      apply(name);
      await sleep(1500); fixWorld();
      if (window.__hitch) window.__hitch.reset();
      const prof = round === 0 && (window.__perfProfile || '').split(',').includes(name === 'base' ? 'r46' : 'r46:' + name);
      H.start();
      console.error('[perf-mark] start r46:' + name + ':' + round + ' ' + Date.now());
      if (prof) console.log('[profile] ' + Math.min(WIN - 1000, 15000));
      if (round === 0 && (window.__perfProfile || '').split(',').includes('heap:' + name)) console.log('[heapprof] ' + Math.min(WIN - 1000, 15000));
      if (round === 0 && name === 'base' && (window.__perfProfile || '').split(',').includes('r46trace')) console.log('[trace] ' + Math.min(WIN - 1500, 6000));
      const frames0 = H.frames.length;
      const cc0 = calls, tr0 = tris, rn0 = renders, rt0 = { ...rt };
      const batchNow = () => Object.fromEntries(Object.entries(sc.batches()).filter(([, v]) => v && v.ms !== undefined).map(([k, v]) => [k, [v.ms, v.frames, v.builds, v.dropped]]));
      const bs0 = batchNow();
      // heap per frame (with --enable-precise-memory-info): what rises between two frames is what the frame allocated, a fall is a GC
      const heap = []; let heapOn = true; const heapTick = () => { heap.push(performance.memory.usedJSHeapSize); if (heapOn) requestAnimationFrame(heapTick); }; requestAnimationFrame(heapTick);
      await sleep(WIN);
      heapOn = false;
      const fr = H.frames.slice();
      const res = H.stop();
      console.error('[perf-mark] end r46:' + name + ':' + round + ' ' + Date.now() + ' ' + res.frames);
      void frames0;
      const dts = []; for (let i = 1; i < fr.length; i++) dts.push(fr[i][0] - fr[i - 1][0]);
      const hist = { '<12': 0, '12-15': 0, '15-18': 0, '18-25': 0, '25-36': 0, '36-50': 0, '>50': 0 };
      for (const d of dts) hist[d < 12 ? '<12' : d < 15 ? '12-15' : d < 18 ? '15-18' : d < 25 ? '18-25' : d < 36 ? '25-36' : d < 50 ? '36-50' : '>50']++;
      const bs1 = batchNow();
      const batch = Object.fromEntries(Object.keys(bs1).map((k) => [k, { msPerFrame: +((bs1[k][0] - bs0[k][0]) / Math.max(1, bs1[k][1] - bs0[k][1])).toFixed(3), builds: bs1[k][2] - bs0[k][2], dropped: bs1[k][3] - bs0[k][3] }]));
      const row = { name, round, ...res, hist, callsPerFrame: Math.round((calls - cc0) / Math.max(1, res.frames)), rendersPerFrame: +((renders - rn0) / Math.max(1, res.frames)).toFixed(2), rt: { scene: +((rt.scene - rt0.scene) / Math.max(1, res.frames)).toFixed(2), quad: +((rt.quad - rt0.quad) / Math.max(1, res.frames)).toFixed(2), quadN: +((rt.quadN - rt0.quadN) / Math.max(1, res.frames)).toFixed(1) }, batch };
      { let up = 0, gcs = 0, gcKB = 0; for (let i = 1; i < heap.length; i++) { const d = heap[i] - heap[i - 1]; if (d >= 0) up += d; else { gcs++; gcKB += -d; } } row.alloc = { kbPerFrame: +(up / 1024 / Math.max(1, heap.length - 1)).toFixed(1), gcs, gcMB: +(gcKB / 1048576).toFixed(1), perSecond: +(gcs / (WIN / 1000)).toFixed(2) }; }
      if (window.__hitch) { const hs = window.__hitch.summary(); row.sections = hs.sections; row.peaks = hs.peaks; row.slowFrames = hs.slow.slice(0, 12).map((q) => [q.gap, q.cpu, (q.sections || []).slice(0, 4)]); }
      const pc = progOff();
      if (pc) { const f = Math.max(1, res.frames); const rows = [...pc].sort((a, b) => b[1] - a[1]); row.progcalls = { perFrame: +(rows.reduce((q, x) => q + x[1], 0) / f).toFixed(1), materials: rows.length, top: rows.slice(0, 14).map(([k, n]) => [k, +(n / f).toFixed(2)]) }; }
      const dw = dispOff();
      if (dw) row.dispose = [...dw].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => [k, +(n / Math.max(1, res.frames)).toFixed(3)]);
      const gt = glOff();
      if (gt) { const f = Math.max(1, res.frames); const rows = [...gt].filter(([, e]) => e.n).map(([k, e]) => [k, +(e.ms / f).toFixed(3), +(e.n / f).toFixed(1)]).sort((a, b) => b[1] - a[1]); row.gl = { totalMs: +rows.reduce((q, x) => q + x[1], 0).toFixed(2), totalCalls: +rows.reduce((q, x) => q + x[2], 0).toFixed(0), top: rows.slice(0, 30) }; }
      out.push(row);
    }
  }
  apply('base');
  if (undoSet) { undoSet(); undoSet = null; }
  window.__perfOffDyn = undefined;
  mover = null;
  if ((window.__perfProfile || '').split(',').includes('r46trace')) await sleep(8000); // the trace file is written after the window
  return { rows: out, flen: FLEN, speed: SPEED };
});
// the scene as the main pass walks it (only with PERF_ONLY=s13walk; s13, #246): on a few frames of the walk, at the moment postfx.render starts (the
// culled groups hidden, the hidden walks switched off), per top-level group: the nodes updateMatrixWorld reaches (matrixWorldAutoUpdate chain, with
// how many recompose their matrix: matrixAutoUpdate), the nodes projectObject reaches (visible chain), their meshes and the meshes inside the frustum
results.routes.s13walk = await safe('s13walk', async () => {
  if (!ONLY.includes('s13walk')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3;
  const FLEN = pathLen(FOOT);
  let sAcc = 0, tPrev = performance.now();
  mover = (now) => { sAcc += ((now - tPrev) / 1000) * 3; tPrev = now; const L = FLEN * 2, m = sAcc % L, back = m > FLEN; const q = at(FOOT, back ? L - m : m); p.x = q.x; p.y = q.y; p.angle = back ? q.ang + Math.PI : q.ang; w.camYaw = p.angle; };
  await sleep(window.__perfSettle || 20000);
  const THREE_ = sc.THREE, fr = new THREE_.Frustum(), pm = new THREE_.Matrix4(), sph = new THREE_.Sphere();
  const owners = new Map(); let samples = 0, wantSamples = Number(window.__perfSamples) || 10;
  const tot = { walkNodes: 0, walkAuto: 0, projNodes: 0, projMeshes: 0, inFrustum: 0, instanced: 0, skinned: 0, lights: 0 };
  const keyOf = (c) => (c.name || c.type) + '{' + Object.keys(c.userData || {}).filter((k) => k !== 'shadowCasters').slice(0, 3).join('/') + '}' + (c.children[0] ? '>' + (c.children[0].name || c.children[0].type) + '{' + Object.keys(c.children[0].userData || {}).slice(0, 2).join('/') + '}' : '');
  const census = () => {
    sc.cam.updateMatrixWorld(); pm.multiplyMatrices(sc.cam.projectionMatrix, sc.cam.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    for (const top of sc.scene.children) {
      const e = owners.get(keyOf(top)) || (() => { const q = { samples: [], tops: 0, walkNodes: 0, walkAuto: 0, projNodes: 0, projMeshes: 0, inFrustum: 0, skinned: 0, instanced: 0, tris: 0 }; owners.set(keyOf(top), q); return q; })();
      e.tops++;
      if (e.samples.length < 3 && /^Group{}|^Mesh{}/.test(keyOf(top))) { let m = null; top.traverse((o) => { if (!m && o.isMesh) m = o; }); e.samples.push([top.children.length, Math.round(top.position.x), Math.round(top.position.z), Math.round(Math.hypot(top.position.x - p.x, top.position.z - p.y)), top.matrixAutoUpdate ? 'A' : 'f', top.castShadow ? 'cs' : '', m ? m.geometry.type + ':' + (m.geometry.attributes.position ? m.geometry.attributes.position.count : 0) + ':' + m.material.type + ':' + (m.material.color ? m.material.color.getHexString() : '') + (m.castShadow ? ':cast' : '') + (m.frustumCulled ? '' : ':nofc') + (m.name ? ':' + m.name : '') : '-']); }
      const walk = (o) => { e.walkNodes++; tot.walkNodes++; if (o.matrixAutoUpdate) { e.walkAuto++; tot.walkAuto++; } for (const c of o.children) if (c.matrixWorldAutoUpdate === true) walk(c); };
      if (!top.isLight && !top.isCamera && top.matrixWorldAutoUpdate === true) walk(top);
      if (!top.visible) continue;
      const proj = (o) => {
        e.projNodes++; tot.projNodes++;
        if (o.isMesh || o.isLine || o.isPoints || o.isSprite) {
          e.projMeshes++; tot.projMeshes++;
          let inside = true;
          if (o.frustumCulled && o.geometry && o.geometry.boundingSphere) { sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); inside = fr.intersectsSphere(sph); }
          if (inside) { e.inFrustum++; tot.inFrustum++; }
          if (o.isSkinnedMesh) { e.skinned++; tot.skinned++; }
          if (o.isInstancedMesh) { e.instanced++; tot.instanced++; }
        }
        for (const c of o.children) if (c.visible) proj(c);
      };
      proj(top);
    }
  };
  let frameNo = 0;
  const pfx = sc.postfx, pfxRender = pfx.render;
  pfx.render = function () { if (++frameNo % 25 === 0 && samples < wantSamples) { samples++; census(); } return pfxRender.apply(this, arguments); };
  for (let i = 0; i < 400 && samples < wantSamples; i++) await sleep(100);
  pfx.render = pfxRender; mover = null;
  const per = (x) => +(x / Math.max(1, samples)).toFixed(1);
  const rows = [...owners].map(([k, e]) => ({ k, tops: per(e.tops), walk: per(e.walkNodes), walkAuto: per(e.walkAuto), proj: per(e.projNodes), meshes: per(e.projMeshes), inFrustum: per(e.inFrustum), skinned: per(e.skinned), instanced: per(e.instanced), samples: e.samples }))
    .sort((a, b) => (b.walk + b.proj) - (a.walk + a.proj)).slice(0, 40);
  return { samples, perFrame: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, per(v)])), rows };
});
// nodes the shadow pass and the main pass walk per frame, by variant (only with PERF_ONLY=s13nodes; PERF_S13='a=off1+off2;b=;...'; s13): counted right
// when the sun's shadow matrices are made inside three's shadow pass (the hook has hidden what it hides by then) and at the start of the main pass walk
results.routes.s13nodes = await safe('s13nodes', async () => {
  if (!ONLY.includes('s13nodes')) return null;
  const variants = (window.__perfAbFor && window.__perfAbFor.renderab) || window.__perfAb;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3;
  const FLEN = pathLen(FOOT); let sAcc = 0, tPrev = performance.now();
  mover = (now) => { sAcc += ((now - tPrev) / 1000) * 3; tPrev = now; const L = FLEN * 2, m2 = sAcc % L, back = m2 > FLEN; const q = at(FOOT, back ? L - m2 : m2); p.x = q.x; p.y = q.y; p.angle = back ? q.ang + Math.PI : q.ang; w.camYaw = p.angle; };
  await sleep(window.__perfSettle || 20000);
  let sun = null; for (const o of sc.scene.children) if (o.isDirectionalLight && o.castShadow) sun = o;
  const visCount = (o) => { let n = 1; for (const c of o.children) if (c.visible) n += visCount(c); return n; };
  const upd = sun.shadow.updateMatrices.bind(sun.shadow);
  let nShadow = [], nMain = [], lastN = null;
  sun.shadow.updateMatrices = function (l) { let n = 0; for (const c of sc.scene.children) if (c.visible) n += visCount(c); lastN = n; return upd(l); };
  const smOuter = r.shadowMap.render;
  r.shadowMap.render = function (...a) { lastN = null; const o = smOuter.apply(this, a); if (lastN !== null) nShadow.push(lastN); return o; };
  const pfx = sc.postfx, pfxRender = pfx.render;
  pfx.render = function () { let n = 0; for (const c of sc.scene.children) if (c.visible) n += visCount(c); nMain.push(n); return pfxRender.apply(this, arguments); };
  const out = [];
  for (let round = 0; round < (window.__perfAbRounds || 4); round++) {
    for (const [name, off] of (round % 2 ? [...variants].reverse() : variants)) {
      window.__perfOffDyn = new Set(off); await sleep(2500); nShadow = []; nMain = [];
      await sleep(6000);
      const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
      out.push({ name, round, shadow: avg(nShadow), shadowPasses: nShadow.length, main: avg(nMain), mainFrames: nMain.length });
    }
  }
  pfx.render = pfxRender; sun.shadow.updateMatrices = upd; r.shadowMap.render = smOuter; window.__perfOffDyn = undefined; mover = null;
  return { rows: out };
});
// how long the shader programs take to link after the game started (only with PERF_ONLY=progready): every 500 ms the number of programs of the renderer and how many are linked,
// until all are (at most 150 s), with the standing camera in the city; a pool adds programs (the batched variant of each batch material and its depth material)
results.routes.progready = await safe('progready', async () => {
  if (!ONLY.includes('progready')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3;
  const t0 = performance.now(); const series = []; let allAt = null;
  for (let i = 0; i < 300; i++) {
    await sleep(500);
    const progs = r.info.programs || [];
    const ready = progs.filter((q) => q.isReady()).length;
    if (i % 4 === 0) series.push([Math.round(performance.now() - t0), progs.length, ready, r.info.render.calls]);
    if (ready === progs.length && progs.length > 50 && i > 12) { allAt = Math.round(performance.now() - t0); break; }
  }
  return { allAtMs: allAt, series, programs: (r.info.programs || []).length, pool: sc.batches().pool };
});
// the first minute and a half in the city (only with PERF_ONLY=startup): per window of 10 s the frames and, through the thread sampler, the main thread's CPU per frame
// ('startup:<i>' marks), with the number of programs and how many are linked; shows what the compiling of shaders after the load costs (?perfoff=linkpoll: the old polling)
results.routes.startup = await safe('startup', async () => {
  if (!ONLY.includes('startup')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3;
  const rows = [];
  for (let i = 0; i < 9; i++) {
    H.start();
    console.error('[perf-mark] start startup:' + i + ' ' + Date.now());
    await sleep(10000);
    const res = H.stop();
    console.error('[perf-mark] end startup:' + i + ' ' + Date.now() + ' ' + res.frames);
    const pr = r.info.programs || [];
    rows.push({ i, frames: res.frames, avg: res.avg, p95: res.p95, cpuAvg: res.cpuAvg, programs: pr.length, linked: pr.filter((q) => q.isReady()).length, calls: r.info.render.calls });
  }
  return { rows, pool: sc.batches().pool };
});
// what the shadow pass draws (only with PERF_ONLY=shadowtris, PERF_DIAG=1 for the owner names): at fixed spots the triangles and draws of the sun's shadow pass in total and per owner,
// 30 frames each, with the shadow update forced every frame. A build that keeps casters out of the shadow map shows less than the one it is compared with.
results.routes.shadowtris = await safe('shadowtris', async () => {
  if (!ONLY.includes('shadowtris')) return null;
  // standing 6 m from the water's edge, looking at it (the helper of vspots): the quay walls are the casters there
  const atWater = (x, y) => { let best = null; for (const poly of map.waterNear(x, y, 400)) for (const q of poly.pts) { const d = Math.hypot(q[0] - x, q[1] - y); if (!best || d < best.d) best = { d, q }; } if (!best) return null; const dx = x - best.q[0], dy = y - best.q[1], l = Math.hypot(dx, dy) || 1; return [best.q[0] + dx / l * 6, best.q[1] + dy / l * 6, Math.atan2(-dy, -dx)]; };
  const wa = atWater(FOOT[4][0], FOOT[4][1]), wb = atWater(FOOT[3][0], FOOT[3][1]);
  const spots = [['markt', FOOT[0][0], FOOT[0][1], 0.3], ['straat', FOOT[3][0], FOOT[3][1], 1.9], ['gracht2', FOOT[4][0], FOOT[4][1], 2.6], ...(wa ? [['kade', ...wa]] : []), ...(wb ? [['kade1', ...wb]] : [])];
  const variants = (window.__perfAbFor && window.__perfAbFor.shadowtris) || [['', []]];
  const outAll = {};
  for (const [vname, voff] of variants) {
  window.__perfOffDyn = new Set(voff.filter((o) => o !== 'settle'));
  if (voff.length) await sleep(12000);
  const out = {};
  const triOf = (o, g) => {
    if (o.isBatchedMesh) { let n = 0; for (let i = 0; i < o._multiDrawCount; i++) n += o._multiDrawCounts[i]; return n / 3; }
    const base = g.index ? g.index.count : g.attributes.position.count;
    const dr = g.drawRange; const n = Math.min(base, dr.count === Infinity ? base : dr.count);
    return (n / 3) * (o.isInstancedMesh ? o.count : 1);
  };
  for (const [name, x, y, yaw] of spots) {
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(window.__perfSettle || 12000);
    { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 80 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
    fixWorld(); await sleep(1500);
    let inSh = false, draws = 0, tris = 0, frames = 0; const owners = new Map(); const big = new Map();
    const smR = r.shadowMap.render.bind(r.shadowMap);
    r.shadowMap.render = (...a) => { inSh = true; frames++; try { smR(...a); } finally { inSh = false; } };
    const rbd = r.renderBufferDirect;
    r.renderBufferDirect = function (camera, scene2, geometry, material, object, group) { if (inSh) { const t = triOf(object, geometry); draws++; tris += t; const k = (window.__ownerOf ? window.__ownerOf(object) : object.type).replace(/ (Buffer|Extrude|Box|Cylinder|Plane|Circle|Sphere|Shape)[^ ]*.*$/, '').slice(0, 50); const e = owners.get(k) || [0, 0]; e[0]++; e[1] += t; owners.set(k, e); const bs = geometry.boundingSphere || (geometry.computeBoundingSphere(), geometry.boundingSphere); const rad = object.isBatchedMesh ? 9999 : Math.round(bs ? bs.radius * Math.max(object.scale.x, 1) : 0); const bk = k + '|' + (object.castShadow ? 'c' : 'n') + '|' + (object.parent && object.parent.name || ''); const e2 = big.get(bk) || [0, 0, 0]; e2[0]++; e2[1] += t; e2[2] = Math.max(e2[2], rad); big.set(bk, e2); } return rbd.call(r, camera, scene2, geometry, material, object, group); };
    const sm = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = true; r.shadowMap.needsUpdate = true;
    await new Promise((res) => { const f = () => { if (frames >= 30) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    r.renderBufferDirect = rbd; r.shadowMap.render = smR; r.shadowMap.autoUpdate = sm;
    out[name] = { frames, draws: +(draws / frames).toFixed(1), tris: Math.round(tris / frames), biggest: [...big].sort((a, c) => c[1][2] - a[1][2]).slice(0, 10).map(([k, v]) => [k, +(v[0] / frames).toFixed(1), Math.round(v[1] / frames), v[2]]), owners: [...owners].sort((a, b) => b[1][1] - a[1][1]).slice(0, 14).map(([k, v]) => [k, +(v[0] / frames).toFixed(1), Math.round(v[1] / frames)]) };
  }
  outAll[vname || 'basis'] = out;
  }
  window.__perfOffDyn = undefined;
  return outAll;
});
// the sun's shadow map itself (only with PERF_ONLY=shadowmap): at fixed spots a forced shadow pass, the map read back and reduced to a 16 x 16 grid of how much of each
// block holds a caster (a texel that is not the cleared white); the grids of two builds can be compared block by block (a lost caster shows as a block that is emptier)
results.routes.shadowmap = await safe('shadowmap', async () => {
  if (!ONLY.includes('shadowmap')) return null;
  const spots = [['markt', FOOT[0][0], FOOT[0][1], 0.3], ['gracht2', FOOT[4][0], FOOT[4][1], 2.6], ['straat', FOOT[3][0], FOOT[3][1], 1.9]];
  const variants = (window.__perfAbFor && window.__perfAbFor.shadowmap) || (window.__perfAb && window.__perfAb.length ? window.__perfAb : [['', []]]);
  const outAll = {};
  for (const [vname, voff] of variants) {
  window.__perfOffDyn = new Set(voff.filter((o) => o !== 'settle'));
  if (voff.length) await sleep(12000);
  const out = {};
  const sunL = []; sc.scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sunL.push(o); });
  const L = sunL[0];
  for (const [name, x, y, yaw] of spots) {
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(window.__perfSettle || 12000);
    { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 80 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
    fixWorld(); await sleep(2500);
    // the game's own frame has just drawn the map: read it back right after one of its renders
    let got = null;
    await new Promise((res) => { let k = 0; const f = () => { if (++k < 6) { requestAnimationFrame(f); return; } const t = L.shadow.map; const W = t.width, Hh = t.height; const buf = new Uint8Array(W * Hh * 4); r.readRenderTargetPixels(t, 0, 0, W, Hh, buf); got = { W, Hh, buf }; res(); }; requestAnimationFrame(f); });
    const { W, Hh, buf } = got; const G = 16; const grid = [];
    for (let gy = 0; gy < G; gy++) { const row = []; for (let gx = 0; gx < G; gx++) { let n = 0, tot = 0; const x0 = gx * W / G, x1 = (gx + 1) * W / G, y0 = gy * Hh / G, y1 = (gy + 1) * Hh / G; for (let yy = y0; yy < y1; yy += 4) for (let xx = x0; xx < x1; xx += 4) { const i = (yy * W + xx) * 4; tot++; if (!(buf[i] === 255 && buf[i + 1] === 255 && buf[i + 2] === 255 && buf[i + 3] === 255)) n++; } row.push(Math.round(100 * n / tot)); } grid.push(row.join(' ')); }
    out[name] = { size: [W, Hh], grid };
  }
  outAll[vname || 'basis'] = out;
  }
  window.__perfOffDyn = undefined;
  return outAll;
});
// pictures of the same spot with steps switched off one after the other, in ONE process (only with PERF_ONLY=poolvis, PERF_AB=name=steps;..., spots from PERF_VIS_SPOTS=markt,gracht2):
// the variants of the run are compared by eye and with pngdiff.mjs; a step that rebuilds things (pool) gets a long run-in (PERF_AB_PRE ms, default 90 s)
results.routes.poolvis = await safe('poolvis', async () => {
  if (!ONLY.includes('poolvis')) return null;
  const all = { markt: [FOOT[0][0], FOOT[0][1], 0.3], gracht2: [FOOT[4][0], FOOT[4][1], 2.6], straat: [FOOT[3][0], FOOT[3][1], 1.9], kanaal: [FOOT[4][0], FOOT[4][1], 2.6] };
  const want = (window.__perfVisSpots || 'gracht2').split(',').filter(Boolean);
  const variants = window.__perfAb;
  const names = [];
  for (const sp of want) {
    const [x, y, yaw] = all[sp];
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    for (const [vname, voff] of variants) {
      window.__perfOffDyn = new Set(voff.filter((o) => o !== 'settle'));
      await sleep(voff.includes('settle') ? (window.__perfAbPre || 90000) : 15000);
      { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + (e.builds || 0) + (e.dropped || 0), 0); }; let last = builds(), still = 0; for (let i = 0; i < 120 && still < 8; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
      fixWorld(); await sleep(1500);
      console.log('[capture] ' + sp + '-' + vname);
      names.push(sp + '-' + vname);
      await sleep(900);
    }
  }
  window.__perfOffDyn = undefined;
  return { names };
});
// A/B inside one run (only with PERF_ONLY=ab): window.__perfAb = [[name, [perfoff steps...]], ...] (PERF_AB='aan=;uit=actoren+schaduw'); the variants take
// turns in short windows (window.__perfAbWin ms, window.__perfAbRounds rounds, the order swaps every round), so they feel the same load.
// Every window is a perf-mark pair 'ab:<name>:<round>' for the thread sampler of run.mjs; PERF_AB_MOVE=1 walks (3 m/s) instead of standing.
results.routes.ab = await safe('ab', async () => {
  if (!ONLY.includes('ab')) return null;
  const variants = window.__perfAb; const WIN = window.__perfAbWin || 5000; const ROUNDS = window.__perfAbRounds || 6;
  const SET = await imp('settings'); const SCN = await imp('scene3d');
  // PERF_AB_MOVE: 0 standing, 1 walking, 2 both (standing first)
  const modes = window.__perfAbMove === 2 ? ['staan', 'lopen'] : [window.__perfAbMove ? 'lopen' : 'staan'];
  // deterministic work counts per frame, next to the times: nodes whose matrix is walked, meshes tested against a frustum
  const T = sc.THREE, cnt = { umw: 0, fto: 0 };
  const oU = T.Object3D.prototype.updateMatrixWorld; T.Object3D.prototype.updateMatrixWorld = function (f) { cnt.umw++; return oU.call(this, f); };
  const oF = T.Frustum.prototype.intersectsObject; T.Frustum.prototype.intersectsObject = function (o) { cnt.fto++; return oF.call(this, o); };
  const out = []; let poolPoC = null;
  for (const mode of modes) {
    fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(window.__perfSettle || 12000);
    if (window.__perfPool && !poolPoC) { poolPoC = buildPoolPoC(); console.error('[perf-pool] ' + JSON.stringify(poolPoC.info)); }
    const tStart = performance.now();
    if (mode === 'lopen') mover = (now) => walkFoot(null, (now - tStart) / 1000 * 0.5);
    for (let round = 0; round < ROUNDS; round++) {
      const order = round % 2 ? [...variants].reverse() : variants;
      for (const [name, off] of order) {
        // 'set:drawDistance:ver' among the steps puts that setting for this window only (settings.js withTempSettings)
        const sets = {}; for (const o of off) if (o.startsWith('set:')) { const [, k, v] = o.split(':'); sets[k] = v; }
        const detail = off.find((o) => o.startsWith('detail:'));
        window.__perfDetail = detail ? Number(detail.slice(7)) : 0;
        if (detail || window.__perfDetailWas) { window.__perfDetailWas = !!detail; SCN.refreshRenderScale(); }
        const undo = Object.keys(sets).length ? SET.withTempSettings(sets) : null;
        window.__perfOffDyn = new Set(off.filter((o) => !o.startsWith('set:') && !o.startsWith('detail:') && o !== 'settle'));
        if (poolPoC) poolPoC.set(!off.includes('pool'));
        // 'settle' among the steps: the variant gets the long run-in too (steps that rebuild things, like pool, need it)
        await sleep(undo || off.includes('settle') ? (window.__perfAbPre || 6000) : 1200);
        calls = 0; renders = 0; cnt.umw = 0; cnt.fto = 0; diag.clear();
        H.start();
        const key = name + '@' + mode + ':' + round;
        console.error('[perf-mark] start ab:' + key + ' ' + Date.now());
        await sleep(WIN);
        const res = H.stop();
        console.error('[perf-mark] end ab:' + key + ' ' + Date.now() + ' ' + res.frames);
        if (undo) undo();
        if (detail) { window.__perfDetail = 0; SCN.refreshRenderScale(); window.__perfDetailWas = false; }
        out.push({ name: name + '@' + mode, round, frames: res.frames, avg: res.avg, p50: res.p50, p95: res.p95, cpuAvg: res.cpuAvg, cpuP50: res.cpuP50, owners: window.__perfDiag ? [...diag].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, n]) => [k, +(n / Math.max(1, res.frames)).toFixed(1)]) : null, calls: Math.round(calls / Math.max(1, res.frames)), umw: Math.round(cnt.umw / Math.max(1, res.frames)), fto: Math.round(cnt.fto / Math.max(1, res.frames)), key });
      }
    }
    mover = null;
  }
  window.__perfOffDyn = undefined; T.Object3D.prototype.updateMatrixWorld = oU; T.Frustum.prototype.intersectsObject = oF;
  return { windows: out };
});
// which top-level groups of the scene hold shadow casters (only with PERF_ONLY=casters): the shadow pass walks every node, casters or not
results.routes.casters = await safe('casters', async () => {
  if (!ONLY.includes('casters')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(window.__perfSettle || 12000);
  const rows = []; let total = 0, totalCast = 0, noCastNodes = 0;
  const A = sc.actors(); const actorSet = new Set([...A.vehicles.values(), ...A.peds.values(), ...A.wildlife.values()]);
  for (const c of sc.scene.children) {
    let n = 0, cast = 0, meshes = 0, vis = c.visible;
    c.traverse((o) => { n++; if (o.isMesh) meshes++; if (o.castShadow) cast++; });
    total += n; totalCast += cast; if (!cast) noCastNodes += n;
    rows.push({ name: c.name || c.type, n, meshes, cast, vis, actor: actorSet.has(c), near: c.userData && c.userData.castNear, kid: c.children[0] ? (c.children[0].name || c.children[0].type) : '' });
  }
  const group = {};
  for (const x of rows) { const k = (x.actor ? 'actor' : x.name) + '|' + (x.cast ? 'cast' : 'nocast'); const e = group[k] || (group[k] = { groups: 0, nodes: 0, cast: 0 }); e.groups++; e.nodes += x.n; e.cast += x.cast; }
  // frozen (matrixAutoUpdate false everywhere) plain-mesh groups: what a group-level view cull could take out of the main pass
  const cullable = (o) => !(o.isLight || o.isCamera || o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh || o.isSkinnedMesh || o.matrixAutoUpdate) && !(o.isMesh && o.frustumCulled === false) && o.children.every(cullable);
  let cullG = 0, cullN = 0, autoG = 0, autoN = 0; const autoKinds = {};
  for (const c of sc.scene.children) { let n = 0; c.traverse(() => n++); if (cullable(c)) { cullG++; cullN += n; } else if (!actorSet.has(c) && !c.isLight) { autoG++; autoN += n; const k = (c.name || c.type) + (c.userData && Object.keys(c.userData).length ? '{' + Object.keys(c.userData).slice(0, 3).join('/') + '}' : ''); const e = autoKinds[k] || (autoKinds[k] = [0, 0]); e[0]++; e[1] += n; } }
  // the unnamed groups that cannot be culled: do they ever move (local transform of every node 3 s apart), and what are they
  const sig = (o) => { const m = []; o.traverse((q) => m.push(q.position.x, q.position.y, q.position.z, q.quaternion.x, q.quaternion.y, q.quaternion.w, q.scale.x, q.visible ? 1 : 0)); return m; };
  const plain = sc.scene.children.filter((c) => !actorSet.has(c) && !c.isLight && (c.name || c.type) === 'Group' && !cullable(c));
  const s0 = plain.map(sig); await sleep(3000); const s1 = plain.map(sig);
  const unnamed = { groups: plain.length, moved: 0, movedNodes: 0, still: 0, stillNodes: 0, sample: [] };
  plain.forEach((c, i) => { const same = s0[i].length === s1[i].length && s0[i].every((v, j) => v === s1[i][j]); let n = 0; c.traverse(() => n++); if (same) { unnamed.still++; unnamed.stillNodes += n; } else { unnamed.moved++; unnamed.movedNodes += n; }
    if (unnamed.sample.length < 24 && (i % 9 === 0)) { const ms = []; c.traverse((q) => { if (q.isMesh && ms.length < 3) ms.push((q.geometry.type || '').replace('Geometry', '') + '/' + (q.material.type || '').replace('Material', '') + (q.castShadow ? '/cast' : '')); }); unnamed.sample.push([same ? 'still' : 'moves', n, Object.keys(c.userData || {}).slice(0, 4).join('/'), c.matrixAutoUpdate ? 'auto' : 'frozen', ms.join(' ')]); } });
  return { unnamed, cullG, cullN, autoG, autoN, autoKinds: Object.entries(autoKinds).sort((a, b) => b[1][1] - a[1][1]).slice(0, 14), total, totalCast, noCastNodes, topLevel: rows.length, group: Object.entries(group).sort((a, b) => b[1].nodes - a[1].nodes).slice(0, 30), biggestNoCast: rows.filter((x) => !x.cast && !x.actor).sort((a, b) => b.n - a.n).slice(0, 15).map((x) => [x.name, x.n, x.kid]) };
});
// who sets material.needsUpdate while playing (only with PERF_ONLY=matver): every set re-runs getProgram for that material in the next draw
results.routes.matver = await safe('matver', async () => {
  if (!ONLY.includes('matver')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(window.__perfSettle || 12000);
  mover = (now) => walkFoot(null, (now - tStart) / 1000 * 0.5);
  const tStart = performance.now();
  let proto = null; sc.scene.traverse((o) => { if (!proto && o.material && !Array.isArray(o.material)) { let p = Object.getPrototypeOf(o.material); while (p && !Object.getOwnPropertyDescriptor(p, 'needsUpdate')) p = Object.getPrototypeOf(p); proto = p; } });
  const desc = Object.getOwnPropertyDescriptor(proto, 'needsUpdate'); const sites = new Map(); let total = 0;
  Object.defineProperty(proto, 'needsUpdate', { configurable: true, set(v) { if (v === true) { total++; const st = (new Error().stack || '').split(String.fromCharCode(10)).slice(2, 5).map((l) => l.trim().replace('at ', '').split('/').pop()).join(' < '); const k = (this.type || '') + ' #' + (this.color ? this.color.getHexString() : '') + ' a' + (this.opacity != null ? this.opacity.toFixed(2) : '') + ' side' + this.side + ' ' + (this.name || '') + ' ' + Object.keys(this.userData || {}).slice(0, 3).join('/') + (this.map ? ' map' : '') + ' | ' + st; sites.set(k, (sites.get(k) || 0) + 1); } desc.set.call(this, v); }, get: desc.get });
  let frames = 0;
  await new Promise((res) => { const f = () => { frames++; if (frames > 300) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  Object.defineProperty(proto, 'needsUpdate', desc); mover = null;
  return { frames, total, perFrame: +(total / frames).toFixed(2), top: [...sites].sort((a, b) => b[1] - a[1]).slice(0, 24) };
});
// where the render time of a frame goes (only with PERF_ONLY=postcost): the CPU time of renderer.render for the game scene, for
// everything else (bloom blurs, grade, resolve quads: one-quad scenes) and the shadow pass inside the game scene render
results.routes.postcost = await safe('postcost', async () => {
  if (!ONLY.includes('postcost')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(window.__perfSettle || 10000);
  mover = (now) => walkFoot(null, (now - tStart) / 1000 * 0.5);
  const tStart = performance.now();
  const prev = r.render; const acc = { scene: 0, other: 0, otherN: 0, shadow: 0, frames: 0, sceneN: 0 };
  const smRender = r.shadowMap.render;
  r.shadowMap.render = function (...a) { const t = performance.now(); smRender.apply(this, a); acc.shadow += performance.now() - t; };
  r.render = function (s2, c2) { const t = performance.now(); const o = prev.call(r, s2, c2); const d = performance.now() - t; if (s2 === sc.scene) { acc.scene += d; acc.sceneN++; } else { acc.other += d; acc.otherN++; } return o; };
  await new Promise((res) => { const f = () => { acc.frames++; if (acc.frames > 240) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  r.render = prev; r.shadowMap.render = smRender; mover = null;
  const n = acc.frames;
  return { frames: n, sceneMs: +(acc.scene / n).toFixed(2), shadowMs: +(acc.shadow / n).toFixed(2), otherMs: +(acc.other / n).toFixed(2), otherRendersPerFrame: +(acc.otherN / n).toFixed(1), sceneRendersPerFrame: +(acc.sceneN / n).toFixed(2) };
});
// the actors' scene nodes (only with PERF_ONLY=actors): nodes per vehicle / person / animal, hidden ones, what the children are
results.routes.actors = await safe('actors', async () => {
  if (!ONLY.includes('actors')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); await sleep(10000);
  const A = sc.actors(), out = {};
  for (const [kind, map] of Object.entries({ vehicles: A.vehicles, peds: A.peds, wildlife: A.wildlife })) {
    let meshesN = 0, nodes = 0, hiddenNodes = 0, meshN = 0, skinned = 0, inst = 0, culled = 0, vis = 0; const kids = {};
    for (const m of map.values()) {
      meshesN++; if (m.visible) vis++;
      m.traverse((o) => { nodes++; if (!o.visible) hiddenNodes++; if (o.isMesh) meshN++; if (o.isSkinnedMesh) skinned++; if (o.isInstancedMesh) inst++; });
      for (const c of m.children) { let n = 0, h = 0; c.traverse((o) => { n++; if (!o.visible) h++; }); const k = (c.name || c.type) + (c.userData && c.userData.driverFigure ? '' : ''); const e = kids[k] || (kids[k] = { n: 0, h: 0, c: 0 }); e.n += n; e.h += h; e.c++; }
    }
    out[kind] = { actors: meshesN, visible: vis, nodes, hiddenNodes, meshes: meshN, skinned, inst, kids: Object.entries(kids).sort((a, b) => b[1].n - a[1].n).slice(0, 14) };
  }
  out.sceneNodes = (() => { let n = 0; sc.scene.traverse(() => n++); return n; })();
  // cull test: how many actors a frustum test would drop right now
  const THREE_ = sc.cam.constructor; void THREE_;
  return out;
});
// top-level loose meshes of the scene by kind (only with PERF_ONLY=topmesh)
results.routes.topmesh = await safe('topmesh', async () => {
  if (!ONLY.includes('topmesh')) return null;
  fixWorld(); teleport(FOOT[3][0], FOOT[3][1]); await sleep(15000);
  const by = {};
  for (const c of sc.scene.children) {
    if (!c.isMesh && !c.isPoints && !c.isSprite && !c.isLine) continue;
    const k = c.type + '/' + (c.geometry ? c.geometry.type : '') + '/' + (c.material && c.material.type) + '/' + Object.keys(c.userData || {}).slice(0, 3).join(',') + '/' + (c.name || '') + (c.material && c.material.transparent ? '/transp' : '');
    const e = by[k] || (by[k] = { n: 0, vis: 0, verts: 0 }); e.n++; if (c.visible) e.vis++; e.verts = c.geometry && c.geometry.attributes.position ? c.geometry.attributes.position.count : 0;
  }
  return Object.entries(by).sort((x, y) => y[1].vis - x[1].vis).slice(0, 25);
});
// why roads stay loose (only with PERF_ONLY=roadloose)
results.routes.roadloose = await safe('roadloose', async () => {
  if (!ONLY.includes('roadloose')) return null;
  fixWorld(); teleport(FOOT[3][0], FOOT[3][1]); await sleep(20000);
  const rows = []; let total = 0, loose = 0;
  for (const g of sc.scene.children) {
    if (g.name !== 'road') continue;
    total++;
    const vis = []; g.traverse((o) => { if (o.isMesh && o.visible) vis.push(o); });
    if (!vis.length) continue;
    loose++;
    const b = new Float32Array(4); let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const o of vis) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; minx = Math.min(minx, bb.min.x); maxx = Math.max(maxx, bb.max.x); miny = Math.min(miny, bb.min.z); maxy = Math.max(maxy, bb.max.z); }
    const d = Math.hypot(Math.max(minx - p.x, 0, p.x - maxx), Math.max(miny - p.y, 0, p.y - maxy));
    rows.push([Math.round(d), Math.floor((minx + maxx) / 2 / 96) + ',' + Math.floor((miny + maxy) / 2 / 96), vis.map((o) => (o.material.type || '') + ':' + (o.material.transparent ? 'T' : '') + (o.userData.noBatch ? 'N' : '') + (o.geometry.attributes.normal ? '' : 'nonormal') + o.geometry.attributes.position.count).join(' ')]);
  }
  const cells = {}; for (const r of rows) cells[r[1]] = (cells[r[1]] || 0) + 1;
  return { total, loose, drawDist: window.__scene3d ? null : null, rows: rows.sort((x, y) => x[0] - y[0]).slice(0, 40), singles: Object.values(cells).filter((n) => n === 1).length, cells: Object.keys(cells).length, batches: sc.batches().roads };
});
// what hangs in the water groups (only with PERF_ONLY=waterprobe)
results.routes.waterprobe = await safe('waterprobe', async () => {
  if (!ONLY.includes('waterprobe')) return null;
  fixWorld(); teleport(FOOT[3][0], FOOT[3][1]); await sleep(20000);
  const by = {}; let groups = 0;
  for (const g of sc.scene.children) {
    if (g.name !== 'water') continue;
    groups++;
    g.traverse((o) => { if (!o.isMesh) return; const k = (o.material.type || '') + (o.material.transparent ? '/T' : '') + (o.userData.noBatch ? '/N' : '') + (o.visible ? '' : '/hidden') + (o.castShadow ? '/cast' : '') + '/' + Object.keys(o.geometry.attributes).join(','); const e = by[k] || (by[k] = { n: 0, verts: 0, parentKeys: new Set() }); e.n++; e.verts += o.geometry.attributes.position.count; e.parentKeys.add(Object.keys(o.parent.userData || {}).join(',') + ':' + (o.parent.children.length)); });
  }
  return { groups, by: Object.entries(by).map(([k, e]) => [k, e.n, e.verts, [...e.parentKeys].slice(0, 4).join(' ')]), batches: sc.batches().shores };
});
// why buildings stay loose (only with PERF_ONLY=bldloose)
results.routes.bldloose = await safe('bldloose', async () => {
  if (!ONLY.includes('bldloose')) return null;
  fixWorld(); teleport(FOOT[0][0], FOOT[0][1]); w.camYaw = 0.3; p.angle = 0.3; await sleep(25000);
  const cats = {}; let total = 0;
  const cell = (x, z) => Math.floor(x / 48) + ',' + Math.floor(z / 48);
  for (const g of sc.scene.children) {
    if (g.name !== 'building' && g.name !== 'landmark') continue;
    total++;
    const vis = []; g.traverse((o) => { if (o.isMesh && o.visible) vis.push(o); });
    if (!vis.length) continue;
    const o0 = vis[0]; o0.geometry.computeBoundingBox(); const bb = o0.geometry.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const d = Math.hypot(cx - p.x, cz - p.y);
    const reasons = [];
    if (g.name === 'landmark') reasons.push('landmark');
    if (g.position.y !== 0) reasons.push('y!=0');
    if (vis.some((o) => o.material.transparent)) reasons.push('transparent');
    if (vis.some((o) => o.userData.noBatch)) reasons.push('noBatch');
    if (vis.some((o) => !o.geometry.attributes.normal)) reasons.push('nonormal');
    if (vis.some((o) => o.isInstancedMesh || o.isSkinnedMesh)) reasons.push('inst');
    if (!reasons.length) reasons.push(d > 285 ? 'far>285' : d > 230 ? 'far>230' : d > 150 ? 'mid>150' : 'near<=150');
    const k = reasons.join('+') + ' ' + vis[0].geometry.type;
    const e = cats[k] || (cats[k] = { groups: 0, meshes: 0 }); e.groups++; e.meshes += vis.length;
  }
  return { dists: sc.dists(), total, cats: Object.entries(cats).sort((x, y) => y[1].meshes - x[1].meshes), batches: sc.batches().buildings };
});
// fixed viewpoints incl. water and a village (only with PERF_ONLY=vspots): one screenshot each, for before/after pixel comparisons (scripts/perf/pngdiff.mjs)
results.routes.vspots = await safe('vspots', async () => {
  if (!ONLY.includes('vspots')) return null;
  fixWorld();
  const spots = [['markt', FOOT[0][0], FOOT[0][1], 0.3], ['straat', FOOT[3][0], FOOT[3][1], 1.9], ['straat2', FOOT[3][0], FOOT[3][1], 4.2], ['kanaal', FOOT[4][0], FOOT[4][1], 2.6], ['winsum', ...placeAt('Winsum'), 2.2], ['a7', (A7[1][0] + A7[2][0]) / 2, (A7[1][1] + A7[2][1]) / 2, 0.5], ['hoogezand', ...placeAt('Hoogezand'), 1.0]];
  // standing 6 m from the water's edge, looking at it: the nearest vertex of the nearest water polygon to a place
  const atWater = (name, x, y) => {
    let best = null;
    for (const poly of map.waterNear(x, y, 400)) for (const q of poly.pts) { const d = Math.hypot(q[0] - x, q[1] - y); if (!best || d < best.d) best = { d, q }; }
    if (!best) return null;
    const dx = x - best.q[0], dy = y - best.q[1], l = Math.hypot(dx, dy) || 1;
    return [name, best.q[0] + dx / l * 6, best.q[1] + dy / l * 6, Math.atan2(-dy, -dx)];
  };
  for (const sp of [atWater('gracht', FOOT[3][0], FOOT[3][1]), atWater('gracht2', FOOT[4][0], FOOT[4][1]), atWater('winsumwater', ...placeAt('Winsum')), atWater('hoogezandwater', ...placeAt('Hoogezand'))]) if (sp) spots.push(sp);
  const names = [];
  for (const [name, x, y, yaw] of spots) {
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(12000); fixWorld();
    { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + e.builds + e.dropped, 0); }; let last = builds(), still = 0; for (let i = 0; i < 60 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
    fixWorld();
    console.log('[capture] ' + name);
    names.push(name);
    await sleep(700);
  }
  return { names };
});
// the same frame twice with steps switched (only with PERF_ONLY=s13img; PERF_S13IMG='a,b' = perfoff steps; s13): at a few viewpoints the simulation stands
// still (coopHold), the scene is drawn with every step on, with the named steps off, and with every step on again; the canvas is read back each time.
// Nothing moves between the draws (the time uniforms change in update3D only), so a correct cull gives byte-equal canvases; the third is the noise floor
results.routes.s13img = await safe('s13img', async () => {
  if (!ONLY.includes('s13img')) return null;
  const offs = (window.__perfS13img || 'losgroepen,schaduwbereik').split(',').filter(Boolean);
  fixWorld();
  const spots = [['markt', FOOT[0][0], FOOT[0][1], 0.3], ['markt2', FOOT[0][0], FOOT[0][1], 3.4], ['straat', FOOT[3][0], FOOT[3][1], 1.9], ['straat2', FOOT[3][0], FOOT[3][1], 4.2], ['kanaal', FOOT[4][0], FOOT[4][1], 2.6], ['winsum', ...placeAt('Winsum'), 2.2], ['hoogezand', ...placeAt('Hoogezand'), 1.0]];
  const gl = r.getContext(), cvs = r.domElement, W = cvs.width, H = cvs.height;
  const A = new Uint8Array(W * H * 4), B = new Uint8Array(W * H * 4), C = new Uint8Array(W * H * 4);
  const shoot = (off, buf) => {
    window.__perfOffDyn = new Set(off);
    for (let i = 0; i < 2; i++) { if (sc.cullPass) sc.cullPass(); try { sc.postfx.render(); } finally { if (sc.restorePass) sc.restorePass(); } }
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  };
  const cmp = (X, Y) => { let n = 0, big = 0, mx = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < X.length; i += 4) { const d = Math.max(Math.abs(X[i] - Y[i]), Math.abs(X[i + 1] - Y[i + 1]), Math.abs(X[i + 2] - Y[i + 2])); if (d > 0) { n++; if (d > mx) mx = d; if (d > 8) big++; const px = (i >> 2) % W, py = ((i >> 2) / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } } return { differ: n, over8: big, max: mx, box: n ? [x0, y0, x1, y1] : null }; };
  const out = [];
  for (const [name, x, y, yaw] of spots) {
    w.coopHold = false;
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(window.__perfSettle || 12000); fixWorld();
    { const builds = () => { const b = sc.batches(); return Object.values(b).reduce((q, e) => q + e.builds + e.dropped, 0); }; let last = builds(), still = 0; for (let i = 0; i < 60 && still < 6; i++) { await sleep(500); const n = builds(); still = n === last ? still + 1 : 0; last = n; } }
    fixWorld(); w.coopHold = true; await sleep(800);
    shoot([], A); shoot(offs, B); shoot([], C);
    out.push({ name, size: [W, H], offVsOn: cmp(A, B), onVsOn: cmp(A, C) });
  }
  window.__perfOffDyn = undefined; w.coopHold = false;
  return { offs, out };
});
// is anything that shows cut? (only with PERF_ONLY=verify): scene3d.js verifyCull looks at every actor and group that sat out the main pass with an exact box
// against the camera's frustum, and at every group kept out of the shadow pass for a caster; turns on the spot and walks a little at a few places, counting the misses
results.routes.verify = await safe('verify', async () => {
  if (!ONLY.includes('verify')) return null;
  const V = window.__perfVerify = { actors: 0, groups: 0, shadow: 0, checked: 0, shadowChecked: 0, frames: 0, bad: [], kinds: {} };
  const spots = [['markt', FOOT[0][0], FOOT[0][1]], ['straat', FOOT[3][0], FOOT[3][1]], ['kanaal', FOOT[4][0], FOOT[4][1]], ['winsum', ...placeAt('Winsum')], ['hoogezand', ...placeAt('Hoogezand')]];
  const perSpot = [];
  for (const [name, x, y] of spots) {
    teleport(x, y); await sleep(window.__perfSettle || 10000); fixWorld();
    const before = { actors: V.actors, groups: V.groups, shadow: V.shadow, checked: V.checked };
    const t0 = performance.now();
    mover = (now) => { const t = (now - t0) / 1000; w.camYaw = t * 0.52; p.angle = w.camYaw; if (t > 12) { p.x += Math.cos(p.angle) * 0.05; p.y += Math.sin(p.angle) * 0.05; } };
    await new Promise((res) => { const f = () => { V.frames++; if (performance.now() - t0 > 18000) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    mover = null;
    perSpot.push({ spot: name, actors: V.actors - before.actors, groups: V.groups - before.groups, shadow: V.shadow - before.shadow, checked: V.checked - before.checked });
  }
  window.__perfVerify = undefined;
  return { kinds: V.kinds, total: { actors: V.actors, groups: V.groups, shadow: V.shadow, checked: V.checked, shadowChecked: V.shadowChecked, boxChecked: V.boxChecked || 0, boxBad: V.boxBad || 0, frames: V.frames }, perSpot, bad: V.bad };
});
// draw calls of the vehicles and people in view (only with PERF_ONLY=actors)
results.routes.actors = await safe('actors', async () => {
  if (!ONLY.includes('actors')) return null;
  fixWorld(); teleport(FOOT[3][0], FOOT[3][1]); w.camYaw = 1.9; p.angle = 1.9; await sleep(25000);
  const out = { vehicles: [], peds: { n: 0, meshes: 0, draws: 0 }, blobs: 0 };
  const draws = (o) => { const g = o.geometry; if (Array.isArray(o.material)) return g.groups.filter((q) => q.count > 0).length || o.material.length; return 1; };
  for (const g of sc.scene.children) {
    if (!g.visible) continue;
    const ud = g.userData || {};
    if (ud.body && ud.loose && ud.vehicleId !== undefined) {
      const kinds = {}; let d = 0, meshes = 0;
      g.traverse((o) => { if (!o.isMesh || !o.visible || !o.layers.test(sc.cam.layers)) return; let a = o, anc = 'root'; while (a && a !== g) { if (a.name) { anc = a.name; break; } a = a.parent; } const k = (o.isSkinnedMesh ? 'skinned ' : o.isInstancedMesh ? 'inst ' : '') + o.geometry.type.replace('Geometry', '') + '/' + (Array.isArray(o.material) ? 'multi' + o.material.length : o.material.type.replace('Material', '')) + (o.material.transparent ? '/T' : '') + '/' + (o.castShadow ? 'cast' : 'nocast') + ' ' + (o.userData.blob ? 'blob' : ''); kinds[k] = (kinds[k] || 0) + 1; d += draws(o); meshes++; });
      out.vehicles.push({ name: g.name || '', model: ud.kind || ud.model || '', meshes, draws: d, dist: Math.round(Math.hypot(g.position.x - p.x, g.position.z - p.y)), kinds });
    } else if (ud.pelvis || (ud.bones && ud.head && ud.legL)) {
      out.peds.n++; g.traverse((o) => { if (o.isMesh && o.visible && o.layers.test(sc.cam.layers)) { out.peds.meshes++; out.peds.draws += draws(o); } });
    }
  }
  out.vehicles.sort((x, y) => y.draws - x.draws);
  out.summary = { vehicles: out.vehicles.length, vehDraws: out.vehicles.reduce((q, v) => q + v.draws, 0) };
  out.vehicles = out.vehicles.slice(0, 6);
  return out;
});
// page state (only with PERF_ONLY=state): which menus are up
results.routes.state = await safe('state', async () => {
  if (!ONLY.includes('state')) return null;
  await sleep(8000);
  const vis = [...document.querySelectorAll('body *')].filter((e) => e.id && /menu|start|title|pause|overlay/i.test(e.id) && e.offsetWidth > 100 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden').map((e) => e.id + ':' + e.className).slice(0, 12);
  return { body: document.body.className, vis, paused: w.paused, pm: PM.isPauseMenuOpen() };
});
// the blob pool against loose blobs on a frozen frame (only with PERF_ONLY=blobab): the two screenshots must be equal
results.routes.blobab = await safe('blobab', async () => {
  if (!ONLY.includes('blobab')) return null;
  fixWorld();
  const names = [];
  for (const [name, x, y, yaw] of [['markt', FOOT[0][0], FOOT[0][1], 0.3], ['straat2', FOOT[3][0], FOOT[3][1], 4.2]]) {
    teleport(x, y); w.camYaw = yaw; p.angle = yaw;
    await sleep(15000); fixWorld();
    w.paused = true; await sleep(1500);
    for (const on of [true, false, true]) { sc.setBlobPool(on); await sleep(700); console.log('[capture] ' + name + (on ? '-pool' : '-loose') + (names.length % 3 === 2 ? '2' : '')); names.push(name + on); await sleep(500); }
    w.paused = false;
  }
  sc.setBlobPool(true);
  return { names };
});
results.routes.pause = await run('pause', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('game'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });
results.routes.sheet = await run('sheet', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('settings'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });

done = true;
clearInterval(skipper);
r.render = origRender;
r.renderBufferDirect = origRBD;
// PERF_ONLY=wegenklaar: no route, only wait until the geometry worker's road network is ready (#247) and hand in the whole load timeline,
// with the road worker's job times (geoStats.byKind)
if (ONLY.includes('wegenklaar')) {
  for (let i = 0; i < 180 && !window.__loadMarks.roadsReady; i++) await sleep(500);
  await sleep(1000);
  results.routes.wegenklaar = { marks: { ...window.__loadMarks }, menuGate: window.__menuGate ? window.__menuGate() : null, menuHang: window.__menuHang ? window.__menuHang() : null, tileWindows: window.__tileWindows || null, bootLog: (window.__bootLog || []).filter((q, i) => i % 4 === 0), geo: GJ ? { ...GJ.geoStats } : null };
}
return JSON.stringify(results);
