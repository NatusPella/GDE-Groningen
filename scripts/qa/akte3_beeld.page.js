// Page half of scripts/qa/akte3_beeld.mjs (desktop --perf-script body): de AAA-upgrade van akte 3 in het echte spel.
// Per missie een paar sleutelbeelden: M13 (kade met havenwerkers, wachtfiguur bij de kooi), M15 (strook met Roelfien,
// landing met publiek) en M16 (de toast in de kroeg). De missies worden met de debug-haak gestart (missionDebug.start);
// de speler wordt per beeld neergezet. Raakt geen opslag. window.__a3 = { settle, only }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__a3 || {};
const SETTLE = CFG.settle || 9000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d');
const M = await imp('missions');
let skipAan = true;
const skipper = setInterval(() => { if (skipAan && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = (uur = 14) => {
  w.clock = uur;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let uur = 14;
fix(uur);
const clockTik = setInterval(() => { w.clock = uur; }, 200);
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
// E vasthouden (de korte handelingen van M06): de pagina zet window.__e
const origDown = w.input.isDown.bind(w.input);
w.input.isDown = (k) => (k === 'e' && window.__e) || origDown(k);
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
const stop = async () => { try { if (M.isMissionActive()) M.cancelActiveMission(w); } catch (e) { /* weg */ } await sleep(800); };
const sectie = async (naam, fn) => {
  if (ONLY && !ONLY.includes(naam)) return;
  try { await fn(); } catch (e) { out.fouten.push(naam + ': ' + (e && e.message || e)); console.log('[fout] ' + naam + ' ' + (e && e.message || e)); }
  await stop();
};
await sleep(2500);
out.fps0 = await fps(2500);
console.log('[fps] start ' + out.fps0 + ' visibility=' + document.visibilityState);

// ---- M13: de kade en de wachtfiguren ------------------------------------------------------------------------
await sectie('m13', async () => {
  uur = 21.5; fix(uur);
  const idx = idxVan('Het containerlabyrint');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x - 4, def.start.y, 0, SETTLE + 4000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M13 startte niet');
  await sleep(3500);
  out.stand.m13 = { stage: M.missionDebug.state().stage, doel: M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target };
  await grab('m13-kade-kaart');
  const t0 = M.missionDebug.state().stageInfo.target;
  await zet(t0.x - 6, t0.y, 0, 5000);
  await grab('m13-kraan');
  await zet(t0.x, t0.y, 0, 2500);
  await sleep(1500);
  out.stand.m13.stage1 = M.missionDebug.state().stage;
  await grab('m13-wachtfiguur-kooi');
  await sleep(4000);
  await grab('m13-wachtfiguur-kooi-2');
  const t2 = M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target;
  if (t2) { await zet(t2.x - 8, t2.y, 0, 5000); await grab('m13-containers'); }
  uur = 14; fix(uur);
});

// ---- M15: de strook en de landing --------------------------------------------------------------------------
await sectie('m15', async () => {
  const idx = idxVan('Laag over het graan');
  const def = M.getMissionDefs()[idx];
  const sp = def.stages[0].strip;
  await zet(def.start.x, def.start.y, sp.heading, SETTLE + 4000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M15 startte niet');
  await sleep(3500);
  out.stand.m15 = { stage: M.missionDebug.state().stage };
  await grab('m15-strook-kaart');
  const a = def.stages[0].dressingAt;
  await zet(a.x - Math.cos(sp.heading) * 14, a.y - Math.sin(sp.heading) * 14, sp.heading, 3500);
  await grab('m15-strook-erf');
  let g = 0; while (M.missionDebug.state().stage < 2 && g++ < 6) { M.missionDebug.skipStage(w); await sleep(1800); }
  out.stand.m15.stage2 = M.missionDebug.state().stage;
  const b = def.stages[2].dressingAt;
  await zet(b.x - Math.cos(sp.heading) * 16, b.y - Math.sin(sp.heading) * 16, sp.heading, 5000);
  await grab('m15-landing-publiek');
  await sleep(2500);
  await grab('m15-landing-publiek-2');
});

// ---- M16: de toast in de kroeg -----------------------------------------------------------------------------
await sectie('m16', async () => {
  uur = 21.5; fix(uur);
  skipAan = false;
  const idx = idxVan('Nog eentje dan');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, SETTLE + 3000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M16 startte niet');
  await sleep(3500);
  await grab('m16-kaart');
  const wp = def.waypoints;
  for (let k = 0; k < 2; k++) { p.x = wp[k].x; p.y = wp[k].y; await sleep(600); }
  await sleep(1800);
  out.stand.m16 = { wp: M.missionDebug.state().wp, cinematic: cine.isCinematicActive('mission-scene') };
  await grab('m16-toast-kroeg-1');
  await sleep(1800);
  await grab('m16-toast-kroeg-2');
  await sleep(1800);
  await grab('m16-toast-kroeg-3');
  skipAan = true;
  uur = 14; fix(uur);
});

clearInterval(skipper); clearInterval(clockTik);
console.log(`[akte3] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
