// Page half of scripts/qa/sfx_levels.mjs (desktop --perf-script body): plays every effect of
// sfx/sfxlist.js through world.audioEvents, one at a time at the player's feet, and measures what
// reaches the (muted) output with the 20 ms analyser of audiotap_fast.js. Result: per effect the
// peak and the RMS above the quiet background, plus the clipping and silence flags.
const D = window.__debug; const w = D.world; const p = w.player;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const PM = await import('/js/pausemenu.js');
const L = await import('/js/sfx/sfxlist.js');
const cine = await import('/js/cinematics.js');
const ST = await import('/js/settings.js'); ST.setSetting('musicVolume', 0); ST.setSetting('voiceVolume', 0);
w.devInvuln = true;
D.input.canLock = () => false;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); }, 100);
await sleep(Number(window.__sl.settle || 15000));
const tap = () => window.__qaAudio;
const win = (t0, t1) => tap().rms.filter((r) => r.t >= t0 && r.t <= t1);
const AU = await import('/js/audio.js');
console.log('[sl-stats] ' + JSON.stringify(AU.sfxStats()));
const results = [];
const only = window.__sl.only;
for (const e of L.FX_LIST) {
  if (only.length && !only.includes(e.id) && !only.some((o) => e.id.startsWith(o))) continue;
  const log = tap();
  let t0 = Math.round(performance.now() - log.t0);
  await sleep(700);
  const base = win(t0, t0 + 650);
  const bRms = base.length ? base.reduce((a, r) => a + r.rms, 0) / base.length : 0;
  const bPeak = base.reduce((a, r) => Math.max(a, r.peak), 0);
  p.z = 0;
  const ev = { ...e.ev, x: p.x + 3, y: p.y };
  (w.audioEvents || (w.audioEvents = [])).push(ev);
  t0 = Math.round(performance.now() - log.t0);
  await sleep(e.ev && (e.ev.kind === 'fx' || e.ev.kind === 'weapon') ? 4200 : 2600);
  const m = win(t0, t0 + 4200);
  const started = log.sfx.filter((s) => s.t >= t0 && s.t <= t0 + 4200).length;
  const peak = m.reduce((a, r) => Math.max(a, r.peak), 0);
  const rms = m.reduce((a, r) => Math.max(a, r.rms), 0);
  results.push({ id: e.id, group: e.group, label: e.label, peak, rms, bRms: Math.round(bRms * 1e4) / 1e4, bPeak, n: m.length, started });
  console.log('[sl] ' + JSON.stringify(results[results.length - 1]));
}
const stats = AU.sfxStats();
clearInterval(skipper);
return JSON.stringify({ results, stats });
