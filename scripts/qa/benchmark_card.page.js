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
// 0.64.1: in a real run the card opens while body.trailer-on is still set (fadeOutTrailer removes it after the card):
// the cursor must be visible and a click must land on the button (document.elementsFromPoint)
document.body.classList.add('trailer-on');
const p = T.showBenchmarkResults(res);
await sleep(1500);
const card = document.getElementById('trailer-result');
out.zichtbaar = !!card && !card.hidden;
out.tekst = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 500) : null;
out.knoppen = card ? [...card.querySelectorAll('button')].map((b) => b.textContent) : [];
const knop = card && card.querySelector('[data-act="back"]');
if (knop) {
  const r = knop.getBoundingClientRect();
  const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)[0];
  out.cursorOpKnop = getComputedStyle(knop).cursor;
  out.knopOnderCursor = top === knop;
  if (out.cursorOpKnop === 'none') out.fouten.push('cursor verborgen op de resultaatkaart');
  if (!out.knopOnderCursor) out.fouten.push('de knop Terug ligt niet bovenaan: ' + (top && (top.id || top.className)));
}
console.log('[capture] benchmark-kaart');
await sleep(1500);
if (card) card.querySelector('[data-act="back"]').click();
await Promise.race([p, sleep(2000)]);
document.body.classList.remove('trailer-on');
if (document.body.classList.contains('tr-result-open')) out.fouten.push('tr-result-open blijft hangen na Terug');
return JSON.stringify({ results: { benchmark: out } });
