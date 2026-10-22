// Deel 4 "Nazomer" of the new story (docs/verhaal/nieuw/DEEL4.md, 09-script-akte6.md): the missions M27 inpakken,
// M28 wisselwoning, M29 terug (the Scheuren series in Loppersum) and M30 proefbeleg (Bourtange), in the order of
// NEW_MISSION_IDS. Kept apart from missions_nieuw.js like the other acts: buildNieuwDefs calls buildAkte6Defs (one line).
// The mechanics are the existing ones: stages (goto, hold, scene, board) and the story entries of missionstory_akte6.js.
// Nothing here hurts: no timer, no fail, no health cost (the series is warm and quiet; the proefbeleg is theatre with cardboard).
//
// The places are estimates from the map, not measured on the tiles: Loppersum as latitude/longitude (`ll` targets, resolved
// to the nearest walkable or road spot when the tiles are there), Bourtange as world metres from the church of the vesting
// (landmarkkit.js 'Kerk van Bourtange'). scripts/akte6_test.mjs checks that they lie in the right place; nothing has been
// looked at in the game yet.
import { wgsToWorld } from './rdnew.js';

// places [lat, lon]
export const PLACES = {
  loppersumHuis: [53.3309, 6.7486],     // Willemiens house, a plain house with props against the side wall (no street name on purpose)
  loppersumBus: [53.3306, 6.7478],      // the removal van in front of it
  loppersumWissel: [53.3268, 6.7562],   // the temporary homes at the edge of the village
  loppersumErf: [53.3314, 6.7496],      // the yard of the party
  loppersumGang: [53.3309, 6.7486],     // the hallway: the photo hangs there
};

// Bourtange in world metres: the vesting is a small star fort round its church; the three bastions that are taken
// lie about 120 m from the church, the approach (a haystack on the heath) 440 m north of it
const CHURCH = [42416.8, 22773.3];
const around = (r, deg) => [Math.round((CHURCH[0] + r * Math.cos(deg * Math.PI / 180)) * 10) / 10, Math.round((CHURCH[1] + r * Math.sin(deg * Math.PI / 180)) * 10) / 10];
export const BOURTANGE = {
  hooiberg: [CHURCH[0] + 14, CHURCH[1] - 440],
  gracht: [CHURCH[0] + 6, CHURCH[1] - 160],
  brug: [CHURCH[0] + 4, CHURCH[1] - 140],
  bolwerk1: around(120, 215),   // north-west
  bolwerk2: around(120, -55),   // north-east
  bolwerk3: around(120, 35),    // south-east
  plein: [CHURCH[0] - 6, CHURCH[1] + 18],
  poort: [CHURCH[0] - 2, CHURCH[1] + 130],
};

const xy = (key) => { const [x, y] = wgsToWorld(PLACES[key][0], PLACES[key][1]); return { x, y }; };
const spot = (key) => ({ ...xy(key), road: null });
const ll = (key, o = {}) => ({ ll: PLACES[key], ...o });
const at = (key, label, o = {}) => ({ at: BOURTANGE[key], snap: 'walk', label, ...o });
const bspot = (key) => ({ x: BOURTANGE[key][0], y: BOURTANGE[key][1], road: null });

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
      start: spot('loppersumHuis'),
      say: 'Willemiens huis in Loppersum. Boeken in kleine dozen, breekbaar in de krant, en de kat is het moeilijkst.',
      stages: [
        { kind: 'hold', target: ll('loppersumHuis', { label: 'De boekenkast' }), mode: 'foot', radius: 16, time: 9, ticks: ['Boeken in kleine dozen, anders krijg je ze niet getild.', 'De laatste plank.'], label: 'Pak de boeken in kleine dozen', say: 'Boeken in kleine dozen. Blijf bij de kast staan tot hij leeg is.' },
        { kind: 'hold', target: ll('loppersumHuis', { label: 'De keuken' }), mode: 'foot', radius: 16, time: 9, ticks: ['Het servies in de krant.', 'De laatste kop.'], label: 'Pak het servies in de krant', say: 'Breekbaar in de krant. Blijf in de keuken staan tot de kasten leeg zijn.' },
        { kind: 'scene', target: ll('loppersumHuis', { label: 'De la' }), label: 'Een foto in de la', kicker: 'Loppersum', script: { ids: ['M27.2'] }, cast: [{ key: 'willemien', pose: 'hips', at: [2.4, 0.8] }] },
        { kind: 'hold', target: ll('loppersumHuis', { label: 'De kat' }), mode: 'foot', radius: 16, time: 7, ticks: ['De kat wil niet. Nog een keer.', 'Bijna. Eén staart nog.'], label: 'Zet de kat in de mand', say: 'De kat wil nergens in. Blijf bij hem staan tot de mand dicht is.' },
        { kind: 'goto', target: ll('loppersumBus', { label: 'De verhuisbus' }), mode: 'foot', radius: 8, stop: 0.6, label: 'Draag de laatste doos naar de verhuisbus', say: 'De dozen staan klaar. Naar de verhuisbus voor het huis.' },
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
      start: spot('loppersumBus'),
      say: 'De verhuisbus staat voor het huis. Willemien zit al voorin.',
      stages: [
        { kind: 'board', label: 'Stap in de verhuisbus', say: 'Instappen, Tammo rijdt. Rustig.' },
        { kind: 'goto', target: ll('loppersumWissel', { label: 'De wisselwoning' }), mode: 'vehicle', radius: 22, stop: 1, label: 'Rij rustig naar de wisselwoning aan de rand van het dorp', say: 'Rustig rijden. Niet om de spullen, om Willemien.', talk: { ids: ['M28.2'], delay: 2 } },
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
      start: spot('loppersumErf'),
      say: 'Een buurtfeest op het erf in Loppersum. Rikus staat bij zijn busje.',
      stages: [
        { kind: 'hold', target: ll('loppersumErf', { label: 'Het erf' }), mode: 'foot', radius: 16, time: 9, ticks: ['De eerste tafel staat. De boer zet hem weer anders.', 'Nog één tafel.'], label: 'Zet de tafels op het erf', say: 'Tafels op het erf. Blijf staan tot ze goed staan, de boer helpt mee.' },
        { kind: 'scene', target: ll('loppersumErf', { label: 'Het feest' }), label: 'Het buurtfeest', kicker: 'Loppersum', script: { ids: ['M29.2'] }, cast: [{ key: 'willemien', pose: 'hips', at: [2.6, 0.8] }, { key: 'buurvrouw', pose: 'arms', at: [3.2, -1.4] }, { key: 'boer', pose: 'hips', at: [-3, 1.6] }, { key: 'rikus', pose: 'hips', at: [-3.4, -1.8] }] },
        { kind: 'goto', target: ll('loppersumGang', { label: 'De gang' }), mode: 'foot', radius: 8, stop: 0.8, label: 'Loop naar de gang: daar hangt de foto', say: 'De foto hangt in de gang. Waar je hem ziet als je weggaat, en als je terugkomt.' },
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
      start: bspot('hooiberg'),
      say: 'Een hooiberg op de heide ten noorden van Vesting Bourtange. Berend staat bij een kaart met bierviltjes.',
      stages: [
        { kind: 'goto', target: at('gracht', 'De gracht'), mode: 'foot', radius: 14, label: 'Naar de gracht van de vesting', say: 'Aanvallen. Eerst de gracht: Lammert zet de sluis open, Klaas vaart.' },
        { kind: 'scene', target: at('gracht', 'De gracht'), label: 'De gracht', kicker: 'De gracht van Bourtange', script: { ids: ['M30.2'] }, cast: [{ key: 'jelle', pose: 'hips', at: [3.4, 1.2] }] },
        { kind: 'goto', target: at('brug', 'De ophaalbrug'), mode: 'foot', radius: 10, label: 'Naar de ophaalbrug', say: 'Wubbo staat bij de lier. Hij opent een tel te vroeg.' },
        { kind: 'scene', target: at('brug', 'De ophaalbrug'), label: 'De ophaalbrug', kicker: 'De ophaalbrug', script: { ids: ['M30.3'] }, cast: [{ key: 'wubbo', pose: 'point', at: [2.6, 0.6] }, { key: 'berend', pose: 'arms', at: [3.4, -1.6] }] },
        { kind: 'goto', target: at('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 12, label: 'Naar het eerste bolwerk, Roelfien strooit meel', say: 'Boven jullie komt meel. Hoofd omlaag, naar het eerste bolwerk.' },
        { kind: 'hold', target: at('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 12, time: 8, ticks: ['Een witte wolk. De vlag staat bijna.', 'Nog even.'], label: 'Plant de vlag op het eerste bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 0, to: 1, delay: 1.5 } },
        { kind: 'goto', target: at('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 12, label: 'Naar het tweede bolwerk, Tammo en de duiven', say: 'Het tweede bolwerk. De duiven luisteren naar Tammo.' },
        { kind: 'hold', target: at('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 12, time: 8, ticks: ['Duiven op de hoeden. Er is een duif op een hoed.', 'Nog even.'], label: 'Plant de vlag op het tweede bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 1, to: 2, delay: 1.5 } },
        { kind: 'goto', target: at('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 12, label: 'Naar het derde bolwerk, Tinus trekt de toren', say: 'Het derde bolwerk. Tinus trekt de toren, Durk en Douwe duwen het kanon om.' },
        { kind: 'hold', target: at('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 12, time: 8, ticks: ['De toren leunt. Hij leunt goed.', 'Nog even.'], label: 'Plant de vlag op het derde bolwerk', say: 'Blijf op het bolwerk staan tot de laatste vlag staat.', talk: { ids: ['M30.4'], from: 2, delay: 1.5 } },
        { kind: 'goto', target: at('poort', 'De poort'), mode: 'foot', radius: 12, label: 'Naar de poort: Berend rijdt binnen', say: 'Drie vlaggen. Naar de poort, Berend wil binnenrijden.' },
        { kind: 'scene', target: at('poort', 'De poort'), label: 'De poort', kicker: 'De poort van Bourtange', script: { ids: ['M30.5'] }, cast: [{ key: 'berend', pose: 'arms', at: [3.2, 1.0] }, { key: 'jelle', pose: 'hips', at: [-3.4, -1.4] }] },
        { kind: 'goto', target: at('plein', 'De Fjord Frituur'), mode: 'foot', radius: 9, stop: 0.8, label: 'Naar de Fjord Frituur bij de poort', say: 'De Fjord Frituur staat open. Iedereen eet eierballen op de wal.' },
      ],
    },
  ];
}
