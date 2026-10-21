// The story "Alles voor één eierbal" in five acts (docs/verhaal/nieuw,
// 00-OVERZICHT and 08-IMPLEMENTATIE): 26 main missions (M01-M26), four travel
// beats (T1-T4), the opening (M00) and the epilogue (E). It is the only story
// (the first version was removed in #187); storyarc.js is what the rest of the
// game imports. Nothing here imports game code, only the cast tables of storyarc_basis.js to extend.
//
// What is built: act 1 (M00-M06) and M07 (the first mission of act 2). Every
// other step has `built: false`: the story stops at the first one with the
// part's "volgt" card (PARTS.*.card), so the game never dead-ends or breaks.
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
//   dock     { kicker, lines }: (eikea goal) the scene at EIKEA's loading dock (storyeikea.js)
//   homeScene { big, clock, lines }: (night/home/eikea goal) a short scene a moment after the player is up in
//            the flat (story.js updateHomeWait); clock: the hour it plays at; lines [who, text, { tag }]
//   meet     the same, played once when the player reaches the step's starting spot
//            (Rotor Roelf by his demo heli for a flight goal; Durk & Douwe at the court for padel)
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
//   { type: 'night' }                 wait at home until it's dark (with a homeScene: until that scene played)
//   { type: 'home' }                  go home and up to the flat: the step's homeScene plays there
//   { type: 'eikea' }                 drive to EIKEA, three boxes on the roof, bring them home, up to the flat (storyeikea.js)
//   { type: 'train' }                 one train trip (stationtravel.js), routed to the nearest station
//   { type: 'hideout', options }      one of HIDEOUTS, the player's pick: a train trip or walking up to
//                                     a spot; its scene and done text follow (storyfun.js)
//   { type: 'egg' }                   find one more hidden eierbal (achievementtracker), routed to the nearest
//   { type: 'padel' }                 play one padel match, won or lost (padel.js), routed to the nearest court
//   { type: 'kermis' }                one bumper-car ride on the Grote Markt (kermis.js), free, with Durk & Douwe in it
//   { type: 'flight', heli, pad }     meet Rotor Roelf at his demo heli, parked at `heli` on helipad `pad`
//                                     (storyfun.js); walking up (his `meet` scene) completes it, the flight is H15
//   { type: 'carbid', lift }          one round of carbid schieten at boer Roelf's (carbid.js); lift [from, text]: far out
//                                     and without a car, your own Escapade is dropped off for free with that text
//
// Fields added by this story:
//   goal { type: 'opening' }   (M00) the opening scenes of the script (storytext.js) play once
//   def                        id of the missions.js def; null for a step without a def yet
//   scenes                     the script.json scene ids that belong to the step (documentation, checked by scripts/storydata_test.mjs)
//   silent                     phone texts of the step are never read aloud
// MISSION_IDS only ever grows at the end (storyarc.js): the new defs are
// 'loket' and 'bakkiestunt', the other missions get their id when they are built.
import { SPEAKERS as OUD_SPEAKERS, CHARACTERS as OUD_CHARACTERS } from './storyarc_basis.js';

// ids appended to MISSION_IDS (indices live in saves: append only, never reorder)
export const NEW_MISSION_IDS = ['loket', 'bakkiestunt', 'containers', 'dijk', 'graan', 'bruggen', 'wiebelwerk', 'stoom', 'beleg', 'luik', 'colonne', 'eieren', 'wierde'];

// The new cast (storytext.js maps the script's speakers to these keys).
export const SPEAKERS = {
  ...OUD_SPEAKERS,
  geesje: 'Geesje', lammert: 'Lammert', roelfien: 'Roelfien', wubbo: 'Wubbo', tinus: 'Tinus',
  bewaarder: 'Mevrouw Hoving', loketbediende: 'Loketbediende', accountmanager: 'Accountmanager', jurylid: 'Jurylid',
  buschauffeur: 'Buschauffeur', kustwachter: 'Kustwachter', kermisexploitant: 'Kermisexploitant', deurwaarder: 'Deurwaarder',
  student: 'Student', boer: 'Boer', kind: 'Kind in het publiek',
};
// Boer Roelf and Hilje are gone in this story
delete SPEAKERS.roelf;
delete SPEAKERS.hilje;

// Old steps that do not exist in this story: a loader may drop them without complaint.
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
  tammo: keep('tammo', { step: 'M00', bio: 'Stadjer uit het Oosterpark, droog, met een rode Fjord Escapade die nauwelijks rijdt. Al twaalf jaar verliefd op zijn beste vriendin, en sinds de verhuisdag van 14 augustus haar huisgenoot in Paddepoel. Hij zegt het nooit.' }),
  rikus: keep('rikus', { step: 'M00' }),
  berend: keep('berend', { step: 'M01' }),
  jelmer: keep('jelmer', { step: 'M01' }),
  torenwachter: keep('torenwachter', { step: 'M01' }),
  durk: keep('durk', { step: 'M02' }),
  sjabbe: keep('sjabbe', { step: 'M02' }),
  bert: keep('bert', { step: 'M04' }),
  sjoerd: keep('sjoerd', { step: 'M05', card: 'Kiezelcommissie. Wind tegen, beide kanten op.', bio: 'Van de Kiezelcommissie. Zijn neef werkt \'s nachts in het museum.' }),
  henk: keep('henk', { step: 'M06' }),
  jelle: keep('jelle', { step: 'M03', card: 'Snackkoning. Fries. Koopt Grunn op, plakje voor plakje.' }),
  bewaarder: { name: 'Mevrouw Hoving', card: 'Bewaarder van de Gouden Eierbal. Zit de jury voor.', step: 'M03', bio: 'Klein, oud en formeel, met een hoed en een gouden speldje. Bewaarder van de Gouden Eierbal sinds 1998 en bij traditie voorzitter van de jury.', quote: 'Wie de bal bewaart, tekent de uitslag.' },
  trijntje: keep('trijntje', { step: 'M08' }),
  mem: keep('mem', { step: 'M07', bio: 'Eenennegentig, uit Ljouwert. Appt Tessa stiekem en noemt haar famke. Wat ze wil, laat ze nog niet weten.' }),
  klaas: keep('klaas', { step: 'M11', bio: 'Oude schipper met een rubberboot en een skûtsje die even van niemand zijn.' }),
  dijkstra: keep('dijkstra', { step: 'M11' }),
  geesje: { name: 'Geesje', card: 'Kosteres. Eieren zijn haar vak.', step: 'M09', bio: 'Vierentachtig, kosteres in Warffum, kent Oma Trijntje van de kerk. Haar eieren zijn bijna heilig.', quote: 'Dat is een kerkelijk wonder.' },
  lammert: { name: 'Lammert', card: 'Havenmeester. Zijn vader danste in 1953 met Oma.', step: 'M13', bio: 'Havenmeester in Eemshaven en Delfzijl, kort en ironisch.', quote: 'De kraan piept. De bewaker kijkt bij het tweede piepje omhoog.' },
  roelfien: { name: 'Roelfien', card: 'Graanboerin. Vliegt laag.', step: 'M15', bio: 'Graanboerin en vlieger in het Oldambt, Oma\'s oudste klant. Vrolijk en praktisch.', quote: 'Vlieg laag, houd de molen rechts en trek de neus pas omhoog na de kermis.' },
  wubbo: { name: 'Wubbo', card: 'Brugwachter. Elf bruggen, één ritme.', step: 'M17', bio: 'Brugwachter in Veendam. Rustig, praktisch, en gek op de fanfare.', quote: 'Mis je de maat, dan wacht je.' },
  tinus: { name: 'Tinus', card: 'Trekkertrekker. De modder pakt eerst je auto.', step: 'T4', bio: 'Trekkertrekker en re-enactor uit het Westerkwartier. Joviaal, met een schuur en een trekker.', quote: 'De modder pakt eerst je auto. Je plannen komen daarna.' },
};

// Parts: the ids kop/romp/staart stay (saves, kalender); zuid and ontzet are new.
// title/name/date as the first version's PARTS had them; `card` is the "volgt" card where the built story stops.
export const PARTS = {
  kop: { title: 'Akte 1: Moi, Grunn', name: 'Moi, Grunn', date: '14 augustus', open: true, end: 'Einde van akte 1',
    card: [['Tessa', 'Dat was akte 1.'], ['Tammo', 'Er komt meer.']] },
  romp: { title: 'Akte 2: Het Noorden is groot', name: 'Het Noorden is groot', date: '18 augustus', open: true, end: 'Einde van akte 2', textOnly: true,
    recap: [
      ['studio', 'Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist.'],
      ['Groninger Museum', 'De vitrine was leeg. Op het kussen: "Tige tank! – J."'],
      ['Grote Markt', 'Eerder in GDE. Een Fries in een blauw colbert koopt Grunn op, plakje voor plakje. Het eerste plakje is al van hem.'],
    ],
    card: [['Tessa', 'Dat was akte 2. De Eemshaven is van Jelle, zegt hij.'], ['Tammo', 'Akte 3 volgt: aan de Eems.']] },
  staart: { title: 'Akte 3: Aan de Eems', name: 'Aan de Eems', date: '21 augustus', open: true, end: 'Akte 3 volgt', textOnly: true,
    recap: [
      ['Noorderhaven', 'Eerder in GDE. Oma Trijntje bakt het recept van 1953 na, met vijf ingrediënten en vijf vrienden: vet, eieren, zout, meel en mosterd.'],
      ['Hogeland', 'De eieren en het zout zijn gered. Jelle heeft de bal in een koffer, en Mem appt Tessa in het geheim.'],
      ['Eemshaven', 'Aan de Eems. Jelle vliegt met zijn koopboek in een ballon, en zijn voorraad vaart weg met een schip.'],
    ],
    card: [['Tessa', 'Akte 3 volgt.'], ['Tammo', 'Aan de Eems.']] },
  zuid: { title: 'Akte 4: Zuidwaarts', name: 'Zuidwaarts', date: '24 augustus', open: true, end: 'Einde van akte 4', textOnly: true,
    recap: [
      ['Oldambt', 'Eerder in GDE. Jelle probeert de jury, de haven en het graan te kopen. Plakje voor plakje.'],
      ['Kermis', 'Een dijk, een kus, en daarna zei niemand er iets over.'],
      ['Veenkoloniën', 'Zuidwaarts. Elf bruggen, een logboek en een trein die stilstaat.'],
    ],
    card: [['Tessa', 'Dat was akte 4.'], ['Tammo', 'Daarna komt de schuur.']] },
  // the finale card: the epilogue (E1, vrijdag 11 september) and Rikus in the studio (E2); the text of the script, kept in sync by scripts/akte5_test.mjs
  ontzet: { title: 'Akte 5: Ontzet', name: 'Ontzet', date: '26 augustus', open: true, end: 'Einde', finale: true, textOnly: true,
    recap: [
      ['Bourtange', 'Het Beleg. De bal ging naar de moeder van Jelle, en de Escapade naar Jelle.'],
      ['Zuidhorn', 'De Escapade is terug en de bal is weg. De vrienden van Oma twijfelen.'],
      ['Overmorgen', 'Het Ontzet. Om drie uur laat Jelle zich bij de notaris inschrijven als nieuwe bewaarder: dan tekent hij zelf de uitslag.'],
    ],
    card: [
      ['Rikus', "Het ruikt naar suiker. Dat komt uit Hoogkerk. De zomer is nog lang niet op."],
      ['Tessa', "Het is tweeëntwintig graden."],
      ['Tammo', "Het is Grunn."],
      ['Tessa', "Spijt van de zomer?"],
      ['Tammo', "Nee. Van de volgende ook niet. Alvast."],
      ['Rikus', "Moi. Nachtstreek, het laatste kwartier."],
      ['Rikus', "De Gouden Eierbal staat weer in het museum, met een alarm dat het doet en met twee namen op het bordje."],
      ['Rikus', "Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs."],
      ['Rikus', "In Paddepoel, op de elfde verdieping, brandt 's avonds nog maar in één slaapkamer licht. Ik zeg niks."],
      ['Rikus', "Berend stuurde een brief: hij wil volgend jaar weer de bisschop zijn. Omdat hij zo goed kan verliezen."],
      ['Rikus', "Jelle gaf bijna alles terug, helemaal vrijwillig. De standplaatsen en de molen hield hij. Hij zei dat hij het gezellig vond."],
      ['Rikus', "Oldenhuis Bakt sluit alle eenenveertig snackbars. De eigenaar blijkt Jelle te zijn. Nu weet ik wie dat at: niemand."],
      ['Rikus', "Mevrouw Hoving stapt na bijna vier weken volpension in Wildervank uit de trein."],
      ['Rikus', "De Krolbrug staat nu open. Niemand weet waarom. Dat is verdacht."],
      ['Rikus', "De politie sloot de zaak van de twee Stadjers in het zwart. Op de camerabeelden is vooral bewaker twee te zien, met een koekje."],
      ['Rikus', "Sjabbe bracht een horloge terug naar de Vismarkt. Hij vroeg niets."],
      ['Rikus', "Durk en Douwe werken nu voor Jelles moeder. Ze sturen een kaartje."],
      ['Rikus', "Het jurylid met het contract eet nog steeds gratis eierballen. In Ljouwert."],
      ['Rikus', "En ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft niet betaald."],
      ['Rikus', "Dit is voor twee Stadjers. Ze zeggen nooit wat. Vandaag wel. Moi."],
    ] },
};

const M = (id, part, title, def, o = {}) => ({ id, part, kind: 'mission', mission: def, title, built: false, silent: true, ...o });
const A = (id, part, title, goal, o = {}) => ({ id, part, kind: 'activity', title, goal, built: false, silent: true, ...o });

export const STEPS = [
  // --- Akte 1: Moi, Grunn (Stad, vr 14 - ma 17 augustus) ---------------------------------
  A('M00', 'kop', 'Opening: verhuisdag', { type: 'opening' }, { built: true, scenes: ['C00.1', 'C00.2', 'C00.3'] }),
  M('M01', 'kop', 'Nul krassen, vijftienhonderd punten', 'bakkiestunt', { built: true, reward: 200, minReward: 50,
    story: { intro: ['M01.1', 'M01.2'], outro: ['M01.6'], replay: ['M01.7'] },
    scenes: ['M01.1', 'M01.2', 'M01.3', 'M01.4', 'M01.5', 'M01.6', 'M01.7'],
    lead: ['A', 'Honderdvijftig euro verdienen: Berend wacht bij het Martinikerkhof met zijn bakkie. Nul krassen, hè.'] }),
  M('M02', 'kop', 'Even pinnen', 'pinautomaat', { built: true, reward: 400,
    story: { intro: ['M02.1'], outro: ['M02.3', 'M02.5'], replay: ['M02.4'] }, scenes: ['M02.1', 'M02.2', 'M02.3', 'M02.4', 'M02.5'],
    lead: ['A', 'De Herestraat, half acht. Mijn pas zit in een automaat.'] }),
  M('M03', 'kop', 'Het Loket', 'loket', { built: true, reward: 0, cost: 150,
    story: { intro: ['M03.1'], outro: ['M03.4'], replay: ['M03.5'] }, scenes: ['M03.1', 'M03.2', 'M03.3', 'M03.4', 'M03.5'],
    lead: ['A', 'Het Loket bij de Grote Markt. Open tot twaalf uur, contant.'] }),
  M('M04', 'kop', 'Kieken van boven', 'duifverkenning', { built: true, reward: 350,
    story: { intro: ['M04.1'], outro: ['M04.3'], replay: ['M04.4'] }, scenes: ['M04.1', 'M04.2', 'M04.3', 'M04.4', 'M04.5'],
    lead: ['T', 'Naar Bert op het Stationsplein: een duif fotografeert het museum.'] }),
  M('M05', 'kop', 'Wind tegen, beide kanten op', 'kei', { built: true, reward: 550,
    story: { intro: ['M05.1'], outro: ['M05.3'], replay: ['M05.4'] }, scenes: ['M05.1', 'M05.2', 'M05.3', 'M05.4'],
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Haal het podium, dan praat hij.'] }),
  M('M06', 'kop', 'Het museum stond er al zo', 'museumkraak', { built: true, reward: 400,
    // Henk's call while they wait (M06.0) plays at home; the escape and the radio are stage scenes of the mission (missions.js)
    homeScene: { id: 'M06.0', big: 'Wachten tot middernacht…' },
    story: { intro: ['M06.1'], outro: null, replay: ['M06.4'] }, scenes: ['M06.0', 'M06.1', 'M06.2', 'M06.3', 'M06.4'],
    lead: ['A', 'Vannacht om twaalf uur: de bal pakken. Tot die tijd wachten we thuis.'] }),

  // --- Akte 2: Het Noorden is groot (Stad, Hogeland, Waddenzee, di 18 - do 20 augustus) -----
  M('M07', 'romp', 'Al het vet van Grunn', 'vetgekaapt', { built: true, reward: 950,
    story: { intro: ['M07.1'], outro: ['M07.3'], replay: ['M07.5'] }, scenes: ['M07.1', 'M07.2', 'M07.3', 'M07.4', 'M07.5'],
    lead: ['T', 'De tankwagen van Us Mem Vet rijdt over de Europaweg. Banden stuk, tankwagen pakken, naar de Oosterpoort.'] }),
  M('M08', 'romp', 'Fatbikes tellen niet als fiets', 'fatbike', { built: true, reward: 500, unlocks: 'zitmoi',
    story: { intro: ['M08.1'], outro: ['M08.3'], replay: ['M08.5'] }, scenes: ['M08.1', 'M08.2', 'M08.3', 'M08.4', 'M08.5'],
    lead: ['T', 'Oma Trijntje belde: kom naar de Noorderhaven. Loop te voet heelhuids door de fatbikes in de Oude Ebbingestraat, dan vertelt ze wat ze over die bal weet.'] }),
  // travel steps: the goal is the place (storyreis.js); the lines of the trip itself are the travel beat's (reisbeats.js)
  A('T1', 'romp', 'De trein naar Warffum', { type: 'reis', to: 'Warffum', at: [53.3903, 6.5667], r: 400, scene: 'T1', from: 4 }, { built: true, scenes: ['T1'],
    lead: ['A', 'Met de trein naar Warffum. Daar begint het Hogeland, en Geesje woont in de pastorie.'] }),
  M('M09', 'romp', 'Heel aankomen is ook een kunst', 'eieren', { built: true, reward: 700,
    story: { intro: ['M09.1'], outro: ['M09.4'], replay: ['M09.5'] }, scenes: ['M09.1', 'M09.2', 'M09.3', 'M09.4', 'M09.5'],
    lead: ['A', 'Geesje woont in de pastorie in Warffum. Zij heeft de laatste eieren van het Hogeland.'] }),
  M('M10', 'romp', 'Een trekker-limo op de wierde', 'wierde', { built: true, reward: 900, unlocks: 'jelle',
    // the sloot scene (M10.3) is a stage of the mission itself; the talk in the car after it (M10.4) is a banter exchange
    story: { intro: ['M10.1'], outro: null }, scenes: ['M10.1', 'M10.2', 'M10.3', 'M10.4'],
    lead: ['T', 'Een zwarte trekker met vlaggetjes rijdt het erf van de kerk op. Dat is Jelle.'] }),
  A('T2', 'romp', 'De streekbus naar Zoutkamp', { type: 'reis', to: 'Zoutkamp', at: [53.3377, 6.2986], r: 400 }, { built: true, scenes: ['T2'],
    lead: ['A', 'Oma stuurt ons naar Kapitein Klaas in Zoutkamp: met de streekbus, overstappen in Winsum. Daarna is er alleen nog water.'] }),
  M('M11', 'romp', 'Geleend van de Friezen', 'skutsje', { built: true, reward: 1300,
    // the def of the old arc is replaced by the coast mission (missions_nieuw.js kustDef); the scenes M11.2-M11.7 are stages of it
    story: {
      npc: 'klaas', outroNpc: 'klaas', intro: ['M11.1'], outro: ['M11.8'],
      replayLines: [['N', 'Weer het Reitdiep op? De rubberboot staat klaar.']],
      fail: [['A', 'Het ging mis. Terug naar Klaas, nog een keer.'], ['T', 'Hij kijkt nog steeds de andere kant op.']],
    },
    scenes: ['M11.1', 'M11.2', 'M11.3', 'M11.4', 'M11.5', 'M11.6', 'M11.7', 'M11.8'],
    lead: ['A', 'Jelles skûtsje vaart naar Lauwersoog, met een gouden bal in de kist. Klaas leent je een snelle boot, tot de sluizen.'] }),

  // --- Akte 3: Aan de Eems (Eemsdelta en Oldambt, vr 21 - zo 23 augustus) ----------------
  M('M12', 'staart', 'Het staat niet in het rooster', 'traumaduif', { built: true, reward: 1500,
    story: { intro: ['M12.1'], outro: ['M12.4'], replay: ['M12.5'] }, scenes: ['M12.1', 'M12.2', 'M12.3', 'M12.4', 'M12.5'],
    lead: ['A', 'Dokter Dijkstra wacht in Lauwersoog met een heli. Eerst eten voor de nachtdienst, dan naar Jelles ballon boven de Dollard, voor het koopboek.'] }),
  M('M13', 'staart', 'Het containerlabyrint', 'containers', { built: true, reward: 900,
    story: { intro: ['M13.1'], outro: ['M13.3'], replay: ['M13.4'] }, scenes: ['M13.1', 'M13.2', 'M13.3', 'M13.4'],
    lead: ['A', 'De Eemshaven, vannacht. Lammert wacht aan de kade: container 4471 moet leeg uitvaren.'] }),
  M('M14', 'staart', 'De dijk', 'dijk', { built: true, reward: 1000,
    story: { intro: ['M14.1'], outro: ['M14.3'], replay: ['M14.4'] }, scenes: ['M14.1', 'M14.2', 'M14.3', 'M14.4'],
    lead: ['T', 'Zonsopgang op de dijk bij Bierum. Om acht uur legt Jelles deurwaarder beslag in Delfzijl. Wij zijn eerder bij de sluis.'] }),
  A('T3', 'staart', 'De trein naar Winschoten', { type: 'reis', to: 'Winschoten', at: [53.1444, 7.0356], r: 400, scene: 'T3', from: 4 }, { built: true, scenes: ['T3'],
    lead: ['A', 'Van Delfzijl met de trein naar Winschoten. Jelle geeft de juryleden daar op de kermis een proeverij.'] }),
  M('M15', 'staart', 'Laag over het graan', 'graan', { built: true, reward: 900,
    story: { intro: ['M15.1'], outro: ['M15.3'], replay: ['M15.4'] }, scenes: ['M15.1', 'M15.2', 'M15.3', 'M15.4'],
    lead: ['A', 'Roelfien wacht bij haar graanveld bij Midwolda. Haar vliegtuig sleept al twintig jaar een spandoek voor de kermis.'] }),
  M('M16', 'staart', 'Nog eentje dan', 'kroegentocht', { built: true, reward: 600,
    story: { intro: ['M16.1'], outro: ['M16.3', 'M16.4', 'M16.5', 'M16.6'], replay: ['M16.7'] }, scenes: ['M16.1', 'M16.2', 'M16.3', 'M16.4', 'M16.5', 'M16.6', 'M16.7'],
    lead: ['T', 'Durk en Douwe weten waar Jelle heen gaat. Volg ze langs Geerts drie tenten op de kermis in Winschoten, tot ze moe zijn.'] }),

  // --- Akte 4: Zuidwaarts (Veenkoloniën en Westerwolde, zo 23 - wo 26 augustus) ----------
  M('M17', 'zuid', 'Open, dicht', 'bruggen', { built: true, reward: 700,
    story: { intro: ['M17.1'], outro: ['M17.3'], replay: ['M17.4'] }, scenes: ['M17.1', 'M17.2', 'M17.3', 'M17.4'],
    lead: ['A', 'Wubbo bedient elf bruggen in Veendam. Jelles mosterdschip moet erdoor, wij ook. Wij eerst.'] }),
  M('M18', 'zuid', 'Wie draaide de camera\'s uit?', 'wiebelwerk', { built: true, reward: 600,
    story: { intro: ['M18.1'], outro: ['M18.4'], replay: ['M18.5'] }, scenes: ['M18.1', 'M18.2', 'M18.6', 'M18.7', 'M18.3', 'M18.4', 'M18.5'],
    lead: ['T', 'Wiebelwerk in Veendam doet elke nacht om middernacht de update van het museum. Ik wil het logboek zien.'] }),
  M('M19', 'zuid', 'Stoom', 'stoom', { built: true, reward: 800,
    story: { intro: ['M19.1'], outro: ['M19.3'], replay: ['M19.4'] }, scenes: ['M19.1', 'M19.2', 'M19.3', 'M19.4'],
    lead: ['A', 'Jelle kocht de machinist. In de stilstaande stoomtrein in Veendam zitten de laatste juryleden vast. Rij hem naar Wildervank.'] }),
  // the bus to Bourtange: the goal is the place (storyreis.js, akte 2's travel steps); the trip talk is the beat's (reisbeats.js)
  A('T4', 'zuid', 'De bus naar Bourtange', { type: 'reis', to: 'Vesting Bourtange', at: [53.0069, 7.1914], r: 350, scene: 'T4.3', from: 0 }, { built: true, scenes: ['T4.1', 'T4.2', 'T4.3', 'T4.4'],
    lead: ['T', 'Berend heeft veertig man, vijftien kartonnen kanonnen en een bus. Hij wacht in het bos bij Ter Apel.'] }),
  M('M20', 'zuid', 'Het beleg van Bourtange', 'beleg', { built: true, reward: 1200,
    story: { intro: ['M20.1'], outro: ['M20.5'], replay: ['M20.6'] }, scenes: ['M20.1', 'M20.2', 'M20.3', 'M20.4', 'M20.5', 'M20.6'],
    lead: ['A', 'Het Beleg van Bourtange begint om negen uur. Berend heeft veertig man en een paard van karton.'] }),
  M('M21', 'zuid', 'Iedereen heeft een rode auto gezien', 'fjord', { built: true, reward: 1100, player: 'anita', solo: true,
    story: { intro: ['M21.1'], outro: null, replay: ['M21.5'] }, scenes: ['M21.1', 'M21.2', 'M21.3', 'M21.4', 'M21.5', 'M21.6'],
    lead: ['A', 'De Escapade staat op een goederentrein richting Ljouwert. Ik haal hem terug. Alleen.'] }),

  // --- Akte 5: Ontzet (Westerkwartier en Stad, wo 26 - vr 28 augustus, epiloog 11 september) --
  M('M22', 'ontzet', 'Een luik erin', 'luik', { built: true, reward: 300,
    story: { intro: ['M22.1'], outro: null, replay: ['M22.5'] }, scenes: ['M22.1', 'M22.2', 'M22.3', 'M22.4', 'M22.5'],
    lead: ['T', "Tinus' schuur bij Zuidhorn. Henk bouwt een luik in de Escapade: dan is het de Fjord Frituur. Eerst de modder in, om de as te testen."] }),
  M('M23', 'ontzet', 'De colonne', 'colonne', { built: true, reward: 500,
    story: { intro: ['M23.1'], outro: ['M23.4'], replay: ['M23.5'] }, scenes: ['M23.1', 'M23.6', 'M23.7', 'M23.8', 'M23.2', 'M23.3', 'M23.4', 'M23.5'],
    lead: ['A', "Mem en Oma hebben de vrienden gebeld. We rijden samen naar de Grote Markt, vanaf Tinus' schuur."] }),
  M('M24', 'ontzet', "Er hangt iets Fries aan d'Olle Grieze", 'vlag', { built: true, reward: 600,
    story: { intro: ['M24.1'], outro: null, replay: ['M24.4'] }, scenes: ['M24.1', 'M24.2', 'M24.3', 'M24.4'],
    lead: ['T', 'Bert zit op de Grote Markt. Jelles Friese vlag hangt boven de plek van de Fjord Frituur: laat Berts duif de vijf touwen doorpikken.'] }),
  M('M25', 'ontzet', 'Het bod viel tegen', 'bod', { built: true, reward: 600,
    story: { intro: ['M25.1'], outro: ['M25.4'], replay: ['M25.5'] }, scenes: ['M25.1', 'M25.2', 'M25.3', 'M25.4', 'M25.5'],
    lead: ['A', "Oma's keuken aan de Noorderhaven. Bak vannacht een proefronde eierballen met alle vijf de ingrediënten: morgen is het Ontzet."] }),
  M('M26', 'ontzet', 'Ontzet, net als in 1672', 'ontzet', { built: true, reward: 4000,
    story: { intro: ['M26.1', 'M26.2'], outro: ['M26.7', 'M26.8'], replay: ['M26.9'] }, scenes: ['M26.1', 'M26.2', 'M26.3', 'M26.14', 'M26.15', 'M26.16', 'M26.4', 'M26.5', 'M26.6', 'M26.10', 'M26.11', 'M26.12', 'M26.13', 'M26.7', 'M26.8', 'M26.9'],
    lead: ['A', 'De Grote Markt, vrijdag, Gronings Ontzet. Win met de beste eierbal, hou de kraam heel en houd Jelle voor drie uur bij de notaris vandaan.'] }),
  A('E', 'ontzet', 'Epiloog en slot', { type: 'epilogue' }, { built: true, scenes: ['E1', 'E2'] }),
];

// what Tammo and Tessa are after, per part ("Wat weten we?")
export const WHY = {
  kop: 'Inschrijven voor de Noordelijke Snackprijs, en de Gouden Eierbal eerder pakken dan Jelle.',
  romp: 'Jelles plakjes tegenhouden en uitzoeken waar de bal is.',
  staart: 'De haven, het graan en de jury: Jelle koopt alles op.',
  zuid: 'Bewijs dat Jelle de bal nam, en de bal terughalen.',
  ontzet: 'De wedstrijd winnen en de bal terugbrengen. En de Fjord Frituur een thuis geven.',
};

// Clues of "Wat weten we?": a clue shows once its step is done.
export const CLUES = [
  { step: 'M01', kind: 'taal', title: 'De complimentenladder', text: 'Een Stadjer geeft geen complimenten, hij klimt een ladder. Zes treden: Goidag, Goud, Valt mie nait of, Braid noar de zin, Kon minder en bovenaan niks meer. Berend zei "Goud": trede twee.' },
  { step: 'M01', kind: 'clue', title: 'Een Fries met een klomp', text: 'Berend: een Fries in een blauw colbert wilde zijn bakkie kopen. Contant, uit een klomp. In augustus.' },
  { step: 'M01', kind: 'clue', title: 'JelleWâld', text: 'In de chat typte JelleWâld: "dat famke yn it read: sa\'n leaf gesicht" (dat meisje in het rood, zo\'n lief gezicht). Tammo vond het niet leuk.' },
  { step: 'M02', kind: 'clue', title: 'De reuzen en de klomp', text: 'Sjabbe: de reuzen werken voor Jelle Terpstra, de Fries in het blauwe colbert. Hij betaalt alles contant uit een klomp, en een klomp is snel leeg: daarom halen ze pinautomaten uit de muur. Hij vroeg ook waar het museum alarmen heeft.' },
  { step: 'M03', kind: 'hart', title: 'De bal van Grunn', text: 'Tammo\'s opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde, en hij huilde nooit. Tammo zegt niks. Dat is ook een antwoord.' },
  { step: 'M03', kind: 'clue', title: 'Salamitactiek', text: 'Jelle kocht de rij, en alle standplaatsen die vrijkomen. Alleen die van de winnaar blijft vrij. Plakje voor plakje, tot hij alles heeft.' },
  { step: 'M03', kind: 'clue', title: 'De bewaarder en de jury', text: 'Wie de Gouden Eierbal bewaart, zit de jury voor en tekent de uitslag. Is de bewaarder er niet, dan zit het oudste jurylid voor: Berend Bos. De bewaarder en vier juryleden gaan maandag met Jelle op treinreis, en de koepel van de bal hangt onder een doek.' },
  { step: 'M04', kind: 'clue', title: 'Bewaker twee', text: 'Bewaker twee krijgt een eierbal voor zijn koekje. Een Fries in een blauw colbert telt de alarmen.' },
  { step: 'M05', kind: 'clue', title: 'Drie minuten', text: 'Sjoerd: om twaalf uur \'s nachts gaan de camera\'s van het museum drie minuten uit voor een update. Al sinds 2019.' },
  { step: 'M03', kind: 'hart', title: 'Eerst pakken, als bewaking', text: 'Als een ander hem pakt, is hij weg uit Stad. Dus pakken Tessa en Tammo hem eerst, en brengen ze hem terug na het Ontzet.' },
  { step: 'M06', kind: 'clue', title: 'De lege vitrine', text: 'Iemand was ons voor. Op het kussen: "Tige tank! – J." Jelle Terpstra belde live naar Nachtstreek: de bal is bij hem.' },
  { step: 'M06', kind: 'hart', title: 'Voor de grip', text: 'Tessa pakte zijn hand. "Voor de grip." Allebei zeiden ze het.' },
  { step: 'M07', kind: 'hart', title: 'Iemand uit Friesland', text: 'Tessa kreeg weer een appje van iemand uit Friesland. Tammo vroeg of hij lang is.' },
  { step: 'M08', kind: 'clue', title: 'Gerda Terpstra, 1953', text: 'Oma Trijntje won in 1953. Tweede werd een Fries meisje: Gerda Terpstra, de mem van Jelle. Haar eierbal was beter. De jury wist het niet.' },
  { step: 'M08', kind: 'clue', title: 'Het lijstje van Oma', text: 'Het recept van 1953 had vijf dingen van vijf vrienden: vet, eieren, zout, meel en mosterd. Lammert, Geesje, Klaas, Roelfien en Wubbo. Jelle koopt ze allemaal op.' },
  { step: 'M08', kind: 'hart', title: 'Niet tegen haar', text: 'Oma Trijntje: "Jij: één zin, hè. Niet zeventig jaar." Tammo zegt dat hij wel iets zegt. Oma: "Niet tegen haar."' },
  { step: 'M09', kind: 'clue', title: 'Een eierkoek per week', text: 'Jelle sloot de Dorpsweg en huurde een boer die dwars staat: een eierkoek per week, levenslang. Geesje: haar kippen hebben geen contract. Gerda Terpstra woonde in Ljouwert en belt Oma elk jaar op haar verjaardag.' },
  { step: 'M10', kind: 'clue', title: 'De bal is echt', text: 'Jelle draagt de Gouden Eierbal in een gouden koffer: "mijn juristen willen dat ik hem bij me draag". Hij chanteert met de museumbeelden van zijn bewaker: verlaat Grunn en de Snackprijs, dan verdwijnen ze.' },
  { step: 'M10', kind: 'hart', title: 'Mem wil niks', text: 'Mem is eenennegentig, zeventig jaar tweede. Jelle: "Mem wil niks. Daarom doe ik het." Tessa: "Dat klonk bekend."' },
  { step: 'M11', kind: 'clue', title: 'Een oefenbal', text: 'In de kist op het skûtsje lag een chocoladebal met het kaartje "Foar mem". Jelle oefent hoe hij hem aan zijn moeder geeft. De echte is bij hem.' },
  { step: 'M11', kind: 'clue', title: 'Lammerts haven', text: 'Klaas: de Eemshaven is Lammerts haven. Zijn vader danste in 1953 met Oma. Jelle zegt dat de haven van hem is. Dokter Dijkstra heeft een heli klaarstaan.' },
  { step: 'M11', kind: 'hart', title: 'De lange blik', text: 'Op de zandplaat, onder de sterren, keken ze elkaar te lang aan. Toen trilde haar telefoon. "Niks. Iemand uit Friesland." Tammo keek weg.' },
  // Akte 4
  { step: 'M17', kind: 'clue', title: 'De grove mosterd', text: 'De grove mosterd is gered: het mosterdschip liep vast voor brug elf. Jelle kocht de fanfare weg, maar Wubbo floot.' },
  { step: 'M17', kind: 'clue', title: 'Middernacht', text: 'Wubbo: een webbureau in Veendam werkt alles om middernacht bij. Ook de bruggen. Tammo: net als de museumcamera\'s.' },
  { step: 'M17', kind: 'hart', title: 'Over zaterdag', text: 'Tammo: "Over zaterdag." Tessa: "Welke zaterdag?" Geen van beiden zei er verder iets over.' },
  { step: 'M18', kind: 'clue', title: 'Twaalf augustus', text: 'In het logboek van Wiebelwerk: op 12 augustus stond de update op elf minuten, aangevraagd door Us Mem Snacks. Zijdeur om 00:03, pas van bewaker twee, gasten D en D.' },
  { step: 'M18', kind: 'clue', title: 'Een leeg museum', text: 'Mevrouw Hoving\'s pas werd op 12 augustus geblokkeerd. Jelle had de bal vijf dagen vóór onze kraak al. Tessa printte het logboek.' },
  { step: 'M18', kind: 'hart', title: 'Het logboek', text: 'Tessa wilde het logboek van Wiebelwerk zien. Tammo vroeg waarom. Zij vond het leuk dat hij het wilde weten.' },
  { step: 'M19', kind: 'clue', title: 'Eén van vijf', text: 'Eén jurylid stapte uit. Een ander tekende voor levenslang eierballen: dat is van Jelle. De bewaarder blijft in de trein, dus Berend zit voor.' },
  { step: 'M19', kind: 'hart', title: 'Een trein in een station', text: 'Tammo: "Ik heb een trein bestuurd." Tessa: "Je hebt hem in een station gezet."' },
  { step: 'M20', kind: 'clue', title: 'Een moeder', text: 'Mem nam de bal van Jelle af in de kruitkelder van Bourtange. "Er is geen overeenkomst, jonge. Er is een moeder." Jelle: "Dit is nog niet voorbij."' },
  { step: 'M20', kind: 'clue', title: 'Tige tank! – J.', text: 'Het briefje is van Jelle: hij schrijft overal een bedankje bij. De Escapade stond niet meer op de parkeerplaats. Er lag een klomp.' },
  { step: 'M20', kind: 'hart', title: 'Jij zegt nooit iets', text: 'Tessa appte al weken met Mem en zei het niet. Tammo vroeg het niet. "Jij zegt nooit iets!" zeiden ze allebei.' },
  { step: 'M21', kind: 'clue', title: 'De auto of de bal', text: 'Op de wagon moest Tessa kiezen. Ze koos de auto. De beleggers sprongen met de bal naar een limo. Op de bijrijdersstoel: "Tige tank foar de bal. – J."' },
  { step: 'M21', kind: 'hart', title: 'Elke keuze faalt', text: 'Tammo kon de vrienden niet bij elkaar houden. Zijn zinnen kwamen er niet goed uit. Beiden zijn alleen, en beiden gaan naar Tinus\' schuur.' },
  { step: 'M22', kind: 'hart', title: 'Zeven plekken', text: 'Tessa woonde op zeven plekken voor haar tiende, en elke zomer in Ljouwert naast Mem. "Ik ging niet weg. Ik ben gebleven."' },
  { step: 'M22', kind: 'clue', title: 'Het horloge van opa', text: 'Tammo verkocht het horloge van zijn opa, via Bert, voor het luik. Het liep vijf minuten voor.' },
  { step: 'M23', kind: 'clue', title: 'Jelles bruggenvergunningen', text: 'Jelle gaf elke brug op de route een evenementenvergunning om de colonne te splitsen. Wubbo opende ze met zijn eigen sleutel. De colonne is een evenement zonder vergunning: Jelle stuurt een rekening.' },
  { step: 'M25', kind: 'clue', title: 'De notaris', text: 'Morgen om drie uur laat Jelle zich bij de notaris in de Oude Boteringestraat inschrijven als nieuwe bewaarder, met de bal. Dan tekent hij zelf de uitslag. Wij houden hem tegen.' },
  { step: 'M26', kind: 'hart', title: 'Vijf woorden', text: '"Ik wil bij jou blijven." "Dat bedoelde ik ook." Het duurde twaalf jaar. Kon minder.' },
];
