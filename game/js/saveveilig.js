// Een veld van de save lezen zonder dat één struikelende module de hele save blokkeert (22-11).
// Pure logica (geen DOM, geen three.js): scripts/saveveilig_test.mjs draait hem.
//
// makeSafe({ log, terugval }) -> veilig(naam, fn):
//  - fn() lukt: de waarde, en onthouden als laatste goede waarde van dat veld;
//  - fn() faalt: één keer per veld een melding via log(tekst), dan de laatste goede waarde van deze sessie, anders
//    terugval(naam) (het veld uit de vorige save op die plek), zodat de oude voortgang van dat onderdeel niet door een
//    leeg veld wordt overschreven. Geeft ook die niets, dan ontbreekt het veld.
export function makeSafe({ log = () => {}, terugval = () => undefined } = {}) {
  const laatsteGoed = new Map();
  const reported = new Set();
  return function veilig(naam, fn) {
    try {
      const v = fn();
      laatsteGoed.set(naam, v);
      return v;
    } catch (e) {
      if (!reported.has(naam)) {
        reported.add(naam);
        try { log('Opslaan: onderdeel "' + naam + '" faalde: ' + ((e && e.message) || e)); } catch (e2) { /* melden mag niet falen */ }
      }
      if (laatsteGoed.has(naam)) return laatsteGoed.get(naam);
      try { return terugval(naam); } catch (e3) { return undefined; }
    }
  };
}
