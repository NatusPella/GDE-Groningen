// Low-poly shop icons (issue #170), drawn in code: flat polygons on a 24x24 grid, one colour
// (currentColor) with lighter and darker facets. One per kind of item; shoplist.js picks the id.
// d: the body; l: lighter facets; k: darker facets.
const P = (d, l = '', k = '') => ({ d, l, k });

export const SHOP_ICONS = {
  eten: P('M4 14l4-7h8l4 7v3H4z', 'M8 7h8l-2 7H6z', 'M4 17h16v2H4z'),
  drank: P('M7 5h10l-1.5 15h-7z', 'M7.6 9h8.8l-.4 4H8z', 'M12 2l1.4 3h-2.8z'),
  kleding: P('M8 3l4 2 4-2 5 4-3 3-2-1v11H8V9l-2 1-3-3z', 'M8 3l4 2 4-2-4 5z', 'M8 9v11h4V8z'),
  schoen: P('M3 15l5-1 3-5 3 3 6 1 1 5H3z', 'M8 14l3-5 3 3z', 'M3 18h19v2H3z'),
  kapsel: P('M6 4h12l1 6-3 1v9H8v-9l-3-1z', 'M6 4h12l-6 6z', 'M8 11h8v3H8z'),
  fiets: P('M3 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0zm10 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM7 17l4-8h5l3 8h-2l-2.4-6H12l-3 6z', 'M15 7h4v2h-4z', 'M10 7h3v2h-3z'),
  band: P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 3l6 3-3 3z', 'M12 21l-6-3 3-3z'),
  bel: P('M12 4a6 6 0 0 1 6 6v5l2 3H4l2-3v-5a6 6 0 0 1 6-6z', 'M12 4a6 6 0 0 0-6 6l6 1z', 'M9.5 20h5a2.5 2.5 0 0 1-5 0z'),
  wapen: P('M2 8h14l2 2h4v3h-6l-1.5 1.5V19h-4v-5L9 13H2z', 'M2 8h14l-2 3H2z', 'M10 14l1.5 1.5V19H8v-5z'),
  knuppel: P('M4 20l10-10 2 2L6 22z M13 3l8 8-3 3-8-8z', 'M13 3l8 8-2 2-7-7z', 'M4 20l10-10'),
  vest: P('M7 3l5 2 5-2 3 4v13H4V7z', 'M7 3l5 2-1 6H4V7z', 'M12 5l5-2 3 4v4h-7z'),
  knaller: P('M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z', 'M12 2l2.5 6.5H9.5z', 'M12 17l-5.5 4L8 13.5z'),
  elektronica: P('M3 5h18v11H3zM9 19h6v2H9z', 'M5 7h14v7H5z', 'M5 7h7l-3 7H5z'),
  verf: P('M4 4h13l3 3v6h-9v3h-2v5H8v-5H7v-3h4V7H4z', 'M4 4h13v3H4z', 'M11 16h-1v5H8v-5z'),
  tuning: P('M13 2L5 13h6l-1 9 9-12h-6z', 'M13 2L5 13h6z', 'M13 10l6 0-9 12 1-9z'),
  reparatie: P('M14 3a5 5 0 0 0-5 6.5L3 16l3 3 6.5-6A5 5 0 0 0 19 8l-3 2-3-3z', 'M14 3l5 5-3 2-3-3z', 'M3 16l3 3 4-4-3-3z'),
  cadeau: P('M3 9h18v4H3zM5 13h14v8H5z', 'M5 13h6v8H5z', 'M11 9h2v12h-2zM8 4l4 5 4-5-2-1-2 3-2-3z'),
  bloem: P('M12 3l3 4 4-1-1 4 3 3-4 1-1 4-4-2-4 2-1-4-4-1 3-3-1-4 4 1z', 'M12 3l3 4-3 3-3-3z', 'M11 15h2v6h-2z'),
  meubel: P('M5 10a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3H5zM3 13h18v4H3zM5 17h2v3H5zM17 17h2v3h-2z', 'M5 10a3 3 0 0 1 3-3h4v6H5z', 'M3 13h18v2H3z'),
  kras: P('M3 6h18v12H3z', 'M5 8h14v8H5z', 'M5 8l5 8H5zM13 8h6v3z'),
  auto: P('M3 14l2-5a3 3 0 0 1 3-2h8a3 3 0 0 1 3 2l2 5v4H3zM6 18v2H4v-2zM20 18v2h-2v-2z', 'M7 9h10l1.5 4h-13z', 'M3 15h18v3H3z'),
  boot: P('M3 14h18l-3 6H6zM11 3v9H5z', 'M13 6l5 6h-5z', 'M3 14h18l-1 2H4z'),
  heli: P('M3 5h18v2H3zM11 7h2v3h-2zM5 11h11a4 4 0 0 1 4 4v1h-6l-2 2H5z', 'M5 11h11l-3 4H5z', 'M14 16h6v3h-6z'),
  geld: P('M3 7h18v10H3z', 'M5 9h14v6H5z', 'M9.5 12a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z'),
  standaard: P('M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 3l8 4.5-8 4.5-8-4.5z', 'M12 12v9l-8-4.5v-9z'),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Inline SVG of an icon (currentColor); unknown ids give the standard crate.
export function shopIconSvg(id, cls = 'sm-ic') {
  const ic = SHOP_ICONS[id] || SHOP_ICONS.standaard;
  return `<svg class="${esc(cls)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<path d="${ic.d}" fill="currentColor"/>` +
    (ic.l ? `<path d="${ic.l}" fill="#fff" fill-opacity="0.28"/>` : '') +
    (ic.k ? `<path d="${ic.k}" fill="#000" fill-opacity="0.26"/>` : '') + '</svg>';
}
