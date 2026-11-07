// Eén sfeer per activiteit (#595): dezelfde vorm als de loopbaansferen uit carrieresfeer.js (#492),
// maar dan voor de activiteiten-HUD's. Elke sfeer is een droge, satirische naam plus een vaste
// combinatie van tint, motief, accent, icoon, bordvorm, typografie en toon. Geen nieuwe kleur en geen
// nieuw font: het accent komt uit de ene accenttabel van minigamekit.js (MG_THEMA), het motief uit de
// patronen van carrieresfeer.js, het icoon uit de bestaande MG_ICONEN, en de tint uit de vier
// tonaliteiten van #492. Puur: geen DOM, geen THREE, geen opslag, zodat
// scripts/activiteitensfeer_test.mjs de tabel kan natrekken.
//
// Een sfeer is identiteit, geen status: status blijft via --mk-* (kleurenblindmodi) en het accent is
// nooit de enige aanwijzing (bordvorm, icoon en tekst dragen de sfeer mee).

// De vier tonaliteiten uit carrieresfeer.js (TINT): donkere plaat, donkergroen, veldgroen, melkwit.
export const TINTEN = ['nacht', 'bos', 'veld', 'melk'];

// De bordvormen die de gedeelde balk aan kan; een activiteit kiest er één, geen eigen chroom.
export const BORDVORMEN = [
  'scorekaart', 'vertrekbord', 'entreekaartje', 'meetlat', 'clubschild', 'cockpitstrip',
  'startbord', 'boeienkaart', 'kermisbord', 'prikbord', 'dossier', 'routebord',
];

// Typografie binnen de twee fonts van het spel: Bebas Neue voor koppen en cijfers, Arial Narrow
// voor lopende tekst. `kast` is kapitalen of kleine letters, `spatiëring` in px (0-6), `cursief`
// alleen voor Arial Narrow (de etiquette-regel).
const TYPOGRAFIE = {
  kapitaal: { kast: 'kapitalen', spatiëring: 4, cursief: false },
  klein: { kast: 'klein', spatiëring: 1, cursief: false },
  cursief: { kast: 'klein', spatiëring: 0, cursief: true },
};

const S = (naam, tint, vorm, accent, icoon, bordvorm, typo, toon) => ({
  naam, tint, vorm, accent, icoon, bordvorm, typografie: TYPOGRAFIE[typo], toon,
});

// Per activiteit-id (activities.js, in de volgorde van LIST). Het accent is een bestaande waarde uit
// MG_THEMA: zo blijft er één accenttabel en kan er geen nieuwe hex binnensluipen.
export const ACTIVITEIT_SFEER = {
  carbid: S('Knal in de klei', 'nacht', 'terrein', '#d9662e', 'disc', 'kermisbord', 'kapitaal',
    ['De buurman heeft de politie al gebeld.', 'Vijftig decibel is hier een traditie.']),
  kermis: S('Suikerspin', 'veld', 'vlaggen', '#d45c86', 'vlaggen', 'kermisbord', 'kapitaal',
    ['De suikerspin plakt aan je jas.', 'Alles erop, ook de rekening.']),
  hoogvlieger: S('Boven de kermis', 'veld', 'vlaggen', '#b9a27a', 'gondel', 'entreekaartje', 'klein',
    ['Het rad gaat rond en de stad blijft staan.', 'Zwaaien naar mensen die je niet kent.']),
  geheimen: S('Kleine dingen', 'bos', 'schub', '#c9a227', 'oog', 'prikbord', 'klein',
    ['Het zit altijd net achter een heg.', 'Niemand gelooft dat je het gevonden hebt.']),
  drift: S('Zwarte strepen', 'nacht', 'grid', '#f2b82a', 'kart', 'startbord', 'kapitaal',
    ['De banden protesteren, jij niet.', 'De parkeerwacht kijkt de andere kant op.']),
  discgolf: S('Schijf in de bosjes', 'veld', 'schub', '#f08a2e', 'disc', 'scorekaart', 'kapitaal',
    ['De basket staat er, de schijf niet.', 'Zoeken is ook een worp.']),
  pitchputt: S('De club betreurt uw slag', 'melk', 'contour', '#46b36a', 'vlag', 'clubschild', 'cursief',
    ['De club betreurt uw slag.', 'Handicap 54. Wij zeggen hier niets over.']),
  skatepark: S('Board in de beton', 'veld', 'terrein', '#e8523a', 'skate', 'entreekaartje', 'kapitaal',
    ['De beton is koud, het asfalt ook.', 'Eén keer vallen en je kent de plek.']),
  kartbaan: S('Rondjes in Ulrum', 'nacht', 'grid', '#f2b82a', 'kart', 'startbord', 'kapitaal',
    ['Iedereen is kampioen tot de eerste bocht.', 'De baan is kort, de excuses niet.']),
  zwembad: S('Baantjes', 'veld', 'golf', '#2fc4c9', 'water', 'startbord', 'klein',
    ['Vier baantjes en een badmeester met een fluitje.', 'Niet rennen, wel zinken.']),
  klimtoren: S('De top', 'bos', 'terrein', '#d9455f', 'winnaar', 'meetlat', 'kapitaal',
    ['Boven is het stil en beneden jaloers.', 'De klim is lang, de afdaling kort.']),
  waterski: S('Wake en water', 'veld', 'golf', '#1f9e86', 'water', 'boeienkaart', 'klein',
    ['De kabel trekt, het water wacht.', 'Loslaten is ook een stijl.']),
  carillon: S('Klokken boven de markt', 'nacht', 'stralen', '#c9a227', 'beurt', 'vertrekbord', 'kapitaal',
    ['De toren speelt, de markt kijkt op.', 'Muziek waar je niet om vroeg.']),
  pannenkoek: S('De gouden pan', 'melk', 'kleed', '#b8792a', 'bal', 'entreekaartje', 'klein',
    ['Alles erop, ook de rekening.', 'De keuken is de baas.']),
  hengelen: S('Weer een laars', 'veld', 'schub', '#7aa63a', 'water', 'boeienkaart', 'klein',
    ['De vis lacht terug.', 'Geduld is je enige aas.']),
  boeren: S('Boerenzakdoek', 'bos', 'zakdoek', '#a3c94a', 'beurt', 'meetlat', 'klein',
    ['De klei wint altijd.', 'De koeien hebben geen mening.']),
  wandeling: S('Heuvel op', 'melk', 'terrein', '#a3c94a', 'beurt', 'routebord', 'klein',
    ['De heuvel is altijd hoger.', 'Onderweg telt de grutto mee.']),
  snackketen: S('Snackbar in de keten', 'veld', 'kleed', '#b8792a', 'bal', 'entreekaartje', 'kapitaal',
    ['Alles is te frituren.', 'De keten is een familie, de rekening ook.']),
  evenementen: S('De markt is het podium', 'veld', 'vlaggen', '#cf7f5a', 'vlag', 'kermisbord', 'kapitaal',
    ['De kermis komt, de gemeente kijkt.', 'Altijd zomer, altijd herrie.']),
  regatta: S('Rondje gracht', 'veld', 'golf', '#3f8fa0', 'water', 'boeienkaart', 'klein',
    ['Windkracht drie. De ton wint.', 'Open water, dezelfde wind.']),
  ringrace: S('De ring is lang', 'nacht', 'grid', '#1e9e56', 'beurt', 'routebord', 'kapitaal',
    ['Rondje stad, tegen de klok.', 'Iedereen even snel. Behalve jij.']),
  vliegschool: S('Rondje boven de stad', 'veld', 'horizon', '#d9d4be', 'oog', 'vertrekbord', 'klein',
    ['De lucht is vrij, de wind niet.', 'Landen is het moeilijkste onderdeel.']),
  safehuis: S('De deur op slot', 'nacht', 'lijnen', '#c9a227', 'vlag', 'prikbord', 'klein',
    ['De sleutel ligt onder de mat.', 'De mat ligt binnen.']),
  pvparena: S('Ballonnen en blauwe plekken', 'bos', 'vizier', '#c9568a', 'winnaar', 'startbord', 'kapitaal',
    ['PvP: pijn zonder verlies.', 'De arena onthoudt niets.']),
  vluchtdienst: S('Dienst tussen de velden', 'veld', 'horizon', '#8fb04a', 'oog', 'vertrekbord', 'klein',
    ['De passagier kijkt, de piloot zweet.', 'Op tijd is een mening.']),
  vaardienst: S('Halte op het water', 'veld', 'golf', '#cf7f5a', 'water', 'vertrekbord', 'klein',
    ['De brug is de baas van de gracht.', 'De dienstregeling is een suggestie.']),
  // padel is geen activiteit uit activities.js maar wel een eigen bord (#599): dezelfde sfeertabel,
  // zodat het padelbord dezelfde drager krijgt als de rest en niet buiten het systeem valt.
  padel: S('Bal over het hek', 'veld', 'grid', '#c068ff', 'bal', 'startbord', 'kapitaal',
    ['De baan is van glas, het hek ook.', 'Bal over het hek is een punt. Voor de buren.']),
  // de machinist is een dienst met een eigen bord (#625); ook die hoort op de sfeerroute (#595).
  machinist: S('Vertrek op tijd', 'nacht', 'spoor', '#b3b3a2', 'beurt', 'vertrekbord', 'kapitaal',
    ['De trein wacht niet.', 'De conducteur wel.']),
  // het station heeft het vertrekbord (#596): dezelfde sfeerfamilie als de machinist, andere naam.
  station: S('Perron', 'nacht', 'halte', '#b3b3a2', 'beurt', 'vertrekbord', 'klein',
    ['De trein heeft vertraging.', 'Dat staat er tenminste.']),
};

// De sfeer van een activiteit; onbekend id geeft null (de HUD valt dan terug op geen sfeer).
export const sfeerVan = (id) => ACTIVITEIT_SFEER[id] || null;

// De vier tinten als rgba, gelijk aan TINT in carrieresfeer.js (cream en de drie groenen).
export const TINT_RGBA = {
  nacht: 'rgba(12, 20, 14, 0.62)',
  bos: 'rgba(15, 92, 48, 0.58)',
  veld: 'rgba(30, 158, 86, 0.26)',
  melk: 'rgba(240, 237, 228, 0.12)',
};

// De CSS-variabelen voor de sfeerband: tint als achtergrond, accent voor de identiteitsrand.
// Geen invoer van buiten en geen hex van buiten de accenttabel.
export function sfeerCss(s) {
  if (!s) return '';
  return `--act-accent:${s.accent};--act-tint:${TINT_RGBA[s.tint]};`;
}

// Eén regel sfeer voor de kaart/het bord: de sfeernaam plus de eerste toonregel (max 14 woorden).
export function sfeerRegel(id) {
  const s = sfeerVan(id);
  return s ? `${s.naam}. ${s.toon[0]}` : '';
}



