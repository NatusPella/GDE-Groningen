// Scenes voor overlays, winkel, gevels en duif (#239 #250 #170 #156 #241 #228 #115): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_overlays.js
// Basis: scripts/ui/shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];
const cineM = await imp('cinematics');
const SH = await imp('shops');
const SHU = await imp('shopui');
const PIG = await imp('pigeonmode');
const ACH = await imp('achievements');
const state = () => ({
  overlays: [...document.querySelectorAll('#cine .cine-banner:not([hidden]), #name-card.on, #hud .ach-toast.on, #hud .hud-place.on, #hud .cw-panel:not([hidden])')].map((e) => e.className.split(' ')[0] + (e.classList.contains('ov-hold') ? '(wacht)' : '')),
  held: [...document.querySelectorAll('.ov-hold')].map((e) => e.id || e.className.split(' ')[0]),
});
const info = [];
if (want('resultaat')) {
  teleport(...P(100, 77));
  const rows = [['Tijd', '2:14'], ['Verwondingen', '0%'], ['Ontdekt', 'Een baas vroeg Tessa of ze de krant bezorgde, maar het was Tammo'], ['Gevolg', 'Jelle stuurt een rekening voor de ontbrekende fiets en een bos bloemen']];
  cineM.showBanner({ kind: 'pass', title: 'MISSIE GESLAAGD', reason: 'Nul krassen, vijftienhonderd punten', reward: 250, stats: rows });
  const NC = await imp('namecard');
  const SA = await imp('storyarc');
  const ck = Object.keys(SA.CHARACTERS)[0];
  NC.showNameCard(ck, { force: true });
  try { ACH.unlockAchievement(w, 'treinen'); } catch (e) { info.push('ach ' + e.message); }
  await sleep(1500);
  info.push('tijdens resultaat ' + JSON.stringify(state()));
  await shot('resultaat-lang', 600);
  for (let i = 0; i < 40 && document.querySelector('#cine .cine-banner:not([hidden])'); i++) await sleep(500);
  await sleep(1200);
  info.push('na resultaat ' + JSON.stringify(state()));
  await shot('na-resultaat', 300);
  done.push('resultaat');
}
if (want('winkel')) {
  const key = (ty, k, code) => { for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
  const shops = SH.getShopsForRender();
  for (const type of ['wapens', 'super', 'kleding', 'fietsen']) {
    const s = shops.find((q) => q.type === type);
    if (!s) { info.push('winkel ' + type + ': geen'); continue; }
    teleport(s.x, s.y);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(1500);
    for (let t = 0; t < 4 && !document.body.classList.contains('shop-open'); t++) { key('keydown', 'e', 'KeyE'); key('keyup', 'e', 'KeyE'); await sleep(700); }
    info.push('winkel ' + type + ' open ' + document.body.classList.contains('shop-open'));
    await shot('winkel-' + type, 1200);
    SHU.closeShopMenu({ save: false });
    done.push('winkel-' + type);
  }
}
if (want('gevels')) {
  // #156: de winkelvoorkant per type, vanaf de deur (de speler kijkt naar de gevel)
  const shops = SH.getShopsForRender();
  for (const type of ['super', 'kleding', 'fietsen', 'wapens', 'snack', 'kapper']) {
    const s = shops.find((q) => q.type === type);
    if (!s) { info.push('gevel ' + type + ': geen'); continue; }
    teleport(s.x, s.y);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(2500);
    await shot('gevel-' + type, 800);
    done.push('gevel-' + type);
  }
}
if (want('bord')) {
  // #228: het richtingbord bij Winsum van vier kanten (voorkant leesbaar, achterkant effen)
  clearInterval(skipper); // eigen camerastandpunt: de skipper mag het niet wegdrukken
  const BX = -3437, BY = -12067;
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  w.clock = 14;
  const hold = { x: BX, y: BY };
  const keep = setInterval(() => { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; }, 50);
  teleport(BX, BY);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(9000);
  for (const [name, a] of [['oost', 0], ['noord', Math.PI / 2], ['west', Math.PI], ['zuid', -Math.PI / 2]]) {
    const R = 9, g = gh(BX, BY);
    const pose = { position: { x: BX + Math.cos(a) * R, y: BY + Math.sin(a) * R, z: g + 2.4 }, lookAt: { x: BX, y: BY, z: g + 2.2 }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-bord', duration: 60, priority: 9, shot: () => pose });
    await sleep(2200);
    console.log('[capture] bord-' + name);
    await sleep(500);
    cine.skipCinematic();
    done.push('bord-' + name);
  }
  clearInterval(keep);
}
if (want('markers')) {
  // #115: de missiemarker (lichtkolom met pictogram) op 30, 120 en 400 m, dag en nacht
  clearInterval(skipper);
  const R = await imp('routing');
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const route = R.getActiveRoute() || R.getRoutes()[0];
  info.push('route ' + (route ? Object.keys(route).join(',') : 'geen'));
  const pts = route && (route.pts || route.points || route.path);
  const end = route && (route.to || route.target || route.end || (pts && (Array.isArray(pts[pts.length - 1]) ? { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] } : pts[pts.length - 1])));
  info.push('einde ' + JSON.stringify(end));
  if (end && isFinite(end.x)) {
    const pt = (i) => (Array.isArray(pts[i]) ? { x: pts[i][0], y: pts[i][1] } : pts[i]);
    // het punt op de route op `dist` m voor het einde (de camera staat dus op de weg, niet in een gebouw)
    const onRoute = (dist) => {
      const total = route.length || route.cum[route.cum.length - 1];
      let k = route.cum.findIndex((c) => c >= total - dist);
      if (k < 0) k = 0;
      return pt(Math.min(k, pts.length - 1));
    };
    for (const [tag, clock] of [['dag', 14], ['nacht', 23]]) {
      for (const dist of [30, 120, 400]) {
        const o = onRoute(dist), hx = o.x, hy = o.y;
        w.clock = clock;
        teleport(hx, hy);
        for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
        const keep = setInterval(() => { p.x = hx; p.y = hy; p.vx = p.vy = 0; w.clock = clock; }, 50);
        await sleep(5000);
        const g = gh(hx, hy);
        const pose = { position: { x: hx, y: hy, z: g + 1.7 }, lookAt: { x: end.x, y: end.y, z: g + 8 }, cut: true };
        if (cine.isCinematicActive()) cine.skipCinematic();
        cine.playCinematic({ id: 'vi-mark', duration: 60, priority: 9, shot: () => pose });
        await sleep(2200);
        console.log('[capture] marker-' + tag + '-' + dist);
        await sleep(500);
        cine.skipCinematic();
        clearInterval(keep);
        done.push('marker-' + tag + '-' + dist);
      }
    }
  }
}
if (want('bus')) {
  // #160: het lijnbord op de bus (voor en zij) en de bus-HUD, bij Winsum
  clearInterval(skipper);
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
  const wins = idx && idx.global.places.find((q) => q.name === 'Winsum' && q.kind !== 'suburb');
  if (wins) teleport(wins.x, wins.y);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  w.clock = 14;
  let bus = null;
  const VM = await imp('vehicle');
  const lines = VM.getBusLines();
  info.push('buslijnen ' + lines.length);
  // een lijn bij Winsum: daar wachten tot een bus op zijn lijn (busRun) in de buurt is
  const near = lines.length && wins ? lines.map((l) => ({ l, d: Math.min(...l.pts.map((q) => Math.hypot(q[0] - wins.x, q[1] - wins.y))) })).sort((x, y) => x.d - y.d)[0] : null;
  if (near) { const mid = near.l.pts[Math.floor(near.l.pts.length / 2)]; teleport(mid[0], mid[1]); info.push('lijn ' + near.l.ref + ' ' + near.l.from + '-' + near.l.to); }
  const holdP = setInterval(() => { if (near) { const mid = near.l.pts[Math.floor(near.l.pts.length / 2)]; p.x = mid[0]; p.y = mid[1]; p.vx = p.vy = 0; } }, 50);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  for (let t = 0; t < 90 && !bus; t++) { await sleep(1000); bus = w.vehicles.find((v) => v.isBus && v.busRun && Math.hypot(v.x - p.x, v.y - p.y) < 200); }
  clearInterval(holdP);
  info.push('busRun ' + JSON.stringify(bus && bus.busRun ? { line: bus.busRun.line && (bus.busRun.line.ref || bus.busRun.line.name), dir: bus.busRun.dir } : null));
  info.push('bus ' + (bus ? 'gevonden ' + Math.round(bus.x) + ',' + Math.round(bus.y) : 'geen'));
  if (bus) {
    const keep = setInterval(() => { if (bus) { bus.speed = 0; } }, 50);
    for (const [name, rel, R, up] of [['voor', 0, 4.5, 2.4], ['zij', Math.PI / 2, 5.5, 2.2], ['schuin', Math.PI / 4, 9, 2.6]]) {
      const a = bus.angle + rel, g = gh(bus.x, bus.y);
      const pose = { position: { x: bus.x + Math.cos(a) * R, y: bus.y + Math.sin(a) * R, z: g + up }, lookAt: { x: bus.x + Math.cos(bus.angle) * (rel === 0 ? 2 : 1.5), y: bus.y + Math.sin(bus.angle) * (rel === 0 ? 2 : 1.5), z: g + 2.6 }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      cine.playCinematic({ id: 'vi-bus', duration: 60, priority: 9, shot: () => pose });
      await sleep(2000);
      console.log('[capture] bus-' + name);
      await sleep(500);
      cine.skipCinematic();
      done.push('bus-' + name);
    }
    clearInterval(keep);
    p.x = bus.x; p.y = bus.y; p.enterVehicle && p.enterVehicle(bus, w);
    await sleep(2500);
    await shot('bus-hud', 500);
    done.push('bus-hud ' + JSON.stringify({ inVehicle: !!p.inVehicle }));
    p.exitVehicle(map, w);
  }
}
if (want('menus')) {
  // #34: subtabs en schermen die de basisscenes niet vangen
  for (const [name, tab, sub] of [['aanwijzingen', 'verhaal', 'aanwijzingen'], ['personages', 'verhaal', 'personages'], ['controller', 'controls', 'knoppen'], ['toetsenoverzicht', 'controls', 'overzicht'], ['instellingen-interface', 'settings', 'display'], ['berichten', 'telefoon', 'berichten'], ['todo-alles', 'todo', 'alles']]) {
    teleport(...P(100, 77));
    PM.openPauseMenu(tab, { sub });
    await shot('menu-' + name, 1500);
    PM.closePauseMenu();
    done.push('menu-' + name);
  }
  clearInterval(skipper);
  // de mislukt-kaart en de dood- en opgepakt-kaarten
  cineM.showBanner({ kind: 'fail', title: 'MISLUKT', reason: 'De fiets is in het water beland, Tammo ook', stats: [['Tijd', '1:12'], ['Gevolg', 'Jelle stuurt een rekening']] });
  await shot('kaart-mislukt', 1800);
  cine.skipCinematic();
  for (const [tag, busted] of [['dood', false], ['opgepakt', true]]) {
    cine.playCinematic({ id: 'respawn-card', priority: 4, duration: 6, letterbox: false, skippable: true, tint: busted ? 'bust' : 'death', big: busted ? 'OPGEPAKT' : 'DOOD', hideHud: false });
    await shot('kaart-' + tag, 1800);
    cine.skipCinematic();
    done.push('kaart-' + tag);
  }
}
if (want('duif')) {
  teleport(...P(100, 77));
  const wd = window.__wandeling;
  if (wd) {
    teleport(wd.spot().x, wd.spot().y);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    await sleep(1500);
    wd.start();
    await shot('wandel-aan', 1500);
    info.push('wandel voor duif ' + JSON.stringify(wd.state()));
  }
  const ok = PIG.startPigeonMode(w);
  for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
  await sleep(2500);
  info.push('duif start ' + ok + ' wandel na duif ' + JSON.stringify(wd && wd.state()) + ' hud-wandel ' + document.querySelectorAll('#hud .mg-board:not([hidden])').length);
  await shot('duif-na-wandel', 1500);
  done.push('duif');
}
clearInterval(skipper);
return done.concat(info);
