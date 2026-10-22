// Paginascript van menuplekken_shots.mjs --meet: hoe lang het hoofdmenu over het laden doet (de laadmarkeringen en de poort).
// Met --start drukt het daarna zelf op Nieuw spel (window.__menuStart, zoals de testharnassen) en meet het hoe lang het duurt voor
// het spel op zijn startplek is ingeladen (streamPending van scene3d.js), met opnames na 1, 4 en 12 s.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cfg = window.__mp || {};
const ss = document.getElementById('start-screen');
for (let i = 0; i < 480 && !(ss && ss.classList.contains('visible')); i++) await sleep(250);
await sleep(1500);
const start = { marks: window.__loadMarks || null, poort: window.__menuGate ? window.__menuGate() : null, hang_ms: window.__menuHang ? window.__menuHang() : null, eerste: window.__menuBeeld || null };
const uit = { start, beelden: [{ naam: 'meting' }] };
if (cfg.start) {
  const S = await import('/js/scene3d.js');
  const w = window.__debug && window.__debug.world;
  const t0 = performance.now();
  const ok = window.__menuStart ? window.__menuStart('nieuw') : false;
  const rij = [];
  let rustig = null;
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const p = S.streamPending();
    const t = Math.round(performance.now() - t0);
    if (i % 2 === 1) rij.push({ t, gestart: document.body.classList.contains('game-started'), b: p.buildings, r: p.roads, ahead: p.ahead });
    if (rustig === null && document.body.classList.contains('game-started') && p.buildings + p.roads === 0 && !p.ahead) rustig = t;
    if (t > 1000 && !uit.opn1) { uit.opn1 = true; console.log('[capture] start-1s'); }
    if (t > 4000 && !uit.opn4) { uit.opn4 = true; console.log('[capture] start-4s'); }
    if (t > 12000 && !uit.opn12) { uit.opn12 = true; console.log('[capture] start-12s'); }
    if (t > 14000) break;
  }
  uit.spel = { ok, rustig_ms: rustig, rij, speler: w ? { x: Math.round(w.player.x), y: Math.round(w.player.y) } : null, loadscreen: !!document.getElementById('load-screen') };
}
return JSON.stringify(uit);
