// Page half van scripts/qa/ontvoering_beeld.mjs (desktop --perf-script body; #333, #330, #322).
// window.__ovCfg = { plek: { x, y }, stad: [{ naam, x, y }], straten: [{ naam, x, y }], settle } staat ervoor.
//   1. schaapontvoering: 's nachts op het platteland een schaap, de schotel, de straal, het optillen, weg (beelden met een
//      vaste camera via een cinematic-pose: zelfde aanpak als weer_nacht.page.js);
//   2. vee in de stad: overdag op groene plekken in de stad tellen hoeveel koeien, schapen en ganzen er na een minuut zijn;
//   3. bussen op de straten uit #322: per straat een minuut rondkijken en tellen hoeveel bussen er op die straat reden.
const CFG = window.__ovCfg;
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await new Promise((res) => setTimeout(res, 100));
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 100));
}
const D = window.__debug; const w = D.world; const map = w.map; const p = w.player;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await new Promise((res) => setTimeout(res, 120)); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const OV = await imp('schaapontvoeringrt');
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let hold = null, hour = null, done = false;
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; }
  if (hour !== null) { w.clock = hour; if (DN.refreshDayNight) DN.refreshDayNight(w); }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const results = { schaap: {}, stad: {}, straten: {} };

// --- 1. de ontvoering ---------------------------------------------------------------------------------
{
  const S = CFG.plek;
  hour = 0.6;
  hold = { x: S.x, y: S.y, a: 0.8 };
  teleport(S.x, S.y);
  await sleep(CFG.settle);
  const a = hold.a, cx = Math.cos(a), cy = Math.sin(a);
  const sx = S.x + cx * 70, sy = S.y + cy * 70;
  const gz = (map.groundHeightAt ? map.groundHeightAt(sx, sy, 0) : 0) || 0;
  const schaap = { kind: 'sheep', x: sx, y: sy, angle: a + 2.5, speed: 0, wanderTarget: { x: sx, y: sy }, homeX: sx, homeY: sy, homeRadius: 8, waypointTimer: 5, bobSeed: 1 };
  w.wildlife = w.wildlife || [];
  w.wildlife.push(schaap);
  // een tweede schaap ernaast, dat blijft staan
  w.wildlife.push({ ...schaap, x: sx + 5, y: sy + 3, wanderTarget: { x: sx + 5, y: sy + 3 }, homeX: sx + 5, homeY: sy + 3, bobSeed: 2 });
  const pose = (hoog, ver) => ({ position: { x: S.x, y: S.y, z: gz + 2.0 }, lookAt: { x: S.x + cx * ver, y: S.y + cy * ver, z: gz + hoog }, cut: true });
  const camera = async (naam, hoog, ver) => {
    if (cine.isCinematicActive()) cine.skipCinematic();
    ownShot = true;
    cine.playCinematic({ id: 'qa-ontvoering', duration: 60, priority: 9, letterbox: false, shot: () => pose(hoog, ver) });
    await sleep(700);
    console.log('[capture] ' + naam);
    await sleep(500);
    cine.skipCinematic();
    ownShot = false;
  };
  await camera('ov-voor', 6, 70);
  const gelukt = window.__ontvoering.start(w, schaap);
  results.schaap.start = gelukt;
  const gezien = {};
  const wacht = async (fase, minT) => { for (let i = 0; i < 400; i++) { const s = window.__ontvoering.status(); if (s && s.fase === fase && s.t >= minT) return s; if (!s) return null; await sleep(100); } return null; };
  results.schaap.aanvlucht = await wacht('aanvlucht', 4.5);
  await camera('ov-aankomst', 22, 70);
  results.schaap.straal = await wacht('straal', 2.0);
  await camera('ov-straal', 18, 70);
  results.schaap.optillen1 = await wacht('optillen', 2.5);
  await camera('ov-optillen-mid', 22, 70);
  results.schaap.optillen2 = await wacht('optillen', 6.2);
  await camera('ov-optillen-eind', 30, 70);
  results.schaap.weg = await wacht('weg', 1.0);
  await camera('ov-weg', 30, 70);
  for (let i = 0; i < 150 && window.__ontvoering.status(); i++) await sleep(100);
  results.schaap.eind = { status: window.__ontvoering.status(), schaapNog: w.wildlife.includes(schaap), andereNog: w.wildlife.some((q) => q.bobSeed === 2) };
  await camera('ov-na', 8, 70);
}

// --- 2. vee in de stad --------------------------------------------------------------------------------
hour = 13;
for (const S of CFG.stad) {
  hold = { x: S.x, y: S.y, a: 0 };
  teleport(S.x, S.y);
  w.wildlife = [];
  let max = { cow: 0, sheep: 0, gans: 0 }, totaal = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < CFG.stadMs) {
    await sleep(500);
    const c = { cow: 0, sheep: 0, gans: 0 };
    for (const q of w.wildlife || []) if (q.kind in c) c[q.kind]++;
    // ook de kudden van het platteland (countryside.js) binnen 200 m
    for (const q of w.countryAudible || []) if (q && q.kind in c && Math.hypot(q.x - p.x, q.y - p.y) < 200) c[q.kind]++;
    for (const k of Object.keys(max)) max[k] = Math.max(max[k], c[k]);
    totaal++;
  }
  results.stad[S.naam] = { max, metingen: totaal };
  console.log('[capture] stad-' + S.naam);
  await sleep(600);
}

// --- 3. bussen op de straten --------------------------------------------------------------------------
for (const S of CFG.straten) {
  hold = { x: S.x, y: S.y, a: 0 };
  teleport(S.x, S.y);
  await sleep(1500);
  const op = {}, ver = {}; let bussen = 0, frames = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < CFG.stratenMs) {
    await sleep(250);
    frames++;
    for (const v of w.vehicles || []) {
      if (!v.isBus || v.driver === 'player') continue;
      if (Math.hypot(v.x - p.x, v.y - p.y) < 120) bussen++;
      const r = v.road;
      const naam = r ? (r.name || r.type || '?') : '(geen weg)';
      if (Math.hypot(v.x - S.x, v.y - S.y) < 250) { op[naam] = (op[naam] || 0) + 1; ver[naam] = r ? `${r.cat}/${r.type}` : ''; }
    }
  }
  results.straten[S.naam] = { metingen: frames, busMetingenBinnen120m: bussen, wegen: op, soorten: ver };
  console.log('[capture] straat-' + S.naam);
  await sleep(600);
}
done = true;
hold = null; hour = null;
clearInterval(skipper);
console.error('[ov-result] ' + JSON.stringify(results));
return JSON.stringify(results);
