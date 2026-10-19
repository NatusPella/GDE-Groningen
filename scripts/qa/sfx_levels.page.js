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
for (const e of (window.__sl.cutscenes.length ? [] : L.FX_LIST)) {
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
// cutscenes (--cutscenes=M01,M02,...): jump to the step, press E at the start and log what the scene
// queues and the level on the tap while it runs (same idea as visual_issues.page.js 'cutscenes')
const scenes = {};
if (window.__sl.cutscenes.length) {
  clearInterval(skipper);
  const St = window.__story, AQ = window.__qaAudio, log = [];
  let arr = w.audioEvents || [];
  const wrap = (a) => { const pu = a.push.bind(a); a.push = (...x) => { for (const e of x) log.push(e.kind + (e.name ? ':' + e.name : '')); return pu(...x); }; return a; };
  arr = wrap(arr);
  Object.defineProperty(w, 'audioEvents', { configurable: true, get() { return arr; }, set(v) { arr = wrap(v); } });
  for (const id of window.__sl.cutscenes) {
    const rec = { cinematic: false };
    try {
      const l0 = log.length, a0 = AQ.rms.length;
      St.jump(id);
      await sleep(2500);
      if (St.teleport) St.teleport();
      await sleep(4000);
      for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', code: 'KeyE', bubbles: true })); }
      let t0 = null;
      for (let i = 0; i < 90; i++) {
        await sleep(500);
        if (cine.isCinematicActive()) { if (t0 === null) { t0 = i; rec.started = i * 0.5; } rec.cinematic = true; }
        else if (t0 !== null) { rec.lasted = (i - t0) * 0.5; break; }
      }
      if (cine.isCinematicActive()) cine.skipCinematic();
      rec.events = log.slice(l0);
      const seg = AQ.rms.slice(a0);
      rec.audio = seg.length ? { blocks: seg.length, maxRms: Math.max(...seg.map((x) => x.rms)), maxPeak: Math.max(...seg.map((x) => x.peak)), silent: seg.filter((x) => x.rms < 0.0005).length } : 'geen tap';
    } catch (e) { rec.fout = String(e && e.message || e).slice(0, 160); }
    scenes[id] = rec;
    await sleep(1500);
  }
}
const stats = AU.sfxStats();
clearInterval(skipper);
return JSON.stringify({ results, stats, scenes });
