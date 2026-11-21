// Page half of scripts/ui/cutscene_render.mjs (desktop --perf-script body; cutscene quality system, layer 3).
// window.__cr = { only: ['M12.intro', ...], spot: {x,y,a}, settle: ms, w, h } is put in front.
// Per staged scene the real cutscene host builds the scene on the real world at the spot (the same path as
// scripts/qa/cutscene_shots.page.js and the game), the subtitle clock follows our own time T (setCinematicTime),
// and per shot three frames are taken: begin, middle, end. For every frame one record goes to the log:
//   [cs-rec] <id> <json>     { shot, phase, t, camera, speaker, subtitle, hud, near, clip }
//   [capture] <id>__s<NN><b|m|e>   (the harness saves <smoke>-<name>.png; the node half sorts and measures them)
// The pixel measures (black, empty, luminance jump) and the judgement are done by the node half
// (scripts/lib/cutscene_measure.mjs); this file only collects facts from the live scene.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CR = window.__cr || {};
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
w.clock = 14; // een vaste dagtijd en geen weer: elke luminantiesprong komt dan van de scene zelf
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const spot = CR.spot || { x: 200.8, y: 45.4, a: 0.3 };
if (p.inVehicle) p.exitVehicle(map, w);
p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.z = 0;
p.gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
const hold = setInterval(() => { p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; }, 100);
await sleep(CR.settle || 6000);

const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const root = sc3.getScene();
const SW = window.innerWidth, SH = window.innerHeight;
const r2 = (v) => Math.round(v * 100) / 100;
const rectOf = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 2 && b.height > 2 ? { x: r2(b.left), y: r2(b.top), w: r2(b.width), h: r2(b.height) } : null; };

// the game uses y up (THREE) with game y as THREE z: game (x, y, z up) -> THREE (x, z, y)
function cameraRecord() {
  const c = window.__scene3d.cam;
  const dir = new THREE.Vector3(); c.getWorldDirection(dir);
  const pos = c.position;
  return { position: { x: r2(pos.x), y: r2(pos.z), z: r2(pos.y) }, lookAt: { x: r2(pos.x + dir.x * 10), y: r2(pos.z + dir.z * 10), z: r2(pos.y + dir.y * 10) }, fov: r2(c.fov) };
}
// the speaker's screen rectangle by the real camera (feet to head, shoulder width)
function projectActor(a) {
  const c = window.__scene3d.cam;
  c.updateMatrixWorld(); c.updateProjectionMatrix();
  const toScreen = (v) => { const inFront = v.clone().applyMatrix4(c.matrixWorldInverse).z < 0; const n = v.clone().project(c); return { x: (n.x * 0.5 + 0.5) * SW, y: (0.5 - n.y * 0.5) * SH, inFront }; };
  const z0 = a.h || 0;
  const head = toScreen(new THREE.Vector3(a.x, z0 + (a.sit ? a.sit + 0.75 : 1.75), a.y));
  const feet = toScreen(new THREE.Vector3(a.x, z0 + (a.sit ? a.sit : 0), a.y));
  const hgt = Math.abs(feet.y - head.y), breed = hgt * 0.38;
  return { rect: { x: r2(head.x - breed / 2), y: r2(Math.min(head.y, feet.y)), w: r2(breed), h: r2(hgt) }, inFront: head.inFront || feet.inFront };
}
function nearHits() {
  const ray = new THREE.Raycaster(); ray.far = 1.3;
  const cm = window.__scene3d.cam; let hits = 0, minD = 99;
  for (let iy = 0; iy < 5; iy++) for (let ix = 0; ix < 5; ix++) {
    ray.setFromCamera(new THREE.Vector2((ix - 2) / 2.2, (iy - 2) / 2.2), cm);
    const h = ray.intersectObject(root, true).find((q) => q.object.visible && !(q.object.material && q.object.material.transparent && q.object.material.opacity < 0.3));
    if (h) { hits++; minD = Math.min(minD, h.distance); }
  }
  return { hits, minD: r2(minD) };
}
function clipNow() {
  const cm = window.__scene3d.cam;
  const gz = map.groundHeightAt ? map.groundHeightAt(cm.position.x, cm.position.z, 0) || 0 : 0;
  return cam.roofAt(map, cm.position.x, cm.position.z) > cm.position.y - 0.2 || cm.position.y < gz + 0.2;
}

const results = {};
for (const e of cat) {
  if (!e.scene || !e.def || !e.lines || !e.lines.length) continue;
  if (CR.only && CR.only.length && !CR.only.some((o) => e.id === o || e.id.startsWith(o))) continue;
  const anchor0 = { x: spot.x, y: spot.y, facing: spot.a, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2, tree: () => false };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  let run;
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[e.id] = { fout: String(err).slice(0, 200) }; console.log('[cs-fout] ' + e.id + ' ' + String(err).slice(0, 200)); continue; }
  root.add(run.group);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  let T = 0;
  cine.playCinematic({
    id: 'cs-render', duration: 3600, priority: 9, letterbox: false, hideHud: true, pause: true, skippable: false,
    lines: e.lines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })),
    shot: () => { const pose = run.frame(T, 0.05); if (pose) pose.cut = true; return pose; },
  });
  await sleep(500);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  if (cine.setCinematicRate) cine.setCinematicRate(0);
  // the shot boundaries from the pure sampling (0.1 s), the same indices as the linter
  const shots = [];
  let last = -1;
  for (let t = 0; t <= e.duration; t += 0.1) { const si = e.scene.sample(t, anchor0).camera.shotIndex; if (si !== last) { shots.push({ shot: si, t0: t, t1: e.duration }); if (shots.length > 1) shots[shots.length - 2].t1 = t - 0.1; last = si; } }
  const actorOfSpeaker = (name) => Object.keys(e.def.actors || {}).find((k) => k === name || [].concat(e.def.actors[k].speaker || []).includes(name));
  const records = [];
  for (const [n, s] of shots.entries()) {
    for (const [phase, t] of [['b', s.t0 + 0.08], ['m', (s.t0 + s.t1) / 2], ['e', Math.max(s.t0 + 0.08, s.t1 - 0.08)]]) {
      T = Math.min(t, e.duration - 0.06);
      if (cine.setCinematicTime) cine.setCinematicTime(T);
      await sleep(550); // a few frames at this time: the host moves the actors, the subtitle follows the clock
      const line = e.lines.find((l) => T >= l.at && T < l.at + l.dur) || null;
      let speaker = null;
      if (line && !/^(radio|telefoon|app|voicemail)/.test(line.channel || '') && line.key !== 'V') {
        const id = actorOfSpeaker(line.speaker);
        const a = id && e.scene.sample(T, at, env).actors[id];
        if (a && a.visible !== false) { const pr = projectActor(a); speaker = { id, name: line.speaker, rect: pr.rect, inFront: pr.inFront, expected: true }; }
      }
      const subEl = document.querySelector('.cine-sub');
      const subRect = subEl && document.querySelector('.cine-root.has-sub, #cine.has-sub, .has-sub') ? rectOf(subEl) : null;
      const hud = ['.cine-kicker', '.cine-big', '.cine-skip', '.name-card', '.namecard'].map((q) => rectOf(document.querySelector(q))).filter(Boolean);
      const name = e.id.replace(/[^\w.-]/g, '_') + '__s' + String(n).padStart(2, '0') + phase;
      console.log('[capture] ' + name);
      await sleep(450);
      const rec = { cutscene: e.id, shot: s.shot, n, phase, t: r2(T), file: name, camera: cameraRecord(), speaker, subtitle: line && subRect ? { rect: subRect, text: line.text } : null, hud, near: nearHits(), clip: clipNow() };
      records.push(rec);
      console.log('[cs-rec] ' + e.id + ' ' + JSON.stringify(rec));
    }
  }
  cine.skipCinematic && cine.skipCinematic();
  run.dispose();
  w.cinematicHidePlayers = false; w.cinematicHideNav = false;
  results[e.id] = { frames: records.length, shots: shots.length };
  await sleep(300);
}
clearInterval(hold);
return JSON.stringify({ results });
