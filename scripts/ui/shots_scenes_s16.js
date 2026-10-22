// Scenes voor de restpunten van #348 (autodiefstal #49, roeiritme #28, klapgeluid #44, winkelborden Delfzijl #67): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s16.js --only=autodief --sizes=1920x1080
// Basis: scripts/ui/shots_scenes_s9.js. Het klapgeluid vraagt --args=--audio-graph,--bench-eval=scripts/qa/audiotap.js.
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

// een camera die een punt blijft volgen (cinematic met een shot-functie), tot skipCam()
let holdCam = false;
let camFollowOn = false;
const camFollow = (id, get) => {
  holdCam = true;
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id, duration: 300, priority: 9, shot: () => { const q = get(); const g = map.groundHeightAt ? map.groundHeightAt(q.x, q.y, 0) || 0 : 0; return { position: { x: q.x + q.dx, y: q.y + q.dy, z: g + q.up }, lookAt: { x: q.x, y: q.y, z: g + (q.look ?? 1) }, cut: true }; } });
};
const skipCam = () => { holdCam = false; camFollowOn = false; if (cine.isCinematicActive()) cine.skipCinematic(); };
const skipper2 = setInterval(() => { if (!holdCam && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
const clockKeeper = setInterval(() => { w.clock = 14; }, 100);

// ---- #348: autodiefstal, de bestuurder keert terug naar een achtergelaten auto (#49) ----
if (want('autodief')) {
  clearInterval(skipper);
  const CV = await imp('carjackvictim');
  const rows = [];
  const eligible = (v) => v.road && !v.driver && !v.parked && !v.isPolice && !v.isBus && !v.isBike && !v.isScooter && !v.isBoat && !v.isHeli && !v.isAmbulance && !v.wrecked && !v.hijacked && !v.carjacked && !v.isHeroCar && !v.missionCar && !v.playerOwned;
  const pick = () => w.vehicles.filter((v) => eligible(v) && Math.abs(v.speed) > 2 && Math.hypot(v.x - p.x, v.y - p.y) < 60 && CV.createVictim(v.id || 1).wantsBack).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  let v = null;
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const spots = [[p.x, p.y, 'start']];
  const gr = idx && idx.global.places.find((z) => z.name === 'Groningen' && z.kind !== 'suburb');
  if (gr) spots.push([gr.x, gr.y, 'Groningen']);
  for (const [sx, sy, naam] of spots) {
    if (v) break;
    if (naam !== 'start') teleport(sx, sy);
    for (let i = 0; i < 80 && !v; i++) { await sleep(750); v = pick(); }
    info.push('verkeer bij ' + naam + ': ' + (v ? 'auto id ' + v.id + ' gevonden, snelheid ' + v.speed.toFixed(1) : 'geen auto die terug wil') + ', voertuigen ' + w.vehicles.length);
  }
  if (v) {
    teleport(v.x - Math.sin(v.angle) * 2.4, v.y + Math.cos(v.angle) * 2.4);
    p.enterVehicle(v, w);
    await sleep(1200);
    info.push('na instappen: in auto ' + (p.inVehicle === v) + ', wanted ' + w.wanted);
    v.speed = 0;
    p.exitVehicle(map, w);
    // de speler loopt een stukje weg (binnen 40 m, dan blijft de auto na het terughalen staan)
    p.x += Math.cos(v.angle + 1.6) * 12; p.y += Math.sin(v.angle + 1.6) * 12;
    const t0 = performance.now();
    let ped = null, last = '';
    const seen = {};
    for (let i = 0; i < 400; i++) {
      await sleep(250);
      ped = ped || w.pedestrians.find((q) => q._vic && q._vicCar === v) || null;
      if (!ped) { if (i === 8) info.push('geen uitgestapte bestuurder gevonden na 2 s'); continue; }
      const ph = ped._vic ? ped._vic.phase : 'done';
      const t = (performance.now() - t0) / 1000;
      if (ph !== last || i % 8 === 0) rows.push([t.toFixed(1), ph, Math.round(Math.hypot(ped.x - v.x, ped.y - v.y) * 10) / 10, Math.round(ped.x), Math.round(ped.y), v.driver ? 'bestuurder' : 'leeg', Math.round(v.speed * 10) / 10, (ped.speechText || '').slice(0, 40)]);
      if (ph !== last && !seen[ph]) {
        seen[ph] = 1;
        if (!camFollowOn) { camFollowOn = true; camFollow('vi-dief', () => ({ x: (ped.x + v.x) / 2, y: (ped.y + v.y) / 2, dx: 9, dy: 9, up: 5, look: 1 })); await sleep(900); }
        console.log('[capture] autodief-' + ph);
        await sleep(500);
      }
      last = ph;
      if (!ped._vic || ph === 'done') { await sleep(1500); console.log('[capture] autodief-daarna'); await sleep(500); break; }
    }
    skipCam();
    info.push('afgelopen: bestuurder ' + (ped ? 'ja' : 'nee') + ', auto nog in de wereld ' + w.vehicles.includes(v) + ', fases ' + Object.keys(seen).join('>'));
  }
  info.push('autodief-log (t, fase, afstand tot auto, x, y, auto, snelheid, zegt): ' + JSON.stringify(rows));
  done.push('autodief');
}

// ---- #348: het roeiritme (#28): de snelheid bij een goed ritme, te snel tikken en niets doen ----
if (want('roeien')) {
  clearInterval(skipper);
  const BT = await imp('boattypes');
  const VH2 = await imp('vehicle');
  const WL2 = await imp('waterlevels');
  const R = window.__regatta;
  await sleep(1500);
  const ms = R ? R.marinas() : [];
  const rows = [];
  let gelukt = false;
  for (const m of ms.slice(0, 6)) {
    if (gelukt) break;
    try {
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(m.x, m.y);
      await sleep(1500);
      for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
      await sleep(2500);
      let ws = null;
      for (let r = 20; r < 500 && !ws; r += 12) for (let a = 0; a < 6.28 && !ws; a += 0.3) { const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r; const q = WL2.waterAt(map, x, y); if (q && q.navigable && q.depth > 2) ws = { x, y, a }; }
      if (!ws) { info.push('roeien: geen water bij ' + m.name); continue; }
      const boat = new VH2.Vehicle(ws.x, ws.y, 0, { ...BT.BOAT_KINDS.roeiboot });
      boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
      p.enterVehicle(boat, w);
      gelukt = true;
      info.push('roeien bij ' + m.name + ' @' + Math.round(ws.x) + ',' + Math.round(ws.y) + ', soort ' + (boat.model && boat.model.soort));
      const sample = (fase) => rows.push([fase, Math.round(performance.now() / 100) / 10, Math.round(boat.speed * 100) / 100, Math.round((boat.sailTop || 0) * 100) / 100, Math.round(((boat.roeiSt && boat.roeiSt.reeks) || 0) * 10) / 10]);
      await sleep(1500);
      for (let i = 0; i < 6; i++) { await sleep(500); sample('stil'); }
      await shot('roeien-stil', 300);
      // een goed ritme: een tik per 1,1 s
      for (let i = 0; i < 12; i++) { await press('w', 'KeyW', 120); await sleep(980); sample('ritme'); if (i === 7) await shot('roeien-ritme', 100); }
      // te snel tikken: elke 0,3 s
      for (let i = 0; i < 14; i++) { await press('w', 'KeyW', 60); await sleep(240); if (i % 2) sample('te-snel'); }
      await shot('roeien-te-snel', 100);
      for (let i = 0; i < 6; i++) { await sleep(700); sample('uitrollen'); }
      info.push('berichten ' + JSON.stringify((w.messages || []).slice(-3).map((q) => q.text)));
      p.exitVehicle(map, w);
    } catch (e) { info.push('roeien fout bij ' + m.name + ': ' + e.message); }
  }
  info.push('roeien-log (fase, t, snelheid, topsnelheid, reeks): ' + JSON.stringify(rows));
  done.push('roeien');
}

// ---- #348: de winkelborden van Delfzijl (#67), tot 700 m rond het midden ----
if (want('delfzijl')) {
  clearInterval(skipper);
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const SS3 = await imp('shopsigns3d');
  const q = idx && idx.global.places.find((z) => z.name === 'Delfzijl' && z.kind !== 'suburb');
  if (!q) info.push('Delfzijl: plaats niet in de index');
  else {
    teleport(q.x, q.y);
    await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(6000);
    for (const R2 of [220, 450, 700]) {
      const bs0 = map.buildingsNear(q.x, q.y, R2).filter((b) => b.shopFront && b.shopFront.name);
      info.push('Delfzijl binnen ' + R2 + ' m: ' + bs0.length + ' panden met winkelnaam: ' + bs0.slice(0, 8).map((b) => b.shopFront.name + ' (' + Math.round(Math.hypot(b.shopFront.ax - q.x, b.shopFront.ay - q.y)) + ' m)').join(', '));
    }
    const bs = map.buildingsNear(q.x, q.y, 700).filter((b) => b.shopFront && b.shopFront.name).sort((a, c) => Math.hypot(a.shopFront.ax - q.x, a.shopFront.ay - q.y) - Math.hypot(c.shopFront.ax - q.x, c.shopFront.ay - q.y));
    const pointIn = (x, y, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
    let n = 0;
    const keepD = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } }, 50);
    for (const b of bs.slice(0, 16)) {
      if (n >= 2) break;
      const f = b.shopFront, mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2;
      let dist = 0, cx = mx, cy = my;
      for (const dd of [7, 5.5, 4.5, 3.5]) { const tx = mx + f.nx * dd, ty = my + f.ny * dd; if (!map.buildingsNear(tx, ty, 6).some((z) => z.pts && pointIn(tx, ty, z.pts))) { dist = dd; cx = tx; cy = ty; break; } }
      if (!dist) continue;
      hold = { x: cx, y: cy };
      teleport(cx, cy);
      await sleep(4000);
      camFollow('vi-bordD', () => ({ x: mx, y: my, dx: cx - mx, dy: cy - my, up: 2.2, look: 2.4 }));
      await sleep(2400);
      console.log('[capture] delfzijl-bord-' + n);
      await sleep(500);
      skipCam();
      info.push('bord Delfzijl ' + n + ': "' + f.name + '" ' + f.type + ' borden in beeld ' + SS3.shopSignCount() + ' camera ' + dist + ' m');
      done.push('delfzijl-bord-' + n);
      n++;
    }
    clearInterval(keepD);
    hold = null;
  }
  done.push('delfzijl');
}

// ---- #348: het klapgeluid van een verkeersruzie (#44): zonder --stil en met --audio-graph meet audiotap.js of er iets klinkt ----
if (want('klap')) {
  clearInterval(skipper);
  const RR = window.__roadrage;
  const QA = window.__qaAudio;
  info.push('klap: __roadrage ' + !!RR + ', __qaAudio ' + !!QA + ', AudioContext ' + (typeof AudioContext));
  const events = [];
  const origPush = Array.prototype.push;
  const wrap = (arr) => { if (!arr || arr.__klapWrapped) return; arr.__klapWrapped = true; arr.push = function (...a) { for (const e of a) if (e && e.kind === 'bonk') events.push({ t: Math.round(performance.now()), q: QA ? QA.sfx.length : -1 }); return origPush.apply(this, a); }; };
  if (!w.audioEvents) w.audioEvents = [];
  wrap(w.audioEvents);
  const wrapTimer = setInterval(() => { if (!w.audioEvents) w.audioEvents = []; wrap(w.audioEvents); }, 50);
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const gr = idx && idx.global.places.find((z) => z.name === 'Groningen' && z.kind !== 'suburb');
  if (gr) teleport(gr.x, gr.y);
  w.health = w.maxHealth || w.health;
  let started = false;
  for (let i = 0; i < 90 && !started; i++) { await sleep(700); started = RR && RR.start(null); }
  info.push('klap: ruzie gestart ' + started + ', fase ' + JSON.stringify(RR && RR.state()));
  const t0 = performance.now();
  let fase = '';
  for (let i = 0; i < 160; i++) {
    await sleep(250);
    const st = RR && RR.state();
    if (st && st.phase !== fase) { info.push('klap: fase ' + st.phase + ' na ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s, gezondheid ' + Math.round(w.health)); fase = st.phase; if (fase === 'fight') await shot('klap-ruzie', 300); }
    if (events.length >= 2 || ((!st || !st.phase) && i > 8)) break;
  }
  clearInterval(wrapTimer);
  const rms = QA ? QA.rms : [];
  const analyse = events.map((e) => ({ t: e.t, sfxVoor: e.q, piek: Math.max(0, ...rms.filter((r) => r.t + (QA ? 0 : 0) >= e.t - 100 && r.t <= e.t + 600).map((r) => r.peak)) }));
  info.push('klap: bonk-events ' + events.length + ' ' + JSON.stringify(analyse) + '; sfx totaal ' + (QA ? QA.sfx.length : -1) + ', laatste sfx ' + JSON.stringify(QA ? QA.sfx.slice(-6) : null) + '; berichten ' + JSON.stringify((w.messages || []).slice(-4).map((q) => q.text)));
  if (RR) RR.abort();
  done.push('klap');
}

// ---- #399: de windpijl op de minikaart tijdens het zeilen, in een echte zeilboot (geen cinematic: de HUD blijft) ----
if (want('wind')) {
  clearInterval(skipper);
  const BT = await imp('boattypes');
  const VH2 = await imp('vehicle');
  const WL2 = await imp('waterlevels');
  const R = window.__regatta;
  await sleep(1500);
  const ms = R ? R.marinas() : [];
  let gelukt = false;
  for (const m of ms.slice(0, 6)) {
    if (gelukt) break;
    try {
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(m.x, m.y);
      await sleep(1500);
      for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
      await sleep(2500);
      let ws = null;
      for (let r = 20; r < 500 && !ws; r += 12) for (let a = 0; a < 6.28 && !ws; a += 0.3) { const x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r; const q = WL2.waterAt(map, x, y); if (q && q.navigable && q.depth > 2) ws = { x, y, a }; }
      if (!ws) continue;
      const boat = new VH2.Vehicle(ws.x, ws.y, ws.a + Math.PI / 2, { ...BT.BOAT_KINDS.zeilboot });
      boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
      p.enterVehicle(boat, w);
      gelukt = true;
      w.wanted = 0;
      await sleep(3000);
      info.push('wind: ' + JSON.stringify(w.wind) + ', in boot ' + (p.inVehicle === boat) + ', hoek ' + boat.angle.toFixed(2));
      for (let i = 0; i < 3; i++) { await press('q', 'KeyQ', 400); await sleep(300); }
      await sleep(5000);
      await shot('wind-zeilen-1', 200);
      // de boot draait: de pijl op de kaart draait mee (de kaart volgt de camera)
      boat.angle += Math.PI / 2;
      await sleep(4000);
      info.push('wind: ' + JSON.stringify(w.wind) + ', snelheid ' + boat.speed.toFixed(1));
      await shot('wind-zeilen-2', 200);
      p.exitVehicle(map, w);
      await sleep(2500);
      await shot('wind-aan-land', 200);
    } catch (e) { info.push('wind fout bij ' + m.name + ': ' + e.message); }
  }
  done.push('wind');
}

clearInterval(skipper2);
clearInterval(clockKeeper);
return done.concat(info);
