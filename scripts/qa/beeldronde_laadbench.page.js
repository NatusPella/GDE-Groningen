// Echt laadscherm (verre sprong) en echte benchmark (knop in Instellingen) voor de beeldronde 21-11
// (page-script voor scripts/qa/menufoto.mjs --page=beeldronde_laadbench.page.js; sets: laad, bench).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__mf || { size: '1920x1080', sets: [] };
const BR = CFG.size.split('x')[0]; const wil = (s) => CFG.sets.includes(s);
const fouten = []; const noteer = (soort, m) => { if (fouten.length < 60) fouten.push(soort + ': ' + String(m).slice(0, 300)); };
window.addEventListener('error', (e) => noteer('onerror', (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => noteer('promise', e.reason && (e.reason.stack || e.reason.message || e.reason)));
const ce = console.error.bind(console); console.error = (...a) => { noteer('console.error', a.map(String).join(' ')); ce(...a); };
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const done = []; const notities = {};
for (let i = 0; i < 240 && !(document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  await sleep(1000);
}
await sleep(2500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu'); const DN = await imp('daynight');
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(250); }
if (w.paused) { tap(' ', 'Space'); await sleep(600); }
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
await document.fonts.ready;
const vast = () => { w.clock = 13; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
vast(); setInterval(vast, 800);
const cap = async (name, wait = 300) => { await sleep(wait); console.log('[capture] ' + name + '-' + BR); await sleep(700); done.push(name); };
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const plaats = (n) => index.places.find((x) => x.name === n);
if (wil('laad')) {
  try {
    // echte verre sprong: het laadscherm opent vanzelf; elke ~1,2 s een beeld zolang het open is
    const dest = plaats('Delfzijl') || index.places[10];
    p.x = dest.x; p.y = dest.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
    let n = 0; const stappen = [];
    for (let i = 0; i < 80 && !document.getElementById('load-screen'); i++) await sleep(100);
    notities.laadschermOpen = !!document.getElementById('load-screen');
    while (document.getElementById('load-screen') && n < 7) {
      const el = document.getElementById('load-screen');
      stappen.push((el.innerText || '').replace(/\s+/g, ' ').slice(0, 160));
      await cap('l' + (++n) + '-laadscherm-echt', 600); await sleep(900);
    }
    notities.laadstappen = stappen;
    for (let i = 0; i < 200 && document.getElementById('load-screen'); i++) await sleep(200);
    await sleep(4000); await cap('l9-na-laden', 400);
  } catch (e) { noteer('laad', e && e.stack); }
}
if (wil('bench')) {
  try {
    p.x = 100; p.y = 77; await sleep(6000);
    PM.openPauseMenu('settings', { sub: 'video' }); await sleep(1800);
    const b = [...document.querySelectorAll('#pause-menu button')].find((x) => /benchmark|meting/i.test(x.textContent));
    notities.benchKnop = b ? b.textContent.trim() : null;
    if (!b) throw new Error('geen benchmarkknop');
    b.scrollIntoView({ block: 'center' }); await sleep(500); await cap('q1-benchmark-knop', 300);
    b.click(); await sleep(1500); await cap('q2-benchmark-na-klik', 300);
    // zoek een bevestigknop
    const ok = [...document.querySelectorAll('button')].find((x) => /^(start|ja|doorgaan|draaien|begin)/i.test(x.textContent.trim()) && x.offsetParent);
    if (ok && !document.body.classList.contains('trailer-on')) { notities.bevestig = ok.textContent.trim(); ok.click(); }
    const t0 = performance.now(); let k = 0;
    while (performance.now() - t0 < 6 * 60 * 1000) {
      await sleep(1000);
      const res = document.getElementById('trailer-result');
      if (res) { await sleep(2500); await cap('q5-benchmark-resultaat', 300); break; }
      if (k < 4 && (performance.now() - t0) > 15000 * (k + 1)) { k++; await cap('q3-benchmark-lopend-' + k, 100); }
    }
    notities.eindeNa = Math.round((performance.now() - t0) / 1000);
    const res = document.getElementById('trailer-result');
    if (res) {
      notities.resultaatTekst = (res.innerText || '').replace(/\s+/g, ' ').slice(0, 900);
      notities.knoppen = [...res.querySelectorAll('button')].map((x) => x.textContent.trim());
      const sc = res.scrollHeight > res.clientHeight; notities.scrollt = sc;
      res.scrollTop = res.scrollHeight; await sleep(600); await cap('q6-benchmark-resultaat-onderkant', 200);
      const back = res.querySelector('[data-act="back"]'); if (back) back.click(); else tap('Escape', 'Escape');
      await sleep(4000);
    }
    document.body.classList.remove('trailer-on');
    const hudEl = document.getElementById('hud');
    notities.hudNaBench = { klassen: [...document.body.classList].join(' '), display: hudEl && getComputedStyle(hudEl).display, kinderen: hudEl ? hudEl.children.length : 0 };
    await cap('q7-na-benchmark', 500);
  } catch (e) { noteer('bench', e && e.stack); }
}
return JSON.stringify({ size: CFG.size, done, notities, fouten });
