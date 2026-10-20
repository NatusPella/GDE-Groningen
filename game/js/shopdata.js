// The shop types (chains, colours, map layer) and every ownable vehicle with its price and model: data
// only, split off shops.js so storyshop.js and the others can read them without importing the shop
// module (import cycle, #108). shops.js re-exports both.
import { MOTORBIKE_MODELS, GEARED_MOPED_MODEL } from './motomodels.js';
import { BOAT_KINDS } from './boattypes.js';

// Chains: every branch carries the chain name plus a local suffix
// (wijk or street). group = map-legend layer.
export const SHOP_TYPES = {
  wapens: { color: '#b8322a', label: 'Wapenwinkel', chain: 'Pang & Zo', tagline: 'Wapens, munitie en vesten. Geen vragen.', group: 'shopsWapens' },
  pand: { color: '#7d6a3a', label: 'Pandjeshuis', chain: 'Pand & Poen', tagline: 'Wij kopen alles. Echt alles.', group: 'shopsWapens' },
  kleding: { color: '#7a4fb0', label: 'Kledingwinkel', chain: 'Stoer & Stads', tagline: 'Kleding voor de Stadjer met smaak', group: 'shops' },
  kapper: { color: '#23948a', label: 'Kapper', chain: 'Knip & Kuif', tagline: 'Kapsalon, ook zonder afspraak', group: 'shops' },
  tabak: { color: '#c23f78', label: 'Tabak & loterij', chain: 'Rook & Geluk', tagline: 'Kraskaarten, loten, een spaarkaart en een eierbal uit de muur', group: 'shops' },
  super: { color: '#3b8f3b', label: 'Avondwinkel', chain: 'Nait Duur', tagline: 'Open tot laat, goedkoop tot op de cent', group: 'shops' },
  snack: { color: '#d0652a', label: 'Snackbar', chain: 'Frituur Vet & Lekker', tagline: 'Vers uit het vet, met of zonder', group: 'shops' },
  fietsen: { color: '#2f6fb8', label: 'Fietsenwinkel', chain: 'Trap & Toeter', tagline: 'Fietsen, bakfietsen, e-steps en brommers', group: 'shopsVoertuigen' },
  fietsenmaker: { color: '#4f86a8', label: 'Fietsenmaker', chain: 'Spaak & Band', tagline: 'Plakken, poetsen en opvoeren', group: 'shopsVoertuigen' },
  auto: { color: '#c98a16', label: 'Autodealer', chain: 'Ome Harm Occasions', tagline: 'Nait zeuren, gewoon rijden', group: 'shopsVoertuigen' },
  tuning: { color: '#8c3fa8', label: 'Tuning', chain: 'Knal & Kolder Tuning', tagline: 'Meer vermogen, meer herrie', group: 'shopsVoertuigen' },
  boot: { color: '#2a8fb0', label: 'Botenverhuur & werf', chain: 'Bootje Huren', tagline: 'De stad vanaf het water. Aan de steiger je boot tunen (R)', group: 'shopsVoertuigen' },
  spuit: { color: '#1e9e56', label: 'Spuiterij', chain: 'Spuit & Klaar', tagline: 'Nieuwe kleur, nieuwe kans', group: null },
  eikea: { color: '#1d4fa3', label: 'Woonwarenhuis', chain: 'EIKEA', tagline: 'Zweeds? Nee, Gronings. Zelf in elkaar zetten', group: 'shops' },
  heli: { color: '#b8322a', label: 'Helikopterdealer', chain: 'Rotor Roelf', tagline: 'Helikopters. Vliegbrevet? Daar doen we op Eelde niet moeilijk over', group: 'shopsVoertuigen' },
};

// display names in vehiclenames.js are picked by id % list length, so a
// vehicle's id is chosen to land on the name it was sold under
const CAR_M = (name, len, wid, maxSpeed, accel, brake, turnRate, extra = {}) => ({ name, len, wid, maxSpeed, accel, brake, turnRate, ...extra });
const BUS_STRIPES = { stripe: '#3fc6d4', accent: '#e8e6de' };

// Every vehicle type in Grunn, ownable. shop: where it is sold ('auto' Ome
// Harm, 'fietsen' Trap & Toeter, 'boot' Bootje Huren); unlock: a key of
// VEHICLE_UNLOCKS instead of a price. flags: set on the spawned vehicle.
// Keys are saved: only ever add.
export const VEHICLE_STOCK = {
  omafiets: { kind: 'bike', type: 'Fiets', shop: 'fietsen', label: 'Omafiets', desc: 'Zwart, zwaar en onverwoestbaar', price: 75, nameIdx: 0, color: '#1c1c1c', model: { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6 } },
  stadsfiets: { kind: 'bike', type: 'Fiets', shop: 'fietsen', label: 'Stadsfiets', desc: 'Lichter en sneller, in Stadjersgroen', price: 110, nameIdx: 2, color: '#1e9e56', model: { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 7.0, accel: 3.6, brake: 6.2, turnRate: 4.8 } },
  fatbike: { kind: 'bike', type: 'Fatbike', shop: 'fietsen', label: 'Fatbike "Dikke Tinus"', desc: 'Dikke banden, dikke prijs', price: 350, nameIdx: 0, color: '#20221f', model: { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 7.4, accel: 3.4, brake: 5, turnRate: 3.8 } },
  brommer: { kind: 'scooter', type: 'E-step', shop: 'fietsen', label: 'E-step Zoemzoem', desc: 'Elektrische step: staan, gas, zoemen', price: 600, nameIdx: 0, color: '#c94b3a', model: { name: 'scooter', len: 1.15, wid: 0.42, maxSpeed: 8.5, accel: 4.0, brake: 4.4, turnRate: 5.4 } },
  quad: { kind: 'car', type: 'Quad', shop: 'auto', label: 'Wierde Quad', desc: 'Vierwieler voor het land: door de wei waar een auto vastloopt', price: 950, nameIdx: 0, color: '#b8322a', model: CAR_M('quad', 2.1, 1.2, 17, 9, 14, 3.2, { offroad: 1 }) },
  mug: { kind: 'car', type: 'Hatchback', shop: 'auto', label: 'Hunze Mug', desc: 'Kleine hatchback, parkeert overal', price: 800, nameIdx: 2, color: '#2e6b9e', model: CAR_M('hatch', 3.8, 1.7, 42, 9, 15, 3.0) },
  koopman: { kind: 'car', type: 'Stationwagen', shop: 'auto', label: 'Reitdiep Koopman', desc: 'Stationwagen voor de hele familie', price: 1150, nameIdx: 0, color: '#2e4a34', model: CAR_M('wagon', 4.5, 1.8, 47, 9, 15, 2.5) },
  klusbus: { kind: 'car', type: 'Bestelbus', shop: 'auto', label: 'Oldambt Klusbus', desc: 'Bestelbus: ramt alles opzij', price: 1300, nameIdx: 0, color: '#d9d9d9', model: CAR_M('van', 5.0, 2.0, 38, 7, 13, 2.0) },
  wervelwind: { kind: 'car', type: 'Sportwagen', shop: 'auto', label: 'Wadden Wervelwind', desc: 'Sportwagen. Rap as de wind over de dijk', price: 2400, nameIdx: 0, color: '#c9a227', model: CAR_M('sport', 4.1, 1.85, 64, 14, 24, 3.2) },
  trekker: { kind: 'car', type: 'Trekker', shop: 'auto', label: 'Ommelander Trekker "Stuurse Henk"', desc: 'Langzaam, onverwoestbaar en nooit te laat bij de oogst', price: 1500, nameIdx: 0, color: '#3f7d3a', model: CAR_M('tractor', 4.3, 2.3, 11, 6.5, 11, 1.9, { offroad: 0.9 }) },
  // --- two-wheelers ---
  transportfiets: { kind: 'bike', type: 'Fiets', shop: 'fietsen', label: 'Transportfiets', desc: 'Rek voorop voor een krat bier of een tweede student', price: 95, nameIdx: 1, color: '#23324a', model: { name: 'bike', len: 1.9, wid: 0.55, maxSpeed: 5.8, accel: 2.9, brake: 5.6, turnRate: 4.3 } },
  barrel: { kind: 'bike', type: 'Fiets', shop: 'fietsen', label: 'Studentenbarrel', desc: 'Geen remmen, geen bel, wel een verhaal', price: 35, nameIdx: 0, color: '#6b2a24', model: { name: 'bike', old: true, len: 1.75, wid: 0.5, maxSpeed: 5.4, accel: 2.8, brake: 4.2, turnRate: 4.4 } },
  bakfiets: { kind: 'bike', type: 'Bakfiets', shop: 'fietsen', label: 'Bakfiets Kroost-Karretje', desc: 'Voor twee kinderen, een hond of drie kratten', price: 450, nameIdx: 0, color: '#2f4a3a', model: { name: 'bike', cargo: true, len: 2.55, wid: 0.72, maxSpeed: 5.4, accel: 2.5, brake: 5, turnRate: 3.2 } },
  deelstep: { kind: 'scooter', type: 'E-step', shop: 'fietsen', label: 'Deelstep Stadswesp', desc: 'Nu eindelijk van jou. Nooit meer in de gracht vissen', price: 450, nameIdx: 1, color: '#e8e6e0', model: { name: 'scooter', len: 1.1, wid: 0.4, maxSpeed: 7.8, accel: 3.8, brake: 4.2, turnRate: 5.2 } },
  snorscooter: { kind: 'scooter', type: 'Snorscooter', shop: 'fietsen', label: 'Snorscooter Brommie', desc: 'Helm hoeft niet, zegt de verkoper. De verkoper heeft een helm op', price: 900, nameIdx: 0, color: '#8f2f2a', model: { name: 'scooter', moped: true, len: 1.7, wid: 0.62, maxSpeed: 12.5, accel: 4.6, brake: 7, turnRate: 4.2 } },
  // motorbikes and the classic moped: six gears (1-N-2..6) or four, handmatig te schakelen (Instellingen)
  stormvogel: { kind: 'scooter', type: 'Motor', shop: 'fietsen', label: 'Wadden Stormvogel', desc: 'Sportmotor, zes versnellingen en een helm die je gelukkig meekrijgt', price: 4200, nameIdx: 0, color: '#c9a227', model: { ...MOTORBIKE_MODELS.sport } },
  knetter: { kind: 'scooter', type: 'Motor', shop: 'fietsen', label: 'Hunze Knetter', desc: 'Naked bike: geen kuip, wel een mening. Wheelies op bestelling', price: 3100, nameIdx: 0, color: '#2f5a8f', model: { ...MOTORBIKE_MODELS.naked } },
  klassieker: { kind: 'scooter', type: 'Motor', shop: 'fietsen', label: 'Dollard Klassieker', desc: 'Chroom, één cilinder en een knetter die de buren herkennen', price: 2300, nameIdx: 0, color: '#2e4a34', model: { ...MOTORBIKE_MODELS.old } },
  pruttelaar: { kind: 'scooter', type: 'Brommer', shop: 'fietsen', label: 'Tweetakt Pruttelaar', desc: 'Echte brommer met koppeling en vier versnellingen: 45 km/u, geen meter harder. Voor de politie dan', price: 1100, nameIdx: 0, color: '#c9541e', model: { ...GEARED_MOPED_MODEL } },
  // --- cars ---
  knakker: { kind: 'car', type: 'Hatchback', shop: 'auto', label: 'Dollard Knakker', desc: 'Klein, pittig en altijd net te laat bij de APK', price: 650, nameIdx: 0, color: '#c7c9cc', model: CAR_M('hatch', 3.8, 1.7, 41, 9, 15, 3.0) },
  pienter: { kind: 'car', type: 'Hatchback', shop: 'auto', label: 'Eemsmond Pienter', desc: 'Zuinig, slim en saai. Precies wat je moeder wil', price: 700, nameIdx: 1, color: '#e8e6e0', model: CAR_M('hatch', 3.8, 1.7, 42, 9, 15, 3.1) },
  roestbak: { kind: 'car', type: 'Barrel', shop: 'auto', label: 'Dollard Roestbak', desc: 'Drie kleuren, twee werkende deuren, één koplamp', price: 350, nameIdx: 0, color: '#8a6a4a', model: CAR_M('hatch', 3.7, 1.65, 34, 7, 13, 2.8, { rusty: true }) },
  statig: { kind: 'car', type: 'Sedan', shop: 'auto', label: 'Wadden Statig', desc: 'Voor notarissen en mensen die willen lijken op een notaris', price: 1400, nameIdx: 0, color: '#4a4d52', model: CAR_M('sedan', 4.3, 1.8, 50, 10, 16, 2.6) },
  kanselier: { kind: 'car', type: 'Sedan', shop: 'auto', label: 'Hunze Kanselier', desc: 'Leren stoelen, stoelverwarming, ego-verwarming', price: 1550, nameIdx: 1, color: '#2f3a52', model: CAR_M('sedan', 4.3, 1.8, 51, 10, 16, 2.6) },
  regent: { kind: 'car', type: 'Sedan', shop: 'auto', label: 'Reitdiep Regent', desc: 'Rijdt als een raadsvergadering: statig en eindeloos', price: 1700, nameIdx: 2, color: '#7a1f1f', model: CAR_M('sedan', 4.3, 1.8, 52, 10.5, 16, 2.6) },
  stationair: { kind: 'car', type: 'Stationwagen', shop: 'auto', label: 'Dollard Stationair', desc: 'Kofferbak past precies een zak aardappels uit Veendam', price: 1100, nameIdx: 1, color: '#5a6a7a', model: CAR_M('wagon', 4.5, 1.8, 46, 9, 15, 2.5) },
  landjonker: { kind: 'car', type: 'SUV', shop: 'auto', label: 'Wadden Landjonker', desc: 'Hoog, breed en nog nooit in de modder geweest', price: 2100, nameIdx: 0, color: '#1b1c1f', model: CAR_M('suv', 4.7, 1.95, 49, 9.5, 15, 2.4) },
  borgheer: { kind: 'car', type: 'SUV', shop: 'auto', label: 'Hunze Borgheer', desc: 'Voor wie een borg bezit, of daar van droomt', price: 2300, nameIdx: 1, color: '#e8e6e0', model: CAR_M('suv', 4.7, 1.95, 50, 10, 15, 2.4) },
  raket: { kind: 'car', type: 'Sportwagen', shop: 'auto', label: 'Eemshaven Raket', desc: 'Gaat harder dan de windmolens draaien', price: 3200, nameIdx: 1, color: '#8a1414', model: CAR_M('sport', 4.1, 1.85, 68, 15, 25, 3.3) },
  taxi: { kind: 'car', type: 'Taxi', shop: 'auto', label: 'Taxi Stadstaxi 050', desc: 'Meter loopt altijd, ook als hij stilstaat', price: 1800, nameIdx: 0, color: '#1b1c1f', flags: { isTaxi: true }, model: CAR_M('taxi', 4.6, 1.8, 48, 9.5, 16, 2.6) },
  nachtbraker: { kind: 'car', type: 'Taxi', shop: 'auto', label: 'Taxi Nachtbraker', desc: 'Ruikt naar kapsalon en beslissingen van half vier', price: 1900, nameIdx: 1, color: '#e8e6e0', flags: { isTaxi: true }, model: CAR_M('taxi', 4.6, 1.8, 48, 9.5, 16, 2.6) },
  // --- vans, trucks, buses ---
  pakezel: { kind: 'car', type: 'Bestelbus', shop: 'auto', label: 'Hunze Pakezel', desc: 'Tilt meer dan jij, klaagt minder dan jij', price: 1250, nameIdx: 1, color: '#2f5a8f', model: CAR_M('van', 5.0, 2.0, 38, 7, 13, 2.0) },
  bezorgbus: { kind: 'car', type: 'Bestelbus', shop: 'auto', label: 'Pakkie Nou Bezorgbus', desc: 'Niemand thuis? Dan bij de buren. Of in de container', price: 1400, nameIdx: 0, color: '#e0701e', model: CAR_M('van', 5.0, 2.0, 38, 7, 13, 2.0, { livery: 'pakket' }) },
  bakwagen: { kind: 'car', type: 'Vrachtwagen', shop: 'auto', label: 'Oldambt Bakwagen', desc: 'Achteruit piept hij. Vooruit ook, eigenlijk', price: 2600, nameIdx: 0, color: '#e8e6e0', model: CAR_M('truck', 7.2, 2.35, 30, 5, 13, 1.5) },
  sjouwer: { kind: 'car', type: 'Vrachtwagen', shop: 'auto', label: 'Eemshaven Sjouwer', desc: 'Verhuist een heel studentenhuis in één rit, inclusief bank', price: 2800, nameIdx: 1, color: '#c9541e', model: CAR_M('truck', 7.2, 2.35, 31, 5, 13, 1.5) },
  midibus: { kind: 'car', type: 'Midibus', shop: 'auto', label: 'Stadsbus Wijkhopper', desc: 'Buurtbus voor als lijn 3 weer niet komt', price: 3800, nameIdx: 0, color: '#132a44', flags: { isBus: true }, model: CAR_M('midibus', 8.4, 2.3, 24, 5, 12, 1.3, BUS_STRIPES) },
  stadsbus: { kind: 'car', type: 'Stadsbus', shop: 'auto', label: 'Stadsbus Diepenrinkel', desc: 'Je eigen lijn. Haltes kies je zelf, dienstregeling ook', unlock: 'buschauffeur', nameIdx: 0, color: '#132a44', flags: { isBus: true }, model: { ...CAR_M('bus', 11.2, 2.55, 22, 4.5, 12, 1.1, BUS_STRIPES), trailer: 6.8 } },
  // --- specials, unlocked through the story and achievements ---
  poen: { kind: 'car', type: 'Geldwagen', shop: 'auto', label: 'Poen Express Kluiswagen', desc: 'Gepantserd, loodzwaar en helaas leeg', unlock: 'pinautomaat', nameIdx: 0, color: '#5b625d', flags: { isCashVan: true }, model: CAR_M('cashvan', 5.2, 2.0, 36, 6.5, 13, 2.0) },
  ambulance: { kind: 'car', type: 'Ambulance', shop: 'auto', label: 'Ambulance Spoedrit', desc: 'Sirene aan en heel de Herestraat gaat opzij', unlock: 'fatbike', nameIdx: 0, color: '#f1d21c', flags: { isAmbulance: true }, model: CAR_M('ambulance', 5.6, 2.0, 46, 9, 17, 2.6) },
  politie: { kind: 'car', type: 'Politieauto', shop: 'auto', label: 'Politie Achtervolger', desc: 'Afgeschreven, opgeknapt, zwaailicht doet het nog', unlock: 'ontsnapt', nameIdx: 0, color: '#1c1c1c', flags: { isPolice: true, hijacked: true }, model: CAR_M('police', 4.3, 1.8, 55, 11, 20, 2.8) },
  tankwagen: { kind: 'car', type: 'Tankwagen', shop: 'auto', label: 'Us Mem Vet Tankwagen', desc: 'Nog half vol frituurvet. Rijdt op zijn eigen lading', unlock: 'vetgekaapt', nameIdx: 0, color: '#e6c21a', model: CAR_M('truck', 7.2, 2.35, 28, 4.5, 13, 1.5, { tank: true }) },
  trekkerlimo: { kind: 'car', type: 'Trekker-limo', shop: 'auto', label: 'Terpstra Trekker-limo', desc: 'Gewonnen van Jelle. Hij wil hem terug, jij toetert', unlock: 'ringweg', nameIdx: 0, color: '#1b1c1f', model: CAR_M('trekkerlimo', 5.6, 2.0, 40, 7, 14, 2.1) },
  fjordfrituur: { kind: 'car', type: 'Foodtruck', shop: 'auto', label: 'Fjord Frituur', desc: 'Tessa\'s foodtruck, nu van jullie. Parkeer bij drukte en open het luik', unlock: 'ontzet', nameIdx: 0, color: '#2f6fb0', flags: { isFoodtruck: true }, model: CAR_M('foodtruck', 5.4, 2.1, 34, 6.5, 14, 2.0) },
  // --- boats ---
  kano: { kind: 'boat', type: 'Kano', shop: 'boot', label: 'Kano Peddelpiet', desc: 'Zelf peddelen, spierpijn inbegrepen', price: 150, nameIdx: 0, color: '#c8502a', model: { ...BOAT_KINDS.kano } },
  kajak: { kind: 'boat', type: 'Kajak', shop: 'boot', label: 'Kajak Waterjuffer', desc: 'Voor één, laag bij de eenden', price: 120, nameIdx: 0, color: '#e0b020', model: { ...BOAT_KINDS.kajak } },
  waterfiets: { kind: 'boat', type: 'Waterfiets', shop: 'boot', label: 'Waterfiets Zwaantje', desc: 'Romantisch trappen tot je benen het opgeven', price: 220, nameIdx: 1, color: '#f0eee8', model: { ...BOAT_KINDS.waterfiets } },
  bijboot: { kind: 'boat', type: 'Bijbootje', shop: 'boot', label: 'Bijbootje Woonbootje', desc: 'Klein motortje, groot ego', price: 300, nameIdx: 0, color: '#2f4a3a', model: { ...BOAT_KINDS.dinghy } },
  rubberboot: { kind: 'boat', type: 'Rubberboot', shop: 'boot', label: 'Rubberboot Stuiterbal', desc: 'Stuitert over de golven van elke rondvaartboot', price: 700, nameIdx: 0, color: '#3c4044', model: { ...BOAT_KINDS.rubberboot } },
  sloep: { kind: 'boat', type: 'Sloep', shop: 'boot', label: 'Sloep Nait Soezen', desc: 'Rosé aan boord, pet op, rustig tuffen', price: 900, nameIdx: 0, color: '#e8e6e0', model: { ...BOAT_KINDS.sloep } },
  speedboot: { kind: 'boat', type: 'Speedboot', shop: 'boot', label: 'Speedboot Grachtengast', desc: 'Harder dan mag. De kade vindt je niet leuk', price: 1800, nameIdx: 1, color: '#c9a227', model: { name: 'boat', kind: 'sloep', len: 5.2, wid: 1.9, playerTop: 25, playerAccel: 7, maxSpeed: 7.5, accel: 2.8, brake: 2.8, turnRate: 1.7, color: '#c9a227', cabin: '#1c1c1c' } },
  roeiboot: { kind: 'boat', type: 'Roeiboot', shop: 'boot', label: 'Roeiboot Krabbenlap', desc: 'Zelf roeien: houd het ritme, dan schiet hij vooruit', price: 260, nameIdx: 0, color: '#8a5a2c', model: { ...BOAT_KINDS.roeiboot } },
  zeilboot: { kind: 'boat', type: 'Zeilboot', shop: 'boot', label: 'Zeilboot Lekker Windje', desc: 'Geen motor: zeil aanhalen met Q, vieren met Z en kruisen tegen de wind', price: 1400, nameIdx: 1, color: '#f2f0ea', model: { ...BOAT_KINDS.zeilboot } },
  rondvaartboot: { kind: 'boat', type: 'Rondvaartboot', shop: 'boot', label: 'Rondvaartboot Stadjer', desc: 'Glazen dak, veertig stoelen, nul passagiers', price: 3500, nameIdx: 1, color: '#1d3350', model: { ...BOAT_KINDS.rondvaart } },
  // --- the air ---
  wiekenwubbo: { kind: 'heli', type: 'Helikopter', shop: 'heli', label: 'Wieken Wubbo', desc: 'Tweezits helikopter. Landt op elk plat stuk: het weiland, een plat dak of je eigen helidek', price: 5500, nameIdx: 0, color: '#b8322a', flags: { isHeli: true }, model: { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40, accel: 7, brake: 9, turnRate: 1.5 } },
  politieboot: { kind: 'boat', type: 'Politieboot', shop: 'boot', label: 'Politie Boot', desc: 'Voor wie de politie op het water ook eens wil ontlopen. Met de politie', unlock: 'vijfsterren', nameIdx: 0, color: '#e8e6e0', flags: { isPolice: true, hijacked: true }, model: { name: 'boat', kind: 'sloep', len: 5.5, wid: 2.0, maxSpeed: 9.8, accel: 3.2, brake: 3.4, turnRate: 1.8, color: '#e8e6e0', cabin: '#12294f' } },
};
