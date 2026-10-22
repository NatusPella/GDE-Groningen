// Deel 4 "Nazomer" of the new story (docs/verhaal/nieuw/DEEL4.md, 09-script-akte6.md): the missions M27 inpakken,
// M28 wisselwoning, M29 terug (the Scheuren series in Loppersum) and M30 proefbeleg (Bourtange), in the order of
// NEW_MISSION_IDS. Kept apart from missions_nieuw.js like the other acts: buildNieuwDefs calls buildAkte6Defs (one line).
// The mechanics are the existing ones: stages (goto, hold, scene, board) and the story entries of missionstory_akte6.js.
// Nothing here hurts: no timer, no fail, no health cost (the series is warm and quiet; the proefbeleg is theatre with cardboard).
//
// The places are world metres taken from the OSM extract of the province (data/cache/province), on a street or path, 10 m or
// more from any building and not in water (checked by hand against the extract, not on the loaded tiles): Loppersum on the
// Hofstraat and the Pruimenhof (the texts name no street), Bourtange on the paths round the vesting: the bastions are
// where the guardhouses stand (historic=guardhouse), the bridges are the ones of the Batterijenstraat and the Bisschopsweg.
// scripts/akte6_test.mjs checks that they lie in the right place; nothing has been looked at in the game yet.

export const LOPPERSUM = {
  huis: [12039, -12622],     // Willemien's house: a plain house on the Hofstraat
  bus: [12013, -12597],      // the removal van in front of the street, 36 m further on
  erf: [12071, -12647],      // the yard of the party, 35 m the other way
  wissel: [12304, -12722],   // the temporary homes at the edge of the village (Pruimenhof)
};
export const BOURTANGE = {
  hooiberg: [42440, 22420],  // the haystack on the heath north of the vesting
  gracht: [42481, 22662],    // the northern bridge over the moat (Batterijenstraat)
  brug: [42505, 22712],      // the bridge at the Friesche Poort, where Wubbo's winch is
  bolwerk1: [42583, 22731],  // east bastion (a guardhouse stands at 42595, 22723)
  bolwerk2: [42435, 22930],  // south bastion (the tip at 42426, 22938 lies in the moat)
  bolwerk3: [42335, 22808],  // west bastion (guardhouse at 42323, 22806)
  poort: [42498, 22892],     // the Munsterse Poort, where Berend rides in
  plein: [42470, 22800],     // the Marktplein, where the Fjord Frituur stands
};
export const CHURCH = [42416.8, 22773.3]; // Kerk van Bourtange (landmarkkit.js)

const mk = (table) => (key, label, o = {}) => ({ at: table[key], snap: 'walk', label, ...o });
const loppersumAt = mk(LOPPERSUM);
const bourtangeAt = mk(BOURTANGE);
const spotOf = (table, key) => ({ x: table[key][0], y: table[key][1], road: null });

// the removal van of Willemien's nephew: a plain white van (the lent vehicles of the series go back after the mission)
const VAN = { name: 'van', len: 5.4, wid: 2.1, maxSpeed: 22, accel: 5.5, brake: 16, turnRate: 1.9, color: '#e8e6e0' };

export function buildAkte6Defs() {
  return [
    {
      // M27 Inpakken (Tessa and Tammo, Loppersum): books in small boxes, china in newspaper, the cat in its basket, a photo from 1953
      type: 'stages',
      label: 'Inpakken',
      intro: ['Oma Trijntjes familie in Loppersum, Willemien, moet even uit haar huis: het wordt versterkt. Delfstof Noord zet het op nieuwe poten, en dat duurt langer dan een kopje koffie.', 'Help haar inpakken. Boeken in kleine dozen, breekbaar in de krant, de kat in de mand. Gewoon dozen.'],
      outro: 'Twaalf dozen, een kat en een foto uit 1953. De dozen staan in de verhuisbus.',
      timeLimit: null,
      reward: 400,
      costRow: ['Gevonden', 'Een foto uit 1953: Trijntje en Willemiens oma op een fiets'],
      onFoot: true,
      start: spotOf(LOPPERSUM, 'huis'),
      say: 'Willemiens huis in Loppersum. Boeken in kleine dozen, breekbaar in de krant, en de kat is het moeilijkst.',
      stages: [
        { kind: 'hold', target: loppersumAt('huis', 'De boekenkast'), mode: 'foot', radius: 16, time: 9, ticks: ['Boeken in kleine dozen, anders krijg je ze niet getild.', 'De laatste plank.'], label: 'Pak de boeken in kleine dozen', say: 'Boeken in kleine dozen. Blijf bij de kast staan tot hij leeg is.' },
        { kind: 'hold', target: loppersumAt('huis', 'De keuken'), mode: 'foot', radius: 16, time: 9, ticks: ['Het servies in de krant.', 'De laatste kop.'], label: 'Pak het servies in de krant', say: 'Breekbaar in de krant. Blijf in de keuken staan tot de kasten leeg zijn.' },
        { kind: 'scene', target: loppersumAt('huis', 'De la'), label: 'Een foto in de la', kicker: 'Loppersum', script: { ids: ['M27.2'] }, cast: [{ key: 'willemien', pose: 'hips', at: [2.4, 0.8] }] },
        { kind: 'hold', target: loppersumAt('huis', 'De kat'), mode: 'foot', radius: 16, time: 7, ticks: ['De kat wil niet. Nog een keer.', 'Bijna. Eén staart nog.'], label: 'Zet de kat in de mand', say: 'De kat wil nergens in. Blijf bij hem staan tot de mand dicht is.' },
        { kind: 'goto', target: loppersumAt('bus', 'De verhuisbus'), mode: 'foot', radius: 8, stop: 0.6, label: 'Draag de laatste doos naar de verhuisbus', say: 'De dozen staan klaar. Naar de verhuisbus voor het huis.' },
      ],
    },
    {
      // M28 De wisselwoning (Tammo, Loppersum): the removal van, slowly, to the temporary homes at the edge of the village
      type: 'stages',
      label: 'De wisselwoning',
      intro: ['Willemien zit voorin met de kat op schoot. De dozen staan achterin.', 'Rij de verhuisbus rustig naar de wisselwoning aan de rand van het dorp. Rustig: niet om de spullen, om haar.'],
      outro: 'De wisselwoning, een plantje in de vensterbank en een kat die het niks vindt.',
      timeLimit: null,
      reward: 400,
      costRow: ['Gebracht', 'Zes dozen en een plantje, naar de wisselwoning'],
      vehicle: 'car',
      vehicleName: 'de verhuisbus',
      vehicleModel: VAN,
      vehicleFail: { gone: 'de verhuisbus is foetsie', wrecked: 'de verhuisbus is afgeschreven', left: 'je liet de verhuisbus staan, met Willemien erin' },
      lazyStart: true,
      start: spotOf(LOPPERSUM, 'bus'),
      say: 'De verhuisbus staat voor het huis. Willemien zit al voorin.',
      stages: [
        { kind: 'board', label: 'Stap in de verhuisbus', say: 'Instappen, Tammo rijdt. Rustig.' },
        { kind: 'goto', target: loppersumAt('wissel', 'De wisselwoning', { snap: 'drive' }), mode: 'vehicle', radius: 22, stop: 1, label: 'Rij rustig naar de wisselwoning aan de rand van het dorp', say: 'Rustig rijden. Niet om de spullen, om Willemien.', talk: { ids: ['M28.2'], delay: 2 } },
      ],
    },
    {
      // M29 Terug (Tessa, Loppersum): the house is ready; a party on the yard, the photo in the hallway
      type: 'stages',
      label: 'Terug',
      intro: ['Het huis in Loppersum is klaar. Willemien is terug, en de buurt zet tafels op het erf.', 'Zet de tafels neer, loop rond op het feest en kijk waar de foto hangt.'],
      outro: 'Willemien is thuis. Eén keer zeggen is genoeg.',
      timeLimit: null,
      reward: 500,
      costRow: ['Thuis', 'Willemien is terug in haar huis; de foto hangt in de gang'],
      onFoot: true,
      start: spotOf(LOPPERSUM, 'erf'),
      say: 'Een buurtfeest op het erf in Loppersum. Rikus staat bij zijn busje.',
      stages: [
        { kind: 'hold', target: loppersumAt('erf', 'Het erf'), mode: 'foot', radius: 16, time: 9, ticks: ['De eerste tafel staat. De boer zet hem weer anders.', 'Nog één tafel.'], label: 'Zet de tafels op het erf', say: 'Tafels op het erf. Blijf staan tot ze goed staan, de boer helpt mee.' },
        { kind: 'scene', target: loppersumAt('erf', 'Het feest'), label: 'Het buurtfeest', kicker: 'Loppersum', script: { ids: ['M29.2'] }, cast: [{ key: 'willemien', pose: 'hips', at: [2.6, 0.8] }, { key: 'buurvrouw', pose: 'arms', at: [3.2, -1.4] }, { key: 'boer', pose: 'hips', at: [-3, 1.6] }, { key: 'rikus', pose: 'hips', at: [-3.4, -1.8] }] },
        { kind: 'goto', target: loppersumAt('huis', 'De gang'), mode: 'foot', radius: 8, stop: 0.8, label: 'Loop naar de gang: daar hangt de foto', say: 'De foto hangt in de gang. Waar je hem ziet als je weggaat, en als je terugkomt.' },
      ],
    },
    {
      // M30 Het proefbeleg (Tessa leads, Bourtange): the rehearsal of next year's siege; seven friends, four fronts, three bastions, cardboard
      type: 'stages',
      label: 'Het proefbeleg',
      intro: ['Berend wil één proefbeleg van de vesting Bourtange, met alle vrienden van Oma. Hij wil weten hoe winnen voelt, waar niemand het ziet.', 'Leid het proefbeleg: de gracht, de ophaalbrug en drie bolwerken. Plant op elk bolwerk de kartonnen vlag.'],
      outro: 'De vesting is genomen, door een leger van karton, meel en duiven. Berend zegt dat winnen verkeerd voelt.',
      timeLimit: null,
      reward: 1500,
      costRow: ['Gewonnen', 'Het proefbeleg van Bourtange, voor het eerst door de belegeraar'],
      onFoot: true,
      start: spotOf(BOURTANGE, 'hooiberg'),
      say: 'Een hooiberg op de heide ten noorden van Vesting Bourtange. Berend staat bij een kaart met bierviltjes.',
      stages: [
        { kind: 'goto', target: bourtangeAt('gracht', 'De gracht'), mode: 'foot', radius: 14, label: 'Naar de gracht van de vesting', say: 'Aanvallen. Eerst de gracht: Lammert zet de sluis open, Klaas vaart.' },
        { kind: 'scene', target: bourtangeAt('gracht', 'De gracht'), label: 'De gracht', kicker: 'De gracht van Bourtange', script: { ids: ['M30.2'] }, cast: [{ key: 'jelle', pose: 'hips', at: [3.4, 1.2] }] },
        { kind: 'goto', target: bourtangeAt('brug', 'De ophaalbrug'), mode: 'foot', radius: 10, label: 'Naar de ophaalbrug', say: 'Wubbo staat bij de lier. Hij opent een tel te vroeg.' },
        { kind: 'scene', target: bourtangeAt('brug', 'De ophaalbrug'), label: 'De ophaalbrug', kicker: 'De ophaalbrug', script: { ids: ['M30.3'] }, cast: [{ key: 'wubbo', pose: 'point', at: [2.6, 0.6] }, { key: 'berend', pose: 'arms', at: [3.4, -1.6] }] },
        { kind: 'goto', target: bourtangeAt('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 20, label: 'Naar het eerste bolwerk, Roelfien strooit meel', say: 'Boven jullie komt meel. Hoofd omlaag, naar het eerste bolwerk.' },
        { kind: 'hold', target: bourtangeAt('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 20, time: 8, ticks: ['Een witte wolk. De vlag staat bijna.', 'Nog even.'], label: 'Plant de vlag op het eerste bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 0, to: 1, delay: 1.5 } },
        { kind: 'goto', target: bourtangeAt('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 20, label: 'Naar het tweede bolwerk, Tammo en de duiven', say: 'Het tweede bolwerk. De duiven luisteren naar Tammo.' },
        { kind: 'hold', target: bourtangeAt('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 20, time: 8, ticks: ['Duiven op de hoeden. Er is een duif op een hoed.', 'Nog even.'], label: 'Plant de vlag op het tweede bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 1, to: 2, delay: 1.5 } },
        { kind: 'goto', target: bourtangeAt('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 20, label: 'Naar het derde bolwerk, Tinus trekt de toren', say: 'Het derde bolwerk. Tinus trekt de toren, Durk en Douwe duwen het kanon om.' },
        { kind: 'hold', target: bourtangeAt('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 20, time: 8, ticks: ['De toren leunt. Hij leunt goed.', 'Nog even.'], label: 'Plant de vlag op het derde bolwerk', say: 'Blijf op het bolwerk staan tot de laatste vlag staat.', talk: { ids: ['M30.4'], from: 2, delay: 1.5 } },
        { kind: 'goto', target: bourtangeAt('poort', 'De poort'), mode: 'foot', radius: 12, label: 'Naar de poort: Berend rijdt binnen', say: 'Drie vlaggen. Naar de poort, Berend wil binnenrijden.' },
        { kind: 'scene', target: bourtangeAt('poort', 'De poort'), label: 'De poort', kicker: 'De poort van Bourtange', script: { ids: ['M30.5'] }, cast: [{ key: 'berend', pose: 'arms', at: [3.2, 1.0] }, { key: 'jelle', pose: 'hips', at: [-3.4, -1.4] }] },
        { kind: 'goto', target: bourtangeAt('plein', 'De Fjord Frituur'), mode: 'foot', radius: 9, stop: 0.8, label: 'Naar de Fjord Frituur op het plein', say: 'De Fjord Frituur staat open. Iedereen eet eierballen op de wal.' },
      ],
    },
  ];
}
