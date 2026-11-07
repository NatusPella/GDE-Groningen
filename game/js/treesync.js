// #651: syncTrees bouwde bij elke wijziging in de ring alle boommatrices opnieuw
// (layoutTree, setMatrixAt, setColorAt, computeBoundingSphere). De ring schuift
// met elke stap een klein beetje, dus dat was bijna elke frame. Nu pas herbouwen
// bij een echte sprong: meer dan 8 m verplaatst of meer dan 8 bomen verschil.
export function treeSyncDue(px, py, lastX, lastY, count, lastCount, hiddenChanged, maxM = 8, maxN = 8) {
  if (hiddenChanged || lastX === null || lastY === null) return true;
  if (Math.abs(count - lastCount) > maxN) return true;
  return Math.hypot(px - lastX, py - lastY) > maxM;
}
