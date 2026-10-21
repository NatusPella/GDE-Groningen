// Page half van scripts/qa/benchmark_run.mjs (#159): het spel draait met --benchmark en start de benchmark zelf.
// modus 'kaart': wacht op de resultaatkaart, legt hem direct vast (het spel sluit zichzelf een halve seconde na de kaart: de pagina
// zet quit uit, zodat de kaart blijft staan) en geeft tekst, categorieën, vergelijking en knoppen terug.
// modus 'annuleer': na 20 s Escape; de overlay hoort dan weg te zijn en er hoort geen kaart te komen.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const BM = window.__bm || {};
const out = { modus: BM.modus, fouten: [] };
const tr = () => document.getElementById('trailer');
const card = () => { const c = document.getElementById('trailer-result'); return c && !c.hidden ? c : null; };
// de desktopbrug is bevroren: het spel sluit zich 500 ms na de kaart via setTimeout(quit); die ene timer slaat deze pagina over
const setT = window.setTimeout.bind(window);
window.setTimeout = (fn, ms, ...a) => (ms === 500 && typeof fn === 'function' && /quit/.test(String(fn)) ? 0 : setT(fn, ms, ...a));
const key = (k, type) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, bubbles: true }));
const t0 = performance.now();
// het titelscherm, dan het event van de knop (de luisteraar hangt pas aan als het menu er is: opnieuw vragen als het overlay uitblijft)
for (let i = 0; i < 240; i++) { const ss = document.getElementById('start-screen'); if (ss && ss.classList.contains('visible')) break; await sleep(500); }
await sleep(2500);
let on = false;
for (let k = 0; k < 8 && !on; k++) {
  window.dispatchEvent(new Event('gde-benchmark'));
  for (let i = 0; i < 16 && !on; i++) { await sleep(500); on = !!(tr() && tr().classList.contains('on')); }
}
out.gestart = on;
out.startNaS = Math.round((performance.now() - t0) / 1000);
if (!on) { out.fouten.push('de benchmark startte niet na het event gde-benchmark'); return JSON.stringify({ results: { benchmark: out } }); }
if (BM.modus === 'annuleer') {
  await sleep(20000);
  out.annuleerKnop = !!document.querySelector('.tr-cancel');
  console.log('[capture] benchmark-annuleer-lopend');
  await sleep(1500);
  key('Escape', 'keydown'); key('Escape', 'keyup');
  await sleep(6000);
  out.overlayNaEscape = !!(tr() && tr().classList.contains('on'));
  out.kaartNaEscape = !!card();
  console.log('[capture] benchmark-annuleer-na');
  await sleep(1500);
  if (out.overlayNaEscape || out.kaartNaEscape) out.fouten.push('de benchmark bleef na Escape staan of toonde een kaart');
  return JSON.stringify({ results: { benchmark: out } });
}
// kaart: poll snel, het spel sluit zich anders binnen een halve seconde
const t1 = performance.now();
let c = null;
while (performance.now() - t1 < (BM.maxS || 900) * 1000) { await sleep(100); c = card(); if (c) break; }
if (!c) { out.fouten.push('geen resultaatkaart'); return JSON.stringify({ results: { benchmark: out } }); }
await sleep(1500); // de kaart faded in
console.log('[capture] benchmark-kaart-echt');
out.runSeconden = Math.round((performance.now() - t1) / 1000);
out.tekst = c.innerText.replace(/\s+/g, ' ').slice(0, 700);
out.categorieen = [...c.querySelectorAll('.tr-cats span')].map((e) => e.innerText.replace(/\s+/g, ' '));
out.vergelijking = (c.querySelector('.tr-cmp') || {}).innerText || '';
out.knoppen = [...c.querySelectorAll('button')].map((b) => b.textContent);
if (BM.modus === 'vergelijk') {
  // 'Nog een keer': de tweede kaart hoort de vorige run te noemen
  const again = c.querySelector('button[data-act="again"]');
  again.click();
  await sleep(5000);
  const t2 = performance.now();
  let c2 = null;
  while (performance.now() - t2 < (BM.maxS || 900) * 1000) { await sleep(500); c2 = card(); if (c2) break; }
  if (!c2) out.fouten.push('geen tweede resultaatkaart');
  else {
    await sleep(1500);
    console.log('[capture] benchmark-kaart-tweede');
    out.tekst2 = c2.innerText.replace(/s+/g, ' ').slice(0, 700);
    out.vergelijking2 = (c2.querySelector('.tr-cmp') || {}).innerText || '';
  }
  await sleep(2500);
  return JSON.stringify({ results: { benchmark: out } });
}
await sleep(2500);
return JSON.stringify({ results: { benchmark: out } });
