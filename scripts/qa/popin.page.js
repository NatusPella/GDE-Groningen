// Page half of scripts/qa/popin.mjs (desktop --perf-script body): meet POP-IN in het echte spel (#1016).
// Per frame (na de eigen render van het spel) loopt de probe door de zichtbare scenegraaf en meldt wat NIEUW
// getekend wordt: een nieuwe mesh, een mesh waarvan de geometrie groeit (samengevoegde batch) of een InstancedMesh
// met meer instanties. Per gebeurtenis: categorie, afstand tot de camera (dichtstbijzijnde rand van de bol),
// schermgrootte in pixels, mistfactor op die afstand en of de bol in het beeld valt. Alleen wat in beeld valt,
// groter dan 2 px is en minder dan 90% in de mist staat, telt als zichtbare pop-in. Daarnaast: welke tegel wanneer
// is geladen (store 'tile'-gebeurtenis) en een reeks stills van dezelfde route (console.log '[capture]').
// Routes: foot (Binnenstad te voet), a7 (provinciale weg per auto), heli (korte vlucht), jump (sneltransport 600 m).
// window.__popin = { only, dur, shots, tag, view (kort|normaal|ver|heelver) }. Raakt geen opslag. De pure afstandsregels staan in popinrules.js.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
// fouten tijdens de run (een ReferenceError in de bouwlus liet een vorige poging bijna ongemerkt)
const errs = []; const ce = console.error; console.error = (...a) => { if (errs.length < 5) errs.push(a.map(String).join(' ').slice(0, 200)); ce.apply(console, a); };
window.addEventListener('error', (e) => { if (errs.length < 5) errs.push(String(e.message)); });
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d; const THREE = sc.THREE; const scene = sc.scene; const cam = sc.cam;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__popin || {};
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const VEH = await imp('vehicle');
const HF = await imp('heliflight');
const PM = await imp('pausemenu');
const RR = await imp('ringroute');
const SP = await imp('scene3d');
const { P = (x, y) => [x, y], PL = (l) => l } = await imp('worldframe').catch(() => ({}));
const WPL = await imp('worldplaces');
const GDT = await imp('gdt');
const PPL = await imp('models3d_people').catch(() => ({}));
// vaste kwaliteit: geen adaptieve afbouw (een drukke machine zette cpuLevel 3 en de detailstraal op 100 m); zichtafstand uit --view
const SETm = await imp('settings');
const GFX = await imp('gfxprofile');
SETm.withTempSettings({ autoResolution: false, quality: 'hoog', drawDistance: CFG.view || 'kort' });
GFX.resetDynamic();
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'none';
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fixWorld();
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

// ---- 28-11 (#1354): uploads en shaderlinks per frame. De GL-aanroepen worden omwikkeld en per frame geteld; een upload in een
// frame waarin het ding al in beeld is, is een haperkans (de eerste draw), een link een grotere.
const gl = sc.renderer.getContext();
const GLC = { up: 0, upMs: 0, link: 0, linkMs: 0 };
for (const [name, bucket_] of [['texImage2D', 'up'], ['texSubImage2D', 'up'], ['texStorage2D', 'up'], ['texImage3D', 'up'], ['texSubImage3D', 'up'], ['compressedTexImage2D', 'up'], ['linkProgram', 'link']]) {
  const orig = gl[name]; if (typeof orig !== 'function') continue;
  gl[name] = function (...a) { const t = performance.now(); const r = orig.apply(this, a); const dt = performance.now() - t; GLC[bucket_]++; GLC[bucket_ + 'Ms'] += dt; return r; };
}
// wat het spel zelf "klaar" noemt (oude definitie: gebouwen, wegen en tegelrij leeg) en wat de nieuwe tegel-klaar-definitie zegt (SP.readyCounts)
const readyNow = () => {
  const pend = SP.streamPending ? SP.streamPending() : null;
  const old = (!pend || pend.buildings + pend.roads === 0) && (!map.tileQueue || map.tileQueue.size === 0);
  let nw = null;
  try { if (SP.readyCounts) nw = SP.readyCounts(w).total === 0; } catch (e) { nw = null; }
  return [old ? 1 : 0, nw === null ? -1 : nw ? 1 : 0];
};

// ---- de probe
const EDGES = [0, 10, 20, 30, 45, 60, 90, 130, 190, 260, 400, 700, 1e9];
const bucket = (d) => { let i = 0; while (i < EDGES.length - 2 && d >= EDGES[i + 1]) i++; return i; };
const frustum = new THREE.Frustum(); const pv = new THREE.Matrix4(); const sph = new THREE.Sphere(); const tmp = new THREE.Vector3();
const labelOf = (o) => {
  let a = o;
  while (a && a !== scene) {
    const u = a.userData || {};
    const s = u.kind || u.type || u.propKind || u.cat || a.name;
    if (s) return String(s);
    a = a.parent;
  }
  let top = o; while (top.parent && top.parent !== scene) top = top.parent;
  const g = o.geometry || {};
  return 'u:' + (o.isInstancedMesh ? 'inst' : o.isSkinnedMesh ? 'skinned' : o.type) + ' ' + (top === o ? 'self' : (top.name || top.type)) + ' ' + (g.type || '');
};
function makeProbe() {
  let prev = new Map(), cur = new Map();
  let on = true, t0 = performance.now(), frame = 0, armed = false;
  const ev = []; // alle gebeurtenissen (met afkap)
  const cats = new Map(); // categorie -> { n, vis, near, buckets[], sumPx }
  const tiles = [];
  const unsub = map.store && map.store.on ? map.store.on('tile', (key) => tiles.push([+(performance.now() - t0).toFixed(0), String(key)])) : null;
  void unsub;
  let walkMs = 0, walks = 0;
  const gls = { frames: 0, upFrames: 0, up: 0, upMs: 0, link: 0, linkMs: 0, worstUpMs: 0, hitch2: 0, progNew: 0 };
  let lastProgs = sc.renderer.info.programs.length, km = 0, lastCam = null, claim = [0, -1];
  const claimFrames = [0, 0, 0]; // frames: totaal, oude definitie klaar, nieuwe definitie klaar
  // 28-11 (#1354): de LOD-dekking. Elke 12e frame: per afstandsband hoeveel gebouwen de versie hebben die bij hun afstand hoort (detail binnen de
  // ring, de verre kopie erbuiten, beide in de overgangsband van 20 m), hoeveel gaten (geen van beide) en hoeveel wissels van niveau.
  const BANDS = [60, 140, 250, 500, 800];
  const lodAud = { samples: 0, bands: BANDS.map((m) => ({ max: m, n: 0, ok: 0 })), holes: 0, lateDetail: 0, swaps: 0, swapsToNone: 0 };
  const lodPrev = new WeakMap();
  const lodSample = () => {
    if (!sc.buildingHas || !sc.farLod || !sc.farLod.covers || !map.buildingsNear) return;
    const f = w.streamFocus || p, dd = sc.dists(), R = dd.buildingDetailR, draw = dd.DRAW_DIST;
    lodAud.samples++;
    for (const b of map.buildingsNear(f.x, f.y, 800)) {
      if (b.landmark || !b.bounds) continue;
      const d = Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - f.x, (b.bounds[1] + b.bounds[3]) / 2 - f.y);
      const bi = BANDS.findIndex((m) => d <= m); if (bi < 0) continue;
      const hasD = sc.buildingHas(b), hasF = sc.farLod.covers(b), inRing = d <= R, trans = Math.abs(d - R) <= 20;
      const need = trans ? hasD && hasF : inRing ? hasD : hasF;
      const B = lodAud.bands[bi]; B.n++; if (need) B.ok++;
      if (d <= draw && !hasD && !hasF) lodAud.holes++;
      if (inRing && !hasD && d <= draw) lodAud.lateDetail++;
      const lv = inRing && hasD ? 'd' : hasF ? 'f' : hasD ? 'd' : 'n', pl = lodPrev.get(b);
      if (pl && pl !== lv) { lodAud.swaps++; if (lv === 'n') lodAud.swapsToNone++; }
      lodPrev.set(b, lv);
    }
  };
  const ring = { n: 0, sum: 0, min: 1, b90: 0, b50: 0, minR: 1e9, facade: 0, draw: 0 };
  const camDist = (cx, cy, cz, r) => Math.max(0, Math.hypot(cx - cam.position.x, cy - cam.position.y, cz - cam.position.z) - r);
  const note = (kind, o, d, rad, px, fog, inView, extra, pos) => {
    const cat = labelOf(o);
    let c = cats.get(cat);
    if (!c) { c = { n: 0, vis: 0, near: 0, add: 0, b: new Array(EDGES.length - 1).fill(0), kinds: {} }; cats.set(cat, c); }
    c.n++; c.kinds[kind] = (c.kinds[kind] || 0) + 1;
    const visible = inView && px >= 2 && fog < 0.9;
    if (visible) { c.vis++; c.b[bucket(d)]++; if (d < 60 && fog < 0.5) c.near++; }
    if (armed && ev.length < 6000) ev.push([frame, +(performance.now() - t0).toFixed(0), cat, kind, +d.toFixed(1), +rad.toFixed(1), +px.toFixed(1), +fog.toFixed(2), inView ? 1 : 0, visible ? 1 : 0, extra || 0, claim[0], claim[1], pos ? GDT.tileKey(GDT.tileIndexX(pos[0]), GDT.tileIndexY(pos[1])) : '']);
  };
  const visit = (o) => {
    if (!o.visible) return;
    if ((o.isMesh || o.isPoints || o.isLine) && o.geometry && o.layers.test(cam.layers)) {
      const g = o.geometry;
      const vc = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
      const ic = o.isInstancedMesh ? o.count : 0;
      const key = o.id;
      const rec = prev.get(key);
      cur.set(key, { vc, ic, gid: g.id });
      let kind = null, grew = 0;
      if (!rec) { kind = 'new'; grew = ic || 1; } else if (o.isInstancedMesh && ic > rec.ic) { kind = 'inst+'; grew = ic - rec.ic; } else if (rec.gid !== g.id || vc > rec.vc) { kind = rec.gid !== g.id ? 'geoswap' : 'grew'; grew = Math.max(1, vc - rec.vc); }
      if (kind && armed) {
        if (!g.boundingSphere) g.computeBoundingSphere();
        if (g.boundingSphere) {
          sph.copy(g.boundingSphere);
          let rad = sph.radius;
          if (o.isInstancedMesh && rec && kind === 'inst+' && o.instanceMatrix) {
            // de nieuwe instanties staan aan het eind: dichtstbijzijnde van de eerste 64
            const m = o.instanceMatrix.array; let best = 1e9;
            for (let i = rec.ic; i < Math.min(ic, rec.ic + 64); i++) { tmp.set(m[i * 16 + 12], m[i * 16 + 13], m[i * 16 + 14]).applyMatrix4(o.matrixWorld); best = Math.min(best, Math.hypot(tmp.x - cam.position.x, tmp.y - cam.position.y, tmp.z - cam.position.z)); }
            const sc1 = o.matrixWorld.getMaxScaleOnAxis();
            rad = Math.max(0.5, g.boundingSphere.radius * sc1);
            const d = Math.max(0, best - rad);
            tmp.set(m[rec.ic * 16 + 12], m[rec.ic * 16 + 13], m[rec.ic * 16 + 14]).applyMatrix4(o.matrixWorld);
            const inView = frustum.intersectsSphere(sph.set(tmp, rad));
            const px = rad / Math.max(d, 1) * (innerHeight / (2 * Math.tan(cam.fov * Math.PI / 360)));
            const f = scene.fog ? Math.min(1, Math.max(0, (d - scene.fog.near) / (scene.fog.far - scene.fog.near))) : 0;
            note(kind, o, d, rad, px, f, inView, grew, [tmp.x, tmp.z]);
            return;
          }
          sph.applyMatrix4(o.matrixWorld);
          rad = sph.radius;
          const d = camDist(sph.center.x, sph.center.y, sph.center.z, rad);
          const inView = frustum.intersectsSphere(sph);
          const px = rad / Math.max(d, 1) * (innerHeight / (2 * Math.tan(cam.fov * Math.PI / 360)));
          const f = scene.fog ? Math.min(1, Math.max(0, (d - scene.fog.near) / (scene.fog.far - scene.fog.near))) : 0;
          note(kind, o, d, rad, px, f, inView, grew, [sph.center.x, sph.center.z]);
        }
      }
    }
    for (let i = 0, n = o.children.length; i < n; i++) visit(o.children[i]);
  };
  const tick = () => {
    if (!on) return;
    frame++;
    const t = performance.now();
    cam.updateMatrixWorld();
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    if (armed && sc.dists) { const dd = sc.dists(); ring.n++; const sh = dd.buildingDetailR / dd.DRAW_DIST; ring.sum += sh; ring.min = Math.min(ring.min, sh); if (sh < 0.9) ring.b90++; if (sh < 0.5) ring.b50++; ring.minR = Math.min(ring.minR, dd.buildingDetailR); ring.facade = dd.facadeDetailDist; ring.draw = dd.DRAW_DIST; }
    if (armed) {
      gls.frames++;
      if (GLC.up) { gls.upFrames++; gls.up += GLC.up; gls.upMs += GLC.upMs; gls.worstUpMs = Math.max(gls.worstUpMs, GLC.upMs); if (GLC.upMs > 2) gls.hitch2++; }
      gls.link += GLC.link; gls.linkMs += GLC.linkMs;
      const np = sc.renderer.info.programs.length; if (np > lastProgs) gls.progNew += np - lastProgs; lastProgs = np;
      if (lastCam) km += Math.hypot(cam.position.x - lastCam[0], cam.position.z - lastCam[1]) / 1000;
      lastCam = [cam.position.x, cam.position.z];
      if (frame % 12 === 0) { try { lodSample(); } catch (e) { /* de audit mag niets breken */ } }
      claim = readyNow(); claimFrames[0]++; if (claim[0]) claimFrames[1]++; if (claim[1] === 1) claimFrames[2]++;
    }
    GLC.up = GLC.upMs = GLC.link = GLC.linkMs = 0;
    cur = new Map();
    visit(scene);
    prev = cur;
    walkMs += performance.now() - t; walks++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    arm() { armed = true; Object.assign(gls, { frames: 0, upFrames: 0, up: 0, upMs: 0, link: 0, linkMs: 0, worstUpMs: 0, hitch2: 0, progNew: 0 }); km = 0; lastCam = null; claimFrames.fill(0); lodAud.samples = lodAud.holes = lodAud.lateDetail = lodAud.swaps = lodAud.swapsToNone = 0; for (const b of lodAud.bands) b.n = b.ok = 0; GLC.up = GLC.upMs = GLC.link = GLC.linkMs = 0; lastProgs = sc.renderer.info.programs.length; Object.assign(ring, { n: 0, sum: 0, min: 1, b90: 0, b50: 0, minR: 1e9 }); t0 = performance.now(); frame = 0; ev.length = 0; cats.clear(); tiles.length = 0; walkMs = 0; walks = 0; },
    stop() {
      on = false;
      const dur = (performance.now() - t0) / 1000;
      const out = { dur: +dur.toFixed(1), frames: frame, walkMs: +(walkMs / Math.max(1, walks)).toFixed(2), tiles, cats: {} , edges: EDGES };
      for (const [k, c] of cats) out.cats[k] = { n: c.n, vis: c.vis, near: c.near, perS: +(c.vis / dur).toFixed(2), b: c.b, kinds: c.kinds };
      // het eerste deel van de lijst met gebeurtenissen (zichtbaar, nabij) voor de steekproef
      out.ring = { frames: ring.n, avgShare: +(ring.sum / Math.max(1, ring.n)).toFixed(3), minShare: +ring.min.toFixed(3), below90: +(ring.b90 / Math.max(1, ring.n)).toFixed(3), below50: +(ring.b50 / Math.max(1, ring.n)).toFixed(3), minR: Math.round(ring.minR), facadeDetailDist: ring.facade, draw: ring.draw, cpuLevel: window.__gfxDyn ? window.__gfxDyn.cpuLevel : null, scale: window.__gfxDyn ? window.__gfxDyn.scale : null };
      out.sample = ev.filter((e) => e[9] && e[4] < 90).slice(0, 120);
      out.visTotal = ev.filter((e) => e[9]).length;
      out.visNear60 = ev.filter((e) => e[9] && e[4] < 60 && e[7] < 0.5).length;
      out.visPerS = +(out.visTotal / dur).toFixed(2);
      out.km = +km.toFixed(3);
      out.visPerKm = km > 0.005 ? +(out.visTotal / km).toFixed(1) : null;
      out.near60PerKm = km > 0.005 ? +(out.visNear60 / km).toFixed(1) : null;
      // na 'klaar': zichtbare gebeurtenissen in frames waarin het spel zichzelf 'settled' noemde (oude definitie), en in die van de nieuwe
      out.visClaimOld = ev.filter((e) => e[9] && e[11] === 1).length;
      out.visClaimNew = ev.filter((e) => e[9] && e[12] === 1).length;
      out.claimFrames = { total: claimFrames[0], old: claimFrames[1], nieuw: claimFrames[2] };
      // wissels: een mesh die van geometrie wisselt terwijl hij in beeld is (LOD-sprong, modelwissel)
      out.visSwaps = ev.filter((e) => e[9] && e[3] === 'geoswap').length;
      out.gl = { frames: gls.frames, upFrames: gls.upFrames, uploads: gls.up, upMs: +gls.upMs.toFixed(1), worstUpMs: +gls.worstUpMs.toFixed(1), upHitch2: gls.hitch2, links: gls.link, linkMs: +gls.linkMs.toFixed(1), programsNew: gls.progNew };
      // tijdlijn per tegel: wanneer geladen, eerste en laatste zichtbare gebeurtenis, aantal
      const tl = new Map(); for (const [t, k] of tiles) tl.set(k, { load: t, n: 0, first: null, last: null });
      for (const e of ev) { if (!e[9] || !e[13]) continue; let r = tl.get(e[13]); if (!r) { r = { load: null, n: 0, first: null, last: null }; tl.set(e[13], r); } r.n++; r.first = r.first == null ? e[1] : Math.min(r.first, e[1]); r.last = r.last == null ? e[1] : Math.max(r.last, e[1]); }
      out.tileTimeline = [...tl].filter(([, r]) => r.n).map(([k, r]) => ({ tile: k, load: r.load, n: r.n, first: r.first, last: r.last, lagMs: r.load != null && r.first != null ? r.first - r.load : null })).slice(0, 60);
      out.lod = { samples: lodAud.samples, bands: lodAud.bands.map((b) => ({ max: b.max, n: b.n, okPct: b.n ? +(100 * b.ok / b.n).toFixed(1) : null })), holes: lodAud.holes, lateDetail: lodAud.lateDetail, swaps: lodAud.swaps, swapsToNone: lodAud.swapsToNone };
      try { out.proceduralPeople = PPL.proceduralStats ? PPL.proceduralStats() : null; } catch (e) { out.proceduralPeople = null; }
      try { out.readyCounts = SP.readyCounts ? SP.readyCounts(w) : null; } catch (e) { out.readyCounts = null; }
      // per seconde: in hoeveel seconden zag de speler minstens één gebeurtenis binnen 60 m
      const secs = new Set(ev.filter((e) => e[9] && e[4] < 60 && e[7] < 0.5).map((e) => Math.floor(e[1] / 1000)));
      out.secsWithNear60 = secs.size;
      return out;
    },
  };
}

// ---- stills: een reeks van N beelden met korte tussenpozen
let mover = null, done = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (mover) mover(performance.now());
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

const DUR = CFG.dur || 30000;
const SHOTS = CFG.shots === undefined ? 6 : CFG.shots;
const TAG = CFG.tag || 'voor';
async function run(name, setup, move, teardown, dur = DUR) {
  if (ONLY && !ONLY.includes(name)) return null;
  fixWorld();
  const ctx = await setup();
  let t0 = performance.now() + 1e9;
  mover = (now) => move(ctx, (now - t0) / 1000);
  // wacht tot de streaming leeg is, zoals achter het laadscherm
  const beg = performance.now();
  while (performance.now() - beg < 25000) {
    const pend = SP.streamPending ? SP.streamPending() : null;
    const q = map.store ? map.store.queue.length + map.store.active : 0;
    if ((!pend || pend.buildings + pend.roads === 0) && q === 0 && (!map.tileQueue || map.tileQueue.size === 0)) break;
    await sleep(200);
  }
  await sleep(1500);
  t0 = performance.now(); fixWorld();
  const probe = makeProbe();
  probe.arm();
  // stills tussen 40% en 60% van de route, 0,5 s uit elkaar
  const shotAt = []; for (let i = 0; i < SHOTS; i++) shotAt.push(dur * 0.4 + i * 500);
  const fpsT = []; let last = performance.now();
  const fl = () => { const n = performance.now(); fpsT.push(n - last); last = n; if (!fin) requestAnimationFrame(fl); };
  let fin = false; requestAnimationFrame(fl);
  const tStart = performance.now(); let si = 0;
  while (performance.now() - tStart < dur) {
    if (si < shotAt.length && performance.now() - tStart >= shotAt[si]) { console.log('[capture] ' + TAG + '-' + name + '-' + (si + 1)); si++; }
    await sleep(50);
  }
  fin = true;
  const res = probe.stop();
  mover = null;
  fpsT.sort((a, b) => a - b);
  const pct = (q) => +(fpsT[Math.min(fpsT.length - 1, Math.floor(fpsT.length * q))] || 0).toFixed(1);
  res.frameMs = { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: +(fpsT[fpsT.length - 1] || 0).toFixed(1), n: fpsT.length };
  res.heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null;
  res.at = [Math.round((p.inVehicle || p).x), Math.round((p.inVehicle || p).y)];
  res.dists = sc.dists ? sc.dists() : null;
  res.info = { geometries: sc.renderer.info.memory.geometries, textures: sc.renderer.info.memory.textures, programs: sc.renderer.info.programs.length, calls: sc.renderer.info.render.calls };
  await sleep(600);
  if (teardown) await teardown(ctx);
  return res;
}

const results = { errors: errs, tag: TAG, viewport: [innerWidth, innerHeight], routes: {} };
const FOOT = PL([[167, 283], [121, 193], [105, 161], [100, 77], [124, 7], [134, 36]]);
results.routes.foot = await run('foot', async () => { teleport(FOOT[0][0], FOOT[0][1]); return {}; }, (c, t) => {
  const q = at(FOOT, Math.max(0, t) * 5);
  p.x = q.x; p.y = q.y; p.angle = q.ang; w.camYaw = q.ang;
}, undefined, 30000);

const placeAt = (n) => { const q = WPL.worldPlaceLabels(-1e7, -1e7, 1e7, 1e7).find((x) => x.name === n); if (!q) throw new Error('no place ' + n); return [q.x, q.y]; };
const A7 = ['Groningen', 'Hoogezand', 'Zuidbroek'].map(placeAt);
results.routes.a7 = await run('a7', async () => {
  teleport(A7[0][0], A7[0][1]);
  let pt = null;
  for (let k = 0; k < 10 && !pt; k++) { await sleep(1500); pt = map.nearestRoadPoint(p.x, p.y, 400, true, true); }
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v, len: pathLen(A7) };
}, (c, t) => {
  const q = at(A7, (Math.max(0, t) * 30) % c.len);
  const v = c.v;
  if (!p.inVehicle) { v.sinking = false; v.wrecked = false; p.enterVehicle(v, w); }
  const rp = map.nearestRoadPoint(q.x, q.y, 150, true, true);
  v.x = rp ? rp.x : q.x; v.y = rp ? rp.y : q.y; v.angle = q.ang; v.speed = t > 0 ? 30 : 0; v.vx = Math.cos(q.ang) * v.speed; v.vy = Math.sin(q.ang) * v.speed;
  w.camYaw = q.ang;
}, async (c) => { if (p.inVehicle) p.exitVehicle(map, w); const i = w.vehicles.indexOf(c.v); if (i >= 0) w.vehicles.splice(i, 1); }, 40000);

// 28-11 (#1354): een autorit door het centrum (de voetroute, rijdend) en door een dorp (Zuidbroek, richting Hoogezand)
const carRoute = (name, pts, speed, dur) => run(name, async () => {
  teleport(pts[0][0], pts[0][1]);
  let pt = null;
  for (let k = 0; k < 10 && !pt; k++) { await sleep(1500); pt = map.nearestRoadPoint(p.x, p.y, 400, true, true); }
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  return { v, len: pathLen(pts) };
}, (c, t) => {
  const q = at(pts, Math.min(c.len - 1, Math.max(0, t) * speed));
  const v = c.v;
  if (!p.inVehicle) { v.sinking = false; v.wrecked = false; p.enterVehicle(v, w); }
  const rp = map.nearestRoadPoint(q.x, q.y, 150, true, true);
  v.x = rp ? rp.x : q.x; v.y = rp ? rp.y : q.y; v.angle = q.ang; v.speed = t > 0 ? speed : 0; v.vx = Math.cos(q.ang) * v.speed; v.vy = Math.sin(q.ang) * v.speed;
  w.camYaw = q.ang;
}, async (c) => { if (p.inVehicle) p.exitVehicle(map, w); const i = w.vehicles.indexOf(c.v); if (i >= 0) w.vehicles.splice(i, 1); }, dur);
results.routes.cdrive = await carRoute('cdrive', FOOT, 12, Math.min(30000, Math.floor(pathLen(FOOT) / 12) * 1000));
results.routes.dorp = await carRoute('dorp', [A7[2], A7[1]], 14, 30000);

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
}, async (c) => { c.v.z = c.v.groundZ || 0; c.v.vx = c.v.vy = 0; c.v.onGround = true; c.v.airborne = false; await sleep(300); if (p.inVehicle) p.exitVehicle(map, w); const i = w.vehicles.indexOf(c.v); if (i >= 0) w.vehicles.splice(i, 1); }, 25000);

done = true; clearInterval(skipper);
return JSON.stringify(results);
