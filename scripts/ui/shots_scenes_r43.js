// Scenes voor de wereld- en beeldronde (#359 flat met verplaatste bank en bedden, #356 winkels en kermiskraam, #360 bus/trein/boot op de kaart): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_r43.js --only=flat,kraam
// Basis: scripts/ui/shots_scenes_r39.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const VH = VEH;
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

// ---- #356: winkelgevels per type, de stad eerst (kopie van winkels uit shots_scenes_r39.js met een andere volgorde) ----
if (want('winkels2')) {
  // #156: per winkeltype een echte plek uit de data; de gevel van voren (b.shopFront, gezet door models3d_buildings) en de ruit
  const SS = await imp('shopspots');
  const gh0 = 0;
  const FACM = await imp('facilities');
  const WK = await imp('winkelkit');
  const spots = SS.spotsFrom(FACM.FAC.all, SH.getShopsForRender());
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const skipMap = {}; // --types=souvenir@1 slaat het eerste kandidaatpand over
  const only = (window.__shotsTypes || '').split(',').filter(Boolean).map((x) => { const [nm, sk] = x.split('@'); skipMap[nm] = Number(sk) || 0; return nm; });
  clearInterval(skipper);
  w.clock = 14;
  const keep = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; if (cine.isCinematicActive() && !hold) cine.skipCinematic(); }, 50);
  for (const type of WK.SHOP_KINDS.filter((k) => k !== 'kermiskraam' && (!only.length || only.includes(k)))) {
    const cand = spots.filter((s) => s.type === type).sort((p1, p2) => Math.hypot(p1.x - 100, p1.y - 77) - Math.hypot(p2.x - 100, p2.y - 77)); // (de stad eerst: de dorpen bouwen hun gevels niet binnen een paar seconden)
    info.push('winkels ' + type + ': ' + cand.length + ' plekken');
    let found = null;
    for (const s of cand.slice(skipMap[type] || 0, (skipMap[type] || 0) + 40)) {
      const bs = map.buildingsNear(s.x, s.y, 8).filter((b) => b.pts && b.pts.length >= 3 && !b.landmark && SS.shopTypeFor(b.pts.map((q) => [q[0], q[1]]), null, 4) === type);
      if (!bs.length) continue;
      hold = { x: s.x, y: s.y };
      teleport(s.x, s.y);
      await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
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

// ---- #360: het bord op de voorkant van een lijnbus (kopie van bus2 uit shots_scenes_r39.js, met wachten op het laadscherm) ----
if (want('bus3')) {
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
  await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
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
    for (const [name, rel, R, up] of [['voor', 0, 5.5, 2.6], ['voor-dicht', 0, 3.2, 2.9], ['zij', Math.PI / 2, 5.5, 2.2]]) {
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

// ---- #359: de flat met de bank en de bedden op andere plekken, zitten, de slaapplek ----
if (want('flat')) {
  clearInterval(skipper);
  w.clock = 14;
  const FU = await imp('furniture');
  const HM = window.__home;
  window.__furniture.give();
  w.money = 4000;
  HM.goHome();
  await sleep(5000);
  if (!(HM.state() || {}).inside) { HM.enter(); await sleep(4000); }
  info.push('flat binnen ' + JSON.stringify(HM.state && HM.state()).slice(0, 120));
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
  const layout = async (tag, plekken) => {
    for (const [id, pl] of Object.entries(plekken)) info.push(tag + ' ' + id + '=' + pl + ' -> ' + JSON.stringify(window.__furniture.plek(id, pl)));
    await sleep(800);
    await camFlat('flat-' + tag + '-boven', [5.5, 11, 4.5], [5.5, 0, 4.4]);
  };
  if (fl) {
    // 1 standaard (baseline)
    await layout('std', {});
    // 2 bank tegen de zuidmuur (bij de keuken), bedden met de kop naar het noorden
    await layout('b', { bank: 's3', bed: 'd2' });
    await camFlat('flat-b-woonkamer', [10.4, 2.3, 0.7], [3.6, 0.5, 4.2]);
    await camFlat('flat-b-slaap', [3.9, 2.2, 8.5], [7.6, 0.4, 6.4]);
    // zitten op de bank: de speler en de ander op de bank, kijkend naar de tv
    info.push('zit ' + window.__furniture.zit());
    await sleep(1500);
    await camFlat('flat-b-zit', [6.2, 1.6, 2.4], [5.4, 0.6, 4.4]);
    window.__furniture.sta();
    await sleep(500);
    // 3 bank tegen de westmuur (de kast gaat naar Tammo's kamer), bedden gemengd
    await layout('c', { kast: 'k3', bank: 's4', bed: 'd3' });
    await camFlat('flat-c-woonkamer', [6.0, 2.2, 0.6], [0.8, 0.5, 2.4]);
    info.push('zit ' + window.__furniture.zit());
    await sleep(1500);
    await camFlat('flat-c-zit', [3.4, 1.7, 1.6], [0.8, 0.6, 2.7]);
    window.__furniture.sta();
    info.push('slaapplekken ' + JSON.stringify(FU.furnitureBedUses()));
    // 4 bank bij de gang, bedden met de kop naar het zuiden
    await layout('d', { bank: 's2', bed: 'd4' });
    info.push('slaapplekken ' + JSON.stringify(FU.furnitureBedUses()));
    // terug naar de standaard
    await layout('terug', { bank: 's1', bed: 'd1', kast: 'k1' });
  } else info.push('geen flat.fl');
  HM.leave();
  done.push('flat');
}

// ---- #356: de kermiskraam (rank van het type) en gevels van de bloemist en de souvenirwinkel ----
if (want('kraam')) {
  clearInterval(skipper);
  clearInterval(skipper);
  w.clock = 14;
  const WK = await imp('winkelkit');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const keep = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; if (cine.isCinematicActive() && !hold) cine.skipCinematic(); }, 50);
  const ring = [];
  for (const [cx, cy] of [[100, 77], [400, 0], [-200, 300], [700, -300], [300, 600], [-500, -100], [900, 200], [1400, -600], [-800, 700]]) ring.push([cx, cy]);
  let found = null;
  for (const [cx, cy] of ring) {
    const o = map.findOpenSpawn(cx, cy, 80) || { x: cx, y: cy };
    hold = { x: o.x, y: o.y };
    teleport(o.x, o.y);
    await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
    await sleep(2500);
    const bs = map.buildingsNear(o.x, o.y, 160).filter((b) => b.shopFront);
    const types = {};
    for (const b of bs) types[b.shopFront.type || '?'] = (types[b.shopFront.type || '?'] || 0) + 1;
    info.push('kraam-zoek @' + Math.round(o.x) + ',' + Math.round(o.y) + ' voorgevels ' + bs.length + ' ' + JSON.stringify(types));
    found = bs.find((b) => b.shopFront.type === 'kermiskraam' && !b.shopFront.poi);
    if (found) break;
  }
  if (found) {
    const f = found.shopFront, sm = f.kraam ? (f.kraam[0] + f.kraam[1]) / 2 : (f.s0 + f.s1) / 2, mx = f.ax + f.tx * sm, my = f.ay + f.ty * sm; // (het midden van de kraam, niet van de hele gevel)
    const pointIn = (x, y, r2) => { let ins = false; for (let i = 0, j = r2.length - 1; i < r2.length; j = i++) { const [xi, yi] = r2[i], [xj, yj] = r2[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
    let dist = 0, cx = mx, cy = my;
    for (const dd of [8, 6.5, 5, 4, 3.4]) {
      const tx = mx + f.nx * dd, ty = my + f.ny * dd;
      if (!map.buildingsNear(tx, ty, 6).some((q) => q.pts && pointIn(tx, ty, q.pts))) { dist = dd; cx = tx; cy = ty; break; }
    }
    info.push('kraam @' + Math.round(mx) + ',' + Math.round(my) + ' camera ' + (dist ? dist + ' m' : 'geen vrije plek'));
    if (dist) {
      hold = { x: cx, y: cy };
      teleport(cx, cy);
      await sleep(2500);
      const g = gh(mx, my);
      for (const [name, rel, R, up] of [['voor', 0, 1, 2.0], ['schuin', 0.9, 1.15, 2.3]]) {
        const a = Math.atan2(f.ny, f.nx) + (name === 'schuin' ? 0.8 : 0);
        const px = mx + Math.cos(a) * dist * R, py = my + Math.sin(a) * dist * R;
        const pose = { position: { x: px, y: py, z: g + up }, lookAt: { x: mx, y: my, z: g + 1.6 }, cut: true };
        if (cine.isCinematicActive()) cine.skipCinematic();
        cine.playCinematic({ id: 'vi-kraam', duration: 60, priority: 9, shot: () => pose });
        await sleep(2400);
        console.log('[capture] kraam-' + name);
        await sleep(600);
        cine.skipCinematic();
        done.push('kraam-' + name);
      }
    }
  } else info.push('geen kermiskraam-voorgevel gevonden');
  clearInterval(keep);
  hold = null;
}

// ---- #61: Jelle's trekker-limo, Disco-zwaailicht en Spiegelstad ----
if (want('streken2')) {
  clearInterval(skipper);
  w.clock = 18.2; // gouden uur: licht genoeg om de auto's te zien, de lichtjes vallen nog op
  const CH = await imp('cheats');
  const TF = await imp('trafficfleet');
  const CM = await imp('cheatmods');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const rp = map.nearestRoadPoint(100, 77, 500, true) || { x: 100, y: 77 };
  const keepS = setInterval(() => { p.x = rp.x; p.y = rp.y; p.vx = p.vy = 0; w.clock = 18.2; }, 50);
  teleport(rp.x, rp.y);
  await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
  await sleep(4000);
  const cv = () => document.getElementById('game3d');
  const camShot = async (name, from, to, wait = 2200) => {
    const g = gh(to.x, to.y);
    const pose = { position: { x: from.x, y: from.y, z: g + from.z }, lookAt: { x: to.x, y: to.y, z: g + to.z }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-streken2', duration: 30, priority: 9, shot: () => pose });
    await sleep(wait);
    console.log('[capture] streken2-' + name);
    await sleep(500);
    cine.skipCinematic();
    done.push('streken2-' + name);
  };
  // twee auto's zetten we zelf neer, zodat er altijd iets te zien is (het verkeer zelf komt na een minuut)
  // de weg: heading van het dichtstbijzijnde stuk, twee auto's op 8 en 14 m voor de speler, de camera erachter
  const rd = rp.road && rp.road.pts ? rp.road.pts : null;
  let hd = 0;
  if (rd) { let bi = 0, bd = Infinity; for (let i = 0; i < rd.length - 1; i++) { const d = Math.hypot((rd[i][0] + rd[i + 1][0]) / 2 - rp.x, (rd[i][1] + rd[i + 1][1]) / 2 - rp.y); if (d < bd) { bd = d; bi = i; } } hd = Math.atan2(rd[bi + 1][1] - rd[bi][1], rd[bi + 1][0] - rd[bi][0]); }
  const along = (s) => ({ x: rp.x + Math.cos(hd) * s, y: rp.y + Math.sin(hd) * s });
  const road = along(8);
  const base = { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 50, accel: 10, brake: 24, turnRate: 2.6, color: '#2f3a52' };
  const sedan = new VH.Vehicle(road.x, road.y, hd, { ...base });
  sedan.parked = true; sedan.speed = 0; w.vehicles.push(sedan);
  const camFrom = { ...along(-3), z: 2.1 };
  const camTo = { ...along(11), z: 1.1 };
  await camShot('normaal', camFrom, camTo);
  info.push('canvas transform normaal "' + cv().style.transform + '"');
  info.push('aan: ' + ['spiegelstad'].map((id) => id + '=' + CH.setCheat(id, true)).join(' '));
  await sleep(1500);
  info.push('canvas transform spiegel "' + cv().style.transform + '" MODS.mirror=' + CM.MODS.mirror);
  await camShot('spiegel', camFrom, camTo);
  CH.setCheat('spiegelstad', false);
  await sleep(1000);
  info.push('uit: transform "' + cv().style.transform + '"');
  // disco: de sedan en een tweede voertuig met een lichtje
  info.push('aan: ' + ['disco'].map((id) => id + '=' + CH.setCheat(id, true)).join(' '));
  await sleep(2500);
  info.push('disco lampje op de sedan: ' + !!(w.vehicles.indexOf(sedan) >= 0));
  await camShot('disco-1', camFrom, camTo, 1500);
  await camShot('disco-2', camFrom, camTo, 700);
  CH.setCheat('disco', false);
  // trekker-limo: het model dat het verkeer nu kiest
  info.push('aan: ' + ['trekkerlimo'].map((id) => id + '=' + CH.setCheat(id, true)).join(' '));
  for (let i = 0; i < 80; i++) { CH.updateCheats ? CH.updateCheats(1, w) : null; }
  await sleep(2000);
  const picks = Array.from({ length: 6 }, () => TF.pickTrafficCar(map, rp.x, rp.y));
  info.push('verkeer kiest: ' + JSON.stringify(picks.map((q) => q.model && q.model.name + ' ' + q.model.len)) + ' look ' + JSON.stringify(CM.MODS.look && { swap: CM.MODS.look.swap, n: (CM.MODS.look.palette || []).length }) + ' cars ' + CM.MODS.cars);
  const limoModel = (picks.find((q) => q.model && q.model.name === 'trekkerlimo') || {}).model;
  if (limoModel) {
    const lp = along(15);
    const limo = new VH.Vehicle(lp.x, lp.y, hd, { ...limoModel });
    limo.parked = true; limo.speed = 0; w.vehicles.push(limo);
    await sleep(2500);
    const side = (s, k) => ({ x: lp.x + Math.cos(hd + 1.57) * k + Math.cos(hd) * s, y: lp.y + Math.sin(hd + 1.57) * k + Math.sin(hd) * s });
    await camShot('limo-schuin', { ...side(-7, 6), z: 2.4 }, { ...lp, z: 1.3 });
    await camShot('limo-zij', { ...side(0, 7.5), z: 1.9 }, { ...lp, z: 1.3 });
    CH.setCheat('disco', true);
    await sleep(2000);
    await camShot('limo-disco', { ...side(-7, 6), z: 2.4 }, { ...lp, z: 1.9 });
    CH.setCheat('disco', false);
  }
  CH.setCheat('trekkerlimo', false);
  clearInterval(keepS);
  done.push('streken2');
}

// ---- #207: het sprongetje op de fiets (Ctrl vast, de rem kort aantikken) ----
if (want('sprongetje')) {
  clearInterval(skipper);
  w.clock = 14;
  const VH = await imp('vehicle');
  const home = map.findOpenSpawn(100, 77, 60) || { x: 100, y: 77 };
  const bike = VH.makeTwoWheeler('fiets', home.x, home.y, 0);
  w.vehicles.push(bike);
  teleport(home.x, home.y);
  await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
  await sleep(2500);
  teleport(home.x, home.y);
  p.enterVehicle(bike, w);
  p.angle = 0; w.camYaw = 0;
  await sleep(1500);
  keyEv('keydown', 'Control', 'ControlLeft');
  keyEv('keydown', 'w', 'KeyW');
  await sleep(2600);
  const before = { speed: +(bike.speed || 0).toFixed(1), z: +(bike.z || 0).toFixed(2) };
  keyEv('keydown', ' ', 'Space');
  await sleep(120);
  keyEv('keyup', ' ', 'Space');
  const side = (bike.angle || 0) + Math.PI / 2;
  let maxZ = 0, air = 0;
  for (const [i, ms] of [[1, 120], [2, 220], [3, 260]]) {
    await sleep(ms);
    maxZ = Math.max(maxZ, bike.z || 0);
    if (bike.airborne) air++;
    await follow('sprongetje-' + i, Math.cos(side) * 4.5, Math.sin(side) * 4.5, 1.1, 40);
  }
  info.push('sprongetje ' + JSON.stringify({ before, maxZ: +maxZ.toFixed(2), airFrames: air, hops: bike.wheelieState && bike.wheelieState.hops, airborneNu: !!bike.airborne }));
  keyEv('keyup', 'Control', 'ControlLeft'); keyEv('keyup', 'w', 'KeyW');
  await sleep(800);
  p.exitVehicle(map, w);
  done.push('sprongetje');
}

// ---- #360: buslijn-, trein- en bootlaag op de minimap en de grote kaart ----
if (want('kaartlagen')) {
  clearInterval(skipper);
  w.clock = 14;
  const MV = await imp('mapview');
  const ML = await imp('missionmaplive');
  const TD = await imp('traindrive');
  const RW = await imp('railway');
  const WL = await imp('waterlevels');
  const BA = await imp('boatahead');
  const VH = await imp('vehicle');
  const BT = await imp('boattypes');
  const SJ = D.sidejobs;
  const home = map.findOpenSpawn(100, 77, 60) || { x: 100, y: 77 };
  const holdK = { x: home.x, y: home.y, on: true };
  const keepK = setInterval(() => { if (holdK.on) { p.x = holdK.x; p.y = holdK.y; p.vx = p.vy = 0; } w.clock = 14; }, 50);
  const layerInfo = (name) => { const l = ML.getMissionLayer(w); info.push(name + ' laag ' + (l ? JSON.stringify({ kind: l.kind, items: (l.items || []).length, lines: (l.lines || []).length, areas: (l.areas || []).length, zoom: l.focus || null, notices: l.notice || null }) : 'geen')); };
  const both = async (name, zoom = 5) => {
    await sleep(1500);
    console.log('[capture] kl-' + name + '-mini');
    await sleep(600);
    PM.openPauseMenu('map');
    await sleep(1500);
    MV.setMapView(holdK.x, holdK.y, zoom);
    await sleep(2000);
    console.log('[capture] kl-' + name + '-kaart');
    await sleep(600);
    PM.closePauseMenu();
    await sleep(500);
    done.push('kl-' + name);
  };
  const waitLoad = async () => { await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000); await sleep(2500); };
  teleport(holdK.x, holdK.y);
  await waitLoad();

  // 1 de bus-bijbaan (Stadsbus lijn 3): haltes en route op de kaart
  try {
    const okB = SJ && SJ.start('bus');
    info.push('bus-bijbaan start ' + okB + ' ' + JSON.stringify((SJ && SJ.ctx && SJ.ctx() && { job: SJ.ctx().job.id, vehicle: !!SJ.ctx().vehicle }) || null));
    // de intro van de baas (een filmpje) wegdrukken, dan pas de kaart
    for (let k = 0; k < 14; k++) { await sleep(500); if (cine.isCinematicActive()) cine.skipCinematic(); }
    await sleep(2500);
    const v = SJ && SJ.ctx && SJ.ctx() && SJ.ctx().vehicle;
    if (v) { holdK.on = false; p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(2500); holdK.x = v.x; holdK.y = v.y; }
    layerInfo('bus');
    await both('bus', 4);
    if (SJ) SJ.quit();
    await sleep(1500);
    if (p.inVehicle) p.exitVehicle(map, w);
  } catch (e) { info.push('bus-bijbaan fout ' + e.message); }

  // 2 de machinistdienst: een stilstaande trein bij een halte, instappen en G
  try {
    holdK.on = false;
    const trains = RW.getTrains().filter((t) => t.state === 'dwell' || t.state === 'parked');
    info.push('treinen stil ' + trains.length + ' van ' + RW.getTrains().length);
    const t0 = trains.sort((a, b) => Math.hypot(a.cars[0].x - 100, a.cars[0].y - 77) - Math.hypot(b.cars[0].x - 100, b.cars[0].y - 77))[0];
    if (t0) {
      for (const end of [-1, 1]) {
        if (w.trainDriving) break;
        const [bx, by] = RW.routePoint(t0.route, t0.c + end * (t0.halfLen - 3));
        teleport(bx, by);
        holdK.x = bx; holdK.y = by;
        await sleep(1500);
        for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
        await sleep(3000);
        const SA = await imp('stationtravel');
        info.push('trein-diag state ' + t0.state + ' stop-offmap ' + !!(t0.route.stops[t0.target] || {}).offmap + ' railZ ' + (RW.railZ(bx, by) || 0).toFixed(2) + ' speler gz+z ' + ((w.player.gz || 0) + (w.player.z || 0)).toFixed(2) + ' offMap ' + RW.isOffMap(bx, by, -20) + ' stationPrompt ' + JSON.stringify(SA.stationPrompt(w) && SA.stationPrompt(w).label) + ' afstand ' + Math.hypot(bx - w.player.x, by - w.player.y).toFixed(1) + ' inVehicle ' + !!w.player.inVehicle + ' swim ' + !!w.player.swimming + ' paused ' + !!w.paused);
        const prompt = (await imp('traindrive')).trainPrompt(w);
        info.push('trein einde ' + end + ' @' + Math.round(bx) + ',' + Math.round(by) + ' prompt ' + JSON.stringify(prompt && prompt.label));
        keyEv('keydown', 'e', 'KeyE'); await sleep(120); keyEv('keyup', 'e', 'KeyE');
        await sleep(1500);
      }
      info.push('trein bestuurd ' + !!w.trainDriving);
      if (w.trainDriving) {
        w.wanted = 0; w.wantedDecayTimer = 0;
        keyEv('keydown', 'g', 'KeyG'); await sleep(120); keyEv('keyup', 'g', 'KeyG');
        await sleep(2500);
        holdK.x = p.x; holdK.y = p.y;
        layerInfo('trein');
        await both('trein', 3);
        keyEv('keydown', 'Backspace', 'Backspace'); await sleep(120); keyEv('keyup', 'Backspace', 'Backspace');
        await sleep(800);
        TD.quitTrainDrive(w);
      }
    } else info.push('geen stilstaande trein gevonden');
  } catch (e) { info.push('trein fout ' + e.message); }

  // 3 de boot met een brug op de koers
  try {
    if (w.trainDriving) TD.quitTrainDrive(w);
    holdK.on = false;
    const probe = (x, y, a, d) => ({ x: x - Math.cos(a) * d, y: y - Math.sin(a) * d });
    const level = (q) => (q ? q.level : undefined);
    let spot = null;
    const bridges = (map.roads || []).filter((r) => r.bridge && r.pts && r.pts.length > 1);
    info.push('bruggen in de kaart ' + bridges.length);
    outer: for (const r of bridges) {
      const m = r.pts[Math.floor(r.pts.length / 2)];
      if (Math.hypot(m[0] - 100, m[1] - 77) > 2500) continue;
      const clr = WL.clearanceOver(map, m[0], m[1], level(WL.waterAt(map, m[0], m[1])));
      if (!Number.isFinite(clr)) continue;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const P = probe(m[0], m[1], a, 90);
        if (!WL.waterAt(map, P.x, P.y)) continue;
        let ok = true;
        for (let d = 0; d <= 90; d += 6) { const q = probe(m[0], m[1], a, d); if (!WL.waterAt(map, q.x, q.y)) { ok = false; break; } }
        if (!ok) continue;
        spot = { x: P.x, y: P.y, a, bridge: m, clearance: clr, name: r.name || r.type };
        break outer;
      }
    }
    info.push('boot-brug ' + JSON.stringify(spot && { x: Math.round(spot.x), y: Math.round(spot.y), clearance: +spot.clearance.toFixed(2), name: spot.name }));
    if (spot) {
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(spot.x, spot.y);
      holdK.x = spot.x; holdK.y = spot.y;
      await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
      await sleep(2500);
      const boat = new VH.Vehicle(spot.x, spot.y, spot.a, { ...BT.BOAT_KINDS.sloep });
      boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
      p.enterVehicle(boat, w);
      boat.angle = spot.a;
      await sleep(3000);
      const keepBoat = setInterval(() => { boat.speed = 0; boat.angle = spot.a; boat.x = spot.x; boat.y = spot.y; }, 50);
      layerInfo('boot');
      const ahead = BA.bridgesAhead(boat, (x, y) => WL.clearanceOver(map, x, y, level(WL.waterAt(map, x, y))));
      info.push('bridgesAhead ' + JSON.stringify(ahead.map((b) => ({ c: +b.clearance.toFixed(2), d: Math.round(Math.hypot(b.x - boat.x, b.y - boat.y)) }))) + ' luchtdiepgang ' + WL.airDraftOf(boat));
      await both('boot', 5);
      clearInterval(keepBoat);
      p.exitVehicle(map, w);
    }
  } catch (e) { info.push('boot fout ' + e.message); }
  clearInterval(keepK);
  done.push('kaartlagen');
}

// ---- #207: zwemmen, uit het water klimmen en over een hek springen (eigen hek, zodat er altijd een is) ----
if (want('bewegen2')) {
  clearInterval(skipper);
  w.clock = 14;
  let holdB = null;
  const WL = await imp('waterlevels');
  const PL = await imp('player');
  const BRK = await imp('breakables');
  // een waterkant: een waterpunt met een vaste kant binnen 3 m, in de stad
  let spot = null;
  const wet = (x, y) => !!WL.waterAt(map, x, y);
  for (let r = 30; r < 1600 && !spot; r += 20) {
    for (let a = 0; a < 6.28 && !spot; a += 0.17) {
      const x = 100 + Math.cos(a) * r, y = 77 + Math.sin(a) * r;
      if (!wet(x, y) || w.vehicles.some((v) => v.isBoat && Math.hypot(v.x - x, v.y - y) < 40)) continue;
      for (let b = 0; b < 6.28; b += 0.7854) {
        const cs = PL.findClimbSpot(map, x, y, b, 3.2);
        if (cs && Math.hypot(cs.x - x, cs.y - y) > 1.2 && !cs.bank) { spot = { x, y, b: Math.atan2(cs.y - y, cs.x - x), cs }; break; }
      }
    }
  }
  info.push('klimplek ' + JSON.stringify(spot && { x: Math.round(spot.x), y: Math.round(spot.y), tot: +Math.hypot(spot.cs.x - spot.x, spot.cs.y - spot.y).toFixed(1) }));
  if (spot) {
    holdB = { x: spot.x, y: spot.y };
    teleport(spot.x, spot.y);
    await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
    await sleep(2500);
    const keepW = setInterval(() => { if (holdB && p.water === 'swim') { p.x = holdB.x; p.y = holdB.y; p.vx = p.vy = 0; } }, 50);
    if (p.enterSwim) p.enterSwim();
    p.angle = spot.b; w.camYaw = spot.b;
    await sleep(1800);
    info.push('water ' + p.water + ' z ' + (p.z || 0).toFixed(2));
    const side = spot.b + Math.PI / 2;
    await follow('b2-zwemmen', Math.cos(side) * 3.4, Math.sin(side) * 3.4, 1.4);
    clearInterval(keepW);
    holdB = null;
    // klimmen: de speler pakt de kant (dezelfde stap als de spatie in het spel)
    p.startClimb({ x: spot.cs.x, y: spot.cs.y });
    for (const [i, ms] of [[1, 250], [2, 450], [3, 450], [4, 450]]) {
      await sleep(ms);
      await follow('b2-klimmen-' + i, Math.cos(side) * 3.2, Math.sin(side) * 3.2, 1.2, 30);
    }
    info.push('na klimmen water ' + p.water + ' z ' + (p.z || 0).toFixed(2));
  }
  // over een hek: een eigen hek van 0,95 m op open grond, aanloop met Shift en W, dan Spatie
  const open = map.findOpenSpawn(100, 77, 120) || { x: 100, y: 77 };
  const ox = open.x, oy = open.y;
  const fx = ox + 4, fy = oy;
  BRK.addStaticCollider('post', fx, fy, 0.3, 3, Math.PI / 2, false, 0.95);
  const sc = window.__scene3d;
  const T = sc && sc.THREE;
  let fence = null;
  if (T) {
    fence = new T.Group();
    const wood = new T.MeshLambertMaterial({ color: 0x8a6a44 });
    const g0 = map.groundHeightAt ? map.groundHeightAt(fx, fy, 0) || 0 : 0;
    for (const dz of [-2.9, -1, 1, 2.9]) { const post = new T.Mesh(new T.BoxGeometry(0.12, 1.0, 0.12), wood); post.position.set(fx, g0 + 0.5, fy + dz); fence.add(post); }
    for (const h of [0.45, 0.85]) { const rail = new T.Mesh(new T.BoxGeometry(0.06, 0.08, 5.9), wood); rail.position.set(fx, g0 + h, fy); fence.add(rail); }
    sc.scene.add(fence);
  }
  info.push('hek op ' + Math.round(fx) + ',' + Math.round(fy) + ' mesh ' + !!fence);
  teleport(ox, oy);
  p.angle = 0; w.camYaw = 0;
  await sleep(2500);
  keyEv('keydown', 'Shift', 'ShiftLeft');
  keyEv('keydown', 'w', 'KeyW');
  let vaulted = false;
  for (let i = 0; i < 40 && !vaulted; i++) { await sleep(100); if (Math.hypot(p.x - fx, p.y - fy) < 2.6) { keyEv('keydown', ' ', 'Space'); await sleep(60); keyEv('keyup', ' ', 'Space'); vaulted = true; } }
  for (const [i, ms] of [[1, 120], [2, 220], [3, 220], [4, 260]]) {
    await sleep(ms);
    const sd = Math.PI / 2;
    await follow('b2-hek-' + i, Math.cos(sd) * 5.5, Math.sin(sd) * 5.5, 1.5, 30);
  }
  keyEv('keyup', 'w', 'KeyW'); keyEv('keyup', 'Shift', 'ShiftLeft');
  info.push('hek: vault ' + !!p.vault + ' x ' + (p.x - ox).toFixed(1) + ' z ' + (p.z || 0).toFixed(2));
  await sleep(1500);
  if (fence && sc) sc.scene.remove(fence);
  done.push('bewegen2');
}


// ---- #348: skateboarders, kennismakingsgroepjes en bezorgers in vier wijken, 16:30 (de spawnroute zelf, in een paar minuten gedwongen) ----
if (want('leven348')) {
  clearInterval(skipper);
  w.clock = 16.5;
  const SL = await imp('streetlife');
  const TFL = await imp('trafficfleet');
  const RD = await imp('rdnew');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const pts = (map.meta && map.meta.neighbourhoodPoints) || [];
  const find = (re) => pts.find((q) => re.test(q.name));
  const wijken = [
    ['centrum', { x: 100, y: 77 }],
    ['Paddepoel', find(/Paddepoel/) || (([x, y]) => ({ x, y }))(RD.wgsToWorld(53.2475, 6.5365))],
    ['Sterrebos', find(/Sterrebos|Bisschopskwartier/) || { x: 360, y: 620 }],
    ['Oosterpark', find(/Oosterpark|Florabuurt/) || { x: 1698, y: -673 }],
  ];
  for (const [naam, c] of wijken) {
    const o = map.findOpenSpawn(c.x, c.y, 120) || c;
    const prof = TFL.wijkProfileAt(map, o.x, o.y);
    const keep = setInterval(() => { p.x = o.x; p.y = o.y; p.vx = p.vy = 0; w.clock = 16.5; }, 50);
    teleport(o.x, o.y);
    await sleep(1500);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(3000);
    let sk = 0, og = 0, kr = 0, found = { skater: null, groep: null, bezorger: null };
    for (let r = 0; r < 14; r++) {
      SL.updateStreetLife(61, w);
      await sleep(350);
      for (const q of w.pedestrians) {
        if (q.carry === 'skateboard' && !found.skater) found.skater = q;
        if (q.ontgroening && !found.groep) found.groep = q;
        if (q.carry === 'bezorgtas' && !found.bezorger) found.bezorger = q;
      }
    }
    for (const q of w.pedestrians) { if (q.carry === 'skateboard') sk++; if (q.ontgroening) og++; if (q.carry === 'bezorgtas') kr++; }
    info.push('wijk ' + naam + ' @' + Math.round(o.x) + ',' + Math.round(o.y) + ' profiel ' + prof.key + '/' + prof.wijk + ': skateboarders ' + sk + ', kennismakingsleden ' + og + ', bezorgers ' + kr + ' (14 spawnpogingen)');
    for (const [soort, q] of Object.entries(found)) {
      if (!q) continue;
      const g = gh(q.x, q.y);
      cine.playCinematic({ id: 'vi-leven', duration: 30, priority: 9, shot: () => ({ position: { x: q.x + 4, y: q.y + 4, z: g + 1.8 }, lookAt: { x: q.x, y: q.y, z: g + 0.9 }, cut: true }) });
      await sleep(1500);
      console.log('[capture] leven-' + naam + '-' + soort);
      await sleep(500);
      cine.skipCinematic();
      done.push('leven-' + naam + '-' + soort);
    }
    clearInterval(keep);
  }
  done.push('leven348');
}

// ---- #348: de zeilregatta met bots en tonnen ----
if (want('regatta')) {
  clearInterval(skipper);
  w.clock = 13;
  const R = window.__regatta;
  const BT = await imp('boattypes');
  const VH2 = await imp('vehicle');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  await sleep(1500);
  const ms = R ? R.marinas() : [];
  info.push('jachthavens ' + JSON.stringify(ms.slice(0, 4)));
  const m = ms[0];
  if (m) {
    teleport(m.x, m.y);
    await sleep(1500);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(3000);
    const WL2 = await imp('waterlevels');
    let ws = null;
    for (let r = 20; r < 600 && !ws; r += 15) for (let a = 0; a < 6.28 && !ws; a += 0.25) { const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r; const q = WL2.waterAt(map, x, y); if (q && q.navigable && q.depth > 1.5) ws = { x, y }; }
    info.push('water bij de haven ' + JSON.stringify(ws));
    const kind = BT.BOAT_KINDS.zeil || BT.BOAT_KINDS.zeilboot || Object.values(BT.BOAT_KINDS).find((k) => k.zeil);
    info.push('zeilboot-soort ' + (kind ? kind.name : 'geen') + ' van ' + Object.keys(BT.BOAT_KINDS).join(','));
    if (ws && kind) {
      const boat = new VH2.Vehicle(ws.x, ws.y, 0, { ...kind });
      boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
      p.enterVehicle(boat, w);
      await sleep(2500);
      info.push('start ' + R.start());
      await sleep(6000);
      info.push('state ' + JSON.stringify(R.state()));
      const keepR = setInterval(() => { w.clock = 13; }, 100);
      const bots = w.vehicles.filter((v) => v.isBoat && v !== boat && v.model && v.model.zeil);
      info.push('bots ' + bots.length + ' ' + JSON.stringify(bots.slice(0, 4).map((v) => [Math.round(v.x), Math.round(v.y)])));
      const g = 0;
      const st0 = R.state(), t0 = st0.tonnen[0], t1 = st0.tonnen[1] || t0;
      const ang0 = Math.atan2(t1.y - t0.y, t1.x - t0.x);
      await sleep(8000);
      for (const [name, px, py, up, lx, ly] of [['ton-hoog', t0.x - 30, t0.y - 30, 38, t0.x, t0.y], ['ton-laag', t0.x - Math.cos(ang0) * 45, t0.y - Math.sin(ang0) * 45, 3.2, t0.x, t0.y], ['ton-bots', t0.x - Math.cos(ang0) * 12 + Math.sin(ang0) * 20, t0.y - Math.sin(ang0) * 12 - Math.cos(ang0) * 20, 2.6, t0.x - Math.cos(ang0) * 18, t0.y - Math.sin(ang0) * 18]]) {
        cine.playCinematic({ id: 'vi-regatta', duration: 30, priority: 9, shot: () => ({ position: { x: px, y: py, z: up }, lookAt: { x: lx, y: ly, z: 0.5 }, cut: true }) });
        await sleep(2600);
        console.log('[capture] regatta-' + name);
        await sleep(500);
        cine.skipCinematic();
        done.push('regatta-' + name);
      }
      clearInterval(keepR);
      R.quit();
      p.exitVehicle(map, w);
    }
  }
  done.push('regatta');
}


clearInterval(skipper);
return done.concat(info);
