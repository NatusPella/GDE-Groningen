(() => {
  if (window.__bhook) return;
  window.__bhook = true;
  const t0 = performance.now();
  const heap = [];
  const mb = () => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0);
  setInterval(() => { heap.push([Math.round((performance.now() - t0) / 1000), Math.round(mb())]); }, 1000);
  if (window.__BDEBUG === undefined) { window.__BDEBUG = 1; const cw = console.warn.bind(console); console.warn = (...a) => { try { console.log('[trailer] berr WARN ' + a.map(String).join(' ').slice(0, 300)); } catch (e) { /* */ } cw(...a); }; const ce = console.error.bind(console); console.error = (...a) => { try { console.log('[trailer] berr ' + a.map(String).join(' ').slice(0, 300)); } catch (e) { /* */ } ce(...a); }; window.addEventListener('error', (e) => console.log('[trailer] bwinerr ' + e.message)); let n = 0; setInterval(() => { if (++n % 5 === 0) console.log('[trailer] bstat t' + Math.round(performance.now() / 1000) + ' body=' + document.body.className + ' txt=' + (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160)); }, 1000); }
  let lt = 0, ltMax = 0; const lts = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { lt++; ltMax = Math.max(ltMax, e.duration); lts.push([Math.round(e.startTime), Math.round(e.duration)]); } }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* none */ }
  // frame series: every rAF delta from the page start; bench start = first BENCHMARK fps label minus 500 ms
  const fr = []; let lastT = 0, benchT0 = 0;
  const tick = (now) => {
    if (lastT) fr.push([Math.round(now), Math.round((now - lastT) * 10) / 10]);
    lastT = now;
    if (!benchT0) { const el = document.querySelector('.bench'); const f = el && Array.from(el.querySelectorAll('*')).find((x) => /^BENCHMARK/.test(x.textContent || '') && !x.children.length); if (f) benchT0 = now - 500; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const slim = (k, v) => (Array.isArray(v) && v.length > 24 ? undefined : v);
  const iv = setInterval(() => {
    const T = window.__trailer;
    if (!T || !T.lastStats) return;
    clearInterval(iv);
    const s = T.lastStats;
    let list = []; try { list = T.list(); } catch (e) { /* none */ }
    let info = null;
    try { const r = window.__scene3d && window.__scene3d.renderer; if (r) info = { calls: r.info.render.calls, tris: r.info.render.triangles, geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: (r.info.programs || []).length }; } catch (e) { /* none */ }
    const out = { avg: s.avg, low: s.low, low1: s.low1, p95: s.p95, slow33: s.slow33, memory: s.memory, frames: s.frames, spikes: s.spikes, cats: s.cats, shots: (s.shots || []).map((x) => ({ label: x.label, fps: x.fps, idx: x.idx })), heapPeak: Math.max(...heap.map((h) => h[1]), 0), heapNow: Math.round(mb()), longtasks: lt, longtaskMax: Math.round(ltMax), info, benchT0: Math.round(benchT0), list: list.join('|'), bfr: (window.__bfr || []).join(','), fr: fr.map((x) => x[0] + ':' + x[1]).join(','), lts: lts.map((x) => x.join(':')).join(','), gl: (() => { try { const c = document.createElement('canvas').getContext('webgl2'); const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; } catch (x) { return 'err'; } })() };
    console.log('[trailer] bstats ' + JSON.stringify(out, slim));
  }, 500);
})();
