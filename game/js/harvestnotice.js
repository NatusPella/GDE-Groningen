// De melding "oogstklaar" (verfijnronde bezit, 22-11): één veld krijgt zijn eigen melding, meer velden tegelijk (na slapen, reizen of een grote boerderij) één
// samenvatting in plaats van een rij meldingen die elkaar wegdrukt. Puur: geen DOM, geen klok. Per speler, lokaal (#429).
// items: [{ gewas: 'Aardappelen', plek: 'Zonnehoek Noord' }]
const SINGLE_TAIL = 'Zoek de lichtkolom en oogst met de maaidorser.';
export function harvestReadyLine(items) {
  const list = (Array.isArray(items) ? items : []).filter((i) => i && typeof i === 'object');
  if (!list.length) return null;
  const label = (i) => String(i.gewas || 'Je gewas');
  if (list.length === 1) return `${label(list[0])} op ${String(list[0].plek || 'je perceel')} is oogstklaar. ${SINGLE_TAIL}`;
  if (list.length <= 3) return `Oogstklaar: ${list.map((i) => `${label(i)} op ${String(i.plek || 'je perceel')}`).join(', ')}.`;
  return `${list.length} velden zijn oogstklaar. Kies in Land en bedrijf de knop Oogst alles, of zoek de lichtkolommen.`;
}
