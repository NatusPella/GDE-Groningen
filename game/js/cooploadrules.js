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
