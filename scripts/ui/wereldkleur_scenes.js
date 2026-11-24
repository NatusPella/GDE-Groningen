// Beeldpunten voor wereldkleur-24-11 (#1333 etalages en bomen, #1328 haven, #917 lijstband). Zelfde punten voor en na:
//   node .scr/run.mjs --scenes=scripts/ui/wereldkleur_scenes.js --only=etalage,bomen,1328,917 --out=<map> --game=<stage>
// Opbouw en helpers uit scripts/ui/beeldbugs_scenes.js; gpuPick wijst per pixel de mesh en materiaalgroep aan.
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

// GPU-sonde: welke mesh (en welke materiaalgroep) tekent een pixel. Elke zichtbare mesh krijgt tijdelijk een effen kleur met zijn
// eigen id, met dezelfde zijde, dieptetest en polygonOffset als zijn materiaal; een beeld in een rendertarget, pixels terug.
// Raycasts raken de gebundelde gebouwen niet (beeldbugs 24-11), dit wel. Let op: een vertexverschuiving in een shaderpatch
// (onBeforeCompile) doet de sonde niet na.
const gpuPick = (pts) => {
  const S3 = window.__scene3d, R = S3.renderer, sc = S3.scene, c = S3.cam;
  const W = R.domElement.width, H = R.domElement.height, sx = W / innerWidth, sy = H / innerHeight;
  const rt = new THREE.WebGLRenderTarget(W, H);
  const ids = [], swapped = [];
  const mk = (m, id, gi) => new THREE.MeshBasicMaterial({ color: new THREE.Color((id & 255) / 255, ((id >> 8) & 255) / 255, (gi + 1) / 255), side: m ? m.side : THREE.FrontSide,
    polygonOffset: !!(m && m.polygonOffset), polygonOffsetFactor: m ? m.polygonOffsetFactor : 0, polygonOffsetUnits: m ? m.polygonOffsetUnits : 0, depthTest: m ? m.depthTest : true,
    depthWrite: m ? m.depthWrite : true, visible: m ? m.visible !== false : true, fog: false, toneMapped: false });
  sc.traverse((o) => {
    if (!(o.isMesh) || !o.visible) return;
    const id = ids.length + 1; ids.push(o); swapped.push([o, o.material]);
    o.material = Array.isArray(o.material) ? o.material.map((m, i) => mk(m, id, i)) : mk(o.material, id, 0);
  });
  const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null;
  // in het canvas zelf en meteen teruglezen (voor de browser het beeld toont); een eigen rendertarget gaf alleen nullen terug
  const cc = new THREE.Color(); R.getClearColor(cc); const ca = R.getClearAlpha(), ac = R.autoClear, tm = R.toneMapping, oc = R.outputColorSpace;
  R.toneMapping = THREE.NoToneMapping; R.outputColorSpace = THREE.LinearSRGBColorSpace;
  R.setRenderTarget(null); R.setClearColor(0x000000, 1); R.autoClear = true; R.render(sc, c);
  const gl = R.getContext(), buf = new Uint8Array(4), out = [];
  for (const [px, py] of pts) {
    gl.readPixels(Math.round(px * sx), Math.round(H - 1 - py * sy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const id = buf[0] + buf[1] * 256, gi = buf[2] - 1, o = ids[id - 1];
    out.push({ px, py, id, gi, o });
  }
  R.setClearColor(cc, ca); R.autoClear = ac; R.toneMapping = tm; R.outputColorSpace = oc; sc.background = bg; sc.fog = fog;
  for (const [o, m] of swapped) { const cur = o.material; o.material = m; for (const x of [].concat(cur)) x.dispose(); }
  rt.dispose();
  return out;
};
const meshInfo = (o, gi = 0) => {
  if (!o) return null;
  const chain = []; for (let q = o; q && chain.length < 5; q = q.parent) chain.push(q.name || q.type);
  const m = Array.isArray(o.material) ? o.material[gi] : o.material;
  return { chain: chain.join('<'), gi, mt: m && m.type, kleur: m && m.color && m.color.getHexString(), po: m && m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null,
    side: m && m.side, groups: o.geometry && o.geometry.groups && o.geometry.groups.length, nv: o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count,
    ud: Object.keys(o.userData || {}).slice(0, 8).join(','), ro: o.renderOrder, mat: m && m.name, obc: !!(m && m.onBeforeCompile && m.onBeforeCompile.toString().length > 30) };
};
// een kolom of rij pixels: elke wissel van mesh of groep (zo zie je welke twee vlakken om dezelfde pixels vechten)
const strip = (x0, y0, x1, y1, n = 120) => {
  const pts = []; for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  const res = gpuPick(pts), seen = new Map(), seq = [];
  for (const r of res) { const k = r.id + ':' + r.gi; if (!seen.has(k)) seen.set(k, { n: 0, info: meshInfo(r.o, r.gi) }); seen.get(k).n++; if (!seq.length || seq[seq.length - 1] !== k) seq.push(k); }
  return { wissels: seq.length - 1, volgorde: seq.slice(0, 40).join(' '), meshes: Object.fromEntries([...seen].map(([k, v]) => [k, { n: v.n, ...v.info }])) };
};

// #1333a etalages: een proefwand met de dertien winkelsoorten (het echte glasmateriaal en de echte ruitcodering) hoog boven de stad,
// en een rij fietsenwinkels met een andere seed per pand; daarna echte puien in de Binnenstad
await scene('etalage', async (ev) => {
  await jump(...stad, 4000); const [x, y] = stad; const z0 = gh(x, y) + 45;
  const IG = await imp('interiorglass'); const WK = await imp('winkelkit');
  const pane = (grp, type, seed, cx, cy, w = 2.4, h = 2.1, bay = 0) => {
    const uv = IG.paneUV(WK.rankForType(type, seed), IG.PANE_SHOP, w, h, 1, 0, 0, 1, bay);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(12).fill(0.5), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // lodC (0, 0): het glas draagt de gebouwvervaging (buildingfade.js); zonder dit attribuut leest de shader een willekeurige waarde en dithert de ruit weg
    g.setAttribute('lodC', new THREE.Float32BufferAttribute(new Array(8).fill(0), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, IG.glassMaterial); m.position.set(x + cx, z0 + cy, y); grp.add(m);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.24, h + 0.24), new THREE.MeshBasicMaterial({ color: 0x2b2b2b }));
    fr.position.set(x + cx, z0 + cy + h / 2, y - 0.01); grp.add(fr);
  };
  const kinds = WK.SHOP_KINDS;
  // shaderfouten zichtbaar maken: three controleert ze alleen met debug.checkShaderErrors, en meldt ze via console.error
  const R0 = window.__scene3d.renderer; const wasCheck = R0.debug.checkShaderErrors; R0.debug.checkShaderErrors = true;
  const ce = console.error, fouten = []; console.error = (...a) => { fouten.push(a.map(String).join(' ').slice(0, 2500)); ce.apply(console, a); };
  const g1 = new THREE.Group(); g1.name = 'wk-proefwand';
  kinds.forEach((k, i) => pane(g1, k, 11 + i, (i % 7 - 3) * 2.75, i < 7 ? 2.4 : 0));
  window.__scene3d.scene.add(g1);
  ev.soorten = kinds.map((k, i) => (i < 7 ? 'boven ' : 'onder ') + (i % 7 + 1) + ' ' + k).join(', ');
  cam(x, y + 10.5, z0 + 2.3, x, y, z0 + 2.2, 60); await shot('proefwand', 2500);
  // een glasshader die niet compileert tekent niets: zet de foutmelding van three in het rapport
  ev.shaderfouten = (window.__scene3d.renderer.info.programs || []).filter((pr) => pr.diagnostics && !pr.diagnostics.runnable).map((pr) => (pr.name || '') + ': ' + String(pr.diagnostics.fragmentShader.log || pr.diagnostics.programLog || '').slice(0, 1500));
  console.error = ce; R0.debug.checkShaderErrors = wasCheck;
  ev.consolefouten = fouten.filter((f) => !/^\[bb\]/.test(f)).slice(0, 4);
  log({ shaderfouten: ev.shaderfouten, consolefouten: ev.consolefouten });

  cam(x - 5.5, y + 4.2, z0 + 3.2, x - 5.5, y, z0 + 3.4, 60); await shot('proefwand-links', 1800);
  cam(x + 5.5, y + 4.2, z0 + 1.0, x + 5.5, y, z0 + 1.1, 60); await shot('proefwand-rechts', 1800);
  window.__scene3d.scene.remove(g1);
  // onder: zeven fietsenwinkels, elk pand een eigen seed en plek; boven: zeven andere soorten met een andere seed
  const g2 = new THREE.Group(); g2.name = 'wk-perpand';
  for (let i = 0; i < 7; i++) pane(g2, 'fietsen', 101 + i * 7, (i - 3) * 2.75, 0, 2.4, 2.1, i);
  for (let i = 0; i < 7; i++) pane(g2, kinds[(i * 5) % kinds.length], 301 + i * 3, (i - 3) * 2.75, 2.4, 2.4, 2.1, i);
  window.__scene3d.scene.add(g2);
  cam(x, y + 10.5, z0 + 2.3, x, y, z0 + 2.2, 60); await shot('per-pand', 2500);
  cam(x - 0.5, y + 3.2, z0 + 1.2, x - 1.2, y, z0 + 1.1, 60); await shot('fiets-dichtbij', 1800);
  window.__scene3d.scene.remove(g2);
  // echte puien: de Binnenstad bij het startpunt in vier richtingen op ooghoogte, en de eerste persoon zoals na-b943-pistool
  const zs = gh(x, y) + 1.6;
  for (const a of [0, 1, 2, 3]) { const h = a * Math.PI / 2 + 0.4; cam(x, y, zs, x + Math.cos(h) * 10, y + Math.sin(h) * 10, zs, 70); await shot('binnenstad-' + a, 1500); }
  const FP = await imp('firstperson'); camOff(); FP.setFirstPerson(w, true); await shot('binnenstad-fp', 2500); FP.setFirstPerson(w, false);
});

// diagnose: waarom tekent het losse glasmateriaal (buiten de pool) zwart? Een verse kloon met een eigen programmasleutel onder
// checkShaderErrors, naast het gewone materiaal; alle glasprogramma's met hun status.
await scene('glasdebug', async (ev) => {
  await jump(...stad, 3000); const [x, y] = stad; const z0 = gh(x, y) + 45;
  const IG = await imp('interiorglass'); const WK = await imp('winkelkit');
  const R0 = window.__scene3d.renderer; R0.debug.checkShaderErrors = true;
  const ce = console.error, cw = console.warn, fouten = []; console.error = (...a) => { fouten.push(a.map(String).join(' ').slice(0, 3000)); ce.apply(console, a); }; console.warn = (...a) => { fouten.push('W ' + a.map(String).join(' ').slice(0, 3000)); cw.apply(console, a); };
  const kloon = IG.glassMaterial.clone(); kloon.onBeforeCompile = IG.glassMaterial.onBeforeCompile; kloon.customProgramCacheKey = () => 'glass-debug-' + Date.now();
  const g = new THREE.Group();
  const mk = (mat, cx, type) => {
    const uv = IG.paneUV(WK.rankForType(type, 5), IG.PANE_SHOP, 2.4, 2.1, 1, 0, 0, 1, 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1.2, 0, 0, 1.2, 0, 0, 1.2, 2.1, 0, -1.2, 2.1, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(12).fill(0.5), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('lodC', new THREE.Float32BufferAttribute(new Array(8).fill(0), 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(geo, mat); m.position.set(x + cx, z0, y); g.add(m);
  };
  mk(kloon, -1.4, 'fietsen'); mk(IG.glassMaterial, 1.4, 'fietsen');
  window.__scene3d.scene.add(g);
  cam(x, y + 6, z0 + 1.1, x, y, z0 + 1.0, 60); await shot('kloon-links-gewoon-rechts', 3000);
  const gm = IG.glassMaterial, pr = R0.properties.get(gm);
  ev.glas = { visible: gm.visible, transparent: gm.transparent, opacity: gm.opacity, side: gm.side, ud: Object.keys(gm.userData || {}).join(','), edge: gm.userData.edgeFade ? gm.userData.edgeFade.value.toArray() : null,
    programma: !!(pr && pr.currentProgram), versie: gm.version, sleutel: gm.customProgramCacheKey ? String(gm.customProgramCacheKey()).slice(0, 80) : null };
  if (gm.userData.edgeFade) { const was = gm.userData.edgeFade.value.clone(); gm.userData.edgeFade.value.set(1e9, 1e9 + 1); await shot('zonder-randvervaging', 1500); gm.userData.edgeFade.value.copy(was); }
  console.error = ce; console.warn = cw;
  ev.fouten = fouten.filter((f) => !/\[bb\]|\[capture\]/.test(f)).slice(0, 4);
  ev.programmas = (R0.info.programs || []).filter((pr) => /glass/.test(pr.cacheKey || '')).map((pr) => ({ key: String(pr.cacheKey).slice(0, 60), naam: pr.name, ok: pr.diagnostics ? pr.diagnostics.runnable : 'onbekend', log: pr.diagnostics ? String(pr.diagnostics.fragmentShader.log || pr.diagnostics.programLog).slice(0, 1500) : '' }));
  window.__scene3d.scene.remove(g);
});

// #1333b bomen aan de Vismarkt: geen roze bloesem meer (constitutie 3), zomerse soorten met variatie in groen
await scene('bomen', async (ev) => {
  klok = 11; const vm = landmark('vismarkt') || stad; await jump(vm[0], vm[1], 7000);
  const z = gh(vm[0], vm[1]);
  for (const a of [0, 1, 2, 3]) { const h = a * Math.PI / 2; cam(vm[0] - Math.cos(h) * 6, vm[1] - Math.sin(h) * 6, z + 2.4, vm[0] + Math.cos(h) * 20, vm[1] + Math.sin(h) * 20, z + 4, 60); await shot('vismarkt-' + a, 1500); }
  cam(vm[0] + 30, vm[1] + 30, z + 28, vm[0], vm[1], z, 55); await shot('vismarkt-boven', 1800);
  const GR = await imp('greenery'); const col = new THREE.Color();
  const trees = []; const tw = map.treesNear ? map.treesNear(vm[0], vm[1], 150) : (map.trees || []);
  for (const t of tw) if (Math.hypot(t[0] - vm[0], t[1] - vm[1]) < 150) trees.push(t);
  let roze = 0; const soorten = {};
  for (const t of trees) { GR.treeColor(t, col); if (col.r > col.g * 1.1) roze++; const d = GR.treeDims(t); const id = GR.SPECIES[d.sp].id; soorten[id] = (soorten[id] || 0) + 1; }
  ev.bomen = { n: trees.length, roze, soorten, bron: map.trees ? 'map.trees' : 'geen map.trees' };
});

// #1328 de M13-haven: zelfde camera's als beeldbugs, plus de containers van dichtbij en het grote gebouw rechts
await scene(1328, async (ev) => {
  const CP = await imp('containerplan');
  const c = CP.M13_CRANE, k = CP.M13_CONTAINER;
  await jump(c.x, c.y, 6000); const z = gh(c.x, c.y);
  try { const CT = await imp('containerterminal'); ev.terminal = !!CT.placeContainerTerminal(w, THREE); } catch (e) { ev.fout = 'terminal: ' + e.message; }
  await sleep(1200);
  cam(c.x + 60, c.y + 50, z + 40, (c.x + k.x) / 2, (c.y + k.y) / 2, z, 60); await shot('boven');
  const zk = gh(k.x, k.y);
  cam(k.x - 30, k.y + 22, zk + 3, k.x, k.y, zk + 2, 60); await shot('kade');
  ev.kadeRechts = strip(1500, 440, 1880, 440, 40);
  cam(c.x + 18, c.y - 16, z + 4, c.x, c.y, z + 4, 60); await shot('kraan');
  cam(k.x - 16, k.y + 4, zk + 1.7, k.x - 6, k.y - 9, zk + 1.6, 60); await shot('containers-dichtbij');
  cam(k.x + 2, k.y + 12, zk + 1.7, k.x + 12, k.y - 9, zk + 1.8, 60); await shot('containers-oost');
  ev.gebouwen = (map.buildingsNear ? map.buildingsNear(k.x, k.y, 200) : []).slice(0, 14).map((b) => {
    const p0 = b.pts ? b.pts.reduce((a, q) => [a[0] + q[0] / b.pts.length, a[1] + q[1] / b.pts.length], [0, 0]) : [b.x, b.y];
    return { c: p0.map((v) => Math.round(v || 0)), keys: Object.keys(b).slice(0, 16).join(','), type: b.type || b.t || b.kind, h: b.h || b.height, lv: b.levels || b.lv };
  });
});

// #917 z-fighting op een rode gevel in het centrum (zelfde camera als beeldbugs b en b-detail), plus een telelens op de lijst
// en de GPU-sonde langs kolommen door de crème banden
await scene(917, async (ev) => {
  await jump(...stad, 5000); const [x, y] = stad; const z = gh(x, y);
  cam(x + 8, y + 8, z + 4, x, y, z + 4, 70); await shot('b', 2200);
  cam(x + 8, y + 8, z + 4, x - 6, y + 4, z + 6, 45); await shot('b-detail', 2000);
  ev.kolommen = [700, 950, 1150].map((px) => ({ px, ...strip(px, 200, px, 480, 140) }));
  ev.rij = strip(560, 340, 1220, 340, 160);
  cam(x + 8, y + 8, z + 4, x - 6, y + 4, z + 6, 15); await shot('b-tele', 2000);
  ev.teleKolom = strip(960, 100, 960, 980, 220);
  cam(x + 30, y + 30, z + 6, x - 6, y + 4, z + 6, 12); await shot('b-tele-30m', 2000);
});

// #917 diagnose: dezelfde telelens met elke mesh in een effen kleur per materiaalgroep (groep 0 rood, 1 blauw, 2 groen, 3 geel,
// 4 magenta, 5 cyaan; de helderheid verschilt per mesh), met de zijde en polygonOffset van het eigen materiaal. Twee kleuren in
// driehoeken door elkaar = de twee vlakken die vechten. Plus de meshes rond het doelpunt met hun groepen en materialen.
await scene('917kleur', async (ev) => {
  await jump(...stad, 5000); const [x, y] = stad; const z = gh(x, y);
  cam(x + 8, y + 8, z + 4, x - 6, y + 4, z + 6, 15); await shot('b-tele-gewoon', 2000);
  const sc = window.__scene3d.scene, doel = new THREE.Vector3(x - 6, z + 6, y + 4), sph = new THREE.Sphere();
  const PAL = [0xff2020, 0x2040ff, 0x20c020, 0xffe020, 0xff20ff, 0x20e0e0];
  const swapped = [], rond = [];
  let id = 0;
  sc.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    id++;
    const v = 0.45 + 0.55 * ((id * 0.618) % 1);
    const mk = (m, gi) => new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL[gi % 6]).multiplyScalar(v), side: m ? m.side : THREE.FrontSide, polygonOffset: !!(m && m.polygonOffset),
      polygonOffsetFactor: m ? m.polygonOffsetFactor : 0, polygonOffsetUnits: m ? m.polygonOffsetUnits : 0, depthWrite: m ? m.depthWrite : true, visible: m ? m.visible !== false : true, fog: false });
    if (o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (sph.distanceToPoint(doel) < 3 && sph.radius < 400) rond.push({ id, v: +v.toFixed(2), ...meshInfo(o, 0), mats: [].concat(o.material).map((m) => m.type + (m.name ? ':' + m.name : '') + (m.polygonOffset ? ' po' + m.polygonOffsetFactor + '/' + m.polygonOffsetUnits : '') + ' side' + m.side + (m.onBeforeCompile && m.onBeforeCompile.toString().length > 30 ? ' obc' : '')).join(' | '), groepen: (o.geometry.groups || []).map((g) => g.materialIndex + ':' + g.count).join(',') });
    }
    swapped.push([o, o.material]);
    o.material = Array.isArray(o.material) ? o.material.map((m, i) => mk(m, i)) : mk(o.material, 0);
  });
  ev.rond = rond.slice(0, 30);
  await shot('b-tele-kleur', 2000);
  cam(x + 8, y + 8, z + 4, x - 6, y + 4, z + 6, 45); await shot('b-detail-kleur', 1500);
  for (const [o, m] of swapped) { const cur = o.material; o.material = m; for (const q of [].concat(cur)) q.dispose(); }
});

clearInterval(skipper); clearInterval(houd);
return JSON.stringify(report);
