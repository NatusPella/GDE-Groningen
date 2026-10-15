
// --- police, respawn, save/load ---
{
  const WD = await imp('world'), CB = await imp('combat'), SG = await imp('savegame'), EC = await imp('economy');
  const PM2 = await imp('pausemenu'), SU2 = await imp('shopui'), PH2 = await imp('phone');
  const waitRespawn = async (label, ms = 45000) => {
    const t0 = performance.now();
    while ((w.pendingRespawn || cine.isCinematicActive()) && performance.now() - t0 < ms) await sleep(250);
    if (w.pendingRespawn || cine.isCinematicActive()) issue('respawn', `${label}: still pending after ${ms / 1000}s (${JSON.stringify(cine.cinematicState && cine.cinematicState() && cine.cinematicState().id)})`);
    return (performance.now() - t0) / 1000;
  };
  const after = async (label) => {
    await sleep(600);
    if (w.health < 100) issue('respawn', `${label}: health ${w.health}`);
    if (w.wanted) issue('respawn', `${label}: wanted ${w.wanted}`);
    if (p.inVehicle) issue('respawn', `${label}: still in vehicle`);
    if (document.body.classList.contains('cine-hide-hud') || w.cameraOverride || (w.timeScale ?? 1) !== 1) issue('respawn', `${label}: scene leftovers hud=${document.body.classList.contains('cine-hide-hud')} cam=${!!w.cameraOverride} ts=${w.timeScale}`);
    await moved(() => hold(['w'], 900), 'walk after ' + label);
  };
  w.devInvuln = false;
  teleport(...P(100, 77)); await sleep(2000);
  for (let n = 1; n <= 5; n++) {
    tag('wanted' + n);
    w.wanted = n; w.wantedDecayTimer = 0;
    const car = n === 3 ? spawnCar() : null;
    if (car) p.enterVehicle(car, w);
    await hold(['w'], 1500);
    await sleep(3000);
    if (w.pendingRespawn) await waitRespawn('wanted' + n);
    const cops = w.vehicles.filter((v) => v.isPolice).length;
    log('wanted', n, 'cops', cops, 'peds', w.pedestrians.length, 'health', w.health);
    if (p.inVehicle) p.exitVehicle(map, w);
    w.health = 100;
  }
  // busted (scene skipped)
  tag('busted-skip');
  w.wanted = 3;
  WD.requestRespawn(w, { busted: true, moneyPenalty: EC.bustFine(3, w.money) });
  await waitRespawn('busted (skip)');
  await after('busted (skip)');
  // death, scenes played in full
  tag('death-full');
  skipCine = false;
  teleport(...P(214, 13)); await sleep(1500);
  w.devInvuln = false;
  CB.damagePlayer(w, 999);
  const sec = await waitRespawn('death (full scene)', 60000);
  log('death scene took', sec.toFixed(1));
  await after('death (full)');
  // busted in a car, full scene
  tag('busted-car');
  const car2 = spawnCar(); if (car2) p.enterVehicle(car2, w);
  w.wanted = 2;
  WD.requestRespawn(w, { busted: true, moneyPenalty: EC.bustFine(2, w.money) });
  await waitRespawn('busted in car (full)', 60000);
  await after('busted in car (full)');
  skipCine = true;
  // death while swimming
  tag('death-swim');
  const polys = map.waterNear(...P(-33, -259), 30);
  teleport(...P(-33.0, -259.5), false); await sleep(400);
  if (p.enterSwim) p.enterSwim();
  await sleep(800);
  CB.damagePlayer(w, 999);
  await waitRespawn('death swimming');
  if (p.water) issue('respawn', 'still swimming after respawn');
  await after('death swimming');
  // death during a side job
  tag('death-job');
  if (D.sidejobs) { D.sidejobs.start('bezorger'); await sleep(3000); CB.damagePlayer(w, 999); await waitRespawn('death in job'); if (w.sideJob && w.sideJob.active) log('job still active after death'); D.sidejobs.quit(); await after('death in job'); }
  // death while the pause menu opens right after
  tag('death-pause');
  CB.damagePlayer(w, 999); await sleep(400); PM2.openPauseMenu('overzicht'); await sleep(2000); PM2.closePauseMenu();
  await waitRespawn('death + pause');
  await after('death + pause');

  // save / load
  tag('save');
  teleport(...P(100, 77)); await sleep(1500);
  w.money = 4321;
  if (!SG.saveGame(w)) issue('save', 'saveGame returned false');
  const d = SG.readSave();
  if (!d || d.money !== 4321) issue('save', `save money ${d && d.money}`);
  w.money = 5; w.health = 40;
  tag('load');
  if (!SG.loadLatestSave(w)) issue('save', 'loadLatestSave false');
  await sleep(1500); await quiet(8000);
  if (w.money !== 4321) issue('save', `money after load ${w.money}`);
  await after('load');
  // load while driving
  tag('load-car');
  const c3 = spawnCar(); if (c3) { p.enterVehicle(c3, w); await hold(['w'], 800); }
  SG.loadLatestSave(w); await sleep(1500); await quiet(8000);
  if (p.inVehicle) issue('save', 'still in a vehicle after load');
  await after('load in car');
  // load while swimming
  tag('load-swim');
  teleport(...P(-33.0, -259.5), false); await sleep(300);
  if (p.enterSwim) p.enterSwim();
  await sleep(600);
  SG.loadLatestSave(w); await sleep(1500); await quiet(8000);
  if (p.water) issue('save', 'still swimming after load');
  await after('load swimming');
  // load in a boat
  tag('load-boat');
  teleport(...P(-33.0, -259.5), false); await sleep(300);
  const bt = spawnBoat(); if (bt) { p.enterVehicle(bt, w); await hold(['w'], 800); }
  SG.loadLatestSave(w); await sleep(1500); await quiet(8000);
  if (p.inVehicle) issue('save', 'still in a boat after load');
  await after('load in boat');
  // load during a side job, a challenge, wanted, pigeon mode
  tag('load-job');
  if (D.sidejobs) { D.sidejobs.start('taxi'); await sleep(3000); SG.loadLatestSave(w); await sleep(1500); await quiet(8000); if (w.sideJob && w.sideJob.active) issue('save', 'side job still active after load'); await after('load in job'); }
  tag('load-wanted');
  w.wanted = 4; await sleep(2500); SG.loadLatestSave(w); await sleep(1500); await quiet(8000);
  const copsLeft = w.vehicles.filter((v) => v.isPolice && v._chasing).length;
  if (w.wanted) issue('save', 'wanted after load');
  await after('load wanted');
  tag('load-pigeon');
  const PG = await imp('pigeonmode');
  PG.startPigeonMode(w, null); await sleep(2000);
  SG.loadLatestSave(w); await sleep(1500); await quiet(8000);
  if (w.pigeonMode) issue('save', 'pigeon mode after load');
  await after('load pigeon');
  // pause menu buttons
  tag('load-menu');
  PM2.openPauseMenu('overzicht'); await sleep(400);
  const sb = document.querySelector('#pause-menu [data-action="save"]'); if (sb) { sb.click(); await sleep(500); }
  const lb = document.querySelector('#pause-menu [data-action="load"]'); if (lb && !lb.disabled) { lb.click(); await sleep(1500); }
  if (PM2.isPauseMenuOpen()) { issue('save', 'pause menu still open after load'); PM2.closePauseMenu(); }
  await quiet(8000);
  await after('load from menu');
  // a corrupt save (NaN money) must not break the game
  tag('load-corrupt');
  const bad = { ...SG.readSave(), money: null, health: 'x', pos: { x: NaN, y: 3 } };
  SG.applySave(w, bad); await sleep(1500); await quiet();
  if (!Number.isFinite(w.money) || !Number.isFinite(w.health) || !fin(p.x, p.y)) issue('save', `corrupt save: money ${w.money} health ${w.health} pos ${p.x},${p.y}`);
  await after('corrupt load');
}
// --- final state ---
tag('final');
await sleep(1500);
{
  const PM3 = await imp('pausemenu'), SU3 = await imp('shopui'), PH3 = await imp('phone');
  const o = { pause: PM3.isPauseMenuOpen(), shop: SU3.isShopOpen(), phone: PH3.isPhoneOpen(), ui: !!w.uiPaused, hud: document.body.classList.contains('cine-hide-hud'), keys: [...w.input.keys].join(',') };
  log('final overlays', JSON.stringify(o));
  const sp = window.__speech && window.__speech.speechState && window.__speech.speechState();
  if (sp) { log('speech', JSON.stringify({ talking: sp.talking, holds: sp.holds, queue: sp.queue && sp.queue.length })); if (sp.holds && sp.holds.length) issue('audio', 'speech holds left: ' + sp.holds.join(' ')); }
  const au = window.__audio && window.__audio.state && window.__audio.state();
  if (au) log('audio', JSON.stringify({ g: au.gmusic, scene: au.storyScene, live: au.sceneLive, voices: au.activeVoices, ctx: au.ctx }).slice(0, 400));
  memSnap('final');
}
