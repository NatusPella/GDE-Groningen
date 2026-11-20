// Terugkeerscène (#986 #987): komt de speler terug in een opgeslagen spel (Doorgaan), dan speelt er in de flat een
// korte, overslaanbare vignet van Tammo en Tessa die past bij waar hun relatie in het verhaal staat.
// Dit bestand is het zuivere deel: de fase uit de verhaalvoortgang, de keuze zonder herhaling, de opslag per
// apparaat en de voorwaarden. Geen DOM, geen wereld, geen THREE: scripts/terugkeer_test.mjs loopt het in node.
// De vignetten staan in terugkeerscenes.js, het afspelen in terugkeerrun.js.
//
// Samen spelen: de scène is van wie het spel opende (de wereld). Een gast speelt hem niet zelf bij zijn eigen
// Doorgaan; een lopende sessie slaat hem over voor iedereen (een spel laden kan dan niet eens). Zie docs/COOP-GAST.md.
import { STEPS } from './storyarc.js';

// De fasen van de relatie, gekoppeld aan de verhaalstappen (storyarc_nieuw.js). `stepId` is de stap waar het verhaal
// nu op staat (de eerste die nog niet af is); `vanaf` is de eerste stap van die fase.
//   1 huisgenoten  akte 1 en 2: M00 tot en met M11 (ze wonen net samen, alles is nog wat ongemakkelijk)
//   2 vrienden     M12 tot en met M22: plagen, samen koken, de eerste vonk (de kus bij M16, het dieptepunt bij M20 horen erbij)
//   3 relatie      M23 tot en met E: na de knuffel en de vijf woorden, ze zijn samen
//   4 na het slot  vanaf M27 (nazomer) en na het einde: samen thuis, de zomer is nog lang niet op
export const FASE_VANAF = { 1: 'M00', 2: 'M12', 3: 'M23', 4: 'M27' };
export const FASES = [1, 2, 3, 4];
export const FASE_NAAM = { 1: 'huisgenoten', 2: 'vrienden', 3: 'relatie', 4: 'na het slot' };

const stapIndex = (id) => STEPS.findIndex((s) => s.id === id);

// Welke fase hoort bij de stand van het verhaal? `end`: het gebouwde verhaal is uit (currentStep geeft { end }).
// Een onbekende of ontbrekende stap valt terug op fase 1 (de veiligste, kleinste claim over de relatie).
export function terugkeerFase(stepId, { end = false } = {}) {
  if (end) return 4;
  const k = stapIndex(stepId);
  if (k < 0) return 1;
  let fase = 1;
  for (const f of FASES) if (k >= stapIndex(FASE_VANAF[f])) fase = f;
  return fase;
}

// --- rotatie ------------------------------------------------------------------------------------------------------

// Kies een vignet uit `lijst` (items met een id) dat niet het laatst gespeelde is. `rnd` geeft getallen in [0, 1)
// (Math.random of een vaste reeks in de test). Met één kandidaat is er geen keus: dan die.
export function kiesVignet(lijst, laatsteId, rnd = Math.random) {
  const alle = Array.isArray(lijst) ? lijst.filter((v) => v && v.id) : [];
  if (!alle.length) return null;
  const kand = alle.length > 1 ? alle.filter((v) => v.id !== laatsteId) : alle;
  const r = Number(rnd());
  const i = Math.min(kand.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * kand.length)));
  return kand[i];
}

// --- opslag per apparaat ------------------------------------------------------------------------------------------

// Eén eigen sleutel (geen veld in een save: dit hoort bij het apparaat, niet bij het spel; zo blijft elke save heel).
// Vorm: { v: 1, laatste: '<vignet-id>' }. Alles wat daar niet op lijkt telt als "nog niets gespeeld".
export const TERUGKEER_KEY = 'gde-terugkeer-v1';

export function leesLaatste(storage) {
  try {
    const raw = storage && storage.getItem ? storage.getItem(TERUGKEER_KEY) : null;
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d.laatste === 'string' && d.laatste.length < 80 ? d.laatste : null;
  } catch (e) { return null; }
}

export function schrijfLaatste(storage, id) {
  try {
    if (!storage || !storage.setItem || typeof id !== 'string') return false;
    storage.setItem(TERUGKEER_KEY, JSON.stringify({ v: 1, laatste: id }));
    return true;
  } catch (e) { return false; }
}

// --- wanneer ------------------------------------------------------------------------------------------------------

// Elke reden waarom de terugkeerscène nu niet speelt (leeg = hij mag). `s` is een platte momentopname, zodat de
// test geen wereld nodig heeft. Dezelfde rustvoorwaarden als de opening (openingstart.js), plus de eigen regels:
// een eerste nieuw spel (daar speelt de opening), een missie, politie, een voertuig, vlak na de dood, Samen spelen.
export function terugkeerBlockers(s) {
  const out = [];
  if (s.uit) out.push('instelling Terugkeerscène staat uit');
  if (!s.started) out.push('spel nog niet gestart');
  if (s.loading) out.push('laadscherm staat nog');
  if (!s.loaded) out.push('geen opgeslagen spel geladen');
  if (s.client) out.push('meespeler (de scène hoort bij de wereld van wie het spel opende)');
  if (s.session) out.push('Samen spelen');
  if (s.openingDue) out.push('de opening komt nog (eerste nieuw spel)');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.sinceCinematicS != null && s.sinceCinematicS <= 1.5) out.push('film net afgelopen');
  if (s.narrativeBusy) out.push('vertelling bezig');
  if (s.pigeon) out.push('duifstand');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.inVehicle) out.push('in een voertuig');
  if (s.wanted > 0) out.push('politie op je hielen');
  if (s.sinceDeathS != null && s.sinceDeathS < 20) out.push('vlak na de dood');
  if (s.menuOpen) out.push('menu open');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}
export const terugkeerKan = (s) => terugkeerBlockers(s).length === 0;

// Hoe lang wachten we op een rustig moment voordat we het opgeven (seconden spelklok)? Een scène die pas na een
// halve minuut verschijnt, zou de speler midden in iets anders storen.
export const TERUGKEER_WACHT_MAX_S = 25;

// De regels van het wachten: pas spelen als het 1,0 s achter elkaar rustig is (de wereld is dan echt geladen),
// opgeven na TERUGKEER_WACHT_MAX_S. Geeft 'speel', 'wacht' of 'geef-op'; `rustigS` is hoe lang het al rustig is.
export function terugkeerBeslis({ blockers, wachtS, rustigS }) {
  if (wachtS > TERUGKEER_WACHT_MAX_S) return 'geef-op';
  if (blockers && blockers.length) return 'wacht';
  return rustigS >= 1.0 ? 'speel' : 'wacht';
}
