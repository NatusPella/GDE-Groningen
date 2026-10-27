// Text for the world-flavour layer (flavour.js, flavour3d.js), after
// docs/groningen-memes.md: own wording only, no real people, fragments or
// lyrics. Tables marked "spoken" are registered in
// scripts/voicelines_collect.mjs and need a recording in the lines manifest;
// keep them plain literals so that script can read them.


// Billboards: [headline, small print]. Which one a board shows moves on with
// every story mission passed.
export const BILLBOARD_SLOGANS = [
  ['Er gaat niets boven een eierbal', 'Warm eten. Koud is een misdaad.'],
  ['Er rijdt niets boven Groningen', 'Behalve de omleiding.'],
  ['Er bouwt niets trager dan Groningen', 'Ring Zuid: bijna. Echt bijna.'],
  ['Er fietst niets harder dan Groningen', 'Voorrang? Die nemen we zelf.'],
  ['Er vergadert niets langer dan Groningen', 'Uw dossier is in behandeling.'],
  ['Er regent niets natter dan Groningen', 'Paraplu’s bij de Fietsverhuur De Ketting.'],
  ['Er waait niets harder dan Groningen', 'Hou je fiets vast. En je hoed.'],
  ['Er leidt niets mooier om dan Groningen', 'Volg de gele borden. Allemaal.'],
  ['Er zingt niets luider dan Groningen', 'Ook als we achterstaan.'],
  ['Er staat niets vaker open dan de Gerrit Krolbrug', 'Nieuwe brug: binnenkort.'],
  ['Komt u uit Steden of gaat u naar Stedum?', 'Bij twijfel: rechtdoor, dan zit u goed.'],
];

// Nicknames per place; `landmark` matches map.meta.landmarks names.
export const NICKNAMES = [
  { key: 'grieze', nick: 'd’Olle Grieze', landmark: 'Martinitoren', x: 213.81, y: 9.9 },
  { key: 'kiekdeuse', nick: 'Kiekdeuse', landmark: 'Forum Groningen', x: 356.93, y: 57.89 },
  { key: 'apenrots', nick: 'Apenrots', label: 'Het glazen netbeheerhuis', x: -883.81, y: 2051.13 },
  { key: 'cruiseschip', nick: 'Cruiseschip', label: 'Rijkskantoor Kempkensberg', x: 982.17, y: 1498.16 },
];

// spoken (bubbles): what passers-by say near a nicknamed building
export const NICKNAME_BARKS = {
  grieze: [
    'Kiek, d’Olle Grieze staat er nog.',
    'Zolang d’Olle Grieze staat, is t goed.',
    'Vanaf d’Olle Grieze zie je heel Grunn.',
  ],
  kiekdeuse: [
    'De Kiekdeuse. Je kunt er niet omheen kijken.',
    'Boven in de Kiekdeuse is het uitzicht gratis.',
    'Kiekdeuse, zeggen wij. Doos met ramen.',
  ],
  apenrots: [
    'Dat is de Apenrots. Daar zitten ze hoog, met de dossiers.',
    'In de Apenrots vergaderen ze al jaren over de gaskraan.',
  ],
  cruiseschip: [
    'Het Cruiseschip. Ligt aan de ring en vaart nooit uit.',
    'Op het Cruiseschip rekenen ze je studieschuld uit.',
    'Mooi schip, dat Cruiseschip. Alleen geen zee.',
  ],
};

// spoken (the player's own voice, as a bubble): back near the Martinitoren
export const BIJNA_THUIS = [
  'd’Olle Grieze in zicht. Bijna thuis.',
  'Daar is d’Olle Grieze weer. Dan zit het goed.',
  'Bijna thuis. d’Olle Grieze wacht al.',
];

// Gerrit Krolbrug: a new malfunction every time you pass. spoken (radio)
export const KROLBRUG_FAULTS = [
  'De Gerrit Krolbrug meldt een storing aan de slagboom. Volg de omleiding.',
  'De Gerrit Krolbrug staat open. Niemand weet waarom. De omleiding is verlengd.',
  'Storing aan de Gerrit Krolbrug: de brug wil wel, de software niet.',
  'De Gerrit Krolbrug is in overleg met zichzelf. Reken op vertraging.',
  'Er zwaaide een schipper naar de Gerrit Krolbrug. Uit voorzorg is hij dicht.',
  'De Gerrit Krolbrug heeft last van het weer. Welk weer maakt niet uit.',
  'Nieuws over de Gerrit Krolbrug: de nieuwe brug komt eraan. Datum volgt.',
  'De Gerrit Krolbrug doet het weer. Grapje. De omleiding blijft staan.',
];
// the detour sign, one step more monumental per pass
export const KROLBRUG_SIGNS = [
  'OMLEIDING',
  'OMLEIDING U2',
  'OMLEIDING U2 → U7 → U2',
  'TIJDELIJKE OMLEIDING (SINDS ALTIJD)',
  'OMLEIDINGSCENTRUM GERRIT KROL · INFO: LOKET 4',
  'NIEUWE BRUG · OPLEVERING: BINNENKORT',
];

// spoken (navigation voice) near the Zuidelijke Ringweg works
export const RING_ZUID_GPS = [
  'Nu echt de laatste fase.',
  'Houd links aan. Of rechts. Ze worden allebei nog verlegd.',
  'Omleiding. Deze omleiding vervangt de vorige omleiding.',
  'Over driehonderd meter: nog een fase.',
  'Route herberekend. De weg is er nog niet, maar hij komt.',
  'U rijdt nu op de Ring Zuid. Geniet ervan, hij is bijna af.',
];

// spoken (bubbles): the highest compliment, after a perfect run
export const KON_MINDER = ['Kon minder.', 'Kon minder, jong.', 'Ja. Kon minder.'];
export const PERFECT_VERDICT = 'Kon minder.';

// The two commentary cows, Aaltje (zwartbont, sceptisch) and Grietje
// (roodbont, ziet alles). Loading screen: text only.
export const COW_LOADING = [
  'Aaltje: “Laadt nog.” Grietje: “Wij ook. Al twintig jaar.”',
  'Grietje: “Er komt weer iemand de stad in.” Aaltje: “Dat zien we zo wel.”',
  'Aaltje: “Grunn is vol.” Grietje: “Dan staan wij hier goed.”',
  'Grietje: “Die met die eierbal weer.” Aaltje: “Warm hopelijk.”',
  'Aaltje: “Het regent.” Grietje: “Dat is geen nieuws, dat is een seizoen.”',
  'Grietje: “Weer een omleiding.” Aaltje: “Wij lopen gewoon rechtdoor.”',
];
// spoken: the cows in the Kiekdoar feed, per kind of chaos: [cow, line]
export const COW_FEED = {
  wreck: [
    ['Aaltje', 'Weer een auto kapot. Ik tel ze niet meer.'],
    ['Grietje', 'Dat had een mooie auto kunnen blijven.'],
  ],
  wanted: [
    ['Grietje', 'Veel blauw in de stad vandaag.'],
    ['Aaltje', 'Sirenes. Dan is die weer bezig.'],
  ],
  water: [
    ['Grietje', 'Weer een auto in het Diep. Het Diep vindt het prima.'],
  ],
  mission: [
    ['Aaltje', 'Weer een klusje gedaan. Kon minder.'],
  ],
  calm: [
    ['Grietje', 'Wij staan hier gewoon. Dat is ook een keuze.'],
    ['Aaltje', 'Ik heb het gezien. Ik zeg niks.'],
  ],
};

// Event days (flavour.js): announcement, then what people say. spoken: `barks`
export const EVENT_DAYS = {
  bloemetjesmarkt: {
    name: 'Bloemetjesmarkt',
    announce: 'Bloemetjesmarkt! Binnenstad vol touringcars en kamerplanten. Parkeren? Vergeet het maar.',
    card: 'De hele dag bloemenkramen op de Grote Markt',
    barks: [
      'Nog één plantje. Echt de laatste.',
      'Past die ficus nog in de bus?',
      'Ik kwam voor de markt, ik ga met een oerwoud.',
    ],
  },
  bommenberend: {
    name: 'Bommen Berend',
    announce: 'Grunn viert Gronings Ontzet. Vlaggen op de Grote Markt, vanavond vuurwerk.',
    barks: [
      'Wij hebben gewonnen. Met de dijken, natuurlijk.',
      'Het was de regen, zegt mijn opa. Die kwam precies op tijd.',
      'Bommen Berend gaf het op. Van de zenuwen, denk ik.',
      'Het was de bakker. Die hield iedereen op de been.',
    ],
  },
  keiweek: {
    name: 'Kiezelweek',
    announce: 'Kiezelweek! Groepjes nieuwe Stadjers in de binnenstad en het Noorderplantsoen. Rustig rijden.',
    barks: [
      'Waar is ons groepje gebleven?',
      'Is dit nou de Grote Markt of het Plantsoen?',
      'Moi! Zeg je dat zo? Moi!',
    ],
  },
};

// Noorderplantsoen at the first sun. spoken (bubbles)
export const PLANTSOEN_BARKS = [
  'Eerste zon! Iedereen naar het Plantsoen.',
  'Wie heeft die speaker meegenomen?',
  'Van wie is deze fiets? Van niemand meer, denk ik.',
];
export const PLANTSOEN_NEWS = 'Eerste zon: het Noorderplantsoen ligt vol kleedjes, speakers en wegwerpbarbecues.';

// Peerd van Ome Loeks: always on the same roundabout (flavour.js PEERD_SPOT); `{w}` = wijk
export const PEERD_NEWS = [
  'Peerd van Ome Loeks gezien op een rotonde in {w}. Gemeente: “Het beeld staat gewoon op zijn plek.”',
  'Weer meldingen van het Peerd op een rotonde in {w}. Gemeente: “Wij verplaatsen geen paarden.”',
  'Het Peerd van Ome Loeks staat in {w}, zeggen bewoners. Gemeente: “Dat moet een ander paard zijn.”',
  'Rotonde in {w} heeft ineens een paard. Gemeente ontkent alles, ook het paard.',
];
// spoken (bubbles) next to the statue
export const PEERD_BARKS = [
  'Stond dat peerd hier gisteren ook?',
  'Dat peerd staat elke week ergens anders.',
];

// Stolen bikes turn up again; `{a}` = where you left it, `{b}` = where it is now
export const BIKE_RESURFACE = [
  'Die fiets van {a} staat nu in {b}. Met een ander slot.',
  'Gevonden in {b}: een fiets die gisteren nog in {a} stond. Niemand weet van niks.',
  'Fiets uit {a} duikt op in {b}. Het zadel is nog warm.',
];

// Night radio outside the city: Rikus, the narrator, on Nachtstreek. spoken (over G-Music)
export const NACHTSTREEK = [
  'Goedenavond op de stille weg. Hier is Rikus, op Nachtstreek. Muziek van hier, voor wie nog onderweg is.',
  'Nachtstreek. Buiten is het donker, binnen is het warm. Rustig aan op de dijk.',
  'Het is laat in het Ommeland. De koeien slapen, Rikus draait nog even door.',
  'Nachtstreek, met muziek van hier. Geen haast. Die hebben wij niet.',
  'Voor wie op de dijk rijdt en voor de boer die niet kan slapen: deze is voor jullie.',
  'Een groet aan mijn oude buurjongen uit het Oosterpark. Hij weet wel wie hij is. Hij rijdt vast weer zonder licht.',
];

// Rikus on the story so far, once that mission is done (missions.js id -> line)
export const NACHTSTREEK_STORY = {
  museumkraak: 'Een groet aan een dame in Stad die steeds appt met Friesland. Haar vriend weet van niks. Nou: nu wel.',
  vlag: 'Er schijnt in Stad een jongen te zijn naar wie de duiven luisteren. Ik ken hem. Naar mij luistert hij nooit.',
};

// Oosterpark: the old stadium. spoken (bubbles, own chants)
export const SUPPORTER_CHANTS = [
  'Wij geven nooit op, wij staan tot het eind!',
  'Groen en wit, van het Oosterpark tot aan de ring!',
  'Stad en Ommeland, samen staan we sterk!',
  'Al regent het, al waait het, wij blijven hier staan!',
];
export const OOSTERPARK_PLAQUE = ['Hier stond het Oosterpark', '1933 – 2005', 'Het veld is weg, het zingen niet.'];
const OOSTERPARK_LABEL = 'Oud stadion (Oosterpark)';

// Map helpers (mapview.js): a landmark's nickname, and the extra places.
export function nicknameOf(landmark) {
  const n = NICKNAMES.find((k) => k.landmark === landmark);
  return n ? n.nick : null;
}
export const FLAVOUR_MAP_PLACES = [
  ...NICKNAMES.filter((n) => n.label).map((n) => ({ x: n.x, y: n.y, name: n.nick, sub: n.label })),
  { x: 1697.87, y: -673.02, name: OOSTERPARK_LABEL, sub: 'Hier stond het stadion, 1933–2005' },
];
