// Beeldchecks zonder afhankelijkheden (#186, #5): een kleine PNG-lezer (8 bit, niet-geïnterlinieerd,
// zoals Electron's capturePage die schrijft), controles op zwarte, lege en ongeldige beelden en een
// kleine perceptuele handtekening (32x18 helderheidsraster) om met een vorige run te vergelijken.
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// -> { w, h, rgba: Uint8Array } of gooit een Error
export function decodePng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIG)) throw new Error('geen PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0, palette = null, trns = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!w || !h) throw new Error('PNG zonder IHDR');
  if (depth !== 8 || interlace) throw new Error(`PNG-variant niet ondersteund (diepte ${depth}, interlace ${interlace})`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error('PNG-kleurtype niet ondersteund: ' + ctype);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  if (raw.length < (stride + 1) * h) throw new Error('PNG-data te kort');
  const px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[dst + x - ch] : 0;
      const b = y ? px[dst - stride + x] : 0;
      const c = x >= ch && y ? px[dst - stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a = 255;
    if (ctype === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; a = px[i * 4 + 3]; }
    else if (ctype === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; }
    else if (ctype === 0) { r = g = b = px[i]; }
    else if (ctype === 4) { r = g = b = px[i * 2]; a = px[i * 2 + 1]; }
    else { const k = px[i]; r = palette ? palette[k * 3] : 0; g = palette ? palette[k * 3 + 1] : 0; b = palette ? palette[k * 3 + 2] : 0; if (trns && k < trns.length) a = trns[k]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { w, h, rgba };
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) { crcTable = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; } }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// RGBA-PNG schrijven (voor de tests van deze module).
export function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Beoordeelt één beeld. verdict: 'ok' | 'zwart' | 'leeg' | 'ongeldig'
//   zwart     meer dan 98% van de pixels bijna zwart
//   leeg      (bijna) één kleur: helderheids-standaardafwijking onder 2
//   ongeldig  meer dan de helft doorzichtig, of meer dan 20% foutkleur-magenta (255,0,255)
// NaN in de pixeldata kan niet in een PNG staan; een NaN in de GPU-uitvoer toont zich als zwart of magenta.
export function analyseImage({ w, h, rgba }) {
  const n = w * h;
  let black = 0, transp = 0, magenta = 0, sum = 0, sum2 = 0;
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
    const l = lum(r, g, b);
    sum += l; sum2 += l * l;
    if (a < 8) transp++;
    else if (l < 8) black++;
    if (r > 240 && g < 20 && b > 240) magenta++;
  }
  const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const stats = { w, h, black: black / n, transparent: transp / n, magenta: magenta / n, mean, std };
  let verdict = 'ok';
  if (stats.transparent > 0.5 || stats.magenta > 0.2) verdict = 'ongeldig';
  else if (stats.black > 0.98) verdict = 'zwart';
  else if (std < 2) verdict = 'leeg';
  return { verdict, ...stats };
}

export const SIG_W = 32, SIG_H = 18;

// 32x18 gemiddelde helderheid (0-255, geheel) als platte lijst.
export function signature({ w, h, rgba }) {
  const sums = new Float64Array(SIG_W * SIG_H), cnt = new Uint32Array(SIG_W * SIG_H);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(SIG_H - 1, Math.floor(y * SIG_H / h));
    for (let x = 0; x < w; x++) {
      const k = cy * SIG_W + Math.min(SIG_W - 1, Math.floor(x * SIG_W / w)), i = (y * w + x) * 4;
      sums[k] += lum(rgba[i], rgba[i + 1], rgba[i + 2]); cnt[k]++;
    }
  }
  return Array.from(sums, (s, k) => (cnt[k] ? Math.round(s / cnt[k]) : 0));
}

// Gemiddeld absoluut verschil tussen twee handtekeningen, als fractie 0..1; null als ze niet te vergelijken zijn.
export function signatureDiff(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return null;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length / 255;
}
