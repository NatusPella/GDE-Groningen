// Page half for `cutscene_shots.mjs --page=benchmark_vervolg.page.js` (#159): twee dingen die benchmark_card.page.js niet doet.
//  A. annuleren: de benchmark start (event gde-benchmark), na 20 s een Escape; de overlay hoort weg te zijn en er hoort geen resultaatkaart te komen.
//  B. vergelijken: een volledige run, op 'Nog een keer' een tweede run, en de tekst van de vergelijking (.tr-cmp) op de tweede kaart.
// De benchmark is een testvlag-start (het event), zoals de titelschermknop hem start; alleen meten wanneer iemand dit script draait.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const out = { fouten: [] };
const key = (k, type) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, bubbles: true }));
const tr = () => document.getElementById('trailer');
const card = () => { const c = document.getElementById('trailer-result'); return c && !c.hidden ? c : null; };
const start = async () => {
  // the title screen's listener may attach late: ask again every 8 s (as benchmark_card.page.js does), never twice in a row
  for (let i = 0; i < 8; i++) {
    window.dispatchEvent(new Event('gde-benchmark'));
    for (let k = 0; k < 8; k++) { await sleep(1000); if (tr() && tr().classList.contains('on')) return true; }
  }
  return false;
};
await sleep(4000);

// A. annuleren
{
  const a = {};
  a.gestart = await start();
  if (a.gestart) {
    await sleep(20000);
    a.knopZichtbaar = !!document.querySelector('.tr-cancel');
    console.log('[capture] benchmark-annuleren-lopend');
    await sleep(1500);
    key('Escape', 'keydown'); key('Escape', 'keyup');
    await sleep(6000);
    a.overlayNaEscape = !!(tr() && tr().classList.contains('on'));
    a.kaartNaEscape = !!card();
    console.log('[capture] benchmark-annuleren-na');
    await sleep(1500);
    if (a.overlayNaEscape || a.kaartNaEscape) out.fouten.push('de benchmark bleef na Escape staan of toonde een kaart');
  } else out.fouten.push('benchmark startte niet (annuleertest)');
  out.annuleren = a;
}
await sleep(4000);

// B. twee runs: vergelijken met de vorige
const wacht = async (maxS) => { const t0 = performance.now(); while (performance.now() - t0 < maxS * 1000) { await sleep(1000); if (card()) return true; } return false; };
{
  const b = {};
  await start();
  b.kaart1 = await wacht(480);
  if (b.kaart1) {
    b.tekst1 = card().innerText.replace(/\s+/g, ' ').slice(0, 300);
    b.vergelijking1 = (card().querySelector('.tr-cmp') || {}).innerText || '';
    const again = card().querySelector('button[data-act="again"]');
    again.click();
    await sleep(3000);
    b.kaart2 = await wacht(480);
    if (b.kaart2) {
      b.tekst2 = card().innerText.replace(/\s+/g, ' ').slice(0, 400);
      b.vergelijking2 = (card().querySelector('.tr-cmp') || {}).innerText || '';
      console.log('[capture] benchmark-kaart-tweede');
      await sleep(1500);
      card().querySelector('button[data-act="back"]').click();
      await sleep(2000);
      b.kaartNaTerug = !!card();
    } else out.fouten.push('geen tweede resultaatkaart');
  } else out.fouten.push('geen eerste resultaatkaart');
  out.vergelijken = b;
}
return JSON.stringify({ results: { benchmark: out } });
