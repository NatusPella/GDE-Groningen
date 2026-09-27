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
//
// GOAL TYPES (story.js GOALS)
//   { type: 'shop', shop }            enter a shop of that type (shops.js SHOP_TYPES key)
//   { type: 'require', req, shop }    missions.js requirement met; route to the nearest `shop`
//                                     (an array routes to the nearest of several types)
//   { type: 'pigeon', spot, score }   poop score >= score in one flight (spot: pigeonspots.js id)
//   { type: 'sideJob', job }          one more round of that side job (sidejobs.js id, or an array: any of them)
//   { type: 'night' }                 wait at a garage until it's dark (or it already is)
//   { type: 'train' }                 one train trip (stationtravel.js), routed to the nearest station
//   { type: 'egg' }                   find one more hidden eierbal (achievementtracker), routed to the nearest

// card: the two lines on the "Wordt vervolgd" card where the built story stops.
export const PARTS = {
  kop: { title: 'Kop: "Moi, Grunn"', open: true, end: 'Einde van de Kop',
    card: [['Anita', 'Iemand heeft onze Eierbal gejat.'], ['Tammo', 'Die was nog niet eens van ons.']] },
  romp: { title: 'Romp: "Stad in rouw"', open: true, end: 'Einde van de Romp',
    card: [['Anita', 'Een skûtsje in de Oosterhaven. Met onze Eierbal erop.'], ['Tammo', 'Met Grunn z\'n Eierbal, bedoel je.']] },
  // the last part's card is the ending: an epilogue and credits (story.js playFinale)
  staart: { title: 'Staart: "Gronings Ontzet"', open: true, end: 'Einde', finale: true,
    card: [['Verteller', 'De Gouden Eierbal staat weer in het Groninger Museum. Achttien karaat, en nu met een alarm dat het doet.'],
      ['Verteller', 'Jelle Terpstra proefde op de Grote Markt zijn eerste echte Groninger eierbal.'],
      ['Jelle Terpstra', 'Dit is… better as ús. Net fertelle.'],
      ['Verteller', 'Van de beloning kwam de Fjord Frituur. Vier wielen, geen kenteken, en een rij tot aan d\'Olle Grieze.'],
      ['Anita', 'De allereerste is voor jou, Tammo.'],
      ['Tammo', 'Mag ik nou eindelijk?'],
      ['Anita', 'Ja. Alles voor één eierbal.']] },
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
  { id: 'H1', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'berend', title: "Bommen Berend wil z'n bakkie", reward: 400, minReward: 100,
    lead: ['T', 'Berend belde. Zijn bakkie moet naar het Boterdiep, en hij telt de krassen. Jij rijdt, zegt hij.'] },
  { id: 'k-eierbal', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Eierbal halen bij Frituur Vet & Lekker', goal: { type: 'shop', shop: 'snack' }, cost: 4,
    lead: ['A', 'Berend zei dat er al een Fries zijn bakkie wilde kopen. Contant, uit een klomp. Daar moet jij even over nadenken, en jij denkt het best met een eierbal. Frituur Vet & Lekker staat op je kaart.'],
    say: ['A', 'Een Fries met een klomp vol geld. Dat zit me niet lekker.'],
    done: ['A', 'Zo, je glimt weer. En nu die automaat in de Herestraat, voordat die Fries hem ook koopt.'] },
  { id: 'H2', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'pinautomaat', title: 'Pinnen met de hele automaat', reward: 400,
    lead: ['T', 'Die automaat van gisteren staat nog in de Herestraat. Jij wilde hem verzilveren, toch?'] },
  { id: 'k-wapen', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Pistool kopen bij Pang & Zo', goal: { type: 'require', req: 'weapon', shop: 'wapens' }, cost: 120, waive: 'weapon',
    voorschot: { from: 'Sjabbe', text: 'Hier, een voorschot voor een blaffer. Terugbetalen met rente. Of met een Eierbal.' },
    lead: ['T', 'Jelmer wil zijn stunt op de Grote Markt, maar hij leent niks meer uit. Met de poen van Sjabbe koop jij een blaffer bij Pang & Zo.'],
    say: ['T', 'Ik hou de deur open. Jij kiest iets dat niet echt afgaat. Hoop ik.'],
    done: ['T', 'Klapperman. Jelmer wacht al op de Grote Markt met zijn telefoon.'] },
  { id: 'H3', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'chaos', title: 'Chaos op de Grote Markt', reward: 500,
    lead: ['A', 'Jelmer wil content op de Grote Markt. Nu hebben we er ook iets voor.'] },
  { id: 'k-duif', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Vliegles bij de duiven op de Grote Markt', goal: { type: 'pigeon', spot: 'grotemarkt', score: 20 },
    lead: ['A', 'Sjabbe zei: echt geld ligt in het museum. Dan moeten we het eerst van boven zien. Leer vliegen bij de duiven op de Grote Markt: twintig poeppunten.'],
    say: ['A', 'Niemand kijkt naar een duif. Dat is ons plan.'],
    done: ['A', 'Twintig raak. Nu kun je naar het museum vliegen zonder dat iemand iets doorheeft.'] },
  { id: 'H4', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'duifverkenning', title: 'Duif op verkenning', reward: 350,
    lead: ['A', 'Duivenmelker Bert staat bij het Stationsplein. Tijd om het museum te verkennen.'] },
  { id: 'k-bijbaan', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Eén ronde Hap & Rap bezorgen', goal: { type: 'sideJob', job: 'bezorger' },
    lead: ['T', 'Wat we bij het museum zagen, kost geld: spullen, een boot misschien. Sjabbe wil contant. Eén ronde Hap & Rap bezorgen.'],
    say: ['T', 'Bezorgen is net kraken. Je belt aan en je bent weer weg.'],
    done: ['T', 'Eén ronde en ik ruik naar kapsalon. Maar de kraakpot groeit.'] },
  { id: 'k-fiets', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Eigen fiets kopen bij Trap & Toeter', goal: { type: 'require', req: 'bike', shop: 'fietsen' }, cost: 75, waive: 'bike',
    voorschot: { from: 'Sjoerd', text: 'Geen geld voor een fiets? Hier, uit de pot van de KEI-commissie. Niet verder vertellen.' },
    lead: ['A', 'Sjoerd van de KEI-commissie weet alles wat er rond het museum fietst. Hij praat alleen met wie meedoet, en meedoen mag alleen op een eigen fiets. Trap & Toeter.'],
    say: ['A', 'Gekocht, hè. Een geleende fiets telt niet bij Sjoerd.'],
    done: ['A', 'Een eigen fiets met bonnetje. Nu gaat Sjoerd wel praten.'] },
  { id: 'H5', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'kei', title: 'KEI-weekrace door Grunn', reward: 550,
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Eerstejaars inhalen, dat kun jij.'] },
  { id: 'k-kraakspullen', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Zwart incognito of een huurboot', goal: { type: 'require', req: 'heist', shop: ['kleding', 'boot'] }, cost: 150, waive: 'incognito',
    voorschot: { from: 'Sjabbe', text: 'Voor het museum wil je niet opvallen. Hier, een voorschot. Ik reken op jullie.' },
    lead: ['T', 'Bert zag camera\'s en bewakers. Dus niet opvallen: zwart incognito bij Stoer & Stads, of via het water met een bootje van Bootje Huren. Jij kiest.'],
    say: ['T', 'Zwart staat jou goed. Mij staat alles slecht, dus dat maakt niet uit.'],
    done: ['T', 'Nou zijn we echte boeven. Met bonnetje. Nu nog het donker.'] },
  { id: 'k-nacht', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Wachten bij de garage tot het donker is', goal: { type: 'night' }, waive: 'night',
    lead: ['T', 'De bewakers wisselen pas \'s avonds. Rij naar een garage en wacht daar tot het donker is.'],
    say: ['T', 'Henk heeft koffie. Henk vraagt nooit waarom.'],
    done: ['T', 'Donker. De bewakers wisselen. Het is tijd.'] },
  { id: 'H6', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'museumkraak', title: 'De Museumkraak', reward: 400,
    lead: ['T', 'Het is zover. De Museumkraak. Via het Verbindingskanaal, jouw plan.'],
    after: [['Sikkom', 'Gouden Eierbal foetsie. Stad in rouw. Museum: "Wij snappen er niks van, de camera\'s stonden uit."'],
      ['Jelle Terpstra · live', 'Moai, Grinzers! Hier is Jelle. Operaasje Aaibal is begonnen. Oant sjen op Gronings Ontzet!']],
    unlocks: 'jelle' },

  // --- Romp ----------------------------------------------------------------
  { id: 'r-trein', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Even onderduiken: een treinreis', goal: { type: 'train' }, cost: 8,
    lead: ['T', 'Heel Grunn zoekt de Eierbal, en wij stonden met een zaklamp in dat museum. Even onderduiken: pak de trein, maakt niet uit waarheen.'],
    say: ['T', 'Als iemand vraagt waar we gisteravond waren: in de trein.'],
    done: ['T', 'Niemand keek naar ons. Iedereen keek naar Sikkom. En die Jelle heeft het over "Operaasje Aaibal".'] },
  { id: 'H7', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'noorderzon', title: 'Spoedklus voor Noorderzon', reward: 850,
    lead: ['A', 'Femke van Noorderzon belt. Spoedklus, decor moet naar het Noorderplantsoen. En ze heeft iets gezien, zegt ze.'],
    after: [['Sikkom', 'Frituurvet uitverkocht in heel Grunn. Groothandel: "Twee reuzen op ain fatbike kochten alles op. Contant, oet n klomp. Kon minder, veur ons."']] },
  { id: 'r-uzi', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Uzi kopen bij Pang & Zo (aanbevolen)', goal: { type: 'shop', shop: 'wapens' }, cost: 300, optional: true,
    lead: ['T', 'Femke zegt dat al het vet de stad uit rijdt, in een tankwagen. Een Ratelaar bij Pang & Zo prikt makkelijker door zijn banden. Hoeft niet, helpt wel.'],
    say: ['T', 'Het gaat om banden, hè. Niet om mensen.'],
    done: ['T', 'Ratelaar. Nu die tankwagen, voordat het vet in Friesland is.'] },
  { id: 'H8', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'vetgekaapt', title: 'Vet gekaapt', reward: 950,
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Durk en Douwe achter het stuur. Tijd voor banden.'],
    after: [['Jelle Terpstra · live', 'Dat vet was van mij! No ja. Ik heb meer. Operaasje Aaibal gaat gewoon door, Grinzers.'],
      ['T', 'Geen vet, geen frituur. Geen frituur, geen eierbal op Ontzet. Dat is zijn plan, hè?']] },
  { id: 'r-auto', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Eigen auto kopen bij Ome Harm', goal: { type: 'require', req: 'car', shop: 'auto' }, cost: 800, waive: 'car',
    voorschot: { from: 'Harm', text: 'Voor de ringweg moet je een eigen auto hebben. Hier, een voorschot. Mijn pensioen hangt ervan af.' },
    lead: ['A', 'Jelle daagt je uit, Tammo: "Op de ringweg, met een eigen auto. As dat jild der is." Harm laat alleen eigen auto\'s starten. Kopen dus, niet lenen.'],
    say: ['A', 'Een eigen auto. Laten we hem kopen voordat we ons bedenken.'],
    done: ['A', 'Een eigen auto, op onze naam. Jelle mag komen.'] },
  { id: 'r-tuning', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Tuning bij Knal & Kolder (aanbevolen)', goal: { type: 'shop', shop: 'tuning' }, cost: 300, optional: true,
    lead: ['A', 'Jelle rijdt een opgevoerde trekker, en die is sneller dan hij eruitziet. Rij onze auto naar Knal & Kolder en druk R, voor wat extra paardjes.'],
    say: ['A', 'Een trekker inhalen. Dat moet te doen zijn. Toch?'],
    done: ['A', 'Hij klinkt als een boze koelkast. Kom maar op, trekker.'] },
  { id: 'H9', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'ringweg', title: 'Ringweg-race: eindelijk klaar?', reward: 1200,
    lead: ['A', 'Harm staat bij de start van de ringweg. En Jelle ook, met zijn trekker-limo. Laten we hem inhalen.'],
    after: [['Sikkom', 'Er rijdt niets boven Groningen: Stadjers op het podium, Friese trekker op de vluchtstrook.'],
      ['Jelle Terpstra', 'Dit is net klear, Grinzer. Op Gronings Ontzet zien we wel wie het hardst gaat.'],
      ['A', 'Hij stuurt jou berichtjes, Tammo. Hij vindt je leuk. Of eng.']] },
  { id: 'r-bijbaan', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Bijbaantje: Fietsdepot of Verhuizing', goal: { type: 'sideJob', job: ['fietsdepot', 'verhuizing'] },
    lead: ['T', 'Durk en Douwe hangen rond bij al onze vaste plekken, Jelle laat ons volgen. Een ronde bij het Fietsdepot of een verhuizing: daar zoekt niemand ons.'],
    say: ['T', 'Niemand kijkt naar iemand met een doos. Of met een fiets.'],
    done: ['T', 'Niemand heeft ons gezien. En nu weet ik ook hoe we langs die tweeling komen: als duif.'] },
  { id: 'H10', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'vlag', title: "Vlag van d'Olle Grieze", reward: 600,
    lead: ['A', 'Jelle heeft een reuzenvlag aan de Martinitoren gehangen. Met rode blaadjes. Daar moet een duif aan te pas komen. Jij dus.'],
    after: [['Sikkom', 'Duif pikt Friese vlag van d\'Olle Grieze. Stadjers juichen, de toren zelf zegt niks.'],
      ['Jelle Terpstra', '[selfie met een boos gezicht] Wie heeft mijn flagge…? In DUIF?! Ik weet wel wie die duif is.']] },
  { id: 'r-eierbal', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Verstopte eierbal zoeken', goal: { type: 'egg' },
    lead: ['A', 'Sinds 1953, het jaar van de Gouden Eierbal, verstopt Grunn overal eierballen. Er ligt er één vlakbij. Eén voor de moed, voordat we Durk en Douwe in de kroeg opzoeken.'],
    say: ['A', 'Wie een verstopte eierbal vindt, heeft geluk. Zegt mijn oma.'],
    done: ['A', 'Geluk gehad. Vanavond de Poelestraat, daar drinken Durk en Douwe.'] },
  { id: 'H11', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'kroegentocht', title: 'Kroegentocht: Poelestraat plat', reward: 600,
    lead: ['T', 'Geert van de Groote Griet zegt dat Durk en Douwe vanavond in de Poelestraat zijn. Een kroegentocht dus. Voor het onderzoek.'],
    after: [['T', 'Een skûtsje. Dat is een Friese zeilboot, toch? En die van Jelle ligt ergens hier in de stad.']] },
  { id: 'H12', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'fatbike', title: 'Fatbike-terreur: blijf overeind', reward: 500,
    lead: ['A', 'Oma Trijntje belt. Ze wil ons iets vertellen over de Eierbal, maar eerst moeten de fatbikes uit de Folkingestraat.'],
    after: [['Oma Trijntje', 'Breng hem thuis, jong. Niet voor het geld. Voor Grunn.']] },
  { id: 'H13', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'rondvaart', title: 'Rondvaart met valse papieren', reward: 750,
    lead: ['T', 'Kapitein Klaas heeft een rondvaartboot die even van niemand is. Vanaf het water zien we misschien dat skûtsje.'] },

  // --- Staart ----------------------------------------------------------------
  { id: 's-boot', part: 'staart', kind: 'activity', player: 'anita', built: true, title: 'Eigen boot: huren bij Bootje Huren', goal: { type: 'require', req: 'boat', shop: 'boot' }, cost: 40, waive: 'boat',
    voorschot: { from: 'Kapitein Klaas', text: 'Voor een bootje. Ik wil dat skûtsje ook weleens zien zinken.' },
    lead: ['T', 'Klaas zegt dat het skûtsje vandaag losgooit. Wij hebben een eigen boot nodig: huur er een bij Bootje Huren. De sloep is genoeg.'],
    say: ['T', 'Een sloep met een bel. Jelle gaat trillen.'],
    done: ['T', 'Een boot op onze naam, voor een middag. Ik stuur, jij springt. Of andersom.'] },
  { id: 'H14', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'skutsje', title: 'Skûtsje-kraak', reward: 1300,
    lead: ['A', 'Onze huurboot ligt klaar. Stap in, Tammo: jij stuurt, en het skûtsje wacht niet.'],
    after: [['Sikkom', 'Twee Friese reuzen zwemmen door de Oosterhaven. Ooggetuige: "Dat heb ik van mien laven nog nait zain. Ze zwommen synchroon!"'],
      ['Jelle Terpstra', 'Sûkelade, Grinzers! Lekker? De echte gaat fan\'e jûn de lucht in.']] },
  { id: 'H15', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'traumaduif', title: 'Traumaduif', reward: 1500,
    lead: ['T', 'Dokter Dijkstra staat bij de traumaheli op het UMCG. Jij vliegt. Ik hang, schijnt het.'],
    after: [['Sikkom', 'Traumaheli haalt Gouden Eierbal uit ballon. UMCG: "Het stond niet in het rooster, maar het was een geslaagde operatie."'],
      ['Jelle Terpstra', 'Ik sta in een weiland bij Ten Boer. Mei kij. Dit is noch net klear, Grinzers.']] },
  { id: 'H16', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'fjord', title: 'Waar is de Fjord?', reward: 1100,
    lead: ['T', 'Anita. Niet schrikken. Je Fjord is weg. Jelmer zegt dat zijn chat hem bij het station zag.'],
    after: [['Jelle Terpstra', 'Tige tank voor het lenen van de auto. Hij rijdt beter dan mijn trekker. Net fertelle.'],
      ['T', 'Hij stuurt nu ook complimentjes. Straks nodigt hij ons uit voor zijn verjaardag.']] },
  { id: 'H17', part: 'staart', kind: 'mission', player: 'tammo', built: true, mission: 'bod', title: 'Het Bod', reward: 600, cost: 300,
    voorschot: { from: 'Oma Trijntje', text: 'Voor de boodschappen. Een echte eierbal maak je niet met lege handen, jong.' },
    lead: ['A', 'Jelle wil ons spreken op het Stadsbalkon. Hij heeft een "bod", zegt hij. Neem geld mee voor boodschappen.'],
    after: [['Oma Trijntje', 'Mosterd, eieren en stoetbrood. Dan komt het goed, jong. Dat deed ik in 1953 ook zo.']] },
  { id: 'H18', part: 'staart', kind: 'mission', player: 'anita', built: true, mission: 'ontzet', title: 'Finale: Gronings Ontzet', reward: 4000,
    lead: ['T', 'Achtentwintig augustus. Gronings Ontzet. Onze kraam staat op de Grote Markt, en Jelle de zijne ook. Kom je?'],
    after: [['Sikkom', 'Gouden Eierbal terug in het museum. Friese snackkoning proeft Groninger eierbal en zegt niks. Wel twee keer.'],
      ['Jelle Terpstra', 'Moai dien, Grinzers. Volgend jaar weer? Dan mogen jullie naar Ljouwert komen.'],
      ['T', 'Wij tweeën vóór Grunn. Ik zeg het nog één keer hardop, en dan nooit meer.']] },
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
