// De winkelkit (issue #156): per winkeltype een eigen inrichting en uiterlijk,
// als data. Geen scene en geen kaart: gewone parameters in (type, seed), gewone
// waarden uit. Wie het gebruikt:
//   - interiorglass.js zet de tabel als uniforms (shaderTable): wand, vloer,
//     producten, toonbank en eiland van het nagebootste winkelinterieur;
//   - models3d_buildings.js pakt gevelreclame en markies uit hetzelfde type
//     (facadeLook), zodat het interieur en de gevel bij elkaar passen;
//   - winkelNaam geeft verzonnen winkelnamen (geen echte merken).
// De ruit kent alleen een rang (32 niveaus per gebouw); het type volgt daaruit
// met typeOfLevel, in JS en in de shader dezelfde formule.

export const SHOP_KINDS = ['supermarkt', 'bakker', 'slager', 'snackbar', 'kleding', 'fietsen', 'bloemist', 'kapper', 'elektronica', 'tweedehands', 'souvenir', 'kiosk', 'kermiskraam'];

const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

// wall / floor: kleur; floorPattern 0 effen, 1 dambord, 2 grote tegels; row: hoogte
// van de schaprij (0 laag en dicht, 1 hoog en ruim); items: breedte van een
// product (0 dichtbezaaid, 1 grote stukken); accent + mix: tint van de producten;
// island [breed, hoog] en counter [hoog]: het meubilair (island 0 = geen eiland).
// furniture: wat er staat (voor lezers en de test).
export const WINKEL = {
  supermarkt: {
    label: 'Supermarkt', wall: 0xf0efe8, floor: 0xd9d6cc, floorPattern: 1, row: 0.55, items: 0.2, accent: 0xd8423a, mix: 0.25,
    island: [1.6, 1.0], counter: [0.9], sign: 0x2e7d3a, awning: null,
    furniture: ['schappen', 'koelvitrine', 'kassa', 'winkelwagentjes', 'actiebak'],
    etalage: 'aanbiedingsposters in de ruit', names: [['Nait', 'Goud', 'Dagverse', 'Kleine'], ['Duur', 'Markt', 'Winkel', 'Mart']],
  },
  bakker: {
    label: 'Bakker', wall: 0xf4e6c8, floor: 0xcdb38c, floorPattern: 2, row: 0.2, items: 0.6, accent: 0xc98a3c, mix: 0.7,
    island: [1.2, 0.8], counter: [1.05], sign: 0x8a5a2a, awning: 0xc9a24a,
    furniture: ['broodrek', 'glazen toonbank', 'taartenvitrine', 'weegschaal'],
    etalage: 'broden en taarten op houten planken', names: [['Bakkerij', 'Brood', 'Oven', 'Krent'], ['Van der Korst', 'Warm & Zoet', 'de Gouden Korst', 'Bolle Bas']],
  },
  slager: {
    label: 'Slager', wall: 0xf3f0ea, floor: 0xb7b3aa, floorPattern: 2, row: 0.15, items: 0.5, accent: 0xb8403a, mix: 0.8,
    island: [1.0, 0.75], counter: [1.1], sign: 0x7a1f22, awning: 0x9a2a2a,
    furniture: ['koelvitrine', 'hakblok', 'haken aan een rail', 'weegschaal'],
    etalage: 'worsten en gehakt in de koeling', names: [['Slagerij', 'Vleeshuis', 'Worst'], ['de Groninger', 'Vet & Mals', 'Metworst Maarten']],
  },
  snackbar: {
    label: 'Snackbar', wall: 0xf1d9a8, floor: 0x8c8a84, floorPattern: 1, row: 0.1, items: 0.3, accent: 0xe0a23a, mix: 0.6,
    island: [0.0, 0.0], counter: [1.05], sign: 0xd0652a, awning: 0xd0652a,
    furniture: ['frituurkast', 'menubord', 'staantafel', 'saustoren'],
    etalage: 'verlicht menubord en een glanzende frituurkast', names: [['Frituur', 'Snackhoek', 'Vetpot', 'Patat'], ['Het Hoekje', 'Smul & Smakelijk', 'de Gouden Friet', 'Knapperd']],
  },
  kleding: {
    label: 'Kledingwinkel', wall: 0xe9e4f2, floor: 0xc8c0b4, floorPattern: 0, row: 0.9, items: 0.1, accent: 0x7a4fb0, mix: 0.85,
    island: [1.5, 1.1], counter: [0.95], sign: 0x232323, awning: null,
    furniture: ['kledingrekken', 'paskamer met gordijn', 'pashokspiegel', 'etalagepoppen'],
    etalage: 'etalagepoppen in de nieuwste mode', names: [['Stoer', 'Lap', 'Garderobe', 'Zomer'], ['& Stijl', 'Mode', 'Kleedkamer', 'op Maat']],
  },
  fietsen: {
    label: 'Fietsenwinkel', wall: 0xdde6ee, floor: 0x77797c, floorPattern: 0, row: 0.5, items: 0.8, accent: 0x2f6fb8, mix: 0.7,
    island: [2.0, 1.0], counter: [1.0], sign: 0x2f6fb8, awning: null,
    furniture: ['fietsen aan de muur', 'bandenrek', 'gereedschapswand', 'werkbank'],
    etalage: 'een rij glanzende fietsen en een bakfiets', names: [['Trap', 'Spaak', 'Ketting', 'Bel'], ['& Toeter', 'Rijwielen', 'Tweewieler', 'op Pad']],
  },
  bloemist: {
    label: 'Bloemist', wall: 0xe4f0dc, floor: 0x9ba890, floorPattern: 2, row: 0.35, items: 0.15, accent: 0xd8508a, mix: 0.95,
    island: [1.4, 0.7], counter: [0.95], sign: 0x2f6a3a, awning: 0xd8508a,
    furniture: ['emmers met bloemen', 'trap met planten', 'werktafel', 'koelcel'],
    etalage: 'emmers vol bloemen tot op de stoep', names: [['Bloem', 'Groene', 'Tulp', 'Zonnebloem'], ['& Blad', 'Vingers', 'Boeket', 'Hoek']],
  },
  kapper: {
    label: 'Kapper', wall: 0xdcecec, floor: 0x2f2f33, floorPattern: 1, row: 0.7, items: 0.9, accent: 0x23948a, mix: 0.4,
    island: [0.0, 0.0], counter: [1.0], sign: 0x23948a, awning: null,
    furniture: ['kappersstoelen', 'spiegelwand', 'wasbak', 'wachthoek'],
    etalage: 'een kappersstoel en een spiegelwand', names: [['Knip', 'Kuif', 'Schaar', 'Krul'], ['& Klaar', 'Salon', 'Studio', 'Kapsones']],
  },
  elektronica: {
    label: 'Elektronica', wall: 0xe0e3ea, floor: 0x45484f, floorPattern: 0, row: 0.45, items: 0.5, accent: 0x3a6ad8, mix: 0.9,
    island: [1.7, 0.9], counter: [1.0], sign: 0x1f4fa8, awning: null,
    furniture: ['tv-wand', 'vitrine met telefoons', 'kabelrek', 'servicebalie'],
    etalage: 'een wand vol tv-schermen', names: [['Stekker', 'Volt', 'Pixel', 'Draad'], ['Techniek', 'Zone', 'Hoek', 'Winkel']],
  },
  tweedehands: {
    label: 'Tweedehands', wall: 0xe8dcc4, floor: 0x7a5a3c, floorPattern: 0, row: 0.6, items: 0.35, accent: 0x9a7a3c, mix: 0.35,
    island: [1.8, 0.95], counter: [1.0], sign: 0x6a4a2a, awning: 0x6a8a5a,
    furniture: ['rommelige schappen', 'kasten', 'boekenrek', 'kledingstang'],
    etalage: 'een zooitje lampen, klokken en porselein', names: [['Rommel', 'Brocante', 'Kringloop', 'Oud'], ['& Nieuw', 'Gouwe Ouwe', 'Markt', 'Schat']],
  },
  souvenir: {
    label: 'Souvenirwinkel', wall: 0xf6ecc9, floor: 0xb8a37a, floorPattern: 1, row: 0.5, items: 0.08, accent: 0xc2423a, mix: 0.5,
    island: [1.3, 0.9], counter: [0.95], sign: 0xc2423a, awning: 0x2f5aa8,
    furniture: ['draaistandaard met kaarten', 'schappen met mokken', 'tassenrek', 'kassa'],
    etalage: 'mokken, klompen en molentjes', names: [['Grunn', 'Toren', 'Molen', 'Klomp'], ['Cadeautjes', 'Herinnering', 'Hoekje', 'Winkeltje']],
  },
  kiosk: {
    label: 'Kiosk', wall: 0xe6e6e0, floor: 0x8a8d8c, floorPattern: 0, row: 0.3, items: 0.05, accent: 0xc23f78, mix: 0.55,
    island: [0.0, 0.0], counter: [1.0], sign: 0xc23f78, awning: 0xc23f78,
    furniture: ['tijdschriftenrek', 'loterijbord', 'snoeprek', 'kassa'],
    etalage: 'kranten, kraskaarten en snoep achter het raam', names: [['Krant', 'Lot', 'Haltekiosk', 'Hoek'], ['& Snoep', 'Nieuws', 'Haltestop', 'Kiosk']],
  },
  kermiskraam: {
    label: 'Kermiskraam', wall: 0xf2dca0, floor: 0x7e5a3a, floorPattern: 0, row: 0.25, items: 0.4, accent: 0xe0b23a, mix: 0.75,
    island: [0.0, 0.0], counter: [1.1], sign: 0xd04a3a, awning: 0xd04a3a,
    furniture: ['gestreept zeildoek', 'toonbank met gloeilampjes', 'suikerspin', 'oliebollenpan'],
    etalage: 'gloeilampjes en een gestreept zeildoek', names: [['Kermis', 'Oliebol', 'Suikerspin', 'Gouden'], ['Kraam', 'Feestje', 'Plezier', 'Lekkernij']],
  },
};

export const SHOP_LEVELS = 32; // niveaus van de ruitrang (interiorglass.js)

// Hetzelfde type in de gevel (rang -> niveau) en in de shader (K / 8 -> niveau).
export function typeOfLevel(level) {
  const n = SHOP_KINDS.length;
  return SHOP_KINDS[((Math.floor(level) % n) + n) % n];
}
export const typeOfRank = (rank) => typeOfLevel(Math.floor(Math.min(0.999, Math.max(0, rank)) * SHOP_LEVELS));

function h01(seed, k) {
  const v = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Verzonnen winkelnamen: voorvoegsel + achtervoegsel per type.
export function winkelNaam(type, seed = 0) {
  const t = WINKEL[type];
  if (!t) return '';
  const [a, b] = t.names;
  return `${a[Math.floor(h01(seed, 6) * a.length)]} ${b[Math.floor(h01(seed, 7) * b.length)]}`;
}

// Variatie binnen een type: dezelfde seed geeft altijd dezelfde winkel.
export function winkelLook(type, seed = 0) {
  const t = WINKEL[type];
  if (!t) return null;
  const shift = [1, 0.82, 1.12][Math.floor(h01(seed, 2) * 3)];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return {
    type,
    wall: hex(t.wall),
    floor: hex(t.floor),
    floorPattern: t.floorPattern,
    accent: hex(t.accent).map((c) => Math.min(1, c * shift)),
    drukte: h01(seed, 1), // 0 leeg ... 1 propvol
    items: clamp01(t.items + (h01(seed, 3) - 0.5) * 0.2),
    row: clamp01(t.row + (h01(seed, 4) - 0.5) * 0.2),
    island: t.island.map((v) => (v ? v * (0.85 + h01(seed, 5) * 0.3) : 0)),
    sign: t.sign,
    awning: t.awning,
    name: winkelNaam(type, seed),
  };
}

// Gevelkleuren voor models3d_buildings.js (sign, awning) bij een ruitrang.
export function facadeLook(rank) {
  const type = typeOfRank(rank);
  const t = WINKEL[type];
  return { type, sign: t.sign, awning: t.awning };
}

// Voor de shader: vier vec4-reeksen in volgorde van SHOP_KINDS.
export function shaderTable() {
  const wall = [], floor = [], accent = [], layout = [];
  for (const k of SHOP_KINDS) {
    const t = WINKEL[k];
    wall.push([...hex(t.wall), t.row]);
    floor.push([...hex(t.floor), t.floorPattern]);
    accent.push([...hex(t.accent), t.mix]);
    layout.push([t.island[0], t.island[1], t.counter[0], t.items]);
  }
  return { wall, floor, accent, layout };
}
