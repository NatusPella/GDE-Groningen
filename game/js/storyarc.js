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
//   title    shown in the pause menu and dev panel
//   mission  (mission) id of a def in missions.js (MISSION_IDS below)
//   reward   (mission) story payout; must equal the missions.js reward for built missions
//   minReward (mission) worst case payout (e.g. Berend's scratch fines), for the money timeline
//   goal     (activity) what completes it, see GOAL TYPES
//   cost     money the step needs (a purchase), for the money timeline and the voorschot
//   voorschot { from, text }: when the player is short of `cost`, this character tops it up once
//   lead     [who, text]: phone message when the step becomes the next one (who: 'T'/'A' or a name)
//   done     [who, text]: phone message when an activity is done
//   waive    what skipping a requirement step hands out (shops.js grantStoryItem) or 'night'
//   after    [[from, text], ...]: phone messages after the mission is passed (or skipped)
//   unlocks  story flag set after the step (e.g. 'jelle' adds Jelle to the phone contacts)
//
// GOAL TYPES (story.js GOALS)
//   { type: 'shop', shop }            enter a shop of that type (shops.js SHOP_TYPES key)
//   { type: 'require', req, shop }    missions.js requirement met; route to the nearest `shop`
//                                     (an array routes to the nearest of several types)
//   { type: 'pigeon', spot, score }   poop score >= score in one flight (spot: pigeonspots.js id)
//   { type: 'sideJob', job }          one more round of that side job (sidejobs.js id)
//   { type: 'night' }                 wait at a garage until it's dark (or it already is)
//   { type: 'train' }                 one train trip (stationtravel.js)          [planned]
//   { type: 'egg' }                   find one hidden eierbal (achievementtracker) [planned]

export const PARTS = {
  kop: { title: 'Kop: "Moi, Grunn"', open: true, end: 'Einde van de Kop' },
  romp: { title: 'Romp: "Stad in rouw"', open: false, end: 'Einde van de Romp' },
  staart: { title: 'Staart: "Gronings Ontzet"', open: false, end: 'Einde' },
};

// missions.js def order: index i here is def i there (saves and medal
// records use these indices, so only ever append).
export const MISSION_IDS = [
  'berend', 'chaos', 'kei', 'noorderzon', 'ringweg', 'kroegentocht', 'fatbike', 'rondvaart',
  'pinautomaat', 'duifverkenning', 'museumkraak',
];

export const STEPS = [
  // --- Kop -----------------------------------------------------------------
  { id: 'H1', part: 'kop', kind: 'mission', built: true, mission: 'berend', title: "Bommen Berend wil z'n bakkie", reward: 250, minReward: 62,
    lead: ['A', 'Berend belde. Zijn bakkie moet naar het Boterdiep, en hij telt de krassen.'] },
  { id: 'k-eierbal', part: 'kop', kind: 'activity', built: true, title: 'Eierbal halen bij Frituur Vet & Lekker', goal: { type: 'shop', shop: 'snack' }, cost: 4,
    lead: ['T', 'Eerst een eierbal. Die op de bank is er nooit van gekomen. Frituur Vet & Lekker staat op je kaart.'],
    done: ['A', 'Zo. Gezond is anders, maar je glimt weer.'] },
  { id: 'H2', part: 'kop', kind: 'mission', built: true, mission: 'pinautomaat', title: 'Pinnen met de hele automaat', reward: 400,
    lead: ['A', 'Die automaat van gisteren staat nog in de Herestraat. Tijd om hem te verzilveren.'] },
  { id: 'k-wapen', part: 'kop', kind: 'activity', built: true, title: 'Pistool kopen bij Pang & Zo', goal: { type: 'require', req: 'weapon', shop: 'wapens' }, cost: 180, waive: 'weapon',
    voorschot: { from: 'Sjabbe', text: 'Hier, een voorschot voor een blaffer. Terugbetalen met rente. Of met een Eierbal.' },
    lead: ['A', 'Eerst een blaffer, dan de Grote Markt. Jelmer leent niks meer uit. Pang & Zo staat op je kaart.'],
    done: ['T', 'Klapperman. Mooie naam voor iets engs.'] },
  { id: 'H3', part: 'kop', kind: 'mission', built: true, mission: 'chaos', title: 'Chaos op de Grote Markt', reward: 300,
    lead: ['T', 'Jelmer wil content op de Grote Markt. Nu hebben we er ook iets voor.'] },
  { id: 'k-duif', part: 'kop', kind: 'activity', built: true, title: 'Vliegles bij de duiven op de Grote Markt', goal: { type: 'pigeon', spot: 'grotemarkt', score: 20 },
    lead: ['T', 'Als we het museum van boven willen zien, moet ik eerst leren vliegen. De duiven op de Grote Markt weten hoe. Twintig poeppunten.'],
    done: ['A', 'Twintig raak. Je hebt talent. Op een rare manier.'] },
  { id: 'H4', part: 'kop', kind: 'mission', built: true, mission: 'duifverkenning', title: 'Duif op verkenning', reward: 200,
    lead: ['A', 'Duivenmelker Bert staat bij het Stationsplein. Tijd om het museum te verkennen.'] },
  { id: 'k-bijbaan', part: 'kop', kind: 'activity', built: true, title: 'Eén ronde Hap & Rap bezorgen', goal: { type: 'sideJob', job: 'bezorger' },
    lead: ['A', 'Een kraak kost geld. Eén ronde Hap & Rap bezorgen, dan kunnen we verder.'],
    done: ['T', 'Eén ronde en ik ruik naar kapsalon.'] },
  { id: 'k-fiets', part: 'kop', kind: 'activity', built: true, title: 'Eigen fiets kopen bij Trap & Toeter', goal: { type: 'require', req: 'bike', shop: 'fietsen' }, cost: 75, waive: 'bike',
    voorschot: { from: 'Sjoerd', text: 'Geen geld voor een fiets? Hier, uit de pot van de KEI-commissie. Niet verder vertellen.' },
    lead: ['T', 'KEI-week: alleen wie een eigen fiets heeft, mag meedoen. Trap & Toeter staat op je kaart.'],
    done: ['A', 'Een eigen fiets. Gekocht. Met bonnetje. Wie zijn wij geworden?'] },
  { id: 'H5', part: 'kop', kind: 'mission', built: true, mission: 'kei', title: 'KEI-weekrace door Grunn', reward: 350,
    lead: ['T', 'Sjoerd wacht bij het Academiegebouw. Eerstejaars inhalen.'] },
  { id: 'k-kraakspullen', part: 'kop', kind: 'activity', built: true, title: 'Zwart incognito of een huurboot', goal: { type: 'require', req: 'heist', shop: ['kleding', 'boot'] }, cost: 150, waive: 'incognito',
    voorschot: { from: 'Sjabbe', text: 'Voor het museum wil je niet opvallen. Hier, een voorschot. Ik reken op jullie.' },
    lead: ['A', 'Voor het museum: zwart incognito bij Stoer & Stads, of een bootje bij Bootje Huren. Sluipen of varen, jij kiest.'],
    done: ['T', 'Nou zijn we echte boeven. Met bonnetje.'] },
  { id: 'k-nacht', part: 'kop', kind: 'activity', built: true, title: 'Wachten bij de garage tot het donker is', goal: { type: 'night' }, waive: 'night',
    lead: ['A', 'Kraken doe je in het donker. Rij naar een garage en wacht daar tot het avond is.'],
    done: ['T', 'Donker. Perfect. Ik zie niks.'] },
  { id: 'H6', part: 'kop', kind: 'mission', built: true, mission: 'museumkraak', title: 'De Museumkraak', reward: 150,
    lead: ['A', 'Het is zover. De Museumkraak. We gaan via het Verbindingskanaal.'],
    after: [['Sikkom', 'Gouden Eierbal foetsie. Stad in rouw. Museum: "Wij snappen er niks van, de camera\'s stonden uit."'],
      ['Jelle Terpstra · live', 'Moai, Grinzers! Hjir is Jelle. Operaasje Aaibal is begûn. Oant sjen op Gronings Ontzet!']],
    unlocks: 'jelle' },

  // --- Romp (planned) ------------------------------------------------------
  { id: 'r-trein', part: 'romp', kind: 'activity', built: false, title: 'Even onderduiken: treinreis', goal: { type: 'train' }, cost: 8,
    lead: ['A', 'We moeten even weg uit de stad. Pak de trein, maakt niet uit waarheen.'] },
  { id: 'H7', part: 'romp', kind: 'mission', built: false, mission: 'noorderzon', title: 'Spoedklus voor Noorderzon', reward: 550 },
  { id: 'r-uzi', part: 'romp', kind: 'activity', built: false, title: 'Uzi kopen bij Pang & Zo (aanbevolen)', goal: { type: 'shop', shop: 'wapens' }, cost: 450 },
  { id: 'H8', part: 'romp', kind: 'mission', built: false, mission: null, title: 'Vet gekaapt', reward: 600 },
  { id: 'r-auto', part: 'romp', kind: 'activity', built: false, title: 'Eigen auto kopen bij Ome Harm', goal: { type: 'require', req: 'car', shop: 'auto' }, cost: 800, waive: 'car' },
  { id: 'r-tuning', part: 'romp', kind: 'activity', built: false, title: 'Tuning bij Knal & Kolder (aanbevolen)', goal: { type: 'shop', shop: 'tuning' }, cost: 450 },
  { id: 'H9', part: 'romp', kind: 'mission', built: false, mission: 'ringweg', title: 'Ringweg-race: eindelijk klaar?', reward: 750 },
  { id: 'r-bijbaan', part: 'romp', kind: 'activity', built: false, title: 'Bijbaantje Fietsdepot of Verhuizing', goal: { type: 'sideJob', job: 'fietsdepot' } },
  { id: 'H10', part: 'romp', kind: 'mission', built: false, mission: null, title: "Vlag van d'Olle Grieze", reward: 350 },
  { id: 'r-eierbal', part: 'romp', kind: 'activity', built: false, title: 'Verstopte eierbal zoeken', goal: { type: 'egg' } },
  { id: 'H11', part: 'romp', kind: 'mission', built: false, mission: 'kroegentocht', title: 'Kroegentocht: Poelestraat plat', reward: 360 },
  { id: 'H12', part: 'romp', kind: 'mission', built: false, mission: 'fatbike', title: 'Fatbike-terreur: blijf overeind', reward: 300 },
  { id: 'H13', part: 'romp', kind: 'mission', built: false, mission: 'rondvaart', title: 'Rondvaart met valse papieren', reward: 450 },

  // --- Staart (planned) ----------------------------------------------------
  { id: 's-boot', part: 'staart', kind: 'activity', built: false, title: 'Eigen boot: huren bij Bootje Huren', goal: { type: 'require', req: 'boat', shop: 'boot' }, cost: 40, waive: 'boat' },
  { id: 'H14', part: 'staart', kind: 'mission', built: false, mission: null, title: 'Skûtsje-kraak', reward: 800 },
  { id: 'H15', part: 'staart', kind: 'mission', built: false, mission: null, title: 'Traumaduif', reward: 1000 },
  { id: 'H16', part: 'staart', kind: 'mission', built: false, mission: null, title: 'Waar is de Fjord?', reward: 700 },
  { id: 'H17', part: 'staart', kind: 'mission', built: false, mission: null, title: 'Het Bod', reward: 400, cost: 300 },
  { id: 'H18', part: 'staart', kind: 'mission', built: false, mission: null, title: 'Finale: Gronings Ontzet', reward: 2500 },
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

export function computeMoneyTimeline(start = START_MONEY) {
  let money = start;
  let low = Infinity;
  const rows = [];
  for (const s of STEPS) {
    const before = money;
    const cost = s.cost || 0;
    if (cost) low = Math.min(low, before - cost);
    const pay = s.kind === 'mission' ? (s.minReward ?? s.reward ?? 0) : 0;
    money = before - cost + pay;
    rows.push({ id: s.id, part: s.part, title: s.title, built: stepAvailable(s), before, cost, pay, after: money, margin: cost ? before - cost : null });
  }
  return { rows, end: money, low };
}
