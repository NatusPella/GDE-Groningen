// Samen spelen (#452): de beslissingen van een verhaalstap (missions.js) over de meespelers van de opdracht, zonder DOM of wereldbouw.
// Een stap kijkt niet alleen naar de gastheer maar naar elke meespeler (gastheer en gasten die J zeiden, verbonden en niet neer; spelersregister.js).
// Standaard is een meespeler genoeg; de vlag `iedereen` in de stap vraagt dat elke meespeler erbij is. Alleen (een register van één) geeft
// altijd world.player terug, zodat het eenspelerspel exact doet wat het deed.
import { opdrachtSpelers, acteur, hoofdspeler } from './spelersregister.js';

export const WACHT_OP_ANDEREN = 'Wacht even: iedereen moet erbij zijn.';
const d2 = (a, t) => Math.hypot(a.x - t.x, a.y - t.y);

// De meespeler die aan de eis voldoet (ok(acteur, afstand)), anders de dichtstbijzijnde bij het doel.
export function teamActor(world, target, ok = null) {
  const l = opdrachtSpelers(world);
  if (l.length === 1 && l[0].lokaal) return hoofdspeler(world);
  let best = null, bd = Infinity, fit = null, fd = Infinity;
  for (const r of l) {
    const a = acteur(world, r);
    const d = target ? d2(a, target) : 0;
    if (d < bd) { bd = d; best = a; }
    if (ok && d < fd && ok(a, d)) { fd = d; fit = a; }
  }
  return fit || best;
}

// Staat de hele groep in het doel, op de manier die de stap vraagt (modeOk(acteur, mode): te voet, in de boot, in het missievoertuig)?
export function iedereenOk(world, target, radius, mode, modeOk) {
  for (const r of opdrachtSpelers(world)) { const a = acteur(world, r); if (!(d2(a, target) < radius && modeOk(a, mode))) return false; }
  return true;
}

// De stand van een doel (goto en hold): 'buiten' (niemand erin), 'modus' (iemand erin maar niet zoals gevraagd: te voet, boot...),
// 'wacht' (met de vlag iedereen: nog niet allemaal) of 'binnen'. actor = de meespeler die telt (voor modder, stilstaan).
export function doelStand(world, target, radius, mode, modeOk, iedereen = false) {
  const actor = teamActor(world, target, (a, d) => d < radius && modeOk(a, mode));
  let status = 'binnen';
  if (!(d2(actor, target) < radius)) status = 'buiten';
  else if (!modeOk(actor, mode)) status = 'modus';
  else if (iedereen && !iedereenOk(world, target, radius, mode, modeOk)) status = 'wacht';
  return { actor, status };
}

// Poort voor stappen zonder eigen groepslogica (kluis kraken, lasers...): met de vlag iedereen begint de stap pas als elke meespeler binnen straal van het doel is.
export function groepKlaar(world, st, target, straal = 30) {
  if (!st || !st.iedereen || !target) return true;
  for (const r of opdrachtSpelers(world)) if (!(Math.hypot(r.x - target.x, r.y - target.y) <= (st.iedereenStraal || straal))) return false;
  return true;
}
