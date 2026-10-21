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
export const DIEREN = [
  {
    id: 'koe', naam: 'Koe', soort: 'vee', kind: 'cow', plan: 'koe', biotoop: ['weide'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildCowMesh3D', args: [1, false] },
    boek: 'Zwartbont en tevreden. Een koe kijkt naar je alsof jij de vreemde bent.',
    kopen: { prijs: 450, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 25, effect: 'Een tevreden koe geeft meer melk' },
      { id: 'koebel', label: 'Koebel', prijs: 15, effect: 'Je hoort haar over het erf' },
    ],
  },
  {
    id: 'schaap', naam: 'Schaap', soort: 'vee', kind: 'sheep', plan: 'schaap', biotoop: ['dijk', 'weide'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildSheepMesh3D', args: [] },
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
    boek: 'Staat in de wei met een deken om, ook als het zomer is. Dat hoort zo.',
    kopen: { prijs: 900, houden: 'erf' }, cutscene: null,
    upgrades: [
      { id: 'verzorgen', label: 'Verzorgen', prijs: 40, effect: 'Glanzende vacht' },
      { id: 'zadel', label: 'Zadel', prijs: 120, effect: 'Klaar om op te rijden' },
    ],
  },
  {
    id: 'gans', naam: 'Gans', soort: 'vee', kind: 'gans', alias: ['goose'], plan: 'gans', biotoop: ['weide'], uren: [5, 22],
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['goose'] },
    boek: 'Grazende kudde. Ze vinden zichzelf eigenlijk de baas van het weiland.',
    kopen: { prijs: 60, houden: 'erf' }, cutscene: null,
    upgrades: [{ id: 'verzorgen', label: 'Verzorgen', prijs: 8, effect: 'Een waakzame gans' }],
  },
  {
    id: 'eend', naam: 'Eend', soort: 'vee', kind: 'duck', plan: 'eend', biotoop: ['water'], uren: [5, 23],
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['drake'] },
    boek: 'Dobbert door de gracht en duikt voor een stukje brood.',
    kopen: { prijs: 25, houden: 'vijver' }, cutscene: null,
    upgrades: [{ id: 'verzorgen', label: 'Verzorgen', prijs: 5, effect: 'Een eend die niet meer wegzwemt' }],
  },
  {
    id: 'zwaan', naam: 'Zwaan', soort: 'wild', kind: 'duck', variant: 'swan', biotoop: ['water'], uren: [6, 22],
    mix: { stad: 0.4, westerkwartier: 0.6, westerwolde: 0.8, veenkolonien: 0.6, lauwerskust: 0.4, hunsingo: 0.2 },
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['swan'] },
    boek: 'Wit, statig en niet geneigd tot buigen. Beter niet te dichtbij komen.',
    kopen: null, reden: 'Zwanen zijn van niemand en blijven op het water.', cutscene: null, upgrades: [],
  },
  {
    id: 'meeuw', naam: 'Meeuw', soort: 'wild', kind: 'seagull', plan: 'meeuw', biotoop: ['kust', 'water', 'stad'], uren: [5, 22],
    model: { module: 'wildlife', fn: 'buildSeagullMesh3D', args: [] },
    boek: 'Heeft altijd honger en neemt je friet als je niet oplet.',
    kopen: null, reden: 'Een meeuw laat zich niet houden; hij komt vanzelf terug voor je friet.', cutscene: null, upgrades: [],
  },
  {
    id: 'reiger', naam: 'Blauwe reiger', soort: 'wild', kind: 'reiger', plan: 'reiger', biotoop: ['water'], uren: [4, 21],
    model: { module: 'wildlife', fn: 'buildDuckMesh3D', args: ['reiger'] },
    boek: 'Staat uren stil aan de waterkant. Zodra je beweegt, is hij weg.',
    kopen: null, reden: 'Een reiger blijft liever bij zijn eigen sloot.', cutscene: null, upgrades: [],
  },
  {
    id: 'vis', naam: 'Vis', soort: 'wild', kind: 'vis', plan: 'vis', biotoop: ['water'], uren: [0, 24],
    model: { module: 'wildlife', fn: 'buildFishMesh3D', args: [] },
    boek: 'Een zilveren flits onder het wateroppervlak.',
    kopen: { prijs: 15, houden: 'vijver' }, cutscene: null,
    upgrades: [{ id: 'voer', label: 'Visvoer', prijs: 4, effect: 'Ze komen naar het oppervlak' }],
  },
  {
    id: 'zeehond', naam: 'Zeehond', soort: 'wild', kind: 'zeehond', plan: 'zeehond', biotoop: ['kust', 'wad'], uren: [5, 21],
    model: { module: 'wildlife', fn: 'buildSealMesh3D', args: [] },
    boek: 'Ligt te zonnen op de rand van het wad. Duikt weg zodra je te dichtbij komt.',
    kopen: null, reden: 'Zeehonden zijn beschermd: kijk ze vanaf een afstand.', cutscene: null, upgrades: [],
  },
  {
    id: 'duif', naam: 'Duif', soort: 'huisdier', kind: 'pigeon', biotoop: ['stad', 'erf'], uren: [5, 22],
    mix: { stad: 1, eemsdelta: 0.6, veenkolonien: 0.5, oldambt: 0.5, westerkwartier: 0.4, hogeland: 0.2, westerwolde: 0.4, lauwerskust: 0.2, hunsingo: 0.3 },
    model: { module: 'wildlife', fn: 'buildPigeonMesh3D', args: [0] },
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
    boek: 'Gaat uit wandelen met een baasje aan de lijn. Of andersom.',
    kopen: { prijs: 180, houden: 'huis' }, cutscene: null,
    upgrades: [
      { id: 'trainen', label: 'Trainen', prijs: 60, effect: 'Komt als je fluit' },
      { id: 'halsband', label: 'Halsband', prijs: 14, effect: 'Een felle halsband' },
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
