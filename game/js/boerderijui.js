// Eigen boerderij (#415): het onderdeel Boerderij van het pauzemenu. Links vier onderdelen (Perceel, Gewas, Machines, Kasboek), rechts wat
// er te zien en te doen is: de stand van het land en de volgende taak, het gewas dat je bij het zaaien kiest, de machines die je huurt
// of koopt, en wat de boerderij tot nu toe opbracht. De gegevens komen uit boerderijlive.js (en boerderij.js); dit bestand is alleen DOM.
// Het werk zelf doe je op het land: de bijbaan "Eigen boerderij" bij Hoogkerk. Niet door een mens in beeld bekeken.
import * as B from './boerderij.js';
import { getBoerderij, kiesGewas, koopMachine } from './boerderijlive.js';
import { fillBars } from './motion.js';
import { setUserWaypoint } from './routing.js';
import { wgsToWorld } from './rdnew.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const nl = (n) => Math.round(n).toLocaleString('nl-NL');

const ICOON = {
  perceel: '<path d="M3 17l5-9h10l3 9zM8 8l-2 9M13 8l-1 9M18 8l1 9"/>',
  gewas: '<path d="M12 21v-8M12 13c0-3-2-5-5-5 0 3 2 5 5 5zM12 13c0-3 2-5 5-5 0 3-2 5-5 5zM12 8c0-2 1-4 3-5-1 2-1 4-3 5z"/>',
  machines: '<circle cx="7" cy="16" r="3.4"/><circle cx="18" cy="17.5" r="2"/><path d="M7 12.6V7h6l2 5h3v3.5M10 7V4h2"/>',
  kas: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M16 15h2"/>',
};
const ONDERDELEN = [['perceel', 'Perceel'], ['gewas', 'Gewas'], ['machines', 'Machines'], ['kas', 'Kasboek']];
const icoon = (n, cls = 'pa-ico') => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICOON[n]}</svg></span>`;

const CSS = `
.bd-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.m-pane.bd-pane { gap: 12px; }
.bd-pane p { margin: 4px 0; }
.bd-voort { display: flex; align-items: center; gap: 14px; margin: 4px 0; }
.bd-voort .m-bar { flex: 1; max-width: 360px; height: 6px; }
.bd-rij { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(240,237,228,0.08); max-width: 720px; }
.bd-rij .bd-naam { flex: 1; }
.bd-rij .mut { font-size: 16px; }
.bd-keus.aan { box-shadow: inset 0 0 0 2px var(--g, #3fc97a); }
.bd-kas { display: grid; grid-template-columns: auto auto; gap: 6px 36px; justify-content: start; margin: 4px 0; }
.bd-kas span:nth-child(odd) { opacity: 0.7; }
.bd-melding { min-height: 1.4em; color: var(--g, #3fc97a); }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

let gekozen = 'perceel';
let gast = false; // samen spelen: de klussen op het land (de trekker) doe je in je eigen spel (#429)
let melding = '';
const bars = new Map();

const FASE_TEKST = {
  braak: 'Braak land: tijd om te ploegen.', geploegd: 'Geploegd: tijd om te zaaien.', groeit: 'Het gewas groeit.', rijp: 'Rijp: tijd om te oogsten.',
};

function perceel(b) {
  const f = B.fase(b), s = B.samenvatting(b);
  const g = B.GEWASSEN[b.veld.gewas];
  const volgende = s.volgende ? B.TAKEN[s.volgende].naam : null;
  const k = s.volgende ? B.kosten(b, s.volgende) : null;
  const wacht = B.wacht(b);
  const waar = b.perceel ? 'Je akker ligt bij Hoogkerk, in de buurt van Suikerhal Hoogkerk.' : 'Je akker wordt gekozen als je voor het eerst gaat werken.';
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('perceel', 'pa-ico big')}Perceel</h2></div>` +
    `<div><p class="lb-titel"><b>${esc(FASE_TEKST[f] || '')}</b></p>` +
    (g ? `<p class="mut">${esc(g.naam)}${f === 'groeit' ? ` · nog ${nl(s.urenTotRijp)} speluren` : ''}</p>` : '') +
    (f === 'groeit' || f === 'rijp' ? `<div class="bd-voort"><span class="m-bar${s.groei > 0 ? ' on' : ''}"><i data-bar="bd-groei" data-w="${(s.groei * 100).toFixed(1)}"></i></span><span class="m-num">${Math.round(s.groei * 100)}%</span></div>` : '') + '</div>' +
    `<div><p>${volgende ? `Volgende klus: <b>${esc(volgende)}</b>${k && k.totaal ? ` (kost ${euro(k.totaal)})` : ''}.` : wacht ? 'Nu is er niets te doen: het gewas groeit.' : 'Nu is er niets te doen.'}</p>` +
    (s.schuurKg ? `<p>In de schuur: ${nl(s.schuurKg)} kg ${esc(B.GEWASSEN[s.schuurGewas].naam.toLowerCase())}, klaar om af te leveren.</p>` : '') +
    `<p class="mut">${waar}</p></div>` +
    (gast ? `<p class="mut">Je speelt mee in het spel van een ander. De klussen op het land (de trekker) doe je in je eigen spel; je gewas groeit ondertussen gewoon door, en je kunt gewassen kiezen en machines kopen.</p><p><button type="button" class="m-bt" data-bd-weg="1">Zet de akker op je kaart</button></p>`
      : `<p class="mut">Werk doe je op het land: start de bijbaan Eigen boerderij bij Hoogkerk (zie de kaart). Het gewas groeit in speltijd, ook als je iets anders doet.</p>`);
}

function gewas(b) {
  const rijen = B.GEWAS_IDS.map((id) => {
    const g = B.GEWASSEN[id];
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(g.naam)}</b><span class="mut"> · zaaigoed ${euro(g.zaaigoed)} · rijp na ${g.groeiUren} speluren · ${nl(g.kgBasis)} kg per perceel · ${esc(g.afnemer)}</span></span>` +
      `<button type="button" class="m-bt bd-keus${b.keuze === id ? ' aan' : ''}" data-bd-gewas="${id}" aria-pressed="${b.keuze === id}">${b.keuze === id ? 'Gekozen' : 'Kies'}</button></div>`;
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('gewas', 'pa-ico big')}Gewas</h2></div>` +
    `<p class="mut">Het gewas dat je bij het volgende zaaien in de grond doet. Wat er al groeit blijft zoals het is.</p>${rijen}`;
}

function machines(b, geld) {
  const rijen = B.MACHINE_IDS.map((id) => {
    const m = B.MACHINES[id];
    const eigen = b.machines[id] === 'eigen';
    const taken = m.taken.map((t) => B.TAKEN[t].naam.toLowerCase()).join(' en ');
    return `<div class="bd-rij"><span class="bd-naam"><b>${esc(m.naam)}</b><span class="mut"> · ${esc(taken)} · ${eigen ? 'van jou: geen huur en een ruimere rij' : `gehuurd, ${euro(m.huur)} per keer`}</span></span>` +
      (eigen ? '<span class="g">Van jou</span>' : `<button type="button" class="m-bt" data-bd-koop="${id}"${geld >= m.koop ? '' : ' disabled'}>Koop ${euro(m.koop)}</button>`) + '</div>';
  }).join('');
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('machines', 'pa-ico big')}Machines</h2></div>` +
    `<p class="mut">De trekker is van de boerderij. Een machine huur je automatisch per klus; koop je hem, dan werk je zonder huur en met meer ruimte in de rij.</p>${rijen}<p class="bd-melding" aria-live="polite">${esc(melding)}</p>`;
}

function kas(b) {
  const s = B.samenvatting(b);
  return `<div class="pm-pane-top"><span class="m-eb">Boerderij De Zonnehoek</span><h2 class="m-h2 td-h2">${icoon('kas', 'pa-ico big')}Kasboek</h2></div>` +
    `<div class="bd-kas"><span>Omzet</span><span>${euro(s.omzet)}</span><span>Uitgaven</span><span>${euro(s.uitgaven)}</span><span>Winst</span><span class="${s.winst >= 0 ? 'g' : ''}">${euro(s.winst)}</span>` +
    `<span>Oogsten</span><span>${nl(s.oogsten)}</span><span>Leveringen</span><span>${nl(s.leveringen)}</span></div>` +
    '<p class="mut">Uitgaven zijn huur, zaaigoed, mest en machines. De opbrengst komt als je de oogst aflevert, met de loonfactor van je loopbaan in Landbouw.</p>';
}

function detail(b, geld) {
  return gekozen === 'gewas' ? gewas(b) : gekozen === 'machines' ? machines(b, geld) : gekozen === 'kas' ? kas(b) : perceel(b);
}

export function renderBoerderijPanel(el, world) {
  if (!el) return;
  zetCss();
  const b = getBoerderij();
  gast = !!(world && world.coopRole === 'client');
  const geld = (world && world.money) || 0;
  const s = B.samenvatting(b);
  const rijen = ONDERDELEN.map(([id, naam]) => {
    const sub = id === 'perceel' ? (s.volgende ? B.TAKEN[s.volgende].naam : B.fase(b) === 'groeit' ? 'Groeit' : '-') : id === 'gewas' ? B.GEWASSEN[b.keuze].naam : id === 'machines' ? `${s.eigen.length} van ${B.MACHINE_IDS.length} van jou` : euro(s.winst);
    return `<button type="button" class="m-li lb-li${gekozen === id ? ' sel' : ''}" data-bd="${id}"${gekozen === id ? ' aria-current="true"' : ''}>${icoon(id)}<span class="nm"><span class="one">${esc(naam)}</span><span class="mut one">${esc(sub)}</span></span></button>`;
  }).join('');
  el.innerHTML = `<div class="m-tabs"><span class="m-grow"></span><span class="pa-total"><span class="mut">Je geld</span><span class="m-num">${euro(geld)}</span></span></div>` +
    `<div class="m-main"><div class="m-list pa-list lb-list">${rijen}</div><aside class="m-pane pa-pane bd-pane" aria-live="polite">${detail(b, geld)}</aside></div>`;
  fillBars(el, bars);
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const opnieuw = () => renderBoerderijPanel(el, world);
    el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-bd]');
      const g = e.target.closest('[data-bd-gewas]');
      const k = e.target.closest('[data-bd-koop]');
      const w = e.target.closest('[data-bd-weg]');
      if (w) { const q = getBoerderij().perceel || (([x, y]) => ({ x, y }))(wgsToWorld(53.2336, 6.4977)); setUserWaypoint(q.x, q.y, 'Eigen akker'); if (world && world.addMessage) world.addMessage('De akker staat op je kaart.', 3); }
      else if (o) { gekozen = o.dataset.bd; melding = ''; opnieuw(); const nu = el.querySelector(`[data-bd="${gekozen}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (g) { kiesGewas(g.dataset.bdGewas); opnieuw(); const nu = el.querySelector(`[data-bd-gewas="${g.dataset.bdGewas}"]`); if (nu) nu.focus({ preventScroll: true }); }
      else if (k) {
        const r = koopMachine(world, k.dataset.bdKoop);
        melding = r.ok ? `${B.MACHINES[k.dataset.bdKoop].naam} gekocht voor ${euro(r.prijs)}.` : r.reden;
        opnieuw();
      }
    });
    el.addEventListener('focusin', (e) => {
      const o = e.target.closest && e.target.closest('[data-bd]');
      if (!o || o.dataset.bd === gekozen) return;
      gekozen = o.dataset.bd; melding = '';
      for (const bt of el.querySelectorAll('[data-bd]')) { const aan = bt.dataset.bd === gekozen; bt.classList.toggle('sel', aan); bt.toggleAttribute('aria-current', aan); }
      el.querySelector('.bd-pane').innerHTML = detail(getBoerderij(), (world && world.money) || 0);
      queueMicrotask(() => fillBars(el, bars));
    });
  }
}
