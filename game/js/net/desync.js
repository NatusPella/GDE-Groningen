// Coöp (#95): desync-hash. Er is één waarheid (de host); een gast die iets anders ziet dan de host zit fout.
// De host meldt om de paar seconden een korte hash van de gedeelde toestand (+ de velden zelf, zodat een
// afwijking te benoemen is); de gast bouwt dezelfde weergave uit wat hij zelf binnenkreeg en vergelijkt.
// Pas na een paar meldingen achter elkaar slaat de monitor alarm (een snapshot kan net onderweg zijn),
// en dan vraagt de gast een volledige hersync. Pure logica, geen DOM.

export const HASH_EVERY = 5;   // s tussen twee meldingen
export const STRIKES = 3;      // zoveel afwijkingen achter elkaar voor alarm

// FNV-1a over een tekst, 32 bit, als 8 hextekens
export function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// De gedeelde toestand, alleen wat host en gast beide moeten weten. Vaste sleutelvolgorde, afgeronde getallen.
export function viewOf({ story = '', stage = 0, state = 'none', wanted = 0, slots = [], tiles = '' } = {}) {
  return {
    story: String(story), stage: stage | 0, state: String(state), wanted: wanted | 0,
    slots: [...slots].map((s) => s | 0).sort((a, b) => a - b), tiles: String(tiles),
  };
}
export const hashView = (v) => fnv(JSON.stringify([v.story, v.stage, v.state, v.wanted, v.slots, v.tiles]));

export function hashEvent(n, view) { return { k: 'hash', n: n | 0, h: hashView(view), v: view }; }
export function leesHashEvent(b) {
  if (!b || b.k !== 'hash' || typeof b.h !== 'string' || !/^[0-9a-f]{8}$/.test(b.h) || !b.v || typeof b.v !== 'object') return null;
  return { n: b.n | 0, h: b.h, v: viewOf(b.v) };
}
// welke velden verschillen (voor het logboek en de foutmelding)
export function verschil(a, b) {
  const out = [];
  for (const k of ['story', 'stage', 'state', 'wanted', 'tiles']) if (a[k] !== b[k]) out.push(k);
  if (JSON.stringify(a.slots) !== JSON.stringify(b.slots)) out.push('slots');
  return out;
}

export class DesyncMonitor {
  constructor({ strikes = STRIKES } = {}) { this.strikes = strikes; this.count = 0; this.total = 0; this.lastN = -1; this.last = null; }
  // body = leesHashEvent(...); lokaal = viewOf(...) van de gast. Geeft { ok, alarm, velden }.
  check(body, lokaal) {
    if (!body || body.n <= this.lastN) return { ok: true, alarm: false, velden: [], overgeslagen: true };
    this.lastN = body.n;
    let velden = [];
    if (body.h !== hashView(lokaal)) { velden = verschil(body.v, lokaal); if (!velden.length) velden = ['hash']; }
    if (!velden.length) { this.count = 0; return { ok: true, alarm: false, velden }; }
    this.count++; this.total++; this.last = { n: body.n, velden };
    const alarm = this.count >= this.strikes;
    if (alarm) this.count = 0; // na de hersync opnieuw tellen
    return { ok: false, alarm, velden };
  }
}
