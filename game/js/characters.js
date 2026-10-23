// The cast for the pause menu's Verhaal › Personages: who they are, their
// best-known line, what they are to Tammo and Tessa, the missions you play
// with them and the 3D model. Pure data plus the "met" record: a character
// unlocks the first time they speak to you (cutscene, call, mission line;
// see noteSpoken), and stays unlocked for good, like vehicles in the garage.
//
// Fields:
//   id        stable key (saved in the lifetime set 'personages')
//   name      as shown; speakers: subtitle names that count as this
//             character (speakers.js names, old and new)
//   role      one line under the name
//   bio       two or three dry sentences, no spoilers past their first scene
//   quote     their best-known line (shown with the name in their colour)
//   relation  what they are to the duo
//   missions  story step codes (storyarc.js STEPS ids) you play with them
//   model     'tammo' / 'anita' (models3d_people.js appearances) or a key of
//             missionstory.js NPC; null draws their initial instead
//   always    unlocked from the start (the duo)
//
// The cast follows docs/verhaal/D-definitief.md; storyarc.js CHARACTERS holds
// the in-game name cards (namecard.js) for the same people.
import { recordUnique, hasUnique } from './achievements.js';
import { baseSpeaker } from './speakers.js';

export const CHARACTERS = [
  {
    id: 'tammo', name: 'Tammo', speakers: ['Tammo'], model: 'tammo', always: true,
    role: 'Stadjer. Groot hart. Kleine portemonnee.',
    bio: 'Droog, uit het Oosterpark, met een rode Fjord Escapade die nauwelijks rijdt. Kan duiven sturen, en doet daar heel gewoon over. Al twaalf jaar verliefd op zijn beste vriendin. Hij zegt het nooit.',
    quote: 'Ik zeg niks. Dat is ook een antwoord.',
    relation: 'De helft van het duo, en sinds de KEI-week haar huisgenoot in Paddepoel. Zegt het belangrijke in vijf woorden.',
    missions: ['H3', 'H4', 'H5', 'H7', 'H9', 'H10', 'H12', 'H14', 'H17'],
  },
  {
    id: 'anita', name: 'Tessa', speakers: ['Anita'], model: 'anita', always: true,
    role: 'Heeft altijd een plan B. Plan A is ook van haar.',
    bio: 'Snel, ad rem en de baas van het duo. Droomt van de Fjord Frituur, een blauwe frietwagen, en regelt alles zelf. Een frietwagen is een auto met een luik, en ze heeft geen auto.',
    quote: 'Rijden, niet praten.',
    relation: 'De andere helft. Huurde de flat in Paddepoel, met hem als huisgenoot. Leidt, regelt en wint meestal.',
    missions: ['H1', 'H2', 'H6', 'H8', 'H11', 'H13', 'H15', 'H16', 'H18'],
  },
  {
    id: 'rikus', name: 'Rikus', speakers: ['Rikus'], model: 'rikus',
    role: 'Nacht-dj van Radio Nachtstreek',
    bio: 'De derde van het clubje van de stoep in het Oosterpark. Presenteert Nachtstreek, live, elke nacht: Bel Rikus, de fietstunnel-update, het storingsbericht en de peiling "Woist ja wel?". Weet alles en zegt niks, behalve op de radio.',
    quote: 'Ik zeg niks. Ik draai drie minuten stilte.',
    relation: 'Tammo\'s jeugdvriend. Wil de tweede friet.',
    missions: ['H1', 'H6', 'H18'],
  },
  {
    id: 'berend', name: 'Berend Bos', speakers: ['Berend Bos', 'Bommen Berend', 'Berend'], model: 'berend',
    role: 'Speelt veertig jaar Bommen Berend. Verliest elk jaar.',
    bio: 'Chagrijnige Stadjer uit de Schildersbuurt. Valt elk jaar op het Ontzet de stad aan als de bisschop, en verliest elk jaar. Schrijft de gemeente brieven, sinds 1977 elke week.',
    quote: 'Ik proef, ik tel, ik oordeel.',
    relation: 'Hun eerste opdrachtgever, en in de finale de jury.',
    missions: ['H1', 'H18'],
  },
  {
    id: 'jelle', name: 'Jelle Terpstra', speakers: ['Jelle Terpstra', 'Jelle'], model: 'jelle',
    role: 'Snackkoning. Fries. Heel tevreden met zichzelf.',
    bio: 'De snackkoning van Us Mem Snacks, in een blauw colbert en met een trekker-limo. Stal de Gouden Eierbal om hem eerlijk te winnen op de Noordelijke Snackprijs. Foar mem.',
    quote: 'Oant sjen op it Ontset!',
    relation: 'De rival. IJdel en charmant, en eigenlijk een zoon die zijn moeder gelijk wil geven.',
    missions: ['H6', 'H8', 'H9', 'H10', 'H14', 'H17', 'H18'],
  },
  {
    id: 'durk', name: 'Durk', speakers: ['Durk'], model: 'durk',
    role: 'Twee reuzen. Eén brein. Ze delen het.',
    bio: 'Jelles tweelinghandlanger, blauwe muts en baard. Trok een pinautomaat uit de muur. Verklapt elk geheim zodra hij één biertje op heeft.',
    quote: 'Net fertelle, hè?',
    relation: 'Werkt voor Jelle. Zit Tammo en Tessa steeds in de weg.',
    missions: ['H2', 'H8', 'H11', 'H14', 'H16', 'H18'],
  },
  {
    id: 'douwe', name: 'Douwe', speakers: ['Douwe'], model: 'douwe',
    role: 'De andere helft van het brein',
    bio: 'De tweelingbroer van Durk, witte muts en snor. Herhaalt het laatste woord van Durk. Betaalt contant, uit een klomp.',
    quote: 'Durk. Dat was geheim. …Hè.',
    relation: 'Werkt voor Jelle, samen met Durk.',
    missions: ['H2', 'H8', 'H11', 'H14', 'H16', 'H18'],
  },
  {
    id: 'mem', name: 'Mem Terpstra', speakers: ['Mem Terpstra', 'Gerda Terpstra', 'Mem'], model: 'mem',
    role: 'Iemand uit Friesland.',
    bio: 'Gerda Terpstra uit Ljouwert. Werd in 1953 tweede bij de Snackprijs, tegen Trijntje, met de betere eierbal. Wil dat haar zoon ophoudt, en appt Tessa stiekem.',
    quote: 'Sjochst? Dat wie alles wat ik woe.',
    relation: 'De "iemand uit Friesland" met wie Tessa appt.',
    missions: ['H8', 'H16', 'H18'],
  },
  {
    id: 'trijntje', name: 'Oma Trijntje', speakers: ['Oma Trijntje', 'Trijntje'], model: 'trijntje',
    role: 'Bakte in 1953 de beste eierbal van Stad. Zegt het zelf ook.',
    bio: 'Tweeënnegentig. Won in 1953 de Snackprijs, net voor een jonge Friese bakster. Zeventig jaar trots, voor iets wat in één zin past. Alles is nu.',
    quote: 'Die bal is gien geld, jong. Die bal is Grunn.',
    relation: 'De tweede mentor. Weet wat Tammo niet zegt.',
    missions: ['H12', 'H17', 'H18'],
  },
  {
    id: 'bert', name: 'Duivenmelker Bert', speakers: ['Duivenmelker Bert', 'Bert'], model: 'bert',
    role: 'Praat met duiven. Duiven praten terug.',
    bio: 'Duivenmelker bij het Stationsplein. Ziet als eerste dat de duiven naar Tammo luisteren.',
    quote: 'Hij luustert noar dij, jong.',
    relation: 'Tammo\'s eerste mentor.',
    missions: ['H4', 'H10'],
  },
  {
    id: 'torenwachter', name: 'De torenwachter', speakers: ['Torenwachter'], model: null,
    role: 'Woont boven in d\'Olle Grieze. Meldt alleen.',
    bio: 'Een hele oude man boven in de Martinitoren. Ziet alles, belt iedereen, en meldt alleen.',
    quote: 'Ik meld alleen.',
    relation: 'Belt Tammo en Rikus over wat er op de Grote Markt gebeurt.',
    missions: ['H3', 'H10', 'H18'],
  },
  {
    id: 'sjabbe', name: 'Sjabbe', speakers: ['Sjabbe'], model: 'sjabbe',
    role: 'Koopt alles. Vraagt niks.',
    bio: 'Heler achter Pand & Poen. Wrikt alles open, ook een pinautomaat, en weet altijd net iets meer dan hij zegt.',
    quote: 'Wie hem eerst heeft, heeft hem.',
    relation: 'Noemde als eerste het museum.',
    missions: ['H2'],
  },
  {
    id: 'jelmer', name: 'Jelmer', speakers: ['Jelmer'], model: 'jelmer',
    role: 'Streamt alles. Ook als het niet hoeft.',
    bio: 'Groningse streamer die van elke zomeravond content maakt. Niemand raken, alleen spullen.',
    quote: 'Spullen zijn content.',
    relation: 'Betaalde hun inschrijving voor de Snackprijs.',
    missions: ['H3', 'H16'],
  },
  {
    id: 'sjoerd', name: 'Sjoerd', speakers: ['Sjoerd'], model: 'sjoerd',
    role: 'KEI-commissie. Wind tegen, beide kanten op.',
    bio: 'Van de KEI-commissie. Zijn neef werkt \'s nachts in het museum, en om twaalf uur gaan de camera\'s drie minuten uit.',
    quote: 'Dat mag ik eigenlijk niet zeggen.',
    relation: 'Laat Tammo de KEI-race rijden.',
    missions: ['H5'],
  },
  {
    id: 'femke', name: 'Femke', speakers: ['Femke'], model: 'femke',
    role: 'Noorderzon. Het decor moest gisteren al staan.',
    bio: 'Festivalmaker van Noorderzon. Altijd een dag te laat, en ze levert een alibi.',
    quote: 'Dat klinkt als theater, Rikus.',
    relation: 'Huurt ze in voor het decor.',
    missions: ['H7'],
  },
  {
    id: 'snackbar', name: 'Snackbarhouder', speakers: ['Snackbarhouder'], model: 'snackbar',
    role: 'Veertig jaar open in de Oosterpoort',
    bio: 'Zag zijn pannen leeg toen Jelle al het vet van Stad opkocht.',
    quote: 'Vet! Valt mie nait of!',
    relation: 'Kreeg zijn vet terug.',
    missions: ['H8'],
  },
  {
    id: 'harm', name: 'Harm', speakers: ['Harm', 'Ome Harm'], model: 'harm',
    role: 'Twintig jaar Ring Zuid. Laatste fase.',
    bio: 'Wegwerker die al twintig jaar aan de Zuidelijke Ringweg werkt. Elk jaar is het de laatste fase.',
    quote: 'Vorig jaar was het de voorlaatste.',
    relation: 'Laat ze racen op zijn ringweg, tegen Jelle.',
    missions: ['H9'],
  },
  {
    id: 'geert', name: 'Geert', speakers: ['Geert'], model: 'geert',
    role: 'Poelestraat. Nog eentje dan.',
    bio: 'Kroegbaas in de Poelestraat. Weet alles van iedereen, en van twee zingende Friese reuzen aan zijn bar.',
    quote: 'Vier kroegen? Nog eentje dan.',
    relation: 'Stuurt Tessa de kroegen langs.',
    missions: ['H11'],
  },
  {
    id: 'klaas', name: 'Kapitein Klaas', speakers: ['Kapitein Klaas', 'Klaas'], model: 'klaas',
    role: 'Vist al dertig jaar fietsen uit de Diepenring.',
    bio: 'Oude schipper met een rondvaartboot die even van niemand is. Mag alles.',
    quote: 'Ik mag alles.',
    relation: 'Geeft Tessa zijn rondvaartboot mee.',
    missions: ['H13', 'H14'],
  },
  {
    id: 'wiebe', name: 'Schipper Wiebe', speakers: ['Schipper Wiebe', 'Wiebe'], model: null,
    role: 'Boze rondvaartschipper met megafoon',
    bio: 'Scheldt je uit, maar alleen in tegeltjeswijsheden. Zit tot vieren in de kroeg. Meestal.',
    quote: 'Hier kom je niet langs! Dit is MIEN diep!',
    relation: 'De eigenaar van de rondvaartboot.',
    missions: ['H13'],
  },
  {
    id: 'dijkstra', name: 'Dokter Dijkstra', speakers: ['Dokter Dijkstra', 'Dijkstra'], model: 'dijkstra',
    role: 'UMCG. Het staat niet in het rooster.',
    bio: 'Traumaarts en heli-piloot. Zijn traumaheli staat in onderhoud en zijn nachtdienst heeft honger. Hij leent niks uit, maar hij vliegt wel mee.',
    quote: 'Zij vliegt. Hij hangt.',
    relation: 'Vliegt Tessa naar de ballon.',
    missions: ['H15'],
  },
  {
    id: 'hilly', name: 'Hilly', speakers: ['Hilly'], model: 'hilly',
    role: 'Nieuwsgierige buurvrouw',
    bio: 'Kletst plat Gronings en heeft alles gezien. Echt alles.',
    quote: 'Rooie auto? Mit twij grode kerels der in?',
    relation: 'Ooggetuige toen de Escapade verdween.',
    missions: ['H16'],
  },
  {
    id: 'henk', name: 'Henk', speakers: ['Henk'], model: 'henk',
    role: 'Garage Knalpot. Eén koekje.',
    bio: 'Gemoedelijke garagehouder die nooit vraagt waarom. Zette ooit een zender in de Escapade.',
    quote: 'Eén. Het is geen Ontzet.',
    relation: 'Houdt de Escapade aan de praat.',
    missions: ['H6', 'H16'],
  },
  {
    id: 'rotor', name: 'Rotor Roelf', speakers: ['Rotor Roelf'], model: 'rotor',
    role: 'Helikopterverkoper op Eelde',
    bio: 'Joviaal en verkoperig. Geeft iedereen die misschien koopt een gratis proefvlucht.',
    quote: 'Nait tegen d\'Olle Grieze aan, hè?',
    relation: 'Wil ze een heli verkopen. Of twee.',
    missions: [],
  },
  {
    id: 'roelf', name: 'Boer Roelf', speakers: ['Boer Roelf', 'Roelf'], model: 'roelf',
    role: 'Boer aan de Beijumerweg',
    bio: 'Schiet carbid, en helpt alleen wie het ook kan. Stad wil altijd zijn spullen.',
    quote: 'Doar zuukt gain Fries noar.',
    relation: 'Verstopt de Eierbal in zijn melkbus.',
    missions: [],
  },
  {
    id: 'hilje', name: 'Hilje', speakers: ['Hilje'], model: 'hilje',
    role: 'Boerin aan de Beijumerweg',
    bio: 'Telt de knallen en houdt de koffie warm.',
    quote: 'Doe mor normaal, den dousto al gek genog.',
    relation: 'Boer Roelfs vrouw, en de verstandigste van de twee.',
    missions: [],
  },
];

export const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
const BY_SPEAKER = new Map(CHARACTERS.flatMap((c) => c.speakers.map((n) => [n, c.id])));

const SET = 'personages';

export function hasMet(id) {
  const c = CHARACTER_BY_ID.get(id);
  return !!c && (!!c.always || hasUnique(SET, id));
}

// A subtitle speaker said something to the player: the first time unlocks
// them in Verhaal › Personages. Returns the character id when it is new.
export function noteSpoken(world, speaker) {
  const id = BY_SPEAKER.get(baseSpeaker(speaker));
  if (!id || hasMet(id)) return null;
  if (typeof document !== 'undefined' && (document.body.classList.contains('trailer-on') || !document.body.classList.contains('game-started'))) return null;
  recordUnique(world, SET, id);
  fresh.add(id);
  return id;
}

// met this session and not yet looked at (the menu's dot)
const fresh = new Set();
export const isFresh = (id) => fresh.has(id);
export const anyFresh = () => fresh.size > 0;
// één personage bekeken: alleen zijn bolletje gaat weg (#435)
export function markCharacterSeen(id) {
  return fresh.delete(id);
}
export function markCharactersSeen() {
  fresh.clear();
}

export function metCount() {
  return CHARACTERS.filter((c) => hasMet(c.id)).length;
}
