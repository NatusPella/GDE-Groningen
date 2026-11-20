// Samen spelen (#983, #429, #452): de bezorgronde met verdeelde adressen. Doet er naast de bezorger een tweede, derde of vierde speler mee
// (de gasten die J zeiden bij de baan "Hap & Rap bezorger"), dan heeft de bestelling na het ophalen één adres per bezorger: je verdeelt de
// stad onderling, wie het eerst bij een deur staat geeft dat adres af, en de ronde is klaar als elk adres bezorgd is. Alleen is er één adres
// en verandert er niets. Puur: geen three.js, geen wereld, geen netwerk (scripts/bezorgteam_test.mjs). De koppeling met de baan staat in
// sidejob_bezorger.js; het doel naar de gasten gaat als puntjes mee in het doelbericht van coopbijbaan.js.

export const TEAM_MAX = 4;          // hoogstens vier adressen (vier spelers)
export const EXTRA_BASIS = 9;       // euro extra basisloon per extra adres, voor ieder die meedoet (de beloning blijft per speler vol)
export const EXTRA_TIJD_S = 14;     // seconden extra warmtebudget per extra adres (een ander loopt te voet)

const fin = (x) => Number.isFinite(x);

// Hoeveel adressen heeft de bestelling bij zoveel meespelers naast de bezorger? Zonder hulp: één.
export const aantalAdressen = (helpers) => 1 + Math.max(0, Math.min(TEAM_MAX - 1, helpers | 0));

// Een adres: { door: {x, y}, street, nr, who }. De lijst begint met het adres van de gewone bestelling (index 0).
export function maakLijst(hoofd, extras = []) {
  const lijst = [hoofd, ...(extras || [])]
    .filter((a) => a && a.door && fin(a.door.x) && fin(a.door.y))
    .slice(0, TEAM_MAX)
    .map((a) => ({ door: a.door, street: a.street || '', nr: a.nr | 0, who: a.who || '', done: false }));
  return lijst;
}

export const open = (lijst) => (lijst || []).filter((a) => !a.done);
export const klaar = (lijst) => !!lijst && lijst.length > 0 && lijst.every((a) => a.done);
export const aantalKlaar = (lijst) => (lijst || []).filter((a) => a.done).length;

// Wie staat waar? afstand(door) geeft de kortste afstand van de dichtstbijzijnde meespeler tot die deur (sidejobkit.afstandNaast).
// Een open adres waar iemand binnen de straal staat, is bezorgd. Geeft de nieuw bezorgde indexen.
export function afvinken(lijst, afstand, straal) {
  const nieuw = [];
  (lijst || []).forEach((a, i) => {
    if (a.done) return;
    const d = afstand(a.door);
    if (fin(d) && d < straal) { a.done = true; nieuw.push(i); }
  });
  return nieuw;
}

// Het eerstvolgende open adres voor iemand op (x, y): de dichtstbijzijnde. Null als alles bezorgd is.
export function dichtstbij(lijst, x, y) {
  let best = null, bd = Infinity;
  (lijst || []).forEach((a, i) => {
    if (a.done) return;
    const d = Math.hypot(a.door.x - x, a.door.y - y);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

// De andere open adressen als puntjes voor de kaart (x, y), zonder het adres dat de marker al is.
export const puntjes = (lijst, behalve) => (lijst || []).map((a, i) => ({ a, i })).filter(({ a, i }) => !a.done && i !== behalve).map(({ a }) => ({ x: a.door.x, y: a.door.y }));

export const adresTekst = (a) => (a ? `${a.street} ${a.nr}`.trim() : '');
// De regel onder het doel: de andere adressen, kort.
export function andereAdressen(lijst, behalve) {
  const rest = (lijst || []).map((a, i) => ({ a, i })).filter(({ a, i }) => !a.done && i !== behalve).map(({ a }) => adresTekst(a));
  return rest.length ? `Ook: ${rest.join(' · ')}` : '';
}

// Het basisloon van de ronde: één adres is het oude loon; elk extra adres is een kleine opslag voor iedereen die meedoet.
export const basisMetAdressen = (basis, lijst) => basis + EXTRA_BASIS * Math.max(0, ((lijst && lijst.length) || 1) - 1);
// Het warmtebudget: de verste deur bepaalt het, plus extra tijd per extra adres (een meespeler loopt te voet).
export function budgetMetAdressen(budgetEen, lijst) {
  return budgetEen + EXTRA_TIJD_S * Math.max(0, ((lijst && lijst.length) || 1) - 1);
}

// De voortgangstekst voor de HUD ("Bestelling 3 · 1 van 2 bezorgd").
export const voortgang = (volgnummer, lijst) => (lijst && lijst.length > 1 ? `Bestelling ${volgnummer} · ${aantalKlaar(lijst)} van ${lijst.length} bezorgd` : `Bestelling ${volgnummer}`);
