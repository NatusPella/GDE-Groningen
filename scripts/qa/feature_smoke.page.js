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
  { id: 'titel', issues: [34], run: async () => {
    const SS = await imp('startscreen');
    SS.runStartScreen(w, { render() {}, relocate() {}, tick() {} });
    await sleep(1500);
    await snap('titel');
    const btn = document.querySelector('.ss-item[data-act="saves"]');
    if (btn) { btn.click(); await sleep(1200); await snap('titel-spelstanden'); }
    return { knoppen: [...document.querySelectorAll('.ss-item')].map((b) => b.dataset.act) };
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
