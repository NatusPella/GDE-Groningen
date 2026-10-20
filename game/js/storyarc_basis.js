// What the story arc keeps from the first version of the story (removed in #187): the cast it shares
// with the current one, the mission ids and the step ids older saves can still carry.
// MISSION_IDS is append-only: its indices are in saves and medal records (missions.js keeps a retired slot for the
// missions the story no longer plays). The current arc is storyarc_nieuw.js (field reference in its header),
// storyarc.js is what the rest of the game imports.


// Who speaks in contacts, step scenes and radio fragments: key -> display name
// (the voice manifests are keyed by the name). storycontact.js and
// scripts/voicelines_collect.mjs read this table.
export const SPEAKERS = {
  T: 'Tammo', A: 'Anita', rikus: 'Rikus', jelle: 'Jelle Terpstra', durk: 'Durk', douwe: 'Douwe', mem: 'Mem Terpstra',
  berend: 'Berend Bos', jelmer: 'Jelmer', bert: 'Duivenmelker Bert', sjoerd: 'Sjoerd', femke: 'Femke', harm: 'Harm',
  geert: 'Geert', trijntje: 'Oma Trijntje', klaas: 'Kapitein Klaas', dijkstra: 'Dokter Dijkstra', sjabbe: 'Sjabbe',
  torenwachter: 'Torenwachter', snackbar: 'Snackbarhouder', terras: 'Terrasgast', henk: 'Henk', rotor: 'Rotor Roelf',
  roelf: 'Boer Roelf', hilje: 'Hilje',
};


// The people Tammo and Tessa meet, for the trailer-style name cards (namecard.js:
// the name in Bebas, one dry line) and a later "Verhaal" menu: story.js keeps
// who was met (`met:<key>` flags, getStoryCharacters). bio and quote are for
// that menu; `step` is where they first turn up.
export const CHARACTERS = {
  anita: { name: 'Tessa', card: 'Heeft altijd een plan B. Plan A is ook van haar.', step: 'H1', bio: 'Snel, ad rem en de baas van het duo. Ze droomt van de Fjord Frituur, een eigen frietwagen, en regelt alles zelf. Ook de flat in Paddepoel, met Tammo als huisgenoot.', quote: 'Een frietwagen is een auto met een luik, Tammo.' },
  tammo: { name: 'Tammo', card: 'Stadjer. Groot hart. Kleine portemonnee.', step: 'H1', bio: 'Stadjer uit het Oosterpark, droog, met een rode Fjord Escapade die nauwelijks rijdt. Al twaalf jaar verliefd op zijn beste vriendin, en sinds de KEI-week haar huisgenoot in Paddepoel. Hij zegt het nooit.', quote: 'Ik zeg niks. Dat is ook een antwoord.' },
  rikus: { name: 'Rikus', card: 'Weet alles. Zegt niks. Behalve op de radio.', step: 'H1', bio: 'De derde van het clubje van de stoep in het Oosterpark. Presenteert Nachtstreek, live, elke nacht. Bel Rikus.', quote: 'Ik zeg niks. Ik draai drie minuten stilte.' },
  berend: { name: 'Berend Bos', card: 'Speelt veertig jaar Bommen Berend. Verliest elk jaar.', step: 'H1', bio: 'Chagrijnige Stadjer uit de Schildersbuurt. Speelt al veertig jaar de bisschop in het naspel van het Ontzet, valt elk jaar de stad aan en verliest elk jaar. Schrijft de gemeente brieven.', quote: 'Ik proef, ik tel, ik oordeel.' },
  durk: { name: 'Durk & Douwe', card: 'Twee reuzen. Eén brein. Ze delen het.', step: 'H2', bio: 'Jelles tweelinghandlangers. Groot, traag en eerlijk tot op het bot, vooral als ze iets geheim moeten houden.', quote: 'Durk. Dat was geheim. …Hè.' },
  sjabbe: { name: 'Sjabbe', card: 'Koopt alles. Vraagt niks.', step: 'H2', bio: 'Heler achter Pand & Poen. Wrikt alles open en weet altijd net iets meer dan hij zegt.', quote: 'Wie hem eerst heeft, heeft hem.' },
  jelmer: { name: 'Jelmer', card: 'Streamt alles. Ook als het niet hoeft.', step: 'H3', bio: 'Groningse streamer die van elke zomeravond content maakt. Niemand raken, alleen spullen.', quote: 'Spullen zijn content.' },
  torenwachter: { name: 'De torenwachter', card: 'Woont boven in d\'Olle Grieze. Meldt alleen.', step: 'H3', bio: 'Een oude man boven in de Martinitoren. Ziet alles, belt iedereen, en meldt alleen.', quote: 'Ik meld alleen.' },
  bert: { name: 'Duivenmelker Bert', card: 'Praat met duiven. Duiven praten terug.', step: 'H4', bio: 'De eerste mentor. Ziet als eerste dat de duiven naar Tammo luisteren.', quote: 'Hij luustert noar dij, jong.' },
  sjoerd: { name: 'Sjoerd', card: 'KEI-commissie. Wind tegen, beide kanten op.', step: 'H5', bio: 'Van de KEI-commissie. Zijn neef werkt \'s nachts in het museum.', quote: 'Dat mag ik eigenlijk niet zeggen.' },
  henk: { name: 'Henk', card: 'Garage Knalpot. Eén koekje.', step: 'k-nacht', bio: 'Garagehouder die nooit vraagt waarom. Zette ooit een zender in de Escapade.', quote: 'Eén. Het is geen Ontzet.' },
  jelle: { name: 'Jelle Terpstra', card: 'Snackkoning. Fries. Heel tevreden met zichzelf.', step: 'H6', bio: 'De Friese snackkoning van Us Mem Snacks, in een blauw colbert, met een trekker-limo. IJdel en charmant, en eigenlijk een zoon die zijn moeder gelijk wil geven.', quote: 'Oant sjen op it Ontset!' },
  femke: { name: 'Femke', card: 'Noorderzon. Het decor moest gisteren al staan.', step: 'H7', bio: 'Festivalmaker van Noorderzon, altijd een dag te laat en altijd net op tijd.', quote: 'Dat klinkt als theater, Rikus.' },
  harm: { name: 'Harm', card: 'Twintig jaar Ring Zuid. Laatste fase.', step: 'H9', bio: 'Wegwerker die al twintig jaar aan de Zuidelijke Ringweg werkt. Elk jaar is het de laatste fase.', quote: 'Vorig jaar was het de voorlaatste.' },
  geert: { name: 'Geert', card: 'Poelestraat. Nog eentje dan.', step: 'H11', bio: 'Kroegbaas in de Poelestraat.', quote: 'Vier kroegen? Nog eentje dan.' },
  trijntje: { name: 'Oma Trijntje', card: 'Bakte in 1953 de beste eierbal van Stad. Zegt het zelf ook.', step: 'H12', bio: 'Tweeënnegentig. Won in 1953 de Snackprijs, net voor een jonge Friese bakster. De tweede mentor. Zeventig jaar trots, in één zin.', quote: 'Die bal is gien geld, jong. Die bal is Grunn.' },
  klaas: { name: 'Kapitein Klaas', card: 'Vist al dertig jaar fietsen uit de Diepenring.', step: 'H13', bio: 'Oude schipper met een rondvaartboot die even van niemand is.', quote: 'Ik mag alles.' },
  dijkstra: { name: 'Dokter Dijkstra', card: 'UMCG. Het staat niet in het rooster.', step: 'H15', bio: 'Traumaarts en heli-piloot. Zijn traumaheli staat in onderhoud en zijn nachtdienst heeft honger. Hij leent niks uit, maar hij vliegt wel mee.', quote: 'Zij vliegt. Hij hangt.' },
  mem: { name: 'Mem Terpstra', card: 'Iemand uit Friesland.', step: 'H16', bio: 'Gerda Terpstra uit Ljouwert. Werd in 1953 tweede, tegen Trijntje, met de betere eierbal. Wil dat haar zoon ophoudt, en appt Tessa stiekem.', quote: 'Dat wie alles wat ik woe.' },
};

export const MISSION_IDS = [
  'berend', 'chaos', 'kei', 'noorderzon', 'ringweg', 'kroegentocht', 'fatbike', 'rondvaart',
  'pinautomaat', 'duifverkenning', 'museumkraak', 'vetgekaapt', 'vlag',
  'skutsje', 'traumaduif', 'fjord', 'bod', 'ontzet',
];

// Missions of the first version of the story that the current one does not play: missions.js keeps an empty (retired)
// slot for each, and their medal goals / prestaties are hidden unless the player already earned them (achievements.js).
export const RETIRED_MISSIONS = ['berend', 'chaos', 'noorderzon', 'ringweg', 'rondvaart'];

// Steps removed in 0.22 (the definitive script): a save that had them done
// simply drops them (story.js applyStorySave); their purchases stay owned.
export const RETIRED_STEPS = ['k-eierbal', 'k-wapen', 'k-bijbaan', 'r-uzi', 'r-auto', 'r-bijbaan', 'r-eierbal', 'r-bank'];
