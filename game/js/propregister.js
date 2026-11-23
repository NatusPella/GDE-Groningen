// Het ene register van de gedeelde props (23-11): wat in de wereld op straat staat en wat een cutscene als decor
// neerzet komt uit dezelfde bouwer, geregistreerd hier met een korte kwaliteitsnorm. Puur (geen three): de test
// scripts/propregister_test.mjs bouwt elke prop en houdt hem aan zijn norm; docs/AAA-OBJECTEN-23-11.md legt uit waarom.
//
// Een nieuwe prop komt hier in, met:
//   bouwer  de sleutel in propmodels3d.js (propGeometry(id)): één vertexkleur-geometrie, oorsprong op de grond, +x voorkant
//   norm    tris [min, max] driehoeken, kleuren (minimaal aantal verschillende vertexkleuren), maat [b, h, d] in m (+- 25 %),
//           en `eisen`: wat er aan detail aan moet zitten, zodat een kale doos of cilinder de test niet haalt
//   gebruik waar hij staat: 'stad' (cityprops.js), 'buiten' (streetfurniture3d.js), 'cutscene' (storyprops.js DECOR_MAKERS)
// Kwaliteitsnorm voor iedere prop: zichtbaar materiaalverschil (hout tegen staal, glas tegen kader), echte onderdelen
// (voet, rand, bevestiging) in plaats van één primitief, en een driehoekenbudget dat per cel samen te voegen of te instancen blijft.

import { LOD_KINDS } from './lodregistry.js';

export const PROP_REGISTER = {
  bank: {
    nl: 'Parkbank', bouwer: 'bank', gebruik: ['stad', 'buiten', 'cutscene'],
    norm: { tris: [200, 480], kleuren: 6, maat: [0.73, 0.96, 1.7], eisen: ['vier zitlatten met een eigen tint', 'drie hellende rugleuninglatten', 'gietijzeren zijstukken met armleuning en voetplaat', 'schroefkopjes'] },
  },
  afvalbak: {
    nl: 'Afvalbak', bouwer: 'afvalbak', gebruik: ['stad', 'cutscene'],
    norm: { tris: [180, 420], kleuren: 6, maat: [0.61, 1.0, 0.54], eisen: ['verjongde romp met banden', 'deksel met bolle kap en asbakje', 'donkere inworpklep met omlijsting', 'paal met beugels en voetplaat'] },
  },
  fietsenrek: {
    nl: 'Fietsenrek', bouwer: 'fietsenrek', gebruik: ['stad', 'cutscene'],
    norm: { tris: [200, 560], kleuren: 4, maat: [0.13, 0.47, 2.9], eisen: ['twee leggers', 'beugels met dop en voetje', 'grondplaat', 'wielgeleiders tussen de beugels'] },
  },
  bushokje: {
    nl: 'Bushokje', bouwer: 'bushokje', gebruik: ['buiten', 'cutscene'],
    norm: { tris: [380, 900], kleuren: 9, maat: [4.14, 2.76, 1.76], eisen: ['dak met rand en goot', 'glazen wanden in lijsten met een lichter weerspiegelvlak', 'zitbank', 'lichtbak met lijnkaart', 'haltepaal met rond bord en dienstregelingkastje'] },
  },
  paaltje: {
    nl: 'Paaltje', bouwer: 'paaltje', gebruik: ['buiten', 'cutscene'],
    norm: { tris: [100, 260], kleuren: 4, maat: [0.23, 0.92, 0.23], eisen: ['rode romp met twee witte reflectiebanden', 'bolle kop', 'voetkraag'] },
  },
};

export const PROP_IDS = Object.keys(PROP_REGISTER);
export const propNorm = (id) => (PROP_REGISTER[id] ? PROP_REGISTER[id].norm : null);
export const isRegisteredProp = (id) => Object.prototype.hasOwnProperty.call(PROP_REGISTER, id);
// De soorten die een cutscene als decor mag noemen en uit dit register komen (cutscenemodels.js DECOR_KINDS neemt ze over).
export const CUTSCENE_PROPS = PROP_IDS.filter((id) => PROP_REGISTER[id].gebruik.includes('cutscene'));

// De opgewaardeerde voertuigen staan in het voertuigregister (vehicle.js, vehicleregister.js); hier hun kwaliteitsnorm, zodat de
// lat voor een voertuig op dezelfde plek staat als die voor een prop. tris: driehoeken van het hele gebouwde model (romp en
// wielen), kleuren: verschillende vertexkleuren in de romp. propregister_test.mjs bouwt ze met buildVehicleMesh.
// De norm voor een personenauto (eigenaar 23-11): lengte 4,2-4,8 m, breedte 1,75-1,85, hoogte 1,40-1,50 (SUV 1,65-1,75), wielbasis
// 2,6-2,8, wieldiameter rond 0,65; een volwassene van 1,78 m past erin (hoofd onder het dak, een deuropening van minstens 0,95 m).
// De LOD-opgave van alle voertuigmodellen komt uit het centrale LOD-register (lodregistry.js, soort 'vehicle'): één systeem.
export const VOERTUIG_LOD = LOD_KINDS.vehicle.lod;
export const VOERTUIG_NORM = { len: [4.2, 4.8], wid: [1.75, 1.85], hoog: [1.4, 1.5], hoogSuv: [1.65, 1.75], wielbasis: [2.6, 2.8], wielDiameter: [0.58, 0.75], deurHoogte: 0.95, persoon: 1.78 };
const HYB_NORM = { tris: [1800, 6500], kleuren: 7, eisen: ['carrosserie uit het CC0-pakket, in lakkleur van het voertuig', 'echt gat in de flank met de uitgeknipte romp als deur (dikte, binnenkant), deurstijlen en dorpel', 'eenvoudig interieur achter de opening', 'onze wielen die draaien en sturen', 'koplampen en achterlichten in de lampgroep, schade met losse delen en hangende bumpers'] };
// de getekende maat van een hybride (null als het geen hybride is)
export const hybrideSchaal = (key) => { for (const e of Object.values(VOERTUIG_REGISTER)) if (e.hybride === key) return e.schaal; return null; };

export const VOERTUIG_REGISTER = {
  trekkerlimo: {
    nl: 'Trekker-limo van Jelle', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' },
    norm: { tris: [4000, 9000], kleuren: 20, eisen: ['trekkerkop met grille, ronde koplampen en noppenbanden', 'limousine met wielkasten, C-stijl, schuine achterruit en afgerond dak met schuifdak', 'kofferdeksel in lak met chromen strip, geel kenteken zonder tekens', 'conferentie-interieur met barkastje', 'deurnaden, sturende voorwielen, hoogglanslak'] },
  },
  truck: {
    nl: 'Bakwagen', model: { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' },
    norm: { tris: [1500, 4000], kleuren: 10, eisen: ['laadbak met ribbels, aluminium randen en hoekstijlen', 'achterdeuren met scharnieren, sluitstangen en hendels', 'onderrijbeveiliging achter en opzij', 'cabinedeuren met naad'] },
  },
  // De hybride auto's (23-11): de Quaternius-romp (CC0) met onze functies. `schaal` is de getekende maat in meter (lengte, breedte,
  // hoogte van de romp zonder daklicht of taxibord); de romp wordt daarop geschaald (zie VOERTUIG_NORM en voertuigschaal_test.mjs).
  hybrideSedan: { nl: 'Sedan (hybride)', model: { name: 'sedan', len: 4.3, wid: 1.8, color: '#90b0d1' }, hybride: 'sedan', schaal: { len: 4.5, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
  hybrideHatch: { nl: 'Hatchback (hybride)', model: { name: 'hatch', len: 3.8, wid: 1.7, color: '#5a7392' }, hybride: 'hatch', schaal: { len: 4.33, wid: 1.78, hoog: 1.45 }, norm: HYB_NORM },
  hybrideSuv: { nl: 'SUV (hybride)', model: { name: 'suv', len: 4.7, wid: 1.95, color: '#23262a' }, hybride: 'suv', schaal: { len: 4.55, wid: 1.85, hoog: 1.7 }, norm: HYB_NORM },
  hybrideSport: { nl: 'Sportauto (hybride)', model: { name: 'sport', len: 4.1, wid: 1.85, color: '#b93a32', qcar: 'sport' }, hybride: 'sport', schaal: { len: 4.25, wid: 1.82, hoog: 1.42 }, norm: HYB_NORM },
  hybrideSport2: { nl: 'Sportauto 2 (hybride)', model: { name: 'sport', len: 4.1, wid: 1.85, color: '#e8e6e0', qcar: 'sport2' }, hybride: 'sport2', schaal: { len: 4.25, wid: 1.82, hoog: 1.42 }, norm: HYB_NORM },
  hybrideTaxi: { nl: 'Taxi (hybride)', model: { name: 'taxi', len: 4.6, wid: 1.8, color: '#e8c93a' }, isTaxi: true, hybride: 'taxi', schaal: { len: 4.5, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
  hybridePolitie: { nl: 'Politieauto (hybride)', model: { name: 'police', len: 4.3, wid: 1.8, color: '#1c1c1c' }, isPolice: true, hybride: 'police', schaal: { len: 4.3, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
};
export const VOERTUIG_IDS = Object.keys(VOERTUIG_REGISTER);
