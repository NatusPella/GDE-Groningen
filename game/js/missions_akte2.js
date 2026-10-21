// Akte 2 "Het Noorden is groot" of the new story (docs/verhaal/nieuw 02-akte2.md, 09-script-akte2.md): the defs of M09 and M10,
// the coast mission M11 that replaces the old arc's Diepenring def, and the staging of M08.
// Kept apart from missions_nieuw.js (like missions_akte4.js): buildNieuwDefs calls buildAkte2Defs, applyNieuw calls applyAkte2.
// Act 2 plays out in the province (Hogeland, Waddenzee): the coordinates are world metres taken from the OSM
// extract (data/cache/province: the nearest road, bank or water to the named place), see the comments.
// A start there has no road data until the player is there (the tiles stream in): `lazyStart` makes
// missions.js look for the road when the mission begins. `models` are the vehicle models of vehicle.js.

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
      { kind: 'goto', target: { at: [-21747, -13661], snap: null, label: 'De zandplaat' }, mode: 'boat', radius: 45, label: 'Vaar met Klaas naar de zandplaat; de wind duwt het water weg', say: 'Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat: de wind duwt het water weg, daar wachten we.', talk: { ids: ['M11.4'], delay: 2 } },
      { kind: 'scene', label: 'De zandplaat', kicker: 'De zandplaat', script: { ids: ['M11.5', 'M11.6'] }, clockTo: 22.8 },
      { kind: 'scene', label: 'Naar Noordpolderzijl', big: 'Klaas brengt jullie langs de dijk naar Noordpolderzijl…', kicker: 'Noordpolderzijl', warp: { at: [585, -23701], snap: 'walk', clock: 23.4 }, clockTo: 23.4 },
      marsh([600, -23875], 'Zoutkuip 1', ['Nog even scheppen…', 'Bijna vol.'], { setTime: 210, talk: { ids: ['M11.7'], to: 4, delay: 2 }, say: 'Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van de kustwacht gaat heen en weer: bukken (Ctrl) als het komt.' }),
      marsh([480, -23820], 'Zoutkuip 2', ['Nog even scheppen…', 'Bijna vol.']),
      marsh([350, -23770], 'Zoutkuip 3', ['Nog even scheppen…', 'Bijna vol.'], { talk: { ids: ['M11.7'], from: 4, to: 5, delay: 1.5 } }),
      { kind: 'goto', target: { at: [722, -23754], snap: 'walk', label: 'De steiger bij Noordpolderzijl' }, mode: 'foot', radius: 9, label: 'Terug naar de steiger, voor het water komt', light: KUSTWACHT, say: 'Drie kuipen zout. Rennen naar de steiger, Klaas wacht.', talk: { ids: ['M11.7'], from: 5, to: 8, delay: 1 } },
    ],
  };
}


export function buildAkte2Defs({ models = {} } = {}) {
  const far = (x, y) => ({ x, y, road: null });
  return [
    {
      // M09 Heel aankomen is ook een kunst (Hogeland): sixty eggs in Geesje's tractor, from the pastorie in Warffum to the
      // church cellar in Usquert. Jelle shuts the road, so the wierdepaden it is: speed breaks eggs there (eggs.rough).
      type: 'stages',
      label: 'Heel aankomen is ook een kunst',
      intro: ['Jelle Terpstra kocht alle eieren van het Hogeland, behalve die van Geesje. Oma\'s recept van 1953 heeft er zestig nodig.', 'Breng Geesjes laatste zes kratten, zestig eieren, heel naar de kerkkelder in Usquert. Rustig rijden: Oma\'s recept heeft er zestig nodig.'],
      outro: 'Zestig eieren, alle heel. Vet en eieren zijn binnen: twee van vijf.',
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
      outro: 'Jelle ligt in de sloot, de koffer droog. De bal blijft bij hem. Oma stuurt ons naar Zoutkamp.',
      timeLimit: null,
      reward: 900,
      costRow: ['Ontdekt', 'De bal is echt: Jelle draagt hem in een gouden koffer'],
      vehicle: 'car',
      vehicleName: 'de quad van Geesjes neef',
      vehicleModel: models.quad || null,
      vehicleFail: { gone: 'de quad is foetsie, en de limo rijdt door', wrecked: 'de quad is afgeschreven. Geesjes neef wil hem niet zo terug', left: 'je liet de quad staan. Zonder quad geen wierdepaden' },
      lazyStart: true,
      // Usquert, a service road behind the church (53.40328 N 6.60891 E)
      start: far(2585.0, -20500.1),
      say: 'Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloot bij Uithuizen.',
      stages: [
        { kind: 'board', label: 'Spring op de quad', say: 'De quad van Geesjes neef staat klaar. Springen, Tammo, hij rijdt.' },
        {
          // the ditch (OSM waterway=ditch) west of Uithuizen, on the road Bovenhuizen (53.40844 N 6.65982 E)
          kind: 'goto', target: { at: [5960.4, -21132.8], snap: 'drive', label: 'De sloot bij Uithuizen' }, mode: 'vehicle', radius: 30,
          label: 'Schud de limo af en rijd naar de sloot bij Uithuizen', say: 'Over het kerkenpad, door de kerktuin, langs de wierdepaden. De limo kan niet overal heen.', talk: { ids: ['M10.2'], delay: 2 },
          pursuer: { model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 40, accel: 7, brake: 14, turnRate: 2.1, color: '#1b1c1f' }, name: 'Trekker-limo van Jelle', behind: 40, cruise: 15, caught: 7, caughtFor: 3, shake: 170, close: 24, fail: 'de limo haalt je in. Jelle houdt de koffer zelf wel vast', closeText: 'De trekker-limo zit op je bumper!', lostText: 'De limo raakt je kwijt, achter een wierde.' },
        },
        { kind: 'vault', label: 'Pak de gouden koffer zodra Jelle hem loslaat', target: { bank: [5960.4, -21132.8] }, script: { ids: ['M10.3'], from: 0, to: 4 }, landing: 'Oant sjen!', fail: true },
        { kind: 'goto', target: { at: [6901.1, -21266.8], snap: 'walk', label: 'De bushalte in Uithuizen' }, mode: 'any', radius: 14, label: 'Loop naar de bushalte bij het station van Uithuizen', say: 'Jelle ligt in de sloot. Naar de bushalte, we hebben nog een bus te halen.', talk: { ids: ['M10.3'], from: 4, to: 5, delay: 1 } },
      ],
    },
  ];
}

export function applyAkte2(list) {
  const by = (label) => list.find((d) => d.label === label);
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
}
