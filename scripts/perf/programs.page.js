// Shader programs per moment on the player path (desktop --perf-script, scripts/perf/programs.mjs reads the result):
// after the game started, at fixed moments (PROG_AT seconds, default 0,25,70,120) a snapshot of renderer.info.programs
// (cacheKey, name, linked) with the materials that own each program, and the frames over 50/100 ms per window.
// Run on the player path: --url-flags=noattract,warm (without --stil for load time).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 1800 && !document.body.classList.contains('game-started'); i++) await sleep(100);
const t0 = performance.now();
const marks = JSON.parse(JSON.stringify(window.__loadMarks || {}));
const AT = (window.__progAt || [0, 25, 70, 120]).map((s) => s * 1000);
const frames = []; // [t since start, dt]
let prev = performance.now();
const tick = () => { const n = performance.now(); frames.push([Math.round(n - t0), Math.round(n - prev)]); prev = n; requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const sc = window.__scene3d;
const r = sc.renderer;
const snap = () => {
  const progs = r.info.programs || [];
  const owners = new Map(); // cacheKey -> Map(label -> count)
  const seen = new Set();
  const visit = (m, label) => {
    if (!m || seen.has(m)) return;
    seen.add(m);
    const props = r.properties.get(m);
    const pm = props && props.programs;
    const cur = props && props.currentProgram;
    const label2 = `${m.type}:${m.name || m.userData.kind || ''}`;
    const keys = pm ? [...pm.keys()] : (cur ? [cur.cacheKey] : []);
    for (const k of keys) {
      let o = owners.get(k); if (!o) owners.set(k, o = new Map());
      o.set(label2, (o.get(label2) || 0) + 1);
    }
  };
  const root = sc.scene || (sc.getScene && sc.getScene());
  if (root) root.traverse((o) => { if (Array.isArray(o.material)) o.material.forEach((m) => visit(m)); else visit(o.material); visit(o.customDepthMaterial); });
  const list = progs.map((p) => {
    const o = owners.get(p.cacheKey);
    return { n: p.name, k: String(p.cacheKey).slice(0, 4000), len: String(p.cacheKey).length, used: p.usedTimes, ok: p.isReady ? p.isReady() : null, own: o ? [...o].sort((a, b) => b[1] - a[1]).slice(0, 4) : [] };
  });
  return { count: progs.length, linked: list.filter((l) => l.ok).length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, parallel: r.extensions.has('KHR_parallel_shader_compile'), list };
};
const out = { marks, snaps: [] };
for (const a of AT) {
  const wait = t0 + a - performance.now();
  if (wait > 0) await sleep(wait);
  const s = snap(); s.at = Math.round((performance.now() - t0) / 1000);
  out.snaps.push(s);
}
const win = (a, b) => { const f = frames.filter(([t]) => t >= a && t < b); return { frames: f.length, over50: f.filter(([, d]) => d > 50).length, over100: f.filter(([, d]) => d > 100).length, worst: f.reduce((m, [, d]) => Math.max(m, d), 0) }; };
out.win = { s0_25: win(0, 25000), s25_70: win(25000, 70000), s70_end: win(70000, 1e9) };
out.hitches = frames.filter(([, d]) => d > 100).slice(0, 80);
out.total = Math.round(performance.now() - t0);
return JSON.stringify(out);
