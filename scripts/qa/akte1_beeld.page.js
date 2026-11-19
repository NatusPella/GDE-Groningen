// Page half of scripts/qa/akte1_beeld.mjs (desktop --perf-script body): de AAA-upgrade van akte 1 in het echte spel.
// Per missie een paar sleutelbeelden: M05 (startlijn met boog, publiek en startlicht, finishcamera), M01 (stuntarena),
// M03 (de rij in de hal), M06 (stroomkast als korte handeling), M02 en M04 (regelkaart). De missies worden met de
// debug-haak gestart (missionDebug.start); de speler wordt per beeld neergezet. Raakt geen opslag.
// window.__a1 = { settle, only }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__a1 || {};
const SETTLE = CFG.settle || 9000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d');
const M = await imp('missions');
const KR = await imp('keiroute');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
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

// ---- M05: de Kei-race ---------------------------------------------------------------------------------------
await sectie('m05', async () => {
  const [x0, y0] = KR.KEI_ROUTE[0], [x1, y1] = KR.KEI_ROUTE[3];
  const a = Math.atan2(y1 - y0, x1 - x0);
  await zet(x0 - Math.cos(a) * 8, y0 - Math.sin(a) * 8, a);
  if (!M.missionDebug.start(w, idxVan('Wind tegen, beide kanten op'))) throw new Error('M05 startte niet');
  await sleep(2500);
  const race = M.getActiveRace();
  out.stand.m05 = { race: !!race, aaa: await (async () => { try { const A = await imp('akte1_aaa'); return A.aaaStand(); } catch (e) { return String(e); } })() };
  await grab('m05-start-grid');
  if (race && race.playerCar) { try { p.enterVehicle(race.playerCar, w); } catch (e) { out.fouten.push('fiets: ' + e.message); } }
  const r2 = await wacht(() => { const r = M.getActiveRace(); return r && r.phase === 'countdown' && r.timer > 1.3; }, 20000, 40);
  out.stand.m05.licht = r2;
  await grab('m05-startlicht');
  await wacht(() => { const r = M.getActiveRace(); return r && r.phase === 'race'; }, 6000, 40);
  await sleep(500);
  await grab('m05-start-groen');
  // naar de finish: elk checkpoint op de fiets (de race telt de volgorde)
  const def = M.getMissionDefs()[idxVan('Wind tegen, beide kanten op')];
  const fiets = p.inVehicle;
  for (const wp of def.waypoints) {
    if (fiets) { fiets.x = wp.x; fiets.y = wp.y; fiets.speed = 3; }
    p.x = wp.x; p.y = wp.y;
    await sleep(350);
  }
  await sleep(1200);
  out.stand.m05.camTake = cine.cameraTakeActive ? cine.cameraTakeActive('kei-finish') : null;
  await grab('m05-finishcamera');
  await sleep(2400);
  await grab('m05-finish-eind');
});

// ---- M01: de stuntarena -------------------------------------------------------------------------------------
await sectie('m01', async () => {
  const idx = idxVan('Nul krassen, vijftienhonderd punten');
  const c = M.getMissionDefs()[idx].stunt.center;
  const a = -Math.PI / 2;
  await zet(c.x - Math.cos(a) * 30, c.y - Math.sin(a) * 30, a);
  if (!M.missionDebug.start(w, idx)) throw new Error('M01 startte niet');
  await sleep(3500);
  const A = await imp('akte1_aaa');
  out.stand.m01 = A.aaaStand();
  await grab('m01-arena');
  await zet(c.x - 6, c.y - 22, a, 2500);
  await grab('m01-arena-dichtbij');
});

// ---- M03: de rij in de hal ----------------------------------------------------------------------------------
await sectie('m03', async () => {
  const idx = idxVan('Het Loket');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, 5000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M03 startte niet');
  await sleep(1500);
  const doel = def.stages[0].target;
  const ok = await wacht(() => { p.x = doel.x; p.y = doel.y; return M.missionDebug.state().stage >= 1; }, 15000, 150);
  out.stand.m03 = { hold: ok, stage: M.missionDebug.state().stage };
  await sleep(2500);
  await grab('m03-rij-1');
  await sleep(2500);
  await grab('m03-rij-2');
});

// ---- M06: de stroomkast als korte handeling -------------------------------------------------------------
await sectie('m06', async () => {
  uur = 23.5; fix(uur);
  const idx = idxVan('Het museum stond er al zo');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, 6000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M06 startte niet');
  await sleep(2000);
  let g = 0; while (M.missionDebug.state().stage < 2 && g++ < 6) { M.missionDebug.skipStage(w); await sleep(1500); }
  const t = M.missionDebug.state().stageInfo && M.missionDebug.state().stageInfo.target;
  out.stand.m06 = { stage: M.missionDebug.state().stage, doel: t };
  if (!t) throw new Error('geen stroomkastdoel');
  await zet(t.x - 1.5, t.y, 0, 2500);
  await grab('m06-stroomkast-kaart');
  window.__e = true;
  await sleep(1400);
  await grab('m06-stroomkast-houd-e');
  window.__e = false;
  uur = 14; fix(uur);
});

// ---- M02 en M04: de regelkaart ----------------------------------------------------------------------------
await sectie('m02', async () => {
  const idx = idxVan('Even pinnen');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, 5000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M02 startte niet');
  await sleep(1500);
  M.missionDebug.complete(w); // het bord: in de auto
  await sleep(2200);
  out.stand.m02 = { stage: M.missionDebug.state().stage };
  await grab('m02-garagekaart');
});
await sectie('m04', async () => {
  const idx = idxVan('Kieken van boven');
  const def = M.getMissionDefs()[idx];
  await zet(def.start.x, def.start.y, 0, 5000);
  if (!M.missionDebug.start(w, idx)) throw new Error('M04 startte niet');
  await sleep(3500);
  out.stand.m04 = { stage: M.missionDebug.state().stage };
  await grab('m04-fotokaart');
});

clearInterval(skipper); clearInterval(clockTik);
console.log(`[akte1] beelden ${out.beelden.length}, fouten ${out.fouten.length}`);
return JSON.stringify({ results: out });
