// Scenes voor de beeldcontrole van #348 (Der Aa-kerk, winkelborden in de profielsteden): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s9.js --only=aakerk,borden
// Basis: scripts/ui/shots_scenes_r43.js.
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

// ---- #348: Der Aa-kerk, de oriëntatie van het interieur ten opzichte van de buitenkant (#22) ----
if (want('aakerk')) {
  clearInterval(skipper);
  w.clock = 14;
  const IP = await imp('interieurplan');
  const it = IP.INTERIEUREN.find((q) => q.id === 'aakerk');
  const room = (id) => it.rooms.find((q) => q.id === id);
  const sc = room('schip'), th = room('torenhal'), pz = room('portaalZ'), pn = room('portaalN');
  info.push('kamers ' + JSON.stringify(it.rooms.map((q) => [q.id, Math.round(q.cx), Math.round(q.cy)])) + ' as (' + sc.ux.toFixed(2) + ',' + sc.uy.toFixed(2) + ')');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const keepA = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; }, 50);
  hold = { x: sc.cx, y: sc.cy };
  teleport(sc.cx, sc.cy);
  await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
  await sleep(3000);
  const bs = map.buildingsNear(sc.cx, sc.cy, 25).filter((b) => b.landmark === 'Der Aa-kerk' || b.interior);
  info.push('kerk-gebouw ' + bs.map((b) => (b.name || b.landmark) + ' interieur ' + !!b.interior + ' pts ' + (b.pts ? b.pts.length : 0)).join(' | '));
  const cam = async (name, from, to, wait = 2200) => {
    const gz = gh(sc.cx, sc.cy);
    const pose = { position: { x: from[0], y: from[1], z: gz + from[2] }, lookAt: { x: to[0], y: to[1], z: gz + to[2] }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-aakerk', duration: 60, priority: 9, shot: () => pose });
    await sleep(wait);
    console.log('[capture] aakerk-' + name);
    await sleep(500);
    cine.skipCinematic();
    done.push('aakerk-' + name);
  };
  const loc = (r, a, c) => [r.cx + a * r.ux - c * r.uy, r.cy + a * r.uy + c * r.ux];
  // binnen: vanuit het schip naar de torenhal en terug naar het koor
  await cam('binnen-torenhal', [...loc(sc, -8, 0), 1.7], [...loc(th, 0, 0), 1.7]);
  await cam('binnen-koor', [...loc(sc, 10, 0), 1.7], [...loc(room('koor'), 0, 0), 1.7]);
  // buiten: vanaf de torenkant, vanaf de zuidkant (de wereld-zuid van de kerk), hoog schuin
  const away = (r, k) => [r.cx - r.uy * k, r.cy + r.ux * k];
  await cam('buiten-toren', [...loc(th, 38, 0), 4.5], [...loc(th, 0, 0), 8]);
  await cam('buiten-zijde-c-min', [...loc(sc, 0, -50), 5], [...loc(sc, 0, 0), 6]);
  await cam('buiten-hoog', [...loc(sc, 55, -55), 45], [...loc(sc, 0, 0), 0]);
  info.push('portaalZ ' + JSON.stringify(loc(pz, 0, 0).map(Math.round)) + ' portaalN ' + JSON.stringify(loc(pn, 0, 0).map(Math.round)) + ' torenhal ' + JSON.stringify(loc(th, 0, 0).map(Math.round)) + ' koor ' + JSON.stringify(loc(room('koor'), 0, 0).map(Math.round)));
  clearInterval(keepA);
  hold = null;
  done.push('aakerk');
}

// ---- #348: de winkelborden (#156, #67) in de profielsteden ----
if (want('borden')) {
  clearInterval(skipper);
  w.clock = 14;
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const SS3 = await imp('shopsigns3d');
  const keepB = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; if (cine.isCinematicActive() && !hold) cine.skipCinematic(); }, 50);
  for (const naam of ['Delfzijl', 'Appingedam', 'Winschoten', 'Zoutkamp']) {
    const q = idx && idx.global.places.find((z) => z.name === naam && z.kind !== 'suburb');
    if (!q) { info.push(naam + ': plaats niet in de index'); continue; }
    hold = { x: q.x, y: q.y };
    teleport(q.x, q.y);
    await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
    await sleep(4000);
    const bs = map.buildingsNear(q.x, q.y, 220).filter((b) => b.shopFront && b.shopFront.name);
    info.push(naam + ' @' + Math.round(q.x) + ',' + Math.round(q.y) + ': ' + bs.length + ' panden met winkelnaam: ' + bs.slice(0, 6).map((b) => b.shopFront.name).join(', '));
    let n = 0;
    for (const b of bs.sort((a, c) => Math.hypot(a.shopFront.ax - q.x, a.shopFront.ay - q.y) - Math.hypot(c.shopFront.ax - q.x, c.shopFront.ay - q.y)).slice(0, 14)) {
      if (n >= 2) break;
      const f = b.shopFront, mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2;
      const pointIn = (x, y, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
      let dist = 0, cx = mx, cy = my;
      for (const dd of [7, 5.5, 4.5, 3.5]) {
        const tx = mx + f.nx * dd, ty = my + f.ny * dd;
        if (!map.buildingsNear(tx, ty, 6).some((z) => z.pts && pointIn(tx, ty, z.pts))) { dist = dd; cx = tx; cy = ty; break; }
      }
      if (!dist) continue;
      hold = { x: cx, y: cy };
      teleport(cx, cy);
      await sleep(3500);
      const g = gh(mx, my);
      const pose = { position: { x: cx, y: cy, z: g + 2.2 }, lookAt: { x: mx, y: my, z: g + 2.4 }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      cine.playCinematic({ id: 'vi-bord', duration: 60, priority: 9, shot: () => pose });
      await sleep(2400);
      console.log('[capture] bord-' + naam + '-' + n);
      await sleep(500);
      cine.skipCinematic();
      info.push('bord ' + naam + ' ' + n + ': "' + f.name + '" ' + f.type + ' borden in beeld ' + SS3.shopSignCount() + ' camera ' + dist + ' m');
      done.push('bord-' + naam + '-' + n);
      n++;
    }
  }
  clearInterval(keepB);
  hold = null;
  done.push('borden');
}

// ---- #404: de reclametaxi met dakbord, tekstband en tekstballon ----
if (want('reklametaxi')) {
  clearInterval(skipper);
  w.clock = 14;
  const TF = await imp('trafficfleet');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const home = map.findOpenSpawn(100, 77, 60) || { x: 100, y: 77 };
  const keepT = setInterval(() => { p.x = home.x; p.y = home.y; p.vx = p.vy = 0; w.clock = 14; }, 50);
  teleport(home.x, home.y);
  await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000);
  const rp = map.nearestRoadPoint(home.x + 60, home.y, 120, true);
  info.push('weg voor de taxi ' + JSON.stringify(rp && { x: Math.round(rp.x), y: Math.round(rp.y), d: Math.round(Math.hypot(rp.x - home.x, rp.y - home.y)) }));
  const taxi = VH.spawnVehicleOnRoad(map, rp.road, false, Math.random, false, false, rp, false, { ...TF.carModel('taxi', Math.random), color: '#e8e6e0' });
  TF.applyFleetFlags(taxi, 'taxi');
  w.vehicles.push(taxi);
  info.push('taxi ' + Math.round(taxi.x) + ',' + Math.round(taxi.y) + ' afstand ' + Math.round(Math.hypot(taxi.x - home.x, taxi.y - home.y)) + ' snelheid ' + (taxi.speed || 0).toFixed(1));
  await sleep(1500);
  window.__reklametaxi.nu();
  for (let i = 0; i < 30 && !window.__reklametaxi.staat().taxi; i++) { taxi.speed = Math.max(taxi.speed || 0, 6); await sleep(500); }
  info.push('staat na start ' + JSON.stringify(window.__reklametaxi.staat()));
  // de taxi blijft in beeld staan voor de opnames
  const keepV = setInterval(() => { taxi.speed = 0.4; }, 50);
  await sleep(3500);
  info.push('staat 3,5 s later ' + JSON.stringify(window.__reklametaxi.staat()));
  const cam = async (naam, dx, dy, dz, tz, wait = 1800) => {
    const g = gh(taxi.x, taxi.y);
    const pose = { position: { x: taxi.x + dx, y: taxi.y + dy, z: g + dz }, lookAt: { x: taxi.x, y: taxi.y, z: g + tz }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-reklame', duration: 30, priority: 9, shot: () => pose });
    await sleep(wait);
    console.log('[capture] reklametaxi-' + naam);
    await sleep(500);
    cine.skipCinematic();
    done.push('reklametaxi-' + naam);
  };
  await cam('schuin', 6, 5, 2.6, 1.7);
  await cam('bord', 0, 4.2, 2.2, 1.9);
  await cam('ver', 18, 10, 3.5, 1.5);
  info.push('staat aan het eind ' + JSON.stringify(window.__reklametaxi.staat()));
  clearInterval(keepV);
  clearInterval(keepT);
  done.push('reklametaxi');
}

clearInterval(skipper);
return done.concat(info);
