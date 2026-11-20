// Page half of scripts/qa/akte2_beeld.mjs (desktop --perf-script body): de AAA-upgrade van akte 2 in het echte spel.
// M07 (het plein met publiek bij de Oosterpoort), de skûtsje-sprint (publiek bij de start, de race, de finishcamera) en A1
// (de bietenoogst: regelkaart en het publiek bij de hoop). De missies worden met de debug-haken gestart; de speler wordt per
// beeld neergezet. Raakt geen opslag. window.__a2 = { settle, only }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__a2 || {};
const SETTLE = CFG.settle || 9000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d');
const M = await imp('missions');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = (uur = 14) => {
  w.clock = uur;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fix(14);
const clockTik = setInterval(() => { w.clock = 14; }, 200);
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
const fps = (ms = 1800) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const out = { fps: {}, fouten: [], beelden: [], stand: {} };
const grab = async (naam) => {
  const f = await fps(1200);
  out.fps[naam] = f;
  console.log('[fps] ' + naam + ' ' + f);
  console.log('[capture] ' + naam);
  out.beelden.push(naam);
  await sleep(500);
};
const wacht = async (fn, maxMs, stap = 100) => { for (let t = 0; t < maxMs; t += stap) { try { if (fn()) return true; } catch (e) { /* nog niet */ } await sleep(stap); } return false; };
const zet = async (x, y, angle, ms) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; if (Number.isFinite(angle)) p.angle = angle;
  await sleep(ms || SETTLE);
  let n = 0; while (SC.streamPending().roads > 0 && n++ < 60) await sleep(500);
};
const idxVan = (label) => M.getMissionDefs().findIndex((d) => d.label === label);
const stop = async () => { try { if (M.isMissionActive()) M.cancelActiveMission(w); } catch (e) { /* weg */ } try { if (window.__postgame) window.__postgame.abort(); } catch (e) { /* weg */ } try { if (D.sidejobs) D.sidejobs.quit(); } catch (e) { /* weg */ } await sleep(800); };
const sectie = async (naam, fn) => {
  if (ONLY && !ONLY.includes(naam)) return;
  try { await fn(); } catch (e) { out.fouten.push(naam + ': ' + (e && e.message || e)); console.log('[fout] ' + naam + ' ' + (e && e.message || e)); }
  await stop();
};
await sleep(2500);
out.fps0 = await fps(2500);
console.log('[fps] start ' + out.fps0 + ' visibility=' + document.visibilityState);

// ---- M07: het plein bij de Oosterpoort ------------------------------------------------------------------
await sectie('m07', async () => {
  const idx = idxVan('Al het vet van Grunn');
  if (idx < 0) throw new Error('M07 niet gevonden');
  await zet(621.49 - 25, 662.56, 0, 6000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M07 startte niet');
  await sleep(1500);
  await zet(p.x, p.y, 0, 9000); // de regelkaart van de jacht komt 8 s na het begin
  await grab('m07-kaart');
  // stap voor stap naar de goto-stap bij de Oosterpoort (complete, want skipStage is alleen voor heists)
  let g = 0; while ((M.getMissionDefs()[idx].stages[M.missionDebug.state().stage] || {}).kind !== 'goto' && g++ < 8) { M.missionDebug.complete(w); await sleep(1800); }
  out.stand.m07 = { stage: M.missionDebug.state().stage, doel: M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target };
  { const sc = SC.getScene(); let gr = null; sc.traverse((o) => { if (o.name === 'mission-dressing-plein') gr = o; });
    out.stand.m07.speler = { x: Math.round(p.x), y: Math.round(p.y), a: +p.angle.toFixed(2) };
    if (gr) {
      const ps = gr.children.map((c) => ({ x: c.position.x, y: c.position.z })).filter((c) => c.x || c.y);
      const cx = ps.reduce((q, c) => q + c.x, 0) / (ps.length || 1), cy = ps.reduce((q, c) => q + c.y, 0) / (ps.length || 1);
      out.stand.m07.plein = { kinderen: gr.children.length, middenX: Math.round(cx), middenY: Math.round(cy), eerste: ps.slice(0, 3).map((c) => [Math.round(c.x), Math.round(c.y)]), hoogtes: gr.children.map((c) => +c.position.y.toFixed(1)).slice(0, 8), namen: gr.children.map((c) => c.type + ':' + (c.visible ? 1 : 0) + ':' + c.children.length).slice(0, 8), ouder: gr.parent && gr.parent.type, boven: gr.position.y, schaal: gr.scale.x };
      const tg = M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target;
      const ang = Math.atan2(cy - tg.y, cx - tg.x); const d = Math.hypot(cx - tg.x, cy - tg.y);
      // in de tankwagen blijven: uitstappen zet de stap op 'ga terug naar de auto' en de aankleding gaat weg
      const zv = async (x, y, a, ms) => { const v = p.inVehicle; if (v) { v.x = x; v.y = y; v.angle = a; v.speed = 0; v.vx = 0; v.vy = 0; } p.x = x; p.y = y; p.angle = a; await sleep(ms); let n = 0; while (SC.streamPending().roads > 0 && n++ < 60) await sleep(500); };
      out.stand.m07.inAuto = !!p.inVehicle;
      await zv(cx - Math.cos(ang) * 30, cy - Math.sin(ang) * 30, ang, 6000);
      out.stand.m07.pleinNaTeleport = (() => { let g2 = null; SC.getScene().traverse((o) => { if (o.name === 'mission-dressing-plein') g2 = o; }); return !!g2; })();
      { const cam = SC.getCamera(); let g3 = null; SC.getScene().traverse((o) => { if (o.name === 'mission-dressing-plein') g3 = o; });
        const V = cam.position.constructor; const d = cam.getWorldDirection(new V()); const cf = [d.x, d.y, d.z];
        out.stand.m07.cam = { x: +cam.position.x.toFixed(1), y: +cam.position.y.toFixed(1), z: +cam.position.z.toFixed(1), dir: cf.map((v) => +v.toFixed(2)) };
        out.stand.m07.kraam = g3 ? g3.children.slice(0, 5).map((c) => { const q = c.getWorldPosition(new V()); const pr = q.clone().project(cam); return [Math.round(q.x), Math.round(q.z), +pr.x.toFixed(2), +pr.y.toFixed(2), +pr.z.toFixed(2)]; }) : null; }
      await grab('m07-plein');
      await zv(cx - Math.cos(ang) * 20, cy - Math.sin(ang) * 20 + 2, ang, 3000);
    } else { out.stand.m07.plein = null; await zet(p.x, p.y, 0, 2000); await grab('m07-plein'); }
  }
  await grab('m07-plein-dichtbij');
});

// ---- de skûtsje-sprint: publiek, race, finishcamera -----------------------------------------------------
await sectie('sprint', async () => {
  const PG = window.__postgame;
  if (!PG) throw new Error('geen __postgame');
  PG.unlock();
  await sleep(800);
  const spot = PG.spots().find((s) => s.id === 'skutsje');
  if (!spot) throw new Error('skutsje-spot ontbreekt');
  out.stand.sprint = { spot };
  await zet(spot.x, spot.y, 0, 7000);
  PG.unlock();
  if (!PG.start('skutsje')) throw new Error('de sprint startte niet');
  await sleep(1200);
  out.stand.sprint.start = PG.state();
  await grab('sprint-start-publiek');
  await wacht(() => PG.state() && PG.state().t > 5, 15000, 100);
  await grab('sprint-race');
  // naar het einde van de route, dan winnen: de finishcamera hoort even te blijven hangen
  const boat = p.inVehicle;
  if (boat) { boat.x = -373.03 + 30; boat.y = 288.27; p.x = boat.x; p.y = boat.y; }
  await sleep(3500);
  PG.win();
  await sleep(1200);
  out.stand.sprint.camTake = cine.cameraTakeActive ? cine.cameraTakeActive('skutsje-finish') : null;
  await grab('sprint-finishcamera');
  await sleep(4500);
  out.stand.sprint.camNa = cine.cameraTakeActive ? cine.cameraTakeActive('skutsje-finish') : null;
});

// ---- A1: de bietenoogst ------------------------------------------------------------------------------------
await sectie('a1', async () => {
  const SJ = D.sidejobs;
  if (!SJ) throw new Error('geen sidejobs-haak');
  out.stand.a1 = { aantalSpots: (SJ.spots() || []).length, ids: (SJ.spots() || []).map((s) => s.job && s.job.id).filter((i) => /biet|boer|akker/i.test(i || '')) };
  // de startplek zit eerst in de stad (terugval) en schuift naar de akker zodra de tegels bij Hoogkerk geladen zijn
  const R = await imp('rdnew'); const [fx, fy] = R.wgsToWorld(53.2336, 6.4977);
  await zet(fx, fy, 0, 12000);
  // de tegels bij Hoogkerk laden na een tijd: tot een minuut wachten tot de bietenspot er is (was: een vaste wacht van 12 s)
  for (let i = 0; i < 12 && !(SJ.spots() || []).find((s) => s.job && s.job.id === 'bietenoogst'); i++) await sleep(5000);
  const sp = (SJ.spots() || []).find((s) => s.job && s.job.id === 'bietenoogst');
  out.stand.a1 = { ...out.stand.a1, spot: sp ? { x: sp.x, y: sp.y } : null };
  if (!sp) throw new Error('geen bietenspot');
  await zet(sp.x, sp.y, 0, 8000);
  try { out.stand.a1.sprong = !!(window.__story && window.__story.jump('A1')); } catch (e) { out.stand.a1.sprong = String(e); }
  await sleep(3000);
  const sp2 = (SJ.spots() || []).find((s) => s.job && s.job.id === 'bietenoogst'); if (sp2) await zet(sp2.x, sp2.y, 0, 6000);
  const meldingen = []; const oudMsg = w.addMessage; w.addMessage = function (m, ...r) { meldingen.push(String(m)); return oudMsg.call(this, m, ...r); };
  const gestart = SJ.start('bietenoogst'); w.addMessage = oudMsg; out.stand.a1.meldingen = meldingen;
  if (!gestart) throw new Error('A1 startte niet: ' + meldingen.join(' | '));
  await sleep(3500);
  out.stand.a1.ctx = !!SJ.ctx();
  await grab('a1-kaart');
  const c = SJ.ctx();
  const hoop = c && c.data && c.data.hoop;
  if (hoop) {
    // de hoop ligt ver van de akker: de speler (en zijn trekker) staat na het starten niet bij de hoop, dus een vrije camera erheen
    const v = c.vehicle; if (v) { v.x = hoop.x - 30; v.y = hoop.y; p.x = v.x; p.y = v.y; } else { p.x = hoop.x - 30; p.y = hoop.y; }
    await sleep(5000);
    let hal = null; SC.getScene().traverse((o) => { if (o.name === 'bietenhal') hal = o; });
    out.stand.a1.hal = hal ? { kinderen: hal.children.length } : null;
    await grab('a1-hoop-publiek');
    for (const [ch, cd, chh, naam] of [[3.4, 22, 7, 'a1-hoop-ver'], [2.2, 12, 4, 'a1-hoop-dichtbij']]) {
      const gz = (() => { try { return w.map.groundHeightAt(hoop.x, hoop.y, 40) || 0; } catch (e) { return 0; } })();
      const pose = { position: { x: hoop.x + Math.cos(ch) * cd, y: hoop.y + Math.sin(ch) * cd, z: gz + chh }, lookAt: { x: hoop.x, y: hoop.y, z: gz + 1.5 }, fov: 60, cut: true };
      cine.startCameraTake('qa-vrij', () => pose, { letterbox: false, hideHud: false });
      await sleep(2500); await grab(naam);
    }
    cine.stopCameraTake('qa-vrij');
  }
  // M28 (de wisselwoning): waarom verscheen de aankleding niet en waarom toont de navigatie 22 km? Gegevens van de stap, de groepen en de afstand.
  try {
    try { SJ.stop && SJ.stop(); } catch (e) { /* weg */ }
    await sleep(1500);
    const defs = M.getMissionDefs(); const i28 = defs.findIndex((d) => d.label === 'De wisselwoning'); const d28 = defs[i28];
    const R = { start: d28.start, stap1: d28.stages[1] && { dressing: d28.stages[1].dressing, target: d28.stages[1].target } };
    await zet(d28.start.x, d28.start.y, 0, 9000);
    R.gestart = !!M.missionDebug.start(w, i28); await sleep(3000);
    const veh = (w.vehicles || []).filter((q) => q && Number.isFinite(q.x)).sort((q, r) => Math.hypot(q.x - p.x, q.y - p.y) - Math.hypot(r.x - p.x, r.y - p.y))[0];
    if (veh) { try { p.enterVehicle(veh, w); } catch (e) { R.enterFout = e.message; } }
    await sleep(2000);
    M.missionDebug.complete(w); await sleep(3500);
    const st = M.missionDebug.state(); R.state = st;
    const gr = []; SC.getScene().traverse((o) => { if (o.name && /^mission-dressing|^wait-/.test(o.name)) { const V = o.position.constructor; const q = o.getWorldPosition(new V()); gr.push({ n: o.name, k: o.children.length, x: Math.round(q.x), z: Math.round(q.z) }); } });
    R.groepen = gr;
    R.afstandTotDoel = st && st.stageInfo && st.stageInfo.target ? Math.round(Math.hypot(st.stageInfo.target.x - (p.inVehicle || p).x, st.stageInfo.target.y - (p.inVehicle || p).y)) : null;
    out.stand.m28dbg = R;
    try { if (M.isMissionActive()) M.cancelActiveMission(w); } catch (e) { /* weg */ }
  } catch (e) { out.stand.m28dbg = { fout: String(e && e.message || e) }; }
});

clearInterval(skipper); clearInterval(clockTik);
console.log(`[akte2] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
