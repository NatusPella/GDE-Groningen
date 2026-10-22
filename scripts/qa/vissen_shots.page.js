// Page half of scripts/qa/vissen_shots.mjs (desktop --perf-script body, #412). window.__vs = { only, settle } staat ervoor.
// Drie controles: 'plekken' (het water herkennen op acht plekken van de provincie, een screenshot per plek), 'vissen' (een
// minuut hengelen op een plas met de echte toetsen I en Spatie, met screenshots van prompt en HUD) en 'boeken' (het Visboek
// en het vak Hengelen in de loopbaan). Elke synthetische keydown krijgt een keyup; er wordt niets in echte opslag geschreven
// (wegwerpprofiel).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__vs && window.__vs.settle) || 7000;
const ONLY = ((window.__vs && window.__vs.only) || '').split(',').filter(Boolean);

const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => note('promise: ' + (e.reason && e.reason.message || e.reason)));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RD = await imp('rdnew');
const HP = await imp('hengelplek');
const VD = await imp('visdata');
const VL = await imp('visboeklive');
const LB = await imp('loopbaanlive');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, done = false;
const tick = () => {
  if (hold && !PM.isPauseMenuOpen()) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const snap = async (name, wait = 500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
const leaveStart = async () => {
  const ss = document.getElementById('start-screen');
  for (let i = 0; i < 4 && ss && ss.classList.contains('visible'); i++) { await tap('Enter', 'Enter', 120); await sleep(5000); }
};

// Naar een plek in de wereld, wachten tot de tegels er zijn, dan twee meter van het dichtstbijzijnde water staan.
async function naarWater(lat, lon, reik = 2500, hoek = 0) {
  const [x0, y0] = RD.wgsToWorld(lat, lon);
  fixWorld();
  teleport(x0, y0);
  hold = { x: x0, y: y0, a: hoek };
  await sleep(SETTLE);
  let r = HP.vindHengelplek(map, x0, y0, { reik });
  if (!r) { await sleep(SETTLE); r = HP.vindHengelplek(map, x0, y0, { reik }); }
  if (!r) return { fout: 'geen water binnen ' + reik + ' m', x: Math.round(x0), y: Math.round(y0) };
  // twee meter van de rand af, aan de kant van de speler
  const dx = x0 - r.x, dy = y0 - r.y, d = Math.hypot(dx, dy) || 1;
  // staat het punt in het water, dan eerst naar de kant: een speler in het water zwemt en hengelt niet
  const naarLand = r.opWater ? 1 : 1;
  const x = r.x + (dx / d || 1) * 2.0 * naarLand, y = r.y + (dy / d || 0) * 2.0 * naarLand;
  // kijk naar het water
  const a = Math.atan2(r.y - y, r.x - x);
  teleport(x, y);
  hold = { x, y, a };
  w.camYaw = a;
  await sleep(SETTLE * 0.5);
  return { x: Math.round(x), y: Math.round(y), a, water: { type: r.type, naam: r.naam, plek: r.plek }, afstand: Math.round(d) };
}

const SPOTS = [
  ['hoornse-plas', 53.2085, 6.5450, 'plas'], ['noorderhaven', 53.2205, 6.5666, 'gracht'], ['paterswoldsemeer', 53.1700, 6.5130, 'meer'],
  ['zuidlaardermeer', 53.1258, 6.6900, 'meer'], ['eemskanaal', 53.2450, 6.7250, 'kanaal'], ['reitdiep', 53.3180, 6.3590, 'rivier'],
  ['lauwersoog', 53.4050, 6.2010, 'wad'], ['dollard', 53.3016, 7.0340, 'wad'],
];

const CHECKS = [
  { id: 'diag', run: async () => {
    // welke waterpolygonen zijn er echt: soort, naam, grootte en breedte rond elke plek (voor de regels van hengelplek.js)
    const WLm = await imp('waterlevels');
    const out = {};
    for (const [id, lat, lon] of SPOTS) {
      const r = await naarWater(lat, lon);
      const lijst = (map.waterNear(p.x, p.y, 400) || []).map((q) => {
        const pts = q.pts || [];
        let best = Infinity;
        const rr = HP.vindHengelplek({ waterNear: () => [q], coveredAt: () => false }, p.x, p.y, { reik: 4000 });
        return { kind: q.kind, naam: q.name || null, oppervlak: Math.round(WLm.polyArea(pts)), breed: Math.round(WLm.meanWidth(q) * 10) / 10, pts: pts.length, afstand: rr ? Math.round(rr.afstand) : null, type: HP.typeVanWater(q), lv: q.lv, nav: q.nav };
      }).sort((x, y) => (x.afstand ?? 1e9) - (y.afstand ?? 1e9)).slice(0, 8);
      out[id] = { stand: { x: Math.round(p.x), y: Math.round(p.y) }, r, lijst };
    }
    return out;
  } },
  { id: 'plekken', run: async () => {
    const out = {};
    for (const [id, lat, lon, verwacht] of SPOTS) {
      let r;
      try { r = await naarWater(lat, lon); } catch (e) { r = { fout: String(e && e.message || e) }; }
      if (r.water) {
        const g = window.__hengelen && window.__hengelen.zoek ? window.__hengelen.zoek() : null;
        r.zoek = g;
        r.verwacht = verwacht;
        r.goed = !!(g && g.type === verwacht);
        r.soorten = VD.soortenVan(r.water.type).map((s) => s.id).join(',');
        await snap('plek-' + id, 900);
      }
      out[id] = r;
    }
    return out;
  } },
  { id: 'boot', run: async () => {
    // een sloep op de plas: het prompt voor een boot die stilligt, hengelen vanuit de boot, en niet als hij vaart
    const out = {};
    const r = await naarWater(53.2085, 6.5450);
    const hp = HP.vindHengelplek(map, p.x, p.y, { reik: 20 });
    if (!hp) return { fout: 'geen water bij de plek' };
    const v = VH.spawnBoatOnWater(map, hp.poly, Math.random, { model: BT.BOAT_KINDS.sloep });
    if (!v) return { fout: 'geen boot te plaatsen op ' + hp.type };
    w.vehicles.push(v);
    p.enterVehicle(v, w);
    hold = null;
    await sleep(2500);
    out.inBoot = !!p.inVehicle && p.inVehicle.isBoat;
    out.zoek = window.__hengelen.zoek();
    await snap('boot-prompt', 600);
    v.speed = 6; await sleep(1200);
    out.snel = window.__hengelen.zoek();
    v.speed = 0; await sleep(1500);
    await tap('i', 'KeyI', 120);
    await sleep(800);
    out.start = window.__hengelen.state();
    const t0 = performance.now();
    while (performance.now() - t0 < 30000) {
      const st = window.__hengelen.state();
      if (!st) break;
      if (st.phase === 'idle') await tap(' ', 'Space', 60);
      else if (st.phase === 'bite') { await tap(' ', 'Space', 60); await sleep(250); }
      await sleep(70);
    }
    out.tussen = window.__hengelen.state();
    await snap('boot-hud', 300);
    await tap('Backspace', 'Backspace', 100);
    await sleep(1200);
    out.na = window.__hengelen.state();
    out.snelheid = Math.round((v.speed || 0) * 10) / 10;
    p.exitVehicle(map, w);
    return out;
  } },
  { id: 'vissen', run: async () => {
    const out = {};
    const r = await naarWater(53.2085, 6.5450);
    out.plek = r;
    await sleep(800);
    out.geld0 = Math.round(w.money);
    await snap('vissen-prompt', 1500);
    // de echte toets: I
    await tap('i', 'KeyI', 120);
    await sleep(600);
    const st0 = window.__hengelen.state();
    out.start = st0;
    if (!st0 || st0.mode !== 'vrij') { out.fout = 'vrij hengelen startte niet met I'; return out; }
    await snap('vissen-hud-uitgooien', 400);
    const t0 = performance.now();
    let vangsten = 0, laatsteFlash = 0;
    const meldingen = [];
    while (performance.now() - t0 < 45000) {
      const s = window.__hengelen.state();
      if (!s) break;
      if (s.phase === 'idle') await tap(' ', 'Space', 60);
      else if (s.phase === 'bite') { await tap(' ', 'Space', 60); await sleep(250); }
      if (s.vangsten > vangsten) { vangsten = s.vangsten; if (vangsten === 1 || vangsten === 4) await snap('vissen-vangst-' + vangsten, 100); }
      await sleep(70);
    }
    out.tussen = window.__hengelen.state();
    await snap('vissen-hud-midden', 300);
    await tap('Backspace', 'Backspace', 100);
    await sleep(1500);
    out.na = window.__hengelen.state();
    out.geld1 = Math.round(w.money);
    const boek = VL.getBoek();
    out.boek = { soorten: Object.keys(boek.soorten), plekken: boek.plekken, totaal: boek.totaal };
    const prof = LB.getProfiel();
    out.loopbaan = prof.vakken.hengelen;
    await snap('vissen-klaar', 600);
    return out;
  } },
  { id: 'boeken', run: async () => {
    // een rijker boek voor het scherm: een paar soorten uit andere wateren erbij (alleen dit wegwerpprofiel)
    for (const [id, kg, plek, type] of [['snoek', 3.1, 'meer:Zuidlaardermeer', 'meer'], ['brasem', 1.4, 'meer:Zuidlaardermeer', 'meer'], ['bot', 0.6, 'wad:Dollard', 'wad'], ['schol', 0.9, 'wad:Dollard', 'wad'], ['stekelbaars', 0.02, 'sloot:2_1', 'sloot'], ['giebel', 0.4, 'sloot:2_1', 'sloot'], ['paling', 0.9, 'kanaal:Eemskanaal', 'kanaal'], ['snoekbaars', 2.2, 'kanaal:Eemskanaal', 'kanaal']]) VL.boekVangst(id, kg, plek, type);
    hold = null;
    PM.openPauseMenu('visboek');
    await sleep(2500);
    await snap('visboek-alles', 400);
    const klik = async (sel, naam) => { const el = document.querySelector(sel); if (el) { el.click(); await sleep(900); await snap(naam, 300); return true; } return false; };
    const ok = [];
    ok.push(await klik('[data-vt="wad"]', 'visboek-wad'));
    ok.push(await klik('[data-vt="sloot"]', 'visboek-sloot'));
    PM.closePauseMenu();
    await sleep(800);
    PM.openPauseMenu('loopbaan');
    await sleep(2500);
    ok.push(await klik('[data-vak="hengelen"]', 'loopbaan-hengelen'));
    PM.closePauseMenu();
    return { klikken: ok, soorten: Object.keys(VL.getBoek().soorten).length };
  } },
];

const results = {};
for (const C of CHECKS) {
  if (ONLY.length && !ONLY.includes(C.id)) continue;
  await leaveStart();
  const i0 = issues.length;
  let out;
  try { out = await C.run(); } catch (e) { out = { fout: String(e && e.stack || e).slice(0, 400) }; }
  results[C.id] = { ...out, meldingen: issues.slice(i0) };
  console.log('[vs-check] ' + C.id + ' ' + JSON.stringify(results[C.id]).slice(0, 1800));
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr;
return JSON.stringify({ results, totaalMeldingen: issues.length });
