// Page hook of scripts/perf/ultrabench.mjs (loaded with --bench-eval): uncapped frame gaps of the benchmark window, the longest stalls with the
// shot they fell in, the shader programs created during the run, and (with ?hitch) the slow frames of hitchprobe.js. The trailer loop caps a
// frame at 250 ms in its own stats, so the longest stall comes from requestAnimationFrame here. Prints one line '[trailer] ubstats {...}'.
(() => {
  if (window.__ubhook) return;
  window.__ubhook = true;
  const gaps = []; // [t, ms] of every rAF gap
  const enters = []; // [t, shot index, label]
  let benchT0 = 0, benchT1 = 0, lastT = 0;
  const lts = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lts.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* none */ }
  const progAt = []; // [t, programs] once a second during the run
  // draw calls in the city (shot 3, Terrassen op de Vismarkt, 1,5 s in): one frame, each draw of the game scene by the name of its
  // nearest named ancestor and its material type; shadow-pass draws (scene null) counted apart
  let callsCity = null, shadowCity = null, drawsCity = null;
  const captureDraws = () => {
    const r = ren();
    if (!r) return;
    const orig = r.renderBufferDirect;
    const by = new Map();
    let main = 0, shadow = 0;
    r.renderBufferDirect = function (camera, sc, geometry, material, object, group) {
      if (sc === null) shadow++;
      else {
        main++;
        let o = object, label = '';
        while (o && !label) { label = o.name || (o.userData && (o.userData.kind || o.userData.type)) || ''; o = o.parent; }
        const k = (label || object.type) + '/' + (material && material.type ? material.type.replace(/Material$/, '') : '?');
        by.set(k, (by.get(k) || 0) + 1);
      }
      return orig.apply(this, arguments);
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      r.renderBufferDirect = orig;
      callsCity = main; shadowCity = shadow;
      drawsCity = [...by].sort((a, b) => b[1] - a[1]).slice(0, 30);
    }));
  };
  const ren = () => { try { return window.__scene3d && window.__scene3d.renderer; } catch (e) { return null; } };
  const log = console.log.bind(console);
  log('[trailer] ubhook aan');
  console.log = (...a) => {
    const s = typeof a[0] === 'string' ? a[0] : '';
    if (s.startsWith('[trailer] enter ')) { const m = /enter (\d+)/.exec(s); const t = performance.now(); if (!benchT0) benchT0 = t; enters.push([t, Number(m && m[1])]); if (Number(m && m[1]) === 3) setTimeout(captureDraws, 1500); }
    if (s.startsWith('[trailer] shot ')) { const m = /shot (\d+) ([^:]+):/.exec(s); if (m) { const e = enters.find((x) => x[1] === Number(m[1])); if (e) e[2] = m[2]; } }
    if (s.startsWith('[trailer] benchmark ')) { benchT1 = performance.now(); queueMicrotask(emit); } // the app quits right after the run: emit before any timer
    return log(...a);
  };
  const tick = (now) => {
    if (lastT) gaps.push([now, now - lastT]);
    if (!benchT1 && window.__trailer && window.__trailer.lastStats) { benchT1 = now; emit(); } // the app quits 0,5 s after the run
    lastT = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setInterval(() => { const r = ren(); if (r && benchT0 && !benchT1) progAt.push([Math.round((performance.now() - benchT0) / 1000), (r.info.programs || []).length]); }, 1000);
  const shotAt = (t) => { let e = null; for (const x of enters) if (x[0] <= t) e = x; return e ? `${e[1]} ${e[2] || ''}`.trim() : '-'; };
  let tries = 0;
  let emitted = false;
  function emit() {
    if (emitted) return;
    const T = window.__trailer;
    if (!T || !T.lastStats || !benchT1) { if (tries++ < 50) setTimeout(emit, 0); return; }
    const s = T.lastStats;
    const win = gaps.filter(([t]) => t > benchT0 + 1500 && t <= benchT1);
    const ms = win.map((g) => g[1]);
    const durS = (benchT1 - benchT0 - 1500) / 1000;
    const longest = win.slice().sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, d]) => ({ at: +((t - benchT0) / 1000).toFixed(2), ms: Math.round(d), shot: shotAt(t - d) }));
    const r = ren();
    const info = r ? { calls: r.info.render.calls, tris: r.info.render.triangles, geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: (r.info.programs || []).length } : null;
    let hitch = null;
    try {
      if (window.__hitch) {
        const h = window.__hitch.summary();
        hitch = { sections: h.sections, peaks: h.peaks, slow: ((l) => l.length > 240 ? [...l.slice(0, 160), ...l.slice(-80)] : l)(h.slow.filter((x) => (x.gap || x.cpu) >= 50)), programs: h.programs.length, progList: h.programs.slice(-400).map((p) => `${p.at} ${p.name}`) };
      }
    } catch (e) { hitch = { error: String(e) }; }
    const out = {
      avg: s.avg, low1: s.low1, p95: s.p95, spikes: s.spikes, frames: s.frames, memory: s.memory,
      cats: Object.fromEntries(Object.entries(s.cats || {}).map(([k, v]) => [k, { avg: +v.avg.toFixed(1), low1: +v.low1.toFixed(1) }])),
      shots: (s.shots || []).map((x) => ({ label: x.label, fps: +x.fps.toFixed(1), idx: x.idx })).sort((a, b) => a.idx - b.idx),
      raf: { frames: ms.length, durS: +durS.toFixed(1), max: Math.round(Math.max(0, ...ms)), over50: ms.filter((x) => x > 50).length, over100: ms.filter((x) => x > 100).length, over50PerMin: +(ms.filter((x) => x > 50).length / (durS / 60)).toFixed(1) },
      callsCity, shadowCity, drawsCity, benchT0s: +(benchT0 / 1000).toFixed(2), longest, longtasks: lts.filter(([t]) => t > benchT0 && t <= benchT1).length, progAt, info, hitch,
      enters: enters.map(([t, i, l]) => [+((t - benchT0) / 1000).toFixed(1), i, l || '']),
    };
    emitted = true;
    log('[trailer] ubstats ' + JSON.stringify(out));
  }
})();
