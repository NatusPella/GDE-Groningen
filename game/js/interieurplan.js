// Walkable ground floors of the Forum, the Martinikerk, the Der Aa-kerk, the
// Korenbeurs, the station hall, the Sint-Jozefkathedraal, the Stadsschouwburg,
// the Remonstrantse Kerk and the Goudkantoor (issue #22), as data in the same shape as museumplan.js: oriented
// rectangles in world coordinates; where two overlap there is a doorway, and a
// `deur` room reaching past the outline is the way in from the street.
// Each building has a frame (centre + angle of its footprint's long axis) so the
// rooms and the furniture are written in local metres: a = along the long axis,
// c = across it. No three.js here: mapdata.js attaches the rooms to the
// footprints at load, interieur3d.js draws them, passages.js/collision.js walk.
// Names on signs and in shops are invented (AGENTS.md: no real brands).

function frame(cx, cy, th) { return { cx, cy, ux: Math.cos(th), uy: Math.sin(th) }; }

// room in local metres -> world room
function mk(f, id, a, c, lenU, lenV, h, extra = {}) {
  return {
    id,
    cx: Math.round((f.cx + a * f.ux - c * f.uy) * 100) / 100,
    cy: Math.round((f.cy + a * f.uy + c * f.ux) * 100) / 100,
    ux: f.ux, uy: f.uy, hl: lenU / 2, hw: lenV / 2, h, ...extra,
  };
}

const STONE = { wall: 0xe4dccb, floor: 0xb9b2a4, ceil: 0xf1ede2 };
const DOOR = { wall: 0xd9d2c2, floor: 0xb9b2a4, ceil: 0xd9d2c2 };

// Decor kinds (interieur3d.js knows how to draw each):
//   bank {a,c,len}  kast {a,side,len}  balie {a,c,len}  zuil {a,c,r,h}
//   kraam {a,c,color} doek {a,side,w,h,color}  scherm {a,side,w}  pad {a,c,len,wid,color}
//   altaar {a,c}  kansel {a,c}  vont {a,c}  orgel {a,side}  stoelen {a,c,rows,cols}
//   kaars {a,c}  plant {a,c}  tafel {a,c}
export const INTERIEUREN = [];

// --- Forum Groningen: foyer, leeszaal, filmzaal and expo -------------------------
{
  const f = frame(356.5, 57.74, -0.2033);
  const R = (...a) => mk(f, ...a);
  INTERIEUREN.push({
    id: 'forum',
    match: { landmark: 'Forum Groningen' },
    show: 70,
    rooms: [
      R('foyer', 0, 0, 34, 18, 3.4, { name: 'Foyer', style: { wall: 0xdfe6ea, floor: 0xc9c9c2, ceil: 0xf3f4f1 } }),
      R('filmzaal', -25, -2, 16, 14, 3.4, { name: 'Filmzaal De Kiekdeuse', style: { wall: 0x2d2a3a, floor: 0x4a2f3a, ceil: 0x1c1a24 } }),
      R('expo', 26, 4, 16, 18, 3.4, { name: 'Expo', style: { wall: 0xf1f1ee, floor: 0xa9a59a, ceil: 0xf6f6f3 } }),
      R('leeszaal', 0, -11.3, 26, 4.6, 3.4, { name: 'Leeszaal', style: { wall: 0xefe6d2, floor: 0x9b7650, ceil: 0xf4f0e6 } }),
      R('deurFilm', -17.2, -2, 3.2, 3.2, 2.8, { deur: true, style: DOOR }),
      R('deurLees', 0, -9.2, 3.2, 3.6, 2.8, { deur: true, style: DOOR }),
      R('deurExpo', 17, 4, 3.2, 3.2, 2.8, { deur: true, style: DOOR }),
      R('ingangZ', 10, 14.4, 4.4, 11, 3.0, { deur: true, name: 'Hoofdingang', style: DOOR }),
      R('ingangO', 28, 16.4, 3.4, 7, 3.0, { deur: true, name: 'Ingang Expo', style: DOOR }),
    ],
    decor: [
      { kind: 'balie', room: 'foyer', a: -6, c: -4, len: 5 },
      { kind: 'bank', room: 'foyer', a: 8, c: -6, len: 2 },
      { kind: 'bank', room: 'foyer', a: -10, c: 5, len: 2 },
      { kind: 'tafel', room: 'foyer', a: 2, c: 4 },
      { kind: 'plant', room: 'foyer', a: 14, c: 6 },
      { kind: 'plant', room: 'foyer', a: -14, c: 6 },
      { kind: 'kast', room: 'leeszaal', a: -8, side: -1, len: 6 },
      { kind: 'kast', room: 'leeszaal', a: 5, side: -1, len: 6 },
      { kind: 'tafel', room: 'leeszaal', a: -6, c: 0.5 },
      { kind: 'tafel', room: 'leeszaal', a: 6, c: 0.5 },
      { kind: 'scherm', room: 'filmzaal', a: -3, side: -1, w: 7 },
      { kind: 'stoelen', room: 'filmzaal', a: 2.5, c: 0, rows: 4, cols: 4 },
      { kind: 'doek', room: 'expo', a: -3, side: 1, w: 2.6, h: 1.6, color: 0x4f7fa8 },
      { kind: 'doek', room: 'expo', a: 2.4, side: 1, w: 2.2, h: 1.4, color: 0xd6a53a },
      { kind: 'doek', room: 'expo', a: 0, side: -1, w: 3.0, h: 1.5, color: 0x6a9f55 },
      { kind: 'bank', room: 'expo', a: 0, c: 0, len: 2 },
    ],
    signs: [
      { room: 'foyer', a: 4, side: -1, y: 2.5, w: 4.4, lines: ['FORUM GRONINGEN', 'Foyer · Balie · Terras'], bg: '#27323a', fg: '#f4efe2' },
      { room: 'leeszaal', a: 0, side: -1, y: 2.5, w: 3.2, lines: ['LEESZAAL', 'Stilte alsjeblieft'], bg: '#3b2c1c', fg: '#f4efe2' },
      { room: 'filmzaal', a: 0, side: 1, y: 2.3, w: 3.2, lines: ['FILMZAAL', 'De Kiekdeuse'], bg: '#1c1a24', fg: '#f0c24e' },
      { room: 'expo', a: 0, side: 1, y: 2.5, w: 3.6, lines: ['EXPO', 'Zomer in Grunn'], bg: '#f1f1ee', fg: '#1c1c1c' },
    ],
  });
}

// --- Martinikerk: schip, koor, torenhal ------------------------------------------
{
  const f = frame(258.78, -7.45, 2.7099);
  const R = (...a) => mk(f, ...a);
  const kerk = { wall: 0xd8cdb2, floor: 0x8f8a80, ceil: 0xe9e1cc };
  INTERIEUREN.push({
    id: 'martinikerk',
    match: { landmark: 'Martinikerk' },
    show: 80,
    rooms: [
      R('schip', 0, 0, 46, 24, 14, { name: 'Schip', style: kerk }),
      R('koor', -28.5, 0, 13, 11, 13, { name: 'Koor', style: { ...kerk, floor: 0x7b756a } }),
      R('torenhal', 30, 0, 16, 12, 12, { name: 'Torenhal', style: { ...kerk, wall: 0xc9bd9f } }),
      R('portaalZ', 8, 13.4, 4.4, 7, 4.5, { deur: true, name: 'Zuidportaal', style: DOOR }),
      R('portaalN', -8, -13.2, 4.4, 7.4, 4.5, { deur: true, name: 'Noordportaal', style: DOOR }),
    ],
    decor: [
      ...[-14, -10, -6, -2, 2, 6, 10, 14].flatMap((a) => [{ kind: 'zuil', room: 'schip', a, c: -6, r: 0.55, h: 13 }, { kind: 'zuil', room: 'schip', a, c: 6, r: 0.55, h: 13 }]),
      { kind: 'pad', room: 'schip', a: 0, c: 0, len: 44, wid: 1.6, color: 0x7a2a2a },
      ...[-15, -10.5, -6, -1.5, 3, 7.5, 12].flatMap((a) => [{ kind: 'bank', room: 'schip', a, c: -3.2, len: 1.1, pew: true }, { kind: 'bank', room: 'schip', a, c: 3.2, len: 1.1, pew: true }]),
      { kind: 'altaar', room: 'koor', a: -4.5, c: 0 },
      { kind: 'kansel', room: 'schip', a: -12, c: 5.6 },
      { kind: 'orgel', room: 'torenhal', a: 7.4, side: 0 },
      { kind: 'vont', room: 'torenhal', a: -2, c: 0 },
      { kind: 'kaars', room: 'koor', a: -3, c: -3 },
      { kind: 'kaars', room: 'koor', a: -3, c: 3 },
    ],
    signs: [
      { room: 'torenhal', a: 0, side: -1, y: 2.6, w: 3.4, lines: ['MARTINIKERK', 'Open kerk · Stilte graag'], bg: '#2b2418', fg: '#f4efe2' },
      { room: 'portaalZ', a: 0, side: -1, y: 3.1, w: 2.2, lines: ['INGANG', 'Zuidportaal'], bg: '#f4efe2', fg: '#1c1c1c' },
    ],
  });
}

// --- Der Aa-kerk: schip, koor, torenhal ------------------------------------------
{
  // +a runs west (the tower of the OSM data stands at the west end), the choir lies east
  const f = frame(-170.81, 340.25, -0.3293 + Math.PI);
  const R = (...a) => mk(f, ...a);
  const kerk = { wall: 0xe0d6bd, floor: 0x96907f, ceil: 0xf0e8d4 };
  INTERIEUREN.push({
    id: 'aakerk',
    match: { landmark: 'Der Aa-kerk', type: 'church' },
    show: 70,
    rooms: [
      R('schip', -3, 0, 36, 24, 12, { name: 'Schip', style: kerk }),
      R('koor', -25.5, 0, 11, 11, 11, { name: 'Koor', style: { ...kerk, floor: 0x80796a } }),
      R('torenhal', 21.5, 0, 14, 12, 11, { name: 'Torenhal', style: { ...kerk, wall: 0xcfc3a5 } }),
      R('portaalZ', -8, -15.25, 4.4, 8, 4.2, { deur: true, name: 'Zuidportaal', style: DOOR }),
      R('portaalN', 11.5, 14.2, 4.4, 5.5, 4.2, { deur: true, name: 'Noordportaal', style: DOOR }),
    ],
    decor: [
      ...[-14, -9, -4, 1, 6, 11].flatMap((a) => [{ kind: 'zuil', room: 'schip', a, c: -5.5, r: 0.5, h: 11.5 }, { kind: 'zuil', room: 'schip', a, c: 5.5, r: 0.5, h: 11.5 }]),
      { kind: 'pad', room: 'schip', a: 0, c: 0, len: 34, wid: 1.4, color: 0x2f4f7a },
      ...[-12, -8, -4, 0, 4, 8].flatMap((a) => [{ kind: 'bank', room: 'schip', a, c: -2.8, len: 1.0, pew: true }, { kind: 'bank', room: 'schip', a, c: 2.8, len: 1.0, pew: true }]),
      { kind: 'altaar', room: 'koor', a: -3, c: 0 },
      { kind: 'kansel', room: 'schip', a: -10, c: 5.6 },
      { kind: 'vont', room: 'torenhal', a: -1, c: 0 },
      { kind: 'kaars', room: 'koor', a: -2, c: -3 },
      { kind: 'kaars', room: 'koor', a: -2, c: 3 },
      { kind: 'tafel', room: 'torenhal', a: 3, c: -3 },
    ],
    signs: [
      { room: 'torenhal', a: 0, side: -1, y: 2.6, w: 3.4, lines: ['DER AA-KERK', 'Verhalenavond op donderdag'], bg: '#1f2c3d', fg: '#f4efe2' },
      { room: 'portaalZ', a: 0, side: -1, y: 3.0, w: 2.2, lines: ['INGANG', 'Zuidportaal'], bg: '#f4efe2', fg: '#1c1c1c' },
    ],
  });
}

// --- Korenbeurs: voorhal in het gebouw met zuilen, beurshal erachter -------------
{
  // +a runs west, towards the Der Aa-kerk; the portico faces east at -a
  const f = frame(-105.49, 311.26, 2.6992);
  const R = (...a) => mk(f, ...a);
  INTERIEUREN.push({
    id: 'korenbeurs',
    match: { name: 'Korenbeurs' },
    show: 70,
    rooms: [
      R('voorhal', -23, 0, 12, 20, 7, { name: 'Voorhal', style: { wall: 0xe3d3b6, floor: 0xa89f8d, ceil: 0xf0e8d6 } }),
      R('beurshal', 5.5, 0, 34, 20, 9, { name: 'Beurshal', style: { wall: 0xc98f78, floor: 0x9a8a72, ceil: 0xdfe8ea } }),
      R('deurHal', -14.25, 0, 5.9, 4.4, 4.2, { deur: true, style: DOOR }),
      R('ingang', -30.2, 0, 3.4, 4.4, 3.6, { deur: true, name: 'Zuilengang', style: DOOR }),
    ],
    decor: [
      { kind: 'zuil', room: 'voorhal', a: -3, c: -5, r: 0.45, h: 6.8 },
      { kind: 'zuil', room: 'voorhal', a: -3, c: 5, r: 0.45, h: 6.8 },
      { kind: 'balie', room: 'voorhal', a: -1, c: -8, len: 4 },
      { kind: 'bank', room: 'voorhal', a: -5, c: 8.6, len: 2 },
      ...[-12, -6, 0, 6, 12].flatMap((a, i) => [
        { kind: 'kraam', room: 'beurshal', a, c: -6.5, color: [0xd9812b, 0x5f8f4a, 0x3d6fa5, 0xc94a4a, 0xe0b73a][i] },
        { kind: 'kraam', room: 'beurshal', a, c: 6.5, color: [0x3d6fa5, 0xc94a4a, 0xe0b73a, 0xd9812b, 0x5f8f4a][i] },
      ]),
      { kind: 'tafel', room: 'beurshal', a: -3, c: 0 },
      { kind: 'tafel', room: 'beurshal', a: 9, c: 0 },
      { kind: 'bank', room: 'beurshal', a: 3, c: 0, len: 2 },
    ],
    signs: [
      { room: 'voorhal', a: 0, side: -1, y: 4.6, w: 5.2, lines: ['KORENBEURS', 'Zomermarkt · Graanhandel Van der Stroop'], bg: '#3b1d14', fg: '#f0d79a' },
      { room: 'beurshal', a: 0, side: 1, y: 5.6, w: 5.2, lines: ['BEURSHAL', 'Kraam Wiebelwerk · Streekproducten'], bg: '#f1e6cc', fg: '#2b2418' },
    ],
  });
}

// --- Hoofdstation: stationshal met loketten, wachtruimte en kiosken ---------------
{
  // a runs along the long front (about east), c across it
  const f = frame(-46.94, 952.82, -0.068);
  const R = (...a) => mk(f, ...a);
  const hal = { wall: 0xd8d2c0, floor: 0xaaa699, ceil: 0xe9e6da };
  INTERIEUREN.push({
    id: 'hoofdstation',
    match: { landmark: 'Hoofdstation Groningen' },
    show: 80,
    rooms: [
      R('stationshal', 0, 1, 26, 16, 9, { name: 'Stationshal', style: hal }),
      R('wachtruimte', -22, 4, 18, 8, 5, { name: 'Wachtruimte', style: { wall: 0xcfd6d4, floor: 0x8e9a98, ceil: 0xe6eae8 } }),
      R('kiosken', 22, 4, 18, 8, 5, { name: 'Kioskengang', style: { wall: 0xe6d9b8, floor: 0xa6a094, ceil: 0xf0eadb } }),
      R('deurWacht', -12.5, 4, 4, 4, 3.2, { deur: true, style: DOOR }),
      R('deurKiosk', 12.5, 4, 4, 4, 3.2, { deur: true, style: DOOR }),
      R('ingangN', 0, 9.4, 5, 3.6, 3.6, { deur: true, name: 'Stadszijde', style: DOOR }),
      R('ingangZ', 0, -8.8, 5, 4.4, 3.6, { deur: true, name: 'Perronzijde', style: DOOR }),
    ],
    decor: [
      { kind: 'balie', room: 'stationshal', a: -7, c: 4, len: 7 },
      { kind: 'scherm', room: 'stationshal', a: 6, side: 1, w: 8 },
      { kind: 'bank', room: 'stationshal', a: 8, c: -3, len: 2.4 },
      { kind: 'bank', room: 'stationshal', a: 11, c: -3, len: 2.4 },
      { kind: 'zuil', room: 'stationshal', a: -10, c: -5, r: 0.4, h: 8.8 },
      { kind: 'zuil', room: 'stationshal', a: 10, c: 5, r: 0.4, h: 8.8 },
      { kind: 'plant', room: 'stationshal', a: 0, c: 0 },
      { kind: 'bank', room: 'wachtruimte', a: -4, c: 0, len: 2.4 },
      { kind: 'bank', room: 'wachtruimte', a: 2, c: 0, len: 2.4 },
      { kind: 'bank', room: 'wachtruimte', a: 8, c: 0, len: 2.4 },
      { kind: 'scherm', room: 'wachtruimte', a: -4, side: 1, w: 4 },
      { kind: 'kraam', room: 'kiosken', a: -5, c: -2, color: 0xd9812b },
      { kind: 'kraam', room: 'kiosken', a: 0, c: -2, color: 0x3d6fa5 },
      { kind: 'kraam', room: 'kiosken', a: 5, c: -2, color: 0x5f8f4a },
      { kind: 'tafel', room: 'kiosken', a: 0, c: 2 },
    ],
    signs: [
      { room: 'stationshal', a: 0, side: 1, y: 6.4, w: 6, lines: ['HOOFDSTATION GRONINGEN', 'Loketten · Reisinformatie'], bg: '#1f2f4a', fg: '#f4efe2' },
      { room: 'wachtruimte', a: 0, side: -1, y: 3.4, w: 3.2, lines: ['WACHTRUIMTE', 'Trein vertraagd? Neem een kopje'], bg: '#27323a', fg: '#f4efe2' },
      { room: 'kiosken', a: 0, side: -1, y: 3.4, w: 3.6, lines: ['KIOSKEN', 'Broodjes van Wiebelwerk'], bg: '#3b2c1c', fg: '#f0d79a' },
    ],
  });
}

// --- Sint-Jozefkathedraal: koor, schip, dwarsschip en torenhal --------------------
{
  // a runs along the nave (choir at -a), c across it
  const f = frame(532.64, 504.08, 4.1244);
  const R = (...a) => mk(f, ...a);
  const kerk = { wall: 0xddd2b8, floor: 0x8c877c, ceil: 0xede5d0 };
  INTERIEUREN.push({
    id: 'jozefkathedraal',
    match: { name: 'Sint-Jozefkathedraal' },
    show: 80,
    rooms: [
      R('koor', -19, -6, 12, 12, 13, { name: 'Koor', style: { ...kerk, floor: 0x77716a } }),
      R('schip', -4, -4.5, 22, 17, 15, { name: 'Schip', style: kerk }),
      R('dwarsschip', 12, 0, 12, 26, 14, { name: 'Dwarsschip', style: kerk }),
      R('torenhal', 19.5, 8, 5, 5.8, 12, { name: 'Torenhal', style: { ...kerk, wall: 0xc9bd9f } }),
      R('portaalZ', 12, 14.8, 4.4, 4.6, 4.6, { deur: true, name: 'Zuidportaal', style: DOOR }),
      R('portaalN', 0, -14.8, 4.4, 4.6, 4.6, { deur: true, name: 'Noordportaal', style: DOOR }),
    ],
    decor: [
      ...[-9, -4, 1, 6].flatMap((a) => [{ kind: 'zuil', room: 'schip', a, c: -6.5, r: 0.55, h: 14 }, { kind: 'zuil', room: 'schip', a, c: 6.5, r: 0.55, h: 14 }]),
      { kind: 'pad', room: 'schip', a: 0, c: 0, len: 20, wid: 1.6, color: 0x6a2030 },
      ...[-9, -5, -1, 3].flatMap((a) => [{ kind: 'bank', room: 'schip', a, c: -3, len: 1.1, pew: true }, { kind: 'bank', room: 'schip', a, c: 3, len: 1.1, pew: true }]),
      { kind: 'altaar', room: 'koor', a: -3.5, c: 0 },
      { kind: 'kansel', room: 'schip', a: -8, c: 7.4 },
      { kind: 'orgel', room: 'torenhal', a: 2, side: 0 },
      { kind: 'vont', room: 'torenhal', a: -1, c: 0 },
      { kind: 'kaars', room: 'dwarsschip', a: -1, c: -9 },
      { kind: 'kaars', room: 'dwarsschip', a: -1, c: 9 },
      { kind: 'kaars', room: 'koor', a: -2, c: -3 },
      { kind: 'kaars', room: 'koor', a: -2, c: 3 },
    ],
    signs: [
      { room: 'torenhal', a: 0, side: -1, y: 2.8, w: 3.2, lines: ['SINT-JOZEFKATHEDRAAL', 'Open kerk · Kaarsje opsteken kan'], bg: '#2b2418', fg: '#f4efe2' },
      { room: 'portaalZ', a: 0, side: -1, y: 3.2, w: 2.2, lines: ['INGANG', 'Zuidportaal'], bg: '#f4efe2', fg: '#1c1c1c' },
    ],
  });
}

// --- Stadsschouwburg: foyer en zaal met toneel ------------------------------------
{
  // a runs from the stage (-a) to the foyer (+a)
  const f = frame(466.78, -157.22, -0.5757);
  const R = (...a) => mk(f, ...a);
  INTERIEUREN.push({
    id: 'schouwburg',
    match: { name: 'Stadsschouwburg' },
    show: 70,
    rooms: [
      R('zaal', -8, 0, 28, 24, 12, { name: 'Zaal', style: { wall: 0x4a2a30, floor: 0x5a3a3a, ceil: 0x2c1a1e } }),
      R('foyer', 19, -2.5, 12, 15, 5, { name: 'Foyer', style: { wall: 0xe9dcc2, floor: 0xa89878, ceil: 0xf2eadb } }),
      R('deurZaal', 9.5, -2.5, 8, 4, 3.2, { deur: true, style: DOOR }),
      R('ingang', 19, -11.4, 4.4, 4.4, 3.4, { deur: true, name: 'Hoofdingang', style: DOOR }),
      R('ingangZij', -8, 13.4, 4, 4.4, 3.2, { deur: true, name: 'Artiesteningang', style: DOOR }),
    ],
    decor: [
      { kind: 'pad', room: 'zaal', a: -11, c: 0, len: 6, wid: 20, color: 0x2a1a14 },
      { kind: 'doek', room: 'zaal', a: -12, side: -1, w: 6, h: 6, color: 0x8a1f2d },
      { kind: 'doek', room: 'zaal', a: -12, side: 1, w: 4, h: 5, color: 0x8a1f2d },
      { kind: 'stoelen', room: 'zaal', a: -5, c: 0, rows: 5, cols: 6 },
      { kind: 'stoelen', room: 'zaal', a: 4, c: 0, rows: 3, cols: 6 },
      { kind: 'balie', room: 'foyer', a: 1, c: 4, len: 5 },
      { kind: 'tafel', room: 'foyer', a: -2, c: -2 },
      { kind: 'tafel', room: 'foyer', a: 3, c: -4 },
      { kind: 'plant', room: 'foyer', a: -4, c: 5 },
      { kind: 'plant', room: 'foyer', a: 4, c: 5 },
    ],
    signs: [
      { room: 'foyer', a: 0, side: 1, y: 3.6, w: 4.4, lines: ['STADSSCHOUWBURG', 'Vanavond: De Kikkerkoning'], bg: '#3b1018', fg: '#f0d79a' },
      { room: 'zaal', a: 0, side: -1, y: 5.5, w: 3.4, lines: ['ZAAL', 'Telefoons uit, lichten dimmen'], bg: '#1c1a24', fg: '#f0c24e' },
    ],
  });
}

// --- Remonstrantse Kerk: kerkzaal en bijzaal --------------------------------------
{
  const f = frame(183.73, 659.92, -1.9177);
  const R = (...a) => mk(f, ...a);
  INTERIEUREN.push({
    id: 'remonstrants',
    match: { name: 'Remonstrantse Kerk' },
    show: 60,
    rooms: [
      R('kerkzaal', -2, 4.5, 18, 12, 8, { name: 'Kerkzaal', style: { wall: 0xe9e1cc, floor: 0x9a8566, ceil: 0xf4eedd } }),
      R('bijzaal', 8.5, 4, 5.5, 8, 4, { name: 'Bijzaal', style: { wall: 0xefe6d2, floor: 0xa9a08c, ceil: 0xf4f0e6 } }),
      R('deurZij', 0, -2.8, 3, 4.8, 3.2, { deur: true, name: 'Ingang', style: DOOR }),
      R('deurTuin', 2, 11.6, 3, 3.4, 3.2, { deur: true, name: 'Tuindeur', style: DOOR }),
    ],
    decor: [
      ...[-5, -2, 1, 4, 7].flatMap((a) => [{ kind: 'bank', room: 'kerkzaal', a, c: -3, len: 1.1, pew: true }, { kind: 'bank', room: 'kerkzaal', a, c: 3, len: 1.1, pew: true }]),
      { kind: 'kansel', room: 'kerkzaal', a: -8.5, c: 0 },
      { kind: 'orgel', room: 'kerkzaal', a: 8, side: 1 },
      { kind: 'tafel', room: 'bijzaal', a: 0, c: 0 },
      { kind: 'plant', room: 'bijzaal', a: 2, c: 3 },
    ],
    signs: [
      { room: 'kerkzaal', a: 0, side: -1, y: 2.6, w: 3.2, lines: ['REMONSTRANTSE KERK', 'Koffie na de dienst'], bg: '#2b2418', fg: '#f4efe2' },
    ],
  });
}

// --- Goudkantoor: kleine streekwinkel in het oude kantoor -------------------------
{
  const f = frame(86.43, 111.28, 2.6286);
  const R = (...a) => mk(f, ...a);
  INTERIEUREN.push({
    id: 'goudkantoor',
    match: { landmark: 'Goudkantoor' },
    show: 40,
    rooms: [
      R('winkel', 0, 0, 7, 6.4, 3.6, { name: 'Streekwinkel', style: { wall: 0xe3cfa6, floor: 0x9b7650, ceil: 0xefe3c6 } }),
      R('deurGoud', 0, 4.1, 2.4, 3, 2.8, { deur: true, name: 'Ingang', style: DOOR }),
    ],
    decor: [
      { kind: 'balie', room: 'winkel', a: -1, c: -2.2, len: 3 },
      { kind: 'kast', room: 'winkel', a: 0, side: -1, len: 5 },
      { kind: 'tafel', room: 'winkel', a: 1.5, c: 1 },
    ],
    signs: [
      { room: 'winkel', a: 0, side: 1, y: 2.7, w: 2.4, lines: ['GOUDKANTOOR', 'Streekwinkel De Gouden Kruik'], bg: '#3b2c1c', fg: '#f0d79a' },
    ],
  });
}

// the building (from the map's list) an interior belongs to, or null
export function interiorFor(b) {
  for (const it of INTERIEUREN) {
    const m = it.match;
    if (b.parts) continue; // the museum has its own plan
    if ((m.landmark && b.landmark === m.landmark) || (m.name && b.name === m.name)) {
      if (m.type && b.type !== m.type) continue;
      return it;
    }
  }
  return null;
}

export function attachInteriorPlans(buildings) {
  const out = [];
  for (const b of buildings) {
    if (b.rooms) continue;
    const it = interiorFor(b);
    if (!it) continue;
    b.rooms = it.rooms;
    b.noPassages = true;
    b.interior = it;
    out.push(b);
  }
  return out;
}
