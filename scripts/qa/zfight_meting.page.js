// Page half of scripts/qa/zfight_meting.mjs (desktop --perf-script body; #917): per plek en per camera-variant (near, far)
// drie beelden a, b en c (= a), zodat brug_beeld_analyse.mjs --stabiel de wisselpixels telt. b heeft de camera op dezelfde plek
// met near 3% groter (andere dieptestappen): alleen pixels die op de dieptestap een winnaar kiezen (z-fighting) wisselen dan.
// Per plek kan q.vooruit de camera in b ook zoveel meter langs de kijkrichting zetten, maar dat geeft randruis.
// Wat beweegt (mensen, verkeer, dieren, de routestrook) staat uit. De camera staat vast: renderer.render zet positie, kijkpunt,
// near en far vlak voor elke tekenbeurt, en de speler staat op de camerapositie zodat streaming, LOD en cullen op de goede plek zitten.
// q.controle: vijf paren vlakke platen als positieve controle (zie bouwControle).
// window.__zf = { plekken: [{ naam, x, y, d, az, h, lz?, oog?, a? }], varianten: [{ id, near, far? }], settle } staat ervoor.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const RR = await imp('scene3d/routeribbon3d');
const CFG = window.__zf;
const SETTLE = CFG.settle || 9000;
const NEAR_B = 1.03;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
let hold = null, done = false;
const tick = () => { w.clock = 14; if (hold) { if (p.inVehicle) p.exitVehicle(map, w); p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const S3 = window.__scene3d;
let cur = null, camV = null;
const origRender = S3.renderer.render.bind(S3.renderer);
const farStd = S3.cam.far;
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) {
    c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y);
    if (camV && (c.near !== camV.near || c.far !== camV.far)) { c.near = camV.near; c.far = camV.far; c.updateProjectionMatrix(); }
    c.updateMatrixWorld(true);
  }
  // wat beweegt (mensen, verkeer, dieren, de routestrook) uit beeld: dat is ruis tussen a, b en c, geen z-fighting
  RR.hideRouteRibbon3D();
  const act = S3.actors();
  for (const k of ['vehicles', 'peds', 'wildlife']) { const g = act[k]; if (!g) continue; for (const m of (g.values ? g.values() : g)) { const o = m && m.mesh ? m.mesh : m; if (o && o.visible !== undefined) o.visible = false; } }
  origRender(sc, c);
};
for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && !(el.tagName === 'SCRIPT')) el.style.display = 'none';
w.cinematicHidePlayers = true;
// fps vóór het beeld: gemiddelde over 20 frames
const fps = () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n >= 20) res(+(20000 / (performance.now() - t0)).toFixed(1)); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
const grab = async (name) => { console.log('[capture] ' + name); await sleep(450); };
const zet = (pose) => { cur = pose; hold = { x: pose.position.x, y: pose.position.y }; p.angle = Math.atan2(pose.lookAt.y - pose.position.y, pose.lookAt.x - pose.position.x); };
const vooruit = (pose, d) => { const dx = pose.lookAt.x - pose.position.x, dy = pose.lookAt.y - pose.position.y, dz = pose.lookAt.z - pose.position.z, L = Math.hypot(dx, dy, dz) || 1; return { position: { x: pose.position.x + dx / L * d, y: pose.position.y + dy / L * d, z: pose.position.z + dz / L * d }, lookAt: pose.lookAt }; };
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
// positieve controle (q.controle): vijf paren vlakke platen (achter groen, 6 mm ervoor rood) recht tegenover de camera op 100, 200,
// 300, 400 en 500 m, elk onder een andere hoek. Een paar dat niet z-fight is volledig rood; groene spikkels zijn z-fighting.
// Zo is te zien bij welke afstand een offset van 6 mm (de nudge van gebouwen) per near-instelling nog standhoudt.
const bouwControle = (pose, az, delta) => {
  const T = S3.THREE, grp = new T.Group();
  const camP = new T.Vector3(pose.position.x, pose.position.z, pose.position.y);
  [100, 200, 300, 400, 500].forEach((D, i) => {
    const hoek = az + (i - 2) * 0.17, dir = new T.Vector3(Math.cos(hoek), 0, Math.sin(hoek));
    const b = D * 0.07, base = camP.clone().addScaledVector(dir, D);
    for (const [kleur, off] of [[0x20a020, 0], [0xe02020, -delta]]) {
      const m = new T.Mesh(new T.PlaneGeometry(b, b), new T.MeshBasicMaterial({ color: kleur, fog: false, side: T.DoubleSide }));
      m.position.copy(base).addScaledVector(dir, off); m.lookAt(camP); m.frustumCulled = false; grp.add(m);
    }
  });
  S3.scene.add(grp);
  return grp;
};
const results = [];
await sleep(3000);
for (const q of CFG.plekken) {
  const rep = { naam: q.naam, x: q.x, y: q.y, varianten: {} };
  results.push(rep);
  try {
    const gz = gh(q.x, q.y);
    let pose;
    if (q.oog) { // straatniveau: de camera staat op (x, y) en kijkt onder hoek a
      pose = { position: { x: q.x, y: q.y, z: gz + (q.h || 1.7) }, lookAt: { x: q.x + Math.cos(q.a) * 60, y: q.y + Math.sin(q.a) * 60, z: gz + (q.lz == null ? 3 : q.lz) } };
    } else { // schuin op een doel: afstand d, richting az, hoogte h boven de grond
      pose = { position: { x: q.x + Math.cos(q.az) * q.d, y: q.y + Math.sin(q.az) * q.d, z: gz + q.h }, lookAt: { x: q.x, y: q.y, z: gz + (q.lz == null ? 5 : q.lz) } };
    }
    let controle = null;
    if (q.controle) { pose.lookAt = { x: pose.position.x + Math.cos(q.az) * 100, y: pose.position.y + Math.sin(q.az) * 100, z: pose.position.z }; controle = bouwControle(pose, q.az, q.delta || 0.006); }
    camV = { near: 0.5, far: farStd };
    hold = { x: pose.position.x, y: pose.position.y };
    await sleep(SETTLE);
    zet(pose);
    await sleep(3500);
    rep.grond = +gz.toFixed(2);
    rep.farStandaard = Math.round(S3.cam.far);
    camV = { near: CFG.varianten[0].near, far: CFG.varianten[0].far || farStd };
    await sleep(CFG.warm || 6000); // opwarmen: de streaming van de omgeving moet klaar zijn voor het eerste beeld
    for (const v of CFG.varianten) {
      camV = v.auto ? null : { near: v.near, far: v.far || farStd };
      await sleep(v.auto ? 2500 : 900);
      const tag = `bb-${q.naam}-${v.id}`;
      rep.varianten[v.id] = { near: +(camV ? camV.near : S3.cam.near).toFixed(3), far: Math.round(camV ? camV.far : S3.cam.far), fps: await fps() };
      await grab(`${tag}-a`);
      camV = { near: (v.auto ? S3.cam.near : v.near) * NEAR_B, far: v.auto ? S3.cam.far : v.far || farStd }; cur = vooruit(pose, q.vooruit || 0); await sleep(500);
      await grab(`${tag}-b`);
      camV = v.auto ? null : { near: v.near, far: v.far || farStd }; cur = pose; await sleep(v.auto ? 1500 : 500);
      await grab(`${tag}-c`);
    }
    if (controle) S3.scene.remove(controle);
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
hold = null; done = true;
clearInterval(skipper);
return JSON.stringify({ plekken: results });
