// Page half of scripts/qa/ds_galerij.mjs (desktop --perf-script body, #980). Opens game/ds-galerij.html in an iframe
// in the real app, and per section and surface logs `[capture] ds-<sectie>-<oppervlak>` for a screenshot. It also
// measures what a screenshot cannot say: the smallest text, horizontal overflow, the focus ring, and that
// "Beweging beperken" sets the transitions to zero. Nothing here touches the game state or real storage.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
document.body.innerHTML = '';
const fr = document.createElement('iframe');
fr.src = '/ds-galerij.html';
fr.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:99999;background:#0c140e';
document.body.appendChild(fr);
await sleep(2500);
const d = fr.contentDocument;
const w = fr.contentWindow;
const out = { fouten: [], secties: {}, kleinsteTekst: null, overloop: [], focus: null, beweging: null };
if (!d || !d.querySelector('.g-paneel')) {
  out.fouten.push('de galerij is niet geladen (geen .g-paneel)');
  return JSON.stringify({ results: { ds_galerij: out } });
}

const oppervlakken = ['papier', 'glas'];
const secties = [...d.querySelectorAll('section.g-sectie')];
for (const opp of oppervlakken) {
  w.__dsGalerij.zetOppervlak(opp);
  await sleep(300);
  for (const sec of secties) {
    const naam = sec.dataset.shot || sec.id;
    sec.scrollIntoView({ block: 'start' });
    await sleep(350);
    console.log(`[capture] ds-${naam}-${opp}`);
    await sleep(700);
    out.secties[`${naam}-${opp}`] = { hoogte: Math.round(sec.getBoundingClientRect().height) };
  }
}

// de kleinste tekst: elke zichtbare tekstknoop, met zijn berekende lettergrootte (12 px alleen in .ds-z-toets)
let min = { px: 1e9, waar: '' };
for (const el of d.querySelectorAll('.g-paneel *')) {
  if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
  const px = parseFloat(w.getComputedStyle(el).fontSize);
  if (el.closest('.ds-z-toets')) { if (px < 12) out.fouten.push(`toetsplaatje onder 12 px: ${px}`); continue; }
  if (px < 13) out.fouten.push(`tekst onder 13 px (${px}): ${el.className} "${el.textContent.trim().slice(0, 30)}"`);
  if (px < min.px) min = { px, waar: `${el.className} "${el.textContent.trim().slice(0, 30)}"` };
}
out.kleinsteTekst = min;

// horizontale overloop per paneel
for (const p of d.querySelectorAll('.g-paneel')) {
  if (p.scrollWidth > p.clientWidth + 1) out.overloop.push(`${p.dataset.oppervlak}: ${p.scrollWidth} > ${p.clientWidth}`);
}

// één focusring: Tab naar een knop en lees de omtrek
w.__dsGalerij.zetOppervlak('papier');
const knop = d.querySelector('.g-paneel.ds-papier .ds-knop:not(:disabled)');
if (knop) {
  knop.focus();
  await sleep(100);
  const cs = w.getComputedStyle(knop);
  out.focus = { omtrekBreedte: cs.outlineWidth, omtrekStijl: cs.outlineStyle, kleur: cs.outlineColor, zichtbaar: knop.matches(':focus-visible') };
  if (parseFloat(cs.outlineWidth) < 2 && knop.matches(':focus-visible')) out.fouten.push(`focusring dunner dan 2 px: ${cs.outlineWidth}`);
  console.log('[capture] ds-focus-papier');
  await sleep(500);
}

// beweging beperken: de overgangen van een knop worden nul
const wissel = d.getElementById('g-beweging');
const voor = knop ? w.getComputedStyle(knop).transitionDuration : '';
wissel.click();
await sleep(200);
const na = knop ? w.getComputedStyle(knop).transitionDuration : '';
out.beweging = { voor, na, aan: d.documentElement.classList.contains('reduce-motion') };
if (!/^0s(, 0s)*$/.test(na)) out.fouten.push(`na "Beweging beperken" staat de overgang op ${na} (verwacht 0s)`);
wissel.click();

w.__dsGalerij.zetOppervlak('beide');
d.querySelector('#s-hud').scrollIntoView({ block: 'start' });
await sleep(400);
console.log('[capture] ds-hud-beide');
await sleep(600);
console.log(`[ds-galerij] fouten ${out.fouten.length}, overloop ${out.overloop.length}`);
return JSON.stringify({ results: { ds_galerij: out } });
