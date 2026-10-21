// Act 5 "Ontzet" of the new story arc (docs/verhaal/nieuw/05-akte5.md, 09-script-akte5.md; #163): the new defs
// 'luik' (M22) and 'colonne' (M23), and how the arc restages the defs it shares with the old one:
// 'vlag' (M24), 'bod' (M25) and 'ontzet' (M26, the finale). Kept out of missions_nieuw.js so the four acts
// built side by side do not share a block. Stage fields beyond missions.js's own:
//   bake    { recipe: 'practice'|'contest', rounds }   the baking round (bakeround.js)
//   convoy  { first, limoAfter }                       the column of Oma's friends follows you (convoy.js)
//   mud                                                 a hold or goto where the car sinks in the mud (speed drops)
//   keep    chase: the chased car stays where it is (the finale's limo is nobody's mission car)
//   swarm.script { ids, from, to }                      the pigeons' lines from script.json
// Places: Zuidhorn and Aduard are the real villages (game coordinates from their lat/lon, AANNAME ±60 m,
// snapped to the road at run time); Tinus' schuur is a spot on the edge of Zuidhorn, not a real farm.

import { wgsToWorld } from './rdnew.js';
const ZUIDHORN = [-10732.8, -3017.02];
const SCHUUR = [ZUIDHORN[0] + 250, ZUIDHORN[1] - 150];
const MODDER = [ZUIDHORN[0] + 430, ZUIDHORN[1] - 240];
// the drive test: a slalom through the mud, left of the straight line and then right of it
const SLALOM = [[SCHUUR[0] + 79, SCHUUR[1] - 0], [SCHUUR[0] + 110, SCHUUR[1] - 94]];
const HOOGKERK = wgsToWorld(53.2106, 6.4930);   // the bridge on the way to the city: Wubbo's moment
const ADUARD = wgsToWorld(53.256, 6.460);   // the village node (it was an estimate 1.6 km off)
const MARKT = { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' };
// Oma Trijntje's kitchen at the Noorderhaven (the end of the old H12 lane)
const KEUKEN = [-289.25, -106.7];
// the notary in the Oude Boteringestraat (nummer negen): the first point of the old chase route
const NOTARIS = [-61.63, -38.94];

export function buildAkte5Defs({ map, walk, drive }) {
  const schuur = walk(SCHUUR[0], SCHUUR[1]);
  return [
    {
      // M22 Een luik erin: Henk builds the hatch, the mud proves the axle, Tinus' tractor pulls the car out, the evening in the barn
      mid: 'luik',
      type: 'stages',
      label: 'Een luik erin',
      intro: ['Tinus\' schuur bij Zuidhorn. Henk heeft een luik en een koekje. Eén.', 'Bouw een luik in de Escapade, bewijs in de modder dat de as het houdt en laat Tinus hem eruit trekken.'],
      outro: 'De Escapade is de Fjord Frituur. Nog geen bal. Mem en Oma hebben de vrienden gebeld: samen naar de Grote Markt.',
      timeLimit: null,
      reward: 300,
      costRow: ['Gevolg', 'Het luik is betaald met het horloge van Tammo\'s opa'],
      vehicle: 'car',
      heroCar: true,
      start: schuur,
      vehicleFail: { gone: 'de Escapade is foetsie, en Henk had net het luik erin', wrecked: 'de Escapade is afgeschreven. Dit is geen karaktertrek meer', left: 'je liet de Escapade in de modder staan. Tinus trekt alleen wat vastzit' },
      say: 'Blijf bij de wagen: Henk bouwt het luik in.',
      stages: [
        {
          kind: 'hold', target: { at: SCHUUR, snap: 'walk', label: 'Tinus\' schuur' }, radius: 16, time: 6, mode: 'any',
          label: 'Laat Henk het luik inbouwen: blijf bij de wagen', say: 'Henk zaagt een gat in de zijkant. Blijf bij de wagen tot het luik erin zit.',
          ticks: ['Henk zaagt een gat in de zijkant.', 'Het luik past. Het is blauw.'],
        },
        {
          kind: 'scene', label: 'Het luik zit erin', target: { at: SCHUUR, snap: 'walk' }, kicker: 'Tinus\' schuur', script: { ids: ['M22.2'] },
          cast: [{ key: 'henk', pose: 'hips', at: [2.8, 1.0] }, { key: 'tinus', pose: 'arms', at: [3.4, -1.6] }],
        },
        { kind: 'board', label: 'Stap in de Escapade', say: 'Instappen. Tinus wijst naar het weiland: de modder wacht.' },
        {
          kind: 'goto', target: { at: SLALOM[0], snap: 'drive', label: 'Eerste bocht' }, mode: 'vehicle', radius: 20, stop: 0, mud: true,
          label: 'Rijproef: slalom door de modder, eerst links', say: 'Gas, sturen, niet vastlopen. Henk wil zien dat de as het houdt.',
        },
        {
          kind: 'goto', target: { at: SLALOM[1], snap: 'drive', label: 'Tweede bocht' }, mode: 'vehicle', radius: 20, stop: 0, mud: true,
          label: 'Rijproef: nu rechts, en niet vastlopen', say: 'Houd de snelheid erin. In de modder zakt hij weg als je stilstaat.',
        },
        {
          kind: 'goto', target: { at: MODDER, snap: 'drive', label: 'De modder' }, mode: 'vehicle', radius: 24, stop: 0,
          label: 'Rij de Escapade de modder in, tot hij vastzit: de as moet het houden', say: 'Rij hem de modder in. Als de as het houdt, houdt hij het ook op de Grote Markt.',
          talk: { ids: ['M22.3'], from: 0, to: 4, delay: 1.5 }, mud: true,
        },
        {
          // stuck in the mud: not a wait but a rocking rhythm; Tinus pulls on the beat (the tags only colour the mission's own report)
          kind: 'timing', kicker: 'Los uit de modder', help: 'wip op het ritme', goodAt: 2, tagGood: 'modder-los', tagLow: 'modder-traag',
          label: 'Zit vast: wip de wagen los terwijl Tinus trekt', say: 'Vast. Tinus haakt de trekker aan: wip mee op het ritme, druk als de streep in het groen is.',
          talk: { ids: ['M22.3'], from: 4, delay: 1.5 },
          rounds: [
            { text: 'Gas, terug, gas: de trekker trekt mee.', speed: 0.7, zone: [0.34, 0.66], ok: 'De wielen pakken even.', bad: 'De wielen slippen door.' },
            { text: 'Nog een keer, harder.', speed: 0.85, zone: [0.38, 0.62], ok: 'De Escapade komt een stuk los.', bad: 'Hij zakt weer weg.' },
            { text: 'De laatste ruk.', speed: 1.0, zone: [0.4, 0.6], ok: 'Los! De as houdt het.', bad: 'Net niet. Tinus trekt hem er toch uit.' },
          ],
        },
        {
          kind: 'scene', label: 'De schuur, \'s avonds', target: { at: SCHUUR, snap: 'walk' }, kicker: 'Tinus\' schuur', title: 'Een thuis met wielen',
          script: { ids: ['M22.4'] }, cast: [],
        },
      ],
    },
    {
      // M23 De colonne: Oma's friends follow you from Tinus' barn to the Grote Markt; Jelle's limo and his bridge permits try to split them
      mid: 'colonne',
      type: 'stages',
      label: 'De colonne',
      intro: ['Alle vrienden van Oma staan klaar bij Tinus\' schuur: een scooter, een bus, een trekker, een bakkie en een sloep op een aanhanger.', 'Rijd voorop naar de Grote Markt en houd de colonne bij elkaar. Jelle probeert ons te splitsen.'],
      outro: 'De colonne staat op de Grote Markt. Allemaal.',
      timeLimit: null,
      reward: 500,
      costRow: ['Gevolg', 'Jelle stuurt een rekening voor een evenement zonder vergunning'],
      vehicle: 'car',
      heroCar: true,
      start: schuur,
      vehicleFail: { gone: 'de Fjord Frituur is foetsie, en de colonne wacht op niemand', wrecked: 'de Fjord Frituur is afgeschreven. De colonne rijdt zonder leider', left: 'je liet de Fjord Frituur achter. De colonne volgt een lege wagen' },
      say: 'Rij voorop. De colonne volgt zolang je hem niet kwijtraakt.',
      // the ally you ride next to decides how Jelle's limo gets held up here and which street closes in M26 (remembered: 'keuze:bond-...')
      remember: ['bond-bus', 'bond-trekker', 'bond-scooter'],
      tagAdjust: { 'bond-trekker': 100 },
      tagRows: { 'bond-bus': ['Bondgenoot', 'Wubbo\'s bus: de limo komt een minuut later'], 'bond-trekker': ['Bondgenoot', 'Tinus\' trekker: de zwaarste straatafsluiting van het Ontzet'], 'bond-scooter': ['Bondgenoot', 'Geesjes scooter: de limo mist de steegjes'] },
      stages: [
        {
          kind: 'choice', kicker: 'De colonne', label: 'Kies wie naast de Fjord Frituur rijdt', say: 'Eén vriend rijdt vlak naast jullie en houdt Jelle bezig. Wie? 1 tot en met 3.',
          rounds: [
            { who: 'Tessa', text: 'Alle vrienden rijden mee, maar één rijdt naast ons. Wie neemt Jelles limo voor zijn rekening?', options: [
              { label: 'Wubbo, met de bus.', tag: 'bond-bus', reply: 'Wubbo: "Een bus is breed. Ik zet hem dwars als het moet."' },
              { label: 'Tinus, met de trekker.', tag: 'bond-trekker', reply: 'Tinus: "Ik trek hem weg." Hij zegt altijd hetzelfde, maar het klopt.' },
              { label: 'Geesje, met de scooter.', tag: 'bond-scooter', reply: 'Geesje: "Ik ken elk steegje. Hij is sneller dan hij lijkt, hè, mijn scooter."' },
            ] },
          ],
        },
        {
          kind: 'scene', label: 'Wie rijdt naast jullie', target: schuur, kicker: 'Tinus\' schuur', script: { ids: ['M23.6'] },
          scriptIf: [{ tag: 'bond-bus', ids: ['M23.6'] }, { tag: 'bond-trekker', ids: ['M23.7'] }, { tag: 'bond-scooter', ids: ['M23.8'] }],
          cast: [{ key: 'wubbo', pose: 'hips', at: [3.0, 1.4] }, { key: 'tinus', pose: 'hips', at: [3.2, -0.2] }, { key: 'geesje', pose: 'arms', at: [3.0, -1.6] }],
        },
        { kind: 'board', label: 'Stap in de Fjord Frituur', say: 'Instappen. Tessa zei: wij voorop.' },
        {
          kind: 'convoy', first: true, carHint: 'Stap weer in de Fjord Frituur: de colonne volgt de wagen.', limoAfter: 30, limoAfterIf: { 'bond-bus': 60, 'bond-scooter': 45 }, target: { at: ADUARD, snap: 'drive', label: 'Aduard' }, radius: 45, mode: 'vehicle',
          label: 'Rij voorop naar Aduard en houd de colonne bij elkaar', say: 'Rij voorop naar Aduard. Wie te ver achterblijft, valt weg: wacht op ze.',
          talk: { ids: ['M23.2'], delay: 6 }, lost: 'de colonne is uiteengevallen',
        },
        {
          kind: 'scene', label: 'Durk en Douwe lopen over', target: { at: ADUARD, snap: 'walk' }, kicker: 'Aduard', script: { ids: ['M23.3'] },
          cast: [{ key: 'durk', pose: 'arms', at: [3.4, 1.4] }, { key: 'douwe', pose: 'arms', at: [3.4, -1.4] }],
        },
        {
          kind: 'convoy', carHint: 'Stap weer in de Fjord Frituur: de colonne volgt de wagen.', target: { at: HOOGKERK, snap: 'drive', label: 'Hoogkerk' }, radius: 45, mode: 'vehicle',
          label: 'Rij met de colonne naar Hoogkerk: Wubbo draait de brug open', say: 'Wubbo staat bij de brug en draait hem voor de colonne open. Niet te hard, de sloep moet er ook onderdoor.', lost: 'de colonne is uiteengevallen',
        },
        {
          kind: 'convoy', carHint: 'Stap weer in de Fjord Frituur: de colonne volgt de wagen.', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'drive' }, radius: 30, mode: 'vehicle',
          label: 'Rij met de colonne de Grote Markt op', say: 'Nog vijf kilometer. De hele colonne, de Grote Markt op.', lost: 'de colonne is uiteengevallen',
        },
      ],
    },
  ];
}

// How act 5 stages the defs it shares with the old arc (called at the end of applyNieuw).
const JURY = [{ key: 'berend', pose: 'hips', at: [3.0, 1.5] }, { key: 'mem', pose: 'hips', at: [2.2, -1.4] }, { key: 'trijntje', pose: 'arms', at: [1.6, -2.6] }, { key: 'jelle', pose: 'hips', at: [3.6, -0.6] }, { key: 'jurylid', pose: 'arms', at: [4.2, 1.0] }];

export function applyAkte5(list) {
  const by = (label) => list.find((d) => d.label === label);
  const walkAt = (at) => ({ at, snap: 'walk' });

  const vlag = by('Er hangt iets Fries aan d\'Olle Grieze');
  if (vlag) {
    // the intro scene is the story intro (M24.1): the flag is shown when the pigeon stage starts; the fall is the last scene (M24.3)
    const pig = vlag.stages.find((q) => q.kind === 'pigeon');
    const drop = vlag.stages.find((q) => q.dropFlag);
    pig.label = 'Haal Jelles vlag van d\'Olle Grieze: pik de vijf touwen door';
    pig.talk = { ids: ['M24.2'], delay: 14 };
    drop.script = { ids: ['M24.3'] };
    drop.lines = [];
    // the pigeon's twist: the last rope is pulled on the wind (three gusts), so the flag lands beside the stall and not on it
    const wind = {
      kind: 'timing', kicker: 'De laatste touwen', help: 'pik op de windvlaag', goodAt: 2, tagGood: 'vlag-top', tagLow: 'vlag-raak',
      label: 'Pik de laatste touwen door op de windvlaag', say: 'De vlag hangt aan drie touwen. Pik door als de wind meewerkt: de streep in het groen.',
      rounds: [
        { text: 'Een windvlaag uit het westen.', speed: 0.8, zone: [0.36, 0.64], ok: 'Het touw geeft mee.', bad: 'De duif slipt langs het touw.' },
        { text: 'De vlag draait naar de kraam toe.', speed: 1.0, zone: [0.4, 0.6], ok: 'De vlag draait weg van de kraam.', bad: 'De vlag zwiept richting de kraam.' },
        { text: 'Het laatste touw: de hele Grote Markt kijkt.', speed: 1.15, zone: [0.43, 0.57], ok: 'Doorgepikt, precies op tijd.', bad: 'Net te laat: het touw trilt nog.' },
      ],
    };
    vlag.stages = [pig, wind, drop];
    vlag.tagAdjust = { 'vlag-top': 100 };
    vlag.tagRows = { 'vlag-top': ['Wind', 'De vlag viel naast de kraam'], 'vlag-raak': ['Wind', 'De vlag raakte de rand van de kraam: Jelle zag het'] };
    vlag.timeLimit = null;
    vlag.intro = ['Er hangt een reuzenvlag aan de Martinitoren, precies boven de plek van de Fjord Frituur.', 'Fluit een duif bij de toren en pik de vijf touwen los.'];
    vlag.outro = 'De vlag ligt op de keien. Heel Grunn klapte voor een duif.';
    vlag.costRow = ['Gevolg', 'Tammo is Stads held. Jelle zag het vanuit de menigte'];
  }

  const bod = by('Het bod viel tegen');
  if (bod) {
    const keuken = { at: KEUKEN, snap: 'walk', label: 'Oma\'s keuken' };
    delete bod.eggs;
    bod.start = { ...bod.start, x: KEUKEN[0], y: KEUKEN[1], road: null };
    bod.timeLimit = null;
    bod.intro = ['Oma\'s keuken aan de Noorderhaven. Morgen is het Ontzet.', 'Bak een oefenronde eierballen met alle vijf ingrediënten, en wijs Jelles bod af.'];
    bod.outro = 'Jelles bod is afgewezen. Morgen bakken we op het Ontzet.';
    bod.costRow = ['Tip van Sjabbe', 'Morgen om drie uur schrijft Jelle zich in bij de notaris'];
    bod.say = 'Bak in Oma\'s keuken: ei, zout, grof meel, vet en mosterd.';
    bod.stages = [
      {
        kind: 'bake', recipe: 'practice', rounds: 2, farHint: 'Terug naar het fornuis. De eierballen wachten niet.', target: keuken, radius: 40, mode: 'foot',
        label: 'Bak een oefenronde eierballen met alle vijf ingrediënten', say: 'Oma\'s volgorde: eerst het ei, dan het zout, dan het grove meel, het vet en de mosterd. Toetsen 1 tot en met 5.',
        talk: { ids: ['M25.2'], delay: 4 },
      },
      {
        kind: 'scene', label: 'Het bod', target: keuken, kicker: 'Oma\'s keuken', script: { ids: ['M25.3'] },
        cast: [{ key: 'jelle', pose: 'hips', at: [3.0, 0.8] }, { key: 'trijntje', pose: 'arms', at: [-2.2, 1.5] }, { key: 'mem', pose: 'hips', at: [-2.4, -1.2] }],
      },
    ];
  }

  const ontzet = by('Ontzet, net als in 1672');
  if (ontzet) {
    const stalls = { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' };
    const fire = ontzet.stages.find((q) => q.kind === 'hold');
    const chase = ontzet.stages.find((q) => q.kind === 'chase');
    ontzet.intro = ['Gronings Ontzet, vrijdag 28 augustus. De beste eierbal wint de standplaats; de Gouden Eierbal gaat terug naar het museum.', 'Bak de Groningse eierbal, houd de kraam heel, stop Jelles laatste plakje bij de notaris en laat de jury kiezen.'];
    ontzet.outro = 'De jury koos de Groningse eierbal: vier tegen één. De Fjord Frituur krijgt de standplaats.';
    ontzet.costRow = ['Gewonnen', 'De standplaats op de Vismarkt, en Gerda Terpstra op het bordje'];
    ontzet.heroCar = true;
    // the baking score decides how the jury votes (M26.10-12) and pays a bonus on the 4000
    ontzet.bakeBonus = { top: 600, goed: 200, mager: 0 };
    ontzet.tagAdjust = { 'duiven-top': 200, 'straten-dicht': 150 };
    ontzet.tagRows = { 'duiven-top': ['Duiven', 'De wolk stond precies voor de voorruit'], 'duiven-los': ['Duiven', 'De duiven gingen een eigen weg'], 'straten-dicht': ['Colonne', 'De bus, de trekker en de scooter sloten de straten af'] };
    ontzet.bakeRows = { top: ['Jury', 'Vijf van de vijf: foutloos gebakken'], goed: ['Jury', 'Vier van de vijf'], mager: ['Jury', 'Drie van de vijf: rommelig gebakken'] };
    ontzet.start = { ...ontzet.start };
    fire.label = 'Houd de kraam heel tegen het vuurwerk van Durk en Douwe';
    fire.talk = { ids: ['M26.3'], from: 5, delay: 2 };
    chase.label = 'Zet de Fjord Frituur dwars voor Jelles limo in de Oude Boteringestraat';
    chase.say = 'Kwart voor drie. De limo rijdt naar de notaris: zet de wagen dwars in de straat, voor drie uur.';
    chase.vehicle = { name: 'limo', len: 5.6, wid: 2.0, maxSpeed: 28, accel: 6, brake: 14, turnRate: 2.1, color: '#1b1c1f' };
    chase.name = 'Jelles limo';
    chase.cruise = 9;
    chase.lead = 30;
    chase.time = 70;
    chase.timeIf = { 'bond-bus': 82, 'bond-trekker': 90, 'bond-scooter': 78 };
    chase.keep = true;
    chase.route = [{ at: NOTARIS, r: 14 }];
    chase.flee = NOTARIS;
    chase.lost = 'Jelle is bij de notaris. Het is drie uur: plakje acht is van hem';
    chase.gone = 'de limo is foetsie';
    chase.burned = 'de limo staat in de fik. De koffer met de bal is zwart';
    chase.stopped = 'De limo staat vast, neus tegen het luik.';
    chase.swarm = { stall: stalls, near: 260, close: 45, closeFor: 20, script: { ids: ['M26.4'], from: 3, to: 7 } };
    chase.talk = { ids: ['M26.4'], from: 0, to: 3, delay: 1 };
    ontzet.stages = [
      {
        kind: 'bake', recipe: 'contest', rounds: 3, farHint: 'Terug naar de kraam. De eierballen wachten niet.', target: stalls, radius: 40, mode: 'foot',
        label: 'Bak de Groningse eierbal: drie rondes volgens Oma\'s recept', say: 'Oma\'s volgorde: ei, zout, grof meel, vet. Toetsen 1 tot en met 4. Pas op voor de fijne bloem: die is Fries.',
        talk: { ids: ['M26.3'], from: 0, to: 5, delay: 3 },
      },
      fire,
      { kind: 'board', label: 'Stap in de Fjord Frituur', say: 'Kwart voor drie. Instappen: de limo rijdt naar de notaris.' },
      {
        kind: 'timing', kicker: 'Berts duiven', help: 'fluit op de maat', goodAt: 2, tagGood: 'duiven-top', tagLow: 'duiven-los',
        label: 'Fluit Berts duiven op, voor de limo uit', say: 'Tammo fluit, Bert stuurt de duiven. Fluit op de maat: de streep in het groen.',
        rounds: [
          { text: 'Eerste fluit: de duiven stijgen op van het dak.', speed: 0.9, zone: [0.38, 0.62], ok: 'De duiven komen als één wolk.', bad: 'Twee duiven nemen een omweg.' },
          { text: 'Tweede fluit: richting de Oude Boteringestraat.', speed: 1.1, zone: [0.41, 0.59], ok: 'De wolk draait de straat in.', bad: 'De duiven gaan een kerktoren in.' },
          { text: 'Derde fluit: voor de voorruit van de limo.', speed: 1.25, zone: [0.43, 0.57], ok: 'Een muur van veren. De limo remt.', bad: 'De duiven zijn te vroeg: de limo rijdt erdoor.' },
        ],
      },
      {
        // the column of M23 comes back: the bus and the tractor close the streets, the scooter takes the alleys; the ally you chose sits the surest
        kind: 'timing', kicker: 'De colonne sluit de straten', help: 'sluit op de maat', goodAt: 2, tagGood: 'straten-dicht', tagLow: 'straten-open',
        label: 'Laat de colonne de straten afsluiten voor Jelles limo', say: 'Wubbo, Tinus en Geesje sluiten de straten. Druk als de streep in het groen is.',
        rounds: [
          { text: 'Wubbo zet de bus dwars in de Herestraat.', speed: 0.9, zone: [0.4, 0.6], zoneIf: 'bond-bus', ok: 'De bus staat dwars, deuren open, Wubbo zwaait.', okIf: 'De bus staat dwars. Wubbo weet precies hoe breed hij is.', bad: 'De bus staat half. De limo glipt langs de zijspiegel.' },
          { text: 'Tinus trekt zijn trekker voor de Gedempte Zuiderdiep.', speed: 1.05, zone: [0.42, 0.58], zoneIf: 'bond-trekker', ok: 'De trekker staat. Er past geen limo meer langs.', okIf: 'De trekker staat als een muur. Tinus: "Ik trek hem weg."', bad: 'De trekker slaat af in plaats van aan. De limo wrijft langs de band.' },
          { text: 'Geesje stuurt de scooter door de steeg naast de Oude Boteringestraat.', speed: 1.2, zone: [0.44, 0.56], zoneIf: 'bond-scooter', ok: 'De scooter staat in de steeg. Jelle moet de lange weg.', okIf: 'De scooter staat in de steeg. Geesje heeft alle steegjes geteld.', bad: 'De scooter valt om in de steeg. Geesje: "Hij is sneller dan hij lijkt."' },
        ],
      },
      {
        // the ally of M23 speaks over the radio while he closes his street
        kind: 'scene', label: 'De straten zijn dicht', target: walkAt(NOTARIS), kicker: 'Oude Boteringestraat', script: { ids: ['M26.14'] },
        scriptIf: [{ tag: 'bond-trekker', ids: ['M26.15'] }, { tag: 'bond-scooter', ids: ['M26.16'] }, { tag: 'bond-bus', ids: ['M26.14'] }],
        cast: [{ key: 'wubbo', pose: 'hips', at: [3.0, 1.2] }, { key: 'tinus', pose: 'hips', at: [3.2, -0.2] }, { key: 'geesje', pose: 'arms', at: [3.0, -1.6] }],
      },
      chase,
      {
        kind: 'scene', label: 'Jelle in het water', target: walkAt(NOTARIS), kicker: 'Oude Boteringestraat', script: { ids: ['M26.4'], from: 7, to: 14 },
        cast: [{ key: 'jelle', pose: 'hips', at: [3.0, 1.2] }, { key: 'durk', pose: 'arms', at: [-3.2, 1.4] }, { key: 'douwe', pose: 'arms', at: [-3.2, -1.4] }],
      },
      {
        kind: 'scene', label: 'Mem', target: walkAt(NOTARIS), kicker: 'Oude Boteringestraat', script: { ids: ['M26.5'] },
        cast: [{ key: 'mem', pose: 'hips', at: [2.6, 0.4] }, { key: 'jelle', pose: 'hips', at: [3.4, -1.0] }],
      },
      {
        kind: 'choice', kicker: 'De jury op de Vismarkt', label: 'Beantwoord de vraag van de jury over de eierbal', say: 'Berend proeft voor het laatst. Zeg wat jullie bal Gronings maakt: 1 tot en met 3.',
        rounds: [
          { who: 'Berend', text: 'Wat maakt deze eierbal Gronings? Eén zin, en nog niet zeuren.', options: [
            { label: 'De korrel van het grove meel.', reply: 'Berend knikt langzaam. Hij schrijft niks op, dat is een goed teken.' },
            { label: 'De fijne bloem, heel glad.', ok: false, tag: 'fout1', reply: 'Berend: "Dat is Fries." Tessa schuift de bloem snel weg.' },
            { label: 'Wij hebben een luik.', ok: false, tag: 'fout1', reply: 'Berend: "Een luik is geen smaak." Henk, achterin, knikt toch.' },
          ] },
          { who: 'Berend', text: 'En waarom moet de standplaats naar jullie?', options: [
            { label: 'Omdat Oma het zo maakt, en Mem er ook bij was.', reply: 'Mem kucht. Trijntje kijkt de andere kant op, tevreden.' },
            { label: 'Omdat Jelle een notaris heeft.', ok: false, tag: 'fout2', reply: 'Berend: "Daar stem ik niet op." Jelle slikt.' },
            { label: 'Omdat de friet erbij komt.', reply: 'Berend: "Friet erbij. Dat noteer ik." Het is een beetje een gok.' },
          ] },
        ],
      },
      {
        kind: 'scene', label: 'De jury', target: stalls, kicker: 'Gronings Ontzet', script: { ids: ['M26.6'] },
        cast: JURY,
      },
      {
        kind: 'scene', label: 'De stemming', target: stalls, kicker: 'Gronings Ontzet', script: { ids: ['M26.11'] },
        scriptTier: { top: ['M26.10'], goed: ['M26.11'], mager: ['M26.12'] }, cast: JURY,
      },
      {
        kind: 'scene', label: 'De uitslag', target: stalls, kicker: 'Gronings Ontzet', script: { ids: ['M26.13'] },
        cast: JURY,
      },
    ];
  }
}
