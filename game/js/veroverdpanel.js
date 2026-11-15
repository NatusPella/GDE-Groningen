// Veroverd (#414, #435): de gebieden die je hebt veroverd. Hoort bij het verhaal, dus een tabblad onder Verhaal (eerst een
// weergave van Loopbanen). De gegevens en de tekst komen uit gebiedenui.js; dit bestand tekent het tabblad en bindt de klikken.
// #492: onderaan staat de Beleidswinkel: een klein, lokaal en blijvend voordeel per speler (beleidswinkel.js).
// #906: de kop is een hero met de stand, daaronder de eerstvolgende taken als kaarten en pas dan de lijst.
// Niet door een mens in beeld bekeken.
import { gebiedenHtml, kiesGebied, reisNaar, volgendeTaken, GEBIEDEN_CSS } from './gebiedenui.js';
import { bekijkIntocht } from './intochten.js';
import { fillBars } from './motion.js';
import { beleidOffers, koopBeleid } from './beleidswinkel.js';

const bars = new Map();
let cssAan = false;
let sluitMenu = null;

const CSS = `${GEBIEDEN_CSS}
.vo-hero { margin: 0 24px 16px; }
.vo-hero .pm-hero-t { font-size: 40px; }
.vo-kop { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; }
.vo-kop .m-num { font-size: 30px; }
.vo-uitleg { margin: 0 24px 14px; }
.vo-uitleg summary { cursor: pointer; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 20px; letter-spacing: 0.04em; color: var(--mut); }
.vo-uitleg summary:hover, .vo-uitleg[open] summary { color: var(--g); }
.vo-regel { margin: 6px 0 0; padding: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.4; color: var(--c-mut, rgba(240, 237, 228, 0.72)); max-width: 760px; }
.vo-regel b { font-weight: normal; color: var(--ink, #f0ede4); }
.vo-stats { margin: 0 24px 14px; }
.vo-volgende { margin: 0 24px 16px; padding: 10px 16px; border-radius: 12px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 0 0 0 1px var(--line); }
.vo-volgende > b, .vo-volgende summary { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 24px; letter-spacing: 0.04em; cursor: pointer; }
.vo-volgende summary { list-style: none; display: flex; align-items: center; gap: 10px; }
.vo-volgende summary::-webkit-details-marker { display: none; }
.vo-volgende summary::before { content: '›'; display: inline-block; color: var(--g); transition: transform 0.15s; }
.vo-volgende[open] summary::before { transform: rotate(90deg); }
.vo-volgende ol { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; counter-reset: vo-taak; }
.vo-volgende li { display: flex; align-items: baseline; gap: 10px; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.35; }
.vo-volgende li::before { counter-increment: vo-taak; content: counter(vo-taak); flex: none; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(63, 201, 122, 0.18); color: var(--g); font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 16px; }
.vo-volgende .mut { color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-beleid { margin: 12px 0 4px; padding: 12px 14px 8px; border-radius: 12px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 0 0 0 1px var(--line); }
.vo-beleid h3 { margin: 0 0 2px; font: normal 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.vo-beleid p { margin: 0 0 8px; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); line-height: 1.4; color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-beleid .vo-rij { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 10px; margin-top: 6px; padding: 8px 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); box-shadow: inset 0 -1px 0 var(--line); }
.vo-beleid .vo-rij b { flex: 1 1 140px; min-width: 0; font-weight: normal; color: var(--ink, #f0ede4); }
.vo-beleid .vo-rij span { flex: 1 1 160px; min-width: 0; color: var(--c-mut, rgba(240, 237, 228, 0.72)); }
.vo-beleid .vo-rij .mut { flex: none; color: var(--g); }
.vo-beleid .vo-rij button { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.04em; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--c-line, rgba(240, 237, 228, 0.3)); background: rgba(240, 237, 228, 0.08); color: inherit; cursor: pointer; }
.vo-beleid .vo-rij button:hover, .vo-beleid .vo-rij button:focus-visible { background: rgba(63, 201, 122, 0.18); border-color: var(--g); outline: none; }
.vo-beleid .vo-rij button:disabled { opacity: 0.55; cursor: default; }`;

function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-veroverd';
  el.textContent = CSS;
  document.head.appendChild(el);
}

// De rijen van de Beleidswinkel: één maatregel per rij, met prijs of "aangenomen".
function beleidHtml() {
  const offers = beleidOffers();
  const rijen = offers.map((b) => `<div class="vo-rij"><b>${esc(b.naam)}</b><span>${esc(b.tekst)}</span>` +
    (b.gekocht ? '<span class="mut">Aangenomen</span>' : `<button type="button" data-beleid="${esc(b.id)}">€${b.prijs} kopen</button>`) + '</div>').join('');
  return `<section class="vo-beleid" aria-label="Beleidswinkel"><h3>Beleidswinkel</h3><p>Koop één keer een gemeentelijke maatregel die blijft: van lagere boetes tot een drukkere markt. Het is van jou, in je eigen opslag.</p>${rijen}</section>`;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderVeroverdPanel(el, sluit = null, world = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  zetCss();
  const teken = () => {
    const g = gebiedenHtml();
    const s = g.stats || { klaar: 0, totaal: 0, pct: 0, kaartGedaan: 0, kaartTotaal: 0, kaartPct: 0 };
    const taken = volgendeTaken(3);
    // #906: de kop zegt waar je staat in gewone taal; de exacte stand staat er als woorden naast.
    const titel = s.totaal && s.klaar >= s.totaal ? 'Heel Grunn is van jou' : s.klaar > 0 ? 'Je bent op weg' : 'Nog niets veroverd';
    const hero = `<section class="pm-hero vo-hero" aria-label="Veroverd"><div class="pm-hero-h"><span class="m-eb">Veroverd</span><span class="pm-badge" data-tone="ok">${s.pct}% van Grunn</span></div>` +
      `<h2 class="pm-hero-t">${esc(titel)}</h2>` +
      `<p class="pm-hero-lead">Doe alles wat er in een gebied te doen is, dan is het van jou: een titel, geld en een vlag op de kaart. Je hoeft niemand kwaad te doen.</p>` +
      `<div class="pm-hero-meta vo-kop">${g.totaal}</div></section>`;
    const stats = `<div class="pm-stats vo-stats">` +
      `<span class="pm-stat" data-tone="accent"><b>${s.klaar}</b><span>van ${s.totaal} gebieden veroverd</span><span class="m-bar${s.klaar ? ' on' : ''}"><i data-bar="vo-gebieden" data-w="${s.pct}"></i></span></span>` +
      `<span class="pm-stat"><b>${s.kaartGedaan}</b><span>van ${s.kaartTotaal} buurten op de kaart verkend (${s.kaartPct}%)</span><span class="m-bar${s.kaartGedaan ? ' on' : ''}"><i data-bar="vo-kaart" data-w="${s.kaartPct}"></i></span></span>` +
      volgendeStats(taken) + `</div>`;
    // #676: één regel in het scherm zegt wat er meetelt en wat bewust niet (de catalogusregel).
    const regel = '<details class="vo-uitleg"><summary>Wat telt mee</summary><p class="vo-regel"><b>Wat telt mee:</b> missies, 39 van de 47 bijbanen, 50 minigame-plekken, vondsten en geheimen. ' +
      'Eierballen, losse geheimen, postgame, lucht en dorpsuitjes tellen bewust niet mee; die staan in hun eigen lijst.</p></details>';
    // #676: de eerstvolgende drie taken, en de wederzijdse verwijzing met "Te doen".
    // #676: de eerstvolgende drie taken, en de wederzijdse verwijzing met "Te doen". Op een
    // 720p-scherm staan ze ingeklapt: de lijst met gebieden is het hoofdwerk en moet in beeld.
    const volgende = taken.length
      ? '<details class="vo-volgende"><summary>Eerstvolgende taken</summary><ol>' + taken.map((t) => '<li>' + esc(t.naam) + ' <span class="mut">· ' + esc(t.gebied) + '</span></li>').join('') + '</ol><p class="vo-regel">Je volgende taak staat ook in <b>Te doen</b>; daar zie je hem met de afstand vanaf hier.</p></details>'
      : '<details class="vo-volgende"><summary>Eerstvolgende taken</summary><p class="vo-regel">Alles wat meetelt is gedaan. De titels staan hierboven.</p></details>';
    const titelRegel = taken.length && Number.isFinite(taken[0].totaal)
      ? '<p class="vo-regel">Nog ' + Math.max(0, taken[0].totaal - taken[0].klaar) + ' taken tot de titel van ' + esc(taken[0].gebied) + '.</p>' : '';
    el.innerHTML = hero + stats + volgende + titelRegel + regel +
      `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}${beleidHtml()}</aside></div>`;
    fillBars(el, bars);
  };
  teken();
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  let gebied = null;
  const kies = (id) => {
    if (!id || id === gebied) return;
    gebied = id;
    for (const b of el.querySelectorAll('[data-gebied]')) { const aan = b.dataset.gebied === id; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
    el.querySelector('.lb-pane').innerHTML = kiesGebied(id) + beleidHtml();
    queueMicrotask(() => fillBars(el, bars));
  };
  el.addEventListener('click', (e) => {
    // #492: een maatregel kopen in de Beleidswinkel; daarna tekent het paneel opnieuw.
    const b = e.target.closest('[data-beleid]');
    if (b) {
      const melding = koopBeleid(world, b.dataset.beleid);
      if (world && world.addMessage) world.addMessage(melding, 3);
      teken();
      return;
    }
    const r = e.target.closest('[data-reis]');
    if (r) { reisNaar(r.dataset.reis, r, sluitMenu); return; }
    // #708: de intocht terugkijken vanuit Veroverd
    const i = e.target.closest('[data-intocht]');
    if (i) { bekijkIntocht(i.dataset.intocht); return; }
    const g2 = e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
  el.addEventListener('focusin', (e) => {
    const g2 = e.target.closest && e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
}

// De derde stat: hoeveel taken er nog tot de titel van het eerste gebied. Zonder taken blijft het
// bij een eerlijke regel in plaats van een leeg getal.
function volgendeStats(lijst) {
  if (!lijst.length) return `<span class="pm-stat"><b>0</b><span>taken tot de volgende titel</span></span>`;
  const t = lijst[0];
  const nog = Math.max(0, (Number.isFinite(t.totaal) ? t.totaal : 0) - t.klaar);
  return `<span class="pm-stat"><b>${nog}</b><span>taken tot de titel van ${esc(t.gebied)}</span></span>`;
}
