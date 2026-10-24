// Live bussen (#395): bussen rijden waar ze in het echt rijden, als OPTIE. Het spel haalt alleen publieke
// buslocaties op (een gewone leesopvraag, GET, eens per minuut of minder) en deelt niets van de speler: geen
// id, naam, opslagsleutel, cookie of account. Constitutie 4 (AGENTS.md, besluit eigenaar 24-10).
//
// Bron: de open GTFS-Realtime-feed van OVapi / openOV (voertuigposities van het Nederlandse openbaar vervoer).
// Zonder account of sleutel, openbaar als protobuf-bestand (ca. 0,5 MB), CC0 volgens openOV. Het spel leest er
// hier alleen positie, richting en snelheid uit, in het gebied rond Groningen. De lijnnummers van de feed
// komen niet in beeld: een voertuig wordt aan een van de eigen lijnen (busroutes.js) gekoppeld op plek en
// rijrichting, en op het bord staat de verzonnen lijn en bestemming van het spel.
//
// Alles faalt zacht: bij een fout, time-out, te groot of ongeldig bestand, een lege feed of een bron die weg
// is, rijden de bussen zoals voorheen (hun eigen dienst). Puur: geen THREE, geen DOM; fetch komt van buiten
// (in tests een nep-fetch). Het ritme, de stand en de uitzetter staan in buslive.js.
// Tests: scripts/livebussen_test.mjs.

import { project, pointAt } from './busroutes.js';

export const LIVE_BRON = {
  url: 'https://gtfs.ovapi.nl/nl/vehiclePositions.pb',
  interval: 60000,       // ms tussen twee opvragen (minimaal; bij fouten langer)
  maxInterval: 600000,   // ms: de uitstel bij herhaalde fouten
  timeout: 8000,         // ms
  maxBytes: 3 * 1024 * 1024,
  maxVoertuigen: 300,    // na het filteren op het gebied
  verouderd: 180000,     // ms: een positie ouder dan dit telt niet meer
};
// alleen het gebied rond (de provincie) Groningen
export const GEBIED = { latMin: 52.95, latMax: 53.50, lonMin: 6.05, lonMax: 7.30 };
export const MAX_KOPPEL_AFSTAND = 30;   // m van een eigen lijn om als dat voertuig te tellen
export const MAX_LIVE_NABIJ = 3;        // live bussen tegelijk dichtbij de speler

// --- GTFS-RT lezen (minimale protobuf-lezer: alleen wat we nodig hebben) ---------------------------------
function varint(b, o) {
  let r = 0, mul = 1, n = 0;
  for (;;) {
    if (o.p >= b.length || n++ > 9) throw new Error('varint');
    const c = b[o.p++];
    r += (c & 0x7f) * mul;
    if (!(c & 0x80)) return r;
    mul *= 128;
  }
}

// roept cb(veld, soort, waarde, begin, eind) per veld; soort 0 varint, 5 float32, 2 bytes (begin..eind)
function velden(b, van, tot, cb) {
  const o = { p: van };
  while (o.p < tot) {
    const key = varint(b, o), veld = Math.floor(key / 8), soort = key % 8;
    if (soort === 0) cb(veld, 0, varint(b, o));
    else if (soort === 5) { if (o.p + 4 > tot) throw new Error('f32'); cb(veld, 5, new DataView(b.buffer, b.byteOffset + o.p, 4).getFloat32(0, true)); o.p += 4; }
    else if (soort === 1) { if (o.p + 8 > tot) throw new Error('f64'); o.p += 8; }
    else if (soort === 2) { const len = varint(b, o); if (o.p + len > tot) throw new Error('len'); cb(veld, 2, null, o.p, o.p + len); o.p += len; }
    else throw new Error('soort');
  }
}

const tekst = (b, a, e) => new TextDecoder().decode(b.subarray(a, e));

// Alle voertuigposities uit een FeedMessage. Gooit bij een kapot bestand.
export function leesVoertuigen(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const uit = [];
  velden(b, 0, b.length, (f, s, w, a, e) => {
    if (f !== 2 || s !== 2) return;                                  // FeedEntity
    velden(b, a, e, (f2, s2, w2, a2, e2) => {
      if (f2 !== 4 || s2 !== 2) return;                              // VehiclePosition
      const v = { id: '', lat: NaN, lon: NaN, bearing: null, speed: null, ts: 0, route: '' };
      velden(b, a2, e2, (f3, s3, w3, a3, e3) => {
        if (f3 === 2 && s3 === 2) velden(b, a3, e3, (f4, s4, w4) => {   // Position
          if (s4 !== 5) return;
          if (f4 === 1) v.lat = w4; else if (f4 === 2) v.lon = w4; else if (f4 === 3) v.bearing = w4; else if (f4 === 5) v.speed = w4;
        });
        else if (f3 === 5 && s3 === 0) v.ts = w3;
        else if (f3 === 8 && s3 === 2) velden(b, a3, e3, (f4, s4, w4, a4, e4) => { if (f4 === 1 && s4 === 2) v.id = tekst(b, a4, e4); });
        else if (f3 === 1 && s3 === 2) velden(b, a3, e3, (f4, s4, w4, a4, e4) => { if (f4 === 5 && s4 === 2) v.route = tekst(b, a4, e4); });
      });
      if (Number.isFinite(v.lat) && Number.isFinite(v.lon)) uit.push(v);
    });
  });
  return uit;
}

export const inGebied = (v, g = GEBIED) => v.lat >= g.latMin && v.lat <= g.latMax && v.lon >= g.lonMin && v.lon <= g.lonMax;

// --- de opvraag ----------------------------------------------------------------------------------------
// Alles wat naar de dienst gaat: de vaste url en deze opties. Geen speler-id, naam, sleutel, cookie of account.
export const VERZOEK = {
  method: 'GET',
  credentials: 'omit',          // geen cookies
  cache: 'no-store',
  referrerPolicy: 'no-referrer',
  redirect: 'follow',
  headers: { Accept: 'application/x-protobuf', 'User-Agent': 'OpenDataLezer/1' },   // neutraal; een browser negeert de User-Agent zelf
};

// Een Response-achtige voor de Electron-brug (de main-process-opvraag, vanwege CORS): { ok, status, bytes }.
export function brugAlsFetch(brug) {
  return async () => {
    const r = await brug();
    if (!r || !r.bytes) throw new Error('brug');
    const buf = r.bytes instanceof ArrayBuffer ? r.bytes : r.bytes.buffer.slice(r.bytes.byteOffset, r.bytes.byteOffset + r.bytes.byteLength);
    return { ok: !!r.ok, status: r.status || 0, headers: { get: () => null }, arrayBuffer: async () => buf };
  };
}

async function leesBody(res, maxBytes) {
  const len = Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (len > maxBytes) return null;
  if (res.body && typeof res.body.getReader === 'function') {
    const rd = res.body.getReader();
    const delen = []; let n = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      n += value.length;
      if (n > maxBytes) { try { await rd.cancel(); } catch { /* al klaar */ } return null; }
      delen.push(value);
    }
    const uit = new Uint8Array(n); let p = 0;
    for (const d of delen) { uit.set(d, p); p += d.length; }
    return uit;
  }
  const ab = new Uint8Array(await res.arrayBuffer());
  return ab.length > maxBytes ? null : ab;
}

// Eén opvraag. Geeft { ok: true, voertuigen } of { ok: false, reden } (netwerk, time-out, status, te-groot,
// ongeldig, leeg). Gooit nooit.
export async function haalLiveBussen({ fetchFn, url = LIVE_BRON.url, timeout = LIVE_BRON.timeout, maxBytes = LIVE_BRON.maxBytes, maxVoertuigen = LIVE_BRON.maxVoertuigen, gebied = GEBIED, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (typeof fetchFn !== 'function') return { ok: false, reden: 'netwerk' };
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const klok = new Promise((_, no) => { timer = setTimer(() => { if (ac) ac.abort(); no(new Error('time-out')); }, timeout); });
  try {
    const werk = (async () => {
      const res = await fetchFn(url, { ...VERZOEK, ...(ac ? { signal: ac.signal } : {}) });
      if (!res || !res.ok) return { ok: false, reden: 'status' };
      const bytes = await leesBody(res, maxBytes);
      if (!bytes) return { ok: false, reden: 'te-groot' };
      let alle;
      try { alle = leesVoertuigen(bytes); } catch { return { ok: false, reden: 'ongeldig' }; }
      const hier = alle.filter((v) => inGebied(v, gebied)).slice(0, maxVoertuigen);
      return hier.length ? { ok: true, voertuigen: hier } : { ok: false, reden: alle.length ? 'leeg' : 'ongeldig' };
    })();
    werk.catch(() => {});   // een laat falen na de time-out is geen onverwerkte fout
    return await Promise.race([werk, klok]);
  } catch (e) {
    return { ok: false, reden: e && e.message === 'time-out' ? 'time-out' : 'netwerk' };
  } finally {
    clearTimer(timer);
  }
}

// --- koppelen aan de eigen lijnen ----------------------------------------------------------------------
const hoekVerschil = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// compasrichting (graden, met de klok mee vanaf noord) -> spelhoek (x oost, y zuid)
export const peilNaarHoek = (deg) => Math.atan2(-Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180));

// De lijn waar dit voertuig op rijdt: dichtbij genoeg en, met een peiling, in dezelfde richting.
// Geeft { line, dir, s, x, y } of null (een voertuig dat niet op een van onze lijnen rijdt telt niet).
export function koppelAanLijn(lines, x, y, hoek = null, maxD = MAX_KOPPEL_AFSTAND) {
  let best = null;
  for (const line of lines || []) {
    const pr = project(line, x, y);
    if (pr.d > maxD) continue;
    let dir = 0;
    if (hoek != null) {
      const h = pointAt(line, pr.s).heading;
      const verschil = hoekVerschil(hoek, h);
      if (verschil < Math.PI / 3) dir = 1; else if (verschil > Math.PI * 2 / 3) dir = -1; else continue;
    }
    if (!best || pr.d < best.d) best = { line, dir, s: pr.s, x: pr.x, y: pr.y, d: pr.d };
  }
  return best;
}
