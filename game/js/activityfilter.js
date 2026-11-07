// #654: alle 26 activiteiten draaiden elke frame tick/prompt/secondary, ook op
// kilometers afstand, terwijl dat werk niets kan opleveren. Deze pure filter
// houdt alleen wat actief is of een spot binnen ACTIVITY_NEAR_M van de
// hoofdspeler heeft; de rest wordt overgeslagen.
export const ACTIVITY_NEAR_M = 400;

export const activityFilterStats = { examined: 0, kept: 0 };

export function activityRelevant(a, player, nearM = ACTIVITY_NEAR_M) {
  try { if (a.active && a.active()) return true; } catch (e) { return false; }
  if (!player) return true; // geen speler bekend: niets overslaan
  try {
    const spots = a.spots ? a.spots() : null;
    if (!spots || !spots.length) return false;
    for (const s of spots) if (Math.hypot(s.x - player.x, s.y - player.y) <= nearM) return true;
    return false;
  } catch (e) {
    return true; // onbekende activiteit: liever meedoen dan stilvallen
  }
}

export function relevantActivities(list, player, nearM = ACTIVITY_NEAR_M) {
  const out = [];
  for (const a of list) {
    activityFilterStats.examined++;
    if (activityRelevant(a, player, nearM)) { out.push(a); activityFilterStats.kept++; }
  }
  return out;
}
