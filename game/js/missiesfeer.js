// Missiesferen (#988): eigen sfeermuziek voor een kleine lijst verhaalmomenten, als de eigenaar
// (Gemini) de loop heeft geleverd. Pure gegevens, geen imports: de test en de scenariomuziek
// lezen dit bestand. Het spel maakt of genereert zelf geen muziek.
//
// De radio is de standaard (besluit eigenaar 20-11): wat niet in MISSIE_EIGEN_MUZIEK of
// BIJBAAN_EIGEN_MUZIEK staat, krijgt geen eigen sfeer (null = de radio, of stilte als de speler
// de radio uitzette). Bijbanen en klusachtige missies blijven dus bij de radio.
//
// Een bestand toevoegen: zet `missie_<naam>.mp3` in game/audio/scenario/ en zet de sfeer in
// BESCHIKBARE_SFEREN. Een moment waarvan het bestand ontbreekt, geeft de radio; er wordt niets
// opgehaald (geen 404) en niets geladen voor het nodig is (scenario.js laadt lui).
// Zie docs/MUZIEK-OPDRACHT-GEMINI.md.

export const SFEER_BESTAND = {
  missie_komisch: 'missie_komisch.mp3', // lichtvoetig, quirky, bassig en jazzy: de kennismakingsmissies en komische intermezzo's
  missie_sluipen: 'missie_sluipen.mp3', // gespannen, laag: de heist-achtige missies
  missie_ontdekken: 'missie_ontdekken.mp3', // nieuwsgierig: alleen een onthulling of uitkijkpunt als scene
  missie_warm: 'missie_warm.mp3', // emotioneel: Oma, Beppe en de ontmoetingsscenes
  missie_feest: 'missie_feest.mp3', // volksfeest: kermis, het plein van M26, de bruggenrace
  missie_werk: 'missie_werk.mp3', // (nu niet gekoppeld: klussen en bijbanen houden de radio)
  missie_finale: 'missie_finale.mp3', // groots: het slot
  missie_nacht: 'missie_nacht.mp3', // (nu niet gekoppeld: alleen een expliciete nachtscene)
  missie_water: 'missie_water.mp3', // skutsje-sprint en de sloepmissie als wedstrijd
};
export const SFEER_KEYS = Object.keys(SFEER_BESTAND);

// De lijst die de eigenaar bijhoudt: alleen sferen waarvan het bestand echt in game/audio/scenario/ staat.
export const BESCHIKBARE_SFEREN = ['missie_komisch', 'missie_sluipen', 'missie_feest', 'missie_warm', 'missie_finale'];

// DE LIJST VAN DE EIGENAAR: de verhaalmomenten met eigen muziek. Alles wat hier niet staat, is radio.
// code = de missiecode (world.mission.code, M01 tot M30); sfeer = een sleutel uit SFEER_BESTAND;
// stap (optioneel) = [van, tot] als stageIndex-bereik, voor een deel van een missie (leest
// world.mission.stageIndex; zolang een missie die niet publiceert, telt een regel met stap niet mee).
// Zonder stap geldt de hele missie. Houd dit klein: elke regel is een moment waar het verhaal het vraagt.
export const MISSIE_EIGEN_MUZIEK = [
  // komisch: de eerste kennismakingsmissies
  { code: 'M01', sfeer: 'missie_komisch' }, { code: 'M02', sfeer: 'missie_komisch' }, { code: 'M03', sfeer: 'missie_komisch' },
  { code: 'M04', sfeer: 'missie_komisch' }, { code: 'M05', sfeer: 'missie_komisch' },
  // sluipen: de heist-achtige missies
  { code: 'M06', sfeer: 'missie_sluipen' }, { code: 'M13', sfeer: 'missie_sluipen' }, { code: 'M14', sfeer: 'missie_sluipen' },
  { code: 'M20', sfeer: 'missie_sluipen' }, { code: 'M21', sfeer: 'missie_sluipen' },
  // feest: de kermis en het plein van M26
  { code: 'M16', sfeer: 'missie_feest' }, { code: 'M26', sfeer: 'missie_feest' },
  // water: het skutsje van M11 (de sprint is een wedstrijd)
  { code: 'M11', sfeer: 'missie_water' },
  // warm: Oma en Beppe
  { code: 'M27', sfeer: 'missie_warm' }, { code: 'M28', sfeer: 'missie_warm' }, { code: 'M29', sfeer: 'missie_warm' },
  // finale: het slot
  { code: 'M30', sfeer: 'missie_finale' },
  // ontdekken en nacht: nog geen regels; voeg er een toe als een scene dat vraagt (onthulling, uitkijkpunt, nachtscene)
];

// Bijbanen (sideJob.id uit sidejobs.js) die als wedstrijd of verhaalmoment eigen muziek krijgen. De rest is de radio.
export const BIJBAAN_EIGEN_MUZIEK = { skutsje: 'missie_water', bruggen: 'missie_feest' };

export const sfeerBeschikbaar = (key) => BESCHIKBARE_SFEREN.includes(key);
export const sfeerBestand = (key) => SFEER_BESTAND[key] || null;

// De sfeer van een missie op dit moment uit de lijst (zonder te kijken of het bestand er is), of null.
export function missieSfeer(code, stageIndex) {
  if (!code) return null;
  const r = MISSIE_EIGEN_MUZIEK.find((e) => e.code === code
    && (!e.stap || (Number.isFinite(stageIndex) && stageIndex >= e.stap[0] && stageIndex <= e.stap[1])));
  return r ? r.sfeer : null;
}

// De muzieksleutel voor een lopende missie, of null (radio) als het geen lijstmoment is of het bestand ontbreekt.
export function missieMuziekKey(code, stageIndex) {
  const k = missieSfeer(code, stageIndex);
  return k && sfeerBeschikbaar(k) ? k : null;
}

// De sleutel voor een actieve bijbaan, of null (de radio).
export function bijbaanMuziekKey(id) {
  const k = BIJBAAN_EIGEN_MUZIEK[id];
  return k && sfeerBeschikbaar(k) ? k : null;
}

// Voor scenario.js: de bestanden van de sferen die er zijn, als { sleutel: pad }.
export function sfeerTracks(map = './audio/scenario/') {
  const t = {};
  for (const k of BESCHIKBARE_SFEREN) if (SFEER_BESTAND[k]) t[k] = map + SFEER_BESTAND[k];
  return t;
}
