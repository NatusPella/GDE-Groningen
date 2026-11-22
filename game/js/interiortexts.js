// All player-facing text of the interiors (epic Interieurs, #1150): prompts at the spots of use, what the people behind the
// counter say, the closed-door lines. Text only, Dutch, invented names; nothing is voiced. Code in interiors.js reads these.
export const PROMPT = {
  kopen: { label: 'Kopen', sub: 'Bij de kassa' },
  bestellen: { label: 'Bestellen', sub: 'Aan de bar' },
  kappen: { label: 'Plaatsnemen', sub: 'In de kappersstoel' },
  passen: { label: 'Passen', sub: 'Het pashokje' },
  balie: { label: 'Naar de balie', sub: 'Even vragen' },
  kaars: { label: 'Kaarsje aansteken', sub: 'Een rustig momentje' },
  kaartje: { label: 'Naar het loket', sub: 'Kaartje halen' },
  lezen: { label: 'Boeken inkijken', sub: 'Stil zijn graag' },
  rondkijken: { label: 'Rondkijken', sub: 'Gezellig ingericht' },
};

export const LOCKED_HOME = ['De deur zit op slot.', 'Niemand thuis. De deur blijft dicht.', 'Aanbellen helpt niet: er is niemand.', 'Op slot, en de gordijnen zijn dicht.'];

// the line of the person at the counter, by kind (a counter, a bar, a desk)
const CLERK = {
  winkel: ['Zoekt u iets bijzonders?', 'Mooi weer, hè? Kijk gerust rond.', 'Alles in de aanbieding vandaag, behalve de dingen die niet in de aanbieding zijn.', 'Pinnen mag. Contant ook. Zolang het maar geen eierballen zijn.'],
  horeca: ['Zegt u het maar.', 'De koffie is warm en de grappen zijn gratis.', 'Gezellig dat u er bent. Zoek maar een plekje.'],
  kantoor: ['Heeft u een afspraak? Nee? Dan heeft u hem nu.', 'De directeur is in een vergadering. Hij is altijd in een vergadering.'],
  publiek: ['Pak een nummertje en neem plaats.', 'U bent bij de verkeerde balie, maar ik help u toch even.', 'Het formulier staat online. Het online formulier staat bij ons.'],
  garage: ['Het kan, maar het kost wat.', 'Dat geluid? Dat hoort zo, zeg ik altijd.'],
  bibliotheek: ['Sst. Maar goed dat u er bent.', 'Boeken mag u twee weken houden. Drie als u lief kijkt.'],
  station: ['Het kaartje kost wat het kost.', 'De trein is er zo. Waarschijnlijk.'],
};
// by variant of a public building (a museum desk talks about the museum)
const CLERK_SUB = {
  museum: ['Een kaartje? De Geit met Gitaar hangt op de eerste verdieping. Of beneden. Hij beweegt.', 'Niet aanraken, ook niet als het mooi is. Zeker niet als het mooi is.', 'Elke dag open en elke dag gratis stil.'],
  bioscoop: ['De film begint zo. Of nu. Of eigenlijk al een kwartier.', 'Popcorn zout of zoet? Zout. Altijd zout.', 'Zaal één is helemaal vol, zaal twee ook. Er is maar één zaal.'],
  school: ['De les is bezig. Zachtjes lopen, graag.', 'Ouders melden zich hier. Leerlingen liever niet.', 'Het schoolplein is van iedereen. De fietsenstalling alleen van de leraren.'],
  ziekenhuis: ['Neemt u plaats. Het duurt even, maar het wordt vast niet erg.', 'Heeft u een afspraak? Dan wacht u hier. Zonder afspraak ook.', 'De koffieautomaat is stuk. Dit is geen grap.'],
};
export const clerkLine = (kind, seed, n = 0, sub = null) => { const l = CLERK_SUB[sub] || CLERK[kind] || CLERK.winkel; return l[Math.floor(((seed >>> 0) + n * 7) % l.length)]; };

// walking around in a home: one line per look, by the seed
export const HOME_LOOK = ['Een gezellige kamer met te veel kussens.', 'Er staat een plant die het goed doet. Of nep is.', 'Op de kast staat een foto van een geit met een bos bloemen.', 'Het ruikt hier naar koffie en kruidkoek.', 'De bank heeft een kuil met een vorm: die van iemand die hier vaak zit.'];
export const CHURCH_CANDLE = ['Je steekt een kaarsje aan. Het is even stil.', 'Een kaarsje voor wie het nodig heeft.'];
export const TICKET_LINES = ['Het loket zegt: pin maar, kaartjes zijn er vanaf de volgende missie.', 'Een kaartje naar nergens, die bestaat niet. Het loket probeert het toch.'];
export const LEZEN = ['Je bladert door een boek over de geschiedenis van het veen. Het blijft bij bladeren.', 'Een stripboek over een geit die burgemeester wordt. Je leest de eerste pagina.', 'Een kookboek met alleen aardappelen. Op elke pagina.'];

// what a generic purchase says: {item}, {price}
export const FITTING = ['Je trekt het gordijn dicht. De spiegel is eerlijk, maar de zomer is mild.', 'Het pashokje ruikt naar nieuwe stof. Staat je goed.'];
export const HAIRCUT = ['De kapper pakt de schaar: "Zoals altijd?" Je hebt nog nooit eerder gezeten.', 'Een kwartier later heb je een kapsel dat bij de zomer past.'];
export const BOUGHT = (item, price) => `${item} gekocht voor €${price}.`;
export const TOO_POOR = (item, price) => `Te weinig geld voor ${item} (€${price}).`;
export const NOT_FOR_SALE = 'Hier valt niets te kopen.';
