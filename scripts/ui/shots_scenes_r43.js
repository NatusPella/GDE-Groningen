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
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(2500);
    const bs = map.buildingsNear(o.x, o.y, 160).filter((b) => b.shopFront);
    const types = {};
    for (const b of bs) types[b.shopFront.type || '?'] = (types[b.shopFront.type || '?'] || 0) + 1;
    info.push('kraam-zoek @' + Math.round(o.x) + ',' + Math.round(o.y) + ' voorgevels ' + bs.length + ' ' + JSON.stringify(types));
    found = bs.find((b) => b.shopFront.type === 'kermiskraam' && !b.shopFront.poi);
    if (found) break;
  }
  if (found) {
    const f = found.shopFront, mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2;
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
  w.clock = 20.2; // schemering: de lichtjes vallen op
  const CH = await imp('cheats');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  info.push('aan: ' + ['trekkerlimo', 'disco', 'spiegelstad'].map((id) => id + '=' + CH.setCheat(id, true)).join(' '));
  const rp = map.nearestRoadPoint(100, 77, 500, true) || { x: 100, y: 77 };
  const keepS = setInterval(() => { p.x = rp.x; p.y = rp.y; p.vx = p.vy = 0; w.clock = 20.2; }, 50);
  teleport(rp.x, rp.y);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(70000);
  if (cine.isCinematicActive()) cine.skipCinematic();
  console.log('[capture] streken2-spiegel-hud');
  await sleep(1500);
  const cars = w.vehicles.filter((v) => !v.isBike && !v.isScooter && !v.isBoat && !v.isHeroCar && v.model && Math.hypot(v.x - p.x, v.y - p.y) < 90 && !v.parked);
  const limos = cars.filter((v) => v.model.name === 'trekkerlimo');
  info.push('auto’s dichtbij ' + cars.length + ', limo’s ' + limos.length + ' modellen ' + JSON.stringify([...new Set(cars.map((v) => v.model.name))]));
  const car = (limos[0] || cars.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]);
  if (car) {
    const g = gh(car.x, car.y);
    const keepC = setInterval(() => { car.speed = 0; }, 50);
    for (const [name, dx, dy, up] of [['limo-schuin', 6, 6, 2.6], ['limo-zij', 0, 7.5, 1.9]]) {
      cine.playCinematic({ id: 'vi-limo', duration: 30, priority: 9, shot: () => ({ position: { x: car.x + dx, y: car.y + dy, z: g + up }, lookAt: { x: car.x, y: car.y, z: g + 1.4 }, cut: true }) });
      await sleep(2200);
      console.log('[capture] streken2-' + name);
      await sleep(500);
      cine.skipCinematic();
    }
    clearInterval(keepC);
  }
  for (const id of ['trekkerlimo', 'disco', 'spiegelstad']) CH.setCheat(id, false);
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
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
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

clearInterval(skipper);
return done.concat(info);
