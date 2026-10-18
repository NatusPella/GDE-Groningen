// Pauzemenu › Cheats, the pure part (#161): browsing a row never changes a
// cheat. Switching one takes an explicit press in the side pane, and turning a
// prestatie-blocking one on takes a second, confirming press. Node-safe.

// 'veilig': prestaties blijven aan; 'hindert': prestaties staan uit zolang hij aan staat.
// Same rule as cheats.js achievementsBlocked: cosmetic (safe) cheats and the
// two actions (teleporteren, Voertuig hier) leave prestaties on.
export function impact(c) {
  return c.safe || c.kind === 'action' || c.kind === 'perk' ? 'veilig' : 'hindert';
}

// The line on top of the list.
export function summaryLine(cheats, isOn) {
  const hinder = cheats.filter((c) => isOn(c.id) && impact(c) === 'hindert');
  if (hinder.length) return { tone: 'red', text: `Prestaties zijn uitgeschakeld: ${hinder.map((c) => c.name).join(', ')} staat aan.` };
  const on = cheats.filter((c) => isOn(c.id)).length;
  return { tone: 'good', text: on ? 'Prestaties blijven aan: alleen veilige cheats staan aan.' : 'Prestaties blijven aan. Niets staat aan.' };
}

// A press on the switch button of cheat `c`.
// st: { pending } (the id waiting for its confirmation, or null).
// Returns { do: 'apply'|'ask'|'none', value, pending }.
export function pressToggle(st, c, isOn) {
  if (isOn) return { do: 'apply', value: false, pending: null };
  if (impact(c) === 'veilig') return { do: 'apply', value: true, pending: null };
  if (st.pending === c.id) return { do: 'apply', value: true, pending: null };
  return { do: 'ask', value: true, pending: c.id };
}

// Moving to another row drops a waiting confirmation.
export const onSelect = (st, id) => (st.pending && st.pending !== id ? { ...st, pending: null } : st);
