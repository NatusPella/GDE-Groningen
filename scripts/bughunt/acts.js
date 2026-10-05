
// --- activities, UI, minigames ---
const walkCheck = async (label) => { await quiet(); if (await moved(() => hold(['w'], 900), 'walk?', 0) < 0.6) await moved(() => hold(['s'], 1200), `walk after ${label} (W and S, water ${!!p.water})`); };
const act = async (name, fn) => {
  if (window.__bhOnly && !window.__bhOnly.includes(name)) return;
  tag(name);
  try { await fn(); } catch (e) { issue('script', `${name}: ${e && e.message}`); }
  await quiet();
};
w.devInvuln = true;
teleport(100, 77); await sleep(2000);

await act('pause-tabs', async () => {
  for (const t of ['overzicht', 'telefoon', 'todo', 'verhaal', 'spullen', 'map', 'garage', 'prestaties', 'streken', 'settings', 'controls']) {
    PM.openPauseMenu(t); await sleep(500);
    if (!PM.isPauseMenuOpen()) issue('pause', `tab ${t} did not open`);
    const sel = PM.pauseMenuTab() === t;
    if (!sel) issue('pause', `tab ${t} not selected`);
  }
  // click through tabs too
  for (const b of document.querySelectorAll('#pause-menu [data-tab]')) { b.click(); await sleep(250); }
  PM.closePauseMenu();
  await expectClear('pause menu');
  // Escape opens / closes
  await tap('escape'); await sleep(300);
  if (!PM.isPauseMenuOpen()) issue('pause', 'Escape did not open the pause menu');
  await tap('escape'); await sleep(300);
  if (PM.isPauseMenuOpen()) issue('pause', 'Escape did not close the pause menu');
  await expectClear('pause menu (esc)');
  await walkCheck('pause');
});

await act('map', async () => {
  await tap('m'); await sleep(500);
  if (!MV.isMapOpen()) issue('map', 'M did not open the map');
  await tap('m'); await sleep(400);
  if (MV.isMapOpen()) { await tap('escape'); await sleep(300); }
  if (MV.isMapOpen() || PM.isPauseMenuOpen()) { issue('map', 'M/Esc did not close the map'); PM.closePauseMenu(); }
  await expectClear('map');
});

await act('phone', async () => {
  // the phone is the pause menu's Telefoon section: call every contact, read every thread
  PM.openPauseMenu('telefoon', { sub: 'contacten' }); await sleep(400);
  if (!PH.isPhoneOpen()) issue('phone', `Telefoon did not open ${JSON.stringify(await pausedWhy())}`);
  const n = document.querySelectorAll('#pause-menu [data-ph-contact]').length;
  for (let i = 0; i < n; i++) {
    PM.openPauseMenu('telefoon', { sub: 'contacten' }); await sleep(300);
    const b = document.querySelector(`#pause-menu [data-ph-contact="${i}"]`);
    if (!b) { issue('phone', `no contact ${i}`); continue; }
    const label = b.textContent.trim();
    b.click(); await sleep(1400);
    const acts = [...document.querySelectorAll('#pause-menu [data-ph-act]')];
    if (!acts.length) issue('phone', `contact ${label}: no call actions after ringing`);
    // the first action (map, mission, delivery); hang up when it is the only one
    if (acts[0]) { acts[0].click(); await sleep(700); }
    if (PM.isPauseMenuOpen()) { PM.closePauseMenu(); await sleep(200); }
    if (MV.isMapOpen()) { MV.setMapActive(w, false); await sleep(200); }
    await quiet(4000);
    await expectClear('phone contact ' + label);
  }
  PM.openPauseMenu('telefoon', { sub: 'berichten' }); await sleep(300);
  const th = document.querySelector('#pause-menu [data-ph-thread]');
  if (th) { th.click(); await sleep(300); if (!document.querySelector('#pause-menu .ph-thread')) issue('phone', 'thread did not open'); }
  await tap('escape'); await sleep(200);
  if (PM.isPauseMenuOpen()) await tap('escape');
  await sleep(200);
  if (PM.isPauseMenuOpen()) { issue('phone', 'Esc did not close the phone'); PM.closePauseMenu(); }
  await walkCheck('phone');
});

await act('shops', async () => {
  const SH = await imp('shops');
  const seen = new Set();
  for (const s of SH.getShopsForRender()) {
    if (seen.has(s.type)) continue; seen.add(s.type);
    tag('shop:' + s.type);
    teleport(s.x, s.y, false); await sleep(900);
    await tap('e'); await sleep(600);
    if (!SU.isShopOpen()) { issue('shop', `${s.type} ${s.name} did not open at (${Math.round(s.x)},${Math.round(s.y)})`); continue; }
    const items = document.querySelectorAll('#shop-menu .sm-item');
    if (items[1]) { items[1].click(); await sleep(250); }
    const close = document.querySelector('#shop-menu .sm-close');
    if (close) close.click(); else SU.closeShopMenu();
    await sleep(300);
    if (SU.isShopOpen()) { issue('shop', `${s.type}: close button did not close`); SU.closeShopMenu(); }
    await expectClear('shop ' + s.type);
  }
  await walkCheck('shops');
});

await act('horeca', async () => {
  const H = await imp('horeca');
  const sp = H.getHorecaForRender()[0];
  if (!sp) return issue('horeca', 'no spots');
  w.health = 50; teleport(sp.x, sp.y, false); await sleep(700);
  await tap('e'); await sleep(1500); await quiet();
  await expectClear('horeca');
  await walkCheck('horeca');
});

await act('garage', async () => {
  const G = await imp('garages');
  const g = G.getGaragesForRender()[0];
  if (!g) return issue('garage', 'no garages');
  teleport(g.x, g.y, false); await sleep(600);
  const car = spawnCar(); if (!car) return issue('garage', 'no car');
  car.x = g.x; car.y = g.y; p.enterVehicle(car, w); await sleep(1200);
  await tap('r'); await sleep(800);
  if (!SU.isShopOpen()) issue('garage', `R in a garage did not open the menu at (${Math.round(g.x)},${Math.round(g.y)}) keys ${Object.keys(g).join(',')}`);
  SU.closeShopMenu(); await sleep(300);
  removeVeh(car);
  await expectClear('garage');
});

await act('sidejobs', async () => {
  for (let i = 0; i < 30 && !D.sidejobs; i++) await sleep(100);
  const SJ = D.sidejobs;
  if (!SJ) return issue('sidejob', 'no __debug.sidejobs');
  for (const id of ['bezorger', 'taxi', 'bus', 'rondvaart', 'fietsdepot', 'verhuizing', 'rondvaarttour']) {
    tag('job:' + id);
    if (p.inVehicle) p.exitVehicle(map, w);
    const sp = SJ.spots().find((q) => q.job && q.job.id === id);
    if (sp) { teleport(sp.x, sp.y, false); await sleep(1200); await tap('e'); await sleep(600); }
    if (!SJ.ctx()) SJ.start(id);
    await sleep(3500); await quiet();
    // get on the job's vehicle like a player would
    const jv = SJ.ctx() && SJ.ctx().vehicle;
    if (jv && !p.inVehicle) { teleport(jv.x, jv.y, false); p.enterVehicle(jv, w); }
    if (!SJ.ctx() && !(w.sideJob && w.sideJob.active)) issue('sidejob', `${id} did not start: last ${JSON.stringify(SJ.last())} msgs ${w.messages.map((m) => m.text).join(' | ')}`);
    await hold(['w'], 800);
    SJ.quit(); await sleep(1500); await quiet();
    if (SJ.ctx() || (w.sideJob && w.sideJob.active)) issue('sidejob', `${id} did not stop`);
    if (p.inVehicle) p.exitVehicle(map, w);
    const left = w.vehicles.filter((v) => v.sideJob && v.missionCar).length;
    if (left) issue('sidejob', `${id}: ${left} job vehicles left flagged`);
    await expectClear('job ' + id);
    await sleep(3200); // job cooldown
  }
  await walkCheck('sidejobs');
});

await act('padel', async () => {
  const pd = window.__padel; if (!pd) return issue('padel', 'no __padel');
  const ok = pd.start(); await sleep(3000);
  if (!ok || !w.padelGame) issue('padel', 'match did not start');
  pd.finish(false); await sleep(1500); await quiet();
  if (w.padelGame) issue('padel', 'match still running after finish');
  await expectClear('padel');
  await walkCheck('padel');
});

await act('heli', async () => {
  const hr = window.__heliRun; if (!hr) return issue('heli', 'no __heliRun');
  hr.start('ballonjacht'); await sleep(4000);
  if (!w.heliRun) issue('heli', 'ballonjacht did not start');
  hr.abort(); await sleep(2000); await quiet();
  if (w.heliRun) issue('heli', 'still flying after abort');
  await expectClear('heli');
  await walkCheck('heli');
});

await act('pigeon', async () => {
  const PG = await imp('pigeonmode');
  teleport(100, 77); await sleep(800);
  PG.startPigeonMode(w, null); await sleep(2500); await quiet();
  if (!w.pigeonMode) issue('pigeon', 'did not start');
  await hold(['w'], 1500);
  PG.stopPigeonMode(w); await sleep(2500); await quiet();
  if (w.pigeonMode) issue('pigeon', 'did not stop');
  await expectClear('pigeon');
  await walkCheck('pigeon');
});

await act('fierljep', async () => {
  const fj = window.__fierljep; if (!fj) return;
  const r = fj.debugVault({});
  if (r && r.handle && r.handle.done) await Promise.race([r.handle.done, sleep(15000)]);
  await quiet();
  await expectClear('fierljep');
});

await act('drunk', async () => {
  const DR = await imp('drunk');
  DR.addDrunk(w, 0.9); await sleep(300);
  await moved(() => hold(['w'], 1200), 'drunk walk');
  DR.clearDrunk(w);
});

await act('station-trip', async () => {
  const ST = await imp('stationtravel');
  const s = ST.getStationsForRender()[0];
  if (!s) return issue('station', 'no stations');
  teleport(s.x, s.y, false); await sleep(800);
  await tap('e'); await sleep(700);
  if (!SU.isShopOpen()) return issue('station', `E at ${s.name || ''} did not open the ticket menu`);
  const it = [...document.querySelectorAll('#shop-menu .sm-item')].find((e) => !e.classList.contains('disabled'));
  if (it) { it.click(); await sleep(250); }
  const buy = document.querySelector('#shop-menu .sm-buy');
  const x0 = p.x, y0 = p.y;
  skipCine = false;
  if (buy) buy.click();
  await sleep(1000);
  const t0 = performance.now();
  while (ST.isTrainTripActive() && performance.now() - t0 < 60000) await sleep(300);
  skipCine = true;
  if (ST.isTrainTripActive()) issue('station', 'train trip still active after 60 s');
  if (SU.isShopOpen()) SU.closeShopMenu();
  if (Math.hypot(p.x - x0, p.y - y0) < 50) issue('station', 'train trip did not move the player');
  await expectClear('station trip');
  await walkCheck('station trip');
});

await act('train-drive', async () => {
  const RW = await imp('railway');
  let ok = false, tried = 0;
  for (let k = 0; k < 6 && !ok; k++) {
    const t = RW.getTrains().find((q) => (q.state === 'dwell' || q.state === 'parked') && !RW.isOffMap(...RW.routePoint(q.route, q.c), 0));
    if (!t) { await sleep(3000); continue; }
    tried++;
    const [tx, ty] = RW.routePoint(t.route, t.c + (t.halfLen - 3));
    teleport(tx, ty, false); p.gz = RW.railZ(tx, ty); await sleep(300);
    await tap('e'); await sleep(800);
    ok = !!w.trainDriving;
    if (!ok) log('train not boarded', t.state, Math.round(tx), Math.round(ty), 'rz', RW.railZ(tx, ty), 'gz', p.gz, 'pz', p.z);
  }
  if (!ok) return log('no train boarded, tried', tried);
  await hold(['w'], 2500);
  await hold([' '], 5000);
  await tap('e'); await sleep(800);
  if (w.trainDriving) issue('train', 'could not leave the train cab (v ' + w.trainDriving.v + ')');
  w.wanted = 0;
  await expectClear('train drive');
  await walkCheck('train drive');
});

await act('home', async () => {
  const H = window.__home; if (!H) return issue('home', 'no __home');
  H.goHome && H.goHome(); await sleep(2500); await quiet();
  H.enter && H.enter(); await sleep(3000); await quiet();
  await moved(() => hold(['w'], 700), 'walk in flat', 0.2);
  H.leave && H.leave(); await sleep(3000); await quiet();
  await expectClear('home');
  await walkCheck('home');
});

await act('postgame', async () => {
  const pg = window.__postgame; if (!pg) return issue('postgame', 'no __postgame');
  pg.unlock();
  for (let i = 0; i < 40 && !(pg.open() && pg.spots().length); i++) await sleep(250);
  if (!pg.open()) return issue('postgame', 'unlock did not open');
  for (const id of ['bruggen', 'fierljep', 'skutsje', 'fjord', 'koe']) {
    tag('pg:' + id);
    if (p.inVehicle) p.exitVehicle(map, w);
    await sleep(300);
    const ok = pg.start(id); await sleep(2500); await quiet();
    if (!ok || !pg.state()) { issue('postgame', `${id} did not start`); continue; }
    await hold(['w'], 1000);
    if (id === 'bruggen') { pg.win(); await sleep(3000); } else pg.abort();
    for (let i = 0; i < 30 && pg.state(); i++) await sleep(200);
    await quiet();
    if (pg.state()) issue('postgame', `${id} still running`);
    if (w.challenge) issue('postgame', `${id}: world.challenge left behind`);
    if (p.inVehicle) p.exitVehicle(map, w);
    await expectClear('postgame ' + id);
    await walkCheck('postgame ' + id);
  }
});

await act('ommeland', async () => {
  const om = window.__ommeland; if (!om) return issue('ommeland', 'no __ommeland');
  const vs = om.villages();
  for (const v of vs) {
    for (const a of v.acts) {
      tag('om:' + v.name + ':' + a.kind);
      if (p.inVehicle) p.exitVehicle(map, w);
      try { om.use(v.name, a.role || a.kind); } catch (e) { issue('ommeland', `${v.name} ${a.kind}: ${e.message}`); }
      await sleep(2500); await quiet();
      const OF = await imp('ommelandfun');
      for (let i = 0; i < 40 && OF.isVillageMiniActive && OF.isVillageMiniActive(); i++) { await tap('e'); await sleep(250); }
      if (OF.isVillageMiniActive && OF.isVillageMiniActive()) issue('ommeland', `${v.name} ${a.kind}: mini still active after 10 s`);
      if (SU.isShopOpen()) SU.closeShopMenu();
      await expectClear('ommeland ' + v.name + ' ' + a.kind);
    }
  }
  const ends = om.ends();
  for (const e of ends.slice(0, 3)) { tag('end:' + e.id); om.go(e.x, e.y); await sleep(2500); await quiet(); await expectClear('wereldeinde ' + e.id); await walkCheck('wereldeinde'); }
});

await act('heist', async () => {
  const S = window.__story;
  S.jump('H6'); await sleep(800); await quiet();
  S.teleport(); await sleep(2500); await quiet();
  const MS = await imp('missions');
  if (!MS.isMissionActive()) S.complete();
  await sleep(1500); await quiet();
  for (let k = 0; k < 4 && MS.isMissionActive(); k++) { S.objective(); await sleep(1200); await quiet(); }
  const SF = await imp('safety');
  if (MS.isMissionActive()) SF.abortMission(w);
  await sleep(2500); await quiet();
  if (MS.isMissionActive()) issue('mission', 'H6 still active after abort');
  await expectClear('heist abort');
  await walkCheck('heist');
});
await act('missions', async () => {
  const S = window.__story, MS = await imp('missions'), SF = await imp('safety');
  const ids = S.steps.filter((q) => q.kind === 'mission' && q.built !== false).map((q) => q.id);
  let n = 0;
  for (const id of ids) {
    tag('mis:' + id);
    if (p.inVehicle) p.exitVehicle(map, w);
    S.jump(id); await sleep(600); await quiet();
    S.teleport(); await sleep(1800); await quiet();
    if (!MS.isMissionActive()) { S.complete(); await sleep(1200); await quiet(); }
    if (!MS.isMissionActive()) { issue('mission', `${id} did not start ${JSON.stringify(S.current())}`); continue; }
    for (let k = 0; k < 2 && MS.isMissionActive(); k++) { S.objective(); await sleep(900); await quiet(); }
    await hold(['w'], 600);
    const mode = n++ % 3;
    if (mode === 0) SF.abortMission(w);
    else if (mode === 1) S.lose();
    else { w.devInvuln = false; (await imp('combat')).damagePlayer(w, 999); await sleep(500); }
    const t0 = performance.now();
    while ((MS.isMissionActive() || w.pendingRespawn || cine.isCinematicActive()) && performance.now() - t0 < 20000) await sleep(250);
    w.devInvuln = true;
    const how = ['abort', 'lose', 'death'][mode];
    if (MS.isMissionActive()) issue('mission', `${id}: still active after ${how}`);
    if (w.heliRun) issue('mission', `${id}: heli run left running after ${how}`);
    if (w.pigeonMode) issue('mission', `${id}: pigeon mode left on after ${how}`);
    if (w.companionHold) issue('mission', `${id}: companionHold left after ${how} ${JSON.stringify(w.companionHold).slice(0, 80)}`);
    if (w.missionPrompt) issue('mission', `${id}: missionPrompt left after ${how}`);
    if (w.startLockUntil > w.time) issue('mission', `${id}: start lock left after ${how}`);
    if (w.drunk > 0.05) issue('mission', `${id}: still drunk after ${how} ${w.drunk}`);
    if (p.inVehicle) p.exitVehicle(map, w);
    await expectClear(`mission ${id} ${how}`);
    await walkCheck(`mission ${id}`);
  }
});
memSnap('acts-end');
w.devInvuln = false;
