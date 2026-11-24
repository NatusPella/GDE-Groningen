// Vaste beeldpunten voor de beeldbugs uit hertest 3 (24-11): #1329 #1330 #1331 #1332 #917 #943 #1110 #1328. Dezelfde punten voor en na
// een wijziging, zodat de beelden een op een te vergelijken zijn. Een scriptbody voor desktop --perf-script (via ui_shots.mjs):
//   node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/beeldbugs_scenes.js --only=1329,917 --out=<map> --timeout=900
// Uitvoer: '[capture] b<nr>-<naam>' (een beeld) en '[bb] <json>' (sonde en metingen) op stderr; de terugkeerwaarde is het rapport.
// Tussen twee scenes zet reset() de spelstatus terug (minigame, duif, eerste persoon, voertuig, wapen, film, menu), zodat een scene
// niets meeneemt naar de volgende (hertest 24-11: een voetbalwedstrijd liep door in de volgende beelden).
// Samen spelen: alles draait lokaal in een spel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (nr) => !ONLY.length || ONLY.includes(String(nr));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const log = (o) => console.error('[bb] ' + JSON.stringify(o));
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive() && !cine.isCinematicActive('bb-view') && !cine.isCinematicActive('cs-shots')) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const THREE = window.__scene3d.THREE;
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
{ const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
const PM = await imp('pausemenu'); const DN = await imp('daynight'); const BUSY = await imp('busy');
const { P } = await imp('worldframe');
const stad = P(100, 77);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
let klok = 14;
const fix = () => { w.clock = klok; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
const houd = setInterval(fix, 400);
let pose = null;
const camOff = () => { pose = null; if (cine.isCinematicActive('bb-view')) cine.skipCinematic(); w.cameraOverride = null; };
// het eigen camerabeeld; een ander filmpje (een sms, een melding) kan het vervangen: shot() zet het dan opnieuw
const ensureCam = () => { if (pose && !cine.isCinematicActive('bb-view')) cine.playCinematic({ id: 'bb-view', duration: 3600, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose }); };
const cam = (x, y, z, lx, ly, lz, fov = 60) => { pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true }; ensureCam(); };
const jump = async (x, y, settle = 5000) => {
  camOff(); if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 450 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
};
let cur = null;
const report = [];
// een beeld: wacht tot desktop/devtools.js het heeft opgeslagen (window.__capAck), anders schuiven de beelden op een drukke machine op
const shot = async (name, wait = 1500) => {
  ensureCam(); await sleep(wait); ensureCam(); await sleep(150); fix();
  const was = window.__capAck || 0;
  console.log('[capture] b' + cur + '-' + name);
  for (let i = 0; i < 600 && (window.__capAck || 0) <= was; i++) await sleep(100);
  await sleep(200);
};
// welke meshes zitten er onder pixel (px, py): naam, ouderketen, kleur, doorzichtigheid
const probe = (px, py) => {
  const ray = new THREE.Raycaster(); const c = window.__scene3d.cam;
  ray.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1)), c);
  return ray.intersectObject(window.__scene3d.scene, true).filter((h) => h.object.visible).slice(0, 6).map((h) => {
    const o = h.object, chain = [];
    for (let q = o; q && chain.length < 4; q = q.parent) chain.push(q.name || q.type);
    const m = Array.isArray(o.material) ? o.material[h.face ? h.face.materialIndex || 0 : 0] : o.material;
    const ud = (q) => (q && q.userData && Object.keys(q.userData).length ? Object.keys(q.userData).slice(0, 6).join(',') : '');
    return { d: +h.distance.toFixed(3), chain: chain.join('<'), ud: ud(o) + '|' + ud(o.parent), mt: m && (m.type + (m.name ? ':' + m.name : '')), kleur: m && m.color && m.color.getHexString(), tr: !!(m && m.transparent), op: m && m.opacity, po: m && m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null, ro: o.renderOrder, nv: o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count, inst: h.instanceId, vc: (() => { const c = o.geometry && o.geometry.attributes.color; return c && h.face ? [c.getX(h.face.a), c.getY(h.face.a), c.getZ(h.face.a)].map((v) => +v.toFixed(2)).join(',') : null; })() };
  });
};
// alles terug naar gewoon lopen in de stad, tussen elke twee scenes
const reset = async () => {
  camOff();
  try { BUSY.quitRunningActivities(w); } catch (e) { log({ reset: 'activiteiten: ' + e.message }); }
  try { if (window.__voetbal) window.__voetbal.quit(); } catch (e) { /* geen wedstrijd */ }
  try { const PIG = await imp('pigeonmode'); if (w.pigeonMode) PIG.stopPigeonMode(w); } catch (e) { /* geen duif */ }
  try { const FP = await imp('firstperson'); FP.setFirstPerson(w, false); } catch (e) { /* geen eerste persoon */ }
  if (p.inVehicle) { try { p.exitVehicle(map, w); } catch (e) { /* al uit */ } }
  for (let i = 0; i < 20 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(150); }
  try { PM.closePauseMenu(); } catch (e) { /* niet open */ }
  w.weapon = 'fists'; w.wanted = 0; w.cinematicHidePlayers = false; w.cinematicHideNav = false; w.cameraOverride = null; w.paused = false;
  klok = 14; fix();
  for (const el of document.querySelectorAll('.bm-moment, .big-moment')) el.remove();
  await sleep(500);
};
const scene = async (nr, fn) => {
  if (!want(nr)) return;
  cur = nr; console.error('[bb] scene ' + nr);
  const ev = { nr, ok: true };
  try { await fn(ev); } catch (e) { ev.ok = false; ev.fout = String(e && e.stack || e).slice(0, 400); }
  log(ev); report.push(ev);
  await reset();
};
const landmark = (naam) => { const l = (map.meta.landmarks || []).find((x) => x.name.toLowerCase().includes(naam)); return l ? [l.x, l.y] : null; };

// controle coördinator (#1330): laden de Quaternius-rigs, en tekent het spel ze voor de speler, Tessa en de voorbijgangers?
await scene('rig', async (ev) => {
  const MP = await imp('modularpeople'); const DF = await imp('devflags');
  await jump(stad[0], stad[1], 4000);
  ev.modularReady = MP.modularReady(); ev.fase = MP.mensenFase(DF.FLAGS.mensen); ev.vlag = DF.FLAGS.mensen ?? null;
  const rigs = await Promise.all(['man', 'vrouw'].map((n) => fetch('/models/mensen/' + n + '.json').then((r) => r.status).catch((e) => 'fout ' + e.message)));
  ev.rigBestanden = rigs;
  let q = 0, oud = 0; const waarom = {};
  for (const [pd, m] of window.__scene3d.actors().peds) { if (m.userData.qRig) { q++; continue; } oud++; const k = pd.pose ? 'pose:' + pd.pose : pd.look && pd.look.age === 'child' ? 'kind' : pd.isCop ? 'politie' : pd.look ? 'look' : 'gewoon'; waarom[k] = (waarom[k] || 0) + 1; }
  ev.procedureelWaarom = waarom;
  ev.voorbijgangers = { modulair: q, procedureel: oud };
  const spelers = []; window.__scene3d.scene.traverse((o) => { if (o.userData && (o.userData.isPlayerMesh || o.userData.playerId !== undefined || o.name === 'player')) spelers.push((o.name || o.type) + ':' + !!o.userData.qRig); });
  ev.spelerMeshes = spelers.slice(0, 6);
  await shot('stad', 1000);
});

// #1329 fietsen in een rek bij de Vismarkt: de dichtstbijzijnde geparkeerde fiets van dichtbij en op loopafstand
await scene(1329, async (ev) => {
  const vm = landmark('vismarkt') || stad; await jump(vm[0], vm[1], 6000);
  const BR = await imp('breakables');
  const bikes = BR.findProps(vm[0], vm[1], 90).filter((b) => b.kind === 'bike').sort((a, b) => Math.hypot(a.x - vm[0], a.y - vm[1]) - Math.hypot(b.x - vm[0], b.y - vm[1]));
  ev.fietsen = bikes.length;
  const b = bikes[0]; if (!b) return;
  await jump(b.x + 4, b.y + 4, 4000); const z = gh(b.x, b.y);
  ev.fiets = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), z: +z.toFixed(2), face: b.face };
  // welke wegen liggen er rond de fiets (categorie, breedte, afstand tot de hartlijn): bepaalt of het rek op een stoep staat
  ev.wegen = map.roadsNear(b.x, b.y, 12).map((r) => { let d = 1e9; for (let i = 0; i < r.pts.length - 1; i++) { const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1]; const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; let t = ((b.x - ax) * dx + (b.y - ay) * dy) / l; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(ax + dx * t - b.x, ay + dy * t - b.y)); } return r.cat + '/' + (r.type || '') + ' w' + r.width + ' d' + d.toFixed(1); });
  const fx = Math.cos(b.face), fy = Math.sin(b.face), sx = -fy, sy = fx;   // de fiets kijkt langs face: zijaanzicht staat haaks daarop
  cam(b.x + sx * 3, b.y + sy * 3, z + 1.3, b.x, b.y, z + 0.5, 55); await shot('zij-3m');
  ev.sondeZij = probe(innerWidth / 2, innerHeight / 2 + 60);
  cam(b.x + sx * 9 + fx * 4, b.y + sy * 9 + fy * 4, z + 1.7, b.x, b.y, z + 0.6, 55); await shot('loop-10m');
  cam(b.x + fx * 2.2 + sx * 1.2, b.y + fy * 2.2 + sy * 1.2, z + 1.6, b.x, b.y, z + 0.5, 60); await shot('schuin-2m');
  cam(b.x + sx * 2.4, b.y + sy * 2.4, z + 0.6, b.x, b.y, z + 0.55, 30); await shot('zij-tele');
  cam(b.x + sx * 0.3, b.y + sy * 0.3, z + 3.2, b.x, b.y, z, 45); await shot('boven');
});

// #1330 voetgangers dichtbij aan de Vismarkt: wat staat er binnen 25 m (wereldleven, verre menigte, gewone voetgangers)
await scene(1330, async (ev) => {
  klok = 11; const vm = landmark('vismarkt') || stad; await jump(vm[0], vm[1], 7000);
  const sc = window.__scene3d.scene; const life = sc.getObjectByName('wereldleven');
  ev.wereldleven = life ? life.children.map((m) => ({ naam: m.name, geo: m.geometry && m.geometry.type, n: m.count, zichtbaar: m.visible && life.visible })) : null;
  let far = 0; sc.traverse((o) => { if (o.name === 'farcrowd' && o.visible) far += o.count; }); ev.verreMenigte = far;
  // de dichtstbijzijnde mens van het wereldleven: de camera op 7 m ervan
  let near = null;
  if (life && life.visible) {
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const im of life.children) {
      if (!im.isInstancedMesh || !im.count || /dieren/.test(im.name)) continue;
      for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); const d = Math.hypot(v.x - p.x, v.z - p.y); if (!near || d < near.d) near = { d, x: v.x, y: v.z, z: v.y, naam: im.name }; }
      if (near) break;
    }
  }
  ev.dichtst = near && { d: +near.d.toFixed(1), x: +near.x.toFixed(1), y: +near.y.toFixed(1), z: +near.z.toFixed(1), mesh: near.naam };
  if (near) {
    await jump(near.x + 6, near.y + 6, 3000);
    const gz = gh(near.x, near.y);
    cam(near.x + 5, near.y + 4, gz + 2.4, near.x, near.y, gz + 1.0, 55); await shot('wereldleven-7m');
    ev.camera = (() => { const c = window.__scene3d.cam.position; return [c.x, c.z, c.y].map((v) => +v.toFixed(1)); })();
    ev.sonde = probe(innerWidth / 2, innerHeight / 2);
  }
  camOff(); await jump(vm[0], vm[1], 2500); await shot('speler', 1500);
});

// #1331 spookvoetgangers in een cutscene: M04.outro zoals de cutscene-stills hem maken (cutscene_shots.mjs), met de telling van
// halfdoorzichtige mensen (userData.fadeLevel onder het maximum) in elke still
await scene(1331, async (ev) => {
  const host0 = await imp('cutscenehost'); void host0; const host = window.__cutHost;
  const scr = await imp('cutscript'); const prev = await imp('cutpreview'); const camp = await imp('camerapath'); const sc3 = await imp('scene3d');
  const PF = await imp('scene3d/pedfade3d');
  const spot = { x: 200.8, y: 45.4, a: 0.3 };
  await jump(spot.x, spot.y, 6000);
  const script = await (await fetch('/storydata/script.json')).json();
  const src = await (await fetch('/js/missionstory.js')).text();
  const cat = prev.buildCatalog({ script, npcSource: src });
  const e = cat.find((x) => x.id === 'M04.outro' && x.scene && x.def);
  if (!e) { ev.fout = 'M04.outro niet in de catalogus'; return; }
  const env = { solid: (x, y, z) => camp.roofAt(map, x, y) > z - 0.2, tree: () => false };
  const at = scr.fitAnchor(e.scene, { x: spot.x, y: spot.y, facing: spot.a, z: p.gz || 0 }, env);
  const run = host.buildScriptRun(e.def, e.scene, at, env, w);
  sc3.getScene().add(run.group);
  let T = 0;
  // zoals een echte verhaalfilm: pause aan (de animaties en het spel staan stil), spelers wel in beeld
  cine.playCinematic({ id: 'cs-shots', duration: 3600, priority: 9, letterbox: false, hideHud: true, pause: true, skippable: false, shot: () => { const ps = run.frame(T, 0.05); if (ps) ps.cut = true; return ps; } });
  // halfdoorzichtige voorbijgangers IN BEELD: binnen 40 m van de filmcamera en in het beeldvlak (verder weg vervagen ze bewust aan de rand
  // van het tekenbereik); de telling loopt over de voetgangers van scene3d (actors().peds)
  const spook = () => {
    const c = window.__scene3d.cam; c.updateMatrixWorld();
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
    let n = 0, tot = 0;
    for (const m of window.__scene3d.actors().peds.values()) {
      if (!m.visible) continue;
      if (m.position.distanceTo(c.position) > 40 || !fr.containsPoint(m.position.clone().setY(m.position.y + 1))) continue;
      tot++; if (m.userData.fadeLevel !== undefined && m.userData.fadeLevel < PF.FADE_STEPS) n++;
    }
    return { half: n, mensen: tot };
  };
  ev.stills = [];
  const times = prev.stillTimes(e);
  for (const [k, t] of times.slice(0, 4).entries()) { T = t; await sleep(2500); ev.stills.push({ t, ...spook() }); await shot('still' + k, 300); }
  cine.skipCinematic(); run.dispose();
});

// #1332 de eindkaart bij mislukt met een meegegeven beloning
await scene(1332, async (ev) => {
  await jump(stad[0], stad[1], 3000);
  const BM = await imp('bigmoment');
  const r = BM.showBigMoment({ soort: 'mislukt', titel: 'Het containerlabyrint', beloning: 250, eigen: true });
  ev.getoond = !!r; await shot('mislukt-met-beloning', 900);
  const el = document.querySelector('.bm-mislukt'); ev.tekst = el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
});

// #917 z-fighting op een rode gevel in het centrum (zelfde camera als hertest 917 b) plus de sonde op de lijst
await scene(917, async (ev) => {
  await jump(...stad, 5000); const [x, y] = stad; const z = gh(x, y);
  cam(x + 8, y + 8, z + 4, x, y, z + 4, 70); await shot('b', 2200);
  // de lijst tussen de verdiepingen (crème) en de baksteen erboven en eronder, op de rode gevel links in beeld
  ev.sonde = [[300, 228], [300, 205], [300, 250], [650, 330], [560, 300]].map(([px, py]) => ({ px, py, hits: probe(px, py) }));
  cam(x + 8, y + 8, z + 4, x - 6, y + 4, z + 6, 45); await shot('b-detail', 2000);
  // welke laag tekent de crème band: de verre LOD (farLod) en de statische bundels een voor een uit
  const sc = window.__scene3d.scene;
  ev.lagen = sc.children.filter((o) => o.visible).map((o) => (o.name || o.type) + ':' + (o.isMesh || o.isInstancedMesh ? 'mesh' : o.children.length));
  const fl = window.__scene3d.farLod; const flObj = fl && (fl.group || fl.root || fl.object || null);
  ev.farLod = fl ? Object.keys(fl).slice(0, 20) : null;
  if (flObj && flObj.isObject3D) { flObj.visible = false; await shot('b-detail-zonder-farlod', 1200); flObj.visible = true; }
  const named = sc.children.filter((o) => o.visible && /build|gebouw|facade|gevel|batch|lod/i.test(o.name || ''));
  ev.gebouwlagen = named.map((o) => o.name);
  for (const o of named.slice(0, 4)) { o.visible = false; await shot('b-detail-zonder-' + o.name.replace(/[^\w-]/g, '_'), 1000); o.visible = true; }
  // proef: de detaillaag (kozijnen, banden, lateien) uit, en daarna met een sterkere polygonOffset
  if (window.__shotsOnly && window.__shotsOnly.includes('917')) {
    const MB = await imp('models3d_buildings'); const dm = MB.detailMaterial; const was = [dm.polygonOffsetFactor, dm.polygonOffsetUnits];
    ev.detailMat = { po: was, side: dm.side, type: dm.type };
    dm.visible = false; dm.needsUpdate = true; await shot('b-detail-zonder-details', 1200); dm.visible = true;
    // alle materialen van de gebouwbundels: welke hebben polygonOffset (en welke kleur)
    const mats = new Set(); sc.traverse((o) => { if (o.material && /building/i.test((o.parent && o.parent.name) || o.name || '')) for (const m of [].concat(o.material)) mats.add(m); });
    ev.gebouwMats = [...mats].slice(0, 20).map((m) => m.type + (m.polygonOffset ? ' po' + m.polygonOffsetFactor + '/' + m.polygonOffsetUnits : '') + (m === dm ? ' DETAIL' : '') + (m.map ? ' map' : '') + (m.vertexColors ? ' vc' : ''));
  }
});

// #943 handen in de eerste persoon, leeg en met een knuppel en een pistool
await scene(943, async (ev) => {
  const FP = await imp('firstperson');
  await jump(...stad, 4000); FP.setFirstPerson(w, true);
  await shot('leeg', 2500);
  w.ammo = w.ammo || {}; w.ammo.knuppel = 1; w.ammo.pistol = 30;
  w.weapon = 'knuppel'; await shot('knuppel', 1800); ev.wapen1 = w.weapon;
  w.weapon = 'pistol'; await shot('pistool', 1800); ev.wapen2 = w.weapon;
  const c = window.__scene3d.cam; const names = []; c.traverse((o) => { if (o.isMesh && o.visible) names.push(o.name || o.type); }); ev.camKinderen = names.slice(0, 30);
  // de onderarm los en zes keer zo groot in de wereld, van opzij en van boven: zijn de mouwen heel?
  let arm = null; c.traverse((o) => { if (o.name === 'onderarm-right') arm = o; });
  if (arm) {
    const g = arm.geometry, P = g.attributes.position; let lang = 0, max = 0;
    for (let i = 0; i < P.count; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const d = Math.hypot(P.getX(i + a) - P.getX(i + b), P.getY(i + a) - P.getY(i + b), P.getZ(i + a) - P.getZ(i + b)); max = Math.max(max, d); if (d > 0.12) lang++; }
    g.computeBoundingBox(); const bb = g.boundingBox;
    ev.arm = { tris: P.count / 3, langeRanden: lang, langsteRand: +max.toFixed(3), maat: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((v) => +v.toFixed(3)) };
    FP.setFirstPerson(w, false);
    const [x, y] = stad; const z = gh(x, y) + 2;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.FrontSide }));
    m.scale.setScalar(6); m.position.set(x + 3, z, y + 3); m.name = 'bb-arm';
    window.__scene3d.scene.add(m);
    cam(x + 3 + 4, y + 3, z + 1, x + 3, y + 3, z, 50); await shot('arm-zij', 1500);
    cam(x + 3, y + 3 + 4, z + 1, x + 3, y + 3, z, 50); await shot('arm-voor', 1500);
    cam(x + 3 + 0.5, y + 3 + 0.5, z + 4, x + 3, y + 3, z, 50); await shot('arm-boven', 1500);
    window.__scene3d.scene.remove(m);
  }
});

// #1110 een carrièrewedstrijd: wat is de lege witte balk midden in beeld
await scene(1110, async (ev) => {
  const CL = await imp('voetbalcarrierelive'); const VB = await imp('voetbal');
  try { CL.createNew(w, 'tammo', 0); } catch (e) { ev.carriere = e.message; }
  ev.gestart = !!VB.launchCareerMatch(w);
  if (!ev.gestart) return;
  await sleep(8000); await shot('wedstrijd', 3000);
  // elementen die het midden van het scherm bedekken (ook lege)
  const cx = innerWidth / 2, cy = innerHeight / 2 - 120;
  ev.midden = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 200 && r.height > 10 && r.height < 120 && r.left < cx && r.right > cx && r.top < cy + 120 && r.bottom > cy - 120 && st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0.05; })
    .slice(0, 12).map((el) => ({ tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 80), tekst: (el.textContent || '').trim().slice(0, 40), r: (() => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); })() }));
  await sleep(4000); await shot('wedstrijd-later', 500);
});

// #1328 de M13-haven: de kade met kraan en containers van boven en vanaf de kade
await scene(1328, async (ev) => {
  const CP = await imp('containerplan');
  const c = CP.M13_CRANE, k = CP.M13_CONTAINER;
  await jump(c.x, c.y, 6000); const z = gh(c.x, c.y);
  try { const CT = await imp('containerterminal'); ev.terminal = !!CT.placeContainerTerminal(w, THREE); } catch (e) { ev.fout = 'terminal: ' + e.message; }
  await sleep(1200);
  cam(c.x + 60, c.y + 50, z + 40, (c.x + k.x) / 2, (c.y + k.y) / 2, z, 60); await shot('boven');
  cam(k.x - 30, k.y + 22, gh(k.x, k.y) + 3, k.x, k.y, gh(k.x, k.y) + 2, 60); await shot('kade');
  cam(c.x + 18, c.y - 16, z + 4, c.x, c.y, z + 4, 60); await shot('kraan');
});

clearInterval(skipper); clearInterval(houd);
return JSON.stringify(report);
