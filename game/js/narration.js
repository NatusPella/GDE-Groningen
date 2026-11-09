// Schermnarratie (#802): een klein, begrensd spraakkanaal voor statuswijzigingen
// in de HUD. De HUD zet de tekst in een eigen aria-live-regio; dit is de pure
// wachtrij, zodat scripts/narration_test.mjs hem zonder DOM kan testen.
// Regels: minstens NARRATION_GAP seconden tussen twee uitingen, belangrijke
// berichten eerst, dezelfde tekst niet dubbel in de wachtrij, en hooguit
// maxQueue berichten (de rest valt weg: status is geen logboek).
export const NARRATION_GAP = 1.2;

export function createNarrator({ gap = NARRATION_GAP, maxQueue = 4 } = {}) {
  const queue = [];
  let lastAt = -Infinity;
  return {
    push(text, { important = false } = {}) {
      const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
      if (!t || queue.some((q) => q.text === t)) return false;
      queue.push({ text: t, important: !!important });
      // belangrijk eerst; gelijke importantie houdt de volgorde van binnenkomst
      queue.sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
      if (queue.length > maxQueue) queue.length = maxQueue;
      return true;
    },
    // Mag er nu iets gezegd worden? Zo ja, geef de volgende tekst terug.
    next(now = 0) {
      if (!queue.length || now - lastAt < gap) return null;
      lastAt = now;
      return queue.shift().text;
    },
    get size() { return queue.length; },
    clear() { queue.length = 0; lastAt = -Infinity; },
  };
}
