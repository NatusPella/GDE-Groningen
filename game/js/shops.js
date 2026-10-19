import { KEYS } from './storagekeys.js';
import { loadTuning, tuningEffects } from './tuningplan.js';
import { DIEREN, dierById } from './dierenregister.js';
import { loadBezit, saveBezit, koop, upgrade, koopBlokkade, upgradeBlokkade, stemming, PLEK_MAX } from './dierenbezit.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { dist, closestPointOnSegment, isInWater, pointInPolygon, boatDryPoints } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { clearOfBuildings, withTiles, nearestOnRoads } from './tileplace.js';
import { countryFacilities, countryDoor } from './facilities.js';
import { edgeDistance } from './countryfield.js';
import { getScene, refreshCharacterMeshes } from './scene3d.js';
import { spawnVehicleOnRoad, spawnBoatOnWater, HERO_CAR_MODEL, playerTopSpeed } from './vehicle.js';
import { MOTORBIKE_MODELS, GEARED_MOPED_MODEL } from './motomodels.js';
import { BOAT_KINDS } from './boattypes.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { getHorecaForRender } from './horeca.js';
import { initShopUi, openShopMenu, isShopOpen } from './shopui.js';
import { isCinematicActive } from './cinematics.js';
import { recordStat, isUnlocked } from './achievements.js';
import { isMissionCompleted, missionIndexById } from './missions.js';
import { prepareStoryShop, currentStep } from './story.js';
import { markStoryItems, noteStoryPurchase } from './storyshop.js';
import { jobLevel } from './sidejobs.js';
import { WEAPONS } from './combat.js';
import { productKey } from './shopmodels3d.js';
import { furnitureShopItems, furnitureShopNote } from './furniture.js';
import { makeHeli, registerHelipad } from './heliflight.js';
import { buildHelipadMesh, buildHeliMesh } from './heli3d.js';
import { noteMoney } from './finance.js';

export const SHOP_USE_RADIUS = 2.6;
const OUTFIT_WANTED_COOLDOWN = 60;
export const REDELIVERY_FEE = 10;

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

// Rotor Roelf, the one helicopter dealer: on Groningen Airport Eelde, by the
// Machlaan (the kiosk faces the road, the platform with the H behind it).
const HELI_DEALER = { x: 1764.51, y: 9959.94, road: [1759.1, 9967.18], pad: { x: 1774.82, y: 9945.78, r: 6 }, street: 'Machlaan', wijk: 'Eelde' };

// Jetties for boat rental: a kade street next to open water.
const BOAT_JETTIES = ['Hoge der A', 'Oosterkade', 'Noorderhaven', 'Eendrachtskade', 'Winschoterkade'];

const PAD_DECK = 0.12;
const STREAM_IN = 170;
const STREAM_OUT = 220;
const BUILDS_PER_TICK = 2;
const WORKSHOP_RADIUS = 9;
const WERF_RADIUS = 30;
const SELL_RADIUS = 25;

// --- stock ------------------------------------------------------------------

export const WEAPON_STOCK = [
  { key: 'pistol', label: 'Pistool "Klapperman"', desc: 'Betrouwbaar, handzaam, luid genoeg', gun: 120, ammoPrice: 25, ammo: 36, cap: 250 },
  { key: 'uzi', label: 'Uzi "Ratelaar"', desc: 'Veel lood, weinig precisie', gun: 300, ammoPrice: 40, ammo: 90, cap: 600 },
  { key: 'shotgun', label: 'Hagelgeweer "Boerenbuks"', desc: 'Van de boer uit Ten Boer. Dichtbij: weg is weg', gun: 400, ammoPrice: 35, ammo: 12, cap: 80 },
  { key: 'jachtgeweer', label: 'Jachtgeweer "Hogelandse Havik"', desc: 'Met kijker: rechtermuisknop vasthouden. Van ver, één keer raak', gun: 650, ammoPrice: 40, ammo: 10, cap: 60 },
  { key: 'waterpistool', label: 'Waterpistool "Spetter"', desc: 'Doet geen pijn, maar niemand wil nat worden. Blust ook een brandende bak', gun: 25, ammoPrice: 5, ammo: 150, cap: 600, unit: 'water' },
  { key: 'carbidbus', label: 'Carbidbus "Knalbus"', desc: 'Melkbus met carbid, zoals op het Hogeland met de carbidschietwedstrijd. Gooien, of bukken en neerzetten', gun: 90, ammoPrice: 30, ammo: 3, cap: 15, unit: 'bussen' },
  { key: 'vuurwerk', label: 'Vuurwerkpijlen "Sterrenregen"', desc: 'Het hele jaar oud en nieuw. Fluit, knalt en spat', gun: 60, ammoPrice: 25, ammo: 6, cap: 40, unit: 'pijlen' },
  { key: 'knuppel', label: 'Honkbalknuppel "Stadjer Slugger"', desc: 'Essenhout. Zwaai, tok, klaar', gun: 60, melee: true },
  { key: 'hockeystick', label: 'Hockeystick "Helpman"', desc: 'Veel zwaaien, weinig raak. Sportief bedoeld', gun: 45, melee: true },
  { key: 'bezem', label: 'Bezem "Zaterdagochtend"', desc: 'Stoep vegen en verveeld kijken. Doet weinig pijn, duwt lekker', gun: 15, melee: true },
  { key: 'fietspomp', label: 'Fietspomp "Tegenwind"', desc: 'Snel en venijnig. Elke Stadjer heeft er een', gun: 20, melee: true },
  { key: 'klomp', label: 'Klomp "Friese Wink"', desc: 'Meegenomen van over de grens. Hard hout, harde les', gun: 25, melee: true },
  { key: 'polsstok', label: 'Polsstok "Fierljepper"', desc: 'Lang en traag, maar je houdt ze op drie meter', gun: 90, melee: true },
];

export const OUTFITS = {
  tammo: [
    { id: 'stadjer', label: 'Stadjer classic', desc: 'Het vertrouwde jack en de oranje pet', price: 40, shirt: 0x3f6ea8, pants: 0x2f3b52, cap: 0xc8621e, shoes: 0xd8d4cc },
    { id: 'groenwit', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, shirt: 0x1e9e56, pants: 0xe8e6e0, cap: 0x1e9e56, shoes: 0xe8e6e0 },
    { id: 'boer', label: 'Boer op zundag', desc: 'Olijfgroen en bruin, klaar voor het Hogeland', price: 80, shirt: 0x5b6b3a, pants: 0x4a3a2a, cap: 0x2e4a34, shoes: 0x3b2a1e },
    { id: 'keuning', label: 'Keuningsdag', desc: 'Oranje boven, ook buiten april', price: 90, shirt: 0xe0701e, pants: 0x2f3b52, cap: 0xe0701e, shoes: 0xd8d4cc },
    { id: 'corps', label: 'Corpsbal', desc: 'Navy colbert, chino, pet van pappie', price: 160, shirt: 0x1f2a4a, pants: 0xb8a27a, cap: 0x7a1f1f, shoes: 0x3b2a1e },
    { id: 'incognito', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, shirt: 0x1c1c1e, pants: 0x19191b, cap: 0x232326, shoes: 0x1e1e1e, stealth: 2 },
  ],
  anita: [
    { id: 'classic', label: 'Rode jas classic', desc: 'Haar eigen, vertrouwde jas', price: 40, shirt: 0x9e3027, pants: 0x26262a, shoes: 0x2a1d14 },
    { id: 'groenwit', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, shirt: 0x1e9e56, pants: 0xe8e6e0, shoes: 0xe8e6e0 },
    { id: 'noorderzon', label: 'Noorderzon', desc: 'Mosterdgele jas, festivalproof', price: 90, shirt: 0xc9a227, pants: 0x3a4d6e, shoes: 0x5a3d26 },
    { id: 'pastel', label: 'Lente op de Vismarkt', desc: 'Zacht roze met crème', price: 100, shirt: 0xc98fa8, pants: 0xe3ddd0, shoes: 0xd8d4cc },
    { id: 'wadloper', label: 'Wadloper', desc: 'Zeeblauw en laarzen, klaar voor Pieterburen', price: 80, shirt: 0x2f5c8a, pants: 0x3b4a3a, shoes: 0x2a1d14 },
    { id: 'incognito', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, shirt: 0x1c1c1e, pants: 0x19191b, shoes: 0x1e1e1e, stealth: 2 },
  ],
};
const DEFAULT_OUTFIT = { tammo: 'stadjer', anita: 'classic' };

const HAIR_COLORS = [
  { id: 'naturel', label: 'Naturel', price: 30 },
  { id: 'zwart', label: 'Ravenzwart', price: 30, hair: 0x1b1716 },
  { id: 'bruin', label: 'Kastanjebruin', price: 30, hair: 0x5a3d26 },
  { id: 'blond', label: 'Strandblond', price: 35, hair: 0xcdb485 },
  { id: 'ros', label: 'Rossig', price: 35, hair: 0x93462a },
  { id: 'grijs', label: 'Grijs-chic', price: 35, hair: 0xb4afa6 },
  { id: 'groen', label: 'Stadjersgroen', price: 55, hair: 0x1e9e56 },
  { id: 'roze', label: 'Knalroze', price: 55, hair: 0xd0457a },
];
const HAIR_STYLES = {
  tammo: [['short', 'Kort en netjes'], ['buzz', 'Tondeuse op 3'], ['curly', 'Krullenbol']],
  anita: [['long', 'Lang en los'], ['ponytail', 'Paardenstaart'], ['bun', 'Knotje'], ['bob', 'Bob'], ['curly', 'Krullen']],
};
const STYLE_PRICE = 40;

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

const missionDone = (id) => isMissionCompleted(missionIndexById(id));

// text: the condition in the garage and the shop; ok(): met in this save.
export const VEHICLE_UNLOCKS = {
  pinautomaat: { text: 'Klaar missie "Even pinnen"', ok: () => missionDone('pinautomaat') },
  fatbike: { text: 'Klaar missie "Fatbike-terreur": de buurtzorg bedankt je', ok: () => missionDone('fatbike') },
  vetgekaapt: { text: 'Klaar missie "Al het vet van Grunn"', ok: () => missionDone('vetgekaapt') },
  ringweg: { text: 'Win de ringweg-race van Jelle', ok: () => missionDone('ringweg') },
  // world.postgame (postgame.js): the story's ending was played, also after skipping the finale
  ontzet: { text: 'Speel het verhaal uit: Gronings Ontzet', ok: () => missionDone('ontzet') || !!(worldRef && worldRef.postgame) },
  buschauffeur: { text: 'Haal niveau 2 als buschauffeur (lijn 3)', ok: () => jobLevel('bus') >= 2 },
  ontsnapt: { text: 'Prestatie "Foetsie": raak de politie kwijt na vijf sterren', ok: () => isUnlocked('ontsnapt_5') },
  vijfsterren: { text: 'Prestatie "Heel Grunn zoekt je": haal vijf sterren', ok: () => isUnlocked('ster_5') },
};

export function unlockMet(spec) {
  const u = spec && spec.unlock && VEHICLE_UNLOCKS[spec.unlock];
  try { return !!(u && u.ok()); } catch (e) { return false; }
}

export const PAINTS = [
  { id: 'rood', label: 'Brandweerrood', color: '#a11f1f' },
  { id: 'groen', label: 'Stadjersgroen', color: '#1e9e56' },
  { id: 'zwart', label: 'Nachtzwart', color: '#1b1c1f' },
  { id: 'wit', label: 'Kwarkwit', color: '#e8e6e0' },
  { id: 'geel', label: 'Koolzaadgeel', color: '#d9b21b' },
  { id: 'oranje', label: 'Oranje', color: '#d8641c' },
  { id: 'blauw', label: 'Reitdiepblauw', color: '#2e5f9e' },
  { id: 'paars', label: 'Paars-pimp', color: '#6a2e8a' },
];
const PAINT_PRICE = 60;

// mult: factors on the vehicle model; once per vehicle
export const BIKE_UPGRADES = [
  { id: 'banden', label: 'Racebanden', desc: 'Dunner, harder, rapper: +15% topsnelheid', price: 40, mult: { maxSpeed: 1.15 } },
  { id: 'versnelling', label: 'Zeven versnellingen', desc: 'Sneller op gang bij het stoplicht', price: 30, mult: { accel: 1.3 } },
  { id: 'motor', label: 'Opgevoerde accu', desc: 'Stiekem e-motortje erin: hard en stil', price: 150, mult: { maxSpeed: 1.35, accel: 1.4 } },
];
// Boats at the Bootje Huren werf (stop beside the jetty and press R). Paddled
// boats get lighter paddles; a sailing boat has no motor to tune.
export const BOAT_UPGRADES = [
  { id: 'motor', label: 'Opgevoerde buitenboordmotor', desc: 'Meer pk achterop: +15% top, +20% trekkracht', price: 350, mult: { maxSpeed: 1.15, accel: 1.2 } },
  { id: 'schroef', label: 'Raceschroef "Kolkje"', desc: 'De kade trilt mee: +25% top, +30% trekkracht', price: 850, mult: { maxSpeed: 1.25, accel: 1.3 } },
  { id: 'roer', label: 'Groot roer', desc: 'Scherper om de bocht, ook in de smalle grachten', price: 180, mult: { turnRate: 1.2 } },
  { id: 'keerkoppeling', label: 'Snelle keerkoppeling', desc: 'Volle kracht achteruit: veel eerder stil', price: 140, mult: { brake: 1.4 } },
];
export const PADDLE_UPGRADES = [
  { id: 'peddels', label: 'Carbon peddels', desc: 'Licht als een veertje: +20% top, +25% trekkracht', price: 60, mult: { maxSpeed: 1.2, accel: 1.25 } },
];
const PADDLED = new Set(['kano', 'kajak', 'waterfiets', 'sup', 'skiff']);
const isSailBoat = (v) => !!(v && v.isBoat && v.model && v.model.sail);
function upgradeListFor(v) {
  if (v && v.isBoat) return isSailBoat(v) ? [] : PADDLED.has(v.model.kind) ? PADDLE_UPGRADES : BOAT_UPGRADES;
  return isTwoWheeler(v) ? (isMotorised(v.model) ? MOTO_UPGRADES : BIKE_UPGRADES) : CAR_UPGRADES;
}
export function upgradeListForStock(spec) {
  if (spec.kind === 'boat') return spec.model && (spec.model.sail || spec.model.zeil) ? [] : PADDLED.has(spec.model && spec.model.kind) ? PADDLE_UPGRADES : BOAT_UPGRADES;
  return spec.kind === 'car' ? CAR_UPGRADES : isMotorised(spec.model) ? MOTO_UPGRADES : BIKE_UPGRADES;
}

// Motorbikes and the geared moped. On the moped the exhaust lifts it past the legal 45 km/h: the police notice.
export const MOTO_UPGRADES = [
  { id: 'uitlaat', label: 'Sportuitlaat', desc: 'Harder en rapper: +10% top, +15% trekkracht. Een brommer boven de 45 km/u is illegaal', price: 280, mult: { maxSpeed: 1.1, accel: 1.15 } },
  { id: 'schijven', label: 'Grote remschijven', desc: 'Stopt waar je wil: +30% remkracht', price: 140, mult: { brake: 1.3 } },
  { id: 'plakbanden', label: 'Plakkende banden', desc: 'Scherper door de bocht', price: 150, mult: { turnRate: 1.15 } },
];

export const CAR_UPGRADES = [
  { id: 'motor', label: 'Opgevoerde motor', desc: 'Chip erin, filter eruit: +12% top, +20% trekkracht', price: 300, mult: { maxSpeed: 1.12, accel: 1.2 } },
  { id: 'remmen', label: 'Sportremmen', desc: 'Staat stil voor je het weet', price: 150, mult: { brake: 1.35 } },
  { id: 'grip', label: 'Brede banden', desc: 'Scherper door de bocht', price: 175, mult: { turnRate: 1.15 } },
  { id: 'turbo', label: 'Turbo "Tinus"', desc: 'Pssssjoew! +22% top, +35% trekkracht', price: 700, mult: { maxSpeed: 1.22, accel: 1.35 } },
  { id: 'sperdiff', label: 'Sperdifferentieel', desc: 'Houdt beide achterwielen bij de les: een slip blijft veel langer staan', price: 260, mult: {} },
];

const SUPER_ITEMS = [
  ['krentenbol', 'Krentenbol', 'Zak van zes, eentje meteen op', 1, 3],
  ['koffie', 'Koude bak koffie', 'Uit het koelvak, met een rietje', 2, 6],
  ['drop', 'Zak drop', 'Zoute, natuurlijk', 2, 5],
  ['energie', 'Energiedrankje "Grunn Bull"', 'Hart op hol, benen weer vol', 3, 12],
  ['ehbo', 'EHBO-doos', 'Pleisters, verband en paracetamol', 25, 45],
];
const SNACK_ITEMS = [
  ['kroket', 'Kroket', 'Uit de muur of vers', 3, 8],
  ['frikandel', 'Frikandel speciaal', 'Mayo, curry, uitjes', 3, 9],
  ['eierbal', 'Eierbal', 'De Grunneger specialiteit', 4, 12],
  ['oorlog', 'Patatje oorlog', 'Mayo, satésaus en uitjes', 4, 13],
  ['kapsalon', 'Kapsalon', 'Friet, shoarma, kaas, sla. Hou je vast', 8, 30],
];

// pawn shop prices for a vehicle the player drove there
const RESALE = { bike: 15, scooter: 60, hatch: 150, sedan: 200, wagon: 180, van: 220, sport: 450, escort: 0, police: 500 };

// --- state --------------------------------------------------------------------

let shops = [];
const state = {
  outfit: { ...DEFAULT_OUTFIT },
  ownedOutfits: new Set(['tammo:stadjer', 'anita:classic']),
  // what the story puts both of them in for a while (H6 to the train: black), over their own outfit
  storyOutfit: null,
  hair: { tammo: { color: 'naturel', style: 'short' }, anita: { color: 'naturel', style: 'long' } },
  vehicles: [], // one per stock key: { key, spec, color, upgrades, v, x, y, angle, lost }
  heroColor: null,
  heroUpgrades: [],
  rental: null,
  lastStealthAt: -Infinity,
  stamps: 0, // spaarkaart at Rook & Geluk
};
let baseLook = null;
let idSeq = 0;
let worldRef = null;

const snapshot = (a) => ({ shirt: a.shirt, pants: a.pants, shoes: a.shoes, hair: a.hair, hairStyle: a.hairStyle, cap: a.cap });

// --- placement ---------------------------------------------------------------

const WALK_ROAD = (r) => r.type !== 'footway' && r.type !== 'cycleway' && r.type !== 'path' && r.type !== 'steps' && r.type !== 'service' && r.type !== 'track';

function nearestStreetPoint(map, x, y, r = 60) {
  return nearestOnRoads(map, x, y, r, WALK_ROAD);
}

function containingBuilding(map, x, y) {
  return map.buildingsNear(x, y, 1).find((b) => {
    const [x0, y0, x1, y1] = b.bounds;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, b.pts);
  }) || null;
}

// The wall of `b` (or of the nearest building) that faces street point (sx, sy).
function facadeToward(map, b, sx, sy) {
  let best = null;
  for (const bb of b ? [b] : map.buildingsNear(sx, sy, 25)) {
    const pts = bb.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(sx, sy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y, b: bb, ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1] };
    }
  }
  if (!best || best.d2 < 0.01 || best.d2 > 40 * 40) return null;
  let nx = -(best.by - best.ay), ny = best.bx - best.ax;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  if (nx * (sx - best.x) + ny * (sy - best.y) < 0) { nx = -nx; ny = -ny; }
  const el = Math.hypot(best.bx - best.ax, best.by - best.ay) || 1;
  return { x: best.x, y: best.y, nx, ny, tx: (best.bx - best.ax) / el, ty: (best.by - best.ay) / el, h: Math.max(2.4, (best.b.h || 3) * 3.1) };
}

function doorClear(x, y, horeca, taken) {
  return !horeca.some((h) => dist(h.x, h.y, x, y) < 4.5) && !taken.some((t) => dist(t.x, t.y, x, y) < 5);
}

// A shop mapped inside its building gets the wall nearest the POI (its own
// frontage, also in malls where that is an inner passage); one mapped on the
// pavement gets the nearest wall facing it.
function facadeForPoi(map, poi) {
  const b = containingBuilding(map, poi.x, poi.y);
  if (!b) return facadeToward(map, null, poi.x, poi.y);
  const f = facadeToward(map, b, poi.x, poi.y);
  if (!f) return null;
  f.nx = -f.nx; f.ny = -f.ny;
  return f;
}

function placeAtPoi(map, poi, horeca, taken) {
  const st = nearestStreetPoint(map, poi.x, poi.y, 80);
  const f0 = facadeForPoi(map, poi);
  if (!f0) return kioskAt(map, poi, st, horeca, taken);
  for (const off of [0, 4, -4, 8, -8]) {
    const f = { ...f0, x: f0.x + f0.tx * off, y: f0.y + f0.ty * off };
    const [dx, dy] = map.escapeBuilding(f.x + f.nx * 1.3, f.y + f.ny * 1.3, 0.8);
    // a door onto a closed-off courtyard is no door
    if (isInWater(map, dx, dy) || !doorClear(dx, dy, horeca, taken) || !map.canWalkOut(dx, dy, 30)) continue;
    return { x: dx, y: dy, face: f, street: (st && st.road.name) || '' };
  }
  return null;
}

// No wall to hang the sign on: a free-standing sign on posts, facing the street.
function kioskAt(map, poi, st, horeca, taken) {
  if (!st) return null;
  const [x, y] = map.escapeBuilding(poi.x, poi.y, 0.8);
  if (isInWater(map, x, y) || !doorClear(x, y, horeca, taken)) return null;
  const d = Math.hypot(st.x - x, st.y - y) || 1;
  return { x, y, kiosk: { nx: (st.x - x) / d, ny: (st.y - y) / d }, street: st.road.name || '' };
}

function placeJetty(map, street, horeca, taken) {
  let best = null;
  for (const road of map.roads) {
    if (road.name !== street) continue;
    for (const [px, py] of road.pts) {
      for (const w of map.waterNear(px, py, 30)) {
        const pts = w.pts;
        for (let i = 0; i < pts.length - 1; i++) {
          const cp = closestPointOnSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
          if (cp.dist2 < 4 || cp.dist2 > 26 * 26) continue;
          if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, px, py, wx: cp.x, wy: cp.y, w };
        }
      }
    }
  }
  if (!best) return null;
  const d = Math.sqrt(best.d2);
  const ux = (best.wx - best.px) / d, uy = (best.wy - best.py) / d;
  let wx = best.wx + ux * 3.5, wy = best.wy + uy * 3.5;
  if (!pointInPolygon(wx, wy, best.w.pts)) return null;
  const [x, y] = map.escapeBuilding(best.wx - ux * 1.6, best.wy - uy * 1.6, 0.8);
  if (isInWater(map, x, y) || !doorClear(x, y, horeca, taken)) return null;
  // kiosk sign faces the street, away from the water
  return { x, y, water: { x: wx, y: wy, angle: Math.atan2(-ux, uy) }, kiosk: { nx: -ux, ny: -uy }, street };
}

// Out in the Ommelanden: branches at the real shops of the matching kind
// (facilities.js), one per type per village, the sign on the real
// building's street side; named after the village like the city's after
// the wijk. The city keeps its own picks (meta.shops, add_shops.py).
const COUNTRY_SHOPS = {
  super: ['supermarket', 'convenience'], snack: ['snack'], kapper: ['hairdresser', 'beauty'], kleding: ['clothes', 'shoes'],
  fietsenmaker: ['craft_bicycle', 'bicycle'], fietsen: ['bicycle'], tabak: ['tobacco', 'newsagent', 'kiosk'],
  auto: ['car'], tuning: ['car_parts', 'tyres'], pand: ['pawnbroker', 'second_hand'], wapens: ['outdoor'],
};
const COUNTRY_SPACING = 900;
// the real places of shopplaces.json (#175): more of them per village, each with its invented name
const SP_SPACING = 160;
const SP_PER_PLACE = 3;
// every kind whose real facilities get a shop door (main.js loads their tiles first)
export const COUNTRY_SHOP_KINDS = [...new Set(Object.values(COUNTRY_SHOPS).flat())];

export function placeCountryShops(map, horeca = [], taken = []) {
  const out = [];
  const used = new Set();
  for (const [type, kinds] of Object.entries(COUNTRY_SHOPS)) {
    const mine = [];
    // (the facilities whose tiles are in while this runs: facilities.js DOOR_BOX)
    const cands = countryFacilities(kinds).filter((f) => !used.has(f))
      .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.x - b.x || a.y - b.y);
    for (const f of cands) {
      if (f.sp ? mine.some((q) => dist(q.x, q.y, f.x, f.y) < SP_SPACING) || mine.filter((q) => q.wijk === f.place).length >= SP_PER_PLACE
        : mine.some((q) => dist(q.x, q.y, f.x, f.y) < COUNTRY_SPACING) || mine.some((q) => q.wijk === f.place)) continue;
      const p = countryDoor(map, f.x, f.y, (x, y) => doorClear(x, y, horeca, [...taken, ...out]));
      const wijk = f.place || (p && p.street);
      if (!p || !wijk) continue;
      used.add(f);
      const shop = { ...p, type, wijk, street: p.street || f.street, country: true };
      if (f.sp) { shop.fixedName = f.own; shop.building = f.bid; }
      mine.push(shop);
      out.push(shop);
    }
  }
  return out;
}

function nameBranches(list) {
  const byType = {};
  for (const s of list) (byType[s.type] = byType[s.type] || []).push(s);
  for (const [type, branches] of Object.entries(byType)) {
    const count = {};
    for (const b of branches) count[b.wijk] = (count[b.wijk] || 0) + 1;
    const used = new Set();
    branches.forEach((b, i) => {
      let suffix = b.wijk && count[b.wijk] === 1 ? b.wijk : b.street || b.wijk || String(i + 1);
      if (used.has(suffix)) suffix = `${suffix} ${i + 1}`;
      used.add(suffix);
      b.id = type + '-' + i;
      b.suffix = suffix;
      b.name = b.fixedName || `${SHOP_TYPES[type].chain} ${suffix}`;
      b.tagline = SHOP_TYPES[type].tagline;
    });
  }
}

function wijkAt(map, x, y) {
  let best = '', bd = Infinity;
  for (const h of map.meta.neighbourhoodPoints || []) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) { bd = d; best = h.name; }
  }
  return best;
}

export function initShops(world) {
  worldRef = world;
  initShopUi(world);
  baseLook = { tammo: snapshot(TAMMO_APPEARANCE), anita: snapshot(ANITA_APPEARANCE) };
  const map = world.map;
  const horeca = getHorecaForRender();
  const placed = [];
  for (const poi of map.meta.shops || []) {
    if (!SHOP_TYPES[poi.t]) continue;
    const p = placeAtPoi(map, poi, horeca, placed);
    if (p) placed.push({ ...p, type: poi.t, wijk: poi.wijk || wijkAt(map, p.x, p.y), street: p.street || poi.street });
  }
  for (const street of BOAT_JETTIES) {
    const p = placeJetty(map, street, horeca, placed);
    if (p && !placed.some((q) => q.type === 'boot' && dist(q.x, q.y, p.x, p.y) < 150)) placed.push({ ...p, type: 'boot', wijk: street });
  }
  const eikea = map.buildings.find((b) => b.landmark === 'EIKEA');
  if (eikea) {
    const cx = eikea.pts.reduce((a, q) => a + q[0], 0) / eikea.pts.length, cy = eikea.pts.reduce((a, q) => a + q[1], 0) / eikea.pts.length;
    const p = placeAtPoi(map, { x: cx, y: cy }, horeca, placed);
    if (p) placed.push({ ...p, type: 'eikea', wijk: 'Sontweg', street: p.street || 'Sontweg' });
  }
  for (const s of placed) {
    // a door can stand in a building of the tiles (past the city's data, or where an overlay tile fills its gaps): step out of it
    if (s.country) continue;
    const o = clearOfBuildings(map, s.x, s.y, (x, y) => !isInWater(map, x, y) && !map.buildingsNear(x, y, 1).some((b) => pointInPolygon(x, y, b.pts)));
    if (o) { s.x = o.x; s.y = o.y; }
  }
  const hd = HELI_DEALER;
  const hn = Math.hypot(hd.road[0] - hd.x, hd.road[1] - hd.y) || 1;
  placed.push({ x: hd.x, y: hd.y, type: 'heli', wijk: hd.wijk, street: hd.street, kiosk: { nx: (hd.road[0] - hd.x) / hn, ny: (hd.road[1] - hd.y) / hn }, pad: { ...hd.pad, angle: Math.atan2(hd.road[1] - hd.y, hd.road[0] - hd.x) + Math.PI / 2 } });
  nameBranches(placed);
  for (const s of placed) if (s.type === 'eikea') s.name = 'EIKEA Grunn';
  for (const s of placed) {
    if (s.type !== 'heli') continue;
    s.name = 'Rotor Roelf Eelde';
    registerHelipad({ id: 'eelde', x: s.pad.x, y: s.pad.y, r: s.pad.r, z: PAD_DECK, name: s.name, exit: true, label: 'Rotor Roelf · E uitstappen' });
  }
  shops = placed;
  declutterCache.clear();
}

// The real shops out in the Ommelanden, a door on open ground on the tiles
// round them (in while this runs; main.js): added after the city's, named like them.
export function initCountryShops(world) {
  const country = placeCountryShops(world.map, getHorecaForRender(), shops);
  if (!country.length) return;
  // the heli dealer stays last
  const i = shops.findIndex((s) => s.type === 'heli');
  const all = i < 0 ? shops.concat(country) : [...shops.slice(0, i), ...country, ...shops.slice(i)];
  nameBranches(all);
  for (const s of all) if (s.type === 'eikea') s.name = 'EIKEA Grunn';
  for (const s of all) if (s.type === 'heli') s.name = 'Rotor Roelf Eelde';
  shops = all;
  declutterCache.clear();
}

export function getShopsForRender() {
  return shops;
}

// The city's shops near the edge of its data stand where the city's own map put
// them; a building of the tiles round that edge (an overlay tile) can stand there
// too. Once those tiles are in (ommelandfun.js prepareOmmeland) the door steps out of it.
export async function prepareShopDoors(map) {
  const near = shops.filter((s) => !s.country && s.type !== 'heli' && edgeDistance(s.x, s.y) > -500);
  if (!near.length) return;
  await withTiles(map, near.map((s) => [s.x, s.y]), () => {
    for (const s of near) {
      const o = clearOfBuildings(map, s.x, s.y, (x, y) => !isInWater(map, x, y) && !map.buildingsNear(x, y, 1).some((b) => pointInPolygon(x, y, b.pts)));
      if (o) { s.x = o.x; s.y = o.y; }
    }
  }, { radius: 60, token: 'shopdoors', slice: 6 });
  declutterCache.clear();
}

// One icon per type per grid cell, for the minimap and zoomed-out map.
const declutterCache = new Map();
export function getShopsDecluttered(cellM) {
  cellM = 2 ** Math.round(Math.log2(Math.max(0.5, cellM)));
  const key = cellM;
  let out = declutterCache.get(key);
  if (out) return out;
  const seen = new Set();
  out = [];
  for (const s of shops) {
    const k = s.type + ':' + Math.floor(s.x / cellM) + ',' + Math.floor(s.y / cellM);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  declutterCache.set(key, out);
  return out;
}

export function getOwnedVehiclesForRender() {
  return state.vehicles.filter((o) => o.v && !o.v.wrecked).map((o) => ({ v: o.v, label: o.spec.label }));
}

// The bought collection (ownedvehicles.js builds the garage/phone views on it).
export function getOwnedEntries() {
  return state.vehicles;
}

// Every car you own, with its top speed (m/s) after upgrades: the Escapade first.
export function ownedCarTops() {
  const top = (m, ups) => (ups || []).reduce((t, id) => t * ((CAR_UPGRADES.find((u) => u.id === id) || { mult: {} }).mult.maxSpeed || 1), m.maxSpeed);
  const out = [{ hero: true, label: 'Escapade', name: HERO_CAR_MODEL.name, top: top(HERO_CAR_MODEL, state.heroUpgrades) }];
  for (const o of state.vehicles) if (o.spec.kind === 'car') out.push({ label: o.spec.label, name: o.spec.model.name, top: top(o.spec.model, o.upgrades) });
  return out;
}

export function getHeroLook() {
  return { color: state.heroColor, upgrades: [...state.heroUpgrades] };
}

// Puts owned entry o in the world at (x, y, angle): the old instance goes first,
// so there is never more than one of it.
export function spawnOwnedEntry(world, o, x, y, angle) {
  if (o.v && o.v.driver === 'player') return null;
  if (o.v) removeFromWorld(world, o.v);
  const v = spawnOwned(world, o, x, y, angle);
  if (!v) return null;
  if (!v.isHeli) v.z = world.map.spawnZ ? world.map.spawnZ(x, y) : 0;
  o.v = v;
  o.lost = false;
  return v;
}

// A vehicle from the stock that is not in the collection (cheats.js
// Showroom): not saved, never theft. Same placement rules as spawnOwnedEntry.
export function spawnStockVehicle(world, key, x, y, angle) {
  const spec = VEHICLE_STOCK[key];
  if (!spec) return null;
  const v = spawnOwned(world, { key, spec, color: spec.color, upgrades: [] }, x, y, angle);
  if (!v) return null;
  if (!v.isHeli) v.z = world.map.spawnZ ? world.map.spawnZ(x, y) : 0;
  return v;
}

export function replacementFee(o) {
  return Math.max(40, Math.round(o.spec.price * 0.15 / 5) * 5);
}

// --- interaction -------------------------------------------------------------

export function nearestShop(world) {
  if (!shops.length || world.player.inVehicle || world.player.swimming) return null;
  const { x, y } = world.player;
  let best = null, bestD = SHOP_USE_RADIUS;
  for (const s of shops) {
    if (Math.abs(s.x - x) > bestD || Math.abs(s.y - y) > bestD) continue;
    const d = dist(x, y, s.x, s.y);
    if (d <= bestD) { best = s; bestD = d; }
  }
  return best;
}

function paintableVehicle(v) {
  return v && !v.isBoat && !v.isHeli && !v.isBus && !v.isPolice && !v.wrecked;
}

function garageForPaint() {
  return null;
}

const isTwoWheeler = (v) => !!(v && (v.isBike || v.isScooter));
const isMotorised = (m) => !!(m && (m.motorbike || m.geared));
const isCar = (v) => paintableVehicle(v) && !v.isBike && !v.isScooter;

// Stopped in the right vehicle at a fietsenmaker / tuning shop.
function workshopFor(world) {
  const v = world.player.inVehicle;
  if (!v || Math.abs(v.speed) > 2) return null;
  const type = isTwoWheeler(v) ? 'fietsenmaker' : isCar(v) ? 'tuning' : v.isBoat && !v.wrecked && !isSailBoat(v) ? 'boot' : null;
  if (!type) return null;
  for (const s of shops) {
    if (s.type !== type) continue;
    // the werf works on boats at the rental jetty
    if (type === 'boot' ? s.water && dist(v.x, v.y, s.water.x, s.water.y) < WERF_RADIUS : dist(v.x, v.y, s.x, s.y) < WORKSHOP_RADIUS) return s;
  }
  return null;
}

function policeWatching(world) {
  return world.wanted > 0 && !!(world.police && world.police.seenRecently);
}

// "Voor het verhaal: koop een wapen bij …" when the story route ends at shop s.
function storyHere(world, s) {
  const g = world.storyGuide;
  if (!g || !g.buy || g.shopId !== s.id) return '';
  const t = g.name.replace(/^Eerst: /, '');
  return `Voor het verhaal: ${t.charAt(0).toLowerCase() + t.slice(1)}`;
}

export function shopPrimaryPrompt(world) {
  const g = garageForPaint(world);
  if (g) return { id: 'paint-' + g.x, x: g.x, y: g.y, h: 2.6, key: 'R', label: 'Nieuwe lak', sub: `Spuit & Klaar: kies een kleur, €${PAINT_PRICE}`, ring: true };
  const ws = workshopFor(world);
  if (ws) return { id: 'ws-' + ws.id, x: ws.x, y: ws.y, h: 2.75, key: 'R', label: ws.type === 'tuning' ? 'Laten tunen' : ws.type === 'boot' ? 'Boot tunen' : 'Laten sleutelen', sub: storyHere(world, ws) || (ws.type === 'boot' ? `${ws.name}: de werf` : ws.name), ring: true };
  const s = nearestShop(world);
  if (!s) return null;
  if (policeWatching(world)) return { id: 'shop-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Binnenlopen', sub: `${s.name}: deur op slot, politie op je hielen`, ring: true, dim: true };
  return { id: 'shop-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: s.type === 'boot' ? 'Bootje huren' : s.type === 'heli' ? 'Helikopters bekijken' : 'Binnenlopen', sub: storyHere(world, s) || `${s.name}: ${SHOP_TYPES[s.type].label.toLowerCase()}`, ring: true };
}

export function shopSecondaryPrompts(world) {
  if (world.player.inVehicle) return [];
  const { x, y } = world.player;
  const out = [];
  for (const s of shops) {
    if (Math.abs(s.x - x) > 16 || Math.abs(s.y - y) > 16) continue;
    out.push({ id: 'shop2-' + s.id, x: s.x, y: s.y, h: 2.2, label: s.name, sub: SHOP_TYPES[s.type].label, kind: 'place' });
  }
  return out;
}

// Runs before the horeca/player E handlers so E at a shop door opens the
// menu; R in a vehicle at Spuit & Klaar / a workshop opens that menu (E
// there still exits the vehicle).
export function tryShopInteract(world) {
  const { input } = world;
  if (!input || isShopOpen() || isCinematicActive()) return false;
  if (input.wasPressed('r')) {
    const g = garageForPaint(world);
    const ws = g ? null : workshopFor(world);
    if (g || ws) {
      input.consume('r');
      if (ws) { shopVisits[ws.type] = (shopVisits[ws.type] || 0) + 1; prepareStoryShop(); }
      openShopMenu(world, g ? paintShop(world) : shopMenu(world, ws, ws.type === 'boot'));
      return true;
    }
  }
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestShop(world);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  if (policeWatching(world)) {
    world.addMessage(`${s.name} gooit de deur op slot. Eerst de politie kwijt!`, 3);
    return true;
  }
  shopVisits[s.type] = (shopVisits[s.type] || 0) + 1;
  prepareStoryShop();
  if (world.audioEvents && world.audioEvents.length < 64) world.audioEvents.push({ kind: 'fx', name: 'shop_bell', x: s.x, y: s.y });
  openShopMenu(world, shopMenu(world, s));
  return true;
}

// --- menus ---------------------------------------------------------------------

function pay(world, price) {
  if (!Number.isFinite(price) || price < 0) { console.warn('prijs zonder waarde', price); return false; }
  if (world.money < price) return false;
  noteMoney('Winkels');
  world.money -= price;
  recordStat(world, 'purchases');
  recordStat(world, 'spent', price);
  return true;
}

const hexCss = (n) => '#' + n.toString(16).padStart(6, '0');
const broke = (world, price) => world.money < price ? 'Te weinig geld' : '';

// --- preview + stats for the shop menu (shopui.js) -------------------------------
// preview: a vehiclepreview.js spec; stats: [{ label, v, to, text }] with v/to
// in 0..1 (to = after buying); effect: a short line on what it does.

const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));
const productPreview = (id) => { const k = productKey(id); return k ? { kind: 'product', product: k } : null; };
const barStat = (label, now, after, max, unit = '') => ({ label, v: clamp01(now / max), to: after == null ? null : clamp01(after / max), text: after == null || Math.round(after) === Math.round(now) ? `${Math.round(now)}${unit}` : `${Math.round(now)} → ${Math.round(after)}${unit}` });
const healthStat = (world, hp) => barStat('Gezondheid', world.health, Math.min(100, world.health + hp), 100);
const armorStat = (world, amount) => barStat('Pantser', world.armor, Math.min(100, world.armor + amount), 100);

function weaponStats(key, entry) {
  const w = WEAPONS[key] || {};
  const blast = w.kind === 'throw' || w.kind === 'rocket';
  const dmg = (w.damage || 0) * (w.pellets || 1);
  const rate = w.cooldown ? 1 / w.cooldown : 0;
  return [
    { label: 'Schade', v: blast ? (w.kind === 'throw' ? 0.95 : 0.8) : clamp01(dmg / 100), text: blast ? 'Knal' : w.kind === 'water' ? 'Nat' : String(dmg) },
    { label: 'Bereik', v: clamp01(Math.log(1 + (w.range || 0)) / Math.log(111)), text: `${w.range || 0} m` },
    { label: 'Snelheid', v: clamp01(Math.sqrt(rate / 12.5)), text: `${rate.toFixed(1)}/s` },
    entry.melee ? { label: 'Munitie', v: 1, text: 'Onbeperkt' } : { label: 'Munitie', v: clamp01(Math.sqrt(entry.cap / 600)), text: `${entry.ammo} per koop · max ${entry.cap}` },
  ];
}

const VSTAT = [['maxSpeed', 'Topsnelheid'], ['accel', 'Acceleratie'], ['brake', 'Remmen'], ['turnRate', 'Wendbaarheid']];
const vclass = (kind) => kind === 'car' ? 'car' : kind === 'boat' ? 'boat' : 'two';
let vmax = null;
function statMax(cls) {
  if (!vmax) {
    vmax = {};
    const models = [...Object.values(VEHICLE_STOCK).map((sp) => [vclass(sp.kind), sp.model]), ...RENTALS.map((r) => ['boat', r.model])];
    for (const [c, m] of models) {
      const o = vmax[c] || (vmax[c] = {});
      for (const [k] of VSTAT) o[k] = Math.max(o[k] || 0, (k === 'maxSpeed' ? playerTopSpeed(m) : m[k] || 0) * (k === 'maxSpeed' || k === 'accel' ? 1.45 : 1.3));
    }
  }
  return vmax[cls] || vmax.car;
}

// Driving stats of a model; `after` (another model) shows the change.
export function vehicleStats(model, kind, after = null) {
  const max = statMax(vclass(kind));
  return VSTAT.map(([k, label]) => {
    // the top speed as the player rides it (a fatbike's model is the AI's)
    const a = k === 'maxSpeed' ? playerTopSpeed(model) : model[k] || 0;
    const b = !after ? null : k === 'maxSpeed' ? playerTopSpeed(after, model) : after[k] || 0;
    const pct = b != null && a ? Math.round((b / a - 1) * 100) : 0;
    const base = k === 'maxSpeed' ? `${Math.round(a * 3.6)} km/u` : '';
    return { label, v: clamp01(a / max[k]), to: b == null ? null : clamp01(b / max[k]), text: pct ? `${base ? base + ' ' : ''}+${pct}%` : base };
  });
}

const vehicleKind = (v) => v.isBoat ? 'boat' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : 'car';

// Your own vehicle as the preview shows it (optionally in another colour).
export function vehiclePreviewOf(v, color) {
  const model = color && v.isPolice ? { ...v.model, resprayed: true } : v.model;
  return { kind: vehicleKind(v), model, color: color || (v.model && v.model.color), nameIdx: v.id % 6, flags: v.isHeroCar ? { isHeroCar: true } : v.isPolice ? { isPolice: true } : v.isTaxi ? { isTaxi: true } : null };
}

// The current character with outfit/hair overrides, for the clothing previews.
function lookWith(world, over, look = null) {
  const app = world.player.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  return { kind: 'person', look: { ...app, ...over, look }, frame: look ? 'head' : null };
}

function shopMenu(world, s, werf = false) {
  const build = {
    wapens: weaponSections, kleding: outfitSections, kapper: hairSections, tabak: tabakSections,
    fietsen: (w) => vehicleSections(w, 'fietsen', s), auto: (w) => vehicleSections(w, 'auto', s),
    super: (w) => [...foodSections(w, 'Uit de schappen', SUPER_ITEMS), ...dierenSections(w)], snack: (w) => foodSections(w, 'Uit het vet', SNACK_ITEMS),
    fietsenmaker: (w) => workshopSections(w, s, true), tuning: (w) => workshopSections(w, s, false),
    pand: (w) => pandSections(w, s), boot: (w) => (werf ? workshopSections(w, s, 'boat') : bootSections(w, s)), eikea: eikeaSections,
    heli: (w) => vehicleSections(w, 'heli', s),
  }[s.type];
  const view = () => markStoryItems(world, s.type, build(world));
  return { name: werf ? `${s.name} · werf` : s.name, type: s.type, tagline: werf ? 'Sneller over het water' : s.tagline, color: SHOP_TYPES[s.type].color, view, sections: () => view().sections, onBought: (it) => noteStoryPurchase(it.id) };
}

// De dierenhoek van de Avondwinkel (#193, dierenregister.js): dieren adopteren, verzorgen en uitrusten.
// Wat je hebt komt in het dierenbezit (gde-dieren-v1); een dier dat niet te koop is, staat er niet in.
const dierenStore = () => (typeof localStorage !== 'undefined' ? localStorage : null);
function dierenSections(world) {
  const store = dierenStore();
  let bezit = loadBezit(store, KEYS.dieren);
  const koopItems = DIEREN.filter((d) => d.kopen).map((d) => ({
    id: 'dr-' + d.id, label: `${d.naam} adopteren`, desc: `${d.boek} Woont ${{ erf: 'op het erf', huis: 'bij je thuis', vijver: 'in de vijver', duiventil: 'in de duiventil' }[d.kopen.houden]}.`,
    price: d.kopen.prijs, keepFocus: true, disabled: koopBlokkade(bezit, d.id, world.money) || '',
    buy() {
      const r = koop(bezit, d.id, world.money);
      if (r.fout || !pay(world, r.prijs)) return null;
      saveBezit(store, KEYS.dieren, r.bezit);
      return `${r.dier.naam} is nu van jou`;
    },
  }));
  const eigen = [];
  for (const x of bezit.dieren) {
    const d = dierById(x.id);
    for (const u of d.upgrades) {
      eigen.push({
        id: `du-${x.uid}-${u.id}`, label: `${x.naam}: ${u.label}`, desc: `${u.effect} · ${stemming(x)}`, price: u.prijs, keepFocus: true,
        disabled: upgradeBlokkade(bezit, x.uid, u.id, world.money) || '',
        buy() {
          const r = upgrade(bezit, x.uid, u.id, world.money);
          if (r.fout || !pay(world, r.prijs)) return null;
          saveBezit(store, KEYS.dieren, r.bezit);
          return `${x.naam}: ${u.label.toLowerCase()} gedaan`;
        },
      });
    }
  }
  const sections = [{ title: 'Dierenhoek', note: `Je houdt ${bezit.dieren.length} dieren`, items: koopItems }];
  if (eigen.length) sections.push({ title: 'Voor je dieren', note: 'Verzorgen, trainen en uitrusten', items: eigen });
  return sections;
}

// Food heals; at full health it is still for sale, to take away.
function foodItem(world, id, label, desc, price, hp, product, eaten) {
  const full = world.health >= 100;
  return {
    id, label, desc: full ? `${desc} · je zit vol: om mee te nemen` : `${desc} · +${hp} gezondheid`, price, keepFocus: true,
    preview: productPreview(product), stats: [healthStat(world, hp)], effect: full ? 'Om mee te nemen' : `+${hp} gezondheid`,
    disabled: broke(world, price),
    buy() {
      if (!pay(world, price)) return null;
      if (world.health >= 100) return `${label} ingepakt, voor straks`;
      world.health = Math.min(100, world.health + hp);
      return eaten(label);
    },
  };
}

function foodSections(world, title, list) {
  const items = list.map(([id, label, desc, price, hp]) => foodItem(world, 'f-' + id, label, desc, price, hp, 'f_' + id, () => `${label}: lekker! Gezondheid ${Math.round(world.health)}`));
  return [{ title, note: `Gezondheid nu ${Math.round(world.health)}`, items }];
}

// --- upgrades --------------------------------------------------------------------

const PERF_KEYS = ['maxSpeed', 'accel', 'brake', 'turnRate'];

function applyUpgrades(v) {
  if (!v.upgrades || !v.upgrades.length) return;
  if (!v._baseModel) v._baseModel = { ...v.model };
  const list = upgradeListFor(v);
  const m = { ...v.model };
  for (const k of PERF_KEYS) m[k] = v._baseModel[k];
  for (const id of v.upgrades) {
    const u = list.find((x) => x.id === id);
    if (u) for (const [k, f] of Object.entries(u.mult)) m[k] = +(m[k] * f).toFixed(3);
  }
  v.model = m;
}

// The ride being worked on: the one you sit on, else your own parked by the door.
function upgradeTarget(world, shop, twoWheel) {
  const fits = (x) => x && !x.wrecked && (twoWheel === 'boat' ? x.isBoat && upgradeListFor(x).length > 0 : !x.isBoat && (twoWheel ? isTwoWheeler(x) : isCar(x)));
  if (twoWheel === 'boat') shop = shop.water || shop;
  const pv = world.player.inVehicle;
  if (fits(pv)) return pv;
  let best = null, bd = 15;
  for (const x of world.vehicles) {
    if (!fits(x) || x.driver || !(x.playerOwned || x.isHeroCar)) continue;
    const d = dist(x.x, x.y, shop.x, shop.y);
    if (d < bd) { bd = d; best = x; }
  }
  return best;
}

function rememberUpgrades(v) {
  if (v.isHeroCar) state.heroUpgrades = [...v.upgrades];
  const o = state.vehicles.find((x) => x.v === v);
  if (o) o.upgrades = [...v.upgrades];
}

// Upgrade items for vehicle v (tuning shops, fietsenmakers and garages).
export function vehicleUpgradeItems(world, v) {
  if (!v || v.isHeli || v.isBus || v.isPolice || v.wrecked || (v.isBoat && !upgradeListFor(v).length)) return [];
  const list = upgradeListFor(v);
  const have = new Set(v.upgrades || []);
  const name = v.isHeroCar ? 'Escapade' : vehicleName(v);
  return list.map((u) => ({
    id: 'u-' + u.id, label: u.label, desc: u.desc, price: u.price,
    tag: have.has(u.id) ? 'Zit erop' : '', ...upgradeLook(v, u, have),
    disabled: have.has(u.id) ? 'Al gedaan' : broke(world, u.price),
    buy() {
      if (!pay(world, u.price)) return null;
      v.upgrades = [...have, u.id];
      applyUpgrades(v);
      rememberUpgrades(v);
      return `${u.label} erop. Je ${name} gaat als een speer!`;
    },
  }));
}

// Preview (your own ride) and before/after stats for upgrade u on v.
function upgradeLook(v, u, have) {
  const after = have.has(u.id) ? null : { ...v.model };
  if (after) for (const [k, f] of Object.entries(u.mult)) after[k] = (after[k] || 0) * f;
  return { preview: vehiclePreviewOf(v), stats: vehicleStats(v.model, vehicleKind(v), after) };
}

// Paint job items for vehicle v (Spuit & Klaar in every garage).
export function paintItems(world, v) {
  if (!paintableVehicle(v)) return [];
  return paintShop(world).sections()[0].items;
}

function workshopSections(world, shop, twoWheel) {
  const v = upgradeTarget(world, shop, twoWheel);
  const boat = twoWheel === 'boat';
  const what = boat ? 'boot' : twoWheel ? 'fiets of e-step' : 'auto';
  if (!v) return [{ title: boat ? 'Werf' : 'Werkplaats', note: boat ? 'Vaar je eigen boot naar de steiger en druk R' : `Kom erop of erin aanrijden en druk R, of zet je eigen ${what} voor de deur`, items: [] }];
  const list = upgradeListFor(v);
  const have = new Set(v.upgrades || []);
  const name = v.isHeroCar ? 'Escapade' : vehicleName(v);
  const items = list.map((u) => ({
    id: 'u-' + u.id, label: u.label, desc: u.desc, price: u.price,
    tag: have.has(u.id) ? 'Zit erop' : '', ...upgradeLook(v, u, have),
    disabled: have.has(u.id) ? 'Al gedaan' : broke(world, u.price),
    buy() {
      if (!pay(world, u.price)) return null;
      v.upgrades = [...have, u.id];
      applyUpgrades(v);
      rememberUpgrades(v);
      return `${u.label} erop. Je ${name} gaat als een speer!`;
    },
  }));
  const fixPrice = boat ? 25 : twoWheel ? 5 : 35;
  items.push({
    id: 'u-fix', label: boat ? 'Romp plamuren & lakken' : twoWheel ? 'Band plakken & rechtzetten' : 'Deuken eruit', desc: 'Weer helemaal heel', price: fixPrice,
    preview: vehiclePreviewOf(v), stats: [barStat('Staat', v.health ?? 100, 100, 100, '%')],
    disabled: (v.health ?? 100) >= 100 && !v.riderOff ? 'Mankeert niks' : broke(world, fixPrice),
    buy() {
      if (!pay(world, fixPrice)) return null;
      v.health = 100;
      v.riderOff = false;
      v.damage = null;
      v.dentLog = [];
      v.meshDirty = true;
      return 'Als nieuw';
    },
  });
  return [{ title: `Aan je ${name}`, note: v.playerOwned || v.isHeroCar ? '' : 'Let op: niet jouw voertuig. Upgrades blijven er niet aan hangen', items }];
}

function vehicleName(v) {
  const o = state.vehicles.find((x) => x.v === v);
  if (o) return o.spec.label;
  return v._mount === 'horse' ? 'paard' : v.isScooter ? 'e-step' : v.isBike ? (v.model.fat ? 'fatbike' : 'fiets') : 'bak';
}

// --- pawn shop ----------------------------------------------------------------------

function resaleValue(v) {
  const base = v.isPolice ? RESALE.police : v.isBike && v.model.fat ? 45 : RESALE[v.model.name] ?? 100;
  return Math.round(base * Math.max(0.3, Math.min(1, (v.health ?? 100) / 100)));
}

function pandSections(world, shop) {
  const sell = [];
  for (const w of WEAPON_STOCK) {
    const n = world.ammo[w.key] || 0;
    if (n <= 0) continue;
    const income = Math.round(w.melee ? w.gun * 0.4 : w.gun * 0.3 + n * 0.4);
    sell.push({
      id: 's-' + w.key, preview: { kind: 'weapon', weapon: w.key }, label: `${w.label.split(' ')[0]} verkopen`, desc: w.melee ? 'Nauwelijks gebruikt, zegt de verkoper' : `Met ${n} ${w.unit || 'patronen'}, geen vragen`, price: 0, income,
      buy() {
        world.ammo[w.key] = 0;
        if (world.weapon === w.key) world.weapon = 'fists';
        noteMoney('Verkoop');
        world.money += income;
        return `+€${income}. Nooit gezien, dat ding`;
      },
    });
  }
  if (world.armor >= 10) {
    const income = Math.round(world.armor * 0.6);
    sell.push({ id: 's-armor', preview: productPreview('vest'), stats: [barStat('Pantser', world.armor, 0, 100)], label: 'Vest verkopen', desc: `Pantser ${Math.round(world.armor)}, bijna niet gebruikt`, price: 0, income,
      buy() { world.armor = 0; noteMoney('Verkoop'); world.money += income; return `+€${income} voor je vest`; } });
  }
  for (const v of world.vehicles) {
    if (!v.stolenByPlayer || v.playerOwned || v.isHeroCar || v.missionCar || v.wrecked || v.isBoat || v.driver) continue;
    if (dist(v.x, v.y, shop.x, shop.y) > SELL_RADIUS) continue;
    const income = resaleValue(v);
    sell.push({
      id: 's-v' + v.id, preview: vehiclePreviewOf(v), label: `Gejatte ${vehicleName(v)} verkopen`, desc: v.isPolice ? 'Politiewagen! Heel link: de politie komt erachter' : 'Staat voor de deur, wordt vannacht omgekat', price: 0, income,
      buy() {
        removeFromWorld(world, v);
        world.money += income;
        if (v.isPolice) world.wanted = Math.max(world.wanted, 2);
        return `+€${income}. Die zie je nooit meer terug`;
      },
    });
  }
  if (!sell.length) sell.push({ id: 's-none', label: 'Niks te verkopen', desc: 'Kom terug met wapens, een vest of een gejatte bak voor de deur', price: 0, disabled: 'Lege zakken' });
  const buy = [
    { id: 'b-vest', label: 'Gebruikt vestje', desc: '+30 pantser, klein gaatje', price: 20, preview: productPreview('vest'), stats: [armorStat(world, 30)], effect: '+30 pantser',
      disabled: world.armor >= 100 ? 'Pantser is al vol' : broke(world, 20),
      buy() { if (!pay(world, 20)) return null; world.armor = Math.min(100, world.armor + 30); return 'Vestje aan. Past bijna'; } },
    { id: 'b-pistol', label: 'Pistool uit de achterkamer', desc: 'Met 12 patronen, geen bonnetje', price: 80,
      preview: { kind: 'weapon', weapon: 'pistol' }, stats: weaponStats('pistol', { ammo: 12, cap: 250 }),
      disabled: (world.ammo.pistol || 0) >= 250 ? 'Zak zit vol' : broke(world, 80),
      buy() {
        if (!pay(world, 80)) return null;
        world.ammo.pistol = Math.min(250, (world.ammo.pistol || 0) + 12);
        if (world.weapon === 'fists') world.weapon = 'pistol';
        return 'Pistool gekocht. Wij hebben elkaar nooit gezien';
      } },
  ];
  return [{ title: 'Kopen: koopjes uit de achterkamer', items: buy }, { title: 'Verkopen', items: sell }];
}

// --- boat rental ---------------------------------------------------------------------

const RENTALS = [
  { id: 'sloep', label: 'Sloep "Nait Soezen"', desc: 'Rustig tuffen door de grachten', price: 40, nameIdx: 0, model: { ...BOAT_KINDS.sloep } },
  { id: 'speed', label: 'Speedbootje "Grachtengast"', desc: 'Harder dan mag. Niet tegen de wal!', price: 90, nameIdx: 1, model: { name: 'boat', kind: 'sloep', len: 5.2, wid: 1.9, playerTop: 25, playerAccel: 7, maxSpeed: 7.5, accel: 2.8, brake: 2.8, turnRate: 1.7, color: '#c9a227', cabin: '#1c1c1c' } },
  { id: 'kano', label: 'Kano', desc: 'Zelf peddelen, met z\'n tweeën in één kano', price: 15, nameIdx: 0, model: { ...BOAT_KINDS.kano } },
  { id: 'kajak', label: 'Kajak', desc: 'Voor één, laag bij het water', price: 12, nameIdx: 0, model: { ...BOAT_KINDS.kajak } },
  { id: 'waterfiets', label: 'Waterfiets', desc: 'Samen trappen, geen haast', price: 20, nameIdx: 1, model: { ...BOAT_KINDS.waterfiets } },
  { id: 'dinghy', label: 'Bijbootje met motortje', desc: 'Klein, wendbaar, beetje lek', price: 25, nameIdx: 0, model: { ...BOAT_KINDS.dinghy } },
  { id: 'rubber', label: 'Rubberboot', desc: 'Buitenboordmotor, stuitert over het water', price: 70, nameIdx: 0, model: { ...BOAT_KINDS.rubberboot } },
  { id: 'rondvaart', label: 'Rondvaartboot', desc: 'Lang, traag en met een glazen dak', price: 150, nameIdx: 1, model: { ...BOAT_KINDS.rondvaart } },
];

function bootSections(world, shop) {
  const items = RENTALS.map((r) => ({
    id: 'r-' + r.id, label: r.label, desc: `${r.desc} · ligt aan de steiger`, price: r.price, verb: 'Huren voor', disabled: broke(world, r.price),
    preview: { kind: 'boat', model: r.model, color: r.model.color, nameIdx: r.nameIdx }, stats: vehicleStats(r.model, 'boat'),
    buy() {
      if (!pay(world, r.price)) return null;
      const v = rentBoat(world, shop, r);
      if (!v) { world.money += r.price; return 'Geen plek aan de steiger, geld terug'; }
      return `${r.label} ligt klaar aan de steiger. Veel plezier!`;
    },
  }));
  return [{ title: 'Te huur', note: state.rental && !state.rental.wrecked ? 'Je vorige huurboot wordt teruggebracht' : '', items }, ...vehicleSections(world, 'boot', shop)];
}

// The jetty point suits a small boat; a long one slides along the quay (and a
// little further out) until its whole hull is clear of banks, other jetties
// and moored houseboats.
function fitBerth(map, v, shop) {
  const { x, y, angle } = shop.water;
  const ax = Math.cos(angle), ay = Math.sin(angle);
  const ox = -shop.kiosk.nx, oy = -shop.kiosk.ny;
  const hl = (v.model.len || 4) / 2;
  const clear = (px, py, a) => boatDryPoints(map, v, px, py, a) === 0
    && ![-hl, 0, hl].some((l) => map.isOnBridge(px + Math.cos(a) * l, py + Math.sin(a) * l));
  for (let d = 0; d <= 30; d += 1.5) {
    for (const s of d ? [1, -1] : [1]) {
      for (const o of [0, 0.75, 1.5, 2.5]) {
        const px = x + ax * d * s + ox * o, py = y + ay * d * s + oy * o;
        if (clear(px, py, angle)) return { x: px, y: py, angle };
      }
    }
  }
  return { x, y, angle };
}

function rentBoat(world, shop, r) {
  const map = world.map;
  const poly = waterPolyAt(map, shop.water.x, shop.water.y);
  if (!poly) return null;
  const v = spawnBoatOnWater(map, poly);
  if (!v) return null;
  if (state.rental) removeFromWorld(world, state.rental);
  v.model = { ...r.model };
  const berth = fitBerth(map, v, shop);
  v.x = berth.x; v.y = berth.y; v.angle = berth.angle;
  v.waterPoly = null; // no AI wandering: it waits at the jetty
  v.id = newVehicleId(r.nameIdx);
  v.playerOwned = true;
  v.speed = 0;
  world.vehicles.push(v);
  state.rental = v;
  return v;
}

function weaponItem(world, w) {
  const have = world.ammo[w.key] || 0;
  const owned = have > 0;
  if (w.melee) {
    return {
      id: 'w-' + w.key, label: w.label, desc: w.desc, price: owned ? 0 : w.gun, tag: owned ? 'In bezit' : '',
      preview: { kind: 'weapon', weapon: w.key }, stats: weaponStats(w.key, w),
      disabled: owned ? 'Heb je al' : broke(world, w.gun),
      buy() {
        if (!pay(world, w.gun)) return null;
        world.ammo[w.key] = 1;
        if (world.weapon === 'fists') world.weapon = w.key;
        return `${w.label} gekocht. Toets 1 om te wisselen`;
      },
    };
  }
  const unit = w.unit || 'patronen';
  const price = owned ? w.ammoPrice : w.gun;
  return {
    id: 'w-' + w.key,
    label: owned ? `${w.label.split(' ')[0]}: ${unit} erbij` : w.label,
    desc: owned ? `+${w.ammo} ${unit} · nu ${have}` : `${w.desc} · met ${w.ammo} ${unit}`,
    price, preview: { kind: 'weapon', weapon: w.key }, stats: weaponStats(w.key, w),
    effect: owned ? `${have} → ${Math.min(w.cap, have + w.ammo)} ${unit}` : '',
    disabled: have >= w.cap ? 'Zak zit vol' : broke(world, price),
    buy() {
      if (!pay(world, price)) return null;
      world.ammo[w.key] = Math.min(w.cap, have + w.ammo);
      if (world.weapon === 'fists' || !(world.ammo[world.weapon] > 0)) world.weapon = w.key;
      return owned ? `${w.ammo} ${unit} erbij` : `${w.label} gekocht. Voorzichtig ermee, jong`;
    },
  };
}

const KNALLERS = new Set(['carbidbus', 'vuurwerk', 'waterpistool']);

function weaponSections(world) {
  const guns = WEAPON_STOCK.filter((w) => !w.melee && !KNALLERS.has(w.key)).map((w) => weaponItem(world, w));
  const knallers = WEAPON_STOCK.filter((w) => KNALLERS.has(w.key)).map((w) => weaponItem(world, w));
  const melee = WEAPON_STOCK.filter((w) => w.melee).map((w) => weaponItem(world, w));
  const vest = (amount, price, label, desc) => ({
    id: 'armor-' + amount, label, desc: `${desc} · pantser nu ${Math.round(world.armor)}`, price,
    preview: productPreview(amount >= 100 ? 'vest' : 'bodywarmer'), stats: [armorStat(world, amount)], effect: `+${amount} pantser`,
    disabled: world.armor >= 100 ? 'Pantser is al vol' : broke(world, price),
    buy() {
      if (!pay(world, price)) return null;
      world.armor = Math.min(100, world.armor + amount);
      return `${label} aangetrokken`;
    },
  });
  return [
    { title: 'Wapens & munitie', items: guns },
    { title: 'Knallers & spetters', note: 'Toets 4 voor bus en pijlen, 2 voor het waterpistool', items: knallers },
    { title: 'Slag- en stootwerk', note: 'Toets 1 wisselt tussen vuisten en wat je hebt', items: melee },
    { title: 'Bescherming', items: [vest(50, 50, 'Bodywarmer met plaatjes', '+50 pantser'), vest(100, 90, 'Kogelwerend vest', 'Volle bescherming')] },
  ];
}

function currentChar(world) {
  return world.player.character === 'anita' ? 'anita' : 'tammo';
}

function outfitSections(world) {
  const ch = currentChar(world);
  const name = ch === 'anita' ? 'Tessa' : 'Tammo';
  const items = OUTFITS[ch].map((o) => {
    const key = ch + ':' + o.id;
    const owned = state.ownedOutfits.has(key);
    const wearing = state.outfit[ch] === o.id;
    return {
      id: 'o-' + o.id,
      label: o.label,
      desc: o.desc,
      price: owned ? 0 : o.price,
      tag: wearing ? 'Aan' : owned ? 'In bezit' : '',
      swatch: [o.shirt, o.pants, o.cap ?? o.shoes].map(hexCss),
      preview: lookWith(world, { shirt: o.shirt, pants: o.pants, shoes: o.shoes, ...(o.cap != null ? { cap: o.cap } : {}) }),
      effect: o.stealth ? 'Politie raakt je sneller kwijt' : '',
      disabled: wearing ? 'Heb je al aan' : owned ? '' : broke(world, o.price),
      buy() {
        if (!owned && !pay(world, o.price)) return null;
        state.ownedOutfits.add(key);
        state.outfit[ch] = o.id;
        state.storyOutfit = null;
        // the kraak's black is bought for both of them, and both wear it at once
        if (o.id === 'incognito') for (const c of ['tammo', 'anita']) state.ownedOutfits.add(c + ':incognito');
        if (!syncHeistOutfit()) applyLooks();
        const lost = shakeWanted(world, o.stealth || 1);
        return (owned ? `${o.label} weer aangetrokken` : `${o.label} gekocht en meteen aan`) + (lost ? '. De politie herkent je niet meer zo goed!' : '');
      },
    };
  });
  const note = world.wanted > 0 ? 'Nieuwe kleren terwijl de politie je kwijt is: een ster minder' : 'Omkleden terwijl je gezocht wordt en niemand je ziet? Scheelt een ster';
  return [{ title: `Outfits voor ${name}`, note, items }];
}

// The wardrobe at home (home.js): the outfits you own, for free.
export function wardrobeMenu(world) {
  const ch = currentChar(world);
  const items = () => outfitSections(world)[0].items.filter((it) => state.ownedOutfits.has(ch + ':' + it.id.slice(2)));
  return { name: 'Kledingkast', type: 'kleding', tagline: 'Alles wat je ooit gekocht hebt, netjes op een hangertje', color: '#2f6fb0', sections: () => [{ title: `Kast van ${ch === 'anita' ? 'Tessa' : 'Tammo'}`, note: 'Meer kleren? Die liggen bij de kledingwinkel', items: items() }] };
}

function shakeWanted(world, stars) {
  if (world.wanted <= 0 || policeWatching(world) || world.time - state.lastStealthAt < OUTFIT_WANTED_COOLDOWN) return false;
  state.lastStealthAt = world.time;
  world.wanted = Math.max(0, world.wanted - stars);
  world.wantedDecayTimer = 0;
  return true;
}

function hairSections(world) {
  const ch = currentChar(world);
  const cur = state.hair[ch];
  const naturel = baseLook[ch].hair;
  const colors = HAIR_COLORS.map((c) => ({
    id: 'h-' + c.id, label: c.label, desc: c.id === 'naturel' ? 'Terug naar je eigen kleur' : 'Verven, föhnen, klaar',
    price: c.price, tag: cur.color === c.id ? 'Nu' : '', swatch: [hexCss(c.hair ?? naturel)],
    preview: lookWith(world, { hair: c.hair ?? naturel }, ch === 'tammo' ? { hat: null } : null),
    disabled: cur.color === c.id ? 'Heb je al' : broke(world, c.price),
    buy() {
      if (!pay(world, c.price)) return null;
      cur.color = c.id;
      applyLooks();
      return `Haar ${c.label.toLowerCase()}. Staat je goed!`;
    },
  }));
  const styles = HAIR_STYLES[ch].map(([id, label]) => ({
    id: 'hs-' + id, label, desc: ch === 'tammo' ? 'Onder de pet, maar jij weet het' : 'Knippen en stylen',
    price: STYLE_PRICE, tag: cur.style === id ? 'Nu' : '',
    preview: lookWith(world, { hairStyle: id }, ch === 'tammo' ? { hat: null } : null),
    disabled: cur.style === id ? 'Heb je al' : broke(world, STYLE_PRICE),
    buy() {
      if (!pay(world, STYLE_PRICE)) return null;
      cur.style = id;
      applyLooks();
      return `${label}: de kapper is tevreden`;
    },
  }));
  return [{ title: 'Haarkleur', items: colors }, { title: 'Model', items: styles }];
}

const STOCK_GROUPS = {
  auto: [['Occasions', ['Hatchback', 'Barrel', 'Sedan', 'Stationwagen', 'SUV', 'Sportwagen', 'Taxi']], ['Bedrijfswagens', ['Bestelbus', 'Vrachtwagen', 'Midibus', 'Stadsbus']], ['Bijzondere voertuigen', null]],
  fietsen: [['Tweewielers', null]],
  boot: [['Boten te koop', null]],
  heli: [['Helikopters', null]],
};

function stockItem(world, key, sp, shop) {
  const owned = state.vehicles.some((o) => o.key === key);
  const preview = { kind: sp.kind, model: sp.model, color: sp.color, nameIdx: sp.nameIdx, flags: sp.flags || null };
  const stats = vehicleStats(sp.model, sp.kind);
  if (sp.unlock) {
    const met = unlockMet(sp);
    return {
      id: 'v-' + key, label: sp.label, desc: owned ? `${sp.desc} · staat in je garage, bestel hem via je telefoon` : `${sp.desc} · ${VEHICLE_UNLOCKS[sp.unlock].text}`,
      price: 0, swatch: [sp.color], tag: owned ? 'Van jou' : met ? 'Vrijgespeeld' : 'Op slot', preview, stats,
      disabled: owned ? 'Heb je al' : met ? '' : 'Nog op slot',
      buy() {
        if (state.vehicles.some((o) => o.key === key) || !unlockMet(sp)) return null;
        const v = deliver(world, key, sp.color, shop);
        return v ? `${sp.label} staat voor de deur. Verdiend, niet gekocht` : 'Bezorging mislukt, probeer het straks nog eens';
      },
    };
  }
  return {
    id: 'v-' + key, label: sp.label, desc: owned ? `${sp.desc} · staat in je garage, bestel hem via je telefoon` : `${sp.desc} · ${sp.kind === 'boat' ? 'ligt klaar aan de steiger' : sp.kind === 'heli' ? 'staat klaar op het platform' : 'wordt voor de deur gezet'}`, price: sp.price,
    swatch: [sp.color], tag: owned ? 'Van jou' : '', disabled: owned ? 'Heb je al' : broke(world, sp.price), preview, stats,
    buy() {
      if (state.vehicles.some((o) => o.key === key) || !pay(world, sp.price)) return null;
      const v = deliver(world, key, sp.color, shop);
      if (!v) { world.money += sp.price; return 'Bezorging mislukt, geld terug'; }
      if (sp.kind === 'heli') return `${sp.label} staat op het platform achter de kiosk. Stap in en vlieg hem naar het helidek op jullie flat`;
      return `${sp.label} ${sp.kind === 'boat' ? 'ligt aan de steiger' : 'staat voor de deur'}. Van jou, voorgoed: via je telefoon laat je hem overal afleveren`;
    },
  };
}

function vehicleSections(world, type, shop) {
  const stock = Object.entries(VEHICLE_STOCK).filter(([, sp]) => sp.shop === type);
  const sections = [];
  const used = new Set();
  for (const [title, types] of STOCK_GROUPS[type] || [['Te koop', null]]) {
    const pick = stock.filter(([key, sp]) => !used.has(key) && (!types || types.includes(sp.type)));
    for (const [key] of pick) used.add(key);
    if (pick.length) sections.push({ title, items: pick.map(([key, sp]) => stockItem(world, key, sp, shop)) });
  }
  const mine = state.vehicles.filter((o) => o.spec.shop === type);
  if (mine.length) {
    sections.push({
      title: 'Jouw voertuigen',
      items: mine.map((o, i) => {
        const boat = o.spec.kind === 'boat', heli = o.spec.kind === 'heli' && !!shop.pad;
        const spot = heli ? shop.pad : boat && shop.water ? shop.water : shop;
        const here = o.v && world.vehicles.includes(o.v) && dist(o.v.x, o.v.y, spot.x, spot.y) < 40;
        const fee = o.lost ? replacementFee(o) : REDELIVERY_FEE;
        return {
          id: 'mine-' + i, label: o.spec.label, desc: here ? 'Staat al voor de deur' : o.lost ? 'Afgeschreven: eigen risico, dan staat er een nieuwe voor de deur' : boat ? 'Laat hem naar deze steiger varen' : heli ? 'Laat hem hier op het platform zetten' : 'Laat hem hier voor de deur zetten',
          price: fee, tag: o.lost ? 'Afgeschreven' : 'Van jou', swatch: [o.color],
          preview: { kind: o.spec.kind, model: o.spec.model, color: o.color, nameIdx: o.spec.nameIdx, flags: o.spec.flags || null }, stats: vehicleStats(o.spec.model, o.spec.kind),
          disabled: here ? 'Staat al hier' : o.v && o.v.driver === 'player' ? 'Je zit erop' : broke(world, fee),
          buy() {
            if (!pay(world, fee)) return null;
            const at = heli ? { ...shop.pad, z: PAD_DECK } : boat && shop.water ? shop.water : deliveryPoint(world.map, shop, o.spec.kind === 'car');
            if (o.v) removeFromWorld(world, o.v);
            o.v = spawnOwned(world, o, at.x, at.y, boat || heli ? at.angle : null, at.z);
            if (!o.v) { world.money += fee; return 'Bezorging mislukt, geld terug'; }
            o.lost = false;
            return `${o.spec.label} ${boat ? 'ligt aan de steiger' : heli ? 'staat op het platform' : 'wordt voor de deur gezet'}`;
          },
        };
      }),
    });
  }
  return sections;
}

const SCRATCH = [[0.002, 500], [0.018, 50], [0.08, 15], [0.2, 5]];
const LOTTERY = [[0.004, 2500], [0.05, 200]];
const SCRATCH_SMALL = [[0.01, 150], [0.06, 10], [0.2, 2]];
const HEADLINES = [
  'Martinitoren staat nog steeds scheef, zegt niemand',
  'Duif steelt eierbal op de Vismarkt, dader voortvoluchtig',
  'Student vindt fiets terug na drie jaar: "Hij stond gewoon waar ik hem liet"',
  'Grote Markt eindelijk af, bouwhekken voortaan kunstwerk',
  'Groninger zegt "moi" tegen toerist, toerist zegt "moi" terug: vriendschap voor het leven',
  'Wind in Grunn weer tegen, ook op de terugweg',
  'Gemeente onderzoekt waarom alle fietsen zwart zijn',
  'Eierbal uitgeroepen tot werelderfgoed, Drenthe protesteert',
];

function draw(table) {
  let r = Math.random();
  for (const [p, prize] of table) {
    if (r < p) return prize;
    r -= p;
  }
  return 0;
}

// Spaarkaart: every purchase at Rook & Geluk except the scratch cards and
// lottery tickets earns a stamp, a full card is traded in for a fixed prize.
const STAMP_CARD = 10;
const STAMP_PRIZE = 10;

function stamped(item) {
  const buy = item.buy;
  return {
    ...item,
    buy() {
      const res = buy.call(this);
      if (res == null) return res;
      state.stamps = Math.min(STAMP_CARD, state.stamps + 1);
      const note = state.stamps >= STAMP_CARD ? 'Spaarkaart vol!' : `Stempel ${state.stamps}/${STAMP_CARD}`;
      return typeof res === 'string' ? `${res} · ${note}` : { ...res, text: `${res.text} · ${note}` };
    },
  };
}

function stampCardItem(world) {
  const full = state.stamps >= STAMP_CARD;
  return {
    id: 'spaarkaart', preview: productPreview('spaarkaart'), label: 'Volle spaarkaart inleveren',
    desc: `Elke aankoop hier is een stempel. Bij ${STAMP_CARD} stempels krijg je €${STAMP_PRIZE}`, price: 0, plain: true, verb: `Inleveren voor €${STAMP_PRIZE}`, keepFocus: true,
    stats: [{ label: 'Stempels', v: state.stamps / STAMP_CARD, to: null, text: `${state.stamps}/${STAMP_CARD}` }],
    effect: `€${STAMP_PRIZE} bij een volle kaart`,
    disabled: full ? '' : `Nog ${STAMP_CARD - state.stamps} stempels tot een volle kaart`,
    buy() {
      if (state.stamps < STAMP_CARD) return null;
      state.stamps = 0;
      world.money += STAMP_PRIZE;
      recordStat(world, 'stampCards');
      return { text: `Kaart vol, €${STAMP_PRIZE} voor jou. Hier is een nieuwe`, tone: 'win' };
    },
  };
}

function tabakSections(world) {
  const gamble = (id, label, desc, price, table, big, look) => ({
    id, label, desc, price, disabled: broke(world, price), keepFocus: true,
    preview: productPreview(id), effect: `Hoofdprijs €${big}`, reveal: look,
    buy() {
      if (!pay(world, price)) return null;
      const prize = draw(table);
      world.money += prize;
      if (!prize) return { text: 'Niks. Volgende keer beter, jong', tone: 'lose', prize };
      return { text: prize >= big ? `JACKPOT! €${prize} gewonnen!` : `Joa! €${prize} gewonnen`, tone: prize >= big ? 'jackpot' : 'win', prize };
    },
  });
  const snack = (id, label, desc, price, hp) => foodItem(world, id, label, desc, price, hp, id, () => `${label} naar binnen gewerkt`);
  const paper = {
    id: 'krant', preview: productPreview('krant'), label: 'Grunneger Kwebbelkrant', desc: 'De krant van vandaag, met de kop van de dag', price: 2, keepFocus: true,
    disabled: broke(world, 2),
    buy() {
      if (!pay(world, 2)) return null;
      return { text: 'Kop van de dag: ' + HEADLINES[Math.floor(Math.random() * HEADLINES.length)], tone: 'win' };
    },
  };
  const card = {
    id: 'kaart', preview: productPreview('kaart'), label: 'Ansichtkaart Martinitoren', desc: '"Groeten uit Grunn", met een duif die net iets laat vallen', price: 1, keepFocus: true,
    disabled: broke(world, 1),
    buy() {
      if (!pay(world, 1)) return null;
      return 'Kaartje gekocht. Oma is er blij mee';
    },
  };
  const strip = {
    id: 'strip', preview: productPreview('strip'), label: 'Stripboek "Tammo en de Eierbal"', desc: 'Deel 12: de Grote Markt-koers', price: 7, keepFocus: true,
    disabled: broke(world, 7),
    buy() {
      if (!pay(world, 7)) return null;
      return 'Uit in één zit. Spannend einde!';
    },
  };
  return [
    { title: 'Geluk', items: [
      gamble('scratch', 'Kraskaart "Grunneger Gokje"', 'Krassen maar! Hoofdprijs €500', 5, SCRATCH, 500, { title: 'GRUNNEGER GOKJE', bg: '#c23f78' }),
      gamble('lot', 'Stadsloterij-lot', 'Trekking meteen. Hoofdprijs €2500', 25, LOTTERY, 2500, { title: 'STADSLOTERIJ', bg: '#b8902a' }),
      gamble('duif', 'Duivenkraslot', 'Kras de duif vrij. Hoofdprijs €150', 2, SCRATCH_SMALL, 150, { title: 'DUIVENKRASLOT', bg: '#4a6a8a' }),
    ] },
    { title: 'Lezen & sturen', items: [paper, strip, card].map(stamped) },
    { title: 'Snoep & snacks', items: [
      snack('eierbal', 'Eierbal', 'Warm uit de automaat naast de deur', 6, 10),
      snack('koek', 'Grunneger koek', 'Plak kruidkoek voor onderweg', 4, 6),
      snack('drop', 'Zak zoute drop', 'Dubbelzout, voor de echte Stadjer', 2, 4),
      snack('kauwgom', 'Kauwgom "Frisse Adem"', 'Voor na de eierbal', 1, 1),
    ].map(stamped) },
    { title: 'Spaarkaart', note: `${state.stamps}/${STAMP_CARD} stempels`, items: [stampCardItem(world)] },
  ];
}

// EIKEA: the blue box at the Sontweg, a parody with Gronings product names.
function eikeaSections(world) {
  const food = (id, label, desc, price, hp) => foodItem(world, id, label, desc, price, hp, id, () => `${label}: smakelijk!`);
  const joke = (id, label, desc, price, line) => ({
    id, label, desc, price, keepFocus: true, disabled: broke(world, price), preview: productPreview(id),
    buy() { return pay(world, price) ? line : null; },
  });
  return [
    { title: 'Restaurant', items: [
      food('ballen', 'Gehaktballetjes "Kötbullen"', 'Tien stuks met jam en jus', 6, 25),
      food('hotdog', 'Hotdog bij de kassa', 'Eentje voor onderweg, één euro', 1, 6),
      food('eierbal', 'Eierbal "Äggbål"', 'Zweeds? Nee hoor, gewoon Gronings', 4, 12),
    ] },
    { title: 'Woonafdeling', note: furnitureShopNote(), items: furnitureShopItems(world, { pay: (p) => pay(world, p), broke: (p) => broke(world, p), preview: productPreview }) },
    { title: 'Bij de uitgang', items: [
      {
        id: 'tas', label: 'Grote blauwe tas', desc: 'Onverwoestbaar. Werkt ook als pantser (+10)', price: 1, keepFocus: true,
        preview: productPreview('tas'), stats: [armorStat(world, 10)], effect: '+10 pantser',
        disabled: world.armor >= 100 ? 'Pantser is al vol' : broke(world, 1),
        buy() {
          if (!pay(world, 1)) return null;
          world.armor = Math.min(100, world.armor + 10);
          return 'Blauwe tas om je heen: je voelt je onoverwinnelijk';
        },
      },
      joke('potlood', 'Klein potloodje', 'Gratis mee, iedereen neemt er tien', 0, 'Tien potloodjes in je zak. Niemand zag het'),
    ] },
  ];
}

function paintShop(world) {
  return {
    name: 'Spuit & Klaar', type: 'spuit', tagline: 'Nieuwe kleur, nieuwe kans. Klaar terwijl je wacht', color: SHOP_TYPES.spuit.color,
    sections: () => {
      const v = world.player.inVehicle;
      if (!v) return [];
      const cur = (v.model && v.model.color || '').toLowerCase();
      return [{
        title: 'Kies een kleur',
        note: world.wanted > 0 ? 'Een nieuwe kleur en de politie is je kwijt' : '',
        items: PAINTS.map((p) => ({
          id: 'p-' + p.id, label: p.label, desc: 'Complete spuitbeurt, droog in een minuut', price: PAINT_PRICE,
          swatch: [p.color], tag: cur === p.color ? 'Nu' : '',
          // selecting a colour shows your own vehicle in it before you pay
          preview: vehiclePreviewOf(v, p.color),
          disabled: cur === p.color ? 'Heeft deze kleur al' : broke(world, PAINT_PRICE),
          buy() {
            if (!pay(world, PAINT_PRICE)) return null;
            repaint(world, v, p.color);
            if (world.wanted > 0) { world.wanted = 0; world.wantedDecayTimer = 0; }
            return `${p.label}: als nieuw!`;
          },
        })),
      }];
    },
  };
}

// --- looks -------------------------------------------------------------------

function applyLooks() {
  if (!baseLook) return;
  for (const ch of ['tammo', 'anita']) {
    const app = ch === 'tammo' ? TAMMO_APPEARANCE : ANITA_APPEARANCE;
    const o = OUTFITS[ch].find((x) => x.id === (state.storyOutfit || state.outfit[ch])) || OUTFITS[ch][0];
    const h = state.hair[ch];
    const hc = HAIR_COLORS.find((c) => c.id === h.color);
    Object.assign(app, baseLook[ch], { shirt: o.shirt, pants: o.pants, shoes: o.shoes });
    if (o.cap != null) app.cap = o.cap;
    if (hc && hc.hair != null) app.hair = hc.hair;
    if (HAIR_STYLES[ch].some(([id]) => id === h.style)) app.hairStyle = h.style;
  }
  refreshCharacterMeshes();
  for (const o of state.vehicles) if (o.v) setRider(o.v);
}

function riderShirt() {
  const anita = worldRef && worldRef.player.character === 'anita';
  return hexCss((anita ? ANITA_APPEARANCE : TAMMO_APPEARANCE).shirt);
}

function setRider(v) {
  if (v.isBike || v.isScooter) v.model = { ...v.model, rider: riderShirt() };
}

// --- vehicles -------------------------------------------------------------------

function newVehicleId(nameIdx) {
  idSeq++;
  return 720000 + idSeq * 6 + nameIdx;
}

function removeFromWorld(world, v) {
  if (!v || v.driver === 'player') return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
}

function nearestJetty(x, y) {
  let best = null, bd = Infinity;
  for (const s of shops) {
    if (s.type !== 'boot' || !s.water) continue;
    const d = dist(s.water.x, s.water.y, x, y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Owned boats wait at the nearest Bootje Huren jetty (or right at x, y when
// that is open water, e.g. a jetty spot picked by ownedvehicles.js).
function spawnOwnedBoat(world, o, x, y, angle) {
  const map = world.map;
  const jetty = nearestJetty(x, y);
  const at = isInWater(map, x, y) ? { x, y, angle: angle ?? 0 } : jetty ? jetty.water : null;
  if (!at) return null;
  const poly = waterPolyAt(map, at.x, at.y);
  if (!poly) return null;
  const v = spawnBoatOnWater(map, poly);
  if (!v) return null;
  v.x = at.x; v.y = at.y; v.angle = at.angle ?? 0;
  v.model = { ...o.spec.model, color: o.color };
  v.waterPoly = null;
  v.id = newVehicleId(o.spec.nameIdx);
  v.playerOwned = true;
  v.upgrades = [];
  Object.assign(v, o.spec.flags || {});
  v.speed = 0;
  world.vehicles.push(v);
  return v;
}

// A helicopter stands where it is put: z is the surface under its skids.
function spawnOwnedHeli(world, o, x, y, angle, z) {
  const sp = o.spec;
  const g = Number.isFinite(z) ? z : world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) : 0;
  const v = makeHeli(x, y, g, angle ?? 0, { ...sp.model, color: o.color });
  Object.assign(v, sp.flags || {});
  v.id = newVehicleId(sp.nameIdx);
  v.playerOwned = true;
  v.upgrades = [];
  if (Number.isFinite(o.health)) v.health = Math.max(5, Math.min(100, o.health));
  if (o.flat === true) v.flat = true;
  world.vehicles.push(v);
  return v;
}

// Onderdelen uit de garage (tuningplan.js) komen mee terug als het voertuig opnieuw verschijnt.
function applyTuningTo(v, key) {
  try {
    const all = loadTuning(typeof localStorage !== 'undefined' ? localStorage : null, KEYS.tuning);
    if (key && all[key]) v.tuning = tuningEffects(all[key]);
  } catch (e) { /* zonder opslag geen onderdelen */ }
}

function spawnOwned(world, o, x, y, angle = null, z = null) {
  const sp = o.spec;
  if (sp.kind === 'boat') return spawnOwnedBoat(world, o, x, y, angle);
  if (sp.kind === 'heli') return spawnOwnedHeli(world, o, x, y, angle, z);
  const map = world.map;
  // out in the Ommeland (no city street near) a vehicle with a heading is still put right here
  const point = map.nearestRoadPoint(x, y, 150, sp.kind === 'car') || (angle != null ? map.nearestRoadPoint(-0.84, 0.33, 400, sp.kind === 'car') : null);
  if (!point) return null;
  const v = spawnVehicleOnRoad(map, point.road, false, Math.random, sp.kind === 'bike', false, angle == null ? point : { x, y }, sp.kind === 'scooter', { ...sp.model, color: o.color });
  v.model = { ...sp.model, color: o.color };
  Object.assign(v, sp.flags || {});
  v.id = newVehicleId(sp.nameIdx);
  v.playerOwned = true;
  v.upgrades = [...(o.upgrades || [])];
  applyUpgrades(v);
  applyTuningTo(v, o.key);
  setRider(v);
  if (Number.isFinite(o.health)) v.health = Math.max(5, Math.min(100, o.health));
  if (Array.isArray(o.dents)) v.dentLog = o.dents.slice(0, 12);
  if (o.flat === true) v.flat = true;
  if (angle == null) {
    const kerb = Math.max(0, (point.road.width || 6) / 2 - sp.model.wid / 2 - 0.3);
    v.x += -Math.sin(v.angle) * kerb;
    v.y += Math.cos(v.angle) * kerb;
    [v.x, v.y] = map.escapeBuilding(v.x, v.y, sp.model.wid);
  } else {
    v.x = x; v.y = y; v.angle = angle;
  }
  v.road = null;
  v.speed = 0;
  world.vehicles.push(v);
  return v;
}

// a few metres down the street from the door, so the E prompt for the new
// ride doesn't compete with the shop's own
function deliveryPoint(map, shop, car) {
  const rp = map.nearestRoadPoint(shop.x, shop.y, 150, car);
  if (!rp) return { x: shop.x, y: shop.y };
  const pts = rp.road.pts;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(rp.x, rp.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bd) { bd = cp.dist2; bi = i; }
  }
  const dx = pts[bi + 1][0] - pts[bi][0], dy = pts[bi + 1][1] - pts[bi][1];
  const l = Math.hypot(dx, dy) || 1;
  const step = car ? 9 : 5;
  return { x: rp.x + dx / l * step, y: rp.y + dy / l * step };
}

function deliver(world, key, color, shop) {
  const o = { key, spec: VEHICLE_STOCK[key], color, upgrades: [], v: null, lost: false };
  const heli = o.spec.kind === 'heli' && shop.pad;
  const at = heli ? { ...shop.pad, z: PAD_DECK } : o.spec.kind === 'boat' && shop.water ? shop.water : deliveryPoint(world.map, shop, o.spec.kind === 'car');
  o.v = heli ? spawnOwned(world, o, at.x, at.y, at.angle, at.z) : spawnOwned(world, o, at.x, at.y);
  if (!o.v) return null;
  state.vehicles.push(o);
  return o.v;
}

function repaint(world, v, color) {
  v.model = { ...v.model, color, ...(v.isPolice ? { resprayed: true } : {}) };
  // scene3d keys vehicle meshes by id: a fresh id makes it rebuild the mesh
  // in the new colour; +600000 keeps id % 6 and with it the display name
  v.id += 600000;
  if (v.isHeroCar) state.heroColor = color;
  const o = state.vehicles.find((x) => x.v === v);
  if (o) o.color = color;
}

export { repaint as repaintVehicle };

// --- story hooks (story.js) ------------------------------------------------------
// How often each shop type was entered, and what the story's requirements
// ask about: a black outfit of your own, a rented boat still afloat.

const shopVisits = {};

// What the player has from the shops, for Spullen (spullen.js). Read only.
export function inventoryShopState() {
  return {
    outfit: { ...state.outfit }, ownedOutfits: [...state.ownedOutfits], storyOutfit: state.storyOutfit,
    heroUpgrades: [...state.heroUpgrades], stamps: state.stamps, stampCard: STAMP_CARD,
    vehicles: state.vehicles.filter((o) => !o.lost).map((o) => ({ key: o.key, label: o.spec.label, kind: o.spec.kind, upgrades: [...(o.v ? o.v.upgrades || [] : o.upgrades || [])] })),
  };
}

export function getShopVisits(type) {
  return shopVisits[type] || 0;
}

export function storyShopState() {
  return {
    incognito: [...state.ownedOutfits].some((k) => k.endsWith(':incognito')),
    rental: !!(state.rental && !state.rental.wrecked && !state.rental.sinking),
  };
}

// Both of them in one outfit for a stretch of the story (id), or back in
// their own (null). Not bought, not in the wardrobe; saved with the shops.
export function setStoryOutfit(id) {
  const next = id && OUTFITS.tammo.some((o) => o.id === id) && OUTFITS.anita.some((o) => o.id === id) ? id : null;
  if (next === state.storyOutfit) return false;
  state.storyOutfit = next;
  applyLooks();
  return true;
}

// From buying the black until the kraak starts (and on a load in between)
// both of them wear it, not just whoever was in the shop. True when it changed.
const HEIST_STEPS = new Set(['k-kraakspullen', 'k-nacht', 'H6', 'M06']);
export function syncHeistOutfit() {
  if (state.storyOutfit || !storyShopState().incognito) return false;
  let step = null;
  try { step = currentStep(); } catch (e) { return false; }
  return !!step && HEIST_STEPS.has(step.id) && setStoryOutfit('incognito');
}

export function storyOutfit() {
  return state.storyOutfit;
}

function nearestOfType(world, type) {
  let best = null, bd = Infinity;
  for (const s of shops) {
    if (s.type !== type) continue;
    const d = dist(s.x, s.y, world.player.x, world.player.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Hands out what a skipped story requirement (or the dev chapter select)
// would otherwise have cost. Returns true when the player now has it.
export function grantStoryItem(world, what) {
  if (what === 'weapon') {
    world.ammo.pistol = Math.max(world.ammo.pistol || 0, 36);
    if (world.weapon === 'fists' || !(world.ammo[world.weapon] > 0)) world.weapon = 'pistol';
    return true;
  }
  if (what === 'bike') {
    if (state.vehicles.some((o) => o.spec.kind === 'bike')) return true;
    const shop = nearestOfType(world, 'fietsen');
    return !!(shop && deliver(world, 'omafiets', VEHICLE_STOCK.omafiets.color, shop));
  }
  if (what === 'car') {
    if (state.vehicles.some((o) => o.spec.kind === 'car')) return true;
    const shop = nearestOfType(world, 'auto');
    return !!(shop && deliver(world, 'mug', VEHICLE_STOCK.mug.color, shop));
  }
  if (what === 'racecar') {
    // the Escapade gets the motor upgrade (r-tuning)
    if (!state.heroUpgrades.includes('motor')) state.heroUpgrades = [...state.heroUpgrades, 'motor'];
    return true;
  }
  if (what === 'incognito') {
    state.ownedOutfits.add('tammo:incognito');
    state.ownedOutfits.add('anita:incognito');
    syncHeistOutfit();
    return true;
  }
  if (what === 'boat') {
    const shop = nearestOfType(world, 'boot');
    return !!(shop && rentBoat(world, shop, RENTALS.find((r) => r.id === 'sloep')));
  }
  return false;
}

let upkeepTimer = 0;
const riderMeshes = new Map();

// Parked owned bikes/scooters show no rider: the built-in rider figure is
// taken over from syncBikeRider (ragdoll.js) and only shown while ridden.
function syncOwnedRiders(world, lookup) {
  const scene = lookup ? getScene() : null;
  for (const o of state.vehicles) {
    const v = o.v;
    if (!v || !(v.isBike || v.isScooter)) continue;
    let rec = riderMeshes.get(v);
    if (rec && (!rec.mesh.parent || rec.mesh.userData.vehicleId !== v.id)) { riderMeshes.delete(v); rec = null; }
    if (!rec && scene) {
      const mesh = scene.children.find((c) => c.userData && c.userData.vehicleId === v.id);
      const rider = mesh && mesh.children.find((c) => c.userData && c.userData.legL);
      if (rider) {
        mesh.userData.riderFig = null;
        rec = { mesh, rider };
        riderMeshes.set(v, rec);
      }
    }
    if (rec) rec.rider.visible = v.driver === 'player' && !v.riderOff;
  }
  if (world.player.character !== lastRiderChar) {
    lastRiderChar = world.player.character;
    for (const o of state.vehicles) if (o.v) setRider(o.v);
  }
}
let lastRiderChar = null;

// Unlocked specials land in the garage by themselves (delivered via the phone).
let unlockTimer = 0;
function claimUnlocks(world) {
  for (const [key, spec] of Object.entries(VEHICLE_STOCK)) {
    if (!spec.unlock || state.vehicles.some((o) => o.key === key) || !unlockMet(spec)) continue;
    state.vehicles.push({ key, spec, color: spec.color, upgrades: [], v: null, lost: false });
    world.addMessage(`Vrijgespeeld: ${spec.label}! Staat in je garage.`, 6);
  }
}

export function updateShops(dt, world) {
  upkeepTimer -= dt;
  syncOwnedRiders(world, upkeepTimer <= 0);
  if ((unlockTimer -= dt) <= 0) { unlockTimer = 2; claimUnlocks(world); }
  if (upkeepTimer > 0) return;
  upkeepTimer = 0.25;
  for (let i = state.vehicles.length - 1; i >= 0; i--) {
    const o = state.vehicles[i];
    const v = o.v;
    if (!v) continue;
    // a bought vehicle stays in the collection: a wreck can be replaced via the phone
    if (v.wrecked || (v.sinking && !world.vehicles.includes(v))) {
      o.v = null;
      o.lost = true;
      o.upgrades = [...(v.upgrades || o.upgrades || [])];
      world.addMessage(`${o.spec.label} is afgeschreven. Nieuwe via je telefoon (eigen risico €${replacementFee(o)})`, 5);
      continue;
    }
    // the ambient population managers sweep far-away bikes and cars; an
    // owned one is simply put back where it stood
    if (!world.vehicles.includes(v)) world.vehicles.push(v);
    o.x = v.x; o.y = v.y; o.angle = v.angle;
  }
  const hero = world.vehicles.find((v) => v.isHeroCar);
  if (hero && pendingHeroDamage) {
    if (Number.isFinite(pendingHeroDamage.health)) hero.health = Math.max(5, Math.min(100, pendingHeroDamage.health));
    if (pendingHeroDamage.flat === true) hero.flat = true;
    if (pendingHeroDamage.dents) { hero.dentLog = pendingHeroDamage.dents; hero.meshDirty = true; }
    pendingHeroDamage = null;
  }
  if (hero && state.heroColor && hero.model.color !== state.heroColor) repaint(world, hero, state.heroColor);
  if (hero && state.heroUpgrades.length && hero._upgKey !== state.heroUpgrades.join()) {
    hero.upgrades = [...state.heroUpgrades];
    hero._upgKey = state.heroUpgrades.join();
    applyUpgrades(hero);
  }
  const pv = world.player.inVehicle;
  if (pv && !pv.playerOwned && !pv.isHeroCar) pv.stolenByPlayer = true;
  const r = state.rental;
  if (r && !r.wrecked && !r.sinking && !world.vehicles.includes(r)) world.vehicles.push(r);
  streamShopFronts(world);
}

// Shopfronts exist only near the player: built a couple per tick on the way
// in, disposed again on the way out.
function streamShopFronts(world) {
  const scene = getScene();
  if (!scene) return;
  const { x, y } = world.player;
  let builds = 0;
  for (const s of shops) {
    const d = Math.max(Math.abs(s.x - x), Math.abs(s.y - y));
    if (!s.mesh && d < STREAM_IN && builds < BUILDS_PER_TICK) {
      s.mesh = buildShopFront3D(s);
      scene.add(s.mesh);
      builds++;
    } else if (s.mesh && d > STREAM_OUT) {
      scene.remove(s.mesh);
      disposeShopFront(s.mesh);
      s.mesh = null;
    }
    if (s.mesh && s.mesh.userData.demoHeli) s.mesh.userData.demoHeli.visible = !state.vehicles.some((o) => o.spec.kind === 'heli');
  }
}

// --- save ----------------------------------------------------------------------

// Health and the dents (replayed on the rebuilt mesh) of an owned vehicle.
function damageSave(v) {
  const out = {};
  if ((v.health ?? 100) < 100) out.health = Math.round(v.health);
  if (v.dentLog && v.dentLog.length) out.dents = v.dentLog.map((d) => d.map((n) => Math.round(n * 100) / 100));
  if (v.flat) out.flat = true;
  return out;
}

export function getShopSave() {
  const round = (n) => Math.round(n * 10) / 10;
  const hero = worldRef && worldRef.vehicles.find((x) => x.isHeroCar && !x.wrecked);
  return {
    hero: hero ? damageSave(hero) : {},
    outfit: { ...state.outfit },
    ownedOutfits: [...state.ownedOutfits],
    storyOutfit: state.storyOutfit,
    hair: { tammo: { ...state.hair.tammo }, anita: { ...state.hair.anita } },
    heroColor: state.heroColor,
    heroUpgrades: [...state.heroUpgrades],
    stamps: state.stamps,
    vehicles: state.vehicles.map((o) => {
      const v = o.v;
      const pos = o.lost ? null : v ? { x: round(v.x), y: round(v.y), angle: round(v.angle), ...(v.isHeli ? { z: round(v.onGround ? v.z : v.groundZ ?? 0) } : {}) } : o.x != null ? { x: round(o.x), y: round(o.y), angle: round(o.angle) } : null;
      // a stored one (home.js) keeps its damage on the entry
      const dmg = v && !o.lost ? damageSave(v) : !o.lost && (Number.isFinite(o.health) || o.flat || (o.dents && o.dents.length)) ? { ...(o.health < 100 ? { health: Math.round(o.health) } : {}), ...(o.dents && o.dents.length ? { dents: o.dents } : {}), ...(o.flat ? { flat: true } : {}) } : {};
      return { key: o.key, color: o.color, upgrades: [...(o.v ? o.v.upgrades || [] : o.upgrades || [])], ...(o.lost ? { lost: true } : {}), ...(!o.lost && !pos ? { garage: true } : {}), ...pos, ...dmg };
    }),
  };
}

const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

export function applyShopSave(world, d) {
  if (!d || typeof d !== 'object') return;
  for (const ch of ['tammo', 'anita']) {
    if (d.outfit && OUTFITS[ch].some((o) => o.id === d.outfit[ch])) state.outfit[ch] = d.outfit[ch];
    const h = d.hair && d.hair[ch];
    if (h && HAIR_COLORS.some((c) => c.id === h.color)) state.hair[ch].color = h.color;
    if (h && HAIR_STYLES[ch].some(([id]) => id === h.style)) state.hair[ch].style = h.style;
  }
  state.ownedOutfits = new Set(['tammo:stadjer', 'anita:classic']);
  if (Array.isArray(d.ownedOutfits)) for (const k of d.ownedOutfits) if (typeof k === 'string') state.ownedOutfits.add(k);
  state.storyOutfit = OUTFITS.tammo.some((o) => o.id === d.storyOutfit) && OUTFITS.anita.some((o) => o.id === d.storyOutfit) ? d.storyOutfit : null;
  state.heroColor = isColor(d.heroColor) ? d.heroColor : null;
  state.heroUpgrades = Array.isArray(d.heroUpgrades) ? d.heroUpgrades.filter((id) => CAR_UPGRADES.some((u) => u.id === id)) : [];
  state.stamps = Number.isFinite(d.stamps) ? Math.max(0, Math.min(STAMP_CARD, Math.floor(d.stamps))) : 0;
  for (const o of state.vehicles) removeFromWorld(world, o.v);
  state.vehicles = [];
  // older saves could hold the same model twice: the last one wins
  const byKey = new Map();
  for (const sv of Array.isArray(d.vehicles) ? d.vehicles : []) if (sv && VEHICLE_STOCK[sv.key]) byKey.set(sv.key, sv);
  for (const sv of byKey.values()) {
    const spec = VEHICLE_STOCK[sv.key];
    const valid = upgradeListForStock(spec);
    const upgrades = Array.isArray(sv.upgrades) ? sv.upgrades.filter((id) => valid.some((u) => u.id === id)) : [];
    const o = { key: sv.key, spec, color: isColor(sv.color) ? sv.color : spec.color, upgrades, v: null, lost: !!sv.lost, health: sv.health, dents: validDents(sv.dents), flat: sv.flat === true };
    const has = Number.isFinite(sv.x) && Number.isFinite(sv.y);
    // a helicopter without a spot goes back to its pad at home
    if (spec.kind === 'heli' && !has) sv.garage = true;
    if (!o.lost && !sv.garage) o.v = has ? spawnOwned(world, o, sv.x, sv.y, Number.isFinite(sv.angle) ? sv.angle : 0, Number.isFinite(sv.z) ? sv.z : null) : spawnOwned(world, o, world.player.x, world.player.y);
    if (!o.v) o.lost = !!sv.lost;
    state.vehicles.push(o);
  }
  pendingHeroDamage = d.hero && typeof d.hero === 'object' ? { health: d.hero.health, dents: validDents(d.hero.dents), flat: d.hero.flat === true } : null;
  if (!syncHeistOutfit()) applyLooks();
  upkeepTimer = 0;
}

let pendingHeroDamage = null;

function validDents(a) {
  if (!Array.isArray(a)) return null;
  return a.filter((d) => Array.isArray(d) && d.length === 3 && d.every(Number.isFinite)).slice(0, 12);
}

// --- icons ---------------------------------------------------------------------

// Cream pictogram per shop type in a unit box (-1..1) centred on the origin;
// shared by the 3D badges, shopfront signs, map icons and the shop menu.
export function drawShopGlyph(g, type, r, bg) {
  g.save();
  g.scale(r, r);
  g.fillStyle = '#f2ede0';
  g.strokeStyle = '#f2ede0';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 0.16;
  g.beginPath();
  switch (type) {
    case 'wapens':
      g.rect(-0.78, -0.42, 1.36, 0.32);
      g.moveTo(0.08, -0.12); g.lineTo(0.56, -0.12); g.lineTo(0.42, 0.62); g.lineTo(0.02, 0.62); g.closePath();
      g.fill();
      g.beginPath(); g.moveTo(-0.14, -0.1); g.quadraticCurveTo(-0.16, 0.24, 0.06, 0.24); g.stroke();
      break;
    case 'kleding':
      g.moveTo(-0.34, -0.64); g.quadraticCurveTo(0, -0.36, 0.34, -0.64);
      g.lineTo(0.8, -0.3); g.lineTo(0.58, 0.02); g.lineTo(0.4, -0.08); g.lineTo(0.4, 0.66);
      g.lineTo(-0.4, 0.66); g.lineTo(-0.4, -0.08); g.lineTo(-0.58, 0.02); g.lineTo(-0.8, -0.3); g.closePath();
      g.fill();
      break;
    case 'kapper':
      g.lineWidth = 0.15;
      g.arc(-0.34, 0.42, 0.22, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0.34, 0.42, 0.22, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.2, 0.25); g.lineTo(0.32, -0.72); g.moveTo(0.2, 0.25); g.lineTo(-0.32, -0.72); g.stroke();
      break;
    case 'fietsen':
      g.lineWidth = 0.13;
      g.arc(-0.48, 0.24, 0.32, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0.48, 0.24, 0.32, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.48, 0.24); g.lineTo(-0.12, -0.3); g.lineTo(0.3, -0.3); g.lineTo(0.48, 0.24);
      g.moveTo(-0.48, 0.24); g.lineTo(0.02, 0.24); g.lineTo(0.3, -0.3);
      g.moveTo(-0.2, -0.46); g.lineTo(0.0, -0.46); g.moveTo(0.3, -0.3); g.lineTo(0.26, -0.52); g.lineTo(0.44, -0.54);
      g.stroke();
      break;
    case 'auto':
      g.moveTo(-0.84, 0.3); g.lineTo(-0.84, 0.0); g.lineTo(-0.5, -0.08); g.lineTo(-0.28, -0.44); g.lineTo(0.32, -0.44);
      g.lineTo(0.54, -0.08); g.lineTo(0.84, 0.0); g.lineTo(0.84, 0.3); g.closePath();
      g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(-0.18, -0.34); g.lineTo(0.0, -0.34); g.lineTo(0.0, -0.1); g.lineTo(-0.36, -0.1); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0.1, -0.34); g.lineTo(0.28, -0.34); g.lineTo(0.42, -0.1); g.lineTo(0.1, -0.1); g.closePath(); g.fill();
      g.fillStyle = '#f2ede0'; g.strokeStyle = bg; g.lineWidth = 0.1;
      for (const wx of [-0.46, 0.46]) { g.beginPath(); g.arc(wx, 0.32, 0.2, 0, Math.PI * 2); g.fill(); g.stroke(); }
      break;
    case 'tabak':
      g.rotate(-0.22);
      g.rect(-0.72, -0.46, 1.44, 0.92);
      g.fill();
      g.fillStyle = bg;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.14 : 0.34;
        if (i) g.lineTo(Math.cos(a) * rr - 0.16, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr - 0.16, Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
      g.strokeStyle = bg; g.lineWidth = 0.09;
      g.beginPath(); g.moveTo(0.3, -0.2); g.lineTo(0.56, -0.2); g.moveTo(0.3, 0.02); g.lineTo(0.56, 0.02); g.moveTo(0.3, 0.24); g.lineTo(0.5, 0.24); g.stroke();
      break;
    case 'pand':
      g.lineWidth = 0.1;
      g.moveTo(-0.62, -0.72); g.lineTo(0.62, -0.72); g.stroke();
      g.beginPath(); g.moveTo(0, -0.72); g.lineTo(0, -0.42); g.moveTo(-0.42, -0.72); g.lineTo(-0.42, 0.06); g.moveTo(0.42, -0.72); g.lineTo(0.42, 0.06); g.stroke();
      g.beginPath(); g.arc(0, -0.2, 0.25, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(-0.42, 0.34, 0.27, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(0.42, 0.34, 0.27, 0, Math.PI * 2); g.fill();
      break;
    case 'super':
      g.moveTo(-0.78, -0.12); g.lineTo(0.78, -0.12); g.lineTo(0.56, 0.62); g.lineTo(-0.56, 0.62); g.closePath(); g.fill();
      g.beginPath(); g.lineWidth = 0.13; g.arc(0, -0.12, 0.46, Math.PI, 0); g.stroke();
      g.strokeStyle = bg; g.lineWidth = 0.08; g.beginPath();
      for (const bx of [-0.3, 0, 0.3]) { g.moveTo(bx, 0.04); g.lineTo(bx * 0.86, 0.48); }
      g.stroke();
      break;
    case 'snack':
      g.lineWidth = 0.12;
      for (const [fx, top] of [[-0.3, -0.62], [-0.1, -0.78], [0.1, -0.66], [0.3, -0.8]]) { g.moveTo(fx, 0); g.lineTo(fx + (fx > 0 ? 0.06 : -0.06), top); }
      g.stroke();
      g.beginPath(); g.moveTo(-0.56, -0.12); g.lineTo(0.56, -0.12); g.lineTo(0.3, 0.72); g.lineTo(-0.3, 0.72); g.closePath(); g.fill();
      break;
    case 'fietsenmaker':
      g.rotate(-0.78);
      g.rect(-0.12, -0.28, 0.24, 1.0); g.fill();
      g.beginPath(); g.arc(0, -0.48, 0.34, 0, Math.PI * 2); g.fill();
      g.fillStyle = bg; g.beginPath(); g.rect(-0.12, -0.9, 0.24, 0.42); g.fill();
      break;
    case 'tuning':
      g.moveTo(0.2, -0.86); g.lineTo(-0.5, 0.1); g.lineTo(-0.04, 0.1); g.lineTo(-0.24, 0.86); g.lineTo(0.52, -0.16); g.lineTo(0.06, -0.16); g.closePath(); g.fill();
      break;
    case 'boot':
      g.moveTo(-0.84, 0.24); g.lineTo(0.84, 0.24); g.lineTo(0.54, 0.62); g.lineTo(-0.56, 0.62); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-0.02, 0.12); g.lineTo(-0.02, -0.82); g.lineTo(0.62, 0.12); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-0.14, -0.6); g.lineTo(-0.6, 0.12); g.lineTo(-0.14, 0.12); g.closePath(); g.fill();
      break;
    case 'eikea':
      g.moveTo(-0.72, -0.2); g.lineTo(0.72, -0.2); g.lineTo(0.56, 0.62); g.lineTo(-0.56, 0.62); g.closePath(); g.fill();
      g.beginPath(); g.lineWidth = 0.12; g.moveTo(-0.34, -0.2); g.lineTo(-0.2, -0.66); g.lineTo(0.2, -0.66); g.lineTo(0.34, -0.2); g.stroke();
      break;
    case 'heli':
      g.beginPath(); g.ellipse(-0.1, 0.12, 0.42, 0.3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(0.2, 0.02); g.lineTo(0.86, -0.06); g.lineTo(0.86, 0.1); g.lineTo(0.2, 0.2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0.74, -0.26); g.lineTo(0.9, -0.26); g.lineTo(0.84, 0.08); g.lineTo(0.72, 0.08); g.closePath(); g.fill();
      g.beginPath(); g.lineWidth = 0.1; g.moveTo(-0.86, -0.4); g.lineTo(0.66, -0.4); g.moveTo(-0.1, -0.4); g.lineTo(-0.1, -0.18);
      g.moveTo(-0.52, 0.56); g.lineTo(0.3, 0.56); g.moveTo(-0.34, 0.4); g.lineTo(-0.34, 0.56); g.moveTo(0.12, 0.4); g.lineTo(0.12, 0.56); g.stroke();
      break;
    case 'spuit':
      g.rect(-0.32, -0.3, 0.52, 0.96);
      g.rect(-0.2, -0.5, 0.28, 0.2);
      g.fill();
      g.beginPath(); g.arc(0.42, -0.62, 0.06, 0, Math.PI * 2); g.arc(0.62, -0.42, 0.06, 0, Math.PI * 2); g.arc(0.66, -0.72, 0.05, 0, Math.PI * 2); g.fill();
      break;
  }
  g.restore();
}

// Map marker: rounded square in the shop colour (horeca is a circle).
// The shop the story route ends at while the story wants something bought there.
export function storyTargetShop(world) {
  const g = world && world.storyGuide;
  return g && g.buy && g.shopId ? shops.find((s) => s.id === g.shopId) || null : null;
}

// A pulsing gold ring around that shop's icon (minimap and map).
export function drawStoryShopRing(ctx, sx, sy, r, t) {
  const k = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = `rgba(232,201,58,${0.55 + 0.45 * k})`;
  ctx.beginPath();
  ctx.arc(sx, sy, r * (1 + 0.18 * k), 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(12,20,14,0.8)';
  ctx.beginPath();
  ctx.arc(sx, sy, r * (1 + 0.18 * k) + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawShopMapIcon(ctx, type, s) {
  const t = SHOP_TYPES[type];
  if (!t) return;
  ctx.beginPath();
  ctx.roundRect(-4.6 * s, -4.6 * s, 9.2 * s, 9.2 * s, 2 * s);
  ctx.fillStyle = t.color;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawShopGlyph(ctx, type, 3.4 * s, t.color);
}

const iconUrls = {};
export function shopIconUrl(type, px = 64) {
  const k = type + px;
  if (iconUrls[k]) return iconUrls[k];
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[type] ? SHOP_TYPES[type].color : '#1e9e56';
  g.translate(px / 2, px / 2);
  g.beginPath(); g.arc(0, 0, px / 2 - 2, 0, Math.PI * 2); g.fillStyle = col; g.fill();
  g.lineWidth = px * 0.05; g.strokeStyle = '#f2ede0'; g.stroke();
  drawShopGlyph(g, type, px * 0.3, col);
  return (iconUrls[k] = c.toDataURL());
}

// --- 3D shopfront ----------------------------------------------------------------

const padGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 20);
const signGeometry = new THREE.PlaneGeometry(3.2, 0.8);
const awningGeometry = new THREE.BoxGeometry(3.4, 0.08, 1.0);
const postGeometry = new THREE.BoxGeometry(0.1, 2.7, 0.1);
const postMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3228 });
const awningMaterials = {};

// signs own their texture/material; geometries and the per-type materials are shared
function disposeShopFront(root) {
  root.userData.disposed = true;
  if (root.userData.extra) root.userData.extra.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) if (!m.userData.shared) m.dispose();
  });
  root.traverse((o) => {
    if (o.userData.ownMaterial) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}
const badgeMaterials = {};
const padMaterials = {};

function badgeTexture(type) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[type].color;
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = col; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f2ede0'; g.stroke();
  drawShopGlyph(g, type, 36, col);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function signTexture(shop) {
  const W = 512, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[shop.type].color;
  g.fillStyle = '#10180f';
  g.fillRect(0, 0, W, H);
  g.fillStyle = col;
  g.fillRect(6, 6, W - 12, H - 12);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(6, H - 30, W - 12, 24);
  g.save(); g.translate(64, H / 2 - 6); drawShopGlyph(g, shop.type, 38, col); g.restore();
  g.fillStyle = '#f2ede0';
  g.textBaseline = 'middle';
  const chain = SHOP_TYPES[shop.type].chain.toUpperCase();
  let size = 64;
  g.font = `${size}px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`;
  while (g.measureText(chain).width > W - 150 && size > 28) { size -= 4; g.font = `${size}px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`; }
  g.fillText(chain, 124, H / 2 - 10);
  const sub = `${SHOP_TYPES[shop.type].label} · ${shop.suffix || ''}`.toUpperCase();
  let small = 17;
  g.font = `bold ${small}px 'Arial Narrow', Arial, sans-serif`;
  while (g.measureText(sub).width > W - 140 && small > 11) { small--; g.font = `bold ${small}px 'Arial Narrow', Arial, sans-serif`; }
  g.fillStyle = 'rgba(242,237,224,0.85)';
  g.fillText(sub, 126, H - 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildShopFront3D(shop) {
  const type = shop.type;
  const col = new THREE.Color(SHOP_TYPES[type].color);
  if (!badgeMaterials[type]) {
    badgeMaterials[type] = new THREE.SpriteMaterial({ map: badgeTexture(type), transparent: true, depthWrite: false, fog: true });
    padMaterials[type] = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.85 });
  }
  const root = new THREE.Group();
  root.name = 'shop-' + shop.id;

  const door = new THREE.Group();
  door.position.set(shop.x, 0, shop.y);
  const pad = new THREE.Mesh(padGeometry, padMaterials[type]);
  pad.position.y = 0.03;
  door.add(pad);
  const badge = new THREE.Sprite(badgeMaterials[type]);
  badge.scale.set(0.52, 0.52, 1);
  const phase = Math.random() * Math.PI * 2;
  badge.position.y = 2.3;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650 + phase) * 0.06; };
  door.add(badge);
  root.add(door);

  // lit sign board flat on the facade (or on two posts at a jetty), facing the street
  const f = shop.face || { x: shop.x, y: shop.y, nx: shop.kiosk.nx, ny: shop.kiosk.ny, h: 3.2 };
  if (!shop.face) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(f.x - f.ny * side * 1.4, 1.35, f.y + f.nx * side * 1.4);
      root.add(post);
    }
  }
  const draw = () => {
    if (root.userData.disposed) return;
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture(shop), fog: true, side: shop.face ? THREE.FrontSide : THREE.DoubleSide });
    const sign = new THREE.Mesh(signGeometry, signMat);
    sign.userData.ownMaterial = true;
    const y = shop.face ? Math.max(2.7, Math.min(3.4, f.h - 0.7)) : 2.4;
    const out = shop.face ? 0.34 : 0;
    sign.position.set(f.x + f.nx * out, y, f.y + f.ny * out);
    sign.rotation.y = Math.atan2(f.nx, f.ny);
    root.add(sign);
    if (!shop.face) return;
    if (!awningMaterials[type]) awningMaterials[type] = new THREE.MeshLambertMaterial({ color: col });
    const awning = new THREE.Mesh(awningGeometry, awningMaterials[type]);
    awning.position.set(f.x + f.nx * 0.8, y - 0.62, f.y + f.ny * 0.8);
    awning.rotation.y = Math.atan2(f.nx, f.ny);
    awning.rotation.x = 0.28;
    awning.rotation.order = 'YXZ';
    root.add(awning);
  };
  // wait for the web font so the sign doesn't bake in the fallback face
  if (document.fonts && document.fonts.load) document.fonts.load("64px 'Bebas Neue'").then(draw, draw);
  else draw();
  if (shop.pad) root.add(heliDealerExtras(shop, root));
  return root;
}

// Rotor Roelf's platform with a demo heli on it (hidden once you own one).
function heliDealerExtras(shop, root) {
  const g = new THREE.Group();
  g.position.set(shop.pad.x, 0, shop.pad.y);
  g.rotation.y = -shop.pad.angle;
  g.add(buildHelipadMesh(shop.pad.r, PAD_DECK));
  const demo = buildHeliMesh({ model: { color: '#e8e6e0' }, id: 0 });
  demo.position.y = PAD_DECK;
  g.add(demo);
  root.userData.demoHeli = demo;
  root.userData.extra = g;
  return g;
}
