// Sponsors van de voetbalcarrière als parodiebedrijven die ook als panden in de wereld staan (#1118, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 7): puur (scripts/voetbal_sponsors_test.mjs).
// Een sponsor is een parodie op een soort bedrijf met een verzonnen naam (nooit een echt merk; geen gaswinning als onderwerp, constitution 6). Twee tot drie sleuven per seizoen, elk een eenmalige som (150 tot 800)
// bij een doel (een doelpunt, drie wedstrijden zonder verlies, promotie); de regelaar stelt voor, de speler kiest zelf. Een sponsor is nooit te verkopen of te ruilen: de sleuf is leeg tot het volgende seizoen.
// Het pand: bij een sponsorovereenkomst kiest het spel een pand van het goede type bij de plaats van de club uit de Bezit-pandindex (interface `pandIndex.find(type, plaatsXY)` met een OSM-id; tot de Bezit-epic er is een stub)
// en geeft het de verzonnen naam op de gevel. Wie het pand koopt krijgt op thuiswedstrijddagen hooguit +10% klantenstroom op de omzet van dat pand, nooit een tweede uitbetaling van de sponsor zelf.
import { makeRng } from './minigamekit.js';
import { hashSeed } from './voetbalplayers.js';

export const MAX_SPONSOR_DEALS = 3;
export const OWNER_BONUS_MAX = 0.1;
// De soorten (pandtype uit facilities, winkelsoort) met een naamgenerator: een voorvoegsel en een achtervoegsel die samen geen bestaand merk zijn.
export const SORTS = {
  zuivel: { naam: 'Zuivelhoeve', pand: 'dairy', voor: ['Boerenbeste', 'Roomzachte', 'Weidevreugd', 'Dotterbloem'], na: ['Zuivel', 'Hoeve', 'Melkerij'] },
  bakker: { naam: 'Bakker', pand: 'bakery', voor: ['Knappe', 'Warme', 'Gouden', 'Korstige'], na: ['Bakkerij', 'Oven', 'Broodhuis'] },
  bouwmarkt: { naam: 'Bouwmarkt', pand: 'doityourself', voor: ['Klus', 'Hamer', 'Schroef', 'Plank'], na: ['Bouwmarkt', 'Centrum', 'Depot'] },
  auto: { naam: 'Autodealer', pand: 'car', voor: ['Wielen', 'Pedaal', 'Remspoor', 'Stuur'], na: ['Auto', 'Garage', 'Occasions'] },
  snackbar: { naam: 'Snackbar', pand: 'fast_food', voor: ['Frituur', 'Krokante', 'Hete', 'Gouden'], na: ['Snackhoek', 'Kiosk', 'Frituur'] },
  bank: { naam: 'Bank', pand: 'bank', voor: ['Spaarvarken', 'Zilvervloot', 'Kluis', 'Rentenier'], na: ['Bank', 'Spaarkas', 'Fonds'] },
  supermarkt: { naam: 'Supermarkt', pand: 'supermarket', voor: ['Volle', 'Karretje', 'Schap', 'Mandje'], na: ['Markt', 'Super', 'Winkel'] },
  fiets: { naam: 'Fietsenmaker', pand: 'bicycle', voor: ['Trap', 'Ketting', 'Wiel', 'Bel'], na: ['Fietsen', 'Rijwiel', 'Tweewielers'] },
  energie: { naam: 'Energiebedrijf', pand: 'energy', voor: ['Zon', 'Wind', 'Stroom', 'Dijkenergie'], na: ['Energie', 'Groen', 'Net'] },
};
export const SORT_IDS = Object.keys(SORTS);
export const GOALS = {
  doelpunt: { tekst: 'Scoor een doelpunt', check: (s) => s.goals >= 1 },
  ongeslagen: { tekst: 'Drie wedstrijden zonder verlies', check: (s) => s.unbeaten >= 3 },
  promotie: { tekst: 'Promotie aan het eind van het seizoen', check: (s) => s.promoted },
};
export const GOAL_IDS = Object.keys(GOALS);
export const AMOUNT = { talent: [150, 300], terp: [250, 500], kroon: [400, 800] };
// Echte merken die niet mogen opduiken (constitution 2): de generator is veilig, maar de test controleert het ook.
export const sponsorName = (sort, rng) => { const d = SORTS[sort]; return `${d.voor[Math.floor(rng() * d.voor.length)]} ${d.na[Math.floor(rng() * d.na.length)]}`; };

// De aanbiedingen van dit seizoen: 2 of 3 sleuven, elk een ander soort en doel, bedrag naar klasse. Deterministisch uit (seizoen, club).
export function offersFor(clubId, division, seasonNr) {
  const rng = makeRng(hashSeed('sponsor', clubId, seasonNr));
  const n = 2 + (rng() < 0.5 ? 1 : 0);
  const sorts = SORT_IDS.slice().sort((a, b) => hashSeed('s', clubId, seasonNr, a) - hashSeed('s', clubId, seasonNr, b)).slice(0, n);
  const goals = GOAL_IDS.slice().sort((a, b) => hashSeed('g', clubId, seasonNr, a) - hashSeed('g', clubId, seasonNr, b));
  const [lo, hi] = AMOUNT[division] || AMOUNT.talent;
  return sorts.map((sort, i) => ({ id: `sp${seasonNr}-${i}`, sort, naam: sponsorName(sort, rng), goal: goals[i % goals.length], amount: Math.round((lo + rng() * (hi - lo)) / 10) * 10, accepted: false, paid: false, osm: null }));
}
export const newSponsors = (clubId, division, seasonNr) => ({ nr: seasonNr, slots: offersFor(clubId, division, seasonNr) });
// De pandindex die sponsorpanden.js registreert (geen import van Bezit hier, dus geen cyclus); een expliciet meegegeven index wint.
let registeredIndex = null;
export const setPandIndex = (ix) => { registeredIndex = ix && typeof ix.find === 'function' ? ix : null; };
export function accept(sp, slotId, pandIndex = null, plaats = null) {
  pandIndex = pandIndex || registeredIndex;
  const s = JSON.parse(JSON.stringify(sp));
  const deal = s.slots.find((x) => x.id === slotId);
  if (!deal || deal.accepted) return { sponsors: sp, ok: false };
  deal.accepted = true;
  deal.osm = pandIndex && typeof pandIndex.find === 'function' ? (pandIndex.find(SORTS[deal.sort].pand, plaats) || null) : null;
  return { sponsors: s, ok: true, slot: deal };
}
// Een aangenomen overeenkomst zonder pand (de speler tekende voordat de Bezit-pandindex geladen was) krijgt het pand alsnog zodra de index er is. Geeft { sponsors, changed }; een tweede aanroep verandert niets.
export function resolveMissingPanden(sp, pandIndex = null, plaats = null) {
  pandIndex = pandIndex || registeredIndex;
  if (!sp || !pandIndex || typeof pandIndex.find !== 'function' || !Array.isArray(plaats)) return { sponsors: sp, changed: 0 };
  const s = JSON.parse(JSON.stringify(sp));
  let changed = 0;
  for (const deal of s.slots) {
    if (!deal.accepted || Number.isFinite(deal.osm) || !SORTS[deal.sort]) continue;
    const osm = pandIndex.find(SORTS[deal.sort].pand, plaats);
    if (osm != null) { deal.osm = osm; changed++; }
  }
  return { sponsors: changed ? s : sp, changed };
}
// De stand voor de doelen: doelpunten dit seizoen, wedstrijden zonder verlies op rij (uit de vorm) en of het seizoen met promotie eindigde. Geeft de nieuwe sponsors en de uit te betalen regels (elk doel eenmalig).
export function settle(sp, state) {
  if (!sp) return { sponsors: sp, earn: [] };
  const s = JSON.parse(JSON.stringify(sp)), earn = [];
  for (const deal of s.slots) {
    if (!deal.accepted || deal.paid || !GOALS[deal.goal].check(state)) continue;
    deal.paid = true;
    earn.push({ label: `Sponsor ${deal.naam}`, amount: deal.amount, bron: 'sponsor' });
  }
  return { sponsors: s, earn };
}
export const unbeatenRun = (history) => { let k = 0; for (let i = (history || []).length - 1; i >= 0 && history[i].r !== 'L'; i--) k++; return k; };
// Op het veld: de reclameborden en het shirt noemen de geaccepteerde sponsors; Hilbrand noemt de eerste in zijn commentaar.
export const boardNames = (sp) => (sp ? sp.slots.filter((x) => x.accepted).map((x) => x.naam) : []);
export const shirtText = (sp) => boardNames(sp)[0] || '';
export const commentaryLine = (sp) => { const n = boardNames(sp)[0]; return n ? `Hilbrand: een wedstrijd mogelijk gemaakt door ${n}.` : null; };
// De klantenbonus voor wie het sponsorpand bezit: hooguit +10% op de omzet van dat pand, alleen op thuiswedstrijddagen; nooit een tweede uitbetaling van de sponsor.
export function ownerBonus({ isHomeDay = false, ownsPand = false, form = 1 } = {}) {
  if (!isHomeDay || !ownsPand) return { factor: 1, extraPayout: 0 };
  return { factor: 1 + Math.min(OWNER_BONUS_MAX, 0.04 + Math.max(0, form - 1) * 0.5), extraPayout: 0 };
}
