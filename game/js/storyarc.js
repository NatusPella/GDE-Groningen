// The story arc "Alles voor één eierbal" as data (docs/verhaal/D-definitief.md):
// every main mission (H1-H18) and the guided activities in between, in play
// order. story.js walks this list; nothing here imports game code.
//
// One Groningen summer: the last two weeks of August. The Kop is the
// KEI-week, the Romp Noorderzon, the Staart the kermis and Gronings Ontzet
// on 28 August; the epilogue plays in September.
//
// A step is available when `built` is true and its part is `open`. The story
// stops at the first unavailable step and shows the part's "Wordt vervolgd"
// card, so opening a part means: build its steps, set `built: true` on them
// and `open: true` on PARTS.<part>.
//
// Step fields
//   id       unique, stable (saved): 'H1'..'H18' for missions, 'k-*', 'r-*', 's-*' for activities
//   part     'kop' | 'romp' | 'staart'
//   kind     'mission' | 'activity'
//   player   'tammo' | 'anita': who the player controls in this step (story.js switches
//            at the start of the step; the other one is the companion). lead, done
//            and after lines come from the other one: you don't text yourself.
//   solo     (mission) the companion stays home: the player is on their own (H16)
//   why      what the step's character says to the other one when they take over
//            (story.js playHandover; voiced as that character)
//   title    shown in the pause menu and dev panel
//   mission  (mission) id of a def in missions.js (MISSION_IDS below)
//   reward   (mission) story payout; must equal the missions.js reward for built missions
//   minReward (mission) worst case payout (e.g. Berend's scratch fines), for the money timeline
//   goal     (activity) what completes it, see GOAL TYPES
//   cost     money the step needs (a purchase), for the money timeline and the voorschot
//   optional (activity) a recommended purchase: left out of the skip-everything money check
//   voorschot { from, text }: when the player is short of `cost`, this character tops it up once
//   lead     [who, text]: phone message when the step becomes the next one (who: 'T'/'A' or a name)
//   say      [who, text]: (activity) what the companion says out loud when the step starts
//   done     [who, text]: phone message when an activity is done (ties it back to the plot)
//   waive    what skipping a requirement step hands out (shops.js grantStoryItem) or 'night'
//   after    [[from, text], ...]: phone messages after the mission is passed (or skipped)
//   unlocks  story flag set after the step (e.g. 'jelle' adds Jelle to the phone contacts)
//   beat     [[from, text], ...]: (activity) story-critical phone messages, sent even when the
//            activity is made moot by starting the next mission early (its `done` line is not)
//   contact  [{ via, from, on, lines, ... }]: how people reach them, played by storycontact.js
//            (voiced, shown on the phone): via 'radio' (Radio Nachtstreek: "Bel Rikus" before a
//            mission, the rubrieken after it; `caller` is the caller's line on the radio card) |
//            'call' | 'voicemail' | 'live' | 'post' | 'card' | 'scene' (3D livestream);
//            from a SPEAKERS key; on 'after' (default: when the step is done) or 'lead' (with
//            the lead message); caller: caller ID instead of the name ('Onbekend nummer');
//            mood: portrait ('angry', 'smug', 'wet', 'greide', 'night'); title/sign (card),
//            handle/viewers (live), caption/likes (post). lines: [who, text, { tag, clue, card }]
//            with tag the TTS delivery, card a CHARACTERS key whose name card shows with the line;
//            a Frisian line's Dutch subtitle comes from subtitles.js FY (keyed by the text).
//   scene    { kicker, lines, cast, props }: (activity) a short cutscene where the step is done
//            (storyfun.js); lines [who, text, { tag, clue }], who 'T' | 'A' | a missionstory.js NPC key
//   meet     the same, played once when the player reaches the step's starting spot
//
// GOAL TYPES (story.js GOALS)
//   { type: 'shop', shop }            enter a shop of that type (shops.js SHOP_TYPES key)
//     + buy, what, have               buy one of the item ids `buy` there instead (storyshop.js; `what`
//                                     names it, `have`: walking in with that weapon also counts,
//                                     `prefer`: listed first in the shop)
//   { type: 'require', req, shop }    missions.js requirement met; route to the nearest `shop`
//                                     (an array routes to the nearest of several types)
//   { type: 'pigeon', spot, score }   poop score >= score in one flight (spot: pigeonspots.js id)
//   { type: 'sideJob', job }          one more round of that side job (sidejobs.js id, or an array: any of them)
//   { type: 'night' }                 wait at a garage until it's dark (or it already is)
//   { type: 'train' }                 one train trip (stationtravel.js), routed to the nearest station
//   { type: 'egg' }                   find one more hidden eierbal (achievementtracker), routed to the nearest
//   { type: 'padel' }                 play one padel match, won or lost (padel.js), routed to the nearest court
//   { type: 'kermis' }                one bumper-car ride on the Grote Markt (kermis.js), free, with Durk & Douwe in it
//   { type: 'flight', heli, pad }     meet Rotor Roelf at his demo heli, parked at `heli` on helipad `pad`
//                                     (storyfun.js); walking up (his `meet` scene) completes it, the flight is H15
//   { type: 'carbid', lift }          one round of carbid schieten at boer Roelf's (carbid.js); lift [from, text]: far out
//                                     and without a car, your own Escapade is dropped off for free with that text

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

// The people Tammo and Anita meet, for the GTA-style name cards (namecard.js:
// the name in Bebas, one dry line) and a later "Verhaal" menu: story.js keeps
// who was met (`met:<key>` flags, getStoryCharacters). bio and quote are for
// that menu; `step` is where they first turn up.
export const CHARACTERS = {
  anita: { name: 'Anita', card: 'Heeft altijd een plan B. Plan A is ook van haar.', step: 'H1', bio: 'Snel, ad rem en de baas van het duo. Ze droomt van de Fjord Frituur, een eigen frietwagen, en regelt alles zelf.', quote: 'Een frietwagen is een auto met een luik, Tammo.' },
  tammo: { name: 'Tammo', card: 'Stadjer. Groot hart. Kleine portemonnee.', step: 'H1', bio: 'Stadjer uit het Oosterpark, droog, met een rode Fjord Escapade die nauwelijks rijdt. Al twaalf jaar verliefd op zijn beste vriendin. Hij zegt het nooit.', quote: 'Ik zeg niks. Dat is ook een antwoord.' },
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
  dijkstra: { name: 'Dokter Dijkstra', card: 'UMCG. Het staat niet in het rooster.', step: 'H15', bio: 'Traumaarts en heli-piloot. Haar traumaheli staat in onderhoud en haar nachtdienst heeft honger. Ze leent niks uit, maar ze vliegt wel mee.', quote: 'Zij vliegt. Hij hangt.' },
  mem: { name: 'Mem Terpstra', card: 'Iemand uit Friesland.', step: 'H16', bio: 'Gerda Terpstra uit Ljouwert. Werd in 1953 tweede, tegen Trijntje, met de betere eierbal. Wil dat haar zoon ophoudt, en appt Anita stiekem.', quote: 'Dat wie alles wat ik woe.' },
};

// card: the two lines on the "Wordt vervolgd" card where the built story stops.
// date: the date card of the part ("Kop · 14 augustus").
// recap: the "Eerder in GDE" card when the part starts: [place, narrator line],
// place a map landmark name, [x, y] or 'studio' (Rikus at the Nachtstreek mic; story.js playRecap).
export const PARTS = {
  kop: { title: 'Kop: "Moi, Grunn"', date: '14 augustus', open: true, end: 'Einde van de Kop',
    card: [['Anita', 'Iemand heeft onze Eierbal gejat.'], ['Tammo', 'Die was nog niet eens van ons.']] },
  romp: { title: 'Romp: "Stad in rouw"', date: '18 augustus', open: true, end: 'Einde van de Romp',
    recap: [
      ['studio', 'Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist.'],
      ['Groninger Museum', '\'t Het nog nooit zo donker west, of \'t wer altied wel weer licht.'],
      ['studio', 'Behalve in de fietstunnel. Die is er nog niet. 2029, zeggen ze. Bijna.'],
      ['Grote Markt', 'Eerder in GDE. Twee Stadjers zonder geld, en één droom met een luik: de Fjord Frituur.'],
      ['Groninger Museum', 'Ze wilden de Gouden Eierbal halen. De vitrine was leeg. Op het kussen: "Tige tank! – W."'],
      ['Martinitoren', 'En op Nachtstreek belde een Fries. Jelle Terpstra. Hij wil hem eerlijk winnen, op Gronings Ontzet.'],
    ],
    card: [['Anita', 'Een skûtsje in de Oosterhaven. Met onze Eierbal erop.'], ['Tammo', 'Met Grunn z\'n Eierbal, bedoel je.']] },
  // the last part's card is the ending: an epilogue and credits (story.js playFinale)
  staart: { title: 'Staart: "Gronings Ontzet"', date: '24 augustus', open: true, end: 'Einde', finale: true,
    recap: [
      ['studio', 'Morgen gooit er een skûtsje los in de Oosterhaven. Ik zeg daar niks over.'],
      ['studio', 'Storingsbericht: achttien bruggen in storing. Niemand merkt verschil.'],
      ['Noorderplantsoen', 'Eerder in GDE. Jelle kocht al het frituurvet van Grunn op. Tammo en Anita kaapten het terug.'],
      ['Martinitoren', 'Een duif pikte zijn vlag van d\'Olle Grieze. Er stond op: foar mem.'],
      ['Grote Markt', 'Oma Trijntje vertelde over 1953. Over Gerda Terpstra. Zeventig jaar trots, in één zin.'],
      [[741, 418], 'En op de rondvaartboot zeiden ze moi. Allebei. Ik zeg niks.'],
    ],
    // the epilogue in September, then Rikus in the studio (the last line plays there)
    card: [['Rikus', 'Het ruikt naar suiker. Dat komt uit Hoogkerk. De zomer is op.'],
      ['Anita', 'Het is koud.'],
      ['Tammo', 'Het is Grunn.'],
      ['Anita', 'Spijt van de zomer?'],
      ['Tammo', 'Nee. Van de winter ook niet. Alvast.'],
      ['Rikus', 'Moi. Nachtstreek, het laatste kwartier.'],
      ['Rikus', 'De Gouden Eierbal staat weer in het museum, met een alarm dat het doet en met twee namen op het bordje.'],
      ['Rikus', 'Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs.'],
      ['Rikus', 'De torenwachter belde: "Lange rij bij de Vismarkt. Ik meld alleen."'],
      ['Rikus', 'Berend stuurde een brief: hij wil volgend jaar weer de bisschop zijn. Omdat hij zo goed kan verliezen.'],
      ['Rikus', 'En ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft niet betaald.'],
      ['Rikus', 'Dit is voor twee Stadjers. Ze zeggen nooit wat. Vandaag wel. Moi.']] },
};

// missions.js def order: index i here is def i there (saves and medal
// records use these indices, so only ever append).
export const MISSION_IDS = [
  'berend', 'chaos', 'kei', 'noorderzon', 'ringweg', 'kroegentocht', 'fatbike', 'rondvaart',
  'pinautomaat', 'duifverkenning', 'museumkraak', 'vetgekaapt', 'vlag',
  'skutsje', 'traumaduif', 'fjord', 'bod', 'ontzet',
];

// Steps removed in 0.22 (the definitive script): a save that had them done
// simply drops them (story.js applyStorySave); their purchases stay owned.
export const RETIRED_STEPS = ['k-eierbal', 'k-wapen', 'k-bijbaan', 'r-uzi', 'r-auto', 'r-bijbaan', 'r-eierbal', 'r-bank'];

// "Bel Rikus": the radio fragment that opens a mission (played with its lead).
const belRikus = (lines, caller = '') => ({ via: 'radio', on: 'lead', from: 'rikus', caller, mood: 'night', lines });
// A Nachtstreek fragment after a mission (a rubriek, a peiling, a caller).
const radio = (lines, caller = '') => ({ via: 'radio', from: 'rikus', caller, mood: 'night', lines });

export const STEPS = [
  // --- Kop: "Moi, Grunn" (KEI-week, half augustus) ---------------------------------
  { id: 'H1', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'berend', why: 'Ik rij, Tammo. Berend vertrouwt jou nog niet eens met een fietsbel.',
    title: 'Berend telt de krassen', reward: 50, minReward: 12,
    lead: ['T', 'Rikus heeft werk voor ons. Berend, bij het Martinikerkhof. Jij rijdt, zegt hij.'],
    contact: [belRikus([
      ['berend', 'Rikus. Berend, Schildersbuurt. Mijn bakkie moet naar het Boterdiep, naar mijn zus. En je mag met de auto niet meer door het centrum, sinds 1977. Ik heb een brief gestuurd.', { tag: 'nors, mopperend, aan de telefoon op de radio' }],
      ['rikus', 'In 1977?', { tag: 'droog, als nacht-dj op de radio', card: 'rikus' }],
      ['berend', 'En daarna elke week. Wie rijdt er voor mij?', { tag: 'nors, ongeduldig, aan de telefoon op de radio' }],
      ['rikus', 'Ik ken iemand.', { tag: 'warm, met een knipoog, als nacht-dj op de radio' }],
    ], 'Berend, Schildersbuurt')] },
  { id: 'H2', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'pinautomaat', why: 'Geef mij het stuur. Mijn pas zit in die automaat.',
    title: 'Even pinnen', reward: 400,
    lead: ['T', 'Even pinnen in de Herestraat? Ik kom eraan.'],
    contact: [belRikus([
      ['rikus', 'Een luisteraar meldt een trekker in de Herestraat, om half acht \'s ochtends. Ik zeg niks. Fietsen mag daar overdag ook niet.', { tag: 'droog, licht verbaasd, als nacht-dj op de radio' }],
    ])] },
  { id: 'H3', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'chaos', why: 'De Grote Markt is voor mij. Spullen omver, mensen niet.',
    title: 'Iets met de Grote Markt', reward: 150,
    lead: ['A', 'De inschrijving voor de Snackprijs kost honderdvijftig euro. Jelmer betaalt dat, voor content. Grote Markt, met de Escapade.'],
    contact: [belRikus([
      ['jelmer', 'Rikus! Jelmer. Kiekdoar zegt dat de Grote Markt in de zomer saaier is dan een lege mensa. Ik wil content! 150 euro!', { tag: 'hyper, opgewonden, aan de telefoon op de radio' }],
      ['rikus', 'Ik ken twee mensen die het altijd druk maken. Ook als dat niet hoeft. Niemand raken, hè, Jelmer.', { tag: 'droog, waarschuwend, als nacht-dj op de radio' }],
      ['jelmer', 'Niemand raken! Alleen spullen. Spullen zijn content.', { tag: 'snel, enthousiast, aan de telefoon op de radio' }],
    ], 'Jelmer, streamer'), radio([
      ['rikus', 'Een terrasgast belt: "Ik zat net op de Grote Markt en ik ben nat. Het was de beste avond van mijn zomer." Dank je wel.', { tag: 'warm, droog, als nacht-dj op de radio' }],
      ['rikus', 'Peiling: was Tammo net jaloers op een chatbericht? Ja: 61 procent. "Ken ik ja nait roeken": 27 procent.', { tag: 'plagend, als nacht-dj op de radio' }],
    ])],
    after: [['Kiekdoar', 'Zomeravond op de Grote Markt: parasols op hun kant, een kliko in de fontein, een terras dat applaudisseert. Gewonden: nul. Natte mensen: veel.']],
    unlocks: 'snackprijs' },
  { id: 'H4', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'duifverkenning', why: 'Laat mij maar. Bert zegt dat ik een echt duivengezicht heb.',
    title: 'Kieken van boven', reward: 350,
    lead: ['A', 'Duivenmelker Bert zit bij het Stationsplein. Hij wil dat iemand gaat kijken bij het museum. Van boven.'],
    contact: [belRikus([
      ['bert', 'Rikus. Bert, duivenmelker, Stationsplein. Er staat elke nacht een zwarte trekker bij het museum, met een limousine erachter. Mijn duiven worden er zenuwachtig van.', { tag: 'zacht, bezorgd, aan de telefoon op de radio' }],
      ['rikus', 'Wil je dat iemand gaat kijken, Bert?', { tag: 'warm, als nacht-dj op de radio' }],
      ['bert', 'Van boven. Met een duif. Ik ken alleen niemand die duiven spreekt.', { tag: 'geheimzinnig, rustig, aan de telefoon op de radio' }],
      ['rikus', 'Ik wel.', { tag: 'droog, met een knipoog, als nacht-dj op de radio' }],
    ], 'Bert, Stationsplein')] },
  { id: 'k-fiets', part: 'kop', kind: 'activity', player: 'tammo', built: true, why: 'Ik koop de fiets. Sjoerd kent mij nog van de KEI-week.',
    title: 'Eigen fiets kopen bij Trap & Toeter', goal: { type: 'require', req: 'bike', shop: 'fietsen' }, cost: 75, waive: 'bike',
    voorschot: { from: 'Sjoerd', text: 'Geen geld voor een fiets? Hier, uit de pot van de KEI-commissie. Niet verder vertellen.' },
    lead: ['A', 'Sjoerd van de KEI-commissie heeft een neef bij de museumbeveiliging. Hij praat alleen met wie de KEI-race rijdt. Op een eigen fiets, met bonnetje.'],
    say: ['A', 'Gekocht, hè. Met bonnetje. Een geleende fiets telt niet bij Sjoerd.'],
    done: ['A', 'Een eigen fiets met bonnetje. Nu gaat Sjoerd wel praten.'],
    scene: { kicker: 'Trap & Toeter',
      lines: [
        ['T', 'Een fiets kopen. In Grunn. Mijn opa draait zich om in zijn graf.', { tag: 'droog, licht beschaamd' }],
        ['A', 'Je opa had drie gestolen fietsen.', { tag: 'ad rem, plagend' }],
        ['T', 'Daarom.', { tag: 'deadpan' }],
      ] } },
  { id: 'H5', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'kei', why: 'Ik rij de race. Drie weken student, dat telt gewoon.',
    title: 'Wind tegen, beide kanten op', reward: 550,
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Eerstejaars inhalen, dat kun jij.'],
    contact: [belRikus([
      ['sjoerd', 'Rikus. Sjoerd, KEI-commissie. De eerstejaars zeggen dat niemand sneller door Stad fietst. Ik zoek iemand die ze leert hoe het hier werkt.', { tag: 'droog, zakelijk, aan de telefoon op de radio' }],
      ['rikus', 'Met tegenwind?', { tag: 'droog, als nacht-dj op de radio' }],
      ['sjoerd', 'Altijd tegenwind. Beide kanten op. Dat staat in het reglement.', { tag: 'stellig, droog, aan de telefoon op de radio' }],
    ], 'Sjoerd, KEI-commissie'), radio([
      ['rikus', 'Peiling, Woist ja wel: ze remden allebei voor elkaar, op een kruispunt waar alles groen was. Ja: 74 procent.', { tag: 'plagend, als nacht-dj op de radio' }],
    ])],
    unlocks: 'drieminuten' },
  { id: 'k-kraakspullen', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik haal de spullen. Ik weet wat onopvallend is. Jij niet.',
    title: 'Zwart incognito of een huurbootje', goal: { type: 'require', req: 'heist', shop: ['kleding', 'boot'] }, cost: 150, waive: 'incognito',
    voorschot: { from: 'Sjabbe', text: 'Voor het museum wil je niet opvallen. Hier, een voorschot. Ik reken op jullie.' },
    lead: ['T', 'Drie minuten zonder camera\'s, om twaalf uur. Dus niet opvallen: zwart incognito bij Stoer & Stads, of via het water met een bootje van Bootje Huren.'],
    say: ['T', 'Zwart staat jou goed. Mij staat alles slecht, dus dat maakt niet uit.'],
    done: ['T', 'Nou zijn we echte boeven. Met bonnetje. Nu nog wachten tot middernacht, bij Henk.'] },
  { id: 'k-nacht', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik wacht wel bij Henk. Jij valt in slaap in je koffie.',
    title: 'Wachten bij Henk tot middernacht', goal: { type: 'night' }, waive: 'night',
    lead: ['T', 'Om twaalf uur gaan de camera\'s uit. Tot die tijd wachten we bij Henk, in de garage.'],
    say: ['T', 'Henk heeft koffie. Henk vraagt nooit waarom.'],
    done: ['T', 'Middernacht. Drie minuten. Het is tijd.'] },
  { id: 'H6', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'museumkraak', why: 'Ik ga voorop. Ik ken de achteringang nog van mijn bijbaantje in het museumcafé.',
    title: 'Het museum stond er al zo', reward: 400,
    lead: ['T', 'Het is zover. Via het Verbindingskanaal, om twaalf uur. Drie minuten.'],
    contact: [belRikus([
      ['rikus', 'Geen beller vanavond. Twee vrienden van me zijn een museum gaan "bekijken". Ik zeg niks. Ik draai drie minuten stilte.', { tag: 'zacht, samenzweerderig, laat op de avond, als nacht-dj op de radio' }],
    ])],
    after: [['Kiekdoar', 'Gouden Eierbal foetsie. Politie zoekt twee Stadjers in het zwart. Museum: "Wij snappen er niks van."']],
    unlocks: 'jelle' },

  // --- Romp: "Stad in rouw" (Noorderzon) -------------------------------------------
  { id: 'r-trein', part: 'romp', kind: 'activity', player: 'anita', built: true, why: 'Ik koop de kaartjes. Jij kijkt veel te schuldig voor een conducteur.',
    title: 'Even onderduiken: een treinreis', goal: { type: 'train' }, cost: 8,
    lead: ['T', 'Heel Grunn zoekt de Eierbal, en de pliesie zoekt twee mensen in het zwart. Even onderduiken: pak de trein.'],
    say: ['T', 'Een kaartje naar maakt niet uit waar. Ik kijk wel uit het raam.'],
    done: ['T', 'Iedereen kijkt naar Kiekdoar. Niemand naar ons.'] },
  { id: 'H7', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'noorderzon', why: 'Ik rij het decor. Femke vindt mij rustig. Ze kent me nog niet.',
    title: 'Heel aankomen is ook een kunst', reward: 850,
    lead: ['A', 'Femke van Noorderzon heeft een rit, en een alibi. Bij de Stadsschouwburg.'],
    contact: [belRikus([
      ['femke', 'Rikus! Femke, Noorderzon. Het decor moest gisteren al staan. En iedereen die vandaag voor mij rijdt, heeft gisteravond decor gebouwd. Bij mij. Tot laat.', { tag: 'gehaast, samenzweerderig, aan de telefoon op de radio' }],
      ['rikus', 'Femke, dat klinkt als een alibi.', { tag: 'droog, plagend, als nacht-dj op de radio' }],
      ['femke', 'Dat klinkt als theater, Rikus.', { tag: 'opgewekt, onschuldig, aan de telefoon op de radio' }],
    ], 'Femke, Noorderzon')],
    after: [['Kiekdoar', 'Frituurvet uitverkocht in heel Grunn. Groothandel: "Twee reuzen kochten alles op. Contant, oet n klomp. Op de tankwagen stond Us Mem Vet."']] },
  { id: 'H8', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'vetgekaapt', why: 'Die tankwagen is voor mij. Ik ga voor geen enkele vetvlek opzij.',
    title: 'Al het vet van Grunn', reward: 950,
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Tijd voor banden.'],
    contact: [belRikus([
      ['snackbar', 'Rikus. Mijn pannen zijn leeg. Ik ben veertig jaar open en mijn pannen zijn leeg.', { tag: 'wanhopig, ontdaan, aan de telefoon op de radio' }],
      ['rikus', 'Dit is erger dan de fietstunnel.', { tag: 'ernstig, droog, als nacht-dj op de radio' }],
    ], 'Snackbar, Oosterpoort'), radio([
      ['jelle', 'Rikus. Dat vet was van mij. No ja. Ik heb meer. Doe de groeten aan famke in het rood. Hij niet.', { tag: 'charmant, gepikeerd, aan de telefoon op de radio' }],
      ['rikus', 'Jelle, ben jij nu een vaste beller?', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Gezellig programma. Jullie zijn net een groot dorp.', { tag: 'neerbuigend, charmant, aan de telefoon op de radio' }],
      ['rikus', 'Groot Loug, Jelle. Dat mogen alleen wij zeggen.', { tag: 'droog, licht beledigd, als nacht-dj op de radio' }],
    ], 'Jelle, Ljouwert')],
    after: [['Onbekend nummer (058)', 'Pas op dysels, famke. – M.']] },
  { id: 'r-tuning', part: 'romp', kind: 'activity', player: 'tammo', built: true, why: 'Ik ga naar Knal & Kolder. Ik weet precies welk geluid ik wil.',
    title: 'De Escapade opvoeren bij Knal & Kolder', goal: { type: 'shop', shop: 'tuning', buy: ['u-motor', 'u-remmen', 'u-grip', 'u-turbo'], what: 'een tuning-upgrade' }, cost: 300, optional: true,
    lead: ['A', 'Jelle daagt je uit op de ringweg. Rij de Escapade naar Knal & Kolder en druk R, voor wat extra paardjes.'],
    say: ['A', 'Een trekker inhalen. Dat regel ik wel even. Nou ja: jij.'],
    done: ['A', 'Hij klinkt als een boze koelkast. Kom maar op, trekker.'],
    contact: [{ via: 'radio', on: 'lead', from: 'rikus', caller: 'Jelle, Ljouwert', mood: 'night', lines: [
      ['rikus', 'Ik heb een bericht van een vaste beller. Voor de pet.', { tag: 'droog, licht spottend, als nacht-dj op de radio' }],
      ['jelle', 'Doe de groeten aan de pet. Wij moeten eens hardrijden, op jullie ringweg. As dat jild der is.', { tag: 'uitdagend, charmant, aan de telefoon op de radio' }],
    ] }],
    scene: { kicker: 'Knal & Kolder',
      lines: [
        ['A', 'Hij is nog steeds van jou, hè. Niet van de frietwagen.', { tag: 'zacht, plagend' }],
        ['T', 'Hij is van ons. Hij weet het alleen nog niet.', { tag: 'droog, warm' }],
      ] } },
  { id: 'H9', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'ringweg', why: 'Ik rij de ringweg. Die trekker is persoonlijk.',
    title: 'Ring Zuid, laatste fase', reward: 1200,
    lead: ['A', 'Harm staat bij de start van de ringweg, bij het Julianaplein. En Jelle ook, met zijn trekker-limo.'],
    contact: [belRikus([
      ['harm', 'Rikus. Harm, wegwerker. Twintig jaar Ring Zuid. Vandaag is het echt de laatste fase. Ik wil dat iemand erop rijdt voordat ze weer iets bedenken.', { tag: 'gemoedelijk, trots, aan de telefoon op de radio' }],
      ['rikus', 'Harm, dat zei je vorig jaar ook.', { tag: 'droog, als nacht-dj op de radio' }],
      ['harm', 'Vorig jaar was het de voorlaatste.', { tag: 'stellig, onverstoorbaar, aan de telefoon op de radio' }],
    ], 'Harm, wegwerker'), radio([
      ['rikus', 'Peiling, Woist ja wel: hij pakte haar hand in een auto met stuur. Ja: 88 procent.', { tag: 'plagend, als nacht-dj op de radio' }],
      ['rikus', 'Een luisteraar uit Haren stemde nee. Hij woont niet in Stad, zegt hij.', { tag: 'droog, met een knipoog, als nacht-dj op de radio' }],
    ])],
    after: [['Kiekdoar', 'Er rijdt niets boven Groningen: Stadjers op het podium, Friese trekker op de vluchtstrook.']] },
  { id: 'H10', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'vlag', why: 'Ik fluit wel een duif. Die touwen zijn zo los.',
    title: "Er hangt iets Fries aan d'Olle Grieze", reward: 600,
    lead: ['A', 'Er hangt een reuzenvlag aan de Martinitoren. Bert staat op de Grote Markt. Fluiten maar, duivenkoning.'],
    contact: [belRikus([
      ['torenwachter', 'Rikus. Torenwachter. Er hangt iets aan mijn toren.', { tag: 'oud, droog, onverstoorbaar, aan de telefoon op de radio' }],
      ['rikus', 'Wat dan?', { tag: 'nieuwsgierig, als nacht-dj op de radio' }],
      ['torenwachter', 'Iets Fries. Ik meld alleen.', { tag: 'oud, droog, onverstoorbaar, aan de telefoon op de radio' }],
    ], 'De torenwachter, d\'Olle Grieze'), radio([
      ['rikus', 'Ik heb een jingle gemaakt: "De duivenfluisteraar van het Oosterpark." Tammo, ik weet dat je luistert. Zeg het nou eens tegen haar.', { tag: 'warm, plagend, als nacht-dj op de radio' }],
      ['rikus', 'Wat? Dat weet je zelf wel. Woist ja wel.', { tag: 'zacht, droog, als nacht-dj op de radio' }],
    ])],
    after: [['Kiekdoar', 'Duif pikt Friese vlag van d\'Olle Grieze. Op de vlag stond FOAR MEM. Stadjers juichen, de toren zelf zegt niks.']] },
  { id: 'r-kermis', part: 'romp', kind: 'activity', player: 'tammo', built: true, why: 'Ik doe de botsauto\'s. Ik rij al jaren zo, nu mag het eindelijk.',
    title: "Botsauto's: Durk en Douwe klemrijden", goal: { type: 'kermis' },
    lead: ['A', 'De kermis wordt opgebouwd voor het Ontzet. Durk en Douwe zitten in de botsauto\'s op de Grote Markt. Kermisbaas Jan laat je gratis instappen.'],
    say: ['A', 'In de flank, Tammo. Reuzen kijken nooit opzij.'],
    done: ['A', 'Eén botsing en Durk vertelt alles. Vanavond de Poelestraat.'],
    scene: { kicker: "De botsauto's", face: Math.PI,
      cast: [{ key: 'durk', at: [2.5, 0.8] }, { key: 'douwe', at: [3.3, -0.5] }],
      props: [{ kind: 'fatbike', riders: ['durk', 'douwe'], from: [5.2, 2.6], to: [7, -16], dur: 5, mount: true }],
      lines: [
        ['durk', 'Douwe… alles draait.', { tag: 'traag, duizelig, wankelend' }],
        ['douwe', '…draait.', { tag: 'sloom, misselijk' }],
        ['T', 'Moi, jongens. Lekker gebotst?', { tag: 'droog, laconiek' }],
        ['durk', 'Baas zegt: jij bent de duif. Maar eerst bier. Vanavond, de Poelestraat. Net fertelle, hè?', { tag: 'samenzweerderig, traag, recht tegen Tammo', clue: true }],
        ['douwe', 'Durk. Dat was geheim. …Hè.', { tag: 'geschrokken, traag', look: 'fatbike' }],
      ] } },
  { id: 'H11', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'kroegentocht', why: 'Ik doe de kroegen. Geert zegt dat ik beter tegen bier kan dan jij.',
    title: 'Nog eentje dan', reward: 600,
    lead: ['T', 'Geert zegt dat Durk en Douwe aan zijn bar zingen. Poelestraat. Een kroegentocht dus. Voor het onderzoek.'],
    contact: [belRikus([
      ['geert', 'Rikus. Geert, Poelestraat. Er zitten twee Friese reuzen aan mijn bar en ze zingen al een uur. Ik zoek iemand die vier kroegen doet, om ze bij te houden.', { tag: 'joviaal, roddelend, aan de telefoon op de radio, kroeglawaai' }],
      ['rikus', 'Geert, dat is geen klus. Dat is een avond.', { tag: 'droog, als nacht-dj op de radio' }],
    ], 'Geert, Poelestraat')] },
  { id: 'H12', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'fatbike', why: 'Ik loop wel tussen die fatbikes door. Ik ben toch al bont en blauw.',
    title: 'Fatbikes tellen niet als fiets', reward: 500,
    lead: ['A', 'Oma Trijntje wil ons iets vertellen over de bal. Maar eerst de fatbikes, in de Oude Ebbingestraat.'],
    contact: [belRikus([
      ['trijntje', 'Rikus. Trijntje. Die fatbikes rijden over de stoep alsof Stad van hen is. Stuur die twee.', { tag: 'stellig, oud, aan de telefoon op de radio' }],
      ['rikus', 'Welke twee, Trijntje?', { tag: 'onschuldig, als nacht-dj op de radio' }],
      ['trijntje', 'De twee die het niet zeggen. Je weet best wie.', { tag: 'droog, liefdevol, aan de telefoon op de radio' }],
    ], 'Trijntje, 92')],
    after: [['Oma Trijntje', 'Breng hem thuis, jong. Niet voor het geld. Voor Grunn.']],
    unlocks: 'zitmoi' },
  { id: 'H13', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'rondvaart', why: 'Ik vaar. Jij bent de gids: jij moet wijzen en praten.',
    title: 'Alles klopt, behalve de papieren', reward: 750,
    lead: ['T', 'Kapitein Klaas heeft een rondvaartboot die even van niemand is. Bij de Spilsluizen.'],
    contact: [belRikus([
      ['klaas', 'Rikus. Klaas. Ik heb een rondvaartboot die even van niemand is. En in de Oosterhaven ligt een skûtsje. Rare bemanning: groot en nat.', { tag: 'schor, samenzweerderig, aan de telefoon op de radio' }],
      ['rikus', 'Klaas, mag dat?', { tag: 'droog, als nacht-dj op de radio' }],
      ['klaas', 'Ik vis al dertig jaar fietsen uit de Diepenring. Ik mag alles.', { tag: 'schor, droog, aan de telefoon op de radio' }],
    ], 'Klaas, schipper'), radio([
      ['rikus', 'Peiling, Woist ja wel: …ik krijg net een foto binnen van een rondvaartboot. Ik zeg niks. De peiling is gesloten.', { tag: 'zacht, ontroerd maar droog, als nacht-dj op de radio' }],
    ])] },

  // --- Staart: "Gronings Ontzet" (de week naar 28 augustus) --------------------------
  { id: 's-boot', part: 'staart', kind: 'activity', player: 'anita', built: true, why: 'Ik huur de boot. Klaas geeft mij korting, hij noemt me meisje.',
    title: 'Bootje huren bij Bootje Huren', goal: { type: 'require', req: 'boat', shop: 'boot' }, cost: 40, waive: 'boat',
    voorschot: { from: 'Kapitein Klaas', text: 'Voor een bootje. Ik wil dat skûtsje ook weleens zien zinken.' },
    lead: ['T', 'Het skûtsje gooit vandaag los. Wij hebben een eigen boot nodig: de sloep van Bootje Huren is genoeg.'],
    say: ['T', 'Een sloep met een bel. Jelle gaat trillen.'],
    done: ['T', 'Een boot op onze naam, voor een middag.'],
    scene: { kicker: 'Bootje Huren',
      lines: [
        ['A', 'Een sloep met een bel. Ik stuur.', { tag: 'zelfverzekerd, vrolijk' }],
        ['T', 'Ik spring.', { tag: 'droog' }],
        ['A', 'We springen allebei. Voortaan vallen we samen.', { tag: 'warm, stellig' }],
        ['T', 'En over gisteren…', { tag: 'aarzelend, zacht' }],
        ['A', 'Gisteren was gisteren. Spring nou maar.', { tag: 'snel, ontwijkend, met een glimlach' }],
      ] } },
  { id: 'H14', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'skutsje', why: 'Ik stuur. Ik heb vroeger op het Reitdiep gezeild. Twee keer.',
    title: 'Geleend van de Friezen', reward: 1300,
    lead: ['A', 'Onze huurboot ligt klaar. Jij stuurt, ik zeg wanneer. Het skûtsje wacht niet.'],
    contact: [belRikus([
      ['rikus', 'Geen beller. Ik bel zelf. Het skûtsje gooit los. Ik zeg niks. Ik zet mijn koptelefoon op.', { tag: 'samenzweerderig, droog, als nacht-dj op de radio' }],
    ]), radio([
      ['jelle', 'Rikus. De echte gaat vanavond de lucht in, met een ballon. Ik wil dat mem hem van boven ziet aankomen. En een ballon kun je niet kapen.', { tag: 'zelfvoldaan, dromerig, aan de telefoon op de radio', clue: true }],
      ['rikus', 'Waarom vertel je dat, Jelle?', { tag: 'verbaasd, droog, als nacht-dj op de radio' }],
      ['jelle', 'Omdat het een gezellig programma is.', { tag: 'charmant, onschuldig, aan de telefoon op de radio' }],
    ], 'Jelle, Ljouwert')],
    after: [['Kiekdoar', 'Twee Friese reuzen zwemmen door de Oosterhaven. Ooggetuige: "Dat heb ik van mien laven nog nait zain. Ze zwommen synchroon!"']] },
  { id: 's-proefvlucht', part: 'staart', kind: 'activity', player: 'anita', built: true, why: 'Ik vlieg. Rotor Roelf denkt dat we een heli kopen. Dat laat ik even zo.',
    title: 'Proefvlucht: naar Rotor Roelf op Eelde', goal: { type: 'flight', heli: [1606, 9909], pad: 'eelde' },
    lead: ['T', 'Rotor Roelf op Eelde geeft een gratis proefvlucht. Kopen hoeft niet. Dan zoeken we die ballon van bovenaf.'],
    say: ['T', 'Ik zit achterin. Met mijn ogen dicht.'],
    done: ['T', 'Roelf zegt: gratis, als hij heel terugkomt. Jij vliegt.'],
    meet: { kicker: 'Rotor Roelf',
      cast: [{ key: 'rotor', at: [2.4, 0.6], pose: 'point' }],
      lines: [
        ['rotor', 'Moi! Rotor Roelf, van Eelde. De proefvlucht is gratis. Nait tegen d\'Olle Grieze aan, hè?', { tag: 'joviaal, verkoperig, waarschuwend' }],
        ['A', 'Mooi. We kopen hem misschien. Misschien.', { tag: 'zelfverzekerd, poeslief' }],
        ['T', 'Wij kunnen nog geen fietsbel betalen.', { tag: 'fluisterend, droog' }],
      ] } },
  // H15 is one flight in Rotor Roelf's demo heli (helirun.js 'traumaduif'): off from Eelde,
  // Dokter Dijkstra's spoedje via the UMCG deck, the balloon, and back down on the H.
  // The `flight:*` contacts are said over the headsets at those moments (helirun.js).
  { id: 'H15', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'traumaduif', why: 'Ik vlieg die heli. Jij hangt. Als je wilt.',
    title: 'Het staat niet in het rooster', reward: 1500,
    lead: ['T', 'De rotor draait. Jij vliegt, ik zit achterin. Stap maar in bij Roelf.'],
    contact: [belRikus([
      ['dijkstra', 'Rikus. Dijkstra, UMCG. Mijn traumaheli staat in onderhoud op Eelde. En de nachtdienst heeft honger.', { tag: 'droog, zakelijk, aan de telefoon op de radio' }],
      ['rikus', 'Dokter, wat moet ik daarmee?', { tag: 'verbaasd, droog, als nacht-dj op de radio' }],
      ['dijkstra', 'Niks. Maar als er vanavond een heli langskomt: het staat niet in het rooster.', { tag: 'nuchter, stiekem geamuseerd, aan de telefoon op de radio' }],
    ], 'Dijkstra, UMCG'),
    { via: 'headset', on: 'flight:call', from: 'dijkstra', lines: [
      ['dijkstra', 'Wieken Wubbo, hier Dijkstra, UMCG. Ik heb een spoedje. Mijn traumaheli staat bij Roelf in onderhoud.', { tag: 'droog, zakelijk, door de helikopterradio' }],
      ['dijkstra', 'Achterin staat een koeltas. Daar zit de lunch van de nachtdienst in. Die hebben twaalf uur niks gehad.', { tag: 'nuchter, dringend, door de helikopterradio' }],
      ['A', 'Dat is geen noodgeval.', { tag: 'droog, door de koptelefoon' }],
      ['dijkstra', 'Jij hebt nooit nachtdienst gedaan. Landen op de H van het UMCG, graag.', { tag: 'streng, stiekem geamuseerd, door de helikopterradio' }],
    ] },
    { via: 'headset', on: 'flight:pickup', from: 'dijkstra', lines: [
      ['dijkstra', 'Eierballen. Nog warm. Jullie zijn mijn helden.', { tag: 'opgelucht, warm, roepend boven de rotor uit' }],
      ['dijkstra', 'En nu die ballon. Ik heb een lier. Zij vliegt. Hij hangt.', { tag: 'zakelijk, beslist, door de koptelefoon' }],
      ['T', 'Natuurlijk hang ík.', { tag: 'droog, berustend, door de koptelefoon' }],
      ['A', 'Ik vraag het, Tammo. Wil je hangen?', { tag: 'warm, plagend, door de koptelefoon' }],
      ['T', '…Ja. Dank je dat je het vraagt.', { tag: 'zacht, ontroerd, door de koptelefoon' }],
    ] },
    { via: 'headset', on: 'flight:spot', from: 'A', lines: [
      ['A', 'Daar. In het Oosterpark. Een ballon, en hij staat al bol.', { tag: 'opgewonden, wijzend, door de koptelefoon', clue: true }],
      ['T', 'Mijn Oosterpark. Daar heb ik leren fietsen.', { tag: 'verontwaardigd, droog, door de koptelefoon' }],
      ['A', 'Daar heb ik jóu leren fietsen.', { tag: 'plagend, warm, door de koptelefoon' }],
      ['T', '…Ook waar.', { tag: 'zacht, gewonnen, door de koptelefoon' }],
    ] },
    { via: 'headset', on: 'flight:hang', from: 'dijkstra', lines: [
      ['dijkstra', 'Lier gaat uit. Rustig, Anita. Naast de mand, niet erop.', { tag: 'kalm, geconcentreerd, door de koptelefoon' }],
      ['T', 'Ik hang. Ik hang echt.', { tag: 'nerveus, buiten adem, in de wind' }],
    ] },
    { via: 'headset', on: 'flight:caught', from: 'T', lines: [
      ['T', 'Ik heb hem! De echte!', { tag: 'triomfantelijk, buiten adem, in de wind' }],
      ['dijkstra', 'Lier in. Terug naar het UMCG, en netjes op de H.', { tag: 'zakelijk, tevreden, door de koptelefoon' }],
    ] }],
    after: [['Kiekdoar', 'Demoheli uit Eelde haalt Gouden Eierbal uit ballon. UMCG: "Het stond niet in het rooster. De nachtdienst heeft wel gegeten."']] },
  { id: 's-carbid', part: 'staart', kind: 'activity', player: 'tammo', built: true, why: 'Ik schiet. Ik heb die bal toch al vast. Wat kan er misgaan met een melkbus?',
    title: 'Carbid schieten bij boer Roelf: verstop de Eierbal', goal: { type: 'carbid', lift: ['Henk', 'Je bakkie staat om de hoek, jong. Gratis gebracht. Voor Grunn doe ik dat.'] },
    lead: ['A', 'De bal moet tot het Ontzet veilig staan. Boer Roelf aan de Beijumerweg helpt alleen wie carbid kan schieten.'],
    say: ['A', 'Niet te veel water. En niet in de bus kijken als hij knalt.'],
    done: ['A', 'De Eierbal ligt in een melkbus aan de Beijumerweg. Daar zoekt geen Fries.'],
    scene: { kicker: 'Boer Roelf', knal: 'Durk… ze schieten. Trappen!',
      cast: [{ key: 'roelf', at: [2.3, 1.3] }, { key: 'hilje', at: [2.1, -1.5] }],
      props: [{ kind: 'ball', holder: 'T', from: 'En jullie' }, { kind: 'fatbike', riders: ['durk', 'douwe'], from: [22, 16], to: [20, -22], dur: 6.5, cue: true }],
      lines: [
        ['roelf', 'Stad wil altijd onze spullen. Vroeger graan, nu stilte en lucht.', { tag: 'nors, nuchter' }],
        ['T', 'En jullie willen onze snackbars.', { tag: 'droog' }],
        ['roelf', '…Ja. Kon minder. In de melkbus. Doar zuukt gain Fries noar.', { tag: 'nuchter, stiekem onder de indruk', clue: true }],
        ['durk', 'Douwe! Daar is de duif. Met de bal!', { tag: 'traag, roepend over het weiland', look: 'fatbike' }],
        ['douwe', 'Durk… ze schieten. Trappen!', { tag: 'geschrokken, traag, trappend' }],
      ] } },
  { id: 's-padel', part: 'staart', kind: 'activity', player: 'tammo', built: true, why: 'Ik speel. Mijn armen trillen nog van dat touw, maar mijn backhand niet.',
    title: 'Een potje padel', goal: { type: 'padel' },
    lead: ['A', 'Even afreageren. Je armen trillen nog van dat touw. Een potje padel.'],
    say: ['A', 'Even afreageren. Je armen trillen nog van dat touw.'],
    done: ['A', 'Durk en Douwe fietsen weg. Met een autosleutel. Waarom hebben die twee een autosleutel?'] },
  { id: 'H16', part: 'staart', kind: 'mission', player: 'anita', solo: true, built: true, mission: 'fjord', why: 'Ik haal jouw auto wel terug. Alleen.',
    title: 'Iedereen heeft een rode auto gezien', reward: 1100,
    lead: ['T', 'Anita. De Escapade is weg. Op zijn plek staat een klomp.'],
    contact: [belRikus([
      ['jelmer', 'Rikus! De Escapade van Tammo is foetsie! De chat ziet overal rode auto\'s!', { tag: 'opgewonden, paniekerig, aan de telefoon op de radio' }],
      ['rikus', 'Iedereen heeft een rode auto gezien. Ik ook. Ik heb er zelf een.', { tag: 'droog, berustend, als nacht-dj op de radio' }],
    ], 'Jelmer, streamer')] },
  { id: 'H17', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'bod', why: 'Ik doe de boodschappen. Ik rem voor eieren, dat weet je.',
    title: 'Het bod viel tegen', reward: 600, cost: 300,
    voorschot: { from: 'Oma Trijntje', text: 'Voor de boodschappen. Een echte eierbal maak je niet met lege handen, jong.' },
    lead: ['A', 'Jelle doet een bod, op de radio. Stadsbalkon. Neem geld mee voor boodschappen.'],
    contact: [belRikus([
      ['jelle', 'Rikus. Ik doe een bod. Op de radio, dan is het officieel. Genoeg voor tien frietwagens, voor de bal. Kom naar het Stadsbalkon.', { tag: 'zakelijk, charmant, aan de telefoon op de radio' }],
    ], 'Jelle, Ljouwert')],
    after: [['Oma Trijntje', 'Mosterd, eieren en stoetbrood. Dan komt het goud, jong. Dat deed ik in 1953 ook zo.']] },
  { id: 'H18', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'ontzet', why: 'Ik hou de kraam heel. Jij bakt.',
    title: 'Ontzet, net als in 1672', reward: 4000,
    lead: ['T', 'Achtentwintig augustus. Gronings Ontzet. Onze kraam staat op de Grote Markt. Kom je?'],
    contact: [belRikus([
      ['rikus', 'Achtentwintig augustus. Gronings Ontzet. In 1672 hield Stad een bisschop buiten.', { tag: 'plechtig, warm, als nacht-dj op de radio' }],
      ['rikus', 'Vandaag staat er weer een Berend op de Grote Markt, in kostuum, en hij verliest weer. Net als in 1672.', { tag: 'droog, met een knipoog, als nacht-dj op de radio' }],
      ['rikus', 'De fietstunnel-update: 2031. Hij is bijna klaar. En ik sta morgen vooraan. Tweede friet is voor mij.', { tag: 'droog, opgetogen, als nacht-dj op de radio' }],
    ]), { via: 'call', from: 'jelle', mood: 'smug', lines: [
      ['jelle', 'Moai dien, Grinzers. Volgend jaar weer? Dan mogen jullie naar Ljouwert komen.', { tag: 'warm, sportief, aan de telefoon, \'s avonds' }],
    ], after: [['T', 'Wij tweeën vóór Grunn. Kon minder, hè?']] }],
    after: [['Kiekdoar', 'Noordelijke Snackprijs naar Grunn. Gouden Eierbal terug in het museum, met een tweede naam op het bordje: Gerda Terpstra, 1953.']] },
];

export const STEP_BY_ID = new Map(STEPS.map((s) => [s.id, s]));

export function stepAvailable(step) {
  return !!(step && step.built && PARTS[step.part] && PARTS[step.part].open);
}

export function missionIndexOf(id) {
  return MISSION_IDS.indexOf(id);
}

// Mission indices in story order (built or not), for "has the story got
// this far" checks in the mission dialogue.
export const MISSION_STORY_ORDER = STEPS.filter((s) => s.kind === 'mission' && s.mission).map((s) => missionIndexOf(s.mission)).filter((i) => i >= 0);

// Story code ('H3') for a mission index, or null for missions outside the arc.
export function missionCode(i) {
  const s = STEPS.find((q) => q.kind === 'mission' && missionIndexOf(q.mission) === i);
  return s ? s.id : null;
}

// Worst case money over the whole arc (planned steps included): start money,
// every requirement bought at its price, every mission at its minimum
// payout, side jobs counted as zero. `low` is the lowest balance right
// before a purchase, `margin` how much was left over there.
export const START_MONEY = 250;

// payShare < 1 models a player who skips every mission (story.js pays that
// share) and buys only what is required.
export function computeMoneyTimeline(start = START_MONEY, payShare = 1) {
  let money = start;
  let low = Infinity;
  const rows = [];
  for (const s of STEPS) {
    const before = money;
    const cost = payShare < 1 && s.optional ? 0 : s.cost || 0;
    if (cost) low = Math.min(low, before - cost);
    const pay = s.kind === 'mission' ? Math.round((payShare < 1 ? (s.reward ?? 0) * payShare : (s.minReward ?? s.reward ?? 0))) : 0;
    money = before - cost + pay;
    rows.push({ id: s.id, part: s.part, title: s.title, built: stepAvailable(s), before, cost, pay, after: money, margin: cost ? before - cost : null });
  }
  return { rows, end: money, low };
}

// "Wat weten we?" (pause menu, Te doen › Verhaal): what Tammo and Anita know so far.
// A clue shows once its step is done, so the journal never spoils ahead.
// kind: 'clue' (about Jelle's plan), 'hart' (motivations and turning points).
export const WHY = {
  kop: 'De Gouden Eierbal halen voordat die Fries het doet. Daarna zien we wel. Voor de Fjord Frituur.',
  romp: 'Uitzoeken waar de bal is, en wat Jelle van plan is met al dat vet.',
  staart: 'De Eierbal terughalen naar Stad. Niet voor het geld, maar voor Grunn. En op het Ontzet bakken.',
};

export const CLUES = [
  { step: 'H1', kind: 'clue', title: 'Een Fries met een klomp', text: 'Berend: een Fries in een blauw colbert wilde zijn bakkie kopen. Contant, uit een klomp. In augustus.' },
  { step: 'H2', kind: 'clue', title: 'De reuzen en het museum', text: 'Sjabbe: twee reuzen kochten alles wat met frituren te maken heeft. Hun baas vroeg waar het museum alarmen heeft. De Gouden Eierbal, achttien karaat.' },
  { step: 'H2', kind: 'hart', title: 'De bal van Grunn', text: 'Tammo\'s opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde. Tammo zegt niks. Dat is ook een antwoord.' },
  { step: 'H3', kind: 'clue', title: 'JelleWâld', text: 'In Jelmers chat: "Groot Loug. Moai foar in wykein." En: "dat famke yn it read: sa\'n leaf gesicht." Een Fries dus. Tammo vond het niet leuk.' },
  { step: 'H3', kind: 'hart', title: 'De Snackprijs', text: 'De inschrijving voor de Noordelijke Snackprijs is betaald. Zonder Fjord Frituur kan Anita niet meedoen.' },
  { step: 'H4', kind: 'clue', title: 'De trekker-limo', text: 'Een zwarte trekker met een limousine erachter bij de achteringang van het museum. Vlaggetjes met pompeblêden. Een man in een blauw colbert telde de alarmen.' },
  { step: 'H5', kind: 'clue', title: 'Drie minuten', text: 'Sjoerd: om twaalf uur \'s nachts gaan de camera\'s van het museum drie minuten uit voor een update. Al sinds 2019.' },
  { step: 'H6', kind: 'clue', title: 'De lege vitrine', text: 'Iemand was ons voor. Op het kussen: "Tige tank! – W." Jelle Terpstra belde live naar Nachtstreek: hij heeft hem alvast meegenomen.' },
  { step: 'H6', kind: 'clue', title: 'Artikel 4', text: 'Reglement van de Noordelijke Snackprijs, artikel 4: de trofee gaat naar wie op Gronings Ontzet wint. Hij stal hem om hem eerlijk te winnen.' },
  { step: 'H7', kind: 'clue', title: 'Al het frituurvet', text: 'Femke: twee reuzen kochten al het frituurvet van Stad. "Us Mem Vet" op de tankwagen. Geen vet, geen Grunn in de Snackprijs.' },
  { step: 'H8', kind: 'hart', title: 'Iemand uit Friesland', text: 'Anita kreeg een appje: "Pas op dysels, famke. – M." Ze stopte haar telefoon snel weg. Tammo zag het.' },
  { step: 'H9', kind: 'clue', title: 'Een Fries op de ringweg', text: 'Jelle verloor van de Escapade, en belde: "Dit is net klear, Grinzer."' },
  { step: 'H10', kind: 'clue', title: 'Foar mem', text: 'Op de vlag aan d\'Olle Grieze stond FOAR MEM. Voor zijn moeder. Lief vandalisme, zegt Anita.' },
  { step: 'r-kermis', kind: 'clue', title: 'De botsauto\'s', text: 'Na één ritje botsauto zei Durk: "Vanavond bier, de Poelestraat. Net fertelle, hè?"' },
  { step: 'H11', kind: 'clue', title: 'Het skûtsje', text: 'Durk, zingend op de bar: "De bal leit op it skûtsje. En mem wil hem niet eens."' },
  { step: 'H12', kind: 'hart', title: 'Oma Trijntje, 1953', text: 'Oma won in 1953. Tweede werd een Fries meisje, Gerda Terpstra. Haar eierbal was beter, en Oma heeft het nooit gezegd. "Die bal is gien geld, jong. Die bal is Grunn."' },
  { step: 'H13', kind: 'hart', title: 'Moi', text: '"Moi." "…Moi." Op de rondvaartboot. Daarna deden ze alsof er niks gebeurd was.' },
  { step: 'H14', kind: 'clue', title: 'Chocola', text: 'De bal op het skûtsje was van chocola, met een kaartje: "Foar mem." De echte gaat vanavond de lucht in, met een ballon.' },
  { step: 's-proefvlucht', kind: 'clue', title: 'Een demoheli op Eelde', text: 'Rotor Roelf geeft een gratis proefvlucht, op Eelde. Kopen hoeft niet. Zegt hij.' },
  { step: 'H15', kind: 'clue', title: 'De echte Eierbal', text: 'Jelles ballon stond bol in het Oosterpark. Tammo haalde de bal uit de mand, aan de lier van Dokter Dijkstra. Hij is zwaar, en hij smelt niet. Jelle staat in een weiland bij Ten Boer.' },
  { step: 's-carbid', kind: 'clue', title: 'De melkbus', text: 'De echte Eierbal ligt in een melkbus bij boer Roelf aan de Beijumerweg. Doar zuukt gain Fries noar.' },
  { step: 's-padel', kind: 'clue', title: 'Een autosleutel', text: 'Na het padel fietsten Durk en Douwe weg. Met een autosleutel.' },
  { step: 'H16', kind: 'hart', title: 'Mem Terpstra', text: '"Iemand uit Friesland" is Gerda Terpstra. Ze wil dat haar zoon ophoudt. Tammo was jaloers op een moeder. Hij zei sorry. Het klonk goed.' },
  { step: 'H17', kind: 'hart', title: 'Het bod viel tegen', text: 'Geld voor iets wat geen geld is. Anita zei nee. Jelle zwijgt, voor het eerst. Opa zei het nooit. Hij zei: "Woist ja wel."' },
  { step: 'H18', kind: 'hart', title: 'Vijf woorden', text: 'De Snackprijs naar Grunn, en een tweede naam op het bordje: Gerda Terpstra, 1953. En achter de kraam, eindelijk: "Ik wil bij jou blijven."' },
];
