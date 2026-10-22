// Scenes voor #207 (animaties): zwemmen, klimmen uit het water, over een hek springen en fietstrucs (wheelie, zonder handen, stoppie).
// node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6.js --only=fietstrucs,zwemklim,hek --sizes=1280x720
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
  for (let i = 0; i < 9; i++) {
    await sleep(350);
    const st = state(bike);
    log.push(JSON.stringify(st));
    if (st.up && !got.wheelie) { got.wheelie = 1; await follow('fiets-wheelie', Math.cos(side()) * 3.6, Math.sin(side()) * 3.6, 1.0, 30); }
    if (st.hands > 0.9 && !got.hands) { got.hands = 1; await follow('fiets-zonderhanden', Math.cos(side()) * 3.6, Math.sin(side()) * 3.6, 1.0, 30); }
  }
  info.push('trucs ' + log.join(' '));
  // stoppie: gas los, Ctrl blijft vast, de rem (Spatie) erin
  keyEv('keyup', 'w', 'KeyW');
  keyEv('keydown', ' ', 'Space');
  for (let i = 0; i < 6; i++) {
    await sleep(160);
    const st = state(bike);
    info.push('stoppie ' + JSON.stringify(st));
    if (st.nose && !got.nose) { got.nose = 1; await follow('fiets-stoppie', Math.cos(side()) * 3.4, Math.sin(side()) * 3.4, 1.0, 30); }
  }
  keyEv('keyup', ' ', 'Space'); keyEv('keyup', 'Control', 'ControlLeft');
  await sleep(600);
  p.exitVehicle(map, w);
  done.push('fietstrucs');
}

// ---- zwemmen en uit het water klimmen ----
if (want('zwemklim')) {
  clearInterval(skipper);
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
    const keepW = setInterval(() => { if (holdB && p.water === 'swim') { p.x = holdB.x; p.y = holdB.y; p.vx = p.vy = 0; } }, 50);
    if (p.enterSwim) p.enterSwim();
    p.angle = spot.b; w.camYaw = spot.b;
    await sleep(1800);
    info.push('water ' + p.water + ' tilt ' + (p.swimTilt || 0).toFixed(2));
    const side = spot.b + Math.PI / 2;
    await follow('zwem-stil', Math.cos(side) * 2.6, Math.sin(side) * 2.6, 0.9);
    // zwemmen in beweging: de bewaker laat los en W beweegt
    holdB = null;
    keyEv('keydown', 'w', 'KeyW');
    await sleep(600);
    info.push('zwemt ' + JSON.stringify({ vx: +p.vx.toFixed(1), water: p.water }));
    await follow('zwem-beweging', Math.cos(side) * 2.6, Math.sin(side) * 2.6, 0.9, 30);
    keyEv('keyup', 'w', 'KeyW');
    clearInterval(keepW);
    p.x = spot.x; p.y = spot.y;
    await sleep(300);
    p.startClimb({ x: spot.cs.x, y: spot.cs.y });
    for (const [i, ms] of [[1, 150], [2, 150], [3, 150], [4, 200]]) {
      await sleep(ms);
      await follow('klim-' + i, Math.cos(side) * 2.8, Math.sin(side) * 2.8, 1.1, 20);
    }
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
  for (const [i, ms] of [[1, 60], [2, 110], [3, 110], [4, 140]]) {
    await sleep(ms);
    await follow('hek-' + i, 0.3, 4.6, 1.2, 20);
  }
  keyEv('keyup', 'w', 'KeyW');
  info.push('hek na: x ' + (p.x - ox).toFixed(1) + ' z ' + (p.z || 0).toFixed(2));
  await sleep(800);
  if (fence && sc) sc.scene.remove(fence);
  done.push('hek');
}


clearInterval(skipper);
return done.concat(info);
