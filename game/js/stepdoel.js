// Het korte doel van een verhaalstap (audit speelbaarheid 23-11, docs/AUDIT-SPEELBAARHEID-23-11.md).
// Puur: geen DOM, geen wereld. De doelbalk, het kaartlabel, de wegwijzer in de wereld en de herinnering lazen tot nu toe
// de TITEL van de stap ("Ga naar: Het museum stond er al zo"). Een titel is een grap of een naam, geen opdracht. Hier staat
// per stap één werkwoordelijke zin van hoogstens MAX_DOEL tekens met de plek erin; de lange uitleg blijft in het appje
// (`lead`) en in Te doen. Een stap zonder regel valt terug op de titel, zodat een nieuwe stap nooit leeg staat
// (scripts/stepdoel_test.mjs keurt dat af voor elke stap die een plek heeft).
//
// Samen spelen: de verhaalstap is van wie het spel opende; een gast ziet het doel niet in zijn eigen balk (de gastkaart
// krijgt de doelen via het EXTRA-bericht). Niets hiervan wordt opgeslagen.

export const MAX_DOEL = 44;

export const STEP_DOEL = Object.freeze({
  M01: 'Praat met Berend bij het Martinikerkhof',
  M02: 'Ga naar de pinautomaat in de Herestraat',
  N1: 'Ga naar Sjabbe in de Herestraat',
  N2: 'Ga naar de duif op de gang thuis',
  N3: "Ga naar Beppe's huis voor soep",
  N4: 'Ga naar Station Groningen',
  W1: 'Ga naar huis en proef wat Tessa maakte',
  M03: 'Ga naar Het Loket bij de Grote Markt',
  M04: 'Praat met Bert op het Stationsplein',
  M05: 'Praat met Sjoerd bij het Academiegebouw',
  M06: 'Pak de bal in het museum',
  M07: 'Ga naar de groothandel in de Bornholmstraat',
  M08: 'Loop te voet naar de Noorderhaven',
  N10: 'Ga naar het terras aan de Grote Markt',
  N8: 'Ga naar Oma aan de Noorderhaven',
  T1: 'Neem de trein naar Warffum',
  M09: 'Praat met Geesje in Warffum',
  N5: 'Ga naar het erf bij Warffum',
  K1: 'Ga naar de pastorie in Warffum',
  M10: 'Ga naar het erf van de kerk: Jelle komt',
  A1: 'Ga naar de bietenoogst bij Hoogkerk',
  N11: 'Ga naar Bedum voor een bezorgrondje',
  N12: 'Ga naar de flat in Paddepoel',
  N6: 'Ga naar Klaas in Noordpolderzijl',
  N7: 'Neem de streekbus naar Winsum',
  D1: 'Ga naar het busstation: de laatste bus naar huis',
  D2: 'Ga naar de bushalte in Winsum',
  D3: 'Ga naar perron 1 van Station Groningen',
  L1: 'Ga naar de weide naast het vliegveld van Eelde',
  L2: 'Ga naar de Dollarddijk bij Termunten',
  T2: 'Neem de streekbus naar Zoutkamp',
  M11: 'Praat met Klaas in Zoutkamp',
  K2: 'Ga naar de kade in Zoutkamp',
  M12: 'Praat met Dijkstra in Lauwersoog',
  J1: 'Ga naar huis: er ligt post op de mat',
  M13: 'Praat met Lammert in de Eemshaven',
  K3: "Ga naar Lammerts havenkantoor",
  M14: 'Ga naar de dijk bij Bierum',
  J2: 'Ga naar de brug in Appingedam',
  W2: 'Ga naar het havenhuis in Delfzijl',
  T3: 'Neem de trein naar Winschoten',
  M15: 'Praat met Roelfien bij Midwolda',
  M16: 'Zoek Durk en Douwe op de kermis',
  A2: "Ga naar de botsauto's op de Grote Markt",
  J3: 'Ga naar het erf bij Siddeburen',
  M17: 'Praat met Wubbo in Veendam',
  J4: 'Ga naar het terras aan het Oosterdiep',
  M18: 'Ga naar Wiebelwerk in de Stad',
  N9: 'Ga naar de dijk bij de Dollard',
  J5: 'Ga naar de Escapade in Stadskanaal',
  M19: 'Ga naar de stoomtrein in Veendam',
  J6: 'Ga naar huis: Beppe komt langs',
  V1: 'Koop schoenen en een shirt',
  V2: 'Ga naar de training in Veendam',
  V3: 'Haal drinken bij de avondwinkel',
  T4: 'Ga naar Vesting Bourtange',
  M20: 'Ga naar het Beleg van Bourtange',
  M21: 'Haal de Escapade terug van de trein',
  F1: 'Ga naar de aanhanger bij Zuidhorn',
  M22: "Ga naar Tinus' schuur bij Zuidhorn",
  F2: 'Ga naar de loods in Hoogkerk',
  M23: "Ga naar Tinus' schuur bij Zuidhorn",
  M24: 'Praat met Bert op de Grote Markt',
  M25: "Ga naar Oma's keuken aan de Noorderhaven",
  M26: 'Ga naar de Grote Markt: het Ontzet',
  F3: "Ga naar Oma's keuken aan de Noorderhaven",
  F4: 'Ga naar de Vismarkt',
  F5: 'Ga naar de kade aan de Noorderhaven',
  M27: 'Praat met Willemien in Loppersum',
  M28: 'Rij de verhuisbus naar de wisselwoning',
  M29: 'Ga naar Willemien: het huis is klaar',
  T5: 'Ga naar Vesting Bourtange',
  M30: 'Ga naar het proefbeleg in Bourtange',
  F6: 'Ga naar de Vismarkt',
});

// Het doel dat de speler leest: de korte zin, anders de titel (een stap zonder regel, of een onbekende stap).
export function stepDoel(step) {
  if (!step) return '';
  const d = Object.hasOwn(STEP_DOEL, step.id) ? STEP_DOEL[step.id] : '';
  return d || String(step.title || '');
}

// Voor een zin als "Nog even dit: ...": het doel met een kleine beginletter, zodat het in een zin past.
export const doelInZin = (doel) => {
  const t = String(doel || '').trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
};
