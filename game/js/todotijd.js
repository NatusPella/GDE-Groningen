// Het tijdstreepje van Te doen (designsysteem v2, #980): een lopend evenement laat zien hoeveel van zijn tijd nog over is,
// wat nog moet beginnen zegt vanaf wanneer. Puur, zodat todo_tijd_test het zonder scherm kan natrekken.
// `tijd` komt uit todo.js (evenementItem): { loopt, over (uren), totaal (uren), van ('18:00') }; zonder tijd is er geen streep.
export function tijdStreep(tijd) {
  if (!tijd || !Number.isFinite(tijd.totaal) || tijd.totaal <= 0) return null;
  if (!tijd.loopt) return { pct: 0, label: `Vanaf ${tijd.van}`, chip: `Vanaf ${tijd.van}` };
  const over = Math.max(0, Math.min(tijd.totaal, Number.isFinite(tijd.over) ? tijd.over : 0));
  const uren = over >= 2 ? `${Math.round(over)} uur` : over >= 1 ? '1 uur' : `${Math.max(1, Math.round(over * 60))} min`;
  return { pct: Math.round((over / tijd.totaal) * 100), label: `Nog ${uren}`, chip: `Nog ${uren}` };
}
