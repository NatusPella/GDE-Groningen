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

// ---- #399: de zeilwedstrijd op de Hoornse Plas. node scripts/ui_shots.mjs --scenes=scripts/ui/regattaplas_scenes.js --sizes=1920x1080
const RP = await imp('regattaplas');
const BT = await imp('boattypes');
const cam = async (name, pos, look, wait = 400) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'vi-plas', duration: 60, priority: 9, shot: () => ({ position: pos(), lookAt: look(), cut: true }) });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  done.push(name);
};
clearInterval(skipper);
w.devInvuln = true;
const kind = BT.BOAT_KINDS.zeilboot;
const baan = RP.plasBaan();
teleport(RP.PLAS.x, RP.PLAS.y);
await sleep(3000);
for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
await sleep(5000);
const boat = new VEH.Vehicle(baan[0].x + 20, baan[0].y - 30, 1.2, { ...kind });
boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
p.enterVehicle(boat, w);
await sleep(2500);
const R = window.__regatta;
info.push('regatta-api ' + !!R + ' havens ' + JSON.stringify(R ? R.marinas().length : null));
const plek = R && R.marinas();
// de aanwijzing in de buurt (prompt) en de kaartplek
const act = await imp('activities');
const pr = act.activityPrompt(w); const prompts = pr ? [pr] : [];
info.push('prompts ' + JSON.stringify(prompts.map((q) => q && (q.label + ' | ' + q.sub))).slice(0, 400));
const geld0 = w.money;
const ok = R.start();
info.push('start ' + ok + ' berichten ' + JSON.stringify((w.messages || []).slice(-3).map((q) => q.text)));
await sleep(3000);
const st = R.state();
info.push('state ' + JSON.stringify(st && { ronde: st.ronde, volgend: st.volgend, tonnen: st.tonnen.length }) + ' ronden ' + R.ronden);
await cam('plas-start', () => ({ x: baan[0].x - 60, y: baan[0].y - 90, z: 40 }), () => ({ x: RP.PLAS.x, y: RP.PLAS.y, z: 0 }), 600);
await cam('plas-boot', () => ({ x: boat.x - 25, y: boat.y - 25, z: 10 }), () => ({ x: boat.x, y: boat.y, z: 3 }), 500);
if (cine.isCinematicActive()) cine.skipCinematic();
await sleep(800);
// de wedstrijd uitvaren: de boot langs alle tonnen zetten, twee keer
const tonnen = st ? st.tonnen : baan;
for (let ronde = 0; ronde < 2; ronde++) for (const t of tonnen) {
  boat.x = t.x; boat.y = t.y; boat.speed = 3;
  await sleep(900);
}
await sleep(1500);
info.push('na de laatste ton: state ' + JSON.stringify(R.state()) + ' geld ' + (w.money - geld0) + ' berichten ' + JSON.stringify((w.messages || []).slice(-3).map((q) => q.text)));
console.log('[capture] plas-klaar');
await sleep(900);
done.push('plas-klaar');
clearInterval(skipper);
return done.concat(info);
