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

// ---- #398: Scheepswerf De Kielhaal en de zeeschepen. node scripts/ui_shots.mjs --scenes=scripts/ui/werf_scenes.js --only=helling,lancering,golf,vertrek,modellen,zee --sizes=1920x1080
const WF = await imp('werf');
const EV = await imp('evenementen');
const ev1 = EV.AGENDA.find((e) => e.id === 'ev-werf-1');
const at = (l, q, z = 0) => { const c = WF.naarWereld(l, q); return { x: c.x, y: c.y, z }; };
const gz = (l, q) => { const c = WF.naarWereld(l, q); return map.groundHeightAt ? map.groundHeightAt(c.x, c.y, 0) || 0 : 0; };
const holdClock = (h) => setInterval(() => { w.clock = h; }, 50);
const cam = async (name, pos, look, wait = 350) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'vi-werf', duration: 60, priority: 9, shot: () => ({ position: pos(), lookAt: look(), cut: true }) });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  done.push(name);
};
const wacht = async (ms, test) => { const t0 = performance.now(); while (performance.now() - t0 < ms && !test()) await sleep(100); return test(); };
const naarWerf = async (l, q) => {
  const c = WF.naarWereld(l, q);
  teleport(c.x, c.y);
  await sleep(2500);
  for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(4000);
};
w.devInvuln = true;
w.calendar = w.calendar || { day: 1, seen: [] };
// de dag vastzetten: het verhaal klemt de kalender vast (calendarday.js clampDay), een setter die niets doet houdt hem op de dag van de lancering
Object.defineProperty(w.calendar, 'day', { get: () => ev1.from, set: () => {}, configurable: true });
const dayHold = 0;
clearInterval(skipper);

if (want('helling')) {
  const ck = holdClock(14.4);
  await naarWerf(0, 120);
  await wacht(15000, () => w.werf && w.werf.zichtbaar);
  info.push('werf-staat ' + JSON.stringify(w.werf && { zichtbaar: w.werf.zichtbaar, u: w.werf.u }));
  await cam('helling-ver', () => at(-30, 150, gz(-30, 150) + 22), () => at(0, 18, gz(0, 18) + 6), 600);
  await cam('helling-landzijde', () => at(-60, 55, gz(-60, 55) + 9), () => at(0, 18, gz(0, 18) + 7), 400);
  await cam('helling-kade', () => at(-70, -2, gz(-70, -2) + 6), () => at(0, 14, gz(0, 14) + 8), 400);
  await cam('helling-water', () => at(30, -70, WF.WATERVLAK + 14), () => at(0, 16, 7), 400);
  info.push('berichten ' + JSON.stringify((w.messages || []).slice(-3).map((q) => q.text)));
  clearInterval(ck);
}

if (want('lancering')) {
  let ck = holdClock(14.4);
  await naarWerf(0, 120);
  await wacht(15000, () => w.werf && w.werf.zichtbaar);
  clearInterval(ck);
  ck = holdClock(15.02);
  await wacht(20000, () => w.werf && w.werf.u != null);
  info.push('lancering gestart u=' + (w.werf && w.werf.u));
  // de tijdlijn bevriezen op een tijdstip: de werf-staat wordt steeds teruggezet
  const bevries = async (u, name, pos, look, wait = 500) => {
    const hold = setInterval(() => { if (w.werf && w.werf.u != null) w.werf.u = u; }, 4);
    await cam(name, pos, look, wait);
    clearInterval(hold);
  };
  const sch = (u) => { const s = WF.schipOp(u); return at(0, s.q, WF.WATERVLAK + s.dy + 2); };
  const U = WF.T_PLONS;
  for (const [u, name] of [[2, 'start-wacht'], [8, 'start-glijdt'], [WF.T_RAND + 0.7, 'start-rand'], [WF.T_RAND + 1.4, 'start-valt'], [U + 0.4, 'start-plons'], [U + 1.2, 'start-spuit'], [U + 2.5, 'start-golf-1'], [U + 4.5, 'start-golf-2'], [U + 8, 'start-golf-3'], [U + 14, 'start-wiegen'], [U + 22, 'start-rust']]) {
    await bevries(u, name, () => at(-95, 50, gz(-95, 50) + 12), () => sch(u));
  }
  for (const [u, name] of [[WF.T_RAND + 1.4, 'water-valt'], [U + 1.2, 'water-spuit'], [U + 6, 'water-golf']]) {
    await bevries(u, name, () => at(70, -95, WF.WATERVLAK + 18), () => sch(u));
  }
  for (const [u, name] of [[U + 1.0, 'kade-golf-1'], [U + 2.0, 'kade-golf-2'], [U + 3.5, 'kade-golf-3'], [U + 6, 'kade-golf-4']]) {
    await bevries(u, name, () => at(-34, 34, gz(-34, 34) + 5.5), () => at(0, 8, gz(0, 8) + 1));
  }
  clearInterval(ck);
  if (w.werf) { w.werf.u = null; }
}

if (want('golf')) {
  // de speler staat zelf op de kade en wordt weggeduwd (echte tijd)
  let ck = holdClock(14.4);
  await naarWerf(0, 120);
  await wacht(15000, () => w.werf && w.werf.zichtbaar);
  const c0 = WF.naarWereld(-8, 6);
  teleport(c0.x, c0.y);
  clearInterval(ck);
  ck = holdClock(15.02);
  const q = () => WF.naarWerf(p.x, p.y);
  const trace = [];
  const t0 = performance.now();
  const tr = setInterval(() => { const s = q(); trace.push([+((performance.now() - t0) / 1000).toFixed(1), w.werf && w.werf.u != null ? +w.werf.u.toFixed(1) : null, +s.q.toFixed(1), +s.l.toFixed(1)]); }, 500);
  const speler = () => ({ x: p.x, y: p.y, z: 1.2 });
  await wacht(30000, () => w.werf && w.werf.u != null && w.werf.u > WF.T_RAND);
  await cam('golf-speler-1', () => at(-30, 22, gz(-30, 22) + 2.4), speler, 100);
  await wacht(30000, () => w.werf && w.werf.u != null && w.werf.u > WF.T_PLONS + 1.2);
  await cam('golf-speler-2', () => at(-30, 22, gz(-30, 22) + 2.4), speler, 60);
  await wacht(30000, () => w.werf && w.werf.u != null && w.werf.u > WF.T_PLONS + 3.5);
  await cam('golf-speler-3', () => at(-30, 22, gz(-30, 22) + 2.4), speler, 60);
  await wacht(40000, () => w.werf && w.werf.u == null);
  clearInterval(tr); clearInterval(ck);
  info.push('speler q/l tijdens de golf ' + JSON.stringify(trace));
  info.push('speler eind q ' + q().q.toFixed(1) + ' gezondheid ' + (p.health !== undefined ? p.health : 'n.v.t.') + ' berichten ' + JSON.stringify((w.messages || []).slice(-4).map((m) => m.text)));
  info.push('schip ' + JSON.stringify(w.vehicles.filter((v) => v.werfSchip).map((v) => [Math.round(v.x), Math.round(v.y), v.model.kind])));
}

if (want('vertrek')) {
  // na de lancering vaart het schip weg (echte tijd): beweegt het?
  let ck = holdClock(14.4);
  await naarWerf(0, 90);
  await wacht(15000, () => w.werf && w.werf.zichtbaar);
  clearInterval(ck);
  ck = holdClock(15.02);
    await wacht(70000, () => w.werf && w.werf.u == null && w.werf.schip);
  const sh = w.werf && w.werf.schip;
  info.push('schip na lancering ' + JSON.stringify(sh && { x: Math.round(sh.x), y: Math.round(sh.y), speed: +sh.speed.toFixed(2), vaar: !!sh._vaar, punten: sh._vaar && sh._vaar.pts.length }));
  const pos0 = sh ? [sh.x, sh.y] : null;
  await sleep(2500);
  await cam('vertrek-0', () => at(60, -50, WF.WATERVLAK + 25), () => ({ x: sh.x, y: sh.y, z: WF.WATERVLAK + 5 }), 400);
  await sleep(20000);
  info.push('na 20 s: ' + JSON.stringify(sh && { x: Math.round(sh.x), y: Math.round(sh.y), speed: +sh.speed.toFixed(2), afstand: pos0 && Math.round(Math.hypot(sh.x - pos0[0], sh.y - pos0[1])), i: sh._vaar && sh._vaar.i }));
  await cam('vertrek-20', () => ({ x: sh.x + 60, y: sh.y - 60, z: WF.WATERVLAK + 28 }), () => ({ x: sh.x, y: sh.y, z: WF.WATERVLAK + 5 }), 400);
  await sleep(25000);
  info.push('na 45 s: ' + JSON.stringify(sh && { x: Math.round(sh.x), y: Math.round(sh.y), speed: +sh.speed.toFixed(2), afstand: pos0 && Math.round(Math.hypot(sh.x - pos0[0], sh.y - pos0[1])), i: sh._vaar && sh._vaar.i, weg: w.vehicles.indexOf(sh) < 0 }));
  clearInterval(ck);
}

if (want('modellen')) {
  // de vijf uitvoeringen op een rij boven het water van de basin (stilstaande voertuigen)
  await naarWerf(0, 90);
  const BT = await imp('boattypes');
  const lijst = ['zeeVracht', 'zeeContainer', 'zeeTanker', 'zeeSleper', 'zeeNieuw'];
  const boten = lijst.map((k, i) => {
    const c = WF.naarWereld(-60 + i * 30, -60 - i * 6);
    const v = new VEH.Vehicle(c.x, c.y, 0.3, { ...BT.BOAT_KINDS[k] });
    v.isBoat = true; v.scripted = true; v.moored = true; v.waterPoly = null;
    w.vehicles.push(v);
    return v;
  });
  await sleep(3000);
  const mid = WF.naarWereld(-30, -80);
  await cam('modellen-overzicht', () => ({ x: mid.x - 160, y: mid.y + 90, z: 55 }), () => ({ x: mid.x, y: mid.y, z: 2 }), 800);
  for (const [i, k] of lijst.entries()) {
    const b = boten[i];
    await cam('model-' + k, () => ({ x: b.x + Math.cos(b.angle + 0.9) * b.model.len * 0.75, y: b.y + Math.sin(b.angle + 0.9) * b.model.len * 0.75, z: b.model.len * 0.2 }), () => ({ x: b.x, y: b.y, z: 4 }), 500);
  }
  for (const b of boten) w.vehicles.splice(w.vehicles.indexOf(b), 1);
}

if (want('zee')) {
  // de Waddenzee bij Lauwersoog: komen er zeeschepen, met variatie?
  const lau = { x: -26200, y: -21300 }; // op het water van de Waddenzee zelf: de schepen komen 250 tot 1500 m van de speler
  teleport(lau.x, lau.y);
  await sleep(3000);
  for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(4000);
  for (let r = 0; r < 24; r++) {
    await sleep(5000);
    if (w.vehicles.filter((v) => v.zeeSchip).length >= 3) break;
  }
  const schepen = w.vehicles.filter((v) => v.zeeSchip);
  info.push('zeeschepen ' + JSON.stringify(schepen.map((v) => [v.model.key, v.model.len, v.model.color, Math.round(Math.hypot(v.x - p.x, v.y - p.y)), +v.speed.toFixed(1)])));
  info.push('zee-rijen ' + (map._seaTiles ? map._seaTiles.size : 'geen'));
  if (schepen[0]) {
    const s0 = schepen[0];
    teleport(s0.x - 150, s0.y); // de speler bij het schip: voertuigen worden rond de speler getekend
    await sleep(2500);
    await cam('zee-1', () => ({ x: s0.x + 90, y: s0.y + 90, z: 22 }), () => ({ x: s0.x, y: s0.y, z: 5 }), 500);
    await sleep(15000);
    info.push('na 15 s: ' + JSON.stringify([Math.round(s0.x), Math.round(s0.y), +s0.speed.toFixed(1), w.vehicles.indexOf(s0) >= 0]));
    await cam('zee-1b', () => ({ x: s0.x - 100, y: s0.y + 70, z: 25 }), () => ({ x: s0.x, y: s0.y, z: 5 }), 500);
  }
  if (schepen[1]) { const s1 = schepen[1]; teleport(s1.x - 150, s1.y); await sleep(2500); await cam('zee-2', () => ({ x: s1.x + 70, y: s1.y - 80, z: 20 }), () => ({ x: s1.x, y: s1.y, z: 5 }), 500); }
}








return done.concat(info);
