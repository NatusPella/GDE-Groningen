// The two quads of a place name board or signpost (streetfurniture3d.js rebuildBoards), pure.
// The front faces the traffic arriving along the travel direction `a`; text runs left to right
// for a driver looking along `a`. The back is a plain grey cell, so the text is never seen
// mirrored from behind (#228). Positions are three.js order (x, height, y).
//   boardQuads(b, frontCell, backCell, cols, rows, thick)
//     -> { pos: [x, h, y, ...], uv: [u, v, ...] } six vertices for each of the two quads

// Een bord zonder tekst is geen bord (#436): het vlak staat leeg in de wereld en de bordatlas is
// ondoorzichtig, dus een niet-getekend vakje wordt zwart. Deze regels zijn puur, zodat de atlas in
// streetfurniture3d.js en de tests (scripts/boardquad_test.mjs) dezelfde afspraak gebruiken.
// text: de regels van een bord (['Haren'] of ['↑ Haren', '← Zernike']); alles wat geen niet-lege
// regel is valt weg.
export function bordTekst(text) {
  const lijst = Array.isArray(text) ? text : text == null ? [] : [text];
  return lijst.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
}

// De tekst van één paneel van een portaalbord (0 = rechtdoor, 1 = de afrit); '' als er niets staat.
export function paneelTekst(text, p) {
  const lijst = Array.isArray(text) ? text : text == null ? [] : [text];
  const t = lijst[p];
  return typeof t === 'string' ? t.trim() : '';
}

// Heeft dit bord (of portaal) überhaupt tekst? Zo niet, dan komt er geen vlak in de wereld.
export const bordHeeftTekst = (b) => bordTekst(b && b.text).length > 0;

export function boardQuads(b, frontCell, backCell, cols, rows, w, hh, z) {
  const ca = Math.cos(b.a), sa = Math.sin(b.a);
  // across the travel direction: (-sa, ca)
  const rx = -sa, ry = ca;
  const corners = [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]].map(([u, v]) => [b.x + rx * u - ca * 0.06, z + v + hh / 2, b.y + ry * u - sa * 0.06]);
  const cell = (c) => {
    const col = c % cols, row = Math.floor(c / cols);
    return [col / cols, 1 - (row + 1) / rows, (col + 1) / cols, 1 - row / rows];
  };
  const pos = [], uv = [];
  const [fu0, fv0, fu1, fv1] = cell(frontCell);
  for (const [i, u, v] of [[0, fu0, fv0], [1, fu1, fv0], [2, fu1, fv1], [0, fu0, fv0], [2, fu1, fv1], [3, fu0, fv1]]) { pos.push(...corners[i]); uv.push(u, v); }
  // the back: the same corners, the other winding, a plain cell, a hair behind the front
  const [bu0, bv0, bu1, bv1] = cell(backCell);
  const off = [ca * 0.01, 0, sa * 0.01];
  for (const [i, u, v] of [[0, bu0, bv0], [2, bu1, bv1], [1, bu1, bv0], [0, bu0, bv0], [3, bu0, bv1], [2, bu1, bv1]]) { pos.push(corners[i][0] + off[0], corners[i][1], corners[i][2] + off[2]); uv.push(u, v); }
  return { pos, uv };
}
