// BENADERDE voor-en-na-beelden van de wereldkleur (docs/WERELDKLEUR-21-11.md), zonder Electron en zonder GPU:
// neemt de beelden van het oude palet (docs/beeld-21-11/wereldkleur/*-m0.png, echte spelbeelden) en past per pixel dezelfde wiskunde toe als
// het spel (worldpalette.js dsWereld op de pixelkleur, worldgrade.js gradePixel). Dat is NIET wat de GPU tekent: het palet werkt in het
// spel op de materiaalkleur voor het licht, hier op de pixel na het licht, en tonemapping en bloom zijn niet nagebootst. Het geeft de
// richting en de sterkte; de echte beoordeling gebeurt in de Electron-sweep (docs/WERELDKLEUR-VERIFICATIE-21-11.md).
//   node scripts/world/wereldkleur_grading.mjs [uitvoermap]     (standaard docs/beeld-21-11/wereldkleur-grading)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dsWereld, setWereldMeng } from '../../game/js/worldpalette.js';
import { gradeParams, gradePixel } from '../../game/js/worldgrade.js';
import { WORLD_COLOR_STRENGTH } from '../../game/js/worldcolormode.js';

const hier = path.dirname(fileURLToPath(import.meta.url));
const bron = path.join(hier, '../../docs/beeld-21-11/wereldkleur');
const uit = process.argv[2] || path.join(hier, '../../docs/beeld-21-11/wereldkleur-grading');

// ------------------------------------------------------------ minimale PNG (8 bit, RGB of RGBA, niet verweven)
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error('alleen 8 bit zonder verweving'); }
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (!bpp) throw new Error('alleen RGB of RGBA');
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], o = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = raw[o + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px };
}
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const t = Buffer.from(type, 'ascii'), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); }
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// verkleinen met een gemiddelde over blokken (het oog beoordeelt kleur, niet pixels; houdt de bestanden klein)
function shrink(img, f) {
  const w = Math.floor(img.w / f), h = Math.floor(img.h / f), out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = [0, 0, 0];
    for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) for (let c = 0; c < 3; c++) s[c] += img.px[((y * f + j) * img.w + x * f + i) * img.bpp + c];
    for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = s[c] / (f * f);
  }
  return { w, h, px: out, bpp: 3 };
}

// de scenes: bronbeeld (oude palet), zonshoogte en weer van die scène
const SCENES = [
  { id: '1-grotemarkt-dag', e: 55, hour: 13, weer: {} },
  { id: '3-grotemarkt-avond', e: 2, hour: 20.5, weer: {} },
  { id: '5-binnenstad-regen', e: 40, hour: 14, weer: { overcast: 0.8, storm: 0.5 } },
  { id: '6-ommeland', e: 45, hour: 15, weer: {} },
];
const STANDEN = ['subtiel', 'drukwerk'];

fs.mkdirSync(uit, { recursive: true });
for (const sc of SCENES) {
  const f = path.join(bron, sc.id + '-m0.png');
  if (!fs.existsSync(f)) { console.log('ontbreekt', f); continue; }
  const img = shrink(decodePng(fs.readFileSync(f)), 3);
  const kolommen = [img.px];
  for (const stand of STANDEN) {
    const sp = WORLD_COLOR_STRENGTH[stand];
    const p = gradeParams({ stand, niveau: 'hoog', elevation: sc.e, hour: sc.hour, overcast: 0, mist: 0, storm: 0, rustig: false, kleurenblind: false, ...sc.weer }, {});
    const o = Buffer.alloc(img.px.length);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 3;
      const hex = (img.px[i] << 16) | (img.px[i + 1] << 8) | img.px[i + 2];
      const q = dsWereld(hex, 'auto', sp.meng);
      // raster en korrel rekenen in schermpixels van het volle beeld: hier op het verkleinde beeld, dus de punten zijn drie keer zo groot als in het spel
      const g = gradePixel([(q >> 16) & 255, (q >> 8) & 255, q & 255], p, x * 3, y * 3);
      o[i] = g[0]; o[i + 1] = g[1]; o[i + 2] = g[2];
    }
    kolommen.push(o);
  }
  const W = img.w * 3, out = Buffer.alloc(W * img.h * 3);
  for (let y = 0; y < img.h; y++) kolommen.forEach((k, c) => k.copy(out, (y * W + c * img.w) * 3, y * img.w * 3, (y + 1) * img.w * 3));
  const naam = `${sc.id}-oud-subtiel-drukwerk-benadering.png`;
  fs.writeFileSync(path.join(uit, naam), encodePng(W, img.h, out));
  console.log('geschreven', naam, `${W}x${img.h}`, Math.round(fs.statSync(path.join(uit, naam)).size / 1024) + ' kB');
}
setWereldMeng(null);
