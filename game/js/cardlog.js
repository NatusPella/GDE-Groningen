// #801: het tekstlog van HUD-kaarten. Puur, zodat het zonder DOM te testen is;
// hudcards.js bewaart de laatste kaarten en kan ze op verzoek opnieuw tonen.
export const CARD_LOG_MAX = 40;

export function addCardLog(log, entry, max = CARD_LOG_MAX) {
  const next = Array.isArray(log) ? log.concat([entry]) : [entry];
  return next.length > max ? next.slice(next.length - max) : next;
}

export function cardLogText(entries, count = 6) {
  return (Array.isArray(entries) ? entries : []).slice(-count)
    .map((e) => {
      const titel = String(e.title || '').trim();
      const body = String(e.body || e.text || '').trim();
      return titel && body ? `${titel}: ${body}` : (titel || body);
    })
    .filter(Boolean)
    .join('\n');
}
