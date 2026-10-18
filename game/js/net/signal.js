// Coöp fase 4 (#95): handmatige signalering. Geen signaling-server en geen
// STUN/TURN: de twee spelers wisselen zelf twee korte codes uit (kopiëren en
// plakken, of voorlezen). Een code bevat alleen wat WebRTC nodig heeft
// (ICE-gebruikersnaam en -wachtwoord, vingerafdruk, host-kandidaten van het
// lokale netwerk) en een controlesom. Kandidaten met een openbaar adres
// worden weggelaten: zo gaat er niets buiten het lokale netwerk.
// Pure logica; de WebRTC-aanroepen staan in rtc.js.

export const SIGNAL_PREFIX = 'GDE1';
const MAX_CODE = 4000;

export function crc16(str) {
  let c = 0xffff;
  for (let i = 0; i < str.length; i++) {
    c ^= str.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).padStart(4, '0');
}

// Alleen adressen van het eigen netwerk: privé IPv4, link-local, loopback, mDNS (.local).
export function isLanAddress(a) {
  if (/^[0-9a-f-]{36}\.local$/i.test(a) || /\.local$/i.test(a)) return true;
  let m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a);
  if (m) {
    const [x, y] = [+m[1], +m[2]];
    if (m.slice(1).some((v) => +v > 255)) return false;
    return x === 10 || x === 127 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) || (x === 169 && y === 254);
  }
  return /^(::1|fe80:|fc|fd)/i.test(a); // IPv6: loopback, link-local, unique local
}

// "candidate:1 1 udp 2113937151 192.168.1.5 54321 typ host ..." -> adres of null
export function candidateAddress(line) {
  const m = /^(?:a=)?candidate:\S+ \d+ (udp|tcp) \d+ (\S+) (\d+) typ (\w+)/i.exec(line.trim());
  return m ? { proto: m[1].toLowerCase(), addr: m[2], port: +m[3], typ: m[4] } : null;
}

// Haalt het nodige uit een SDP. Geeft { u, p, f, c:[kandidaatregels] } of null.
export function extractSignal(sdp) {
  const lines = String(sdp).split(/\r?\n/);
  const get = (re) => { for (const l of lines) { const m = re.exec(l); if (m) return m[1].trim(); } return null; };
  const u = get(/^a=ice-ufrag:(.+)$/), p = get(/^a=ice-pwd:(.+)$/), f = get(/^a=fingerprint:sha-256 (.+)$/);
  if (!u || !p || !f) return null;
  const c = [];
  for (const l of lines) {
    const cand = candidateAddress(l);
    if (!cand || cand.typ !== 'host' || cand.proto !== 'udp' || !isLanAddress(cand.addr)) continue;
    c.push(l.replace(/^a=/, '').trim().replace(/(typ host).*/, '$1'));
  }
  return { u, p, f, c };
}

// Bouwt een minimale SDP voor één datakanaal. type: 'offer' (actpass) of 'answer' (active).
export function buildSdp(sig, type) {
  const out = [
    'v=0', 'o=- 4611731400430051336 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${sig.u}`, `a=ice-pwd:${sig.p}`, `a=fingerprint:sha-256 ${sig.f}`,
    `a=setup:${type === 'offer' ? 'actpass' : 'active'}`, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144',
  ];
  for (const c of sig.c) out.push(`a=${c}`);
  return out.join('\r\n') + '\r\n';
}

const b64 = (s) => (typeof Buffer !== 'undefined' ? Buffer.from(s, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(s)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return typeof Buffer !== 'undefined' ? Buffer.from(t, 'base64').toString('utf8') : decodeURIComponent(escape(atob(t)));
};

// Code: GDE1.<O|A>.<payload>.<crc>. Compact JSON; kandidaten korter via de regelonderdelen.
export function packSignal(sig, kind) {
  const body = JSON.stringify({ u: sig.u, p: sig.p, f: sig.f.replace(/:/g, ''), c: sig.c.map(shortCand) });
  const payload = b64(body);
  return `${SIGNAL_PREFIX}.${kind === 'offer' ? 'O' : 'A'}.${payload}.${crc16(payload)}`;
}
// "candidate:842163049 1 udp 1677729535 192.168.1.5 54321 typ host" -> "192.168.1.5 54321 1677729535 842163049"
function shortCand(line) {
  const m = /^candidate:(\S+) 1 udp (\d+) (\S+) (\d+) typ host/.exec(line);
  return m ? `${m[3]} ${m[4]} ${m[2]} ${m[1]}` : null;
}
const longCand = (s) => { const [a, p, pr, f] = s.split(' '); return `candidate:${f} 1 udp ${pr} ${a} ${p} typ host`; };

// Leest een geplakte code (spaties, regeleinden en kopieerrommel worden genegeerd).
// Geeft { ok:true, kind, sig } of { ok:false, reason } met een Nederlandse tekst.
export function unpackSignal(text) {
  const clean = String(text || '').replace(/\s+/g, '');
  if (!clean) return { ok: false, reason: 'Er is niets geplakt.' };
  if (clean.length > MAX_CODE) return { ok: false, reason: 'Deze code is te lang.' };
  const parts = clean.split('.');
  if (parts.length !== 4 || parts[0] !== SIGNAL_PREFIX) return { ok: false, reason: 'Dit is geen koppelcode van dit spel.' };
  if (!/^[A-Za-z0-9_-]+$/.test(parts[2]) || parts[3] !== crc16(parts[2])) return { ok: false, reason: 'De code is beschadigd. Kopieer hem opnieuw.' };
  if (parts[1] !== 'O' && parts[1] !== 'A') return { ok: false, reason: 'Dit is geen koppelcode van dit spel.' };
  let o;
  try { o = JSON.parse(unb64(parts[2])); } catch (e) { return { ok: false, reason: 'De code is beschadigd. Kopieer hem opnieuw.' }; }
  if (!o || typeof o.u !== 'string' || typeof o.p !== 'string' || typeof o.f !== 'string' || !Array.isArray(o.c)) return { ok: false, reason: 'De code is beschadigd. Kopieer hem opnieuw.' };
  if (!/^[A-Za-z0-9+/]{3,32}$/.test(o.u) || !/^[A-Za-z0-9+/]{16,64}$/.test(o.p) || !/^[0-9A-Fa-f]{64}$/.test(o.f)) return { ok: false, reason: 'De code is beschadigd. Kopieer hem opnieuw.' };
  const cands = [];
  for (const s of o.c.slice(0, 8)) {
    if (typeof s !== 'string' || !/^\S+ \d{1,5} \d+ \S+$/.test(s)) continue;
    const line = longCand(s), c = candidateAddress(line);
    if (c && isLanAddress(c.addr)) cands.push(line); // nooit een openbaar adres, ook niet als iemand zo'n code maakt
  }
  if (!cands.length) return { ok: false, reason: 'Er is geen adres op het lokale netwerk in deze code. Beide spelers moeten op hetzelfde netwerk zitten.' };
  const f = o.f.toUpperCase().match(/.{2}/g).join(':');
  return { ok: true, kind: parts[1] === 'O' ? 'offer' : 'answer', sig: { u: o.u, p: o.p, f, c: cands } };
}

// Leesbaar tonen in blokjes van 6 tekens, 4 blokken per regel.
export function formatForDisplay(code) {
  const blocks = code.match(/.{1,6}/g) || [];
  const rows = [];
  for (let i = 0; i < blocks.length; i += 4) rows.push(blocks.slice(i, i + 4).join(' '));
  return rows.join('\n');
}
