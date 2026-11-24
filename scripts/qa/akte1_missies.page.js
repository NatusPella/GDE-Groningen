// Page half of scripts/qa/akte1_missies.mjs (desktop --perf-script body; akte 1 op eindniveau, 23-11): M01-M06 zoals een speler ze ziet.
// Per missie vijf beelden: de start, een moment in het midden (een stap verder), een gefaalde poging (de faalkaart), Opnieuw proberen
// (Enter) en de eindkaart na een gewonnen poging. De missies worden met de debug-haak gestart, verloren en gewonnen (missionDebug);
// scènes worden overgeslagen. Raakt geen opslag. window.__am = { settle, only }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__am || {};
const SETTLE = CFG.settle || 5000;
const ONLY = CFG.only ? String(CFG.only).split(',') : null;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const SC = await imp('scene3d');
const M = await imp('missions');
let skip = true;
const skipper = setInterval(() => { if (skip && cine.isCinematicActive()) cine.skipCinematic(); }, 150);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const uur = 15;
const klok = setInterval(() => { w.clock = uur; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); }, 250);
const st = document.head.appendChild(document.createElement('style'));
st.textContent = '#loading,#load-screen{display:none !important}';
const out = { fouten: [], beelden: [], stand: {} };
const grab = async (naam) => { console.log('[capture] ' + naam); out.beelden.push(naam); await sleep(600); };
const streams = async () => { let n = 0; while (SC.streamPending && SC.streamPending().roads > 0 && n++ < 40) await sleep(500); };
const MISSIES = [['m01', 'bakkiestunt'], ['m02', 'pinautomaat'], ['m03', 'loket'], ['m04', 'duifverkenning'], ['m05', 'kei'], ['m06', 'museumkraak']];
for (const [naam, id] of MISSIES) {
  if (ONLY && !ONLY.includes(naam)) continue;
  try {
    const i = M.missionIndexById(id);
    if (i < 0) { out.fouten.push(naam + ': geen missie ' + id); continue; }
    const def = M.getMissionDefs()[i];
    if (p.inVehicle) p.exitVehicle(w.map, w);
    p.x = def.start.x; p.y = def.start.y; p.vx = p.vy = 0;
    await sleep(SETTLE); await streams();
    // een missie die vanzelf begon (de speler stond op een startplek) eerst stoppen
    try { if (M.isMissionActive && M.isMissionActive()) M.cancelActiveMission(w); } catch (e) { /* geen */ }
    await sleep(800);
    // 1. de start
    if (!M.missionDebug.start(w, i)) { out.fouten.push(naam + ': start mislukt (' + JSON.stringify(M.missionDebug.state()).slice(0, 160) + ')'); continue; }
    await sleep(2500);
    await grab(naam + '-1-start');
    // 2. een moment in het midden: een stap verder (stappenmissie) of even laten lopen
    if (def.stages && def.stages.length > 2) { M.missionDebug.skipStage(w); await sleep(2500); }
    else await sleep(6000);
    await grab(naam + '-2-midden');
    // 3. een gefaalde poging: de faalkaart
    M.missionDebug.lose(w);
    await sleep(900);
    await grab(naam + '-3-gefaald');
    // 4. Opnieuw proberen (Enter, zoals de kaart zegt); lukt Enter niet, dan dezelfde actie als de knop in Overzicht (herstartMissie)
    const wachtOp = async (fn, ms) => { for (let t = 0; t < ms; t += 250) { if (fn()) return true; await sleep(250); } return false; };
    const kanOpnieuw = M.retryBeschikbaar ? M.retryBeschikbaar() : null;
    tapKey('Enter', 'Enter');
    let viaEnter = await wachtOp(() => { const q = M.missionDebug.state(); return q && q.phase === 'active'; }, 9000);
    let viaKnop = false;
    if (!viaEnter && M.herstartMissie) { viaKnop = M.herstartMissie(w); await wachtOp(() => { const q = M.missionDebug.state(); return q && q.phase === 'active'; }, 9000); }
    const st1 = M.missionDebug.state();
    out.stand[naam] = { retryAangeboden: kanOpnieuw, viaEnter, viaKnop, blokkade: M.herstartBlokkade ? M.herstartBlokkade(w) : null, fase: st1 && st1.phase };
    await grab(naam + '-4-opnieuw');
    // 5. de eindkaart na een gewonnen poging
    if (!(st1 && st1.phase === 'active')) M.missionDebug.start(w, i);
    await sleep(1500);
    M.missionDebug.win(w);
    skip = false; // de afsluitende scène en de kaart: niet overslaan, wel kort wachten
    await sleep(2500);
    await grab(naam + '-5-eindkaart');
    skip = true;
    // wachten tot de missie echt klaar is (afsluitende scène, kaart) voor de volgende begint
    for (let t = 0; t < 30000; t += 500) { const q = M.missionDebug.state(); if (!q || q.phase !== 'active') break; await sleep(500); }
    await sleep(2000);
  } catch (e) { out.fouten.push(naam + ': ' + (e && e.message || e)); }
}
clearInterval(skipper); clearInterval(klok);
return JSON.stringify(out);
