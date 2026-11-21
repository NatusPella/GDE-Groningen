// All player-facing text of the interiors (epic Interieurs, #1150): prompts at the spots of use, what the people behind the
// counter say, the closed-door lines. Text only, Dutch, invented names; nothing is voiced. Code in interiors.js reads these.
export const PROMPT = {
  kopen: { label: 'Kopen', sub: 'Bij de kassa' },
  bestellen: { label: 'Bestellen', sub: 'Aan de bar' },
  balie: { label: 'Naar de balie', sub: 'Even vragen' },
  kaars: { label: 'Kaarsje aansteken', sub: 'Een rustig momentje' },
  kaartje: { label: 'Naar het loket', sub: 'Kaartje halen' },
  lezen: { label: 'Boeken inkijken', sub: 'Stil zijn graag' },
  rondkijken: { label: 'Rondkijken', sub: 'Gezellig ingericht' },
};

// "Gesloten" at the door: {open} is the hour the place opens
export const CLOSED = {
  winkel: (name, open) => `${name} is gesloten. Open vanaf ${hourText(open)}.`,
  horeca: (name, open) => `${name} is dicht. Weer open om ${hourText(open)}.`,
  kantoor: (name, open) => `Dit kantoor is dicht. Maandag tot vrijdag vanaf ${hourText(open)}.`,
  kerk: (name, open) => `De kerk is dicht. Open vanaf ${hourText(open)}.`,
  bibliotheek: (name, open) => `De bibliotheek is gesloten. Open vanaf ${hourText(open)}.`,
  garage: (name, open) => `De garage is dicht. Open vanaf ${hourText(open)}.`,
  publiek: (name, open) => `Gesloten. Open vanaf ${hourText(open)}.`,
  station: (name, open) => `De stationshal is gesloten. Open vanaf ${hourText(open)}.`,
  woning: () => 'Niemand doet open. De deur zit op slot.',
};
export const LOCKED_HOME = ['De deur zit op slot.', 'Niemand thuis. De deur blijft dicht.', 'Aanbellen helpt niet: er is niemand.', 'Op slot, en de gordijnen zijn dicht.'];
export const hourText = (h) => { const hh = Math.floor(h % 24), mm = Math.round((h - Math.floor(h)) * 60); return `${hh}:${String(mm).padStart(2, '0')}`; };

// the line of the person at the counter, by kind (a counter, a bar, a desk)
export const CLERK = {
  winkel: ['Zoekt u iets bijzonders?', 'Mooi weer, hè? Kijk gerust rond.', 'Alles in de aanbieding vandaag, behalve de dingen die niet in de aanbieding zijn.', 'Pinnen mag. Contant ook. Zolang het maar geen eierballen zijn.'],
  horeca: ['Zegt u het maar.', 'De koffie is warm en de grappen zijn gratis.', 'Gezellig dat u er bent. Zoek maar een plekje.'],
  kantoor: ['Heeft u een afspraak? Nee? Dan heeft u hem nu.', 'De directeur is in een vergadering. Hij is altijd in een vergadering.'],
  publiek: ['Pak een nummertje en neem plaats.', 'U bent bij de verkeerde balie, maar ik help u toch even.', 'Het formulier staat online. Het online formulier staat bij ons.'],
  garage: ['Het kan, maar het kost wat.', 'Dat geluid? Dat hoort zo, zeg ik altijd.'],
  bibliotheek: ['Sst. Maar goed dat u er bent.', 'Boeken mag u twee weken houden. Drie als u lief kijkt.'],
  station: ['Het kaartje kost wat het kost.', 'De trein is er zo. Waarschijnlijk.'],
};
export const clerkLine = (kind, seed, n = 0) => { const l = CLERK[kind] || CLERK.winkel; return l[Math.floor(((seed >>> 0) + n * 7) % l.length)]; };

// walking around in a home: one line per look, by the seed
export const HOME_LOOK = ['Een gezellige kamer met te veel kussens.', 'Er staat een plant die het goed doet. Of nep is.', 'Op de kast staat een foto van een geit met een bos bloemen.', 'Het ruikt hier naar koffie en kruidkoek.', 'De bank heeft een kuil met een vorm: die van iemand die hier vaak zit.'];
export const CHURCH_CANDLE = ['Je steekt een kaarsje aan. Het is even stil.', 'Een kaarsje voor wie het nodig heeft.'];
export const TICKET_LINES = ['Het loket zegt: pin maar, kaartjes zijn er vanaf de volgende missie.', 'Een kaartje naar nergens, die bestaat niet. Het loket probeert het toch.'];
export const LEZEN = ['Je bladert door een boek over de geschiedenis van het veen. Het blijft bij bladeren.', 'Een stripboek over een geit die burgemeester wordt. Je leest de eerste pagina.', 'Een kookboek met alleen aardappelen. Op elke pagina.'];

// what a generic purchase says: {item}, {price}
export const BOUGHT = (item, price) => `${item} gekocht voor €${price}.`;
export const TOO_POOR = (item, price) => `Te weinig geld voor ${item} (€${price}).`;
export const NOT_FOR_SALE = 'Hier valt niets te kopen.';
export const POLICE_OUTSIDE = 'De politie staat voor de deur. Binnen houd je je koest.';
