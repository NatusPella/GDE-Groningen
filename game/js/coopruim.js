// Samen spelen (#95): opruimen van wat een gast in de scene zette. Zonder three.js (alleen de vorm van een object met
// traverse, geometry en material), zodat de duurtest en een pure test dit kunnen dekken. Een gast bouwt de hele sessie
// voertuigen, poppetjes en bakens op en af; wat nergens meer in staat moet ook uit het geheugen van de grafische kaart.
// geometrie: eigen geometrie vrijgeven (echte voertuigmodellen delen die: dan false); materiaal: ook materialen (en hun kaart)
export function ruimMeshOp(scene, m, { geometrie = true, materiaal = false } = {}) {
  if (!m) return 0;
  if (scene && scene.remove) scene.remove(m);
  let n = 0;
  const op = (o) => {
    if (geometrie && o.geometry && o.geometry.dispose) { o.geometry.dispose(); n++; }
    if (materiaal && o.material) for (const mt of Array.isArray(o.material) ? o.material : [o.material]) { if (mt.map && mt.map.dispose) mt.map.dispose(); if (mt.dispose) { mt.dispose(); n++; } }
  };
  if (m.traverse) m.traverse(op); else op(m);
  return n;
}
