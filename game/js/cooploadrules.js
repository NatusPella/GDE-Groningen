// Laden tijdens Samen spelen (#492): één vaste volgorde, en die is de hele afspraak. Eerst
// eindigt de sessie, daarna wordt de huidige voortgang bewaard en pas dan het gekozen spel
// geladen. Mislukt een stap, dan stopt het daar: er wordt niets geladen en de melding zegt waar
// het misging. Geen imports, zodat een test de volgorde en elke fouttak kan naspelen.

export function coopLoadTekst(world, wat = 'Een ander opgeslagen spel') {
  if (world && world.coopRole === 'host') {
    return `Je zit in een sessie. ${wat} laden beëindigt de sessie voor iedereen; de andere spelers gaan terug naar hun eigen spel. Je huidige voortgang wordt eerst bewaard.`;
  }
  return `Je zit in een sessie. ${wat} laden verlaat de sessie; de anderen spelen door. Je eigen voortgang wordt eerst bewaard.`;
}

export const COOP_LOAD_FAIL = {
  stop: 'De sessie kon niet worden gestopt.',
  save: 'De sessie is gestopt, maar opslaan mislukt; het spel is niet geladen.',
  load: 'Dit opgeslagen spel kan niet geladen worden.',
  'geen-sessie': 'Samen spelen loopt niet meer.',
};

// stop(world) beeindigt de sessie, save(world, {toast:false}) bewaart de huidige voortgang,
// load(world, n) laadt het gekozen opgeslagen spel. Elk geeft aan of het lukte.
export function runCoopLoad(world, n, { stop, save, load }) {
  if (!world || !world.coopNet) return { ok: false, reason: 'geen-sessie' };
  try { stop(world); } catch (e) { return { ok: false, reason: 'stop' }; }
  if (!save(world, { toast: false })) return { ok: false, reason: 'save' };
  if (!load(world, n)) return { ok: false, reason: 'load' };
  return { ok: true };
}

// Herstarten of afsluiten tijdens Samen spelen (#492, wi-492-saves): dezelfde volgorde als bij laden.
// Eerst eindigt de sessie, zodat de anderen 'spel gestopt' horen in plaats van een weggevallen
// verbinding; daarna wordt de huidige voortgang bewaard; en pas dan wordt herladen of gesloten.
// `save` mag null zijn (niets te bewaren) en `go` doet de herstart of het sluiten. Een fout in stop
// of save houdt de herstart niet tegen: de vorige save blijft dan staan, net als in het oude pad.
export function runCoopStop(world, { stop, save = null, go }) {
  if (world && world.coopNet) { try { stop(world); } catch (e) { /* de sessie was al weg */ } }
  if (save) { try { save(world); } catch (e) { /* de vorige save blijft staan */ } }
  go();
  return { ok: true };
}
