// Rendement van een koop: wat een perceel of pand per dag oplevert en na hoeveel dagen het terugverdiend is. Altijd een SCHATTING: de aanroeper toont
// hem met "±". Zonder genoeg gegevens geeft elke functie null en laat het scherm de regel weg (besluit coordinator 24-11, geen verzonnen getallen).
// Puur (scripts/bezitrendement_test.mjs). Geen nieuwe spelregel: alleen wat bezitprijs.js en business.js al uitrekenen.

import { leaseOutPerDay } from './bezitprijs.js';
import * as BZ from './business.js';

const ok = (x) => Number.isFinite(x) && x > 0;

// Dagen tot de prijs terug is; null bij geen opbrengst of geen prijs.
export const terugverdiend = (prijs, perDag) => (ok(prijs) && ok(perDag) ? Math.ceil(prijs / perDag) : null);

// Een perceel verpachten: de pacht per dag van bezitprijs.js. Zelf bewerken heeft geen vaste opbrengst (hangt van gewas en weer af): weggelaten.
export function perceelRendement(offer) {
  if (!offer || !ok(offer.price)) return null;
  const pacht = leaseOutPerDay(offer.price);
  if (!ok(pacht)) return null;
  return { perDag: pacht, terug: terugverdiend(offer.price, pacht), bron: 'verpacht' };
}

// Een pand: een woning levert huur, een winkel omzet na inkoop min lopende kosten en belasting. offer: { price, row:{m2}, kind:{type, cls} }.
export function pandRendement(offer, owned = 0) {
  if (!offer || !ok(offer.price) || !offer.kind || !offer.row || !ok(offer.row.m2)) return null;
  const { type, cls } = offer.kind;
  let dag = null;
  if (type === 'woning' || cls === 'rent') dag = offer.price * (BZ.RENT_RATES[type] || BZ.RENT_RATES.woning);
  else if (cls === 'shop') dag = BZ.baseRevenue(type, offer.row.m2) - offer.price * BZ.OPEX_RATE - BZ.taxPerDay(offer.price, owned);
  else if (cls === 'industry') dag = offer.price * BZ.INDUSTRY_RATE - offer.price * BZ.OPEX_RATE - BZ.taxPerDay(offer.price, owned);
  if (!ok(dag)) return null;
  return { perDag: Math.round(dag), terug: terugverdiend(offer.price, dag), bron: cls === 'shop' || cls === 'industry' ? 'omzet' : 'huur' };
}

// Wat een pand dat je al hebt per dag netto oplevert (een schatting, voor de kop en het overzicht): huur, of omzet na inkoop min kosten en belasting.
// biz: uit business.bizOf ({ p, type, cls, m2, q }); rentDay: de huur van rentView als die er is. null zonder waarde.
export function eigenPandPerDag(biz, owned = 0, rentDay = null) {
  if (!biz || !ok(biz.p)) return 0;
  const mf = BZ.maintenanceFactor(biz.q);
  const kosten = biz.p * BZ.OPEX_RATE + BZ.taxPerDay(biz.p, owned);
  let dag = 0;
  if (biz.cls === 'rent') dag = ok(rentDay) ? rentDay - BZ.taxPerDay(biz.p, owned) : biz.p * (BZ.RENT_RATES[biz.type] || BZ.RENT_RATES.woning) * mf - BZ.taxPerDay(biz.p, owned);
  else if (biz.cls === 'shop') dag = BZ.baseRevenue(biz.type, biz.m2) * mf - kosten;
  else if (biz.cls === 'industry') dag = biz.p * BZ.INDUSTRY_RATE * mf - kosten;
  return Number.isFinite(dag) ? Math.round(dag) : 0;
}

// De tekst voor op het scherm, altijd met ±; null als er niets te zeggen valt.
export const perDagTekst = (r, euro) => (r && ok(r.perDag) ? `± ${euro(r.perDag)} per dag` : null);
export const terugTekst = (r) => (r && r.terug ? `± ${r.terug} dagen terug` : null);
