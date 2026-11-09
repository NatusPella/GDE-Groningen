// #804: na een spawngolf bouwden tientallen nieuwe voertuigen in hetzelfde frame
// hun pad op (traffic-piek 274 ms). Een klein budget per frame smeert dat uit;
// een voertuig zonder pad wacht één of enkele frames (het staat stil) en krijgt
// daarna gewoon zijn pad. Pure regel, los te testen.
export const PATH_BUILDS_PER_FRAME = 4;
export const pathBudgetStats = { deferred: 0 };

export function consumePathBudget(budget) {
  if (!budget) return true; // geen budget meegegeven: ongewijzigd gedrag
  if (!(budget.left > 0)) { pathBudgetStats.deferred++; return false; }
  budget.left--;
  return true;
}
