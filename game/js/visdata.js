// De vis van de provincie (#412): de watertypen, de soorten en welke soort in welk water zit. Pure gegevens en regels, geen
// DOM, geen THREE, geen opslag: visboek.js houdt bij wat de speler ving, hengelplek.js herkent het water onder je voeten,
// hengelen.js is de lijm met het spel (scripts/vis_test.mjs). Alleen echte Nederlandse vissoorten, geen merken; de
// zeldzaamheid is een keuze voor het spel, geen telling. Het is altijd zomer: er is geen seizoen, wel een deel van de dag
// (paling en snoekbaars bijten 's nachts en in de schemer beter) en het weer (regen jaagt vis aan het oppervlak).

// De zeven watertypen die de wereld kent. `uit` is de naam in de zin "je hengelt in/op ...".
export const WATERTYPEN = [
  { id: 'gracht', naam: 'Stadsgracht', uit: 'de stadsgracht', wat: 'Grachten, havens en diepen in de stad.' },
  { id: 'plas', naam: 'Plas en vijver', uit: 'de plas', wat: 'Stadsplassen, vijvers en kleine meren.' },
  { id: 'meer', naam: 'Meer', uit: 'het meer', wat: 'Open water: het Zuidlaardermeer, het Paterswoldsemeer, de Lauwersmeer.' },
  { id: 'kanaal', naam: 'Kanaal en vaart', uit: 'het kanaal', wat: 'Het Eemskanaal, de Boterdiep en alle vaarten van het Noorden.' },
  { id: 'rivier', naam: 'Rivier en diep', uit: 'de rivier', wat: 'Het Reitdiep, de Hunze en de aa\'s die naar zee lopen.' },
  { id: 'sloot', naam: 'Sloot', uit: 'de sloot', wat: 'Polderslootjes en wetering: klein water vol klein spul.' },
  { id: 'wad', naam: 'Waddenzee en Dollard', uit: 'de Waddenzee', wat: 'Zout en brak water langs de kust, de Eems en de Dollard.' },
];
export const WATERTYPE_IDS = WATERTYPEN.map((t) => t.id);
const TYPE_BY_ID = new Map(WATERTYPEN.map((t) => [t.id, t]));
export const watertype = (id) => TYPE_BY_ID.get(id) || null;

// Zeldzaamheid van een soort in het spel (niet van het echte dier): hoe moeilijk te vangen en hoeveel hij waard is.
export const ZELDZAAM = [
  { id: 1, naam: 'Gewoon', waarde: 1, xp: 1 },
  { id: 2, naam: 'Bijzonder', waarde: 1.6, xp: 2 },
  { id: 3, naam: 'Zeldzaam', waarde: 3, xp: 6 },
  { id: 4, naam: 'Legendarisch', waarde: 8, xp: 15 },
];
export const zeldzaamheid = (soort) => ZELDZAAM[(soort && soort.zeldzaam ? soort.zeldzaam : 1) - 1];

// kg: gewicht van de vangst; venster: hoe lang het dobbertje zakt (s), kleiner is lastiger; tijd: wanneer hij vooral bijt
// ('nacht' of 'schemer'; zonder tijd bijt hij de hele dag); regen: bijt vaker als het regent. Het gewicht is een gemiddelde.
export const SOORTEN = [
  { id: 'voorn', naam: 'Blankvoorn', kg: 0.3, venster: 1.1, zeldzaam: 1, wat: 'Zilveren visje met rode vinnen, in elke gracht.' },
  { id: 'baars', naam: 'Baars', kg: 0.6, venster: 0.9, zeldzaam: 1, wat: 'Gestreept en stekelig, jaagt in groepjes.' },
  { id: 'brasem', naam: 'Brasem', kg: 1.2, venster: 0.8, zeldzaam: 1, wat: 'Hoge, platte vis die langs de bodem zoekt.', regen: true },
  { id: 'snoek', naam: 'Snoek', kg: 2.4, venster: 0.65, zeldzaam: 2, wat: 'De roofvis van het riet, met een bek vol tanden.' },
  { id: 'karper', naam: 'Karper', kg: 4.0, venster: 0.55, zeldzaam: 2, wat: 'Zwaar en slim; neemt zijn tijd.' },
  { id: 'zeelt', naam: 'Zeelt', kg: 1.0, venster: 0.75, zeldzaam: 2, wat: 'Groenig en slijmerig, houdt van stil water met planten.' },
  { id: 'ruisvoorn', naam: 'Ruisvoorn', kg: 0.4, venster: 1.0, zeldzaam: 1, wat: 'Goudkleurig, zwemt vlak onder het oppervlak.' },
  { id: 'kolblei', naam: 'Kolblei', kg: 0.5, venster: 0.95, zeldzaam: 1, wat: 'Zilver en plat, in scholen in open water.' },
  { id: 'snoekbaars', naam: 'Snoekbaars', kg: 2.0, venster: 0.6, zeldzaam: 3, tijd: 'schemer', wat: 'Glasachtig oog, jaagt in de schemer.' },
  { id: 'paling', naam: 'Paling', kg: 0.8, venster: 0.7, zeldzaam: 2, tijd: 'nacht', wat: 'Een slangachtige zwemmer die \'s nachts rondgaat.' },
  { id: 'winde', naam: 'Winde', kg: 1.4, venster: 0.7, zeldzaam: 2, wat: 'Oranje vinnen, houdt van stromend water.' },
  { id: 'giebel', naam: 'Giebel', kg: 0.4, venster: 1.0, zeldzaam: 1, wat: 'Taaie visser in elke modderige sloot.' },
  { id: 'kroeskarper', naam: 'Kroeskarper', kg: 0.5, venster: 0.9, zeldzaam: 1, wat: 'Bruin en rond, overleeft bijna alles.' },
  { id: 'stekelbaars', naam: 'Driedoornige stekelbaars', kg: 0.02, venster: 1.3, zeldzaam: 1, wat: 'Een klein visje met drie stekels op de rug.' },
  { id: 'bittervoorn', naam: 'Bittervoorn', kg: 0.01, venster: 1.2, zeldzaam: 3, wat: 'Piepklein en kleurig; legt eitjes in een mossel.' },
  { id: 'modderkruiper', naam: 'Grote modderkruiper', kg: 0.05, venster: 1.0, zeldzaam: 3, tijd: 'nacht', wat: 'Een lange modderkruiper die voor het weer waarschuwt.' },
  { id: 'bot', naam: 'Bot', kg: 0.5, venster: 0.85, zeldzaam: 1, wat: 'Platvis die plat in de modder ligt en soms de rivier op zwemt.' },
  { id: 'schol', naam: 'Schol', kg: 0.8, venster: 0.8, zeldzaam: 1, wat: 'Platvis met oranje stippen.' },
  { id: 'tong', naam: 'Tong', kg: 0.6, venster: 0.7, zeldzaam: 2, tijd: 'schemer', wat: 'Lange platvis, graaft zich in het zand.' },
  { id: 'wijting', naam: 'Wijting', kg: 0.5, venster: 0.8, zeldzaam: 1, wat: 'Zilvergrijze kabeljauwachtige uit de kustzee.' },
  { id: 'zeebaars', naam: 'Zeebaars', kg: 2.2, venster: 0.6, zeldzaam: 2, wat: 'Sterke zilveren jager bij de pieren en geulen.' },
  { id: 'harder', naam: 'Harder', kg: 0.9, venster: 0.8, zeldzaam: 2, wat: 'Zoekt in scholen naar algen langs de kust.' },
  { id: 'spiering', naam: 'Spiering', kg: 0.04, venster: 1.2, zeldzaam: 1, wat: 'Slank zilvervisje, ruikt naar komkommer.' },
  { id: 'haring', naam: 'Haring', kg: 0.2, venster: 0.9, zeldzaam: 1, wat: 'Schoolvis die in grote groepen de Waddenzee in zwemt.' },
  { id: 'kabeljauw', naam: 'Kabeljauw', kg: 3.5, venster: 0.55, zeldzaam: 3, wat: 'Zware zeevis met een baarddraad onder de kin.' },
  { id: 'houting', naam: 'Houting', kg: 1.5, venster: 0.65, zeldzaam: 4, wat: 'Een beschermde, haast verdwenen zalmachtige: terug in het water.' },
  { id: 'zeeforel', naam: 'Zeeforel', kg: 2.8, venster: 0.6, zeldzaam: 4, regen: true, wat: 'Zilveren trekvis die van zee de rivier optrekt.' },
  { id: 'meerval', naam: 'Meerval', kg: 12, venster: 0.45, zeldzaam: 4, tijd: 'nacht', wat: 'De reus van het Noorden, met lange snorharen.' },
  { id: 'rivierprik', naam: 'Rivierprik', kg: 0.1, venster: 0.9, zeldzaam: 3, tijd: 'nacht', wat: 'Een kaakloos, slangachtig dier dat de rivier optrekt.' },
];
const SOORT_BY_ID = new Map(SOORTEN.map((s) => [s.id, s]));
export const soort = (id) => SOORT_BY_ID.get(id) || null;
export const SOORT_IDS = SOORTEN.map((s) => s.id);

// Per watertype: soort -> gewicht (aandeel van de beten; hoe groter, hoe vaker). Alles wat niet in de lijst staat, zwemt er niet.
export const TABELLEN = {
  gracht: { voorn: 30, baars: 22, brasem: 16, snoek: 8, karper: 5, zeelt: 4, ruisvoorn: 6, giebel: 8, paling: 8, snoekbaars: 3, stekelbaars: 4, meerval: 0.5 },
  plas: { voorn: 24, baars: 26, brasem: 14, snoek: 10, karper: 6, zeelt: 8, ruisvoorn: 12, giebel: 12, paling: 5, kolblei: 4, meerval: 0.6 },
  meer: { voorn: 22, baars: 22, brasem: 20, snoek: 10, karper: 6, zeelt: 5, ruisvoorn: 6, kolblei: 12, snoekbaars: 10, paling: 8, meerval: 1 },
  kanaal: { voorn: 28, baars: 20, brasem: 22, snoek: 8, kolblei: 10, snoekbaars: 12, paling: 10, winde: 6, meerval: 0.5, rivierprik: 2 },
  rivier: { voorn: 26, baars: 14, brasem: 14, snoek: 8, kolblei: 8, snoekbaars: 10, paling: 12, winde: 10, bot: 10, harder: 4, spiering: 10, houting: 3, zeeforel: 2.5, rivierprik: 3 },
  sloot: { giebel: 22, kroeskarper: 14, stekelbaars: 24, ruisvoorn: 14, zeelt: 10, voorn: 8, paling: 8, snoek: 3, bittervoorn: 8, modderkruiper: 6 },
  wad: { bot: 24, schol: 20, tong: 8, wijting: 14, zeebaars: 8, harder: 12, spiering: 14, haring: 10, kabeljauw: 3, paling: 6, houting: 2, zeeforel: 2 },
};

// De soorten van een watertype, met hun gewicht (voor het visboek en de tests).
export const soortenVan = (type) => Object.keys(TABELLEN[type] || {}).map((id) => ({ id, gewicht: TABELLEN[type][id] }));
// In welke watertypen een soort te vangen is.
export const typenVan = (id) => WATERTYPE_IDS.filter((t) => TABELLEN[t] && TABELLEN[t][id] > 0);

// Het deel van de dag: 'dag', 'schemer' (6-8 en 18-21 uur) of 'nacht' (21-6 uur).
export function deelVanDag(uur) {
  const u = ((Number(uur) % 24) + 24) % 24;
  if (u >= 21 || u < 6) return 'nacht';
  if ((u >= 6 && u < 8) || (u >= 18 && u < 21)) return 'schemer';
  return 'dag';
}

// Het gewicht van een soort op dit moment: 's nachts en in de schemer bijten de nachtvissen beter, overdag bijna niet; regen
// jaagt de regenvissen aan.
export function gewichtNu(typeGewicht, s, { uur = 12, regen = false } = {}) {
  let g = typeGewicht;
  if (s.tijd) {
    const deel = deelVanDag(uur);
    const goed = s.tijd === 'nacht' ? deel === 'nacht' : deel === 'schemer' || deel === 'nacht';
    g *= goed ? 2 : 0.35;
  }
  if (s.regen && regen) g *= 1.8;
  return g;
}

// Kies een soort voor dit water op dit moment. rand() geeft [0, 1).
export function kiesVis(type, rand, nu = {}) {
  const tabel = TABELLEN[type] || TABELLEN.plas;
  const lijst = Object.keys(tabel).map((id) => ({ s: SOORT_BY_ID.get(id), g: gewichtNu(tabel[id], SOORT_BY_ID.get(id), nu) }));
  let som = 0;
  for (const x of lijst) som += x.g;
  let r = rand() * som;
  for (const x of lijst) { r -= x.g; if (r < 0) return x.s; }
  return lijst[lijst.length - 1].s;
}

// Hoe zwaar deze vangst is: het gemiddelde van de soort met een spreiding van een kwart (een grote of een kleine).
export function vangstGewicht(s, rand) {
  const kg = s.kg * (0.75 + rand() * 0.5);
  return Math.max(0.01, Math.round(kg * 100) / 100);
}

// Wat een vangst waard is voor de visboer (in euro, met kommagetal; hengelen.js betaalt hele euro's uit een kas): een vast
// deel plus het gewicht, keer de zeldzaamheid, keer het groeiende loon van het visboek (meer soorten en meer plekken).
export const VANGST_BASIS = 0.2;
export const VANGST_PER_KG = 0.2;
export const GROEI_PER_SOORT = 0.03;
export const GROEI_PER_PLEK = 0.02;
export const GROEI_MAX = 1.8;
export function vangstWaarde(s, kg, soorten = 0, plekken = 0) {
  const groei = Math.min(GROEI_MAX, 1 + soorten * GROEI_PER_SOORT + plekken * GROEI_PER_PLEK);
  return (VANGST_BASIS + kg * VANGST_PER_KG) * zeldzaamheid(s).waarde * groei;
}
// Punten voor het vak Hengelen: een vaste en een deel per zeldzaamheid; een nieuwe soort geeft extra.
export const NIEUWE_SOORT_XP = 6;
export const vangstXp = (s) => zeldzaamheid(s).xp;
