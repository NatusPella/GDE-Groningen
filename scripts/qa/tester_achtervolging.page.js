// Page half van scripts/qa/tester_bugs.mjs --check=achtervolging (#117): klinkt de cutscene met de politieauto (M02.intro:
// de trekker rijdt weg, de politie komt met sirene aan en remt) en is het geluid van de voertuigen te meten? Draait met
// --audio-graph en de audiotap (scripts/qa/audiotap.js, --bench-eval): het niveau vóór de gedempte uitgang per seconde,
// elk geluid dat de scène in de wereldwachtrij zet (world.audioEvents) en elke buffer die start (window.__qaAudio.sfx).
// Opties (--opts): { missions: 'M02' }. Uitvoer: per scène de seconden met niveau, de wachtrij met tijd en de voorbij gegane buffers.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const AQ = window.__qaAudio;
if (!AQ) return JSON.stringify({ results: { fout: 'geen audiotap (--bench-eval=audiotap.js)' } });
const rel = () => Math.round(performance.now() - AQ.t0);

// het wereldgeluid dat een scène vraagt, met tijd
const queue = [];
{
  let arr = w.audioEvents || [];
  const wrap = (a) => { const p = a.push.bind(a); a.push = (...x) => { for (const e of x) queue.push({ t: rel(), k: (e.kind || '') + (e.name ? ':' + e.name : '') }); return p(...x); }; return a; };
  arr = wrap(arr);
  Object.defineProperty(w, 'audioEvents', { configurable: true, get() { return arr; }, set(v) { arr = wrap(v); } });
}

// Nieuw spel kiezen (de opening overslaan: TB.skipOpening)
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent)); if (it) it.click(); else key('Enter', 'Enter'); }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
// de opening kan al gestart zijn: overslaan en uitlopen
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(3000);

const SP = await import('/js/storyarc.js');
const MS = await import('/js/missionstory.js');
w.devInvuln = true;
const result = {};
for (const id of (TB.missions || 'M02').split(',')) {
  const step = SP.STEPS.find((s) => s.id === id || s.mission === id);
  const idx = step ? SP.MISSION_IDS.indexOf(step.mission) : -1;
  if (idx < 0) { result[id] = { fout: 'stap niet gevonden' }; continue; }
  for (const kind of ['intro']) {
    for (let i = 0; i < 300 && cine.isCinematicActive(); i++) await sleep(100);
    await sleep(3000);
    const base = AQ.rms.filter((r) => r.t > rel() - 3000);
    const baseRms = base.length ? base.reduce((a, r) => a + r.rms, 0) / base.length : 0;
    const t0 = rel(), q0 = queue.length, s0 = AQ.sfx.length, r0 = AQ.rms.length;
    let ok = false;
    try { ok = MS.playStoryIntro(w, idx, { stage: idx }); } catch (e) { result[id + '.' + kind] = { fout: String(e).slice(0, 200) }; continue; }
    let began = false, quiet = 0;
    for (let i = 0; i < 2400; i++) {
      await sleep(100);
      const act = cine.isCinematicActive();
      if (act) began = true;
      if (began && !act) { if (++quiet > 15) break; } else if (!began && i > 80) break; else quiet = 0;
    }
    const secs = {};
    for (const r of AQ.rms.slice(r0)) { const s = Math.floor((r.t - t0) / 1000); const o = secs[s] || (secs[s] = { rms: 0, peak: 0 }); o.rms = Math.max(o.rms, r.rms); o.peak = Math.max(o.peak, r.peak); }
    result[id + '.' + kind] = {
      gestart: !!ok && began, duur: Math.round((rel() - t0) / 100) / 10, basisRms: Math.round(baseRms * 10000) / 10000,
      wachtrij: queue.slice(q0).map((q) => ({ t: Math.round((q.t - t0) / 100) / 10, k: q.k })),
      buffers: AQ.sfx.slice(s0).map((q) => ({ t: Math.round((q.t - t0) / 100) / 10, len: q.len })),
      perSeconde: Object.fromEntries(Object.entries(secs).map(([s, o]) => [s, [o.rms, o.peak]])),
    };
    console.log('[tb] ' + id + '.' + kind + ' klaar');
    if (cine.isCinematicActive()) cine.skipCinematic();
    await sleep(800);
  }
}
return JSON.stringify({ results: result });
