// Missies en bijbanen in beeld voor de beeldronde 21-11 (page-script voor scripts/qa/menufoto.mjs --page=beeldronde_missies.page.js).
// window.__mf.sets kiest de groepen: fatbike, kist, loket, duif, container, heli, penalty, akte5, akte6, bijbaan.
// Per missie: start met de debug-haak (missionDebug.start), cutscenes overslaan, per stap een beeld, daarna missionDebug.complete naar de volgende stap.
// Logt de HUD-tekst per beeld en markeert 'undefined', 'NaN', '[object' en 'null' erin. Raakt alleen het wegwerpprofiel; elke keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__mf || { size: '1920x1080', sets: [] };
const SIZE = CFG.size; const BR = SIZE.split('x')[0];
const wil = (s) => CFG.sets.includes(s);
const fouten = []; const noteer = (soort, m) => { if (fouten.length < 80) fouten.push(soort + ': ' + String(m).slice(0, 300)); };
window.addEventListener('error', (e) => noteer('onerror', (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => noteer('promise', e.reason && (e.reason.stack || e.reason.message || e.reason)));
const ce = console.error.bind(console); console.error = (...a) => { noteer('console.error', a.map(String).join(' ')); ce(...a); };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const done = []; const notities = {}; const hudtekst = {};
for (let i = 0; i < 240 && !(document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  await sleep(1000);
}
await sleep(2500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const MQ = await imp('missionquery'); const MS = await imp('missions'); const DN = await imp('daynight');
const skip = () => { for (let i = 0; i < 20 && cine.isCinematicActive(); i++) cine.skipCinematic(); };
const skipper = setInterval(skip, 150);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
if (w.paused) { tap(' ', 'Space'); await sleep(600); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const vast = () => { w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
vast(); setInterval(vast, 800);
const defs = MQ.getMissionDefs();
const cap = async (name, wait = 1200) => {
  await sleep(wait);
  const h = document.getElementById('hud'); const t = (h ? h.innerText : '').replace(/\s+/g, ' ').trim();
  hudtekst[name] = t.slice(0, 500);
  if (/undefined|NaN|\[object|\bnull\b/.test(t)) noteer('hudtekst', name + ': ' + t.slice(0, 200));
  console.log('[capture] ' + name + '-' + BR); await sleep(800); done.push(name);
};
const stand = () => { const s = MS.missionDebug.state(); return s ? { i: s.index, phase: s.phase, stage: s.stage, wp: s.wp, info: s.stageInfo } : null; };
const stopActief = async () => { try { if (MS.isMissionActive()) MS.cancelActiveMission(w); } catch (e) { /* weg */ } await sleep(800); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT'); noteer(naam, e && (e.stack || e.message)); } await stopActief(); };
const loop = async (nr, slug, re, max = 8, extra = 0) => {
  const idx = defs.findIndex((d) => re.test(d.label));
  if (idx < 0) { done.push(slug + ' niet gevonden'); return; }
  const def = defs[idx];
  for (let k = 0; k < 40 && !def.start; k++) await sleep(500);
  await stopActief();
  if (p.inVehicle) { try { p.exitVehicle(map, w); } catch (e) { /* al uit */ } await sleep(800); }
  notities[slug] = { label: def.label, idx, type: def.type, stappen: (def.stages || []).map((s) => s.kind + ':' + (s.label || '')).slice(0, 20) };
  notities[slug].gestart = MS.missionDebug.start(w, idx);
  await sleep(3500);
  let vorige = -1; let n = 0;
  for (let i = 0; i < 40 && n < max; i++) {
    skip();
    const s = stand();
    if (!s || s.phase !== 'active') break;
    if (s.stage !== vorige) { vorige = s.stage; n++; await cap(`${nr}-${slug}-stap${s.stage}`, 2500); notities[slug]['stand' + s.stage] = JSON.stringify(s).slice(0, 300); }
    if (i === 0 && extra) { await cap(`${nr}-${slug}-stap${s.stage}-later`, extra); }
    MS.missionDebug.complete(w); await sleep(2500);
  }
  const s = stand(); notities[slug].eind = JSON.stringify(s).slice(0, 200);
  if (s && s.phase === 'active') { MS.missionDebug.win(w); skip(); }
  await sleep(4500); await cap(`${nr}-${slug}-einde`, 600);
};
if (wil('fatbike')) await probeer('fatbike', () => loop('m1', 'fatbikes', /Fatbikes/, 5, 6000));
if (wil('kist')) await probeer('kist', () => loop('m2', 'kist-kees', /Laag over het graan/, 8, 3000));
if (wil('heli')) await probeer('heli', () => loop('m3', 'heli-rooster', /rooster/, 6, 3000));
if (wil('loket')) await probeer('loket', () => loop('m4', 'loket', /Het Loket/, 6));
if (wil('duif')) await probeer('duif', () => loop('m5', 'duivenspot', /Kieken van boven/, 4, 4000));
if (wil('container')) await probeer('container', () => loop('m6', 'container', /containerlabyrint/, 6, 3000));
if (wil('akte5')) for (const [i, re] of [[1, /De dijk/], [2, /Open, dicht/], [3, /Stoom/], [4, /Het beleg van Bourtange/]]) await probeer('akte5-' + i, () => loop('a5' + i, 'akte5-' + i, re, 4));
if (wil('akte6')) for (const [i, re] of [[1, /De colonne/], [2, /Heel aankomen/], [3, /Terug/], [4, /Het proefbeleg/], [5, /Klassiek in de Herenstraat/]]) await probeer('akte6-' + i, () => loop('a6' + i, 'akte6-' + i, re, 4));
if (wil('penalty')) await probeer('penalty', async () => {
  const PN = window.__penalty; if (!PN) throw new Error('geen __penalty');
  const g = PN.spot(); notities.penalty = { poort: g, doel: PN.goal() };
  p.x = g.x; p.y = g.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; await sleep(9000);
  await cap('p1-penalty-poort', 800);
  notities.penalty.start = PN.start(true); await sleep(3500); await cap('p2-penalty-richten', 800);
  PN.aim(-0.3, 0.4); await sleep(600); await cap('p3-penalty-richt-links', 600);
  PN.shoot(); await sleep(2500); await cap('p4-penalty-na-schot', 800);
  notities.penalty.state = JSON.stringify(PN.state());
  for (let i = 0; i < 5 && PN.state(); i++) { await sleep(2500); PN.aim(0.2 * i - 0.4, 0.3); PN.shoot(); }
  await sleep(4000); await cap('p5-penalty-slot', 1500);
  PN.finish(); await sleep(3000); await cap('p6-penalty-uitslag', 1500);
  PN.quit();
});
if (wil('bijbaan')) await probeer('bijbaan', async () => {
  const A = window.__activities; if (!A) throw new Error('geen __activities');
  notities.activiteiten = A.list().map((a) => a.id + ':' + a.spots + (a.active ? '*' : ''));
  let nr = 0;
  for (const id of ['taxi', 'bus', 'bezorg', 'pakket', 'veer']) {
    const a = A.list().find((x) => x.id.indexOf(id) === 0 || x.id.indexOf(id) > 0); if (!a) continue;
    const act = A.get(a.id); const sp = act.spots()[0]; if (!sp) continue;
    p.x = sp.x; p.y = sp.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; await sleep(8000);
    await cap('b' + (++nr) + '-' + a.id + '-spot', 800);
    try { act.interact && act.interact(w); } catch (e) { noteer('bijbaan-' + a.id, e && e.message); }
    await sleep(3500); await cap('b' + nr + '-' + a.id + '-gestart', 800);
    try { act.quit && act.quit(w); } catch (e) { /* weg */ }
    await sleep(1500);
  }
});
clearInterval(skipper);
return JSON.stringify({ size: SIZE, done, notities, hudtekst, fouten });
