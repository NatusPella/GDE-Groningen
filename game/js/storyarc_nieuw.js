// The new story arc "Alles voor één eierbal" in five acts (docs/verhaal/nieuw,
// 00-OVERZICHT and 08-IMPLEMENTATIE): 26 main missions (M01-M26), four travel
// beats (T1-T4), the opening (M00) and the epilogue (E). It lives NEXT TO the
// released arc (storyarc_oud.js) and is only played with the feature flag
// `nieuwverhaal` (storyflag.js); storyarc.js picks one of the two per page
// load. Nothing here imports game code, only the old arc's tables to extend.
//
// What is built: act 1 (M00-M06) and M07 (the first mission of act 2). Every
// other step has `built: false`: the story stops at the first one with the
// part's "volgt" card (PARTS.*.card), so the game never dead-ends or breaks.
// The step fields are those of storyarc_oud.js (see its header) plus:
//   goal { type: 'opening' }   (M00) the opening scenes of the script (storytext.js) play once
//   def                        id of the missions.js def; null for a step without a def yet
//   scenes                     the script.json scene ids that belong to the step (documentation, checked by scripts/storydata_test.mjs)
//   silent                     phone texts of the step are never read aloud
// MISSION_IDS only ever grows at the end (storyarc.js): the new defs are
// 'loket' and 'bakkiestunt', the other missions get their id when they are built.
import { SPEAKERS as OUD_SPEAKERS, CHARACTERS as OUD_CHARACTERS } from './storyarc_oud.js';

// ids appended to MISSION_IDS (indices live in saves: append only, never reorder)
export const NEW_MISSION_IDS = ['loket', 'bakkiestunt', 'containers', 'dijk', 'graan', 'bruggen', 'wiebelwerk', 'stoom', 'beleg'];

// The new cast (storytext.js maps the script's speakers to these keys).
export const SPEAKERS = {
  ...OUD_SPEAKERS,
  geesje: 'Geesje', lammert: 'Lammert', roelfien: 'Roelfien', wubbo: 'Wubbo', tinus: 'Tinus',
  bewaarder: 'Mevrouw Tuinstra', loketbediende: 'Loketbediende', accountmanager: 'Accountmanager', jurylid: 'Jurylid',
  buschauffeur: 'Buschauffeur', kustwachter: 'Kustwachter', kermisexploitant: 'Kermisexploitant', deurwaarder: 'Deurwaarder',
  student: 'Student', boer: 'Boer', kind: 'Kind in het publiek',
};
// Boer Roelf and Hilje are gone in this story
delete SPEAKERS.roelf;
delete SPEAKERS.hilje;

// Old steps that do not exist in this arc: a save never carries them (a save
// belongs to one arc), but a loader may drop them without complaint.
export const RETIRED_STEPS = ['r-avond', 's-boot', 's-proefvlucht', 's-carbid', 's-padel', 'k-fiets', 'H7', 'H9', 'H13', 'H3'];

// Old step ids (banterlines.js needs/until, cheatlist, ...) -> the step of this arc that stands for them.
export const STEP_ALIAS = {
  H1: 'M01', H2: 'M02', H3: 'M01', H4: 'M04', H5: 'M05', H6: 'M06', H7: 'M09', H8: 'M07', H9: 'M14', H10: 'M24', H11: 'M16',
  H12: 'M08', H13: 'M11', H14: 'M11', H15: 'M12', H16: 'M21', H17: 'M25', H18: 'M26',
  'k-eikea': 'M01', 'k-fiets': 'M04', 'k-kraakspullen': 'M06', 'k-nacht': 'M06', 'r-trein': 'T1', 'r-tuning': 'M22', 'r-kermis': 'M16',
};

const keep = (k, o) => ({ ...OUD_CHARACTERS[k], ...o });
export const CHARACTERS = {
  anita: keep('anita', { step: 'M00', bio: 'Snel, ad rem en de baas van het duo. Nederlandse, niet in Stad geboren, zomers in Ljouwert naast Mem. Ze droomt van de Fjord Frituur, een eigen frietwagen, en regelt alles zelf. Ook de flat in Paddepoel, met Tammo als huisgenoot.' }),
  tammo: keep('tammo', { step: 'M00' }),
  rikus: keep('rikus', { step: 'M00' }),
  berend: keep('berend', { step: 'M01' }),
  jelmer: keep('jelmer', { step: 'M01' }),
  torenwachter: keep('torenwachter', { step: 'M01' }),
  durk: keep('durk', { step: 'M02' }),
  sjabbe: keep('sjabbe', { step: 'M02' }),
  bert: keep('bert', { step: 'M04' }),
  sjoerd: keep('sjoerd', { step: 'M05' }),
  henk: keep('henk', { step: 'M06' }),
  jelle: keep('jelle', { step: 'M03', card: 'Snackkoning. Fries. Koopt Grunn op, plakje voor plakje.' }),
  bewaarder: { name: 'Mevrouw Tuinstra', card: 'Bewaarder van de Gouden Eierbal. Zit de jury voor.', step: 'M03', bio: 'Klein, oud en formeel, met een hoed en een gouden speldje. Bewaarder van de Gouden Eierbal sinds 1998 en bij traditie voorzitter van de jury (artikel 4).', quote: 'Ik teken uw inschrijving af.' },
  trijntje: keep('trijntje', { step: 'M08' }),
  mem: keep('mem', { step: 'M07' }),
  geesje: { name: 'Geesje', card: 'Kosteres. Eieren zijn haar vak.', step: 'M09', bio: 'Vierentachtig, schoolvriendin van Oma Trijntje, kosteres in Warffum. Haar eieren zijn bijna heilig.', quote: 'Eieren breken alleen als je haast hebt.' },
  lammert: { name: 'Lammert', card: 'Havenmeester. Danste in 1953 met Oma.', step: 'M13', bio: 'Havenmeester in Eemshaven en Delfzijl, kort en ironisch.', quote: 'De kraan piept. De bewaker kijkt bij het tweede piepje omhoog.' },
  roelfien: { name: 'Roelfien', card: 'Graanboerin. Vliegt laag.', step: 'M15', bio: 'Graanboerin en vlieger in het Oldambt, Oma\'s nicht. Vrolijk en praktisch.', quote: 'Vlieg laag, houd de molen rechts en trek pas op na de kermis.' },
  wubbo: { name: 'Wubbo', card: 'Brugwachter. Elf bruggen, één ritme.', step: 'M17', bio: 'Brugwachter in Veendam. Rustig, praktisch, en gek op de fanfare.', quote: 'Mis je de maat, dan wacht je.' },
  tinus: { name: 'Tinus', card: 'Trekkertrekker. De modder pakt eerst de auto.', step: 'T4', bio: 'Trekkertrekker en re-enactor uit het Westerkwartier. Joviaal, met een schuur en een trekker.', quote: 'De modder pakt eerst de auto. Dan pas je plannen.' },
};

// Parts: the ids kop/romp/staart stay (saves, kalender); zuid and ontzet are new.
// title/name/date as in PARTS of storyarc_oud.js; `card` is the "volgt" card where the built story stops.
export const PARTS = {
  kop: { title: 'Akte 1: Moi, Grunn', name: 'Moi, Grunn', date: '14 augustus', open: true, end: 'Einde van akte 1',
    card: [['Tessa', 'Dat was akte 1.'], ['Tammo', 'Er komt meer.']] },
  romp: { title: 'Akte 2: Het Noorden is groot', name: 'Het Noorden is groot', date: '18 augustus', open: true, end: 'Akte 2 volgt', textOnly: true,
    recap: [
      ['studio', 'Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist.'],
      ['Groninger Museum', 'De vitrine was leeg. Op het kussen: "Tige tank! – J."'],
      ['Grote Markt', 'Eerder in GDE. Een Fries in een blauw colbert koopt Grunn op, plakje voor plakje. Het eerste plakje is al van hem.'],
    ],
    card: [['Tessa', 'Akte 2 volgt. Dit stuk van het verhaal is nog niet gebouwd.'], ['Tammo', 'De rest van Noord-Nederland wacht.']] },
  staart: { title: 'Akte 3: Aan de Eems', name: 'Aan de Eems', date: '21 augustus', open: true, end: 'Akte 3 volgt',
    card: [['Tessa', 'Akte 3 volgt.'], ['Tammo', 'Aan de Eems.']] },
  zuid: { title: 'Akte 4: Zuidwaarts', name: 'Zuidwaarts', date: '24 augustus', open: true, end: 'Einde van akte 4', textOnly: true,
    recap: [
      ['Oldambt', 'Eerder in GDE. Jelle koopt de jury, de haven en het graan op. Plakje voor plakje.'],
      ['Kermis', 'Een dijk, een kus, en daarna zei niemand er iets over.'],
      ['Veenkoloniën', 'Zuidwaarts. Elf bruggen, een logboek en een trein die stilstaat.'],
    ],
    card: [['Tessa', 'Dat was akte 4.'], ['Tammo', 'Daarna komt de schuur.']] },
  ontzet: { title: 'Akte 5: Ontzet', name: 'Ontzet', date: '26 augustus', open: true, end: 'Einde', finale: true,
    card: [['Tessa', 'Akte 5 volgt.'], ['Tammo', 'Ontzet.']] },
};

const M = (id, part, title, def, o = {}) => ({ id, part, kind: 'mission', mission: def, title, built: false, silent: true, ...o });
const A = (id, part, title, goal, o = {}) => ({ id, part, kind: 'activity', title, goal, built: false, silent: true, ...o });

export const STEPS = [
  // --- Akte 1: Moi, Grunn (Stad, vr 14 - ma 17 augustus) ---------------------------------
  A('M00', 'kop', 'Opening: verhuisdag', { type: 'opening' }, { built: true, scenes: ['C00.1', 'C00.2', 'C00.3'] }),
  M('M01', 'kop', 'Nul krassen, vijftienhonderd punten', 'bakkiestunt', { built: true, reward: 200, minReward: 50,
    story: { intro: ['M01.1', 'M01.2'], outro: ['M01.6'], replay: ['M01.7'] },
    scenes: ['M01.1', 'M01.2', 'M01.3', 'M01.4', 'M01.5', 'M01.6', 'M01.7'],
    lead: ['A', 'Berend wacht bij het Martinikerkhof met zijn bakkie. Nul krassen, hè.'] }),
  M('M02', 'kop', 'Even pinnen', 'pinautomaat', { built: true, reward: 400,
    story: { intro: ['M02.1'], outro: ['M02.3'], replay: ['M02.4'] }, scenes: ['M02.1', 'M02.2', 'M02.3', 'M02.4', 'M02.5'],
    lead: ['A', 'De Herestraat, half acht. Mijn pas zit in een automaat.'] }),
  M('M03', 'kop', 'Het Loket', 'loket', { built: true, reward: 0, cost: 150,
    story: { intro: ['M03.1'], outro: ['M03.4'], replay: ['M03.5'] }, scenes: ['M03.1', 'M03.2', 'M03.3', 'M03.4', 'M03.5'],
    lead: ['A', 'Het Loket bij de Grote Markt. Open tot twaalf uur, contant.'] }),
  M('M04', 'kop', 'Kieken van boven', 'duifverkenning', { built: true, reward: 350,
    story: { intro: ['M04.1'], outro: ['M04.3'], replay: ['M04.4'] }, scenes: ['M04.1', 'M04.2', 'M04.3', 'M04.4', 'M04.5'],
    lead: ['T', 'Bert zit bij het Stationsplein. Zijn duiven zijn nerveus.'] }),
  M('M05', 'kop', 'Wind tegen, beide kanten op', 'kei', { built: true, reward: 550,
    story: { intro: ['M05.1'], outro: ['M05.3'], replay: ['M05.4'] }, scenes: ['M05.1', 'M05.2', 'M05.3', 'M05.4'],
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Hij praat alleen met wie meerijdt.'] }),
  M('M06', 'kop', 'Het museum stond er al zo', 'museumkraak', { built: true, reward: 400,
    // Henk's call while they wait (M06.0) plays at home; the escape and the radio are stage scenes of the mission (missions.js)
    homeScene: { id: 'M06.0', big: 'Wachten tot middernacht…' },
    story: { intro: ['M06.1'], outro: null, replay: ['M06.4'] }, scenes: ['M06.0', 'M06.1', 'M06.2', 'M06.3', 'M06.4'],
    lead: ['A', 'Om twaalf uur gaan de camera\'s drie minuten uit. We wachten thuis.'] }),

  // --- Akte 2: Het Noorden is groot (Stad, Hogeland, Waddenzee, di 18 - do 20 augustus) -----
  M('M07', 'romp', 'Al het vet van Grunn', 'vetgekaapt', { built: true, reward: 950,
    story: { intro: ['M07.1'], outro: ['M07.3'], replay: ['M07.5'] }, scenes: ['M07.1', 'M07.2', 'M07.3', 'M07.4', 'M07.5'],
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Tijd voor banden.'] }),
  M('M08', 'romp', 'Fatbikes tellen niet als fiets', 'fatbike', { reward: 500, scenes: ['M08.1', 'M08.2', 'M08.3', 'M08.4', 'M08.5'] }),
  A('T1', 'romp', 'De trein naar Winsum', { type: 'train' }, { scenes: ['T1'] }),
  M('M09', 'romp', 'Heel aankomen is ook een kunst', 'eieren', { scenes: ['M09.1', 'M09.2', 'M09.3', 'M09.4', 'M09.5'] }),
  M('M10', 'romp', 'Een trekker-limo op de wierde', 'wierde', { scenes: ['M10.1', 'M10.2', 'M10.3', 'M10.4'] }),
  A('T2', 'romp', 'De streekbus naar Zoutkamp', { type: 'bus' }, { scenes: ['T2'] }),
  M('M11', 'romp', 'Geleend van de Friezen', 'skutsje', { reward: 1300, scenes: ['M11.1', 'M11.2', 'M11.3', 'M11.4', 'M11.5', 'M11.6', 'M11.7', 'M11.8'] }),

  // --- Akte 3: Aan de Eems (Eemsdelta en Oldambt, vr 21 - zo 23 augustus) ----------------
  M('M12', 'staart', 'Het staat niet in het rooster', 'traumaduif', { built: true, reward: 1500,
    story: { intro: ['M12.1'], outro: ['M12.4'], replay: ['M12.5'] }, scenes: ['M12.1', 'M12.2', 'M12.3', 'M12.4', 'M12.5'],
    lead: ['A', 'Dokter Dijkstra wacht in Lauwersoog met een heli. Hij heeft honger, en Jelle vliegt met zijn koopboek boven de Dollard.'] }),
  M('M13', 'staart', 'Het containerlabyrint', 'containers', { built: true, reward: 900,
    story: { intro: ['M13.1'], outro: ['M13.3'], replay: ['M13.4'] }, scenes: ['M13.1', 'M13.2', 'M13.3', 'M13.4'],
    lead: ['A', 'De Eemshaven, vannacht. Lammert wacht aan de kade: container 4471 moet leeg uitvaren.'] }),
  M('M14', 'staart', 'De dijk', 'dijk', { built: true, reward: 1000,
    story: { intro: ['M14.1'], outro: ['M14.3'], replay: ['M14.4'] }, scenes: ['M14.1', 'M14.2', 'M14.3', 'M14.4'],
    lead: ['T', 'Zonsopgang op de kade. Om acht uur legt Jelles deurwaarder beslag in Delfzijl. Wij zijn eerder bij de sluis.'] }),
  A('T3', 'staart', 'De trein naar Winschoten', { type: 'train' }, { built: true, scenes: ['T3'],
    lead: ['A', 'Van Delfzijl met de trein naar Winschoten. Daar is een kermis.'] }),
  M('M15', 'staart', 'Laag over het graan', 'graan', { built: true, reward: 900,
    story: { intro: ['M15.1'], outro: ['M15.3'], replay: ['M15.4'] }, scenes: ['M15.1', 'M15.2', 'M15.3', 'M15.4'],
    lead: ['A', 'Roelfien wacht bij haar graanveld bij Winschoten. Haar vliegtuig sleept al twintig jaar een spandoek voor de kermis.'] }),
  M('M16', 'staart', 'Nog eentje dan', 'kroegentocht', { built: true, reward: 600,
    story: { intro: ['M16.1'], outro: ['M16.3', 'M16.4', 'M16.5', 'M16.6'], replay: ['M16.7'] }, scenes: ['M16.1', 'M16.2', 'M16.3', 'M16.4', 'M16.5', 'M16.6', 'M16.7'],
    lead: ['T', 'Geert heeft drie tenten op de kermis in Winschoten. Durk en Douwe zingen aan zijn bar.'] }),

  // --- Akte 4: Zuidwaarts (Veenkoloniën en Westerwolde, zo 23 - wo 26 augustus) ----------
  M('M17', 'zuid', 'Open, dicht', 'bruggen', { built: true, reward: 700,
    story: { intro: ['M17.1'], outro: ['M17.3'], replay: ['M17.4'] }, scenes: ['M17.1', 'M17.2', 'M17.3', 'M17.4'],
    lead: ['A', 'Wubbo bedient elf bruggen in Veendam. Jelles mosterdschip moet erdoor, wij ook. Wij eerst.'] }),
  M('M18', 'zuid', 'Wie draaide de camera\'s uit?', 'wiebelwerk', { built: true, reward: 600,
    story: { intro: ['M18.1'], outro: ['M18.4'], replay: ['M18.5'] }, scenes: ['M18.1', 'M18.2', 'M18.3', 'M18.4', 'M18.5'],
    lead: ['T', 'Wiebelwerk in Veendam doet elke nacht om middernacht de update van het museum. Ik wil het logboek zien.'] }),
  M('M19', 'zuid', 'Stoom', 'stoom', { built: true, reward: 800,
    story: { intro: ['M19.1'], outro: ['M19.3'], replay: ['M19.4'] }, scenes: ['M19.1', 'M19.2', 'M19.3', 'M19.4'],
    lead: ['A', 'Op het perron in Stadskanaal staat een stoomtrein stil. Daar zitten de laatste juryleden in.'] }),
  // the bus to Bourtange: the goal is the place (storyreis.js, akte 2's travel steps); the trip talk is the beat's (reisbeats.js)
  A('T4', 'zuid', 'De bus naar Bourtange', { type: 'reis', to: 'Vesting Bourtange', at: [53.0069, 7.1914], r: 350, scene: 'T4.3', from: 0 }, { built: true, scenes: ['T4.1', 'T4.2', 'T4.3', 'T4.4'],
    lead: ['T', 'Berend heeft veertig man, vijftien kartonnen kanonnen en een bus. Hij wacht in het bos bij Ter Apel.'] }),
  M('M20', 'zuid', 'Het beleg van Bourtange', 'beleg', { built: true, reward: 1200,
    story: { intro: ['M20.1'], outro: ['M20.5'], replay: ['M20.6'] }, scenes: ['M20.1', 'M20.2', 'M20.3', 'M20.4', 'M20.5', 'M20.6'],
    lead: ['A', 'Het Beleg van Bourtange begint om negen uur. Mem wacht in de kruitkelder.'] }),
  M('M21', 'zuid', 'Iedereen heeft een rode auto gezien', 'fjord', { built: true, reward: 1100, player: 'anita', solo: true, why: 'Ik haal hem terug. Niks aanraken.',
    story: { intro: ['M21.1'], outro: null, replay: ['M21.5'] }, scenes: ['M21.1', 'M21.2', 'M21.3', 'M21.4', 'M21.5'],
    lead: ['A', 'De Escapade staat op een goederentrein richting Ljouwert. Ik haal hem terug. Alleen.'] }),

  // --- Akte 5: Ontzet (Westerkwartier en Stad, wo 26 - vr 28 augustus, epiloog 11 september) --
  M('M22', 'ontzet', 'Een luik erin', 'luik', { scenes: ['M22.1', 'M22.2', 'M22.3', 'M22.4', 'M22.5'] }),
  M('M23', 'ontzet', 'De colonne', 'colonne', { scenes: ['M23.1', 'M23.2', 'M23.3', 'M23.4', 'M23.5'] }),
  M('M24', 'ontzet', 'Er hangt iets Fries aan d\'Olle Grieze', 'vlag', { reward: 600, scenes: ['M24.1', 'M24.2', 'M24.3', 'M24.4'] }),
  M('M25', 'ontzet', 'Het bod viel tegen', 'bod', { reward: 600, scenes: ['M25.1', 'M25.2', 'M25.3', 'M25.4', 'M25.5'] }),
  M('M26', 'ontzet', 'Ontzet, net als in 1672', 'ontzet', { reward: 4000, scenes: ['M26.1', 'M26.2', 'M26.3', 'M26.4', 'M26.5', 'M26.6', 'M26.7', 'M26.8', 'M26.9'] }),
  A('E', 'ontzet', 'Epiloog en slot', { type: 'epilogue' }, { scenes: ['E1', 'E2'] }),
];

// what Tammo and Tessa are after, per part ("Wat weten we?")
export const WHY = {
  kop: 'Inschrijven voor de Noordelijke Snackprijs, en uitzoeken wat die Fries bij het museum doet.',
  romp: 'Jelles plakjes tegenhouden en uitzoeken waar de bal is.',
  staart: 'De haven, het graan en de jury: Jelle koopt alles op.',
  zuid: 'Bewijs dat Jelle de bal nam, en de bal terughalen.',
  ontzet: 'De wedstrijd winnen en de bal terugbrengen. En de Fjord Frituur een thuis geven.',
};

// Clues of "Wat weten we?": a clue shows once its step is done.
export const CLUES = [
  { step: 'M01', kind: 'taal', title: 'De complimentenladder', text: 'Een Stadjer geeft geen complimenten, hij klimt een ladder. Zes treden: Ow, Goud, Valt mie nait of, Braid noar de zin, Kon minder en bovenaan niks meer. Berend zei "Goud": trede twee.' },
  { step: 'M01', kind: 'clue', title: 'Een Fries met een klomp', text: 'Berend: een Fries in een blauw colbert wilde zijn bakkie kopen. Contant, uit een klomp. In augustus.' },
  { step: 'M01', kind: 'clue', title: 'JelleWâld', text: 'In Jelmers chat: "Groot Loug. Moai foar in wykein." En: "dat famke yn it read: sa\'n leaf gesicht." Tammo vond het niet leuk.' },
  { step: 'M02', kind: 'clue', title: 'De reuzen en het museum', text: 'Sjabbe: twee reuzen kochten alles wat met frituren te maken heeft. Hun baas vroeg waar het museum alarmen heeft.' },
  { step: 'M02', kind: 'hart', title: 'De bal van Grunn', text: 'Tammo\'s opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde, en hij huilde nooit. Tammo zegt niks. Dat is ook een antwoord.' },
  { step: 'M03', kind: 'clue', title: 'Salamitactiek', text: 'Jelle kocht de rij, en alle vrije standplaatsen van het jaar. Alleen die van de winnaar blijft vrij. Plakje voor plakje, tot hij alles heeft.' },
  { step: 'M03', kind: 'clue', title: 'Artikel 4 en 9', text: 'De bewaarder van de Gouden Eierbal zit de jury voor. Bij verhindering het oudste jurylid. Mevrouw Tuinstra vertrekt maandag met Jelle op een treinreis met volpension.' },
  { step: 'M04', kind: 'clue', title: 'Bewaker twee', text: 'Bewaker twee krijgt een eierbal voor zijn koekje. Een Fries in een blauw colbert telt de alarmen.' },
  { step: 'M05', kind: 'clue', title: 'Drie minuten', text: 'Sjoerd: om twaalf uur \'s nachts gaan de camera\'s van het museum drie minuten uit voor een update. Al sinds 2019.' },
  { step: 'M05', kind: 'hart', title: 'Eerst pakken, als bewaking', text: 'Als een ander hem pakt, is hij weg uit Stad. Dus pakken Tessa en Tammo hem eerst, en brengen ze hem terug na het Ontzet.' },
  { step: 'M06', kind: 'clue', title: 'De lege vitrine', text: 'Iemand was ons voor. Op het kussen: "Tige tank! – J." Jelle Terpstra belde live naar Nachtstreek: de bal is bij hem.' },
  { step: 'M06', kind: 'hart', title: 'Voor de grip', text: 'Tessa pakte zijn hand. "Voor de grip." Allebei zeiden ze het.' },
  { step: 'M07', kind: 'hart', title: 'Iemand uit Friesland', text: 'Tessa kreeg weer een appje van iemand uit Friesland. Tammo vroeg of hij lang is.' },
  // Akte 4
  { step: 'M17', kind: 'clue', title: 'Plakje zeven', text: 'De grove mosterd is gered: het mosterdschip liep vast voor brug elf. Jelle kocht de fanfare weg, maar Wubbo floot.' },
  { step: 'M17', kind: 'clue', title: 'Middernacht', text: 'Wubbo: een webbureau in Veendam werkt alles om middernacht bij. Ook de bruggen. Tammo: net als de museumcamera\'s.' },
  { step: 'M17', kind: 'hart', title: 'Over zaterdag', text: 'Tammo: "Over zaterdag." Tessa: "Welke zaterdag?" Geen van beiden zei er verder iets over.' },
  { step: 'M18', kind: 'clue', title: 'Twaalf augustus', text: 'In het logboek van Wiebelwerk: op 12 augustus stond de update op elf minuten, aangevraagd door Us Mem Snacks. Zijdeur om 00:03, pas van bewaker twee, gasten D en D.' },
  { step: 'M18', kind: 'clue', title: 'Een leeg museum', text: 'Mevrouw Tuinstra\'s pas werd op 12 augustus geblokkeerd. Jelle had de bal vijf dagen vóór onze kraak al. Tessa printte het logboek.' },
  { step: 'M18', kind: 'hart', title: 'Wat een logboek is', text: 'Tessa legde uit wat een logboek is. Tammo baalde dat ze gelijk had. Zij vond het leuk dat hij het wilde weten.' },
  { step: 'M19', kind: 'clue', title: 'Eén van vijf', text: 'Eén jurylid stapte uit. Een ander tekende voor levenslang eierballen: dat is van Jelle. De voorzitter blijft in de trein, dus artikel 9: Berend neemt het over.' },
  { step: 'M19', kind: 'hart', title: 'Een trein in een station', text: 'Tammo: "Ik heb een trein bestuurd." Tessa: "Je hebt hem in een station gezet."' },
  { step: 'M20', kind: 'clue', title: 'Een moeder', text: 'Mem nam de bal van Jelle af in de kruitkelder van Bourtange. "Er is geen overeenkomst, jonge. Er is een moeder." Jelle: "Dit is geen einde. Dit is een geschil."' },
  { step: 'M20', kind: 'clue', title: 'Tige tank! – J.', text: 'Het briefje is van Jelle: hij schrijft overal een bedankje bij. De Escapade stond niet meer op de parkeerplaats. Er lag een klomp.' },
  { step: 'M20', kind: 'hart', title: 'Jij zegt nooit iets', text: 'Tessa appte al weken met Mem en zei het niet. Tammo vroeg het niet. "Jij zegt nooit iets!" zeiden ze allebei.' },
  { step: 'M21', kind: 'clue', title: 'De auto of de bal', text: 'Op de wagon moest Tessa kiezen. Ze koos de auto. De beleggers sprongen met de bal naar een limo. Op de bijrijdersstoel: "Tige tank foar de bal. – J."' },
  { step: 'M21', kind: 'hart', title: 'Elke keuze faalt', text: 'Tammo kon de vrienden niet bij elkaar houden. Zijn zinnen kwamen er niet goed uit. Beiden zijn alleen, en beiden gaan naar Tinus\' schuur.' },
];
