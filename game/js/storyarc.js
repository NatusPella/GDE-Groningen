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
//   done     [who, text]: phone message when an activity is done
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
  staart: { title: 'Staart: "Gronings Ontzet"', open: false, end: 'Einde', card: [] },
};

// missions.js def order: index i here is def i there (saves and medal
// records use these indices, so only ever append).
export const MISSION_IDS = [
  'berend', 'chaos', 'kei', 'noorderzon', 'ringweg', 'kroegentocht', 'fatbike', 'rondvaart',
  'pinautomaat', 'duifverkenning', 'museumkraak', 'vetgekaapt', 'vlag',
];

export const STEPS = [
  // --- Kop -----------------------------------------------------------------
  { id: 'H1', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'berend', title: "Bommen Berend wil z'n bakkie", reward: 250, minReward: 62,
    lead: ['A', 'Berend belde. Zijn bakkie moet naar het Boterdiep, en hij telt de krassen.'] },
  { id: 'k-eierbal', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Eierbal halen bij Frituur Vet & Lekker', goal: { type: 'shop', shop: 'snack' }, cost: 4,
    lead: ['A', 'Eerst een eierbal voor jou. Die op de bank is er nooit van gekomen. Frituur Vet & Lekker staat op je kaart.'],
    done: ['A', 'Zo. Gezond is anders, maar je glimt weer.'] },
  { id: 'H2', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'pinautomaat', title: 'Pinnen met de hele automaat', reward: 400,
    lead: ['T', 'Die automaat van gisteren staat nog in de Herestraat. Jij wilde hem verzilveren, toch?'] },
  { id: 'k-wapen', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Pistool kopen bij Pang & Zo', goal: { type: 'require', req: 'weapon', shop: 'wapens' }, cost: 180, waive: 'weapon',
    voorschot: { from: 'Sjabbe', text: 'Hier, een voorschot voor een blaffer. Terugbetalen met rente. Of met een Eierbal.' },
    lead: ['T', 'Eerst een blaffer, dan de Grote Markt, zeg jij. Jelmer leent niks meer uit. Pang & Zo staat op je kaart.'],
    done: ['T', 'Klapperman. Mooie naam voor iets engs.'] },
  { id: 'H3', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'chaos', title: 'Chaos op de Grote Markt', reward: 300,
    lead: ['A', 'Jelmer wil content op de Grote Markt. Nu hebben we er ook iets voor.'] },
  { id: 'k-duif', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Vliegles bij de duiven op de Grote Markt', goal: { type: 'pigeon', spot: 'grotemarkt', score: 20 },
    lead: ['A', 'Als we het museum van boven willen zien, moet jij eerst leren vliegen. De duiven op de Grote Markt weten hoe. Twintig poeppunten.'],
    done: ['A', 'Twintig raak. Je hebt talent. Op een rare manier.'] },
  { id: 'H4', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'duifverkenning', title: 'Duif op verkenning', reward: 200,
    lead: ['A', 'Duivenmelker Bert staat bij het Stationsplein. Tijd om het museum te verkennen.'] },
  { id: 'k-bijbaan', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Eén ronde Hap & Rap bezorgen', goal: { type: 'sideJob', job: 'bezorger' },
    lead: ['T', 'Een kraak kost geld. Eén ronde Hap & Rap bezorgen, dan kunnen we verder.'],
    done: ['T', 'Eén ronde en ik ruik naar kapsalon.'] },
  { id: 'k-fiets', part: 'kop', kind: 'activity', player: 'tammo', built: true, title: 'Eigen fiets kopen bij Trap & Toeter', goal: { type: 'require', req: 'bike', shop: 'fietsen' }, cost: 75, waive: 'bike',
    voorschot: { from: 'Sjoerd', text: 'Geen geld voor een fiets? Hier, uit de pot van de KEI-commissie. Niet verder vertellen.' },
    lead: ['A', 'KEI-week: alleen wie een eigen fiets heeft, mag meedoen. Trap & Toeter staat op je kaart.'],
    done: ['A', 'Een eigen fiets. Gekocht. Met bonnetje. Wie zijn wij geworden?'] },
  { id: 'H5', part: 'kop', kind: 'mission', player: 'tammo', built: true, mission: 'kei', title: 'KEI-weekrace door Grunn', reward: 350,
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Eerstejaars inhalen, dat kun jij.'] },
  { id: 'k-kraakspullen', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Zwart incognito of een huurboot', goal: { type: 'require', req: 'heist', shop: ['kleding', 'boot'] }, cost: 150, waive: 'incognito',
    voorschot: { from: 'Sjabbe', text: 'Voor het museum wil je niet opvallen. Hier, een voorschot. Ik reken op jullie.' },
    lead: ['T', 'Voor het museum: zwart incognito bij Stoer & Stads, of een bootje bij Bootje Huren. Sluipen of varen, jij kiest.'],
    done: ['T', 'Nou zijn we echte boeven. Met bonnetje.'] },
  { id: 'k-nacht', part: 'kop', kind: 'activity', player: 'anita', built: true, title: 'Wachten bij de garage tot het donker is', goal: { type: 'night' }, waive: 'night',
    lead: ['T', 'Kraken doe je in het donker, zeg jij altijd. Rij naar een garage en wacht daar tot het avond is.'],
    done: ['T', 'Donker. Perfect. Ik zie niks.'] },
  { id: 'H6', part: 'kop', kind: 'mission', player: 'anita', built: true, mission: 'museumkraak', title: 'De Museumkraak', reward: 150,
    lead: ['T', 'Het is zover. De Museumkraak. Via het Verbindingskanaal, jouw plan.'],
    after: [['Sikkom', 'Gouden Eierbal foetsie. Stad in rouw. Museum: "Wij snappen er niks van, de camera\'s stonden uit."'],
      ['Jelle Terpstra · live', 'Moai, Grinzers! Hjir is Jelle. Operaasje Aaibal is begûn. Oant sjen op Gronings Ontzet!']],
    unlocks: 'jelle' },

  // --- Romp ----------------------------------------------------------------
  { id: 'r-trein', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Even onderduiken: een treinreis', goal: { type: 'train' }, cost: 8,
    lead: ['T', 'Heel Grunn zoekt de Eierbal, en wij stonden in dat museum. Even onderduiken: pak de trein, maakt niet uit waarheen.'],
    done: ['T', 'Een dagje weg. Ik heb nog nooit zo ontspannen op de vlucht gezeten.'] },
  { id: 'H7', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'noorderzon', title: 'Spoedklus voor Noorderzon', reward: 550,
    lead: ['A', 'Femke van Noorderzon belt. Spoedklus, decor moet naar het Noorderplantsoen. En ze heeft iets gezien, zegt ze.'],
    after: [['Sikkom', 'Frituurvet uitverkocht in heel Grunn. Groothandel: "Twee reuzen op één fatbike kochten alles. Contant, uit een klomp."']] },
  { id: 'r-uzi', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Uzi kopen bij Pang & Zo (aanbevolen)', goal: { type: 'shop', shop: 'wapens' }, cost: 450, optional: true,
    lead: ['T', 'Er rijdt een tankwagen vol vet de stad uit. Een Ratelaar bij Pang & Zo prikt makkelijker door banden. Hoeft niet, helpt wel.'],
    done: ['T', 'Ratelaar. Hou jij hem maar vast, ik word er zenuwachtig van.'] },
  { id: 'H8', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'vetgekaapt', title: 'Vet gekaapt', reward: 600,
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Durk en Douwe achter het stuur. Tijd voor banden.'],
    after: [['Jelle Terpstra · live', 'Dat fet wie fan my! No ja. Ik ha mear. Operaasje Aaibal giet gewoan troch, Grinzers.'],
      ['T', 'Geen vet, geen frituur. Geen frituur, geen eierbal op Ontzet. Dat is zijn plan, hè?']] },
  { id: 'r-auto', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Eigen auto kopen bij Ome Harm', goal: { type: 'require', req: 'car', shop: 'auto' }, cost: 800, waive: 'car',
    voorschot: { from: 'Harm', text: 'Voor de ringweg moet je een eigen auto hebben. Hier, een voorschot. Mijn pensioen hangt ervan af.' },
    lead: ['A', 'Harm wil ons op de ringweg, maar alleen met een eigen auto. Gekocht, Tammo. Niet geleend. Ome Harm Occasions staat op je kaart.'],
    done: ['A', 'Een eigen auto. Op onze naam. Met een geurboompje.'] },
  { id: 'r-tuning', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Tuning bij Knal & Kolder (aanbevolen)', goal: { type: 'shop', shop: 'tuning' }, cost: 450, optional: true,
    lead: ['A', 'Jelle rijdt mee op de ringweg. In een trekker. Rij onze auto naar Knal & Kolder en druk R, voor wat extra paardjes.'],
    done: ['A', 'Hij klinkt als een boze koelkast. Perfect.'] },
  { id: 'H9', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'ringweg', title: 'Ringweg-race: eindelijk klaar?', reward: 750,
    lead: ['A', 'Harm staat bij de start van de ringweg. En Jelle ook, met zijn trekker-limo. Laten we hem inhalen.'],
    after: [['Sikkom', 'Er rijdt niets boven Groningen: Stadjers op het podium, Friese trekker op de vluchtstrook.'],
      ['Jelle Terpstra', 'Dit is net klear, Grinzer. Op Gronings Ontzet sjogge wy wol wa\'t it hurdst giet.'],
      ['A', 'Hij stuurt jou berichtjes, Tammo. Hij vindt je leuk. Of eng.']] },
  { id: 'r-bijbaan', part: 'romp', kind: 'activity', player: 'anita', built: true, title: 'Bijbaantje: Fietsdepot of Verhuizing', goal: { type: 'sideJob', job: ['fietsdepot', 'verhuizing'] },
    lead: ['T', 'Even adem halen. Eén ronde bij het Fietsdepot of een verhuizing, en dan zien we verder.'],
    done: ['T', 'Jouw rug is nu Gronings. Stijf, maar hij klaagt niet.'] },
  { id: 'H10', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'vlag', title: "Vlag van d'Olle Grieze", reward: 350,
    lead: ['A', 'Jelle heeft een reuzenvlag aan de Martinitoren gehangen. Met rode blaadjes. Daar moet een duif aan te pas komen. Jij dus.'],
    after: [['Sikkom', 'Duif pikt Friese vlag van d\'Olle Grieze. Stadjers juichen, de toren zelf zegt niks.'],
      ['Jelle Terpstra', '[selfie met een boos gezicht] Wa hat myn flagge…? In DUIF?! Ik wit wol wa\'t dy duif is.']] },
  { id: 'r-eierbal', part: 'romp', kind: 'activity', player: 'tammo', built: true, title: 'Verstopte eierbal zoeken', goal: { type: 'egg' },
    lead: ['A', 'Overal in Grunn liggen verstopte eierballen. Er ligt er één vlakbij, zie je kaart. Voor de moed.'],
    done: ['A', 'Onder een bankje? Hij smaakt vast naar avontuur. En een beetje naar bankje.'] },
  { id: 'H11', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'kroegentocht', title: 'Kroegentocht: Poelestraat plat', reward: 360,
    lead: ['T', 'Geert van de Groote Griet zegt dat Durk en Douwe vanavond in de Poelestraat zijn. Een kroegentocht dus. Voor het onderzoek.'],
    after: [['T', 'Een skûtsje. Dat is een Friese zeilboot, toch? En die van Jelle ligt ergens hier in de stad.']] },
  { id: 'H12', part: 'romp', kind: 'mission', player: 'tammo', built: true, mission: 'fatbike', title: 'Fatbike-terreur: blijf overeind', reward: 300,
    lead: ['A', 'Oma Trijntje belt. Ze wil ons iets vertellen over de Eierbal, maar eerst moeten de fatbikes uit de Folkingestraat.'],
    after: [['Oma Trijntje', 'Breng hem thuis, jong. Niet voor het geld. Voor Grunn.']] },
  { id: 'H13', part: 'romp', kind: 'mission', player: 'anita', built: true, mission: 'rondvaart', title: 'Rondvaart met valse papieren', reward: 450,
    lead: ['T', 'Kapitein Klaas heeft een rondvaartboot die even van niemand is. Vanaf het water zien we misschien dat skûtsje.'] },

  // --- Staart (planned) ----------------------------------------------------
  { id: 's-boot', part: 'staart', kind: 'activity', player: 'anita', built: false, title: 'Eigen boot: huren bij Bootje Huren', goal: { type: 'require', req: 'boat', shop: 'boot' }, cost: 40, waive: 'boat' },
  { id: 'H14', part: 'staart', kind: 'mission', player: 'tammo', built: false, mission: null, title: 'Skûtsje-kraak', reward: 800 },
  { id: 'H15', part: 'staart', kind: 'mission', player: 'anita', built: false, mission: null, title: 'Traumaduif', reward: 1000 },
  { id: 'H16', part: 'staart', kind: 'mission', player: 'anita', built: false, mission: null, title: 'Waar is de Fjord?', reward: 700 },
  { id: 'H17', part: 'staart', kind: 'mission', player: 'tammo', built: false, mission: null, title: 'Het Bod', reward: 400, cost: 300 },
  { id: 'H18', part: 'staart', kind: 'mission', player: 'anita', built: false, mission: null, title: 'Finale: Gronings Ontzet', reward: 2500 },
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
