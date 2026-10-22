// Scenes voor #403 (vrijgezellenfeestjes). node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6c.js --only=vrijgezellen --sizes=1280x720
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
// een vaste camera (geen volgcamera): positie en kijkpunt in wereldcoördinaten (z omhoog)
const pose = async (name, pos, at, wait = 300) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'sf-pose', duration: 30, priority: 9, shot: () => ({ position: pos, lookAt: at, cut: true }) });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  done.push(name);
};

// ---- #403: vrijgezellenfeestjes: een bruid en vrolijk verklede gasten, lopend en juichend, op zaterdagavond in het centrum ----
if (want('vrijgezellen')) {
  clearInterval(skipper);
  const SLm = await imp('streetlife');
  const PEm = await imp('pedestrians');
  const CAL = await imp('calendar');
  // een zaterdag: de kalenderdag zoeken die op zaterdag valt
  let dag = w.calendar.day;
  for (let i = 0; i < 8 && CAL.weekdayOf(dag) !== 6; i++) dag++;
  w.calendar.day = dag;
  w.clock = 21;
  const home = map.findOpenSpawn(191.86, 138.11, 60) || { x: 191.86, y: 138.11 };
  teleport(home.x, home.y - 6);
  await settle();
  info.push('weekdag ' + CAL.weekdayOf(w.calendar.day) + ' klok ' + w.clock);
  const groepen = [];
  for (const [i, thema] of ['hawaii', 'konijn', 'tutu'].entries()) {
    const sp = map.findOpenSpawn(home.x + 12 * i, home.y + 4, 10) || { x: home.x + 12 * i, y: home.y + 4 };
    const lead = new PEm.Pedestrian(sp.x, sp.y, 0);
    lead.angle = -Math.PI / 2 + 0.0;
    w.pedestrians.push(lead);
    const g = SLm.zetVrijgezellenNeer(w, lead, thema);
    groepen.push(g);
  }
  await sleep(2500);
  const gz = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  for (const [i, g] of groepen.entries()) {
    const lead = g.groep[0];
    const nm = g.thema;
    const camNaast = (name, dx, dy, dz, wait = 350) => pose(name, { x: lead.x + dx, y: lead.y + dy, z: gz(lead.x, lead.y) + dz }, { x: lead.x, y: lead.y, z: gz(lead.x, lead.y) + 1.0 }, wait);
    await camNaast('vrijgezel-' + nm + '-lopen', 4.2, 3.4, 1.6);
    // juichen: iedereen na elkaar
    g.groep.forEach((m, k) => { m.cheerFrom = w.time + k * 0.12; m.cheerUntil = m.cheerFrom + 1.7; });
    await sleep(500);
    await camNaast('vrijgezel-' + nm + '-juichen', 3.6, 2.8, 1.5, 100);
    info.push(nm + ': ' + g.groep.length + ' leden, hoeden ' + g.groep.map((m) => (m.look && m.look.hat) || '-').join(','));
  }
  // dichtbij: de bruid en de hoedjes
  const l0 = groepen[0].groep[0];
  await pose('vrijgezel-bruid-close', { x: l0.x + 1.9, y: l0.y + 1.2, z: gz(l0.x, l0.y) + 1.5 }, { x: l0.x, y: l0.y, z: gz(l0.x, l0.y) + 1.5 }, 250);
  done.push('vrijgezellen');
}


clearInterval(skipper);
return done.concat(info);
