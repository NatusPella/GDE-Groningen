// Bedrijven (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, onderdeel d): links je panden (naam, soort, per dag), rechts het detail met de beste volgende stap
// (renoveren als het onderhoud zakt), omzet en kosten als bon met schattingen, onderhoud als balk en waarde en verkoop. Wat te koop is staat op Te koop.
// Klanten en tevredenheid worden niet getoond: het spel houdt ze niet bij (geen verzonnen getallen). Puur (scripts/bezitbedrijven_test.mjs).
// De knoppen met een bevestiging (renoveren, verkopen) komen kant en klaar van bezitui.js (renoHtml, verkoopHtml). Samen spelen: eigen bezit (#429).

import { icoon } from './icons.js';
import { euro } from './geldtekst.js';
import * as BZ from './business.js';
import { eigenPandPerDag } from './bezitrendement.js';
import { sellValue } from './bezitprijs.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IC = (n, cls = 'bz-ic') => icoon(n, { cls });
const plus = (n) => (n >= 0 ? '+' : '−') + euro(Math.abs(n));
const SOORT_IC = { woning: 'thuis', bijgebouw: 'gebouw', beheer: 'kerk' };
const tussen = (t, ic) => `<h4 class="ds-z-tussenkop"><span>${esc(t)}</span>${ic ? IC(ic) : ''}</h4>`;
const bon = (regels, totaal) => `<div class="ds-z-bon bz-bon">${regels.map(([k, v, c]) => `<div class="ds-z-bon__regel"><span>${esc(k)}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag${c ? ` bz-${c}` : ''}">${esc(v)}</span></div>`).join('')}${totaal ? `<div class="ds-z-bon__totaal"><span>${esc(totaal[0])}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag">${esc(totaal[1])}</span></div>` : ''}</div>`;

export const pandNaam = (m) => `${String(m.kind.type).charAt(0).toUpperCase()}${String(m.kind.type).slice(1)} bij ${m.place}`;

// Omzet en kosten van een pand per speldag als schatting; null bij geen waarde. rentDay: de huur van rentView.
export function pandCijfers(biz, owned = 0, rentDay = null) {
  if (!biz || !(biz.p > 0)) return null;
  const mf = BZ.maintenanceFactor(biz.q), tax = BZ.taxPerDay(biz.p, owned), opex = Math.round(biz.p * BZ.OPEX_RATE);
  let omzet = 0;
  if (biz.cls === 'rent') omzet = Number.isFinite(rentDay) && rentDay > 0 ? rentDay : Math.round(biz.p * (BZ.RENT_RATES[biz.type] || BZ.RENT_RATES.woning) * mf);
  else if (biz.cls === 'shop') omzet = Math.round(BZ.baseRevenue(biz.type, biz.m2) * mf);
  else if (biz.cls === 'industry') omzet = Math.round(biz.p * BZ.INDUSTRY_RATE * mf);
  else return null;
  const kosten = biz.cls === 'rent' ? tax : tax + opex;
  return { omzet, tax, opex: biz.cls === 'rent' ? 0 : opex, netto: omzet - kosten };
}

export function bedrijvenHtml({ mine = [], sel = null, day = 0, owned = 0, rentView = () => null, renoHtml = () => '', verkoopHtml = () => '', melding = '' }) {
  if (!mine.length) return '';
  const metCijfers = mine.map((m) => { const rv = rentView(m.biz, day); return { m, c: pandCijfers(m.biz, owned, rv && rv.rentDay), rv }; });
  const huidig = metCijfers.find((x) => x.m.osm === sel) || metCijfers[0];
  const totaal = metCijfers.reduce((s, x) => s + (x.c ? x.c.netto : 0), 0);
  const rijen = metCijfers.map((x) => `<div class="bz-rij${x === huidig ? ' bz-rij--sel' : ''}" ${x === huidig ? 'aria-current="true"' : ''}><button type="button" class="bz-rij__knop" data-bk="kies" data-osm="${x.m.osm}"><span class="bz-ikoon">${IC(SOORT_IC[x.m.biz.type] || (x.m.biz.cls === 'shop' ? 'winkel' : 'gebouw'), 'bz-ic bz-ic--l')}</span>` +
    `<span class="bz-rij__tekst"><b>${esc(pandNaam(x.m))}</b><small>${esc(x.m.biz.cls === 'rent' ? (x.rv ? (x.rv.empty ? 'Leeg: huurder gezocht' : 'Verhuurd') : 'Woning') : 'Winkel of bedrijf')} · onderhoud ${Math.round(x.m.biz.q)}%</small></span>` +
    `<span class="bz-rij__waarde">${x.c ? `<b class="bz-getal ${x.c.netto >= 0 ? 'bz-plus' : 'bz-min'}">${plus(x.c.netto)}</b><small>per dag (±)</small>` : ''}</span></button></div>`).join('');
  const links = `<div class="bz-links"><div class="bz-lijst"><div class="bz-lijst__kop"><h4 class="ds-z-tussenkop"><span>Panden · ${mine.length}</span></h4><span class="bz-hulp">${plus(totaal)} per dag (±)</span></div><div class="bz-lijst__rijen ds-scroll" data-onder="1">${rijen}</div></div>` +
    `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-goto-sub="boerderij:tekoop">Panden te koop bekijken</button></div>`;
  const { m, c, rv } = huidig, b = m.biz, kosten = renoHtml(m);
  const heeftReno = BZ.renovationCost(b) > 0;
  const hero = `<section class="bz-hero">${tussen(heeftReno ? 'Beste volgende stap' : 'Dit pand is in orde')}<div class="bz-actie">${heeftReno ? `<span class="bz-hulp">Het onderhoud is ${Math.round(b.q)}%: een laag onderhoud drukt wat het pand oplevert.</span>${kosten}` : '<span class="bz-hulp">Niets te doen: het onderhoud is op niveau.</span>'}</div></section>`;
  const cijfers = c ? bon([[b.cls === 'rent' ? 'Huur (±)' : 'Omzet na inkoop (±)', euro(c.omzet)], ['Belasting', `−${euro(c.tax)}`, 'min'], ...(c.opex ? [['Lopende kosten', `−${euro(c.opex)}`, 'min']] : [])], ['Netto per dag (±)', plus(c.netto)]) : '<p class="bz-hulp">Geen schatting beschikbaar.</p>';
  const detail = `<div class="bz-detail"><div class="bz-kopregel"><div><h3 class="bz-detail__titel">${esc(pandNaam(m))}</h3><span class="bz-hulp">${Math.round(b.m2)} m2${rv && rv.text ? ` · ${esc(rv.text)}` : ''}</span></div></div>${hero}` +
    `<div class="bz-raster2"><section class="bz-blok">${tussen('Omzet en kosten', 'bon')}${cijfers}</section><section class="bz-blok">${tussen('Onderhoud', 'gereedschap')}<div class="ds-z-balk${b.q < 50 ? ' ds-z-balk--laag' : ''}" style="--ds-z-w:${Math.round(b.q)}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${Math.round(b.q)}%</span></div></section></div>` +
    `<section class="bz-blok">${tussen('Waarde en verkoop', 'geld')}<dl class="bz-feiten"><dt>Waarde</dt><dd>${euro(b.p)}</dd><dt>Verkoopt voor</dt><dd>${euro(sellValue(b.p))}</dd></dl>${verkoopHtml(m)}</section>${melding ? `<p class="bd-melding" aria-live="polite">${esc(melding)}</p>` : ''}</div>`;
  return `<div class="bz-md bz-md--bedrijven">${links}${detail}</div>`;
}
