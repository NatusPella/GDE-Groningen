// Het model achter het Spullen-raster van het pauzemenu (menu-ronde 21-11, #1013): in welke categorie een ding valt, hoe de tegels
// gesorteerd worden, welk aantal op de tegel staat, en wat weggooien is (alleen eten, met een bevestiging die zegt dat het niet terug
// kan). Puur: geen DOM, geen wereld buiten wat de aanroeper meegeeft. spullen.js tekent het raster; test: scripts/spullenmodel_test.mjs.
// Samen spelen: Spullen zijn per speler (#429); weggooien raakt alleen de eigen voorraad van wie het menu opent.
//
// Wat dit spel NIET heeft: gewicht (er is geen draaglimiet), sleutels en missie-items als bezit. Het scherm doet dus ook niet alsof:
// de categorieën zijn alleen wat er echt is.
import { voegEtenToe } from './eten.js';

// [id, label]: de tabs boven het raster. Alles toont ook het geld; de andere tabs gaan over spullen.
export const CATS = [
  ['alles', 'Alles'], ['wapens', 'Wapens'], ['kleding', 'Kleding'], ['voedsel', 'Voedsel'],
  ['upgrades', 'Upgrades'], ['thuis', 'Thuis'], ['verzameling', 'Verzamelingen'],
];
// de interne groep van een ding (spullen.js collect) naar de tab
export const CAT_VAN = { geld: 'geld', wapens: 'wapens', werp: 'wapens', kleding: 'kleding', eten: 'voedsel', upgrade: 'upgrades', thuis: 'thuis', kaart: 'verzameling' };
export const catVan = (it) => CAT_VAN[it && it.cat] || 'alles';

// Wat er in een lege tab staat: waar je het vindt, in plaats van een leeg vlak.
export const LEEG = {
  alles: 'Je hebt nog niets bij je. Kijk bij Pang & Zo, Stoer & Stads en de toonbank van de snackbar.',
  wapens: 'Nog geen wapens. Pang & Zo verkoopt er een paar.',
  kleding: 'Nog geen extra kleding. Stoer & Stads heeft losse stukken en setjes.',
  voedsel: 'Nog niets te eten. De toonbank verkoopt snacks; wat je vangt, gaat mee naar huis.',
  upgrades: 'Nog geen upgrades. Knal & Kolder Tuning en Spaak & Band helpen je graag.',
  thuis: 'Nog geen meubels. Het meubelhuis heeft ze; thuis zet je ze neer.',
  verzameling: 'Nog niets verzameld.',
};

export const SORTS = [['soort', 'Standaard'], ['naam', 'Op naam'], ['aantal', 'Op aantal']];
export const cycleSort = (id) => SORTS[(SORTS.findIndex(([s]) => s === id) + 1) % SORTS.length][0];
export const sortLabel = (id) => (SORTS.find(([s]) => s === id) || SORTS[0])[1];

const naam = (a, b) => String(a.title).localeCompare(String(b.title), 'nl');
// Geld staat altijd vooraan (het is je portemonnee, geen ding). Standaard houdt de volgorde van de bron aan (per soort);
// op naam is A tot Z; op aantal gaat de grootste stapel voor en de rest op naam.
export function sorteer(items, sort = 'soort') {
  const geld = items.filter((it) => it.cat === 'geld');
  const rest = items.filter((it) => it.cat !== 'geld');
  if (sort === 'naam') rest.sort(naam);
  else if (sort === 'aantal') rest.sort((a, b) => (b.aantal || 0) - (a.aantal || 0) || naam(a, b));
  return [...rest, ...geld]; // UX-audit 23-11 (S14): het geld staat al in de kop; de tegel (met het kasboek) sluit de rij af
}

// Het getal op de tegel: een aantal boven nul, "99+" als het groot is. Leeg zonder aantal.
export const badgeTekst = (it) => {
  if (it && it.leeg) return 'Leeg'; // een wapen zonder patronen zegt dat op de tegel, in plaats van niets (of een 0)
  const n = it && Number(it.aantal);
  return Number.isFinite(n) && n > 0 ? (n > 99 ? '99+' : '×' + Math.floor(n)) : '';
};
// Dezelfde hoeveelheid in woorden voor schermlezers en de tooltip.
export const aantalZin = (it) => { if (it && it.leeg) return 'leeg'; const n = Math.floor(Number(it && it.aantal) || 0); return n > 0 ? `${n} ${it.eenheid || (n === 1 ? 'stuk' : 'stuks')}` : ''; };

// De naam van de tegel voor een schermlezer: titel, aantal en wat hij nu is ("in de hand").
export const tegelNaam = (it) => [it.title, aantalZin(it), it.side].filter(Boolean).join(', ');

// --- Weggooien ---
// Alleen eten is weg te gooien: het is een stapel stuks zonder verhaal. Wapens, kleding, meubels en upgrades zijn gekocht of
// verdiend en horen bij je spel; die weggooien is geen keuze maar een ongeluk. Een item meldt zich met `weg: { id, aantal }`.
export const kanWeggooien = (it) => !!(it && it.weg && it.weg.id && it.weg.aantal > 0);
export const WEGGOOI_VRAAG = 'Weggooien? Dit kan niet terug.';

// De bevestiging als kleine toestandsmachine: null (niets gevraagd), { key, alles, stap: 'bevestig' }. Eén tegelijk; een ander
// ding kiezen of Esc annuleert. 'bevestig' voert niets uit: de aanroeper doet weggooi() als dit `{ doe: true }` teruggeeft.
export function weggooiStap(state, actie, key, alles = false) {
  if (actie === 'vraag') return { state: { key, alles: !!alles, stap: 'bevestig' }, doe: false };
  if (actie === 'annuleer') return { state: null, doe: false };
  if (actie === 'bevestig') {
    if (state && state.key === key && state.stap === 'bevestig') return { state: null, doe: true, alles: state.alles };
    return { state, doe: false };
  }
  if (actie === 'ander') return { state: state && state.key === key ? state : null, doe: false };
  return { state, doe: false };
}

// Het weggooien zelf: één stuk, of de hele stapel. Geeft de melding voor het paneel; een ding dat je niet (meer) hebt, meldt dat.
export function weggooi(w, it, alles = false) {
  if (!kanWeggooien(it)) return 'Dit kun je niet weggooien.';
  const heb = Math.floor(Number(w && w.eten && w.eten[it.weg.id]) || 0);
  if (heb <= 0) return 'Dat heb je niet bij je.';
  const n = alles ? heb : 1;
  voegEtenToe(w, it.weg.id, -n);
  return `${it.title}: ${n === 1 ? 'één stuk' : `${n} stuks`} weggegooid.`;
}

// Welke tegel de focus krijgt als `key` uit de lijst verdwijnt: de volgende, anders de vorige, anders niets.
export function naWeggooien(keys, key) {
  const i = keys.indexOf(key);
  if (i < 0) return keys[0] || null;
  return keys[i + 1] || keys[i - 1] || null;
}

// Iconen (Phosphor via icons.js, betekenisnamen uit iconmap.js): elke categorie en elk soort ding heeft er een, zodat een tegel zonder
// 3D-plaatje (geen model, geen WebGL) een passend plaatje toont en nooit het vraagteken van de terugval. Puur: alleen namen;
// scripts/spullenmodel_test.mjs vergelijkt ze met de iconenmodule.
export const CAT_ICOON = { alles: 'spullen', wapens: 'zwaard', kleding: 'kleding', voedsel: 'eten', upgrades: 'gereedschap', thuis: 'thuis', verzameling: 'ster' };
// per interne groep (it.cat) de standaardnaam, per soort (it.icon) een preciezere
export const GROEP_ICOON = { geld: 'geld', wapens: 'zwaard', werp: 'pakket', kleding: 'kleding', eten: 'eten', thuis: 'thuis', kaart: 'ster', upgrade: 'gereedschap' };
export const SOORT_ICOON = { ...GROEP_ICOON, melee: 'mes', vis: 'vis' };
export const ICOON_TERUGVAL = 'spullen';
export const itemIcoon = (it) => (it && (SOORT_ICOON[it.icon] || GROEP_ICOON[it.cat])) || ICOON_TERUGVAL;
