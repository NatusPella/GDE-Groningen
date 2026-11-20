// Deel 4 "Nazomer" of the new story (docs/verhaal/nieuw/DEEL4.md, 09-script-akte6.md): the missions M27 inpakken,
// M28 wisselwoning, M29 terug (the Scheuren series in Loppersum) and M30 proefbeleg (Bourtange), in the order of
// NEW_MISSION_IDS. Kept apart from missions_nieuw.js like the other acts: buildNieuwDefs calls buildAkte6Defs (one line).
// The mechanics are the existing ones: stages (goto, hold, scene, board) and the story entries of missionstory_akte6.js.
// Nothing here hurts: no timer, no fail, no health cost (the series is warm and quiet; the proefbeleg is theatre with cardboard).
//
// The places are world metres taken from the OSM extract of the province (data/cache/province), on a street or path, 10 m or
// more from any building and not in water: Loppersum on the Hofstraat and the Pruimenhof (the texts name no street), Bourtange
// on the paths round the vesting: the bastions are where the guardhouses stand (historic=guardhouse), the bridges are the ones
// of the Batterijenstraat and the Bisschopsweg. scripts/akte6_test.mjs checks that they lie in the right place, and
// scripts/bourtange_test.mjs checks them on the loaded tiles (#953): dry, not in a building, reachable on foot from the
// Marktplein, and every step circle (the 12 m hold on the bastions, the 10 m gracht step) stays on the bank instead of
// reaching into the moat (a marker at the water's edge let the player walk into the gracht). The staged scenes themselves
// have not been looked at in the game yet.

import { registreerAankleding } from './missiedecor.js';

export const LOPPERSUM = {
  huis: [12039, -12622],     // Willemien's house: a plain house on the Hofstraat
  bus: [12013, -12597],      // the removal van in front of the street, 36 m further on
  erf: [12071, -12647],      // the yard of the party, 35 m the other way
  wissel: [12304, -12722],   // the temporary homes at the edge of the village (Pruimenhof)
};
export const BOURTANGE = {
  hooiberg: [42440, 22420],  // the haystack on the heath north of the vesting
  gracht: [42468, 22640],    // the northern moat bank by the Batterijenstraat, 12 m from the water (#953)
  brug: [42505, 22712],      // the bridge at the Friesche Poort, where Wubbo's winch is (dry: a bridge)
  bolwerk1: [42583, 22679],  // east bastion on the wal (a guardhouse stands at 42595, 22723); the old spot 42583, 22731 lies in the vaarnet water patch, so the player stood in the moat (#953); 12 m from the water
  bolwerk2: [42489, 22952],  // south bastion on the wal (not on a bridge deck), 10 m from the water
  bolwerk3: [42319, 22859],  // west-south bastion on the wal (not on a bridge deck), 11 m from the water
  poort: [42498, 22892],     // the Munsterse Poort, where Berend rides in
  plein: [42470, 22800],     // the Marktplein, where the Fjord Frituur stands
};
export const CHURCH = [42416.8, 22773.3]; // Kerk van Bourtange (landmarkkit.js)

const mk = (table) => (key, label, o = {}) => ({ at: table[key], snap: 'walk', label, ...o });
const loppersumAt = mk(LOPPERSUM);
// #955: bolwerk1 en bolwerk3 blijven op hun gemeten plek (snap: null): roadSpot schoof ze 36 m en 30 m naar het dichtstbijzijnde pad, aan de overkant van de gracht (930 m lopen i.p.v. 339 m)
const BOURTANGE_RAUW = new Set(['bolwerk1', 'bolwerk3']);
const bourtangeAt = (key, label, o = {}) => mk(BOURTANGE)(key, label, BOURTANGE_RAUW.has(key) ? { snap: null, ...o } : o);
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
        { kind: 'goto', target: bourtangeAt('gracht', 'De gracht'), mode: 'foot', radius: 10, label: 'Naar de gracht van de vesting', say: 'Aanvallen. Eerst de gracht: Lammert zet de sluis open, Klaas vaart.' },
        { kind: 'scene', target: bourtangeAt('gracht', 'De gracht'), label: 'De gracht', kicker: 'De gracht van Bourtange', script: { ids: ['M30.2'] }, cast: [{ key: 'jelle', pose: 'hips', at: [3.4, 1.2] }] },
        { kind: 'goto', target: bourtangeAt('brug', 'De ophaalbrug'), mode: 'foot', radius: 7, label: 'Naar de ophaalbrug', say: 'Wubbo staat bij de lier. Hij opent een tel te vroeg.' },
        { kind: 'scene', target: bourtangeAt('brug', 'De ophaalbrug'), label: 'De ophaalbrug', kicker: 'De ophaalbrug', script: { ids: ['M30.3'] }, cast: [{ key: 'wubbo', pose: 'point', at: [2.6, 0.6] }, { key: 'berend', pose: 'arms', at: [3.4, -1.6] }] },
        { kind: 'goto', posten: 'bolwerken', target: bourtangeAt('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 9, label: 'Naar het eerste bolwerk, Roelfien strooit meel', say: 'Boven jullie komt meel. Hoofd omlaag, naar het eerste bolwerk.' },
        { kind: 'hold', posten: 'bolwerken', target: bourtangeAt('bolwerk1', 'Het eerste bolwerk'), mode: 'foot', radius: 9, time: 6, ticks: ['Een witte wolk. De vlag staat bijna.', 'Nog even.'], label: 'Plant de vlag op het eerste bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 0, to: 1, delay: 1.5 } },
        { kind: 'goto', posten: 'bolwerken', target: bourtangeAt('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 9, label: 'Naar het tweede bolwerk, Tammo en de duiven', say: 'Het tweede bolwerk. De duiven luisteren naar Tammo.' },
        { kind: 'hold', posten: 'bolwerken', target: bourtangeAt('bolwerk2', 'Het tweede bolwerk'), mode: 'foot', radius: 9, time: 6, ticks: ['Duiven op de hoeden. Er is een duif op een hoed.', 'Nog even.'], label: 'Plant de vlag op het tweede bolwerk', say: 'Blijf op het bolwerk staan tot de vlag staat.', talk: { ids: ['M30.4'], from: 1, to: 2, delay: 1.5 } },
        { kind: 'goto', posten: 'bolwerken', target: bourtangeAt('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 9, label: 'Naar het derde bolwerk, Tinus trekt de toren', say: 'Het derde bolwerk. Tinus trekt de toren, Durk en Douwe duwen het kanon om.' },
        { kind: 'hold', posten: 'bolwerken', target: bourtangeAt('bolwerk3', 'Het derde bolwerk'), mode: 'foot', radius: 9, time: 6, ticks: ['De toren leunt. Hij leunt goed.', 'Nog even.'], label: 'Plant de vlag op het derde bolwerk', say: 'Blijf op het bolwerk staan tot de laatste vlag staat.', talk: { ids: ['M30.4'], from: 2, delay: 1.5 } },
        { kind: 'goto', target: bourtangeAt('poort', 'De poort'), mode: 'foot', radius: 9, label: 'Naar de poort: Berend rijdt binnen', say: 'Drie vlaggen. Naar de poort, Berend wil binnenrijden.' },
        { kind: 'scene', target: bourtangeAt('poort', 'De poort'), label: 'De poort', kicker: 'De poort van Bourtange', script: { ids: ['M30.5'] }, cast: [{ key: 'berend', pose: 'arms', at: [3.2, 1.0] }, { key: 'jelle', pose: 'hips', at: [-3.4, -1.4] }] },
        { kind: 'goto', target: bourtangeAt('plein', 'De Fjord Frituur'), mode: 'foot', radius: 9, stop: 0.8, label: 'Naar de Fjord Frituur op het plein', say: 'De Fjord Frituur staat open. Iedereen eet eierballen op de wal.' },
      ],
    },
  ];
}

// --- AAA-upgrade van akte 6 (AAA-upgradeplan, M27 tot M30) ----------------------------------------------------------------
// Dezelfde bouwstenen als akte 4 en 5 (missions_akte45.js): een regelkaart per stap (regelkaart.js), een wachtfiguur bij het
// wachten (wachtprops.js), aankleding om het doel (missiedecor.js) en stings (`aaa: true`). Alleen data: stappen, ids, volgorde en
// beloning blijven zoals ze waren (saves), en niets kan hier mislukken of pijn doen (de serie is warm en stil).
//
// Samen spelen (M27 tot M30): een verhaalmissie is van wie het spel opende; een gast kiest bij Meedoen? (J of N, geen antwoord is
// nee). Regelkaart, wachtfiguur, aankleding en sting zijn lokaal beeld en geluid bij de speler die de stap draait: er gaat niets
// over het net en er wordt niets in beloning of voortgang geschreven (per speler, #429). Wie wegvalt of later aansluit mist alleen
// beeld; de stap blijft bij wie de missie opende (coopmissie.js).
const stap = (icoon, label) => ({ icoon, label });
const stappen = (label, klaar, lijst, extra = {}) => ({ type: 'stappen', inv: { label, klaar, stappen: lijst }, ...extra });
const teller = (label, rest, extra = {}) => ({ type: 'teller', inv: { rest, totaal: rest, label }, ...extra });
const wijzer = (label, afstand, tekst, extra = {}) => ({ type: 'wijzer', inv: { afstand, hoek: 0, label }, tekst, ...extra });

const INPAKKEN = [stap('pakje', 'Boeken in kleine dozen'), stap('pakje', 'Servies in de krant'), stap('hart', 'De kat in de mand')];
const BOLWERKEN = [stap('hand', 'Eerste bolwerk'), stap('hand', 'Tweede bolwerk'), stap('hand', 'Derde bolwerk')];

// Elke kaart heeft een doel en hoogstens drie regels; "afloop" zegt eerst wat er gebeurt (niets ergs: de serie is warm).
export const KAARTEN_AKTE6 = {
  M27: {
    boeken: { doel: 'Pak de boeken in kleine dozen', afloop: 'er is geen tijd en niets gaat stuk: blijf bij de kast staan',
      regels: [stappen('Inpakken', 0, INPAKKEN, { na: 5, duur: 9 }), teller('Boeken', 9, { na: 16, duur: 6 })] },
    servies: { doel: 'Pak het servies in de krant', afloop: 'niets gaat stuk, de krant doet het werk',
      regels: [stappen('Inpakken', 1, INPAKKEN, { na: 4, duur: 8 }), teller('Servies', 9, { na: 14, duur: 6 })] },
    kat: { doel: 'Zet de kat in de mand', afloop: 'de kat wil niet: blijf staan, dan lukt het vanzelf',
      regels: [stappen('Inpakken', 2, INPAKKEN, { na: 4, duur: 8 }), teller('De kat', 7, { na: 12, duur: 6 })] },
    bus: { doel: 'Draag de laatste doos naar de verhuisbus', afloop: 'dit is het laatste stuk, er volgt geen straf',
      regels: [wijzer('De verhuisbus', 36, 'De bus staat vlak voor het huis.', { na: 4, duur: 8 })] },
  },
  M28: {
    rit: { doel: 'Rij de verhuisbus rustig naar de wisselwoning', afloop: 'wordt de bus afgeschreven of laat je hem staan, dan begin je de rit opnieuw',
      regels: [stappen('De rit', 0, [stap('hand', 'Instappen'), stap('hart', 'Rustig rijden: voor Willemien'), stap('pijl', 'De wisselwoning')], { na: 5, duur: 9 }),
        wijzer('De wisselwoning', 320, 'De wisselwoning ligt aan de rand van het dorp.', { na: 16, duur: 8 })] },
  },
  M29: {
    erf: { doel: 'Zet de tafels op het erf', afloop: 'er is geen tijd en niets te verliezen: het is een feest',
      regels: [stappen('Het feest', 0, [stap('pakje', 'Tafels neerzetten'), stap('hart', 'Rondlopen op het feest'), stap('pijl', 'De foto in de gang')], { na: 5, duur: 9 }), teller('Tafels', 9, { na: 16, duur: 6 })] },
    gang: { doel: 'Loop naar de gang: daar hangt de foto', afloop: 'dit is het laatste stuk',
      regels: [wijzer('De gang', 40, 'Het huis staat aan de Hofstraat, vlak bij het erf.', { na: 4, duur: 8 })] },
  },
  M30: {
    gracht: { doel: 'Leid het proefbeleg: eerst de gracht, dan de ophaalbrug', afloop: 'niets kan misgaan: het is theater van karton, meel en duiven',
      regels: [stappen('Het proefbeleg', 0, [stap('pijl', 'Gracht en ophaalbrug'), stap('hand', 'Drie bolwerken, drie vlaggen'), stap('hart', 'De poort en de frituur')], { na: 6, duur: 9 })] },
    brug: { doel: 'Naar de ophaalbrug: Wubbo opent een tel te vroeg',
      regels: [wijzer('De ophaalbrug', 81, 'De ophaalbrug ligt bij de Friesche Poort.', { na: 5, duur: 8 })] },
    bolwerk1: { doel: 'Naar het eerste bolwerk: boven je komt meel', afloop: 'meel is zacht, het kost niets',
      regels: [stappen('Drie vlaggen', 0, BOLWERKEN, { na: 5, duur: 8 }), wijzer('Eerste bolwerk', 85, 'Hoofd omlaag, het bolwerk ligt aan de oostkant.', { na: 14, duur: 7 })] },
    vlag1: { doel: 'Plant de vlag op het eerste bolwerk',
      regels: [teller('Vlag', 6, { na: 2, duur: 7 })] },
    bolwerk2: { doel: 'Naar het tweede bolwerk: de duiven luisteren naar Tammo',
      regels: [stappen('Drie vlaggen', 1, BOLWERKEN, { na: 5, duur: 8 })] },
    vlag2: { doel: 'Plant de vlag op het tweede bolwerk',
      regels: [teller('Vlag', 6, { na: 2, duur: 7 })] },
    bolwerk3: { doel: 'Naar het derde bolwerk: Tinus trekt de toren',
      regels: [stappen('Drie vlaggen', 2, BOLWERKEN, { na: 5, duur: 8 })] },
    vlag3: { doel: 'Plant de vlag op het derde bolwerk',
      regels: [teller('Vlag', 6, { na: 2, duur: 7 })] },
    poort: { doel: 'Naar de poort: Berend rijdt binnen',
      regels: [wijzer('De poort', 182, 'Drie vlaggen staan. De poort ligt aan de zuidkant.', { na: 5, duur: 8 })] },
    plein: { doel: 'Naar de Fjord Frituur op het plein', afloop: 'dit is het laatste stuk: eierballen op de wal',
      regels: [wijzer('De Fjord Frituur', 96, 'De frituur staat op het Marktplein.', { na: 4, duur: 8 })] },
  },
};

// Wachtfiguren: wie er staat te wachten terwijl jij inpakt, het feest opbouwt of de vlag plant. Elke figuur kiest zijn kleren zelf
// (wachtprops.js); de prop zegt wat er naast hem staat.
export const WACHT_AKTE6 = {
  M27: { boeken: { figuur: true, prop: 'kist', seed: 0.14 }, servies: { figuur: true, prop: 'krant', seed: 0.38 }, kat: { figuur: true, prop: 'plant', seed: 0.66 } },
  M29: { erf: { figuur: true, prop: 'koffie', seed: 0.29 } },
  M30: { vlag1: { figuur: true, prop: 'ton', seed: 0.23 }, vlag2: { figuur: true, prop: 'bank', seed: 0.49 }, vlag3: { figuur: true, prop: 'kist', seed: 0.81 } },
};

// Aankleding (missiedecor.js, lokale maten: along is de looprichting van de speler, side naar rechts). De buren bij de wisselwoning,
// het buurtfeest op het erf, en het proefbeleg als lichte variant van de naspeling (M20): "waar niemand het ziet", dus een
// toeschouwer en wat karton, geen publiek. De props van het proefbeleg staan dicht bij de speler (hoogstens 6 m) zodat ze op de
// oever blijven en niet in de gracht.
export const PLAN_WISSELWONING = {
  props: [
    { kind: 'kist', along: 4.5, side: 3.6, a: 0.3 },
    { kind: 'kist', along: 5.4, side: 4.4, a: -0.4 },
    { kind: 'bank', along: 6, side: -4.5, a: 0.2 },
    { kind: 'banner', along: 9, side: 0, a: 0, title: 'WISSELWONING', sub: 'Pruimenhof: voorlopig thuis' },
  ],
  people: [
    { look: { shirt: 0x5c6f8a, skin: 0xf1c9a5, seed: 8801, variant: 'female', hairStyle: 'bun', extra: { age: 'old' } }, along: 5, side: -1.6, a: Math.PI, anim: 'wave' },
    { look: { shirt: 0x6a4a2a, skin: 0xd9a06e, seed: 8802, variant: 'male' }, along: 6.5, side: 2.2, a: Math.PI, anim: 'wave' },
    { look: { shirt: 0x3f8a52, skin: 0xa9744a, seed: 8803, variant: 'female' }, along: 7.2, side: -3.2, a: Math.PI, anim: 'talk' },
    { look: { shirt: 0xc8552e, skin: 0xf1c9a5, seed: 8804, variant: 'male' }, along: 4, side: 5.6, a: -1.2, anim: 'idle' },
  ],
};
export const PLAN_ERF = {
  props: [
    { kind: 'jurytafel', along: 6, side: -3, a: Math.PI },
    { kind: 'jurytafel', along: 7.6, side: 3.6, a: Math.PI },
    { kind: 'bank', along: 4.5, side: -7, a: 1.4 },
    { kind: 'vaandel', along: 9, side: -7, a: 0 },
    { kind: 'vaandel', along: 9, side: 7, a: 0 },
    { kind: 'banner', along: 12, side: 0, a: 0, title: 'WELKOM THUIS, WILLEMIEN', sub: 'Het buurtfeest op het erf' },
  ],
  people: [
    { look: { shirt: 0x5c6f8a, skin: 0xf1c9a5, seed: 8811, variant: 'female', hairStyle: 'bun', extra: { age: 'old' } }, along: 5.2, side: 0.4, a: Math.PI, anim: 'cheer' },
    { look: { shirt: 0x3f8a52, skin: 0xa9744a, seed: 8812, variant: 'female' }, along: 6.4, side: -5.2, a: 1.2, anim: 'talk' },
    { look: { shirt: 0x6a4a2a, skin: 0xd9a06e, seed: 8813, variant: 'male' }, along: 7, side: 5.6, a: -1.3, anim: 'point' },
  ],
  crowd: { shape: 'ring', x: 8, y: 0, radius: 7, depth: 2.5, count: 10, gapA: Math.PI, gapW: 1.0 },
};
export const PLAN_PROEFBELEG = {
  props: [
    { kind: 'kist', along: 4.5, side: 4, a: 0.4 },
    { kind: 'ton', along: 5.2, side: 4.9, a: 0 },
    { kind: 'vaandel', along: 6, side: -4.2, a: 0 },
    { kind: 'banner', along: 8, side: 0, a: 0, title: 'PROEFBELEG', sub: 'Karton, meel en duiven' },
  ],
  people: [
    { look: { shirt: 0x7a3a2a, skin: 0xd9a06e, seed: 8821, variant: 'male' }, along: 5.6, side: 3, a: -0.6, anim: 'cheer' },
  ],
};
export const PLANNEN_AKTE6 = { wisselwoning: PLAN_WISSELWONING, erf: PLAN_ERF, proefbeleg: PLAN_PROEFBELEG };
for (const [kind, plan] of Object.entries(PLANNEN_AKTE6)) registreerAankleding(kind, plan);

// Zet de aankleding van akte 6 op de defs. `list` is de lijst van missions.js (na applyNieuw); een missie of stap die er niet
// (meer) is, wordt overgeslagen.
export function applyAkte6(list) {
  const by = (label) => list.find((d) => d.label === label);
  const vind = (def, soort, re, nr = 0) => (def && Array.isArray(def.stages) ? def.stages.filter((s) => s && s.kind === soort && re.test(s.label || ''))[nr] : null) || null;
  const zet = (s, veld) => { if (s) Object.assign(s, veld); return !!s; };
  const K = KAARTEN_AKTE6, W = WACHT_AKTE6;

  // M27 Inpakken: een kaart en een wachtfiguur bij elke inpakstap (de kat, het servies in de krant). Een binnenset `woonkamer`
  // is niet gebouwd: het blijft buiten bij het huis.
  const m27 = by('Inpakken');
  if (m27 && m27.stages) {
    m27.aaa = true;
    zet(vind(m27, 'hold', /boeken in kleine dozen/), { kaart: K.M27.boeken, wacht: { ...W.M27.boeken } });
    zet(vind(m27, 'hold', /servies in de krant/), { kaart: K.M27.servies, wacht: { ...W.M27.servies } });
    zet(vind(m27, 'hold', /kat in de mand/), { kaart: K.M27.kat, wacht: { ...W.M27.kat } });
    zet(vind(m27, 'goto', /verhuisbus/), { kaart: K.M27.bus });
  }

  // M28 De wisselwoning: een kaart bij de rit en de buren die bij de wisselwoning staan te zwaaien.
  const m28 = by('De wisselwoning');
  if (m28 && m28.stages) {
    m28.aaa = true;
    zet(vind(m28, 'goto', /wisselwoning/), { kaart: K.M28.rit, dressing: 'wisselwoning' });
  }

  // M29 Terug: het erf met tafels en buren, Willemien zelf, en een wachtfiguur met koffie bij het opzetten.
  const m29 = by('Terug');
  if (m29 && m29.stages) {
    m29.aaa = true;
    zet(vind(m29, 'hold', /tafels op het erf/), { kaart: K.M29.erf, wacht: { ...W.M29.erf }, dressing: 'erf' });
    zet(vind(m29, 'scene', /buurtfeest/i), { dressing: 'erf' });
    zet(vind(m29, 'goto', /gang/), { kaart: K.M29.gang });
  }

  // M30 Het proefbeleg: de lichte variant van de naspeling, een kaart per soort stap en een wachtfiguur bij elke vlag.
  const m30 = by('Het proefbeleg');
  if (m30 && m30.stages) {
    m30.aaa = true;
    const lichter = (s) => zet(s, { dressing: 'proefbeleg' });
    zet(vind(m30, 'goto', /gracht van de vesting/), { kaart: K.M30.gracht });
    zet(vind(m30, 'goto', /ophaalbrug/), { kaart: K.M30.brug });
    zet(vind(m30, 'goto', /eerste bolwerk/), { kaart: K.M30.bolwerk1 });
    lichter(vind(m30, 'hold', /vlag op het eerste/));
    zet(vind(m30, 'hold', /vlag op het eerste/), { kaart: K.M30.vlag1, wacht: { ...W.M30.vlag1 } });
    zet(vind(m30, 'goto', /tweede bolwerk/), { kaart: K.M30.bolwerk2 });
    lichter(vind(m30, 'hold', /vlag op het tweede/));
    zet(vind(m30, 'hold', /vlag op het tweede/), { kaart: K.M30.vlag2, wacht: { ...W.M30.vlag2 } });
    zet(vind(m30, 'goto', /derde bolwerk/), { kaart: K.M30.bolwerk3 });
    lichter(vind(m30, 'hold', /vlag op het derde/));
    zet(vind(m30, 'hold', /vlag op het derde/), { kaart: K.M30.vlag3, wacht: { ...W.M30.vlag3 } });
    zet(vind(m30, 'goto', /poort: Berend/), { kaart: K.M30.poort });
    zet(vind(m30, 'goto', /Fjord Frituur/), { kaart: K.M30.plein });
    for (const re of [/^De gracht$/, /^De ophaalbrug$/, /^De poort$/]) lichter(vind(m30, 'scene', re));
  }
}
