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
  function veilig(naam, fn) {
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
  }
  // #1295: bij het laden van een andere save moet laatsteGoed worden geleegd, anders lekt de vorige save
  function clearSafe() {
    laatsteGoed.clear();
    reported.clear();
  }
  return { veilig, clearSafe };
}

// The health a save stores. A save made while the player is down (dead or arrested, waiting for the
// respawn: closing the game or F5 on that screen) used to store 1, so the next session started with one
// hit left. The respawn that was about to happen gives full health, so the save stores that.
export function healthForSave(health, down = false) {
  const h = typeof health === 'number' && Number.isFinite(health) ? health : 100;
  if (down || h <= 0) return 100;
  return Math.max(1, Math.min(100, h));
}

// The money a save stores while a respawn is pending (#1295): the fine of DOOD or OPGEPAKT (respawnPlayer takes it
// only after the scene) is taken here too, so closing the game on that screen no longer skips the fine.
export function moneyForSave(money, pending = null) {
  const m = typeof money === 'number' && Number.isFinite(money) ? money : 0;
  const fine = pending && Number.isFinite(pending.moneyPenalty) ? Math.max(0, pending.moneyPenalty) : 0;
  return Math.max(0, m - fine);
}
