// Kleine PNG-lezer, -schrijver en pixelvergelijking zonder afhankelijkheden (#994).
// Leest niet-geinterlinieerde PNG's van 8 bit (grijs, RGB, palet, grijs+alfa, RGBA); dat is wat Electron maakt.
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodeert een PNG naar { w, h, data } met data als RGBA (w*h*4). */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('geen PNG');
  let p = 8; let w = 0; let h = 0; let depth = 0; let ct = 0; let interlace = 0; let palette = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; ct = body[9]; interlace = body[12]; }
    else if (type === 'PLTE') palette = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error('alleen 8 bit zonder interlacing');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!ch) throw new Error('kleurtype ' + ct + ' niet ondersteund');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch; const cur = Buffer.alloc(stride); let prev = Buffer.alloc(stride);
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0; const b = prev[x]; const c = x >= ch ? prev[x - ch] : 0;
      cur[x] = (line[x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? ((a + b) >> 1) : paeth(a, b, c))) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; const i = x * ch;
      if (ct === 6) { out[o] = cur[i]; out[o + 1] = cur[i + 1]; out[o + 2] = cur[i + 2]; out[o + 3] = cur[i + 3]; }
      else if (ct === 2) { out[o] = cur[i]; out[o + 1] = cur[i + 1]; out[o + 2] = cur[i + 2]; out[o + 3] = 255; }
      else if (ct === 0) { out[o] = out[o + 1] = out[o + 2] = cur[i]; out[o + 3] = 255; }
      else if (ct === 4) { out[o] = out[o + 1] = out[o + 2] = cur[i]; out[o + 3] = cur[i + 1]; }
      else { const k = cur[i] * 3; out[o] = palette[k]; out[o + 1] = palette[k + 1]; out[o + 2] = palette[k + 2]; out[o + 3] = 255; }
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(b) { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const t = Buffer.from(type, 'latin1'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, body])));
  return Buffer.concat([len, t, body, crc]);
}

/** Schrijft { w, h, data(RGBA) } als PNG. */
export function encodePng({ w, h, data }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Vergelijkt twee beelden. Een pixel telt als afwijkend als een kanaal meer dan `tolerantie` (0..255) verschilt.
 * Geeft { gelijkMaat, afwijkend, totaal, aandeel, diff } terug; diff is een beeld met de afwijkende pixels rood
 * op een verdoofd origineel (alleen als `maakDiff`). Een andere maat telt als volledig afwijkend.
 */
export function vergelijk(a, b, { tolerantie = 8, maakDiff = false } = {}) {
  if (a.w !== b.w || a.h !== b.h) return { gelijkMaat: false, afwijkend: Math.max(a.w * a.h, b.w * b.h), totaal: Math.max(a.w * a.h, b.w * b.h), aandeel: 1, diff: null };
  const n = a.w * a.h; let afwijkend = 0; const diff = maakDiff ? Buffer.alloc(n * 4) : null;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(Math.abs(a.data[o] - b.data[o]), Math.abs(a.data[o + 1] - b.data[o + 1]), Math.abs(a.data[o + 2] - b.data[o + 2]));
    const slecht = d > tolerantie;
    if (slecht) afwijkend++;
    if (diff) {
      if (slecht) { diff[o] = 255; diff[o + 1] = 0; diff[o + 2] = 60; diff[o + 3] = 255; }
      else { const g = 255 - ((255 - a.data[o]) >> 2); diff[o] = diff[o + 1] = diff[o + 2] = g; diff[o + 3] = 255; }
    }
  }
  return { gelijkMaat: true, afwijkend, totaal: n, aandeel: n ? afwijkend / n : 0, diff: diff ? { w: a.w, h: a.h, data: diff } : null };
}
