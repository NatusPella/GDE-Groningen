// Het voertuigregister: één plek waar elk voertuigmodel (de `model.name` van vehicle.js) staat
// met wat het als spelobject kan. De regel (docs/ARCHITECTURE.md, "Voertuigen"): een nieuw
// voertuig is pas af als het
//   1. hier staat,
//   2. te koop of te verzamelen is (winkel: sleutels van VEHICLE_STOCK in shops.js, of een
//      vondst/ontgrendeling daarvan),
//   3. te upgraden is (tuning, kleur, onderdelen: shops.js upgradeListForStock),
//   4. willekeurig spawnt (verkeer per wijk en tijd van de dag, of een eigen beheerder), en
//   5. in cutscenes alleen als model uit dit register verschijnt.
// Wie echt niet aan een punt kan voldoen (openbaar vervoer, attractie) krijgt `uitzondering`
// met de reden. scripts/vehicleregister_test.mjs controleert dit tegen de code.
// Pure data, Node-safe, zonder THREE.
//
// spawn: lijst van
//   { soort: 'wijk', kinds: [...] }       kinds uit trafficfleet.js TRAFFIC_PROFILES (gewicht per wijk, tijd van de dag)
//   { soort: 'beheer', bestand, zoek }    een eigen beheerder in dat bestand die dit model spawnt (zoek: tekst die er moet staan)
// winkel: sleutels van VEHICLE_STOCK (kopen of vrijspelen). tuning: 'auto' | 'tweewieler' | 'boot' | 'lucht'.

export const KLASSEN = ['auto', 'tweewieler', 'boot', 'lucht', 'ov', 'attractie', 'dier'];

const wijk = (...kinds) => ({ soort: 'wijk', kinds });
const beheer = (bestand, zoek) => ({ soort: 'beheer', bestand, zoek });

export const VOERTUIGEN = {
  hatch: { klasse: 'auto', spawn: [wijk('hatch', 'roestbak', 'elektrisch', 'tokkie')], winkel: ['mug', 'knakker', 'pienter', 'roestbak'], tuning: 'auto', cutscene: true },
  sedan: { klasse: 'auto', spawn: [wijk('sedan')], winkel: ['statig', 'kanselier', 'regent'], tuning: 'auto', cutscene: true },
  wagon: { klasse: 'auto', spawn: [wijk('wagon')], winkel: ['koopman', 'stationair'], tuning: 'auto', cutscene: true },
  suv: { klasse: 'auto', spawn: [wijk('suv')], winkel: ['landjonker', 'borgheer'], tuning: 'auto', cutscene: true },
  sport: { klasse: 'auto', spawn: [wijk('sport')], winkel: ['wervelwind', 'raket'], tuning: 'auto', cutscene: true },
  van: { klasse: 'auto', spawn: [wijk('van', 'delivery'), beheer('vehicle.js', 'newsvan')], winkel: ['klusbus', 'pakezel', 'bezorgbus'], tuning: 'auto', cutscene: true },
  truck: { klasse: 'auto', spawn: [wijk('truck')], winkel: ['bakwagen', 'sjouwer', 'tankwagen'], tuning: 'auto', cutscene: true },
  taxi: { klasse: 'auto', spawn: [wijk('taxi')], winkel: ['taxi', 'nachtbraker'], tuning: 'auto', cutscene: true },
  cashvan: { klasse: 'auto', spawn: [wijk('cashvan')], winkel: ['poen'], tuning: 'auto', cutscene: true },
  ambulance: { klasse: 'auto', spawn: [beheer('vehicle.js', 'ambulance')], winkel: ['ambulance'], tuning: 'auto', cutscene: true },
  police: { klasse: 'auto', spawn: [beheer('police.js', 'spawnPolice')], winkel: ['politie'], tuning: 'auto', cutscene: true },
  foodtruck: { klasse: 'auto', spawn: [beheer('pg_foodtruck.js', 'foodtruck')], winkel: ['fjordfrituur'], tuning: 'auto', cutscene: true },
  escort: { klasse: 'auto', spawn: [beheer('vehicle.js', 'spawnHeroCarNear')], winkel: [], vondst: 'De rode Fjord Escapade is het startvoertuig van het verhaal en staat altijd in de garage (ownedvehicles.js HERO_SPEC)', tuning: 'auto', cutscene: true },
  bus: { klasse: 'auto', spawn: [beheer('vehicle.js', 'manageBusPopulation')], winkel: ['stadsbus'], tuning: 'auto', cutscene: true },
  midibus: { klasse: 'auto', spawn: [beheer('vehicle.js', 'MIDIBUS_MODEL')], winkel: ['midibus'], tuning: 'auto', cutscene: true },
  trekkerlimo: { klasse: 'auto', spawn: [beheer('missions.js', 'trekkerlimo')], winkel: ['trekkerlimo'], tuning: 'auto', cutscene: true },
  // Jelles limo uit het verhaal: de speler wint zijn trekker-limo, dat is de verzamelbare versie
  limo: { klasse: 'auto', alias: 'trekkerlimo', spawn: [beheer('convoy.js', "name: 'limo'")], winkel: ['trekkerlimo'], tuning: 'auto', cutscene: true },
  tractor: { klasse: 'auto', spawn: [beheer('countrylife.js', 'TRACTOR_MODEL'), beheer('parkedcars.js', 'TRACTOR_MODEL')], winkel: ['trekker'], tuning: 'auto', cutscene: true },
  quad: { klasse: 'auto', spawn: [beheer('countrylife.js', 'QUAD_MODEL')], winkel: ['quad'], tuning: 'auto', cutscene: true },
  bike: { klasse: 'tweewieler', spawn: [beheer('vehicle.js', 'manageBikePopulation')], winkel: ['omafiets', 'stadsfiets', 'fatbike', 'transportfiets', 'barrel', 'bakfiets'], tuning: 'tweewieler', cutscene: true },
  scooter: { klasse: 'tweewieler', spawn: [beheer('vehicle.js', 'SCOOTER_MODELS')], winkel: ['brommer', 'deelstep', 'snorscooter', 'pruttelaar'], tuning: 'tweewieler', cutscene: true },
  motor: { klasse: 'tweewieler', spawn: [beheer('motortraffic.js', 'motor')], winkel: ['stormvogel', 'knetter', 'klassieker'], tuning: 'tweewieler', cutscene: true },
  boat: { klasse: 'boot', spawn: [beheer('vehicle.js', 'spawnBoatOnWater')], winkel: ['kano', 'kajak', 'waterfiets', 'bijboot', 'rubberboot', 'sloep', 'speedboot', 'roeiboot', 'zeilboot', 'rondvaartboot', 'politieboot'], tuning: 'boot', cutscene: true },
  heli: { klasse: 'lucht', spawn: [beheer('police.js', 'policeHeli')], winkel: ['wiekenwubbo'], tuning: 'lucht', cutscene: true },
  // --- uitzonderingen: niet te koop of te verzamelen, met reden ---
  plane: { klasse: 'attractie', spawn: [beheer('planeflight.js', 'PLANE_MODEL')], winkel: [], tuning: null, cutscene: false, uitzondering: 'Het vliegtuig is een rondvlucht-attractie (planeflight.js), geen bezit' },
  maaidorser: { klasse: 'attractie', spawn: [beheer('boerderijwereld.js', 'MACHINE_MODELLEN')], winkel: [], tuning: null, cutscene: false, uitzondering: 'De Korenwolf maaidorser koop of huur je bij de boerderij (machines.js, Boerderij > Machines), niet in de voertuigwinkel; hij heeft geen tuning' },
  laadmachine: { klasse: 'attractie', spawn: [beheer('boerderijwereld.js', 'MACHINE_MODELLEN')], winkel: [], tuning: null, cutscene: false, uitzondering: 'De Laadkabouter koop of huur je bij de boerderij (machines.js, Boerderij > Machines), niet in de voertuigwinkel; hij heeft geen tuning' },
  horse: { klasse: 'dier', spawn: [beheer('policemounts.js', 'HORSE_MODEL')], winkel: [], tuning: null, cutscene: false, uitzondering: 'Een politiepaard is een dier, geen voertuig om te kopen of te tunen' },
  kart: { klasse: 'attractie', spawn: [beheer('kartbaan.js', 'createKart')], winkel: [], tuning: null, cutscene: false, uitzondering: 'Karts worden op de kartbaan gehuurd (kartbaan.js)' },
  train: { klasse: 'ov', spawn: [beheer('railway.js', 'train')], winkel: [], tuning: null, cutscene: true, uitzondering: 'Openbaar vervoer op het spoor: niet te bezitten of te tunen' },
};

export const REGISTER_NAMEN = Object.keys(VOERTUIGEN);
export const heeftUitzondering = (naam) => !!(VOERTUIGEN[naam] && VOERTUIGEN[naam].uitzondering);

// Samen spelen (#452/#434): de coöp-regel per voertuigmodel. Dit is de enige plek waar staat
// hoeveel plekken een voertuig heeft en of een gast mag sturen; coopbestuur.js en coopnet.js
// lezen deze regel en hebben geen eigen lijst meer nodig.
//   stoelen     plekken voorin (de bestuurder en de bijrijder)
//   passagiers  extra plekken achterin, naast de bijrijder
//   bestuur     'gast' (een gast mag sturen) of 'nee' (alleen in zijn eigen spel)
export const COOP_STANDAARD = Object.freeze({
  auto: { stoelen: 2, passagiers: 3, bestuur: 'gast' },
  tweewieler: { stoelen: 1, passagiers: 0, bestuur: 'gast' },
  boot: { stoelen: 2, passagiers: 3, bestuur: 'gast' },
  lucht: { stoelen: 2, passagiers: 0, bestuur: 'nee' },
  ov: { stoelen: 2, passagiers: 6, bestuur: 'nee' },
  attractie: { stoelen: 1, passagiers: 0, bestuur: 'nee' },
  dier: { stoelen: 1, passagiers: 0, bestuur: 'nee' },
});

// Wat per model afwijkt van de standaard van zijn klasse. Een bus is groot genoeg voor een hele
// groep, een politieauto of ambulance bestuurt een gast niet, en de machines van de boerderij
// bestuurt hij wel als de boer ze deelt (#415).
const COOP_AFWIJKING = {
  bus: { passagiers: 6, bestuur: 'nee' },
  midibus: { passagiers: 6, bestuur: 'nee' },
  police: { bestuur: 'nee' },
  ambulance: { bestuur: 'nee' },
  escort: { bestuur: 'nee' },
  heli: { bestuur: 'nee', passagiers: 0 },
  plane: { bestuur: 'nee', passagiers: 0 },
  train: { bestuur: 'nee', passagiers: 6 },
  kart: { bestuur: 'nee', stoelen: 1, passagiers: 0 },
  horse: { bestuur: 'nee', stoelen: 1, passagiers: 0 },
  maaidorser: { bestuur: 'gast', stoelen: 1, passagiers: 0 },
  laadmachine: { bestuur: 'gast', stoelen: 1, passagiers: 0 },
};

// De coöp-regel van een modelnaam (de `model.name` van vehicle.js), of null voor een onbekend model.
export function coopVoertuig(naam) {
  const e = VOERTUIGEN[naam];
  if (!e) return null;
  return Object.freeze({ ...COOP_STANDAARD[e.klasse], ...(COOP_AFWIJKING[naam] || {}), model: naam });
}
export function coopVanModel(model) {
  const naam = model && (model.naam || model.name);
  return typeof naam === 'string' ? coopVoertuig(naam) : null;
}
