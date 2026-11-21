// Voortgang van de game (#898), de live kant: hier worden de tellingen bij de bronnen opgehaald.
// Het rekenwerk staat in progress.js (puur). Dezelfde vraag wordt op vier plekken gesteld —
// de HUD, het Overzicht, het savegame-overzicht en het hervatten — dus woont het antwoord hier
// en niet in elk scherm apart.
//
// Bronnen: het verhaal (story.js, met loopbanen en kusjes die daar al meetellen), de prestaties
// (achievements.js), de kaart en de gebieden (gebiedenlive.js). Wat nog niet geladen is, telt
// niet mee; combineProgress verdeelt dan het gewicht over de rest.
import { getStorySteps } from './story.js';
import { getAchievementSummary } from './achievements.js';
import { getOverzicht } from './gebiedenlive.js';
import { combineProgress } from './progress.js';

export { progressText } from './progress.js';

// De lopende stand van het verhaal: dezelfde vraag aan story.js die het menu ook stelt, zodat
// het cijfer op de HUD en in het menu hetzelfde is.
function liveStoryCounts() {
  try {
    const steps = getStorySteps().filter((s) => s.available);
    return { done: steps.filter((s) => s.done).length, total: steps.length };
  } catch (e) {
    return { done: 0, total: 0 };
  }
}

// De tellingen van alle vier de onderdelen.
function progressCounts() {
  const uit = { verhaal: liveStoryCounts() };
  try { const a = getAchievementSummary(); uit.prestaties = { done: a.done, total: a.total }; } catch (e) { /* nog niet geladen */ }
  try {
    const o = getOverzicht();
    if (o) {
      uit.kaart = { done: o.kaart.gedaan, total: o.kaart.totaal };
      let klaar = 0, totaal = 0;
      for (const n of o.overzicht) { klaar += n.voltooid; totaal += n.gebieden.length; }
      uit.gebieden = { done: klaar, total: totaal };
    }
  } catch (e) { /* de kaart laadt nog */ }
  return uit;
}

// Alles in één keer: het percentage plus de onderdelen, voor de schermen die het uitleggen.
export function gameProgress() {
  return combineProgress(progressCounts());
}
