// Diagnose van de start (#1046): wikkelt renderer.render en legt elke aanroep van > 25 ms vast, vanaf game-started, met
// hoeveel programma's erbij kwamen, welke materialen die nieuwe programma's hebben, en de groei van textures en geometrieën.
// Wordt door filmwarm.mjs voor programs.page.js gezet als GDE_DIAG=1; het resultaat staat in window.__startDiag (en in out.diag).
window.__startDiag = { events: [], steps: [] };
(async () => {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  let r = null;
  for (let i = 0; i < 6000 && !(r = window.__scene3d && window.__scene3d.renderer); i++) await sleep(20);
  if (!r || r.__diagWrapped) return;
  r.__diagWrapped = true;
  const sc = window.__scene3d.scene || window.__scene3d.getScene();
  const orig = r.render.bind(r);
  let t0 = null, known = new Set((r.info.programs || []).map((p) => p.cacheKey));
  let tex = r.info.memory.textures, geo = r.info.memory.geometries;
  const owners = (keys) => {
    const out = new Map();
    sc.traverse((o) => {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        if (!m) continue;
        const cp = r.properties.get(m).currentProgram;
        if (!cp || !keys.has(cp.cacheKey)) continue;
        let p = o, path = [];
        for (let i = 0; p && i < 4; i++, p = p.parent) path.push(`${p.type}${p.name ? ':' + p.name : ''}`);
        const k = `${m.type}:${m.name || ''} <- ${path.join(' < ')}`;
        out.set(k, (out.get(k) || 0) + 1);
      }
    });
    return [...out].sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  let prev = performance.now();
  const tick = () => { const n = performance.now(); const fs2 = window.__debug && window.__debug.frameStats; if (t0 !== null && n - prev > 100 && n - t0 < 8000) window.__startDiag.events.push({ at: Math.round(n - t0), gap: Math.round(n - prev), work: fs2 ? Math.round(fs2.workMs) : null, tex: r.info.memory.textures, geo: r.info.memory.geometries, calls: r.info.render.calls }); prev = n; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  r.render = function (...a) {
    if (t0 === null && document.body.classList.contains('game-started')) { t0 = performance.now(); window.__startDiag.t0 = Math.round(t0); }
    const p0 = performance.now();
    orig(...a);
    const ms = performance.now() - p0;
    const progs = r.info.programs || [];
    if (t0 === null) return;
    const nProg = progs.filter((p) => !known.has(p.cacheKey));
    const dTex = r.info.memory.textures - tex, dGeo = r.info.memory.geometries - geo;
    if (ms > 25 || nProg.length > 2) {
      const keys = new Set(nProg.map((p) => p.cacheKey));
      window.__startDiag.events.push({ at: Math.round(p0 - t0), ms: Math.round(ms), newProg: nProg.length, dTex, dGeo, own: nProg.length ? owners(keys) : [] });
    }
    for (const p of nProg) known.add(p.cacheKey);
    tex = r.info.memory.textures; geo = r.info.memory.geometries;
  };
})();
