// Samen spelen (#527): de hub met drie stappen, als regels. De speler heeft altijd dezelfde drie vragen:
// waar speel je (een openbare sessie, zelf openen of besloten), met wie (spelers, kamercode) en start (de knoppen
// die de sessie echt beginnen, en de uitweg). Dit bestand is puur: geen DOM, geen netwerk, geen opslag, zodat
// `node scripts/samenhub_test.mjs` de hele hub zonder browser kan doorlopen. Nederlands waar de speler het leest,
// Engels in de code (ADR 0017).
//
// De vraag "kan ik hierbij" wordt niet opnieuw bedacht: die komt uit sessiekeuze.js (kies()), en de instelling
// onlineMeedoen wordt door de aanroeper gelezen (settings.magOnline) en hier als `meedoen` meegegeven.
import { kies, KEUZE } from './sessiekeuze.js';

export const STAP = { WAAR: 'waar', METWIE: 'metwie', START: 'start' };

// De drie stappen in de volgorde waarin een speler ze tegenkomt.
export const STAPPEN = [
  { id: STAP.WAAR, label: 'Waar speel je', hint: 'Meedoen met een openbare sessie, zelf openen, of besloten' },
  { id: STAP.METWIE, label: 'Met wie', hint: 'Wie er meespelen en de kamercode' },
  { id: STAP.START, label: 'Start', hint: 'De sessie beginnen, of ontsnappen naar besloten' },
];

// De drie keuzes van stap 1: dezelfde drie als in het issue, niet de vier knoppen van het oude beginscherm van de
// lobby (#95), die dezelfde vraag met andere woorden stelt. "Meedoen" opent het aansluitscherm van de lobby: daar
// staat de lijst met openbare sessies én het veld voor een kamercode, dus de speler hoeft niet vooraf te weten welke
// van de twee hij wil.
export const ACT = {
  MEEDOEN: 'meedoen', HOSTEN: 'hosten', BESLOTEN: 'besloten',
  CODE: 'code', ALLEEN: 'alleen', SPELERS: 'spelers', START: 'start', ONTSNAP: 'ontsnap', TERUG: 'terug',
};
export const KEUZES = [
  { act: ACT.MEEDOEN, label: 'Meedoen', sub: 'Een openbare sessie uit de lijst, of de kamercode van een vriend' },
  { act: ACT.HOSTEN, label: 'Zelf een sessie openen', sub: 'Jij opent de wereld en geeft de anderen de kamercode' },
  { act: ACT.BESLOTEN, label: 'Besloten spelen', sub: 'Alleen, of met vrienden via een kamercode; niets komt in een lijst' },
];

const stappen = STAPPEN.map((s) => s.id);
const index = (stap) => Math.max(0, stappen.indexOf(stap));
export const stapIndex = (stap) => index(stap);
export const isStap = (stap) => stappen.includes(stap);

export function volgendeStap(stap) {
  return stappen[(index(stap) + 1) % stappen.length];
}
export function vorigeStap(stap) {
  return stappen[(index(stap) + stappen.length - 1) % stappen.length];
}

// Escape binnen de hub: één stap terug, en vanaf de eerste stap de hub uit (null; dan sluit het menu of gaat het
// naar Spel > Overzicht). Deze functie raakt geen sessie aan: de hub kent geen "stop" en roept er ook geen aan.
export function escapeStap(stap) {
  return isStap(stap) && stap !== STAP.WAAR ? vorigeStap(stap) : null;
}

// Waar Spel > Samen spelen opent: de hub als er nog geen sessie loopt, de bestaande schermen (uitnodigen, spelers)
// zodra er wel een sessie is. Een bewaarde keuze van de speler gaat voor.
export function landStap({ loopt = false, pref = '' } = {}) {
  if (loopt) return pref === 'spelers' ? 'spelers' : 'samen';
  if (pref === 'samen' || pref === STAP.WAAR) return pref;
  return STAP.WAAR;
}

// De sessie zoals de hub hem leest. `net` is world.coopNet; de hub raakt coopnet.js zelf niet aan, zodat de
// regels ook zonder wereld te testen zijn.
export function sessieVan(net) {
  if (!net) return null;
  const host = net.role === 'host';
  const roster = host && net.hub ? net.hub.roster : null;
  const welkom = !host && net.session ? net.session.welcome : null;
  const spelers = host ? (roster && Array.isArray(roster.spelers) ? roster.spelers.length : 1)
    : (welkom && Array.isArray(welkom.lijst) ? welkom.lijst.length : 2);
  const max = host ? (roster && roster.max) || 0 : (welkom && welkom.max) || 0;
  const naam = net.openbaar && net.openbaar.naam ? String(net.openbaar.naam) : '';
  return { rol: host ? 'host' : 'gast', spelers, max, code: String(net.kamerCode || ''), openbaar: !!naam, naam };
}

// Wat stap 1 toont: per keuze of hij nu kan en waarom (niet), plus waar de sessiekeuze op uitkomt. `gekeken` zegt
// of de openbare lijst al is opgehaald; zonder dat oordeelt de hub niet over kandidaten (hij heeft nog niets gezien
// en mag ook nog niets ophalen: vóór de toestemming gaat er niets naar buiten, #526).
export function stapWaar({ rijen = [], meedoen = null, eigenId = '', sessie = null, gekeken = false } = {}) {
  const k = kies({ rijen, meedoen, eigenId });
  const aantal = Array.isArray(k.kandidaten) ? k.kandidaten.length : 0;
  // Zonder toestemming mag er niets naar buiten (#526, ADR 0022). De hub haalt zelf geen lijst op en stuurt niets;
  // het aansluitscherm van de lobby vraagt de toestemming en pas daarna gaat er iets het net op. De regel zegt dat,
  // en belooft niet dat er al iets klaarstaat.
  const meedoenUitleg = sessie
    ? 'Je zit al in een sessie; Stap 3 zegt hoe je verdergaat of eruit gaat.'
    : meedoen !== true
      ? 'Je gaf nog geen toestemming voor online spelen: het aansluitscherm vraagt die eerst, daarna pas gaat er iets naar buiten.'
      : !gekeken
        ? 'Op het aansluitscherm zie je de openbare sessies en het veld voor een kamercode.'
        : aantal
          ? `${aantal} ${aantal === 1 ? 'sessie past' : 'sessies passen'} bij je${k.sessie && k.sessie.naam ? `, de drukste is "${k.sessie.naam}"` : ''}.`
          : (k.reden || 'Er is nu geen sessie om bij aan te sluiten.');
  return {
    stap: STAP.WAAR, sessie, doen: k.doen, kandidaten: k.kandidaten || [],
    keuzes: KEUZES.map((c) => ({
      ...c,
      kan: c.act === ACT.BESLOTEN || !sessie,
      uitleg: c.act === ACT.MEEDOEN ? meedoenUitleg
        : c.act === ACT.HOSTEN ? (sessie ? 'Deze sessie is al van jou of van iemand anders.' : 'Je krijgt een kamercode die je aan de anderen geeft.')
          : c.sub,
    })),
  };
}

// Wat een keuze met de stappen doet, en welke stappen van de lobby (lobby.js, dezelfde namen als de knoppen van
// lobbyui.js) er daarna komen. De hub begint niets zelf: hij wijst de bestaande lobby de weg met `rol` en `lijst`,
// precies de twee waarden die createLobby al kent (paneel: samenpanel.js naarLobby).
// Meedoen opent 'gast-typt': dat scherm heeft het veld voor een kamercode én de knop Openbare sessies, dus de speler
// hoeft op stap 1 niet te kiezen welke van de twee hij bedoelt.
export function actieVan(act, { sessie = null } = {}) {
  if (sessie) {
    // er loopt al een sessie: geen keuze opent een nieuwe; stappen 2 en 3 tonen wat er is
    return { stap: act === ACT.MEEDOEN || act === ACT.CODE ? STAP.METWIE : STAP.START, rol: null, lijst: false, lobby: [] };
  }
  switch (act) {
    case ACT.MEEDOEN:
      return { stap: STAP.METWIE, rol: 'gast', lijst: false, lobby: [{ t: 'kies', rol: 'gast' }] };
    case ACT.HOSTEN:
      return { stap: STAP.METWIE, rol: 'host', lijst: false, lobby: [{ t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }] };
    case ACT.CODE:
      return { stap: STAP.METWIE, rol: 'gast', lijst: false, lobby: [{ t: 'kies', rol: 'gast' }] };
    case ACT.ALLEEN:
      return { stap: STAP.START, rol: null, lijst: false, lobby: [], sluit: true };
    default:
      return { stap: STAP.WAAR, rol: null, lijst: false, lobby: [] };
  }
}

// Stap 2: wie er echt zijn en welke code er is. Een vriendenlijst bestaat niet in deze code (de sterren van de
// openbare lijst komen het dichtst in de buurt, #464); de hub doet niet alsof. Zonder sessie is dit de plek waar
// "besloten" zijn twee vormen krijgt: alleen, of met de kamercode van iemand anders.
export function stapMetWie({ sessie = null, gasten = 0, laatsteCode = '', besloten = false } = {}) {
  const rijen = [];
  if (sessie) {
    rijen.push({ soort: 'rol', tekst: sessie.rol === 'host' ? 'Jij opende deze sessie.' : 'Je speelt mee in het spel van een ander.' });
    rijen.push({ soort: 'spelers', tekst: `${sessie.spelers}${sessie.max ? ` van ${sessie.max}` : ''} ${sessie.spelers === 1 ? 'speler' : 'spelers'} in deze sessie.` });
    if (sessie.code) rijen.push({ soort: 'code', tekst: `De kamercode is ${sessie.code}: wie die invoert, komt erbij.` });
    rijen.push(sessie.openbaar
      ? { soort: 'openbaar', tekst: `Deze sessie staat als "${sessie.naam}" in de openbare lijst.` }
      : { soort: 'besloten', tekst: 'Deze sessie staat niet in een lijst: alleen wie de code kent, komt erbij.' });
    if (gasten) rijen.push({ soort: 'gasten', tekst: `${gasten} ${gasten === 1 ? 'speler is' : 'spelers zijn'} nu verbonden.` });
  } else if (besloten) {
    rijen.push({ soort: 'leeg', tekst: 'Besloten: er gaat niets naar buiten en niemand komt er zomaar bij.' });
  } else {
    rijen.push({ soort: 'leeg', tekst: 'Er is nog geen sessie. Kies eerst bij Waar speel je hoe je samen speelt.' });
  }
  if (laatsteCode) rijen.push({ soort: 'eerder', tekst: `De code waar je het laatst mee meedeed: ${laatsteCode}.` });
  const knoppen = sessie
    ? [{ act: 'spelers', label: 'Spelers' }, { act: 'lobby', label: 'Uitnodigen of aansluiten' }, { act: 'volgende', label: 'Verder naar Start', primary: true }]
    : besloten
      ? [{ act: ACT.ALLEEN, label: 'Alleen spelen', primary: true }, { act: ACT.CODE, label: 'Meedoen met een kamercode' }]
      : [{ act: ACT.TERUG, label: 'Kies eerst waar je speelt', primary: true }];
  return { stap: STAP.METWIE, sessie, rijen, laatsteCode, knoppen };
}

// Stap 3: de knoppen die de sessie echt beginnen (net als de wachtkamer: minstens twee spelers), en de uitweg.
// Ontsnappen is een eigen knop en nooit een bijwerking van Escape.
export function stapStart({ sessie = null, genoeg = false, wachtOpAnder = false } = {}) {
  if (!sessie) {
    return { stap: STAP.START, sessie, knoppen: [{ act: ACT.TERUG, label: 'Kies eerst waar je speelt', primary: true }], uitleg: 'Er loopt nog geen sessie, dus er valt nog niets te starten.' };
  }
  const knoppen = [];
  if (sessie.rol === 'gast') knoppen.push({ act: ACT.START, label: wachtOpAnder ? 'Wacht op wie het spel opende' : 'Je speelt mee', primary: true, disabled: true });
  else knoppen.push({ act: ACT.START, label: 'Spel starten', primary: true, disabled: !genoeg });
  knoppen.push({ act: ACT.ONTSNAP, label: 'Ontsnappen naar besloten' });
  return {
    stap: STAP.START, sessie, knoppen,
    uitleg: sessie.rol === 'gast'
      ? (wachtOpAnder ? 'De wereld begint zodra wie het spel opende op Spel starten drukt.' : 'Je speelt mee in de wereld van een ander. Je kunt er elk moment uit; je komt terug waar je was.')
      : genoeg ? 'Iedereen begint samen: ook de openingsscène zien jullie samen.' : 'Wacht op een medespeler: je kunt het spel starten zodra er minstens twee spelers zijn.',
  };
}

// De hele stap in één object: wat het scherm tekent en wat de aanroeper nodig heeft.
export function hubView(stap, opts = {}) {
  const nu = isStap(stap) ? stap : STAP.WAAR;
  const view = nu === STAP.METWIE ? stapMetWie(opts) : nu === STAP.START ? stapStart(opts) : stapWaar(opts);
  return { ...view, stap: nu, stappen: STAPPEN, nummer: index(nu) + 1, totaal: STAPPEN.length, escape: escapeStap(nu) };
}

export { KEUZE, kies };
