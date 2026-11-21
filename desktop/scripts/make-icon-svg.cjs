// Writes resources/icon.svg (the zeefdruk app icon, ADR 0040, issue 1003) with the letters as
// plain paths read from the self-hosted Barlow Condensed ExtraBold (OFL, game/fonts), so the SVG
// needs no font and no embedded data. Flat fills only: paper tile, ink edge, hard ink shadow,
// bordgroen letters with a pink misprint copy, a zomergeel plate. No blur, no gradient, no raster.
//   node desktop/scripts/make-icon-svg.cjs
// then render the PNG/ICO/ICNS with: cd desktop && npx electron scripts/render-icon.cjs
const fs = require('fs');
const path = require('path');

const FONT = path.join(__dirname, '..', '..', 'game', 'fonts', 'BarlowCondensed-ExtraBold.ttf');
const OUT = path.join(__dirname, '..', 'resources', 'icon.svg');
const INK = { papier: '#f3ead3', inkt: '#1d1b17', bordgroen: '#0e6b3c', geel: '#f9c80e', roze: '#e8505b' };

const buf = fs.readFileSync(FONT);
const tables = {};
for (let i = 0; i < buf.readUInt16BE(4); i++) {
  const o = 12 + i * 16;
  tables[buf.toString('latin1', o, o + 4)] = buf.readUInt32BE(o + 8);
}
const upem = buf.readUInt16BE(tables.head + 18);
const locaLong = buf.readInt16BE(tables.head + 50) === 1;
const nHm = buf.readUInt16BE(tables.hhea + 34);

function glyphIndex(code) {
  const c = tables.cmap, n = buf.readUInt16BE(c + 2);
  for (let i = 0; i < n; i++) {
    const rec = c + 4 + i * 8, plat = buf.readUInt16BE(rec), enc = buf.readUInt16BE(rec + 2);
    if (!((plat === 3 && enc === 1) || plat === 0)) continue;
    const t = c + buf.readUInt32BE(rec + 4);
    if (buf.readUInt16BE(t) !== 4) continue;
    const segX2 = buf.readUInt16BE(t + 6), endO = t + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = buf.readUInt16BE(endO + s * 2), start = buf.readUInt16BE(startO + s * 2);
      if (code < start || code > end) continue;
      const delta = buf.readInt16BE(deltaO + s * 2), ro = buf.readUInt16BE(rangeO + s * 2);
      if (ro === 0) return (code + delta) & 0xffff;
      const g = buf.readUInt16BE(rangeO + s * 2 + ro + (code - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
  }
  throw new Error('geen glyph voor ' + code);
}
const advance = (g) => buf.readUInt16BE(tables.hmtx + Math.min(g, nHm - 1) * 4);

// A glyph as SVG path data in font units, y flipped (SVG y runs down), origin at the baseline.
function glyphPath(g, dx, scale) {
  const o = tables.glyf + (locaLong ? buf.readUInt32BE(tables.loca + g * 4) : buf.readUInt16BE(tables.loca + g * 2) * 2);
  const nC = buf.readInt16BE(o);
  if (nC < 0) throw new Error('samengestelde glyph niet ondersteund');
  const ends = []; for (let i = 0; i < nC; i++) ends.push(buf.readUInt16BE(o + 10 + i * 2));
  const nP = ends[nC - 1] + 1, insLen = buf.readUInt16BE(o + 10 + nC * 2);
  let p = o + 12 + nC * 2 + insLen;
  const flags = [];
  while (flags.length < nP) { const f = buf[p++]; flags.push(f); if (f & 8) { let r = buf[p++]; while (r--) flags.push(f); } }
  const xs = [], ys = [];
  let v = 0;
  for (const f of flags) { if (f & 2) { const d = buf[p++]; v += f & 16 ? d : -d; } else if (!(f & 16)) { v += buf.readInt16BE(p); p += 2; } xs.push(v); }
  v = 0;
  for (const f of flags) { if (f & 4) { const d = buf[p++]; v += f & 32 ? d : -d; } else if (!(f & 32)) { v += buf.readInt16BE(p); p += 2; } ys.push(v); }
  const X = (x) => +(dx + x * scale).toFixed(1), Y = (y) => +(-y * scale).toFixed(1);
  let d = '', start = 0;
  for (const end of ends) {
    const pts = [];
    for (let i = start; i <= end; i++) pts.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
    start = end + 1;
    // start at an on-curve point (insert the midpoint when the contour begins off-curve)
    let k = pts.findIndex((q) => q.on);
    if (k < 0) { const a = pts[0], b = pts[pts.length - 1]; pts.unshift({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true }); k = 0; }
    const r = pts.slice(k).concat(pts.slice(0, k));
    d += `M${X(r[0].x)} ${Y(r[0].y)}`;
    let i = 1;
    while (i <= r.length) {
      const cur = r[i % r.length];
      if (cur.on) { d += `L${X(cur.x)} ${Y(cur.y)}`; i++; continue; }
      const nxt = r[(i + 1) % r.length];
      const end2 = nxt.on ? nxt : { x: (cur.x + nxt.x) / 2, y: (cur.y + nxt.y) / 2 };
      d += `Q${X(cur.x)} ${Y(cur.y)} ${X(end2.x)} ${Y(end2.y)}`;
      i += nxt.on ? 2 : 1;
    }
    d += 'Z';
  }
  return d;
}

// text as one path: left edge at x0, baseline at y (added through transform by the caller)
function textPath(str, size, spacing = 0) {
  const scale = size / upem;
  let x = 0, d = '';
  for (const ch of str) {
    const g = glyphIndex(ch.codePointAt(0));
    d += glyphPath(g, x, scale);
    x += advance(g) * scale + spacing;
  }
  return { d, width: x - spacing };
}
const capHeight = (size) => 0.7 * size; // Barlow Condensed cap height is 700/1000

// variant 'small' (16 to 48 px): no plate, a bigger mark and heavier edges, so it stays readable.
function build(variant = 'full') {
const small = variant === 'small';
const gde = textPath('GDE', small ? 640 : 560, small ? 0 : 6);
const gdeX = 496 - gde.width / 2, gdeY = small ? 700 : 560;
const gron = textPath('GRONINGEN', 104, 8);
const gronX = 496 - gron.width / 2, gronY = 726 + capHeight(104) / 2;
const plate = small ? '' : `<rect x="140" y="642" width="712" height="168" rx="20" fill="${INK.geel}" stroke="${INK.inkt}" stroke-width="16"/>
<g transform="translate(${gronX.toFixed(1)} ${gronY.toFixed(1)})"><path d="${gron.d}" fill="${INK.inkt}"/></g>
`;
const off = small ? 28 : 20;
const t = small ? 28 : 56, tw = small ? 936 : 880, sh = small ? 36 : 40;
return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<!-- GDE Groningen app icon, zomerse zeefdruk (ADR 0040). Letters are paths from Barlow Condensed ExtraBold (SIL OFL 1.1, game/fonts/LICENSE.md); generated by desktop/scripts/make-icon-svg.cjs. Flat fills, no blur. -->
<rect x="${t + sh}" y="${t + sh}" width="${tw}" height="${tw}" rx="96" fill="${INK.inkt}"/>
<rect x="${t}" y="${t}" width="${tw}" height="${tw}" rx="96" fill="${INK.papier}" stroke="${INK.inkt}" stroke-width="${small ? 44 : 28}"/>
<g transform="translate(${gdeX.toFixed(1)} ${gdeY})"><path d="${gde.d}" fill="${INK.roze}" transform="translate(${off} ${off})"/><path d="${gde.d}" fill="${INK.bordgroen}"/></g>
${plate}</svg>
`;
}

module.exports = { build, textPath, capHeight, INK };
if (require.main === module) {
  const svg = build('full');
  fs.writeFileSync(OUT, svg);
  console.log('wrote', path.relative(process.cwd(), OUT), svg.length, 'bytes');
}
