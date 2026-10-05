
// --- a save loaded / Vastgelopen / Naar huis while a mode is running ---
{
  const SG = await imp('savegame'), SF = await imp('safety'), OF = await imp('dorpsuitjes'), MS = await imp('missions'), HM = await imp('home'), TD = await imp('railway');
  w.devInvuln = true;
  if (window.__postgame) window.__postgame.unlock();
  teleport(100, 77); await sleep(1500);
  SG.saveGame(w, { toast: false });
  const om = window.__ommeland;
  const modes = {
    padel: { start: async () => window.__padel.start(), on: () => !!w.padelGame },
    heliRun: { start: async () => window.__heliRun.start('ballonjacht'), on: () => !!w.heliRun },
    bruggen: { start: async () => window.__postgame.start('bruggen'), on: () => !!window.__postgame.state() },
    koe: { start: async () => window.__postgame.start('koe'), on: () => !!window.__postgame.state() },
    fierljep: { start: async () => window.__postgame.start('fierljep'), on: () => !!window.__postgame.state() },
    tennis: { start: async () => om.use('Haren', 'special'), on: () => OF.isVillageMiniActive() },
    quiz: { start: async () => { const v = om.villages().find((q) => q.acts.some((a) => a.kind === 'quiz')); return v && om.use(v.name, 'special'); }, on: () => SU.isShopOpen() },
    mission: { start: async () => { window.__story.jump('H2'); await sleep(500); window.__story.teleport(); await sleep(1500); if (!MS.isMissionActive()) window.__story.complete(); }, on: () => MS.isMissionActive() },
    sidejob: { start: async () => { const sp = D.sidejobs.spots().find((q) => q.job.id === 'bezorger'); teleport(sp.x, sp.y, false); await sleep(800); D.sidejobs.start('bezorger'); }, on: () => !!D.sidejobs.ctx() },
  };
  const how = {
    load: async () => { SG.loadLatestSave(w); },
    unstuck: async () => { SF.unstuck(w); },
    home: async () => { PM.openPauseMenu('overzicht'); await sleep(300); const b = document.querySelector('#pause-menu [data-action="home"]'); if (b && !b.disabled && !b.hidden) b.click(); else log('home button off'); await sleep(300); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); },
  };
  for (const [hk, act] of Object.entries(how)) {
    for (const [mk, m] of Object.entries(modes)) {
      if (hk !== 'load' && (mk === 'quiz')) continue;
      tag(`${hk}@${mk}`);
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(100, 77); await sleep(1200);
      try { await m.start(); } catch (e) { issue('script', `${mk} start: ${e.message}`); continue; }
      await sleep(2500);
      if (!m.on()) { log('mode did not start', mk); continue; }
      const x0 = p.x, y0 = p.y;
      // pause menu over it first, like a player would
      await act();
      await sleep(2500); await quiet(8000);
      const still = m.on();
      log(`${hk}@${mk}`, 'still on', still, 'moved', Math.round(Math.hypot(p.x - x0, p.y - y0)), 'pos', Math.round(p.x), Math.round(p.y));
      if (hk === 'load' && still) issue('load', `${mk} still running after loading a save`);
      // whatever is left: end it the normal way
      if (w.padelGame) window.__padel.finish(false);
      if (w.heliRun) window.__heliRun.abort();
      if (window.__postgame.state()) window.__postgame.abort();
      if (SU.isShopOpen()) SU.closeShopMenu();
      if (MS.isMissionActive()) SF.abortMission(w);
      if (D.sidejobs.ctx()) D.sidejobs.quit();
      for (let i = 0; i < 80 && OF.isVillageMiniActive(); i++) await sleep(250);
      await sleep(1000); await quiet(8000);
      if (HM.inHomeFlat()) { window.__home.leave(); await sleep(2500); await quiet(); }
      await expectClear(`${hk}@${mk}`);
      if (await moved(() => hold(['w'], 900), 'walk?', 0) < 0.6) await moved(() => hold(['s'], 1200), `walk after ${hk}@${mk}`);
    }
  }
  w.devInvuln = false;
}
