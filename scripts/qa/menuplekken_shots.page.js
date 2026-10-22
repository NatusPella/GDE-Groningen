// Paginascript van menuplekken_shots.mjs (draait in het spel via desktop --perf-script; GDE_MENU_TEST=1: het menu blijft staan).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cfg = window.__mp;
for (let i = 0; i < 240 && !window.__menuPlekken; i++) await sleep(500);
const ss = document.getElementById('start-screen');
const t0 = performance.now();
for (let i = 0; i < 240 && !(ss && ss.classList.contains('visible')); i++) await sleep(500);
const start = {
  menuNa_ms: Math.round(performance.now() - t0),
  poort: window.__menuGate ? window.__menuGate() : null,
  marks: window.__loadMarks || null,
  eerste: window.__menuBeeld || null,
  stand: window.__menuPlekken.stand(),
};
const alle = window.__menuPlekken.lijst();
const ids = cfg.ids ? cfg.ids.split(',') : alle.filter((id) => !id.startsWith('stad-'));
if (!cfg.menu) ss.style.visibility = 'hidden';
const beelden = [];
for (const id of ids) {
  const hoeken = cfg.hoeken.length ? cfg.hoeken : [null];
  for (const hoek of hoeken) {
    const naam = hoek === null ? id : `${id}-${hoek}`;
    const rec = { naam };
    try {
      const vast = {};
      if (hoek !== null) vast.hoek = hoek;
      if (cfg.uur) vast.uur = Number(cfg.uur);
      if (cfg.beweging) vast.beweging = cfg.beweging;
      const tw = performance.now();
      const b = window.__menuPlekken.naar(id, vast);
      if (!b) throw new Error('onbekende plek');
      Object.assign(rec, b);
      // wachten tot het streamen rustig is (drie keer achter elkaar), en tot de camera cfg.t seconden bezig is
      let rustig = 0;
      for (let i = 0; i < 150 && rustig < 3; i++) {
        await sleep(400);
        const s = window.__menuPlekken.stand().wacht;
        rustig = s.buildings + s.roads === 0 && !s.ahead ? rustig + 1 : 0;
      }
      rec.wacht_ms = Math.round(performance.now() - tw);
      while (window.__menuPlekken.stand().t < cfg.t) await sleep(200);
      console.log('[capture] ' + naam);
      await sleep(900);
    } catch (e) { rec.fout = String(e && e.message || e); }
    beelden.push(rec);
  }
}
ss.style.visibility = '';
return JSON.stringify({ start, beelden });
