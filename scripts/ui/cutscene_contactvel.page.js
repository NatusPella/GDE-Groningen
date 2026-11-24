// Page half of scripts/cutscene_contactvel.mjs (desktop --perf-script body, #1322): one keyframe per shot of each cutscene.
// window.__cv = { items: [{ id, keys: [{ n, t }] }], width, settle, spot } is put in front by the node half.
// Per cutscene the real cutscene host builds the scene on the real world (the same path as scripts/ui/cutscene_render.page.js and the
// game), the clock follows our own time T and per key one JPEG is taken: [capture] jpg:cv__<id>__k<NN>@<width>.
// Per key one record goes back in the result ({ results, recs: { <id>: [{ n, t, camera, near, blocked: [{ id, hits }], light }] } }):
//   near: rays from the lens that hit something within 1.3 m (camera in geometry); blocked: an actor in view whose head is hidden
//   behind world or set geometry (raycast from the lens to the head, the actor's own meshes excluded).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CV = window.__cv || { items: [] };
const cine = await imp('cinematics');
await imp('cutscenehost');
const host = window.__cutHost;
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const sc3 = await imp('scene3d');
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
D.input.canLock = () => false;
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
w.clock = 14; // a fixed time of day and no weather: the light of a shot comes from the scene itself (#1323)
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const spot = CV.spot || { x: 200.8, y: 45.4, a: 0.3 };
if (p.inVehicle) p.exitVehicle(map, w);
p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.z = 0;
p.gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
const hold = setInterval(() => { p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; w.clock = 14; }, 100);
await sleep(CV.settle || 6000);

const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const byId = new Map(cat.map((e) => [e.id, e]));
const root = sc3.getScene();
const r2 = (v) => Math.round(v * 100) / 100;
const ray = new THREE.Raycaster();

function nearHits() {
  ray.far = 1.3;
  const cm = window.__scene3d.cam; let hits = 0;
  for (let iy = 0; iy < 5; iy++) for (let ix = 0; ix < 5; ix++) {
    ray.setFromCamera(new THREE.Vector2((ix - 2) / 2.2, (iy - 2) / 2.2), cm);
    const h = ray.intersectObject(root, true).find((q) => q.object.visible && !(q.object.material && q.object.material.transparent && q.object.material.opacity < 0.3));
    if (h) hits++;
  }
  return hits;
}
const inside = (o, m) => { for (let n = o; n; n = n.parent) if (n === m) return true; return false; };
// the head of each visible actor in view: is something solid between the lens and the head?
function blockedHeads(run, s) {
  const cm = window.__scene3d.cam;
  const out = [];
  for (const [id, a] of Object.entries(s.actors)) {
    if (a.visible === false) continue;
    const head = new THREE.Vector3(a.x, (a.h || 0) + (a.sit ? a.sit + 0.72 : 1.66), a.y);
    const ndc = head.clone().project(cm);
    if (ndc.z > 1 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
    const from = cm.position.clone();
    const dir = head.clone().sub(from);
    const dist = dir.length();
    ray.set(from, dir.normalize());
    ray.far = Math.max(0.1, dist - 0.35);
    const mesh = run.actors[id];
    const hits = ray.intersectObject(root, true).filter((q) => q.object.visible && q.object.isMesh && !(mesh && inside(q.object, mesh))
      && !(q.object.material && q.object.material.transparent && q.object.material.opacity < 0.5) && !(q.object.parent && q.object.parent.isSkinnedMesh));
    // other actors in front of the head do not count as geometry (that is staging, not a wall)
    const solid = hits.filter((q) => !Object.values(run.actors).some((m) => m !== mesh && inside(q.object, m)));
    if (solid.length) out.push({ id, hits: solid.length, at: r2(solid[0].distance), wat: String(solid[0].object.name || solid[0].object.type).slice(0, 40) });
  }
  return out;
}
function cameraRecord() {
  const c = window.__scene3d.cam;
  const dir = new THREE.Vector3(); c.getWorldDirection(dir);
  const pos = c.position;
  return { position: { x: r2(pos.x), y: r2(pos.z), z: r2(pos.y) }, lookAt: { x: r2(pos.x + dir.x * 10), y: r2(pos.z + dir.z * 10), z: r2(pos.y + dir.y * 10) }, fov: r2(c.fov) };
}

const results = {};
const recs = {}; // the records go back in the script's result (a plain console.log does not reach the node half)
for (const it of CV.items) {
  const e = byId.get(it.id);
  if (!e || !e.scene || !e.def) { results[it.id] = { fout: 'niet in de catalogus' }; continue; }
  const anchor0 = { x: spot.x, y: spot.y, facing: spot.a, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2, tree: () => false };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  let run;
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[it.id] = { fout: String(err).slice(0, 200) }; console.log('[cv-fout] ' + it.id + ' ' + String(err).slice(0, 200)); continue; }
  root.add(run.group);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  let T = 0;
  cine.playCinematic({
    id: 'cv-render', duration: 3600, priority: 9, letterbox: false, hideHud: true, pause: true, skippable: false,
    lines: (e.lines || []).map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })),
    shot: () => { const pose = run.frame(T, 0.05); if (pose) pose.cut = true; return pose; },
  });
  await sleep(600);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  if (cine.setCinematicRate) cine.setCinematicRate(0);
  for (const k of it.keys) {
    T = Math.min(k.t, e.duration - 0.06);
    if (cine.setCinematicTime) cine.setCinematicTime(T);
    await sleep(700); // a few frames at this time: actors, light and subtitle follow the clock
    const s = e.scene.sample(T, at, env);
    const name = 'cv__' + it.id.replace(/[^\w.-]/g, '_') + '__k' + String(k.n).padStart(2, '0');
    console.log('[capture] jpg:' + name + '@' + (CV.width || 960));
    await sleep(450);
    const rec = { n: k.n, t: r2(T), camera: cameraRecord(), near: nearHits(), blocked: blockedHeads(run, s), light: s.camera.light ? s.camera.light.name : null };
    (recs[it.id] = recs[it.id] || []).push(rec);
  }
  cine.skipCinematic && cine.skipCinematic();
  run.dispose();
  w.cinematicHidePlayers = false; w.cinematicHideNav = false;
  results[it.id] = { keys: it.keys.length };
  await sleep(300);
}
clearInterval(hold);
return JSON.stringify({ results, recs });
