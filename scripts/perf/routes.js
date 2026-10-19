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
// the same light and weather on every run: 14:00, clear (a route can ask for another hour or rain)
let LOOK = { clock: 14, rain: false };
let EJECTS = 0;
const fixWorld = () => {
  w.clock = LOOK.clock;
  w.weather = LOOK.rain ? { active: true, timer: 1e9, kind: 'regenbui', peak: 0.6, intensity: 0.6, wet: 1, overcast: 0.6, mist: 0, windAngle: 0.9, elapsed: 30, duration: Infinity }
    : { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};

async function run(name, setup, move, teardown, opts = {}) {
  if (ONLY.length && !ONLY.includes(name)) return null;
  LOOK = { clock: opts.clock ?? 14, rain: !!opts.rain };
  const DURR = opts.dur || DUR;
  fixWorld();
  const ctx = await setup();
  let t0 = performance.now() + 6000;
  mover = (now) => move(ctx, (now - t0) / 1000);
  await sleep(6000);
  t0 = performance.now();
  fixWorld();
  calls = 0; tris = 0; renders = 0; EJECTS = 0;
  const f0 = frameCount();
  H.start();
  if (window.__hitch) window.__hitch.reset();
  if ((window.__perfProfile || '').split(',').includes(name)) console.log('[profile] ' + Math.min(DURR - 2000, 15000));
  await sleep(DURR);
  const res = H.stop();
  const frames = Math.max(1, res.frames);
  mover = null;
  const out = { ...res, callsPerFrame: Math.round(calls / frames), trisPerFrame: Math.round(tris / frames), rendersPerFrame: +(renders / frames).toFixed(2),
    programs: r.info.programs.length, textures: r.info.memory.textures, geometries: r.info.memory.geometries,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, at: [Math.round((p.inVehicle || p).x), Math.round((p.inVehicle || p).y)],
    ejects: EJECTS, vehicles: w.vehicles.length, peds: w.pedestrians.length, simLevel: window.__simLoad ? window.__simLoad.level() : null, dyn: window.__gfxDyn || null,
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
  console.error('[perf-route-data]', name, JSON.stringify(out)); // error level: the desktop log keeps only errors, and a crashed run still has its finished routes
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
  const groups = new Map();
  for (const t of alive) { const im = t.image || {}; const k = (t.name || '') + ' ' + (im.width || (t.source && t.source.data && t.source.data.width) || '?') + 'x' + (im.height || '?') + ' f' + t.format + ' t' + t.type + (t.isCanvasTexture ? ' canvas' : '') + (t.isDataTexture ? ' data' : '') + (t.isCompressedTexture ? ' compressed' : '') + (t.generateMipmaps ? ' mips' : ''); groups.set(k, (groups.get(k) || 0) + 1); }
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
  const t0 = performance.now(); for (let i = 0; i < 20; i++) sc.scene.updateMatrixWorld(true); const walk = (performance.now() - t0) / 20;
  return { total, auto, meshes, visible, top: rows.slice(0, 30), updateMatrixWorldMs: +walk.toFixed(2) };
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
results.routes.pause = await run('pause', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('game'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });
results.routes.sheet = await run('sheet', async () => { teleport(...P(100, 77)); await sleep(4000); wantMenu = true; PM.openPauseMenu('settings'); return {}; }, () => {}, async () => { wantMenu = false; PM.closePauseMenu(); });

done = true;
clearInterval(skipper);
r.render = origRender;
r.renderBufferDirect = origRBD;
return JSON.stringify(results);
