// #651: syncTrees bouwde bij elke wijziging in de ring alle boommatrices opnieuw
// (layoutTree, setMatrixAt, setColorAt, computeBoundingSphere). De ring schuift
// met elke stap een klein beetje, dus dat was bijna elke frame. Nu pas herbouwen
// bij een echte sprong: meer dan 8 m verplaatst of meer dan 8 bomen verschil.
// #786: een gestroomde tegel kan de boomlijst ook zonder beweging wijzigen; de
// bronversie (map.geoVer, per tegel opgehoogd) forceert dan meteen een rebuild,
// anders blijven nieuwe bomen onzichtbaar tot de speler meer dan 8 m loopt.
export function treeSyncDue(px, py, lastX, lastY, count, lastCount, hiddenChanged, sourceVer, lastSourceVer, maxM = 8, maxN = 8) {
  if (hiddenChanged || lastX === null || lastY === null) return true;
  if (sourceVer !== lastSourceVer) return true; // #786: nieuwe tegel of kaartwissel
  if (Math.abs(count - lastCount) > maxN) return true;
  return Math.hypot(px - lastX, py - lastY) > maxM;
}
