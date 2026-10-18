// The new story arc's missions (storyarc_nieuw.js, docs/verhaal/nieuw): its own defs, appended after the
// old ones in the order of MISSION_IDS (append-only: indices live in saves), and how the arc stages the
// defs it shares with the old one. Only used with the feature flag `nieuwverhaal` (storyflag.js).
// Kept out of missions.js so the old arc's voice coverage (scripts/voicelines_collect.mjs reads that
// file) does not see their hint texts, which are text only.

// The def pieces: walk(x, y) / drive(x, y) are missions.js's road spots.
// Act 2 plays out in the province (Hogeland, Waddenzee): the coordinates are world metres taken from the OSM
// extract (data/cache/province: the nearest road, bank or water to the named place), see the comments.
// A start there has no road data until the player is there (the tiles stream in): `lazyStart` makes
// missions.js look for the road when the mission begins. `models` are the vehicle models of vehicle.js.
export function buildNieuwDefs({ map, walk, drive, models = {} }) {
  const list = [];
  const far = (x, y) => ({ x, y, road: null });
  const lm = (map.meta.landmarks || []).find((l) => l.name === 'Goudkantoor') || { x: 86.5, y: 111.7 };
  const loketAt = (dx, dy) => walk(lm.x + dx, lm.y + dy);
  list.push(
    {
      // M03 Het Loket: a queue puzzle on foot. Jelle bought the queue, so from his scene on the clock runs faster.
      type: 'stages',
      label: 'Het Loket',
      intro: ['Het Loket bij de Grote Markt: om twaalf uur sluit de inschrijving voor de Noordelijke Snackprijs, en het loket neemt alleen contant.', 'Trek een wachtnummer, haal formulier 7B en de stempel, en schrijf in. Voor twaalf uur.'],
      outro: 'Ingeschreven voor de Noordelijke Snackprijs. De Fjord Frituur doet mee.',
      timeLimit: 180,
      costRow: ['Inschrijfgeld', '-€150, contant betaald'],
      timeUp: 'het Loket is dicht. Om twaalf uur sloot de inschrijving',
      reward: 0,
      onFoot: true,
      start: loketAt(8, 14),
      stages: [
        { kind: 'goto', target: { landmark: 'Goudkantoor', off: [3, 7], snap: 'walk', label: 'Het Loket: wachtnummer' }, mode: 'foot', radius: 5, stop: 0.8, label: 'Trek een wachtnummer', say: 'Nummer 4117. Op het scherm staat 4093.' },
        // a beat of waiting, so the queue is felt before Jelle buys it (timing instead of only walking)
        { kind: 'hold', target: { landmark: 'Goudkantoor', off: [3, 7], snap: 'walk', label: 'Het Loket: wachtrij' }, radius: 6, time: 5, ticks: ['Scherm: 4101. Nog zestien nummers.', 'Scherm: 4109. Bijna aan de beurt.'], label: 'Wacht in de rij tot je nummer komt', say: 'Blijf in de rij staan tot 4117 wordt omgeroepen.' },
        {
          kind: 'scene', label: 'Jelle', kicker: 'Het Loket', script: { ids: ['M03.2'] }, clock: 3,
          cast: [{ key: 'jelle', pose: 'hold', at: [2.6, 0.8] }, { key: 'bewaarder', pose: 'hips', at: [3.6, -1.2] }],
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [-9, 4], snap: 'walk', label: 'Loket A: formulier 7B' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal formulier 7B bij loket A', say: 'Formulier 7B, in drievoud. Niet vouwen.', talk: { ids: ['M03.3'], from: 0, to: 4, delay: 1.2 },
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [11, -9], snap: 'walk', label: 'Loket C: de zijdeur bij de kopieermachine' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Haal de stempel bij loket C', say: 'Loket C heeft een zijdeur bij de kopieermachine.', talk: { ids: ['M03.3'], from: 4, to: 7, delay: 1.2 },
        },
        {
          kind: 'goto', target: { landmark: 'Goudkantoor', off: [3, 7], snap: 'walk', label: 'Het Loket: inschrijven' }, mode: 'foot', radius: 5, stop: 0.8,
          label: 'Schrijf in bij de balie', say: 'Alles bij elkaar: nu inschrijven, honderdvijftig euro contant.', pay: 150, paid: 'Inschrijving Noordelijke Snackprijs', payShort: ' Tessa legt de rest bij.',
        },
      ],
    },
    {
      // M01 Nul krassen, vijftienhonderd punten: the stunt on the Grote Markt in Berend's bakkie, then the delivery (scratches count over both parts)
      type: 'deliver',
      label: 'Nul krassen, vijftienhonderd punten',
      intro: ['Berend Bos wil zijn bakkie bij zijn zus aan het Boterdiep. Eerst een klus voor Jelmer op de Grote Markt: vijftienhonderd stuntpunten.', 'Stunt zonder krassen: parasols en kliko\'s mogen, mensen niet. Daarna het bakkie heel naar het Boterdiep.'],
      outro: 'Berend zei goud. En moi. Tegen Tessa.',
      timeLimit: 240,
      timeUp: 'tijd op. Jelmers chat is al naar een kattenfilmpje en Berend wacht nog',
      vehicleFail: { gone: 'Berends bakkie is foetsie', wrecked: 'Berends bakkie is total loss. Hij telde nul krassen, nu telt hij niks meer', left: 'je liet Berends bakkie staan. Hij telde nul krassen, geen parkeerbonnen' },
      reward: 200,
      scratchFine: 0.5,
      vehicleName: 'Berends bakkie',
      destName: 'het Boterdiep',
      stunt: { center: { x: 168.69, y: 70.04 }, radius: 46, target: 1500 },
      handBack: { how: 'drive', say: 'Berend pakt zijn sleutels terug en rijdt weg. Wij lopen, Tessa.' },
      start: drive(223.17, -30.52),
      dest: drive(-22.92, -491.56),
      say: 'Eerst de Grote Markt: vijftienhonderd stuntpunten, zonder krassen. Daarna het Boterdiep.',
    },
    {
      // M09 Heel aankomen is ook een kunst (Hogeland): sixty eggs in Geesje's tractor, from the pastorie in Warffum to the
      // church cellar in Usquert. Jelle shuts the road, so the wierdepaden it is: speed breaks eggs there (eggs.rough).
      type: 'stages',
      label: 'Heel aankomen is ook een kunst',
      intro: ['Jelle Terpstra kocht alle eieren van het Hogeland, behalve die van Geesje. Oma\'s recept van 1953 heeft er zestig nodig.', 'Breng Geesjes laatste zes kratten, zestig eieren, heel naar de kerkkelder in Usquert. Rustig rijden: Oma\'s recept heeft er zestig nodig.'],
      outro: 'Zestig eieren, alle heel. Plakje drie is gered.',
      timeLimit: null,
      reward: 700,
      costRow: ['Gered', 'Plakje drie: de eieren van Geesje'],
      vehicle: 'car',
      vehicleName: 'Geesjes trekker',
      vehicleModel: models.tractor || null,
      vehicleFail: { gone: 'Geesjes trekker is foetsie, met alle eieren', wrecked: 'de trekker ligt in de sloot, de eieren drijven', left: 'je liet de trekker met de eieren staan' },
      eggs: { from: 1, count: 60, failAt: 50, fail: 'meer dan de helft van de eieren is stuk. Laad opnieuw', rough: { speed: 8.5, per: 0.35 } },
      lazyStart: true,
      // Warffum, Pastorieweg (OSM way Pastorieweg, 53.39185 N 6.56013 E)
      start: far(-638.9, -19173.8),
      say: 'Breng Geesjes zestig eieren heel naar de kerkkelder in Usquert. Rustig rijden: ze zijn alle zestig nodig.',
      stages: [
        { kind: 'board', label: 'Stap in Geesjes trekker', say: 'De trekker staat bij de schuur. Instappen, de kratten staan achterop.' },
        // the wierdepaden: the Westerhornseweg south of the main road (the Dorpsweg is shut by Jelle's permit)
        { kind: 'goto', target: { at: [511.2, -19812.9], snap: 'drive', label: 'Westerhornseweg' }, mode: 'vehicle', radius: 22, label: 'Neem de wierdepaden: de Dorpsweg is dicht', say: 'De Dorpsweg is afgezet. Via de wierdepaden dan: bulten en gaten. Rustig aan.', talk: { ids: ['M09.2'], delay: 2 } },
        // Usquert: the church (Petrus en Pauluskerk) on its wierde, Kerkstraat
        { kind: 'goto', target: { at: [2779.1, -20401.5], snap: 'drive', label: 'De kerkkelder in Usquert' }, mode: 'vehicle', radius: 14, stop: 1, label: 'Breng de zestig eieren heel naar de kerkkelder in Usquert', say: 'Door naar Usquert. De kerk staat op de wierde, de kelder is koel.', talk: { ids: ['M09.3'], delay: 8 } },
      ],
    },
    {
      // M10 Een trekker-limo op de wierde (Hogeland): Jelle with the golden case in his black tractor-limo; Tessa and Tammo
      // flee on the quad over wierdepaden, Jelle jumps a ditch near Uithuizen with a pole and ends in it.
      type: 'stages',
      label: 'Een trekker-limo op de wierde',
      intro: ['Jelle rijdt het erf op in zijn zwarte trekker-limo, met de gouden koffer in zijn hand. Hij wil de museumbeelden ruilen tegen jullie vertrek uit Grunn.', 'Als Jelle de koffer loslaat, pakken wij hem: schud de limo af en haal de sloot bij Uithuizen.'],
      outro: 'Jelle ligt in de sloot, de koffer droog. De bal is echt.',
      timeLimit: null,
      reward: 900,
      costRow: ['Ontdekt', 'De bal is echt: Jelle draagt hem in een gouden koffer'],
      vehicle: 'car',
      vehicleName: 'de quad van Geesjes neef',
      vehicleModel: models.quad || null,
      vehicleFail: { gone: 'de quad is foetsie, en de limo rijdt door', wrecked: 'de quad is total loss. Geesjes neef wil hem niet zo terug', left: 'je liet de quad staan. Zonder quad geen wierdepaden' },
      lazyStart: true,
      // Usquert, a service road behind the church (53.40328 N 6.60891 E)
      start: far(2585.0, -20500.1),
      say: 'Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloot bij Uithuizen.',
      stages: [
        { kind: 'board', label: 'Spring op de quad', say: 'De quad van Geesjes neef staat klaar. Springen, Tammo, hij rijdt.' },
        {
          // the ditch (OSM waterway=ditch) west of Uithuizen, on the road Bovenhuizen (53.40844 N 6.65982 E)
          kind: 'goto', target: { at: [5960.4, -21132.8], snap: 'drive', label: 'De sloot bij Uithuizen' }, mode: 'vehicle', radius: 30,
          label: 'Schud de limo af en haal de sloot bij Uithuizen', say: 'Over het kerkenpad, door de kerktuin, langs de wierdepaden. De limo kan niet overal heen.', talk: { ids: ['M10.2'], delay: 2 },
          pursuer: { model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 40, accel: 7, brake: 14, turnRate: 2.1, color: '#1b1c1f' }, name: 'Trekker-limo van Jelle', behind: 40, cruise: 15, caught: 7, caughtFor: 3, shake: 170, close: 24, fail: 'de limo haalt je in. Jelle houdt de koffer zelf wel vast', closeText: 'De trekker-limo zit op je bumper!', lostText: 'De limo raakt je kwijt, achter een wierde.' },
        },
        { kind: 'vault', label: 'Jelle', target: { bank: [5960.4, -21132.8] }, script: { ids: ['M10.3'], from: 0, to: 4 }, landing: 'Oant sjen!', fail: true },
        { kind: 'goto', target: { at: [6901.1, -21266.8], snap: 'walk', label: 'De bushalte in Uithuizen' }, mode: 'any', radius: 14, label: 'Loop naar de bushalte bij het station van Uithuizen', say: 'Jelle ligt in de sloot. Naar de bushalte, we hebben nog een bus te halen.', talk: { ids: ['M10.3'], from: 4, to: 5, delay: 1 } },
      ],
    },
  );
  return list;
}

// M11 Geleend van de Friezen, the coast mission (Zoutkamp, Lauwersmeer, Noordpolderzijl): replaces the old arc's def of the
// same label (the Diepenring chase) in the new arc. World metres from the OSM extract:
//   the route of the skûtsje is the water path of the Reitdiep and the Lauwersmeer from the harbour of Zoutkamp
//   (computed over the extract's water polygons, 40 m clear of the banks), the marsh and the dike path are those of Noordpolderzijl.
const SKUTSJE_PATH = [[-18134, -12881], [-18195, -12940], [-18637, -13235], [-18798, -13313], [-19419, -13546], [-19600, -13684], [-19761, -13742], [-20921, -14028], [-21418, -13962], [-21596, -13780], [-21853, -13576], [-21952, -13535], [-22051, -13514], [-22290, -13491], [-22371, -13570], [-22918, -14325], [-22999, -14404], [-25773, -16414], [-25813, -16454], [-26025, -19454], [-25832, -19977], [-25595, -20160], [-24920, -20387]];
// the coast guard boat on the fairway to Noordpolderzijl and the beam over the marsh (angles: 0 = +x, y points south)
const KUSTWACHT = { x: 706, y: -24046, from: 1.4, to: 2.65, speed: 0.32, range: 520, half: 0.17, rate: 1.5, crouchRate: 0.3, decay: 0.3, heading: Math.PI / 2,
  warn: 'Het licht komt! Bukken (Ctrl), dan zien ze je niet.', fail: 'in het licht van de kustwacht gezien. Een zeehond loopt niet rechtop' };

function kustDef() {
  const marsh = (at, label, ticks, o = {}) => ({ kind: 'hold', target: { at, snap: 'walk', label }, mode: 'foot', radius: 4, time: 2.5, ticks, label: `Schep ${label.toLowerCase()} leeg`, light: KUSTWACHT, ...o });
  return {
    type: 'stages',
    label: 'Geleend van de Friezen',
    intro: ['Klaas leent jullie een snelle rubberboot. Jelles skûtsje vaart het Reitdiep af, met een gouden bal in de kist.', 'Haal het skûtsje in en spring aan boord. Daarna het zout van Oma: drie kuipen van de kwelder bij Noordpolderzijl, uit het licht van de kustwacht, terug voor het water komt.'],
    outro: 'Het zout is van Oma. Plakje vier is gered.',
    timeLimit: null,
    timeUp: 'het water kwam terug. Jullie zitten vast op het wad',
    reward: 1300,
    costRow: ['Gered', 'Plakje vier: het zout van Oma, van de kwelder'],
    // Zoutkamp, the quay of the harbour (service road, 53.33785 N 6.29714 E); the boat lies moored at the water's edge a few metres off
    start: { x: -18057.6, y: -12911.0, road: null },
    boatStart: { x: -18075, y: -12902, angle: 2.8, kind: 'rubberboot' },
    say: 'Haal Jelles skûtsje in en spring aan boord. Daarna het zout: blijf uit het licht van de kustwacht en wees terug voor het water komt.',
    stages: [
      { kind: 'goto', target: { storyBoat: true }, mode: 'any', radius: 14, label: 'Stap in de rubberboot van Klaas', say: 'Klaas zit bovenin en kijkt de andere kant op. Instappen, Tammo stuurt.' },
      {
        kind: 'boatchase', label: 'Ga langszij bij het skûtsje', name: 'Skûtsje van Jelle', path: SKUTSJE_PATH, lead: 140, board: 9, boardTime: 2.5, escape: 420, time: 240,
        say: 'Daar vaart hij, het Reitdiep af! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan spring je aan boord. Tot de sluis, zei Klaas.',
        near: 'Langszij! Hou hem vast, Tammo springt zo...', lost: 'het skûtsje is weg, met zeil en al', talk: { ids: ['M11.2'], delay: 3 },
      },
      {
        kind: 'scene', label: 'Aan boord', target: { skutsje: true }, deckCam: true, kicker: 'Het skûtsje', big: 'Chocola?!', script: { ids: ['M11.3'] },
        props: [{ kind: 'ball', holder: 'A', from: 'Chocola' }],
      },
      { kind: 'goto', target: { at: [-21747, -13661], snap: null, label: 'De zandplaat' }, mode: 'boat', radius: 45, label: 'Vaar met Klaas naar de zandplaat bij laag water', say: 'Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat, daar wachten we op het getij.', talk: { ids: ['M11.4'], delay: 2 } },
      { kind: 'scene', label: 'De zandplaat', kicker: 'De zandplaat', script: { ids: ['M11.5', 'M11.6'] }, clockTo: 22.8 },
      { kind: 'scene', label: 'Naar Noordpolderzijl', big: 'Klaas brengt jullie langs de dijk naar Noordpolderzijl…', kicker: 'Noordpolderzijl', warp: { at: [585, -23701], snap: 'walk', clock: 23.4 }, clockTo: 23.4 },
      marsh([600, -23875], 'Zoutkuip 1', ['Nog even scheppen…', 'Bijna vol.'], { setTime: 210, talk: { ids: ['M11.7'], to: 4, delay: 2 }, say: 'Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van de kustwacht gaat heen en weer: bukken (Ctrl) als het komt.' }),
      marsh([480, -23820], 'Zoutkuip 2', ['Nog even scheppen…', 'Bijna vol.']),
      marsh([350, -23770], 'Zoutkuip 3', ['Nog even scheppen…', 'Bijna vol.'], { talk: { ids: ['M11.7'], from: 4, to: 5, delay: 1.5 } }),
      { kind: 'goto', target: { at: [722, -23754], snap: 'walk', label: 'De steiger bij Noordpolderzijl' }, mode: 'foot', radius: 9, label: 'Terug naar de steiger, voor het water komt', light: KUSTWACHT, say: 'Drie kuipen zout. Rennen naar de steiger, Klaas wacht.', talk: { ids: ['M11.7'], from: 5, to: 8, delay: 1 } },
    ],
  };
}

// How the new arc stages the defs it shares with the old one: which script scene is said where,
// the hints that named people who are not in this story, and what the story has dropped.
// Stage fields: script { ids, from, to } = the lines of a stage scene; talk { ids, from, to, delay } =
// subtitle talk while the stage runs (storytalk.js); radioScript = a radio fragment (storytext.js).
export function applyNieuw(list) {
  const by = (label) => list.find((d) => d.label === label);
  const stageOf = (def, kind, n = 0) => def.stages.filter((q) => q.kind === kind)[n];
  const pin = by('Even pinnen');
  if (pin) {
    pin.stages[1].talk = { ids: ['M02.2'], delay: 1.5 };
    // the goal said aloud (#93): shake the police, then deliver
    pin.stages[1].label = 'Schud de politie af: rij een garage in';
    pin.stages[2].label = 'Breng de automaat naar Sjabbe (Pand & Poen)';
  }
  const duif = by('Kieken van boven');
  if (duif) {
    duif.stages[0].talk = { ids: ['M04.2'], delay: 6 };
    // the goal said aloud, and the fuse box too (09-script: three cameras, two guards, a fuse box)
    duif.stages[0].label = 'Fotografeer 3 camera\'s, 2 bewakers en de stroomkast';
    duif.stages[0].targets.push({ landmark: 'Groninger Museum', off: [-29, -38], label: 'De stroomkast achter de fietsenstalling' });
    duif.timeLimit = 230;
    duif.timeUp = 'tijd op. Bert fluit de duif terug naar de duiventil';
  }
  const kei = by('Wind tegen, beide kanten op');
  // what each mission leaves you with, on the success card (#147): the clue or the consequence
  if (duif) duif.costRow = ['Ontdekt', 'Bewaker twee krijgt een eierbal voor zijn koekje'];
  if (kei) kei.costRow = ['Tip van Sjoerd', 'Om twaalf uur gaan de camera\'s drie minuten uit'];
  if (pin) pin.costRow = ['Ontdekt', 'Een baas vroeg waar het museum alarmen heeft'];
  const kraak = by('Het museum stond er al zo');
  if (kraak) kraak.costRow = ['Gevolg', 'De politie zoekt twee mensen in het zwart'];
  if (kei) kei.timeUp = 'tijd op. De eerstejaars zitten al aan de bar';
  if (pin) pin.vehicleFail = { gone: 'de auto met de automaat is foetsie, en de pas ook', wrecked: 'de auto met de automaat is total loss. Sjabbe kan alleen openen wat heel is', left: 'je liet de automaat staan. Zonder automaat geen pas' };
  if (kei) kei.say = 'Podium in de Kiezelrace, dan vertelt Sjoerd over het museum. Altijd tegenwind, op een eigen fiets.';
  if (kei) kei.moment = { at: 3, text: kei.moment.text, talk: { ids: ['M05.2'] } };
  const vet = by('Al het vet van Grunn');
  if (vet) {
    vet.stages = vet.stages.filter((q) => q.kind !== 'vault');
    vet.stages[0].say = 'Instappen. De tankwagen staat bij de groothandel.';
    vet.stages[1].go = 'Ze zien ons! Daar gaat hij. Erin springen, of de banden plat. Schieten mag, rammen mag.';
    vet.stages[1].stopped = 'Pang! Banden plat. De bewakers rennen weg, Durk en Douwe fietsen achter hun baas aan.';
    vet.stages[1].hijack = 'Gekaapt! De bewakers rennen weg. Het vet is van ons.';
    const to = stageOf(vet, 'goto', 0);
    to.talk = { ids: ['M07.2'], delay: 3 };
    vet.outro = 'Het vet is terug in Grunn. Plakje twee is gered.';
    vet.costRow = ['Gered', 'Plakje twee: het vet blijft in Grunn'];
    vet.vehicleFail = { gone: 'Femkes auto is foetsie, en de tankwagen rijdt door', wrecked: 'de auto is total loss. Femke wil hem niet zo terug', left: 'je liet de auto staan. Zonder auto geen tankwagen' };
  }
  const sk = by('Geleend van de Friezen');
  if (sk) {
    for (const k of Object.keys(sk)) delete sk[k];
    Object.assign(sk, kustDef());
  }
  const fat = by('Fatbikes tellen niet als fiets');
  if (fat) {
    // the goal said aloud (#93, #147): through the fatbikes to Oma, who then tells about the ball
    fat.intro = ['Oma Trijntje belt: kom naar de Noorderhaven, ze heeft iets over die bal. Maar de Oude Ebbingestraat zit vol fatbikes, over de stoep.', 'Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal. Geschept worden kost een tel.'];
    fat.say = 'Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal.';
    fat.talk = { ids: ['M08.2'], delay: 7 };
    fat.outro = 'Heelhuids bij Oma Trijntje. Nu vertelt ze over de bal.';
    fat.timeUp = 'tijd op. Oma Trijntje heeft de krentjebrij alleen opgegeten';
    fat.costRow = ['Gekregen', "Oma's lijstje: vijf vrienden, vijf ingrediënten"];
  }
  const mus = by('Het museum stond er al zo');
  if (mus) {
    // the black clothes and the boat are in the intro now (08 §2): only the dark is needed, and the call from home
    mus.requires = ['night'];
    stageOf(mus, 'scene').script = { ids: ['M06.3'], from: 0, to: 4 };
    stageOf(mus, 'scene').lines = [];
    const esc = stageOf(mus, 'escape');
    esc.radio = undefined;
    esc.radioScript = { ids: ['M06.3'], from: 4, to: 9, caller: 'Een beller uit Ljouwert' };
    esc.talk = { ids: ['M06.3'], from: 9, to: 17, delay: 5 };
  }
}

