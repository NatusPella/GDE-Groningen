// Ontwikkelpad voor het designsysteem v2 en v3 (#980, #992): game/ds-galerij.html. Zet elke demosectie op papier en
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
      p.dataset.v2 = '';
      for (const n of nodes) p.appendChild(n);
      return p;
    };
    const papier = maak('ds-papier', inhoud);
    const glas = maak('ds-glas', inhoud.map((n) => n.cloneNode(true)));
    paar.append(papier, glas);
    sec.appendChild(paar);
  }
}

// v3 (#992): elke sectie met data-demo-v3 staat één keer in de HTML en wordt in gewone druk en in
// Rustig drukwerk getoond; .ds-rustig scopet de tokens van html.rustig-drukwerk op één paneel.
function bouwZeefPanelen() {
  for (const sec of $$('section[data-demo-v3]')) {
    const kop = sec.querySelector(':scope > h2');
    const uitleg = sec.querySelector(':scope > p.g-uitleg');
    const inhoud = [...sec.childNodes].filter((n) => n !== kop && n !== uitleg);
    const paar = document.createElement('div');
    paar.className = 'g-paar';
    const maak = (klasse, naam, nodes) => {
      const p = document.createElement('div');
      p.className = `g-paneel ds-zeef ${klasse}`.trim();
      p.dataset.oppervlak = klasse ? 'rustig' : 'zeef';
      const label = document.createElement('div');
      label.className = 'g-paneel-naam';
      label.textContent = naam;
      p.appendChild(label);
      for (const n of nodes) p.appendChild(n);
      return p;
    };
    paar.append(maak('', 'Zeefdruk', inhoud), maak('ds-rustig', 'Rustig drukwerk', inhoud.map((n) => n.cloneNode(true))));
    sec.appendChild(paar);
  }
}

function zetOppervlak(waarde) {
  for (const p of $$('.g-paneel[data-v2]')) p.hidden = waarde !== 'beide' && p.dataset.oppervlak !== waarde;
  for (const b of $$('[data-oppervlak]', document.querySelector('.g-wissel'))) b.setAttribute('aria-selected', String(b.dataset.oppervlak === waarde));
}

function leesTokens() {
  const namen = [];
  for (const sheet of document.styleSheets) {
    try { for (const r of sheet.cssRules) if (r.selectorText === ':root') for (const n of r.style) if (n.startsWith('--ds-c-')) namen.push(n); } catch { /* file:// sluit de CSSOM af */ }
  }
  return namen;
}

function tekenPalet() {
  const doel = document.getElementById('g-stalen');
  const namen = leesTokens();
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
bouwZeefPanelen();
zetOppervlak('beide');
for (const b of $$('.g-wissel [data-oppervlak]')) b.addEventListener('click', () => zetOppervlak(b.dataset.oppervlak));
const beweging = document.getElementById('g-beweging');
beweging.addEventListener('click', () => {
  const aan = document.documentElement.classList.toggle('reduce-motion');
  beweging.setAttribute('aria-pressed', String(aan));
});
const rustig = document.getElementById('g-rustig');
rustig.addEventListener('click', () => {
  const aan = document.documentElement.classList.toggle('rustig-drukwerk');
  rustig.setAttribute('aria-pressed', String(aan));
});
tekenPalet();
window.__dsGalerij = { zetOppervlak };
