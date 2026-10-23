// Samen spelen (#428): de rest van de wereld van de host bij een gast. Pure logica (geen three.js, geen DOM): wat de host
// per gast verzamelt en codeert, en hoe een gast dat leest en bijhoudt. Getekend door coopextra3d.js.
//
// Eigen bericht (net/codec.js T.EXTRA, onbetrouwbaar, EXTRA_HZ per seconde). De posities van voetgangers zitten al in de
// snapshot (coopworld.js, soort 12 en 13); hier komt alleen bij wat daar niet in past:
//   voetgangers  loopsnelheid en een vlaggenbyte (groet, feest, wapen, aanval, geraakt) per id, elke keer;
//   uiterlijk    kleding, huid, uiterlijkzaad en eventueel een look-beschrijving per id, alleen voor nieuwe of verlopen id's
//                (hoogstens LOOK_PER_BERICHT per keer, daarna ververst na LOOK_VERVERS s: een verloren bericht herstelt zo vanzelf);
//   spraak       wat een voetganger zegt (korte tekst);
//   dieren       soort, stand en plek van koeien, schapen, vogels, honden en katten binnen DIER_RADIUS van een speler;
//   lichten      de klok van elk verkeerslichtencomplex binnen LICHT_RADIUS (de gast loopt zelf mee tussen twee berichten);
//   kapot        de sleutels van kapotte objecten (alleen als de lijst verandert, en elke KAPOT_VERVERS s ter controle);
//   misc         losse stukjes (tag, lading): kermis, stuntavond, enzovoort, door de host aangeleverd (deps.misc).
// De host blijft leidend; een gast leest alleen. Posities van dieren staan als i16 in 0,05 m ten opzichte van het lichaam
// van de gast (bereik 1,6 km: wat verder weg is, gaat niet mee).
import { pedId } from './coopworld.js';

export const EXTRA_VERSIE = 1;
export const MAX_LADING = 1100;                 // gelijk aan MAX_EXTRA in net/codec.js
export const RADIUS_VOETGANGER_EXTRA = 70;      // gelijk aan coopworld.js RADIUS_VOETGANGER
export const DIER_RADIUS = 90;
export const MAX_DIEREN = 20;
export const LICHT_RADIUS = 160;
export const MAX_LICHTEN = 40;
export const KAPOT_RADIUS = 110;
export const MAX_KAPOT = 40;
export const LOOK_PER_BERICHT = 8;
export const LOOK_VERVERS = 3;                  // s
export const KAPOT_VERVERS = 4;                 // s
export const MAX_SPRAAK = 4;
export const SPRAAK_MAX_TEKENS = 70;
const POS_EENHEID = 0.05;

// bits van het eerste veld (mask)
export const B_VOETGANGERS = 1, B_UITERLIJK = 2, B_SPRAAK = 4, B_DIEREN = 8, B_LICHTEN = 16, B_KAPOT = 32, B_MISC = 64;
// vlaggen per voetganger
export const V_GROET = 1, V_FEEST = 2, V_WAPEN = 4, V_AANVAL = 8, V_GERAAKT = 16, V_SPREEKT = 32, V_TAS = 64;
// vlaggen per dier
export const D_DOOD = 1;

export const DIER_SOORTEN = ['cow', 'sheep', 'seagull', 'duck', 'gans', 'reiger', 'zeehond', 'vis', 'pigeon', 'cat', 'dog'];
const EEND_VARIANTEN = ['drake', 'hen', 'swan', 'goose'];
export const KAPOT_SOORTEN = ['bench', 'bin', 'chair', 'table', 'parasol', 'bike', 'rail', 'stall', 'lamp', 'trafficlight', 'flitspaal', 'tree', 'vangrail', 'hek'];

// tags voor misc
export const MISC_KERMIS = 1, MISC_STUNT = 2, MISC_PUNTEN = 3;

const u8 = (v, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, Math.round(v) | 0));
const hexNaarRgb = (h, d) => {
  const m = typeof h === 'string' ? /^#?([0-9a-f]{6})$/i.exec(h) : null;
  const n = m ? parseInt(m[1], 16) : typeof h === 'number' && Number.isFinite(h) ? (h >>> 0) & 0xffffff : d;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbNaarHex = (r, g, b) => `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;

// ----------------------------------------------------------- dieren: een vast id per dier (apart van de voetgangers)
const dierIds = new WeakMap(); let dierSeq = 0;
const dierId = (a) => { let id = dierIds.get(a); if (id == null) { id = dierSeq++ & 0xffff; dierIds.set(a, id); } return id; };

function dierVar(a) {
  if (a.kind === 'cow') return a.variant === 'red' ? 1 : 0;
  if (a.kind === 'duck') return Math.max(0, EEND_VARIANTEN.indexOf(a.variant));
  if (a.kind === 'cat') return (a.variant | 0) & 255;
  if (a.kind === 'dog') return (a.breed | 0) & 255;
  return 0;
}
function dierAux(a) { return a.kind === 'dog' ? u8((Number.isFinite(a.color) ? a.color : 0) * 255) : 0; }

// ----------------------------------------------------------- de host: verzamelen en coderen
export const nieuwGeheugen = () => ({ looks: new Map(), kapotHash: '', kapotAt: -99, n: 0 });

const dichtbij = (bij, x, y) => { let d = Infinity; for (const b of bij) d = Math.min(d, Math.hypot(x - b.x, y - b.y)); return d; };

// world: pedestrians, wildlife, time. bij: [{x, y}] de lichamen van de spelers; oorsprong: het lichaam van de gast die dit krijgt.
// geheugen: per gast (nieuwGeheugen). deps: { controllers: [{x, y, t}], gebroken(points, r) -> [{key, kind, x10, y10}], misc(bij) -> [{tag, data}] }.
export function verzamelExtra(world, bij, geheugen, deps = {}) {
  const now = Number.isFinite(world.time) ? world.time : 0;
  const uit = { voetgangers: [], uiterlijk: [], spraak: [], dieren: [], lichten: [], kapot: null, misc: [] };

  // voetgangers: dezelfde selectie als de snapshot (coopworld.js), want de id's moeten kloppen
  const peds = [];
  for (const p of world.pedestrians || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.state === 'dead' || p.health <= 0) continue;
    const d = dichtbij(bij, p.x, p.y);
    if (d <= RADIUS_VOETGANGER_EXTRA) peds.push({ d, p });
  }
  peds.sort((a, b) => a.d - b.d);
  const nodig = [];
  for (const { p } of peds.slice(0, 20)) {
    const id = pedId(p);
    const spreekt = !!(p.speechText && now < p.speechUntil);
    const vl = (p.greetUntil > now ? V_GROET : 0) | (p.party ? V_FEEST : 0) | (p.heldWeapon ? V_WAPEN : 0) | (p.attackFx ? V_AANVAL : 0) | (p.hitReact ? V_GERAAKT : 0) | (spreekt ? V_SPREEKT : 0) | (p.hasBag ? V_TAS : 0);
    uit.voetgangers.push({ id, speed: u8((p.speed || 0) * 10), flags: vl });
    if (spreekt && uit.spraak.length < MAX_SPRAAK) uit.spraak.push({ id, tekst: String(p.speechText).slice(0, SPRAAK_MAX_TEKENS) });
    const t = geheugen.looks.get(id);
    if (t == null || now - t >= LOOK_VERVERS) nodig.push({ id, p, t: t == null ? -1e9 : t });
  }
  nodig.sort((a, b) => a.t - b.t);
  for (const { id, p } of nodig.slice(0, LOOK_PER_BERICHT)) {
    geheugen.looks.set(id, now);
    uit.uiterlijk.push({ id, kleding: p.clothing, huid: p.skin, zaad: Number.isFinite(p._lookSeed) ? p._lookSeed : 0, agent: !!p.isCop, tas: !!p.hasBag, look: p.look || null, draagt: typeof p.carry === 'string' ? p.carry : null });
  }
  if (geheugen.looks.size > 200) { for (const [id, t] of geheugen.looks) if (now - t > 30) geheugen.looks.delete(id); }

  // dieren
  const dieren = [];
  for (const a of world.wildlife || []) {
    if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
    const k = DIER_SOORTEN.indexOf(a.kind); if (k < 0) continue;
    const d = dichtbij(bij, a.x, a.y);
    if (d <= DIER_RADIUS) dieren.push({ d, a, k });
  }
  dieren.sort((p, q) => p.d - q.d);
  for (const { a, k } of dieren.slice(0, MAX_DIEREN)) uit.dieren.push({ id: dierId(a), soort: k, var: dierVar(a), aux: dierAux(a), bob: Math.min(65535, Math.max(0, Math.floor((a.bobSeed || 0) * 1000))), x: a.x, y: a.y, hoek: a.angle || 0, speed: a.speed || 0, dood: !!a.dead });

  // verkeerslichten
  const lichten = [];
  const cs = deps.controllers || [];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i]; if (!c || !Number.isFinite(c.x)) continue;
    const d = dichtbij(bij, c.x, c.y);
    if (d <= LICHT_RADIUS) lichten.push({ d, i, t: c.t });
  }
  lichten.sort((a, b) => a.d - b.d);
  for (const l of lichten.slice(0, MAX_LICHTEN)) uit.lichten.push({ i: l.i, t: l.t });

  // kapotte objecten: alleen bij een verandering, plus een controle af en toe (een verloren bericht herstelt zo)
  if (deps.gebroken) {
    const lijst = deps.gebroken(bij, KAPOT_RADIUS).filter((b) => KAPOT_SOORTEN.includes(b.kind)).slice(0, MAX_KAPOT);
    const hash = lijst.map((b) => b.key).sort().join('|');
    if (hash !== geheugen.kapotHash || now - geheugen.kapotAt >= KAPOT_VERVERS) {
      geheugen.kapotHash = hash; geheugen.kapotAt = now;
      uit.kapot = lijst.map((b) => ({ soort: KAPOT_SOORTEN.indexOf(b.kind), x10: b.x10, y10: b.y10 }));
    }
  }
  if (deps.misc) uit.misc = deps.misc(bij, geheugen, now) || [];
  geheugen.n++;
  return uit;
}

// ----------------------------------------------------------- coderen
const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

class Schrijver {
  constructor(max) { this.b = new Uint8Array(max); this.v = new DataView(this.b.buffer); this.o = 0; this.max = max; }
  rest() { return this.max - this.o; }
  u8(x) { this.v.setUint8(this.o++, x); } u16(x) { this.v.setUint16(this.o, x); this.o += 2; }
  i16(x) { this.v.setInt16(this.o, x); this.o += 2; } i32(x) { this.v.setInt32(this.o, x); this.o += 4; }
  f64(x) { this.v.setFloat64(this.o, x); this.o += 8; }
  bytes(a) { this.b.set(a, this.o); this.o += a.length; }
  uit() { return this.b.subarray(0, this.o); }
}

const kwant = (v, o) => Math.max(-32768, Math.min(32767, Math.round((v - o) / POS_EENHEID)));
const hoekByte = (a) => Math.round((((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 255) & 255;
const byteHoek = (b) => b / 255 * Math.PI * 2;
const inBereik = (x, o) => Math.abs(x - o) * (1 / POS_EENHEID) < 32000;

export function codeerExtra(data, oorsprong) {
  const ox = Math.round(oorsprong.x), oy = Math.round(oorsprong.y);
  const w = new Schrijver(MAX_LADING);
  w.u8(EXTRA_VERSIE); const maskAt = w.o; w.u8(0); w.i32(ox); w.i32(oy);
  let mask = 0;
  const kop = (bit, n) => { mask |= bit; w.u8(n); };

  if (data.voetgangers.length) {
    const n = Math.min(data.voetgangers.length, Math.floor((w.rest() - 2) / 4), 40);
    kop(B_VOETGANGERS, n);
    for (let i = 0; i < n; i++) { const p = data.voetgangers[i]; w.u16(p.id); w.u8(p.speed); w.u8(p.flags); }
  }
  // lichten en kapot vóór uiterlijk en dieren: die zijn klein en veranderen het gedrag het meest
  if (data.lichten.length && w.rest() > 4) {
    const n = Math.min(data.lichten.length, Math.floor((w.rest() - 2) / 3));
    kop(B_LICHTEN, n);
    for (let i = 0; i < n; i++) { w.u16(data.lichten[i].i); w.u8(u8(data.lichten[i].t * 4)); }
  }
  if (data.kapot && w.rest() > 3) {
    const n = Math.min(data.kapot.length, Math.floor((w.rest() - 2) / 9));
    kop(B_KAPOT, n);
    for (let i = 0; i < n; i++) { const k = data.kapot[i]; w.u8(k.soort); w.i32(k.x10); w.i32(k.y10); }
  }
  if (data.dieren.length && w.rest() > 4) {
    const lijst = data.dieren.filter((d) => inBereik(d.x, ox) && inBereik(d.y, oy));
    const n = Math.min(lijst.length, Math.floor((w.rest() - 2) / 15));
    if (n > 0) {
      kop(B_DIEREN, n);
      for (let i = 0; i < n; i++) {
        const d = lijst[i];
        w.u16(d.id); w.u8(d.soort); w.u8(d.var); w.u8(d.aux); w.u16(d.bob); w.i16(kwant(d.x, ox)); w.i16(kwant(d.y, oy)); w.u8(hoekByte(d.hoek)); w.u8(u8(d.speed * 20)); w.u8(d.dood ? D_DOOD : 0);
      }
    }
  }
  if (data.uiterlijk.length && w.rest() > 40) {
    const posAt = w.o; w.u8(0); mask |= B_UITERLIJK; let n = 0;
    for (const u of data.uiterlijk) {
      let json = null;
      if (u.look || u.draagt) { try { json = enc.encode(JSON.stringify({ l: u.look || undefined, c: u.draagt || undefined })); } catch (e) { json = null; } if (json && json.length > 120) json = null; }
      const need = 2 + 3 + 3 + 8 + 1 + (json ? 1 + json.length : 0);
      if (w.rest() < need + 1) break;
      const [cr, cg, cb] = hexNaarRgb(u.kleding, 0xcaa46a), [hr, hg, hb] = hexNaarRgb(u.huid, 0xe0b48a);
      w.u16(u.id); w.u8(cr); w.u8(cg); w.u8(cb); w.u8(hr); w.u8(hg); w.u8(hb); w.f64(u.zaad);
      w.u8((json ? 1 : 0) | (u.tas ? 2 : 0) | (u.agent ? 4 : 0));
      if (json) { w.u8(json.length); w.bytes(json); }
      n++;
    }
    w.b[posAt] = n; if (!n) { mask &= ~B_UITERLIJK; w.o = posAt; }
  }
  if (data.spraak.length && w.rest() > 10) {
    const posAt = w.o; w.u8(0); mask |= B_SPRAAK; let n = 0;
    for (const s of data.spraak) {
      const t = enc.encode(s.tekst);
      if (w.rest() < 3 + t.length + 1 || t.length > 255) break;
      w.u16(s.id); w.u8(t.length); w.bytes(t); n++;
    }
    w.b[posAt] = n; if (!n) { mask &= ~B_SPRAAK; w.o = posAt; }
  }
  if (data.misc.length && w.rest() > 4) {
    const posAt = w.o; w.u8(0); mask |= B_MISC; let n = 0;
    for (const m of data.misc) {
      if (!m.data || m.data.length > 255 || w.rest() < 2 + m.data.length) continue;
      w.u8(m.tag); w.u8(m.data.length); w.bytes(m.data); n++;
    }
    w.b[posAt] = n; if (!n) { mask &= ~B_MISC; w.o = posAt; }
  }
  if (!mask) return new Uint8Array(0); // niets te melden: geen bericht
  w.b[maskAt] = mask;
  return w.uit();
}

// ----------------------------------------------------------- decoderen (alles gecontroleerd; bij twijfel null)
export function leesExtra(buf) {
  if (!(buf instanceof Uint8Array) || buf.length < 11) return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 0;
  try {
    if (v.getUint8(o++) !== EXTRA_VERSIE) return null;
    const mask = v.getUint8(o++);
    const ox = v.getInt32(o); o += 4; const oy = v.getInt32(o); o += 4;
    if (Math.abs(ox) > 1e6 || Math.abs(oy) > 1e6) return null;
    const uit = { ox, oy, voetgangers: [], uiterlijk: [], spraak: [], dieren: [], lichten: [], kapot: null, misc: [] };
    if (mask & B_VOETGANGERS) { const n = v.getUint8(o++); for (let i = 0; i < n; i++) { uit.voetgangers.push({ id: v.getUint16(o), speed: v.getUint8(o + 2) / 10, flags: v.getUint8(o + 3) }); o += 4; } }
    if (mask & B_LICHTEN) { const n = v.getUint8(o++); if (n > MAX_LICHTEN) return null; for (let i = 0; i < n; i++) { uit.lichten.push({ i: v.getUint16(o), t: v.getUint8(o + 2) / 4 }); o += 3; } }
    if (mask & B_KAPOT) {
      const n = v.getUint8(o++); if (n > MAX_KAPOT) return null; uit.kapot = [];
      for (let i = 0; i < n; i++) { const s = v.getUint8(o); const x10 = v.getInt32(o + 1), y10 = v.getInt32(o + 5); o += 9; if (s < KAPOT_SOORTEN.length) uit.kapot.push({ soort: KAPOT_SOORTEN[s], x10, y10, key: `${KAPOT_SOORTEN[s]}@${x10},${y10}` }); }
    }
    if (mask & B_DIEREN) {
      const n = v.getUint8(o++); if (n > MAX_DIEREN) return null;
      for (let i = 0; i < n; i++) {
        const soort = v.getUint8(o + 2);
        const d = { id: v.getUint16(o), soort: DIER_SOORTEN[soort], var: v.getUint8(o + 3), aux: v.getUint8(o + 4), bob: v.getUint16(o + 5) / 1000, x: ox + v.getInt16(o + 7) * POS_EENHEID, y: oy + v.getInt16(o + 9) * POS_EENHEID, hoek: byteHoek(v.getUint8(o + 11)), speed: v.getUint8(o + 12) / 20, dood: !!(v.getUint8(o + 13) & D_DOOD) };
        o += 14;
        if (d.soort) uit.dieren.push(d);
      }
    }
    if (mask & B_UITERLIJK) {
      const n = v.getUint8(o++);
      for (let i = 0; i < n; i++) {
        const u = { id: v.getUint16(o), kleding: rgbNaarHex(v.getUint8(o + 2), v.getUint8(o + 3), v.getUint8(o + 4)), huid: rgbNaarHex(v.getUint8(o + 5), v.getUint8(o + 6), v.getUint8(o + 7)), zaad: v.getFloat64(o + 8), look: null, draagt: null };
        const fl = v.getUint8(o + 16); o += 17;
        u.tas = !!(fl & 2); u.agent = !!(fl & 4);
        if (fl & 1) {
          const len = v.getUint8(o++); if (o + len > buf.length) return null;
          try { const j = JSON.parse(dec.decode(buf.subarray(o, o + len))); if (j && typeof j === 'object') { if (j.l && typeof j.l === 'object') u.look = j.l; if (typeof j.c === 'string') u.draagt = j.c.slice(0, 20); } } catch (e) { /* zonder look */ }
          o += len;
        }
        if (!Number.isFinite(u.zaad)) u.zaad = 0;
        uit.uiterlijk.push(u);
      }
    }
    if (mask & B_SPRAAK) {
      const n = v.getUint8(o++);
      for (let i = 0; i < n; i++) { const id = v.getUint16(o); const len = v.getUint8(o + 2); o += 3; if (o + len > buf.length) return null; uit.spraak.push({ id, tekst: dec.decode(buf.subarray(o, o + len)).slice(0, SPRAAK_MAX_TEKENS) }); o += len; }
    }
    if (mask & B_MISC) {
      const n = v.getUint8(o++);
      for (let i = 0; i < n; i++) { const tag = v.getUint8(o), len = v.getUint8(o + 1); o += 2; if (o + len > buf.length) return null; uit.misc.push({ tag, data: buf.slice(o, o + len) }); o += len; }
    }
    if (o !== buf.length) return null;
    return uit;
  } catch (e) { return null; }
}

// ----------------------------------------------------------- de gast: bijhouden
export const BEWAAR_S = 1.2; // zolang blijft iets staan zonder nieuw bericht (twee berichten kwijt: dan weg)
export const nieuweStand = () => ({ voetgangers: new Map(), uiterlijk: new Map(), spraak: new Map(), dieren: new Map(), lichten: new Map(), kapot: [], kapotAt: -1e9, misc: new Map(), at: -1e9, n: 0 });

// stand: nieuweStand(); bericht: leesExtra(...); nu: lokale tijd in s.
export function pasExtraToe(stand, bericht, nu) {
  if (!bericht) return stand;
  stand.at = nu; stand.n++;
  const gezien = (m, ids) => { for (const id of m.keys()) if (!ids.has(id)) { const e = m.get(id); if (nu - e.at > BEWAAR_S) m.delete(id); } };
  const pIds = new Set();
  for (const p of bericht.voetgangers) { stand.voetgangers.set(p.id, { speed: p.speed, flags: p.flags, at: nu }); pIds.add(p.id); }
  gezien(stand.voetgangers, pIds);
  for (const u of bericht.uiterlijk) stand.uiterlijk.set(u.id, { ...u, at: nu });
  if (stand.uiterlijk.size > 300) for (const [id, e] of stand.uiterlijk) if (nu - e.at > 20) stand.uiterlijk.delete(id);
  const sIds = new Set();
  for (const s of bericht.spraak) { stand.spraak.set(s.id, { tekst: s.tekst, at: nu }); sIds.add(s.id); }
  gezien(stand.spraak, sIds);
  const dIds = new Set();
  for (const d of bericht.dieren) { const oud = stand.dieren.get(d.id); stand.dieren.set(d.id, { ...d, at: nu, eerder: oud ? { x: oud.x, y: oud.y } : null }); dIds.add(d.id); }
  gezien(stand.dieren, dIds);
  for (const l of bericht.lichten) stand.lichten.set(l.i, { t: l.t, at: nu });
  for (const [i, e] of stand.lichten) if (nu - e.at > 5) stand.lichten.delete(i);
  if (bericht.kapot) { stand.kapot = bericht.kapot; stand.kapotAt = nu; }
  const mIds = new Set();
  for (const m of bericht.misc) { stand.misc.set(m.tag, { data: m.data, at: nu }); mIds.add(m.tag); }
  for (const [tag, e] of stand.misc) if (!mIds.has(tag) && nu - e.at > MISC_TTL) stand.misc.delete(tag);
  return stand;
}

// De klok van een verkeerslichtencomplex: loopt de gast zelf, maar volgt de host als hij meer dan 0,4 s afwijkt (cyclisch).
export function lichtVerschil(lokaal, host, cyclus) {
  if (!(cyclus > 0)) return 0;
  let d = (host - lokaal) % cyclus; if (d > cyclus / 2) d -= cyclus; if (d < -cyclus / 2) d += cyclus;
  return d;
}

// Of de gast de nieuwste stand van de host nog mag vertrouwen (anders tekent hij niets extra's)
export const standVers = (stand, nu) => nu - stand.at < 3;

// ----------------------------------------------------------- misc: kermis, stuntavond en de punten van een opdracht
// De host levert de bronnen aan (main.js); hier zit het coderen. Elk stukje gaat hoogstens elke MISC_EVERY s, of meteen als het verandert;
// een gast laat een stukje vervallen als het MISC_TTL s niet meer kwam (dan is het er ook niet meer).
export const MISC_EVERY = 1.5;
export const MISC_TTL = 4;
export const STUNT_SOORTEN = ['parasol', 'kliko', 'stoepbord', 'chair', 'table'];
export const MAX_STUNT = 80;
export const MAX_PUNTEN = 12;

export function codeerStunt(s) {
  if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return null;
  const props = s.props.filter((p) => STUNT_SOORTEN.includes(p.kind) && Math.abs(p.x - s.x) < 63 && Math.abs(p.y - s.y) < 63).slice(0, MAX_STUNT);
  const b = new Uint8Array(9 + props.length * 3); const v = new DataView(b.buffer);
  v.setFloat32(0, s.x); v.setFloat32(4, s.y); v.setUint8(8, props.length);
  props.forEach((p, i) => { const o = 9 + i * 3; v.setUint8(o, STUNT_SOORTEN.indexOf(p.kind) | (p.alive ? 0 : 128)); v.setInt8(o + 1, Math.round((p.x - s.x) * 2)); v.setInt8(o + 2, Math.round((p.y - s.y) * 2)); });
  return b;
}
export function leesStunt(b) {
  if (!(b instanceof Uint8Array) || b.length < 9) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const x = v.getFloat32(0), y = v.getFloat32(4), n = v.getUint8(8);
  if (!Number.isFinite(x) || !Number.isFinite(y) || n > MAX_STUNT || b.length !== 9 + n * 3) return null;
  const props = [];
  for (let i = 0; i < n; i++) { const o = 9 + i * 3, k = v.getUint8(o); const kind = STUNT_SOORTEN[k & 127]; if (kind) props.push({ i, kind, x: x + v.getInt8(o + 1) / 2, y: y + v.getInt8(o + 2) / 2, alive: !(k & 128) }); }
  return { x, y, props };
}
export function codeerPunten(lijst) {
  const l = (lijst || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)).slice(0, MAX_PUNTEN);
  const b = new Uint8Array(1 + l.length * 12); const v = new DataView(b.buffer);
  v.setUint8(0, l.length);
  l.forEach((p, i) => { v.setFloat32(1 + i * 12, p.x); v.setFloat32(5 + i * 12, p.y); v.setFloat32(9 + i * 12, Number.isFinite(p.z) ? p.z : 0); });
  return b;
}
export function leesPunten(b) {
  if (!(b instanceof Uint8Array) || b.length < 1) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength); const n = v.getUint8(0);
  if (n > MAX_PUNTEN || b.length !== 1 + n * 12) return null;
  const out = []; for (let i = 0; i < n; i++) out.push({ x: v.getFloat32(1 + i * 12), y: v.getFloat32(5 + i * 12), z: v.getFloat32(9 + i * 12) });
  return out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) ? out : null;
}

const stuk = (g, tag, now, data) => {
  const m = g.misc || (g.misc = new Map()); const hash = Array.from(data).join(',');
  const was = m.get(tag);
  if (was && was.hash === hash && now - was.at < MISC_EVERY) return null;
  m.set(tag, { hash, at: now });
  return { tag, data };
};
// bronnen: { kermis: bool, stunt: { x, y, props: [{kind, x, y, alive}] } | null, punten: [{x, y, z}] | null }
export function maakMisc(bronnen, geheugen, now) {
  const uit = [];
  const k = stuk(geheugen, MISC_KERMIS, now, Uint8Array.of(bronnen.kermis ? 1 : 0)); if (k) uit.push(k);
  const sb = codeerStunt(bronnen.stunt); if (sb) { const s = stuk(geheugen, MISC_STUNT, now, sb); if (s) uit.push(s); }
  if (bronnen.punten && bronnen.punten.length) { const p = stuk(geheugen, MISC_PUNTEN, now, codeerPunten(bronnen.punten)); if (p) uit.push(p); }
  return uit;
}
