// Page half of scripts/qa/province_shots.mjs (desktop --perf-script body).
// window.__qaSpots = [{ name, x, y, snap?, snapR?, road?, a? }] is put in front by
// the driver. Per spot: teleport (cheat-style, like scripts/perf/detail.js),
// let the tiles stream in, one street-level shot ('<name>') and one from
// 28 m up looking along the heading ('<name>-hoog'). Also logs per spot the
// NaN count in the scene's geometry and the road that was snapped to.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WP = await imp('worldplaces');
const WL = await imp('waterlevels');
const TP = await imp('tileplace');
const SETTLE = window.__qaSettle || 9000;
const ONLY = (window.__qaOnly || '').split(',').filter(Boolean);
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null;
let done = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = 14; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};

// nearest road segment (within R m of x,y; optionally only roads named `road`)
function snapRoad(x, y, R, road) {
  let best = null;
  const rows = (map.roadsNear ? map.roadsNear(x, y, R) : []) || [];
  for (const rd of rows) {
    if (road && rd.name !== road && rd.ref !== road) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) continue;
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), street: rd.name || rd.ref || '' };
    }
  }
  return best;
}

function nanCount() {
  let n = 0, meshes = 0;
  sc.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const pos = o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    meshes++;
    const a = pos.array;
    for (let i = 0; i < a.length; i += 7) if (a[i] !== a[i]) { n++; break; }
  });
  return { nanMeshes: n, meshes };
}

const results = { dpr: devicePixelRatio, css: [innerWidth, innerHeight], spots: {} };
for (const S of window.__qaSpots) {
  if (ONLY.length && !ONLY.includes(S.name)) continue;
  fixWorld();
  let s = { x: S.x, y: S.y, a: S.a || 0, street: '' };
  // the tiles around a far spot are not loaded yet: go there first, then snap
  teleport(S.x, S.y);
  hold = s;
  await sleep(SETTLE * 0.6);
  if (S.snap !== false) {
    const sn = snapRoad(S.x, S.y, S.snapR || 400, S.road);
    if (sn) s = { x: sn.x, y: sn.y, a: sn.a, street: sn.street, d: Math.round(sn.d) };
  }
  if (S.a !== undefined) s.a = S.a;
  teleport(s.x, s.y);
  hold = s;
  fixWorld();
  await sleep(SETTLE);
  const gz = map.groundHeightAt ? map.groundHeightAt(s.x, s.y, 0) : null;
  const place = WP.nearestWorldPlace ? WP.nearestWorldPlace(s.x, s.y) : null;
  const info = { at: [Math.round(s.x), Math.round(s.y)], street: s.street, snapDist: s.d, ground: gz, place: place && place.name, ...nanCount() };
  // automatic checks on a target (S.tx, S.ty): in water, in a building, floating or sunk, and (S.inst) no streekplekken instance within 6 m
  if (S.tx !== undefined) {
    const chk = { water: !!WL.waterAt(map, S.tx, S.ty), building: !!TP.buildingAt(map, S.tx, S.ty, 0), gz: map.groundHeightAt ? Math.round((map.groundHeightAt(S.tx, S.ty, 0) || 0) * 10) / 10 : null };
    if (S.inst) { let n = 0; sc.scene.traverse((o) => { if (o.name !== 'streekplekken') return; o.traverse((m) => { if (!m.isInstancedMesh) return; const a = m.instanceMatrix.array; for (let i = 0; i < m.count; i++) if (Math.hypot(a[i * 16 + 12] - S.tx, a[i * 16 + 14] - S.ty) < 6) n++; }); }); chk.inst = n; }
    chk.flags = [chk.water && 'in water', chk.building && 'in gebouw', Math.abs(chk.gz || 0) > 1.2 && 'zweeft of zakt', S.inst && !chk.inst && 'onzichtbaar'].filter(Boolean);
    info.check = chk;
  }
  results.spots[S.name] = info;
  console.log('[qa-spot] ' + S.name + ' ' + JSON.stringify(info));
  console.log('[capture] ' + S.name);
  await sleep(600);
  // high shot: 28 m up, 40 m behind, looking 30 m ahead
  const cx = Math.cos(s.a), cy = Math.sin(s.a);
  const base = gz || 0;
  const pose = { position: { x: s.x - cx * 40, y: s.y - cy * 40, z: base + 28 }, lookAt: { x: s.x + cx * 30, y: s.y + cy * 30, z: base }, cut: true };
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'qa-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(2500);
  console.log('[capture] ' + S.name + '-hoog');
  await sleep(600);
  cine.skipCinematic();
  ownShot = false;
}
hold = null;
done = true;
clearInterval(skipper);
return JSON.stringify(results);
