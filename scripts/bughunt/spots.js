
// --- every kind of interaction spot: prompt shown, no broken text, E does something, everything closes again ---
{
  const SC = await imp('spotcheck'), MS6 = await imp('missions'), SF6 = await imp('safety'), PG6 = await imp('pigeonmode');
  const promptText = () => [...document.querySelectorAll('.hud-prompts:not(.off) .wp.in .wp-chip, .hud-ctx:not(.off) .ctx-row')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ');
  const reset = async () => {
    if (SU.isShopOpen()) SU.closeShopMenu();
    if (PH.isPhoneOpen()) await tap('t');
    if (PM.isPauseMenuOpen()) PM.closePauseMenu();
    if (MV.isMapOpen()) MV.setMapActive(w, false);
    if (MS6.isMissionActive()) SF6.abortMission(w);
    if (D.sidejobs && D.sidejobs.ctx()) D.sidejobs.quit();
    if (w.padelGame && window.__padel) window.__padel.finish(false);
    if (w.heliRun && window.__heliRun) window.__heliRun.abort();
    if (w.pigeonMode) PG6.stopPigeonMode(w);
    if (window.__postgame && window.__postgame.state()) window.__postgame.abort();
    if (w.trainDriving) { w.trainDriving.v = 0; await tap('e'); }
    await sleep(800); await quiet(10000);
    if (window.__home && (await imp('home')).inHomeFlat()) { window.__home.leave(); await sleep(2500); await quiet(); }
    if (p.inVehicle) p.exitVehicle(map, w);
    w.wanted = 0;
  };
  w.devInvuln = true;
  if (window.__postgame) window.__postgame.unlock();
  await sleep(1500);
  const all = SC.collectSpots(w);
  const byKind = new Map();
  for (const s of all) { const k = s.kind; if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(s); }
  log('spot kinds', [...byKind.entries()].map(([k, v]) => `${k}:${v.length}`).join(' '));
  const PER = window.__bhPer || 4;
  const PASSIVE = /^(respawn|missie-doel|missie-stop|missie-checkpoint|missie-menigte|missie-heist)$/;
  let noPrompt = 0;
  for (const [kind, list] of byKind) {
    const pick = list.length <= PER ? list : Array.from({ length: PER }, (_, i) => list[Math.floor(i * list.length / PER)]);
    for (const s of pick) {
      tag(`spot:${kind}:${String(s.id).slice(0, 24)}`);
      if (p.inVehicle) p.exitVehicle(map, w);
      teleport(s.x, s.y, false); await sleep(1000);
      if (PASSIVE.test(kind) || s.mode === 'boat' || s.mode === 'air') continue;
      const ePrompt = () => [...document.querySelectorAll('.hud-prompts:not(.off) .wp.wp-primary.in .wp-chip')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).join('');
      for (let i = 0; i < 12 && !ePrompt(); i++) await sleep(250);
      const pt = promptText();
      const dd = Math.hypot(p.x - s.x, p.y - s.y).toFixed(1);
      if (!ePrompt()) { noPrompt++; log('no E prompt', kind, s.id, Math.round(s.x), Math.round(s.y), 'player off by', dd, 'water', !!p.water, '|', pt.slice(0, 90)); continue; }
      const before = JSON.stringify(overlays()) + MS6.isMissionActive() + !!(D.sidejobs && D.sidejobs.ctx()) + !!w.padelGame + !!w.heliRun + !!w.pigeonMode + Math.round(w.money) + !!w.challenge + !!w.trainDriving + Math.round(p.x) + Math.round(p.y);
      await tap('e'); await sleep(1600);
      const after = JSON.stringify(overlays()) + MS6.isMissionActive() + !!(D.sidejobs && D.sidejobs.ctx()) + !!w.padelGame + !!w.heliRun + !!w.pigeonMode + Math.round(w.money) + !!w.challenge + !!w.trainDriving + Math.round(p.x) + Math.round(p.y);
      if (before === after && !cine.isCinematicActive()) log('E did nothing visible', kind, s.id, 'off by', dd, '|', pt.slice(0, 120), '| msgs', w.messages.slice(-2).map((m) => m.text).join(' / ').slice(0, 120));
      else log('E ok', kind, String(s.id).slice(0, 20), '|', pt.slice(0, 60));
      await reset();
      await expectClear(`spot ${kind} ${s.id}`);
    }
  }
  log('spots without a prompt', noPrompt);
  w.devInvuln = false;
}
