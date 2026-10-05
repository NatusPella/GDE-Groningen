
// --- free-roam activities (activities.js): carbid, botsauto's, geheimen, car radio ---
{
  const SG = await imp('savegame'), AC = await imp('activities');
  w.devInvuln = true;
  if (p.inVehicle) p.exitVehicle(map, w);
  teleport(100, 77); await sleep(1500);
  SG.saveGame(w, { toast: false });
  const walk = async (label) => { if (await moved(() => hold(['w'], 900), 'walk?', 0) < 0.6) await moved(() => hold(['s'], 1200), 'walk after ' + label); };
  const games = { carbid: window.__carbid, kermis: window.__kermis };
  for (const [id, g] of Object.entries(games)) {
    if (!g) { issue('activity', `no __${id}`); continue; }
    for (const how of ['play', 'load', 'home']) {
      tag(`${id}:${how}`);
      if (p.inVehicle) p.exitVehicle(map, w);
      const sp = g.spot(); teleport(sp.x, sp.y, false); await sleep(1500);
      const ok = g.start(); await sleep(2500); await quiet();
      if (!ok || !AC.isActivityActive()) { issue('activity', `${id} did not start (${how}) ${JSON.stringify(g.state())}`); continue; }
      if (how === 'play') {
        // some input: aim / drive, a shot with Space, then finish
        await hold(['a'], 500); await hold(['w'], 1200); await tap(' ', 400); await sleep(1500);
        if (id === 'carbid' && g.fire) { g.fire(0.9, 0.2, 0.5); await sleep(3000); }
        g.finish(); for (let i = 0; i < 40 && AC.isActivityActive(); i++) await sleep(250);
        await quiet();
        if (AC.isActivityActive()) { issue('activity', `${id}: still running after finish ${JSON.stringify(g.state())}`); g.quit(); }
      } else if (how === 'load') {
        SG.loadLatestSave(w); await sleep(800);
        if (AC.isActivityActive()) { issue('load', `${id} still running after loading a save`); g.quit(); }
      } else {
        PM.openPauseMenu('overzicht'); await sleep(400);
        const hb = document.querySelector('#pause-menu [data-action="home"]');
        if (hb && !hb.hidden) issue('home', `Naar huis offered during ${id}`);
        PM.closePauseMenu(); await sleep(300);
        g.quit(); await sleep(800);
      }
      await sleep(1000); await quiet();
      if (w.activityGame) issue('activity', `${id} ${how}: world.activityGame left as ${w.activityGame} (active ${AC.isActivityActive()}, paused ${w.paused}, cine ${cine.isCinematicActive()})`);
      if (w.minigameUntil > w.time + 1) issue('activity', `${id}: minigameUntil left`);
      await expectClear(`${id} ${how}`);
      await walk(`${id} ${how}`);
    }
  }
  // geheimen: walk up to each and press E
  const gh = window.__geheimen;
  if (gh) {
    for (const [k, s] of Object.entries(gh.spots())) {
      if (!s || !Number.isFinite(s.x)) continue;
      tag('geheim:' + k);
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(s.x, s.y, false); await sleep(1500);
      await tap('e'); await sleep(2500); await quiet();
      for (let i = 0; i < 6 && (gh.room() || gh.race()); i++) { await tap('e'); await sleep(1500); await quiet(); }
      if (gh.room()) { log('geheim room still open', k, JSON.stringify({ pig: !!w.pigeonMode, heli: !!w.heliRun, padel: !!w.padelGame, paused: w.paused, ui: !!w.uiPaused, act: w.activityGame, resp: !!w.pendingRespawn, train: !!w.trainDriving, keys: [...w.input.keys].join('') })); await tap('escape'); await sleep(500); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); }
      if (SU.isShopOpen()) SU.closeShopMenu();
      await sleep(500);
      await expectClear('geheim ' + k);
    }
    log('geheimen found', JSON.stringify(gh.found()));
  }
  // car radio: tune through every station while driving
  tag('radio');
  teleport(100, 77); await sleep(1200);
  const car = spawnCar();
  if (car && window.__radio) {
    p.enterVehicle(car, w);
    for (const st of window.__radio.stations()) { window.__radio.tune(st); await hold(['w'], 700); }
    log('radio', window.__radio.station(), JSON.stringify(window.__radio.queue()).slice(0, 120));
    removeVeh(car);
  }
  w.devInvuln = false;
}
