// Spullen in 3D (#1086): welk model hoort bij welk ding in het Spullen-paneel. Puur: geen three, geen DOM. Elke bouwer hier geeft een
// voorbeeldspecificatie voor vehiclepreview.js (dezelfde als de garage en de winkel gebruiken) of null: dan blijft het icoon staan.
//   { kind: 'weapon', weapon }   een wapen uit models3d_people.js (GUN_SPECS)
//   { kind: 'product', product } een winkelproduct uit shopmodels3d.js (eten, meubels, onderdelen, kaarten)
//   { kind: 'person', look }     een personage in de kleding (kleding)
//   { kind: 'spul', spul }       een nieuw model uit models3d_spullen.js (geld, vis, aanwijzing, onderdelen)
// De parameters en kleuren van een model staan hier, als data: één generator, veel varianten. Samen spelen: Spullen zijn per speler
// (#429); de viewer is lokaal en stuurt niets. Test: scripts/spullen3d_test.mjs, dekking: scripts/ui/spullen3d_dekking.mjs.

const spul = (type, extra = {}) => ({ kind: 'spul', spul: { type, ...extra } });
// Ronde 2 (spullen-r2): wat in de winkel een kaal blokje is, heeft hier een eigen, rijker model (models3d_spullen.js) onder dezelfde naam.
export const SPUL_MODEL_VOOR = new Set(['spaarkaart', 'kauwgom', 'pakket', 'tv', 'ehbo', 'koek', 'drop', 'accu', 'schijf', 'bureau', 'frituur', 'bed']);
const product = (key) => (SPUL_MODEL_VOOR.has(key) ? spul(key) : { kind: 'product', product: key });

// Geld: hoe dik de stapels zijn, per bedrag (niveau 0 tot 3).
export const moneyTier = (bedrag) => { const b = Number(bedrag) || 0; return b < 50 ? 0 : b < 500 ? 1 : b < 5000 ? 2 : 3; };
export const moneySpec = (bedrag) => spul('geld', { niveau: moneyTier(bedrag) });

// Wapens: alle sleutels van WEAPONS hebben een model in models3d_people.js. Vuisten zijn geen spul (je hebt ze niet): daar is geen model voor.
export const wapenSpec = (key) => (key && key !== 'fists' ? { kind: 'weapon', weapon: key } : null);

// Kleding: het personage in de kleur van de set; `look` is het uiterlijk van de speler met de kleuren van de set erover.
export const kledingSpec = (look) => (look && typeof look === 'object' ? { kind: 'person', look: { ...look } } : null);

// Eten: elk snackje van de toonbank heeft een productmodel met dezelfde naam als het id; een vis komt uit de vis-generator.
export const ETEN_PRODUCT = new Set(['krentenbol', 'koffie', 'drop', 'energie', 'ehbo', 'kroket', 'frikandel', 'eierbal', 'oorlog', 'kapsalon', 'koek', 'kauwgom', 'ballen', 'hotdog']);
// [vorm, lengte (1 = 25 cm), hoogte/lengte, rug, buik, vin, extra]: vorm 'spil' (standaard), 'plat' of 'slang'; extra: bek, snor, strepen, accent.
export const VIS_LOOK = {
  voorn: ['spil', 0.9, 0.3, 0x6f8a86, 0xe0e4e2, 0xc8503a],
  baars: ['spil', 0.9, 0.33, 0x5a7a3a, 0xe8e0a0, 0xc8503a, { strepen: 0x2a3a1a }],
  brasem: ['spil', 1.1, 0.45, 0x8a7a50, 0xc8b888, 0x5a5040],
  snoek: ['spil', 1.5, 0.17, 0x5a7a3a, 0xd8d098, 0x7a8a4a, { bek: true }],
  karper: ['spil', 1.3, 0.36, 0x8a7230, 0xd8b860, 0x8a5a2a, { snor: true }],
  zeelt: ['spil', 1.0, 0.34, 0x5a7a40, 0x8aa060, 0x4a6a38],
  ruisvoorn: ['spil', 0.85, 0.32, 0x9a8a40, 0xe8c860, 0xc8503a],
  kolblei: ['spil', 0.9, 0.48, 0x8a9aa0, 0xd8e0e4, 0x8a96a0],
  snoekbaars: ['spil', 1.3, 0.2, 0x7a8a6a, 0xe8e4d0, 0x6a7a5a, { strepen: 0x4a5a3a }],
  paling: ['slang', 1.5, 0.06, 0x4a4a32, 0xc8b860, 0x4a4a32],
  winde: ['spil', 1.1, 0.3, 0xb88a3a, 0xe8c880, 0xe07a2a],
  giebel: ['spil', 0.8, 0.42, 0x9a8a50, 0xd8c070, 0xa8823a],
  kroeskarper: ['spil', 0.8, 0.44, 0x8a5a2a, 0xc89050, 0x7a4a22],
  stekelbaars: ['spil', 0.45, 0.3, 0x6a8a6a, 0xd8a0a0, 0x6a8a6a],
  bittervoorn: ['spil', 0.45, 0.32, 0x6a9aa8, 0xd8b8c8, 0xe06a4a],
  modderkruiper: ['slang', 1.0, 0.09, 0x6a5a3a, 0xb89a58, 0x6a5a3a],
  bot: ['plat', 0.9, 0.3, 0x6a7a4a, 0xd8d0b0, 0x5a6a3a, { accent: 0xc86a3a }],
  schol: ['plat', 1.0, 0.3, 0x8a7a50, 0xe8e0c8, 0x7a6a40, { accent: 0xe0701e }],
  tong: ['plat', 1.2, 0.3, 0x8a6a4a, 0xe8d8b8, 0x6a5a3a, { accent: 0x5a4a30 }],
  wijting: ['spil', 1.2, 0.2, 0xb8a870, 0xe8e4d8, 0x8a8a60],
  zeebaars: ['spil', 1.3, 0.26, 0x7a8a96, 0xe0e4e8, 0x5a6a76],
  harder: ['spil', 1.0, 0.22, 0x8a9a98, 0xe4e8e4, 0x7a8a8a],
  spiering: ['spil', 0.5, 0.14, 0x8aa8a0, 0xe4ece8, 0xb0c8c0],
  haring: ['spil', 0.9, 0.22, 0x4a6a86, 0xe4ecf0, 0x4a6a86],
  kabeljauw: ['spil', 1.5, 0.3, 0x8a7a50, 0xe8e0c8, 0x7a6a40, { snor: true }],
  houting: ['spil', 1.1, 0.24, 0x8a9aa0, 0xe8ecec, 0x7a8a90],
  zeeforel: ['spil', 1.3, 0.26, 0x7a8a90, 0xe8e4e0, 0x6a7a80],
  meerval: ['spil', 1.7, 0.22, 0x4a4a3a, 0xb8b090, 0x3a3a2e, { snor: true, bek: true }],
  rivierprik: ['slang', 1.0, 0.07, 0x5a6a5a, 0xb8c0a0, 0x5a6a5a],
};
export const visSpec = (soortId) => {
  const l = VIS_LOOK[soortId];
  if (!l) return spul('vis', { vorm: 'spil', len: 1, h: 0.3, rug: 0x7a8a7a, buik: 0xd8dcd4, vin: 0x7a8a7a }); // een nieuwe soort zonder tabelregel: een grijs visje
  const [vorm, len, h, rug, buik, vin, extra] = l;
  return spul('vis', { vorm, len, h, rug, buik, vin, ...(extra || {}) });
};
// id van de voorraad: 'vis:<soort>' of een snack
export function etenSpec(id) {
  const s = String(id || '');
  if (s.startsWith('vis:')) return visSpec(s.slice(4));
  return ETEN_PRODUCT.has(s) ? product(s) : null;
}

// Thuis: elk meubel van het meubelhuis heeft een productmodel met dezelfde naam.
export const MEUBEL_PRODUCT = new Set(['kast', 'bank', 'lamp', 'bed', 'tv', 'prikbord', 'frituur', 'plant', 'bureau']);
export const meubelSpec = (id) => (MEUBEL_PRODUCT.has(id) ? product(id) : null);

// Kaarten en verzamelingen.
export const CARD_SPEC = {
  stempels: product('spaarkaart'),
  aanwijzingen: spul('aanwijzing'),
  eieren: product('eierbal'),
  geheim: spul('geheim'),
};
export const cardSpec = (id) => CARD_SPEC[id] || null;

// Upgrades: groep 'auto' (Escapade en andere auto's), 'tweewieler' (fiets, scooter) of 'fjord' (de snackwagen).
export const UPGRADE_SPEC = {
  auto: { motor: spul('motor'), remmen: product('schijf'), grip: spul('bredeband'), turbo: product('turbo'), sperdiff: spul('sperdiff') },
  tweewieler: { banden: product('band'), versnelling: product('versnelling'), motor: product('accu'), uitlaat: spul('uitlaat'), schijven: product('schijf'), plakbanden: product('band') },
  fjord: { pan: product('frituur'), mosterd: spul('mosterd'), bel: spul('bel'), neon: spul('neonmeeuw'), voorraad: product('pakket'), avond: product('lamp') },
};
export const upgradeSpec = (groep, id) => (UPGRADE_SPEC[groep] && UPGRADE_SPEC[groep][id]) || null;

// Wat bewust zonder model blijft (het paneel toont dan het icoon): reden per groep, voor het doc en de dekkingsaudit.
export const TERUGVAL = {
  'boot-onderdelen': 'Upgrades van boot, kano en zeil staan nog niet in Spullen (alleen auto, fiets, scooter en de snackwagen).',
};

// Het eerlijke label van de viewer voor schermlezers.
export const modelLabel = (titel) => `3D-model van ${titel}`;

// Dekking van een lijst items ({ key, cat, viewer }): per categorie hoeveel er een model hebben.
export function dekking(items) {
  const per = {};
  for (const it of items) {
    const c = it.cat || '?';
    const r = per[c] || (per[c] = { totaal: 0, model: 0, zonder: [] });
    r.totaal++;
    if (it.viewer) r.model++; else r.zonder.push(it.key);
  }
  return per;
}
