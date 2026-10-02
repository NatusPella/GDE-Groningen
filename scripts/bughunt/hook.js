(() => {
  if (window.__bh) return;
  const B = window.__bh = { err: new Map(), warn: new Map(), tag: 'boot', frames: { tag: 'boot', spikes: [], max: {}, sum: {}, n: {} } };
  const fmt = (x) => { try { return x instanceof Error ? (x.message) : typeof x === 'object' ? JSON.stringify(x).slice(0, 200) : String(x); } catch (e) { return String(x); } };
  const rec = (kind, msg, stack) => {
    const m = B[kind]; const k = String(msg).replace(/\d+\.\d+/g, '#').slice(0, 260); const e = m.get(k);
    if (e) { e.n++; if (!e.tags.includes(B.tag) && e.tags.length < 6) e.tags.push(B.tag); }
    else m.set(k, { n: 1, tags: [B.tag], stack: String(stack || '').split('\n').filter((l) => /\/js\//.test(l)).slice(0, 4).map((l) => l.trim().replace(/^at /, '').replace(/app:\/\/game\/js\//, '')).join(' < ').slice(0, 360) });
  };
  B.rec = rec; B.oeRaw = (...a) => oe(...a);
  const oe = console.error.bind(console), ow = console.warn.bind(console);
  console.error = (...a) => { const s = a.find((x) => x && x.stack); rec('err', a.map(fmt).join(' '), s ? s.stack : new Error().stack); oe(...a); };
  console.warn = (...a) => { rec('warn', a.map(fmt).join(' '), new Error().stack); ow(...a); };
  window.addEventListener('error', (e) => rec('err', 'uncaught: ' + (e.message || e), e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => rec('err', 'rejection: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack));
  let last = performance.now();
  const f = (n) => {
    const dt = n - last; last = n; const F = B.frames;
    if (!document.hidden) {
      F.max[F.tag] = Math.max(F.max[F.tag] || 0, dt); F.sum[F.tag] = (F.sum[F.tag] || 0) + dt; F.n[F.tag] = (F.n[F.tag] || 0) + 1;
      if (dt > 250 && F.spikes.length < 400) F.spikes.push([F.tag, Math.round(dt)]);
    }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})();
