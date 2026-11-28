// The story "Alles voor één eierbal" in five acts plus Deel 4 "Nazomer"
// (docs/verhaal/nieuw, 00-OVERZICHT, 08-IMPLEMENTATIE and DEEL4): 30 missions
// (M01-M30), five travel beats (T1-T5), the opening (M00), two between-steps
// (A1-A2, the side activities of #845) and the epilogue (E).
// It is the only story (the first version was removed in #187); storyarc.js is
// what the rest of the game imports. Nothing here imports game code, only the
// cast tables of storyarc_basis.js to extend.
//
// Every step has `built: true`: the story runs to the end.
//
// Step fields
//   id       unique, stable (saved): 'M01'..'M30' for missions, 'T1'..'T5' for travel beats,
//            'A1'/'A2' for the between-steps (#845), 'E' for the epilogue
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
//   loopbanen ['bus', 'hengelen']: the loopbanen (loopbaan.js VAKKEN) the story points at here (#431). This is
//            the moment a vak turns up in the story, not a lock: the player may start it earlier on their own
//            (from its own startplek or the Loopbaan menu), and the step then counts that loopbaan as done.
//            Never reorders the steps; scripts/loopbaanstart_test.mjs checks that every vak is named once.
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
// MISSION_IDS only ever grows at the end (storyarc.js): the appended defs are
// NEW_MISSION_IDS below, in the order they were added.
import { SPEAKERS as OUD_SPEAKERS, CHARACTERS as OUD_CHARACTERS } from './storyarc_basis.js';

// ids appended to MISSION_IDS (indices live in saves: append only, never reorder)
export const NEW_MISSION_IDS = ['loket', 'bakkiestunt', 'containers', 'dijk', 'graan', 'bruggen', 'wiebelwerk', 'stoom', 'beleg', 'luik', 'colonne', 'eieren', 'wierde', 'inpakken', 'wisselwoning', 'terug', 'proefbeleg'];

// The new cast (storytext.js maps the script's speakers to these keys).
export const SPEAKERS = {
  ...OUD_SPEAKERS,
  geesje: 'Geesje', lammert: 'Lammert', roelfien: 'Roelfien', wubbo: 'Wubbo', tinus: 'Tinus',
  bewaarder: 'Mevrouw Hoving', loketbediende: 'Loketbediende', accountmanager: 'Accountmanager', jurylid: 'Jurylid',
  buschauffeur: 'Buschauffeur', kustwachter: 'Kustwachter', kermisexploitant: 'Kermisexploitant', deurwaarder: 'Deurwaarder',
  student: 'Student', boer: 'Boer', kind: 'Kind in het publiek',
  willemien: 'Willemien', buurvrouw: 'Buurvrouw',
  // inspiratiepakket (21-11)
  veldkamp: 'Meneer Veldkamp', anneke: 'Anneke', lieke: 'Lieke', daan: 'Daan', stien: 'Stien',
  // voetbal (28-11, #1374): de invalbeurt en de rangmomenten; de speler speelt Eppo via de NPC-sleutel 'trainer' (missionstory.js)
  albert: 'Albert Teuben', eppo: 'Eppo Rozema', hilbrand: 'Hilbrand', devries: 'Mevrouw De Vries-Jansen', jaap: 'Jaap Roorda',
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
  anita: keep('anita', { step: 'M00', bio: 'Snel, ad rem en de baas van het duo. Nederlandse, niet in Stad geboren, zomers in Ljouwert naast Mem. Tekent soms een wagen met een luik op een bierviltje en zegt dan dat het een tekening is. Regelt alles zelf. Ook de flat in Paddepoel, met Tammo als huisgenoot.' }),
  tammo: keep('tammo', { step: 'M00', bio: 'Stadjer uit het Oosterpark, droog, met een rode Fjord Escapade die nauwelijks rijdt. Net afgestudeerd en al sinds de studie verliefd op zijn beste vriendin, en sinds de verhuisdag van 14 augustus haar huisgenoot in Paddepoel. Hij zegt het nooit.' }),
  rikus: keep('rikus', { step: 'M00' }),
  berend: keep('berend', { step: 'M01' }),
  jelmer: keep('jelmer', { step: 'M01' }),
  torenwachter: keep('torenwachter', { step: 'M01' }),
  durk: keep('durk', { step: 'M02' }),
  sjabbe: keep('sjabbe', { step: 'M02' }),
  bert: keep('bert', { step: 'M04' }),
  sjoerd: keep('sjoerd', { step: 'M05', card: 'Kiezelcommissie. Wind tegen, beide kanten op.', bio: 'Van de Kiezelcommissie. Zijn neef werkt \'s nachts in het museum.' }),
  henk: keep('henk', { step: 'M06' }),
  jelle: keep('jelle', { step: 'M03', card: 'Snackkoning. Fries. Wint met regels, vergunningen en trucs.' }),
  bewaarder: { name: 'Mevrouw Hoving', card: 'Bewaarder van de Gouden Eierbal. Zit de jury voor.', step: 'M03', bio: 'Klein, oud en formeel, met een hoed en een gouden speldje. Bewaarder van de Gouden Eierbal sinds 1998 en bij traditie voorzitter van de jury.', quote: 'Wie de bal bewaart, tekent de uitslag.' },
  trijntje: keep('trijntje', { step: 'M08' }),
  mem: keep('mem', { step: 'M07', bio: 'Eenennegentig, uit Ljouwert. Appt Tessa stiekem en noemt haar famke. Wat ze wil, laat ze nog niet weten.' }),
  klaas: keep('klaas', { step: 'M11', bio: 'Oude schipper met een rubberboot en een skûtsje die even van niemand zijn.' }),
  dijkstra: keep('dijkstra', { step: 'M11' }),
  geesje: { name: 'Geesje', card: 'Kosteres. Eieren zijn haar vak.', step: 'M09', bio: 'Vierentachtig, kosteres in Warffum, kent Oma Trijntje van de kerk. Haar eieren zijn bijna heilig.', quote: 'Dat is een kerkelijk wonder.' },
  lammert: { name: 'Lammert', card: 'Havenmeester. Zijn vader danste in 1953 met Oma.', step: 'M13', bio: 'Havenmeester in Eemshaven en Delfzijl, kort en ironisch.', quote: 'De kraan piept. De bewaker kijkt bij het tweede piepje omhoog.' },
  roelfien: { name: 'Roelfien', card: 'Graanboerin. Vliegt laag.', step: 'M15', bio: 'Graanboerin en vlieger in het Oldambt, Oma\'s oudste klant. Vrolijk en praktisch.', quote: 'Vlieg laag, houd de molen rechts en trek de neus pas omhoog na de kermis.' },
  wubbo: { name: 'Wubbo', card: 'Brugwachter. Elf bruggen, één ritme.', step: 'M17', bio: 'Brugwachter in Veendam. Rustig, praktisch, en gek op de fanfare.', quote: 'Mis je de maat, dan wacht je.' },
  willemien: { name: 'Willemien', card: 'Familie van Oma Trijntje. Woont in een huis dat blijft staan.', step: 'M27', bio: 'Oma Trijntjes familie in Loppersum. Nuchter, droog, niet heldhaftig en niet boos: ze wacht, ze pakt in en ze komt terug.', quote: 'Het is een huis. Het moet alleen even blijven staan.' },
  veldkamp: { name: 'Meneer Veldkamp', card: 'Buurman op elf negen. Zijn duiven kiezen zelf.', step: 'M00', bio: 'Oude buurman in Paddepoel met een duiventil op de galerij. Zegt weinig en ziet veel. Zijn duiven vliegen naar Tammo toe en niet naar hem; hij vraagt er nooit naar.', quote: 'Mijn duiven doen dat bij niemand.' },
  daan: { name: 'Daan', card: 'Kermiszanger. Heeft een lied over alles.', step: 'M15', bio: 'Zanger en barman op de kermis in Winschoten, charmant en een tikje te zeker van zichzelf. Zijn glimmende jasje houdt niet van duiven.', quote: 'Eén couplet. Over een meisje met een spandoek.' },
  stien: { name: 'Stien', card: 'Frituurhoudster onder brug elf. Veertig jaar vet.', step: 'M17', bio: 'Zeventig, staat al veertig jaar met haar frituurwagen onder brug elf in Veendam. Kortaf, warm, en leert Tessa het vak.', quote: 'Eerst het vet warm, dan de mensen.' },
  anneke: { name: 'Anneke', card: 'Tessa\'s moeder. Kippen sinds 1987, koffie op het erf.', step: 'J3', bio: 'Tessa\'s moeder, van het platteland, praktisch en direct. Zij en haar man hebben kippen sinds 1987 op een erf bij Siddeburen; ze zet koffie voor Tammo en komt later onaangekondigd langs met een mand eieren.', quote: 'Jij belt nooit. Dan komen wij.' },
  lieke: { name: 'Lieke', card: 'Tessa\'s nichtje, tien. Ziet alles.', step: 'M25', bio: 'Tien jaar, in een gele regenjas, Tessa\'s nichtje. Ze heeft het al lang door en zegt het hardop.', quote: 'Jullie zijn al samen.' },
  tinus: { name: 'Tinus', card: 'Trekkertrekker. De modder pakt eerst je auto.', step: 'T4', bio: 'Trekkertrekker en re-enactor uit het Westerkwartier. Joviaal, met een schuur en een trekker.', quote: 'De modder pakt eerst je auto. Je plannen komen daarna.' },
};

// Parts: the ids kop/romp/staart stay (saves, kalender); zuid and ontzet are new.
// title/name/date as the first version's PARTS had them; `card` is the "volgt" card where the built story stops.
export const PARTS = {
  kop: { title: 'Akte 1: Moi, Grunn', name: 'Moi, Grunn', date: '14 augustus', open: true, end: 'Einde van akte 1',
    card: [['Tessa', 'Dat was akte 1.'], ['Tammo', 'Er komt meer.'], ['Meneer Veldkamp', 'Er zat vanavond een duif op de reling van elf negen. Hij keek omhoog. Ik heb het hok open gelaten.']] },
  romp: { title: 'Akte 2: Het Noorden is groot', name: 'Het Noorden is groot', date: '18 augustus', open: true, end: 'Einde van akte 2', textOnly: true,
    recap: [
      ['studio', 'Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist.'],
      ['Groninger Museum', 'De vitrine was leeg. Op het kussen: "Tige tank! – J."'],
      ['Grote Markt', 'Eerder in GDE. Een Fries in een blauw colbert wint met regels, vergunningen en trucs. Het eerste papier is al van hem.'],
    ],
    card: [['Tessa', 'Dat was akte 2. De Eemshaven is van Jelle, zegt hij.'], ['Tammo', 'Akte 3 volgt: aan de Eems.'], ['Oma Trijntje', 'Eet je krentjebrij, jong. Ook in akte drie.']] },
  staart: { title: 'Akte 3: Aan de Eems', name: 'Aan de Eems', date: '21 augustus', open: true, end: 'Akte 3 volgt', textOnly: true,
    recap: [
      ['Noorderhaven', 'Eerder in GDE. Oma Trijntje bakt het recept van 1953 na, met vijf ingrediënten en vijf vrienden: vet, eieren, zout, meel en mosterd.'],
      ['Hogeland', 'De eieren en het zout zijn gered. Jelle heeft de bal in een koffer, en Mem appt Tessa in het geheim.'],
      ['Eemshaven', 'Aan de Eems. Jelle vliegt met zijn koopboek in een ballon, en zijn voorraad vaart weg met een schip.'],
    ],
    card: [['Tessa', 'Akte 3 volgt.'], ['Tammo', 'Aan de Eems.'], ['Roelfien', 'Vlieg laag en houd de molen rechts. De rest komt vanzelf.']] },
  zuid: { title: 'Akte 4: Zuidwaarts', name: 'Zuidwaarts', date: '24 augustus', open: true, end: 'Einde van akte 4', textOnly: true,
    recap: [
      ['Oldambt', 'Eerder in GDE. Jelle probeert de jury, de haven en het graan te regelen met papier en trucs.'],
      ['Kermis', 'Een dijk, een kus, en daarna zei niemand er iets over.'],
      ['Veenkoloniën', 'Zuidwaarts. Elf bruggen, een logboek en een trein die stilstaat.'],
    ],
    card: [['Tessa', 'Dat was akte 4.'], ['Tammo', 'Daarna komt de schuur.'], ['Meneer Veldkamp', 'Drie duiven zitten al dagen op de reling. Ze wachten op iemand. Ik weet op wie.']] },
  // the finale card: the epilogue (E1, vrijdag 11 september) and Rikus in the studio (E2, E3); the text of the script, kept in sync by scripts/akte5_test.mjs
  ontzet: { title: 'Akte 5: Ontzet', name: 'Ontzet', date: '26 augustus', open: true, end: 'Einde', finale: true, textOnly: true,
    recap: [
      ['Bourtange', 'Het Beleg. De bal ging naar de oma van Jelle, en de Escapade naar Jelle.'],
      ['Zuidhorn', 'De Escapade is terug en de bal is weg. De vrienden van Oma twijfelen.'],
      ['Overmorgen', 'Het Ontzet. Om drie uur laat Jelle zich bij de notaris inschrijven als nieuwe bewaarder: dan tekent hij zelf de uitslag.'],
    ],
    card: [
      ['Rikus', 'Het ruikt naar suiker. Dat komt uit Hoogkerk. De zomer is nog lang niet op.'],
      ['Tessa', 'Het is tweeëntwintig graden.'],
      ['Tammo', 'Het is Grunn.'],
      ['Tessa', 'Spijt van de zomer?'],
      ['Tammo', 'Nee. Van de volgende ook niet. Alvast.'],
      ['Tessa', 'De mevrouw uit Loppersum staat weer vooraan. Haar oma kende Oma Trijntje.'],
      ['Tammo', 'Vaste klant. Uitverkocht voor vieren.'],
      ['Tessa', 'Berend heeft de foto laten inlijsten.'],
      ['Tammo', 'Op de achterkant staat: elf seconden.'],
      ['Tessa', 'De duiven staan weer in de rij.'],
      ['Tammo', 'Ik heb niks gezegd.'],
      ['Rikus', 'Moi. Nachtstreek, het laatste kwartier.'],
      ['Rikus', 'De Gouden Eierbal staat weer in het museum, met een alarm dat het doet en met twee namen op het bordje.'],
      ['Rikus', 'Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs.'],
      ['Rikus', "In Paddepoel, op de elfde verdieping, brandt 's avonds nog maar in één slaapkamer licht. Ik zeg niks."],
      ['Tessa', 'Hij zegt niks.'],
      ['Tammo', 'Dat zegt hij heel hard.'],
      ['Rikus', 'Berend stuurde een brief: hij wil volgend jaar weer de bisschop zijn. Omdat hij zo goed kan verliezen.'],
      ['Rikus', 'Jelle gaf bijna alles terug, helemaal vrijwillig. De standplaatsen en de molen hield hij. Hij zei dat hij het gezellig vond.'],
      ['Rikus', 'Oldenhuis Bakt sluit alle eenenveertig snackbars. De eigenaar blijkt Jelle te zijn. Nu weet ik wie dat at: niemand.'],
      ['Rikus', 'Jelle kocht vanochtend een pand aan de Hereweg. Hij noemt het een hobby.'],
      ['Tessa', 'Hij koopt door.'],
      ['Tammo', 'Wij bakken door.'],
      ['Rikus', 'Mevrouw Hoving stapt na bijna vier weken volpension in Wildervank uit de trein.'],
      ['Rikus', 'De Krolbrug staat nu open. Niemand weet waarom. Dat is verdacht.'],
      ['Rikus', 'De politie sloot de zaak van de twee Stadjers in het zwart. Op de camerabeelden is vooral bewaker twee te zien, met een koekje.'],
      ['Rikus', 'Sjabbe bracht een horloge terug naar de Vismarkt. Hij vroeg niets.'],
      ['Rikus', 'De loketbediende van Loket B stond vooraan. Ze zei dat Tessa haar bij haar naam had gegroet. Dat doet niemand.'],
      ['Rikus', 'Een oude vrouw met een rollator kreeg de eerste eierbal. Tammo had op het perron op haar gewacht.'],
      ['Rikus', 'Het jongetje van het bankje stond er ook. Hij deelde zijn snack met een duif.'],
      ['Rikus', 'Durk en Douwe werken nu voor Jelles oma. Ze sturen een kaartje.'],
      ['Rikus', 'Het jurylid met het contract eet nog steeds gratis eierballen. In Ljouwert.'],
      ['Rikus', 'En ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft niet betaald.'],
      ['Rikus', 'Dit is voor twee Stadjers. Ze zeggen nooit wat. Vandaag wel. Moi.'],
    ] },
  // Deel 4 (docs/verhaal/nieuw/DEEL4.md): a short continuation after the finale (`after`): it starts once the finale card
  // of that part has played (storyarc.js nextStoryStep) and does not hold back the credits (story.js getEnding)
  nazomer: { title: 'Deel 4: Nazomer', name: 'Nazomer', date: '14 september', open: true, after: 'ontzet', end: 'Einde van Deel 4', big: 'Einde van Deel 4', textOnly: true,
    recap: [
      ['Grote Markt', 'Eerder in GDE. Het Ontzet is gewonnen. De snackwagen staat op de Vismarkt en de rij loopt tot de Korenbeurs.'],
      ['Groninger Museum', 'De Gouden Eierbal staat weer in het museum, met een alarm dat het doet en twee namen op het bordje.'],
      ['Paddepoel', "Op de elfde verdieping brandt 's avonds nog maar in één slaapkamer licht."],
    ],
    card: [
      ['Rikus', 'Moi. Nachtstreek, nazomer. In Loppersum brandt licht in de gang. Ik zeg niks.'],
      ['Rikus', 'In Bourtange won een bisschop van karton. Hij zegt dat het verkeerd voelde. Volgend jaar verliest hij weer.'],
      ['Rikus', 'De snackwagen staat op de Vismarkt. De rij loopt tot de Korenbeurs. Elke zomer rijdt hij één ronde.'],
      ['Rikus', 'Jelle bestelde een eierbal, voor zijn oma. Hij betaalde contant. Uit een klomp, vermoed ik.'],
      ['Tessa', 'Dat was Deel 4.'],
      ['Tammo', 'Nu de rest van de wereld.'],
    ] },
};

// The between-steps of #845, in step order. They were added to the story after the first save format (v:1), so a
// v:1 save does not know them: storyarc.js passedBetweenSteps closes the ones that save had already passed.
export const BETWEEN_STEPS = ['A1', 'A2', 'V1', 'V2', 'V3'];

// Overgangsscènes (#1125, storybridge.js): een korte scène van Tammo en Tessa (soms Rikus, Mem of Jelle) tussen twee
// missies, op een rustig moment gespeeld zodra de stap `after` af is. De regels staan als scène `scene` (kind 'bridge')
// in script.json; `via` zegt waar het speelt ('car', 'flat' of 'phone'). Elke scène is overslaanbaar en nooit nodig om
// door te kunnen. Nooit twee scènes na twee opeenvolgende missies (scripts/storybridge_test.mjs).
export const BRIDGES = [
  { id: 'O1', after: 'M02', via: 'flat', scene: 'O1' },   // het kaartje van de eerste studieweek, de luiken van de wagen
  { id: 'O2', after: 'M04', via: 'phone', scene: 'O2' },  // Rikus belt Tammo: de jeugdvriend, "vijf jaar"
  { id: 'O3', after: 'M06', via: 'car', scene: 'O3' },    // na de kraak: eerlijk winnen, Oma's 1953
  { id: 'O4', after: 'M08', via: 'car', scene: 'O4' },    // Mem belt Tessa (1): de jas
  { id: 'O5', after: 'M10', via: 'phone', scene: 'O5' },  // Mem belt Tessa (2): "Straks"
  { id: 'O6', after: 'M13', via: 'phone', scene: 'O6' },  // Jelle biedt op Oma's recept (de wagen bestaat dan nog niet)
  { id: 'O7', after: 'M16', via: 'car', scene: 'O7' },    // "Over zaterdag"
  { id: 'O8', after: 'M18', via: 'phone', scene: 'O8' },  // Rikus: de politie zoekt twee Stadjers; bewaar het logboek
  { id: 'O9', after: 'M21', via: 'phone', scene: 'O9' },  // apart: "Ik heb de auto"
  { id: 'O10', after: 'M24', via: 'flat', scene: 'O10' }, // Jelles rekening voor de colonne
  { id: 'O11', after: 'M28', via: 'phone', scene: 'O11' }, // Jelle bestelt een eierbal voor zijn oma
  // wat nu: de wagen groeit, de wereld staat open; een eerdere keuze (storyromance.js) geeft een extra openingsregel
  { id: 'O12', after: 'M30', via: 'flat', scene: 'O12', extra: [{ if: 'romantiek:kaartje-hangt', line: ['Tessa', 'Het kaartje hangt er nog.'] }, { if: 'romantiek:kaartje-zak', line: ['Tammo', 'Het kaartje zit nog in mijn zak.'] }] },
];

const M = (id, part, title, def, o = {}) => ({ id, part, kind: 'mission', mission: def, title, built: false, silent: true, ...o });
const A = (id, part, title, goal, o = {}) => ({ id, part, kind: 'activity', title, goal, built: false, silent: true, ...o });

export const STEPS = [
  // --- Akte 1: Moi, Grunn (Stad, vr 14 - ma 17 augustus) ---------------------------------
  A('M00', 'kop', 'Opening: verhuisdag', { type: 'opening' }, { built: true, scenes: ['C00.1', 'C00.2', 'C00.3'] }),
  M('M01', 'kop', 'Nul krassen, vijftienhonderd punten', 'bakkiestunt', { built: true, reward: 200, minReward: 50,
    story: { intro: ['M01.1', 'M01.2'], outro: ['M01.6'], replay: ['M01.7'] },
    scenes: ['M01.1', 'M01.2', 'M01.3', 'M01.4', 'M01.5', 'M01.6', 'M01.7'],
    lead: ['A', 'Honderdvijftig euro verdienen: Berend wacht bij het Martinikerkhof met zijn bakkie. Nul krassen, hè.'] }),
  M('M02', 'kop', 'Even pinnen', 'pinautomaat', { built: true, reward: 400, loopbanen: ['klus'],
    story: { intro: ['M02.1'], outro: ['M02.3', 'M02.5'], replay: ['M02.4'] }, scenes: ['M02.1', 'M02.2', 'M02.3', 'M02.4', 'M02.5'],
    lead: ['A', 'De Herestraat, half acht. Mijn pas zit in een automaat.'] }),
  A('N1', 'kop', 'Een klus voor Sjabbe', { type: 'reis', to: 'de Herestraat', at: [53.2150, 6.5620], r: 250, scene: 'N1' }, { built: true, scenes: ['N1'], lead: ['A', 'Sjabbe heeft een klus: een kopieermachine de trap op. Dertig euro, en ik vraag niks. De Herestraat, deze middag.'] }),
  A('N2', 'kop', 'Een duif op de gang', { type: 'home' }, { built: true, scenes: ['N2'], lead: ['T', 'Er zit een duif op de deurmat en een oude man op de gang. Terug naar de flat, even kijken.'], homeScene: { id: 'N2', big: 'Een duif op de gang', clock: 18.5 } }),
  A('N3', 'kop', 'Soep bij Beppe', { type: 'reis', to: "Beppe's huis", at: [53.2340, 6.4900], r: 350, scene: 'N3' }, { built: true, scenes: ['N3'], lead: ['T', 'Beppe belde: of Tessa meekomt voor soep. Naar haar huis aan de westrand van de stad. Eerst eten, dan praten.'] }),
  A('N4', 'kop', 'Een eerste ronde', { type: 'reis', to: 'Station Groningen', at: [53.2108, 6.5658], r: 250, scene: 'N4' }, { built: true, scenes: ['N4'], lead: ['A', 'Wat kunnen wij eigenlijk? Een taxi, een formulier, een klus: we proberen het bij het station. Maandagochtend.'] }),
  // W1 (#1124): het frietmoment om half drie dat de opening mist
  A('W1', 'kop', 'Half drie', { type: 'home' }, { built: true, added: true, scenes: ['W1'], lead: ['A', "Het ruikt naar olie in de flat, midden in de nacht. Even naar huis: ik wil je iets laten proeven."], homeScene: { id: 'W1', big: 'Half drie', clock: 2.5 } }),
  M('M03', 'kop', 'Het Loket', 'loket', { built: true, reward: 0, cost: 150, loopbanen: ['kantoor'],
    story: { intro: ['M03.1'], outro: ['M03.4'], replay: ['M03.5'] }, scenes: ['M03.1', 'M03.2', 'M03.3', 'M03.4', 'M03.5'],
    lead: ['A', 'Het Loket bij de Grote Markt. Open tot twaalf uur, contant.'] }),
  M('M04', 'kop', 'Kieken van boven', 'duifverkenning', { built: true, reward: 350,
    story: { intro: ['M04.1'], outro: ['M04.3'], replay: ['M04.4'] }, scenes: ['M04.1', 'M04.2', 'M04.3', 'M04.4', 'M04.5'],
    lead: ['T', 'Naar Bert op het Stationsplein: een duif fotografeert het museum.'] }),
  M('M05', 'kop', 'Wind tegen, beide kanten op', 'kei', { built: true, reward: 550, loopbanen: ['padel'],
    story: { intro: ['M05.1'], outro: ['M05.3'], replay: ['M05.4'] }, scenes: ['M05.1', 'M05.2', 'M05.3', 'M05.4'],
    lead: ['A', 'Sjoerd wacht bij het Academiegebouw. Het is een fietsrace: een eigen fiets heb je nodig, de fietsenwinkel staat op je kaart.'] }),
  M('M06', 'kop', 'Het museum stond er al zo', 'museumkraak', { built: true, reward: 550, loopbanen: ['taxi'],
    // Henk's call while they wait (M06.0) plays at home; the escape and the radio are stage scenes of the mission (missions.js)
    homeScene: { id: 'M06.0', big: 'Wachten tot middernacht…' },
    story: { intro: ['M06.1'], outro: null, replay: ['M06.4'] }, scenes: ['M06.0', 'M06.1', 'M06.2', 'M06.3', 'M06.4'],
    lead: ['A', 'Vannacht om twaalf uur: de bal pakken. Tot die tijd wachten we thuis.'] }),

  // --- Akte 2: Het Noorden is groot (Stad, Hogeland, Waddenzee, di 18 - do 20 augustus) -----
  M('M07', 'romp', 'Al het vet van Grunn', 'vetgekaapt', { built: true, reward: 950, loopbanen: ['vracht'],
    story: { intro: ['M07.1'], outro: ['M07.3'], replay: ['M07.5'] }, scenes: ['M07.1', 'M07.2', 'M07.3', 'M07.4', 'M07.5'],
    lead: ['T', 'Jelle koopt al het vet van Grunn, en zonder vet geen eerlijke eierbal, ook niet voor Oma. Banden stuk, tankwagen pakken, naar de Oosterpoort.'] }),
  M('M08', 'romp', 'Fatbikes tellen niet als fiets', 'fatbike', { built: true, reward: 500, unlocks: 'zitmoi', loopbanen: ['bezorg', 'buiten'],
    story: { intro: ['M08.1'], outro: ['M08.3'], replay: ['M08.5'] }, scenes: ['M08.1', 'M08.2', 'M08.3', 'M08.4', 'M08.5'],
    lead: ['T', 'Oma Trijntje belde: eerlijk winnen kan alleen met haar recept van 1953. Loop te voet door de fatbikes in de Oude Ebbingestraat naar de Noorderhaven.'] }),
  // travel steps: the goal is the place (storyreis.js); the lines of the trip itself are the travel beat's (reisbeats.js)
  A('N10', 'romp', 'Een middag op het terras', { type: 'reis', to: 'de Grote Markt', at: [53.21920, 6.56692], r: 250, scene: 'N10' }, { built: true, scenes: ['N10'], lead: ['A', 'Een terras aan de Grote Markt zoekt hulp voor één middag. Ik neem de bestellingen op, jij draagt. Niet kantelen.'] }),
  A('N8', 'romp', 'Een avond bij Oma', { type: 'reis', to: 'de Noorderhaven', at: [53.2250, 6.5610], r: 250, scene: 'N8' }, { built: true, scenes: ['N8'], lead: ['T', 'Oma Trijntje heeft een logeerkamer voor ons en een prikbord vol namen. Terug naar de Noorderhaven.'] }),
  A('T1', 'romp', 'De trein naar Warffum', { type: 'reis', to: 'Warffum', at: [53.3903, 6.5667], r: 400, scene: 'T1', from: 4 }, { built: true, loopbanen: ['trein'], scenes: ['T1'],
    lead: ['A', 'Met de trein naar Warffum. Daar begint het Hogeland, en Geesje woont in de pastorie.'] }),
  M('M09', 'romp', 'Heel aankomen is ook een kunst', 'eieren', { built: true, reward: 700, loopbanen: ['horeca'],
    story: { intro: ['M09.1'], outro: ['M09.4'], replay: ['M09.5'] }, scenes: ['M09.1', 'M09.2', 'M09.3', 'M09.4', 'M09.5'],
    lead: ['A', 'Geesje in Warffum heeft de laatste eieren van het Hogeland. Eieren ken ik van thuis: jij rijdt, ik zeg hoe.'] }),
  A('N5', 'romp', 'De boerderij in Warffum', { type: 'reis', to: 'het erf bij Warffum', at: [53.39508, 6.54032], r: 500, scene: 'N5' }, { built: true, scenes: ['N5'], lead: ['A', 'Ik wil je iets laten zien: het erf waar ik melken leerde, bij Warffum. Neem je hand mee, en geen angst.'] }),
  // WP-pakket-aanvulling (21-11, #1126 #1127): K1 tot en met K3, activiteiten zonder beloning met migratie voor oude saves (added: true, zie storyarc.js ADDED_STEPS)
  A('K1', 'romp', 'Het land achter de pastorie', { type: 'reis', to: 'de pastorie in Warffum', at: [53.39185, 6.56013], r: 300, scene: 'K1' }, { built: true, added: true, scenes: ['K1'], lead: ['A', 'Geesje belde: er ligt iets achter de pastorie dat ze mij wil laten zien. Het ruikt naar kippen. Naar Warffum, dus.'] }),
  M('M10', 'romp', 'Een trekker-limo op de wierde', 'wierde', { built: true, reward: 900, unlocks: 'jelle', loopbanen: ['landbouw'],
    // the sloot scene (M10.3) is a stage of the mission itself; the talk in the car after it (M10.4) is a banter exchange
    story: { intro: ['M10.1'], outro: null }, scenes: ['M10.1', 'M10.2', 'M10.3', 'M10.4', 'M10.5'],
    lead: ['T', 'Een zwarte trekker met vlaggetjes rijdt het erf van de kerk op. Dat is Jelle.'] }),
  // #845: a between-step (the alternation mission <-> side activity): one round of the Landbouw side job before
  // the story goes on; silent, so no TTS, and the existing skip offers to pass it.
  A('A1', 'romp', 'De bietenoogst bij Hoogkerk', { type: 'sideJob', job: 'bietenoogst' }, { built: true, loopbanen: ['landbouw'],
    lead: ['A', 'De bieten moeten van het land. Akkerbouw Zonnehoek zoekt bij Hoogkerk een rooier: vier rijen, één trekker. Dit werk ken ik van thuis.'] }),
  A('N11', 'romp', 'Een bezorgrondje bij Bedum', { type: 'reis', to: 'Bedum', at: [53.3000, 6.6000], r: 400, scene: 'N11' }, { built: true, scenes: ['N11'], lead: ['A', 'Een bezorgdienst zoekt een rijder voor een rondje pakketten bij Bedum. Jij rijdt, ik lees de lijst. Dat gaat goed, zeg ik nu alvast.'] }),
  A('N12', 'romp', 'De lijst op de koelkast', { type: 'reis', to: 'de flat in Paddepoel', at: [53.2405, 6.5335], r: 250, scene: 'N12' }, { built: true, scenes: ['N12'], lead: ['T', 'Mijn schone sokken zijn op. De flat in Paddepoel, even langs, en dan weer verder.'] }),
  A('N6', 'romp', 'Een dag op het water', { type: 'reis', to: 'Noordpolderzijl', at: [53.4130, 6.5810], r: 400, scene: 'N6' }, { built: true, scenes: ['N6'], lead: ['T', 'Klaas heeft twee hengels en een emmer. Noordpolderzijl. Praat tegen het water, zegt hij.'] }),
  A('N7', 'romp', 'De streekbus naar Winsum', { type: 'reis', to: 'Winsum', at: [53.33302, 6.51598], r: 400, scene: 'N7' }, { built: true, scenes: ['N7'], lead: ['A', 'Een ritje met de streekbus naar Winsum, om te zien wat dat is: chauffeur zijn. Jij mag de halte kiezen.'] }),
  A('T2', 'romp', 'De streekbus naar Zoutkamp', { type: 'reis', to: 'Zoutkamp', at: [53.3377, 6.2986], r: 400 }, { built: true, loopbanen: ['bus', 'hengelen'], scenes: ['T2'],
    lead: ['A', 'Oma stuurt ons naar Kapitein Klaas in Zoutkamp: met de streekbus, overstappen in Winsum. Daarna is er alleen nog water.'] }),
  M('M11', 'romp', 'Geleend van de Friezen', 'skutsje', { built: true, reward: 1300, loopbanen: ['water'],
    // the def of the old arc is replaced by the coast mission (missions_nieuw.js kustDef); the scenes M11.2-M11.7 are stages of it
    story: {
      npc: 'klaas', outroNpc: 'klaas', intro: ['M11.1'], outro: ['M11.8'],
      replayLines: [['N', 'Weer het Reitdiep op? De rubberboot staat klaar.']],
      fail: [['A', 'Het ging mis. Terug naar Klaas, nog een keer.'], ['T', 'Hij kijkt nog steeds de andere kant op.']],
    },
    scenes: ['M11.1', 'M11.2', 'M11.3', 'M11.4', 'M11.5', 'M11.6', 'M11.7', 'M11.8'],
    lead: ['A', 'Jelles skûtsje vaart naar Lauwersoog, met een gouden bal in de kist. Klaas leent je een snelle boot, tot de sluizen.'] }),
  A('K2', 'romp', 'De kade in de ochtend', { type: 'reis', to: 'de haven van Zoutkamp', at: [53.3377, 6.2986], r: 300, scene: 'K2' }, { built: true, added: true, scenes: ['K2'], lead: ['T', 'Ik zit op de kade in Zoutkamp. Ik heb koffie. Twee. Kom maar als je wakker bent.'] }),

  // --- Akte 3: Aan de Eems (Eemsdelta en Oldambt, vr 21 - zo 23 augustus) ----------------
  M('M12', 'staart', 'Het staat niet in het rooster', 'traumaduif', { built: true, reward: 1200, loopbanen: ['lucht'],
    story: { intro: ['M12.1'], outro: ['M12.4'], replay: ['M12.5'] }, scenes: ['M12.1', 'M12.2', 'M12.3', 'M12.4', 'M12.5'],
    lead: ['A', 'Dokter Dijkstra wacht in Lauwersoog met een heli. Eerst eten voor de nachtdienst, dan naar Jelles ballon boven de Dollard, voor het koopboek.'] }),
  // ronde 5 (Jelle en de romance, J1 tot en met J6): activiteiten zonder beloning, met migratie zoals N1-N8 (storyarc.js ADDED_STEPS)
  A('J1', 'staart', 'Post van de gemeente', { type: 'home' }, { built: true, scenes: ['J1'], lead: ['A', 'Er ligt een stapel brieven van de gemeente op de mat in Paddepoel, allemaal over onze auto en allemaal van één afzender. Even naar huis, zien wat Jelle nu heeft ingediend.'], homeScene: { id: 'J1', big: 'Post van de gemeente', clock: 17.5 } }),
  M('M13', 'staart', 'Het containerlabyrint', 'containers', { built: true, reward: 900, loopbanen: ['handhaving'],
    story: { intro: ['M13.1'], outro: ['M13.3'], replay: ['M13.4'] }, scenes: ['M13.1', 'M13.2', 'M13.3', 'M13.4'],
    lead: ['A', 'De Eemshaven, vannacht. Lammert wacht aan de kade: container 4471 moet leeg uitvaren.'] }),
  A('K3', 'staart', 'Het havenkantoor in de nacht', { type: 'reis', to: 'Lammerts havenkantoor', at: [53.4424, 6.8572], r: 400, scene: 'K3' }, { built: true, added: true, scenes: ['K3'], lead: ['T', "Sjabbe zegt dat hij in de buurt is. Om drie uur 's nachts. In Lammerts havenkantoor, in de Eemshaven."] }),
  M('M14', 'staart', 'De dijk', 'dijk', { built: true, reward: 1000,
    story: { intro: ['M14.1'], outro: ['M14.3'], replay: ['M14.4'] }, scenes: ['M14.1', 'M14.2', 'M14.3', 'M14.4'],
    lead: ['T', 'Zonsopgang op de dijk bij Bierum. Om acht uur legt Jelles deurwaarder beslag in Delfzijl. Wij zijn eerder bij de sluis.'] }),
  A('J2', 'staart', 'Een envelop in Appingedam', { type: 'reis', to: 'Appingedam', at: [53.3200, 6.8580], r: 400, scene: 'J2' }, { built: true, scenes: ['J2'], lead: ['T', 'Lammert belde: er ligt een envelop voor hem klaar, van Jelle. Kom even langs op de brug in Appingedam, onder de hangende balkons.'] }),
  // verhaalwerkpakketten-gaten (22-11, #1124 #1139): W1 en W2, activiteiten zonder beloning met migratie voor oude saves (added: true, zie storyarc.js ADDED_STEPS)
  A('W2', 'staart', 'Verkocht, zegt het bord', { type: 'reis', to: 'het havenhuis in Delfzijl', at: [53.3330, 6.9180], r: 400, scene: 'W2' }, { built: true, added: true, scenes: ['W2'], lead: ['A', 'Aan de kade in Delfzijl staat een havenhuis te koop. Durk hangt er een nieuw bord op. Wie een pand wil beheren, moet eerst lezen wat er op het papier staat.'] }),
  A('T3', 'staart', 'De trein naar Winschoten', { type: 'reis', to: 'Winschoten', at: [53.1444, 7.0356], r: 400, scene: 'T3', from: 4 }, { built: true, scenes: ['T3'],
    lead: ['A', 'Van Delfzijl met de trein naar Winschoten. Jelle geeft de juryleden daar op de kermis een proeverij.'] }),
  M('M15', 'staart', 'Laag over het graan', 'graan', { built: true, reward: 900,
    story: { intro: ['M15.1'], outro: ['M15.3', 'M15.5', 'M15.6'], replay: ['M15.4'] }, scenes: ['M15.1', 'M15.2', 'M15.3', 'M15.5', 'M15.6', 'M15.4'],
    lead: ['A', 'Roelfien wacht bij haar graanveld bij Midwolda. Haar vliegtuig sleept al twintig jaar een spandoek voor de kermis.'] }),
  M('M16', 'staart', 'Nog eentje dan', 'kroegentocht', { built: true, reward: 600, loopbanen: ['kermis'],
    story: { intro: ['M16.1'], outro: ['M16.3', 'M16.4', 'M16.5', 'M16.6'], replay: ['M16.7'] }, scenes: ['M16.1', 'M16.2', 'M16.3', 'M16.4', 'M16.5', 'M16.6', 'M16.7'],
    lead: ['T', 'Durk en Douwe weten waar Jelle heen gaat. Volg ze langs Geerts drie tenten op de kermis in Winschoten, tot ze moe zijn.'] }),
  // #845: a between-step at the end of act 3: one free bumper-car ride on the Grote Markt (Kermis) before act 4.
  A('A2', 'staart', 'De kermisrit', { type: 'kermis' }, { built: true, loopbanen: ['kermis'],
    lead: ['A', "De kermis in Stad staat nog op de Grote Markt. Eén ritje in de botsauto's, dan rijden we door naar het zuiden."] }),

  A('J3', 'staart', "Koffie bij Tessa's ouders", { type: 'reis', to: 'het erf bij Siddeburen', at: [53.2430, 6.8660], r: 500, scene: 'J3' }, { built: true, scenes: ['J3'], lead: ['T', "Tessa's moeder wil mij zien. Zondag, koffie, het erf bij Siddeburen. Tessa zegt dat het meevalt. Haar stem zegt iets anders."] }),

  // --- Akte 4: Zuidwaarts (Veenkoloniën en Westerwolde, zo 23 - wo 26 augustus) ----------
  M('M17', 'zuid', 'Open, dicht', 'bruggen', { built: true, reward: 700,
    story: { intro: ['M17.1'], outro: ['M17.3', 'M17.5'], replay: ['M17.4'] }, scenes: ['M17.1', 'M17.2', 'M17.3', 'M17.5', 'M17.4'],
    lead: ['A', 'Eerst de mosterd. Wubbo bedient elf bruggen in Veendam: vaar voor Jelles mosterdschip uit, dan sluit hij de bruggen achter je.'] }),
  A('J4', 'zuid', 'Een dubbele date in Veendam', { type: 'reis', to: 'het terras aan het Oosterdiep', at: [53.1060, 6.8790], r: 300, scene: 'J4' }, { built: true, scenes: ['J4'], lead: ['A', 'Femke en Rikus willen eten, met ons erbij. Een terras aan het Oosterdiep in Veendam. Zij noemt het een date, wij noemen het lunch.'] }),
  M('M18', 'zuid', 'Wie draaide de camera\'s uit?', 'wiebelwerk', { built: true, reward: 600,
    story: { intro: ['M18.1'], outro: ['M18.4'], replay: ['M18.5'] }, scenes: ['M18.1', 'M18.2', 'M18.6', 'M18.7', 'M18.3', 'M18.4', 'M18.5'],
    lead: ['T', "Dan het bewijs. Grunn houdt ons voor de dieven; Wiebelwerk in de Stad beheert de museumcamera's. Het logboek van 12 augustus moet laten zien dat Jelle de bal al had."] }),
  A('N9', 'zuid', 'Nacht op een dijk', { type: 'reis', to: 'de dijk bij de Dollard', at: [53.2600, 7.0600], r: 600, scene: 'N9' }, { built: true, scenes: ['N9'], lead: ['T', 'Rikus belde: de politie zoekt twee Stadjers in het zwart. Hij leent ons zijn oude busje en kent een dijk waar niemand komt. Neem een deken mee.'] }),
  A('J5', 'zuid', 'Een wielklem in Stadskanaal', { type: 'reis', to: 'Stadskanaal', at: [52.9890, 6.9500], r: 400, scene: 'J5' }, { built: true, scenes: ['J5'], lead: ['T', 'De Escapade staat in Stadskanaal en heeft een gele klem om een wiel. Ik wil weten wie dat heeft aangevraagd. Ik denk het te weten.'] }),
  M('M19', 'zuid', 'Stoom', 'stoom', { built: true, reward: 800,
    story: { intro: ['M19.1'], outro: ['M19.3'], replay: ['M19.4'] }, scenes: ['M19.1', 'M19.2', 'M19.3', 'M19.4'],
    lead: ['A', 'Dan de jury: wie de jury koopt, hoeft niet te winnen. In Jelles stilstaande stoomtrein in Veendam zitten de laatste juryleden vast. Rij hem naar Wildervank.'] }),
  A('J6', 'zuid', 'Beppe aan de deur', { type: 'home' }, { built: true, scenes: ['J6'], lead: ['T', 'Beppe belde dat ze langskomt. Met soep. Het is nog maar dinsdag, maar ik ruim de flat vast op.'], homeScene: { id: 'J6', big: 'Beppe aan de deur', clock: 15.5 } }),
  // Voetbalverhaallijn (V1-V3, #1179, epic #1106): Tessa is de ster, Tammo helpt haar shinen (de papieren, de schoenen, de sponsor). Alleen bestaande doeltypes (shop, reis);
  // geen stem (silent: telefoonregels). Samen spelen: een verhaalstap is per speler (eigen voortgang, #429): elke speler loopt hem in zijn eigen spel; de wereld van de host hoeft er niets voor te doen.
  // Het is geen voorwaarde voor de carrière: voetbalpoort.js opent de carrière al in akte 4; deze stappen geven de reden en de eerste aanloop. Hernoemen of weghalen kan niet: de id's staan in saves (BETWEEN_STEPS).
  // De scènes V1.1 tot V1.3 (de invalbeurt) speelt careerdebut_voetbal.js bij de start van de carrière, V3.2 tot V3.6 (de rangmomenten) footballrankmoments.js; de stap speelt ze niet zelf (09-script-voetbal.md).
  A('V1', 'zuid', 'Schoenen voor de ster', { type: 'shop', shop: 'kleding' }, { built: true, player: 'anita', scenes: ['V1.1', 'V1.2', 'V1.3'],
    lead: ['T', 'De club in Veendam zoekt spelers en ik heb je opgegeven. Je hebt schoenen en een shirt nodig. Ik betaal de eerste maat.'],
    done: ['T', 'Dat staat je. Echt. Het dorpsteam vergat je nooit, en Veendam vergeet je ook niet.'] }),
  A('V2', 'zuid', 'De eerste training', { type: 'reis', to: 'Veendam', at: [53.1058, 6.8756], r: 700 }, { built: true, player: 'anita',
    lead: ['T', 'Vanavond is de training in Veendam. Ga maar vast, ik regel de papieren. Jij hoeft alleen te schitteren.'],
    done: ['T', 'Drie keer raak, zegt de trainer. Hij zei het alsof hij het niet geloofde. Ik heb er een foto van.'] }),
  A('V3', 'zuid', 'Het is jouw avond', { type: 'shop', shop: 'super' }, { built: true, player: 'anita', scenes: ['V3.2', 'V3.3', 'V3.4', 'V3.5', 'V3.6'],
    lead: ['T', 'Een sponsor wil een rondje geven voor het team. Haal bij de avondwinkel iets te drinken voor iedereen.'],
    done: ['T', 'Bedankt. De selectie vindt je nu al aardig. Dat is jouw werk, ik draag alleen de tassen.'] }),
  // the bus to Bourtange: the goal is the place (storyreis.js, akte 2's travel steps); the trip talk is the beat's (reisbeats.js)
  A('T4', 'zuid', 'De bus naar Bourtange', { type: 'reis', to: 'Vesting Bourtange', at: [53.0069, 7.1914], r: 350, scene: 'T4.3', from: 0 }, { built: true, scenes: ['T4.1', 'T4.2', 'T4.3', 'T4.4'],
    lead: ['T', 'Jelle komt dinsdag met zijn mannen naar het Beleg van Bourtange. Berend heeft veertig man, vijftien kartonnen kanonnen en een bus. Hij wacht in het bos bij Ter Apel.'] }),
  M('M20', 'zuid', 'Het beleg van Bourtange', 'beleg', { built: true, reward: 1200,
    story: { intro: ['M20.1'], outro: ['M20.5'], replay: ['M20.6'] }, scenes: ['M20.1', 'M20.2', 'M20.3', 'M20.4', 'M20.5', 'M20.6'],
    lead: ['A', 'Het Beleg van Bourtange begint om negen uur. Jelle komt, en de bal reist met hem mee. Haal hem terug, voordat hij hem aan zijn oma geeft.'] }),
  M('M21', 'zuid', 'Iedereen heeft een rode auto gezien', 'fjord', { built: true, reward: 1100, player: 'anita', solo: true,
    story: { intro: ['M21.1'], outro: null, replay: ['M21.5'] }, scenes: ['M21.1', 'M21.2', 'M21.3', 'M21.4', 'M21.5', 'M21.6'],
    lead: ['A', 'De Escapade staat op een goederentrein richting Ljouwert. Ik haal hem terug. Alleen.'] }),

  // --- Akte 5: Ontzet (Westerkwartier en Stad, wo 26 - vr 28 augustus, epiloog 11 september) --
  // het slot (verhaal-eind, 21-11): de wagen ontdekken en samen bouwen (F1, F2), de verzoening, Jelle achteraan de rij en de eerste avond als stel (F3 tot en met F5), de kaart (F6, na M30);
  // activiteiten zonder beloning, met migratie voor oude saves (added: true, zie storyarc.js ADDED_STEPS)
  A('F1', 'ontzet', 'Een wagen langs de weg', { type: 'reis', to: 'een zandweg bij Zuidhorn', at: [53.2490, 6.4150], r: 500, scene: 'F1' }, { built: true, added: true, scenes: ['F1'], lead: ['A', 'Langs een zandweg bij Zuidhorn staat een aanhanger met een luik en een bordje: te koop. Ik wil hem zien. Even.'] }),
  M('M22', 'ontzet', 'Een luik erin', 'luik', { built: true, reward: 500, loopbanen: ['race'],
    story: { intro: ['M22.1'], outro: null, replay: ['M22.5'] }, scenes: ['M22.1', 'M22.2', 'M22.3', 'M22.4', 'M22.5'],
    lead: ['T', "Tinus' schuur bij Zuidhorn. Henk bouwt een luik in de Escapade: dan is het de snackwagen. Eerst de modder in, om de as te testen."] }),
  A('F2', 'ontzet', 'De eerste bak', { type: 'reis', to: 'een loods in Hoogkerk', at: [53.2158, 6.4850], r: 450, scene: 'F2' }, { built: true, added: true, scenes: ['F2'], lead: ['T', "Het luik zit erin. Nu de eerste bak: een loods in Hoogkerk, een friteuse en Oma's beslag. Jij bakt, ik sleutel."] }),
  M('M23', 'ontzet', 'De colonne', 'colonne', { built: true, reward: 500,
    story: { intro: ['M23.1'], outro: ['M23.4'], replay: ['M23.5'] }, scenes: ['M23.1', 'M23.6', 'M23.7', 'M23.8', 'M23.2', 'M23.3', 'M23.4', 'M23.5'],
    lead: ['A', "Mem en Oma hebben de vrienden gebeld. We rijden samen naar de Grote Markt, vanaf Tinus' schuur."] }),
  M('M24', 'ontzet', "Er hangt iets Fries aan d'Olle Grieze", 'vlag', { built: true, reward: 600,
    story: { intro: ['M24.1'], outro: null, replay: ['M24.4'] }, scenes: ['M24.1', 'M24.2', 'M24.3', 'M24.4'],
    lead: ['T', 'Bert zit op de Grote Markt. Jelles Friese vlag hangt boven de plek van de snackwagen: laat Berts duif de vijf touwen doorpikken.'] }),
  M('M25', 'ontzet', 'Het bod viel tegen', 'bod', { built: true, reward: 600,
    story: { intro: ['M25.1'], outro: ['M25.4', 'M25.6'], replay: ['M25.5'] }, scenes: ['M25.1', 'M25.2', 'M25.3', 'M25.4', 'M25.6', 'M25.5'],
    lead: ['A', "Oma's keuken aan de Noorderhaven. Bak vannacht een proefronde eierballen met alle vijf de ingrediënten: morgen is het Ontzet."] }),
  M('M26', 'ontzet', 'Ontzet, net als in 1672', 'ontzet', { built: true, reward: 4000,
    story: { intro: ['M26.1', 'M26.2'], outro: ['M26.7', 'M26.17', 'M26.8'], replay: ['M26.9'] }, scenes: ['M26.1', 'M26.2', 'M26.3', 'M26.14', 'M26.15', 'M26.16', 'M26.4', 'M26.5', 'M26.6', 'M26.10', 'M26.11', 'M26.12', 'M26.13', 'M26.7', 'M26.17', 'M26.8', 'M26.9'],
    lead: ['A', 'De Grote Markt, vrijdag, Gronings Ontzet. Win met de beste eierbal, hou de kraam heel en houd Jelle voor drie uur bij de notaris vandaan.'] }),
  A('F3', 'ontzet', 'Soep en eierbal', { type: 'reis', to: 'de Noorderhaven', at: [53.2250, 6.5610], r: 250, scene: 'F3' }, { built: true, added: true, scenes: ['F3'], lead: ['T', 'Oma Trijntje en Beppe in één keuken aan de Noorderhaven, met Mem erbij. Neem brood mee en blijf kalm.'] }),
  A('F4', 'ontzet', 'Foar mem, achteraan de rij', { type: 'reis', to: 'de Vismarkt', at: [53.2196, 6.5688], r: 250, scene: 'F4' }, { built: true, added: true, scenes: ['F4'], lead: ['A', 'Zondagochtend bij de Vismarkt: het luik is open, de rij staat er al. En achteraan staat iemand die we kennen.'] }),
  A('F5', 'ontzet', 'Een avond voor twee', { type: 'reis', to: 'de kade aan de Noorderhaven', at: [53.2268, 6.5590], r: 250, scene: 'F5' }, { built: true, added: true, scenes: ['F5'], lead: ['T', 'Vanavond aan de Noorderhaven. Ik heb een deken en twee eierballen. Zeg maar niks.'] }),
  A('E', 'ontzet', 'Epiloog en slot', { type: 'epilogue' }, { built: true, scenes: ['E1', 'E2', 'E3'] }),

  // --- Deel 4: Nazomer (Loppersum en Bourtange, ma 14 - za 19 september), after the finale card ------------------
  M('M27', 'nazomer', 'Inpakken', 'inpakken', { built: true, reward: 400,
    story: { intro: ['M27.1'], outro: ['M27.3'], replay: ['M27.4'] }, scenes: ['M27.1', 'M27.2', 'M27.3', 'M27.4'],
    lead: ['A', 'Oma Trijntje belde: Willemien in Loppersum, elke woensdag vaste klant bij het luik, moet even uit haar huis. Het wordt verbouwd. Wij helpen inpakken. Gewoon dozen.'] }),
  M('M28', 'nazomer', 'De wisselwoning', 'wisselwoning', { built: true, reward: 400,
    story: { intro: ['M28.1'], outro: ['M28.3'], replay: ['M28.4'] }, scenes: ['M28.1', 'M28.2', 'M28.3', 'M28.4'],
    lead: ['T', 'De dozen staan in de verhuisbus. Willemien zit voorin met de kat. Rustig rijden, naar de wisselwoning aan de rand van het dorp.'] }),
  M('M29', 'nazomer', 'Terug', 'terug', { built: true, reward: 500, loopbanen: ['podium'],
    story: { intro: ['M29.1'], outro: ['M29.3'], replay: ['M29.4'] }, scenes: ['M29.1', 'M29.2', 'M29.3', 'M29.4'],
    lead: ['A', 'Willemien appte: het huis is klaar. Of we haar terugbrengen. Er is een buurtfeest op het erf.'] }),
  // the road to Bourtange: the goal is the place (storyreis.js); the trip talk is the beat's (reisbeats.js)
  A('T5', 'nazomer', 'De weg naar Bourtange', { type: 'reis', to: 'Vesting Bourtange', at: [53.0069, 7.1914], r: 350, scene: 'T5.2', from: 0 }, { built: true, scenes: ['T5.1', 'T5.2', 'T5.3'],
    lead: ['T', "Berend belde: één proefbeleg in Bourtange, zaterdag, met iedereen van Oma's lijstje. Hij wacht bij een hooiberg op de heide."] }),
  M('M30', 'nazomer', 'Het proefbeleg', 'proefbeleg', { built: true, reward: 1500, loopbanen: ['golf'],
    story: { intro: ['M30.1'], outro: ['M30.6'], replay: ['M30.7'] }, scenes: ['M30.1', 'M30.2', 'M30.3', 'M30.4', 'M30.5', 'M30.6', 'M30.7'],
    lead: ['A', 'Het proefbeleg van Bourtange. Zeven vrienden, vier fronten en één bisschop die niet graag wint.'] }),
  A('F6', 'nazomer', 'De kaart op het luik', { type: 'reis', to: 'de Vismarkt', at: [53.2196, 6.5688], r: 250, scene: 'F6' }, { built: true, added: true, scenes: ['F6'], lead: ['A', 'De Vismarkt, zaterdagochtend. Ik heb een kaart van de provincie en een stift. Wedstrijd.'] }),
];

// what Tammo and Tessa are after, per part ("Wat weten we?")
export const WHY = {
  kop: 'Tammo en Tessa weten niet wat ze met hun leven moeten en willen elkaar niet kwijtraken. Eerst geld en een plek in de Noordelijke Snackprijs, voordat Jelle alles opkoopt.',
  romp: "Een recept van 1953 om eerlijk te winnen: Oma Trijntjes vijf ingrediënten van vijf vrienden. Jelle koopt ze op.",
  staart: 'Jelle koopt de haven, het graan en de jury. Tammo en Tessa proberen van alles en merken dat ze samen sterker zijn.',
  zuid: 'De bal terughalen van Jelle, voordat hij hem in Bourtange aan zijn oma geeft. Eerst het bewijs dat hij hem al had, dan de jury. Samen, ook als het schuurt.',
  ontzet: 'Het Ontzet winnen met de beste eierbal en de snackwagen een standplaats geven. Jelle zit ons op de hielen.',
  nazomer: "De wagen groeit. Oma's familie heeft hulp nodig en Jelle bestelt stiekem eierballen.",
};

// Clues of "Wat weten we?": a clue shows once its step is done.
export const CLUES = [
  { step: 'M01', kind: 'taal', title: 'De complimentenladder', text: 'Een Stadjer geeft geen complimenten, hij klimt een ladder. Zes treden: Goidag, Goud, Valt mie nait of, Braid noar de zin, Kon minder en bovenaan niks meer. Berend zei "Goud": trede twee.' },
  { step: 'M01', kind: 'clue', title: 'Een Fries met een klomp', text: 'Berend: een Fries in een blauw colbert wilde zijn bakkie kopen. Contant, uit een klomp. In augustus.' },
  { step: 'M01', kind: 'clue', title: 'JelleWâld', text: 'In de chat typte JelleWâld: "dat famke yn it read: sa\'n leaf gesicht" (dat meisje in het rood, zo\'n lief gezicht). Tammo vond het niet leuk.' },
  { step: 'M02', kind: 'clue', title: 'De reuzen en de klomp', text: 'Sjabbe: de reuzen werken voor Jelle Terpstra, de Fries in het blauwe colbert. Hij betaalt alles contant uit een klomp, en een klomp is snel leeg: daarom halen ze pinautomaten uit de muur. Hij vroeg ook waar het museum alarmen heeft.' },
  { step: 'M03', kind: 'hart', title: 'De bal van Grunn', text: 'Tammo\'s opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde, en hij huilde nooit. Tammo zegt niks. Dat is ook een antwoord.' },
  { step: 'M03', kind: 'clue', title: 'Papieren wapens', text: 'Jelle kocht de rij en alle standplaatsen die vrijkomen, met regels, vergunningen en trucs. Alleen die van de winnaar blijft vrij.' },
  { step: 'M03', kind: 'clue', title: 'De bewaarder en de jury', text: 'Wie de Gouden Eierbal bewaart, zit de jury voor en tekent de uitslag. Is de bewaarder er niet, dan zit het oudste jurylid voor: Berend Bos. De bewaarder en vier juryleden gaan maandag met Jelle op treinreis, en de koepel van de bal hangt onder een doek.' },
  { step: 'M04', kind: 'clue', title: 'Bewaker twee', text: 'Bewaker twee krijgt een eierbal voor zijn koekje. Een Fries in een blauw colbert telt de alarmen.' },
  { step: 'M05', kind: 'clue', title: 'Drie minuten', text: 'Sjoerd: om twaalf uur \'s nachts gaan de camera\'s van het museum drie minuten uit voor een update. Al sinds 2019.' },
  { step: 'M03', kind: 'hart', title: 'Eerst pakken, als bewaking', text: 'Als een ander hem pakt, is hij weg uit Stad. Dus pakken Tessa en Tammo hem eerst, en brengen ze hem terug na het Ontzet.' },
  { step: 'M06', kind: 'clue', title: 'De lege vitrine', text: 'Iemand was ons voor. Op het kussen: "Tige tank! – J." Jelle Terpstra belde live naar Nachtstreek: de bal is bij hem.' },
  { step: 'M06', kind: 'hart', title: 'Voor de grip', text: 'Tessa pakte zijn hand. "Voor de grip." Allebei zeiden ze het.' },
  { step: 'M07', kind: 'clue', title: 'Al het vet van Grunn', text: 'Jelle belde zelf: hij kocht al het vet van Grunn, voor één klomp. Zonder vet bakt niemand een eierbal, ook Oma niet. Dus pakten Tessa en Tammo de tankwagen.' },
  { step: 'M07', kind: 'hart', title: 'Iemand uit Friesland', text: 'Tessa kreeg weer een appje van iemand uit Friesland. Tammo vroeg of hij lang is.' },
  { step: 'M08', kind: 'clue', title: 'Gerda Terpstra, 1953', text: 'Oma Trijntje won in 1953. Tweede werd een Fries meisje: Gerda Terpstra, de mem van Jelle. Haar eierbal was beter. De jury wist het niet.' },
  { step: 'M08', kind: 'clue', title: 'Het lijstje van Oma', text: 'Het recept van 1953 had vijf dingen van vijf vrienden: vet, eieren, zout, meel en mosterd. Geesje heeft de eieren, Klaas het zout, de rest staat op het lijstje (Lammert, Roelfien en Wubbo). Dijkstra van het ziekenhuis helpt ook. Jelle koopt alles op. Het lijstje hangt aan het prikbord: dat is het menu van de snackwagen.' },
  { step: 'M08', kind: 'hart', title: 'Niet tegen haar', text: 'Oma Trijntje: "Jij: één zin, hè. Niet zeventig jaar." Tammo zegt dat hij wel iets zegt. Oma: "Niet tegen haar."' },
  { step: 'M09', kind: 'clue', title: 'Een eierkoek per week', text: 'Jelle sloot de Dorpsweg en huurde een boer die dwars staat: een eierkoek per week, levenslang. Geesje: haar kippen hebben geen contract. Gerda Terpstra woonde in Ljouwert en belt Oma elk jaar op haar verjaardag.' },
  { step: 'M09', kind: 'hart', title: 'Boerendochter', text: 'Tessa is boerendochter: ze sorteerde eieren voor ze kon lezen en kent elke achterweg. Tammo wist het vijf jaar niet. Ze zei dat hij nooit naar de kippen vroeg.' },
  { step: 'M10', kind: 'clue', title: 'De bal is echt', text: 'Jelle draagt de Gouden Eierbal in een gouden koffer: "mijn juristen willen dat ik hem bij me draag". Hij chanteert met de museumbeelden van zijn bewaker: verlaat Grunn en de Snackprijs, dan verdwijnen ze.' },
  { step: 'M10', kind: 'hart', title: 'Mem wil niks', text: 'Mem is eenennegentig, zeventig jaar tweede. Jelle: "Mem wil niks. Daarom doe ik het." Tessa: "Dat klonk bekend."' },
  { step: 'M11', kind: 'clue', title: 'Een briefje van M.', text: 'In de kist op het skûtsje lag geen bal, maar een broodtrommel met een briefje in een oud handschrift: "Eet wat. Ik wil niks. – M." Jelle was een val aan het zetten. Tessa keek er te lang naar en zei niets.' },
  { step: 'M11', kind: 'clue', title: 'Lammerts haven', text: 'Klaas: de Eemshaven is Lammerts haven. Zijn vader danste in 1953 met Oma. Jelle zegt dat de haven van hem is. Dokter Dijkstra heeft een heli klaarstaan.' },
  { step: 'M11', kind: 'hart', title: 'De lange blik', text: 'Op de zandplaat, onder de sterren, keken ze elkaar te lang aan. Toen trilde haar telefoon. "Niks. Iemand uit Friesland." Tammo keek weg.' },
  { step: 'M12', kind: 'clue', title: 'Het koopboek', text: 'Jelle vloog met zijn koopboek boven de Dollard: acht plakjes, bij elk "Foar mem" met een hartje. Plakje vijf is de haven (container 4471, vannacht). Het laatste is de bewaarder: notaris, 28 augustus, drie uur.' },
  { step: 'M12', kind: 'hart', title: 'Duiven luisteren naar Tammo', text: 'Dijkstra: Trijntje zegt dat duiven naar Tammo luisteren. Hij hing aan de lier, floot, en de ballon zat vol duiven. Tessa vroeg het hem eerst. "Dank je dat je het vraagt."' },
  { step: 'M13', kind: 'clue', title: 'Een stek aan de kade', text: 'Container 4471 voer leeg weg. Lammert: als ze ooit een wagen hebben, staat hij aan zijn kade. Een stek. Sjabbe: een havenkantoor is een pand, en dat kun je zelf beheren. Jelle koopt panden.' },
  { step: 'M13', kind: 'hart', title: 'Twee bedden', text: 'Lammerts havenkantoor heeft twee bedden. Tammo zei niks en keek naar zijn schoenen. "Dat gezicht betekent: prima." "Klopt."' },
  { step: 'M14', kind: 'clue', title: 'Inboedel', text: 'Jelle kocht Lammerts huurschuld; zijn deurwaarder zou het woonschip met het vet erin nemen. Trijntje tekende om vijf voor acht. Jelle: "Mijn juristen vinden dat u te hard rijdt."' },
  { step: 'M14', kind: 'hart', title: 'Dat is de wind', text: 'Tammo: "Je ziet er goed uit met wind." Tessa: "Wat bedoelde je dan?" Tammo: "Dat bedoelde ik wel." Hij was rood. Dat was de wind.' },
  { step: 'M15', kind: 'clue', title: 'Levenslang eierballen', text: 'Het spandoek joeg twee van de vier juryleden weg, en Roelfien gaf grof meel voor Oma. Jelle stuurde een bedankbriefje: zijn proeverij was uitverkocht. Hij liet zijn gouden koffer geen seconde los.' },
  { step: 'M16', kind: 'clue', title: 'Maandag in Veendam', text: 'Durk, na een gelijkspel in de botsauto: Jelle rijdt maandag naar Veendam voor de mosterd. De bal gaat mee, in de koffer onder het kussen van de limo.' },
  { step: 'M16', kind: 'hart', title: 'Gebotst', text: 'Tessa trok hem in de botsauto naar zich toe. Daarna zeiden ze: "Goed. Maandag dan." Op de dijk zeiden ze nog: "Moi." "…Moi."' },
  // Akte 4
  { step: 'M17', kind: 'clue', title: 'De grove mosterd', text: 'De grove mosterd is gered: het mosterdschip liep vast voor brug elf. Jelle kocht de fanfare weg, maar Wubbo floot.' },
  { step: 'M17', kind: 'clue', title: 'Middernacht', text: 'Wubbo: een webbureau in Veendam werkt alles om middernacht bij. Ook de bruggen. Tammo: net als de museumcamera\'s.' },
  { step: 'M17', kind: 'clue', title: 'Open of dicht', text: 'Jelle belde vanuit zijn limo: zijn vastzittende schip is "een overtreding". Wubbo: "Open of dicht. Nooit allebei. Vandaag dicht."' },
  { step: 'M17', kind: 'hart', title: 'Geen woord', text: 'Na Wubbo keek Tammo naar Tessa, en Tessa naar het water. Niemand zei iets over de botsauto.' },
  { step: 'M18', kind: 'clue', title: 'Twaalf augustus', text: 'In het logboek van Wiebelwerk: op 12 augustus stond de update op elf minuten, aangevraagd door Us Mem Snacks. Zijdeur om 00:03, pas van bewaker twee, gasten D en D.' },
  { step: 'M18', kind: 'clue', title: 'Een leeg museum', text: 'Mevrouw Hoving\'s pas werd op 12 augustus geblokkeerd. Jelle had de bal vier dagen vóór onze kraak al. Tessa printte het logboek.' },
  { step: 'M18', kind: 'clue', title: 'Twee Stadjers in het zwart', text: 'In Grunn zeggen ze dat twee Stadjers in het zwart het museum leegroofden: Tammo en Tessa. Het logboek is hun bewijs.' },
  { step: 'M18', kind: 'hart', title: 'Het logboek', text: 'Tessa wilde het logboek van Wiebelwerk zien. Tammo vroeg waarom. Zij vond het leuk dat hij het wilde weten.' },
  { step: 'M18', kind: 'hart', title: 'Een jas in augustus', text: 'Mem belde Tessa: dinsdag naar Bourtange, Jelle komt ook. Tammo hoorde alleen over de jas. Tessa vertelde de rest niet.' },
  { step: 'M19', kind: 'clue', title: 'Eén van vijf', text: 'Eén jurylid stapte uit. Een ander tekende voor levenslang eierballen: dat is van Jelle. De bewaarder blijft in de trein, dus Berend zit voor.' },
  { step: 'M19', kind: 'clue', title: 'Vrijdag, drie uur', text: 'Berend: is de bewaarder er niet, dan zit het oudste jurylid voor (Berend, sinds 1982). Vrijdag om drie uur schrijft Jelle zich bij de notaris in als bewaarder en tekent hij de uitslag zelf.' },
  { step: 'M19', kind: 'hart', title: 'Een trein in een station', text: 'Tammo: "Ik heb een trein bestuurd." Tessa: "Je hebt hem in een station gezet."' },
  { step: 'M20', kind: 'clue', title: 'Een moeder', text: 'Mem nam de bal van Jelle af in de kruitkelder van Bourtange. "Er is geen overeenkomst, jonge. Er is een moeder." Jelle: "Dit is nog niet voorbij."' },
  { step: 'M20', kind: 'clue', title: 'Tige tank! – J.', text: 'Het briefje is van Jelle: hij schrijft overal een bedankje bij. De Escapade stond niet meer op de parkeerplaats. Er lag een klomp.' },
  { step: 'M20', kind: 'hart', title: 'Jij zegt nooit iets', text: 'Tessa sprak al weken met Mem en zei het niet. Tammo vroeg het niet. "Jij zegt nooit iets!" zeiden ze allebei.' },
  { step: 'M21', kind: 'clue', title: 'De auto of de bal', text: 'Op de wagon moest Tessa kiezen. Ze koos de auto. De beleggers sprongen met de bal naar een limo. Op de bijrijdersstoel: "Tige tank foar de bal. – J."' },
  { step: 'M21', kind: 'hart', title: 'Elke keuze faalt', text: 'Tammo kon de vrienden niet bij elkaar houden. Zijn zinnen kwamen er niet goed uit. Beiden zijn alleen, en beiden gaan naar Tinus\' schuur.' },
  { step: 'M22', kind: 'hart', title: 'Steeds verhuisd', text: 'Tessa woonde op een boerderij tot haar achtste en verhuisde daarna steeds, en elke zomer in Ljouwert naast Mem. "Ik ging niet weg. Ik ben gebleven."' },
  { step: 'M22', kind: 'clue', title: 'Het horloge van opa', text: 'Tammo verkocht het horloge van zijn opa, via Bert, voor het luik. Het liep vijf minuten voor.' },
  { step: 'M23', kind: 'clue', title: 'Jelles bruggenvergunningen', text: 'Jelle gaf elke brug op de route een evenementenvergunning om de colonne te splitsen. Wubbo opende ze met zijn eigen sleutel. De colonne is een evenement zonder vergunning: Jelle stuurt een rekening.' },
  { step: 'M24', kind: 'clue', title: 'Jelles eigen vergunning', text: 'Jelle stuurde een rekening en een vergunning in drievoud: evenement "Foar Mem", Oude Boteringestraat, vanaf half drie, gesloten voor verkeer. De derde kopie is voor ons. Op een evenement staat een kraam, een limo niet.' },
  { step: 'M25', kind: 'clue', title: 'De notaris', text: 'Morgen om drie uur laat Jelle zich bij de notaris in de Oude Boteringestraat inschrijven als nieuwe bewaarder, met de bal. Dan tekent hij zelf de uitslag. Wij houden hem tegen.' },
  // Deel 4
  { step: 'M27', kind: 'hart', title: 'Twee tieners op een fiets', text: 'Een foto uit 1953, in een la in Loppersum: Trijntje en Willemiens oma op een fiets, onderweg naar Stad voor de prijs. Tegen de wind in.' },
  { step: 'M28', kind: 'hart', title: 'Zonder praatje', text: 'Rikus draaide een nummer zonder praatje, voor iedereen die even ergens anders slaapt. Willemien: "Ik geloof het als ik het zie. Dat is niet boos. Dat is Gronings."' },
  { step: 'M29', kind: 'hart', title: 'Voor de grip', text: 'Op het erf in Loppersum vroeg Tessa of Tammo wilde dansen. Hij zei nee. Toen zei hij: "Voor de grip."' },
  { step: 'M30', kind: 'clue', title: 'Dan is winnen verkeerd', text: 'Berend won het proefbeleg van Bourtange, voor het eerst in veertig jaar. Hij zegt dat het verkeerd voelt. Volgend jaar verliest hij weer.' },
  { step: 'M30', kind: 'hart', title: 'Zes woorden', text: '"Thuis is waar de kar staat." Zes woorden, zei Tessa. Kon minder. Elke zomer rijdt de snackwagen één ronde.' },
  { step: 'M30', kind: 'clue', title: 'De wereld ligt open', text: 'Geesje heeft bieten die tot aan de weg staan, in Veendam zoeken ze een aanvalster, Sjabbe heeft een leeg pand en Willemien wil een tweede wagen. Jelle wacht tot de panden goedkoper worden.' },
  { step: 'M26', kind: 'hart', title: 'Vijf woorden', text: '"Ik wil bij jou blijven." "Dat bedoelde ik ook." Het duurde vijf jaar. Kon minder. Daarna kuste ze hem, voor heel de Grote Markt. Berend telde elf seconden.' },
  // het slot (F1 tot en met F6): wat het logboek erbij weet; de wagen heeft hier nog geen naam (die staat pas op het luik van M22)
  { step: 'F1', kind: 'hart', title: 'Een bierviltje met een luik', text: 'Tessa tekende twaalf dagen geleden een snackwagen op een bierviltje en zei dat het een tekening was. Langs een zandweg bij Zuidhorn stond het luik, aan een hek. Het komt in de Escapade.' },
  { step: 'F2', kind: 'hart', title: 'Smaken en rijden', text: 'Tessa kan de eierbal laten smaken, Tammo kan de wagen laten rijden. Alleen kunnen ze het allebei niet. Dus blijven ze bij elkaar.' },
  { step: 'F3', kind: 'clue', title: 'Soep met een eierbal', text: 'Oma Trijntje (Gronings) en Beppe (Fries) stonden in één keuken, met Mem, Durk en Douwe erbij. Het menu is soep met een eierbal: één kom, twee oma\'s. Grunn en Fryslân zijn verzoend.' },
  { step: 'F4', kind: 'clue', title: 'Achteraan de rij', text: 'Jelle stond zonder limo achteraan de rij en trok zijn eigen vergunning in. Mem zei: "Ik zei niet mogen. Ik zei: ik heb er genoeg." De mosterd van 1953 kost een euro vijftig.' },
  { step: 'F5', kind: 'hart', title: 'Een avond voor twee', text: 'Een lijstje in de zak van Tammo: eten, wandelen, en eentje doorgestreept. Zijn we nu een stel? Berend telde elf seconden. Dat is officieel.' },
  { step: 'F6', kind: 'clue', title: 'Eenenveertig tegen één', text: 'Op de kaart van de provincie staan eenenveertig rode stippen voor Us Mem Snacks en één blauwe voor de Vismarkt. Jelle belde: wedstrijd. Alles blijft open.' },
];
