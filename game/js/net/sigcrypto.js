// Samen spelen (#95): signaleringsberichten (SDP/ICE) end-to-end versleutelen met
// de kamercode als sleutelmateriaal (WebCrypto: PBKDF2 → AES-GCM), zodat een
// openbare broker alleen blobs ziet. Ook de afgeleide onderwerpnaam (topic) komt
// uit de kamercode via SHA-256, dus de code zelf gaat nooit over de lijn.
// Werkt in browser, Electron en Node (globalThis.crypto).

export const ITERATIONS = 100000;
const SALT = 'gde-coop-signal-v1';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // geen 0/O, 1/I
export const ROOM_LEN = 10;

const enc = new TextEncoder(), dec = new TextDecoder();
const subtle = () => { const c = globalThis.crypto; if (!c || !c.subtle) throw new Error('Versleutelen is hier niet beschikbaar.'); return c.subtle; };

// Kamercode: 10 tekens, getoond als XXXXX-XXXXX. rand moet cryptografisch zijn buiten tests.
export function makeRoom(rand) {
  const bytes = new Uint8Array(ROOM_LEN);
  if (rand) for (let i = 0; i < ROOM_LEN; i++) bytes[i] = Math.floor(rand() * 256);
  else globalThis.crypto.getRandomValues(bytes);
  let s = ''; for (let i = 0; i < ROOM_LEN; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}
export const formatRoom = (room) => `${room.slice(0, 5)}-${room.slice(5)}`;
export function parseRoom(text) {
  const r = String(text || '').toUpperCase().replace(/[\s-]/g, '').replace(/0/g, 'O').replace(/1/g, 'I');
  if (!r) return { ok: false, reason: 'Er is niets ingevoerd.' };
  if (r.length !== ROOM_LEN || [...r].some((c) => !ALPHABET.includes(c))) return { ok: false, reason: 'Dit is geen kamercode. Een kamercode heeft 10 tekens, zoals K3J9D-8F2MN.' };
  return { ok: true, room: r };
}

const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// #589: alles wat van een broker komt is onbegrensd, dus de lengte wordt vóór atob/decryptie gecontroleerd.
// Een versleuteld SDP-aanbod van 20.000 tekens past ruim in MAX_BLOB_CHARS; een publieke sleutel is 87 tekens.
export const MAX_BLOB_CHARS = 65536;
export const MAX_KEY_CHARS = 120;
const unb64u = (s, max = MAX_BLOB_CHARS) => {
  if (typeof s !== 'string' || s.length > max) throw new Error('te groot');
  const t = s.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(t + '==='.slice((t.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const keyCache = new Map();
async function keyFor(room) {
  if (keyCache.has(room)) return keyCache.get(room);
  const base = await subtle().importKey('raw', enc.encode(room), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle().deriveKey({ name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  keyCache.set(room, key); return key;
}

// Versleutelt tekst; geeft één base64url-blob (12 bytes iv + versleutelde data + tag).
export async function encryptBlob(room, text) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, await keyFor(room), enc.encode(text)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64u(out);
}
// Geeft de tekst terug, of null bij een verkeerde code, een geknoeide blob of een blob die te groot is (#589).
export async function decryptBlob(room, blob) {
  try {
    if (typeof blob !== 'string' || blob.length > MAX_BLOB_CHARS) return null;
    const raw = unb64u(blob);
    if (raw.length < 12 + 16) return null;
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, await keyFor(room), raw.slice(12));
    return dec.decode(pt);
  } catch (e) { return null; }
}

// Onderwerp afgeleid van de kamercode: hex van SHA-256, afgekapt. `bytes` = 20 voor een tracker (info_hash).
export async function topicFor(room, bytes = 20) {
  const h = new Uint8Array(await subtle().digest('SHA-256', enc.encode('gde-coop-topic:' + room)));
  return [...h.slice(0, bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------ eenmalige sleutelruil (#583)
// De openbare lijst draagt geen sleutelmateriaal meer. Een gast die via de lijst meedoet, stuurt een
// eenmalige publieke sleutel mee; de host stuurt de kamercode versleuteld voor precies die gast terug
// (ECDH P-256 → AES-GCM, met de nonce van het verzoek als additional data). Wie alleen de lijst leest,
// heeft geen privésleutel en kan het antwoord niet ontsleutelen; de kamercode komt zo nooit op straat.
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
export const SLEUTEL_BYTES = 65; // ongecomprimeerd P-256-punt (0x04 + x + y)

export async function maakSleutelpaar() {
  try { return await subtle().generateKey(ECDH, false, ['deriveKey']); } catch (e) { throw new Error('Een sleutel maken lukt hier niet.'); }
}
// De publieke sleutel als base64url (87 tekens), veilig om te publiceren.
export async function sleutelTekst(paar) {
  const raw = new Uint8Array(await subtle().exportKey('raw', paar.publicKey));
  return b64u(raw);
}
export async function sleutelVanTekst(tekst) {
  if (typeof tekst !== 'string' || tekst.length > MAX_KEY_CHARS) throw new Error('Geen geldige sleutel.');
  const raw = unb64u(tekst, MAX_KEY_CHARS);
  if (raw.length !== SLEUTEL_BYTES || raw[0] !== 4) throw new Error('Geen geldige sleutel.');
  return subtle().importKey('raw', raw, ECDH, false, []);
}
// De gedeelde AES-sleutel uit eigen privé en andermans publieke sleutel.
export async function gedeeldeSleutel(eigen, anderPub) {
  return subtle().deriveKey({ name: 'ECDH', public: anderPub }, eigen.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
// Versleutelt tekst met een gedeelde sleutel; de nonce bindt het bericht aan dit ene verzoek.
export async function versleutelVoor(sleutel, tekst, nonce) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(String(nonce)) }, sleutel, enc.encode(tekst)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64u(out);
}
export async function ontsleutelVoor(sleutel, blob, nonce) {
  try {
    if (typeof blob !== 'string' || blob.length > MAX_BLOB_CHARS) return null; // #589: vóór atob begrenzen
    const raw = unb64u(blob);
    if (raw.length < 12 + 16) return null;
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode(String(nonce)) }, sleutel, raw.slice(12));
    return dec.decode(pt);
  } catch (e) { return null; }
}
