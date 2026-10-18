// Pure helpers for the app icons: pack PNGs into .ico / .icns and read them
// back (used by render-icon.cjs and scripts/app_icons_test.mjs). No dependencies.
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// width, height, colour type (6 = RGBA) and whether any pixel is not opaque is
// only knowable for colour type 6 by decoding, so alpha is reported as a type flag.
function pngInfo(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG) || buf.toString('latin1', 12, 16) !== 'IHDR') throw new Error('geen PNG');
  const colorType = buf[25];
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType, hasAlphaChannel: colorType === 4 || colorType === 6 };
}

// Windows .ico with PNG-compressed entries (Vista and later); 256 is stored as 0
function packIco(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = [];
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); offset += png.length;
  }
  return Buffer.concat([head, ...dir, ...entries.map((x) => x.png)]);
}

function readIco(buf) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('geen ICO');
  const n = buf.readUInt16LE(4);
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = 6 + 16 * i;
    const size = buf[o] || 256;
    const len = buf.readUInt32LE(o + 8), off = buf.readUInt32LE(o + 12);
    out.push({ size, png: buf.subarray(off, off + len) });
  }
  return out;
}

// macOS .icns with PNG payloads; type -> pixel size
const ICNS_TYPES = { ic11: 32, ic12: 64, ic07: 128, ic13: 256, ic08: 256, ic09: 512, ic14: 512, ic10: 1024 };
function packIcns(items) { // items: [{ type, png }]
  const chunks = items.map(({ type, png }) => {
    const h = Buffer.alloc(8); h.write(type, 0, 'latin1'); h.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([h, png]);
  });
  const total = 8 + chunks.reduce((a, c) => a + c.length, 0);
  const h = Buffer.alloc(8); h.write('icns', 0, 'latin1'); h.writeUInt32BE(total, 4);
  return Buffer.concat([h, ...chunks]);
}

function readIcns(buf) {
  if (buf.toString('latin1', 0, 4) !== 'icns' || buf.readUInt32BE(4) !== buf.length) throw new Error('geen geldige ICNS');
  const out = [];
  for (let o = 8; o < buf.length;) {
    const type = buf.toString('latin1', o, o + 4), len = buf.readUInt32BE(o + 4);
    if (len < 8) throw new Error('ICNS-blok kapot');
    out.push({ type, png: buf.subarray(o + 8, o + len) });
    o += len;
  }
  return out;
}

module.exports = { pngInfo, packIco, readIco, packIcns, readIcns, ICNS_TYPES };
