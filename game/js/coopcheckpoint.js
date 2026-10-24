// Samen spelen (#448): checkpoints. Elke speler schrijft zijn eigen save regelmatig weg (de gast zelf, niet de host), en meteen
// bij een geslaagde opdracht. Pure klok: savegame.js doet het schrijven (met herstelkopie, writeSlotRaw).
export const CHECKPOINT_S = 60;

export function maakCheckpoint(interval = CHECKPOINT_S) {
  let rest = interval, opdrachten = -1;
  return {
    // dt seconden verder; geeft true als er nu een checkpoint geschreven moet worden. bezig = nu even niet (filmpje, respawn): dan blijft het open.
    tik(dt, bezig = false) {
      rest -= dt;
      if (rest > 0) return false;
      if (bezig) { rest = 0; return false; }
      rest = interval; return true;
    },
    // het aantal gelukte opdrachten van deze speler; stijgt het, dan is er meteen een checkpoint nodig
    opdrachtGelukt(aantal) {
      const eerste = opdrachten < 0;
      const nieuw = !eerste && aantal > opdrachten;
      opdrachten = aantal;
      if (nieuw) rest = 0;
      return nieuw;
    },
    reset() { rest = interval; opdrachten = -1; },
    rest: () => rest,
  };
}
