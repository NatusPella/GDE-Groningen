// Het Overzicht van Land en bedrijf (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, onderdeel a en b): een portfolio van kaarten (land, bedrijven, snackwagen) met een
// kaartminiatuur, statuslabels en drie feiten, een "Volgende stap" en, zonder bezit, drie stappen in plaats van nullen. Puur (scripts/bezitoverzicht_test.mjs).
// Er is geen verloop over zeven dagen: dat wordt nergens bijgehouden, dus ook niet getekend (geen verzonnen getallen). Samen spelen: eigen bezit (#429).

import { icoon } from './icons.js';
import { euro } from './geldtekst.js';
import { kaartSvg, legendaHtml } from './bezitkaart.js';
import { landWaarde } from './bezitwaarden.js';
import { perceelRendement, perDagTekst } from './bezitrendement.js';
import { MIN_PRICE } from './bezitprijs.js';
import { URGENTIE_NAAM } from './bezitklussen.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IC = (n, cls = 'bz-ic') => icoon(n, { cls });
const ha = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const plus = (n) => (n >= 0 ? '+' : '−') + euro(Math.abs(n));

const stand = (soort, tekst, ic) => `<span class="bz-stand bz-stand--${soort}">${IC(ic)}${esc(tekst)}</span>`;
const feiten = (rijen) => `<dl class="bz-feiten">${rijen.map(([k, v, c]) => `<dt>${esc(k)}</dt><dd${c ? ` class="bz-${c}"` : ''}>${esc(v)}</dd>`).join('')}</dl>`;

// Een portfoliokaart: de hele kaart is een knop die het tabblad opent (data-goto-sub).
export function portfolioKaart({ tab, ic, titel, status = '', mini, rijen }) {
  return `<article class="ds-z-kaart ds-z-kaart--recht bz-pkaart" data-pkaart="${esc(tab)}"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${IC(ic)}${esc(titel)}</h3>` +
    `<button type="button" class="bz-open" data-goto-sub="boerderij:${esc(tab)}" aria-label="Open ${esc(titel)}">Open ${IC('pijl_rechts')}</button></header>` +
    `<div class="bz-pkaart__body"><div class="bz-mini">${mini}</div><div class="bz-kol">${status ? `<div class="bz-statussen">${status}</div>` : ''}${feiten(rijen)}</div></div></article>`;
}

const iconPlaat = (ic) => `<div class="bz-iconplaat">${IC(ic, 'bz-ic bz-ic--xl')}</div>`;

// view: uit bezitframe.frameView; vlakken: kaartvlakken van de eigen percelen (bezitkaart.kaartSvg).
export function portfolioHtml(view, { vlakken = [], wagen = [] } = {}) {
  const kaarten = [];
  const own = view.rows;
  if (own.length) {
    const n = (c) => view.punten.find((p) => p.code === c);
    const status = (n('rijp') ? stand('rijp', `${n('rijp').count} oogstklaar`, 'veld_rijp') : '') + (n('zieke-kudde') ? stand('probleem', 'Zieke kudde', 'waarschuwing') : '') + (n('braak') ? stand('braak', `${n('braak').count} braak`, 'veld_braak') : '');
    const dag = own.reduce((s, r) => s + (r.incomeDay || 0), 0);
    const totHa = own.reduce((s, r) => s + r.ha, 0);
    kaarten.push(portfolioKaart({ tab: 'boerderij', ic: 'boerderij', titel: 'Boerderij en land', status, mini: kaartSvg(vlakken, { w: 250, h: 150 }), rijen: [['Velden', `${own.length} · ${ha(totHa)} ha`], ['Per dag', plus(dag), dag >= 0 ? 'plus' : 'min'], ['Waarde', euro(landWaarde(view.bezit))]] }));
  }
  if (view.panden.length) {
    const dag = view.panden.reduce((s, b) => s + b.perDay, 0), waarde = view.panden.reduce((s, b) => s + b.p, 0);
    kaarten.push(portfolioKaart({ tab: 'bedrijven', ic: 'winkel', titel: 'Bedrijven', mini: iconPlaat('winkel'), rijen: [['Panden', String(view.panden.length)], ['Per dag', plus(dag), dag >= 0 ? 'plus' : 'min'], ['Waarde', euro(waarde)]] }));
  }
  if (view.wagens.length) {
    const dag = view.wagens.reduce((s, b) => s + b.perDay, 0), waarde = view.wagens.reduce((s, b) => s + b.p, 0);
    kaarten.push(portfolioKaart({ tab: 'snack', ic: 'burger', titel: 'Snackwagen', mini: iconPlaat('burger'), rijen: [['Wagens', String(view.wagens.length)], ['Per dag', plus(dag), dag >= 0 ? 'plus' : 'min'], ['Waarde', euro(waarde)]] }));
  }
  const k0 = view.alle[0];
  const volgende = `<section class="ds-z-kaart ds-z-kaart--bord ds-z-kaart--recht bz-volgende"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${IC('doel')}Volgende stap</h3></header>` +
    (k0 ? `<p class="bz-volgende__tekst">${esc(k0.kop)}. ${esc(k0.sub)}.</p><button type="button" class="ds-z-knop" data-goto-sub="boerderij:${esc(k0.tab)}">Ga ernaartoe</button>` : '<p class="bz-volgende__tekst">Niets dringends: alles loopt.</p>') + '</section>';
  return `<div class="bz-portfolio"><div class="bz-raster">${kaarten.join('')}</div><aside class="bz-zij">${volgende}</aside></div>${view.rows.length ? legendaHtml() : ''}`;
}

// Nog niets in bezit: drie stappen met wat het kost en wat het oplevert (alleen met een echt getal), de eerste is de gele knop.
export function leegHtml({ money = 0, bedrijvenOpen = false, snackOpen = false } = {}) {
  const r = perceelRendement({ price: MIN_PRICE });
  const stap = (nr, ic, titel, tekst, prijs, extra, knop) => `<article class="ds-z-kaart ds-z-kaart--recht bz-stap" data-stap="${nr}"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${IC(ic)}${nr}. ${esc(titel)}</h3></header>` +
    `<div class="bz-iconplaat">${IC(ic, 'bz-ic bz-ic--xl')}</div><p>${esc(tekst)}</p>${prijs ? feiten([['Vanaf', prijs], ...(extra ? [['Levert', extra]] : [])]) : ''}${knop}</article>`;
  const k1 = `<button type="button" class="ds-z-knop" data-goto-sub="boerderij:tekoop">Bekijk wat te koop is</button>`;
  const k2 = bedrijvenOpen ? `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-goto-sub="boerderij:tekoop">Bekijk panden</button>` : `<button type="button" class="ds-z-knop" disabled>${IC('slot')} Komt later</button>`;
  const k3 = snackOpen ? `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-goto-sub="boerderij:snack">Naar de snackwagen</button>` : `<button type="button" class="ds-z-knop" disabled>${IC('slot')} Komt later</button>`;
  return `<div class="bz-leeg-hoofd"><h2 class="bz-leeg-kop">Nog niets in bezit</h2><p>Land en panden leveren elke dag geld, ook als jij er niet bent. Begin klein${money > 0 ? `: je hebt ${euro(money)}` : ''}.</p></div>` +
    `<div class="bz-stappen">${stap(1, 'gewas', 'Koop een perceel', 'Een stuk weiland of akker in de buurt. Je kiest zelf of je het bewerkt, laat bewerken of verpacht.', euro(MIN_PRICE), perDagTekst(r, euro), k1)}` +
    `${stap(2, 'winkel', 'Koop een pand', 'Een winkel of woning brengt dagelijks omzet of huur op. Dat kost meer, dus spaar eerst.', null, null, k2)}` +
    `${stap(3, 'burger', 'De snackwagen', 'Tessa en Tammo hebben een wagen op het oog, maar eerst moet het verhaal verder.', null, null, k3)}</div>`;
}
