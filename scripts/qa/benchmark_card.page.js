// Page half for `cutscene_shots.mjs --page=benchmark_card.page.js` (#159): starts the real benchmark from the title
// screen (event gde-benchmark), waits for the result card and takes a screenshot of it.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const out = { fouten: [] };
await sleep(4000);
const t0 = performance.now();
let card = null, last = -1e9;
while (performance.now() - t0 < 480000) {
  await sleep(1000);
  const tr = document.getElementById('trailer');
  // the title screen's listener may attach late: ask again until the benchmark runs
  if ((!tr || !tr.classList.contains('on')) && performance.now() - last > 8000 && !(card && !card.hidden)) { window.dispatchEvent(new Event('gde-benchmark')); last = performance.now(); out.pogingen = (out.pogingen || 0) + 1; }
  card = document.getElementById('trailer-result');
  if (card && !card.hidden) break;
  card = null;
}
out.seconden = Math.round((performance.now() - t0) / 1000);
if (!card) out.fouten.push('geen resultaatkaart binnen 7 minuten');
else {
  await sleep(800);
  out.tekst = card.innerText.replace(/\s+/g, ' ').slice(0, 600);
  out.categorieen = [...card.querySelectorAll('.tr-cats span')].map((e) => e.innerText.replace(/\s+/g, ' '));
  console.log('[capture] benchmark-kaart');
  await sleep(1200);
}
return JSON.stringify({ results: { benchmark: out } });
