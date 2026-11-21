// Wereld in beeld voor de beeldronde 21-11 (page-script voor scripts/qa/menufoto.mjs --page=beeldronde_wereld.page.js).
// window.__mf.sets: station, brug, sloot, bord, eerste, fiets, vaar, lucht, kleur. Elke set draait in een eigen try; alle plekken
// worden tijdens de run uit de wereld zelf gezocht (plaatsen, landmarks, wegen met brug, waterpolygonen, props). Raakt alleen het wegwerpprofiel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__mf || { size: '1920x1080', sets: [] };
const SIZE = CFG.size; const BR = SIZE.split('x')[0];
const wil = (s) => CFG.sets.includes(s);
const fouten = []; const noteer = (soort, m) => { if (fouten.length < 80) fouten.push(soort + ': ' + String(m).slice(0, 300)); };
window.addEventListener('error', (e) => noteer('onerror', (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => noteer('promise', e.reason && (e.reason.stack || e.reason.message || e.reason)));
const ce = console.error.bind(console); console.error = (...a) => { noteer('console.error', a.map(String).join(' ')); ce(...a); };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const done = []; const notities = {};
for (let i = 0; i < 240 && !(document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  await sleep(1000);
}
await sleep(2500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const DN = await imp('daynight'); const VEH = await imp('vehicle'); const UT = await imp('util'); const SC = await imp('scene3d');
const { P } = await imp('worldframe');
const skipper = setInterval(() => { for (let i = 0; i < 10 && cine.isCinematicActive(); i++) cine.skipCinematic(); }, 150);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
if (w.paused) { tap(' ', 'Space'); await sleep(600); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const vast = () => { w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
vast(); setInterval(vast, 800);
const gh = (x, y) => { try { return map.groundHeightAt(x, y, 0) || 0; } catch (e) { return 0; } };
const cap = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name + '-' + BR); await sleep(800); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT'); noteer(naam, e && (e.stack || e.message)); } w.cameraOverride = null; };
const teleport = async (x, y, ms = 7000) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(x, y);
  for (let i = 0; i < 40 && !document.getElementById('load-screen'); i++) await sleep(100);
  for (let i = 0; i < 300 && document.getElementById('load-screen'); i++) await sleep(100);
  await sleep(ms);
  let n = 0; while (SC.streamPending && SC.streamPending().roads > 0 && n++ < 40) await sleep(500);
};
const cam = (x, y, z, lx, ly, lz, fov = 60) => { w.cameraOverride = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true }; };
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const plaats = (n) => index.places.find((x) => x.name === n);
const lms = map.meta.landmarks || [];
notities.landmarksStation = lms.filter((l) => /station/i.test(l.name || '')).slice(0, 12).map((l) => l.name + '@' + Math.round(l.x) + ',' + Math.round(l.y));

// ---- station Veendam ----
if (wil('station')) await probeer('station', async () => {
  const v = plaats('Veendam'); if (!v) throw new Error('Veendam ontbreekt');
  const dist = (l) => Math.hypot(l.x - v.x, l.y - v.y);
  const st = lms.filter((l) => /station/i.test(l.name || '')).sort((a, b) => dist(a) - dist(b))[0];
  notities.veendam = { plaats: [Math.round(v.x), Math.round(v.y)], station: st ? [st.name, Math.round(st.x), Math.round(st.y), Math.round(dist(st))] : null };
  const t = st && dist(st) < 3000 ? st : v;
  await teleport(t.x, t.y, 9000);
  const z = gh(t.x, t.y);
  cam(t.x + 50, t.y - 50, z + 14, t.x, t.y, z + 4, 55); await cap('w1-station-veendam-schuin');
  cam(t.x + 22, t.y - 22, z + 4, t.x, t.y, z + 4, 65); await cap('w2-station-veendam-dichtbij');
  cam(t.x - 40, t.y + 40, z + 22, t.x, t.y, z, 60); await cap('w3-station-veendam-hoog');
});
// ---- brug met pijlers ----
if (wil('brug')) await probeer('brug', async () => {
  const MB = await imp('movablebridges');
  const centrum = P(100, 77); let gevonden = null;
  for (const [nm, c] of [['centrum', centrum], ['Haren', plaats('Haren') && [plaats('Haren').x, plaats('Haren').y]], ['Delfzijl', plaats('Delfzijl') && [plaats('Delfzijl').x, plaats('Delfzijl').y]]]) {
    if (!c || gevonden) continue;
    await teleport(c[0], c[1], 5000);
    for (let dx = -2400; dx <= 2400 && !gevonden; dx += 300) for (let dy = -2400; dy <= 2400 && !gevonden; dy += 300) {
      for (const r of map.roadsNear(c[0] + dx, c[1] + dy, 160) || []) {
        if (!r || !r.bridge || r.tunnel || !r.z || !r.pts || r.pts.length < 2) continue;
        if (Math.max(...r.z) > 2.4 && Math.max(...r.z) < 12) { const m = r.pts[Math.floor(r.pts.length / 2)]; gevonden = { x: m[0], y: m[1], z: Math.max(...r.z), naam: r.name || r.type, bij: nm }; break; }
      }
    }
  }
  notities.brug = gevonden;
  if (!gevonden) throw new Error('geen verhoogde brug gevonden');
  await teleport(gevonden.x, gevonden.y, 8000);
  const z0 = gh(gevonden.x, gevonden.y);
  cam(gevonden.x + 40, gevonden.y - 12, z0 + 3, gevonden.x, gevonden.y, z0 + gevonden.z * 0.6, 60); await cap('w4-brug-pijlers-zijkant');
  cam(gevonden.x + 18, gevonden.y + 25, z0 + 1.2, gevonden.x, gevonden.y, z0 + gevonden.z * 0.8, 70); await cap('w5-brug-pijlers-onderkant');
  cam(gevonden.x + 70, gevonden.y - 70, z0 + 25, gevonden.x, gevonden.y, z0 + gevonden.z, 55); await cap('w6-brug-hoog');
  const lijst = MB.getMovableBridges(); notities.beweegbaar = lijst.length;
});
// ---- sloot: auto remt ----
if (wil('sloot')) await probeer('sloot', async () => {
  const WL = await imp('waterlevels');
  const pl = plaats('Zuidhorn') || plaats('Winsum'); await teleport(pl.x, pl.y, 8000);
  let doel = null;
  for (let dx = -400; dx <= 400 && !doel; dx += 6) for (let dy = -400; dy <= 400 && !doel; dy += 6) {
    const x = pl.x + dx, y = pl.y + dy;
    const q = WL.waterPolyAt(map, x, y, 0); if (!q) continue;
    if (WL.waterPolyAt(map, x - 12, y, 0) || WL.waterPolyAt(map, x + 12, y, 0)) continue;
    if (!map.nearestRoadPoint) continue;
    const r = map.nearestRoadPoint(x - 30, y, 14, true, true); if (r && r.road) doel = { x, y, weg: r, kind: q.kind || q.type || null };
  }
  notities.sloot = doel ? { x: Math.round(doel.x), y: Math.round(doel.y), kind: doel.kind } : null;
  if (!doel) throw new Error('geen sloot naast een weg gevonden');
  await teleport(doel.x - 30, doel.y, 5000);
  const v = VEH.spawnVehicleOnRoad(map, doel.weg.road, false, Math.random, false, false, doel.weg, false, null);
  if (!v) throw new Error('geen auto');
  v.road = null; v.perfTemp = true; v.x = doel.x - 30; v.y = doel.y; v.angle = 0; v.speed = 0; w.vehicles.push(v);
  p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(1200);
  const spoor = [];
  cam(doel.x - 12, doel.y - 14, gh(doel.x, doel.y) + 6, doel.x, doel.y, gh(doel.x, doel.y), 60); await cap('w7-sloot-voor-rijden', 400);
  window.__keys = new Set(['w']); const oud = w.input.isDown.bind(w.input); w.input.isDown = (k) => (window.__keys && window.__keys.has(k)) || oud(k);
  v.speed = 18;
  for (let i = 0; i < 40; i++) { spoor.push([Math.round(v.x - doel.x), +(v.speed || 0).toFixed(1)]); await sleep(150); if (i === 14) await cap('w8-sloot-tijdens', 50); }
  window.__keys = new Set(); w.input.isDown = oud;
  notities.slootSpoor = spoor.map((s) => s.join('@')).join(' ');
  await cap('w9-sloot-na', 300);
  p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1);
});
// ---- plaatsnaambord omver ----
if (wil('bord')) await probeer('bord', async () => {
  const BK = await imp('breakables');
  let b = null;
  for (const n of ['Winsum', 'Zuidhorn', 'Haren', 'Hoogezand', 'Veendam']) {
    const pl = plaats(n); if (!pl) continue;
    await teleport(pl.x, pl.y, 6000);
    for (const [dx, dy] of [[0, 0], [700, 0], [-700, 0], [0, 700], [0, -700]]) {
      await teleport(pl.x + dx, pl.y + dy, dx || dy ? 4000 : 0);
      const lijst = BK.propsInRadius(pl.x + dx, pl.y + dy, 600, ['placesign']); if (lijst && lijst.length) { b = lijst[0]; break; }
    }
    if (b) break;
  }
  notities.bord = b ? { kind: b.kind, x: Math.round(b.x), y: Math.round(b.y), sleutels: Object.keys(b).join(',') } : null;
  if (!b) throw new Error('geen plaatsnaambord gevonden');
  await teleport(b.x, b.y, 5000);
  const z = gh(b.x, b.y);
  cam(b.x + 8, b.y - 8, z + 2.5, b.x, b.y, z + 2, 60); await cap('w10-bord-voor', 400);
  const rp = map.nearestRoadPoint(b.x, b.y, 25, true, true);
  if (!rp || !rp.road) throw new Error('geen weg bij het bord');
  const hoek = Number.isFinite(b.a) ? b.a : 0;
  const v = VEH.spawnVehicleOnRoad(map, rp.road, false, Math.random, false, false, rp, false, null);
  v.road = null; v.perfTemp = true; v.x = b.x - Math.cos(hoek) * 40; v.y = b.y - Math.sin(hoek) * 40; v.angle = hoek; v.speed = 0; w.vehicles.push(v);
  p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(1200); v.angle = hoek;
  window.__keys = new Set(['w']); const oud = w.input.isDown.bind(w.input); w.input.isDown = (k) => (window.__keys && window.__keys.has(k)) || oud(k);
  for (let i = 0; i < 40; i++) { v.speed = Math.max(v.speed, 17); await sleep(100); }
  window.__keys = new Set(); w.input.isDown = oud;
  notities.bordKapot = BK.isPropBroken(b.key || BK.propKey('placesign', b.x, b.y));
  await cap('w11-bord-na-aanrijding', 600);
  p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1);
});
// ---- eerste persoon (handen, wapen) ----
if (wil('eerste')) await probeer('eerste', async () => {
  const FP = await imp('firstperson'); const centrum = P(100, 77);
  await teleport(centrum[0], centrum[1], 7000);
  FP.setFirstPerson(w, true); await sleep(1500);
  await cap('w12-eerste-persoon-leeg', 300);
  try { const WP = await imp('weapons'); const lijst = Object.keys(WP.WEAPONS || WP.weapons || {}); notities.wapens = lijst.slice(0, 20); if (WP.giveWeapon) { WP.giveWeapon(w, 'pistol'); } } catch (e) { noteer('wapen', e.message); }
  try { for (const k of ['pistol', 'pistool']) { if (w.inventory && w.inventory.weapons) w.inventory.weapons[k] = { ammo: 30 }; } w.weapon = w.weapon || 'pistol'; } catch (e) { /* geen */ }
  tap('1', 'Digit1'); await sleep(1200); await cap('w13-eerste-persoon-wapen', 300);
  FP.setFirstPerson(w, false);
});
// ---- fiets uit stalling ----
if (wil('fiets')) await probeer('fiets', async () => {
  const BK = await imp('breakables'); const centrum = P(100, 77);
  await teleport(centrum[0], centrum[1], 7000);
  let r = null;
  for (const [dx, dy] of [[0, 0], [250, 0], [-250, 0], [0, 250], [0, -250]]) { await teleport(centrum[0] + dx, centrum[1] + dy, dx || dy ? 3500 : 0); const l = BK.propsInRadius(centrum[0] + dx, centrum[1] + dy, 300, ['bikerack']); if (l && l.length) { r = l[0]; break; } }
  notities.fietsrek = r ? [Math.round(r.x), Math.round(r.y)] : null;
  if (!r) throw new Error('geen fietsenrek gevonden');
  await teleport(r.x + 1.2, r.y, 3000);
  const z = gh(r.x, r.y);
  cam(r.x + 5, r.y - 5, z + 2.2, r.x, r.y, z + 0.7, 60); await cap('w14-fietsenstalling-voor', 500);
  w.cameraOverride = null; tap('e', 'KeyE'); await sleep(2500);
  notities.fietsInVoertuig = !!p.inVehicle; notities.fietsKind = p.inVehicle ? (p.inVehicle.kind || p.inVehicle.type || p.inVehicle.model || '?') : null;
  notities.melding = (document.getElementById('hud') ? document.getElementById('hud').innerText : '').replace(/\s+/g, ' ').slice(0, 300);
  await cap('w15-fiets-gepakt', 500);
  if (p.inVehicle) p.exitVehicle(map, w);
});
// ---- vaarlijn op water + luchtroute in vliegtuig: via een eigen waypoint (kaartdoel) ----
if (wil('vaar') || wil('lucht')) {
  const RT = await imp('routing');
  const stuur = async (naam) => { RT.setUserWaypoint(p.x + 900, p.y - 900, 'Doel ' + naam); await sleep(5000); };
  if (wil('vaar')) await probeer('vaar', async () => {
    const haven = plaats('Delfzijl') || plaats('Groningen'); await teleport(haven.x, haven.y, 6000);
    const bt = VEH.spawnBoatOnWater && VEH.spawnBoatOnWater(map, Math.random);
    notities.boot = bt ? { x: Math.round(bt.x), y: Math.round(bt.y), kind: bt.kind || bt.model } : null;
    if (!bt) throw new Error('geen boot kunnen maken');
    bt.perfTemp = true; if (!w.vehicles.includes(bt)) w.vehicles.push(bt);
    p.x = bt.x; p.y = bt.y; p.enterVehicle(bt, w); await sleep(3000);
    RT.setUserWaypoint(bt.x + 500, bt.y - 300, 'Doel op het water'); await sleep(6000);
    notities.vaarRoute = (() => { const r = RT.getActiveRoute && RT.getActiveRoute(); return r ? { mode: r.mode, noRoute: !!r.noRoute, lengte: Math.round(r.length || 0) } : null; })();
    await cap('w16-vaarlijn-boot', 800);
    RT.clearUserWaypoint(); p.exitVehicle(map, w);
  });
  if (wil('lucht')) await probeer('lucht', async () => {
    const c = P(100, 77); await teleport(c[0], c[1], 6000);
    const pl = VEH.spawnPlaneNear ? VEH.spawnPlaneNear(map, c[0], c[1]) : null;
    notities.vliegtuigApi = !!pl;
    if (!pl) throw new Error('geen vliegtuig-spawn in vehicle.js');
  });
}
// ---- wereldkleuren op drie plekken ----
if (wil('kleur')) await probeer('kleur', async () => {
  const plekken = [['k1-grotemarkt', 106.3, 58.6, 'oog'], ['k2-ommeland', 2769.7, -20431.3, 'lucht'], ['k3-haven-water', -874, 566, 'lucht']];
  for (const [nm, x, y, soort] of plekken) {
    await teleport(x, y, 7000); const z = gh(x, y);
    if (soort === 'oog') cam(x - 12, y - 8, z + 4, x + 5, y + 5, z + 3, 70); else cam(x + 90, y - 90, z + 40, x, y, z, 60);
    await cap('w17-wereldkleur-' + nm, 700);
  }
});
clearInterval(skipper);
return JSON.stringify({ size: SIZE, done, notities, fouten });
