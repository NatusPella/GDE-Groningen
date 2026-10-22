// Visboek (#412): het onderdeel Visboek van het pauzemenu. Links "Alle vis" en de zeven watertypen met hoeveel soorten je er ving;
// rechts de soorten van het gekozen water met zeldzaamheid, de zwaarste vangst en een aanwijzing voor wat nog ontbreekt, bovenin je
// niveau in het vak Hengelen. De gegevens komen uit visboeklive.js en visdata.js; dit bestand is alleen DOM. Niet door een mens in
// beeld bekeken.
import * as L from './loopbaan.js';
import { getProfiel } from './loopbaanlive.js';
import { getBoek } from './visboeklive.js';
import { voortgang } from './visboek.js';
import { WATERTYPEN, SOORTEN, ZELDZAAM, soort, soortenVan, typenVan, watertype } from './visdata.js';
import { fillBars } from './motion.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const kg = (v) => v.toFixed(v < 1 ? 2 : 1).replace('.', ',') + ' kg';
const VIS = '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3zM16.5 11h.01"/>';
const icoon = (cls = 'pa-ico') => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${VIS}</svg></span>`;

const CSS = `
.vb-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.vb-pane .lb-kop p { margin: 0; }
.vb-pane p.lb-titel { margin: 0 0 2px; font-size: 24px; }
.vb-li .lb-niv { margin-left: auto; padding-left: 12px; white-space: nowrap; font-size: 15px; opacity: 0.8; }
.vb-li .m-bar { flex: none; width: 76px; margin-left: 12px; }
.vb-soorten { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px 18px; }
.vb-soorten li { display: grid; grid-template-columns: 1fr auto; column-gap: 10px; padding: 4px 0; border-bottom: 1px solid rgba(240,237,228,0.08); }
.vb-soorten li.nog { opacity: 0.5; }
.vb-soorten .nm { font-size: 17px; }
.vb-soorten .wat { grid-column: 1 / -1; font-size: 14px; opacity: 0.72; }
.vb-soorten .z { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; align-self: center; }
.vb-soorten .z1 { opacity: 0.55; } .vb-soorten .z3 { color: #f2c14a; } .vb-soorten .z4 { color: #ff9a3c; }
.vb-soorten .rec { grid-column: 1 / -1; font-size: 14px; color: var(--g, #3fc97a); }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

let gekozen = 'alles';
const bars = new Map();

const typeRegel = (boek, t) => {
  const v = voortgang(boek).perType[t];
  return { gevangen: v.gevangen, totaal: v.totaal, deel: v.totaal ? v.gevangen / v.totaal : 0 };
};

function rij(id, naam, p) {
  return `<button type="button" class="m-li lb-li vb-li${p.gevangen ? '' : ' nul'}${gekozen === id ? ' sel' : ''}" data-vt="${id}"${gekozen === id ? ' aria-current="true"' : ''}>` +
    `${icoon()}<span class="nm"><span class="one">${esc(naam)}</span><span class="mut one">${p.gevangen} van ${p.totaal} soorten</span></span>` +
    `<span class="lb-niv">${p.gevangen === p.totaal && p.totaal ? 'compleet' : ''}</span><span class="m-bar${p.deel > 0 ? ' on' : ''}"><i data-bar="vb-${id}" data-w="${(p.deel * 100).toFixed(1)}"></i></span></button>`;
}

// Een aanwijzing voor een soort die je nog niet ving: waar, en wanneer hij bijt.
function hint(s) {
  const waar = typenVan(s.id).map((t) => watertype(t).naam.toLowerCase()).join(', ');
  const tijd = s.tijd === 'nacht' ? " Bijt vooral 's nachts." : s.tijd === 'schemer' ? ' Bijt vooral in de schemer.' : '';
  return `Zit in: ${waar}.${tijd}`;
}

function soortRij(boek, s) {
  const x = boek.soorten[s.id];
  const z = ZELDZAAM[s.zeldzaam - 1];
  const kop = `<span class="nm">${esc(x ? s.naam : '???')}</span><span class="z z${s.zeldzaam}">${esc(z.naam)}</span>`;
  if (!x) return `<li class="nog">${kop}<span class="wat">${esc(hint(s))}</span></li>`;
  return `<li>${kop}<span class="wat">${esc(s.wat)}</span><span class="rec">Zwaarste ${kg(x.kg)} · ${nl(x.n)}x gevangen</span></li>`;
}

function detailHtml(boek, id) {
  const sam = voortgang(boek);
  const prof = getProfiel();
  const niv = L.volgendDoel(prof, 'hengelen');
  const factor = L.loonFactor(prof, 'hengelen');
  const kopLoopbaan = `<p class="mut">Vak Hengelen: <b>${esc(niv.titel)}</b>, niveau ${niv.niveau} van ${L.MAX_NIVEAU}${factor > 1 ? `, ${L.percentage(factor)}% meer loon` : ''}. ` +
    `${niv.volgend ? `Nog ${nl(niv.nodig)} punten tot ${esc(niv.volgend)}.` : 'Hoogste niveau bereikt.'}</p>`;
  if (id === 'alles') {
    const lijst = SOORTEN.map((s) => soortRij(boek, s)).join('');
    return `<div class="pm-pane-top"><span class="m-eb">Visboek</span><h2 class="m-h2 td-h2">${icoon('pa-ico big')}Alle vis</h2></div>` +
      `<div class="lb-kop"><p class="lb-titel"><b>${sam.gevangen} van ${sam.totaal}</b> <span class="mut">soorten gevangen</span></p>` +
      `<p class="mut">${sam.plekken} verschillende wateren · ${nl(boek.totaal.n)} vissen · ${kg(boek.totaal.kg)} in totaal. Hoe meer soorten en wateren, hoe meer elke vis opbrengt.</p>${kopLoopbaan}</div>` +
      `<ul class="vb-soorten">${lijst}</ul>`;
  }
  const t = watertype(id);
  if (!t) return '<p class="mut">Kies een water om te zien welke vis erin zit.</p>';
  const p = typeRegel(boek, id);
  const soorten = soortenVan(id).map((x) => soort(x.id)).sort((a, b) => a.zeldzaam - b.zeldzaam || a.naam.localeCompare(b.naam, 'nl'));
  return `<div class="pm-pane-top"><span class="m-eb">Water</span><h2 class="m-h2 td-h2">${icoon('pa-ico big')}${esc(t.naam)}</h2></div>` +
    `<div class="lb-kop"><p class="lb-titel"><b>${p.gevangen} van ${p.totaal}</b> <span class="mut">soorten ${p.gevangen === p.totaal ? '· compleet' : 'gevangen'}</span></p><p class="mut">${esc(t.wat)}</p>${kopLoopbaan}</div>` +
    `<ul class="vb-soorten">${soorten.map((s) => soortRij(boek, s)).join('')}</ul>`;
}

export function renderVisboekPanel(el) {
  if (!el) return;
  zetCss();
  const boek = getBoek();
  const sam = voortgang(boek);
  const lijst = rij('alles', 'Alle vis', { gevangen: sam.gevangen, totaal: sam.totaal, deel: sam.gevangen / sam.totaal }) +
    '<div class="lb-groep">Per water</div>' + WATERTYPEN.map((t) => rij(t.id, t.naam, typeRegel(boek, t.id))).join('');
  el.innerHTML = `<div class="m-tabs"><span class="m-grow"></span><span class="pa-total"><span class="m-num">${sam.gevangen}</span><span class="mut">van ${sam.totaal} soorten</span></span></div>` +
    `<div class="m-main"><div class="m-list pa-list lb-list">${lijst}</div><aside class="m-pane pa-pane lb-pane vb-pane" aria-live="polite">${detailHtml(boek, gekozen)}</aside></div>`;
  fillBars(el, bars);
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const kies = (id) => {
      if (!id || id === gekozen) return;
      gekozen = id;
      for (const b of el.querySelectorAll('[data-vt]')) { const aan = b.dataset.vt === gekozen; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
      el.querySelector('.vb-pane').innerHTML = detailHtml(getBoek(), gekozen);
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-vt]'); if (b) kies(b.dataset.vt); });
    el.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('[data-vt]'); if (b) kies(b.dataset.vt); });
  }
}
