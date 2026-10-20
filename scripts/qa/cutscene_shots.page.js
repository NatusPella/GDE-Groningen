// Page half of scripts/qa/cutscene_shots.mjs (desktop --perf-script body, #136 #209).
// window.__cs = { only: ['M12.intro', ...], spot: {x,y,a} } is put in front. Per staged scene: the real
// cutscene host builds the scene on the real world at the spot (fitAnchor + roof check, as in the game),
// and one screenshot per shot is taken at the start of each shot ('[capture] <id>-shotNN-tX.X').
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CS = window.__cs || {};
const cine = await imp('cinematics');
const host = await imp('cutscenehost');
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const sc3 = await imp('scene3d');
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
// kijkstraal door pixel (px, py): welke meshes zitten daar (naam, ouderketen, kleur), voor CS.probe = { id, t, px: [[x, y], ...] }
const probeAt = (px, py) => {
  const ray = new THREE.Raycaster();
  const cam = window.__scene3d.cam;
  ray.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1)), cam);
  return ray.intersectObject(window.__scene3d.scene, true).slice(0, 5).map((h) => {
    const o = h.object, chain = [];
    for (let q = o; q && chain.length < 5; q = q.parent) chain.push((q.name || q.type) + (q.userData && Object.keys(q.userData).length ? ':' + JSON.stringify(q.userData).slice(0, 60) : ''));
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    return { d: +h.distance.toFixed(2), at: [h.point.x, h.point.z, h.point.y].map((v) => +v.toFixed(1)), chain, color: m && m.color && m.color.getHexString(), verts: o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count };
  });
};
D.input.canLock = () => false;
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; } // een hardnekkig startscherm valt over elk beeld
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const spot = CS.spot || { x: 200.8, y: 45.4, a: 0.3 };
if (p.inVehicle) p.exitVehicle(map, w);
p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.z = 0;
p.gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
const hold = setInterval(() => { p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; }, 100);
await sleep(CS.settle || 6000);

const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
// the real NPC looks (names only in the catalogue's table): the real table comes from missionstory when exported
// CS.sample = { seed, n }: n scènes met een vaste seed gekozen (de sweep, scripts/qa/sweep.mjs)
let sampled = null;
if (CS.sample) {
  const pool = cat.filter((e) => e.scene && e.def).map((e) => e.id);
  let a = (CS.sample.seed >>> 0) || 1;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  sampled = new Set(pool.slice(0, CS.sample.n));
  console.log('[cs-sample] ' + [...sampled].join(','));
}
let T = 0;
const results = {};
const root = sc3.getScene();
for (const e of cat) {
  if (!e.scene || !e.def) continue;
  if (sampled && !sampled.has(e.id)) continue;
  if (CS.only && CS.only.length && !CS.only.some((o) => e.id === o || e.id.startsWith(o))) continue;
  const anchor0 = { x: spot.x, y: spot.y, facing: spot.a, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2 };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  let run;
  const notes = [];
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[e.id] = { fout: String(err).slice(0, 200) }; continue; }
  root.add(run.group);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  T = 0;
  cine.playCinematic({ id: 'cs-shots', duration: 3600, priority: 9, letterbox: false, hideHud: true, pause: true, skippable: false, shot: () => run.frame(T, 0.05) });
  await sleep(500);
  // het afsluiten van een vorige cinematic (de start van het spel) zet deze vlaggen weer uit: opnieuw aanzetten, anders staat de speler zelf naast de acteurs (#264)
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  let times = prev.stillTimes(e);
  // CS.dense = { 'M02.intro': { shot: 6, n: 5 } }: n extra stills spread over one shot (is er camerabeweging, #224)
  const dn = CS.dense && CS.dense[e.id];
  if (dn) {
    const ST = [];
    let last = -1;
    for (let t = 0; t <= e.duration; t += 0.1) { const si = e.scene.sample(t, anchor0).camera.shotIndex; if (si !== last) { ST.push(t); last = si; } }
    const t0 = ST[dn.shot] ?? 0, t1 = ST[dn.shot + 1] ?? e.duration;
    times = [];
    for (let k = 0; k < dn.n; k++) times.push(Math.round((t0 + 0.2 + (t1 - t0 - 0.4) * (k / (dn.n - 1))) * 10) / 10);
    console.log('[cs-dense] ' + e.id + ' shot ' + dn.shot + ' van ' + t0.toFixed(1) + ' tot ' + t1.toFixed(1) + ' s');
  }
  let persons = null; const probes = [];
  // wie staat er in beeld: alle zichtbare figuren (met een eigen schaduwcirkel) bij het anker, met hun ouderketen (#264)
  {
    T = times[0] || 0.2;
    await sleep(900);
    const found = [];
    root.traverse((o) => {
      if (!o.userData || !o.userData.shadow || !o.visible) return;
      let vis = true;
      for (let q = o.parent; q; q = q.parent) if (!q.visible) vis = false;
      if (!vis) return;
      const wp = o.getWorldPosition(new o.position.constructor());
      if (Math.hypot(wp.x - spot.x, wp.z - spot.y) > 14) return;
      const chain = []; for (let q = o; q && chain.length < 4; q = q.parent) chain.push(q.name || q.type);
      found.push({ at: [wp.x, wp.z].map((v) => +v.toFixed(1)), chain: chain.join('<'), kids: o.children.length });
    });
    persons = found;
  }
  let k = 0;
  for (const t of times) {
    T = t;
    await sleep(120); // a few frames at this t
    await sleep(380);
    const name = prev.stillName(e.id, k, t).replace(/\.png$/, '').replace(/[^\w.-]/g, '_');
    console.log('[capture] ' + name);
    if (CS.probe && CS.probe.id === e.id && Math.abs(t - CS.probe.t) < 0.06) probes.push({ t, hits: CS.probe.px.map(([x, y]) => ({ x, y, hits: probeAt(x, y) })) });
    await sleep(450);
    k++;
  }
  cine.skipCinematic && cine.skipCinematic();
  run.dispose();
  w.cinematicHidePlayers = false; w.cinematicHideNav = false;
  // camera in a wall or under a roof (the collision check of #209): sampled every 0.25 s on the fitted anchor
  const inside = [];
  for (let t = 0; t <= e.duration; t += 0.25) {
    try {
      const c = e.scene.sample(t, at).camera;
      const gz = map.groundHeightAt ? map.groundHeightAt(c.position.x, c.position.y, 0) || 0 : 0;
      if (cam.roofAt(map, c.position.x, c.position.y) > c.position.z - 0.2 || c.position.z < gz + 0.2) inside.push(+t.toFixed(2));
    } catch (err) { /* sampling failed: no verdict */ }
  }
  if (inside.length) console.log('[cs-clip] ' + e.id + ' camera in gebouw/grond op t=' + inside.slice(0, 12).join(','));
  results[e.id] = { persons, probes, shots: times.length, clip: inside.length ? inside.slice(0, 40) : undefined, anker: { x: +at.x.toFixed(1), y: +at.y.toFixed(1), facing: +at.facing.toFixed(2) } };
  console.log('[cs-scene] ' + e.id + ' ' + JSON.stringify(results[e.id]));
  await sleep(300);
}
clearInterval(hold);
return JSON.stringify({ results });
