// Het hengeltuig van deze speler (#492): vier hengels, zes soorten aas, de lijnsterkte (0-1) en twee
// verbeteringen aan de lijn (0-2). Pure regels en prijzen, geen DOM, geen THREE, geen klok, geen opslag en geen
// random: hengeltuiglive.js bewaart het tuig in de eigen opslag (gde-hengeltuig-v1), hengelen.js gebruikt het bij
// het vissen en shops.js verkoopt het. De soorten zelf staan in visdata.js: aas verschuift alleen de kansen.
//
// Zonder tuig (de peurhengel, geen aas, lijn 0,5) verandert er niets aan het hengelen: elke factor is dan precies 1.
// Een sterke lijn houdt het dobbertje langer onder (een ruimer beetvenster), een betere hengel laat je korter
// wachten en aas lokt de vis waar het voor bedoeld is (drie keer zo zwaar in de trekking). Het aas hoort bij het
// vrije hengelen: de wedstrijd aan het Meerstad-meer houdt zijn eigen vaste vissen en gebruikt alleen hengel en lijn.
import { TABELLEN, soort, gewichtNu } from './visdata.js';

export const TUIG_VERSIE = 1;
export const HENGEL_STANDAARD = 'peur';
export const LIJN_STANDAARD = 0.5;   // de lijn van de peurhengel: het huidige gedrag
export const LIJN_PER_UPGRADE = 0.1; // elke verbetering erbij
export const UPGRADE_MAX = 2;        // twee verbeteringen aan de lijn
export const AAS_PER_PAK = 10;       // beten uit een pak aas
export const MAX_AAS = 999;
export const BEET_PER_LIJN = 0.6;    // +60% beetvenster van lijn 0 naar 1, dus +30% op de sterkste lijn
export const AAS_BOOST = 3;          // een aassoort die voor deze vis bedoeld is, weegt drie keer zo zwaar in de trekking

// prijs: wat de winkel vraagt; rang: de volgorde van simpel naar duur (je koopt nooit terug); wacht: factor op de
// wachttijd tot de beet; lijn: de lijnsterkte waar de hengel mee begint.
export const HENGELS = [
  { id: 'peur', naam: 'Peurhengel', rang: 0, prijs: 0, wacht: 1, lijn: 0.5, desc: 'Een kale stok met een dobber. Hij doet het, en dat is genoeg' },
  { id: 'werp', naam: 'Werphengel', rang: 1, prijs: 60, wacht: 0.9, lijn: 0.6, desc: 'Lichter en soepeler: je gooit verder en wacht korter' },
  { id: 'voer', naam: 'Voerhengel', rang: 2, prijs: 150, wacht: 0.8, lijn: 0.75, desc: 'Met een voerkorfje bij de haak: de vis komt vanzelf naar je toe' },
  { id: 'karper', naam: 'Karperhengel', rang: 3, prijs: 320, wacht: 0.7, lijn: 0.9, desc: 'Zwaar geschut voor de grote vissen: snel beet en een lijn als een kabel' },
];
const HENGEL_BY_ID = new Map(HENGELS.map((h) => [h.id, h]));
export const hengelById = (id) => HENGEL_BY_ID.get(id) || null;

// Het aas: prijs per pak van AAS_PER_PAK beten, en de soorten die er extra op afkomen (AAS_BOOST keer zo zwaar in
// de trekking). Een aassoort voor water waar die vis niet zit, verandert daar niets.
export const AAS = [
  { id: 'maden', naam: 'Maden', prijs: 2, desc: 'Klein grut voor klein grut: voorn, baars en alles wat er langs zwemt', soorten: ['voorn', 'baars', 'ruisvoorn', 'stekelbaars', 'bittervoorn', 'spiering', 'haring', 'giebel'] },
  { id: 'worm', naam: 'Wormen', prijs: 3, desc: 'Een dikke pier op de bodem: brasem, zeelt en paling', soorten: ['brasem', 'zeelt', 'paling', 'kroeskarper', 'modderkruiper', 'kolblei'] },
  { id: 'deeg', naam: 'Deegbal', prijs: 3, desc: 'Zoet deeg dat langzaam uit elkaar valt: karper en brasem', soorten: ['karper', 'brasem', 'kroeskarper', 'giebel', 'kolblei'] },
  { id: 'kunstaas', naam: 'Kunstaas', prijs: 6, desc: 'Een kunstaasje dat je binnenhaalt: roofvis slaat toe', soorten: ['snoek', 'snoekbaars', 'baars', 'zeebaars', 'kabeljauw', 'meerval'] },
  { id: 'zeepier', naam: 'Zeepier', prijs: 5, desc: 'Voor het zoute water: platvis en alles wat op de bodem van de Waddenzee zoekt', soorten: ['bot', 'schol', 'tong', 'wijting', 'harder', 'zeebaars'] },
  { id: 'vliegje', naam: 'Vliegje', prijs: 7, desc: 'Een nimf aan het oppervlak: de trekvissen en de winde', soorten: ['zeeforel', 'houting', 'winde', 'spiering', 'voorn'] },
];
const AAS_BY_ID = new Map(AAS.map((a) => [a.id, a]));
export const aasById = (id) => AAS_BY_ID.get(id) || null;

// De twee verbeteringen aan de lijn, in volgorde: niveau 1 en 2.
export const VERBETERINGEN = [
  { niveau: 1, prijs: 35, naam: 'Sterkere lijn', desc: 'De lijn houdt meer: het dobbertje blijft langer onder' },
  { niveau: 2, prijs: 90, naam: 'Gevlochten lijn', desc: 'Nog sterker en soepeler: het ruimste beetvenster' },
];

export const leegTuig = () => ({ v: TUIG_VERSIE, hengel: HENGEL_STANDAARD, aas: null, upgrades: 0 });

const geheel = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);

// Een tuig uit de opslag, hoe kapot of oud ook: altijd een geldig tuig. Onbekende hengel, aas of te veel
// verbeteringen gaan terug naar de standaard; een leeg pak aas is geen aas.
export function normaliseer(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  if (!d || typeof d !== 'object' || d.v !== TUIG_VERSIE) return leegTuig();
  const hengel = hengelById(d.hengel) ? d.hengel : HENGEL_STANDAARD;
  const upgrades = geheel(d.upgrades, UPGRADE_MAX);
  let aas = null;
  if (d.aas && typeof d.aas === 'object' && aasById(d.aas.id)) {
    const n = geheel(d.aas.n, MAX_AAS);
    if (n > 0) aas = { id: d.aas.id, n };
  }
  return { v: TUIG_VERSIE, hengel, aas, upgrades };
}

const klem01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : LIJN_STANDAARD));

// De lijnsterkte van een hengel met zoveel verbeteringen (0-1).
export function lijnVoor(hengelId, upgrades = 0) {
  const h = hengelById(hengelId) || hengelById(HENGEL_STANDAARD);
  return klem01(h.lijn + LIJN_PER_UPGRADE * geheel(upgrades, UPGRADE_MAX));
}

// De lijnsterkte van dit tuig (0-1). Zonder tuig precies LIJN_STANDAARD.
export const lijnsterkte = (tuig) => {
  const t = normaliseer(tuig);
  return lijnVoor(t.hengel, t.upgrades);
};

// Het beetvenster: een sterkere lijn dan de standaard houdt de dobber langer onder. Bij lijn 0,5 is de factor 1.
export const beetFactor = (lijn) => Math.max(0.1, 1 + (klem01(lijn) - LIJN_STANDAARD) * BEET_PER_LIJN);

// De wachttijd tot de beet: de hengel bepaalt hem. Zonder tuig precies 1.
export const wachtFactor = (tuig) => {
  const t = normaliseer(tuig);
  const h = hengelById(t.hengel);
  return h ? h.wacht : 1;
};

export const hengelNaam = (tuig) => (hengelById(normaliseer(tuig).hengel) || HENGELS[0]).naam;

// "Wormen (7)" of "geen aas": de HUD en het visboek laten dit zien.
export function aasNaam(tuig) {
  const t = normaliseer(tuig);
  if (!t.aas) return 'geen aas';
  const a = aasById(t.aas.id);
  return a ? `${a.naam} (${t.aas.n})` : 'geen aas';
}

// Kies een vis voor dit water, met aas dat de soorten waar het voor bedoeld is vaker laat bijten. Zonder aas is
// dit precies de keuze van visdata.js (kiesVis): dezelfde volgorde, dezelfde kansen.
export function kiesMetAas(type, rand, nu = {}, aasId = null) {
  const tabel = TABELLEN[type] || TABELLEN.plas;
  const aas = aasById(aasId);
  const boost = aas ? new Set(aas.soorten) : null;
  const lijst = Object.keys(tabel).map((id) => {
    const s = soort(id);
    const g = gewichtNu(tabel[id], s, nu) * (boost && boost.has(id) ? AAS_BOOST : 1);
    return { s, g };
  });
  let som = 0;
  for (const x of lijst) som += x.g;
  let r = rand() * som;
  for (const x of lijst) { r -= x.g; if (r < 0) return x.s; }
  return lijst[lijst.length - 1].s;
}

// --- kopen (de winkel in shops.js betaalt en bewaart) ----------------------------------

// Of je deze hengel al hebt (of een betere): je koopt nooit terug.
export function heeftHengel(tuig, id) {
  const h = hengelById(id);
  if (!h) return false;
  return h.rang <= (hengelById(normaliseer(tuig).hengel) || HENGELS[0]).rang;
}

// Waarom deze hengel niet gekocht kan worden: null als het kan.
export function hengelBlokkade(tuig, id, geld) {
  const h = hengelById(id);
  if (!h) return 'Onbekende hengel';
  if (heeftHengel(tuig, id)) return 'Heb je al (of een betere)';
  if (geld < h.prijs) return 'Te weinig geld';
  return null;
}

// Koop een hengel: { tuig, prijs, hengel } of { fout }. Geen bijwerking op het origineel.
export function koopHengel(tuig, id, geld) {
  const fout = hengelBlokkade(tuig, id, geld);
  if (fout) return { fout };
  const h = hengelById(id);
  return { tuig: { ...normaliseer(tuig), hengel: id }, prijs: h.prijs, hengel: h };
}

// De prijs van de volgende verbetering aan de lijn, of null als de lijn op zijn sterkst is.
export const upgradePrijs = (tuig) => {
  const t = normaliseer(tuig);
  return VERBETERINGEN[t.upgrades] ? VERBETERINGEN[t.upgrades].prijs : null;
};

export function upgradeBlokkade(tuig, geld) {
  const t = normaliseer(tuig);
  if (t.upgrades >= UPGRADE_MAX) return 'De lijn is al op zijn sterkst';
  if (geld < upgradePrijs(t)) return 'Te weinig geld';
  return null;
}

export function koopUpgrade(tuig, geld) {
  const fout = upgradeBlokkade(tuig, geld);
  if (fout) return { fout };
  const t = normaliseer(tuig);
  const v = VERBETERINGEN[t.upgrades];
  return { tuig: { ...t, upgrades: t.upgrades + 1 }, prijs: v.prijs, verbetering: v };
}

// Waarom dit aas niet gekocht kan worden: null als het kan.
export function aasBlokkade(tuig, id, geld) {
  const a = aasById(id);
  if (!a) return 'Onbekend aas';
  if (geld < a.prijs) return 'Te weinig geld';
  return null;
}

// Koop een pak aas van AAS_PER_PAK beten; een ander soort aas in je zak gaat weg.
export function koopAas(tuig, id, geld) {
  const fout = aasBlokkade(tuig, id, geld);
  if (fout) return { fout };
  const a = aasById(id);
  return { tuig: { ...normaliseer(tuig), aas: { id, n: AAS_PER_PAK } }, prijs: a.prijs, aas: a };
}

// Eén beet gaat van het pak af; het laatste beet laat de zak leeg achter.
export function gebruikAas(tuig) {
  const t = normaliseer(tuig);
  if (!t.aas) return t;
  return { ...t, aas: t.aas.n > 1 ? { id: t.aas.id, n: t.aas.n - 1 } : null };
}
