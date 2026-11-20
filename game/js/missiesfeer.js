// Missiesferen (#988): per soort missie of bijbaan een eigen muzieksfeer, als de eigenaar
// (Gemini) de loop heeft geleverd. Pure gegevens, geen imports: de test en de scenariomuziek
// lezen dit bestand. Het spel maakt of genereert zelf geen muziek.
//
// Een bestand toevoegen: zet `missie_<naam>.mp3` in game/audio/scenario/ en zet de sfeer in
// BESCHIKBARE_SFEREN. Zolang een sfeer er niet in staat, speelt een missie de gewone
// `missie`-loop (missie_spanning_loop) en een bijbaan de radio; er wordt niets opgehaald
// (geen 404) en niets geladen voor het nodig is (scenario.js laadt lui, alleen de sfeer die speelt).
// Zie docs/MUZIEK-OPDRACHT-GEMINI.md.

export const SFEER_BESTAND = {
  missie_komisch: 'missie_komisch.mp3', // lichtvoetig, quirky: de klusjes van de eerste akten
  missie_sluipen: 'missie_sluipen.mp3', // gespannen, laag: de kraak, het beleg, de kruitkelder
  missie_ontdekken: 'missie_ontdekken.mp3', // nieuwsgierig: wandelen, uitkijkpunten, het platteland
  missie_warm: 'missie_warm.mp3', // emotioneel: oma, Beppe, verhaalscènes, de verhuizing
  missie_feest: 'missie_feest.mp3', // volksfeest: kermis, bruggenrace, het plein van M26
  missie_werk: 'missie_werk.mp3', // klussen en bijbanen
  missie_finale: 'missie_finale.mp3', // groots: het proefbeleg en het slot
  missie_nacht: 'missie_nacht.mp3', // nachtritten
  missie_water: 'missie_water.mp3', // skûtsje en varen
};
export const SFEER_KEYS = Object.keys(SFEER_BESTAND);

// De lijst die de eigenaar bijhoudt: alleen sferen waarvan het bestand echt in game/audio/scenario/ staat.
export const BESCHIKBARE_SFEREN = [];

// Welke sfeer bij welke missie hoort (de code M01 tot M30 uit storyarc.js, zoals world.mission.code).
const MISSIE_SFEER = {
  M01: 'missie_komisch', M02: 'missie_komisch', M03: 'missie_komisch', M04: 'missie_ontdekken',
  M05: 'missie_komisch', M06: 'missie_sluipen', M07: 'missie_komisch', M08: 'missie_komisch',
  M09: 'missie_komisch', M10: 'missie_komisch', M11: 'missie_water', M12: 'missie_komisch',
  M13: 'missie_sluipen', M14: 'missie_sluipen', M15: 'missie_ontdekken', M16: 'missie_feest',
  M17: 'missie_feest', M18: 'missie_sluipen', M19: 'missie_ontdekken', M20: 'missie_sluipen',
  M21: 'missie_sluipen', M22: 'missie_werk', M23: 'missie_sluipen', M24: 'missie_ontdekken',
  M25: 'missie_komisch', M26: 'missie_feest', M27: 'missie_warm', M28: 'missie_warm',
  M29: 'missie_warm', M30: 'missie_finale',
};
// Standaard voor een missie die hier (nog) niet staat: per akte op het nummer, anders per soort.
const AKTE_STANDAARD = [[8, 'missie_komisch'], [16, 'missie_ontdekken'], [21, 'missie_sluipen'], [26, 'missie_werk'], [29, 'missie_warm'], [99, 'missie_finale']];
const TYPE_STANDAARD = { boat: 'missie_water' };

// Bijbanen (sideJob.id uit sidejobs.js): zonder vermelding is het werk. Een bijbaan zonder
// geleverd bestand houdt de radio, anders zou elke klus ineens de missieloop krijgen.
const BIJBAAN_SFEER = {
  skutsje: 'missie_water', tjalke: 'missie_water', rondvaart: 'missie_water', rondvaarttour: 'missie_water',
  veerdienst: 'missie_water', bruggen: 'missie_feest', cabaret: 'missie_feest', taxinacht: 'missie_nacht',
};
const BIJBAAN_NACHT = ['taxi', 'bezorger', 'vracht', 'lijn']; // ritten die 's nachts de nachtsfeer krijgen

export const sfeerBeschikbaar = (key) => BESCHIKBARE_SFEREN.includes(key);
export const sfeerBestand = (key) => SFEER_BESTAND[key] || null;

// Een sfeer die er niet is, wordt de terugvalsleutel: 'missie' (de missieloop).
export const sfeerMetTerugval = (key) => (key && sfeerBeschikbaar(key) ? key : 'missie');

// De gewenste sfeer van een lopende verhaalmissie (zonder terugval). code is 'M01' enzovoort.
export function missieSfeer(code, type) {
  if (code && MISSIE_SFEER[code]) return MISSIE_SFEER[code];
  const nr = /^M(\d+)$/.exec(code || '');
  if (nr) { const n = +nr[1]; const a = AKTE_STANDAARD.find(([max]) => n <= max); if (a) return a[1]; }
  return TYPE_STANDAARD[type] || 'missie_komisch';
}

// De muzieksleutel voor een lopende missie: de sfeer, of de terugval 'missie' als het bestand ontbreekt.
export const missieMuziekKey = (code, type) => sfeerMetTerugval(missieSfeer(code, type));

// De sleutel voor een actieve bijbaan, of null (de radio) zolang het bestand er niet is.
export function bijbaanMuziekKey(id, nacht) {
  const key = (nacht && BIJBAAN_NACHT.includes(id)) ? 'missie_nacht' : (BIJBAAN_SFEER[id] || 'missie_werk');
  return sfeerBeschikbaar(key) ? key : null;
}

// Voor scenario.js: de bestanden van de sferen die er zijn, als { sleutel: pad }.
export function sfeerTracks(map = './audio/scenario/') {
  const t = {};
  for (const k of BESCHIKBARE_SFEREN) if (SFEER_BESTAND[k]) t[k] = map + SFEER_BESTAND[k];
  return t;
}
