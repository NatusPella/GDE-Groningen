// Page half for `cutscene_shots.mjs --page=benchmark_card.page.js` (#159): the result card of the benchmark with
// synthetic frame times (a real run is a player's choice, AGENTS.md): checks the categories incl. 'Spoor', the
// advice and the buttons, and takes a screenshot. The route's shot ids are checked against the trailer's shots.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const B = await import('/js/benchstats.js');
const T = await import('/js/trailer.js');
const out = { fouten: [] };
await sleep(3000);
const stats = (fps) => Array.from({ length: 240 }, (_, i) => 1000 / fps + (i % 40 === 0 ? 25 : 0) + (i % 7));
const shots = B.BENCH_ROUTE.map(([id], i) => ({ id, label: id, ms: stats(i % 3 === 0 ? 38 : 62) }));
const all = shots.flatMap((s) => s.ms);
const fs = B.frameStats(all);
const mean = all.reduce((a, b) => a + b, 0) / all.length;
const res = { stats: { avg: 1000 / mean, low: fs.low1, low1: fs.low1, p95: fs.p95, slow33: fs.slow33, hitches: B.routeHitches(shots), cats: B.categoryStats(shots), memory: 310, heaviest: null, frames: all.length, shots: [], spikes: [0, 0, 0] } };
out.categorieen = Object.keys(res.stats.cats);
if (!out.categorieen.includes('spoor')) out.fouten.push('geen categorie spoor');
const p = T.showBenchmarkResults(res);
await sleep(1500);
const card = document.getElementById('trailer-result');
out.zichtbaar = !!card && !card.hidden;
out.tekst = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 500) : null;
out.knoppen = card ? [...card.querySelectorAll('button')].map((b) => b.textContent) : [];
console.log('[capture] benchmark-kaart');
await sleep(1500);
if (card) card.querySelector('[data-act="back"]').click();
await Promise.race([p, sleep(2000)]);
return JSON.stringify({ results: { benchmark: out } });
