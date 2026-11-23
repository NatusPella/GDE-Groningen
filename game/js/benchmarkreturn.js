// De benchmark en je save (eigenaar 22-11: "Na de benchmark vraagt de game mij om een nieuw verhaal te beginnen").
// Een benchmark uit een lopend spel herlaadt de pagina (trailerstate.js benchmarkViaReload) zodat hij op een verse wereld meet.
// Twee regels houden de save en de voortgang per save (savescope.js) buiten schot:
//   1. VOOR de herlaad: de save wordt bewaard (lukt dat niet, dan start de benchmark niet) en de huidige plek krijgt de stay-vlag
//      (saveslots.js markStay), zodat de boot precies dat spel opent en niet "de laatst bewaarde" raadt; de voortgang wisselt dan niet.
//   2. NA de benchmark: de start gaat rechtstreeks terug het spel in (Doorgaan). Geen kaart "Nieuw verhaal", geen moeilijkheidskaart,
//      geen Nieuw spel: de speler zat al in dit spel. Een benchmark schrijft nooit naar de save of de keuzes (alleen zijn eigen resultaat).
// Zuiver: geen DOM, geen opslag; de aanroeper geeft de functies mee (scripts/benchmark_save_test.mjs).

// Wat doet de start na een benchmark? fromGame: de benchmark kwam uit een lopend spel (via de herlaad); hasSave: de boot vond een save.
export function afterBenchmarkPlan({ fromGame = false, hasSave = false } = {}) {
  if (fromGame && hasSave) return { action: 'continue', legacyCard: false, difficultyCard: false, newGame: false };
  if (hasSave) return { action: 'continue', legacyCard: true, difficultyCard: false, newGame: false }; // een gewone start met een benchmark ervoor
  return { action: 'new', legacyCard: false, difficultyCard: true, newGame: true };
}

// Vóór de herlaad. deps: { save(): boolean, slot(): number, markStay(slot): boolean }. Geeft { ok, reason }.
export function prepareBenchmarkReload(deps) {
  let saved = false;
  try { saved = !!deps.save(); } catch (e) { saved = false; }
  if (!saved) return { ok: false, reason: 'opslaan' };
  const slot = deps.slot();
  if (!Number.isInteger(slot) || slot < 1) return { ok: false, reason: 'plek' };
  let stay = false;
  try { stay = !!deps.markStay(slot); } catch (e) { stay = false; }
  return stay ? { ok: true, slot } : { ok: false, reason: 'plek' };
}

export const BENCH_SAVE_FIRST_TEXT = 'Bewaar eerst je spel.';
export const BENCH_COOP_TEXT = 'Niet beschikbaar tijdens Samen spelen.';

export const BENCH_RELOAD_FAIL_TEXT = 'De prestatietest start niet: je spel kon niet worden opgeslagen. Er is niets veranderd.';
