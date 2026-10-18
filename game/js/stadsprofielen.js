// Steden in de provincie (#67): Delfzijl, Appingedam, Veendam, Winschoten,
// Hoogezand-Sappemeer, Leek en Uithuizen as data. Per stad: waar ze ligt, een
// regel voor onder de plaatsnaam, de straten die je er herkent, de sfeer per
// dagdeel, de props die erbij horen en de winkels (verzonnen namen). The
// real streets and buildings are real places (allowed); every shop, person
// and company is made up. Pure and Node-safe: the tile layer draws the
// roads, this names and dresses them (docs/PROVINCIE-PLAN.md).
import { wgsToWorld } from './rdnew.js';

// Prop kinds are keys for the prop builders; per: how many per square km of the
// built-up area, a hint for the placer, not a promise of what is on screen.
export const TOWN_PROFILES = [
  {
    id: 'delfzijl', name: 'Delfzijl', at: [53.3313, 6.9186], reach: 1800, kind: 'haven',
    teaser: 'Haven, zeedijk en schoorstenen. Het Chemiepark bromt altijd een beetje mee.',
    streets: ['Zeedijk', 'Handelskade', 'Molenberg', 'Marktstraat', 'Westerstraat'],
    sfeer: {
      ochtend: ['Een scheepshoorn in de verte. De haven is al uren wakker.', 'Het ruikt naar zout en motorolie. Dat is hier een goed teken.'],
      middag: ['Op de Zeedijk staan mensen naar de schepen te kijken alsof het televisie is.', 'Een vrachtwagen met een lading die niemand benoemt, rijdt langzaam voorbij.'],
      avond: ['De schoorstenen aan de overkant branden oranje tegen de lucht.', 'Op het Molenberg-terras klinkt een accordeon, maar net niet in de maat.'],
    },
    props: [{ kind: 'bolder', per: 14 }, { kind: 'container', per: 6 }, { kind: 'vuurtoren', per: 0.5 }, { kind: 'vlaggenmast', per: 3 }],
    shops: [
      { kind: 'bakker', name: 'Bakkerij De Kielzog', line: 'Een krentenbol voor onderweg? Dan haal je de boot nog.' },
      { kind: 'viskraam', name: 'Visboer Kuttergat', line: 'Vers van de steiger, dat zegt hij elke dag.' },
      { kind: 'cafe', name: 'Café De Zoute Steiger', line: 'Bij het raam zit de kapitein die nooit vaart.' },
    ],
  },
  {
    id: 'appingedam', name: 'Appingedam', at: [53.3226, 6.8588], reach: 1500, kind: 'gracht',
    teaser: 'Hangende keukens boven het Damsterdiep. Hier mag je gewoon even kijken in andermans achtertuin.',
    streets: ['Wijkstraat', 'Dijkstraat', 'Damsterdiep', 'Boterdiep', 'Julianalaan'],
    sfeer: {
      ochtend: ['Boven het Damsterdiep klinkt een koffiezetapparaat. Dat is een hangende keuken die opstaat.', 'De brug gaat open voor één bootje. Zeven fietsers wachten gelaten.'],
      middag: ['Op de Wijkstraat is het druk, behalve bij de winkel die gesloten is voor de middag.', 'Een toerist maakt een foto van een keuken. De keuken maakt er een terug.'],
      avond: ['De lichtjes spiegelen in het diep. Het is hier opeens heel romantisch.', 'Een eend loopt over de brug alsof ze de gemeente is.'],
    },
    props: [{ kind: 'brug', per: 2 }, { kind: 'bloembak', per: 12 }, { kind: 'fietsenrek', per: 8 }, { kind: 'wasdraad', per: 3 }],
    shops: [
      { kind: 'bakker', name: 'Banketbakker De Hangende Taart', line: 'Alles wat hier wordt gebakken, hangt even boven het water.' },
      { kind: 'cadeau', name: 'Cadeauwinkel Ooievaarsnest', line: 'Voor wie de keuken niet kan meenemen.' },
      { kind: 'cafe', name: 'Eetcafé Diepe Gedachten', line: 'De soep van de dag staat op het krijtbord. Of was dat gisteren?' },
    ],
  },
  {
    id: 'veendam', name: 'Veendam', at: [53.1058, 6.8756], reach: 2000, kind: 'veen',
    teaser: 'Lange diepen, rechte wegen en schippers uit het veen. Alles ligt hier in een lijn.',
    streets: ['Winschoterdiep', 'Wildervanklaan', 'Raadhuisstraat', 'Kerkstraat', 'Zuiderdiep'],
    sfeer: {
      ochtend: ['Over het Winschoterdiep ligt een lage mist, het licht komt er recht doorheen.', 'Een trekker met een kar vol aardappelen tuft over de brug.'],
      middag: ['De winkelstraat is vol: de Veenkoloniën doen hier de boodschappen.', 'Iemand legt uit hoe het veen is afgegraven. Iedereen knikt, niemand luistert.'],
      avond: ['Langs het diep zitten mensen op een bank, met het water als televisie.', 'In de verte brandt een lamp op een zeilschip dat nergens heen gaat.'],
    },
    props: [{ kind: 'schuit', per: 3 }, { kind: 'aardappelkist', per: 5 }, { kind: 'brug', per: 1.5 }, { kind: 'bank', per: 6 }],
    shops: [
      { kind: 'bakker', name: 'Bakkerij Het Veenbrood', line: 'Zwaar brood, goed voor de maag en voor het geweten.' },
      { kind: 'markt', name: 'Aardappelhuisje Stoofpeer', line: 'Je kunt de aardappel bij naam vragen. Hij kent er achttien.' },
      { kind: 'cafe', name: 'Café De Lange Diep', line: 'Hier zit het verhaal, de bar is maar bijzaak.' },
    ],
  },
  {
    id: 'winschoten', name: 'Winschoten', at: [53.1444, 7.0356], reach: 2000, kind: 'graan',
    teaser: 'Molens op de wal, graan tot aan de horizon. De kermis houdt hier van een goede wind.',
    streets: ['Torenstraat', 'Langestraat', 'Marktstraat', 'Stationsstraat', 'Molenweg'],
    sfeer: {
      ochtend: ['De molen draait traag. Het graan daarachter beweegt mee, een golf van goud.', 'Een bakker zet zijn bord buiten. Hij is er klaar voor.'],
      middag: ['Op de markt hangt een geur van gebakken vis en suikerspinnen.', 'Een tractor komt de stad in. Niemand kijkt op, dit is gewoon dinsdag.'],
      avond: ['Boven het park hangt een roze lucht. Mensen zeggen mooi zonder te praten.', 'Ergens wordt gelachen om een grap die al drie jaar rondgaat.'],
    },
    props: [{ kind: 'molen', per: 0.4 }, { kind: 'graanbaal', per: 6 }, { kind: 'bank', per: 6 }, { kind: 'vlaggenmast', per: 2 }],
    shops: [
      { kind: 'bakker', name: 'Graanbakkerij De Volle Aar', line: 'Brood van het land hiernaast, zo vers als het kan.' },
      { kind: 'kermis', name: 'Zweefmolen De Oldambtster', line: 'Honderd rondjes voor een tientje. Je maag mag zelf kiezen.' },
      { kind: 'cafe', name: 'Brasserie Het Windstille Hoekje', line: 'De terrasstoelen staan altijd op de wind.' },
    ],
  },
  {
    id: 'hoogezand', name: 'Hoogezand-Sappemeer', at: [53.1612, 6.77], reach: 2400, kind: 'diep',
    teaser: 'Twee dorpen aan één diep. Wie zegt waar de ene ophoudt, mag het aan de bank vertellen.',
    streets: ['Hoofdstraat', 'Winschoterdiep', 'Kerklaan', 'Stationsweg', 'Dorpsstraat'],
    sfeer: {
      ochtend: ['Schippers groeten elkaar niet, ze knikken hooguit.', 'Een bus stopt, niemand stapt uit. De bus gaat toch maar weer.'],
      middag: ['Aan het Winschoterdiep staat een rij mensen te wachten op een brug die nog even dicht blijft.', 'Het winkelcentrum is vol. De parkeerplaats is een legende.'],
      avond: ['De lichtjes van de fabriek spiegelen in het diep, er klinkt een zacht gebrom.', 'Een jongen oefent op de trompet. Hij is niet slecht, maar ook niet goed.'],
    },
    props: [{ kind: 'brug', per: 1.5 }, { kind: 'bolder', per: 6 }, { kind: 'fietsenrek', per: 7 }, { kind: 'bank', per: 5 }],
    shops: [
      { kind: 'bakker', name: 'Bakker Twee Dorpen', line: 'Tompouce met één of twee glazuurlagen: ga ze zoeken.' },
      { kind: 'sport', name: 'Sporthuis De Zwarte Piste', line: 'Voor wie wil hardlopen, maar liever eerst kijkt.' },
      { kind: 'cafe', name: 'Café De Dubbele Naam', line: 'Er hangt een bord: Hier is het Hoogezand. Of Sappemeer.' },
    ],
  },
  {
    id: 'leek', name: 'Leek', at: [53.1639, 6.3764], reach: 1600, kind: 'park',
    teaser: 'Het kasteelpark van Nienoord ligt om de hoek. Hier gaat alles een tikje rustiger.',
    streets: ['Hoofdstraat', 'Stationsstraat', 'Nienoord', 'Kerkstraat', 'Marktstraat'],
    sfeer: {
      ochtend: ['Het is stil in het park. Een koets staat te wachten alsof hij net is gekomen.', 'Een fietser zingt zacht en denkt dat niemand het hoort.'],
      middag: ['Op de Hoofdstraat is het rustig. Een hond ligt midden op het zebrapad en heeft gelijk.', 'Bij de bakker staat de rij tot buiten: er is net iets vers uit de oven.'],
      avond: ['De koetsen zijn gestald. De paarden snuiven in de schemer.', 'Een schaduw glijdt over het gras. Het is een hert. Of een jongen met een hond.'],
    },
    props: [{ kind: 'koets', per: 0.5 }, { kind: 'boom', per: 20 }, { kind: 'bank', per: 6 }, { kind: 'bloembak', per: 8 }],
    shops: [
      { kind: 'bakker', name: 'Banketbakkerij Het Kasteeltje', line: 'Taart voor een koets of voor een stoeltje op het gras.' },
      { kind: 'cadeau', name: 'Rijtuig & Co', line: 'Souvenirs in de vorm van een wiel.' },
      { kind: 'cafe', name: 'Theehuis De Paardenstal', line: 'Thee in een kopje dat ouder is dan jij.' },
    ],
  },
  {
    id: 'uithuizen', name: 'Uithuizen', at: [53.4097, 6.6753], reach: 1400, kind: 'borg',
    teaser: 'Een borg met een gracht, een dijk met uitzicht. Het Hogeland op zijn best.',
    streets: ['Menkemaweg', 'Kerkstraat', 'Havenstraat', 'Dijkstraat', 'Westeinde'],
    sfeer: {
      ochtend: ['De wind staat recht van de zee. Je hoort de dijk bijna denken.', 'Een tractor rijdt de akker op. De ganzen vinden het goed.'],
      middag: ['Bij de borg lopen schoolklassen langs de gracht. De gids vertelt bijna alles goed.', 'Op de dijk staat een bankje met de mooiste achterkant van Nederland.'],
      avond: ['De lampjes in de tuin gaan aan. Het ruikt naar gras en zout.', 'Ver weg kraait een haan. Het is half acht, het is een late haan.'],
    },
    props: [{ kind: 'gracht', per: 1 }, { kind: 'schaap', per: 15 }, { kind: 'windmolen', per: 0.3 }, { kind: 'bank', per: 5 }],
    shops: [
      { kind: 'bakker', name: 'Bakker De Kleine Borg', line: 'Het brood is groot, het winkeltje is klein.' },
      { kind: 'markt', name: 'Boerderijwinkel Zoute Klei', line: 'Eieren, kaas en een mening over het weer.' },
      { kind: 'cafe', name: 'Dorpscafé De Zeedijk', line: 'Bij het raam zit de gids van gisteren, hij oefent.' },
    ],
  },
];

export const TOWN_BY_ID = new Map(TOWN_PROFILES.map((t) => [t.id, t]));
export const TOWN_BY_NAME = new Map(TOWN_PROFILES.map((t) => [t.name, t]));
export const DAYPARTS = ['ochtend', 'middag', 'avond'];

// world position of a profile's centre
export function townCentre(t) { const [x, y] = wgsToWorld(t.at[0], t.at[1]); return { x, y }; }

// the profile for a place name from the tiles ("Delfzijl", "Hoogezand", "Sappemeer"), or null
export function townProfile(name) {
  if (!name) return null;
  const hit = TOWN_BY_NAME.get(name);
  if (hit) return hit;
  return name === 'Hoogezand' || name === 'Sappemeer' ? TOWN_BY_ID.get('hoogezand') : null;
}

// the town a world point is in (nearest centre within its reach), or null
export function townAt(x, y) {
  let best = null, bestD = Infinity;
  for (const t of TOWN_PROFILES) {
    const c = townCentre(t);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= t.reach && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

export function daypart(hour) {
  const h = ((hour % 24) + 24) % 24;
  return h < 12 ? 'ochtend' : h < 18 ? 'middag' : 'avond';
}

// one ambience line for the hour, avoiding `last` when there is a choice
export function sfeerLine(t, hour, rng = Math.random, last = '') {
  const lines = t.sfeer[daypart(hour)];
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
