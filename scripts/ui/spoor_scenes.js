// Beeldpunten voor #1339 (verhoogd spoor bij de Moesstraat) en #1346 (drempel bij Station Noord), voor en na een wijziging.
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

// ---- spoor 25-11: #1339 (viaduct bij de Moesstraat), #1346 (drempel bij Station Noord) ----
const V = [-732, -986];   // de Moesstraat kruist hier het verhoogde spoor (rail z 3,6)
const ZR = (x, y) => { try { return window.__railZ ? window.__railZ(x, y) : 0; } catch (e) { return 0; } };

await scene('viaduct', async (ev) => {
  await jump(V[0], V[1], 7000);
  const RW = await imp('railway');
  window.__railZ = RW.railZ;
  ev.railz = [[-798, -911], [-772, -941], [-732, -986], [-691, -1030], [-616, -1124]].map(([x, y]) => +RW.railZ(x, y).toFixed(2));
  ev.treinen = RW.getTrains().map((t) => ({ n: t.route.name, c: Math.round(t.c), v: +t.v.toFixed(1), staat: t.state }));
  cam(-711, -967, 3.2, -732, -986, 3.8, 55); await shot('onder-noordoost');
  cam(-752, -1006, 3.2, -732, -986, 3.8, 55); await shot('onder-zuidwest');
  cam(-640, -930, 75, -732, -990, 3, 60); await shot('lucht-van-oost');
  cam(-800, -1060, 75, -732, -986, 3, 60); await shot('lucht-van-zuidwest');
  cam(-776, -891, 3.5, -798, -911, 2.6, 55); await shot('deck-eind-van-opzij');
  cam(-690, -1050, 12, -798, -911, 2.0, 50); await shot('langs-het-spoor');
  cam(-606, -1128, 9, -732, -986, 3.6, 50); await shot('vanaf-noord-perron');
});

await scene('noord', async (ev) => {
  const N = [-600, -1140];
  await jump(N[0], N[1] - 8, 7000);
  const ZZ = [];
  for (let d = -40; d <= 40; d += 4) ZZ.push(+gh(N[0] + d * 0.8, N[1] + d * 0.6 - 8).toFixed(2));
  ev.maaiveld = ZZ;
  cam(-585, -1152, 1.5, -612, -1146, 0.6, 55); await shot('kastanjelaan-laag');
  cam(-600, -1166, 0.5, -609, -1146, 0.1, 40); await shot('kastanjelaan-vlak');
  cam(-600, -1135, 55, -607, -1146, 0, 55); await shot('boven');
  cam(-560, -1120, 6, -604, -1148, 3.5, 60); await shot('zijkant');
  { const hits = (px, py) => { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1)), window.__scene3d.cam); return ray.intersectObject(window.__scene3d.scene, true).filter((h) => h.object.visible).slice(0, 4).map((h) => { const b = new THREE.Box3().setFromObject(h.object); const ch = []; for (let q = h.object; q && ch.length < 5; q = q.parent) ch.push(q.name || q.type); return `${h.distance.toFixed(1)}m ${ch.join('<')} y${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} x${b.min.x.toFixed(0)}..${b.max.x.toFixed(0)} z${b.min.z.toFixed(0)}..${b.max.z.toFixed(0)} punt ${h.point.x.toFixed(1)},${h.point.y.toFixed(2)},${h.point.z.toFixed(1)}`; }); }; [[1000, 572], [300, 570], [1500, 575], [700, 585], [1000, 560]].forEach(([x, y]) => log({ drempelsonde: [x, y], hits: hits(x, y) })); }
  cam(-640, -1160, 2.0, -600, -1142, 4.5, 60); await shot('van-links');
});

// #1339/#1348: een trein die vertrekt uit Groningen Noord. De spelklok loopt 60 keer sneller dan de wereld; de trein mag daardoor nooit sneller rijden dan
// een echte trein. Een log van plek en snelheid per kwart seconde echte tijd, en drie beelden (staat, vertrekt, onderweg) met dezelfde camera.
await scene('trein', async (ev) => {
  const RW = await imp('railway');
  const route = RW.getRoutes().find((r) => r.stops.some((q) => q.name === 'Groningen Noord'));
  const stop = route.stops.find((q) => q.name === 'Groningen Noord');
  const [sx, sy] = RW.routePoint(route, stop.s);
  await jump(sx, sy - 6, 6000);
  const spoorDir = (() => { const a = RW.routePoint(route, stop.s - 10), b = RW.routePoint(route, stop.s + 10); const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
  clearInterval(houd);
  // zoek een tijdstip waarop een trein op Noord staat en over een paar spelseconden vertrekt
  let T0 = null;
  for (let h = 8; h < 14 && T0 === null; h += 0.0025) {
    w.clock = h; RW.planTreinDienst(w);
    const t = RW.getTrains().find((q) => q.state === 'dwell' && q.rit && Math.abs(q.c - stop.s) < 1 && q.timer > 20 && q.timer < 60);
    if (t) T0 = h + (t.timer - 2) / 3600;
  }
  ev.t0 = T0;
  if (T0 === null) return;
  const sh = [[1, 55], [1, 120]];
  const logv = [];
  w.clock = T0;
  const t0 = performance.now();
  let k = 0;
  const frames = [300, 1300, 2300];   // ms echte tijd
  while (performance.now() - t0 < 10000) {
    await sleep(250);
    const tr = RW.getTrains().find((q) => q.rit && Math.abs(q.c - stop.s) < 400 && q.route === route);
    logv.push({ ms: Math.round(performance.now() - t0), c: tr ? +tr.c.toFixed(1) : null, v: tr ? +tr.v.toFixed(1) : null, staat: tr ? tr.state : null, klok: +w.clock.toFixed(4) });
    if (k < frames.length && performance.now() - t0 > frames[k]) {
      cam(sx - spoorDir[1] * 22 - spoorDir[0] * 6, sy + spoorDir[0] * 22 - spoorDir[1] * 6, 9.5, sx + spoorDir[0] * 6, sy + spoorDir[1] * 6, 6.3, 60);
      ensureCam(); await sleep(150); klok = w.clock;
      console.log('[capture] btrein-' + (k + 1) + '-na-' + frames[k] + 'ms');
      await sleep(700); k++;
    }
  }
  for (let i = 0; i < logv.length; i += 10) log({ verloop: logv.slice(i, i + 10).map((l) => `${l.ms}ms c${l.c} v${l.v} ${l.staat}`) });
  let maxv = 0, maxgeo = 0;
  for (let i = 0; i < logv.length; i++) { if (logv[i].v > maxv) maxv = logv[i].v; if (i && logv[i].c !== null && logv[i - 1].c !== null) maxgeo = Math.max(maxgeo, Math.abs(logv[i].c - logv[i - 1].c) / 0.25); }
  ev.maxV = maxv; ev.maxGeoMs = +maxgeo.toFixed(1);
});

// #1345: het vertrekbord vervaagt zodra de speler loopt en is kleiner (drie treinen); staat de speler stil, dan komt het terug.
await scene('bord', async (ev) => {
  const RW = await imp('railway');
  const route = RW.getRoutes().find((r) => r.stops.some((q) => q.name === 'Groningen Noord'));
  const stop = route.stops.find((q) => q.name === 'Groningen Noord');
  const [sx, sy] = RW.routePoint(route, stop.s);
  await jump(sx, sy - 6, 6000);
  cam(sx + 3, sy - 14, 8.5, sx, sy - 6, 6.6, 60);
  ensureCam();
  await shot('stil', 2500);
  const bord = () => document.querySelector('#hud .mg-board[data-mg="station"]');
  ev.stil = { zichtbaar: !!bord() && !bord().hidden, vervaagd: !!bord() && bord().classList.contains('stl-vervaag'), rijen: bord() ? bord().querySelectorAll('.stl-row').length : 0 };
  let nx = p.x, ny = p.y;
  const lopen = setInterval(() => { nx += 0.2; p.x = nx; p.y = ny; p.vx = 4; }, 50);   // 4 m/s
  await sleep(1500);
  ev.loopt = { zichtbaar: !!bord() && !bord().hidden, vervaagd: !!bord() && bord().classList.contains('stl-vervaag'), opacity: bord() ? getComputedStyle(bord()).opacity : null };
  await shot('loopt', 200);
  await sleep(1200);
  ev.loopt2 = { zichtbaar: !!bord() && !bord().hidden };
  clearInterval(lopen); p.vx = 0;
  await sleep(1800);
  ev.terug = { zichtbaar: !!bord() && !bord().hidden, vervaagd: !!bord() && bord().classList.contains('stl-vervaag') };
  await shot('weer-stil', 300);
});

// Ambient treinen (#1339): echte treinen op wereldtijd. Zoek de spelklok waarop een trein met kruissnelheid langs een punt rijdt (het viaduct bij de Moesstraat)
// of op Noord staat, zet de klok daar en neem beelden en een log (plek en snelheid per kwart seconde echte tijd).
await scene('ambient', async (ev) => {
  const RW = await imp('railway'); const AT = await imp('ambienttrains');
  const route = RW.getRoutes().find((r) => r.name === 'Stoptrein Roodeschool');
  const plan = AT.ambientPlan(route, route.name);
  const dichtbij = (px, py) => { let best = { d: 1e9, s: 0 }; for (let q = 0; q < route.len; q += 2) { const [x, y] = RW.routePoint(route, q); const d = Math.hypot(x - px, y - py); if (d < best.d) best = { d, s: q }; } return best; };
  const zoek = (sPunt, wil) => { for (let R = 0; R < 1440; R += 0.5) for (const tr of plan.treinen) { const st = AT.ambientStand(plan, tr, R); if (wil(st) && Math.abs(st.s - sPunt) < 20) return { R, st }; } return null; };
  clearInterval(houd);
  // 1: open spoor, op het viaduct bij de Moesstraat, een trein die aankomt rijden
  const vp = dichtbij(-732, -986); ev.moesstraatS = vp.s;
  const eersteVan = zoek(vp.s - 70, (st) => st.state === 'run' && st.v > 20 && st.dir === 1) || zoek(vp.s + 70, (st) => st.state === 'run' && st.v > 20 && st.dir === -1);
  ev.open = eersteVan && { R: eersteVan.R, v: +eersteVan.st.v.toFixed(1), dir: eersteVan.st.dir };
  if (eersteVan) {
    await jump(-732, -986, 6000); clearInterval(houd);
    w.clock = eersteVan.R / 60; const t0 = performance.now(); const logv = [];
    cam(-711, -967, 3.4, -732, -986, 4.2, 70); ensureCam();
    for (let k = 0; k < 5; k++) {
      await sleep(350); klok = w.clock; ensureCam();
      const tr = RW.getTrains().filter((q) => q.ambient && q.route === route).sort((a, b) => Math.abs(a.c - vp.s) - Math.abs(b.c - vp.s))[0];
      logv.push(`${Math.round(performance.now() - t0)}ms ${tr ? 'c' + tr.c.toFixed(0) + ' v' + tr.v.toFixed(1) + ' ' + tr.state : 'geen'}`);
      console.log('[capture] bambient-open-' + (k + 1));
      await sleep(150);
    }
    log({ openlog: logv });
  }
  // 2: op Noord: een trein die er staat
  const np = route.stops.find((q) => q.name === 'Groningen Noord');
  if (ONLY.includes('ambientopen')) return;
  const opNoord = zoek(np.s, (st) => st.state === 'dwell' && st.timer > 15);
  ev.noord = opNoord && { R: opNoord.R, timer: +opNoord.st.timer.toFixed(1) };
  if (opNoord) {
    const [nx, ny] = RW.routePoint(route, np.s);
    await jump(nx, ny - 6, 6000); clearInterval(houd);
    w.clock = opNoord.R / 60; klok = w.clock;
    cam(nx + 3, ny - 14, 8.5, nx, ny - 6, 6.6, 60); ensureCam(); await sleep(1500);
    const tr = RW.getTrains().find((q) => q.ambient && q.state === 'dwell');
    ev.noordTrein = tr ? { c: +tr.c.toFixed(1), state: tr.state, timer: +tr.timer.toFixed(1) } : null;
    console.log('[capture] bambient-noord');
    await sleep(800);
  }
});

clearInterval(skipper); clearInterval(houd);
return JSON.stringify(report);
