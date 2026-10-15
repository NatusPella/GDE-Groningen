// Page load timeline and heap (desktop --perf-script, scripts/perf/loadcheck.sh):
// window.__loadMarks is ms since navigation up to the title screen; the tile
// store (when the build has tiles) reports what it read.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
await sleep(1500);
const m = window.__loadMarks || {};
const t = window.__debug && window.__debug.map && window.__debug.map.store;
const nav = performance.getEntriesByType('navigation')[0];
return JSON.stringify({
  marks: m,
  title: m.title,
  tiles: !!(t),
  tileStats: t ? { ...t.stats, resident: t.residentKeys.length, residentMB: Math.round(t.residentBytes / 1e5) / 10 } : null,
  heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
  domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
});
