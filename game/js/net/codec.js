// Coöp fase 4 (#95): compacte binaire codec voor invoer en toestand-snapshots.
// Versionerd, met bereikcontrole: alles wat van de andere kant komt wordt
// gevalideerd en bij twijfel afgewezen (decode geeft null). Pure logica,
// geen DOM, geen netwerk, geen npm.

export const MAGIC = 0x47;
export const CODEC_VERSION = 1;
export const T = { HELLO: 1, WELCOME: 2, INPUT: 3, SNAP: 4, EVENT: 5, ACK: 6, PING: 7, PONG: 8, BYE: 9, RESYNC: 10, EXTRA: 11 };
export const MAX_PLAYERS = 16; // de host in het midden en tot 15 gasten (sterntopologie)
export const MAX_ENTITIES = 64;
export const MAX_JSON = 2048;
export const MAX_EXTRA = 1100; // bytes nuttige lading van een EXTRA-bericht (coopextra.js): past met de kop in één pakket
export const NO_VEHICLE = 0xffff;
const TAU = Math.PI * 2;

export const quantAngle = (a) => Math.round((((a % TAU) + TAU) % TAU) / TAU * 65535);
export const dequantAngle = (q) => q / 65535 * TAU;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const inWorld = (v) => Number.isFinite(v) && Math.abs(v) < 1e6;

function header(view, type, seq, tick, ack) {
  view.setUint8(0, MAGIC); view.setUint8(1, CODEC_VERSION); view.setUint8(2, type);
  view.setUint16(3, seq & 0xffff); view.setUint32(5, tick >>> 0); view.setUint16(9, ack & 0xffff);
  return 11;
}
export function readHeader(buf) {
  if (!(buf instanceof Uint8Array) || buf.length < 11) return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (v.getUint8(0) !== MAGIC || v.getUint8(1) !== CODEC_VERSION) return null;
  const type = v.getUint8(2);
  if (type < 1 || type > 11) return null;
  return { type, seq: v.getUint16(3), tick: v.getUint32(5), ack: v.getUint16(9), v };
}

// --- invoer: client -> host ---
// input: { mx, my (-1..1), buttons (u8), yaw (rad) }
export function encodeInput(seq, tick, ack, input) {
  const b = new Uint8Array(16); const v = new DataView(b.buffer);
  let o = header(v, T.INPUT, seq, tick, ack);
  v.setInt8(o, Math.round(clamp(input.mx || 0, -1, 1) * 127)); o += 1;
  v.setInt8(o, Math.round(clamp(input.my || 0, -1, 1) * 127)); o += 1;
  v.setUint8(o, (input.buttons || 0) & 0xff); o += 1;
  v.setUint16(o, quantAngle(input.yaw || 0)); o += 2;
  return b;
}
export function decodeInput(buf) {
  const h = readHeader(buf);
  if (!h || h.type !== T.INPUT || buf.length < 16) return null;
  const v = h.v;
  return { seq: h.seq, tick: h.tick, ack: h.ack, mx: v.getInt8(11) / 127, my: v.getInt8(12) / 127, buttons: v.getUint8(13), yaw: dequantAngle(v.getUint16(14)) };
}

// --- snapshot: host -> client ---
// snap: { players:[{slot,x,y,z,angle,alive,inVeh,driver,run,health,vehicle}],
//         shared:{money,wanted,clock}, mission:{stage,state,present}, entities:[{id,kind,x,z,angle}] }
const MISSION_STATE = ['run', 'pass', 'fail', 'none'];
export function encodeSnapshot(seq, tick, ackInput, snap) {
  const players = (snap.players || []).slice(0, MAX_PLAYERS);
  const ents = (snap.entities || []).slice(0, MAX_ENTITIES);
  const size = 11 + 1 + players.length * 22 + 9 + 3 + 1 + ents.length * 13;
  const b = new Uint8Array(size); const v = new DataView(b.buffer);
  let o = header(v, T.SNAP, seq, tick, ackInput);
  v.setUint8(o++, players.length);
  for (const p of players) {
    v.setUint8(o++, p.slot & 0xff);
    v.setFloat32(o, p.x); o += 4; v.setFloat32(o, p.y); o += 4; v.setFloat32(o, p.z || 0); o += 4;
    v.setUint16(o, quantAngle(p.angle || 0)); o += 2;
    v.setUint8(o++, (p.alive ? 1 : 0) | (p.inVeh ? 2 : 0) | (p.driver ? 4 : 0) | (p.run ? 8 : 0));
    v.setUint8(o++, clamp(Math.round(p.health ?? 100), 0, 255));
    v.setUint16(o, p.vehicle == null ? NO_VEHICLE : p.vehicle & 0xffff); o += 2;
    o += 3; // gereserveerd (uitlijning, toekomstige animatie-index)
  }
  const sh = snap.shared || {};
  v.setUint32(o, clamp(Math.floor(sh.money || 0), 0, 0xffffffff)); o += 4;
  v.setUint8(o++, clamp(sh.wanted | 0, 0, 5));
  v.setFloat32(o, sh.clock || 0); o += 4;
  const m = snap.mission || {};
  v.setUint8(o++, clamp(m.stage | 0, 0, 255));
  v.setUint8(o++, Math.max(0, MISSION_STATE.indexOf(m.state || 'none')));
  v.setUint8(o++, m.present == null ? 3 : m.present & 0xf);
  v.setUint8(o++, ents.length);
  for (const e of ents) {
    v.setUint16(o, e.id & 0xffff); o += 2; v.setUint8(o++, e.kind & 0xff);
    v.setFloat32(o, e.x); o += 4; v.setFloat32(o, e.z); o += 4;
    v.setUint16(o, quantAngle(e.angle || 0)); o += 2;
  }
  return b.subarray(0, o);
}
export function decodeSnapshot(buf) {
  const h = readHeader(buf);
  if (!h || h.type !== T.SNAP) return null;
  const v = h.v; let o = 11;
  try {
    const np = v.getUint8(o++);
    if (np > MAX_PLAYERS) return null;
    const players = [];
    for (let i = 0; i < np; i++) {
      const p = { slot: v.getUint8(o++) };
      p.x = v.getFloat32(o); o += 4; p.y = v.getFloat32(o); o += 4; p.z = v.getFloat32(o); o += 4;
      p.angle = dequantAngle(v.getUint16(o)); o += 2;
      const f = v.getUint8(o++);
      p.alive = !!(f & 1); p.inVeh = !!(f & 2); p.driver = !!(f & 4); p.run = !!(f & 8);
      p.health = v.getUint8(o++);
      const veh = v.getUint16(o); o += 2; p.vehicle = veh === NO_VEHICLE ? null : veh;
      o += 3;
      if (p.slot >= MAX_PLAYERS || !inWorld(p.x) || !inWorld(p.y) || !inWorld(p.z)) return null;
      players.push(p);
    }
    const shared = { money: v.getUint32(o), wanted: 0, clock: 0 }; o += 4;
    shared.wanted = v.getUint8(o++); if (shared.wanted > 5) return null;
    shared.clock = v.getFloat32(o); o += 4; if (!Number.isFinite(shared.clock)) return null;
    const mission = { stage: v.getUint8(o++), state: MISSION_STATE[v.getUint8(o++)], present: v.getUint8(o++) };
    if (!mission.state) return null;
    const ne = v.getUint8(o++);
    if (ne > MAX_ENTITIES) return null;
    const entities = [];
    for (let i = 0; i < ne; i++) {
      const e = { id: v.getUint16(o) }; o += 2; e.kind = v.getUint8(o++);
      e.x = v.getFloat32(o); o += 4; e.z = v.getFloat32(o); o += 4;
      e.angle = dequantAngle(v.getUint16(o)); o += 2;
      if (!inWorld(e.x) || !inWorld(e.z)) return null;
      entities.push(e);
    }
    if (o !== buf.length) return null;
    return { seq: h.seq, tick: h.tick, ackInput: h.ack, players, shared, mission, entities };
  } catch (e) { return null; } // buffer te kort
}

// --- JSON-berichten (hello, welcome, events, resync): klein en begrensd ---
export function encodeJson(type, seq, tick, ack, obj) {
  const body = new TextEncoder().encode(JSON.stringify(obj));
  if (body.length > MAX_JSON) throw new Error('bericht te groot');
  const b = new Uint8Array(11 + 2 + body.length); const v = new DataView(b.buffer);
  const o = header(v, type, seq, tick, ack);
  v.setUint16(o, body.length); b.set(body, o + 2);
  return b;
}
export function decodeJson(buf) {
  const h = readHeader(buf);
  if (!h || buf.length < 13) return null;
  const len = h.v.getUint16(11);
  if (len > MAX_JSON || buf.length !== 13 + len) return null;
  try {
    const obj = JSON.parse(new TextDecoder().decode(buf.subarray(13)));
    return { type: h.type, seq: h.seq, tick: h.tick, ack: h.ack, body: obj };
  } catch (e) { return null; }
}
export function encodeSimple(type, seq, tick, ack) {
  const b = new Uint8Array(11); header(new DataView(b.buffer), type, seq, tick, ack); return b;
}

// --- extra wereld: host -> client, onbetrouwbaar, laag tempo (coopextra.js: voetgangers, dieren, verkeerslichten, kapotte objecten) ---
// De lading is een eigen binair formaat van coopextra.js; hier alleen de kop en een lengte.
export function encodeExtra(seq, tick, ack, payload) {
  const n = Math.min(payload.length, MAX_EXTRA);
  const b = new Uint8Array(11 + 2 + n); const v = new DataView(b.buffer);
  const o = header(v, T.EXTRA, seq, tick, ack);
  v.setUint16(o, n); b.set(payload.subarray(0, n), o + 2);
  return b;
}
export function decodeExtra(buf) {
  const h = readHeader(buf);
  if (!h || h.type !== T.EXTRA || buf.length < 13) return null;
  const n = h.v.getUint16(11);
  if (n > MAX_EXTRA || buf.length !== 13 + n) return null;
  return { seq: h.seq, tick: h.tick, payload: buf.subarray(13) };
}
