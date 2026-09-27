// The story arc "Alles voor één eierbal" as data (docs/verhaal-voorstel.md):
// every main mission (H1-H18) and the guided activities in between, in play
// order. story.js walks this list; nothing here imports game code.
//
// A step is available when `built` is true and its part is `open`. The story
// stops at the first unavailable step and shows the part's "Wordt vervolgd"
// card, so opening the Romp means: build its steps, set `built: true` on
// them and `open: true` on PARTS.romp.
//
// Step fields
//   id       unique, stable (saved): 'H1'..'H18' for missions, 'k-*', 'r-*', 's-*' for activities
//   part     'kop' | 'romp' | 'staart'
//   kind     'mission' | 'activity'
//   player   'tammo' | 'anita': who the player controls in this step (story.js switches
//            at the start of the step; the other one is the companion). lead, done
//            and after lines come from the other one: you don't text yourself.
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
//   contact  [{ via, from, on, lines, ... }]: how Jelle or the twins reach them, played by
//            storycontact.js (voiced, shown on the phone): via 'call' | 'voicemail' | 'live' |
//            'post' | 'card' | 'scene' (3D livestream); from 'jelle' | 'durk' | 'douwe';
//            on 'after' (default: when the step is done) or 'lead' (with the lead message);
//            caller: caller ID instead of the name ('Onbekend nummer'); mood: portrait
//            ('angry', 'smug', 'wet', 'greide'); title/sign (card), handle/viewers (live),
//            caption/likes (post). lines: [who, text, { tag, clue }] with tag the TTS delivery;
//            a Frisian line's Dutch subtitle comes from subtitles.js FY (keyed by the text).
//
// GOAL TYPES (story.js GOALS)
//   { type: 'shop', shop }            enter a shop of that type (shops.js SHOP_TYPES key)
//     + buy, what, have               buy one of the item ids `buy` there instead (storyshop.js; `what`
//                                     names it, `have`: walking in with that weapon also counts)
//   { type: 'require', req, shop }    missions.js requirement met; route to the nearest `shop`
//                                     (an array routes to the nearest of several types)
//   { type: 'pigeon', spot, score }   poop score >= score in one flight (spot: pigeonspots.js id)
//   { type: 'sideJob', job }          one more round of that side job (sidejobs.js id, or an array: any of them)
//   { type: 'night' }                 wait at a garage until it's dark (or it already is)
//   { type: 'train' }                 one train trip (stationtravel.js), routed to the nearest station
//   { type: 'egg' }                   find one more hidden eierbal (achievementtracker), routed to the nearest

// card: the two lines on the "Wordt vervolgd" card where the built story stops.
// recap: the "Eerder in GTE VI" card when the part starts: [place, narrator line],
// place a map landmark name, [x, y] or 'studio' (Rikus at the Nachtstreek mic; story.js playRecap).
export const PARTS = {
  kop: { title: 'Kop: "Moi, Grunn"', open: true, end: 'Einde van de Kop',
    card: [['Anita', 'Iemand heeft onze Eierbal gejat.'], ['Tammo', 'Die was nog niet eens van ons.']] },
  romp: { title: 'Romp: "Stad in rouw"', open: true, end: 'Einde van de Romp',
    recap: [
      ['studio', 'Rikus weer, op Nachtstreek. Luister, ik vertel je hoe het verder ging met die twee.'],
      ['Grote Markt', 'Eerder in GTE VI. Twee Stadjers zonder cent, en één droom op vier wielen: Anita\'s Fjord Frituur.'],
      ['Groninger Museum', 'Het plan was simpel. De Gouden Eierbal uit het Groninger Museum. Achttien karaat, sinds 1953 het hart van Grunn.'],
      ['Groninger Museum', 'Maar de vitrine was leeg. Op het kussen lag alleen een kaartje: "Tige tank! – W."'],
      ['Martinitoren', 'En op Sikkom lachte een Fries in een blauw colbert. Jelle Terpstra. Operaasje Aaibal was begonnen.'],
    ],
    card: [['Anita', 'Een skûtsje in de Oosterhaven. Met onze Eierbal erop.'], ['Tammo', 'Met Grunn z\'n Eierbal, bedoel je.']] },
  // the last part's card is the ending: an epilogue and credits (story.js playFinale)
  staart: { title: 'Staart: "Gronings Ontzet"', open: true, end: 'Einde', finale: true,
    recap: [
      ['studio', 'Het is laat, maar blijf nog even hangen. Hier is Rikus, en dit is het laatste stuk.'],
      ['Noorderplantsoen', 'Eerder in GTE VI. Jelle Terpstra kocht al het frituurvet van Grunn op. Tammo en Anita kaapten het terug.'],
      ['Martinitoren', 'Een duif pikte zijn vlag van d\'Olle Grieze, en in de kroeg verklapte een dronken Durk het skûtsje.'],
      ['Grote Markt', 'Oma Trijntje stond in 1953 model voor de Eierbal. Die bal is gien geld, zei ze. Die bal is Grunn.'],
      [[741, 418], 'En op de rondvaartboot kusten ze. Wij tweeën tegen Grunn… of misschien: vóór Grunn.'],
    ],
    card: [['Rikus', 'De Gouden Eierbal staat weer in het Groninger Museum. Achttien karaat, en nu met een alarm dat het doet.'],
      ['Rikus', 'Jelle Terpstra proefde op de Grote Markt zijn eerste echte Groninger eierbal.'],
      ['Jelle Terpstra', 'Dit is… better as ús. Net fertelle.'],
      ['Rikus', 'Van de beloning kwam de Fjord Frituur. Vier wielen, geen kenteken, en een rij tot aan d\'Olle Grieze.'],
      ['Anita', 'De allereerste is voor jou, Tammo.'],
      ['Tammo', 'Mag ik nou eindelijk?'],
      ['Anita', 'Ja. Alles voor één eierbal.'],
      ['Rikus', 'De tweede was voor mij. Zelf betaald, natuurlijk. Hier was Rikus, op Nachtstreek. Welterusten, Grunn.']] },
};

// missions.js def order: index i here is def i there (saves and medal
// records use these indices, so only ever append).
export const MISSION_IDS = [
  'berend', 'chaos', 'kei', 'noorderzon', 'ringweg', 'kroegentocht', 'fatbike', 'rondvaart',
  'pinautomaat', 'duifverkenning', 'museumkraak', 'vetgekaapt', 'vlag',
  'skutsje', 'traumaduif', 'fjord', 'bod', 'ontzet',
];

export const STEPS = [
  // --- Kop -----------------------------------------------------------------
  { id: 'H1', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'berend', why: 'Ik rij, Tammo. Berend vertrouwt jou nog niet eens met een fietsbel.',
    title: "Bommen Berend wil z'n bakkie", reward: 400, minReward: 100,
    lead: ['T', 'Berend belde. Zijn bakkie moet naar het Boterdiep, en hij telt de krassen. Jij rijdt, zegt hij.'] },
  { id: 'k-eierbal', part: 'kop', kind: 'activity', player: 'tammo', built: true, why: 'Laat mij maar, Anita. Ik weet blind waar de beste eierbal van Grunn ligt.',
    title: 'Eierbal halen bij Frituur Vet & Lekker', goal: { type: 'shop', shop: 'snack', buy: 'f-eierbal', what: 'een eierbal' }, cost: 4,
    lead: ['A', 'Berend zei dat er al een Fries zijn bakkie wilde kopen. Contant, uit een klomp. Daar moet jij even over nadenken, en jij denkt het best met een eierbal. Frituur Vet & Lekker staat op je kaart.'],
    say: ['A', 'Een Fries met een klomp vol geld. Dat zit me niet lekker.'],
    done: ['A', 'Zo, je glimt weer. En nu die automaat in de Herestraat, voordat die Fries hem ook koopt.'] },
  { id: 'H2', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'pinautomaat', why: 'Geef mij het stuur. Jij rijdt een pinautomaat binnen een minuut het Diep in.',
    title: 'Pinnen met de hele automaat', reward: 400,
    lead: ['T', 'Die automaat van gisteren staat nog in de Herestraat. Jij wilde hem verzilveren, toch?'] },
  { id: 'k-wapen', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik koop hem wel. Jij kiest er een in een vrolijk kleurtje.',
    title: 'Pistool kopen bij Pang & Zo', goal: { type: 'require', req: 'weapon', shop: 'wapens' }, cost: 120, waive: 'weapon',
    voorschot: { from: 'Sjabbe', text: 'Hier, een voorschot voor een blaffer. Terugbetalen met rente. Of met een Eierbal.' },
    lead: ['T', 'Jelmer wil zijn stunt op de Grote Markt, maar hij leent niks meer uit. Met de poen van Sjabbe koop jij een blaffer bij Pang & Zo.'],
    say: ['T', 'Ik hou de deur open. Jij kiest iets dat niet echt afgaat. Hoop ik.'],
    done: ['T', 'Klapperman. Jelmer wacht al op de Grote Markt met zijn telefoon.'] },
  { id: 'H3', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'chaos', why: 'De Grote Markt is voor mij. Jelmer wil chaos, en chaos ben ik.',
    title: 'Chaos op de Grote Markt', reward: 500,
    lead: ['A', 'Jelmer wil content op de Grote Markt. Nu hebben we er ook iets voor.'] },
  { id: 'H4', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'duifverkenning', why: 'Laat mij maar. Bert zegt dat ik een echt duivengezicht heb.',
    title: 'Duif op verkenning', reward: 350,
    lead: ['A', 'Sjabbe zei: echt geld ligt in het museum. Dan moeten we het eerst van boven zien. Duivenmelker Bert leent je een duif, bij het Stationsplein.'] },
  { id: 'k-bijbaan', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik bezorg. Ik kan een kapsalon dragen zonder ervan te eten.',
    title: 'Eén ronde Hap & Rap bezorgen', goal: { type: 'sideJob', job: 'bezorger' },
    lead: ['T', 'Wat we bij het museum zagen, kost geld: spullen, een boot misschien. Sjabbe wil contant. Eén ronde Hap & Rap bezorgen.'],
    say: ['T', 'Bezorgen is net kraken. Je belt aan en je bent weer weg.'],
    done: ['T', 'Eén ronde en ik ruik naar kapsalon. Maar de kraakpot groeit.'] },
  { id: 'k-fiets', part: 'kop', kind: 'activity', player: 'tammo', built: true, why: 'Ik koop de fiets. Sjoerd kent mij nog van de KEI-week.',
    title: 'Eigen fiets kopen bij Trap & Toeter', goal: { type: 'require', req: 'bike', shop: 'fietsen' }, cost: 75, waive: 'bike',
    voorschot: { from: 'Sjoerd', text: 'Geen geld voor een fiets? Hier, uit de pot van de KEI-commissie. Niet verder vertellen.' },
    lead: ['A', 'Sjoerd van de KEI-commissie weet alles wat er rond het museum fietst. Hij praat alleen met wie meedoet, en meedoen mag alleen op een eigen fiets. Trap & Toeter.'],
    say: ['A', 'Gekocht, hè. Een geleende fiets telt niet bij Sjoerd.'],
    done: ['A', 'Een eigen fiets met bonnetje. Nu gaat Sjoerd wel praten.'] },
  { id: 'H5', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'kei', why: 'Ik rij de race. Drie weken student, dat telt gewoon.',
    title: 'KEI-weekrace door Grunn', reward: 550,
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Eerstejaars inhalen, dat kun jij.'] },
  { id: 'k-kraakspullen', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik haal de spullen. Ik weet wat onopvallend is. Jij niet.',
    title: 'Zwart incognito of een huurboot', goal: { type: 'require', req: 'heist', shop: ['kleding', 'boot'] }, cost: 150, waive: 'incognito',
    voorschot: { from: 'Sjabbe', text: 'Voor het museum wil je niet opvallen. Hier, een voorschot. Ik reken op jullie.' },
    lead: ['T', 'Bert zag camera\'s en bewakers. Dus niet opvallen: zwart incognito bij Stoer & Stads, of via het water met een bootje van Bootje Huren. Jij kiest.'],
    say: ['T', 'Zwart staat jou goed. Mij staat alles slecht, dus dat maakt niet uit.'],
    done: ['T', 'Nou zijn we echte boeven. Met bonnetje. Nu nog het donker.'] },
  { id: 'k-nacht', part: 'kop', kind: 'activity', player: 'anita', built: true, why: 'Ik wacht wel bij Henk. Jij valt in slaap in je koffie.',
    title: 'Wachten bij de garage tot het donker is', goal: { type: 'night' }, waive: 'night',
    lead: ['T', 'De bewakers wisselen pas \'s avonds. Rij naar een garage en wacht daar tot het donker is.'],
    say: ['T', 'Henk heeft koffie. Henk vraagt nooit waarom.'],
    done: ['T', 'Donker. De bewakers wisselen. Het is tijd.'] },
  { id: 'H6', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'museumkraak', why: 'Ik ga voorop. Ik ken de achteringang nog van mijn bijbaantje in het museumcafé.',
    title: 'De Museumkraak', reward: 400,
    lead: ['T', 'Het is zover. De Museumkraak. Via het Verbindingskanaal, jouw plan.'],
    after: [['Sikkom', 'Gouden Eierbal foetsie. Stad in rouw. Museum: "Wij snappen er niks van, de camera\'s stonden uit."'],
      ['Onbekend nummer (058)', 'Pas goed op dysels, famke. – M.'],
    ],
    contact: [{ via: 'scene', from: 'jelle', handle: 'JelleWâld', viewers: 1953, lines: [
      ['jelle', 'Moai, Grinzers! Hier is Jelle. Jelle Terpstra, van Us Mem Snacks.', { tag: 'charmant, opschepperig, recht in zijn telefooncamera' }],
      ['jelle', 'Zoeken jullie je Gouden Eierbal? Sjoch ris wat ik hier heb.', { tag: 'plagend, zelfvoldaan', clue: true }],
      ['durk', 'Baas, is dat niet de…', { tag: 'traag, verward' }],
      ['jelle', 'Stil, Durk. Operaasje Aaibal is begonnen. Op Gronings Ontzet is de eierbal Fries.', { tag: 'plechtig, overdreven trots' }],
      ['douwe', 'Moeten we nu zwaaien, baas?', { tag: 'traag, onzeker' }],
      ['jelle', 'Zwaaien, jongens. Oant sjen op Gronings Ontzet!', { tag: 'joviaal, zwaaiend, triomfantelijk' }],
    ] }],
    unlocks: 'jelle' },

  // --- Romp ----------------------------------------------------------------
  { id: 'r-trein', part: 'romp', kind: 'activity', player: 'anita', built: true, why: 'Ik koop de kaartjes. Jij kijkt veel te schuldig voor een conducteur.',
    title: 'Even onderduiken: een treinreis', goal: { type: 'train' }, cost: 8,
    lead: ['T', 'Heel Grunn zoekt de Eierbal, en wij stonden met een zaklamp in dat museum. Even onderduiken: pak de trein, maakt niet uit waarheen.'],
    say: ['T', 'Als iemand vraagt waar we gisteravond waren: in de trein.'],
    done: ['T', 'Niemand keek naar ons. Iedereen keek naar Sikkom. En die Jelle heeft het over "Operaasje Aaibal".'] },
  { id: 'H7', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'noorderzon', why: 'Ik rij het decor. Femke vindt mij rustig. Ze kent me nog niet.',
    title: 'Spoedklus voor Noorderzon', reward: 850,
    lead: ['A', 'Femke van Noorderzon belt. Spoedklus, decor moet naar het Noorderplantsoen. En ze heeft iets gezien, zegt ze.'],
    after: [['Sikkom', 'Frituurvet uitverkocht in heel Grunn. Groothandel: "Twee reuzen op ain fatbike kochten alles op. Contant, oet n klomp. Kon minder, veur ons."']],
    contact: [{ via: 'voicemail', from: 'durk', sub: 'Per ongeluk gebeld', lines: [
      ['durk', 'Douwe, hoeveel vet hebben we nu?', { tag: 'traag, gedempt, telefoon in de broekzak' }],
      ['douwe', 'Alles, Durk. Al het vet van Grunn. …Hè.', { tag: 'traag, trots' }],
      ['durk', 'Baas zegt: geen vet, geen eierbal op Gronings Ontzet.', { tag: 'samenzweerderig, traag', clue: true }],
      ['douwe', 'Durk… je telefoon staat aan.', { tag: 'geschrokken, fluisterend' }],
    ] }] },
  { id: 'r-uzi', part: 'romp', kind: 'activity', player: 'anita', built: true, why: 'Ik haal die Ratelaar. Jij houdt hem vast als een eierbal.',
    title: 'Uzi kopen bij Pang & Zo (aanbevolen)', goal: { type: 'shop', shop: 'wapens', buy: 'w-uzi', have: 'uzi', what: 'de Uzi "Ratelaar"' }, cost: 300, optional: true,
    lead: ['T', 'Femke zegt dat al het vet de stad uit rijdt, in een tankwagen. Een Ratelaar bij Pang & Zo prikt makkelijker door zijn banden. Hoeft niet, helpt wel.'],
    say: ['T', 'Het gaat om banden, hè. Niet om mensen.'],
    done: ['T', 'Ratelaar. Nu die tankwagen, voordat het vet in Friesland is.'] },
  { id: 'H8', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'vetgekaapt', why: 'Die tankwagen is voor mij. Ik ga voor geen enkele vetvlek opzij.',
    title: 'Vet gekaapt', reward: 950,
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Durk en Douwe achter het stuur. Tijd voor banden.'],
    contact: [{ via: 'live', from: 'jelle', handle: 'JelleWâld', viewers: 2410, mood: 'angry', lines: [
      ['jelle', 'Dat vet was van mij! No ja. Ik heb meer. Operaasje Aaibal gaat gewoon door, Grinzers.', { tag: 'verontwaardigd, dan weer joviaal' }],
    ], after: [['T', 'Geen vet, geen frituur. Geen frituur, geen eierbal op Ontzet. Dat is zijn plan, hè?']] }] },
  { id: 'r-auto', part: 'romp', kind: 'activity', player: 'tammo', built: true, why: 'Ik koop de auto. Harm geeft mij korting, hij kent mijn vader nog.',
    title: 'Eigen auto kopen bij Ome Harm', goal: { type: 'require', req: 'car', shop: 'auto' }, cost: 800, waive: 'car',
    voorschot: { from: 'Harm', text: 'Voor de ringweg moet je een eigen auto hebben. Hier, een voorschot. Mijn pensioen hangt ervan af.' },
    lead: ['A', 'Jelle daagt je uit, Tammo: "Op de ringweg, met een eigen auto. As dat jild der is." Harm laat alleen eigen auto\'s starten. Kopen dus, niet lenen.'],
    say: ['A', 'Een eigen auto. Laten we hem kopen voordat we ons bedenken.'],
    done: ['A', 'Een eigen auto, op onze naam. Jelle mag komen.'],
    contact: [{ via: 'call', on: 'lead', from: 'jelle', caller: 'Onbekend nummer', mood: 'smug', lines: [
      ['jelle', 'Moai, Grinzer. Hier is Jelle. Wij moeten eens hardrijden, op jullie ringweg.', { tag: 'charmant, uitdagend, aan de telefoon' }],
      ['jelle', 'Met een eigen auto, hear. As dat jild der is.', { tag: 'plagend, neerbuigend, aan de telefoon' }],
    ] }] },
  { id: 'r-tuning', part: 'romp', kind: 'activity', player: 'tammo', built: true, why: 'Ik ga naar Knal & Kolder. Ik weet precies welk geluid ik wil.',
    title: 'Tuning bij Knal & Kolder (aanbevolen)', goal: { type: 'shop', shop: 'tuning', buy: ['u-motor', 'u-remmen', 'u-grip', 'u-turbo'], what: 'een tuning-upgrade' }, cost: 300, optional: true,
    lead: ['A', 'Jelle rijdt een opgevoerde trekker, en die is sneller dan hij eruitziet. Rij onze auto naar Knal & Kolder en druk R, voor wat extra paardjes.'],
    say: ['A', 'Een trekker inhalen. Dat regel ik wel even. Nou ja: jij.'],
    done: ['A', 'Hij klinkt als een boze koelkast. Kom maar op, trekker.'] },
  { id: 'H9', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'ringweg', why: 'Ik rij de ringweg. Die trekker is persoonlijk.',
    title: 'Ringweg-race: eindelijk klaar?', reward: 1200,
    lead: ['A', 'Harm staat bij de start van de ringweg. En Jelle ook, met zijn trekker-limo. Laten we hem inhalen.'],
    after: [['Sikkom', 'Er rijdt niets boven Groningen: Stadjers op het podium, Friese trekker op de vluchtstrook.'],
    ],
    contact: [{ via: 'call', from: 'jelle', mood: 'angry', lines: [
      ['jelle', 'Dit is net klear, Grinzer. Op Gronings Ontzet zien we wel wie het hardst gaat.', { tag: 'gepikeerd, gekwetste trots, aan de telefoon' }],
    ], after: [['A', 'Hij belt jou, Tammo. Hij vindt je leuk. Of eng.']] }] },
  { id: 'r-bijbaan', part: 'romp', kind: 'activity', player: 'anita', built: true, why: 'Ik doe de klus. Durk en Douwe kennen mijn gezicht nog niet.',
    title: 'Bijbaantje: Fietsdepot of Verhuizing', goal: { type: 'sideJob', job: ['fietsdepot', 'verhuizing'] },
    lead: ['T', 'Durk en Douwe hangen rond bij al onze vaste plekken, Jelle laat ons volgen. Een ronde bij het Fietsdepot of een verhuizing: daar zoekt niemand ons.'],
    say: ['T', 'Niemand kijkt naar iemand met een doos. Of met een fiets.'],
    done: ['T', 'Niemand heeft ons gezien. En nu weet ik ook hoe we langs die tweeling komen: met een duif.'] },
  { id: 'H10', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'vlag', why: 'Ik fluit wel een duif. Die touwen zijn zo los.',
    title: "Vlag van d'Olle Grieze", reward: 600,
    lead: ['A', 'Jelle heeft een reuzenvlag aan de Martinitoren gehangen. Met rode blaadjes. Daar moet een duif aan te pas komen. Fluiten maar, duivenkoning.'],
    after: [['Sikkom', 'Duif pikt Friese vlag van d\'Olle Grieze. Stadjers juichen, de toren zelf zegt niks.'],
    ],
    contact: [{ via: 'post', from: 'jelle', handle: 'JelleWâld', mood: 'angry', caption: 'selfievideo bij de Martinitoren', likes: '11.672', lines: [
      ['jelle', 'Wie heeft mijn flagge…? In DUIF?! Ik weet wel wie die duif is.', { tag: 'woedend, in een selfievideo' }],
      ['jelle', 'Friese meeuwen luisteren naar niemand. Ook niet naar mij.', { tag: 'jaloers, gepikeerd, in een selfievideo' }],
    ] }, { via: 'call', from: 'rikus', mood: 'night', lines: [
      ['rikus', 'Tammo! Rikus hier. Heel Grunn heeft het over een duif die een Friese vlag van de toren pikte.', { tag: 'warm, plagend, aan de telefoon' }],
      ['T', 'Ik zeg niks.', { tag: 'droog, aan de telefoon' }],
      ['rikus', 'Hoeft ook niet. Ik zeg het vannacht wel, op Nachtstreek. De duivenfluisteraar van het Oosterpark.', { tag: 'grinnikend, trots, aan de telefoon' }],
      ['T', 'Rikus. Niet doen.', { tag: 'deadpan, zuchtend, aan de telefoon' }],
      ['rikus', 'Te laat, ik heb al een jingle. En doe Anita de groeten. Die appt met Friesland, hoor ik.', { tag: 'plagend, samenzweerderig, aan de telefoon' }],
      ['T', '…Dat hoor ik ook steeds.', { tag: 'mompelend, stiekem jaloers, aan de telefoon' }],
    ] }] },
  { id: 'r-eierbal', part: 'romp', kind: 'activity', player: 'tammo', built: true, why: 'Ik zoek hem wel. Ik ruik een eierbal op honderd meter.',
    title: 'Verstopte eierbal zoeken', goal: { type: 'egg' },
    lead: ['A', 'Sinds 1953, het jaar van de Gouden Eierbal, verstopt Grunn overal eierballen. Er ligt er één vlakbij. Eén voor de moed, voordat we Durk en Douwe in de kroeg opzoeken.'],
    say: ['A', 'Wie een verstopte eierbal vindt, heeft geluk. Zegt mijn oma.'],
    done: ['A', 'Geluk gehad. Vanavond de Poelestraat, daar drinken Durk en Douwe.'] },
  { id: 'H11', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'kroegentocht', why: 'Ik doe de kroegen. Geert zegt dat ik beter tegen bier kan dan jij.',
    title: 'Kroegentocht: Poelestraat plat', reward: 600,
    lead: ['T', 'Geert van de Groote Griet zegt dat Durk en Douwe vanavond in de Poelestraat zijn. Een kroegentocht dus. Voor het onderzoek.'],
    after: [['T', 'Een skûtsje. Dat is een Friese zeilboot, toch? En die van Jelle ligt ergens hier in de stad.']] },
  { id: 'H12', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'fatbike', why: 'Ik loop wel tussen die fatbikes door. Ik ben toch al bont en blauw.',
    title: 'Fatbike-terreur: blijf overeind', reward: 500,
    lead: ['A', 'Oma Trijntje belt. Ze wil ons iets vertellen over de Eierbal, maar eerst moeten de fatbikes uit de Folkingestraat.'],
    after: [['Oma Trijntje', 'Breng hem thuis, jong. Niet voor het geld. Voor Grunn.']] },
  { id: 'H13', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'rondvaart', why: 'Ik vaar. Jij bent de gids: jij moet wijzen en praten.',
    title: 'Rondvaart met valse papieren', reward: 750,
    lead: ['T', 'Kapitein Klaas heeft een rondvaartboot die even van niemand is. Vanaf het water zien we misschien dat skûtsje.'] },

  // --- Staart ----------------------------------------------------------------
  { id: 's-boot', part: 'staart', kind: 'activity', player: 'anita', built: true, why: 'Ik huur de boot. Klaas geeft mij korting, hij noemt me meisje.',
    title: 'Eigen boot: huren bij Bootje Huren', goal: { type: 'require', req: 'boat', shop: 'boot' }, cost: 40, waive: 'boat',
    voorschot: { from: 'Kapitein Klaas', text: 'Voor een bootje. Ik wil dat skûtsje ook weleens zien zinken.' },
    lead: ['T', 'Klaas zegt dat het skûtsje vandaag losgooit. Wij hebben een eigen boot nodig: huur er een bij Bootje Huren. De sloep is genoeg.'],
    say: ['T', 'Een sloep met een bel. Jelle gaat trillen.'],
    done: ['T', 'Een boot op onze naam, voor een middag. Ik stuur, jij springt. Of andersom.'] },
  { id: 'H14', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'skutsje', why: 'Ik stuur. Ik heb vroeger op het Reitdiep gezeild. Twee keer.',
    title: 'Skûtsje-kraak', reward: 1300,
    lead: ['A', 'Onze huurboot ligt klaar. Stap in, Tammo: jij stuurt, en het skûtsje wacht niet.'],
    after: [['Sikkom', 'Twee Friese reuzen zwemmen door de Oosterhaven. Ooggetuige: "Dat heb ik van mien laven nog nait zain. Ze zwommen synchroon!"'],
    ],
    contact: [{ via: 'call', from: 'jelle', mood: 'smug', lines: [
      ['jelle', 'Sûkelade, Grinzers! Lekker? De echte gaat fan\'e jûn de lucht in.', { tag: 'lacherig, zelfvoldaan, aan de telefoon', clue: true }],
    ] }, { via: 'voicemail', from: 'douwe', lines: [
      ['douwe', 'Baas? Durk en ik zijn nat. We fietsen wel naar huis.', { tag: 'sloom, druipnat, aan de telefoon' }],
      ['douwe', 'Baas? O. Verkeerd nummer.', { tag: 'verward, beschaamd' }],
    ] }] },
  { id: 'H15', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'traumaduif', why: 'Ik vlieg die heli. Jij krijgt al hoogtevrees op een stoeprand.',
    title: 'Traumaduif', reward: 1500,
    lead: ['T', 'Dokter Dijkstra staat bij de traumaheli op het UMCG. Jij vliegt. Ik hang, schijnt het.'],
    after: [['Sikkom', 'Traumaheli haalt Gouden Eierbal uit ballon. UMCG: "Het stond niet in het rooster, maar het was een geslaagde operatie."'],
    ],
    contact: [{ via: 'call', from: 'jelle', mood: 'greide', lines: [
      ['jelle', 'Ik sta in een weiland bij Ten Boer. Mei kij. Dit is noch net klear, Grinzers.', { tag: 'buiten adem, boos en beledigd, aan de telefoon' }],
    ] }] },
  { id: 'H16', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'fjord', why: 'Het is mijn Fjord. Ik haal hem zelf terug.',
    title: 'Waar is de Fjord?', reward: 1100,
    lead: ['T', 'Anita. Niet schrikken. Je Fjord is weg. Jelmer zegt dat zijn chat hem bij het station zag.'],
    contact: [{ via: 'call', on: 'lead', from: 'mem', caller: 'Onbekend nummer (058)', lines: [
      ['mem', 'Anita, famke? Met mij. Myn jonges hebben dyn auto.', { tag: 'zacht, samenzweerderig, aan de telefoon' }],
      ['mem', 'Op de trein naar Ljouwert, fan\'e middei. Net fertelle dat ik belde.', { tag: 'stellig, warm, aan de telefoon', clue: true }],
      ['A', 'Tige tank. Eh… dank je. Ik zeg niks tegen Tammo.', { tag: 'fluisterend, een slechte Friese imitatie, aan de telefoon' }],
    ] }, { via: 'card', from: 'jelle', title: 'Een kaartje op de stoel van de Fjord', lines: [
      ['jelle', 'Tige tank voor het lenen van de auto. Hij rijdt beter dan mijn trekker. Net fertelle.', { tag: 'hardop voorlezend, stiekem onder de indruk' }],
    ], after: [['T', 'Hij stuurt nu ook complimentjes. Straks nodigt hij ons uit voor zijn verjaardag.']] }] },
  { id: 'H17', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'bod', why: 'Ik doe de boodschappen. Ik rem voor eieren, dat weet je.',
    title: 'Het Bod', reward: 600, cost: 300,
    voorschot: { from: 'Oma Trijntje', text: 'Voor de boodschappen. Een echte eierbal maak je niet met lege handen, jong.' },
    lead: ['A', 'Jelle wil ons spreken op het Stadsbalkon. Hij heeft een "bod", zegt hij. Neem geld mee voor boodschappen.'],
    after: [['Oma Trijntje', 'Mosterd, eieren en stoetbrood. Dan komt het goed, jong. Dat deed ik in 1953 ook zo.']],
    contact: [{ via: 'call', on: 'lead', from: 'jelle', mood: 'smug', lines: [
      ['jelle', 'Moai, Grinzers. Kom naar het Stadsbalkon. Ik heb een bod voor jullie.', { tag: 'zakelijk, charmant, aan de telefoon' }],
    ] }, { via: 'call', from: 'rikus', mood: 'night', lines: [
      ['rikus', 'Moi, Tammo. Ik hoor dat jullie op Gronings Ontzet gaan bakken. Ik sta vooraan.', { tag: 'warm, opgetogen, aan de telefoon' }],
      ['T', 'Het is een snackwedstrijd, Rikus. Geen concert.', { tag: 'droog, aan de telefoon' }],
      ['rikus', 'Voor mij wel. En zeg tegen Anita: de eerste friet uit de Fjord Frituur is voor mij.', { tag: 'plagend, vol bewondering, aan de telefoon' }],
      ['T', 'De eerste is voor mij.', { tag: 'stellig, deadpan, aan de telefoon' }],
      ['rikus', 'De tweede dan. Ik betaal. Voor één keer.', { tag: 'grinnikend, droog, aan de telefoon' }],
    ] }] },
  { id: 'H18', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'ontzet', why: 'Ik rij de finale. Jij bakt, ik haal die Eierbal terug.',
    title: 'Finale: Gronings Ontzet', reward: 4000,
    lead: ['T', 'Achtentwintig augustus. Gronings Ontzet. Onze kraam staat op de Grote Markt, en Jelle de zijne ook. Kom je?'],
    after: [['Sikkom', 'Gouden Eierbal terug in het museum. Friese snackkoning proeft Groninger eierbal en zegt niks. Wel twee keer.'],
    ],
    contact: [{ via: 'card', from: 'jelle', title: 'Een ansichtkaart uit Ljouwert', lines: [
      ['jelle', 'Moai dien, Grinzers. Volgend jaar weer? Dan mogen jullie naar Ljouwert komen.', { tag: 'warm, sportief, voorlezend' }],
    ], after: [['T', 'Wij tweeën vóór Grunn. Kon minder, hè?']] }] },
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

// "Wat weten we?" (pause menu, Missies tab): what Tammo and Anita know so far.
// A clue shows once its step is done, so the journal never spoils ahead.
// kind: 'clue' (about Jelle's plan), 'hart' (motivations and turning points).
export const WHY = {
  kop: 'Geld verdienen, en dan de Gouden Eierbal jatten en verkopen. Voor de Fjord Frituur.',
  romp: 'Uitzoeken wie W is, en waar de Gouden Eierbal nu is.',
  staart: 'De Eierbal terughalen. Niet om te verkopen, maar voor Grunn.',
};

export const CLUES = [
  { step: 'H1', kind: 'clue', title: 'Een Fries met een klomp', text: 'Berend: een Fries wilde zijn bakkie kopen. Contant, uit een klomp.' },
  { step: 'H2', kind: 'hart', title: 'De Fjord Frituur', text: 'Anita\'s droom: een eigen foodtruck. Vier wielen, geen kenteken. Sjabbe zegt: het echte geld ligt in het museum.' },
  { step: 'H3', kind: 'clue', title: 'JelleWâld', text: 'In Jelmers chat: "Moai stedsje. Foar in wykein." Fries dus.' },
  { step: 'H4', kind: 'clue', title: 'De trekker-limo', text: 'Een zwarte trekker met een limousine erachter bij de achterdeur van het museum. Twee reuzen stapten uit. "De baas bliuwt sitten."' },
  { step: 'H5', kind: 'clue', title: 'Us Mem Snacks', text: 'Studententeam Snits Snel werd gesponsord door Us Mem Snacks.' },
  { step: 'H6', kind: 'clue', title: 'De lege vitrine', text: 'Iemand was ons voor. Op het kussen: "Tige tank! – W." W van JelleWâld: Jelle Terpstra liet live een gouden bal zien.' },
  { step: 'H7', kind: 'clue', title: 'Al het frituurvet', text: 'Durk en Douwe kochten al het vet van Grunn. Durk, per ongeluk aan de telefoon: "Gjin fet, gjin aaibal op Gronings Ontzet."' },
  { step: 'H8', kind: 'clue', title: 'Operaasje Aaibal', text: 'Zonder vet bakt niemand in Grunn een eierbal op Gronings Ontzet. Dan wint Jelle de Noordelijke Snackprijs.' },
  { step: 'H9', kind: 'clue', title: 'Een Fries op de ringweg', text: 'Jelle rijdt zelf in de trekker-limo. Hij verloor, en belde boos: "Dit is net klear."' },
  { step: 'H10', kind: 'clue', title: 'De vlag', text: 'Jelle hing een Friese vlag aan d\'Olle Grieze. Een duif pikte hem los. Hij weet wie die duif is.' },
  { step: 'H11', kind: 'clue', title: 'Het skûtsje', text: 'Durk, dronken in de Poelestraat: "De bal leit op it skûtsje."' },
  { step: 'H12', kind: 'hart', title: 'Oma Trijntje, 1953', text: 'Oma Trijntje stond model voor de Eierbal. "Die bal is gien geld, jong. Die bal is Grunn." Misschien moeten we hem niet verkopen.' },
  { step: 'H13', kind: 'hart', title: 'Wij tweeën', text: 'Na de rondvaart: de kus. "Wij tweeën tegen Grunn… of misschien: vóór Grunn."' },
  { step: 'H14', kind: 'clue', title: 'Chocola', text: 'De Eierbal op het skûtsje was van chocola, met goudpapier. De echte gaat vanavond per ballon de stad uit.' },
  { step: 'H15', kind: 'clue', title: 'De echte Eierbal', text: 'Uit de mand gehaald, boven Grunn. Hij is zwaar, en hij smelt niet. Jelle staat in een weiland bij Ten Boer.' },
  { step: 'H16', kind: 'clue', title: 'De Fjord', text: 'Jelle liet de Fjord jatten: hij wil ons weg hebben voor Gronings Ontzet.' },
  { step: 'H17', kind: 'hart', title: 'Het besluit', text: '"Hij hoort in Grunn." Als we winnen, gaat de Eierbal terug naar het museum.' },
  { step: 'H18', kind: 'hart', title: 'Vóór Grunn', text: 'De Eierbal staat weer in het museum. Jelle vond onze eierbal beter. Net fertelle.' },
];
