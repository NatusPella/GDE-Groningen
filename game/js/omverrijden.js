// Omverrijden in de stad (#392): wie buiten een missie losse dingen omver rijdt (een bak, een fiets, een tafeltje, een parasol)
// krijgt een paar euro, begrensd per tien minuten (omverrules.js). Tijdens een missie, een bijbaan of de stuntavond doet dit niets:
// die hebben hun eigen uitbetaling. Alleen met een voertuig, en nooit voor mensen.
import { onPropBreak } from './breakables.js';
import { omverEuro, nieuweOmverStand } from './omverrules.js';
import { chipPopup } from './stunthud.js';
import { stuntStatus } from './stuntavond.js';
import { noteMoney } from './finance.js';

export function initOmverrijden(w) {
  const stand = nieuweOmverStand();
  onPropBreak((p, hit) => {
    if (!hit || !hit.byPlayer || !hit.heavy) return;
    if (w.coopRole === 'client' || stuntStatus()) return;
    if ((w.mission && w.mission.phase === 'active') || (w.sideJob && w.sideJob.active)) return;
    const e = omverEuro(stand, p.kind, w.time);
    if (!e) return;
    noteMoney('Rijden');
    w.money += e;
    chipPopup(`+€${e} omver`);
  });
}
