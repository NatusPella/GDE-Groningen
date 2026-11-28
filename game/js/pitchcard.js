// Het kaartje van een standplaats op de kaartlaag Standplaatsen (Snackimperium, epic #1095, #1102): naam, plaats, stand, druk, vergunning, wat het kost en de knoppen
// (vergunning kopen, overnemen van Us Mem Snacks, je wagen erheen, doel) met bevestiging. Puur: geeft HTML als tekst (DS3-klassen van kaartactieui.js: mv-acties, mv-actie,
// mv-note), geen DOM (scripts/pitchmap_test.mjs). De acties zijn data-card-waarden die mapview.js afhandelt: sp-koop, sp-ok, sp-annuleer, sp-zet.

import { euro } from './geldtekst.js';
import { escapeHtml as esc } from './htmlescape.js';

const STATUS_LABEL = { jij: 'Van jou', usmem: 'Van Us Mem Snacks', medespeler: 'Van een medespeler', vrij: 'Vrij' };
// een spatie tussen label en prijs: zonder staat er "Vergunning€450" in de tekst en voor een schermlezer (#1234)
const act = (card, label, small) => `<button type="button" class="mv-actie" data-card="${card}"><span class="mv-at"><span class="mv-al">${label}</span> <small>${small}</small></span></button>`;
// Drukte als woord: een getal met uitleg tussen haakjes was jargon (#1256)
export const crowdWord = (foot) => (foot < 0.8 ? 'Rustig' : foot < 1.15 ? 'Gewoon druk' : foot < 1.5 ? 'Druk' : 'Erg druk');

// row: een rij van snacklive.spotRows(); stap: null | 'koop'; melding: tekst na een actie; money: het geld; hasWagon: je hebt een snackwagen.
export function spotCardHtml(row, { stap = null, melding = '', money = 0, hasWagon = false } = {}) {
  if (!row) return '';
  const feiten = [['Plaats', esc(row.place)], ['Stand', `${STATUS_LABEL[row.status] || STATUS_LABEL.vrij}${row.claim ? ` (${esc(row.claim.name)})` : ''}`], ['Drukte', crowdWord(row.foot)]];
  if (row.status === 'jij') feiten.push(['Vergunning', `nog ${row.daysLeft} speldagen, verlengen ${euro(row.renew)}`]);
  const dl = '<dl class="mv-bezit">' + feiten.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') + '</dl>';
  let top = '', buttons = '';
  if (row.status === 'vrij') {
    top = `<p class="mv-note" data-spot="vrij"><b>${euro(row.price)}</b> voor een vergunning van 40 speldagen.</p>`;
    if (stap === 'koop') {
      const kan = money >= row.price;
      buttons = `<div class="mv-acties" role="group" aria-label="Vergunning bevestigen"><p class="mv-note">${kan ? `Een vergunning voor ${euro(row.price)}? Je houdt ${euro(money - row.price)} over.` : `Je mist nog ${euro(row.price - money)}.`}</p>${act('sp-ok', 'Ja, koop', euro(row.price))}${act('sp-annuleer', 'Nee, laat maar', 'terug')}</div>`;
    } else buttons = `<div class="mv-acties" role="group" aria-label="Vergunning kopen">${act('sp-koop', 'Vergunning kopen', euro(row.price))}</div>`;
  } else if (row.status === 'usmem') {
    top = `<p class="mv-note" data-spot="usmem">Us Mem Snacks staat hier. Overnemen kost <b>${euro(row.ask)}</b>; Jelle Terpstra zal het niet leuk vinden.</p>`;
    if (stap === 'koop') {
      const kan = money >= row.ask;
      buttons = `<div class="mv-acties" role="group" aria-label="Overname bevestigen"><p class="mv-note">${kan ? `Overnemen voor ${euro(row.ask)}?` : `Je mist nog ${euro(row.ask - money)}.`}</p>${act('sp-ok', 'Ja, neem over', euro(row.ask))}${act('sp-annuleer', 'Nee, laat maar', 'terug')}</div>`;
    } else buttons = `<div class="mv-acties" role="group" aria-label="Plek overnemen">${act('sp-koop', 'Neem over', euro(row.ask))}</div>`;
  } else if (row.status === 'jij') {
    top = `<p class="mv-note" data-spot="jij">${row.wagon ? 'Je wagen staat hier.' : 'Een eigen vergunning, nog zonder wagen.'}</p>`;
    if (!row.wagon && hasWagon) buttons = `<div class="mv-acties" role="group" aria-label="Wagen plaatsen">${act('sp-zet', 'Zet mijn wagen hier', 'verhuist')}</div>`;
  } else top = `<p class="mv-note" data-spot="medespeler">${row.claim ? `${esc(row.claim.name)} heeft deze plek in deze sessie.` : 'Een medespeler heeft deze plek.'}</p>`;
  return `<div class="mv-bezit-kaart">${top}${dl}${melding ? `<p class="mv-note" role="status">${esc(melding)}</p>` : ''}${buttons}</div>`;
}
export const pitchTipLine = (row) => (row ? `${STATUS_LABEL[row.status] || ''} · ${row.status === 'vrij' ? `vergunning ${euro(row.price)}` : row.status === 'usmem' ? `overnemen ${euro(row.ask)}` : row.place}` : '');
