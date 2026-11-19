// Wanneer begint de openingsscène van een nieuw spel (stap M00 'opening' in story.js, #986)?
// Zuiver, zodat scripts/openingstart_test.mjs de voorwaarden kan lopen zonder DOM of wereld.
//
// De opening moet de eerste film na het laadscherm zijn. Daarom blokkeert de vlucht-in van de
// gewone spelstart ('start', prioriteit 3) hem niet: de opening (prioriteit 4) neemt hem over, en
// cinematics.js speelt die vlucht-in niet eens meer als de opening aan de beurt is.

// Elke reden waarom de opening nu nog niet kan beginnen (leeg = klaar). De namen staan in de
// waarschuwing van story.js, zodat een vastloper zegt waar hij op wacht.
export function openingBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.client) out.push('meespeler (de opening hoort bij de wereld van wie het spel opende)');
  if (s.gate) out.push('wachtkamer Samen spelen');
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

export const openingReady = (s) => openingBlockers(s).length === 0;

// Speelt de opening als eerste, dan slaat cinematics.js de vlucht-in van de spelstart over.
// `stepIsOpening`: de stap waar het verhaal nu op staat is M00.
export const openingIsNext = ({ stepIsOpening, client, dataReady }) => !!stepIsOpening && !client && !!dataReady;
