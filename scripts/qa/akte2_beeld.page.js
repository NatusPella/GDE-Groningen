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
  let g = 0; while (M.missionDebug.state().stage < 3 && g++ < 6) { M.missionDebug.skipStage(w); await sleep(1500); }
  out.stand.m07 = { stage: M.missionDebug.state().stage, doel: M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target };
  await zet(621.49 - 24, 662.56, 0, 4000);
  await grab('m07-plein');
  await zet(621.49 - 14, 662.56 - 4, 0.3, 3000);
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
  const sp = (SJ.spots() || []).find((s) => s.def && s.def.id === 'bietenoogst') || (SJ.spots() || []).find((s) => /biet/i.test(JSON.stringify(s.def && s.def.id)));
  out.stand.a1 = { spot: sp ? { x: sp.x, y: sp.y } : null };
  if (!sp) throw new Error('geen bietenspot');
  await zet(sp.x, sp.y, 0, 8000);
  if (!SJ.start('bietenoogst')) throw new Error('A1 startte niet');
  await sleep(3500);
  out.stand.a1.ctx = !!SJ.ctx();
  await grab('a1-kaart');
  const c = SJ.ctx();
  const hoop = c && c.data && c.data.hoop;
  if (hoop) { const v = c.vehicle; if (v) { v.x = hoop.x - 18; v.y = hoop.y; p.x = v.x; p.y = v.y; } await sleep(3000); await grab('a1-hoop-publiek'); }
});

clearInterval(skipper); clearInterval(clockTik);
console.log(`[akte2] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
