// Straatdetail (28-11, #1353): dezelfde ~12 plekken buiten het centrum, op ooghoogte en op 15 m, voor en na de detaillaag.
// De plekken worden uit de kaart gekozen (de dichtst bebouwde straat bij een vast punt), dus ze zijn gelijk voor en na.
//   node scripts/ui_shots.mjs --sizes=1600x900 --scenes=scripts/ui/straatdetail_scenes.js --out=<map in de worktree> --timeout=900
// Uitvoer: '[capture] w<nr>-<naam>-oog|lucht' en '[wereld] {...}' met plek, draw calls, driehoeken en gemiddelde frametijd.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (nr) => !ONLY.length || ONLY.includes(String(nr));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
// console.error: gewone console.log komt niet in het Electron-logboek (alleen [capture])
const log = (o) => console.error('[wereld] ' + JSON.stringify(o));

for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive() && !cine.isCinematicActive('wb-view')) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const S3 = await imp('scene3d'); const THREE = await import('/vendor/npm/three@0.160.0/build/three.module.js');
const { P } = await imp('worldframe'); const DN = await imp('daynight');
const stad = P(100, 77);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const deckZ = (x, y) => { try { return map.surfaceAt(x, y, { z: 60, ribbon: null }).z; } catch (e) { return gh(x, y); } };
const fix = (hour = 14) => { w.clock = hour; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
let curPose = null; let curNr = 0;
const camOff = () => { curPose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
const cam = (x, y, z, lx, ly, lz, fov = 60) => {
  curPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
  if (!cine.isCinematicActive()) cine.playCinematic({ id: 'wb-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: true, shot: () => curPose });
};
const shot = async (name, wait = 1800) => {
  await sleep(wait);
  // een ander filmpje (plaatskaart, ontdekking) kan het eigen beeld hebben vervangen: dan opnieuw zetten, anders is het beeld de volgcamera
  if (curPose && !cine.isCinematicActive('wb-view')) { log({ nr: curNr, beeld: name, opnieuw: true }); const q = curPose; curPose = null; cam(q.position.x, q.position.y, q.position.z, q.lookAt.x, q.lookAt.y, q.lookAt.z, q.fov); await sleep(900); }
  fix(); console.log('[capture] w' + curNr + '-' + name); await sleep(700); };
const jump = async (x, y, settle = 5000) => {
  camOff(); if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
  for (let i = 0; i < 400 && loading(); i++) await sleep(100);
  await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
};
// Sonde: een straal van de camera naar het kijkpunt; de eerste treffers met materiaal (welk vlak zie je daar echt?)
const matInfo = (m) => (m ? { type: m.type, name: m.name || '', color: m.color ? '#' + m.color.getHexString() : null, transparent: !!m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, side: m.side, map: !!m.map, vc: !!m.vertexColors, po: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null, emissive: m.emissive ? '#' + m.emissive.getHexString() : null } : null);
const probe = (tag, from, to, n = 4) => {
  try {
    const rc = new THREE.Raycaster(); rc.camera = S3.getCamera(); const o = new THREE.Vector3(from[0], from[2], from[1]); const t = new THREE.Vector3(to[0], to[2], to[1]);
    rc.set(o, t.clone().sub(o).normalize()); rc.far = 400;
    const hits = rc.intersectObjects(S3.getScene().children, true).filter((h) => h.object.visible !== false).slice(0, n);
    log({ nr: curNr, probe: tag, hits: hits.map((h) => ({ d: +h.distance.toFixed(2), name: h.object.name || '', parent: (h.object.parent && h.object.parent.name) || '', type: h.object.type, ro: h.object.renderOrder, nz: h.face ? +h.face.normal.y.toFixed(2) : null, mat: matInfo(Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material) })) });
  } catch (e) { log({ nr: curNr, probe: tag, fout: e.message }); }
};
const scene = async (nr, fn) => { if (!want(nr)) return; curNr = nr; console.error('[wereld] scene ' + nr); try { await fn(); } catch (e) { log({ nr, fout: e && e.message }); } camOff(); await sleep(400); };

const { wgsToWorld } = await imp('rdnew');
const PLEKKEN = [
  ['paddepoel', 'jaren-70-wijk', 53.2385, 6.5400],
  ['beijum', 'jaren-70-wijk', 53.2330, 6.6040],
  ['lewenborg', 'jaren-70-wijk', 53.2140, 6.6420],
  ['vinkhuizen', 'rijtjeshuizen', 53.2300, 6.5100],
  ['selwerd', 'flatstraat', 53.2445, 6.5455],
  ['usquert', 'dorpskern', 53.4020, 6.6070],
  ['warffum', 'dorpskern', 53.3955, 6.5590],
  ['winsum', 'dorpskern', 53.3335, 6.5190],
  ['ulrum', 'dorpsstraat-boerderijen', 53.3655, 6.3400],
  ['pieterburen', 'dijk', 53.3830, 6.4420],
  ['driebond', 'bedrijventerrein', 53.2210, 6.5920],
  ['bedum-n360', 'provinciale-weg', 53.2995, 6.6020],
];
const WEGTYPES = { 'bedrijventerrein': ['service', 'unclassified', 'tertiary', 'residential'], 'provinciale-weg': ['secondary', 'tertiary', 'primary'], 'dijk': ['unclassified', 'residential', 'tertiary', 'track', 'service'] };
const kiesPlek = (lat, lon, type) => {
  const [cx, cy] = wgsToWorld(lat, lon); let best = null;
  const ok = WEGTYPES[type] || ['residential', 'living_street', 'unclassified', 'tertiary'];
  for (const r of map.roadsNear(cx, cy, 320)) {
    if (!r.pts || r.pts.length < 2 || !ok.includes(r.type)) continue;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); if (L < 12) continue;
      const a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]);
      for (let t = 0.3; t < 0.8; t += 0.5) {
        const x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, y = P[i][1] + (P[i + 1][1] - P[i][1]) * t;
        const n = map.buildingsNear(x, y, 24).length; const score = Math.min(n, 16) - Math.hypot(x - cx, y - cy) / 90;
        if (!best || score > best.score) best = { x, y, a, n, score };
      }
    }
  }
  return best;
};
const meet = async () => {
  const R = S3.getRenderer(); await sleep(400);
  let t0 = performance.now(), n = 0; await new Promise((res) => { const f = () => { if (++n >= 90) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const ms = (performance.now() - t0) / n; await sleep(100);
  return { calls: R.info.render.calls, tris: R.info.render.triangles, geos: R.info.memory.geometries, ms: +ms.toFixed(1) };
};
let nr = 0;
for (const [naam, type, lat, lon] of PLEKKEN) {
  nr++;
  await scene(nr, async () => {
    const pl = kiesPlek(lat, lon, type); if (!pl) { log({ nr, naam, fout: 'geen plek' }); return; }
    await jump(pl.x, pl.y, 6000);
    const z = gh(pl.x, pl.y), dx = Math.cos(pl.a), dy = Math.sin(pl.a);
    log({ nr, naam, type, x: Math.round(pl.x), y: Math.round(pl.y), a: +pl.a.toFixed(3), huizen30: pl.n });
    cam(pl.x - dx * 10, pl.y - dy * 10, z + 1.7, pl.x + dx * 25, pl.y + dy * 25, z + 1.9, 70); await shot(naam + '-oog', 2500);
    const m1 = await meet();
    cam(pl.x - dx * 18 - dy * 14, pl.y - dy * 18 + dx * 14, z + 15, pl.x + dx * 4, pl.y + dy * 4, z, 62); await shot(naam + '-lucht', 2500);
    const m2 = await meet();
    log({ nr, naam, oog: m1, lucht: m2 });
  });
}
