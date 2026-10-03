// Marks the moment memcheck.sh samples the renderer's RSS (desktop
// --perf-script): 20 s into the game, when the geometry worker has loaded its
// map. The heap of that map copy is measured apart, in Node
// (scripts/perf/mapmem.mjs): the main thread's own churn drowns it here.
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
await sleep(20000);
const out = { heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) };
console.error('mem-mark'); // forwarded by the smoke test's console hook
await sleep(3000);
return JSON.stringify(out);
