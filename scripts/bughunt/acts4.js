// --- 0.27 features: foldable menu, horse seat, bus job, skutsje + koe challenges, save/load mid-state, calls ---
{
  const SG = await imp('savegame'), SJ = window.__debug.sidejobs, PG = window.__postgame, PMT = await imp('policemounts');
  const step = async (name, fn) => { tag(name); try { await fn(); } catch (e) { issue('script', `${name}: ${e && e.message}`); } await quiet(); };
  w.devInvuln = true;
  if (p.inVehicle) p.exitVehicle(map, w);
  teleport(...P(100, 77)); await sleep(1500);

  await step('menu-sections', async () => {
    for (const sec of ['overzicht', 'telefoon', 'todo', 'verhaal', 'spullen', 'map', 'garage', 'prestaties', 'streken', 'settings', 'controls']) {
      tag('menu:' + sec);
      PM.openPauseMenu(sec); await sleep(350);
      for (const k of ['[', ']', 'e', 'q']) { await tap(k, 40); }
      for (const b of [...document.querySelectorAll('#pause-menu [data-subtab]')].slice(0, 12)) { b.click(); await sleep(60); }
      const cards = [...document.querySelectorAll('#pause-menu [data-panel]:not([hidden]) .td-card, #pause-menu [data-panel]:not([hidden]) [data-cheat]')].slice(0, 8);
      for (const c of cards) { c.focus(); c.click(); await sleep(50); }
      await tap('Escape', 40); await sleep(150);
      if (PM.isPauseMenuOpen()) await tap('Escape', 40);
      await sleep(150);
      PM.closePauseMenu();
    }
    await expectClear('menu sections');
  });

  await step('menu-in-vehicle', async () => {
    const car = spawnCar(); if (!car) return;
    p.enterVehicle(car, w); await sleep(300);
    await hold(['w'], 800);
    PM.openPauseMenu('spullen'); await sleep(400);
    await tap('e', 40); await sleep(200);
    PM.closePauseMenu(); await sleep(300);
    await hold([' '], 300);
    removeVeh(car);
    await expectClear('menu in vehicle');
  });

  await step('horse', async () => {
    teleport(...P(100, 77)); await sleep(800);
    const h = PMT.spawnPoliceMountNear(w, 'horse', false);
    if (!h) { log('no horse spawn here'); return; }
    h.bhTemp = true;
    p.x = h.x - 1.2; p.y = h.y; await sleep(200);
    p.enterVehicle(h, w);
    if (p.inVehicle !== h) { issue('horse', 'could not mount'); return; }
    w.camYaw = h.angle;
    await hold(['w', 'shift'], 2500);
    await hold(['a'], 600);
    await hold([' '], 500);
    SG.saveGame(w, { toast: false });
    PM.openPauseMenu('overzicht'); await sleep(300); PM.closePauseMenu();
    await tap('h', 200);
    if (p.inVehicle) p.exitVehicle(map, w);
    await sleep(500);
    removeVeh(h);
  });

  await step('jump-vault', async () => {
    teleport(...P(100, 77)); await sleep(800);
    for (let i = 0; i < 6; i++) { await hold(['w', 'shift'], 400); await tap(' ', 80); await sleep(400); }
    SG.saveGame(w, { toast: false });
    await tap(' ', 40); SG.loadLatestSave(w); await sleep(400);
    if (p.vault || p.perch || p.swimming) issue('vault', 'state left after load ' + JSON.stringify({ v: !!p.vault, pe: !!p.perch, sw: p.swimming }));
  });

  await step('bus-job', async () => {
    if (!SJ) { issue('bus', 'no sidejobs debug'); return; }
    SG.saveGame(w, { toast: false });
    const sp = SJ.spots().find((q) => q.job.id === 'bus');
    for (const how of ['quit', 'load', 'menu']) {
      tag('bus:' + how);
      teleport(sp.x, sp.y, false); await sleep(1000);
      const ok = SJ.start('bus'); await sleep(3000); await quiet();
      const c = SJ.ctx();
      if (!ok || !c) { issue('bus', `did not start (${how})`); continue; }
      if (c.vehicle) { p.enterVehicle(c.vehicle, w); await hold(['w'], 1500); }
      if (how === 'quit') SJ.quit();
      else if (how === 'load') { SG.loadLatestSave(w); await sleep(500); if (SJ.ctx()) { issue('bus', 'still running after load'); SJ.quit(); } }
      else { PM.openPauseMenu('overzicht'); await sleep(300); PM.closePauseMenu(); SJ.quit(); }
      await sleep(600);
      if (p.inVehicle) p.exitVehicle(map, w);
    }
  });

  await step('challenges', async () => {
    if (!PG) { issue('postgame', 'no __postgame'); return; }
    PG.unlock(); await sleep(500);
    for (const id of ['skutsje', 'koe']) {
      for (const how of ['win', 'abort', 'load', 'pause']) {
        tag(`${id}:${how}`);
        teleport(...P(100, 77)); await sleep(500);
        SG.saveGame(w, { toast: false });
        let ok = false;
        try { ok = PG.start(id); } catch (e) { issue('challenge', `${id} start threw ${e.message}`); }
        await sleep(2500); await quiet(12000);
        if (!ok) { issue('challenge', `${id} did not start (${how})`); continue; }
        if (p.inVehicle) await hold(['w', 'q'], 1500);
        if (how === 'win') { PG.win(); await sleep(2500); await quiet(12000); }
        else if (how === 'abort') { PG.abort(); await sleep(500); }
        else if (how === 'load') { SG.loadLatestSave(w); await sleep(700); }
        else { PM.openPauseMenu('overzicht'); await sleep(600); PM.closePauseMenu(); PG.abort(); await sleep(500); }
        await quiet(12000);
        if (PG.state()) { issue('challenge', `${id}: still running after ${how}`); PG.abort(); }
        if (w.noLookBack) issue('challenge', `${id}: noLookBack left on after ${how}`);
        if (w.startLockUntil > w.time + 1) issue('challenge', `${id}: startLock left on after ${how}`);
        if (p.inVehicle) p.exitVehicle(map, w);
        await expectClear(`${id}:${how}`);
      }
    }
  });

  await step('calls', async () => {
    const PF = window.__phonefeed;
    if (!PF) { issue('phone', 'no __phonefeed'); return; }
    let ended = 0;
    PF.call({ from: 'Test', lines: [{ text: 'Eén.' }, { text: 'Twee.' }], onEnd: () => ended++ });
    await sleep(6000);
    PF.hangUp(); PF.hangUp(); PF.hangUp();
    await sleep(3000);
    if (ended > 1) issue('phone', `onEnd fired ${ended}x`);
  });

  await step('cheats', async () => {
    PM.openPauseMenu('streken'); await sleep(400);
    for (const b of [...document.querySelectorAll('#pause-menu [data-panel="streken"] button, #pause-menu [data-panel="streken"] input[type=checkbox]')].slice(0, 40)) {
      if (b.closest('[hidden]')) continue;
      try { b.click(); } catch (e) { issue('cheats', e.message); }
      await sleep(80);
      if (!PM.isPauseMenuOpen()) PM.openPauseMenu('streken');
    }
    PM.closePauseMenu(); await sleep(1500);
    if (p.inVehicle) p.exitVehicle(map, w);
    await moved(() => hold(['w'], 800), 'walk after cheats', 0.3);
  });
}
