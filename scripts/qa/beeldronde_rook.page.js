// Rookcontrole voor de beeldronde 21-11 (page-script voor scripts/qa/menufoto.mjs --page=beeldronde_rook.page.js).
// Nieuw spel start, JS-fouten (window.onerror, unhandledrejection, console.error), HUD-zichtbaarheid na start, na de openingscutscene,
// tijdens/na een heli-vlucht, na een duivenmissie en na de benchmark. Raakt alleen het wegwerpprofiel; elke keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const SIZE = (window.__mf && window.__mf.size) || '1920x1080';
const fouten = [];
const noteer = (soort, m) => { if (fouten.length < 80) fouten.push(soort + ': ' + String(m).slice(0, 300)); };
window.addEventListener('error', (e) => noteer('onerror', (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => noteer('promise', e.reason && (e.reason.stack || e.reason.message || e.reason)));
const ce = console.error.bind(console); console.error = (...a) => { noteer('console.error', a.map(String).join(' ')); ce(...a); };
const cw = console.warn.bind(console); console.warn = (...a) => { const t = a.map(String).join(' '); if (/NaN|undefined is not|not defined/i.test(t)) noteer('console.warn', t); cw(...a); };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const cap = async (name, wait = 800) => { await sleep(wait); console.log('[capture] ' + name + '-' + SIZE.split('x')[0]); await sleep(900); };
const hud = (label) => {
  const b = document.body; const h = document.getElementById('hud');
  const zichtbaar = [];
  if (h) for (const c of h.children) { const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); if (cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 4 && r.height > 4) zichtbaar.push(c.id || c.className || c.tagName); }
  return { label, klassen: ['game-started', 'cine-hide-hud', 'trailer-on', 'trailer-hud', 'intro-montage', 'pigeon-mode', 'foto-actief'].filter((k) => b.classList.contains(k)),
    hudOpacity: h ? +getComputedStyle(h).opacity : null, hudDisplay: h ? getComputedStyle(h).display : null, aantalZichtbaar: zichtbaar.length, zichtbaar: zichtbaar.slice(0, 24),
    errorOverlay: (document.body.innerText.match(/Er ging iets mis[^\n]{0,120}/) || [null])[0] };
};
const stand = []; const notities = {};
const mark = (l) => { const s = hud(l); stand.push(s); return s; };
for (let i = 0; i < 240 && !(document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  await sleep(1000);
}
notities.gestart = document.body.classList.contains('game-started');
await sleep(2500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
mark('direct-na-start');
await cap('r01-direct-na-start', 500);
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
// de openingscutscene eerst laten lopen en vastleggen, dan overslaan
for (let i = 0; i < 12 && !cine.isCinematicActive(); i++) await sleep(500);
notities.openingActief = cine.isCinematicActive();
if (cine.isCinematicActive()) { mark('tijdens-opening'); await cap('r02-tijdens-opening', 3000); }
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); }
await sleep(3000);
mark('na-opening-cutscene'); await cap('r03-na-opening', 500);
if (w.paused) { tap(' ', 'Space'); await sleep(800); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const MQ = await imp('missionquery'); const MS = await imp('missions');
const defs = MQ.getMissionDefs();
notities.missies = defs.map((d, i) => i + ':' + d.label + (d.start ? '' : ' [lazy]'));
const wacht = async (f, n = 60) => { for (let i = 0; i < n && !f(); i++) await sleep(500); };
const sluitAlles = () => { for (let i = 0; i < 20 && cine.isCinematicActive(); i++) cine.skipCinematic(); };
// heli-missie
const heliIdx = defs.findIndex((d) => /rooster/i.test(d.label));
notities.heliIdx = heliIdx;
if (heliIdx >= 0) {
  try {
    await wacht(() => defs[heliIdx].start, 60);
    notities.heliStart = MS.missionDebug.start(w, heliIdx);
    for (let i = 0; i < 40; i++) { sluitAlles(); await sleep(500); }
    mark('heli-na-start'); await cap('r04-heli-na-start', 1500);
    for (let i = 0; i < 12; i++) { if (MS.missionDebug.state() && MS.missionDebug.state().phase !== 'active') break; MS.missionDebug.complete(w); sluitAlles(); await sleep(2500); }
    mark('heli-na-stappen'); await cap('r05-heli-stap', 1500);
    notities.heliState = JSON.stringify(MS.missionDebug.state()).slice(0, 400);
    MS.missionDebug.win(w); sluitAlles(); await sleep(6000);
    mark('heli-na-einde'); await cap('r06-heli-na-einde', 1000);
  } catch (e) { noteer('heli-script', e && e.stack); }
}
// duivenmissie
const duifIdx = defs.findIndex((d) => /Kieken van boven/.test(d.label));
if (duifIdx >= 0) {
  try {
    await sleep(3000);
    if (MS.missionDebug.state() && MS.missionDebug.state().phase === 'active') { MS.missionDebug.lose(w); await sleep(3000); }
    notities.duifStart = MS.missionDebug.start(w, duifIdx);
    for (let i = 0; i < 30; i++) { sluitAlles(); await sleep(500); }
    mark('duif-actief'); await cap('r07-duif-actief', 1500);
    MS.missionDebug.win(w); sluitAlles(); await sleep(6000);
    mark('duif-na-einde'); await cap('r08-duif-na-einde', 1000);
  } catch (e) { noteer('duif-script', e && e.stack); }
}
// benchmark
try {
  const T = await imp('trailer'); const B = await imp('benchstats');
  const pr = T.runTrailer(w, { mode: 'benchmark', cut: 'bench', shot: 1, env: {} });
  await sleep(8000); mark('benchmark-lopend'); await cap('r09-benchmark-lopend', 300);
  tap('Escape', 'Escape'); await Promise.race([pr, sleep(25000)]); await sleep(2500);
  try { await T.fadeOutTrailer(false); } catch (e) { /* al weg */ }
  await sleep(2500);
  mark('benchmark-na-afloop'); await cap('r10-na-benchmark', 600);
  notities.trailerOnNaBench = document.body.classList.contains('trailer-on');
} catch (e) { noteer('bench-script', e && e.stack); }
PM.openPauseMenu('spel', { sub: 'overzicht' }); await sleep(1500); await cap('r11-escape-na-alles', 500); PM.closePauseMenu(); await sleep(800);
mark('einde');
return JSON.stringify({ size: SIZE, fouten, stand, notities });
