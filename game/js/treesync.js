// #651: syncTrees bouwde bij elke wijziging in de ring alle boommatrices opnieuw
// (layoutTree, setMatrixAt, setColorAt, computeBoundingSphere). De ring schuift
// met elke stap een klein beetje, dus dat was bijna elke frame. Nu pas herbouwen
// bij een echte sprong: meer dan 8 m verplaatst.
// #760: die check stond ná de treesNear-query, dus de query zelf (rasterwandeling,
// nieuwe array, filter) draaide alsnog elke frame. De check gaat nu vóór de query;
// de oude telling "> 8 bomen verschil" is daarmee vervangen door de bronversie:
// alleen een gestroomde tegel of een kaartwissel kan de boomlijst buiten de speler
// om wijzigen.
// #786: die bronversie (map.geoVer, per tegel opgehoogd) forceert de rebuild ook bij
// stilstand, zodat een nieuwe tegel zijn bomen meteen toont.
export function treeSyncDue(px, py, lastX, lastY, hiddenChanged, sourceVer, lastSourceVer, maxM = 8) {
  if (hiddenChanged || lastX === null || lastY === null) return true;
  if (sourceVer !== lastSourceVer) return true; // #786: nieuwe tegel of kaartwissel
  return Math.hypot(px - lastX, py - lastY) > maxM;
}
