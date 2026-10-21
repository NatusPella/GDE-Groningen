import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix } from './pixelart3d.js';
import { hash2 as hash } from './rng.js';

// Landmark kits (docs/PROVINCIE-PLAN.md 3b, LK1): a recognisable building
// for a place from its OSM data. Data in (kind, name, outline, tags), plain
// parameters out (landmarkParams), geometry per level of detail out
// (landmarkGeometry). No scene, no map, no countryside: the world builder
// can call it for any place in the province (landmarklayer3d.js draws it).
//
// Kits: church (nave from the outline, choir, west tower / roof turret /
// free bell tower, saddle roof, spire or needle, lean, ruin, wierde with a
// churchyard wall and lime trees), tower (a free bell tower or a lookout),
// mill (stellingmolen, grondzeiler, windmotor; the sails are their own
// geometry so they can turn), borg (house with a hipped roof, stepped
// gables and a stair tower).
//
// Geometry: local metres, the long axis along +x (a church's tower west,
// at -x), y up, origin on the outline's centre; vertex colours, flat
// normals. Groups: 0 body, 1 glow (clock faces, a door lamp; lit at night),
// 2 glass (lit a little at night). LOD 0: everything; 1: masses, roofs,
// towers (no windows, buttresses, trees, graves); 2: the skyline outline
// (tower or mill and a block for the rest).

export const LOD_FULL = 0, LOD_MASS = 1, LOD_SKY = 2;
const G_BODY = 0, G_GLOW = 1, G_GLASS = 2;

// --- small helpers ---------------------------------------------------------

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function year(t) {
  const m = /(\d{4})/.exec((t && t.start_date) || '');
  return m ? Number(m[1]) : null;
}
function metres(v) {
  const m = /([\d.]+)/.exec(v || '');
  return m ? Number(m[1]) : null;
}

// Minimum-area rectangle over an outline [x0, y0, x1, y1, ...]: centre,
// length (long side), width and the long side's angle.
export function outlineBox(o) {
  const P = [];
  for (let i = 0; i < o.length; i += 2) P.push([o[i], o[i + 1]]);
  let best = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.5) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of P) {
      const u = p[0] * ux + p[1] * uy, v = -p[0] * uy + p[1] * ux;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) {
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      best = { area, x: cu * ux - cv * uy, y: cu * uy + cv * ux, du: u1 - u0, dv: v1 - v0, ang: Math.atan2(uy, ux) };
    }
  }
  if (!best) return null;
  const along = best.du >= best.dv;
  return { x: best.x, y: best.y, len: along ? best.du : best.dv, wid: along ? best.dv : best.du, angle: along ? best.ang : best.ang + Math.PI / 2 };
}

// --- parameters from the data ---------------------------------------------

const CATHOLIC = /^(H\.|Sint |St\.? )|Maria|Jozef|Sebastiaan|Martinus|Hemelopneming|Bonifatius|Willibrord/i;
const POSTWAR = /Gereformeerd|Ontmoeting|Hoeksteen|De Rank|De Bron|Maranatha|Goede Herder|Trefpunt|Anker|Verbinding|Zaaier|^Elim|De Poort|Martyria|Centrumkerk|Doopsgezind|GKV|Triniteit|Gorechtkerk|Kerk der|Levensbron|Pinkster|Baptist|Evangeli|Rehoboth|Bethel|Sion|Immanuel/i;
export const BRICK = { mop: 0xa5523a, red: 0xae5c42, yellow: 0xc4a066, tuf: 0x9e9888, white: 0xe6e0d4 };
const ROOF = { tile: 0x8f3f2c, slate: 0x3e4449, reed: 0x6b5d45 };

// Hand-tuned icons (by name and spot), over what the rules pick.
export const LANDMARK_LOOKS = [
  { n: 'Walfriduskerk', x: 2405.22, y: -9169.15, p: { tower: 'saddle', lean: 0.075, towerH: 36, choir: 'apse', wierde: true } },
  { n: 'Kerk van Garmerwolde', x: 5459.59, y: -3282.23, p: { tower: 'saddle', ruin: true, towerH: 26 } },
  { n: 'Nicolaaskerk', x: 2769.82, y: 5170.7, p: { tower: 'saddle', towerH: 27, choir: 'poly', wierde: true } },
  { n: 'Het Witte Kerkje', x: 3084.68, y: 5158.32, p: { tower: 'ridge', brick: 'white', roof: 'slate', choir: 'flat' } },
  { n: 'Kloosterkerk', x: 8356.13, y: -6452.57, p: { tower: 'ridge', choir: 'poly', windows: 'pointed', buttress: true } },
  { n: 'Torenkerk', x: -3382.27, y: -12300.22, p: { tower: 'saddle', towerH: 30, wierde: true } },
  { n: 'Sebastiaan/Fabius', x: -10576.47, y: -2374.99, p: { tower: 'spire', towerH: 42 } },
  { n: 'Abdijkerk', x: -7065.4, y: -4004.9, p: { tower: 'ridge', windows: 'pointed', buttress: true, choir: 'poly' } },
  { n: 'Petrus en Pauluskerk', x: 11990.7, y: -12735.0, p: { tower: 'saddle', towerH: 36, choir: 'poly', wierde: true, buttress: true } },
  { n: 'Bartholomeuskerk', x: 8395.1, y: -11586.0, p: { tower: 'saddle', towerH: 31, choir: 'apse', wierde: true, windows: 'round' } },
  { n: 'Jacobskerk', x: 12564.1, y: -14320.4, p: { tower: 'saddle', towerH: 28, choir: 'poly', wierde: true, buttress: true, windows: 'pointed' } },
  { n: 'Mariakerk', x: 18617.7, y: -15419.3, p: { tower: 'ridge', choir: 'flat', wierde: true, brick: 'tuf', roof: 'tile', windows: 'round' } },
  { n: 'Jacobikerk', x: 6885.8, y: -21029.7, p: { tower: 'saddle', towerH: 30, choir: 'poly', wierde: true } },
  { n: 'Petruskerk', x: -12952.8, y: -15393.4, p: { tower: 'saddle', towerH: 27, choir: 'apse', brick: 'tuf', wierde: true, windows: 'round' } },
  { n: 'Sebastiaankerk', x: -582.1, y: -19200.3, p: { tower: 'ridge', choir: 'flat', roof: 'slate' } },
  { n: 'St-Hippolytuskerk', x: 4843.7, y: -14362.8, p: { tower: 'saddle', towerH: 40, choir: 'poly', wierde: true, windows: 'pointed' } },
  { n: 'Ursuskerk', x: 31955.0, y: -9375.8, p: { tower: 'saddle', towerH: 24, brick: 'tuf', wierde: true, choir: 'apse', windows: 'round' } },
  { n: 'Nicolaikerk', x: 19328.2, y: -11524.5, p: { tower: 'needle', towerH: 38, choir: 'poly', windows: 'pointed', buttress: true } },
  { n: 'Kerk van Ezinge', x: -8533.2, y: -10083.8, p: { tower: 'saddle', towerH: 24, wierde: true } },
  { n: 'Petruskerk', x: -7906.3, y: -19937.6, p: { tower: 'saddle', towerH: 22, wierde: true, brick: 'tuf', choir: 'apse' } },
  { n: 'Petrus en Pauluskerk', x: 2769.7, y: -20431.3, p: { tower: 'saddle', towerH: 33, wierde: true, choir: 'poly' } },
  { n: 'Laurentiuskerk', x: -3687.9, y: -15890.9, p: { tower: 'saddle', towerH: 26, wierde: true, choir: 'apse' } },
  { n: 'Kerk van Holwierde', x: 20102.6, y: -15744.7, p: { tower: 'saddle', towerH: 24, wierde: true, brick: 'tuf', choir: 'apse' } },
  { n: 'Kerk van Bourtange', x: 42416.8, y: 22773.3, p: { tower: 'ridge', choir: 'flat', roof: 'slate' } },
  { n: 'Menkemaborg', x: 7565.8, y: -20770.8, p: { brick: 'red', floors: 3, stair: true } },
  { n: 'Fraeylemaborg', x: 16345.1, y: 153.1, p: { brick: 'white', floors: 2, stair: true } },
  { n: 'Borg Verhildersum', x: -11707.2, y: -15744.0, p: { brick: 'white', floors: 2, stair: false } },
  { n: 'Borg Ewsum', x: 5173.0, y: -15001.1, p: { brick: 'red', floors: 2, stair: true } },
  { n: 'Ennemaborg', x: 29081.6, y: 2453.8, p: { brick: 'white', floors: 2, stair: true } },
  { n: 'Piloersemaborg', x: -9974.7, y: -6165.1, p: { brick: 'red', floors: 2, stair: false } },
  { n: 'Allersmaborg', x: -7650.6, y: -10970.4, p: { brick: 'white', floors: 2, stair: true } },
  { n: 'Adam', x: 23844.0, y: -12839.8, p: { type: 'stelling', body: 'black', height: 22 } },
  { n: 'Fraeylemamolen', x: 15091.8, y: -474.2, p: { type: 'ground', body: 'reed', height: 13 } },
  { n: 'Vestingmolen Bourtange', x: 42441.9, y: 22704.1, p: { type: 'stelling', body: 'white', height: 20 } },
  { n: 'Kerkje van Oostum', x: -4590, y: -6702.9, p: { tower: 'ridge', choir: 'apse', brick: 'tuf', roof: 'tile', wierde: true, windows: 'round' } },
  { n: 'Sint-Jozefkathedraal', x: 522.4, y: 503.2, p: { tower: 'spire', towerH: 56, choir: 'poly', brick: 'red', roof: 'slate', windows: 'pointed', buttress: true } },
  { n: 'Kerk van Den Andel', x: -3942.9, y: -18385, p: { tower: 'saddle', towerH: 22, wierde: true, brick: 'tuf', choir: 'apse' } },
  { n: 'Sint-Georgiuskerk', x: 1980.2, y: -15798.4, p: { tower: 'saddle', towerH: 26, wierde: true, choir: 'poly', brick: 'tuf' } },
  { n: 'Mariakerk', x: 9297.4, y: -21176.2, p: { tower: 'ridge', choir: 'flat', wierde: true, brick: 'tuf', windows: 'round' } },
  { n: 'Kerk van Nieuw Scheemda', x: 25237.3, y: 564.3, p: { tower: 'saddle', towerH: 24, choir: 'flat', roof: 'slate' } },
  { n: 'Sint Vituskerk', x: 31614.6, y: 7620.8, p: { tower: 'spire', towerH: 40, choir: 'poly', windows: 'pointed', buttress: true } },
  { n: 'Burcht Wedde', x: 34315.7, y: 16258.4, p: { brick: 'red', floors: 2, stair: true } },
  { n: 'Korenmolen Hunsingo', x: 1504.4, y: -12886.4, p: { type: 'ground', body: 'white', height: 14 } },
  { n: 'De Noordstar', x: 20541.3, y: 1731.3, p: { type: 'stelling', body: 'black', height: 20 } },
  { n: 'De Noordermolen', x: 22797.8, y: 210.5, p: { type: 'ground', body: 'reed', height: 13 } },
  { n: 'Westmole', x: 40422.7, y: -13625.4, p: { type: 'lighthouse', height: 12, total: 12 } },
  { n: 'Ostmole', x: 40806.2, y: -13610.5, p: { type: 'lighthouse', height: 14, total: 14 } },
];

// item: { k, n, x, y, o?, t } (scripts/add_landmark_kits.py), fit: an
// optional box { x, y, len, wid, angle } when there is no outline.
export function landmarkParams(item, fit = null) {
  if (item.n === 'Excalibur') return null; // has its own hand model (landmarks3d.js)
  const t = item.t || {};
  const box = (item.o && item.o.length >= 6 && outlineBox(item.o)) || fit;
  const h = hash(Math.round(item.x), Math.round(item.y));
  const look = LANDMARK_LOOKS.find((q) => q.n === item.n && Math.hypot(q.x - item.x, q.y - item.y) < 80);
  const base = { kind: item.k, name: item.n || '', x: box ? box.x : item.x, y: box ? box.y : item.y, angle: box ? box.angle : h * Math.PI, seed: h };
  let p = null;
  if (item.k === 'church' || item.k === 'chapel') p = churchParams(item, t, box, h);
  else if (item.k === 'mill') p = millParams(item, t, h);
  else if (item.k === 'tower' || item.k === 'lighthouse' || item.k === 'watertower') p = towerParams(item, t, h);
  else if (item.k === 'castle') p = borgParams(item, t, box, h);
  else if (item.k === 'farm') p = farmParams(item, t, box, h);
  else if (item.k === 'silo' || item.k === 'factory' || item.k === 'pakhuis') p = industryParams(item, t, box, h);
  else if (item.k === 'flat') p = flatParams(item, t, box, h);
  else if (['townhall', 'station', 'school', 'museum'].includes(item.k)) p = hallParams(item, t, box, h);
  if (!p) return null;
  return { ...base, ...p, ...(look ? look.p : {}) };
}

function churchParams(item, t, box, h) {
  const n = item.n || '', y = year(t);
  const jewish = t.religion === 'jewish' || /synagog/i.test(n);
  const catholic = t.denomination === 'roman_catholic' || t.denomination === 'catholic' || CATHOLIC.test(n);
  const postwar = (y && y >= 1940) || (!y && POSTWAR.test(n));
  const medieval = (y && y < 1600) || (!y && !postwar && !catholic && !jewish);
  let len = box ? box.len : 24, wid = box ? box.wid : 10;
  if (item.k === 'chapel' || jewish) { len = Math.min(len, 18); wid = Math.min(wid, 10); }
  len = clamp(len, 10, 60); wid = clamp(wid, 6, 24);
  const p = { kit: 'church', len, wid, wierde: false, ruin: false, lean: 0, buttress: false };
  if (jewish) Object.assign(p, { tower: 'none', choir: 'flat', brick: 'yellow', roof: 'slate', windows: 'round' });
  else if (postwar) Object.assign(p, { tower: h < 0.55 ? 'free' : 'ridge', choir: 'flat', brick: h < 0.5 ? 'yellow' : 'red', roof: 'slate', windows: 'slot' });
  else if (catholic) Object.assign(p, { tower: 'spire', choir: 'poly', brick: 'red', roof: 'slate', windows: 'pointed', buttress: true });
  else if (medieval) {
    Object.assign(p, {
      tower: len < 17 ? 'ridge' : h < 0.62 ? 'saddle' : h < 0.85 ? 'needle' : 'spire',
      choir: h < 0.45 ? 'apse' : h < 0.8 ? 'poly' : 'flat', brick: hash(h, 3) < 0.25 ? 'tuf' : 'mop', roof: hash(h, 5) < 0.6 ? 'tile' : 'slate',
      windows: y && y >= 1250 ? 'pointed' : 'round', wierde: hash(h, 7) < 0.55, buttress: hash(h, 9) < 0.3,
    });
  } else Object.assign(p, { tower: len < 18 ? 'ridge' : h < 0.5 ? 'spire' : 'ridge', choir: h < 0.5 ? 'poly' : 'flat', brick: 'red', roof: 'slate', windows: 'round' });
  // OSM's height is to the top of the crown
  p.total = metres(t.height);
  p.towerH = clamp(len * (p.tower === 'spire' || p.tower === 'needle' ? 1.35 : 1.0), 16, 48);
  return p;
}

function millParams(item, t, h) {
  const n = item.n || '';
  let type = t['windmill:type'] === 'smock' ? 'stelling' : null;
  if (/windmotor/i.test(n)) type = 'motor';
  if (!type) type = t.building === 'industrial' || /korenmolen/i.test(n) ? 'stelling' : h < 0.6 ? 'ground' : 'stelling';
  const white = /wit|widde|witte/i.test(n);
  const y = year(t);
  // a recent build is a compact replica; a listed brick mill keeps its old, taller stage
  if (y && y >= 1950 && type !== 'motor') return { kit: 'mill', type: 'ground', body: white || h < 0.5 ? 'white' : 'reed', height: 10 + h * 2 };
  if (t.heritage && type === 'ground' && y && y < 1900 && h > 0.5) type = 'stelling';
  return { kit: 'mill', type, body: white ? 'white' : h < 0.25 ? 'black' : 'reed', height: type === 'stelling' ? 17 + h * 6 : 12 + h * 3 };
}

function towerParams(item, t, h) {
  const tt = t['tower:type'] || '';
  if (item.k === 'watertower' || t.man_made === 'water_tower') return { kit: 'tower', type: 'water', height: clamp(metres(t.height) || 30 + h * 10, 18, 70), brick: h < 0.5 ? 'red' : 'yellow' };
  if (item.k === 'lighthouse' || t.man_made === 'lighthouse') return { kit: 'tower', type: 'lighthouse', height: metres(t.height) || 14 + h * 8 };
  if (tt === 'observation' || tt === 'watchtower' || t.tourism === 'viewpoint') return { kit: 'tower', type: 'lookout', height: metres(t.height) || 12 + h * 8 };
  if (tt === 'bell_tower') return { kit: 'tower', type: 'bell', height: 14 + h * 8, total: metres(t.height), crown: h < 0.6 ? 'saddle' : 'spire', brick: 'mop' };
  if (tt === 'defensive' || t.historic === 'fort') return { kit: 'tower', type: 'defensive', height: 8 + h * 3, brick: 'mop' };
  // a bare man_made=tower: a plain brick tower, flat-topped
  if (t.man_made === 'tower') return { kit: 'tower', type: 'bell', height: 12 + h * 6, total: metres(t.height), crown: 'flat', brick: h < 0.5 ? 'mop' : 'yellow' };
  return null;
}

function borgParams(item, t, box, h) {
  // a palace is a long, three-storey house with a stair tower; a manor from the 1800s is white-plastered
  const palace = t.castle_type === 'palace', y = year(t);
  return { kit: 'borg', len: clamp(box ? box.len : palace ? 34 : 22, 12, 40), wid: clamp(box ? box.wid : 13, 8, 24), floors: Number(t['building:levels']) || (palace ? 3 : 2), brick: y && y >= 1800 ? 'white' : h < 0.7 ? 'red' : 'white', stair: palace || h < 0.6 };
}

// --- geometry --------------------------------------------------------------

export function landmarkGeometry(p, lod = LOD_FULL) {
  const B = new GeoBuilder(3);
  const sails = p.kit === 'mill' ? new GeoBuilder(1) : null;
  if (p.kit === 'church') church(B, p, lod);
  else if (p.kit === 'mill') mill(B, sails, p, lod);
  else if (p.kit === 'tower') tower(B, p, lod);
  else if (p.kit === 'borg') borg(B, p, lod);
  else if (p.kit === 'farm') farm(B, p, lod);
  else if (p.kit === 'industry') industry(B, p, lod);
  else if (p.kit === 'flat') flat(B, p, lod);
  else if (p.kit === 'hall') hall(B, p, lod);
  const geo = B.build();
  if (p.lean && p.kit === 'church') leanTower(geo, p.leanBox, p.lean);
  return { geometry: geo, sails: sails ? sails.build() : null, sailsAt: p.sailsAt || null, height: p.top || 20 };
}

// the tower ([x0, x1] by |z| < hz) sheared north by k m per m of height
function leanTower(geo, [x0, x1, hz], k) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    if (x >= x0 && x < x1 && Math.abs(z) <= hz) pos.setZ(i, z + pos.getY(i) * k);
  }
  pos.needsUpdate = true;
}

// a gable roof over x0..x1 (ridge along x), eaves at he, half width hw
function gableRoof(B, x0, x1, hw, he, hr, color, wall, ox0 = 0.4, ox1 = 0.4) {
  const o = 0.4;
  B.quadOut([x0 - ox0, he - 0.15, hw + o], [x1 + ox1, he - 0.15, hw + o], [x1 + ox1, hr, 0], [x0 - ox0, hr, 0], [0, 1, 1], color);
  B.quadOut([x0 - ox0, he - 0.15, -hw - o], [x0 - ox0, hr, 0], [x1 + ox1, hr, 0], [x1 + ox1, he - 0.15, -hw - o], [0, 1, -1], color);
  B.triOut([x0, he, -hw], [x0, he, hw], [x0, hr, 0], [-1, 0, 0], wall);
  B.triOut([x1, he, -hw], [x1, hr, 0], [x1, he, hw], [1, 0, 0], wall);
}

// a saddle roof on a square tower: gables north and south, ridge along x
function saddleRoof(B, cx, hw, he, hr, color, wall) {
  const o = 0.3;
  B.quadOut([cx - hw - o, he, -hw - o], [cx - hw - o, he, hw + o], [cx, hr, hw + o], [cx, hr, -hw - o], [-1, 1, 0], color);
  B.quadOut([cx + hw + o, he, -hw - o], [cx, hr, -hw - o], [cx, hr, hw + o], [cx + hw + o, he, hw + o], [1, 1, 0], color);
  B.triOut([cx - hw, he, hw], [cx + hw, he, hw], [cx, hr, hw], [0, 0, 1], wall);
  B.triOut([cx - hw, he, -hw], [cx, hr, -hw], [cx + hw, he, -hw], [0, 0, -1], wall);
}

function windowAt(B, x, z, nz, y0, w, hgt, kind, frame) {
  // a dark opening a hand proud of the wall, rounded or pointed at the top
  const d = 0.06 * nz;
  if (kind === 'slot') {
    B.box(x, y0 + hgt / 2, z + d, w * 0.35, hgt, 0.08, 0x1c2228, G_GLASS);
    return;
  }
  B.box(x, y0 + hgt * 0.42, z + d, w, hgt * 0.84, 0.08, 0x1c2228, G_GLASS);
  const top = y0 + hgt * 0.84;
  if (kind === 'pointed') B.triOut([x - w / 2, top, z + d + 0.04 * nz], [x + w / 2, top, z + d + 0.04 * nz], [x, top + w * 0.75, z + d + 0.04 * nz], [0, 0, nz], 0x1c2228, G_GLASS);
  else B.geo(new THREE.CircleGeometry(w / 2, 8, 0, Math.PI), composeMatrix(x, top, z + d + 0.04 * nz, 0, nz > 0 ? 0 : Math.PI, 0), 0x1c2228, G_GLASS);
  B.box(x, y0 - 0.08, z + d, w + 0.3, 0.14, 0.12, frame);
}

// A square tower with its crown; base at y = 0, centre (cx, cz).
function towerBody(B, cx, cz, tw, th, crown, wall, roof, lod) {
  const hw = tw / 2;
  B.box(cx, th / 2, cz, tw, th, tw, wall);
  if (lod === LOD_FULL) {
    // a plinth, belfry openings, clock faces (lit at night) and a door
    B.box(cx, 0.4, cz, tw + 0.3, 0.8, tw + 0.3, 0x6e6a60);
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const fx = cx + nx * (hw + 0.04), fz = cz + nz * (hw + 0.04);
      for (const s of [-1, 1]) B.box(fx + (nz ? s * tw * 0.18 : 0), th - 3, fz + (nx ? s * tw * 0.18 : 0), nz ? tw * 0.16 : 0.1, 2.4, nx ? tw * 0.16 : 0.1, 0x1a1e22);
      B.geo(new THREE.CircleGeometry(Math.min(1.1, tw * 0.17), 12), composeMatrix(fx + nx * 0.03, th - 6.5, fz + nz * 0.03, 0, Math.atan2(nx, nz), 0), 0xf2ead4, G_GLOW);
    }
    B.box(cx - hw - 0.05, 1.6, cz, 0.14, 3.2, 1.8, 0x3a2a22);
    for (let y = th * 0.33; y < th - 4; y += th * 0.33) B.box(cx, y, cz, tw + 0.12, 0.25, tw + 0.12, 0xb8ad98);
  }
  if (crown === 'saddle') saddleRoof(B, cx, hw, th, th + tw * 1.15, roof, wall);
  else if (crown === 'spire') {
    B.geo(new THREE.ConeGeometry(hw * 1.32, th * 0.75, 8, 1, true).rotateY(Math.PI / 8), composeMatrix(cx, th + th * 0.375, cz), roof);
    if (lod !== LOD_SKY) B.box(cx, th + th * 0.75 + 0.8, cz, 0.12, 1.6, 0.12, 0xc9a227);
  } else if (crown === 'needle') {
    // ingesnoerde spits: a low pyramid, then a slim octagonal needle
    B.geo(new THREE.ConeGeometry(hw * 1.42, tw * 0.9, 4, 1, true).rotateY(Math.PI / 4), composeMatrix(cx, th + tw * 0.45, cz), roof);
    B.geo(new THREE.ConeGeometry(hw * 0.55, th * 0.6, 8, 1, true), composeMatrix(cx, th + tw * 0.6 + th * 0.3 - tw * 0.3, cz), roof);
  } else if (crown === 'flat') {
    B.box(cx, th + 0.4, cz, tw + 0.2, 0.8, tw + 0.2, 0x6e6a60);
  } else if (crown === 'open') {
    // a post-war bell tower: four piers, an open belfry, a cap and a cross
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(cx + dx * (hw - 0.2), th + 2, cz + dz * (hw - 0.2), 0.4, 4, 0.4, wall);
    B.box(cx, th + 4.2, cz, tw + 0.4, 0.4, tw + 0.4, 0xe8e2d6);
    B.box(cx, th + 6, cz, 0.16, 3.2, 0.16, 0xe8e2d6);
    B.box(cx, th + 6.7, cz, 1.3, 0.16, 0.16, 0xe8e2d6);
  }
}

// the shaft height that puts the crown's top at `total`
function shaftFor(crown, total, tw) {
  return crown === 'saddle' ? total - tw * 1.15 : crown === 'spire' ? total / 1.75 : crown === 'needle' ? total / 1.6 : crown === 'open' ? total - 7 : total;
}

function crownTop(crown, th, tw) {
  return crown === 'saddle' ? th + tw * 1.15 : crown === 'spire' ? th * 1.75 : crown === 'needle' ? th * 1.6 : crown === 'open' ? th + 7 : th;
}

function church(B, p, lod) {
  const L = p.len, W = p.wid, hw = W / 2;
  const wall = BRICK[p.brick] || BRICK.red, roof = ROOF[p.roof] || ROOF.tile, frame = 0xd8d0c0;
  const x0 = -L / 2, x1 = L / 2;
  const tw = p.tower === 'saddle' || p.tower === 'spire' || p.tower === 'needle' ? clamp(W * 0.62, 4.5, 8.5) : 0;
  const cw = p.choir === 'flat' ? 0 : Math.min(hw * 0.85, L * 0.18);
  const nx0 = x0 + tw, nx1 = x1 - cw;
  const eave = clamp(W * 0.75, 5, 11) * (p.kit === 'church' && p.tower === 'free' ? 0.8 : 1);
  const ridge = eave + hw * (p.windows === 'slot' ? 0.6 : 1.25);
  const towerH = Math.max(p.total && tw ? shaftFor(p.tower, p.total, tw) : p.towerH || 20, ridge + 4);
  p.top = ridge;
  p.leanBox = [x0 - 0.6, nx0 + 0.01, tw / 2 + 0.6];
  if (p.wierde && lod !== LOD_SKY) wierde(B, p, lod);
  if (lod === LOD_SKY) {
    // the outline on the horizon: the body and roof, the tower
    B.box((nx0 + x1) / 2, eave / 2, 0, x1 - nx0, eave, W, wall);
    if (!p.ruin) gableRoof(B, nx0, x1, hw, eave, ridge, roof, wall, 0, 0);
    if (tw) { towerBody(B, x0 + tw / 2, 0, tw, towerH, p.tower, wall, roof, lod); p.top = crownTop(p.tower, towerH, tw); }
    return;
  }
  // the nave (a ruin: broken walls stepping down, no roof)
  if (p.ruin) {
    const n = Math.max(3, Math.round((nx1 - nx0) / 3));
    for (const s of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const a = nx0 + ((nx1 - nx0) * i) / n, b = nx0 + ((nx1 - nx0) * (i + 1)) / n;
        const hh = eave * (0.35 + 0.6 * hash(i * 3 + s, p.seed * 100));
        B.box((a + b) / 2, hh / 2, s * (hw - 0.45), b - a, hh, 0.9, wall);
      }
    }
    B.box((nx0 + nx1) / 2, 0.05, 0, nx1 - nx0, 0.1, W - 1.8, 0x6e7a52);
  } else {
    B.box((nx0 + nx1) / 2, eave / 2, 0, nx1 - nx0, eave, W, wall);
    gableRoof(B, nx0, nx1, hw, eave, ridge, roof, wall, tw ? 0 : 0.4, cw ? 0 : 0.4);
  }
  // the choir: a round apse, a three-sided end or nothing (flat east wall)
  if (cw) {
    const r = hw * 0.92, segs = p.choir === 'apse' ? 8 : 4;
    const ce = eave * (p.choir === 'apse' ? 0.85 : 0.95);
    B.geo(new THREE.CylinderGeometry(r, r, ce, segs, 1, false, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(nx1, ce / 2, 0), wall);
    B.geo(new THREE.ConeGeometry(r + 0.35, ridge - ce, segs, 1, true, 0, Math.PI).rotateY(Math.PI / 2), composeMatrix(nx1, ce + (ridge - ce) / 2, 0), roof);
  }
  // the tower
  if (tw) {
    towerBody(B, x0 + tw / 2, 0, tw, towerH, p.tower, wall, roof, lod);
    p.top = crownTop(p.tower, towerH, tw);
  } else if (p.tower === 'ridge' && !p.ruin) {
    // dakruiter on the west end of the ridge
    const rx = nx0 + Math.min(4, L * 0.15), s = clamp(W * 0.16, 1.2, 2.2);
    B.box(rx, ridge + s * 0.7, 0, s, s * 1.6, s, 0xe8e2d6);
    if (lod === LOD_FULL) B.box(rx, ridge + s * 0.9, 0, s + 0.06, s * 0.6, s * 0.55, 0x2a2e30);
    B.geo(new THREE.ConeGeometry(s * 0.78, s * 2.6, 8).rotateY(Math.PI / 8), composeMatrix(rx, ridge + s * 1.5 + s * 1.3, 0), ROOF.slate);
    p.top = ridge + s * 4;
  } else if (p.tower === 'free') {
    const fw = clamp(W * 0.22, 2.2, 3.4);
    towerBody(B, x0 - fw * 0.2, -hw - fw * 0.9, fw, Math.max(12, eave * 2.2), 'open', wall, roof, lod);
    p.top = Math.max(12, eave * 2.2) + 7;
  }
  if (lod !== LOD_FULL || p.ruin) return;
  // windows and buttresses on the nave's long walls
  const n = Math.max(2, Math.floor((nx1 - nx0 - 1.5) / 3.6));
  const step = (nx1 - nx0) / n;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const x = nx0 + step * (i + 0.5);
      windowAt(B, x, s * hw, s, eave * 0.32, Math.min(1.3, step * 0.36), eave * 0.5, p.windows, frame);
      if (p.buttress && i > 0) B.box(nx0 + step * i, eave * 0.4, s * (hw + 0.35), 0.7, eave * 0.8, 0.7, wall);
    }
  }
  if (!tw) {
    // the west front: a door and a round window
    B.box(x0 - 0.06, 1.4, 0, 0.14, 2.8, 1.8, 0x3a2a22);
    B.geo(new THREE.CircleGeometry(Math.min(1.2, hw * 0.3), 12), composeMatrix(x0 - 0.08, eave * 0.75, 0, 0, -Math.PI / 2, 0), 0x1c2228, G_GLASS);
    B.box(x0 - 0.3, 2.9, 0, 0.5, 0.25, 2.2, 0xf2ead4, G_GLOW);
  }
}

// The wierde: a low mound, the churchyard wall round it, lime trees and graves.
function wierde(B, p, lod) {
  const R = Math.max(p.len, p.wid) * 0.62 + 9, H = 1.4;
  B.geo(new THREE.CylinderGeometry(R, R + 7, H, 16, 1, true), composeMatrix(0, H / 2 - 0.05, 0), 0x6f8a4e);
  B.geo(new THREE.CircleGeometry(R, 16).rotateX(-Math.PI / 2), composeMatrix(0, H - 0.04, 0), 0x6f8a4e);
  if (lod !== LOD_FULL) return;
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    if (i === 0) continue; // the gate, on the west side
    const a0 = (i / segs) * Math.PI * 2 + Math.PI, a1 = ((i + 1) / segs) * Math.PI * 2 + Math.PI;
    const am = (a0 + a1) / 2, r = R - 0.5;
    B.box(Math.cos(am) * r, H + 0.45, Math.sin(am) * r, 0.45, 0.9, 2 * r * Math.sin(Math.PI / segs) + 0.1, 0x8a4a36, 0, 0, -am, 0);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3, r = R - 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z) < p.wid / 2 + 2 && Math.abs(x) < p.len / 2 + 2) continue;
    B.geo(new THREE.CylinderGeometry(0.22, 0.3, 4, 6), composeMatrix(x, H + 2, z), 0x4a3a2a);
    B.geo(new THREE.IcosahedronGeometry(2.6, 0), composeMatrix(x, H + 5.4, z, 0, a, 0, 1, 1.15, 1), 0x3f6a32);
  }
  for (let i = 0; i < 14; i++) {
    const a = hash(i, p.seed * 31) * Math.PI * 2, r = p.wid / 2 + 2 + hash(i, 7) * (R - p.wid / 2 - 5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z) < p.wid / 2 + 1 && Math.abs(x) < p.len / 2 + 1) continue;
    B.box(x, H + 0.4, z, 0.12, 0.8, 0.6, 0x8e8e8a, 0, 0, a, 0);
  }
}

function tower(B, p, lod) {
  const h = p.height;
  if (p.type === 'lookout') {
    // a timber lookout: four legs, braces, a roofed platform
    const s = 2.2;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(dx * s, h / 2, dz * s, 0.3, h, 0.3, 0x6a5a44);
    if (lod !== LOD_SKY) for (let y = 3; y < h - 1; y += 3.2) B.box(0, y, 0, s * 2 + 0.3, 0.18, s * 2 + 0.3, 0x5a4a38);
    B.box(0, h, 0, s * 2 + 1, 0.3, s * 2 + 1, 0x5a4a38);
    B.geo(new THREE.ConeGeometry(s * 1.9, 2.4, 4, 1, true).rotateY(Math.PI / 4), composeMatrix(0, h + 3, 0), ROOF.slate);
    p.top = h + 4.2;
    return;
  }
  if (p.type === 'water') {
    // a water tower: a brick shaft, a gallery and a wide tank under a cone
    const r = clamp(h * 0.1, 2.6, 5), tank = h * 0.28, ys = h - tank;
    B.geo(new THREE.CylinderGeometry(r * 0.85, r, ys, 10), composeMatrix(0, ys / 2, 0), BRICK[p.brick] || BRICK.red);
    B.geo(new THREE.CylinderGeometry(r * 1.45, r * 1.15, tank, 10), composeMatrix(0, ys + tank / 2, 0), 0xb8b2a2);
    if (lod !== LOD_SKY) B.geo(new THREE.CylinderGeometry(r * 1.6, r * 1.6, 0.3, 10), composeMatrix(0, ys, 0), 0x5a5e60);
    B.geo(new THREE.ConeGeometry(r * 1.55, tank * 0.55, 10), composeMatrix(0, h + tank * 0.275, 0), ROOF.slate);
    p.top = h + tank * 0.55;
    return;
  }
  if (p.type === 'defensive') {
    // a squat round fort tower: a battered drum, a machicolation ring, merlons
    const r = clamp(h * 0.4, 2.6, 4.2), wall = BRICK[p.brick] || BRICK.mop;
    B.geo(new THREE.CylinderGeometry(r * 0.92, r, h, 10), composeMatrix(0, h / 2, 0), wall);
    B.geo(new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.7, 10), composeMatrix(0, h + 0.35, 0), 0x6e6a60);
    if (lod !== LOD_SKY) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      B.box(Math.cos(a) * r * 1.1, h + 1.1, Math.sin(a) * r * 1.1, 0.7, 0.8, 0.7, 0x6e6a60, 0, 0, a, 0);
    }
    if (lod === LOD_FULL) B.box(r * 0.98, 1.3, 0, 0.14, 2.6, 1.3, 0x3a2a22);
    p.top = h + 1.6;
    return;
  }
  if (p.type === 'lighthouse') {
    // a tapering shaft in red and white bands, a gallery and a glowing lantern under a cap
    const r0 = Math.max(1.6, h * 0.17), r1 = r0 * 0.62, bands = 4, bh = h / bands;
    for (let i = 0; i < bands; i++) {
      const ra = r0 + (r1 - r0) * (i / bands), rb = r0 + (r1 - r0) * ((i + 1) / bands);
      B.geo(new THREE.CylinderGeometry(rb, ra, bh, 8), composeMatrix(0, bh * (i + 0.5), 0), i % 2 ? 0xe8e4da : 0xa8322a);
    }
    B.box(0, h + 0.1, 0, r1 * 2 + 1.2, 0.25, r1 * 2 + 1.2, 0x2c2e30);
    B.geo(new THREE.CylinderGeometry(r1 * 0.75, r1 * 0.75, 1.6, 8), composeMatrix(0, h + 1, 0), 0xfff2c0, G_GLOW);
    B.geo(new THREE.ConeGeometry(r1 * 0.95, 1.2, 8), composeMatrix(0, h + 2.4, 0), 0x2c2e30);
    p.top = h + 3;
    return;
  }
  const tw = clamp((p.total || h) * 0.2, 4, 7);
  const th = p.total ? Math.max(6, shaftFor(p.crown, p.total, tw)) : h;
  towerBody(B, 0, 0, tw, th, p.crown, BRICK[p.brick] || BRICK.mop, ROOF.slate, lod);
  p.top = crownTop(p.crown, th, tw);
}

// Mills: stellingmolen (brick base, a stage, the octagonal body), grondzeiler
// (the body from the ground up), windmotor (a steel lattice and a rosette).
function mill(B, S, p, lod) {
  const H = p.height;
  const body = p.body === 'white' ? 0xe8e4da : p.body === 'black' ? 0x2c2824 : ROOF.reed;
  if (p.type === 'motor') {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      B.geo(new THREE.CylinderGeometry(0.07, 0.09, H, 4), composeMatrix(dx * 0.9, H / 2, dz * 0.9, dz * 0.07, 0, -dx * 0.07), 0x6a6e70);
    }
    if (lod === LOD_FULL) for (let y = 2; y < H; y += 2.5) B.box(0, y, 0, 2.2 - y * 0.08, 0.06, 2.2 - y * 0.08, 0x6a6e70);
    B.box(0, H + 0.2, 0, 0.8, 0.5, 0.8, 0x5a5e60);
    B.box(-2.4, H + 0.3, 0, 3.4, 1.6, 0.06, 0x8a2a22);
    // the rosette turns: 18 blades round a hub
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      S.box(0, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0.05, 1.7, 0.42, 0xd8d6d0, 0, a, 0, 0);
    }
    S.geo(new THREE.TorusGeometry(2.35, 0.05, 4, 24).rotateY(Math.PI / 2), null, 0x8a8c8e);
    p.sailsAt = [1.2, H + 0.2, 0];
    p.top = H + 2.6;
    return;
  }
  const stage = p.type === 'stelling' ? H * 0.32 : 0;
  if (stage) {
    B.geo(new THREE.CylinderGeometry(4.6, 5, stage, 8), composeMatrix(0, stage / 2, 0), 0x8a4a36);
    if (lod !== LOD_SKY) {
      // the stage (stelling) with its railing posts
      B.geo(new THREE.CylinderGeometry(7.2, 7.2, 0.25, 8), composeMatrix(0, stage, 0), 0x5a4a38);
      if (lod === LOD_FULL) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; B.box(Math.cos(a) * 7, stage + 0.55, Math.sin(a) * 7, 0.1, 1.1, 0.1, 0x4a3e30); }
      if (lod === LOD_FULL) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 8; B.geo(new THREE.CylinderGeometry(0.1, 0.1, stage * 1.15, 4), composeMatrix(Math.cos(a) * 5.8, stage / 2, Math.sin(a) * 5.8, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25), 0x4a3e30); }
    }
  }
  const r0 = stage ? 4.2 : 4.6, r1 = 2.3, bh = H - stage;
  B.geo(new THREE.CylinderGeometry(r1, r0, bh, 8), composeMatrix(0, stage + bh / 2, 0), body);
  // the cap and the axle end (the sails face +x)
  B.box(0.3, H + 0.9, 0, 4.6, 1.8, 3.4, 0x3e4449);
  B.geo(new THREE.CylinderGeometry(1.7, 1.7, 4.6, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), composeMatrix(0.3, H + 1.8, 0), 0x3e4449);
  if (lod === LOD_FULL) {
    B.box(-r0 - 0.04, stage + 1.2, 0, 0.12, 2.2, 1.2, 0x3a2a22);
    B.box(-r0 - 0.3, stage + 2.6, 0, 0.3, 0.3, 0.3, 0xf2ead4, G_GLOW);
    for (const a of [0.6, 2.2, 3.9]) B.box(Math.cos(a) * (r0 * 0.7 + r1 * 0.3), stage + bh * 0.55, Math.sin(a) * (r0 * 0.7 + r1 * 0.3), 0.7, 0.9, 0.7, 0x1c2228, G_GLASS, 0, -a, 0);
    B.box(-3.2, H - 2, 0, 6, 0.25, 0.25, 0x5a4a38, 0, 0, 0, -0.7);
  }
  // four sails: a stock with a lattice of laths
  const len = stage ? Math.min(13, H * 0.66) : Math.min(11, H - 1.2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    S.box(0, c * len / 2, s * len / 2, 0.25, len, 0.25, 0x6a5a44, 0, a, 0, 0);
    if (lod === LOD_SKY) continue;
    const off = 0.95;
    S.box(0, c * (len * 0.58) - s * off, s * (len * 0.58) + c * off, 0.06, len * 0.8, 1.6, p.body === 'white' ? 0xe8e4da : 0xcfc8b8, 0, a, 0, 0);
  }
  p.sailsAt = [2.8, H + 1.6, 0];
  p.top = H + len + 1.6;
}

// A borg: the house on the outline with a hipped roof, stepped end gables,
// a stair tower in front.
function borg(B, p, lod) {
  const L = p.len, W = p.wid, eave = p.floors * 3.6 + 0.8;
  const wall = BRICK[p.brick] || BRICK.red, roof = ROOF.slate;
  B.box(0, eave / 2, 0, L, eave, W, wall);
  const rh = Math.min(7, W * 0.55);
  gableRoof(B, -L / 2, L / 2, W / 2, eave, eave + rh, roof, wall);
  p.top = eave + rh;
  if (lod === LOD_SKY) return;
  for (const sx of [-1, 1]) {
    // trapgevel: steps up the gable
    for (let k = 0; k < 4; k++) {
      const zz = (W / 2) * (1 - k / 4), hh = eave + (rh * k) / 4;
      B.box(sx * (L / 2 + 0.15), hh + rh / 8, 0, 0.35, rh / 4, zz * 2, wall);
    }
  }
  if (p.stair) {
    const tx = -L * 0.15;
    B.geo(new THREE.CylinderGeometry(1.8, 1.8, eave + 3, 8), composeMatrix(tx, (eave + 3) / 2, W / 2 + 1.2), wall);
    B.geo(new THREE.ConeGeometry(2.2, 4, 8), composeMatrix(tx, eave + 5, W / 2 + 1.2), roof);
    p.top = Math.max(p.top, eave + 7);
  }
  if (lod !== LOD_FULL) return;
  const n = Math.max(3, Math.floor(L / 3));
  for (let f = 0; f < p.floors; f++) {
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / n;
      for (const s of [-1, 1]) {
        B.box(x, 1.6 + f * 3.6 + 0.9, s * (W / 2 + 0.05), 1.1, 1.8, 0.08, 0x1c2228, G_GLASS);
        B.box(x, 1.6 + f * 3.6 + 0.9, s * (W / 2 + 0.07), 1.3, 2.0, 0.04, 0xf2ece0);
      }
    }
  }
  B.box(0, 1.5, W / 2 + 0.1, 1.6, 3, 0.12, 0x2f4a3a);
  B.box(0, 3.3, W / 2 + 0.35, 0.3, 0.3, 0.3, 0xf2ead4, G_GLOW);
}

// --- everyday landmarks (issue #164): farms, silos and factories, flats, town halls, stations, schools ---
// Same data in / parameters out as above; a box from the outline (or the
// footprint fit), the type picked by the tags, the name and a hash.

const FARM_WALL = { brick: 0xa5523a, white: 0xe6e0d4, yellow: 0xc4a066 };
const FARM_ROOF = { tile: 0xa04a34, pan: 0x3e4449, reed: 0x7a6a4a };

// Farm types: kop-hals-romp (head, neck, big barn), langhuis (house and barn under
// one long roof), stolp (square, pyramid roof), T-boerderij (barn across the house).
export const FARM_TYPES = ['kophalsromp', 'langhuis', 'stolp', 'tvorm'];

function farmParams(item, t, box, h) {
  const n = item.n || '';
  const len = clamp(box ? box.len : 34, 14, 70), wid = clamp(box ? box.wid : 18, 9, 36);
  let type;
  if (/stolp/i.test(n) || t['farm:type'] === 'stolp') type = 'stolp';
  else if (/langhuis/i.test(n)) type = 'langhuis';
  else if (/kop[- ]?hals/i.test(n)) type = 'kophalsromp';
  else if (FARM_TYPES.includes(t['farm:type'])) type = t['farm:type'];
  else if (len / wid < 1.35) type = h < 0.5 ? 'stolp' : 'tvorm';
  else if (len / wid < 2.0) type = h < 0.6 ? 'kophalsromp' : 'tvorm';
  else type = h < 0.55 ? 'langhuis' : 'kophalsromp';
  const w = hash(h, 3), r = hash(h, 5);
  return {
    kit: 'farm', type, len: type === 'stolp' ? Math.min(len, wid * 1.2) : len, wid,
    wall: w < 0.2 ? 'white' : w < 0.9 ? 'brick' : 'yellow', roof: r < 0.55 ? 'tile' : r < 0.8 ? 'pan' : 'reed', barnH: 5.5 + hash(h, 7) * 2.5,
  };
}

function farm(B, p, lod) {
  const L = p.len, W = p.wid, wall = FARM_WALL[p.wall], roof = FARM_ROOF[p.roof];
  const he = 3.2;
  const house = (x0, x1, w, hh) => {
    B.box((x0 + x1) / 2, he / 2, 0, x1 - x0, he, w, wall);
    gableRoof(B, x0, x1, w / 2, he, he + hh, roof, wall);
    if (lod === LOD_FULL) {
      const n = Math.max(2, Math.floor((x1 - x0) / 3));
      for (let i = 0; i < n; i++) for (const s of [-1, 1]) B.box(x0 + ((x1 - x0) * (i + 0.5)) / n, 1.7, s * (w / 2 + 0.05), 1.0, 1.3, 0.08, 0x1c2228, G_GLASS);
    }
  };
  const barn = (x0, x1, w) => {
    const be = p.barnH * 0.55, br = p.barnH + w * 0.32;
    B.box((x0 + x1) / 2, be / 2, 0, x1 - x0, be, w, wall);
    gableRoof(B, x0, x1, w / 2, be, br, roof, wall);
    if (lod === LOD_FULL) B.box(x1 + 0.05, 2, 0, 0.1, 4, Math.min(5, w * 0.4), 0x3a2a22);
    return br;
  };
  if (p.type === 'langhuis') {
    house(-L / 2, -L / 2 + L * 0.3, W * 0.8, W * 0.35);
    p.top = Math.max(barn(-L / 2 + L * 0.3, L / 2, W), 8);
  } else if (p.type === 'kophalsromp') {
    // head: the house across the front; neck: a low link; romp: the big barn behind
    const hx = L * 0.2, nx = L * 0.1;
    house(-L / 2, -L / 2 + hx, W * 0.7, W * 0.3);
    B.box(-L / 2 + hx + nx / 2, he * 0.4, 0, nx, he * 0.8, W * 0.42, wall);
    B.box(-L / 2 + hx + nx / 2, he * 0.8 + 0.2, 0, nx, 0.4, W * 0.5, roof);
    p.top = barn(-L / 2 + hx + nx, L / 2, W);
  } else if (p.type === 'tvorm') {
    house(-L / 2, -L * 0.1, W * 0.8, W * 0.3);
    // the barn crosses the house: its ridge runs along z
    const bw = W, bl = L * 0.4, bx = L * 0.1 + bl / 2, be = p.barnH * 0.55, br = p.barnH + bl * 0.25;
    B.box(bx, be / 2, 0, bl, be, bw, wall);
    B.quadOut([bx - bl / 2 - 0.4, be, bw / 2 + 0.4], [bx, br, bw / 2 + 0.4], [bx, br, -bw / 2 - 0.4], [bx - bl / 2 - 0.4, be, -bw / 2 - 0.4], [-1, 1, 0], roof);
    B.quadOut([bx + bl / 2 + 0.4, be, bw / 2 + 0.4], [bx + bl / 2 + 0.4, be, -bw / 2 - 0.4], [bx, br, -bw / 2 - 0.4], [bx, br, bw / 2 + 0.4], [1, 1, 0], roof);
    p.top = br;
  } else {
    // stolp: a square body under a pyramid roof with a ridge cap
    const s = Math.min(L, W), he2 = he + 0.8;
    B.box(0, he2 / 2, 0, s, he2, s, wall);
    B.geo(new THREE.ConeGeometry(s * 0.78, s * 0.62, 4, 1, true).rotateY(Math.PI / 4), composeMatrix(0, he2 + s * 0.31, 0), roof);
    if (lod !== LOD_SKY) B.box(0, he2 + s * 0.62 + 0.3, 0, 0.5, 0.8, 0.5, roof);
    if (lod === LOD_FULL) for (const s2 of [-1, 1]) B.box(0, 1.7, s2 * (s / 2 + 0.05), 1.2, 1.4, 0.08, 0x1c2228, G_GLASS);
    p.top = he2 + s * 0.62 + 0.7;
  }
  // two trees on the yard make it a farm and not a shed
  if (lod === LOD_FULL) {
    for (const [dx, dz] of [[-L / 2 - 3, W / 2 + 3], [L / 2 + 3, -W / 2 - 3]]) {
      B.geo(new THREE.CylinderGeometry(0.2, 0.28, 3, 6), composeMatrix(dx, 1.5, dz), 0x4a3a2a);
      B.geo(new THREE.IcosahedronGeometry(2.2, 0), composeMatrix(dx, 4.4, dz), 0x3f6a32);
    }
  }
}

function industryParams(item, t, box, h) {
  const n = item.n || '';
  const silo = item.k === 'silo' || t.man_made === 'silo' || t.building === 'silo' || /silo|graan/i.test(n);
  const hv = metres(t.height);
  // a harbour warehouse: a long gabled brick hall with a hoist bay on the quay side
  if (item.k === 'pakhuis') return { kit: 'industry', type: 'pakhuis', len: clamp(box ? box.len : 36, 14, 80), wid: clamp(box ? box.wid : 14, 8, 24), height: clamp(hv || 7 + h * 4, 6, 14), floors: 2 + Math.floor(h * 2) };
  if (silo) return { kit: 'industry', type: 'silo', len: clamp(box ? box.len : 16, 8, 30), wid: clamp(box ? box.wid : 10, 6, 20), height: clamp(hv || 18 + h * 14, 12, 45), count: 2 + Math.floor(h * 3) };
  return { kit: 'industry', type: 'factory', len: clamp(box ? box.len : 40, 16, 90), wid: clamp(box ? box.wid : 22, 10, 40), height: clamp(hv || 9 + h * 5, 7, 20), chimney: h < 0.7 || /fabriek|suiker|zout|mout/i.test(n) };
}

function industry(B, p, lod) {
  const L = p.len, W = p.wid;
  if (p.type === 'silo') {
    // a row of cylinders on a low plant, a gallery on top, a lift tower
    const r = Math.min(W / 2, L / (p.count * 2)) * 0.95;
    B.box(0, 1.5, 0, L, 3, W, 0x8a8a86);
    for (let i = 0; i < p.count; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / p.count;
      B.geo(new THREE.CylinderGeometry(r, r, p.height, 10), composeMatrix(x, 3 + p.height / 2, 0), i % 2 ? 0xcfcdc6 : 0xb9b7b0);
      if (lod !== LOD_SKY) B.geo(new THREE.ConeGeometry(r * 1.02, r * 0.5, 10), composeMatrix(x, 3 + p.height + r * 0.25, 0), 0x6e6c68);
    }
    if (lod !== LOD_SKY) B.box(0, 3 + p.height + r * 0.8, 0, L * 0.9, 1.2, 1.4, 0x6e6c68);
    B.box(-L / 2 - 1.2, (3 + p.height + 4) / 2, 0, 2.4, 3 + p.height + 4, 2.4, 0x7a7a76);
    p.top = 3 + p.height + 4;
    return;
  }
  if (p.type === 'pakhuis') {
    const he = p.height, rh = Math.min(5.5, W * 0.45);
    B.box(0, he / 2, 0, L, he, W, 0x8f4d38);
    gableRoof(B, -L / 2, L / 2, W / 2, he, he + rh, 0x4a4f55, 0x8f4d38);
    // the hoist bay: a small gable that sticks out of the roof above the loading doors
    const bx = L * 0.22;
    B.box(bx, he + rh * 0.35, W / 2 + 0.25, 3.2, rh * 0.7, 0.5, 0x8f4d38);
    p.top = he + rh;
    if (lod === LOD_SKY) return;
    B.box(bx, he + rh * 0.75, W / 2 + 0.9, 0.35, 0.35, 1.4, 0x3a2a22); // the hoist beam
    if (lod !== LOD_FULL) return;
    const bays = Math.max(3, Math.floor(L / 4));
    const fh = he / p.floors;
    for (let f = 0; f < p.floors; f++) for (let i = 0; i < bays; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / bays;
      const door = i === Math.round((bx + L / 2) / L * bays - 0.5);
      for (const sd of [-1, 1]) B.box(x, f * fh + fh * 0.55, sd * (W / 2 + 0.05), door ? 1.6 : 1.0, door ? 2.2 : 1.3, 0.08, door ? 0x3a2a22 : 0x1c2228, door ? undefined : G_GLASS);
    }
    return;
  }
  // factory: a long brick hall under sawtooth roofs, a tall chimney
  const he = p.height;
  B.box(0, he / 2, 0, L, he, W, 0x9a5a40);
  const n = Math.max(2, Math.round(L / 9));
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (L * i) / n, x1 = -L / 2 + (L * (i + 1)) / n;
    // each tooth: a steep glazed north face, a gentle slope south
    B.quadOut([x0, he, -W / 2], [x0, he + 2.6, -W / 2], [x1, he + 2.6, -W / 2], [x1, he, -W / 2], [0, 0, -1], 0x6e6a66);
    B.quadOut([x0, he, W / 2], [x1, he, W / 2], [x1, he + 2.6, W / 2], [x0, he + 2.6, W / 2], [0, 0, 1], 0x6e6a66);
    B.quadOut([x0, he + 2.6, -W / 2], [x0, he + 2.6, W / 2], [x1, he, W / 2], [x1, he, -W / 2], [0, 1, 0], 0x4e5a60);
    if (lod === LOD_FULL) B.box((x0 + x1) / 2, he + 1.3, W / 2 + 0.06, (x1 - x0) * 0.7, 1.4, 0.06, 0xbfd0d6, G_GLASS);
  }
  p.top = he + 2.6;
  if (p.chimney) {
    const ch = he * 2.4 + 8, cx = L / 2 - 4;
    B.geo(new THREE.CylinderGeometry(0.9, 1.5, ch, 8), composeMatrix(cx, ch / 2, -W / 2 + 3), 0x8a4a36);
    if (lod !== LOD_SKY) B.box(cx, ch - 0.1, -W / 2 + 3, 2.2, 0.4, 2.2, 0x2c2c2e);
    p.top = Math.max(p.top, ch);
  }
  if (lod === LOD_FULL) {
    B.box(0, he * 0.4, W / 2 + 0.05, L * 0.8, 1.2, 0.08, 0x1c2228, G_GLASS);
    B.box(-L / 2 + 3, 2, W / 2 + 0.06, 4, 4, 0.12, 0x4a5258);
  }
}

function flatParams(item, t, box, h) {
  const levels = clamp(Number(t['building:levels']) || Math.round(4 + h * 8), 4, 16);
  return { kit: 'flat', len: clamp(box ? box.len : 48, 20, 90), wid: clamp(box ? box.wid : 14, 9, 22), levels, brick: h < 0.45 ? 'red' : h < 0.8 ? 'yellow' : 'white', balcony: h > 0.3 };
}

function flat(B, p, lod) {
  const L = p.len, W = p.wid, lv = 3, H = p.levels * lv;
  const wall = BRICK[p.brick] || BRICK.red;
  B.box(0, H / 2, 0, L, H, W, wall);
  B.box(0, H + 0.25, 0, L + 0.4, 0.5, W + 0.4, 0xb8b4aa);
  B.box(L / 2 - 4, H + 1.5, 0, 5, 2, 4, wall); // stair and lift top
  p.top = H + 2.5;
  if (lod === LOD_SKY) return;
  const bays = Math.max(4, Math.floor(L / 3.2));
  for (let f = 0; f < p.levels; f++) {
    if (lod === LOD_FULL) {
      for (let i = 0; i < bays; i++) {
        const x = -L / 2 + (L * (i + 0.5)) / bays;
        for (const s of [-1, 1]) B.box(x, f * lv + 1.8, s * (W / 2 + 0.05), 1.4, 1.5, 0.08, 0x1c2228, G_GLASS);
        if (p.balcony && f > 0 && i % 2 === 0) B.box(x, f * lv + 0.1, W / 2 + 0.7, 2.4, 0.18, 1.4, 0xd6d2c8);
      }
    }
    B.box(0, f * lv + 0.05, 0, L + 0.1, 0.12, W + 0.1, 0xb8b4aa);
  }
}

function hallParams(item, t, box, h) {
  const n = item.n || '';
  const type = item.k === 'townhall' || t.amenity === 'townhall' ? 'townhall'
    : item.k === 'station' || t.railway === 'station' || t.building === 'train_station' ? 'station'
      : item.k === 'museum' || t.tourism === 'museum' || /museum/i.test(n) ? 'museum' : 'school';
  const dims = { townhall: [26, 14, 2], station: [32, 12, 1], museum: [30, 16, 2], school: [38, 14, 2] }[type];
  return {
    kit: 'hall', type, len: clamp(box ? box.len : dims[0], 14, 70), wid: clamp(box ? box.wid : dims[1], 8, 28),
    floors: clamp(Number(t['building:levels']) || dims[2], 1, 4), brick: type === 'museum' && h > 0.5 ? 'white' : h < 0.55 ? 'red' : 'yellow',
    roof: type === 'school' ? 'flat' : h < 0.5 ? 'slate' : 'tile',
  };
}

function hall(B, p, lod) {
  const L = p.len, W = p.wid, he = p.floors * 3.6 + 0.4;
  const wall = BRICK[p.brick] || BRICK.red, roof = p.roof === 'flat' ? 0x6e6a66 : ROOF[p.roof];
  B.box(0, he / 2, 0, L, he, W, wall);
  let top;
  if (p.roof === 'flat') {
    B.box(0, he + 0.2, 0, L + 0.4, 0.4, W + 0.4, 0xb8b4aa);
    top = he + 0.4;
  } else {
    // a gable for a station, a low hipped roof (a pyramid squashed onto the box) for a hall
    const rh = Math.min(5, W * 0.4);
    if (p.type === 'station') gableRoof(B, -L / 2, L / 2, W / 2, he, he + rh, roof, wall);
    else {
      const cone = new THREE.ConeGeometry(0.5 * Math.SQRT2, rh, 4, 1, true).rotateY(Math.PI / 4);
      cone.scale(L * 1.04, 1, W * 1.04);
      B.geo(cone, composeMatrix(0, he + rh / 2, 0), roof);
    }
    top = he + rh;
  }
  // the clock tower: a town hall's centre, a station's end
  if (p.type === 'townhall' || p.type === 'station') {
    const tw = clamp(W * 0.3, 3, 5), tx = p.type === 'station' ? L / 2 - tw : 0, th = he + 7 + tw;
    const crown = p.type === 'townhall' ? 'spire' : 'saddle';
    towerBody(B, tx, 0, tw, th, crown, wall, roof, lod);
    top = crownTop(crown, th, tw);
  } else if (p.type === 'museum') {
    for (let i = 0; i < 4; i++) B.box(-L * 0.18 + i * L * 0.12, he / 2, W / 2 + 0.6, 0.7, he, 0.7, 0xe6e0d4);
    B.box(0, he + 0.4, W / 2 + 0.6, L * 0.5, 0.8, 1.2, 0xe6e0d4);
  }
  if (p.type === 'station' && lod !== LOD_SKY) B.box(0, he - 0.5, W / 2 + 2, L * 0.9, 0.3, 4, 0x4a5258); // platform canopy
  p.top = top;
  if (lod !== LOD_FULL) return;
  const bays = Math.max(3, Math.floor(L / 3.4));
  for (let f = 0; f < p.floors; f++) {
    for (let i = 0; i < bays; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / bays;
      for (const s of [-1, 1]) B.box(x, f * 3.6 + 2.2, s * (W / 2 + 0.05), 1.3, 1.9, 0.08, 0x1c2228, G_GLASS);
    }
  }
  B.box(0, 1.3, W / 2 + 0.08, 2.2, 2.6, 0.12, 0x3a2a22);
}

// --- kits for the tiles' own buildings (issue #164) ---------------------------
// A tile building row (type from the OSM tag, name, hm in metres from 3D BAG or
// OSM, pts) that one of the everyday kits fits. Cheap to reject: most rows are
// houses. Returns an item for landmarkParams, or null.
const KIT_TYPES = new Set(['farm', 'silo', 'industrial', 'apartments', 'school', 'college', 'university', 'train_station', 'civic', 'public', 'warehouse']);
const FARM_NAMED = new Set(['farm', 'house', 'yes', 'industrial', 'detached', 'farm_auxiliary', 'barn', 'residential']);
const outlineArea = (o) => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return Math.abs(a / 2); };

export function kitItemFromBuilding(b, ring = null) {
  const type = b.type, name = b.name || '';
  // a name that says what it is: a museum, a town hall, a farm mapped as a house or a shed
  const named = name && (/museum/i.test(name) ? 'museum' : /stadhuis|gemeentehuis/i.test(name) ? 'townhall'
    : /boerderij|stolp|hoeve/i.test(name) && FARM_NAMED.has(type) ? 'farm' : null);
  if (!named && !KIT_TYPES.has(type)) return null;
  const pts = ring || b.pts;
  if (!pts || pts.length < 3) return null;
  const o = [];
  for (const p of pts) o.push(p[0], p[1]);
  const area = outlineArea(o);
  const hm = b.hm || 0;
  let k = named || null;
  if (!k) {
    if (type === 'farm') k = area >= 80 ? 'farm' : null;
    else if (type === 'silo') k = area >= 20 ? 'silo' : null;
    else if (type === 'industrial') k = /gemaal|gemeentewerken|transformator|zendmast|zuivering/i.test(name) ? null : area >= 2500 || (name && area >= 800) ? 'factory' : null;
    else if (type === 'warehouse') k = /pakhuis|loods|haven/i.test(name) && area >= 150 && area <= 4000 ? 'pakhuis' : null;
    else if (type === 'apartments') k = hm >= 22 && area >= 300 ? 'flat' : null;
    else if (type === 'school' || type === 'college' || type === 'university') k = area >= 500 ? 'school' : null;
    else if (type === 'train_station') k = area >= 60 ? 'station' : null;
    else if ((type === 'civic' || type === 'public') && /stadhuis|gemeentehuis/i.test(name)) k = 'townhall';
  }
  if (!k || area < 40 || area > 60000) return null;
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  const t = { building: type };
  if (hm) t.height = String(hm);
  if (k === 'flat') t['building:levels'] = String(Math.round(hm / 3));
  return { k, n: name, x: x / pts.length, y: y / pts.length, o, t };
}

// --- tile buildings the kit replaces (issue #338) --------------------------------
// A church, mill or borg kit (game/landmarkkits.json) is drawn whole on its own outline. The tile building
// on the same footprint is then a second, wrong building: a church mapped building=yes is a flat of
// twenty metres with housing windows (the height of the tower over the whole footprint), the tile house
// under a borg z-fights with the kit. ommelandlandmarks.js hides such a building while the kit stands.
// p: a landmarkParams result (kind, x, y, angle, len, wid; a mill has only the point); b: a tile row (pts).
export const COVER_KINDS = new Set(['church', 'chapel', 'mill', 'castle']);
const ringAreaOf = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const q = pts[(i + 1) % pts.length]; a += pts[i][0] * q[1] - q[0] * pts[i][1]; } return Math.abs(a / 2); };
const inRing = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const nearRing = (x, y, pts, r) => {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L));
    if (Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) <= r) return true;
  }
  return false;
};
export function kitCoversBuilding(p, b) {
  if (!p || !COVER_KINDS.has(p.kind) || !b || b.landmark || !b.pts || b.pts.length < 3) return false;
  const area = ringAreaOf(b.pts);
  if (p.kind === 'mill') return area <= 500 && (inRing(p.x, p.y, b.pts) || nearRing(p.x, p.y, b.pts, 3));
  if (!(p.len > 0 && p.wid > 0)) return false;
  let cx = 0, cy = 0;
  for (const q of b.pts) { cx += q[0]; cy += q[1]; }
  cx /= b.pts.length; cy /= b.pts.length;
  const ca = Math.cos(p.angle), sa = Math.sin(p.angle), dx = cx - p.x, dy = cy - p.y;
  const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
  if (Math.abs(u) > p.len / 2 + 3 || Math.abs(v) > p.wid / 2 + 3) return false;
  const ratio = area / (p.len * p.wid);
  return ratio >= 0.25 && ratio <= 3.5;
}
