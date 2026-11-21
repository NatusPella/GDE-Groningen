// Overgangsscènes (#1125, WP2): een korte scène van Tammo en Tessa (soms Rikus, Mem of Jelle erbij) tussen twee missies,
// die zegt wat er net gebeurde en wat nu komt. Twee tot zes regels, overslaanbaar, nooit tijdens een missie.
// Dit is het zuivere deel: welke scène is aan de beurt, en wanneer mag hij. Geen DOM, geen wereld, geen THREE:
// scripts/storybridge_test.mjs loopt het in node. De scènes zelf staan als `kind: 'bridge'` in script.json (de bron is
// docs/verhaal/nieuw/09-script-akte*.md), de koppeling aan een stap staat in storyarc_nieuw.js BRIDGES, het afspelen
// in storybridgerun.js.
//
// Samen spelen: een overgangsscène is van wie het spel opende en speelt lokaal (zoals de autopraat); in een lopende
// sessie en bij een meespeler speelt hij niet. Er zit nooit voortgang in: de inhoud is nooit nodig om door te kunnen,
// het doel staat ook in de lead van de volgende stap. Een scène is één keer per save te zien (vlag `bridge:<id>`).
import { STEPS, BRIDGES } from './storyarc.js';

export const BRIDGE_VIAS = ['car', 'flat', 'phone'];
// hoeveel stappen na de stap waar de scène aan hangt hij nog mag spelen (een bijbaan of reisstap ertussen telt mee);
// een save die verder is, krijgt hem niet meer te zien: een oude scène over iets van lang geleden is geen overgang meer
export const BRIDGE_MAX_STEPS_LATE = 2;
export const bridgeFlag = (id) => 'bridge:' + id;

const idx = (id) => STEPS.findIndex((s) => s.id === id);

// De scène die nu aan de beurt is, of null. `done`: Set stap-id's, `flags`: Set vlaggen, `currentId`: de stap waar het
// verhaal nu op staat (null na het einde).
export function bridgeDue({ done, flags, currentId = null, bridges = BRIDGES }) {
  const cur = currentId ? idx(currentId) : STEPS.length;
  for (const b of bridges) {
    const k = idx(b.after);
    if (k < 0 || !done.has(b.after) || flags.has(bridgeFlag(b.id))) continue;
    // te laat: meer dan twee missies voorbij (activiteiten ertussen, ook de nieuwe N-stappen, tellen niet mee)
    if (STEPS.slice(k + 1, cur).filter((q) => q.kind === 'mission').length > BRIDGE_MAX_STEPS_LATE) continue;
    return b;
  }
  return null;
}

// Elke reden waarom hij nu niet speelt (leeg = hij mag). `s` is een platte momentopname (zie storybridgerun.js).
export function bridgeBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.loading) out.push('laadscherm staat nog');
  if (s.client) out.push('meespeler');
  if (s.session) out.push('Samen spelen');
  if (s.openingDue) out.push('de opening komt nog');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.sinceCinematicS != null && s.sinceCinematicS <= 2.5) out.push('film net afgelopen');
  if (s.pigeon) out.push('duifstand');
  if (s.activity) out.push('activiteit of minigame bezig');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.wanted > 0) out.push('politie op je hielen');
  if (s.sinceDeathS != null && s.sinceDeathS < 20) out.push('vlak na de dood');
  if (s.menuOpen) out.push('menu open');
  if (s.recapOpen) out.push('recapkaart open');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}
export const bridgeMay = (s) => bridgeBlockers(s).length === 0;

// Hoe lang het rustig moet zijn voor hij start (de wereld is dan echt geladen en de vorige scène is uitgeklonken).
export const BRIDGE_CALM_S = 2.5;
// In de auto wachten we hoogstens zo lang op een voertuig voor een autoscène; daarna speelt hij waar de speler is.
export const BRIDGE_CAR_WAIT_S = 45;

// 'wacht', 'speel' of 'wacht-op-auto' voor een scène met `via`; `calmS` is hoe lang het al rustig is, `waitedS` hoe lang
// de scène al klaarstaat, `inVehicle` of de speler in een voertuig zit.
export function bridgeDecide({ via, blockers, calmS, waitedS, inVehicle }) {
  if (blockers && blockers.length) return 'wacht';
  if (calmS < BRIDGE_CALM_S) return 'wacht';
  if (via === 'car' && !inVehicle && waitedS < BRIDGE_CAR_WAIT_S) return 'wacht-op-auto';
  return 'speel';
}

// Controle voor de tests: de afstand tussen twee scènes. Nooit twee scènes na twee opeenvolgende missies.
export function bridgeSpacingProblems(bridges = BRIDGES) {
  const missions = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id);
  const at = bridges.map((b) => missions.indexOf(b.after)).filter((k) => k >= 0).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] < 2) out.push(`${missions[at[i - 1]]} en ${missions[at[i]]} liggen te dicht bij elkaar`);
  return out;
}
