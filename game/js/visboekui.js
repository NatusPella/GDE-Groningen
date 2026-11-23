// Visboek (#412): het onderdeel Visboek van het pauzemenu. Links "Alle vis" en de zeven watertypen met hoeveel soorten je er ving;
// rechts de soorten van het gekozen water met zeldzaamheid, de zwaarste vangst en een aanwijzing voor wat nog ontbreekt, bovenin je
// niveau in het vak Hengelen. De gegevens komen uit visboeklive.js en visdata.js; dit bestand is alleen DOM. Niet door een mens in
// beeld bekeken.
import * as L from './loopbaan.js';
import { getProfiel } from './loopbaanlive.js';
import { getBoek } from './visboeklive.js';
import { getTuig } from './hengeltuiglive.js';
import { voortgang } from './visboek.js';
import { WATERTYPEN, SOORTEN, ZELDZAAM, soort, soortenVan, typenVan, watertype } from './visdata.js';
import { hengelNaam, aasNaam, lijnsterkte } from './hengeltuig.js';
import { fillBars } from './motion.js';
import { sfeerVan, sfeerStijl, sfeerBandHtml, SFEER_BAND_CSS } from './carrieresfeer.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const kg = (v) => v.toFixed(v < 1 ? 2 : 1).replace('.', ',') + ' kg';
const VIS = '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3zM16.5 11h.01"/>';
// #1270: elk watertype een eigen pictogram (een brug, een plas, golven, een bocht, een sloot met riet, een getij); "Alle vis" houdt de vis.
const WATER_ICOON = {
  gracht: '<path d="M3 15a9 8 0 0 1 18 0M3 15h18M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2-1.5 4.5-1.5S19 19 21 19"/>',
  plas: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 3v0M3 12h0"/>',
  meer: '<path d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0"/>',
  kanaal: '<path d="M3 6h18M3 18h18M3 12h3M9 12h3M15 12h3"/>',
  rivier: '<path d="M16 3c-6 2-6 5-3 7s3 5-3 8M18 8c-3 1-3 3-1 5s1 4-3 7"/>',
  sloot: '<path d="M3 19h18M6 19V8M6 12l-2-2M6 14l2-2M12 19V5M12 10l-2-2M12 13l2-2M18 19v-9M18 14l-2-2"/>',
  wad: '<path d="M2 11c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0M2 17c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0M7 5.5h.01M12 4h.01M17 5.5h.01"/>',
};
const icoon = (cls = 'pa-ico', water) => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${WATER_ICOON[water] || VIS}</svg></span>`;

// Het Visboek hoort bij het vak Hengelen en draagt daarom dezelfde sfeerband als Loopbanen (#492, #609).
const SFEER = 'hengelen';
const band = () => sfeerBandHtml(SFEER, { icoon: icoon('lb-sfeer-ico'), klein: 'Vak Hengelen' });

const CSS = `${SFEER_BAND_CSS}
.vb-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.vb-pane .lb-kop p { margin: 0; }
.vb-pane p.lb-titel { margin: 0 0 2px; font-size: 24px; }
.vb-li .lb-niv { margin-left: auto; padding-left: 12px; white-space: nowrap; font-size: 15px; opacity: 0.8; }
.vb-li .m-bar { flex: none; width: 76px; margin-left: 12px; }
.vb-soorten { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px 18px; }
.vb-soorten li { display: grid; grid-template-columns: 1fr auto; column-gap: 10px; padding: 4px 0; border-bottom: 1px solid color-mix(in srgb, var(--ds-c-creme) 8%, transparent); }
.vb-soorten li.nog { opacity: 0.5; }
.vb-soorten .nm { font-size: 17px; }
.vb-soorten .wat { grid-column: 1 / -1; font-size: max(14px, var(--menu-min, 14px)); opacity: 0.72; }
.vb-soorten .z { font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; align-self: center; }
.vb-soorten .z1 { opacity: 0.55; } .vb-soorten .z3 { color: var(--ds-c-ink-geel); } .vb-soorten .z4 { color: var(--ds-c-amber-glas-tx); }
.vb-soorten .rec { grid-column: 1 / -1; font-size: max(14px, var(--menu-min, 14px)); color: var(--g, #3fc97a); }
/* #1270 (hertest 24-11): de kop "Per water" als groepskop van het menu, en het detail als drie getallen en twee korte regels */
.vb-groep { margin: var(--ds-s-4) 0 var(--ds-s-1); }
.vb-feiten { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--ds-s-2); margin: var(--ds-s-2) 0; }
.vb-feit { display: flex; flex-direction: column; gap: 2px; padding: var(--ds-s-2) var(--ds-s-3); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); }
.vb-feit b { font-family: var(--ds-font-zeef-kop); font-size: 26px; line-height: 1; }
.vb-feit span { font-size: max(14px, var(--menu-min, 14px)); color: var(--mut); }
.vb-pane p.vb-regel { margin: 2px 0; font-size: max(15px, var(--menu-min, 15px)); }
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
    `${icoon('pa-ico', id)}<span class="nm"><span class="one">${esc(naam)}</span><span class="mut one">${p.gevangen} van ${p.totaal} soorten</span></span>` +
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
  // #1270 (hertest 24-11): korte regels in plaats van een blok lopende tekst
  const kopLoopbaan = `<p class="mut vb-regel">Hengelen: <b>${esc(niv.titel)}</b> · niveau ${niv.niveau} van ${L.MAX_NIVEAU}${factor > 1 ? ` · ${L.percentage(factor)}% meer loon` : ''}` +
    `${niv.volgend ? ` · nog ${nl(niv.nodig)} punten` : ''}</p>`;
  if (id === 'alles') {
    const lijst = SOORTEN.map((s) => soortRij(boek, s)).join('');
    const t = getTuig();
    const tuigRegel = `<p class="mut vb-regel">Tuig: <b>${esc(hengelNaam(t))}</b> · ${esc(aasNaam(t))} · lijn ${Math.round(lijnsterkte(t) * 100)}% <span class="mut">(beter tuig: Avondwinkel, botenverhuur)</span></p>`;
    const feit = (n, wat) => `<span class="vb-feit"><b>${n}</b><span>${wat}</span></span>`;
    const feiten = `<div class="vb-feiten">${feit(sam.plekken, 'wateren')}${feit(nl(boek.totaal.n), 'vissen')}${feit(kg(boek.totaal.kg), 'in totaal')}</div>`;
    return band() + `<div class="pm-pane-top"><span class="m-eb">Visboek</span><h2 class="m-h2 td-h2">${icoon('pa-ico big')}Alle vis</h2></div>` +
      `<div class="lb-kop"><p class="lb-titel"><b>${sam.gevangen} van ${sam.totaal}</b> <span class="mut">soorten gevangen</span></p>` +
      `${feiten}${tuigRegel}${kopLoopbaan}</div>` +
      `<ul class="vb-soorten">${lijst}</ul>`;
  }
  const t = watertype(id);
  if (!t) return '<p class="mut">Kies een water om te zien welke vis erin zit.</p>';
  const p = typeRegel(boek, id);
  const soorten = soortenVan(id).map((x) => soort(x.id)).sort((a, b) => a.zeldzaam - b.zeldzaam || a.naam.localeCompare(b.naam, 'nl'));
  return band() + `<div class="pm-pane-top"><span class="m-eb">Water</span><h2 class="m-h2 td-h2">${icoon('pa-ico big', t.id)}${esc(t.naam)}</h2></div>` +
    `<div class="lb-kop"><p class="lb-titel"><b>${p.gevangen} van ${p.totaal}</b> <span class="mut">soorten ${p.gevangen === p.totaal ? '· compleet' : 'gevangen'}</span></p><p class="mut">${esc(t.wat)}</p>${kopLoopbaan}</div>` +
    `<ul class="vb-soorten">${soorten.map((s) => soortRij(boek, s)).join('')}</ul>`;
}

export function renderVisboekPanel(el) {
  if (!el) return;
  zetCss();
  const boek = getBoek();
  const sam = voortgang(boek);
  const lijst = rij('alles', 'Alle vis', { gevangen: sam.gevangen, totaal: sam.totaal, deel: sam.gevangen / sam.totaal }) +
    `<div class="m-gh vb-groep"><span>Per water</span><span>${WATERTYPEN.length} wateren</span></div>` + WATERTYPEN.map((t) => rij(t.id, t.naam, typeRegel(boek, t.id))).join('');
  el.innerHTML = `<div class="m-tabs"><span class="m-grow"></span><span class="pa-total"><span class="lb-sfeer-chip" style="${sfeerStijl(SFEER)}" aria-hidden="true"></span><span class="mut">${esc(sfeerVan(SFEER).naam)}</span><span class="m-num">${sam.gevangen}</span><span class="mut">van ${sam.totaal} soorten</span></span></div>` +
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
