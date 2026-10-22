// Frame-cost probe for scripts/perf/run.sh (desktop --bench-eval, runs at
// dom-ready): main-thread time per animation frame (every rAF callback that
// shares a frame timestamp is summed), long tasks, and optional GPU time
// through EXT_disjoint_timer_query_webgl2 around each frame's callbacks.
(() => {
  if (window.__perfHook) return;
  // the boot timeline of PERF_ONLY=wegenklaar (#247): every 250 ms, until the menu is up, what the menu gate waits for
  // [ms, buildings + roads still to build, the viewpoint's tiles in, number of load marks]; routes.js hands it in with the gate's report
  const boot = window.__bootLog = [];
  const bootIv = setInterval(() => {
    const st = window.__menuPlekken && window.__menuPlekken.stand ? window.__menuPlekken.stand() : null;
    boot.push([Math.round(performance.now()), st && st.wacht ? st.wacht.buildings + st.wacht.roads : null, st ? st.tegels : null, window.__loadMarks ? Object.keys(window.__loadMarks).length : 0]);
    if ((window.__loadMarks && window.__loadMarks.menu) || boot.length > 1200) clearInterval(bootIv);
  }, 250);
  const H = window.__perfHook = { frames: [], longTasks: [], gpuSum: 0, recording: false, gl: null, ext: null, gpuState: 'off' };
  const raf = window.requestAnimationFrame.bind(window);
  let frameTs = -1, cpu = 0;
  const pending = [];
  const flush = (ts) => {
    if (frameTs >= 0 && H.recording) H.frames.push([frameTs, cpu]);
    frameTs = ts; cpu = 0;
  };
  const pollGpu = () => {
    const gl = H.gl, ext = H.ext;
    while (pending.length) {
      const q = pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      pending.shift();
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) H.gpuSum += gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(q);
    }
  };
  // GPU time: one query around each rAF callback while recording, summed;
  // gpuAvg is the total over the frames (an upper bound: GPU idle gaps inside
  // a callback count too)
  window.requestAnimationFrame = (cb) => raf((ts) => {
    if (ts !== frameTs) flush(ts);
    let q = null;
    if (H.ext && H.recording) {
      pollGpu();
      if (pending.length < 32) { q = H.gl.createQuery(); H.gl.beginQuery(H.ext.TIME_ELAPSED_EXT, q); }
    }
    const t0 = performance.now();
    try { cb(ts); } finally {
      cpu += performance.now() - t0;
      if (q) { H.gl.endQuery(H.ext.TIME_ELAPSED_EXT); pending.push(q); }
    }
  });
  H.enableGpu = (gl) => {
    H.gl = gl;
    H.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    H.gpuState = H.ext ? 'on' : 'unavailable';
    return H.gpuState;
  };
  try {
    new PerformanceObserver((list) => {
      if (!H.recording) return;
      for (const e of list.getEntries()) H.longTasks.push(Math.round(e.duration));
    }).observe({ type: 'longtask', buffered: false });
  } catch (e) { H.longTaskState = 'unavailable'; }
  H.start = () => { H.frames = []; H.longTasks = []; H.gpuSum = 0; pending.length = 0; H.recording = true; };
  H.stop = () => {
    H.recording = false;
    if (H.ext) pollGpu();
    const f = H.frames;
    const dts = [];
    for (let i = 1; i < f.length; i++) dts.push(f[i][0] - f[i - 1][0]);
    const cpus = f.map((x) => x[1]);
    const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1); };
    const avg = (a) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0;
    return {
      frames: dts.length, avg: avg(dts), p95: pct(dts, 0.95), p99: pct(dts, 0.99), max: pct(dts, 1),
      p25: pct(dts, 0.25), p50: pct(dts, 0.5), cpuP25: pct(cpus, 0.25), cpuP50: pct(cpus, 0.5), cpuAvg: avg(cpus), cpuP95: pct(cpus, 0.95), cpuP99: pct(cpus, 0.99),
      gpuAvg: H.ext ? +(H.gpuSum / Math.max(1, dts.length)).toFixed(2) : null,
      longTasks: H.longTasks.length, longMax: H.longTasks.length ? Math.max(...H.longTasks) : 0,
      over50: dts.filter((d) => d > 50).length, over100: dts.filter((d) => d > 100).length,
    };
  };
})();
