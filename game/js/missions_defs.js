// De missiedefinities van de verhaalmissies, uit missions.js gehaald (#502): dit bestand is data,
// missions.js blijft de runner. De defs komen in dezelfde volgorde terug; de id's, stages, labels en
// teksten zijn ongewijzigd.
//
// Wat hier bewust niet staat: de def van M06 (museumkraak). Die blijft in missions.js, want twee tests
// zoeken de tekst van zijn stappen daar letterlijk op: scripts/missioncheckpoint_test.mjs zoekt
// `kind: 'getaway', checkpoint: true` en scripts/coopmissie_test.mjs de laser- en de kraakstap met
// `iedereen: true`. Dit bestand levert daarom de defs vóór en ná die ene def, en buildDefs in
// missions.js zet ze weer in de oude volgorde (index 0-9, M06, 11-17).
//
// De hulpjes walk(x, y) / drive(x, y) — de wegplekken van missions.js — komen als parameters binnen,
// net als bij missions_nieuw.js. roadSpot blijft in missions.js: de runner gebruikt hem ook
// (startplekken, doelen, snap), dus terugimporteren zou een cykel maken of een tweede waarheid.
import { KEI_ROUTE, KEI_CHECKPOINTS } from './keiroute.js';
import { findWalkPath } from './routing.js';

// Fixed spots in and around the binnenstad, picked so every leg is a real
// route on the road graph: car legs on the drivable network (the inner city
// is largely one-way and car-free, so straight-line distance lies), foot legs
// on the walk network, boat legs through the Diepenring's water polygon.
// A mission of the old story that the story no longer plays (#187). Its id keeps its place in MISSION_IDS
// (saves and medal records index by it), so the slot stays; nothing starts or lists it (ARC_BUILT).
const retiredDef = (id) => ({ type: 'stages', label: id, retired: true, reward: 0, start: { x: 0, y: 0, road: null }, stages: [] });

// De missies vóór M06 (index 0-9): twee gepensioneerde slots, de kei-race, de kroegentocht, de
// fatbike-straat, "Even pinnen" en "Kieken van boven".
export function buildDefsVoorMuseum({ map, walk, drive }) {
  // toast: the short drink at the door (missionstory.js playToast): glass, camera variant, one line or none
  const kroeg = (name, x, y, toast = null) => ({ ...walk(x, y), name, toast });
  // Route guidance between checkpoints along the streets, so the line to the
  // next marker never runs through a block; passed automatically (see waypointReached).
  const via = (spot) => ({ ...spot, via: true });
  const kei = (i) => ({ x: KEI_ROUTE[i][0], y: KEI_ROUTE[i][1], road: null });
  // H12: up the Oude Ebbingestraat from the Grote Markt to the Ebbingebrug, then
  // along the water (Spilsluizen, Lopendediep) to Oma Trijntje at the Noorderhaven
  const fatStart = walk(117.2, -13.68), fatBridge = walk(24.97, -259.81), fatEnd = walk(-289.25, -106.7);
  const laneLegs = [findWalkPath(map, fatStart.x, fatStart.y, fatBridge.x, fatBridge.y), findWalkPath(map, fatBridge.x, fatBridge.y, fatEnd.x, fatEnd.y)];
  const lanePts = laneLegs.every(Boolean) ? [...laneLegs[0].pts, ...laneLegs[1].pts.slice(1)] : [[fatStart.x, fatStart.y], [fatBridge.x, fatBridge.y], [fatEnd.x, fatEnd.y]];
  return [
    retiredDef('berend'),
    retiredDef('chaos'),
    {
      type: 'checkpoint',
      label: 'Wind tegen, beide kanten op',
      triggerRadius: 6,
      intro: ['Sjoerd, van de Kiezelweek, praat alleen met wie op het podium komt. Zijn neef werkt \'s nachts in het museum.', 'Doel: één rondje door de binnenstad, op de fiets, tegen vier eerstejaars. Alleen het podium telt, en niet stoppen voor gratis tasjes.'],
      outro: 'Podium! Sjoerd vertelt het: om twaalf uur gaan de camera\'s drie minuten uit. Nieuw doel: vannacht om twaalf uur de bal pakken.',
      race: 'kei',
      requires: 'bike',
      ride: 'bike',
      // the all-green crossing: Tessa comes the other way on her own bike
      moment: { at: 3, text: 'Alles groen. Tessa komt van de andere kant, op haar eigen fiets. Oogcontact. Jullie remmen allebei.' },
      // each on their own bike (D: she comes the other way at the all-green crossing), so she gets off his
      ownBike: true,
      say: 'Ik fiets zelf, op mijn eigen fiets. Met bonnetje. Zie je op het kruispunt.',
      // a bike does 25 km/h (Shift: ~33)
      timeLimit: 58,
      checkpointBonus: 33,
      reward: 550,
      start: kei(0),
      waypoints: [...KEI_CHECKPOINTS.slice(1).map(kei), kei(0)],
    },
    retiredDef('noorderzon'),
    retiredDef('ringweg'),
    {
      type: 'checkpoint',
      label: 'Nog eentje dan',
      intro: ['Kroegentocht! Vier kroegen, één avond, nul excuses. Grunn slaapt toch nooit.', 'Te voet, hè. De hele Poelestraat staat vol dronken studenten, en die lopen je zo omver.'],
      outro: 'Vier kroegen gehaald. Morgen wordt het een eierbalontbijt.',
      timeLimit: 110,
      checkpointBonus: 25,
      reward: 600,
      onFoot: true,
      drunk: 0.2, // per pub, drunk.js
      crowds: [walk(280.78, 120.54), walk(393.98, 116.67), walk(415.08, 180.75), walk(381.6, 217.54), walk(241.83, 129.23)],
      start: walk(251.57, 111.96),
      waypoints: [
        via(walk(306.24, 127.07)),
        kroeg('Café De Lallende Koe', 369.87, 113.64, { glass: 'beer', variant: 0, lines: [['A', 'Proost!']] }),
        via(walk(418.29, 120.1)),
        kroeg("Kroeg 't Scheve Toorntje", 413.32, 165.58, { glass: 'wine', variant: 1, lines: [['T', 'Op Grunn.']] }),
        via(walk(434.25, 176.51)), via(walk(397.09, 189.9)), via(walk(403.26, 205.71)), via(walk(369.49, 218.74)),
        kroeg('Nachtcafé De Uil van Half Vier', 356.19, 220.67, { glass: 'jenever', variant: 2, lines: [] }),
        via(walk(319.93, 240.6)), via(walk(264.01, 125.15)),
        kroeg('Café De Dikke Duif', 215.44, 133.59, { glass: 'beer', variant: 3, lines: [['T', 'Op de laatste.']] }),
      ],
    },
    {
      type: 'fatbike',
      label: 'Fatbikes tellen niet als fiets',
      intro: ['De Oude Ebbingestraat: smal, druk, en vol fatbikes die van twee kanten komen, over de stoep. Remmen hebben ze wel, gebruiken doen ze ze niet.', 'Loop de straat uit, over de Ebbingebrug en langs het water naar Oma Trijntje aan de Noorderhaven. Geschept worden doet pijn, maar zolang je blijft ademen telt het.'],
      outro: 'Overeind gebleven tussen de fatbikes. Oma Trijntje is trots.',
      timeLimit: 160,
      reward: 500,
      onFoot: true,
      lane: lanePts,
      // passed on the way: a toast, once
      notes: [{ ...fatBridge, text: 'De Ebbingebrug. Nu langs het water, naar de Noorderhaven. Daar rijden ze nog harder.' }],
      start: fatStart,
      dest: fatEnd,
    },
    retiredDef('rondvaart'),
    // --- Kop story missions (storyarc.js H2, H4, H6): 'stages' missions,
    // a list of small objectives run by the stage runner below
    {
      type: 'stages',
      label: 'Even pinnen',
      // a marker next to a parked car or a rack is hard to reach to 4 m (#243)
      triggerRadius: 6,
      intro: ['Twee reuzen trokken de pinautomaat uit de muur in de Herestraat, met Tessa\'s pas erin. Zonder pas geen contant geld voor het Loket.', 'Doel: breng de automaat naar Sjabbe van Pand & Poen. Eerst de pliesie kwijt, dan een nieuwe kleur.'],
      outro: 'Sjabbe gaf Tessa haar pas terug. De reuzen werken voor Jelle Terpstra, en hij vroeg naar het museum. Nieuw doel: naar Het Loket.',
      timeLimit: null,
      reward: 400,
      vehicle: 'car',
      start: drive(235.26, 401.14),
      stages: [
        { kind: 'board', label: 'Stap in de auto: de pinautomaat ligt achterin', say: 'Instappen: de automaat ligt achterin, met mijn pas erin. Hij piept een beetje.' },
        { kind: 'garage', stars: 2, target: { garage: true }, label: 'Naar Spuit & Klaar (automaat zit achterin)', say: 'Alarm! Twee sterren. Rij een garage in: Spuit & Klaar spuit hem om en de pliesie is je kwijt.' },
        { kind: 'goto', target: { shop: 'pand' }, mode: 'vehicle', radius: 14, stop: 1.2, label: 'Naar Pand & Poen: lever de automaat achterin af', say: 'Nieuwe kleur, nieuw leven. Door naar Pand & Poen, Sjabbe wacht achterom.' },
      ],
    },
    {
      type: 'stages',
      label: 'Kieken van boven',
      intro: ['Voor ze de bal pakken, willen Tessa en Tammo weten hoe het museum bewaakt wordt. Bert, vriend van Tammo\'s opa, leent je een duif.', 'Doel: vlieg naar het Groninger Museum en fotografeer de camera\'s, de bewakers en de stroomkast.'],
      outro: 'Drie camera\'s, twee bewakers en een zwarte trekker-limo. Bewaker twee is omgekocht. Nieuw doel: de Kiezelrace winnen, want Sjoerds neef kent de camera\'s.',
      timeLimit: 200,
      reward: 350,
      start: walk(-44.33, 896.96),
      startSpot: 'station',
      stages: [
        {
          kind: 'pigeon', spot: 'station', label: 'Spot het museum van boven', say: 'Eerst even wennen: W/S hoger en lager, muis sturen, Shift sneller. Zweef boven het plein, dan door naar het museum.',
          targets: [
            { at: [-46.86, 864.79], label: 'Vliegles: zweef boven het Stationsplein' },
            { landmark: 'Groninger Museum', off: [-30, -22], label: 'Camera bij de noordgevel' },
            { landmark: 'Groninger Museum', off: [34, -8], label: 'Camera op de gouden toren' },
            { landmark: 'Groninger Museum', off: [18, 34], label: 'Camera bij de brug' },
            { landmark: 'Groninger Museum', off: [-12, 52], label: 'Bewaker bij de ingang' },
            { landmark: 'Groninger Museum', off: [-46, 14], label: 'Bewaker bij de achteringang' },
          ],
        },
      ],
    },
  ];
}

// De missies ná M06 (index 11-17): Romp (H8, H10) en Staart (H14-H18).
export function buildDefsNaMuseum({ walk, drive }) {
  return [
    // --- Romp story missions (storyarc.js H8, H10) ---------------------------
    {
      type: 'stages',
      label: 'Al het vet van Grunn',
      intro: ['De tankwagen van Us Mem Vet staat bij de groothandel aan de Bornholmstraat, vol met al het frituurvet van Grunn.', 'Kaap hem: spring erin, of schiet of ram zijn banden stuk. Breng het vet naar de Oosterpoort.'],
      outro: 'Het vet is terug in Grunn. Jelle sprong over de gracht, de tweeling fietste erachteraan.',
      timeLimit: null,
      reward: 950,
      vehicle: 'car',
      start: drive(1157.56, 406.06),
      handBack: { how: 'park', say: 'De tankwagen blijft bij de Oosterpoort, voor de frituurpannen. Wij lopen verder.' },
      stages: [
        { kind: 'board', label: 'Stap in de auto', say: 'Instappen, Femke heeft hem voor ons klaargezet. De tankwagen staat bij de groothandel.' },
        {
          // parked at the groothandel until you come close (`parked` m) or hit it; then it flees.
          // Jumping in (`hijack`) takes it there and then, and the run goes on to the Oosterpoort.
          kind: 'chase', label: 'Kaap de tankwagen of schiet zijn banden plat', say: 'Naar de groothandel aan de Bornholmstraat. Daar laden Durk en Douwe de tankwagen vol.',
          vehicle: { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, maxSpeed: 24, accel: 4.5, brake: 14, turnRate: 1.5, color: '#e6c21a' },
          name: 'Tankwagen Us Mem Vet', from: [1905.18, 335.21], lead: 6, hits: 70, flee: [-2596.64, 646.07], cruise: 15.5, escape: 380, time: 180,
          parked: 60, parkedLabel: 'Naar de groothandel aan de Bornholmstraat', go: 'Daar gaat hij! Erin springen, of de banden plat. Schieten mag, rammen mag.',
          stopped: 'Pang! Banden plat. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike.',
          hijack: 'Gekaapt! Durk en Douwe rollen eruit en fietsen weg, allebei op één fatbike. Het vet is van ons.',
        },
        { kind: 'board', label: 'Kaap de tankwagen', say: 'Hij staat stil. Instappen, het vet is van ons. Van Grunn, bedoel ik.' },
        { kind: 'goto', target: { at: [621.49, 662.56], snap: 'drive', label: 'De Oosterpoort' }, mode: 'vehicle', stop: 1, label: 'Breng de tankwagen naar de Oosterpoort', say: 'Rustig rijden, met platte banden. Naar de Oosterpoort, daar wachten de frituurpannen.', sayHijacked: 'Naar de Oosterpoort, daar wachten de frituurpannen. En rustig, hè: het is een tankwagen.' },
        {
          kind: 'vault', label: 'Jelle',
          lines: [['jelle', 'Moai, Grinzers. Mijn vet. Mijn tankwagen. Mijn dag.'], ['A', 'Was, Jelle. Het vet blijft in Grunn.'],
            ['jelle', 'Dan koop ik nieuw vet. Jild genôch. En een polsstok.'], ['T', 'Een wat?'], ['durk', 'Baas… en wij?'], ['jelle', 'Jim fytse mar, jonges.']],
          landing: 'Moai! Oant sjen op Gronings Ontzet!',
        },
      ],
    },
    {
      type: 'stages',
      label: "Er hangt iets Fries aan d'Olle Grieze",
      intro: ['Jelle heeft een reuzenvlag aan de Martinitoren gehangen. Heel Grunn kijkt ernaar.', 'Fluit een duif bij de toren en pik de vijf touwen los. Pas op voor de Fryske meeuwen.'],
      outro: 'De vlag ligt op de keien. Heel Grunn klapte voor een duif.',
      timeLimit: 240,
      reward: 600,
      // moved onto the Martinitoren pigeon spot once that exists (resolveSpotStarts)
      start: walk(205.43, 49.3),
      startSpot: 'martini',
      stages: [
        {
          kind: 'scene', label: 'De vlag aan de toren', target: { landmark: 'Martinitoren', off: [0, 70], snap: 'walk' }, showFlag: true,
          cam: { r: 58, h: 30, lookZ: 57, crane: true, at: { landmark: 'Martinitoren', off: [0, 14] } },
          kicker: "d'Olle Grieze", title: 'Een Friese vlag',
          cast: [{ key: 'jelle', pose: 'self', at: [3.4, 1.4] }], knots: true,
          lines: [
            ['V', 'Dertig meter Fries doek, aan de trots van Grunn. Onderaan, in grote letters: foar mem.'],
            ['jelle', 'Moai, Grinzers! Kijk eens omhoog. Foar mem.'],
            ['A', 'Zie je die vijf gele knopen, Tammo? Die houden hem vast.', { clue: true, look: 'knots' }],
            ['T', 'Vijf knopen. Vijf keer fluiten.'],
          ],
        },
        {
          kind: 'pigeon', spot: 'martini', label: 'Pik de vijf touwen los', say: 'Vlieg naar de gele knopen van de vlag en blijf er even bij hangen: pik, pik, los.',
          spotTime: 0.6, gulls: [6, 10], gullText: 'Een Fryske meeuw duikt op je af!', verb: 'Pik! %s is los',
          flag: { landmark: 'Martinitoren', off: [0, 12], z0: 42, z1: 72, width: 14 },
          targets: [
            { landmark: 'Martinitoren', off: [-7, 12], z: 72, r: 6, label: 'Touw linksboven' },
            { landmark: 'Martinitoren', off: [7, 12], z: 72, r: 6, label: 'Touw rechtsboven' },
            { landmark: 'Martinitoren', off: [-7, 12], z: 57, r: 6, label: 'Touw links' },
            { landmark: 'Martinitoren', off: [7, 12], z: 57, r: 6, label: 'Touw rechts' },
            { landmark: 'Martinitoren', off: [0, 12], z: 43, r: 6, label: 'Touw onderaan' },
          ],
        },
        {
          kind: 'scene', label: 'De vlag valt', target: { landmark: 'Martinitoren', off: [0, 70], snap: 'walk' }, dropFlag: true, shotLines: 2,
          cam: { r: 34, h: 9, lookZ: 34, at: { landmark: 'Martinitoren', off: [0, 14] } },
          kicker: "d'Olle Grieze", big: 'Hij valt!',
          lines: [['A', 'Daar gaat hij. Kopje onder, Jelle.'], ['T', 'Dertig meter vlag. Losgepikt. Door mijn duif.'], ['A', 'Ja, ja. Jouw duif.']],
        },
      ],
    },
    // --- Staart story missions (storyarc.js H14-H18) ---------------------------
    {
      type: 'stages',
      label: 'Geleend van de Friezen',
      intro: ['Jelle\'s skûtsje gooit los. Met de Gouden Eierbal aan boord, zegt Klaas.', 'Vaar er met je huurboot achteraan, ga langszij en spring aan boord.'],
      outro: 'De Eierbal was van chocola. Jelle sprong weg, maar hij verklapte zijn plan: een ballon.',
      timeLimit: null,
      reward: 1300,
      requires: 'boat',
      // starts at your rented boat, wherever it is moored (updateMissions)
      startAt: 'rental',
      triggerRadius: 9,
      start: walk(748.62, 408.8),
      stages: [
        { kind: 'goto', target: { rental: true }, mode: 'any', radius: 9, label: 'Naar je huurboot', say: 'Naar de huurboot. Het skûtsje gooit zo los.' },
        { kind: 'goto', target: { route: true, label: 'De Diepenring' }, mode: 'boat', radius: 30, label: 'Vaar de Diepenring op', say: 'Varen! De Diepenring op, daar komt het skûtsje langs.' },
        {
          kind: 'boatchase', label: 'Ga langszij bij het skûtsje', name: 'Skûtsje van Jelle', lead: 55, board: 8, boardTime: 2.5, escape: 230, time: 200,
          say: 'Daar vaart hij! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan spring je aan boord.',
          near: 'Langszij! Hou hem vast, Tammo springt zo...', lost: 'het skûtsje is weg, met zeil en al',
        },
        {
          kind: 'scene', label: 'Aan boord', target: { skutsje: true }, deckCam: true,
          kicker: 'Het skûtsje', big: 'Chocola?!',
          cast: [{ key: 'durk', at: [2.3, 0.35], jump: 'Plons.', jumpSide: 1 }, { key: 'douwe', at: [3.2, -0.35], jump: 'Plons.', jumpSide: -1, jumpDelay: 0.4 }],
          props: [{ kind: 'ball', holder: 'A', from: 'Hier is hij' }],
          lines: [['durk', 'Douwe! Er staat iemand op ons dek!'], ['T', 'Moi. Ik kom voor de Eierbal.'], ['A', 'En ik kom voor hem. Opzij, jongens.'], ['douwe', 'Plons?'], ['durk', 'Plons.'],
            ['A', 'Hier is hij! In een kist. Met een kaartje: "Foar mem."', { clue: true }], ['T', 'Hij knispert. Hij is… zacht.'], ['A', 'Chocola. Met goudpapier eromheen.']],
        },
        { kind: 'goto', target: { shore: true, label: 'De kade' }, mode: 'foot', radius: 6, label: 'Spring aan wal, achter Jelle aan', say: 'Jelle springt van boord! Aan wal, achter hem aan.' },
        {
          kind: 'vault', label: 'Jelle', target: { shore: true },
          lines: [['jelle', 'Moai, Grinzers. Jullie hebben mijn sûkelade gevonden.'], ['T', 'Waar is de echte, Jelle?'], ['jelle', 'Die gaat de lucht in. Fan\'e jûn, met een ballon.', { clue: true }],
            ['A', 'Een ballon? Doe bist nait goed wies!'], ['jelle', 'Jelle is Fries. Friezen zijn altijd goed wijs.']],
          landing: 'Oant fan\'e jûn, Grinzers!',
        },
      ],
    },
    {
      type: 'stages',
      label: 'Het staat niet in het rooster',
      intro: ['Rotor Roelf leent zijn demoheli uit, op Eelde. Onderweg belt Dokter Dijkstra met een spoedje.', 'Eerst het UMCG, dan Jelles ballon: Tessa vliegt, Tammo hangt aan het touw.'],
      outro: 'Tammo haalde de Eierbal uit de mand en Tessa zette de heli netjes op de H. Jelle landde in een weiland, tussen de koeien.',
      timeLimit: null,
      reward: 1500,
      // one flight in Rotor Roelf's demo heli: off from his pad on Eelde (resolveSpotStarts)
      start: { x: 1767.87, y: 9950.93, road: null },
      startSpot: 'eelde',
      stages: [
        { kind: 'heli', variant: 'traumaduif', target: { helipad: 'eelde', label: 'Rotor Roelf, Eelde' }, label: 'Vlieg naar het UMCG, dan achter de ballon aan', say: 'Instappen bij Roelf. Spatie omhoog, W vooruit, A/D draaien. De rest staat in beeld.', lost: 'de ballon is ontsnapt, richting de Ommelanden' },
      ],
    },
    {
      type: 'stages',
      label: 'Iedereen heeft een rode auto gezien',
      intro: ['Tammo\'s Escapade is gejat. Op zijn plek staat een klomp. Jelmers chat zag een rode auto bij de Westerhaven.', 'Alleen: vraag rond, volg het piepje van de zender die Henk erin zette en haal hem terug voordat hij op de trein naar Ljouwert staat.'],
      outro: 'De Escapade is terug. En Tammo zei sorry.',
      timeLimit: null,
      reward: 1100,
      vehicle: 'car',
      fjordTrain: true,
      // Tessa alone: Tammo stays behind with the klomp
      solo: true,
      start: drive(-46.69, 874.85),
      stages: [
        {
          kind: 'goto', target: { at: [-156.33, 913.89], snap: 'walk', label: 'De Westerhaven' }, mode: 'any', radius: 14, label: 'Naar de Westerhaven: daar zag Jelmers chat een rode auto', say: 'Jelmers chat zag een rode auto bij de Westerhaven. Erheen, en vraag rond.',
          // Mem Terpstra calls Nachtstreek while Tessa looks
          radio: { caller: 'Gerda Terpstra, Ljouwert', lines: [
            ['mem', 'Rikus. Gerda Terpstra, Ljouwert. Myn soan hat dy reade auto op de trein nei Ljouwert set. Zeg tegen dat famke: perron 3.', { card: 'mem', clue: true }],
            ['rikus', 'Mevrouw Terpstra, waarom helpt u ons?'],
            ['mem', 'Omdat mijn zoon gekke dingen doet om iets voor mij te winnen wat ik niet meer hoef. En omdat ik in 1953 tweede werd, tegen Trijntje. Dat heeft hij nooit losgelaten. Ik wel.'],
          ] },
        },
        {
          kind: 'scene', label: 'Rondvragen', target: { at: [-156.33, 913.89], snap: 'walk' }, solo: true,
          kicker: 'De Westerhaven', cast: [{ key: 'hilly', pose: 'point', at: [2.1, 0] }],
          lines: [
            ['hilly', 'Rooie auto? Mit twij grode kerels der in? Dij binnen net richten stasjon reden.'],
            ['A', 'Twee grote kerels. Durk en Douwe.'],
            ['hilly', 'De ain zat te zingen. Fries, docht ik. Dat heur je hier nait vaak.'],
            ['A', 'De Escapade heeft nog die oude zender van Henk. Hij piept. Achter het station!', { clue: true }],
          ],
        },
        { kind: 'goto', target: { at: [3.55, 882.08], snap: 'walk', label: 'Achter het station' }, mode: 'any', radius: 16, label: 'Volg het piepje van de zender naar achter het station', say: 'Het piepje wordt sneller. Achter het station, bij de goederentrein. Perron 3.' },
        { kind: 'board', label: 'Stap in de auto', say: 'Jelmer heeft zijn auto laten staan. Instappen, ze rijden weg!' },
        {
          kind: 'chase', label: 'Stop de Escapade', say: 'Achter ze aan! Ram hem tot hij stilstaat, voordat hij op de trein staat. Niet op Tammo\'s auto schieten, hè!',
          vehicle: { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 6, brake: 22, turnRate: 3.2, color: '#a11f1f' },
          hero: true, name: 'De Escapade', lead: 45, hits: 60, health: 170, flee: [-2595.05, 746.7], cruise: 16.5, escape: 380, time: 50,
          toTrain: true, loaded: 'Ze rijden de Escapade zo de goederentrein op! Die gaat naar Ljouwert.', late: 'Te laat: de Escapade staat al op de goederentrein naar Ljouwert!',
          meter: 'Escapade', clock: 'trein', half: 'Hij slingert! Durk krijgt de zenuwen.',
          stopped: 'De Escapade staat stil. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike.',
          // Tessa in her own car (it stood still, or she yanked the door open): that stops it too
          hijack: 'Tessa trekt het portier open. Durk en Douwe springen eruit en fietsen weg, allebei op één fatbike. De Escapade is terug!',
          block: true,
          lost: 'de Escapade staat op de trein naar Ljouwert', gone: 'de Escapade is foetsie', burned: 'de Escapade staat in de fik. Tammo praat nooit meer tegen je',
        },
        {
          kind: 'train', label: 'Blokkeer de overweg aan de Peizerweg', say: 'Snel, naar de overweg aan de Peizerweg! Ga erbij staan, dan moet de machinist wel stoppen.',
          caught: 'De trein staat stil. Durk en Douwe rijden de Escapade van de wagon en fietsen weg, allebei op één fatbike.',
          taken: 'Tessa rijdt de Escapade zelf van de wagon af. Moai!',
          lost: 'de Escapade staat op de trein naar Ljouwert',
        },
        { kind: 'board', label: 'Stap in de Escapade', say: 'Hij is terug. Instappen, Tessa. Hij rijdt nog. Nauwelijks.' },
      ],
    },
    {
      type: 'stages',
      label: 'Het bod viel tegen',
      intro: ['Jelle daagt jullie uit voor de Noordelijke Snackprijs op Gronings Ontzet. Winnen jullie, dan houden jullie de Eierbal.', 'Doe de boodschappen voor de echte eierbal: mosterd, verse eieren van de volkstuin en stoetbrood. En niet hard remmen met die eieren.'],
      outro: 'Alles is binnen, de eieren zijn heel. En ze weten wat ze met de Eierbal doen als ze winnen.',
      timeLimit: null,
      reward: 600,
      start: walk(-26.58, 878.55),
      eggs: { from: 2, failAt: 25, fail: 'omelet op de achterbank. Zo win je geen snackprijs' },
      stages: [
        { kind: 'goto', target: { shop: 'super' }, mode: 'any', stop: 0.8, pay: 60, paid: 'Groninger mosterd, drie potten', label: 'Mosterd halen bij Nait Duur', say: 'Eerst mosterd. Echte Groninger, bij Nait Duur.' },
        { kind: 'goto', target: { at: [1036.85, 1530.47], snap: 'walk', label: 'Volkstuin' }, mode: 'any', stop: 0.8, pay: 90, paid: 'Twaalf eieren van de kippen van Bert', label: 'Verse eieren bij de volkstuin', say: 'Nu eieren. De kippen bij Berts duiventil leggen de beste van Grunn.' },
        { kind: 'goto', checkpoint: true, target: { at: [696.4, 1254.24], snap: 'walk', label: 'Bakker Deeg & Deugd' }, mode: 'any', stop: 0.8, pay: 150, paid: 'Stoetbrood van gisteren, voor de korst', label: 'Stoetbrood bij Bakker Deeg & Deugd', say: 'Eieren achterin. Rustig rijden, niet remmen als een pion. Door naar de bakker.' },
        { kind: 'goto', checkpoint: true, target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', stop: 0.8, label: 'Naar de kraam op de Grote Markt', say: 'Alles binnen. Naar de kraam op de Grote Markt, en heel voorzichtig.' },
      ],
    },
    {
      type: 'stages',
      label: 'Ontzet, net als in 1672',
      intro: ['Gronings Ontzet. De Noordelijke Snackprijs op de Grote Markt, Berend in de jury, en de Escapade met een luik: de eerste Fjord Frituur.', 'Hou de kraam heel tegen het vuurwerk, en laat de Eierbal niet uit het oog.'],
      outro: 'De Snackprijs gaat naar Grunn. De Gouden Eierbal blijft in Stad, met twee namen op het bordje.',
      timeLimit: null,
      reward: 4000,
      vehicle: 'car',
      start: drive(176.46, 116.21),
      stages: [
        {
          kind: 'hold', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, radius: 9, time: 30, mode: 'foot',
          label: 'Hou de kraam heel tegen het vuurwerk', say: 'Durk en Douwe steken per ongeluk hun vuurwerk aan! Blijf bij de kraam en stap opzij als er een pijl aankomt.',
          ticks: ['De eerste eierballen gaan het vet in.', 'Berend ruikt al iets. Hij knikt bijna.', 'Nog even! De jury pakt de vorken.'],
          fireworks: { every: [1.0, 1.8], hit: 1.9, cost: 2, hitText: 'Pang! Vol raak. Even liggen, dan weer naar de kraam.' },
        },
        {
          kind: 'scene', label: 'Het naspel', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' },
          kicker: 'Gronings Ontzet', big: 'Hij grist de Eierbal!',
          cast: [{ key: 'jelle', pose: 'hold', at: [2.2, 0] }, { key: 'durk', pose: 'arms', at: [3.5, 1.5] }, { key: 'douwe', pose: 'arms', at: [3.5, -1.5] }, { key: 'berend', pose: 'hips', at: [1.3, 2.7] }],
          props: [{ kind: 'ball', holder: 'jelle' }],
          lines: [['jelle', 'Mem moet hem zien. Vóór de uitslag. Ik bin sa werom!'], ['A', 'Hé! Die staat op de jurytafel!'], ['berend', 'Dit hoort niet bij het naspel.'], ['T', 'Tessa, de auto! Ik hou de eierballen warm.']],
        },
        { kind: 'board', label: 'Stap in de auto', say: 'Henk heeft de auto klaargezet. Instappen, achter die trekker aan!' },
        {
          // D-definitief H18: from the corner of the Grote Markt up the Oude Boteringestraat,
          // over the Boteringebrug, along the Spilsluizen and back down the Oude Ebbingestraat
          // into the fireworks; the torenwachter reports every street, then Tammo whistles
          kind: 'chase', label: 'Haal de trekker-limo van Jelle in: blijf erbij, dan fluit Tammo de duiven', say: 'Achter die trekker aan! Blijf erbij, ram hem als het kan. Niet schieten, er is kermis.',
          vehicle: { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 40, accel: 7, brake: 14, turnRate: 2.1, color: '#1b1c1f' },
          name: 'Trekker-limo van Jelle', from: [19.79, 97.64], lead: 6, hits: 90, flee: [-1919.2, -874.66], cruise: 14, escape: 500, time: 300,
          meter: 'trekker', block: true,
          route: [
            { at: [-61.63, -38.94], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Oude Boteringestraat. Ik meld alleen.']] } },
            { at: [-144.22, -186.58], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Boteringebrug. Over het water, de bocht te ruim. Ik meld alleen.']] } },
            { at: [22.9, -263.8], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Spilsluizen. Hij rijdt een rondje om de toren. Ik meld alleen.']] } },
            { at: [66.83, -151.77], radio: { caller: 'De torenwachter, d\'Olle Grieze', lines: [['torenwachter', 'Trekker, Oude Ebbingestraat. Terug naar de markt, recht onder het vuurwerk door.']] } },
            { at: [110.91, -30.69] },
          ],
          // a third on the meter, 25 s close behind it, boxed in, or back at the market with you near: the pigeons
          swarm: {
            stall: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, near: 260, close: 45, closeFor: 25,
            lines: [
              ['T', 'Kom op, jongens. Eén keer luisteren.'],
              ['torenwachter', 'Duiven. Boven het vuurwerk. Allemaal tegelijk. Ik meld alleen.'],
              ['jelle', 'Wat is dit?! Ik sjoch neat!'],
              ['A', 'Duiven luisteren naar niemand. Behalve naar hem.'],
            ],
          },
          half: 'Tammo fluit. Een zwerm duiven valt over het vuurwerk heen op de voorruit van de trekker!',
          stopped: 'De trekker-limo staat stil, vol duiven. Jelle stapt uit, met de Eierbal in zijn armen.',
          lost: 'Jelle is weg met de Eierbal', gone: 'Jelle is foetsie, met de Eierbal', burned: 'de trekker staat in de fik. De Eierbal smelt bijna',
        },
        {
          kind: 'scene', label: 'Voor mem', kicker: 'Gronings Ontzet', solo: true,
          cast: [{ key: 'jelle', pose: 'hold', at: [2.0, 0.3] }],
          props: [{ kind: 'ball', holder: 'jelle' }],
          lines: [['jelle', 'Ik woe him allinnich oan mem jaan. Foar de útslach.'], ['A', 'Ze staat op de Grote Markt, Jelle. Bij de jury. Geef maar.'], ['jelle', '…Tige tank.']],
        },
        {
          kind: 'goto', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', radius: 12, limit: 240, calm: true,
          label: 'Terug naar de kraam, voordat de eierballen koud zijn', late: 'de eierballen zijn koud. Berend proeft niks wat koud is',
          say: 'Terug naar de kraam, met de bal! Voordat de eierballen koud zijn.',
        },
      ],
    },
  ];
}
