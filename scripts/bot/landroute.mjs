// Spelbot (#312): planLandRoute in het Ommeland, puur. De bot volgt de GPS-lijn, maar die gaat niet om sloten
// heen; hier zoekt hij een droog tussenpunt loodrecht op de lijn en meldt waarom. De pagina-helft leest de kaart
// (isWater) en zet het punt op de route.
export const LAND = { omweg: 16, proef: 4, marge: 2.5 };

export function landOmweg({ ik, doel, isWater, omweg = LAND.omweg, proef = LAND.proef } = {}) {
  if (!ik || !doel) return { punt: doel || ik || null, droog: true, waarom: 'geen doel of plek' };
  if (typeof isWater !== 'function' || !isWater(doel.x, doel.y)) return { punt: { x: doel.x, y: doel.y }, droog: true, waarom: 'het doel is droog' };
  const dx = doel.x - ik.x, dy = doel.y - ik.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // loodrecht op de lijn
  for (let k = 1; k <= proef; k++) {
    const d = omweg * k;
    for (const teken of [1, -1]) {
      const x = ik.x + dx * 0.5 + nx * d * teken, y = ik.y + dy * 0.5 + ny * d * teken;
      if (!isWater(x, y)) return { punt: { x, y }, droog: true, waarom: 'droog tussenpunt links' + (teken < 0 ? '/rechts' : '') + ' op ' + Math.round(d) + ' m' };
    }
  }
  return { punt: { x: doel.x, y: doel.y }, droog: false, waarom: 'geen droog tussenpunt gevonden' };
}

// Is de omweg nog nodig? Zodra de rechte lijn naar het doel droog is, gaat de bot weer recht.
export function landRecht({ ik, doel, isWater } = {}) {
  if (!ik || !doel) return true;
  if (typeof isWater !== 'function') return true;
  const stappen = 8;
  for (let i = 1; i <= stappen; i++) {
    const t = i / stappen;
    if (isWater(ik.x + (doel.x - ik.x) * t, ik.y + (doel.y - ik.y) * t)) return false;
  }
  return true;
}
