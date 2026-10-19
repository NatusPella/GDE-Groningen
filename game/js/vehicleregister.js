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
  horse: { klasse: 'dier', spawn: [beheer('policemounts.js', 'HORSE_MODEL')], winkel: [], tuning: null, cutscene: false, uitzondering: 'Een politiepaard is een dier, geen voertuig om te kopen of te tunen' },
  kart: { klasse: 'attractie', spawn: [beheer('kartbaan.js', 'createKart')], winkel: [], tuning: null, cutscene: false, uitzondering: 'Karts worden op de kartbaan gehuurd (kartbaan.js)' },
  train: { klasse: 'ov', spawn: [beheer('railway.js', 'train')], winkel: [], tuning: null, cutscene: true, uitzondering: 'Openbaar vervoer op het spoor: niet te bezitten of te tunen' },
};

export const REGISTER_NAMEN = Object.keys(VOERTUIGEN);
export const heeftUitzondering = (naam) => !!(VOERTUIGEN[naam] && VOERTUIGEN[naam].uitzondering);
