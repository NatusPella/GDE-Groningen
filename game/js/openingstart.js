// Wanneer begint de openingsscène van een nieuw spel (stap M00 'opening' in story.js, #986)?
// Zuiver, zodat scripts/openingstart_test.mjs de voorwaarden kan lopen zonder DOM of wereld.
//
// De opening moet de eerste film na het laadscherm zijn. Daarom blokkeert de vlucht-in van de
// gewone spelstart ('start', prioriteit 3) hem niet: de opening (prioriteit 4) neemt hem over, en
// cinematics.js speelt die vlucht-in niet eens meer als de opening aan de beurt is.

// Elke reden waarom de opening nu nog niet kan beginnen (leeg = klaar). De namen staan in de
// waarschuwing van story.js, zodat een vastloper zegt waar hij op wacht.
// Zit er een groep in dit spel? Een host met medespelers, of een speler midden in een overname of overdracht (coophostwisselnet.js).
export function groepInSpel(world) {
  const n = world && world.coopNet, w = world && world.coopWissel;
  if (n && n.role === 'host' && n.hub && n.hub.roster && n.hub.roster.spelers.some((x) => x.slot !== 0 && x.verbinding !== 'lost')) return true;
  // (#1059) wie net host werd door een overname of overdracht heeft de groep nog niet terug: de anderen sluiten pas seconden later aan.
  // Zonder dit speelde in die seconden de opening van zijn eigen nieuwe spel (klok naar 05:45, de speler naar zijn nieuwe thuis) en de
  // groep kwam daarna in die wereld binnen. De sessie van de groep (groepNet) houdt de opening tegen zolang ze loopt.
  if (n && w && w.groepNet === n) return true;
  return !!(w && (w.val || w.verbindt || w.overname || w.solo || w.aansluit || (w.nieuw && w.nieuw.bezig)));
}
export function openingBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.client) out.push('meespeler (de opening hoort bij de wereld van wie het spel opende)');
  if (s.gate) out.push('wachtkamer Samen spelen');
  // #1060: een opening is van wie hem zelf start. Zit er een groep in zijn spel (hij heeft net het spel overgenomen, of er doen medespelers mee),
  // dan speelt hij niet voor hen: hij wacht tot hij weer alleen is.
  if (s.groep) out.push('medespelers in jouw spel (de opening is alleen voor wie hem zelf start)');
  if (s.missionActive) out.push('missie actief');
  // een andere film dan de spelstart houdt de opening wel tegen; de spelstart zelf niet
  if (s.cinematicActive && !s.startActive) out.push('andere film bezig');
  if (!s.cinematicActive && s.sinceCinematicS <= 1) out.push('film net afgelopen');
  if (s.narrativeBusy) out.push('vertelling bezig');
  if (s.pigeon) out.push('duifstand');
  if (s.respawn) out.push('terugzetten na een val loopt');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}

// De poort van de knop "Opening opnieuw bekijken": `vooraf` (het menu sluiten) draait pas als niets de opening tegenhoudt, anders
// blijft het menu open en staat de reden erbij (review 20-11 #5). Geeft de reden terug, of '' als `vooraf` gedraaid heeft.
// De reden in gewoon Nederlands voor de speler; onbekende redenen blijven zoals ze zijn.
export const OPENING_REDEN = {
  'spel nog niet gestart': 'het spel is nog niet begonnen',
  meespeler: 'je bent meespeler in het spel van een ander',
  'Samen spelen': 'je speelt samen',
  'de opening komt nog': 'je krijgt de opening nog vanzelf',
  'missie actief': 'er loopt een missie',
  'film bezig': 'er loopt een film',
  'vertelling bezig': 'er wordt nog verteld',
  duifstand: 'je bent een duif',
  'terugzetten loopt': 'je wordt net teruggezet',
  'in een voertuig': 'je zit in een voertuig',
  'verhaaldata nog niet geladen': 'het verhaal laadt nog',
  'geen speler': 'er is geen speler',
};
export function openingReplayGate(blockers, vooraf) {
  if (blockers && blockers.length) return 'De opening kan nu niet: ' + (OPENING_REDEN[blockers[0]] || blockers[0]) + '.';
  if (typeof vooraf === 'function') vooraf();
  return '';
}
export const openingReady = (s) => openingBlockers(s).length === 0;

// Speelt de opening als eerste, dan slaat cinematics.js de vlucht-in van de spelstart over.
// `stepIsOpening`: de stap waar het verhaal nu op staat is M00.
export const openingIsNext = ({ stepIsOpening, client, dataReady }) => !!stepIsOpening && !client && !!dataReady;

// --- einde, overslaan en herbekijken (#986) ---------------------------------------------------------------------
// De opening bestaat uit een trailermontage en twee gespeelde bedrijven (keuken, verhuisdag). Overslaan (spatie of
// A ingedrukt houden) of een film die een andere film vervangt, beëindigt de hele opening: er is nooit een half
// bedrijf over, en de stap M00 meldt zich dan precies één keer klaar. Zuiver, zodat de test het zonder DOM loopt.

// Wat doet de opening als een bedrijf eindigt? 'volgende' speelt het volgende bedrijf, 'klaar' sluit de opening.
export function openingActEnd({ index, count, skipped = false, replaced = false }) {
  if (skipped || replaced) return 'klaar';
  return index < count - 1 ? 'volgende' : 'klaar';
}

// De normale startstand na de opening: de klok op de ochtend van de verhuisdag, de stap klaar. Eén keer:
// een tweede einde (de montage en een bedrijf melden zich allebei) verandert niets meer.
export const OPENING_END_HOUR = 8;
export function openingFinish(b) {
  if (!b || b.phase === 'done') return { changed: false, hour: null };
  b.phase = 'done';
  return { changed: true, hour: OPENING_END_HOUR };
}

// Mag de speler de opening opnieuw bekijken (Verhaal > Personages)? Alleen alleen-spelen op de wereld van de speler zelf,
// te voet en met een rustig spel; in Samen spelen is de opening van de wereld en volgt zij de gastheer (coopcut.js).
export function openingReplayBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.client) out.push('meespeler');
  if (s.session) out.push('Samen spelen');
  if (s.openingDue) out.push('de opening komt nog');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.narrativeBusy) out.push('vertelling bezig');
  if (s.pigeon) out.push('duifstand');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.inVehicle) out.push('in een voertuig');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}
