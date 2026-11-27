// Te koop (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, onderdeel e): één lijst van percelen, panden en woningen met filters als stappers (soort, sorteren), een kaart,
// een vergelijking (prijs, wat je overhoudt, wat het per dag oplevert met ±, terugverdiend) en een bevestiging met vasthouden om te kopen.
// Puur (scripts/bezitkoop_test.mjs). Rendement alleen als er een echt getal voor is; anders laat het scherm de regel weg.
// Samen spelen: wat een medespeler claimde staat niet in de lijst (forSale is al onwaar); gekocht land is van de speler zelf (#429).

import { keyTextHtml } from './keycap.js';
import { icoon } from './icons.js';
import { euro } from './geldtekst.js';
import { kaartSvg } from './bezitkaart.js';
import { perceelRendement, pandRendement, perDagTekst, terugTekst } from './bezitrendement.js';
import { missReason } from './holdingcards.js';
import { escapeHtml as esc } from './htmlescape.js';

const IC = (n, cls = 'bz-ic') => icoon(n, { cls });
const ha = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
export const SOORTEN = ['alles', 'land', 'panden', 'woningen'];
export const SOORT_NAAM = { alles: 'alles', land: 'land', panden: 'panden', woningen: 'woningen' };
export const SORTEN = ['terug', 'prijs', 'afstand'];
export const SORT_NAAM = { terug: 'snelst terug', prijs: 'goedkoopst', afstand: 'dichtbij' };
export const HOUD_MS = 600;       // zo lang houd je vast om te kopen
export const HOUD_VANAF = 1000;   // onder dit bedrag koop je direct (met een melding); erboven vasthouden (besluit coordinator 24-11)

// De code tussen haakjes (K6899) is een kadastrale sleutel: de speler leest hem niet.
export const schoneNaam = (n) => String(n || '').replace(/\s*\([A-Za-z]?\d+\)\s*$/, '');

// offers: parcelOffer-achtig ({ id, name, kindName, ha, soilWord, price, forSale, parcel, shape, dist }); panden en woningen: buildingOffer-achtig ({ osm, kind, row, town, price, forSale, dist }).
export function koopItems({ offers = [], panden = [], woningen = [], money = 0, owned = 0 } = {}) {
  const items = [];
  for (const o of offers) {
    if (!o || !o.forSale) continue;
    const r = perceelRendement(o);
    items.push({ key: `p:${o.id}`, soort: 'land', ic: o.kindName === 'boomgaard' ? 'boom' : 'gewas', naam: schoneNaam(o.name), sub: `${o.kindName} · ${ha(o.ha)} ha · bodem ${o.soilWord} · ${o.dist} m`, dist: o.dist, price: o.price, rend: r, x: o.parcel && o.parcel.x, y: o.parcel && o.parcel.y, shape: o.shape || null, act: 'koop-perceel', id: o.id });
  }
  const pand = (o, soort) => {
    if (!o || !o.forSale) return;
    const r = pandRendement({ price: o.price, row: o.row, kind: o.kind }, owned);
    items.push({ key: `b:${o.osm}`, soort, ic: soort === 'woningen' ? 'thuis' : 'gebouw', naam: `${soort === 'woningen' ? 'Woning' : o.kind.type.charAt(0).toUpperCase() + o.kind.type.slice(1)} bij ${o.town.name}`, sub: `${Math.round(o.row.m2)} m2 · ${o.dist} m`, dist: o.dist, price: o.price, rend: r, x: o.row.x, y: o.row.y, shape: null, act: 'koop-pand', id: o.osm });
  };
  panden.forEach((o) => pand(o, 'panden'));
  woningen.forEach((o) => pand(o, 'woningen'));
  return items.map((i) => ({ ...i, kan: money >= i.price, mist: Math.max(0, i.price - money) }));
}

export function sorteer(items, sort = 'terug') {
  const terug = (i) => (i.rend && i.rend.terug) || Infinity;
  const f = { terug: (a, b) => terug(a) - terug(b) || a.price - b.price, prijs: (a, b) => a.price - b.price, afstand: (a, b) => a.dist - b.dist }[sort] || ((a, b) => a.price - b.price);
  return items.slice().sort((a, b) => (Number.isNaN(f(a, b)) ? 0 : f(a, b)));
}
export const filter = (items, soort) => (soort === 'alles' ? items : items.filter((i) => i.soort === soort));

const stapper = (label, waarde, soort) => `<span class="ds-z-stapper"><button type="button" data-kp="${soort}" data-dir="-1" aria-label="${esc(label)}: vorige">${IC('pijl_links')}</button><output>${esc(label)} <b>${esc(waarde)}</b></output><button type="button" data-kp="${soort}" data-dir="1" aria-label="${esc(label)}: volgende">${IC('pijl_rechts')}</button></span>`;
const tussen = (t) => `<h4 class="ds-z-tussenkop"><span>${esc(t)}</span></h4>`;
const bon = (regels) => `<div class="ds-z-bon bz-bon">${regels.map(([k, v, c]) => `<div class="ds-z-bon__regel"><span>${esc(k)}</span><span class="ds-z-bon__stippen"></span><span class="ds-z-bon__bedrag${c ? ` bz-${c}` : ''}">${esc(v)}</span></div>`).join('')}</div>`;

function rijHtml(i, sel) {
  const rest = i.rend ? terugTekst(i.rend) : '';
  return `<div class="bz-rij${sel ? ' bz-rij--sel' : ''}${i.kan ? '' : ' bz-rij--uit'}" data-koop="${esc(i.key)}" ${sel ? 'aria-current="true"' : ''}><button type="button" class="bz-rij__knop" data-kp="kies" data-key="${esc(i.key)}">` +
    `<span class="bz-ikoon">${IC(i.ic, 'bz-ic bz-ic--l')}</span><span class="bz-rij__tekst"><b>${esc(i.naam)}</b><small>${esc(i.sub)}</small></span>` +
    `<span class="bz-rij__waarde"><b class="bz-getal">${euro(i.price)}</b><small>${i.kan ? esc(rest) : `je mist ${euro(i.mist)}`}</small></span></button></div>`;
}

// De bevestiging: dezelfde bon, het dagbedrag nu en erna (alleen met een rendement) en vasthouden of een directe knop.
export function bevestigHtml(i, { money = 0, dagNu = null } = {}) {
  const houd = i.price >= HOUD_VANAF;
  const dag = i.rend && dagNu !== null ? bon([['Je dagbedrag nu', `${dagNu >= 0 ? '+' : '−'}${euro(Math.abs(dagNu))}`], ['Je dagbedrag erna (±)', `${dagNu + i.rend.perDag >= 0 ? '+' : '−'}${euro(Math.abs(dagNu + i.rend.perDag))}`, 'plus']]) : '';
  const knop = houd ? `<button type="button" class="ds-z-knop bz-vasthoud" data-houd="${esc(i.key)}" aria-describedby="bz-houd-uitleg">${IC('geld')} Houd vast om te kopen</button>` : `<button type="button" class="ds-z-knop" data-kp="koop-ok" data-key="${esc(i.key)}">${IC('geld')} Koop voor ${euro(i.price)}</button>`;
  return `<div class="bz-scherm" role="dialog" aria-label="Aankoop bevestigen"><section class="ds-z-kaart ds-z-kaart--recht bz-bevestig"><header class="ds-z-kaart__kop"><h3 class="ds-z-kaart__titel">${IC('bon')}Aankoop bevestigen</h3></header>` +
    `<div><div class="bz-detail__titel">${esc(i.naam)}</div><span class="bz-hulp">${esc(i.sub)}</span></div>${bon([['Prijs', euro(i.price)], ['Je geld nu', euro(money)], ['Je houdt over', euro(money - i.price)]])}${dag}` +
    `<p class="bz-hulp" id="bz-houd-uitleg">${houd ? keyTextHtml('Houd {ENTER}, {A} of {LMB} 0,6 seconde vast. Met een controller zonder vasthouden: druk twee keer.') : 'Een kleine koop gaat direct.'}</p>` +
    `<div class="bz-actie">${knop}<button type="button" class="ds-z-knop ds-z-knop--secundair" data-kp="terug">Terug</button></div></section></div>`;
}

export function koopHtml({ items, sel = null, soort = 'alles', sort = 'terug', money = 0, bevestig = false, dagNu = null, vlakken = [], totaal = 0 }) {
  const gefilterd = sorteer(filter(items, soort), sort);
  const huidig = gefilterd.find((i) => i.key === sel) || gefilterd[0] || null;
  const duur = gefilterd.filter((i) => !i.kan).length;
  const filters = `<div class="bz-filters">${stapper('Soort', SOORT_NAAM[soort], 'soort')}${stapper('Sorteren', SORT_NAAM[sort], 'sort')}<span class="bz-hulp bz-rechts">${gefilterd.length} van ${totaal || items.length}${duur ? ` · ${duur} nog te duur` : ''}</span></div>`;
  if (!huidig) return `<div class="bz-md bz-md--koop"><div class="bz-links">${filters}</div>${leegHtml(items.length > 0)}</div>`;
  const lijst = `<div class="bz-lijst"><div class="bz-lijst__rijen ds-scroll" data-onder="1">${gefilterd.map((i) => rijHtml(i, i.key === huidig.key)).join('')}</div></div>`;
  const aanbod = gefilterd.filter((i) => Number.isFinite(i.x) && Number.isFinite(i.y)).map((i, n) => ({ id: i.key, shape: i.shape, x: i.x, y: i.y, statusId: 'aanbod', level: 'self', naam: i.naam, letter: String(n + 1) }));
  const kaart = `<div class="bz-mini bz-mini--breed">${kaartSvg([...vlakken, ...aanbod], { w: 540, h: 200, sel: huidig.key })}</div><div class="bz-legenda"><span><i class="bzk-i-eigen"></i>Van jou</span><span><i class="bzk-i-geel"></i>Te koop</span></div>`;
  const r = huidig.rend;
  const opbrengst = r ? bon([[r.bron === 'verpacht' ? 'Verpacht levert (±)' : r.bron === 'huur' ? 'Huur (±)' : 'Per dag (±)', `${perDagTekst(r, euro).replace('± ', '').replace(' per dag', '')} per dag`, 'plus'], ['Terugverdiend in (±)', `${r.terug} dagen`]]) : '<p class="bz-hulp">Wat dit oplevert hangt van jou af; er is geen vaste schatting.</p>';
  const reden = missReason(money, huidig.price);
  const detail = `<div class="bz-detail"><div class="bz-kopregel"><div><h3 class="bz-detail__titel">${esc(huidig.naam)}</h3><span class="bz-hulp">${esc(huidig.sub)}</span></div></div>${kaart}` +
    `<section class="bz-hero">${tussen('Wat kost het en wat levert het')}<div class="bz-raster2">${bon([['Prijs', euro(huidig.price)], ['Je geld nu', euro(money)], ['Je geld erna', euro(Math.max(0, money - huidig.price))]])}${opbrengst}</div>` +
    `<div class="bz-actie"><button type="button" class="ds-z-knop" data-kp="koop" data-key="${esc(huidig.key)}"${reden ? ' disabled' : ''}>Kopen</button><span class="bz-hulp">${reden ? esc(reden) : 'Je bevestigt het op de volgende stap.'}</span></div></section></div>`;
  return `<div class="bz-md bz-md--koop"><div class="bz-links">${filters}${lijst}</div>${detail}</div>${bevestig ? bevestigHtml(huidig, { money, dagNu }) : ''}`;
}

export const leegHtml = (filterLeeg) => `<div class="ds-z-leeg bz-leeg"><span class="ds-z-leeg__beeld bz-leeg-beeld">${IC('bord', 'bz-ic bz-ic--xl')}</span><h3 class="ds-z-leeg__kop">${filterLeeg ? 'Niets bij deze filter' : 'Niets te koop in de buurt'}</h3><p class="ds-z-leeg__tekst">${filterLeeg ? 'Kies een andere soort om meer te zien.' : 'Op de kaart zie je alle percelen die te koop zijn, ook verder weg.'}</p>${filterLeeg ? '' : '<button type="button" class="ds-z-knop" data-bz="kaart-tekoop" data-goto="map">Toon op de kaart</button>'}</div>`;
