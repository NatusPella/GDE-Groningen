// Live bussen (#395): protobuf lezen, de opvraag zonder spelergegevens, terugval bij fouten, koppelen aan een lijn en
// gladstrijken. Geen netwerk: een nep-fetch. Gebruik: node scripts/livebussen_test.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { prepareLine } from '../game/js/busroutes.js';
import { worldToWgs } from '../game/js/rdnew.js';
import { LIVE_BRON, VERZOEK, leesVoertuigen, haalLiveBussen, koppelAanLijn, peilNaarHoek, brugAlsFetch, inGebied } from '../game/js/livebussen.js';
import { maakLiveBussen, maakBusLive, kiesFetch } from '../game/js/buslive.js';

// --- een kleine protobuf-schrijver voor het nepbestand ---
const vi = (n) => { const o = []; while (n > 127) { o.push((n % 128) | 128); n = Math.floor(n / 128); } o.push(n); return o; };
const key = (f, w) => vi(f * 8 + w);
const len = (f, b) => [...key(f, 2), ...vi(b.length), ...b];
const f32 = (f, x) => { const d = new DataView(new ArrayBuffer(4)); d.setFloat32(0, x, true); return [...key(f, 5), ...new Uint8Array(d.buffer)]; };
const str = (f, s) => len(f, [...Buffer.from(s)]);
function voertuig({ id, lat, lon, bearing, speed, ts = 1700000000, route = '' }) {
  const pos = [...f32(1, lat), ...f32(2, lon), ...(bearing != null ? f32(3, bearing) : []), ...(speed != null ? f32(5, speed) : [])];
  const vp = [...(route ? len(1, str(5, route)) : []), ...len(2, pos), ...key(5, 0), ...vi(ts), ...len(8, str(1, id))];
  return len(2, [...str(1, 'e' + id), ...len(4, vp)]);
}
const feed = (...vs) => new Uint8Array([...len(1, [...str(1, '2.0')]), ...vs.flat()]);
const respons = (bytes, { ok = true, status = 200, cl = null } = {}) => ({ ok, status, headers: { get: (k) => (k === 'content-length' && cl != null ? String(cl) : null) }, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

// een lijn van west naar oost, 3 km, midden in het spelframe (bij Groningen)
const line = prepareLine({ id: 1, ref: '5', from: 'Groningen, Station', to: 'Winsum, Busstation', pts: [[0, 0], [1500, 0], [3000, 0]], stops: [{ x: 0, y: 0 }, { x: 1500, y: 0 }, { x: 3000, y: 0 }] });
const ll = (x, y) => worldToWgs(x, y);
const bus = (id, x, y, bearing, speed = 8) => { const [lat, lon] = ll(x, y); return { id, lat, lon, bearing, speed }; };

// --- lezen ---
{
  const verre = { id: 'ver', lat: 51.9, lon: 4.5, bearing: 0, speed: 3 };      // Rotterdam: buiten het gebied
  const b = feed(voertuig(bus('1001', 1000, 3, 90)), voertuig(verre));
  const alle = leesVoertuigen(b);
  assert.strictEqual(alle.length, 2);
  assert.strictEqual(alle[0].id, '1001');
  assert.ok(Math.abs(alle[0].bearing - 90) < 0.01 && Math.abs(alle[0].speed - 8) < 0.01 && alle[0].ts === 1700000000);
  assert.ok(inGebied(alle[0]) && !inGebied(alle[1]));
  assert.throws(() => leesVoertuigen(new Uint8Array([0x12, 0xff, 0x01, 0x00])));   // lengte voorbij het einde
  assert.strictEqual(leesVoertuigen(new Uint8Array(0)).length, 0);
}

// --- de opvraag: niets van de speler ---
{
  let gezien = null;
  const f = async (url, o) => { gezien = { url, o }; return respons(feed(voertuig(bus('7', 500, 2, 90)), voertuig({ id: 'ver', lat: 51.9, lon: 4.5 }))); };
  const r = await haalLiveBussen({ fetchFn: f });
  assert.ok(r.ok && r.voertuigen.length === 1, 'alleen het gebied rond Groningen');
  assert.strictEqual(gezien.url, LIVE_BRON.url);
  assert.ok(/^https:\/\/[^?#]+$/.test(gezien.url), 'geen querystring: niets in de url');
  assert.strictEqual(gezien.o.method, 'GET');
  assert.strictEqual(gezien.o.credentials, 'omit');
  assert.strictEqual(gezien.o.referrerPolicy, 'no-referrer');
  assert.ok(!('body' in gezien.o), 'geen body');
  assert.deepStrictEqual(Object.keys(gezien.o.headers).sort(), ['Accept', 'User-Agent']);
  const alles = JSON.stringify([gezien.url, VERZOEK]);
  assert.ok(!/gde-|player|speler|naam|name|token|key|id=|cookie|authorization/i.test(alles.replace(/Accept|User-Agent|OpenDataLezer/g, '')), 'geen spelergegevens in de opvraag');
  // de module leest geen opslag, instellingen of speler
  const src = fs.readFileSync(new URL('../game/js/livebussen.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage|sessionStorage|storagekeys|getSettings|document\.cookie|navigator\./.test(src), 'livebussen.js leest geen opslag of instellingen');
  assert.ok(!/^import .*(storagekeys|settings|save|coop)/m.test(src), 'geen import van opslag of coop');
}

// --- terugval: status, netwerk, time-out, kapot, te groot, leeg ---
{
  const gooit = async () => { throw new Error('offline'); };
  assert.deepStrictEqual(await haalLiveBussen({ fetchFn: gooit }), { ok: false, reden: 'netwerk' });
  assert.deepStrictEqual(await haalLiveBussen({ fetchFn: async () => respons(new Uint8Array(0), { ok: false, status: 503 }) }), { ok: false, reden: 'status' });
  assert.deepStrictEqual(await haalLiveBussen({}), { ok: false, reden: 'netwerk' });
  let afgebroken = false;
  const hangt = (u, o) => new Promise((_, no) => { o.signal.addEventListener('abort', () => { afgebroken = true; no(new Error('abort')); }); });
  assert.deepStrictEqual(await haalLiveBussen({ fetchFn: hangt, timeout: 30 }), { ok: false, reden: 'time-out' });
  assert.ok(afgebroken, 'de opvraag wordt afgebroken');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(new Uint8Array([1, 2, 3, 250, 250])) })).reden, 'ongeldig');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(new Uint8Array([0xff, 0xff])) })).reden, 'ongeldig');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(feed(voertuig(bus('1', 0, 0, 90))), { cl: 99999999 }) })).reden, 'te-groot');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(feed(voertuig(bus('1', 0, 0, 90))), {}), maxBytes: 10 })).reden, 'te-groot');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(feed(voertuig({ id: 'x', lat: 51.9, lon: 4.5 }))) })).reden, 'leeg');
  assert.strictEqual((await haalLiveBussen({ fetchFn: async () => respons(feed()) })).reden, 'ongeldig', 'een leeg bestand: niet bruikbaar');
  const maxN = await haalLiveBussen({ fetchFn: async () => respons(feed(...Array.from({ length: 50 }, (_, i) => voertuig(bus('b' + i, i * 10, 1, 90))))), maxVoertuigen: 20 });
  assert.strictEqual(maxN.voertuigen.length, 20, 'begrensd aantal voertuigen');
  // de brug van Electron
  const viaBrug = await haalLiveBussen({ fetchFn: brugAlsFetch(async () => ({ ok: true, status: 200, bytes: feed(voertuig(bus('9', 100, 1, 90))) })) });
  assert.ok(viaBrug.ok && viaBrug.voertuigen[0].id === '9');
  assert.strictEqual((await haalLiveBussen({ fetchFn: brugAlsFetch(async () => ({ ok: false, status: 0, bytes: new Uint8Array(0) })) })).reden, 'status');
}

// --- koppelen aan een lijn ---
{
  assert.ok(Math.abs(peilNaarHoek(90)) < 1e-9, 'oost = hoek 0');
  assert.ok(Math.abs(peilNaarHoek(180) - Math.PI / 2) < 1e-9, 'zuid = +y');
  const heen = koppelAanLijn([line], 1000, 5, peilNaarHoek(90));
  assert.ok(heen && heen.dir === 1 && Math.abs(heen.s - 1000) < 1);
  assert.strictEqual(koppelAanLijn([line], 1000, 5, peilNaarHoek(270)).dir, -1);
  assert.strictEqual(koppelAanLijn([line], 1000, 5, peilNaarHoek(0)), null, 'dwars op de lijn: niet dezelfde bus');
  assert.strictEqual(koppelAanLijn([line], 1000, 200, peilNaarHoek(90)), null, 'te ver van de lijn');
  assert.strictEqual(koppelAanLijn([], 1000, 5, null), null);
}

// --- de stand, gladstrijken en terugval op eigen dienst ---
{
  let t = 1_000_000;
  const feeds = [
    feed(voertuig(bus('A', 1000, 2, 90, 10)), voertuig(bus('B', 300, 2, 270, 6)), voertuig({ id: 'trein', lat: 53.2, lon: 6.5, bearing: 10, speed: 20 })),
    feed(voertuig(bus('A', 1600, 2, 90, 10)), voertuig(bus('B', 100, 2, 270, 6))),
  ];
  let n = 0, aanroepen = 0;
  const f = async () => { aanroepen++; return respons(feeds[Math.min(n++, feeds.length - 1)]); };
  const lb = maakLiveBussen({ fetchFn: f, nu: () => t });
  assert.strictEqual(lb.tick(false, [line], t), null, 'uit: geen opvraag');
  assert.strictEqual(aanroepen, 0);
  await lb.tick(true, [line], t);
  assert.strictEqual(aanroepen, 1);
  assert.strictEqual(lb.stand().aantal, 2, 'de trein rijdt niet op een buslijn');
  assert.strictEqual(lb.stand().onbekend, 1);
  assert.strictEqual(lb.tick(true, [line], t + 30000), null, 'binnen de minuut geen tweede opvraag');
  assert.strictEqual(aanroepen, 1);
  const a0 = lb.positie('A', t);
  assert.ok(a0 && a0.dir === 1 && Math.abs(a0.s - 1000) < 2 && Math.abs(a0.angle) < 0.01);
  t += 60000;
  await lb.tick(true, [line], t);
  assert.strictEqual(aanroepen, 2);
  const a1 = lb.positie('A', t), a2 = lb.positie('A', t + 30000), a3 = lb.positie('A', t + 60000);
  assert.ok(Math.abs(a1.s - 1000) < 2 && Math.abs(a2.s - 1300) < 2 && Math.abs(a3.s - 1600) < 2, 'gladstrijken tussen twee posities');
  assert.ok(Math.abs(a1.speed - 10) < 0.5, 'snelheid uit twee posities');
  const b = lb.positie('B', t + 30000);
  assert.ok(b.dir === -1 && Math.abs(b.angle - Math.PI) < 0.01, 'tegenrichting: de bus keert zijn kop');
  const ring = lb.kandidaten(1200, 0, 100, 600, 3, t + 30000);
  assert.deepStrictEqual(ring.map((q) => q.id), ['A', 'B'].filter((id) => ring.some((q) => q.id === id)));
  assert.strictEqual(lb.kandidaten(1200, 0, 100, 600, 1, t + 30000).length, 1, 'begrensd aantal dichtbij');
  assert.strictEqual(lb.kandidaten(1300, 0, 50, 250, 3, t + 30000).filter((q) => q.id === 'B').length, 0, 'buiten de ring: niet dichtbij genoeg');
  // een positie die te oud is telt niet meer: de bus rijdt weer zijn eigen dienst
  assert.strictEqual(lb.positie('A', t + LIVE_BRON.verouderd + 1000), null);
  // instelling uit: alles weg
  lb.tick(false, [line], t + 1);
  assert.strictEqual(lb.positie('A', t), null);
  assert.strictEqual(lb.stand().aantal, 0);
}

// --- fouten: uitstel, daarna weer proberen; een lege feed is geen fout ---
{
  let t = 5_000_000;
  let modus = 'stuk';
  const f = async () => (modus === 'stuk' ? respons(new Uint8Array(0), { ok: false, status: 500 }) : modus === 'leeg' ? respons(feed(voertuig({ id: 'x', lat: 51.9, lon: 4.5 }))) : respons(feed(voertuig(bus('A', 1000, 2, 90)))));
  const lb = maakLiveBussen({ fetchFn: f, nu: () => t });
  await lb.tick(true, [line], t);
  assert.strictEqual(lb.stand().fouten, 1);
  const eerste = lb.stand().volgendeOp - t;
  t += eerste; await lb.tick(true, [line], t);
  assert.ok(lb.stand().volgendeOp - t > eerste, 'uitstel groeit bij herhaalde fouten');
  for (let i = 0; i < 12; i++) { t = lb.stand().volgendeOp; await lb.tick(true, [line], t); }
  assert.ok(lb.stand().volgendeOp - t <= LIVE_BRON.maxInterval, 'uitstel is begrensd');
  assert.strictEqual(lb.stand().aantal, 0);
  modus = 'goed'; t = lb.stand().volgendeOp; await lb.tick(true, [line], t);
  assert.strictEqual(lb.stand().fouten, 0); assert.strictEqual(lb.stand().aantal, 1, 'de bron is terug');
  modus = 'leeg'; t += LIVE_BRON.interval; await lb.tick(true, [line], t);
  assert.strictEqual(lb.stand().fouten, 0, 'een lege feed is geen fout');
  assert.strictEqual(lb.stand().volgendeOp - t, LIVE_BRON.interval);
  // een lijnenlijst die nog leeg is (data niet geladen): geen opvraag
  let n = 0;
  const lb2 = maakLiveBussen({ fetchFn: async () => { n++; return respons(feed()); }, nu: () => t });
  assert.strictEqual(lb2.tick(true, [], t), null); assert.strictEqual(n, 0);
}

// --- de bedrading (buslive.js): de brug, de uitzetter en de terugval ---
{
  // de brug van Electron gaat voor de directe fetch, en zonder een van beide is er geen bron
  let viaBrug = 0, viaFetch = 0;
  const brug = async () => { viaBrug++; return { ok: true, status: 200, bytes: feed(voertuig(bus('9', 100, 1, 90))) }; };
  const omg = { gdeDesktop: { liveBussen: brug }, fetch: async () => { viaFetch++; throw new Error('x'); } };
  const via = await haalLiveBussen({ fetchFn: kiesFetch(omg) });
  assert.ok(via.ok && via.voertuigen[0].id === '9');
  assert.strictEqual(viaBrug, 1); assert.strictEqual(viaFetch, 0, 'de brug gaat voor de directe fetch');
  let direct = 0;
  await haalLiveBussen({ fetchFn: kiesFetch({ fetch: async (u, o) => { direct++; return respons(feed(voertuig(bus('8', 100, 1, 90)))); } }) });
  assert.strictEqual(direct, 1, 'zonder brug vraagt de webversie het zelf op');
  assert.strictEqual(kiesFetch({}), null, 'zonder netwerk geen bron');

  // de uitzetter: uit = geen opvraag; aan = wel; een devrun vraagt nooit op
  let t = 2_000_000, opgevraagd = 0, gezet = 'niets';
  const zonderNet = maakBusLive({ fetchFn: null, nu: () => t, instellingen: () => ({ liveBussen: true }), toegestaan: () => true });
  assert.strictEqual(zonderNet.tick([line], t), null, 'zonder netwerk geen opvraag');
  assert.strictEqual(zonderNet.bron.stand().aan, false);
  const f = async () => { opgevraagd++; return respons(feed(voertuig(bus('A', 1000, 2, 90, 8)))); };
  let inst = { liveBussen: false };
  const bl = maakBusLive({ fetchFn: f, nu: () => t, instellingen: () => inst, toegestaan: () => true, zetBron: (b) => { gezet = b; } });
  assert.ok(gezet && typeof gezet.positie === 'function' && typeof gezet.kandidaten === 'function', 'de bron is aan de bus-AI gegeven');
  assert.strictEqual(bl.tick([line], t), null);
  assert.strictEqual(opgevraagd, 0, 'instelling uit: geen opvraag, de bussen rijden hun eigen dienst');
  inst = { liveBussen: true };
  await bl.tick([line], t);
  assert.strictEqual(opgevraagd, 1);
  assert.ok(bl.bron.positie('A', t), 'de echte bus is bekend');
  const bl2 = maakBusLive({ fetchFn: async () => { opgevraagd++; return respons(feed()); }, nu: () => t, instellingen: () => ({ liveBussen: true }), toegestaan: () => false });
  assert.strictEqual(bl2.tick([line], t), null);
  assert.strictEqual(opgevraagd, 1, 'een test- of devrun vraagt nooit op');
  // de speler zet de optie tijdens het spel uit: de bussen vallen terug op hun eigen dienst
  inst = { liveBussen: false };
  bl.tick([line], t);
  assert.strictEqual(bl.bron.positie('A', t), null);
  assert.strictEqual(bl.stand().aantal, 0);
  bl.stop();
  assert.strictEqual(gezet, null, 'stoppen geeft de eigen dienst terug');
  // buslive.js leest zelf geen opslag of instellingen en heeft geen eigen url: het krijgt alles van buiten
  const bron = fs.readFileSync(new URL('../game/js/buslive.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage|sessionStorage|storagekeys|document\.cookie|navigator\./.test(bron), 'buslive.js leest geen opslag');
  assert.ok(!/https?:\/\//.test(bron), 'geen eigen url: de bron komt uit livebussen.js');
}

// --- de desktop-opvraag (main-proces) heeft dezelfde url en grenzen ---
{
  const cjs = createRequire(import.meta.url)('../desktop/livebussen.cjs');
  assert.strictEqual(cjs.LIVE_URL, LIVE_BRON.url);
  assert.strictEqual(cjs.TIMEOUT, LIVE_BRON.timeout);
  assert.strictEqual(cjs.MAX_BYTES, LIVE_BRON.maxBytes);
  let gezien;
  const bytes = feed(voertuig(bus('1', 0, 0, 90)));
  const nepFetch = async (url, o) => { gezien = { url, o }; let gedaan = false; return { ok: true, status: 200, body: { getReader: () => ({ read: async () => (gedaan ? { done: true } : ((gedaan = true), { done: false, value: bytes })) }) } }; };
  const r = await cjs.haalLiveBussen(nepFetch);
  assert.ok(r.ok && r.bytes.length === bytes.length);
  assert.strictEqual(gezien.url, LIVE_BRON.url); assert.strictEqual(gezien.o.method, 'GET'); assert.strictEqual(gezien.o.credentials, 'omit');
  assert.strictEqual((await cjs.haalLiveBussen(async () => { throw new Error('x'); })).ok, false);
  assert.strictEqual((await cjs.haalLiveBussen(async () => ({ ok: false, status: 404 }))).ok, false);
  const groot = async () => ({ ok: true, status: 200, body: { getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(cjs.MAX_BYTES + 1) }) }) } });
  assert.strictEqual((await cjs.haalLiveBussen(groot)).ok, false, 'te groot');
  const pkg = JSON.parse(fs.readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8'));
  assert.ok(JSON.stringify(pkg).includes('livebussen.cjs'), 'in het pakket');
  const pre = fs.readFileSync(new URL('../desktop/preload.js', import.meta.url), 'utf8');
  assert.ok(/liveBussen: \(\) => ipcRenderer\.invoke\('gde:live-bussen'\)/.test(pre), 'de brug neemt geen argumenten aan');
}

console.log('livebussen_test: ok');
