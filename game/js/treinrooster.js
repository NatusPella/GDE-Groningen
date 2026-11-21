// Het echte treinrooster in het spel (#1085): de vertrektijden van de stations in en rond Groningen uit
// game/treinrooster.json (gebouwd door scripts/treinrooster_bouw.mjs uit de open GTFS van OVapi, CC0), met de
// VERZONNEN lijnnamen van het spel. Puur: geen THREE, geen DOM, geen netwerk; het bestand komt als data binnen.
// De live vertragingen (livetreinen.js) worden hier per rit op de rijen gezet. Tests: scripts/treinrooster_test.mjs.
//
// Spelklok en rooster. De spelklok (daynight.js) loopt in uren van de lokale dag (0..24) en de speldag heeft een
// weekdag (calendar.js weekdayOf). Het rooster kent drie soorten dagen: werk (ma t/m vr), za en zo. Een vertrek om
// 08:17 staat dus op het bord als 08:17 op de spelklok, op de dagsoort van die speldag: 1 op 1, zonder omrekening
// van zomer- en wintertijd (de spelwereld heeft altijd zomer; het rooster is dat van een zomerdag in 2027).
// De spelkalender (augustus 2026 en daarna "nazomer") blijft zoals hij is; alleen de tijd van de dag en de weekdag tellen.

import { meldSleutel } from './livetreinen.js';

export const SPEL_NAAM = { Groningen: 'Groningen Hoofdstation' };
const BRON_NAAM = Object.fromEntries(Object.entries(SPEL_NAAM).map(([b, s]) => [s, b]));
export const bronNaam = (spelNaam) => BRON_NAAM[spelNaam] || spelNaam;

// de dagsoort van een weekdag (0 = zondag, zoals calendar.js weekdayOf)
export const dagsoortVan = (weekdag) => (weekdag === 0 ? 'zo' : weekdag === 6 ? 'za' : 'werk');

// Zo ziet het bestand eruit; false = het spel valt terug op zijn eigen rooster.
export function geldigRooster(r) {
  return !!(r && r.v === 1 && Array.isArray(r.stations) && r.rit && r.rit.werk && r.rit.za && r.rit.zo && Array.isArray(r.lijnen) && Array.isArray(r.bestemmingen));
}

const indexVan = (r, spelNaam) => {
  const n = bronNaam(spelNaam);
  return r.stations.findIndex((s) => s.naam === n);
};
export const heeftStation = (r, spelNaam) => geldigRooster(r) && indexVan(r, spelNaam) >= 0 && !!r.rit.werk[indexVan(r, spelNaam)];

// De stationscodes in het bestand (voor het filter op de live feed).
export const codesUit = (r) => new Set(geldigRooster(r) ? r.stations.map((s) => s.code).filter(Boolean) : []);

// De volgende vertrekken op een station vanaf `nu` (s na middernacht), over middernacht heen (de vroege ochtend van de volgende dag).
// Rij zoals dienstregeling.vertrekBord: { lijn, richting, dir, k, spoor, plan, tijd, vertraging: 0, reden: '', aankomst } plus
// nummer, code, vervallen en live (true als er een live melding op zit). `terug`: hoeveel seconden een net vertrokken trein nog blijft staan.
// Met `dienst` (treindienst.js bouwDienst) telt alleen een vertrek waar een wereldtrein bij hoort: de rij krijgt de lijn van die trein (leg.route) en zijn rit-id,
// zodat bord en trein dezelfde trein zijn en er geen bordregel zonder trein staat.
export function rijenUitRooster(r, spelNaam, dagsoort, nu, { aantal = 8, terug = 30, dienst = null } = {}) {
  if (!heeftStation(r, spelNaam)) return [];
  const si = indexVan(r, spelNaam);
  const code = r.stations[si].code;
  const dag = r.rit[dagsoort] && r.rit[dagsoort][si];
  if (!dag || !dag.length) return [];
  const uit = [];
  for (const dagVerschuiving of [0, 86400]) {
    for (const x of dag) {
      if (x[6] === 1) continue;                        // eindstation: alleen aankomst, geen vertrek op het bord
      const t = x[0] + dagVerschuiving;
      if (t < nu - terug) continue;
      const koppel = dienst ? dienst.vindRij(x[1], spelNaam) : null;
      if (dienst && !koppel) continue;
      const aank = (x[5] > x[0] ? x[5] - 86400 : x[5]) + dagVerschuiving;
      uit.push({ lijn: koppel ? koppel.leg.route : r.lijnen[x[4]], rit: koppel ? koppel.leg.id : null, halte: koppel ? koppel.j : null, richting: r.bestemmingen[x[3]], dir: 1, k: `${x[1]}@${t}`, spoor: x[2], plan: t, tijd: t, vertraging: 0, reden: '', aankomst: aank, nummer: x[1], code, vervallen: false, live: false });
      if (uit.length >= aantal) return uit;
    }
  }
  return uit;
}

export const REDEN_LIVE = 'Zo meldt de open reisinformatie';

// Het bestand laden (eenmalig, zacht): in het spel via fetch naast index.html (zoals marinas.json). Mislukt het, dan is er geen echt rooster
// en houden de stations hun eigen dienst. Alleen een lokaal bestand: dit gaat niet naar het internet.
export async function laadRooster(fetchFn = globalThis.fetch, basis = (typeof location !== 'undefined' ? location.href : '')) {
  try {
    if (typeof fetchFn !== 'function' || !basis) return null;
    const res = await fetchFn(new URL('treinrooster.json', basis).href);
    if (!res.ok) return null;
    const r = await res.json();
    return geldigRooster(r) ? r : null;
  } catch {
    return null;
  }
}

// De live stand (Map uit livetreinen.maakStand) op de rijen zetten: de vertraging per rit in seconden, en of de rit vervalt.
// De vertraging van één vertrek (of aankomst) uit de live stand: { vertraging (s, 0 onder een minuut), vervallen, live }; null zonder melding.
// Bord en wereldtrein gebruiken dezelfde functie, zodat ze dezelfde tijden hebben. plan: seconden na middernacht (ook boven 86400).
export function vertragingVan(stand, nummer, code, plan) {
  if (!stand || !stand.size) return null;
  const m = stand.get(meldSleutel(nummer, code, ((plan % 86400) + 86400) % 86400));
  if (!m) return null;
  return { vertraging: m.vertraging >= 60 ? m.vertraging : 0, vervallen: !!m.vervallen, live: true };
}

// Rijen zonder melding blijven staan zoals ze zijn (rooster). Geeft nieuwe rijen terug, gesorteerd op de verwachte tijd.
export function pasVertragingToe(rijen, stand) {
  if (!stand || !stand.size) return rijen;
  const uit = rijen.map((rij) => {
    // de plan-tijd kan boven 86400 liggen (volgende dag): de sleutel gebruikt de minuut van de dag
    const m = vertragingVan(stand, rij.nummer, rij.code, rij.plan);
    if (!m) return rij;
    const v = m.vertraging;     // onder een minuut telt als op tijd
    return { ...rij, vertraging: v, tijd: rij.plan + v, reden: v ? REDEN_LIVE : '', vervallen: m.vervallen, live: true };
  });
  return uit.sort((a, b) => a.tijd - b.tijd || a.lijn.localeCompare(b.lijn));
}
