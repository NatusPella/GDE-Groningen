// Paginascript van de visuele doorloop van de eerste 30 minuten (scripts/kwaliteit/eerste30.mjs). Het runnerscript plakt hiervoor
// window.__e30 (set, lijst) en scripts/trailer/lib/clip.page.js (vaste tijdstap, settle, png), en erachter `return await e30Main();`.
// Anders dan de camerapunten van de beeldregressie blijft de wereld levend (verkeer, voetgangers, HUD en de echte spelcamera), zodat
// ook mensen in schaal, drukte en de HUD gekeurd worden. Sets: opening, flat, straat, rit, plekken. Elk beeld is 1920x1080.
async function e30Main() {
  const K = window.__e30 || { set: 'flat' };
  const uit = { venster: [innerWidth, innerHeight, devicePixelRatio], beelden: {}, start: new Date().toISOString() };
  const only = (K.only || '').split(',').filter(Boolean);
  const want = (id) => !only.length || only.some((o) => id.startsWith(o));
  await loadModules();
  let HOME = null; try { HOME = await import('/js/home.js'); } catch (e) { /* geen thuis */ }
  const note = (id, o = {}) => { uit.beelden[id] = { ...o, klok: +world.clock.toFixed(2), hp: Math.round(world.health), dmg: (document.querySelector('.hud-damage') || {}).style ? document.querySelector('.hud-damage').style.opacity : null, wanted: world.wanted, regen: (world.weather && world.weather.kind), n: (world.npcs || []).length, v: (world.vehicles || []).length }; logc(id + ' ' + JSON.stringify(uit.beelden[id])); };
  const shoot = async (id, o = {}) => { if (!want(id)) return; await png(id); note(id, o); };

  // ---- spel starten zoals de speler ----
  for (let i = 0; i < 40 && !window.__menuStart && !document.body.classList.contains('game-started'); i++) await sleep(500);
  if (window.__menuStart && !document.body.classList.contains('game-started')) window.__menuStart('nieuw');
  for (let i = 0; i < 60 && !document.body.classList.contains('game-started'); i++) await sleep(500);
  let film = false;
  for (let i = 0; i < 160 && !film; i++) { film = !!(M.cine.isCinematicActive && M.cine.isCinematicActive()); if (!film) await sleep(250); }
  installVirtualTime();
  window.__clip = clipApi;
  hud(true);
  if (K.set === 'opening') {
    // het openingsfilmpje (regie doet de cameravoering; wij kijken naar wat in beeld staat)
    for (const t of (K.tijden || [1, 4, 8, 12, 16, 20, 25, 30, 36, 42, 50, 60])) {
      if (!M.cine.isCinematicActive()) break;
      M.cine.setCinematicTime(t);
      for (let k = 0; k < 24; k++) await advance({ capture: false });
      await shoot('opening-' + String(t).padStart(2, '0'), { t });
    }
  }
  for (let i = 0; i < 600 && M.cine.isCinematicActive && M.cine.isCinematicActive(); i++) { M.cine.skipAllCinematics(); await advance({ capture: false }); }
  M.set.setSetting('cinematicMoments', false);
  try { M.set.setSetting('showHints', false); } catch (e) { /* oudere instellingen */ }
  world.devInvuln = true;
  const rustig = async (label, na = 30) => { const s = await settle({ frames: 45, max: 2400, label }); for (let k = 0; k < na; k++) await advance({ capture: false }); return s; };
  const uurZet = (h) => { if (h == null) return; clock(h); };
  const kijk = async (yaw, na = 6) => { player.angle = yaw; world.camYaw = yaw; for (let k = 0; k < na; k++) await advance({ capture: false }); };
  const hoek = (dx, dz, f) => Math.atan2(dx * f.X[1] + dz * f.Y[1], dx * f.X[0] + dz * f.Y[0]);

  const diag = () => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.02; }).map((e) => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40) + ' bg=' + getComputedStyle(e).backgroundImage.slice(0, 90) + ' op=' + getComputedStyle(e).opacity + ' sh=' + getComputedStyle(e).boxShadow.slice(0, 60));
  if (K.diag) { uit.diag0 = diag(); logc('diag0 ' + JSON.stringify(uit.diag0)); }
  await rustig('start', 60);
  if (K.diag) { uit.diag1 = diag(); logc('diag1 ' + JSON.stringify(uit.diag1)); }
  note('start');

  // ---- de straat voor de deur: de nieuwe-spelstart (voor de lobbydeur) ----
  if (K.set === 'straat') {
    const h = HOME && HOME.homeSpawnPoint ? HOME.homeSpawnPoint() : { x: player.x, y: player.y, angle: 0 };
    uurZet(K.klok);
    for (let q = 0; q < 8; q++) {
      const yaw = h.angle + q * Math.PI / 4;
      await kijk(yaw, 10);
      await rustig('straat' + q, 10);
      await shoot('straat-' + q, { yaw: +yaw.toFixed(2) });
    }
  }

  // ---- de flat ----
  if (K.set === 'flat') {
    uurZet(K.klok);
    const r = window.__home.spawnInFlat();
    await rustig('flat ' + r, 40);
    const f = window.__home.home.flat;
    note('flat-binnen', { r });
    const plekken = [
      ['flat-a-spawn-gevel', 5.9, 2.6, 0, -1], ['flat-b-spawn-binnen', 5.9, 2.6, 0, 1], ['flat-c-woon-tv', 3.7, 3.2, 0, -1],
      ['flat-d-woon-bank', 2.0, 2.0, 1, 1], ['flat-e-keuken', 8.6, 2.4, 0, -1], ['flat-f-keuken-fornuis', 8.6, 1.5, 1, 0],
      ['flat-g-eetplek', 8.2, 4.4, -1, -1], ['flat-h-gang-in', 1.7, 7.9, 0, -1], ['flat-i-gang-uit', 1.7, 6.0, 0, 1],
      ['flat-j-tammo', 5.4, 7.0, 0, 1], ['flat-k-tessa', 9.2, 7.0, 0, 1], ['flat-l-bank-tegen', 4.3, 1.4, 0, 1], ['flat-m-keuken-terug', 10.4, 3.2, -1, 0],
    ];
    for (const [id, lx, lz, dx, dz] of plekken) {
      if (!want(id)) continue;
      const [x, y] = f.fl(lx, lz);
      player.x = x; player.y = y; player.vx = player.vy = 0;
      await kijk(hoek(dx, dz, f), 40);
      await shoot(id, { lx, lz });
    }
  }

  // ---- de rit met de Fjord Escapade van de flat naar het centrum ----
  if (K.set === 'rit') {
    uurZet(K.klok);
    const h = HOME && HOME.homeSpawnPoint ? HOME.homeSpawnPoint() : { x: player.x, y: player.y };
    const B = K.doel || [213.8, 9.9];
    let pts = route([h.x, h.y], B);
    if (!pts || pts.length < 2) throw new Error('geen route');
    if (K.vanaf != null || K.tot != null) { // een stuk van de route (meters vanaf de start): een run mag niet langer dan vier minuten duren
      let L = 0; const cum = pts.map((q, i) => (i ? (L += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y)) : 0));
      pts = pts.filter((q, i) => cum[i] >= (K.vanaf || 0) - 20 && cum[i] <= (K.tot || 1e9) + 20);
      if (pts.length < 2) throw new Error('route te kort voor vanaf/tot');
    }
    const a0 = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const hero = spawn('hero', pts[0].x, pts[0].y, a0);
    placePlayer(hero.x + 3, hero.y + 3);
    enter(hero);
    const d = driver(pts, { top: 13, sweep: false, stopAtEnd: true });
    uit.routeLen = Math.round(d.path.len);
    let n = 0, k = 0, laatste = -999;
    let vast = 0, vp = 0;
    while (!d.done && n < 4000) {
      if (n % 240 === 239) { vast = (d.s - vp < 2) ? vast + 1 : 0; vp = d.s; if (vast >= 2) { logc("rit vast op s=" + Math.round(d.s)); break; } }
      d.tick(); await advance({ capture: false }); n++;
      if (n % 3 === 0 && n > 120 && d.s - laatste >= (K.stap || 120)) { laatste = d.s; k++; await shoot('rit-' + String(k).padStart(2, '0'), { s: Math.round(d.s), speed: +(player.inVehicle ? player.inVehicle.speed : 0).toFixed(1) }); }
    }
    d.stop();
    await rustig('rit-einde', 40);
    await shoot('rit-aankomst');
  }

  // ---- plekken van M01 t/m M05 op de voet ----
  if (K.set === 'plekken') {
    const RD = await import('/js/rdnew.js');
    const lm = (naam) => (world.map.meta && world.map.meta.landmarks || []).find((l) => l.name === naam);
    for (const p of (K.lijst || [])) {
      if (!want(p.id)) continue;
      leave(); releaseCam();
      uurZet(p.uur ?? K.klok);
      const l = p.landmark ? lm(p.landmark) : null;
      let doelXY = null;
      if (p.stap) { // de plek waar het verhaal je naartoe stuurt: spring naar de stap en lees de wijzer
        try { window.__story.jump(p.stap); } catch (e) { logc('jump faalde ' + e.message); }
        for (let k = 0; k < 90; k++) await advance({ capture: false });
        for (let k = 0; k < 20 && !(world.storyGuide && world.storyGuide.step === p.stap); k++) await advance({ capture: false });
        const g = world.storyGuide; if (!g) { logc(p.id + ': geen wijzer'); continue; }
        doelXY = [g.x, g.y]; logc(p.id + ' wijzer ' + JSON.stringify({ x: g.x, y: g.y, name: g.name, step: g.step }));
        leave(); releaseCam(); uurZet(p.uur ?? K.klok);
      }
      const ll = p.ll ? RD.wgsToWorld(p.ll[0], p.ll[1]) : null;
      const x = ll ? ll[0] : p.xy ? p.xy[0] : l ? l.x : player.x, y = ll ? ll[1] : p.xy ? p.xy[1] : l ? l.y : player.y;
      placePlayer(doelXY ? doelXY[0] - (p.af || 9) : x, doelXY ? doelXY[1] : y);
      hud(true);
      await rustig(p.id, 40);
      if (doelXY) { const a0 = Math.atan2(doelXY[1] - player.y, doelXY[0] - player.x); p.yaws = [a0, a0 + 0.9, a0 - 0.9, a0 + 3.14]; }
      let q = 0;
      for (const yw of (p.yaws || [0, 1.57, 3.14, 4.71])) { await kijk(yw, 30); await shoot(p.id + '-' + q++, { yaw: yw, x: +player.x.toFixed(1), y: +player.y.toFixed(1) }); }
    }
  }
  uit.einde = new Date().toISOString();
  await gd.clip('json', { name: 'eerste30-' + K.set, data: uit });
  return JSON.stringify({ set: K.set, beelden: Object.keys(uit.beelden).length });
}
