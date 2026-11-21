// Treinrooster bouwen (#1085, docs/TREINEN-LIVE-21-11.md): de pure regels van de bouwstap.
// Geen bestanden, geen netwerk: scripts/treinrooster_bouw.mjs leest de statische GTFS (alleen bij het BOUWEN,
// nooit door het spel) en roept deze functies aan. Tests: scripts/treinrooster_test.mjs.
//
// Wat hieruit komt is een compact rooster met echte vertrektijden van de stations in en rond Groningen, met de
// VERZONNEN lijnnamen van het spel. De vervoerder staat niet in het rooster (constitutie 2: geen echte merken in
// beeld); de herkomst staat in docs/TREINEN-LIVE-21-11.md en docs/LICENTIES.md.

// De stations die het spel in en rond Groningen kent: naam in de bron (GTFS stop_name) -> naam in het spel.
// Een station dat niet in de wereld staat doet niet mee; een station zonder rooster houdt zijn eigen dienst.
export const STATIONS = [
  'Groningen', 'Groningen Europapark', 'Groningen Noord', 'Haren', 'Assen',
  'Zuidhorn', 'Grijpskerk', 'Sauwerd', 'Winsum', 'Uithuizen', 'Roodeschool', 'Eemshaven',
  'Bedum', 'Stedum', 'Loppersum', 'Appingedam', 'Delfzijl West', 'Delfzijl',
  'Kropswolde', 'Martenshoek', 'Hoogezand-Sappemeer', 'Zuidbroek', 'Veendam', 'Scheemda', 'Winschoten', 'Bad Nieuweschans',
];
// het spel noemt het centrale station zo (scripts/world/stad_spoor.mjs STATION_NAMES)
export const SPEL_NAAM = { Groningen: 'Groningen Hoofdstation' };

export const DAGSOORTEN = ['werk', 'za', 'zo'];
// spelklok -> rooster: de spelklok is gewone lokale kloktijd, dus 1 op 1 (zie docs); GTFS kent tijden boven 24:00 voor ritten na middernacht
export const secVan = (t) => { const m = /^(\d+):(\d\d):(\d\d)$/.exec(t || ''); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null; };

export const SPEL_LIJNEN = ['Stoptrein Roodeschool', 'Stoptrein Delfzijl', 'Stoptrein Leeuwarden', 'Stoptrein Winschoten', 'Stoptrein Veendam', 'Stoptrein Assen', 'Intercity Zwolle'];

const ZIJDE = [
  [/^(Eemshaven|Roodeschool|Uithuizen|Winsum|Sauwerd|Groningen Noord)$/, 'Stoptrein Roodeschool'],
  [/^(Delfzijl|Appingedam|Loppersum|Stedum|Bedum)/, 'Stoptrein Delfzijl'],
  [/^(Leeuwarden|Zuidhorn|Grijpskerk|Buitenpost|Feanw|Stavoren|Harlingen|Sneek)/, 'Stoptrein Leeuwarden'],
  [/^(Winschoten|Bad Nieuweschans|Nieuweschans|Scheemda|Zuidbroek|Hoogezand|Martenshoek|Kropswolde)/, 'Stoptrein Winschoten'],
  [/^Veendam$/, 'Stoptrein Veendam'],
];
const GRONINGER = /^Groningen( Europapark)?$/;

// De spellijn van een vertrek: de kant waar de trein heen rijdt (de bestemming; rijdt hij naar Groningen, dan de plek
// waar hij vandaan komt). soort: route_short_name uit de bron ("Intercity", "Sprinter", "RS4", "IC5" ...).
export function spelLijn({ bestemming, herkomst, soort = '' }) {
  const kant = GRONINGER.test(bestemming) ? herkomst : bestemming;
  for (const [re, lijn] of ZIJDE) if (re.test(kant)) return lijn;
  return /^(IC|Intercity|ICD)/i.test(soort) ? 'Intercity Zwolle' : 'Stoptrein Assen';
}

// Welke diensten rijden op een datum: services uit calendar_dates (alleen exception_type 1 telt; GTFS-NL gebruikt alleen die).
export function dienstenOp(kalender, datum) {
  const s = new Set();
  for (const [id, d, type] of kalender) if (d === datum && type === '1') s.add(id);
  return s;
}

// De dagsoort van een spelklokdag: weekdag 0 = zondag (calendar.js weekdayOf).
export const dagsoortVan = (weekdag) => (weekdag === 0 ? 'zo' : weekdag === 6 ? 'za' : 'werk');

// Een stoptijd op een station tot een rij: [vertrek (s na middernacht, binnen 0..86399), nummer, spoor, bestemming-idx, lijn-idx, aankomst-s, soort (0 tussenstation, 1 eindstation: alleen aankomst, 2 beginstation)].
// Het eindstation van een rit krijgt wel een rij (de aankomst; soort 1) zodat de wereldtrein er kan aankomen, maar staat niet op het bord. Tijden na middernacht (>= 24:00) vallen terug op de vroege uren.
export function maakRij({ dep, arr, nummer, spoor, bestIdx, lijnIdx, soort = 0 }) {
  const wrap = (s) => ((s % 86400) + 86400) % 86400;
  const d = secVan(dep);
  if (d == null) return null;
  const a = secVan(arr);
  return [wrap(d), String(nummer || ''), spoor || '', bestIdx, lijnIdx, a == null ? wrap(d) : wrap(a), soort];
}

// Het rooster compact opschrijven, gesorteerd op vertrektijd per station.
export function sorteerRijen(rijen) {
  return rijen.slice().sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(String(b[1])));
}

// De vorm van het bestand en een controle die het bouwscript en de test delen.
export function valideerRooster(r) {
  const fouten = [];
  if (!r || r.v !== 1) fouten.push('versie');
  if (!Array.isArray(r && r.stations) || !r.stations.length) fouten.push('stations');
  for (const k of DAGSOORTEN) {
    const dag = r && r.rit && r.rit[k];
    if (!dag) { fouten.push(`dagsoort ${k}`); continue; }
    for (const [si, rijen] of Object.entries(dag)) {
      if (!r.stations[+si]) fouten.push(`station ${si}`);
      for (const x of rijen) {
        if (x.length !== 7 || !(x[0] >= 0 && x[0] < 86400) || !r.bestemmingen[x[3]] || !r.lijnen[x[4]]) { fouten.push(`rij ${k}/${si}`); break; }
      }
    }
  }
  return fouten;
}
