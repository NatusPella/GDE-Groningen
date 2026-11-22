// Bold map glyphs (node-safe, no DOM) for the places whose own little drawing did not read on the map.
// The badge (hud_panel.js flatSprite) keeps only the cream pixels of a drawing, so a glyph that was
// drawn in colour (yellow nozzle, red heart, brown pan), in dark ink or in hairlines came out as a
// blob or a stray stroke. These are single-colour cream silhouettes on the disc, drawn with the
// disc's own colour where a hole is wanted (the hole shows as the badge fill).
// Units: the disc is 4.6 wide, a glyph stays inside +-3.4. drawMapGlyph returns false for other kinds.
import { INK } from './mapstyle.js';
import { iconInner } from './icons.js';

const CREAM = '#f2ede0';
const DISC = INK.green;

function pennant(g) {
  g.strokeStyle = CREAM; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-1.8, 3.2); g.lineTo(-1.8, -3.2); g.stroke();
  g.beginPath(); g.moveTo(-1.8, -3.2); g.lineTo(3, -1.7); g.lineTo(-1.8, -0.2); g.closePath(); g.fillStyle = CREAM; g.fill();
}

function heart(g) {
  g.beginPath();
  g.moveTo(0, 3.2);
  g.bezierCurveTo(-4.6, 0.2, -3.4, -3.2, -1.5, -3.1);
  g.bezierCurveTo(-0.7, -3.0, 0, -2.4, 0, -1.8);
  g.bezierCurveTo(0, -2.4, 0.7, -3.0, 1.5, -3.1);
  g.bezierCurveTo(3.4, -3.2, 4.6, 0.2, 0, 3.2);
  g.fillStyle = CREAM; g.fill();
}

function friesCone(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.moveTo(-2.4, -0.2); g.lineTo(2.4, -0.2); g.lineTo(0, 3.5); g.closePath(); g.fill();
  g.strokeStyle = CREAM; g.lineWidth = 0.95; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-1.5, -0.9); g.lineTo(-1.8, -3.2);
  g.moveTo(0, -0.9); g.lineTo(0, -3.5);
  g.moveTo(1.5, -0.9); g.lineTo(1.8, -3.2);
  g.stroke();
}

function milkCan(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.roundRect(-1.4, -3.5, 2.8, 1, 0.4); g.fill();
  g.beginPath(); g.moveTo(-0.9, -2.5); g.lineTo(0.9, -2.5); g.lineTo(1.7, -1.5); g.lineTo(-1.7, -1.5); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-1.9, -1.5); g.lineTo(1.9, -1.5); g.lineTo(2.3, 3.2); g.lineTo(-2.3, 3.2); g.closePath(); g.fill();
  g.strokeStyle = CREAM; g.lineWidth = 0.8;
  g.beginPath(); g.arc(-2.3, -0.2, 1, Math.PI * 1.5, Math.PI * 0.5, true); g.stroke();
  g.beginPath(); g.arc(2.3, -0.2, 1, Math.PI * 1.5, Math.PI * 0.5, false); g.stroke();
  g.fillStyle = DISC;
  g.fillRect(-1.5, 0.5, 3, 0.7);
}

function chequeredFlag(g) {
  g.strokeStyle = CREAM; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-2.9, 3.4); g.lineTo(-2.9, -3.4); g.stroke();
  g.fillStyle = CREAM;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) g.fillRect(-2.5 + i * 1.45, -3.2 + j * 1.35, 1.45, 1.35);
}

function peak(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.moveTo(-3.6, 2.9); g.lineTo(-0.9, -2.7); g.lineTo(0.5, -0.1); g.lineTo(1.5, -1.6); g.lineTo(3.6, 2.9); g.closePath(); g.fill();
}

function vliegtuig(g) {
  g.fillStyle = CREAM;
  g.beginPath();
  g.moveTo(0, -3.7); g.lineTo(0.7, -1.5); g.lineTo(3.7, 0.5); g.lineTo(3.7, 1.5); g.lineTo(0.7, 0.8);
  g.lineTo(0.5, 2.6); g.lineTo(1.7, 3.4); g.lineTo(1.7, 3.9); g.lineTo(0, 3.4); g.lineTo(-1.7, 3.9); g.lineTo(-1.7, 3.4);
  g.lineTo(-0.5, 2.6); g.lineTo(-0.7, 0.8); g.lineTo(-3.7, 1.5); g.lineTo(-3.7, 0.5); g.lineTo(-0.7, -1.5);
  g.closePath(); g.fill();
}

function waterSki(g) {
  g.save();
  g.rotate(-0.5);
  g.fillStyle = CREAM;
  g.beginPath(); g.roundRect(-3.4, -1.7, 6.8, 1.2, 0.6); g.fill();
  g.restore();
  g.strokeStyle = CREAM; g.lineWidth = 0.95; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-3.4, 2.4); g.quadraticCurveTo(-1.7, 1.2, 0, 2.4); g.quadraticCurveTo(1.7, 3.6, 3.4, 2.4); g.stroke();
}

function fryingPan(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.arc(-0.7, 0.2, 2.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.roundRect(1.6, -0.5, 2.2, 1.2, 0.5); g.fill();
  g.fillStyle = DISC;
  g.beginPath(); g.arc(-0.7, 0.2, 1.4, 0, Math.PI * 2); g.fill();
}

function fish(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.ellipse(-0.6, 0, 2.7, 1.8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(1.7, 0); g.lineTo(3.6, -1.7); g.lineTo(3.6, 1.7); g.closePath(); g.fill();
  g.fillStyle = DISC;
  g.beginPath(); g.arc(-1.8, -0.4, 0.45, 0, Math.PI * 2); g.fill();
}

function crown(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.moveTo(-3.2, 2.6); g.lineTo(-3.4, -1.8); g.lineTo(-1.6, 0.2); g.lineTo(0, -2.8); g.lineTo(1.6, 0.2); g.lineTo(3.4, -1.8); g.lineTo(3.2, 2.6); g.closePath(); g.fill();
  g.fillStyle = DISC;
  g.fillRect(-2.6, 1.5, 5.2, 0.55);
}

function tent(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.moveTo(-3.5, 0.5); g.lineTo(0, -2.9); g.lineTo(3.5, 0.5); g.closePath(); g.fill();
  g.fillRect(-2.8, 0.5, 5.6, 2.7);
  g.strokeStyle = CREAM; g.lineWidth = 0.7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -2.9); g.lineTo(0, -3.6); g.stroke();
  g.fillStyle = DISC;
  g.beginPath(); g.moveTo(-0.95, 3.2); g.lineTo(0, 1.1); g.lineTo(0.95, 3.2); g.closePath(); g.fill();
}

// kind -> { glyph, disc colour (for the old round look and the holes) }
const GLYPHS = {
  'act-carbid': milkCan,
  'act-kartbaan': chequeredFlag,
  'act-klimtoren': peak,
  'act-waterski': waterSki,
  'act-vliegschool': vliegtuig,
  'act-pannenkoek': fryingPan,
  'act-hengelen': fish,
  'act-snackketen': crown,
  'act-evenementen': tent,
  'pg-jelle': heart,
  'pg-fjord': friesCone,
  dorp: pennant,
  onderdeel: cog,
  wrakduik: anchor,
  streekuitdaging: routeFlag,
};
export const MAP_GLYPH_KINDS = Object.keys(GLYPHS);

// Phosphor (icons.js, ADR 0041): waar de browser Path2D kent tekent de schijf de betekenis uit de iconenset
// (bold, in crème); anders (node, tests) blijft de eigen tekening hierboven. Betekenisnamen, geen bestanden.
export const PH_GLYPHS = {
  'act-carbid': 'water', 'act-kartbaan': 'vlag', 'act-klimtoren': 'hoogte', 'act-waterski': 'zwemmen', 'act-vliegschool': 'vliegtuig',
  'act-pannenkoek': 'kookpot', 'act-hengelen': 'vis', 'act-snackketen': 'kroon', 'act-evenementen': 'tent',
  'pg-jelle': 'hart_vol', 'pg-fjord': 'eten', dorp: 'veroverd', onderdeel: 'tandwiel', wrakduik: 'anker', streekuitdaging: 'route',
};
// De rest van de markers (20-11): winkels, bijbanen, haltes en andere plekken tekenen hun betekenis ook uit Phosphor, zodat kaart
// en minikaart één iconenstijl hebben. De sleutels zijn de soorten die de eigen tekenfuncties kennen (shops.js, sidejobs.js, ...).
export const PH_KIND = {
  station: 'trein', livebus: 'bus', roosterbus: 'bus', 'ov-halte': 'bus', pigeon: 'duif', heli: 'helikopter', padel: 'padel', wereldeinde: 'wereldbol',
};
export const PH_SHOP = {
  wapens: 'doel', pand: 'gebouw', kleding: 'kleding', kapper: 'schaar', tabak: 'sigaret', super: 'kar', snack: 'burger', fietsen: 'fiets',
  fietsenmaker: 'gereedschap', auto: 'auto', tuning: 'tandwiel', boot: 'boot', spuit: 'spuit', eikea: 'stoel', heli: 'helikopter',
};
export const PH_JOB = {
  bezorger: 'pakket', taxi: 'taxi', bus: 'bus', rondvaart: 'boot', fietsdepot: 'fiets', vracht: 'oplegger', verhuizing: 'vrachtwagen',
  boa: 'schild', rechtbank: 'rechter', cabaret: 'podium', museumbus: 'bus', suikerbieten: 'gewas', herstelploeg: 'gereedschap', oogtv: 'camera',
  schouwburg: 'kaartje', bernardrit: 'auto', vandermeden: 'gebouw', telefoonrave: 'telefoon', loket: 'stempel', studiestaat: 'studie',
  vigilantia: 'verrekijker', promotie: 'promotie', kamerkoning: 'kroon', wolkenhal: 'wolk', helix: 'gebouw', niemeyer: 'gebouw',
  energielabel: 'energie', tjalke: 'boot', bernard: 'auto', krant: 'krant', snackbar: 'eten',
};
const phPaths = new Map();
function phGlyph(g, naam) {
  if (typeof Path2D === 'undefined') return false;
  let lijst = phPaths.get(naam);
  if (!lijst) { lijst = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); phPaths.set(naam, lijst); }
  if (!lijst.length) return false;
  g.save();
  g.translate(-3.4, -3.4); g.scale(6.8 / 256, 6.8 / 256);
  g.fillStyle = CREAM;
  for (const p of lijst) g.fill(p);
  g.restore();
  return true;
}

// Een Phosphor-icoon (bold, crème) in een vierkant van `box` eenheden rond de oorsprong. Geeft false zonder Path2D (node) of onbekende naam.
export function phosphorInBox(g, naam, box) {
  if (typeof Path2D === 'undefined' || !naam) return false;
  let lijst = phPaths.get(naam);
  if (!lijst) { lijst = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); phPaths.set(naam, lijst); }
  if (!lijst.length) return false;
  g.save();
  g.translate(-box / 2, -box / 2); g.scale(box / 256, box / 256);
  g.fillStyle = CREAM;
  for (const p of lijst) g.fill(p);
  g.restore();
  return true;
}
// De Path2D-paden van een Phosphor-betekenis (bold, viewBox 256), of null zonder Path2D (node) of voor een onbekende naam.
export function phosphorPaden(naam) {
  if (typeof Path2D === 'undefined' || !naam) return null;
  let lijst = phPaths.get(naam);
  if (!lijst) { lijst = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); phPaths.set(naam, lijst); }
  return lijst.length ? lijst : null;
}
// De Phosphor-naam van een marker die geen eigen glyph heeft, of null.
function phosphorNaamVan(kind) {
  if (PH_KIND[kind]) return PH_KIND[kind];
  if (kind.startsWith('shop-')) return PH_SHOP[kind.slice(5)] || null;
  return null;
}

export function drawMapGlyph(ctx, kind, s) {
  const glyph = GLYPHS[kind];
  const extra = glyph ? null : phosphorNaamVan(kind);
  if (!glyph && !extra) return false;
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = DISC;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = INK.dark;
  ctx.stroke();
  ctx.save();
  ctx.scale(s, s);
  if (extra) { if (!phGlyph(ctx, extra)) { /* node zonder Path2D: alleen de schijf */ } } else if (!(PH_GLYPHS[kind] && phGlyph(ctx, PH_GLYPHS[kind]))) glyph(ctx);
  ctx.restore();
  return true;
}

function cog(g) {
  g.fillStyle = CREAM;
  g.beginPath(); g.arc(0, 0, 2.1, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    g.save(); g.rotate(a);
    g.fillRect(-0.45, -3.4, 0.9, 1.5);
    g.restore();
  }
  g.fillStyle = DISC;
  g.beginPath(); g.arc(0, 0, 0.8, 0, Math.PI * 2); g.fill();
}

function anchor(g) {
  g.strokeStyle = CREAM; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath(); g.arc(0, -2.3, 0.9, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(0, -1.4); g.lineTo(0, 3.2); g.moveTo(-2.1, 0.4); g.lineTo(2.1, 0.4); g.stroke();
  g.beginPath(); g.arc(0, 1.2, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
}

function routeFlag(g) {
  g.strokeStyle = CREAM; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-2.6, 3.3); g.lineTo(-2.6, -3.3); g.stroke();
  g.fillStyle = CREAM;
  g.beginPath(); g.moveTo(-2.6, -3.2); g.lineTo(2.8, -1.7); g.lineTo(-2.6, -0.2); g.closePath(); g.fill();
  g.beginPath(); g.arc(-2.6, 3.4, 0.8, 0, Math.PI * 2); g.fill();
}
