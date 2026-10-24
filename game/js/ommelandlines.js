// Text of the Ommeland extras (worldends.js, dorpsuitjes.js, pg_koe.js) as
// pure data, so scripts/voicelines_collect.mjs can read it in Node. Spoken
// lines are recorded into the lines manifest ("<speaker>|<text>"); a DUO line
// is said by the companion (the one you don't play) and recorded for Tammo
// and Tessa both. Gronings and Frisian lines get their Dutch in subtitles.js.
// `tag` is the TTS delivery.

export const DUO = 'duo';

// --- wereldeinden -------------------------------------------------------------
// Where a real road runs off the edge of the Ommeland data. prop: what
// worldends.js builds there; sign: [big, small] on a board; west: goes to
// the ends on the Frisian side first.
export const WORLD_ENDS = [
  { id: 'bord', name: 'Het laatste bord', prop: 'bord', sign: ['Hier houdt Grunn op.', 'Kon minder.'], who: DUO, text: 'Hier houdt Grunn op. Kon minder. Eerlijk bord.', tag: 'droog, knikkend, onder de indruk' },
  { id: 'fries', name: 'De verdwaalde Fries', prop: 'fries', west: true, who: 'Verdwaalde Fries', text: 'Wêr is Fryslân? Ik sprong over één sloot te veel en nu is alles Gronings.', tag: 'verward, zoekend, licht wanhopig' },
  { id: 'boer', name: 'De boer bij het hek', prop: 'boer', who: 'Boer Hindrik', text: 'Doar achter is niks meer, mien jong. Doar holdt de wereld op. Ik heb t zulf zain.', tag: 'stellig, samenzweerderig, heel serieus' },
  { id: 'koe', name: 'De koe op de weg', prop: 'koe', who: 'Koe Aaltje', text: 'Verder dan hier ga ik niet. En jij ook niet. Boe.', tag: 'deadpan, onverstoorbaar' },
  { id: 'werk', name: 'Wegwerkzaamheden', prop: 'werk', sign: ['Wegwerkzaamheden tot 2029', 'Daarna zien we wel'], who: 'Harm', text: 'Wij zijn hier sinds 2019 bezig. Nog even, dan is het af. Of wij.', tag: 'gemoedelijk, leunend op zijn schop' },
  { id: 'radio', name: 'Het busje van Rikus', prop: 'radio', who: 'Rikus', text: 'Radio Nachtstreek, live vanaf het einde van de wereld. Het bereik is hier prima. Er staat ook niks in de weg.', tag: 'warm, droog, als nacht-dj op de radio' },
  { id: 'friesland', name: 'Welkom in Friesland', prop: 'friesland', west: true, sign: ['Welkom in Fryslân', 'Dy kant op'], who: DUO, text: 'Welkom in Friesland? Die pijl wijst gewoon terug naar Grunn.', tag: 'ongelovig, lacherig' },
  { id: 'bankje', name: 'Het bankje met uitzicht', prop: 'bankje', sign: ['Uitzichtpunt', 'Niks'], who: 'Oma Geessien', text: 'Mooi, hè? Hier kiek ik al veertig joar noar. Der is nog nooit wat veranderd.', tag: 'tevreden, warm, rustig' },
  { id: 'toerist', name: 'De verdwaalde toeriste', prop: 'toerist', who: 'Verdwaalde toeriste', text: 'Mijn navigatie zegt: u bent er. Maar waar is er dan?', tag: 'verbaasd, een tikje bekakt' },
  { id: 'frituur', name: 'De laatste frituur', prop: 'frituur', sign: ['Laatste frituur voor het einde', 'Gesloten wegens einde'], who: DUO, text: 'De laatste frituur voor het einde van de wereld. En hij is dicht. Dit is pas echt het einde.', tag: 'teleurgesteld, dramatisch' },
  { id: 'fietsen', name: 'Het fietsenkerkhof', prop: 'fietsen', sign: ['Gevonden fietsen', 'Heel Grunn eindigt hier'], who: DUO, text: 'Dus hier eindigen al die gejatte fietsen. Die rode is van mij. Kwijt sinds 2014.', tag: 'verbaasd, verontwaardigd' },
  { id: 'brievenbus', name: 'De laatste brievenbus', prop: 'brievenbus', sign: ['Laatste lichting', 'Nooit'], who: DUO, text: 'Laatste lichting: nooit. Eindelijk een brievenbus die eerlijk is.', tag: 'droog, geamuseerd' },
];
export const WORLD_END_TOTAL = WORLD_ENDS.length;

// All twelve found: the companion's verdict, then a Kiekdoar headline (a ping only).
export const WORLD_END_FINAL = {
  who: DUO, text: 'Twaalf keer het einde van de wereld. En we staan er nog. Kon minder.', tag: 'droog, stiekem trots',
  news: 'KIEKDOAR: Stadjer vindt alle twaalf randen van de wereld. Wetenschappers: "Dan is hij dus toch plat."',
};

// --- dorpsuitjes ----------------------------------------------------------------
// One thing to do per village along the railway (special), one place to eat,
// shop or hire a bike (amenity) and a hidden eierbal. `lines` are spoken by
// `who`; shop stock and prices live in dorpsuitjes.js.
export const VILLAGES = {
  Haren: {
    gro: 'Hoaren', teaser: 'Tennis bij TC De Gladde Bal en een bakje in het dorpscafé',
    special: { kind: 'tennis', name: 'TC De Gladde Bal', label: 'Ballen slaan', sub: 'Tegen de ballenmachine: €8, daarna een poos fit', who: 'Trainer Bouke', tag: 'enthousiast, een tikje bekakt',
      lines: { start: 'Zes ballen. Raak ze als ze in het groene vak zijn. Witte sokken zijn verplicht, maar ik kijk even niet.', good: 'Strak! Jij moet lid worden. De wachtlijst is maar vier jaar.', bad: 'Nou ja. De ballenmachine vond het gezellig.' } },
    amenity: { kind: 'cafe', name: 'Café De Hoarnster Hoek', who: 'Kroegbaas Roelf', tag: 'joviaal, gemoedelijk',
      lines: ['Moi! n Bakje kovvie en n plak kouk? Doar wordst weer mens van.', 'Stadjers in Hoaren. Kiek, dat mag ook wel es.'] },
  },
  Zuidhorn: {
    gro: 'Zuudhorn', teaser: 'Een rondvaartje over het kanaal en fietsen huren bij het station',
    special: { kind: 'boot', name: 'Rondvaartje Starkenborgh', label: 'Mee met het rondvaartje', sub: 'Een kwartiertje over het kanaal: €6', who: 'Schipper Lammert', tag: 'droog, vertellend door een bootspeaker',
      lines: ['Instappen! Links ziet u weiland. Rechts ook.', 'Dit kanaal gaat helemaal naar Friesland. Wij keren ruim op tijd om.', 'Zo. Dat was het. Mooier wordt het niet.'] },
    amenity: { kind: 'fiets', name: 'Fietsverhuur Zuudhorn' },
  },
  Sauwerd: {
    teaser: 'De Groningse dorpsquiz in het café en een eerlijke kast met streekproducten',
    special: { kind: 'quiz', name: 'Dorpsquiz in Café t Wierdje', label: 'Meedoen met de dorpsquiz', sub: 'Drie vragen over het Gronings, goed antwoord is geld', who: 'Kroegbaas Tjakko', tag: 'joviaal, plagend, als een quizmaster',
      lines: { start: 'Drij vroagen over t Grunnegs. Goud antwoord, goud geld.', right: 'Goud zo! Doe bist n echte Grunneger.', wrong: 'Nee, mien jong. Dat is t nait.', all: 'Alle drij goud! Doar mout ik n rondje van geven.' } },
    amenity: { kind: 'winkel', name: 'De Eerlijke Kast' },
  },
  Winsum: {
    teaser: 'De molen beklimmen en een boerderijwinkel',
    special: { kind: 'molen', name: 'Molen De Wiekslag', label: 'De stelling op', sub: 'Uitzicht over het Reitdiep, van molenaar Fenna', who: 'Molenaar Fenna', tag: 'trots, warm, vertellend',
      lines: ['Welkom op de stelling. Hou je vast, de wind is hier altied eerlijk.', 'Doar ligt t Reitdiep. Vroeger voeren ze zo noar zee. Nou voaren d\'r allent nog toeristen.'] },
    amenity: { kind: 'winkel', name: 'Boerderijwinkel De Volle Melkbus' },
  },
  Bedum: {
    gro: 'Beem', teaser: 'Op de foto met de scheve toren en fietsen huren',
    special: { kind: 'toren', name: 'De scheve toren van Beem', label: 'Op de foto met de toren', sub: 'Koster Egbert maakt hem voor je', who: 'Koster Egbert', tag: 'droog, trots, met een knipoog',
      lines: ['Pisa het n scheve toren. Wie hebben n schevere. Moak mor n foto.', 'Mooi! Nou liekt t net of ie hom tegenholden.'] },
    amenity: { kind: 'fiets', name: 'Fietsverhuur Beem' },
  },
  Stedum: {
    teaser: 'Uitkijken vanaf de wierde en de boerderijwinkel van boerin Geesje',
    special: { kind: 'wierde', name: 'De wierde van Stedum', label: 'Uitkijken over de wierde', sub: 'Hier woonden ze al hoog en droog', who: 'Rikus', tag: 'warm, vertellend, als een terugblik',
      lines: ['Een wierde. Hier gooiden ze een bult op tegen de zee, eeuwen voor de dijken.', 'De zee is weg. De bult is gebleven. De mensen ook.'] },
    amenity: { kind: 'winkel', name: 'Boerderijwinkel Geesje', who: 'Boerin Geesje', tag: 'hartelijk, stellig',
      lines: ['Moi! Alles van t aigen erf. Behalve de klanten.', 'Eet smakelk! En nait alles in ain moal, hè.'] },
  },
  Loppersum: {
    teaser: 'De klok luiden bij de klokkenstoel en een praatje in het café',
    special: { kind: 'klok', name: 'De klokkenstoel', label: 'De klok luiden', sub: 'Koster Menno kijkt mee', who: 'Koster Menno', tag: 'nors maar goedmoedig',
      lines: { first: 'Ain keer luden mag. Veur de gezelligheid.', more: 'Zo is t wel mooi west! t Hele dörp stait noast t bèr.' } },
    amenity: { kind: 'cafe', name: 'Café t Olle Kerkpad', who: 'Kroegbaas Wilma', tag: 'hartelijk, kletserig',
      lines: ['Moi! Wat mag t wezen? Wie hebben kovvie, bier en proatjes.', 'Kom der mor weer ais. Loppersum lopt nait weg.'] },
  },
  Kropswolde: {
    teaser: 'Een ijsje bij de strandtent aan het Zuidlaardermeer',
    amenity: { kind: 'strandtent', name: 'Strandtent De Natte Voet', who: 'Strandtent Tineke', tag: 'zonnig, gezellig',
      lines: ['Moi! IJsje, patatje of allebei? Hier op t strand telt t nait.', 'Nait te lang in de zun, hè. Ook nait in Grunn.'] },
  },
};

// Gronings word quiz in Sauwerd: three per round, [question, right, wrong, wrong].
export const QUIZ = [
  ['Wat is "kovvie"?', 'Koffie', 'Een koe', 'Een kast'],
  ['Wat betekent "nait"?', 'Niet', 'Nacht', 'Naad'],
  ['Wat is "stoet"?', 'Brood', 'Een stoel', 'Een optocht'],
  ['Wat is een "wicht"?', 'Een meisje', 'Gewicht', 'Wind'],
  ['Wat is "hoes"?', 'Huis', 'Hoest', 'Een broek'],
  ['Wat is "kouk"?', 'Koek', 'Een kok', 'Een koe'],
  ['Wat is "mooi weer spelen"?', 'Doen alsof alles goed is', 'Buiten spelen', 'Kaarten bij zon'],
  ['Wat betekent "kon minder"?', 'Heel goed', 'Kan beter', 'Te weinig'],
];

// --- De Koe van Ome Jan (pg_koe.js) ----------------------------------------------
// Speakers by key: J Ome Jan, G Koe Geertje, D Durk, O Douwe, T Tammo, A Tessa.
export const KOE_WHO = { J: 'Ome Jan', G: 'Koe Geertje', D: 'Durk', O: 'Douwe', T: 'Tammo', A: 'Anita' };
export const KOE_LINES = {
  intro: [
    ['J', 'Moi. Geertje is vot. Mien beste kou. Kampioen van t Ommeland, drij joar achter nkander.', 'wanhopig maar nuchter'],
    ['T', 'Wie steelt er nou een koe?', 'verbaasd, droog'],
    ['J', 'Twij grote kerels in rooie truien, op ain fiets. Ze proatten zo raar.', 'verontwaardigd, vertellend'],
    ['A', 'Durk en Douwe. Die fatbike kennen we.', 'zuchtend, ad rem'],
    ['T', 'Wat moeten die nou met een koe?', 'droog, verbaasd'],
    ['J', 'Gain idee. Ze zitten in de olle schuur, verderop in t laand. Hoal heur weer, den krigst wat van mie.', 'smekend, gemoedelijk'],
    ['J', 'Maak heur lös en rij heur noar t erf. Ze rent wel mit. Ze is kampioen.', 'stellig, duidelijk'],
  ],
  outro: [
    ['J', 'Geertje! Mien wicht! Doar bist weer.', 'ontroerd, opgelucht'],
    ['G', 'Boe. Die schuur was niks. Te veel Friezen.', 'deadpan, droog'],
    ['A', 'Jelle appt. Durk en Douwe komen morgen sorry zeggen. Lopend.', 'grinnikend, ad rem'],
    ['T', 'Graag gedaan, Jan. Kon minder.', 'droog, stiekem trots'],
    ['J', 'Hier, veur de muite. En n stukje kees van t erf.', 'dankbaar, hartelijk'],
  ],
  // Ome Jan at his gate (a bubble): before and after
  greet: ['Moi! Hebben jim mien Geertje ook zain?'],
  thanks: ['Geertje stait weer op stal. Doe mor rustig an.'],
  // at the barn
  spotted: [['D', 'Douwe. Daar komt ien aan.', 'traag, argwanend'], ['O', 'Doe gewoan. Wij zijn gewoon boeren.', 'traag, sloom']],
  untie: [['G', 'Boe. Eindelijk iemand met verstand.', 'deadpan, opgelucht']],
  alarm: [['D', 'Hé! Dat is ús koe!', 'verontwaardigd, luid'], ['O', 'Naar de trekker, Durk! Gau!', 'gehaast, paniekerig']],
  chase: [['D', 'Stean bliuwe, koe!', 'schreeuwend vanaf een trekker'], ['O', 'Ze loopt harder dan de trekker!', 'verbaasd, buiten adem'], ['D', 'Jelle mag dit net weten.', 'nerveus'], ['O', 'Jelle wit it al, Durk.', 'berustend, sloom']],
  close: [['D', 'Hebbe! Bijna!', 'opgewonden, graaiend']],
  ram: [['D', 'Ús motor! Hij is stil!', 'geschrokken, klagend'], ['O', 'Niet aan de limo komen! Die is fan Jelle!', 'paniekerig']],
  broken: [['O', 'Hij doet het net mear. Wij lopen wel naar hûs.', 'berustend, traag']],
  lost: [['D', 'Hebbe! Op nei Ljouwert!', 'triomfantelijk, lomp']],
  // the companion during the escort
  duo: {
    go: ['Kom op, Geertje! Naar huis!'],
    wait: ['Geertje blijft staan. Terug, ze wacht op ons!'],
    near: ['Die trekker zit vlak achter haar!', 'Ram die trekker! Dan zijn ze even stil.'],
  },
};
// Jelle rings once you're on your way to the barn (phonefeed.js startCall).
export const KOE_CALL = [
  { speaker: 'Jelle Terpstra', text: 'Moai, Grinzers. Durk en Douwe hebben een koe meegenomen. Zonder te vragen.' },
  { speaker: 'Anita', text: 'Meegenomen? Gejat, bedoel je!' },
  { speaker: 'Jelle Terpstra', text: 'Ze wilden mij toch nog iets laten winnen. De keuring in Ljouwert, met een Grinzer koe. Ik skamje my dea.' },
];
