// Monumentgebieden (#953, docs/BOURTANGE-MONUMENT-22-11.md): een plek die als monument moet voelen en niet als
// modern dorp. Een gebied is data: een middelpunt, een straal en per systeem een regel (wegen, straatmeubilair, verkeer,
// gevels, wallen, mensen, geluid, licht en kleur). Alleen Vesting Bourtange staat erin; een volgende plek (Appingedam,
// de Vismarkt) is één regel erbij, zonder nieuwe code op de haakpunten.
//
// Eén bron voor wat spel en test tellen. Zuiver: geen THREE, geen DOM, geen kaart; elke vraag krijgt (x, y) en geeft
// een antwoord dat voor iedereen gelijk is (deterministisch, Samen spelen: de wereld is van de host, de regel is
// overal dezelfde; er gaat niets over het net).
//
// Haakpunten (elk met `heritageAreaAt` of een van de helpers hieronder):
//   roadsurface.js     roadSurface()          wegmateriaal: klinkers, zandpad (en dus geen markeringen: die staan alleen op asfalt)
//   streetfurniture.js furnitureForTile()      geen lantaarnpalen, borden, bushokjes, vangrails en reclame
//   vehicle.js         manageTrafficPopulation geen rijdend verkeer in het gebied
//   models3d_buildings.js                      historische gevels (baksteen, luiken, pannendak, schoorsteen)
//   mapdata.js         dropNeedlessDeck        de wallen blijven echt hoog (aarden wal met grashelling)
//   clothing.js        pedRole                 wandelaars in zomerkleding en figuranten in historische kleding
//   sfx/ambience.js    countryPlace            geen stadsgeluid of verkeer, wel vogels en wind
//   monumentdecor.js   de aankleding (kanonnen, tonnen, lindebomen, lantaarns) en de figuranten

export const HERITAGE_AREAS = [
  {
    id: 'bourtange',
    name: 'Vesting Bourtange',
    // het Marktplein; de vesting is ca. 400 m over, de wallen en de gracht horen erbij
    at: [42470, 22800],
    radius: 235,
    rim: 45, // meter waarover de regel uitdooft (geluid, kleur): daarbuiten is het gewone land
    icon: 'monument',
    info: 'Een vestingdorp uit 1593 in de vorm van een vijfpuntige ster, met wallen, grachten en klinkerstraatjes. Geen auto te zien.',
    // wegen: type -> materiaal van roadsurface.js; markeringen vervallen vanzelf (alleen asfalt krijgt ze)
    roads: {
      surface: { residential: 'klinker_red', unclassified: 'klinker_red', living_street: 'klinker_red', service: 'klinker_grey', tertiary: 'klinker_red', secondary: 'klinker_red', pedestrian: 'klinker_grey', footway: 'gravel', path: 'gravel', steps: 'gravel', track: 'gravel', cycleway: 'gravel', bridleway: 'gravel' },
      fallback: 'klinker_grey',
    },
    // straatmeubilair: dit staat er niet (modern). Een bank, een hek en een heg blijven (hout en groen)
    furniture: { drop: ['lamp', 'shelter', 'placesign', 'wegwijzer', 'gantry', 'guardrail', 'hectometer', 'speedbump', 'noise', 'bollard', 'bikerack', 'bin'] },
    // verkeer: wat er niet rijdt. Fietsen mogen (rustig, ambient), een kar met paard kan later als decor
    traffic: { cars: false, motors: false, scooters: false, bikes: true, buses: false },
    // gevels: historische stijl; de lijst met kleuren staat in HISTORIC_FACADE
    facade: { style: 'historisch', chimney: 0.9, noRoofGear: true, noShopSigns: true, noAwnings: true },
    // de wallen: een voet- of fietspad dat in de kaart een brug zonder water is (aarde) behoudt zijn profiel als aarden wal
    rampart: { minZ: 2, maxZ: 3.2 },
    people: { area: 'monument' },
    // geluid: 0 = geen, 1 = zoals elders
    audio: { traffic: 0, city: 0.15, vogels: 1, wind: 1 },
    // licht: 's avonds warme lantaarnglans op de aankleding; kleur: iets warmer papier (Wereldkleur)
    light: { lantern: 0xffc46b, from: 20.5, to: 6 },
    tint: { warm: 0.06 },
    // de aankleding (monumentdecor.js)
    decor: true,
    // #1203 (hertest 24-11): het Marktplein is een bestraat plein met een kring linden langs de rand, geen grasveld met bomen in het
    // midden. Binnen deze straal: klinkers (monumentdecor3d.js), geen grasplukken (grass.js) en geen kaartbomen (tilegreenery.js); de
    // linden staan op de ring met een hoge stam, zodat hun kruinen boven het beeld van het monument blijven.
    plein: { at: [42470, 22806], radius: 21, ring: 18.5 },
  },
];

const BY_ID = Object.fromEntries(HERITAGE_AREAS.map((z) => [z.id, z]));
export const heritageAreaById = (id) => BY_ID[id] || null;

// Afstand van (x, y) tot het middelpunt van een gebied.
const dist = (z, x, y) => Math.hypot(x - z.at[0], y - z.at[1]);

// Het gebied waar (x, y) in ligt, of null. De kern (straal) is waar de harde regels gelden.
export function heritageAreaAt(x, y) {
  for (const z of HERITAGE_AREAS) if (dist(z, x, y) <= z.radius) return z;
  return null;
}

// 1 in de kern, 0 buiten straal + rim, daartussen lineair: voor geluid en kleur, die zacht moeten uitdoven.
export function monumentWeight(x, y) {
  let w = 0;
  for (const z of HERITAGE_AREAS) {
    const d = dist(z, x, y);
    w = Math.max(w, d <= z.radius ? 1 : d >= z.radius + z.rim ? 0 : 1 - (d - z.radius) / z.rim);
  }
  return w;
}

// Het wegmateriaal voor een weg in een gebied (type en klasse uit de kaart, `mid` = een punt van de weg); null buiten het gebied.
export function monumentRoadSurface(road, mid) {
  const z = mid && heritageAreaAt(mid[0], mid[1]);
  if (!z || !road) return null;
  return z.roads.surface[road.type] || z.roads.fallback;
}

// Het bestrate plein van een monumentgebied op (x, y), of null (#1203). pad: extra marge in meters.
export function monumentPleinAt(x, y, pad = 0) {
  for (const z of HERITAGE_AREAS) {
    const p = z.plein;
    if (p && Math.hypot(x - p.at[0], y - p.at[1]) <= p.radius + pad) return p;
  }
  return null;
}

// Mag dit straatmeubilair-soort (furniture k) hier staan?
export function monumentFurnitureAllowed(k, x, y) {
  const z = heritageAreaAt(x, y);
  return !z || !z.furniture.drop.includes(k);
}

// Mag deze verkeerssoort hier rijden of verschijnen? kind: 'cars' | 'motors' | 'scooters' | 'bikes' | 'buses'
export function monumentTrafficAllowed(kind, x, y) {
  const z = heritageAreaAt(x, y);
  return !z || z.traffic[kind] !== false;
}

// De gevelstijl op (x, y): het gebiedsobject van de gevelregel of null.
export function monumentFacadeAt(x, y) {
  const z = heritageAreaAt(x, y);
  return z && z.facade ? { area: z.id, ...z.facade } : null;
}

// De kleuren van de historische gevel (hex): baksteen rood tot bruin, pannendak, witte of groene kozijnen en luiken.
export const HISTORIC_FACADE = {
  walls: [0xa5523a, 0x8a4a34, 0x7a4030, 0x9a5a44, 0xb0603f],
  roofs: [0x8a3a28, 0x7a3426, 0x6b3a2a],
  frames: [0xf2efe6, 0x2f5a3a],
  shutters: [0x2f5a3a, 0xf2efe6, 0x3a4a6a],
  // kleine ramen: smaller vak en lager dan het moderne dorp
  style: { w: 0.95, bay: 2.3, hRatio: 0.5 },
};
export const historicFamily = (fine = 0) => ({
  wall: HISTORIC_FACADE.walls, roof: HISTORIC_FACADE.roofs[Math.floor(fine * HISTORIC_FACADE.roofs.length) % HISTORIC_FACADE.roofs.length], frame: HISTORIC_FACADE.frames[Math.floor(fine * 7.7) % HISTORIC_FACADE.frames.length],
});

// Het profiel van een wal: een pad dat de kaart als brug zonder water tekent houdt zijn hoogte (begrensd) en wordt een aarden
// wal met grashelling (elevation.js: een weg met profiel zonder brugvlag is een ophoging). Geeft de nieuwe hoogtes of null
// als dit pad hier geen wal is. `pts` zijn de punten van het pad.
export function monumentRampartProfile(z, pts) {
  if (!Array.isArray(z) || !pts || !pts.length) return null;
  let sx = 0, sy = 0;
  for (const p of pts) { sx += p[0]; sy += p[1]; }
  const area = heritageAreaAt(sx / pts.length, sy / pts.length);
  if (!area || !area.rampart) return null;
  let zmax = 0;
  for (const v of z) if (v > zmax) zmax = v;
  if (zmax < area.rampart.minZ) return null;
  return z.map((v) => Math.max(0, Math.min(v, area.rampart.maxZ)));
}

// De buurtsleutel van de mensen (clothing.js AREA_ROLES): null buiten een gebied.
export function monumentAreaKey(x, y) {
  const z = heritageAreaAt(x, y);
  return z && z.people ? z.people.area : null;
}

// Geluid: vermenigvuldigers (0..1) voor het stads- en verkeersgeluid op (x, y), zacht uitdovend aan de rand.
export function monumentAudioScale(x, y) {
  const w = monumentWeight(x, y);
  if (w <= 0) return null;
  const z = HERITAGE_AREAS.find((q) => dist(q, x, y) <= q.radius + q.rim);
  if (!z) return null;
  const mix = (v) => 1 + (v - 1) * w;
  return { traffic: mix(z.audio.traffic), city: mix(z.audio.city), vogels: mix(z.audio.vogels), wind: mix(z.audio.wind), weight: w };
}

// Brandt de lantaarnglans op dit uur? (alleen de aankleding; 's avonds en 's nachts)
export function monumentLanternOn(area, hour) {
  const l = area && area.light;
  if (!l || !Number.isFinite(hour)) return false;
  return hour >= l.from || hour < l.to;
}

// Het warmere papier van de Wereldkleur: een kleine verschuiving (0..tint.warm) naar warm, naar gewicht.
export function monumentTintAt(x, y) {
  const z = HERITAGE_AREAS.find((q) => dist(q, x, y) <= q.radius + q.rim);
  if (!z || !z.tint) return 0;
  return z.tint.warm * monumentWeight(x, y);
}

// Voor de kaart en de lijst met plekken: naam, icoon en korte tekst per gebied.
export const monumentPois = () => HERITAGE_AREAS.map((z) => ({ id: z.id, naam: z.name, x: z.at[0], y: z.at[1], icon: z.icon, tekst: z.info }));
