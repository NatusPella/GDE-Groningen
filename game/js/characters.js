// The cast for the pause menu's Verhaal › Personages: who they are, their
// best-known line, what they are to Tammo and Anita, the missions you play
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
// The story rewrite (docs/verhaal/D-definitief.md) renames and adds people:
// update the entries here and add their subtitle names to `speakers`.
import { recordUnique, hasUnique } from './achievements.js';
import { baseSpeaker } from './speakers.js';

export const CHARACTERS = [
  {
    id: 'tammo', name: 'Tammo', speakers: ['Tammo'], model: 'tammo', always: true,
    role: 'Stadjer uit het Oosterpark',
    bio: 'Droog, met een groot hart en een kleine portemonnee. Rijdt een rode Fjord Escapade die hij het bakkie noemt. Kan duiven sturen, en doet daar heel gewoon over.',
    quote: 'Kon minder.',
    relation: 'De helft van het duo. Zegt het belangrijke in vijf woorden.',
    missions: ['H3', 'H4', 'H5', 'H7', 'H9', 'H10', 'H12', 'H14', 'H17'],
  },
  {
    id: 'anita', name: 'Anita', speakers: ['Anita'], model: 'anita', always: true,
    role: 'De baas van het duo',
    bio: 'Snel, ad rem en altijd een plan B. Droomt van de Fjord Frituur, een eigen frietwagen. Weet van elke Groninger wie z\'n oom is.',
    quote: 'Rijden, niet praten.',
    relation: 'De andere helft. Leidt, regelt en wint meestal.',
    missions: ['H1', 'H2', 'H6', 'H8', 'H11', 'H13', 'H15', 'H16', 'H18'],
  },
  {
    id: 'rikus', name: 'Rikus', speakers: ['Rikus'], model: 'rikus',
    role: 'Nacht-dj van Radio Nachtstreek',
    bio: 'Vertelt het verhaal van Tammo en Anita alsof het een oude legende is, en prikt daarna de lucht eruit. Betaalt nooit, behalve voor die tweede friet.',
    quote: 'Moi, hier is Rikus, op Nachtstreek.',
    relation: 'Tammo\'s jeugdvriend uit het Oosterpark.',
    missions: [],
  },
  {
    id: 'berend', name: 'Bommen Berend', speakers: ['Bommen Berend', 'Berend Bos', 'Berend'], model: 'berend',
    role: 'Norse Stadjer met een bakkie',
    bio: 'Kort, nors en stiekem trots. Houdt van zijn bakkie, zwarte koffie en Gronings Ontzet. Haat fatbikes, verandering en de nieuwe Grote Markt.',
    quote: 'Kon minder.',
    relation: 'Hun eerste opdrachtgever. Noemt ze "dat stel".',
    missions: ['H1', 'H18'],
  },
  {
    id: 'jelle', name: 'Jelle Terpstra', speakers: ['Jelle Terpstra', 'Jelle'], model: 'jelle',
    role: 'De Fryske Snackkening',
    bio: 'IJdele, charmante snackbaron van Us Mem Snacks, in een blauw colbert en met een zwarte trekker-limo. Vindt alles wat lekker is eigenlijk Fries.',
    quote: 'Tige tank!',
    relation: 'De rivaal. Gemeen is hij nooit, wel heel ijdel.',
    missions: ['H9', 'H14', 'H17', 'H18'],
  },
  {
    id: 'durk', name: 'Durk', speakers: ['Durk'], model: 'durk',
    role: 'Handlanger, blauwe muts',
    bio: 'Groot, traag en trouw. Deelt één brein met zijn tweelingbroer. Verklapt elk geheim zodra hij één biertje op heeft.',
    quote: 'Net fertelle, hè?',
    relation: 'Werkt voor Jelle. Zit Tammo en Anita steeds in de weg.',
    missions: ['H8', 'H11', 'H14'],
  },
  {
    id: 'douwe', name: 'Douwe', speakers: ['Douwe'], model: 'douwe',
    role: 'Handlanger, witte muts',
    bio: 'De tweelingbroer van Durk, met een snor. Herhaalt het laatste woord van Durk. Betaalt contant, uit een klomp.',
    quote: '…hè.',
    relation: 'Werkt voor Jelle, samen met Durk.',
    missions: ['H8', 'H11', 'H14'],
  },
  {
    id: 'mem', name: 'Mem Terpstra', speakers: ['Mem Terpstra', 'Gerda Terpstra', 'Mem'], model: 'mem',
    role: 'De Mem van Us Mem Snacks',
    bio: 'Jelles moeder en de enige naar wie hij luistert. Kort, stellig, en een oude vriendin van Oma Trijntje.',
    quote: 'Jas aan, jonge.',
    relation: 'De "iemand uit Friesland" met wie Anita appt.',
    missions: ['H16', 'H18'],
  },
  {
    id: 'trijntje', name: 'Oma Trijntje', speakers: ['Oma Trijntje', 'Trijntje'], model: 'trijntje',
    role: 'Stond model voor de Gouden Eierbal',
    bio: 'Won in 1953 met de beste eierbal van Stad. Warm, stellig, en het morele kompas van het verhaal.',
    quote: 'Die bal is gien geld, jong. Die bal is Grunn.',
    relation: 'Anita\'s grote voorbeeld.',
    missions: ['H12'],
  },
  {
    id: 'bert', name: 'Duivenmelker Bert', speakers: ['Duivenmelker Bert', 'Bert'], model: 'bert',
    role: 'Oude wijze duivenman',
    bio: 'Praat over duiven als over mensen. Ziet als eerste dat de duiven naar Tammo luisteren.',
    quote: 'Kiek. Die duiven luuster\'n noar dij, jong.',
    relation: 'Tammo\'s eerste leermeester.',
    missions: ['H4', 'H10'],
  },
  {
    id: 'sjabbe', name: 'Sjabbe', speakers: ['Sjabbe'], model: 'sjabbe',
    role: 'Heler, koopt alles',
    bio: 'Sluw en zakelijk. Geeft een voorschot, met rente. Of met een Eierbal.',
    quote: 'Wat denk je dat het waard is? De helft.',
    relation: 'Hun geldschieter. Vriend is een groot woord.',
    missions: ['H2'],
  },
  {
    id: 'jelmer', name: 'Jelmer', speakers: ['Jelmer'], model: 'jelmer',
    role: 'Streamer',
    bio: 'Hyperactief, leest de chat hardop voor en verzint elke dag een nieuwe trend.',
    quote: 'Chat, zeg allemaal moi tegen Tammo!',
    relation: 'Wil chaos voor zijn kijkers. Tammo levert.',
    missions: ['H3', 'H16'],
  },
  {
    id: 'sjoerd', name: 'Sjoerd', speakers: ['Sjoerd'], model: 'sjoerd',
    role: 'Wedstrijdleider',
    bio: 'Droog en schamper. Leidt de KEI-race en elke andere wedstrijd waar regels bij horen.',
    quote: 'Regels zijn regels. Behalve de mijne.',
    relation: 'Laat ze racen, met tegenzin.',
    missions: ['H5'],
  },
  {
    id: 'femke', name: 'Femke', speakers: ['Femke'], model: 'femke',
    role: 'Festivalmaker van Noorderzon',
    bio: 'Gehaast en enthousiast. Alles moet gisteren.',
    quote: 'Het decor moest gisteren al staan.',
    relation: 'Huurt ze in voor het decor, en voor het vet.',
    missions: ['H7', 'H8'],
  },
  {
    id: 'harm', name: 'Ome Harm', speakers: ['Harm', 'Ome Harm'], model: 'harm',
    role: 'Wegwerker en occasionhandelaar',
    bio: 'Gemoedelijk en trots op elke auto op zijn erf. Kent de ringweg beter dan de gemeente.',
    quote: 'Deze heeft nog nooit een omleiding gezien.',
    relation: 'Verkoopt ze auto\'s, en een race op de ringweg.',
    missions: ['H9'],
  },
  {
    id: 'geert', name: 'Geert', speakers: ['Geert'], model: 'geert',
    role: 'Kroegbaas',
    bio: 'Joviaal en roddelend. Weet alles van iedereen en vertelt het voor een biertje.',
    quote: 'Vier kroegen, één avond, alles te voet.',
    relation: 'Stuurt Anita de kroegen langs.',
    missions: ['H11'],
  },
  {
    id: 'klaas', name: 'Kapitein Klaas', speakers: ['Kapitein Klaas', 'Klaas'], model: 'klaas',
    role: 'Schorre schipper',
    bio: 'Kent elke brug van de Diepenring en praat tegen zijn boot.',
    quote: 'Die rondvaartboot is… tijdelijk van niemand.',
    relation: 'Geeft Anita zijn rondvaartboot mee.',
    missions: ['H13'],
  },
  {
    id: 'wiebe', name: 'Schipper Wiebe', speakers: ['Schipper Wiebe', 'Wiebe'], model: null,
    role: 'Boze rondvaartschipper met megafoon',
    bio: 'Scheldt je uit, maar alleen in tegeltjeswijsheden.',
    quote: 'Hier kom je niet langs! Dit is MIEN diep!',
    relation: 'De concurrent op het water.',
    missions: ['H13'],
  },
  {
    id: 'dijkstra', name: 'Dokter Dijkstra', speakers: ['Dokter Dijkstra', 'Dijkstra'], model: 'dijkstra',
    role: 'Traumaarts en heli-piloot',
    bio: 'Nuchter en zakelijk, ook op honderd meter hoogte boven het UMCG.',
    quote: 'Dit stond niet in het rooster.',
    relation: 'Leent Anita de traumaheli.',
    missions: ['H15'],
  },
  {
    id: 'hilly', name: 'Hilly', speakers: ['Hilly'], model: 'hilly',
    role: 'Nieuwsgierige buurvrouw',
    bio: 'Kletst plat Gronings en heeft alles gezien. Echt alles.',
    quote: 'Rooie auto? Mit twij grode kerels der in?',
    relation: 'Ooggetuige toen de Fjord verdween.',
    missions: ['H16'],
  },
  {
    id: 'henk', name: 'Henk', speakers: ['Henk'], model: null,
    role: 'Garage Knalpot',
    bio: 'Gemoedelijke garagehouder. Belt als je auto schade heeft en noemt elke deuk een karaktertrekje.',
    quote: 'Je bakkie staat om de hoek, jong.',
    relation: 'Houdt het bakkie aan de praat.',
    missions: [],
  },
  {
    id: 'rotor', name: 'Rotor Roelf', speakers: ['Rotor Roelf'], model: 'rotor',
    role: 'Helikopterverkoper op Eelde',
    bio: 'Joviaal en verkoperig. Geeft iedereen die misschien koopt een gratis proefvlucht.',
    quote: 'En nait tegen d\'Olle Grieze aan, hè?',
    relation: 'Wil ze een heli verkopen. Of twee.',
    missions: [],
  },
  {
    id: 'roelf', name: 'Boer Roelf', speakers: ['Boer Roelf', 'Roelf'], model: 'roelf',
    role: 'Boer aan de Beijumerweg',
    bio: 'Schiet carbid op oudejaarsdag en op elke andere dag die hem uitkomt.',
    quote: 'Wat n knaal!',
    relation: 'Verstopt iets in een melkbus voor ze.',
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
export function markCharactersSeen() {
  fresh.clear();
}

export function metCount() {
  return CHARACTERS.filter((c) => hasMet(c.id)).length;
}
