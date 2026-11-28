// De perceelkaart bij het aanklikken op de kaartlaag Te koop (epic #1095, #1098): naam, soort, oppervlakte, bodem, ligging, verkoper, verwachte
// opbrengst, prijs, schaalprijs-opmerking en Koop met bevestiging; bij bezit Verkoop met bevestiging. Puur: geeft HTML als tekst (DS3-klassen van
// kaartactieui.js: mv-acties, mv-actie, mv-note), geen DOM (scripts/forsalecard_test.mjs). De acties zijn data-card-waarden die mapview.js afhandelt:
// bezit-koop, bezit-ok, bezit-annuleer, bezit-verkoop, bezit-verkoop-ok.

import { GEWASSEN, STANDAARD_GEWAS } from './boerderij.js';
import { bodemFactor } from './bezitprijs.js';
import { euro } from './geldtekst.js';
import { escapeHtml as esc } from './htmlescape.js';

const ACCESS_TEXT = { weg: 'aan een autoweg', pad: 'aan een pad', wegNabij: 'bij een autoweg (tot 60 m)', padNabij: 'bij een pad (tot 60 m)', geen: 'zonder toegang' };
export const accessText = (a) => ACCESS_TEXT[a] || ACCESS_TEXT.geen;
const MODE_TEXT = { self: 'Zelf bewerkt', leased: 'Verpacht', staff: 'Door personeel' };
export function neighboursText(nb) {
  if (!nb || !(nb.n > 0)) return 'geen andere percelen binnen 300 m';
  const who = [nb.mine ? `${nb.mine} van jou` : '', nb.others ? `${nb.others} van medespelers` : ''].filter(Boolean).join(', ');
  return `${nb.n >= 40 ? '40 of meer' : nb.n} ${nb.n === 1 ? 'perceel' : 'percelen'} binnen 300 m${who ? ` (${who})` : ''}`;
}
export const crops = (kind) => (kind === 'w' ? 'gras en vee (weide)' : kind === 'b' ? 'boomgaardfruit' : 'gewassen (akker)');

// De bodem als woord en een balk van tien blokjes (ook voor schermlezers: de tekst staat erbij); de kaart toont de DS3-balk.
export const soilMeter = (q) => `<span class="ds-z-balk mv-bodem" style="--ds-z-w:${Math.round(Math.max(0, Math.min(1, q)) * 100)}%" aria-hidden="true"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span></span>`;
export const soilBar = (q) => { const n = Math.max(0, Math.min(10, Math.round(q * 10))); return '█'.repeat(n) + '░'.repeat(10 - n); };

// Verwachte opbrengst per oogst bij het standaardgewas van de soort, met de bodem en de grootte (zoals boerderij.opbrengstKg bij een perfecte oogst).
export function expectedYield(kind, ha, soil) {
  const id = kind === 'w' ? 'gras' : kind === 'b' ? 'fruit' : STANDAARD_GEWAS;
  const g = GEWASSEN[id];
  if (!g) return { kg: 0, euro: 0, gewas: '' };
  const kg = Math.round(g.kgBasis * bodemFactor(soil) * Math.max(0.5, Math.min(4, ha / 1.2)));
  return { kg, euro: Math.round(kg * g.prijsKg), gewas: g.naam };
}

// #1233: een plaatje van het perceel bovenaan de kaart: de echte omtrek (parcelindex shapeOf, wereldmeters, y naar het noorden)
// geschaald in een vak van 160 x 96, noorden boven. Zonder echte omtrek geen plaatje (#1092: nooit een verzonnen vorm).
export function parcelShapeSvg(punten, w = 160, h = 96, pad = 6) {
  if (!Array.isArray(punten) || punten.length < 3) return '';
  const ok = punten.filter((q) => Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1]));
  if (ok.length < 3) return '';
  const xs = ok.map((q) => q[0]), ys = ok.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 2 * pad) / Math.max(1, x1 - x0), (h - 2 * pad) / Math.max(1, y1 - y0));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const d = ok.map((q) => `${(ox + (q[0] - x0) * s).toFixed(1)},${(oy + (y1 - q[1]) * s).toFixed(1)}`).join(' ');
  return `<svg class="mv-perceel" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false"><polygon points="${d}"/></svg>`;
}

// offer: uit bezitlive.parcelOffer. stap: null | 'koop' | 'verkoop'. melding: een tekst na een mislukte actie. money: het geld van de speler.
export function offerCardHtml(offer, { stap = null, melding = '', money = 0 } = {}) {
  if (!offer) return '';
  const y = expectedYield(offer.parcel.kind, offer.ha, offer.soil);
  // #1233: de drie kernregels (oppervlakte, bodem, opbrengst) eerst, de rest eronder
  const rows = [
    ['Oppervlakte', `${String(offer.ha.toFixed(1)).replace('.', ',')} ha`],
    ['Bodem', `${offer.soilWord} ${soilMeter(offer.soil)}`],
    ['Verwacht', `ongeveer ${y.kg.toLocaleString('nl-NL')} kg ${esc(y.gewas.toLowerCase())} per oogst, ${euro(y.euro)}`],
    ['Soort', `${offer.kindName} · ${crops(offer.parcel.kind)}`],
    ['Ligging', `${accessText(offer.access)}, bij ${esc(offer.place)}`],
    ...(offer.neighbours ? [['Buren', neighboursText(offer.neighbours)]] : []),
    ...(offer.mine && offer.mode ? [['Beheer', `${MODE_TEXT[offer.mode] || 'Zelf'}${offer.insured ? ' · verzekerd tegen stortbui' : ''}`]] : []),
    ['Verkoper', esc(offer.seller)],
  ];
  const dl = '<dl class="mv-bezit">' + rows.map(([k, v], i) => `<div${i < 3 ? ' class="mv-kern"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('') + '</dl>';
  let top = '';
  if (offer.mine) top = `<p class="mv-note" data-bezit="mine">Van jou. Verkopen levert ${euro(offer.sellValue)} op (75% van wat je betaalde).</p>`;
  else if (offer.claim) top = `<p class="mv-note" data-bezit="claimed">${esc(offer.reason)}</p>`;
  else if (!offer.forSale) top = `<p class="mv-note" data-bezit="locked">${esc(offer.reason)}</p>`;
  else top = `<p class="mv-note" data-bezit="sale"><b>${euro(offer.price)}</b>${offer.scaleNote ? ` · ${esc(offer.scaleNote)}` : ''}</p>`;
  let buttons = '';
  if (offer.forSale) {
    if (stap === 'koop') {
      const kan = money >= offer.price;
      buttons = `<div class="mv-acties" role="group" aria-label="Koop bevestigen"><p class="mv-note">${kan ? `Kopen voor ${euro(offer.price)}? Je houdt ${euro(money - offer.price)} over.` : `Je mist nog ${euro(offer.price - money)}.`}</p>` +
        `<button type="button" class="mv-actie" data-card="bezit-ok"${kan ? '' : ' aria-disabled="true"'}><span class="mv-at"><span class="mv-al">Ja, koop</span> <small>${euro(offer.price)}</small></span></button>` +
        '<button type="button" class="mv-actie" data-card="bezit-annuleer"><span class="mv-at"><span class="mv-al">Nee, laat maar</span> <small>terug</small></span></button></div>';
    } else buttons = `<div class="mv-acties" role="group" aria-label="Perceel kopen"><button type="button" class="mv-actie" data-card="bezit-koop"><span class="mv-at"><span class="mv-al">Koop</span> <small>${euro(offer.price)}</small></span></button></div>`;
  } else if (offer.mine && !offer.parcel.legacy) {
    if (stap === 'verkoop') {
      buttons = `<div class="mv-acties" role="group" aria-label="Verkoop bevestigen"><p class="mv-note">Verkopen voor ${euro(offer.sellValue + (offer.herdValue || 0))}? Het veld en wat erop staat gaan mee${offer.herdValue > 0 ? `; je kudde levert ${euro(offer.herdValue)} op` : ''}.</p>` +
        '<button type="button" class="mv-actie" data-card="bezit-verkoop-ok"><span class="mv-at"><span class="mv-al">Ja, verkoop</span> <small>onomkeerbaar</small></span></button>' +
        '<button type="button" class="mv-actie" data-card="bezit-annuleer"><span class="mv-at"><span class="mv-al">Nee, houd het</span> <small>terug</small></span></button></div>';
    } else buttons = `<div class="mv-acties" role="group" aria-label="Perceel beheren"><button type="button" class="mv-actie" data-card="bezit-verkoop"><span class="mv-at"><span class="mv-al">Verkoop</span> <small>${euro(offer.sellValue + (offer.herdValue || 0))}</small></span></button></div>`;
  }
  return `<div class="mv-bezit-kaart">${parcelShapeSvg(offer.shape)}${top}${dl}${melding ? `<p class="mv-note" role="status">${esc(melding)}</p>` : ''}${buttons}</div>`;
}

// De regel voor de tooltip en de hover: "Wierdeakker bij Winsum (K0482) · te koop €12.350".
export const pointerSub = (offer) => (offer ? `${offer.kindName} · ${String(offer.ha.toFixed(1)).replace('.', ',')} ha · ${offer.mine ? 'van jou' : offer.claim ? `van ${offer.claim.name}` : offer.forSale ? `te koop ${euro(offer.price)}` : 'niet te koop'}` : '');
