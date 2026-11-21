// Live treinen (#1085): vertragingen van de echte treinen, als OPTIE. Het spel haalt alleen openbare gegevens op (een gewone
// leesopvraag, GET, eens per minuut of minder) en deelt niets van de speler: geen id, naam, opslagsleutel, cookie of account.
// Constitutie 4 (AGENTS.md, besluit eigenaar 24-10 voor de live bussen; 21-11 voor de treinen). Model: livebussen.js.
//
// Bron: de open GTFS-Realtime-feed `trainUpdates.pb` van OVapi (https://gtfs.ovapi.nl/nl/trainUpdates.pb): per rit het
// treinnummer, per halte de geplande en verwachte tijd, de vertraging in seconden, het spoor en de stationscode, en of een
// rit vervalt. Zonder account of sleutel, CC0 volgens OVapi. De feed bevat heel Nederland (ca. 3 MB, ca. 1 MB gecomprimeerd);
// het spel houdt alleen de stations over die in het rooster staan (game/trainschedule.json). De feed heeft GEEN posities van
// treinen (vehiclePositions bevat alleen bus, tram en metro): daarom volgt het spel de treinen in beeld niet live.
//
// Alles faalt zacht: bij een fout, time-out, te groot of ongeldig bestand, een lege feed of een bron die weg is, toont het
// bord het rooster zonder vertraging. Puur: geen THREE, geen DOM; fetch komt van buiten (in tests een nep-fetch).
// Het ritme, de stand en de uitzetter staan in trainlive.js. Tests: scripts/livetrains_test.mjs.

export const LIVE_TRAINS = {
  url: 'https://gtfs.ovapi.nl/nl/trainUpdates.pb',
  interval: 60000,        // ms tussen twee opvragen (minimaal; bij fouten langer)
  maxInterval: 600000,    // ms: de uitstel bij herhaalde fouten
  timeout: 8000,          // ms
  maxBytes: 8 * 1024 * 1024,   // de feed is nu ca. 3 MB uitgepakt; ruimte voor een drukke dag
  maxMeldingen: 4000,     // vertrekken na het filteren op onze stations
  verouderd: 180000,      // ms: een stand ouder dan dit telt niet meer als live
  spreiding: 0.15,        // +-15% willekeurig op elk interval, zodat niet alle spelers op dezelfde seconde bij de bron aankloppen
};

// Alles wat naar de dienst gaat: de vaste url en deze opties. Geen speler-id, naam, sleutel, cookie of account.
export const REQUEST_OPTIONS = {
  method: 'GET',
  credentials: 'omit',
  cache: 'no-store',
  referrerPolicy: 'no-referrer',
  redirect: 'follow',
  headers: { Accept: 'application/x-protobuf', 'User-Agent': 'OpenDataLezer/1' },   // neutraal; OVapi vraagt een herkenbare User-Agent; gzip regelen fetch en de browser zelf (ca. 1 MB op de lijn, 3 MB uitgepakt); een browser negeert de User-Agent
};

// --- GTFS-RT lezen: minimale protobuf-lezer, met tekens voor de vertraging (kan negatief zijn: 10-byte varint) ---------
function varint(b, o) {
  // snel pad: tot 4 bytes (28 bits) is een gewoon getal. Langer (een unix-tijd of een negatieve int32 van 10 bytes): met BigInt, onderste 32 bits met teken
  const p0 = o.p;
  let r = 0;
  for (let i = 0; i < 4; i++) {
    if (o.p >= b.length) throw new Error('varint');
    const c = b[o.p++];
    r |= (c & 0x7f) << (7 * i);
    if (!(c & 0x80)) return { s: r, u: r };
  }
  o.p = p0;
  let v = 0n, shift = 0n, n = 0;
  for (;;) {
    if (o.p >= b.length || n++ > 9) throw new Error('varint');
    const c = b[o.p++];
    v |= BigInt(c & 0x7f) << shift;
    if (!(c & 0x80)) return { s: Number(BigInt.asIntN(32, v)), u: Number(BigInt.asUintN(53, v)) };
    shift += 7n;
  }
}
// Sleutels en lengtes en tijden (unix-seconden passen niet in 32 bits met teken): gewone grote varint
function varintGroot(b, o) {
  let r = 0, mul = 1, n = 0;
  for (;;) {
    if (o.p >= b.length || n++ > 9) throw new Error('varint');
    const c = b[o.p++];
    r += (c & 0x7f) * mul;
    if (!(c & 0x80)) return r;
    mul *= 128;
  }
}
// cb(veld, soort, waarde, begin, eind): soort 0 varint (waarde als int32 met teken, groot = zonder teken), 2 bytes (begin..eind)
function readFields(b, van, tot, cb) {
  const o = { p: van };
  while (o.p < tot) {
    const key = varintGroot(b, o), veld = Math.floor(key / 8), soort = key % 8;
    if (soort === 0) { const v = varint(b, o); cb(veld, 0, v.s, v.u); }
    else if (soort === 5) { if (o.p + 4 > tot) throw new Error('f32'); o.p += 4; }
    else if (soort === 1) { if (o.p + 8 > tot) throw new Error('f64'); o.p += 8; }
    else if (soort === 2) { const len = varintGroot(b, o); if (o.p + len > tot) throw new Error('len'); cb(veld, 2, null, null, o.p, o.p + len); o.p += len; }
    else throw new Error('soort');
  }
}
const DEC = new TextDecoder();
const tekst = (b, a, e) => DEC.decode(b.subarray(a, e));

// Eén tijdveld (StopTimeEvent): { delay (s, met teken), time (unix s) }
function leesEvent(b, a, e) {
  const ev = { delay: null, time: null };
  readFields(b, a, e, (f, s, w, groot) => { if (s !== 0) return; if (f === 1) ev.delay = w; else if (f === 2) ev.time = groot; });
  return ev;
}

// Alle haltemeldingen uit een FeedMessage, gefilterd op de stationscodes die we kennen (Set van kleine letters).
// Per melding: { nummer, datum ('20261121'), code, spoor, delay (s), time (unix s van het verwachte vertrek, of de aankomst), vervallen }.
// Een rit die vervalt (trip.schedule_relationship = 3) of een halte die wordt overgeslagen (1 of 3 bij de halte) geeft vervallen: true.
// Gooit bij een kapot bestand.
export function parseTrainReports(bytes, codes = null) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const uit = [];
  readFields(b, 0, b.length, (f, s, w, g, a, e) => {
    if (f !== 2 || s !== 2) return;                               // FeedEntity
    readFields(b, a, e, (f2, s2, w2, g2, a2, e2) => {
      if (f2 !== 3 || s2 !== 2) return;                           // TripUpdate
      let trainNumber = '', datum = '', ritVervalt = false;
      const halten = [];
      readFields(b, a2, e2, (f3, s3, w3, g3, a3, e3) => {
        if (f3 === 1 && s3 === 2) {                               // TripDescriptor
          readFields(b, a3, e3, (f4, s4, w4, g4, a4, e4) => {
            if (f4 === 3 && s4 === 2) datum = tekst(b, a4, e4);
            else if (f4 === 4 && s4 === 0) ritVervalt = w4 === 3;
            else if (f4 === 1003 && s4 === 2) readFields(b, a4, e4, (f5, s5, w5, g5, a5, e5) => { if (f5 === 2 && s5 === 2) trainNumber = tekst(b, a5, e5); });
          });
        } else if (f3 === 2 && s3 === 2) {                        // StopTimeUpdate
          const h = { code: '', spoor: '', arr: null, dep: null, weg: false };
          readFields(b, a3, e3, (f4, s4, w4, g4, a4, e4) => {
            if (f4 === 2 && s4 === 2) h.arr = leesEvent(b, a4, e4);
            else if (f4 === 3 && s4 === 2) h.dep = leesEvent(b, a4, e4);
            else if (f4 === 5 && s4 === 0) h.weg = w4 === 1 || w4 === 3;
            else if (f4 === 1003 && s4 === 2) readFields(b, a4, e4, (f5, s5, w5, g5, a5, e5) => {
              if (s5 !== 2) return;
              if (f5 === 2) h.spoor = tekst(b, a5, e5); else if (f5 === 4) h.code = tekst(b, a5, e5).toLowerCase();
            });
          });
          halten.push(h);
        }
      });
      if (!trainNumber) return;
      for (const h of halten) {
        if (!h.code || (codes && !codes.has(h.code))) continue;
        const ev = h.dep && h.dep.time != null ? h.dep : h.arr;
        if (!ev || ev.time == null) continue;
        uit.push({ nummer: trainNumber, datum, code: h.code, spoor: h.spoor, delay: ev.delay == null ? 0 : ev.delay, time: ev.time, vervallen: ritVervalt || h.weg });
      }
    });
  });
  return uit;
}

// Seconden na middernacht in Nederland van een unix-tijd (de zomer- of wintertijd van die dag); zonder Intl valt het terug op UTC+2.
export function nlSecOfDay(unix, timeZone = 'Europe/Amsterdam') {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(unix * 1000));
    const g = (t) => +p.find((x) => x.type === t).value;
    return g('hour') * 3600 + g('minute') * 60 + g('second');
  } catch {
    return (((unix + 7200) % 86400) + 86400) % 86400;
  }
}
export function nlDatum(unix, timeZone = 'Europe/Amsterdam') {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(unix * 1000));
    return p.replace(/-/g, '');
  } catch {
    return new Date((unix + 7200) * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  }
}

// De sleutel waarmee een melding aan een roosterrij gekoppeld wordt: treinnummer, stationscode en de geplande minuut van de dag.
// Gepland = verwacht - vertraging. De sleutel hangt niet af van de datum; zie keerToe voor de dag.
export const meldSleutel = (nummer, code, planSec) => `${nummer}|${code}|${Math.round(planSec / 60)}`;

// De meldingen van de datum van vandaag (in NL) tot een opzoekbare stand: Map sleutel -> { vertraging (s, >= 0), vervallen }.
// Vroeg (negatieve vertraging) telt als op tijd: het bord toont geen minuten "te vroeg".
export function buildDelayMap(meldingen, nuUnix, maxMeldingen = LIVE_TRAINS.maxMeldingen) {
  const vandaag = nlDatum(nuUnix);
  const map = new Map();
  for (const m of meldingen) {
    if (m.datum && m.datum !== vandaag) continue;
    if (map.size >= maxMeldingen) break;
    const plan = nlSecOfDay(m.time - m.delay);
    map.set(meldSleutel(m.nummer, m.code, plan), { vertraging: Math.max(0, m.delay), vervallen: !!m.vervallen });
  }
  return map;
}

// Een Response-achtige voor de Electron-brug (de main-process-opvraag, vanwege CORS): { ok, status, bytes }.
export function bridgeAsFetch(brug) {
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

// Eén opvraag. Geeft { ok: true, meldingen } of { ok: false, reden } (netwerk, time-out, status, te-groot, ongeldig, leeg). Gooit nooit.
// codes: Set stationscodes uit het rooster; alleen die meldingen blijven over.
export async function fetchLiveTrains({ fetchFn, codes = null, url = LIVE_TRAINS.url, timeout = LIVE_TRAINS.timeout, maxBytes = LIVE_TRAINS.maxBytes, maxMeldingen = LIVE_TRAINS.maxMeldingen, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (typeof fetchFn !== 'function') return { ok: false, reden: 'netwerk' };
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const timeoutPromise = new Promise((_, no) => { timer = setTimer(() => { if (ac) ac.abort(); no(new Error('time-out')); }, timeout); });
  try {
    const job = (async () => {
      const res = await fetchFn(url, { ...REQUEST_OPTIONS, ...(ac ? { signal: ac.signal } : {}) });
      if (!res || !res.ok) return { ok: false, reden: 'status', status: res ? res.status || 0 : 0 };
      const bytes = await leesBody(res, maxBytes);
      if (!bytes) return { ok: false, reden: 'te-groot' };
      let alle;
      try { alle = parseTrainReports(bytes, codes); } catch { return { ok: false, reden: 'ongeldig' }; }
      const hier = alle.slice(0, maxMeldingen);
      return hier.length ? { ok: true, meldingen: hier } : { ok: false, reden: bytes.length > 0 ? 'leeg' : 'ongeldig' };
    })();
    job.catch(() => {});   // een laat falen na de time-out is geen onverwerkte fout
    return await Promise.race([job, timeoutPromise]);
  } catch (e) {
    return { ok: false, reden: e && e.message === 'time-out' ? 'time-out' : 'netwerk' };
  } finally {
    clearTimer(timer);
  }
}
