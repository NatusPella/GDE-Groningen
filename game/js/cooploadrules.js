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

// Een nieuw spel beginnen of een opgeslagen spel verwijderen tijdens Samen spelen (#492, slices
// 1-2): dezelfde volgorde als bij laden en stoppen (eerst de sessie, dan bewaren, dan de actie).
// De bevestiging zegt wat er met de sessie gebeurt; een gast verlaat hem, de host beëindigt hem.
export function coopActieTekst(world, wat = 'Dit') {
  if (world && world.coopRole === 'host') {
    return `Je zit in een sessie. ${wat} beëindigt de sessie voor iedereen; de andere spelers gaan terug naar hun eigen spel. Je huidige voortgang wordt eerst bewaard.`;
  }
  return `Je zit in een sessie. ${wat} verlaat de sessie; de anderen spelen door. Je eigen voortgang wordt eerst bewaard.`;
}

// De actie kon niet doorgaan: alleen het bewaren kan mislukken (de sessie is dan al gestopt).
export const COOP_ACTIE_FAIL = {
  save: 'De sessie is gestopt, maar opslaan mislukt; er is niets begonnen of verwijderd.',
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
// `save` mag null zijn (niets te bewaren) en `go` doet de herstart of het sluiten. Mislukt het
// bewaren, dan gebeurt `go` niet (#563): het spel blijft open met de melding en de keuze om het
// opnieuw te proberen of toch te sluiten, zodat de knop "Slaat op en sluit het spel" niet liegt.
// Alleen een save die echt `false` teruggeeft telt als mislukt; `undefined` is "niets te bewaren".
export function runCoopStop(world, { stop, save = null, go }) {
  if (world && world.coopNet) { try { stop(world); } catch (e) { /* de sessie was al weg */ } }
  if (save) {
    let saved = true;
    try { saved = save(world) !== false; } catch (e) { saved = false; }
    if (!saved) return { ok: false, reason: 'save' };
  }
  go();
  return { ok: true };
}
