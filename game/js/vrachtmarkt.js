// Vrachtmarkt (#492): de vrachtbijbaan kiest geen random klant meer, maar een contract
// met een type, een tarief per kilometer en een laad- en lostijd. Dit zijn de pure
// regels daarvan: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random,
// zodat dezelfde seed altijd hetzelfde aanbod geeft en de markt in
// scripts/vrachtmarkt_test.mjs te testen is. sidejob_vracht.js zet het om in een rit.
//
// Het loon is afstandKm × tariefPerKm + toeslag (contractLoon); sidejobs.js past met
// loopbaanLoon en het bijbaanniveau nog zijn eigen factor op de basis toe. Zo blijft
// een rit in de band van de oude vaste basis (60 + afstand/18).
//
// Klanten, lading en bedrijven zijn verzonnen (constitution 2).

const TYPES = [
  {
    id: 'koel', naam: 'Koeloplegger', trailer: 'koel',
    tariefPerKm: 72, toeslag: 50, laadSeconden: 14, losSeconden: 10,
    vrachten: [
      { klant: 'Supermarkt Driekwart', vracht: 'diepvriesgroente' },
      { klant: 'Kaasboerderij Oldambt', vracht: 'kaas, veel kaas' },
      { klant: 'IJssalon Zomerzoet', vracht: 'ijs, mits de koeling blijft draaien' },
    ],
  },
  {
    id: 'zeil', naam: 'Zeilenoplegger', trailer: 'zeil',
    tariefPerKm: 70, toeslag: 48, laadSeconden: 12, losSeconden: 8,
    vrachten: [
      { klant: 'Bouwmarkt De Spijker', vracht: 'pallets cementzakken' },
      { klant: 'Meubelhal Het Hoge Noorden', vracht: 'tweehonderd Zweedse boekenkasten' },
    ],
  },
  {
    id: 'bak', naam: 'Kipper', trailer: 'bak',
    tariefPerKm: 66, toeslag: 52, laadSeconden: 10, losSeconden: 7,
    vrachten: [
      { klant: 'Zandhandel Hoogkerk', vracht: 'zand voor de zandbak van een rotonde' },
      { klant: 'Loonbedrijf Hooiland', vracht: 'een lading compost voor de volkstuintjes' },
    ],
  },
  {
    id: 'stukgoed', naam: 'Stukgoed op een zeilenoplegger', trailer: 'zeil',
    tariefPerKm: 74, toeslag: 48, laadSeconden: 16, losSeconden: 12,
    vrachten: [
      { klant: 'Bouwmarkt De Spijker', vracht: 'losse pallets en een doos met beugels' },
      { klant: 'Meubelhal Het Hoge Noorden', vracht: 'twee losse boekenkasten zonder doos' },
      { klant: 'Groothandel Damsterdiep', vracht: 'kratten en een verdwaalde fiets' },
    ],
  },
];

export const CONTRACTTYPES = TYPES;
export const CONTRACT_IDS = TYPES.map((t) => t.id);
export const AANBOD_AANTAL = 3;

// De vrachtbijbaan rijdt 0,45 tot 1,3 km; alles daarbuiten is onzin (testinvoer of een
// kapotte bron) en wordt begrensd, zodat het loon nooit negatief of oneindig wordt.
const KM_MIN = 0, KM_MAX = 200;
const NIVEAU_MIN = 1, NIVEAU_MAX = 5;
const ERVAREN_TOESLAG = 0.06;   // per niveau boven 1: een ervaren chauffeur krijgt de betere contracten
export const TIJD_MAX = 180;    // s: een laad- of losfase duurt nooit langer dan dit

const getal = (v) => (Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function contractType(id) {
  return TYPES.find((t) => t.id === id) || null;
}

const afstandKm = (v) => clamp(getal(v), KM_MIN, KM_MAX);
const niveauVan = (v) => clamp(Math.round(getal(v)), NIVEAU_MIN, NIVEAU_MAX);

// 32-bits integer-hash (murmur-afsluiter): dezelfde seed geeft altijd hetzelfde aanbod.
function hash32(n) {
  let h = Math.floor(getal(n)) | 0;
  h = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// Drie aanbiedingen voor dezelfde rit (dezelfde afstand), met verschillende types.
// De stap is 1 of 3 en dus oneven: drie opeenvolgende stappen raken in vier types
// altijd drie verschillende, zonder Math.random en zonder een lijst te hermengen.
export function maakAanbod(seed, afstand, niveau) {
  const km = Math.round(afstandKm(afstand) * 1000) / 1000;
  const lvl = niveauVan(niveau);
  const s = hash32(seed);
  const start = (s + lvl - 1) % TYPES.length;
  const stap = (s >>> 7) & 1 ? 1 : 3;
  const uit = [];
  for (let i = 0; i < AANBOD_AANTAL; i++) {
    const t = TYPES[(start + i * stap) % TYPES.length];
    const k = t.vrachten[(s >>> (i * 5 + 3)) % t.vrachten.length];
    uit.push({
      type: t.id, naam: t.naam, trailer: t.trailer,
      klant: k.klant, vracht: k.vracht,
      afstandKm: km, tariefPerKm: t.tariefPerKm,
      laadSeconden: t.laadSeconden, losSeconden: t.losSeconden,
      toeslag: Math.round(t.toeslag * (1 + ERVAREN_TOESLAG * (lvl - 1))),
    });
  }
  return uit;
}

// Het loon van een contract: afstand × tarief plus toeslag, afgerond en nooit negatief.
// Rare invoer (null, tekst, negatief, oneindig) levert 0 of een begrensd bedrag op.
export function contractLoon(contract) {
  if (!contract || typeof contract !== 'object') return 0;
  const km = afstandKm(contract.afstandKm);
  const tarief = Math.max(0, getal(contract.tariefPerKm));
  const toeslag = Math.max(0, getal(contract.toeslag));
  return Math.max(0, Math.round(km * tarief + toeslag));
}

const tijd = (v) => clamp(Math.round(getal(v)), 0, TIJD_MAX);
export const laadTijd = (contract) => tijd(contract && contract.laadSeconden);
export const losTijd = (contract) => tijd(contract && contract.losSeconden);

// Samen spelen (#492): de bijrijder helpt bij het laden en het lossen. Elke keer E gaat
// er een vaste stap van de resterende tijd af, nooit onder nul; 0 blijft 0 (dan is de
// fase al klaar en rondt de baan hem zelf af). Het tempo begrenst coopbijbaan.js
// (ACTIE_WACHT_S); de lading, de time-out en het loon blijven buiten dit sommetje.
export const HELP_STAP_S = 1.5;
export function helpLaadTijd(left, stap = HELP_STAP_S) {
  return Math.max(0, Math.max(0, getal(left)) - Math.max(0, getal(stap)));
}
