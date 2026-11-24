// Page half of scripts/qa/cutscene_sfx_proef.mjs (feedback eigenaar 24-11, cutscenesfx.js): play a few staged scenes of act 1 in the
// real game with --audio-graph and the audiotap (scripts/qa/audiotap.js, --bench-eval), and log per scene every world sound the scene
// queues (world.audioEvents, with time), every buffer that starts (window.__qaAudio.sfx), the ambience bed the host sets
// (world.cutsceneAmb) and the ambience bus level (window.__audio.state().ambience: the speech duck) before and during the scene.
// Options (window.__tb): { scenes: 'M01.intro,M02.intro,M03.outro' }. Returns JSON { results } via the [perf-script] line.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const AQ = window.__qaAudio;
if (!AQ) return JSON.stringify({ results: { fout: 'geen audiotap (--bench-eval=audiotap.js)' } });
const rel = () => Math.round(performance.now() - AQ.t0);

// every world sound a scene asks for, with time and the fields that tell which cue it is
const queue = [];
{
  let arr = w.audioEvents || [];
  const wrap = (a) => { const p = a.push.bind(a); a.push = (...x) => { for (const e of x) queue.push({ t: rel(), k: (e.kind || '') + (e.name ? ':' + e.name : '') + (e.key ? ':' + e.key : '') + (e.sub ? '/' + e.sub : '') + (e.auto ? ' (auto)' : '') }); return p(...x); }; return a; };
  arr = wrap(arr);
  Object.defineProperty(w, 'audioEvents', { configurable: true, get() { return arr; }, set(v) { arr = wrap(v); } });
}

// a new game, the opening skipped
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { if (window.__menuStart) window.__menuStart('nieuw'); else key('Enter', 'Enter'); }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(3000);

const SP = await import('/js/storyarc.js');
const MS = await import('/js/missionstory.js');
const A = window.__audio;
w.devInvuln = true;
const result = {};
for (const sceneKey of (TB.scenes || 'M01.intro,M02.intro,M03.outro').split(',')) {
  const [mission, kind] = sceneKey.split('.');
  const step = SP.STEPS.find((s) => s.id === mission || s.mission === mission);
  const idx = step ? SP.MISSION_IDS.indexOf(step.mission) : -1;
  if (idx < 0) { result[sceneKey] = { fout: 'stap niet gevonden' }; continue; }
  for (let i = 0; i < 300 && cine.isCinematicActive(); i++) await sleep(100);
  await sleep(2500);
  const ambVoor = A && A.state ? A.state().ambience : null;
  const t0 = rel(), q0 = queue.length, s0 = AQ.sfx.length;
  let ok = false;
  try { ok = kind === 'outro' ? MS.playStoryOutro(w, idx, {}) : MS.playStoryIntro(w, idx, { stage: idx }); } catch (e) { result[sceneKey] = { fout: String(e).slice(0, 200) }; continue; }
  let began = false, quiet = 0;
  const amb = new Set(), ambBus = [], stil = [];
  for (let i = 0; i < 2400; i++) {
    await sleep(100);
    const act = cine.isCinematicActive();
    if (act) {
      began = true;
      if (w.cutsceneAmb) amb.add(w.cutsceneAmb.amb);
      if (i % 10 === 0 && A && A.state) { const st = A.state(); ambBus.push(st.ambience); stil.push(!!w.paused + '/' + !!w.cinematicPause); }
    }
    if (began && !act) { if (++quiet > 15) break; } else if (!began && i > 80) break; else quiet = 0;
  }
  const qs = queue.slice(q0).map((q) => ({ t: Math.round((q.t - t0) / 100) / 10, k: q.k }));
  const bufs = AQ.sfx.slice(s0).map((q) => ({ t: Math.round((q.t - t0) / 100) / 10, len: q.len }));
  // a cue counts as heard when a buffer starts within 1.5 s after it was queued (the speed-of-sound delay and the door's 0.22 s included)
  const cues = qs.filter((q) => !/^warm/.test(q.k)).map((q) => ({ ...q, buffer: bufs.some((b) => b.t >= q.t - 0.05 && b.t <= q.t + 1.5) }));
  result[sceneKey] = {
    gestart: !!ok && began, duur: Math.round((rel() - t0) / 100) / 10,
    bed: [...amb], ambienceVoor: ambVoor, ambienceTijdens: ambBus, pauze: [...new Set(stil)],
    warm: qs.filter((q) => /^warm/.test(q.k)).length,
    cues, buffers: bufs.length,
    cutsceneAmbNa: w.cutsceneAmb ? w.cutsceneAmb.amb : null,
  };
  console.log('[cutsfx] ' + sceneKey + ' klaar');
  if (cine.isCinematicActive()) cine.skipCinematic();
  await sleep(800);
}
return JSON.stringify({ results: result });
