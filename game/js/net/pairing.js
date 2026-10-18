// Coöp online (#95): de koppelcode voor TCP/UPnP en het framen van berichten.
// Code: GDE2-<ip>:<poort>-<sleutel>-<controlesom>, bijvoorbeeld
// GDE2-84.12.34.56:41000-K3J9D8F2-A1B2. De sleutel (8 tekens) is een
// gedeeld geheim voor deze sessie: de host weigert verbindingen zonder.
// Pure logica; geen DOM, geen sockets.

export function crc16(str) {
  let c = 0xffff;
  for (let i = 0; i < str.length; i++) {
    c ^= str.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).padStart(4, '0');
}

export const CODE_PREFIX = 'GDE2';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // geen 0/O, 1/I
export const KEY_LEN = 8;

export function makeKey(rand = Math.random) {
  let k = ''; for (let i = 0; i < KEY_LEN; i++) k += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return k;
}
const ipv4 = (a) => { const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a); return !!m && m.slice(1).every((v) => +v <= 255 && String(+v) === v); };

export function makeCode({ ip, port, key }) {
  const body = `${ip}:${port}-${key}`;
  return `${CODE_PREFIX}-${body}-${crc16(body).toUpperCase().slice(0, 4)}`;
}

// Leest een geplakte of getypte code. Spaties en kleine letters mogen.
export function parseCode(text) {
  const clean = String(text || '').replace(/\s+/g, '').toUpperCase();
  if (!clean) return { ok: false, reason: 'Er is niets ingevoerd.' };
  const m = /^GDE2-(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})-([A-Z2-9]{8})-([0-9A-F]{4})$/.exec(clean);
  if (!m) return { ok: false, reason: 'Dit is geen koppelcode van dit spel.' };
  const [, ip, port, key, sum] = m;
  if (sum !== crc16(`${ip}:${port}-${key}`).toUpperCase().slice(0, 4)) return { ok: false, reason: 'De code klopt niet. Controleer of je hem goed hebt overgenomen.' };
  if (!ipv4(ip) || +port < 1024 || +port > 65535) return { ok: false, reason: 'De code klopt niet. Controleer of je hem goed hebt overgenomen.' };
  return { ok: true, ip, port: +port, key };
}

// ------------------------------------------------------------ framing (TCP)
// Elk bericht: u32 lengte (big endian) + bytes. Onbetrouwbaar gedrag van TCP
// (stukjes, plakken) wordt hier opgevangen; te grote frames sluiten de verbinding.
export const MAX_FRAME = 8192;

export function frame(bytes) {
  if (bytes.length > MAX_FRAME) throw new Error('bericht te groot');
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length);
  out.set(bytes, 4); return out;
}

export class FrameDecoder {
  constructor(max = MAX_FRAME) { this.max = max; this.buf = new Uint8Array(0); this.broken = false; }
  // geeft de volledige berichten uit deze chunk; zet broken bij een onmogelijke lengte
  push(chunk) {
    if (this.broken) return [];
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf); merged.set(chunk, this.buf.length);
    const out = []; let o = 0;
    while (merged.length - o >= 4) {
      const len = new DataView(merged.buffer, merged.byteOffset + o, 4).getUint32(0);
      if (len > this.max) { this.broken = true; this.buf = new Uint8Array(0); return out; }
      if (merged.length - o - 4 < len) break;
      out.push(merged.slice(o + 4, o + 4 + len)); o += 4 + len;
    }
    this.buf = merged.slice(o);
    return out;
  }
}

// Eerste bericht van een gast op de TCP-verbinding: de sleutel. Alleen daarna
// worden berichten doorgegeven aan de sessie.
export const encodeKeyFrame = (key) => new TextEncoder().encode('KEY:' + key);
export function checkKeyFrame(bytes, key) {
  const s = new TextDecoder().decode(bytes);
  return s.length === 4 + key.length && s === 'KEY:' + key;
}
