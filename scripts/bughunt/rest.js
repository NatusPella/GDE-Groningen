// --- Martinitoren room timing + camera override, and a save loaded over every mode (real load path) ---
{
  const SG = await imp('savegame'), MS = await imp('missions'), SU2 = await imp('shopui'), OF2 = await imp('dorpsuitjes');
  w.devInvuln = true;
  teleport(...P(100, 77)); await sleep(1500);
  SG.saveGame(w, { toast: false });
  const gh = window.__geheimen;
  const door = gh.spots().kamer;
  const camLeft = (label) => { if (w.cameraOverride && !cine.isCinematicActive()) issue('camera', `override left on after ${label}`); };
  const openRoom = async () => { teleport(door.x, door.y, false); await sleep(1200); await tap('e'); await sleep(600); };

  tag('room-timeout');
  for (const ts of [1, 0.3]) {
    w.timeScale = ts;
    await openRoom();
    if (!gh.room()) { issue('room', 'did not open'); continue; }
    const t0 = performance.now();
    while (gh.room() && performance.now() - t0 < 20000) await sleep(100);
    const secs = (performance.now() - t0 + 600) / 1000;
    log('room closed after', secs.toFixed(1), 's at timeScale', ts);
    if (gh.room() || secs > 11) issue('room', `open ${secs.toFixed(1)} s at timeScale ${ts}`);
    w.timeScale = 1; await sleep(500); camLeft('timeout');
  }

  tag('room-E');
  await openRoom(); await sleep(1500); await tap('e'); await sleep(800);
  if (gh.room()) issue('room', 'E did not close it'); camLeft('E');

  tag('room-pause');
  await openRoom();
  const PM2 = await imp('pausemenu');
  PM2.openPauseMenu('overzicht'); await sleep(400);
  if (!gh.room()) log('room closed while the pause menu opened');
  PM2.closePauseMenu(); await sleep(11000);
  if (gh.room()) issue('room', 'still open 11 s after a pause'); camLeft('pause');

  tag('room-death');
  await openRoom();
  w.devInvuln = false; w.health = 0; await sleep(300);
  for (let i = 0; i < 40 && (w.pendingRespawn || cine.isCinematicActive() || w.health <= 0); i++) { cine.skipAllCinematics(); await sleep(400); }
  w.devInvuln = true; w.health = 100; await sleep(500);
  if (gh.room()) issue('room', 'still open after death'); camLeft('death');

  tag('room-load');
  await openRoom();
  SG.loadLatestSave(w); await sleep(600);
  if (gh.room()) issue('room', 'still open after load'); camLeft('load');

  tag('load-quiz');
  const om = window.__ommeland;
  const v = om.villages().find((q) => q.acts.some((a) => a.kind === 'quiz'));
  if (v) {
    for (const role of ['special', 'amenity']) { if (SU2.isShopOpen()) break; om.use(v.name, role); await sleep(1200); }
    log('quiz shop open', SU2.isShopOpen());
    SG.loadLatestSave(w); await sleep(800);
    if (SU2.isShopOpen()) issue('load', 'quiz/shop still open after loading a save');
  } else log('no quiz village');

  tag('load-mission');
  window.__story.jump('H2'); await sleep(500); window.__story.teleport(); await sleep(1500);
  if (!MS.isMissionActive()) window.__story.complete();
  log('mission active', MS.isMissionActive());
  SG.loadLatestSave(w); await sleep(800);
  if (MS.isMissionActive()) issue('load', 'mission still running after loading a save');
  if (w.mission && w.mission.phase === 'active') issue('load', 'w.mission still active');

  tag('load-nomissions');
  window.__story.jump('H2'); await sleep(500); window.__story.teleport(); await sleep(1500);
  const d = JSON.parse(JSON.stringify(SG.readSave())); delete d.missions;
  SG.applySave(w, d); await sleep(800);
  if (MS.isMissionActive()) issue('load', 'mission still running after loading a save without mission data');

  tag('load-stats');
  w.stats.kills = 999;
  const d2 = JSON.parse(JSON.stringify(SG.readSave())); d2.stats = {};
  SG.applySave(w, d2);
  if (w.stats.kills !== 0) issue('load', 'counter kept the session value: ' + w.stats.kills);
  SG.loadLatestSave(w);
  w.devInvuln = false;
}
