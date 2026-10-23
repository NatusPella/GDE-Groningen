// Page half of scripts/qa/feature_smoke.mjs (desktop --perf-script body).
// window.__fs = { only, settle } is put in front. One short scripted check per new feature:
// each puts the game in the situation, takes screenshots ('[capture] <id>' and '<id>-<n>')
// and returns a note; errors and NaN warnings that appear during a check belong to it.
// Every synthetic keydown is followed by a keyup. Nothing here touches real storage
// (the desktop run uses a throwaway profile; story tests run in-memory elsewhere).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__fs && window.__fs.settle) || 8000;
const ONLY = ((window.__fs && window.__fs.only) || '').split(',').filter(Boolean);
const JOBS = (window.__fs && window.__fs.jobs) || [];

// ---- errors ------------------------------------------------------------------------
const issues = [];
const note = (m) => issues.push({ t: Math.round(performance.now()), m: String(m).slice(0, 240) });
const origErr = console.error.bind(console), origWarn = console.warn.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
console.warn = (...a) => { const s = a.map(String).join(' '); if (/nan|infinity/i.test(s)) note('console.warn: ' + s); origWarn(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => note('promise: ' + (e.reason && e.reason.message || e.reason)));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WP = await imp('worldplaces');
const WL = await imp('waterlevels');
const VH = await imp('vehicle');
const BT = await imp('boattypes');

let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && !window.__fsKeepCine && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
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
let hold = null, done = false, driving = false;
const tick = () => {
  if (hold && !driving && !PM.isPauseMenuOpen()) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const go = async (x, y, a = 0, settle = SETTLE) => {
  fixWorld();
  teleport(x, y);
  hold = { x, y, a };
  await sleep(settle * 0.6);
  teleport(x, y);
  await sleep(settle * 0.4);
};
const snap = async (name, wait = 500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
const shotAt = async (name, pose, wait = 2500) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'fs-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  ownShot = false;
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const closeAll = async () => {
  try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e) { note('closeAll: ' + e.message); }
  const shop = document.querySelector('.shop-open');
  if (shop) { await tap('Escape', 'Escape'); }
  hold = null;
};
const landmark = (re) => ((map && map.meta && map.meta.landmarks) || []).find((m) => re.test(m.name || ''));
const GM = { x: 200.8, y: 45.4 };
const nearestRoadHeading = (x, y, R = 80) => {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : [])) for (let i = 0; i < rd.pts.length - 1; i++) {
    const a = rd.pts[i], b = rd.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y);
    if (!best || d < best.d) best = { d, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
};

// ---- the checks -----------------------------------------------------------------------
const CHECKS = [
  { id: 'opening', issues: [159], run: async () => {
    // the opening is what a new game starts with; the harness already pressed Enter
    window.__fsKeepCine = true;
    const out = [];
    for (let i = 0; i < 3; i++) {
      out.push({ t: i * 3, cine: cine.isCinematicActive(), msgs: (document.querySelector('#subtitle, .subtitle, #cine-sub') || {}).textContent || '' });
      await snap('opening-' + i, i ? 2500 : 200);
    }
    window.__fsKeepCine = false;
    if (cine.isCinematicActive()) cine.skipCinematic();
    await sleep(1500);
    return { samples: out, skippedCleanly: !cine.isCinematicActive() };
  } },
  { id: 'missie1', issues: [120], run: async () => {
    const S = window.__story; if (!S) return { fout: 'window.__story ontbreekt' };
    const first = S.steps.find((x) => x.kind === 'mission');
    if (!first) return { fout: 'geen missie in de stappenlijst' };
    S.jump(first.id);
    await sleep(6000);
    const cur = S.current();
    const goal = window.__goal && window.__goal.target && window.__goal.target();
    await snap('missie1');
    return { step: first.id, current: cur, goal: goal ? { x: Math.round(goal.x), y: Math.round(goal.y), name: goal.name || goal.label } : null };
  } },
  { id: 'kaart', issues: [114, 115, 122, 132, 169], run: async () => {
    await go(GM.x, GM.y, 0.3);
    await snap('kaart-minimap-dag');
    PM.openPauseMenu('map');
    await sleep(2500);
    await snap('kaart-groot-dag');
    PM.closePauseMenu();
    fixWorld(22.5);
    await sleep(2500);
    await snap('kaart-minimap-nacht');
    PM.openPauseMenu('map');
    await sleep(2500);
    await snap('kaart-groot-nacht');
    PM.closePauseMenu();
    fixWorld();
    return { gedaan: 'minimap en grote kaart, dag en nacht' };
  } },
  { id: 'wanted', issues: [43, 125], run: async () => {
    await go(GM.x, GM.y, 0.3);
    w.wanted = 3; w.wantedDecayTimer = 0;
    await sleep(6000);
    const police = w.vehicles.filter((v) => v.isPolice).length;
    await snap('wanted-3');
    const out = { wanted: w.wanted, politiewagens: police };
    w.wanted = 0;
    await sleep(500);
    return out;
  } },
  { id: 'winkel', issues: [170], run: async () => {
    const SU = await imp('shopui');
    SU.openShopMenu(w, {
      type: 'dorp-test', color: '#2f6fb0', name: 'Testwinkel', tagline: 'Alleen voor de zichtcontrole',
      sections: () => [{ title: 'Te koop', items: [
        { id: 'a', label: 'Frikandel', desc: 'Warm en vet', price: 3, swatch: ['#c97a3c'] },
        { id: 'b', label: 'Dure jas', desc: 'Veel te duur', price: 99999, swatch: ['#2f6fb0'], disabled: 'Te weinig geld' },
        { id: 'c', label: 'Sap', desc: 'Fris', price: 4, swatch: ['#e0b020'] },
      ] }],
    });
    await sleep(1500);
    await snap('winkel');
    await tap('Escape', 'Escape');
    await sleep(500);
    return { open: !!document.body.classList.contains('shop-open') };
  } },
  { id: 'reuzenrad', issues: [145], run: async () => {
    const H = window.__hoogvlieger; if (!H) return { fout: 'window.__hoogvlieger ontbreekt' };
    const sp = H.spot();
    await go(sp.x, sp.y, 0, SETTLE);
    await snap('reuzenrad');
    const boarded = H.board();
    await sleep(3000);
    const st = H.state();
    if (st) await snap('reuzenrad-mee');
    H.quit();
    return { spot: [Math.round(sp.x), Math.round(sp.y)], kermisAanwezig: boarded || !!st, boarded, state: st && { index: st.index, fraction: st.fraction } };
  } },
  { id: 'padel', issues: [177], run: async () => {
    const P = window.__padel; if (!P) return { fout: 'window.__padel ontbreekt' };
    const sites = P.spots();
    if (!sites.length) return { fout: 'geen padelplekken' };
    const s = sites[0];
    await go(s.x, s.y, 0);
    await snap('padel-plek');
    const ok = P.start(s.id);
    await sleep(2500);
    P.auto(true);
    await sleep(8000);
    await snap('padel-spel');
    const st = P.state();
    P.finish(true);
    await sleep(1500);
    return { plekken: sites.length, eerste: { id: s.id, naam: s.name, bron: s.src }, gestart: ok, state: st };
  } },
  { id: 'kartbaan', issues: [176], run: async () => {
    const K = window.__kartbaan; if (!K) return { fout: 'window.__kartbaan ontbreekt' };
    const sp = K.spot();
    await go(sp.x, sp.y, 0);
    const near = (r) => w.vehicles.filter((v) => Math.hypot(v.x - sp.x, v.y - sp.y) < r).length;
    const npcs = (w.npcs || w.pedestrians || []).filter((n) => Math.hypot(n.x - sp.x, n.y - sp.y) < 80).length;
    await snap('kartbaan-start');
    const started = K.start(true);
    await sleep(9000);
    await snap('kartbaan-race');
    const st = K.state();
    K.quit();
    await sleep(800);
    return { spot: [Math.round(sp.x), Math.round(sp.y)], baan: K.track().length, gestart: started, voertuigenBinnen150m: near(150), npcsBinnen80m: npcs, state: st && { phase: st.phase, raceT: st.raceT, karts: st.karts.length } };
  } },
  { id: 'brug', issues: [153, 154], run: async () => {
    let best = null, bd = Infinity;
    for (const r of (map.roads || [])) {
      if (!r.bridge || !r.pts || r.pts.length < 2) continue;
      const m = r.pts[Math.floor(r.pts.length / 2)], d = Math.hypot(m[0] - GM.x, m[1] - GM.y);
      if (d > 30 && d < bd) { bd = d; best = { m, r }; }
    }
    if (!best) return { fout: 'geen brug gevonden' };
    const [bx, by] = best.m;
    await go(bx, by, 0);
    await snap('brug');
    // a spits on the water within 150 m, heading toward the bridge
    let wat = null;
    for (let r = 10; r < 150 && !wat; r += 10) for (let k = 0; k < 16 && !wat; k++) {
      const a = k / 16 * Math.PI * 2, x = bx + Math.cos(a) * r, y = by + Math.sin(a) * r;
      const wa = WL.waterAt(map, x, y);
      if (wa && wa.navigable && wa.depth > 1.5) wat = { x, y, a: Math.atan2(by - y, bx - x) };
    }
    if (!wat) return { fout: 'geen vaarwater bij de brug', brug: [Math.round(bx), Math.round(by)] };
    const v = new VH.Vehicle(wat.x, wat.y, wat.a, { ...BT.BOAT_KINDS.spits });
    v.isBoat = true; v.speed = 0; w.vehicles.push(v);
    teleport(wat.x, wat.y);
    p.enterVehicle(v, w);
    await sleep(800);
    hold = null;
    driving = true;
    key('keydown', 'w', 'KeyW');
    const trace = [];
    try { for (let i = 0; i < 12; i++) { await sleep(1500); trace.push([Math.round(v.x), Math.round(v.y), +(v.speed || 0).toFixed(1)]); if (i === 3) await snap('brug-schip-1'); } }
    finally { key('keyup', 'w', 'KeyW'); }
    await snap('brug-schip-2');
    if (p.inVehicle) p.exitVehicle(map, w);
    driving = false;
    return { brug: [Math.round(bx), Math.round(by)], bruggenstaat: best.r.open !== undefined ? best.r.open : null, inBoot: !!p.inVehicle, boot: trace };
  } },
  { id: 'bus', issues: [160], run: async () => {
    let bus = w.vehicles.find((v) => v.isBus);
    if (!bus) { await go(GM.x, GM.y, 0); bus = w.vehicles.find((v) => v.isBus); }
    if (!bus) return { fout: 'geen bus in w.vehicles (op en bij de Grote Markt)' };
    await go(bus.x, bus.y, 0, 3000);
    bus = w.vehicles.find((v) => v.isBus && Math.hypot(v.x - p.x, v.y - p.y) < 150) || bus;
    const c = Math.cos(bus.angle || 0), s = Math.sin(bus.angle || 0);
    await shotAt('bus-achter', { position: { x: bus.x - c * 12 + s * 3, y: bus.y - s * 12 - c * 3, z: gh(bus.x, bus.y) + 3 }, lookAt: { x: bus.x, y: bus.y, z: gh(bus.x, bus.y) + 2.6 }, cut: true }, 1500);
    await shotAt('bus-voor', { position: { x: bus.x + c * 12 - s * 3, y: bus.y + s * 12 + c * 3, z: gh(bus.x, bus.y) + 3 }, lookAt: { x: bus.x, y: bus.y, z: gh(bus.x, bus.y) + 2.6 }, cut: true }, 1500);
    return { bus: { x: Math.round(bus.x), y: Math.round(bus.y), lijn: bus.line || bus.busLine || bus.route && (bus.route.name || bus.route.id) || null, bord: bus.destination || bus.dest || null }, aantalBussen: w.vehicles.filter((v) => v.isBus).length };
  } },
  { id: 'heli', issues: [166], run: async () => {
    const H = window.__heli; if (!H) return { fout: 'window.__heli ontbreekt' };
    const pads = H.pads();
    if (pads[0]) { await go(pads[0].x, pads[0].y, 0); await snap('heli-pad'); }
    return { pads: pads.length, eerste: pads[0] || null, opmerking: 'alleen de landingsplaats bekeken; de helimissie zelf is niet gevlogen' };
  } },
  { id: 'radio', issues: [146], run: async () => {
    const R = window.__radio; if (!R) return { fout: 'window.__radio ontbreekt' };
    const seq = [];
    for (let i = 0; i < 6; i++) { seq.push({ aan: R.on(), programma: R.programme(), gespeeld: R.played(), pauze: R.inBreak() }); await sleep(5000); }
    await tap('n', 'KeyN');
    await sleep(1500);
    seq.push({ naN: true, aan: R.on(), programma: R.programme(), gespeeld: R.played() });
    return { seq, opmerking: 'alleen toestand gelezen; of er echt geluid komt is niet te horen in deze run' };
  } },
  { id: 'cheatmenu', issues: [161], run: async () => {
    PM.openPauseMenu('streken');
    await sleep(2000);
    await snap('cheatmenu');
    PM.closePauseMenu();
    return { gedaan: 'tab Streken (Cheats) geopend en bekeken' };
  } },
  { id: 'martinitoren', issues: [138], run: async () => {
    const l = landmark(/Martinitoren/);
    if (!l) return { fout: 'Martinitoren niet in map.meta.landmarks' };
    await go(l.x + 35, l.y, Math.PI);
    for (const [n, dx, dy] of [['oost', 35, 0], ['zuid', 0, 35], ['west', -35, 0], ['noord', 0, -35]]) {
      await shotAt('martinitoren-' + n, { position: { x: l.x + dx, y: l.y + dy, z: gh(l.x, l.y) + 3 }, lookAt: { x: l.x, y: l.y, z: gh(l.x, l.y) + 3 }, cut: true }, 1800);
    }
    return { landmark: { x: Math.round(l.x), y: Math.round(l.y) } };
  } },
  { id: 'omeloeks', issues: [172], run: async () => {
    const l = landmark(/Loeks|Peerd|Mesdag/);
    const pl = WP.worldPlaceNamed && (WP.worldPlaceNamed('Mesdagplein') || null);
    const at = l || pl || { x: GM.x - 600, y: GM.y + 400 };
    await go(at.x, at.y, 0);
    await snap('omeloeks');
    return { gevonden: l ? l.name : pl ? 'Mesdagplein (plaats)' : 'niet gevonden, ongeveer gekozen plek', at: [Math.round(at.x), Math.round(at.y)] };
  } },
  { id: 'corpus', issues: [162], run: async () => {
    const out = {};
    for (const n of ['Corpus den Hoorn', 'Hoornse Meer', 'Hoornse Park']) {
      const pl = WP.worldPlaceNamed(n);
      if (!pl) { out[n] = 'niet in de plaatsen'; continue; }
      await go(pl.x, pl.y, 0, 6000);
      const at = WP.worldPlaceAt(p.x, p.y);
      out[n] = { x: Math.round(pl.x), y: Math.round(pl.y), label: at && { place: at.place && at.place.name, district: at.district && at.district.name } };
      await snap('corpus-' + n.replace(/ /g, '-').toLowerCase());
    }
    return out;
  } },
  { id: 'benchmark', issues: [159], run: async () => {
    const T = await imp('trailer');
    try {
      T.showBenchmarkResults({ stats: { avg: 58, p95: 24, low1: 19, frames: 1800, memory: { geo: 100, tex: 200 }, cats: {} }, preset: 'midden', presetFps: {} });
    } catch (e) { return { fout: 'showBenchmarkResults: ' + e.message }; }
    await sleep(1500);
    await snap('benchmark-kaart');
    for (const el of document.querySelectorAll('[class*="bench"] button')) { el.click(); break; }
    await sleep(500);
    return { opmerking: 'resultaatkaart geopend met verzonnen cijfers; de benchmark zelf is niet gedraaid' };
  } },
  { id: 'rijden', issues: [126, 137], run: async () => {
    // a traffic car on the nearest straight road; W held, gear and speed sampled
    await go(19835, 5297, 0, SETTLE);
    const car = w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.isBus && !v.isPolice && !v.dead && Math.hypot(v.x - p.x, v.y - p.y) < 250)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!car) return { fout: 'geen auto binnen 150 m' };
    teleport(car.x, car.y);
    p.enterVehicle(car, w);
    hold = null; driving = true;
    key('keydown', 'w', 'KeyW');
    const gears = [], speeds = [], radio = [];
    const R = window.__radio;
    try {
      for (let i = 0; i < 80; i++) { await sleep(250); gears.push(car.gb ? car.gb.gear : car.gear); speeds.push(+(car.speed || 0).toFixed(1)); if (R && i % 20 === 0) radio.push({ aan: R.on(), programma: R.programme(), gespeeld: R.played() }); if (i === 40) { await tap('n', 'KeyN'); if (R) radio.push({ naN: true, aan: R.on(), gespeeld: R.played() }); } if (i === 30) await snap('rijden-1'); }
    } finally { key('keyup', 'w', 'KeyW'); }
    await snap('rijden-2');
    if (p.inVehicle) p.exitVehicle(map, w);
    driving = false;
    let changes = 0, flicker = 0;
    for (let i = 1; i < gears.length; i++) if (gears[i] !== gears[i - 1]) { changes++; if (i > 1 && gears[i] === gears[i - 2]) flicker++; }
    return { model: car.model && (car.model.name || car.model.kind), versnellingen: [...new Set(gears)], wisselingen: changes, terugenweer: flicker, topsnelheid: Math.max(...speeds), radio };
  } },
  // #51, #225, #41: een eigen auto vlak voor de lens (op een weg bij de Grote Markt), vastgehouden
  { id: 'interieur', issues: [51], run: async () => {
    const CI = await imp('carinterior');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    if (!rd) return { fout: 'geen weg bij de Grote Markt' };
    await go(rd.x, rd.y, rd.a, SETTLE);
    const all = VH.TRAFFIC_MODELS();
    const out = {};
    for (const name of ['sedan', 'taxi', 'van', 'bus', 'sport']) {
      const model = all.find((m) => m.name === (name === 'taxi' ? 'sedan' : name));
      if (!model) { out[name] = 'model niet gevonden'; continue; }
      const v = new VH.Vehicle(rd.x, rd.y, rd.a, { ...model });
      if (name === 'taxi') v.isTaxi = true;
      w.vehicles.push(v);
      await sleep(600);
      teleport(v.x, v.y);
      p.enterVehicle(v, w);
      hold = null; driving = true;
      v.speed = 0;
      await sleep(3500);
      const e = CI.interiorEyePose(v);
      if (!e) { out[name] = 'geen interieur'; p.exitVehicle(map, w); driving = false; continue; }
      const L = [e.fx, e.fy], R = [e.fy, -e.fx];
      const pose = (dx, dy, dz) => ({ position: { x: e.x, y: e.y, z: e.z }, lookAt: { x: e.x + dx, y: e.y + dy, z: e.z + dz }, fov: 74, cut: true, interior: true });
      await shotAt('interieur-' + name + '-voor', pose(L[0] * 30, L[1] * 30, -0.4), 1500);
      await shotAt('interieur-' + name + '-deur', pose(R[0] * 5 + L[0] * 1.2, R[1] * 5 + L[1] * 1.2, -2), 1500);
      await shotAt('interieur-' + name + '-dak', pose(L[0] * 4, L[1] * 4, 3), 1500);
      // buiten, deur open (bus-achtige stand niet nodig): de bestuurdersdeur via de deurlaag
      p.exitVehicle(map, w);
      driving = false;
      out[name] = { len: v.model.len, eye: [+e.x.toFixed(1), +e.y.toFixed(1), +e.z.toFixed(2)], deuren: JSON.stringify(v.doors && v.doors.open), hoek: +v.angle.toFixed(2) };
      w.vehicles.splice(w.vehicles.indexOf(v), 1);
    }
    return out;
  } },
  { id: 'lekkeband', issues: [41], run: async () => {
    const FL = await imp('flatlook');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    if (!rd) return { fout: 'geen weg bij de Grote Markt' };
    await go(rd.x, rd.y, rd.a, SETTLE);
    const out = {};
    for (const name of ['sedan', 'suv']) {
      const model = VH.TRAFFIC_MODELS().find((m) => m.name === name);
      if (!model) { out[name] = 'model niet gevonden'; continue; }
      const v = new VH.Vehicle(rd.x, rd.y, rd.a, { ...model });
      w.vehicles.push(v);
      const hold2 = { v, x: rd.x, y: rd.y, a: rd.a };
      const keep = setInterval(() => { v.x = rd.x; v.y = rd.y; v.angle = rd.a; v.speed = 0; }, 30);
      await sleep(800);
      const g = gh(rd.x, rd.y), c = Math.cos(rd.a), sn = Math.sin(rd.a);
      const side = FL.flatSide(v.id);
      const nx = -sn * side, ny = c * side; // naar de kant van de lekke band
      const cam = (k) => ({ position: { x: rd.x + c * v.model.len * 0.45 + nx * 3.2 * k, y: rd.y + sn * v.model.len * 0.45 + ny * 3.2 * k, z: g + 0.8 }, lookAt: { x: rd.x + c * v.model.len * 0.3, y: rd.y + sn * v.model.len * 0.3, z: g + 0.35 }, fov: 50, cut: true });
      await shotAt('lekkeband-' + name + '-heel', cam(1), 1500);
      v.flat = true;
      await sleep(600);
      await shotAt('lekkeband-' + name + '-lek', cam(1), 1500);
      await shotAt('lekkeband-' + name + '-andere-kant', cam(-1), 1500);
      clearInterval(keep);
      out[name] = { kant: side };
      w.vehicles.splice(w.vehicles.indexOf(v), 1);
    }
    return out;
  } },
  { id: 'interieurklasse', issues: [51], run: async () => {
    const CI = await imp('carinterior');
    const SH = await imp('shops');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    if (!rd) return { fout: 'geen weg bij de Grote Markt' };
    await go(rd.x, rd.y, rd.a, SETTLE);
    const out = {};
    for (const key of ['wervelwind', 'taxi', 'politie', 'ambulance', 'klusbus', 'bakwagen', 'stadsbus']) {
      const spec = SH.VEHICLE_STOCK[key];
      const v = new VH.Vehicle(rd.x, rd.y, rd.a, { ...spec.model, color: spec.color });
      Object.assign(v, spec.flags || {});
      w.vehicles.push(v);
      await sleep(600);
      teleport(v.x, v.y);
      p.enterVehicle(v, w);
      hold = null; driving = true;
      v.speed = 0;
      await sleep(3000);
      const e = CI.interiorEyePose(v);
      if (!e) { out[key] = 'geen interieur'; p.exitVehicle(map, w); driving = false; continue; }
      const L = [e.fx, e.fy], R = [e.fy, -e.fx];
      const pose = (dx, dy, dz) => ({ position: { x: e.x, y: e.y, z: e.z }, lookAt: { x: e.x + dx, y: e.y + dy, z: e.z + dz }, fov: 74, cut: true, interior: true });
      await shotAt('ikl-' + key + '-voor', pose(L[0] * 30, L[1] * 30, -0.4), 1500);
      await shotAt('ikl-' + key + '-opzij', pose(R[0] * 5 + L[0] * 1.2, R[1] * 5 + L[1] * 1.2, -1.5), 1500);
      await shotAt('ikl-' + key + '-achter', pose(-L[0] * 5 + R[0] * 1, -L[1] * 5 + R[1] * 1, -1.5), 1500);
      p.exitVehicle(map, w);
      driving = false;
      out[key] = { klasse: (await imp('carinteriorlayout')).interiorKlasse(v) };
      w.vehicles.splice(w.vehicles.indexOf(v), 1);
    }
    return out;
  } },
  { id: 'fotomodus', issues: [199], run: async () => {
    const FM = await imp('fotomodusui');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    const voor = { ui: !!w.uiPaused, cam: !!w.cameraOverride, cine: cine.isCinematicActive(), pauze: PM.isPauseMenuOpen(), pigeon: !!w.pigeonMode, ragdoll: !!p.ragdoll };
    key('keydown', 'F8', 'F8'); await sleep(80); key('keyup', 'F8', 'F8');
    await sleep(800);
    if (!FM.isPhotoMode()) { PM.openPauseMenu('fotos'); await sleep(700); await snap('foto-galerij', 200); const b = document.querySelector('[data-foto-start]'); if (b) b.click(); await sleep(1200); }
    const ok = FM.isPhotoMode();
    if (!ok) return { gestart: false, voor };
    await sleep(1500);
    await snap('foto-start', 300);
    for (let i = 0; i < 8; i++) { key('keydown', 'e', 'KeyE'); await sleep(60); key('keyup', 'e', 'KeyE'); await sleep(30); }
    await sleep(600);
    await snap('foto-kantel', 300);
    for (let i = 0; i < 6; i++) { key('keydown', 'x', 'KeyX'); await sleep(60); key('keyup', 'x', 'KeyX'); await sleep(30); }
    await sleep(600);
    await snap('foto-dof', 300);
    key('keydown', 'f', 'KeyF'); await sleep(60); key('keyup', 'f', 'KeyF');
    await sleep(600);
    await snap('foto-filter', 300);
    key('keydown', 'Escape', 'Escape'); await sleep(80); key('keyup', 'Escape', 'Escape'); await sleep(500);
    return { gestart: ok, daarna: FM.isPhotoMode() };
  } },
  { id: 'savescherm', issues: [208], run: async () => {
    const SG = await imp('savegame');
    const SU = await imp('saveslotsui');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    hold = null;
    let saved = false;
    try { saved = !!SG.saveGame(w, { toast: false }); } catch (e) { note('saveGame: ' + e.message); }
    SU.openSaveSlots({ mode: 'game', world: w });
    await sleep(1200);
    await snap('saves-lijst', 200);
    const btn = (d) => [...document.querySelectorAll('#saveslots [data-do]')].find((b) => b.dataset.do === d);
    const r = btn('rename'); if (r) { r.click(); await sleep(500); await snap('saves-hernoemen', 200); }
    const x = btn('back'); if (x) { x.click(); await sleep(300); }
    key('keydown', 'Escape', 'Escape'); await sleep(60); key('keyup', 'Escape', 'Escape'); await sleep(400);
    return { opgeslagen: saved, knoppen: [...document.querySelectorAll('#saveslots [data-do]')].map((b) => b.dataset.do) };
  } },
  { id: 'halte', issues: [225], run: async () => {
    const HF = await imp('haltefiguren');
    const SH = await imp('shops');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    const spec = SH.VEHICLE_STOCK.stadsbus;
    const bus = new VH.Vehicle(rd.x + Math.cos(rd.a) * 12, rd.y + Math.sin(rd.a) * 12, rd.a, { ...spec.model, color: spec.color });
    Object.assign(bus, spec.flags || {});
    w.vehicles.push(bus);
    await sleep(1500);
    HF.queueHalte(w, bus, { board: 3, alight: 2 });
    const side = [-Math.sin(rd.a), Math.cos(rd.a)]; // rechts van de bus: de kant van de deuren
    const pose = { position: { x: bus.x + side[0] * 9 - Math.cos(rd.a) * 3, y: bus.y + side[1] * 9 - Math.sin(rd.a) * 3, z: gh(bus.x, bus.y) + 2.2 }, lookAt: { x: bus.x, y: bus.y, z: gh(bus.x, bus.y) + 1.2 }, fov: 60, cut: true };
    ownShot = true;
    cine.playCinematic({ id: 'fs-view', duration: 60, priority: 9, shot: () => pose });
    for (const t of [900, 1500, 1500, 2000]) { await sleep(t); console.log('[capture] halte-' + t + '-' + Math.round(performance.now() % 100000)); await sleep(400); }
    cine.skipCinematic(); ownShot = false;
    w.vehicles.splice(w.vehicles.indexOf(bus), 1);
    return { deuren: JSON.stringify(bus.doors && bus.doors.open) };
  } },
  { id: 'hudmotor', issues: [33], run: async () => {
    const SH = await imp('shops');
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    const out = {};
    for (const naam of ['stormvogel', 'knetter', 'wervelwind']) {
      const spec = SH.VEHICLE_STOCK[naam];
      const v = new VH.Vehicle(rd.x, rd.y, rd.a, { ...spec.model, color: spec.color });
      Object.assign(v, spec.flags || {});
      if (spec.kind === 'scooter') v.isScooter = true;
      w.vehicles.push(v);
      await sleep(500);
      teleport(v.x, v.y);
      p.enterVehicle(v, w);
      hold = null; driving = true;
      key('keydown', 'w', 'KeyW');
      await sleep(3500);
      await snap('hudmotor-' + naam, 300);
      key('keyup', 'w', 'KeyW');
      p.exitVehicle(map, w);
      driving = false;
      w.vehicles.splice(w.vehicles.indexOf(v), 1);
      out[naam] = { snelheid: Math.round(v.speed * 3.6) };
    }
    return out;
  } },
  { id: 'schade', issues: [205, 225], run: async () => {
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    const out = {};
    const stand = [['heel', 100, []], ['gedeukt', 80, [[1.9, 0.2, 0.9], [0.2, 0.9, 0.8]]], ['rook', 50, [[1.9, 0.1, 1.2], [-1.9, 0.3, 1.3], [0.4, -0.9, 1.7]]], ['brand', 25, [[1.9, 0, 2], [-1.9, 0.2, 1.7], [0.3, 0.9, 2], [0.2, -0.9, 2]]]];
    const model = VH.TRAFFIC_MODELS().find((m) => m.name === 'sedan');
    let i = 0;
    for (const [naam, health, dents] of stand) {
      const v = new VH.Vehicle(rd.x + Math.cos(rd.a) * (6 + i * 7), rd.y + Math.sin(rd.a) * (6 + i * 7), rd.a, { ...model });
      v.health = health; v.dentLog = dents; v.speed = 0; v.parked = true;
      w.vehicles.push(v);
      i++; out[naam] = health;
    }
    await sleep(3500);
    const bx = rd.x + Math.cos(rd.a) * 16, by = rd.y + Math.sin(rd.a) * 16;
    const side = [-Math.sin(rd.a), Math.cos(rd.a)];
    const pose = { position: { x: bx + side[0] * 13, y: by + side[1] * 13, z: gh(bx, by) + 4 }, lookAt: { x: bx, y: by, z: gh(bx, by) + 0.8 }, fov: 62, cut: true };
    await shotAt('schade-rij', pose, 3000);
    const pose2 = { position: { x: bx - Math.cos(rd.a) * 3 + side[0] * 6, y: by - Math.sin(rd.a) * 3 + side[1] * 6, z: gh(bx, by) + 2.2 }, lookAt: { x: bx + Math.cos(rd.a) * 8, y: by + Math.sin(rd.a) * 8, z: gh(bx, by) + 0.9 }, fov: 60, cut: true };
    await shotAt('schade-rook', pose2, 2500);
    for (const v of w.vehicles.slice(-4)) w.vehicles.splice(w.vehicles.indexOf(v), 1);
    return out;
  } },
  { id: 'hud', issues: [33], run: async () => {
    const rd = nearestRoadHeading(GM.x, GM.y, 250);
    await go(rd.x, rd.y, rd.a, SETTLE);
    await snap('hud-voet', 500);
    const model = VH.TRAFFIC_MODELS().find((m) => m.name === 'sedan');
    const v = new VH.Vehicle(rd.x, rd.y, rd.a, { ...model });
    w.vehicles.push(v);
    await sleep(500);
    teleport(v.x, v.y);
    p.enterVehicle(v, w);
    hold = null; driving = true;
    key('keydown', 'w', 'KeyW');
    await sleep(2500);
    await snap('hud-auto', 300);
    key('keyup', 'w', 'KeyW');
    p.exitVehicle(map, w);
    driving = false;
    w.vehicles.splice(w.vehicles.indexOf(v), 1);
    return { venster: [innerWidth, innerHeight], schaal: getComputedStyle(document.getElementById('hud') || document.body).zoom };
  } },
  // bijbanen (speeltestlus): elke bijbaan naar de plek, E, vier seconden draaien, toestand lezen, stoppen
  { id: 'bijbanen', issues: [], run: async () => {
    const SJ = await imp('sidejobs');
    const act = w.sideJobActions; if (!act) return { fout: 'world.sideJobActions ontbreekt (bijbanen niet gestart)' };
    const seen = new Set(); const out = [];
    const alle = SJ.getSideJobSpotsForRender();
    // twee bijbanen op (vrijwel) dezelfde plek: de dichtstbijzijnde wint, de ander is niet te starten
    const gestapeld = [];
    for (let i = 0; i < alle.length; i++) for (let j = i + 1; j < alle.length; j++) if (Math.hypot(alle[i].x - alle[j].x, alle[i].y - alle[j].y) < 3) gestapeld.push([alle[i].job.id, alle[j].job.id, Math.round(alle[i].x), Math.round(alle[i].y)]);
    for (const sp of alle) {
      const id = sp.job.id; if (seen.has(id)) continue; seen.add(id);
      if (JOBS.length && !JOBS.includes(id)) continue;
      w.wanted = 0; w.health = 100;
      const i0 = issues.length;
      await go(sp.x, sp.y, 0, JOBS.length ? 9000 : 3500);
      // a job whose roads were not loaded steps to its road once they are (reanchor): follow it
      for (let k = 0; k < 3 && Math.hypot(p.x - sp.x, p.y - sp.y) > 2; k++) await go(sp.x, sp.y, 0, JOBS.length ? 9000 : 3500);
      w.wanted = 0;
      let pogingen = 0;
      const diag = [];
      if (JOBS.length && D.sidejobs) {
        // één E, dan elke 300 ms kijken wat er met de baan en zijn voertuig gebeurt
        await tap('e', 'KeyE', 160);
        for (let k = 0; k < 14; k++) {
          const c = D.sidejobs.ctx(); const bn = document.querySelector('.cine-banner');
          diag.push({ k, actief: !!c, voertuig: c && c.vehicle ? { x: Math.round(c.vehicle.x), y: Math.round(c.vehicle.y), sunk: !!c.vehicle.sunk, wrecked: !!c.vehicle.wrecked, inWereld: w.vehicles.includes(c.vehicle), inWater: !!(c.vehicle.inWater || c.vehicle.wet) } : null, banner: bn && !bn.hidden ? `${(bn.querySelector('.cb-title') || {}).textContent}: ${(bn.querySelector('.cb-reason') || {}).textContent}` : null, speler: [Math.round(p.x), Math.round(p.y)], inAuto: !!p.inVehicle });
          await sleep(300);
        }
      }
      while (pogingen < (JOBS.length ? 5 : 3) && !act.active()) { pogingen++; if (Math.hypot(p.x - sp.x, p.y - sp.y) > 2) await go(sp.x, sp.y, 0, 4000); await tap('e', 'KeyE', 160); await sleep(JOBS.length ? 3000 : 1500); }
      const gestart = act.active();
      const dichtbij = Math.round(Math.hypot(p.x - sp.x, p.y - sp.y) * 10) / 10;
      const water = !!(p.swimming || p.water);
      const melding = gestart ? null : (w.messages || []).slice(-3).map((m) => (m.text || '').slice(0, 80));
      const bn = document.querySelector('.cine-banner');
      const banner = !gestart && bn && !bn.hidden ? `${(bn.querySelector('.cb-title') || {}).textContent}: ${(bn.querySelector('.cb-reason') || {}).textContent}` : null;
      let staat = null;
      if (gestart) {
        await sleep(4000);
        const pub = w.sideJob || {};
        staat = { actief: act.active(), naam: act.name(), label: pub.label, voortgang: pub.progress, tijdOver: pub.timeLeft == null ? null : Math.round(pub.timeLeft) };
        await snap('bijbaan-' + id, 200);
        act.stop(); await sleep(4500);
      }
      out.push({ id, naam: sp.job.name, x: Math.round(sp.x), y: Math.round(sp.y), dichtbij, water, pogingen, gestart, melding, banner, diag, juisteBaan: gestart ? (staat && staat.naam === sp.job.name) : null, staat, meldingen: issues.slice(i0).map((x) => x.m) });
    }
    return { gestapeld, banen: out, opmerking: 'alleen starten en vier seconden meedraaien; niet gespeeld tot een klus af was, niet beoordeeld: balans, uitleg en loon' };
  } },
  // zijmissies van #26: per missie een route vanaf de Grote Markt, naar de plek, E, en spelen: de keuzebanen worden helemaal gespeeld (antwoorden
  // tot het loon), de ritten en de rave starten en draaien vier seconden; beelden van paneel, marker en uitslag (pictogram: de kaart-check)
  { id: 'zijmissies', issues: [26], run: async () => {
    const SJ = await imp('sidejobs');
    const RT = await imp('routing');
    const act = w.sideJobActions; if (!act) return { fout: 'world.sideJobActions ontbreekt (bijbanen niet gestart)' };
    const KEUZE = ['loket', 'studiestaat', 'vigilantia', 'promotie', 'kamerkoning', 'wolkenhal', 'helix', 'niemeyer', 'bernard', 'energielabel'];
    const RITTEN = ['museumbus', 'suikerbieten', 'herstelploeg', 'oogtv', 'vandermeden', 'schouwburg', 'bernardrit'];
    const IDS = JOBS.length ? JOBS : [...KEUZE, 'rechtbank', 'boa', 'cabaret', ...RITTEN, 'telefoonrave'];
    const alle = SJ.getSideJobSpotsForRender();
    const out = [];
    for (const id of IDS) {
      const sp = alle.find((q) => q.job.id === id);
      if (!sp) { out.push({ id, fout: 'geen startplek in de kaart' }); continue; }
      const i0 = issues.length;
      w.wanted = 0; w.health = 100;
      let route = null;
      try { const r = RT.planLandRoute(map, 'walk', [GM.x, GM.y], [sp.x, sp.y]); route = r && r.pts ? r.pts.length : 0; } catch (e) { route = 'fout: ' + String(e.message || e).slice(0, 80); }
      await go(sp.x, sp.y, 0, 3500);
      for (let k = 0; k < 3 && Math.hypot(p.x - sp.x, p.y - sp.y) > 2; k++) await go(sp.x, sp.y, 0, 3500);
      w.wanted = 0;
      let pogingen = 0;
      while (pogingen < 4 && !act.active()) { pogingen++; if (Math.hypot(p.x - sp.x, p.y - sp.y) > 2) await go(sp.x, sp.y, 0, 3000); await tap('e', 'KeyE', 160); await sleep(1800); }
      const rec = { id, naam: sp.job.name, x: Math.round(sp.x), y: Math.round(sp.y), route, pogingen, gestart: act.active() };
      if (!rec.gestart) { rec.melding = (w.messages || []).slice(-2).map((m) => (m.text || '').slice(0, 70)); out.push({ ...rec, meldingen: issues.slice(i0).map((x) => x.m) }); continue; }
      const geld0 = w.money;
      const t0 = performance.now(), seen = {};
      let beantwoord = 0;
      const ctx = () => (D.sidejobs && D.sidejobs.ctx ? D.sidejobs.ctx() : null);
      if (KEUZE.includes(id) || id === 'telefoonrave') {
        while (act.active() && performance.now() - t0 < (id === 'telefoonrave' ? 14000 : 70000)) {
          const c = ctx(); const d = c && c.data; const ph = d && d.phase;
          if (!seen.start) { seen.start = true; await snap('zijmissie-' + id + '-start', 400); }
          if (d && d.dest && (ph === 'carry' || ph === 'lopen') && Math.hypot(p.x - d.dest.x, p.y - d.dest.y) > 4) { await go(d.dest.x, d.dest.y, 0, 2500); continue; }
          if (ph === 'ask') { if (!seen.ask) { seen.ask = true; await snap('zijmissie-' + id + '-vraag', 500); } const n = 1 + (beantwoord % 3); await tap(String(n), 'Digit' + n); beantwoord++; await sleep(300); }
          else if (ph === 'draaien') { if (!seen.rave) { seen.rave = true; await snap('zijmissie-' + id + '-paneel', 500); } await tap('3', 'Digit3'); await sleep(400); }
          else if (ph === 'result' && !seen.res) { seen.res = true; await snap('zijmissie-' + id + '-klaar', 400); }
          await sleep(250);
        }
        if (id === 'telefoonrave' && act.active()) act.stop();
      } else {
        await sleep(4000);
        await snap('zijmissie-' + id, 200);
        act.stop();
      }
      await sleep(2500);
      out.push({ ...rec, beantwoord, klaar: !act.active(), duurS: Math.round((performance.now() - t0) / 1000), geld: Math.round(w.money - geld0), meldingen: issues.slice(i0).map((x) => x.m) });
      if (act.active()) { act.stop(); await sleep(2500); }
    }
    return { banen: out, opmerking: 'de keuzebanen zijn tot het loon gespeeld door een script (antwoord 1, 2, 3 rond); de ritten en de rave alleen gestart (vier seconden), niet gespeeld tot het einde; niet beoordeeld: uitleg, loon en of het leuk is' };
  } },
  // de ritten van #26 helemaal door de regels: elke rit start, het voertuig wordt op elk doel gezet en blijft daar staan (zo meet de regel 'stil bij het doel'),
  // tot het loon binnen is; het rijden zelf wordt hier niet gespeeld (geen gevoel voor de besturing, geen verkeer)
  { id: 'ritten26', issues: [26], run: async () => {
    const SJ = await imp('sidejobs');
    const act = w.sideJobActions; if (!act) return { fout: 'world.sideJobActions ontbreekt (bijbanen niet gestart)' };
    const IDS = JOBS.length ? JOBS : ['museumbus', 'suikerbieten', 'herstelploeg', 'oogtv', 'vandermeden', 'schouwburg', 'bernardrit'];
    const alle = SJ.getSideJobSpotsForRender();
    const out = [];
    const ctx = () => (D.sidejobs && D.sidejobs.ctx ? D.sidejobs.ctx() : null);
    for (const id of IDS) {
      const sp = alle.find((q) => q.job.id === id);
      if (!sp) { out.push({ id, fout: 'geen startplek in de kaart' }); continue; }
      const i0 = issues.length;
      w.wanted = 0; w.health = 100;
      await go(sp.x, sp.y, 0, 3500);
      for (let k = 0; k < 3 && Math.hypot(p.x - sp.x, p.y - sp.y) > 2; k++) await go(sp.x, sp.y, 0, 3500);
      let pogingen = 0;
      while (pogingen < 4 && !act.active()) { pogingen++; await tap('e', 'KeyE', 160); await sleep(1800); }
      const rec = { id, naam: sp.job.name, gestart: act.active() };
      if (!rec.gestart) { out.push({ ...rec, meldingen: issues.slice(i0).map((x) => x.m) }); continue; }
      hold = null; driving = true;
      const geld0 = w.money; const t0 = performance.now(); const gezien = [];
      let doelen = 0, voltooid = false;
      for (let ronde = 0; ronde < 6 && act.active() && !voltooid && performance.now() - t0 < 150000; ronde++) {
        const c = ctx(); const d = c && c.data;
        if (!d || !d.doelen || !c.vehicle) { await sleep(1000); continue; }
        const lijst = d.doelen.map((q) => ({ x: q.x, y: q.y }));
        doelen = lijst.length;
        for (const q of lijst) {
          if (!act.active() || w.money > geld0) break;
          c.vehicle.x = q.x; c.vehicle.y = q.y; c.vehicle.speed = 0; c.vehicle.vx = c.vehicle.vy = 0;
          p.x = q.x; p.y = q.y; p.vx = p.vy = 0;
          gezien.push([Math.round(q.x), Math.round(q.y)]);
          for (let k = 0; k < 9 && act.active() && w.money <= geld0; k++) await sleep(700);
          if (gezien.length === 1) await snap('zijmissie-' + id + '-doel', 300);
        }
        if (w.money > geld0) voltooid = true;
      }
      await snap('zijmissie-' + id + (voltooid ? '-klaar' : '-niet-klaar'), 300);
      if (act.active()) act.stop();
      driving = false;
      await sleep(2500);
      out.push({ ...rec, doelen, bezocht: gezien.length, voltooid, geld: Math.round(w.money - geld0), duurS: Math.round((performance.now() - t0) / 1000), meldingen: issues.slice(i0).map((x) => x.m) });
    }
    return { ritten: out, opmerking: 'door een script: het voertuig wordt op elk doel gezet en staat daar stil; niet gereden, niet beoordeeld: de besturing, het verkeer, het loon en of het leuk is' };
  } },
  // voertuigen (speeltestlus): elk winkelvoertuig op een weg bij de Grote Markt neerzetten, instappen, drie seconden gas, kijken of het rijdt
  { id: 'voertuigen', issues: [], run: async () => {
    const S = await imp('shops');
    const road = nearestRoadHeading(200, 45, 120) || { x: 200, y: 45, a: 0 };
    const out = [];
    for (const [vk, spec] of Object.entries(S.VEHICLE_STOCK)) {
      if (spec.kind === 'boat' || spec.kind === 'heli') continue;
      const i0 = issues.length;
      w.wanted = 0; w.health = 100;
      await go(road.x, road.y, road.a, 2500);
      hold = null;
      let v = null, fout = null;
      try { v = S.spawnStockVehicle(w, vk, road.x + 3, road.y, road.a); } catch (e) { fout = String(e && e.message || e).slice(0, 120); }
      if (!v) { out.push({ key: vk, fout: fout || 'niet gespawnd', meldingen: issues.slice(i0).map((x) => x.m) }); continue; }
      let moved = 0, top = 0, sp = null;
      try {
        teleport(v.x, v.y); p.enterVehicle(v, w);
        driving = true; key('keydown', 'w', 'KeyW');
        const x0 = v.x, y0 = v.y;
        for (let i = 0; i < 12; i++) { await sleep(250); top = Math.max(top, Math.abs(v.speed || 0)); }
        moved = Math.hypot(v.x - x0, v.y - y0);
        await snap('voertuig-' + vk, 100);
      } catch (e) { fout = String(e && e.message || e).slice(0, 120); }
      finally { key('keyup', 'w', 'KeyW'); driving = false; }
      try { if (p.inVehicle) p.exitVehicle(map, w); } catch (e) { /* ignore */ }
      try { w.vehicles.splice(w.vehicles.indexOf(v), 1); } catch (e) { /* ignore */ }
      out.push({ key: vk, soort: spec.kind, label: spec.label, bewogen: Math.round(moved * 10) / 10, top: Math.round(top * 10) / 10, fout, meldingen: issues.slice(i0).map((x) => x.m) });
    }
    return { voertuigen: out, opmerking: 'alleen: neerzetten, instappen, drie seconden gas; niet beoordeeld: besturing, geluid, uiterlijk' };
  } },
  // winkelen (speeltestlus): per winkeltype naar de deur, E, het paneel lezen, het eerste item kopen en weglopen
  { id: 'winkelen', issues: [170], run: async () => {
    const S = await imp('shops');
    const SU = await imp('shopui');
    const byType = new Map();
    for (const sh of S.getShopsForRender()) if (!sh.country && sh.type !== 'heli' && !byType.has(sh.type)) byType.set(sh.type, sh);
    const out = [];
    for (const [type, sh] of byType) {
      w.money = 5000; w.wanted = 0;
      if (PM.isPauseMenuOpen()) PM.closePauseMenu();
      await go(sh.x, sh.y, 0, 3500);
      w.wanted = 0;
      const prompt = S.shopPrimaryPrompt(w);
      const dichtbij = !!S.nearestShop(w);
      let pogingen = 0;
      // E tot het paneel opengaat (maximaal drie keer): een eerste E dat niets doet is zelf een bevinding
      while (pogingen < 3 && !SU.isShopOpen()) { pogingen++; await tap('e', 'KeyE', 160); await sleep(1500); }
      const open = SU.isShopOpen();
      const meldingen = (w.messages || []).slice(-2).map((m) => (m.text || '').slice(0, 80));
      const panel = document.getElementById('shop-menu');
      const items = panel ? [...panel.querySelectorAll('.sm-item')].map((e) => (e.textContent || '').replace(/s+/g, ' ').trim().slice(0, 60)) : [];
      await snap('winkelen-' + type, 300);
      const m0 = w.money;
      let gekocht = null;
      if (open && items.length) {
        await tap('Enter', 'Enter', 120); await sleep(500);
        await tap('Enter', 'Enter', 120); await sleep(1200);
        gekocht = { uitgegeven: m0 - w.money };
        await snap('winkelen-' + type + '-gekocht', 300);
      }
      const pauze = PM.isPauseMenuOpen();
      if (SU.isShopOpen()) { await tap('Escape', 'Escape', 120); await sleep(600); }
      if (PM.isPauseMenuOpen()) PM.closePauseMenu();
      out.push({ type, naam: sh.name, pauzeNaAfloop: pauze, prompt: prompt && prompt.label, dichtbij, pogingen, wanted: w.wanted, meldingen, open, items: items.length, eerste: items[0] || null, gekocht, dichtNaEsc: !SU.isShopOpen() });
    }
    return { winkels: out, opmerking: 'per type de eerste winkel; het eerste item is gekocht met €5000 op zak; niet beoordeeld: prijzen, voorraad, of het gekochte voertuig of kledingstuk er goed uitziet' };
  } },
  { id: 'titel', issues: [34], run: async () => {
    const SS = await imp('startscreen');
    SS.runStartScreen(w, { render() {}, relocate() {}, tick() {} });
    await sleep(1500);
    await snap('titel');
    const btn = document.querySelector('.ss-item[data-act="solo"]');
    // without a saved game Alleen spelen starts a new one: only press it when there is one to show
    const SL = await imp('saveslots');
    if (btn && SL.listSlots(null).length) { btn.click(); await sleep(1200); await snap('titel-alleen-spelen'); }
    return { knoppen: [...document.querySelectorAll('.ss-item')].map((b) => b.dataset.act) };
  } },
  { id: 'missiestop', issues: [390], run: async () => {
    // #390: een lopende missie stoppen uit het pauzemenu: eerst de vraag, dan geen mislukking, opnieuw te starten, opslag heel
    const S = window.__story; if (!S) return { fout: 'window.__story ontbreekt' };
    const MS = await imp('missions'), SG = await imp('savegame');
    const first = S.steps.find((x) => x.kind === 'mission'); if (!first) return { fout: 'geen missie in de stappenlijst' };
    S.jump(first.id, { start: true });
    for (let i = 0; i < 40 && !MS.isMissionActive(); i++) await sleep(250);
    const out = { stap: first.id, actiefVoor: MS.isMissionActive() };
    if (!out.actiefVoor) return { ...out, fout: 'de missie startte niet' };
    const geld0 = Math.round(w.money), fails0 = S.view().fails || 0;
    PM.openPauseMenu('overzicht'); await sleep(900);
    const knop = () => document.querySelector('[data-action="mission-stop"]');
    const doos = () => document.querySelector('[data-stop-confirm]');
    out.knop = !!knop(); out.knopTekst = knop() ? knop().textContent.trim() : '';
    out.oudeKnopWeg = ![...document.querySelectorAll('[data-action]')].some((b) => /afbreken/i.test(b.textContent));
    await snap('missiestop-knop');
    knop().click(); await sleep(400);
    out.vraagZichtbaar = !!doos() && !doos().hidden; out.vraagTekst = doos() ? doos().textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    out.nogActiefNaVraag = MS.isMissionActive();
    await snap('missiestop-vraag');
    document.querySelector('[data-action="mission-stop-no"]').click(); await sleep(300);
    out.nee = { vraagWeg: !!doos() && doos().hidden, nogActief: MS.isMissionActive() };
    knop().click(); await sleep(300);
    await tap('Escape', 'Escape'); await sleep(300);
    out.escSluitVraag = !!doos() && doos().hidden; out.menuNogOpen = PM.isPauseMenuOpen ? PM.isPauseMenuOpen() : null;
    if (!doos() || doos().hidden) knop().click();
    await sleep(300);
    document.querySelector('[data-action="mission-stop-go"]').click(); await sleep(1500);
    out.actiefNa = MS.isMissionActive(); out.fase = w.mission && w.mission.phase;
    out.mislukkingen = (S.view().fails || 0) - fails0; out.skipAangeboden = !!S.canSkip(); out.geldVerschil = Math.round(w.money) - geld0;
    out.menuDicht = PM.isPauseMenuOpen ? !PM.isPauseMenuOpen() : null;
    await snap('missiestop-gestopt');
    // een nieuwe start: dezelfde missie vanaf de eerste stap
    S.jump(first.id, { start: true });
    for (let i = 0; i < 40 && !MS.isMissionActive(); i++) await sleep(250);
    const st = MS.missionDebug.state();
    out.opnieuw = { actief: MS.isMissionActive(), stap: st && st.stage };
    // de opslag blijft heel
    let opslag = null;
    try { SG.saveGame(w); const sum = SG.getSaveSummary(); opslag = !!sum; } catch (e) { opslag = String(e && e.message); }
    out.opslag = opslag;
    out.ok = out.vraagZichtbaar && out.nogActiefNaVraag && out.nee.vraagWeg && out.nee.nogActief && out.escSluitVraag && !out.actiefNa && out.mislukkingen === 0 && !out.skipAangeboden && out.geldVerschil === 0 && out.opnieuw.actief && out.opslag === true;
    if (MS.isMissionActive()) w.safetyActions.cancelMission();
    return out;
  } },
  { id: 'krantenwijk', issues: [405], run: async () => {
    // #405: een krant- en folderronde: start bij de drukkerij, naar een wijk, elke brievenbus met E, en (in een vijverwijk) de luie weg
    // met de stapel in de papiercontainer; beelden van de wijk, een worp, een geland krantje en de container
    const SJ = await imp('sidejobs');
    const sp = SJ.getSideJobSpotsForRender().find((q) => q.job.id === 'krantenwijk');
    if (!sp) return { fout: 'geen startplek voor de krantenwijk in de kaart' };
    w.wanted = 0; w.health = 100;
    await go(sp.x, sp.y, 0, 4000);
    if (!D.sidejobs || !D.sidejobs.start('krantenwijk')) return { fout: 'de baan startte niet', meldingen: (w.messages || []).slice(-3).map((m) => (m.text || '').slice(0, 80)) };
    await sleep(1500);
    const out = { start: { x: Math.round(sp.x), y: Math.round(sp.y) }, rondes: [] };
    const geld0 = Math.round(w.money);
    let vijverGehad = false, nettGehad = false;
    for (let ronde = 0; ronde < 10 && !(vijverGehad && nettGehad); ronde++) {
      let c = D.sidejobs.ctx();
      for (let i = 0; i < 20 && (!c || !c.data.huizen || !c.data.huizen.length); i++) { await sleep(500); c = D.sidejobs.ctx(); }
      if (!c || !c.data.huizen || !c.data.huizen.length) { out.rondes.push({ fout: 'geen ronde' }); break; }
      const d = c.data, r = { wijk: d.wijk.name, straat: d.straat, huizen: d.huizen.length, vijver: !!d.vijver, stapel: d.stapel };
      const staat = (h) => ({ x: h.x - Math.cos(h.face) * 5, y: h.y - Math.sin(h.face) * 5, a: h.face + Math.PI });
      if (d.vijver && vijverGehad) { r.overgeslagen = 'tweede vijverronde: netjes bezorgd'; }
      const geld = Math.round(w.money);
      const eerste = staat(d.huizen[0]);
      await go(eerste.x, eerste.y, eerste.a, 2500);
      await sleep(1500); if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(500);
      r.fase = d.phase;
      if (ronde === 0) { out.wijkPub = { goal: w.sideJob && w.sideJob.goal, progress: w.sideJob && w.sideJob.progress }; await snap('krantenwijk-wijk', 300); }
      if (d.vijver && !vijverGehad) {
        // de luie weg
        vijverGehad = true;
        const dc = d.container;
        const huis0 = d.huizen[0];
        const hoek = Math.atan2(huis0.y - dc.y, huis0.x - dc.x);
        await go(dc.x + Math.cos(hoek) * 4, dc.y + Math.sin(hoek) * 4, hoek + Math.PI, 2500);
        await sleep(1500); if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(500);
        await snap('krantenwijk-container-voor', 400);
        await shotAt('krantenwijk-container-dichtbij', { position: { x: dc.x + Math.cos(hoek) * 5.5 + Math.sin(hoek) * 2.5, y: dc.y + Math.sin(hoek) * 5.5 - Math.cos(hoek) * 2.5, z: gh(dc.x, dc.y) + 2.0 }, lookAt: { x: dc.x, y: dc.y, z: gh(dc.x, dc.y) + 0.8 }, fov: 50 }, 1500);
        const prompt = c.job.prompt(c);
        r.prompt = prompt && { label: prompt.label, sub: prompt.sub };
        await tap('e', 'KeyE', 160);
        await sleep(300); await snap('krantenwijk-container-worp', 100);
        await sleep(1800);
        r.container = { fase: d.phase, lui: d.lui, stapel: d.stapel, geldVerschil: Math.round(w.money) - geld };
        await snap('krantenwijk-container-na', 400);
        out.rondes.push(r);
        await sleep(2600);
        continue;
      }
      // netjes bezorgen: elk huis, vanaf vijf meter, stilstaand
      nettGehad = true;
      let gooien = 0;
      for (const h of d.huizen) {
        const q = staat(h);
        await go(q.x, q.y, q.a, 1200);
        await tap('e', 'KeyE', 160);
        gooien++;
        if (gooien === 2) await snap('krantenwijk-worp', 120);
        await sleep(1300);
        if (gooien === 2) {
          const hh = d.huizen[0];
          await shotAt('krantenwijk-brievenbus', { position: { x: hh.x - Math.cos(hh.face) * 4.2 + Math.sin(hh.face) * 2.2, y: hh.y - Math.sin(hh.face) * 4.2 - Math.cos(hh.face) * 2.2, z: gh(hh.x, hh.y) + 1.7 }, lookAt: { x: hh.x, y: hh.y, z: gh(hh.x, hh.y) + 0.6 }, fov: 50 }, 1500);
        }
      }
      await sleep(800);
      r.worpen = { ...d.worpen };
      r.stapelOver = d.stapel;
      r.huizenStatus = d.huizen.map((h) => h.status);
      r.geldVerschil = Math.round(w.money) - geld;
      r.fase = d.phase;
      await snap('krantenwijk-geland', 300);
      out.rondes.push(r);
      await sleep(2600);
    }
    out.geldTotaal = Math.round(w.money) - geld0;
    out.vijverGehad = vijverGehad; out.nettGehad = nettGehad;
    out.laatste = D.sidejobs.last && D.sidejobs.last();
    D.sidejobs.quit(); await sleep(2500);
    out.ok = nettGehad && out.geldTotaal > 0 && out.rondes.every((q) => !q.fout) && (!vijverGehad || out.rondes.some((q) => q.container && q.container.fase === 'klaar' && q.container.geldVerschil > 0));
    return out;
  } },
];

// een controle in het spel begint niet achter het titelscherm (dat soms nog openstaat): Enter erop
const leaveStart = async () => {
  const ss = document.getElementById('start-screen');
  for (let i = 0; i < 4 && ss && ss.classList.contains('visible'); i++) { await tap('Enter', 'Enter', 120); await sleep(5000); }
};
const results = {};
for (const C of CHECKS) {
  if (ONLY.length && !ONLY.includes(C.id)) continue;
  if (C.id !== 'titel') await leaveStart();
  const i0 = issues.length;
  let out;
  try { out = await C.run(); } catch (e) { out = { fout: String(e && e.stack || e).slice(0, 400) }; }
  try { await closeAll(); } catch (e) { note('closeAll: ' + e.message); }
  driving = false; key('keyup', 'w', 'KeyW');
  results[C.id] = { issues: C.issues, ...out, meldingen: issues.slice(i0).map((x) => x.m) };
  console.log('[fs-check] ' + C.id + ' ' + JSON.stringify(results[C.id]).slice(0, 1500));
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr; console.warn = origWarn;
return JSON.stringify({ results, totaalMeldingen: issues.length });
