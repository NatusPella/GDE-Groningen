// Loopbaan (#381): het onderdeel Loopbaan van het pauzemenu. Links alle vakken in drie groepen (vervoer, werk, sport en spel),
// elk met een icoon, het niveau, de functietitel en een voortgangsbalk; rechts wat je in het gekozen vak bereikt hebt, het
// volgende doel, wat het vak betaalt en welke banen erbij horen. De gegevens komen uit loopbaanlive.js (en loopbaan.js);
// dit bestand is alleen DOM. Niet door een mens in beeld bekeken.
import * as L from './loopbaan.js';
import { getProfiel } from './loopbaanlive.js';
import { SIDE_JOBS } from './sidejobs.js';
import { fillBars } from './motion.js';
import { gebiedenHtml, kiesGebied, reisNaar, GEBIEDEN_CSS } from './gebiedenui.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

// De iconen van de vakken, in dezelfde lijnstijl als de rest van het menu.
const ICONEN = {
  trein: '<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14M8 16.5V20h8v-3.5M9 20l-2 1.5M15 20l2 1.5"/><circle cx="9" cy="13.8" r=".7"/><circle cx="15" cy="13.8" r=".7"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 11h16M7 17v3M17 17v3"/><circle cx="8" cy="14" r=".7"/><circle cx="16" cy="14" r=".7"/>',
  taxi: '<path d="M4 15l1.6-5.2A2 2 0 0 1 7.5 8.5h9a2 2 0 0 1 1.9 1.3L20 15M3 15h18v4H3zM9 8.5V6.5h6v2"/><circle cx="7.5" cy="17" r=".7"/><circle cx="16.5" cy="17" r=".7"/>',
  pakket: '<path d="M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9"/>',
  boot: '<path d="M3 15h18l-2.5 4h-13zM12 4v11M12 5l6 8h-6M10 8l-4 5h4"/>',
  heli: '<path d="M3 5h18M12 5v4M6 14a6 5 0 0 1 12 0v1H6zM18 14h3M8 19h8M10 15v4M14 15v4"/>',
  schild: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  balie: '<rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M9 15h6"/>',
  masker: '<path d="M5 5h14v6a7 7 0 0 1-14 0zM9 10h.01M15 10h.01M9 14.5c1 1 5 1 6 0"/>',
  pan: '<path d="M3 11h14v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM17 12h4M7 7c0-1 1-1 1-2M11 7c0-1 1-1 1-2"/>',
  rad: '<circle cx="12" cy="10" r="6.5"/><path d="M12 3.5v13M5.5 10h13M7.4 5.4l9.2 9.2M16.6 5.4l-9.2 9.2M8 21l4-4.5 4 4.5"/>',
  hamer: '<path d="M14 3l6 6-3.2 3.2-6-6zM12 8.5L4 16.5V20h3.5l8-8"/>',
  padel: '<ellipse cx="10" cy="9" rx="6" ry="6.5"/><path d="M14.5 13.8L20 19.5M8 7h.01M11 9h.01M9 12h.01"/>',
  vlag: '<path d="M8 21V4l9 4-9 4M5 21h10"/>',
  race: '<path d="M5 21V4M5 5h14v9H5zM5 9.5h14M9.5 5v9M14.5 5v9"/>',
  boom: '<path d="M12 21v-6M12 3l5 7h-3l4 6H6l4-6H7z"/>',
  vis: '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3zM16.5 11h.01"/>',
  vrachtwagen: '<path d="M2 7h12v9H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  trekker: '<circle cx="7" cy="16" r="3.4"/><circle cx="18" cy="17.5" r="2"/><path d="M7 12.6V7h6l2 5h3v3.5M10 7V4h2"/>',
};
const loopbaanIcoon = (naam, cls = 'pa-ico') => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONEN[naam] || ICONEN.hamer}</svg></span>`;

const CSS = `
.lb-groep { margin: 14px 0 4px; font: 14px "Arial Narrow", Arial, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; }
.lb-groep:first-child { margin-top: 0; }
.lb-li .nm { min-width: 0; }
.lb-li .lb-niv { margin-left: auto; padding-left: 12px; white-space: nowrap; font-size: 15px; opacity: 0.8; }
.lb-li .m-bar { flex: none; width: 76px; margin-left: 12px; }
.lb-li.nul .pa-ico { opacity: 0.4; }
.m-pane.lb-pane { gap: 12px; }
.lb-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.lb-pane .lb-blok p { margin: 4px 0; }
.lb-pane p.lb-titel { margin: 0 0 2px; font-size: 24px; }
.lb-pane .lb-kop p { margin: 0; }
.lb-voort { display: flex; align-items: center; gap: 14px; margin: 0 0 4px; }
.lb-voort .m-bar { flex: 1; max-width: 360px; height: 6px; }
.lb-pane .m-num { font-size: 26px; }
.lb-trap { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 28px; max-width: 640px; }
.lb-trap li { display: flex; gap: 10px; align-items: baseline; opacity: 0.45; }
.lb-trap li.bereikt { opacity: 0.85; }
.lb-trap li.nu { opacity: 1; color: var(--g, #3fc97a); }
.lb-trap .nr { min-width: 1.6em; text-align: right; opacity: 0.8; }
.lb-trap .bonus { margin-left: auto; opacity: 0.8; }
.lb-banen { list-style: none; margin: 4px 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 3px 16px; }
.lb-banen li { display: flex; gap: 6px; align-items: center; opacity: 0.55; }
.lb-banen li.klaar { opacity: 1; }
.lb-banen svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; flex: none; }
.lb-banen li:not(.klaar) svg { visibility: hidden; }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS + GEBIEDEN_CSS;
  document.head.appendChild(el);
}

let gekozen = 'trein';
let weergave = 'vakken'; // 'vakken' of 'gebieden' (gebiedenui.js)
const bars = new Map();

function rij(profiel, info) {
  const d = L.volgendDoel(profiel, info.id);
  const nul = profiel.vakken[info.id].xp <= 0;
  return `<button type="button" class="m-li lb-li${nul ? ' nul' : ''}${gekozen === info.id ? ' sel' : ''}" data-vak="${info.id}"${gekozen === info.id ? ' aria-current="true"' : ''}>` +
    `${loopbaanIcoon(info.icoon)}<span class="nm"><span class="one">${esc(info.naam)}</span><span class="mut one">${esc(nul ? 'Nog niet begonnen' : d.titel)}</span></span>` +
    `<span class="lb-niv">niveau ${d.niveau}</span><span class="m-bar${d.deel > 0 ? ' on' : ''}"><i data-bar="lb-${info.id}" data-w="${(d.deel * 100).toFixed(1)}"></i></span></button>`;
}

function detailHtml(profiel, id) {
  const info = L.vakInfo(id);
  if (!info) return '<p class="mut">Kies een vak om te zien hoe het ervoor staat.</p>';
  const v = profiel.vakken[id];
  const d = L.volgendDoel(profiel, id);
  const groep = (L.GROEPEN.find((g) => g.id === info.groep) || {}).naam || '';
  const factor = L.loonFactor(profiel, id);
  const doel = d.volgend
    ? `Nog ${nl(d.nodig)} punten tot ${esc(d.volgend)}, met ${d.extra}% meer loon.`
    : 'Hoogste niveau bereikt.';
  const voort = `<div class="lb-voort"><span class="m-bar${d.deel > 0 ? ' on' : ''}"><i data-bar="lbd-${id}" data-w="${(d.deel * 100).toFixed(1)}"></i></span><span class="m-num">${d.volgend ? `${nl(v.xp - L.XP_DREMPELS[d.niveau - 1])} / ${nl(L.XP_DREMPELS[d.niveau] - L.XP_DREMPELS[d.niveau - 1])}` : 'klaar'}</span></div>`;
  const telt = [L.tellerTekst(profiel, id)];
  if (v.uniek.length) telt.push(`${v.uniek.length} verschillende ${esc(info.uniek)}`);
  const trap = '<ol class="lb-trap">' + info.titels.map((t, i) => {
    const niv = i + 1;
    const cls = niv < d.niveau ? 'bereikt' : niv === d.niveau ? 'nu' : '';
    const plus = L.percentage(L.factorVoorNiveau(niv));
    return `<li class="${cls}"><span class="nr">${niv}</span><span>${esc(t)}</span><span class="bonus">${plus ? `+${plus}%` : 'basis'}</span></li>`;
  }).join('') + '</ol>';
  const banen = L.banenVan(id);
  let banenHtml = '';
  if (banen.length) {
    const namen = new Map(SIDE_JOBS.map((j) => [j.id, j.name]));
    banenHtml = '<h3 class="m-eb">Banen</h3><ul class="lb-banen">' + banen.map((b) => `<li class="${v.uniek.includes(b) ? 'klaar' : ''}">${CHECK}<span>${esc(namen.get(b) || b)}</span></li>`).join('') + '</ul>';
  }
  return `<div class="pm-pane-top"><span class="m-eb">${esc(groep)}</span><h2 class="m-h2 td-h2">${loopbaanIcoon(info.icoon, 'pa-ico big')}${esc(info.naam)}</h2></div>` +
    `<div class="lb-kop"><p class="lb-titel"><b>${esc(d.titel)}</b> <span class="mut">· niveau ${d.niveau} van ${L.MAX_NIVEAU}</span></p><p class="mut">${esc(info.wat)}</p></div>` +
    `<div class="lb-blok">${voort}<p class="mut">${doel}</p>` +
    `<p>${v.xp > 0 ? esc(telt.join(' · ')) : 'Nog niet begonnen.'}</p>` +
    `<p class="${factor > 1 ? 'g' : 'mut'}">${factor > 1 ? `Dit vak betaalt nu ${L.percentage(factor)}% meer. ` : ''}${esc(L.loonTekst(id))}</p></div>` +
    trap + banenHtml;
}

const tabs = () => '<nav class="m-tablist" role="tablist" aria-label="Weergave">' + [['vakken', 'Vakken'], ['gebieden', 'Veroverd']].map(([id, t]) =>
  `<button type="button" role="tab" class="m-tab" data-lbview="${id}" aria-selected="${weergave === id}">${t}</button>`).join('') + '</nav>';

let sluitMenu = null; // pausemenu.js: sluit het menu na een snelreis
export function renderLoopbaanPanel(el, sluit = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  zetCss();
  if (weergave === 'gebieden') {
    const g = gebiedenHtml();
    el.innerHTML = `<div class="m-tabs">${tabs()}<span class="m-grow"></span><span class="pa-total">${g.totaal}</span></div>` +
      `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}</aside></div>`;
    fillBars(el, bars);
  } else {
    const profiel = getProfiel();
    if (!L.vakInfo(gekozen)) gekozen = L.VAK_IDS[0];
    const sam = L.samenvatting(profiel);
    const lijst = L.GROEPEN.map((g) => `<div class="lb-groep">${esc(g.naam)}</div>` + L.VAKKEN.filter((v) => v.groep === g.id).map((v) => rij(profiel, v)).join('')).join('');
    el.innerHTML = `<div class="m-tabs">${tabs()}<span class="m-grow"></span><span class="pa-total"><span class="m-num">${sam.som - L.VAKKEN.length}</span><span class="mut">van ${sam.max - L.VAKKEN.length} niveaus omhoog${sam.hoogste ? ` · hoogste titel: ${esc(sam.hoogste.titel)}` : ''}</span></span></div>` +
      `<div class="m-main"><div class="m-list pa-list lb-list">${lijst}</div><aside class="m-pane pa-pane lb-pane" aria-live="polite">${detailHtml(profiel, gekozen)}</aside></div>`;
    fillBars(el, bars);
  }
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const kies = (id) => {
      if (!id || id === gekozen) return;
      gekozen = id;
      for (const b of el.querySelectorAll('[data-vak]')) { const aan = b.dataset.vak === gekozen; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
      el.querySelector('.lb-pane').innerHTML = detailHtml(getProfiel(), gekozen);
      queueMicrotask(() => fillBars(el, bars));
    };
    let gebied = null;
    const kiesG = (id) => {
      if (!id || id === gebied) return;
      gebied = id;
      for (const b of el.querySelectorAll('[data-gebied]')) { const aan = b.dataset.gebied === id; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
      el.querySelector('.lb-pane').innerHTML = kiesGebied(id);
      queueMicrotask(() => fillBars(el, bars));
    };
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lbview]');
      if (t) { if (t.dataset.lbview !== weergave) { weergave = t.dataset.lbview; gebied = null; renderLoopbaanPanel(el); } return; }
      const r = e.target.closest('[data-reis]');
      if (r) { reisNaar(r.dataset.reis, r, sluitMenu); return; }
      const g = e.target.closest('[data-gebied]');
      if (g) { kiesG(g.dataset.gebied); return; }
      const b = e.target.closest('[data-vak]');
      if (b) kies(b.dataset.vak);
    });
    el.addEventListener('focusin', (e) => {
      const g = e.target.closest && e.target.closest('[data-gebied]');
      if (g) { kiesG(g.dataset.gebied); return; }
      const b = e.target.closest && e.target.closest('[data-vak]');
      if (b) kies(b.dataset.vak);
    });
  }
}
