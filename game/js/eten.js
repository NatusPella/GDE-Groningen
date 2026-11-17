// Eten (#502): de voorraad die je bij je hebt. Een eigen, bladmodule zonder imports uit het
// spel: de winkel (shops.js) en de savegame (savegame.js) gebruiken hem, en spullen.js zet hem
// in het menu. Stond dit in spullen.js, dan importeerde shops.js spullen.js terwijl spullen.js
// al uit shops.js leest — een cyclus, en import_cycles_test laat dat niet toe.
//
// De aantallen staan als voorraad op het world-object (id -> aantal), net als w.ammo: geen
// eigen saveformaat, wel een eigen veld in de save (etenSave/applyEtenSave). Een gevangen vis
// heet 'vis:<soort>' (hengelen.js, visdata.js).
import { soort as visSoort } from './visdata.js';

export const TOONBANK = [
  ['krentenbol', 'Krentenbol', 3, 'Avondwinkel'],
  ['koffie', 'Koude bak koffie', 6, 'Avondwinkel'],
  ['drop', 'Zak drop', 5, 'Avondwinkel'],
  ['energie', 'Energiedrankje "Grunn Bull"', 12, 'Avondwinkel'],
  ['ehbo', 'EHBO-doos', 45, 'Avondwinkel'],
  ['kroket', 'Kroket', 8, 'Snackbar'],
  ['frikandel', 'Frikandel speciaal', 9, 'Snackbar'],
  ['eierbal', 'Eierbal', 12, 'Snackbar'],
  ['oorlog', 'Patatje oorlog', 13, 'Snackbar'],
  ['kapsalon', 'Kapsalon', 30, 'Snackbar'],
  // Deze vier staan ook als eetbaar in de winkel (shops.js snack/food) en horen dus in de
  // voorraad: zonder regel hier betaalde een speler met een volle maag en kreeg hij niets,
  // want voegEtenToe() negeert een onbekend id stil.
  ['koek', 'Grunneger koek', 6, 'Avondwinkel'],
  ['kauwgom', 'Kauwgom "Frisse Adem"', 1, 'Avondwinkel'],
  ['ballen', 'Gehaktballetjes "Kötbullen"', 25, 'Restaurant'],
  ['hotdog', 'Hotdog bij de kassa', 6, 'Restaurant'],
];
const EETBAAR = new Map(TOONBANK.map(([id, label, hp, how]) => [id, { label, hp, how }]));
// Een gevangen vis is ook eten; hij vult meer dan een snack. De soort komt uit visdata.js.
const VIS_HP = 15;
const VIS_VOOR = 'vis:';

// Wat een id is: een snack van de toonbank of een vis uit het hengelen (vis:<soort>).
export function eetWaar(id) {
  const snack = EETBAAR.get(id);
  if (snack) return snack;
  const s = typeof id === 'string' && id.startsWith(VIS_VOOR) ? visSoort(id.slice(VIS_VOOR.length)) : null;
  return s ? { label: s.naam, hp: VIS_HP, how: 'Zelf gevangen' } : null;
}

// Het aantal van één id, nooit negatief en nooit meer dan een redelijk pak.
const aantalVan = (n) => Math.min(999, Math.max(0, Math.floor(Number(n) || 0)));

// De voorraad eten die je bij je hebt, op naam gesorteerd. Wat niet (meer) bestaat telt niet mee.
export function eetVoorraad(w) {
  const bron = w && w.eten && typeof w.eten === 'object' ? w.eten : {};
  const out = [];
  for (const [id, n] of Object.entries(bron)) {
    const waar = eetWaar(id);
    const aantal = aantalVan(n);
    if (waar && aantal > 0) out.push({ id, ...waar, aantal });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'nl'));
}

// De voorraad voor de save: alleen bekende ids met een aantal boven nul, zodat een oud of
// geknoeid bestand geen spooketen in Spullen zet.
export function etenSave(w) {
  const uit = {};
  for (const { id, aantal } of eetVoorraad(w)) uit[id] = aantal;
  return uit;
}

export function applyEtenSave(w, raw) {
  const uit = {};
  if (w && raw && typeof raw === 'object') {
    for (const [id, n] of Object.entries(raw)) {
      const aantal = aantalVan(n);
      if (aantal > 0 && eetWaar(id)) uit[id] = aantal;
    }
  }
  if (w) w.eten = uit;
  return uit;
}

// Erbij krijgen (hengelen.js doet dit met een vis, de winkel met een snack). Zonder world of
// met een onbekend id gebeurt er niets, zodat een aanroep nooit stukloopt.
export function voegEtenToe(w, id, n = 1) {
  if (!w || !eetWaar(id)) return 0;
  if (!w.eten || typeof w.eten !== 'object') w.eten = {};
  const bij = Math.floor(Number(n));
  const aantal = Math.max(0, Math.floor(Number(w.eten[id]) || 0) + (Number.isFinite(bij) ? bij : 0));
  if (aantal) w.eten[id] = aantal; else delete w.eten[id];
  return aantal;
}

// Opeten: dezelfde regel als de toonbank (shops.js foodItem). Op volle gezondheid blijft
// het eten liggen, net als daar ("om mee te nemen"). Geeft de melding voor het paneel.
export function eet(w, id) {
  const waar = eetWaar(id);
  const hebben = w && w.eten ? Math.floor(Number(w.eten[id]) || 0) : 0;
  if (!waar || hebben <= 0) return 'Dat heb je niet bij je.';
  if (w.health >= 100) return `${waar.label}: je zit vol, die bewaar je voor straks.`;
  w.health = Math.min(100, w.health + waar.hp);
  voegEtenToe(w, id, -1);
  return `${waar.label}: lekker! Gezondheid ${Math.round(w.health)}`;
}
