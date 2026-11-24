// Page half of scripts/qa/akte1_sets_beeld.mjs (desktop --perf-script body; akte 1 op eindniveau, 23-11): de keuken van de opening en de
// flat van Tammo en Tessa in de echte wereld. De keuken staat zoals in de opening hoog boven de straat (introkitchen3d.js, met de
// geleende setlampen); de flat wordt op zijn echte plek in de toren gebouwd (home.js getHome().flat, home3d.js buildFlat3D).
// Per standpunt één beeld, op een ochtend (7,4) en een avond (21,5). window.__as = { settle, klokken }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__as || {};
const cine = await imp('cinematics');
const DN = await imp('daynight');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let klok = 7.4;
const fix = () => {
  w.clock = klok;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let done = false, cur = null;
const tick = () => { fix(); if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.near = 0.05; if (cur.fov) c.fov = cur.fov; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
const keep = [S3.renderer.domElement];
for (const el of document.querySelectorAll('body *')) {
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || keep.some((k) => el.contains(k) || k.contains(el))) continue;
  if (el.parentElement && (el.parentElement === document.body || keep.some((k) => el.parentElement.contains(k)))) el.style.display = 'none';
}
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
w.cinematicHidePlayers = true;
const fps = async (ms = 1500) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const shot = async (naam, c) => { cur = c; await sleep(CFG.settle || 2500); console.log('[capture] ' + naam); await sleep(500); };
const out = { fps0: await fps(), shots: [] };

// 1. de keuken, hoog boven de speler (zoals de opening hem neerzet)
const K = await imp('introkitchen3d');
const p = w.player;
for (const kl of CFG.klokken || [7.4, 21.5]) {
  klok = kl;
  const ax = p.x + 30, ay = p.y + 30, az = 60;
  const kit = K.buildKitchen(ax, ay, az);
  S3.scene.add(kit.group);
  for (const c of kit.tableCups) c.visible = true;
  const at = (u, v, h) => ({ x: ax + u, y: ay + v, z: az + h });
  const views = [
    ['keuken-breed', at(0.75, 1.5, 1.62), at(-1.2, -0.9, 1.0), 64],
    ['keuken-schouder', at(1.55, 0.55, 1.3), at(-0.82, -0.05, 1.05), 45],
    ['keuken-aanrecht', at(-0.4, 1.5, 1.55), at(0.4, -1.6, 0.95), 58],
    ['keuken-deur', at(-1.7, -0.9, 1.55), at(1.3, 1.75, 1.1), 55],
  ];
  for (const [naam, pos, look, fov] of views) { await shot(`${naam}-${kl}`, { position: pos, lookAt: look, fov }); out.shots.push(`${naam}-${kl}`); }
  out.keuken = { fps: await fps(800), lampen: kit.group.children.filter((c) => c.isLight).length };
  kit.dispose();
}

// 2. de flat op zijn plek in de toren (de cutaway: wanden tot heuphoogte, de camera erboven zoals de volgcamera)
const H = await imp('home'), H3 = await imp('home3d'), SC = await imp('scene3d');
const home = H.getHome && H.getHome();
if (home && home.flat) {
  const f = home.flat;
  const mesh = H3.buildFlat3D(f);
  H3.setFlatFacade(mesh, 1);
  S3.scene.add(mesh);
  // de toren boven de flat weg, zoals home.js doet als je boven bent; en de onderkant van de toren zoals de cutaway hem toont
  if (home.towerBuilding && SC.setBuildingHidden) SC.setBuildingHidden(home.towerBuilding, true);
  const lower = home.towerBuilding && H3.buildLowerTower3D ? H3.buildLowerTower3D(home.towerBuilding, 10) : null;
  if (lower) S3.scene.add(lower);
  w.player.x = f.fl(5.5, 4)[0]; w.player.y = f.fl(5.5, 4)[1];
  const P = (x, z, h) => { const [wx, wy] = f.fl(x, z); return { x: wx, y: wy, z: f.floorY + h }; };
  for (const kl of CFG.klokken || [7.4, 21.5]) {
    klok = kl;
    const views = [
      ['flat-overzicht', P(5.5, -5.0, 11), P(5.5, 4.6, 0), 55],
      ['flat-woonkamer', P(6.3, -0.2, 3.4), P(2.8, 3.6, 0.5), 60],
      ['flat-keuken', P(5.6, 4.6, 3.4), P(9.6, 1.2, 0.6), 60],
      ['flat-slaapkamers', P(7.2, 4.2, 4.6), P(7.2, 8.0, 0.4), 62],
    ];
    for (const [naam, pos, look, fov] of views) { await shot(`${naam}-${kl}`, { position: pos, lookAt: look, fov }); out.shots.push(`${naam}-${kl}`); }
  }
  out.flat = { fps: await fps(800) };
  S3.scene.remove(mesh);
  if (lower) S3.scene.remove(lower);
} else out.flat = { fout: 'geen huis (getHome)' };
clearInterval(skipper); done = true; cur = null;
return JSON.stringify(out);
