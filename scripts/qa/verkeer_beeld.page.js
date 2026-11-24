// Page half van scripts/qa/verkeer_beeld.mjs (desktop --perf-script body): verkeer en voertuigen in beeld (24-11).
// window.__vb = { only: [...] }. Elk beeld gaat via console.log('[capture] <naam>') naar devtools.js (shots-<naam>.png naast shots.png).
// Metingen komen in het JSON-resultaat. Wegwerpprofiel, niets naar echte opslag. Elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) { await tap('Enter', 'Enter'); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const CFG = window.__vb || { only: [] };
const ON = (id) => !CFG.only.length || CFG.only.includes(id);
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
for (let i = 0; i < 12 && cine.isCinematicActive(); i++) { key('keydown', ' ', 'Space'); await sleep(2500); key('keyup', ' ', 'Space'); await sleep(1500); }
await sleep(3000);
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(200); }
const { isInWater } = await imp('util');
const VH = await imp('vehicle');
const DN = await imp('daynight');
const BH = await imp('buildinghit');
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
w.money = 900;
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const out = { stappen: {}, errors };
const note = (id, o) => { out.stappen[id] = Object.assign(out.stappen[id] || {}, o); };
const cap = async (name, wait = 1500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
let curPose = null, poseFn = null;
const startCam = () => { if (!cine.isCinematicActive()) cine.playCinematic({ id: 'vb-view', duration: 600000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => (poseFn ? poseFn() : curPose) }); };
const cam = (x, y, z, lx, ly, lz, fov = 60) => { poseFn = null; curPose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true }; startCam(); };
const camFollow = (fn) => { poseFn = fn; startCam(); };
const camOff = () => { curPose = null; poseFn = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
let PMmod = null;
const jump = async (x, y, settle = 5000) => {
  // een open pauzemenu (de kaart) vangt E en Escape af: altijd eerst dicht
  if (!PMmod) PMmod = await imp('pausemenu');
  if (w.paused) { PMmod.closePauseMenu(); await sleep(500); }
  camOff();
  if (p.inVehicle) p.exitVehicle(map, w);
  if (p.water) p.leaveWater();
  p.perch = null;
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  for (let i = 0; i < 40 && !document.getElementById('load-screen'); i++) await sleep(100);
  for (let i = 0; i < 400 && document.getElementById('load-screen'); i++) await sleep(100);
  await sleep(settle);
  p.x = x; p.y = y; p.gz = gh(x, y);
  fixWorld();
};
const hold = new Set();
const press = (k, c) => { key('keydown', k, c); hold.add(k + '|' + c); };
const releaseAll = () => { for (const s of hold) { const [k, c] = s.split('|'); key('keyup', k, c); } hold.clear(); };
const binnen = (x, y) => !!BH.insideBuilding(map, x, y);
const wet = (x, y) => !!isInWater(map, x, y);
const r1 = (n) => Math.round(n * 10) / 10;
// de vier hoeken van een voertuiglijf (wereldcoordinaten)
const corners = (v) => { const c = Math.cos(v.angle), s = Math.sin(v.angle), L = v.halfLen || 2, W = v.halfWid || 0.9; return [[L, W], [L, -W], [-L, W], [-L, -W]].map(([a, b]) => [v.x + c * a - s * b, v.y + s * a + c * b]); };

const stap = async (id, fn) => {
  if (!ON(id)) return;
  const t0 = performance.now();
  try { await fn(); } catch (e) { note(id, { fout: String(e && e.stack || e).slice(0, 400) }); }
  releaseAll();
  camOff();
  note(id, { duurS: Math.round((performance.now() - t0) / 1000) });
};

try {
  const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
  const plaats = (naam) => index.places.find((x) => x.name === naam);
  const centrum = [117, -14]; // Grote Markt

  // ---- #1019: de taxi staat altijd in de reiskaart, met een reden als hij niet kan ---------------------------
  await stap('reiskaart', async () => {
    const RK = await imp('reiskaart');
    const PM = await imp('pausemenu');
    const MV = await imp('mapview');
    await jump(centrum[0], centrum[1], 5000);
    const doelen = { ver: plaats('Haren'), dichtbij: { x: centrum[0] + 120, y: centrum[1] + 90, name: 'dichtbij' } };
    const taxiVan = (dest) => { const o = RK.reisOptiesVoor(w, { x: dest.x, y: dest.y, name: dest.name }).find((x) => x.id === 'taxi'); return o ? { uit: !!o.blokkade, reden: o.blokkade || null, prijs: o.price } : null; };
    const tabel = [];
    for (const [naam, money, wanted] of [['ver', 900, 0], ['dichtbij', 900, 0], ['ver', 2, 0], ['ver', 900, 1]]) {
      w.money = money; w.wanted = wanted;
      tabel.push({ geval: `${naam}, geld ${money}, wanted ${wanted}`, taxi: taxiVan(doelen[naam]) });
    }
    w.money = 900; w.wanted = 0;
    note('reiskaart', { tabel });
    // de echte kaart: bestemming aanklikken, reiskeuze openen, taxiregel uit het DOM lezen
    const ui = [];
    for (const [naam, money] of [['ver', 900], ['ver', 2], ['dichtbij', 900]]) {
      w.money = money;
      const d = doelen[naam];
      PM.openPauseMenu('map');
      await sleep(2200);
      MV.setMapView(d.x, d.y, 4);
      await sleep(1200);
      const cv = document.querySelector('.mapview-canvas');
      if (!cv) { ui.push({ naam, fout: 'geen kaartcanvas' }); continue; }
      const r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      cv.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, button: 0, buttons: 1, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: cx, clientY: cy, button: 0, bubbles: true }));
      await sleep(600);
      const reis = document.querySelector('[data-card="reis"]');
      if (reis) reis.click();
      await sleep(900);
      const t = document.querySelector('.mv-keuze[data-card="kies:taxi"]');
      ui.push({ naam, money, reisknop: !!reis, taxiZichtbaar: !!t, taxiUit: t ? (t.classList.contains('uit') || t.getAttribute('aria-disabled') === 'true') : null, tekst: t ? t.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null, opties: [...document.querySelectorAll('.mv-keuze')].map((k) => k.getAttribute('data-card')) });
      await cap(`1019-reiskaart-${naam}-geld${money}`, 300);
      PM.closePauseMenu(); await sleep(700);
    }
    w.money = 900;
    note('reiskaart', { ui });
  });

  // ---- #1020: de taxirit rijdt niet door gebouwen (echte rit, taxi per 0,25 s tegen de voetafdrukken) -----------
  await stap('taxirit', async () => {
    const RK = await imp('reiskaart');
    const RR = await imp('reisrit');
    const R3 = await imp('reisrit3d');
    const ritten = [];
    for (const naam of ['Haren', 'Hoogkerk']) {
      const dest = plaats(naam);
      if (!dest) { ritten.push({ naam, fout: 'onbekend' }); continue; }
      await jump(centrum[0], centrum[1], 5000);
      const o = RK.reisOptiesVoor(w, { x: dest.x, y: dest.y, name: dest.name }).find((x) => x.id === 'taxi');
      if (!o || o.blokkade) { ritten.push({ naam, fout: 'geen taxi-optie' }); continue; }
      let klaar = null;
      const t0 = performance.now();
      RR.startMeerijden(w, o, { x: dest.x, y: dest.y, name: dest.name }).then((r) => { klaar = r || true; });
      const rep = { naam, samples: 0, inGebouw: [], maxV: 0, pad: [] };
      let shot = 0;
      while (!klaar && (performance.now() - t0) / 1000 < 75) {
        await sleep(250);
        const t = w.ritTaxi;
        if (!t) continue;
        rep.samples++;
        rep.maxV = Math.max(rep.maxV, Math.abs(t.speed || 0));
        // schade aan de taxi van de rit (de 'deukerige taxi met een rode vlek', #1020) en voetgangers die hij omverrijdt
        rep.minHealth = Math.min(rep.minHealth ?? 100, Math.round(t.health ?? 100));
        rep.deuken = Math.max(rep.deuken || 0, (t.dentLog || t.dents || []).length || 0);
        for (const ped of w.pedestrians || []) {
          if (Math.hypot(ped.x - t.x, ped.y - t.y) > 12 || !(ped.ragdoll || ped.dead || ped.health <= 0)) continue;
          rep.voetgangersGeraakt = rep.voetgangersGeraakt || [];
          if (!rep.voetgangersGeraakt.some((q) => q.id === ped.id)) rep.voetgangersGeraakt.push({ id: ped.id, dood: !!(ped.dead || ped.health <= 0), s: r1((performance.now() - t0) / 1000) });
        }
        if (rep.samples % 8 === 0) rep.pad.push([Math.round(t.x), Math.round(t.y)]);
        const hit = corners({ x: t.x, y: t.y, angle: t.angle, halfLen: 2.1, halfWid: 0.85 }).filter(([x, y]) => binnen(x, y)).length + (binnen(t.x, t.y) ? 10 : 0);
        if (hit) rep.inGebouw.push({ s: r1((performance.now() - t0) / 1000), x: Math.round(t.x), y: Math.round(t.y), hoeken: hit % 10, midden: hit >= 10, actief3d: R3.isRit3dActive() });
        const s = (performance.now() - t0) / 1000;
        if (shot < 3 && s > 3 + shot * 3.5) { shot++; await cap(`1020-taxi-${naam}-${shot}`, 0); }
      }
      rep.duurS = r1((performance.now() - t0) / 1000);
      rep.aangekomen = Math.round(Math.hypot(p.x - dest.x, p.y - dest.y));
      rep.inGebouw = rep.inGebouw.slice(0, 12);
      ritten.push(rep);
      await sleep(1500);
    }
    note('taxirit', { ritten });
  });

  // ---- #1018: fiets uit het rek pakken; een omvergereden fiets ligt en rijdt trager --------------------------------
  await stap('fiets', async () => {
    const BR = await imp('breakables');
    const VV = await imp('vehicleverb');
    const res = { pogingen: [] };
    // rekfietsen rond een paar drukke plekken
    for (const [x, y] of [[centrum[0], centrum[1]], [-60, 210], [430, -120]]) {
      if (res.pogingen.length >= 4) break;
      await jump(x, y, 5000);
      const props = BR.propsInRadius(x, y, 70, ['bike']).filter((q) => !q.locked).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      for (const pr of props.slice(0, 2)) {
        if (p.inVehicle) p.exitVehicle(map, w);
        // naast de fiets gaan staan (aan de straatkant, niet in de gevel)
        let sx = pr.x + 0.9, sy = pr.y;
        for (const [ox, oy] of [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) if (!binnen(pr.x + ox, pr.y + oy)) { sx = pr.x + ox; sy = pr.y + oy; break; }
        p.x = sx; p.y = sy; p.vx = p.vy = 0;
        await sleep(400);
        const tegenGevel = [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([ox, oy]) => binnen(pr.x + ox, pr.y + oy));
        await tap('e', 'KeyE', 120);
        await sleep(700);
        const v = p.inVehicle;
        const rec = { prop: [r1(pr.x), r1(pr.y)], tegenGevel, opgestapt: !!(v && v.isBike), fietsInGebouw: v ? binnen(v.x, v.y) : null, start: v ? [r1(v.x), r1(v.y)] : null, melding: (w.messages || []).slice(-1).map((m) => m.text || m)[0] || null };
        if (v && v.isBike) {
          // even wegrijden: komt hij los?
          press('w', 'KeyW'); await sleep(1800); releaseAll();
          rec.na18s = [r1(v.x), r1(v.y)]; rec.verplaatst = r1(Math.hypot(v.x - rec.start[0], v.y - rec.start[1]));
          if (res.pogingen.length === 0) { const vx = v.x, vy = v.y; cam(vx + 5, vy - 5, (v.z || 0) + 4, vx, vy, (v.z || 0) + 0.8, 60); await cap('1018-fiets-uit-rek', 900); camOff(); }
        }
        res.pogingen.push(rec);
      }
    }
    // omverrijden: een fiets zonder rijder, een auto rijdt er met 9 m/s tegenaan
    if (p.inVehicle) p.exitVehicle(map, w);
    await jump(-60, 210, 3000);
    const rp = map.nearestRoadPoint ? map.nearestRoadPoint(p.x, p.y, 80, true) : null;
    const bx = rp ? rp.x : p.x, by = rp ? rp.y : p.y;
    const fiets = VH.makeTwoWheeler('bike', bx, by, 0);
    w.vehicles.push(fiets);
    p.x = bx + 6; p.y = by + 6;
    await sleep(500);
    const auto = new VH.Vehicle(bx - 12, by, 0, { ...VH.TRAFFIC_MODELS().find((m) => m.name === 'hatch') });
    auto.speed = 9; auto.driver = null; w.vehicles.push(auto);
    for (let i = 0; i < 30 && !fiets.fallen; i++) { auto.speed = Math.max(auto.speed, 6); await sleep(100); }
    const om = { fallen: !!fiets.fallen, health: Math.round(fiets.health), label: (VV.vehicleVerb ? VV.vehicleVerb(fiets) : null) };
    auto.speed = 0;
    const ai = w.vehicles.indexOf(auto); if (ai >= 0) w.vehicles.splice(ai, 1);
    cam(fiets.x + 4, fiets.y - 4, 3.5, fiets.x, fiets.y, 0.4, 60); await cap('1018-fiets-omgereden', 900); camOff();
    // de E-prompt en rechtzetten
    p.x = fiets.x + 0.8; p.y = fiets.y; await sleep(600);
    om.prompt = ((document.querySelector('.prompt, #prompt, .hud-prompt') || {}).textContent || '').trim().slice(0, 80) || null;
    await cap('1018-fiets-prompt-rechtzetten', 200);
    await tap('e', 'KeyE', 120); await sleep(600);
    om.naEersteE = { fallen: !!fiets.fallen, opgestapt: p.inVehicle === fiets };
    await tap('e', 'KeyE', 120); await sleep(600);
    om.naTweedeE = { fallen: !!fiets.fallen, opgestapt: p.inVehicle === fiets };
    if (p.inVehicle === fiets) {
      press('w', 'KeyW'); let top = 0; for (let i = 0; i < 40; i++) { await sleep(100); top = Math.max(top, Math.abs(fiets.speed)); } releaseAll();
      om.topBeschadigd = r1(top); om.healthBijMeting = Math.round(fiets.health);
      p.exitVehicle(map, w); await sleep(300);
      const heel = VH.makeTwoWheeler('bike', fiets.x + 3, fiets.y + 3, fiets.angle); w.vehicles.push(heel);
      p.x = heel.x + 0.8; p.y = heel.y; await sleep(300);
      p.enterVehicle(heel, w); await sleep(300);
      press('w', 'KeyW'); top = 0; for (let i = 0; i < 40; i++) { await sleep(100); top = Math.max(top, Math.abs(heel.speed)); } releaseAll();
      om.topHeel = r1(top);
      p.exitVehicle(map, w);
    }
    res.omver = om;
    note('fiets', res);
  });

  // ---- #1023: op het dak van een rijdende AI-auto word je meegevoerd ------------------------------------------
  await stap('dak', async () => {
    const res = { proeven: [] };
    for (const [x, y] of [[262, 129], [-60, 210], [600, -400]]) {
      if (res.proeven.length >= 2) break;
      await jump(x, y, 6000);
      let v = null;
      for (let i = 0; i < 60 && !v; i++) {
        v = w.vehicles.filter((q) => q.road && q.driver !== 'player' && !q.isBike && !q.isScooter && !q.isBus && !q.isBoat && !q.isPolice && Math.abs(q.speed) > 3 && Math.hypot(q.x - p.x, q.y - p.y) < 160)
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || null;
        if (!v) await sleep(500);
      }
      if (!v) { res.proeven.push({ plek: [x, y], fout: 'geen rijdende AI-auto' }); continue; }
      p.x = v.x; p.y = v.y;
      p.startPerch(w, v, 0, 0);
      const rec = { model: v.model && v.model.name, samples: [], start: [Math.round(v.x), Math.round(v.y)] };
      camFollow(() => { const c = Math.cos(v.angle), s = Math.sin(v.angle); return { position: { x: v.x - c * 9 + s * 3, y: v.y - s * 9 - c * 3, z: (v.z || 0) + 4.5 }, lookAt: { x: v.x, y: v.y, z: (v.z || 0) + 1.6 }, fov: 60, cut: false }; });
      const t0 = performance.now();
      let shots = 0, afgegooid = null;
      while ((performance.now() - t0) / 1000 < 12) {
        await sleep(200);
        const s = (performance.now() - t0) / 1000;
        const opDak = !!(p.perch && p.perch.v === v);
        const d = Math.hypot(p.x - v.x, p.y - v.y);
        rec.samples.push({ s: r1(s), v: r1(v.speed), opDak, afstand: r1(d), z: r1(p.gz + p.z - (v.z || 0)) });
        if (!opDak && afgegooid === null) afgegooid = r1(s);
        if (shots < 3 && s > 2 + shots * 3) { shots++; await cap(`1023-dak-${res.proeven.length + 1}-${shots}`, 0); }
      }
      camOff();
      const gereden = Math.hypot(v.x - rec.start[0], v.y - rec.start[1]);
      rec.gereden = Math.round(gereden);
      rec.afgegooidNaS = afgegooid;
      rec.maxV = Math.max(...rec.samples.map((q) => q.v));
      rec.maxAfstandOpDak = Math.max(0, ...rec.samples.filter((q) => q.opDak).map((q) => q.afstand));
      rec.samples = rec.samples.filter((_, i) => i % 5 === 0);
      res.proeven.push(rec);
      p.perch = null;
    }
    note('dak', res);
  });

  // ---- #1027: M08 fatbikes: marker en routelijn eerst naar de Ebbingebrug ----------------------------------------
  await stap('fatbike', async () => {
    const M = await imp('missions');
    const RT = await imp('routing');
    await jump(117.2, -13.68, 5000);
    const defs = M.getMissionDefs();
    const idx = defs.findIndex((d) => d.label === 'Fatbikes tellen niet als fiets');
    const ok = idx >= 0 && M.missionDebug.start(w, idx);
    await sleep(4000);
    // de intro van de missie overslaan
    for (let i = 0; i < 6 && cine.isCinematicActive(); i++) { key('keydown', ' ', 'Space'); await sleep(1500); key('keyup', ' ', 'Space'); await sleep(800); }
    await sleep(2500);
    const def = defs[idx] || {};
    const lane = def.lane || [];
    const routes = RT.getRoutes();
    const route = routes[routes.length - 1] || null;
    const pts = route ? (route.pts || []) : [];
    const dLane = (x, y) => { let best = Infinity; for (let i = 0; i < lane.length - 1; i++) { const [ax, ay] = lane[i], [bx, by] = lane[i + 1]; const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1; const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)); best = Math.min(best, Math.hypot(ax + ex * u - x, ay + ey * u - y)); } return best; };
    const ds = pts.map(([x, y]) => dLane(x, y)).sort((a, b) => a - b);
    const mk = w.mission && w.mission.marker;
    note('fatbike', {
      gestart: !!ok, missie: M.missionDebug.state(),
      marker: mk ? [Math.round(mk.x), Math.round(mk.y)] : null, markerTotBrug: mk ? Math.round(Math.hypot(mk.x - 24.97, mk.y + 259.81)) : null,
      routePunten: pts.length, routeEind: pts.length ? pts[pts.length - 1].map(Math.round) : null,
      routeTotBaanMediaan: ds.length ? r1(ds[Math.floor(ds.length / 2)]) : null, routeTotBaanP90: ds.length ? r1(ds[Math.floor(ds.length * 0.9)]) : null,
    });
    cam(70, -140, 140, 70, -140, 0, 70); await cap('1027-fatbike-route-boven', 1500);
    camOff();
    await cap('1027-fatbike-hud', 1200);
    try { if (M.missionDebug.fail) M.missionDebug.fail(w); else if (M.missionDebug.abort) M.missionDebug.abort(w); } catch (e) { /* */ }
  });

  // ---- #1047 #1049: AI-auto's in smalle straten en bochten -----------------------------------------------------
  await stap('verkeer', async () => {
    const plekken = [['pelsterstraat', 62, 235], ['oosterstraat', 263, 129], ['oosterwijk-service', 1604, 372], ['molenstreek', 186, -2537]];
    const res = [];
    for (const [naam, x, y] of plekken) {
      await jump(x, y, 6000);
      cam(x - 18, y - 18, 34, x, y, 0, 60);
      const t0 = performance.now();
      const rec = { naam, autos: new Set(), hoekInGebouw: 0, middenInGebouw: 0, voorbeelden: [] };
      let shots = 0;
      while ((performance.now() - t0) / 1000 < 30) {
        await sleep(200);
        for (const v of w.vehicles) {
          if (!v.road || v.driver === 'player' || v.isBike || v.isScooter || v.isBoat || Math.hypot(v.x - x, v.y - y) > 70) continue;
          rec.autos.add(v.id);
          const h = corners(v).filter(([cx, cy]) => binnen(cx, cy)).length;
          if (binnen(v.x, v.y)) rec.middenInGebouw++;
          if (h) { rec.hoekInGebouw++; if (rec.voorbeelden.length < 6) rec.voorbeelden.push({ s: r1((performance.now() - t0) / 1000), model: v.model && v.model.name, x: r1(v.x), y: r1(v.y), v: r1(v.speed), hoeken: h, weg: v.road.name || v.road.cat }); }
        }
        const s = (performance.now() - t0) / 1000;
        if (shots < 2 && s > 8 + shots * 12) { shots++; await cap(`1047-verkeer-${naam}-${shots}`, 0); }
      }
      rec.autos = rec.autos.size;
      res.push(rec);
      camOff();
    }
    note('verkeer', { plekken: res });
  });

  // ---- #1083: boten alleen op logische plekken -----------------------------------------------------------
  await stap('boten', async () => {
    const BS = await imp('vehicle/boatspots');
    const SH = await imp('shops');
    const marinas = await fetch('/marinas.json').then((r) => r.json()).catch(() => null);
    const plekken = [];
    const m0 = marinas && (marinas.marinas || marinas)[0];
    if (m0) plekken.push(['jachthaven-' + (m0.name || '0'), m0.x, m0.y]);
    try { const st = SH.bootSteigers(map)[0]; if (st && st.water) plekken.push(['verhuursteiger-' + (st.street || ''), st.water.x, st.water.y]); } catch (e) { /* */ }
    plekken.push(['polder-haren', 3518, 5444], ['binnenstad-noorderhaven', -289, -107]);
    const res = [];
    for (const [naam, x, y] of plekken) {
      await jump(x + 25, y + 25, 10000);
      const boten = w.vehicles.filter((v) => v.isBoat && Math.hypot(v.x - x, v.y - y) < 400);
      const keur = boten.map((v) => { const a = BS.assessBoatSpot(map, v.x, v.y, (v.model && v.model.kind) || 'sloep'); return { kind: v.model && v.model.kind, ok: a.ok, reden: a.reden, breedte: a.breedte && r1(a.breedte), x: Math.round(v.x), y: Math.round(v.y), afgemeerd: !!v.moored }; });
      res.push({ naam, x: Math.round(x), y: Math.round(y), boten: boten.length, ongeldig: keur.filter((k) => !k.ok), voorbeeld: keur.slice(0, 5) });
      cam(x - 50, y - 50, 70, x, y, 0, 60); await cap(`1083-boten-${naam}`, 1800);
      camOff();
    }
    note('boten', { plekken: res });
  });

  // ---- #958: uit het water klimmen, niet door de kade --------------------------------------------------
  await stap('zwem', async () => {
    const res = [];
    // waterkanten: de plek uit het issue (Paddepoel) en een paar kades in de binnenstad
    const plekken = [['paddepoel-issue', -1330, -987], ['noorderhaven', -289, -107], ['hoge-der-a', -170, 60], ['oosterhaven', 330, 140]];
    for (const [naam, x0, y0] of plekken) {
      await jump(x0, y0, 5000);
      // zoek een droog punt met water op 2 tot 12 m in een van 16 richtingen
      let site = null;
      for (let r = 0; r <= 40 && !site; r += 4) for (let k = 0; k < 12 && !site; k++) {
        const a0 = (k / 12) * Math.PI * 2, x = x0 + Math.cos(a0) * r, y = y0 + Math.sin(a0) * r;
        if (wet(x, y) || binnen(x, y)) continue;
        for (let j = 0; j < 16 && !site; j++) {
          const a = (j / 16) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
          let edge = null; for (let d = 0.5; d <= 12; d += 0.5) if (wet(x + dx * d, y + dy * d)) { edge = d; break; }
          if (edge === null) continue;
          if (!wet(x + dx * (edge + 3), y + dy * (edge + 3)) || !wet(x + dx * (edge + 6), y + dy * (edge + 6))) continue;
          let schoon = true; for (let d = 0; d < edge; d += 0.5) if (binnen(x + dx * d, y + dy * d)) schoon = false;
          if (schoon) site = { x, y, dx, dy, edge };
        }
      }
      if (!site) { res.push({ naam, fout: 'geen waterkant gevonden' }); continue; }
      const ex = site.x + site.dx * site.edge, ey = site.y + site.dy * site.edge;
      const sx = ex + site.dx * 2.2, sy = ey + site.dy * 2.2; // 2,2 m het water in
      p.x = sx; p.y = sy; p.vx = p.vy = 0;
      await sleep(1200);
      p.angle = Math.atan2(-site.dy, -site.dx); // naar de wal kijken
      w.camYaw = p.angle;
      cam(ex - site.dy * 7 + site.dx * 5, ey + site.dx * 7 + site.dy * 5, gh(ex, ey) + 3.2, ex, ey, gh(ex, ey) + 0.3, 60);
      const rec = { naam, waterkant: [r1(ex), r1(ey)], startWater: p.water || null, trace: [], doorGebouw: false, wissels: 0 };
      press('w', 'KeyW');
      const t0 = performance.now();
      let prev = p.water, shots = 0;
      while ((performance.now() - t0) / 1000 < 7) {
        await sleep(100);
        p.angle = Math.atan2(-site.dy, -site.dx);
        if (p.water !== prev) { rec.wissels++; prev = p.water; }
        if (binnen(p.x, p.y)) rec.doorGebouw = true;
        const s = (performance.now() - t0) / 1000;
        if (rec.trace.length < 80) rec.trace.push({ s: r1(s), water: p.water || 'land', x: r1(p.x), y: r1(p.y), z: r1(p.z || 0), spot: p.climbSpot ? [r1(p.climbSpot.x), r1(p.climbSpot.y)] : null });
        if (p.water === 'climb' && shots === 0) { shots++; await cap(`958-klim-${naam}-klimt`, 0); }
        // aan een kade klimt de speler niet vanzelf (alleen op een lage oever): na 2 s zwemmen drukt hij de klimtoets
        if (s > 2 && p.water === 'swim' && p.climbSpot && !rec.klimtoets) { rec.klimtoets = r1(s); await tap(' ', 'Space'); }
      }
      releaseAll();
      await cap(`958-klim-${naam}-eind`, 300);
      camOff();
      rec.eind = { water: p.water || 'land', x: r1(p.x), y: r1(p.y), inGebouw: binnen(p.x, p.y), opDroog: !wet(p.x, p.y) };
      rec.trace = rec.trace.filter((_, i) => i % 3 === 0);
      res.push(rec);
    }
    note('zwem', { plekken: res });
  });
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 600); }
return JSON.stringify(out);
