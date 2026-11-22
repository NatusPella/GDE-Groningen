// Welke ondertitelregel staat er op tijd t? Puur, zonder DOM (cinematics.js en de test gebruiken hem).
// Regels met een eigen tijd ({ at, dur }) staan precies zolang zij duren; tussen twee regels zit vaak een
// kier van een tiende seconde. Zonder houdvast knippert dan het ondertitelvak (leeg vak, dan weer vol):
// de vorige regel blijft nog even staan (SUB_HOLD_S) tot de volgende begint. Regels zonder eigen tijd
// worden gelijkmatig over de scène verdeeld.
export const SUB_HOLD_S = 0.45;

export function subtitleIndex(lines, t, duration, prev = -1) {
  if (!Array.isArray(lines) || !lines.length || !Number.isFinite(t)) return -1;
  if (lines[0].at == null) {
    const lead = 0.5, span = Math.max(0.5, duration - lead - 0.2);
    return t < lead ? -1 : Math.min(lines.length - 1, Math.floor(((t - lead) / span) * lines.length));
  }
  const cur = lines.findIndex((l) => t >= l.at && t < l.at + l.dur);
  if (cur >= 0) return cur;
  const v = lines[prev];
  if (v && v.at != null && t >= v.at + v.dur && t < v.at + v.dur + SUB_HOLD_S) return prev;
  return -1;
}
