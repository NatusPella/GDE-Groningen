// Scenes voor #207 (animaties) en #397 (vliegschool) en #397 (vliegschool): zwemmen, klimmen uit het water, over een hek springen en fietstrucs (wheelie, zonder handen, stoppie).
// node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6.js --only=fietstrucs,stoppie,zwemklim,hek --sizes=1280x720
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
  // de camera hangt aan de voeten van de speler; in het water (p.z negatief, de gracht ligt onder de kade) mee omlaag
  const g = (typeof p.gz === 'number' ? p.gz : (map.groundHeightAt ? map.groundHeightAt(p.x, p.y, 0) || 0 : 0)) + Math.min(0, p.z || 0);
  const pose = { position: { x: p.x + dx, y: p.y + dy, z: g + dz }, lookAt: { x: p.x, y: p.y, z: g + 0.9 }, cut: true };
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'vi-bew', duration: 30, priority: 9, shot: () => pose });
  await sleep(wait);
  if (cine.cinematicPoseIssues) { const pi = cine.cinematicPoseIssues(); if (pi.length) info.push('pose ' + name + ' ' + JSON.stringify(pi).slice(0, 200)); }
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  done.push(name);
};

const settle = async () => { await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000); await sleep(2500); };
const state = (b) => { const s = b.wheelieState || {}; return { v: +(b.speed || 0).toFixed(1), pitch: +(b.pitch || 0).toFixed(2), up: !!s.up, nose: !!s.nose, hands: +(s.hands || 0).toFixed(2), z: +(b.z || 0).toFixed(2) }; };

// ---- fietstrucs: wheelie, zonder handen (Ctrl vast en doortrappen), stoppie (Ctrl en de rem) ----
if (want('fietstrucs')) {
  clearInterval(skipper);
  w.clock = 14;
  const home = map.findOpenSpawn(100, 77, 80) || { x: 100, y: 77 };
  const bike = VH.makeTwoWheeler('fiets', home.x, home.y, 0);
  w.vehicles.push(bike);
  teleport(home.x, home.y);
  await settle();
  teleport(home.x, home.y);
  p.enterVehicle(bike, w);
  p.angle = 0; w.camYaw = 0;
  await sleep(1500);
  const side = () => (bike.angle || 0) + Math.PI / 2;
  keyEv('keydown', 'Control', 'ControlLeft');
  keyEv('keydown', 'w', 'KeyW');
  const log = [];
  const got = {};
  for (let i = 0; i < 16; i++) {
    await sleep(350);
    const st = state(bike);
    log.push(JSON.stringify(st));
    if (st.up && !got.wheelie) {
      got.wheelie = 1;
      await follow('fiets-wheelie', Math.cos(side()) * 3.6, Math.sin(side()) * 3.6, 1.0, 30);
      bike.speed = 5.8; // de baan is kort: meteen op de snelheid voor zonder handen (boven driekwart van 7 m/s)
      info.push('snelheid op 5,8 gezet');
    }
    if (st.hands > 0.9 && !got.hands) { got.hands = 1; await follow('fiets-zonderhanden', Math.cos(side()) * 3.6, Math.sin(side()) * 3.6, 1.0, 30); }
  }
  info.push('trucs ' + log.join(' '));

  keyEv('keyup', 'w', 'KeyW'); keyEv('keyup', 'Control', 'ControlLeft');
  await sleep(600);
  p.exitVehicle(map, w);
  done.push('fietstrucs');
}

// ---- stoppie: Ctrl en de rem (Spatie) boven 3,5 m/s; de snelheid wordt voor de opname vastgehouden ----
if (want('stoppie')) {
  clearInterval(skipper);
  w.clock = 14;
  const home = map.findOpenSpawn(100, 77, 80) || { x: 100, y: 77 };
  const bike = VH.makeTwoWheeler('fiets', home.x, home.y, 0);
  w.vehicles.push(bike);
  teleport(home.x, home.y);
  await settle();
  teleport(home.x, home.y);
  p.enterVehicle(bike, w);
  p.angle = 0; w.camYaw = 0;
  await sleep(1500);
  const side = () => (bike.angle || 0) + Math.PI / 2;
  bike.speed = 5.5;
  keyEv('keydown', 'Control', 'ControlLeft');
  keyEv('keydown', ' ', 'Space');
  const hold = setInterval(() => { if (bike.speed > 0 && bike.speed < 5) bike.speed = 5; }, 50);
  const got = {};
  for (let i = 0; i < 8; i++) {
    await sleep(120);
    const st = state(bike);
    info.push('stoppie ' + JSON.stringify(st));
    if (st.nose && !got.nose) { got.nose = 1; await follow('fiets-stoppie', Math.cos(side()) * 3.4, Math.sin(side()) * 3.4, 1.0, 30); }
  }
  clearInterval(hold);
  keyEv('keyup', ' ', 'Space'); keyEv('keyup', 'Control', 'ControlLeft');
  await sleep(600);
  p.exitVehicle(map, w);
  done.push('stoppie');
}

// ---- zwemmen en uit het water klimmen ----
if (want('zwemklim')) {
  w.clock = 14;
  let holdB = null;
  const WL = await imp('waterlevels');
  const PL = await imp('player');
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
    await settle();
    clearInterval(skipper);
    const keepW = setInterval(() => { if (holdB && p.water === 'swim') { p.x = holdB.x; p.y = holdB.y; p.vx = p.vy = 0; } }, 50);
    if (p.enterSwim) p.enterSwim();
    p.angle = spot.b; w.camYaw = spot.b;
    await sleep(1800);
    info.push('water ' + p.water + ' tilt ' + (p.swimTilt || 0).toFixed(2) + ' gz ' + (p.gz || 0).toFixed(2) + ' z ' + (p.z || 0).toFixed(2) + ' wade ' + (p.wade || 0).toFixed(2));
    const side = spot.b + Math.PI / 2;
    // de gewone spelcamera (een cinematic-camera in de gracht wordt door de kade omhoog gedrukt); de speler kijkt naar de kant
    const snap = async (name, wait = 700) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
    w.camYaw = spot.b + Math.PI / 2;
    await snap('zwem-stil');
    holdB = null;
    keyEv('keydown', 'w', 'KeyW');
    await sleep(900);
    info.push('zwemt ' + JSON.stringify({ vx: +p.vx.toFixed(1), water: p.water }));
    await snap('zwem-beweging', 100);
    keyEv('keyup', 'w', 'KeyW');
    clearInterval(keepW);
    p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0;
    await sleep(300);
    p.startClimb({ x: spot.cs.x, y: spot.cs.y });
    // het klimmen duurt 0,6 s, korter dan een opname: de voortgang wordt per beeld vastgezet
    for (const k of [0.15, 0.4, 0.65, 0.9]) {
      const iv = setInterval(() => { if (p.climb) p.climb.t = k * 0.6; }, 8);
      await snap('klim-' + Math.round(k * 100), 400);
      clearInterval(iv);
    }
    await sleep(1200);
    info.push('na klimmen water ' + p.water + ' z ' + (p.z || 0).toFixed(2));
  }
  done.push('zwemklim');
}

// ---- over een hek: een eigen hek van 0,95 m op open grond, aanloop met W, dan Spatie ----
if (want('hek')) {
  clearInterval(skipper);
  w.clock = 14;
  const BRK = await imp('breakables');
  const open = map.findOpenSpawn(100, 77, 120) || { x: 100, y: 77 };
  const ox = open.x, oy = open.y;
  const fx = ox + 5, fy = oy;
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
  await settle();
  teleport(ox, oy);
  p.angle = 0; w.camYaw = 0;
  await sleep(500);
  keyEv('keydown', 'w', 'KeyW');
  let seen = 0;
  for (let i = 0; i < 80 && !p.vault; i++) {
    await sleep(40);
    if (fx - p.x < 1.3 && !seen) { seen = 1; keyEv('keydown', ' ', 'Space'); await sleep(50); keyEv('keyup', ' ', 'Space'); }
  }
  info.push('hek: vault ' + !!p.vault + ' x ' + (p.x - ox).toFixed(1) + ' z ' + (p.z || 0).toFixed(2));
  if (p.vault) { p.vault.time = 3.6; keyEv('keyup', 'w', 'KeyW'); } // de sprong in slow motion; de pose hangt aan de voortgang u
  for (let i = 1; i <= 5; i++) {
    await follow('hek-' + i, 0.3, 4.2, 1.1, 10);
    info.push('hek ' + i + ' u ' + (p.vaultU || 0).toFixed(2) + ' z ' + (p.z || 0).toFixed(2));
  }
  keyEv('keyup', 'w', 'KeyW');
  info.push('hek na: x ' + (p.x - ox).toFixed(1) + ' z ' + (p.z || 0).toFixed(2));
  await sleep(800);
  if (fence && sc) sc.scene.remove(fence);
  done.push('hek');
}

// ---- zwemstand op droog land (poseproef: de gracht heeft geen bruikbare camera, zie zwemklim) ----
if (want('zwempose')) {
  clearInterval(skipper);
  w.clock = 14;
  const open = map.findOpenSpawn(100, 77, 120) || { x: 100, y: 77 };
  teleport(open.x, open.y);
  p.angle = 0; w.camYaw = 0;
  await settle();
  teleport(open.x, open.y);
  // de stand hangt aan player.swimming; op het droge zet het spel dat terug, dus elke 5 ms opnieuw
  const force = setInterval(() => { p.swimming = true; p.swimTilt = -0.85; }, 5);
  await sleep(500);
  keyEv('keydown', 'w', 'KeyW');
  for (const i of [1, 2, 3]) { await sleep(300); await follow('zwempose-' + i, 0.3, 3.2, 0.7, 30); }
  keyEv('keyup', 'w', 'KeyW');
  await sleep(600);
  await follow('zwempose-stil', 0.3, 3.2, 0.7, 30);
  clearInterval(force);
  p.swimming = false; p.swimTilt = 0;
  await sleep(500);
  done.push('zwempose');
}

// ---- op een autodak klimmen (de klimstand; de klim in slow motion) ----
if (want('autodak')) {
  clearInterval(skipper);
  w.clock = 14;
  const open = map.findOpenSpawn(100, 77, 120) || { x: 100, y: 77 };
  const car = new VH.Vehicle(open.x + 8, open.y, 0, { name: 'sedan', len: 4.4, wid: 1.8, maxSpeed: 30, accel: 6, brake: 12, turnRate: 1.6, color: '#c0c0c0' });
  car.parked = true; car.speed = 0; w.vehicles.push(car);
  teleport(open.x, open.y);
  p.angle = 0; w.camYaw = 0;
  await settle();
  teleport(open.x, open.y);
  p.angle = 0; w.camYaw = 0;
  await sleep(500);
  keyEv('keydown', 'w', 'KeyW');
  for (let i = 0; i < 80 && !p.vault; i++) {
    await sleep(40);
    if (!p.vault && car.x - p.x < 3.2 && !p.__jumped) { p.__jumped = true; keyEv('keydown', ' ', 'Space'); await sleep(50); keyEv('keyup', ' ', 'Space'); }
  }
  info.push('autodak: vault ' + (p.vault ? (p.vault.climb ? 'klim' : 'sprong') : 'nee') + ' x ' + (p.x - open.x).toFixed(1));
  if (p.vault) { p.vault.time = 3.6; keyEv('keyup', 'w', 'KeyW'); }
  for (let i = 1; i <= 4; i++) { await follow('autodak-' + i, 0.3, 5.0, 1.3, 10); info.push('autodak ' + i + ' u ' + (p.vaultU || 0).toFixed(2) + ' z ' + (p.z || 0).toFixed(2)); }
  keyEv('keyup', 'w', 'KeyW');
  await sleep(1500);
  const ci = w.vehicles.indexOf(car); if (ci >= 0) w.vehicles.splice(ci, 1);
  done.push('autodak');
}

// ---- #397: de vliegschool: het menu met echte toetsen, daarna elke les met de piloot uit de regels (ook echte toetsen) ----
// node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6.js --only=vliegschool --types=vt-ringen,hk-landen --sizes=1280x720 --timeout=1500
if (want('vliegschool')) {
  clearInterval(skipper);
  w.clock = 14;
  const VR = await imp('vliegschoolrules');
  const ACH = await imp('achievements');
  const ids = (window.__shotsTypes || 'vt-ringen').split(',').filter(Boolean);
  const A = window.__activities.get('vliegschool');
  const V = window.__vliegschool;
  const sp = A.spots()[0];
  info.push('vliegschool plek ' + Math.round(sp.x) + ',' + Math.round(sp.y) + ' geladen ' + V.geladen());
  teleport(sp.x, sp.y);
  await settle();
  teleport(sp.x, sp.y);
  await sleep(1500);
  info.push('prompt ' + JSON.stringify(A.prompt(w)).slice(0, 140));
  await follow('vs-school', 6, 6, 2.2, 30);
  await press('e', 'KeyE', 120);
  await sleep(700);
  info.push('menu actief ' + A.active());
  await shot('vs-menu', 200);
  const KEYMAP = { w: ['w', 'KeyW'], s: ['s', 'KeyS'], a: ['a', 'KeyA'], d: ['d', 'KeyD'], spatie: [' ', 'Space'], ctrl: ['Control', 'ControlLeft'], shift: ['Shift', 'ShiftLeft'] };
  const held = new Set();
  const zetToetsen = (k) => {
    for (const name of Object.keys(KEYMAP)) {
      const aan = !!k[name], was = held.has(name);
      if (aan && !was) { keyEv('keydown', KEYMAP[name][0], KEYMAP[name][1]); held.add(name); }
      else if (!aan && was) { keyEv('keyup', KEYMAP[name][0], KEYMAP[name][1]); held.delete(name); }
    }
  };
  let eerste = true;
  for (const id of ids) {
    const les = VR.lesVan(id);
    if (eerste) {
      // de eerste les kiest de speler met toetsen: 1 = vliegtuig, 2 = helikopter, dan het cijfer van de les
      const lijst = VR.lessenVan(les.kist);
      await press(les.kist === 'vliegtuig' ? '1' : '2', les.kist === 'vliegtuig' ? 'Digit1' : 'Digit2', 120);
      await sleep(500);
      await shot('vs-menu-' + les.kist, 200);
      const n = lijst.findIndex((l) => l.id === id) + 1;
      await press(String(n), 'Digit' + n, 120);
      await sleep(800);
      eerste = false;
    } else V.start(id);
    let st = V.state();
    info.push(id + ' gestart: ' + (st ? st.fase : 'niets'));
    if (!st || st.fase === 'menu') { info.push(id + ' kon niet starten'); continue; }
    const t0 = performance.now();
    let k = 0, laatsteLog = 0, fase0 = null;
    while (performance.now() - t0 < 360000) {
      st = V.state();
      if (!st || st.fase === 'menu') break;
      const nu = (performance.now() - t0) / 1000;
      if (st.fase === 'intro' && nu > 1.2 && !fase0) { fase0 = 1; await shot('vs-' + id + '-intro', 100); }
      if (st.fase === 'vlieg') {
        zetToetsen(VR.piloot(les, st.baan, st.st, st.c, {}));
        if (nu - laatsteLog > 8) {
          laatsteLog = nu;
          info.push(id + ' t=' + nu.toFixed(0) + ' x=' + Math.round(st.c.x) + ' y=' + Math.round(st.c.y) + ' agl=' + st.c.agl.toFixed(0) + ' v=' + st.c.speed.toFixed(0) + ' i=' + st.st.i + ' goed=' + st.st.goed + ' fout=' + st.st.fout);
          if (k < 3) { k++; await shot('vs-' + id + '-' + k, 50); }
        }
      } else zetToetsen({});
      await sleep(60);
    }
    zetToetsen({});
    await sleep(1500);
    await shot('vs-' + id + '-uitslag', 100);
    const rec = ACH.getChallengeRecord('vlieg-' + id);
    info.push(id + ' uitslag ' + JSON.stringify(rec) + ' geld ' + Math.round(w.money));
  }
  zetToetsen({});
  await sleep(500);
  V.quit();
  info.push('na afloop actief ' + A.active() + ' in voertuig ' + !!p.inVehicle);
  done.push('vliegschool');
}

// ---- #397: telemetrie van een les (debuggen van een vlucht): positie, snelheid, toetsen en elke melding van het spel ----
if (want('vliegdebug')) {
  clearInterval(skipper);
  w.clock = 14;
  const VR = await imp('vliegschoolrules');
  const id = (window.__shotsTypes || 'hk-nood').split(',')[0];
  const A = window.__activities.get('vliegschool');
  const V = window.__vliegschool;
  const sp = A.spots()[0];
  teleport(sp.x, sp.y);
  await settle();
  teleport(sp.x, sp.y);
  await sleep(1500);
  const msgs = [];
  const add0 = w.addMessage.bind(w);
  w.addMessage = (t, ...r) => { msgs.push(((performance.now() - T0) / 1000).toFixed(1) + ' ' + String(t).slice(0, 80)); return add0(t, ...r); };
  const les = VR.lesVan(id);
  V.start(id);
  const T0 = performance.now();
  const KEYMAP = { w: ['w', 'KeyW'], s: ['s', 'KeyS'], a: ['a', 'KeyA'], d: ['d', 'KeyD'], spatie: [' ', 'Space'], ctrl: ['Control', 'ControlLeft'], shift: ['Shift', 'ShiftLeft'] };
  const held = new Set();
  const zet = (k) => { for (const n of Object.keys(KEYMAP)) { const aan = !!k[n], was = held.has(n); if (aan && !was) { keyEv('keydown', KEYMAP[n][0], KEYMAP[n][1]); held.add(n); } else if (!aan && was) { keyEv('keyup', KEYMAP[n][0], KEYMAP[n][1]); held.delete(n); } } };
  let last = null, n = 0;
  while (performance.now() - T0 < 150000) {
    const st = V.state();
    if (!st || st.fase === 'menu') break;
    if (st.fase === 'vlieg') {
      const k = VR.piloot(les, st.baan, st.st, st.c, {});
      zet(k);
      const c = st.c;
      if (last && Math.hypot(c.x - last.x, c.y - last.y) > 120) info.push('SPRONG ' + Math.round(Math.hypot(c.x - last.x, c.y - last.y)) + ' m van ' + Math.round(last.x) + ',' + Math.round(last.y) + ' naar ' + Math.round(c.x) + ',' + Math.round(c.y));
      last = { x: c.x, y: c.y };
      if ((n++ % 8) === 0) info.push(((performance.now() - T0) / 1000).toFixed(1) + ' x' + Math.round(c.x) + ' y' + Math.round(c.y) + ' z' + c.agl.toFixed(0) + ' v' + c.speed.toFixed(1) + ' h' + c.heading.toFixed(2) + ' ' + Object.keys(k).filter((q) => k[q]).join('+') + ' tijd' + st.st.t.toFixed(0));
    } else zet({});
    await sleep(60);
  }
  zet({});
  info.push('meldingen: ' + msgs.join(' | '));
  V.quit();
  done.push('vliegdebug');
}

clearInterval(skipper);
return done.concat(info);
