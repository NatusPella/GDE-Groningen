
// --- regression checks for the fixes ---
{
  const SG = await imp('savegame'), DU = await imp('dorpsuitjes');
  w.devInvuln = true;
  if (p.inVehicle) p.exitVehicle(map, w);
  teleport(100, 77); await sleep(1500);
  SG.saveGame(w, { toast: false });
  // heli run: the players stay hidden past the watchdog's 3 s
  tag('rg-heli');
  window.__heliRun.start('ballonjacht'); await sleep(4500);
  if (!(w.heliRun && w.cinematicHidePlayers)) issue('regress', `heli run hide flag ${w.cinematicHidePlayers}`);
  SG.loadLatestSave(w); await sleep(300);
  if (w.heliRun) issue('regress', 'heli run survived a load');
  await sleep(2000); await quiet();
  // padel: Naar huis hidden, a load ends it
  tag('rg-padel');
  window.__padel.start(); await sleep(1500);
  PM.openPauseMenu('game'); await sleep(400);
  const hb = document.querySelector('#pause-menu [data-action="home"]');
  if (hb && !hb.hidden) issue('regress', 'Naar huis offered during padel');
  PM.closePauseMenu(); await sleep(200);
  SG.loadLatestSave(w); await sleep(300);
  if (w.padelGame) issue('regress', 'padel survived a load');
  await sleep(2000); await quiet();
  // village tennis: a load ends it
  tag('rg-tennis');
  window.__ommeland.use('Haren', 'special'); await sleep(1200);
  if (!DU.isVillageMiniActive()) log('tennis did not start');
  SG.loadLatestSave(w); await sleep(300);
  if (DU.isVillageMiniActive()) issue('regress', 'tennis survived a load');
  await sleep(2000); await quiet();
  // quiz: walk off after the first answer, the next question must not pop up
  tag('rg-quiz');
  const qv = window.__ommeland.villages().find((q) => q.acts.some((a) => a.kind === 'quiz'));
  if (qv) {
    window.__ommeland.use(qv.name, 'special');
    for (let i = 0; i < 20 && !SU.isShopOpen(); i++) await sleep(250);
    if (!SU.isShopOpen()) log('quiz did not open');
    else {
      const it = document.querySelector('#shop-menu .sm-item'); if (it) { it.click(); await sleep(200); }
      const b = document.querySelector('#shop-menu .sm-buy'); if (b) { b.click(); await sleep(200); if (b.classList.contains('armed')) b.click(); }
      await sleep(300);
      teleport(p.x + 60, p.y + 60); await sleep(4000);
      if (SU.isShopOpen()) { issue('regress', 'quiz question popped up after walking off'); SU.closeShopMenu(); }
    }
  }
  w.devInvuln = false;
}
