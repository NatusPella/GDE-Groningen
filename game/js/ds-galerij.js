// Ontwikkelpad voor het designsysteem v2 (#980): game/ds-galerij.html. Zet elke demosectie op papier en
// op glas naast elkaar, wisselt het oppervlak en "Beweging beperken", en tekent het palet uit
// ds-tokens.css. Geen spelstaat, geen opslag, geen netwerk.
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function bouwPanelen() {
  for (const sec of $$('section[data-demo]')) {
    const kop = sec.querySelector(':scope > h2');
    const uitleg = sec.querySelector(':scope > p.g-uitleg');
    const inhoud = [...sec.childNodes].filter((n) => n !== kop && n !== uitleg);
    const paar = document.createElement('div');
    paar.className = 'g-paar';
    const maak = (klasse, nodes) => {
      const p = document.createElement('div');
      p.className = `g-paneel ${klasse}`;
      p.dataset.oppervlak = klasse.replace('ds-', '');
      for (const n of nodes) p.appendChild(n);
      return p;
    };
    const papier = maak('ds-papier', inhoud);
    const glas = maak('ds-glas', inhoud.map((n) => n.cloneNode(true)));
    paar.append(papier, glas);
    sec.appendChild(paar);
  }
}

function zetOppervlak(waarde) {
  for (const p of $$('.g-paneel')) p.hidden = waarde !== 'beide' && p.dataset.oppervlak !== waarde;
  for (const b of $$('[data-oppervlak]', document.querySelector('.g-wissel'))) b.setAttribute('aria-selected', String(b.dataset.oppervlak === waarde));
}

async function leesTokens() {
  const namen = [];
  const uitSheet = (sheet) => {
    try { for (const r of sheet.cssRules) if (r.selectorText === ':root') for (const n of r.style) if (n.startsWith('--ds-c-')) namen.push(n); } catch { /* file:// sluit de CSSOM af */ }
  };
  for (const s of document.styleSheets) uitSheet(s);
  if (!namen.length) {
    try {
      const tekst = await (await fetch('js/ds-tokens.css')).text();
      for (const m of tekst.matchAll(/(--ds-c-[\w-]+)\s*:/g)) if (!namen.includes(m[1])) namen.push(m[1]);
    } catch { /* geen palet te tonen */ }
  }
  return namen;
}

async function tekenPalet() {
  const doel = document.getElementById('g-stalen');
  const namen = await leesTokens();
  if (!namen.length) { doel.textContent = 'Palet niet te lezen (open de galerij via de dev-server).'; return; }
  for (const n of namen) {
    const staal = document.createElement('div');
    staal.className = 'g-staal';
    const kleur = document.createElement('i');
    kleur.style.background = `var(${n})`;
    const naam = document.createElement('span');
    naam.textContent = `${n} ${getComputedStyle(document.documentElement).getPropertyValue(n).trim()}`;
    staal.append(kleur, naam);
    doel.appendChild(staal);
  }
}

bouwPanelen();
zetOppervlak('beide');
for (const b of $$('.g-wissel [data-oppervlak]')) b.addEventListener('click', () => zetOppervlak(b.dataset.oppervlak));
const beweging = document.getElementById('g-beweging');
beweging.addEventListener('click', () => {
  const aan = document.documentElement.classList.toggle('reduce-motion');
  beweging.setAttribute('aria-pressed', String(aan));
});
tekenPalet();
window.__dsGalerij = { zetOppervlak };
