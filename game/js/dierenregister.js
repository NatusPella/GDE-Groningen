// Het dierenregister (#193): één definitie per dier. Alles wat het spel over een dier weet
// staat hier: welk model het heeft, waar en wanneer het voorkomt, hoe je het ontdekt
// (dierenboek), of je het kunt kopen of houden en hoe je het verzorgt of uitrust.
// Pure data en regels, Node-safe. wildlife.js, countryside.js, de cutscenes, het dierenboek
// en de dierenhoek van de winkel lezen dit register; scripts/dierenregister_test.mjs
// controleert dat elk dier spawnt, te ontdekken is en een echt model heeft.
//
// Een nieuw dier hoort eerst hier en pas daarna in de wereld.
import { STREEK_MIX, SPECIES, gansKans } from './dierenplan.js';

// soort: 'wild' | 'vee' | 'huisdier'. plan: de sleutel in dierenplan.SPECIES (streekmix en vluchtgedrag),
// of eigen `mix`. uren: [van, tot) op de 24-uursklok (van > tot loopt door middernacht).
// biotoop: weide | dijk | water | kust | wad | stad | erf. model: welke bouwfunctie het mesh maakt.
// kopen: null (dan staat `reden` waarom niet) of { prijs, houden: 'erf' | 'huis' | 'vijver' | 'duiventil' }.
// upgrades: verzorgen, trainen en accessoires met prijs; effect is een korte tekst voor de speler.
// cutscene: de prop-soort die cutscenes voor dit dier gebruiken (of null).
// maat: de echte maat in meters waar het model op geschaald is (schoft: schofthoogte, hoogte: staand, lengte: neus tot staart;
// een paar [min, max] voor een soort met rassen). scripts/dierschaal_test.mjs meet elk model en faalt bij meer dan 15% verschil;
// de geimporteerde dieren schaalt scripts/dieren_converteer.mjs hierop.
export const DIEREN = [
  {
    id: 'koe', naam: 'Koe', soort: 'vee', kind: 'cow', plan: 'koe', biotoop: ['weide'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildCowMesh3D', args: [1, false] },
    maat: { schoft: 1.4 },
    boek: 'Zwartbont en tevreden. Een koe kijkt naar je alsof jij de vreemde bent.',
    kopen: { prijs: 450, houden: 'erf' }, cutscene: 'koe',
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 25, effect: 'Een tevreden koe geeft meer melk' },
      { id: 'koebel', label: 'Koebel', prijs: 15, effect: 'Je hoort haar over het erf' },
    ],
  },
  {
    id: 'schaap', naam: 'Schaap', soort: 'vee', kind: 'sheep', plan: 'schaap', biotoop: ['dijk', 'weide'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildSheepMesh3D', args: [] },
    maat: { schoft: 0.7 },
    boek: 'Houdt de dijk kort en heeft overal een mening over.',
    kopen: { prijs: 220, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 18, effect: 'Dikkere wol' },
      { id: 'scheren', label: 'Laten scheren', prijs: 12, effect: 'Wol om te verkopen' },
    ],
  },
  {
    id: 'paard', naam: 'Paard', soort: 'vee', kind: 'horse', alias: ['horse'], biotoop: ['weide'], uren: [6, 22],
    mix: { westerkwartier: 1.2, westerwolde: 0.8, hunsingo: 0.4, hogeland: 0.3, oldambt: 0.3, veenkolonien: 0.3, lauwerskust: 0.3 },
    model: { module: 'countryside', fn: 'buildHorseMesh', args: [0] },
    maat: { schoft: 1.6 },
    boek: 'Staat in de wei met een deken om, ook als het zomer is. Dat hoort zo.',
    kopen: { prijs: 900, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 40, effect: 'Glanzende vacht' },
      { id: 'zadel', label: 'Zadel', prijs: 120, effect: 'Klaar om op te rijden' },
    ],
  },
  {
    id: 'gans', naam: 'Gans', soort: 'vee', kind: 'gans', alias: ['goose'], plan: 'gans', biotoop: ['weide'], uren: [5, 22],
    model: { module: 'wildlife', fn: 'buildGooseMesh3D', args: [] },
    maat: { hoogte: 0.8 },
    boek: 'Grazende kudde. Ze vinden zichzelf eigenlijk de baas van het weiland.',
    kopen: { prijs: 60, houden: 'erf' }, cutscene: null,
    upgrades: [{ id: 'verzorgen', label: 'Verzorgen', prijs: 8, effect: 'Een waakzame gans' }],
  },
  {
    id: 'eend', naam: 'Eend', soort: 'vee', kind: 'duck', plan: 'eend', biotoop: ['water'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['drake'] },
    maat: { lengte: 0.45 },
    boek: 'Dobbert door de gracht en duikt voor een stukje brood.',
    kopen: { prijs: 25, houden: 'vijver' }, cutscene: null,
    upgrades: [{ id: 'verzorgen', label: 'Verzorgen', prijs: 5, effect: 'Een eend die niet meer wegzwemt' }],
  },
  {
    id: 'zwaan', naam: 'Zwaan', soort: 'wild', kind: 'duck', variant: 'swan', biotoop: ['water'], uren: [6, 22],
    mix: { stad: 0.4, westerkwartier: 0.6, westerwolde: 0.8, veenkolonien: 0.6, lauwerskust: 0.4, hunsingo: 0.2 },
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['swan'] },
    maat: { lengte: 1.5 },
    boek: 'Wit, statig en niet geneigd tot buigen. Beter niet te dichtbij komen.',
    kopen: null, reden: 'Zwanen zijn van niemand en blijven op het water.', cutscene: null, upgrades: [],
  },
  {
    id: 'meeuw', naam: 'Meeuw', soort: 'wild', kind: 'seagull', plan: 'meeuw', biotoop: ['kust', 'water', 'stad'], uren: [5, 22],
    model: { module: 'wildlife', fn: 'buildSeagullMesh3D', args: [] },
    maat: { lengte: 0.6 },
    boek: 'Heeft altijd honger en neemt je friet als je niet oplet.',
    kopen: null, reden: 'Een meeuw laat zich niet houden; hij komt vanzelf terug voor je friet.', cutscene: null, upgrades: [],
  },
  {
    id: 'reiger', naam: 'Blauwe reiger', soort: 'wild', kind: 'reiger', plan: 'reiger', biotoop: ['water'], uren: [4, 21],
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['reiger'] },
    maat: { hoogte: 1.0 },
    boek: 'Staat uren stil aan de waterkant. Zodra je beweegt, is hij weg.',
    kopen: null, reden: 'Een reiger blijft liever bij zijn eigen sloot.', cutscene: null, upgrades: [],
  },
  {
    id: 'vis', naam: 'Vis', soort: 'wild', kind: 'vis', plan: 'vis', biotoop: ['water'], uren: [0, 24],
    model: { module: 'wildlife', fn: 'buildCanalFishMesh3D', args: [0] },
    maat: { lengte: 0.3 },
    boek: 'Een zilveren flits onder het wateroppervlak.',
    kopen: { prijs: 15, houden: 'vijver' }, cutscene: null,
    upgrades: [{ id: 'voer', label: 'Visvoer', prijs: 4, effect: 'Ze komen naar het oppervlak' }],
  },
  {
    id: 'zeehond', naam: 'Zeehond', soort: 'wild', kind: 'zeehond', plan: 'zeehond', biotoop: ['kust', 'wad'], uren: [5, 21],
    model: { module: 'wildlife', fn: 'buildSealMesh3D', args: [] },
    maat: { lengte: 1.6 },
    boek: 'Ligt te zonnen op de rand van het wad. Duikt weg zodra je te dichtbij komt.',
    kopen: null, reden: 'Zeehonden zijn beschermd: kijk ze vanaf een afstand.', cutscene: null, upgrades: [],
  },
  {
    id: 'duif', naam: 'Duif', soort: 'huisdier', kind: 'pigeon', biotoop: ['stad', 'erf'], uren: [5, 22],
    mix: { stad: 1, eemsdelta: 0.6, veenkolonien: 0.5, oldambt: 0.5, westerkwartier: 0.4, hogeland: 0.2, westerwolde: 0.4, lauwerskust: 0.2, hunsingo: 0.3 },
    model: { module: 'wildlife', fn: 'buildPigeonMesh3D', args: [0] },
    maat: { lengte: 0.36 },
    boek: 'Overal waar een bankje staat, staat er ook een duif.',
    kopen: { prijs: 35, houden: 'duiventil' }, cutscene: 'duif',
    upgrades: [
      { id: 'trainen', label: 'Trainen', prijs: 30, effect: 'Vindt altijd de weg terug' },
      { id: 'ring', label: 'Ringetje', prijs: 6, effect: 'Een kleurig ringetje om de poot' },
    ],
  },
  {
    id: 'kat', naam: 'Kat', soort: 'huisdier', kind: 'cat', biotoop: ['stad', 'erf'], uren: [16, 9],
    mix: { stad: 1, eemsdelta: 0.7, veenkolonien: 0.6, oldambt: 0.6, westerkwartier: 0.6, hogeland: 0.5, westerwolde: 0.6, lauwerskust: 0.4, hunsingo: 0.5 },
    model: { module: 'wildlife', fn: 'buildCatMesh3D', args: [0] },
    maat: { schoft: 0.25 },
    boek: 'Is zelden ver weg en laat nooit blijken dat ze je kent.',
    kopen: { prijs: 80, houden: 'huis' }, cutscene: 'kat',
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 12, effect: 'Spint luider' },
      { id: 'belletje', label: 'Belletje', prijs: 5, effect: 'Je hoort haar aankomen' },
    ],
  },
  {
    id: 'hond', naam: 'Hond', soort: 'huisdier', kind: 'dog', biotoop: ['stad', 'erf'], uren: [7, 21],
    mix: { stad: 1, eemsdelta: 0.6, veenkolonien: 0.6, oldambt: 0.6, westerkwartier: 0.7, hogeland: 0.5, westerwolde: 0.7, lauwerskust: 0.4, hunsingo: 0.5 },
    model: { module: 'wildlife', fn: 'buildDogMesh3D', args: [0, 0] },
    maat: { schoft: [0.3, 0.7] },
    boek: 'Gaat uit wandelen met een baasje aan de lijn. Of andersom.',
    kopen: { prijs: 180, houden: 'huis' }, cutscene: null,
    upgrades: [
      { id: 'trainen', label: 'Trainen', prijs: 60, effect: 'Komt als je fluit' },
      { id: 'halsband', label: 'Halsband', prijs: 14, effect: 'Een felle halsband' },
    ],
  },
  // De provinciedieren (23-11): modellen en animaties van Quaternius (CC0), omgezet door scripts/dieren_converteer.mjs en
  // geladen door animalmodels.js; gedrag in provinceanimals.js. Ree en vos op de akkerranden, de wolf zeldzaam in de
  // grensstreek, ezel, alpaca en varken op een erf aan de dorpsrand (een hobbyboer of kinderboerderij).
  {
    id: 'ree', naam: 'Ree', soort: 'wild', kind: 'ree', plan: 'ree', biotoop: ['weide'], uren: [4, 23],
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['ree'] },
    maat: { schoft: 0.75 },
    boek: 'Staat in de schemer aan de rand van de akker. Eén stap te veel en je ziet alleen nog een witte spiegel.',
    kopen: null, reden: 'Een ree is wild: kijk vanaf de weg en laat haar grazen.', cutscene: null, upgrades: [],
  },
  {
    id: 'haas', naam: 'Haas', soort: 'wild', kind: 'haas', plan: 'haas', biotoop: ['weide'], uren: [4, 23],
    model: { module: 'wildlife', fn: 'buildHareMesh3D', args: [0] },
    maat: { schoft: 0.3 },
    boek: 'Zit als een kluit aarde in de akker tot je te dichtbij komt. Dan zie je alleen nog lange oren en een wit staartje.',
    kopen: null, reden: 'Een haas is wild en snel: kijk en laat hem gaan.', cutscene: null, upgrades: [],
  },
  {
    id: 'vos', naam: 'Vos', soort: 'wild', kind: 'vos', plan: 'vos', biotoop: ['weide'], uren: [17, 9],
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['vos'] },
    maat: { schoft: 0.4 },
    boek: 'Draaft langs de sloot alsof hij overal te laat voor is. Ruikt de kippen al van verre.',
    kopen: null, reden: 'Een vos laat zich niet houden, en de kippen van de buren zijn je dankbaar.', cutscene: null, upgrades: [],
  },
  {
    id: 'wolf', naam: 'Wolf', soort: 'wild', kind: 'wolf', plan: 'wolf', biotoop: ['weide'], uren: [20, 7],
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['wolf'] },
    maat: { schoft: 0.8 },
    boek: 'Zeldzaam en echt gevaarlijk. Eerst zie je sporen en hoor je gehuil; kom je te dichtbij, dan valt hij aan. Maak lawaai en houd afstand.',
    kopen: null, reden: 'Een wolf is wild en beschermd. Houd afstand en laat hem gaan.', cutscene: null, upgrades: [],
  },
  {
    id: 'ezel', naam: 'Ezel', soort: 'vee', kind: 'ezel', biotoop: ['erf', 'weide'], uren: [6, 22],
    mix: { westerkwartier: 0.6, westerwolde: 0.6, hogeland: 0.4, hunsingo: 0.4, oldambt: 0.4, veenkolonien: 0.5, eemsdelta: 0.3, lauwerskust: 0.3 },
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['ezel'] },
    maat: { schoft: 1.2 },
    boek: 'Staat bij het hek van de kinderboerderij en balkt precies als je denkt dat het stil is.',
    kopen: { prijs: 350, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 20, effect: 'Een tevreden ezel balkt minder' },
      { id: 'halster', label: 'Halster', prijs: 18, effect: 'Loopt mee aan een touw' },
    ],
  },
  {
    id: 'alpaca', naam: 'Alpaca', soort: 'vee', kind: 'alpaca', biotoop: ['erf', 'weide'], uren: [6, 22],
    mix: { westerkwartier: 0.5, westerwolde: 0.5, hogeland: 0.3, hunsingo: 0.3, oldambt: 0.4, veenkolonien: 0.4, eemsdelta: 0.2 },
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['alpaca'] },
    maat: { schoft: 0.9 },
    boek: 'Een hobbydier met een lange nek en een eigen mening. Kijkt je aan alsof jij de rare bent.',
    kopen: { prijs: 600, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 25, effect: 'Zachte wol om te verkopen' },
      { id: 'scheren', label: 'Laten scheren', prijs: 30, effect: 'Een zomerse coupe' },
    ],
  },
  {
    id: 'varken', naam: 'Varken', soort: 'vee', kind: 'varken', biotoop: ['erf', 'weide'], uren: [6, 22],
    mix: { veenkolonien: 0.6, oldambt: 0.5, westerkwartier: 0.4, hogeland: 0.4, hunsingo: 0.4, westerwolde: 0.4, eemsdelta: 0.3 },
    model: { module: 'wildlife', fn: 'buildProvinceAnimalMesh3D', args: ['varken'] },
    maat: { schoft: 0.9 },
    boek: 'Ligt in de modder op een erf aan de rand van het dorp en knort tevreden als je langsloopt.',
    kopen: { prijs: 180, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 12, effect: 'Een schoon en tevreden varken' },
      { id: 'modderbad', label: 'Modderbad', prijs: 20, effect: 'Ligt de hele dag te genieten' },
    ],
  },
];

export const DIER_IDS = DIEREN.map((d) => d.id);
export const dierById = (id) => DIEREN.find((d) => d.id === id) || null;
export const dierVanKind = (kind, variant = null) => {
  if (kind === 'duck' && variant === 'goose') return dierById('gans');
  const op = (d) => d.kind === kind || (d.alias || []).includes(kind);
  return DIEREN.find((d) => op(d) && d.variant && d.variant === variant) || DIEREN.find((d) => op(d) && !d.variant) || null;
};
export const SOORTEN = ['wild', 'vee', 'huisdier'];
export const HOUDEN = ['erf', 'huis', 'vijver', 'duiventil'];

// Mix per streek: de eigen `mix`, anders die van het dierenplan.
export function mixVan(dier, streek) {
  if (dier.mix) return dier.mix[streek] ?? 0;
  const plan = STREEK_MIX[streek] || STREEK_MIX.stad;
  return plan[dier.plan] || 0;
}

// Is het dier op dit uur actief? uren: [van, tot).
export function opUur(dier, uur) {
  const [a, b] = dier.uren;
  const h = ((uur % 24) + 24) % 24;
  return a <= b ? h >= a && h < b : h >= a || h < b;
}

// Kans-gewicht om hier te spawnen: streek x uur x biotoop (0 als het biotoop niet bij het dier past).
export function spawnWeight(id, streek, uur, biotoop = null) {
  const d = dierById(id);
  if (!d) return 0;
  if (biotoop && !d.biotoop.includes(biotoop)) return 0;
  if (!opUur(d, uur)) return 0;
  return mixVan(d, streek);
}

// Boerderijdieren (#330): koe, schaap en gans staan op weide en dijk, nooit in de bebouwde kom.
// biotoop van een groenvlak: 'stad' als er in de buurt veel bebouwing staat (of de streek 'stad'
// is), anders 'weide'. De stad heeft eenden, meeuwen, duiven, katten en honden; vee hoort daar niet.
export const BOERDERIJ_IDS = ['koe', 'schaap', 'gans'];
export const BEBOUWD_VANAF = 0.3;   // urbanWeight (provinceworld.js) waarboven een plek bebouwd heet
// urban: urbanWeight (provinceworld.js) rond de plek; kom: ligt de plek in de bebouwde kom van een plaats (worldplaces.js inBebouwdeKom)
export const biotoopVanPlek = (streek, urban, kom = false) => (!streek || streek === 'stad' || kom || urban > BEBOUWD_VANAF ? 'stad' : 'weide');

// Welk vee mag hier op een nieuwe weide? roll: 0..1. Geeft 'cow' | 'sheep' | 'gans' of null (niets).
export function veeVoorPlek(streek, biotoop, uur, roll) {
  const w = (id) => spawnWeight(id, streek, uur, biotoop);
  const koe = w('koe'), schaap = w('schaap');
  const ganzen = biotoop === 'stad' || w('gans') <= 0 ? 0 : gansKans(streek);
  if (koe + schaap + ganzen <= 0) return null;
  if (roll < ganzen) return 'gans';
  const r = (roll - ganzen) / (1 - ganzen || 1);
  if (koe + schaap <= 0) return null;
  return r < koe / (koe + schaap) ? 'cow' : 'sheep';
}

export const STREKEN_ALLE = Object.keys(STREEK_MIX);

// De dieren die ergens in deze streek op dit uur (en biotoop) kunnen voorkomen, zwaarste eerst.
export function dierenHier(streek, uur, biotoop = null) {
  return DIEREN.map((d) => ({ id: d.id, w: spawnWeight(d.id, streek, uur, biotoop) })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w);
}

// Dierenboek (#193): wat je ziet, schrijf je op. Een dier telt als ontdekt zodra je binnen
// ONTDEK_M van een levend exemplaar bent (de wereld roept ontdek() aan).
export const ONTDEK_M = 9;
export const SET_DIEREN = 'dierenboek';
export const DIEREN_TOTAL = DIEREN.length;

export function boekRegel(id, ontdekt) {
  const d = dierById(id);
  if (!d) return null;
  if (!ontdekt) return { id, naam: '???', tekst: 'Nog niet gezien.', soort: null };
  return { id, naam: d.naam, tekst: d.boek, soort: d.soort, kopen: d.kopen ? d.kopen.prijs : null, reden: d.reden || null };
}

// Vluchtgedrag blijft in dierenplan.SPECIES; dit zegt of het register een plan-soort kent.
export const planBestaat = (d) => !d.plan || !!SPECIES[d.plan];
