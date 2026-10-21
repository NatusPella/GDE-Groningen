// Scenes voor de wensen-ronde (#156 winkelgevels per type, #160 busbord, #207 bewegingen, #180 missiekaart): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_r39.js --only=winkels
// Basis: scripts/ui/shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
// window size). Each scene opens a screen and logs "[capture] <name>", which
// devtools.js turns into <out>/<size>-<name>.png. Nothing here writes saves:
// the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  // a touch run taps the menu instead: the news panel of a fresh profile closes, 'Nieuw spel' is tapped
  if (/[?&]touch=1/.test(location.search)) {
    const news = document.querySelector('#start-screen .ss-news');
    if (news && !news.hidden) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })); } await sleep(500); }
    const item = [...document.querySelectorAll('#start-screen .ss-item')].find((e) => /Nieuw spel|Doorgaan/.test(e.textContent));
    if (item) item.click();
  }
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const VEH = await imp('vehicle');
const PM = await imp('pausemenu');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const SH = await imp('shops');
const PIG = await imp('pigeonmode');
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];

const info = [];
let hold = null;
if (want('winkels')) {
  // #156: per winkeltype een echte plek uit de data; de gevel van voren (b.shopFront, gezet door models3d_buildings) en de ruit
  const SS = await imp('shopspots');
  const FACM = await imp('facilities');
  const WK = await imp('winkelkit');
  const spots = SS.spotsFrom(FACM.FAC.all, SH.getShopsForRender());
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const only = (window.__shotsTypes || '').split(',').filter(Boolean);
  clearInterval(skipper);
  w.clock = 14;
  const keep = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; if (cine.isCinematicActive() && !hold) cine.skipCinematic(); }, 50);
  for (const type of WK.SHOP_KINDS.filter((k) => k !== 'kermiskraam' && (!only.length || only.includes(k)))) {
    const cand = spots.filter((s) => s.type === type);
    info.push('winkels ' + type + ': ' + cand.length + ' plekken');
    let found = null;
    for (const s of cand.slice(0, 30)) {
      const bs = map.buildingsNear(s.x, s.y, 8).filter((b) => b.pts && b.pts.length >= 3 && !b.landmark && SS.shopTypeFor(b.pts.map((q) => [q[0], q[1]]), null, 4) === type);
      if (!bs.length) continue;
      hold = { x: s.x, y: s.y };
      teleport(s.x, s.y);
      for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
      await sleep(2500);
      for (const b of bs) if (b.shopFront && b.shopFront.poi === type) { found = { s, b, f: b.shopFront }; break; }
      info.push('  kandidaat @' + Math.round(s.x) + ',' + Math.round(s.y) + ' panden ' + bs.length + ' voorgevel ' + bs.map((b) => (b.shopFront ? b.shopFront.poi || 'rank' : String(b.shopFront))).join('/'));
      if (found) break;
    }
    if (!found) { info.push('winkels ' + type + ': geen gevel met dit type gebouwd'); continue; }
    const f = found.f, mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2;
    // the camera stands on free ground in front of the shopfront: not inside a building, not too close to one
    const pointIn = (x, y, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
    let dist = 0, cx = mx, cy = my;
    for (const dd of [8, 6.5, 5, 4, 3, 2.2]) {
      const tx = mx + f.nx * dd, ty = my + f.ny * dd;
      if (!map.buildingsNear(tx, ty, 6).some((q) => q.pts && pointIn(tx, ty, q.pts))) { dist = dd; cx = tx; cy = ty; break; }
    }
    info.push('  camera ' + (dist ? dist + ' m voor de gevel' : 'geen vrije plek'));
    if (!dist) continue;
    hold = { x: cx, y: cy };
    teleport(cx, cy);
    await sleep(2500);
    const g = gh(mx, my);
    const pose = { position: { x: cx, y: cy, z: g + 2.2 }, lookAt: { x: mx, y: my, z: g + 1.8 }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-winkel', duration: 60, priority: 9, shot: () => pose });
    await sleep(2400);
    console.log('[capture] winkel-' + type);
    await sleep(600);
    cine.skipCinematic();
    info.push('winkel ' + type + ' @' + Math.round(mx) + ',' + Math.round(my));
    done.push('winkel-' + type);
  }
  clearInterval(keep);
}

// ---- #207: de speler zwemt, klimt uit het water, springt over een obstakel, wheelie op de fiets ----
const keyEv = (ty, k, code) => { for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code: code || k, bubbles: true })); };
const press = async (k, code, ms) => { keyEv('keydown', k, code); await sleep(ms); keyEv('keyup', k, code); };
const follow = async (name, dx, dy, dz, wait = 250) => {
  // a camera beside the player at the moment of the call
  const g = map.groundHeightAt ? map.groundHeightAt(p.x, p.y, 0) || 0 : 0;
  const pose = { position: { x: p.x + dx, y: p.y + dy, z: g + dz }, lookAt: { x: p.x, y: p.y, z: g + 0.9 }, cut: true };
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'vi-bew', duration: 30, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  done.push(name);
};
if (want('bewegen')) {
  clearInterval(skipper);
  w.clock = 14;
  const WL = await imp('waterlevels');
  // a water spot with a bank 4-6 m to one side: swim in, then climb out
  let spot = null;
  const wet = (x, y) => !!WL.waterAt(map, x, y);
  const centre = { x: 100, y: 77 };
  for (let r = 40; r < 1400 && !spot; r += 20) {
    for (let a = 0; a < 6.28 && !spot; a += 0.2) {
      const x = centre.x + Math.cos(a) * r, y = centre.y + Math.sin(a) * r;
      if (!wet(x, y) || w.vehicles.some((v) => v.isBoat && Math.hypot(v.x - x, v.y - y) < 60)) continue;
      for (let b = 0; b < 6.28; b += 0.7854) {
        const bx = x + Math.cos(b) * 5, by = y + Math.sin(b) * 5;
        if (!wet(bx, by) && !map.buildingsNear(bx, by, 1).length) { spot = { x, y, bank: b, bx, by }; break; }
      }
    }
  }
  info.push('water ' + JSON.stringify(spot && { x: Math.round(spot.x), y: Math.round(spot.y) }));
  if (spot) {
    teleport(spot.x, spot.y);
    hold = null;
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(2500);
    if (p.enterSwim) p.enterSwim();
    await sleep(2500);
    info.push('water-state ' + p.water);
    p.angle = spot.bank;
    w.camYaw = spot.bank;
    await follow('zwemmen-stil', Math.cos(spot.bank + 1.57) * 3.2, Math.sin(spot.bank + 1.57) * 3.2, 1.5);
    keyEv('keydown', 'w', 'KeyW');
    await sleep(1500);
    await follow('zwemmen-door', Math.cos(spot.bank + 1.57) * 3.2, Math.sin(spot.bank + 1.57) * 3.2, 1.5);
    for (let i = 0; i < 30 && !p.climbSpot; i++) await sleep(300);
    info.push('klimplek ' + !!p.climbSpot + ' water ' + p.water);
    if (p.climbSpot) {
      keyEv('keyup', 'w', 'KeyW');
      await press(' ', 'Space', 80);
      await sleep(350);
      await follow('klimmen-1', Math.cos(spot.bank + 1.57) * 3, Math.sin(spot.bank + 1.57) * 3, 1.3, 100);
      await sleep(400);
      await follow('klimmen-2', Math.cos(spot.bank + 1.57) * 3, Math.sin(spot.bank + 1.57) * 3, 1.3, 100);
    }
    keyEv('keyup', 'w', 'KeyW');
    await sleep(2500);
    info.push('na klimmen water ' + p.water);
  }
  // jumping over something: a parked car on the pavement, sprint at it and jump
  const VH = await imp('vehicle');
  const home = { x: 100, y: 77 };
  const o = map.findOpenSpawn(home.x, home.y, 60) || home;
  if (p.inVehicle) p.exitVehicle(map, w);
  const car = new VH.Vehicle(o.x + 8, o.y, 0, { name: 'sedan', len: 4.4, wid: 1.8, maxSpeed: 30, accel: 6, brake: 12, turnRate: 1.6, color: '#c0c0c0' });
  car.parked = true; car.speed = 0; w.vehicles.push(car);
  teleport(o.x, o.y);
  p.angle = 0; w.camYaw = 0;
  await sleep(2500);
  keyEv('keydown', 'Shift', 'ShiftLeft');
  keyEv('keydown', 'w', 'KeyW');
  await sleep(1100);
  keyEv('keydown', ' ', 'Space');
  for (const [i, ms] of [[1, 120], [2, 260], [3, 300]]) {
    await sleep(ms);
    await follow('springen-' + i, 0.5, 5.5, 1.4, 60);
  }
  keyEv('keyup', ' ', 'Space'); keyEv('keyup', 'w', 'KeyW'); keyEv('keyup', 'Shift', 'ShiftLeft');
  info.push('na sprong z ' + (p.z || 0).toFixed(2) + ' vault ' + !!p.vault + ' perch ' + !!p.perch);
  await sleep(1500);
  const ci = w.vehicles.indexOf(car); if (ci >= 0) w.vehicles.splice(ci, 1);
  // a wheelie on an ordinary bike: Ctrl and pedal
  const bike = VH.makeTwoWheeler('fiets', o.x, o.y + 10, 0);
  w.vehicles.push(bike);
  teleport(o.x, o.y + 10);
  p.enterVehicle(bike, w);
  p.angle = 0;
  await sleep(1500);
  keyEv('keydown', 'Control', 'ControlLeft');
  keyEv('keydown', 'w', 'KeyW');
  await sleep(1100);
  const side = (bike.angle || 0) + Math.PI / 2;
  await follow('wheelie-1', Math.cos(side) * 4.5, Math.sin(side) * 4.5, 1.2, 60);
  await sleep(500);
  await follow('wheelie-2', Math.cos(side) * 4.5, Math.sin(side) * 4.5, 1.2, 60);
  info.push('wheelie ' + JSON.stringify({ wheelie: !!bike.wheelie, pitch: +(bike.pitch || 0).toFixed(2), speed: +(bike.speed || 0).toFixed(1) }));
  keyEv('keyup', 'Control', 'ControlLeft'); keyEv('keyup', 'w', 'KeyW');
  await sleep(500);
  p.exitVehicle(map, w);
}

// ---- #180: de missielaag op minimap en grote kaart: gezocht, duif, kart, boot ----
if (want('missiekaart')) {
  clearInterval(skipper);
  w.clock = 14;
  const MV = await imp('mapview');
  const ML = await imp('missionmaplive');
  const home = map.findOpenSpawn(100, 77, 60) || { x: 100, y: 77 };
  const holdMk = { x: home.x, y: home.y, on: true };
  const keepMk = setInterval(() => { if (holdMk.on) { p.x = holdMk.x; p.y = holdMk.y; p.vx = p.vy = 0; } w.clock = 14; }, 50);
  const layerInfo = (name) => { const l = ML.getMissionLayer(w); info.push(name + ' laag ' + (l ? JSON.stringify({ kind: l.kind, items: (l.items || []).length, lines: (l.lines || []).length, areas: (l.areas || []).length, zoom: l.focus || null }) : 'geen')); };
  const both = async (name) => {
    await sleep(1500);
    console.log('[capture] mk-' + name + '-mini');
    await sleep(600);
    PM.openPauseMenu('map');
    await sleep(1500);
    MV.setMapView(holdMk.x, holdMk.y, 5);
    await sleep(2000);
    console.log('[capture] mk-' + name + '-kaart');
    await sleep(600);
    PM.closePauseMenu();
    await sleep(500);
    done.push('mk-' + name);
  };
  teleport(holdMk.x, holdMk.y);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(2500);
  // 1 gezocht
  w.wanted = 3;
  await sleep(9000);
  layerInfo('gezocht');
  await both('gezocht');
  w.wanted = 0; w.wantedDecayTimer = 0;
  await sleep(2000);
  // 2 duif
  const okP = PIG.startPigeonMode(w);
  info.push('duif start ' + okP);
  await sleep(4000);
  layerInfo('duif');
  await both('duif');
  PIG.stopPigeonMode(w);
  await sleep(2500);
  // 3 kart
  const K = window.__kartbaan;
  if (K) {
    const sp = K.spot();
    holdMk.on = false;
    teleport(sp.x, sp.y);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(2500);
    info.push('kart start ' + K.start(true));
    await sleep(9000);
    layerInfo('kart');
    holdMk.x = p.x; holdMk.y = p.y;
    await both('kart');
    K.quit();
    await sleep(1500);
  }
  // 4 boot
  const VH = await imp('vehicle');
  const BT = await imp('boattypes');
  const WL = await imp('waterlevels');
  let ws = null;
  for (let r = 40; r < 1400 && !ws; r += 20) for (let a = 0; a < 6.28 && !ws; a += 0.2) {
    const x = 100 + Math.cos(a) * r, y = 77 + Math.sin(a) * r;
    if (WL.waterAt(map, x, y)) ws = { x, y };
  }
  info.push('boot water ' + JSON.stringify(ws && { x: Math.round(ws.x), y: Math.round(ws.y) }));
  if (ws) {
    if (p.inVehicle) p.exitVehicle(map, w);
    holdMk.on = false;
    teleport(ws.x, ws.y);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(2000);
    const boat = new VH.Vehicle(ws.x, ws.y, 0, { ...BT.BOAT_KINDS.sloep });
    boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
    p.enterVehicle(boat, w);
    holdMk.x = ws.x; holdMk.y = ws.y;
    await sleep(3000);
    layerInfo('boot');
    await both('boot');
    p.exitVehicle(map, w);
  }
  clearInterval(keepMk);
}

// ---- #206: de flat met alle meubels, de pc (kasboek, flat inrichten) en Spullen > Geld ----
if (want('bezit')) {
  clearInterval(skipper);
  w.clock = 14;
  const FU = await imp('furniture');
  const HM = window.__home;
  const SHU2 = await imp('shopui');
  window.__furniture.give();
  w.money = 4000;
  HM.goHome();
  await sleep(5000);
  if (!(HM.state() || {}).inside) { HM.enter(); await sleep(4000); }
  info.push('flat binnen ' + JSON.stringify(HM.state && HM.state()).slice(0, 160));
  // a few bookings for the ledger
  for (const [d, label] of [[250, 'Missies'], [-120, 'Winkels'], [60, 'Bijbaantjes'], [-35, 'Eten en drinken']]) { const F = await imp('finance'); F.noteMoney(label); w.money += d; await sleep(300); }
  const f = HM.home && HM.home.flat;
  const fl = f && f.fl ? f.fl.bind(f) : null;
  const camFlat = async (name, from, to, wait = 800) => {
    const [fx, fy] = fl(from[0], from[2]), [tx, ty] = fl(to[0], to[2]);
    const pose = { position: { x: fx, y: fy, z: (f.floorY || 0) + from[1] }, lookAt: { x: tx, y: ty, z: (f.floorY || 0) + to[1] }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-flat', duration: 60, priority: 9, shot: () => pose });
    await sleep(wait + 1500);
    console.log('[capture] ' + name);
    await sleep(500);
    cine.skipCinematic();
    done.push(name);
  };
  if (fl) {
    await camFlat('bezit-flat-boven', [5.6, 11, 4.2], [5.6, 0, 4.1]);
    await camFlat('bezit-flat-schuin', [1.2, 2.3, 8.0], [6.5, 0.7, 2.5]);
  } else info.push('geen flat.fl');
  // the pc: money book and moving the furniture
  FU.useFurniture(w, 'f-bureau', {});
  await sleep(1500);
  console.log('[capture] bezit-pc');
  await sleep(600);
  try { SHU2.closeShopMenu({ save: false }); } catch (e) { info.push('pc dicht: ' + e.message); }
  await sleep(500);
  // move the lamp and the plant to other corners through the same menu entries, then look at the flat again
  window.__furniture.move && window.__furniture.move();
  PM.openPauseMenu('spullen');
  await sleep(2000);
  console.log('[capture] bezit-spullen');
  await sleep(600);
  PM.closePauseMenu();
  HM.leave();
  done.push('bezit');
}

// ---- #160: waarom is er geen bus op een lijn? Spawnstatistiek, dan het bord en de HUD ----
if (want('bus2')) {
  clearInterval(skipper);
  w.clock = 14;
  const VM = await imp('vehicle');
  const BR = await imp('busroutes');
  const lines = VM.getBusLines();
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const wins = idx && idx.global.places.find((q) => q.name === 'Winsum' && q.kind !== 'suburb');
  const near = lines.length && wins ? lines.map((l) => ({ l, d: Math.min(...l.pts.map((q) => Math.hypot(q[0] - wins.x, q[1] - wins.y))) })).sort((x, y) => x.d - y.d)[0] : null;
  info.push('buslijnen ' + lines.length + ' lijn ' + (near ? near.l.ref + ' ' + near.l.from + '-' + near.l.to + ' lengte ' + Math.round(near.l.length) + ' haltes ' + near.l.stops.length : 'geen'));
  const mid = near ? near.l.pts[Math.floor(near.l.pts.length / 2)] : [wins.x, wins.y];
  teleport(mid[0], mid[1]);
  const keepB = setInterval(() => { p.x = mid[0]; p.y = mid[1]; p.vx = p.vy = 0; }, 50);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  let bus = null;
  for (let t2 = 0; t2 < 60 && !bus; t2++) {
    await sleep(1000);
    const buses = w.vehicles.filter((v) => v.isBus);
    bus = buses.find((v) => v.busRun && Math.hypot(v.x - p.x, v.y - p.y) < 250) || null;
    if (t2 % 10 === 9) info.push('t=' + (t2 + 1) + 's stats ' + JSON.stringify(VM.busSpawnStats) + ' bussen ' + buses.length + ' met lijn ' + buses.filter((v) => v.busRun).length + ' dichtbij ' + buses.filter((v) => Math.hypot(v.x - p.x, v.y - p.y) < 250).length + ' lijnen<220m ' + BR.linesNear(lines, p.x, p.y, 220).length);
  }
  clearInterval(keepB);
  info.push('bus op lijn: ' + (bus ? Math.round(bus.x) + ',' + Math.round(bus.y) + ' lijn ' + bus.busRun.line.ref + ' richting ' + bus.busRun.dir : 'geen'));
  if (bus) {
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    const keep = setInterval(() => { if (bus) bus.speed = 0; }, 50);
    for (const [name, rel, R, up] of [['voor', 0, 4.5, 2.4], ['zij', Math.PI / 2, 5.5, 2.2], ['schuin', Math.PI / 4, 9, 2.6]]) {
      const a = bus.angle + rel, g = gh(bus.x, bus.y);
      const pose = { position: { x: bus.x + Math.cos(a) * R, y: bus.y + Math.sin(a) * R, z: g + up }, lookAt: { x: bus.x + Math.cos(bus.angle) * (rel === 0 ? 2 : 1.5), y: bus.y + Math.sin(bus.angle) * (rel === 0 ? 2 : 1.5), z: g + 2.6 }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      cine.playCinematic({ id: 'vi-bus', duration: 60, priority: 9, shot: () => pose });
      await sleep(2000);
      console.log('[capture] bus-' + name);
      await sleep(500);
      cine.skipCinematic();
      done.push('bus-' + name);
    }
    clearInterval(keep);
    p.x = bus.x; p.y = bus.y;
    p.enterVehicle(bus, w);
    await sleep(3500);
    console.log('[capture] bus-hud');
    await sleep(500);
    done.push('bus-hud ' + JSON.stringify({ inVehicle: !!p.inVehicle, class: document.body.classList.contains('bus-driving'), card: (document.querySelector('.hud-busnext') || {}).textContent }));
    p.exitVehicle(map, w);
  }
}

// ---- #190: voorbijgangers praten in tekstbellen ----
if (want('praat')) {
  clearInterval(skipper);
  w.clock = 14;
  const SP = await imp('straatpraat');
  const home = map.findOpenSpawn(100, 77, 60) || { x: 100, y: 77 };
  const keepP = setInterval(() => { p.x = home.x; p.y = home.y; p.vx = p.vy = 0; w.clock = 14; }, 50);
  teleport(home.x, home.y);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(3000);
  let got = 0, seen = [];
  for (let t2 = 0; t2 < 120 && got < 3; t2++) {
    await sleep(1000);
    const talking = w.pedestrians.filter((q) => q.speechText && w.time < q.speechUntil);
    if (SP.straatpraatState().run && talking.length) {
      await sleep(600);
      const again = w.pedestrians.filter((q) => q.speechText && w.time < q.speechUntil);
      if (!again.length) continue;
      got++;
      seen.push(again.map((q) => q.speechText).join(' / '));
      console.log('[capture] praat-' + got);
      await sleep(3500);
    }
  }
  info.push('praat: ' + got + ' gesprekken in beeld; ' + JSON.stringify(seen) + ' staat ' + JSON.stringify(SP.straatpraatState()));
  clearInterval(keepP);
}

// ---- #61: Alles is een kliko, Kleine mensjes, Reuzenduif, Altijd groen ----
if (want('streken')) {
  clearInterval(skipper);
  w.clock = 14;
  const ACH = await imp('achievements');
  const CH = await imp('cheats');
  for (const id of ['kliko', 'kleinemensjes', 'reuzenduif', 'altijdgroen']) { try { ACH.recordUnique(w, 'streken', id); } catch (e) { info.push('unlock ' + id + ': ' + e.message); } }
  info.push('aan: ' + ['kliko', 'kleinemensjes', 'reuzenduif', 'altijdgroen'].map((id) => id + '=' + CH.setCheat(id, true)).join(' '));
  const rp = map.nearestRoadPoint(100, 77, 500, true) || { x: 100, y: 77 };
  const keepS = setInterval(() => { p.x = rp.x; p.y = rp.y; p.vx = p.vy = 0; w.clock = 14; }, 50);
  teleport(rp.x, rp.y);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(70000);
  console.log('[capture] streken-1');
  await sleep(2500);
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const car = w.vehicles.filter((v) => !v.isBike && !v.isScooter && !v.isBoat && !v.isHeroCar && v.model && v.model.len > 1.8 && Math.hypot(v.x - p.x, v.y - p.y) < 80 && !v.parked).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  info.push('auto dichtbij ' + (car ? JSON.stringify({ len: +(car.model.len || 0).toFixed(2), color: car.model.color }) : 'geen'));
  if (car) {
    const g = gh(car.x, car.y);
    const pose = { position: { x: car.x + 5, y: car.y + 5, z: g + 2.2 }, lookAt: { x: car.x, y: car.y, z: g + 0.7 }, cut: true };
    cine.playCinematic({ id: 'vi-kliko', duration: 30, priority: 9, shot: () => pose });
    await sleep(2000);
    console.log('[capture] streken-auto');
    await sleep(500);
    cine.skipCinematic();
  }
  const ped = w.pedestrians.filter((q) => !q.isCop && Math.hypot(q.x - p.x, q.y - p.y) < 25).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  if (ped) {
    const g = gh(ped.x, ped.y);
    const pose = { position: { x: ped.x + 3, y: ped.y + 3, z: g + 1.4 }, lookAt: { x: ped.x, y: ped.y, z: g + 0.5 }, cut: true };
    cine.playCinematic({ id: 'vi-klein', duration: 30, priority: 9, shot: () => pose });
    await sleep(2000);
    console.log('[capture] streken-mensje');
    await sleep(500);
    cine.skipCinematic();
  }
  info.push('pedScale ' + (await imp('cheatmods')).MODS.pedScale + ' pigeonScale ' + (await imp('cheatmods')).MODS.pigeonScale + ' alwaysGreen ' + (await imp('cheatmods')).MODS.alwaysGreen);
  for (const id of ['kliko', 'kleinemensjes', 'reuzenduif', 'altijdgroen']) CH.setCheat(id, false);
  clearInterval(keepS);
  done.push('streken');
}
clearInterval(skipper);
return done.concat(info);
