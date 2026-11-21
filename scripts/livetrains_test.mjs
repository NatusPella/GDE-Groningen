// Live treinen (#1085): protobuf lezen (ook negatieve vertraging en een vervallen rit), de opvraag zonder spelergegevens, terugval
// bij fouten, het ritme (backoff, spreiding), de uitzetter en de desktop-opvraag. Geen netwerk: een nep-fetch en een nepfeed.
// Gebruik: node scripts/livetrains_test.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { LIVE_TRAINS, REQUEST_OPTIONS, parseTrainReports, fetchLiveTrains, buildDelayMap, meldSleutel, nlSecOfDay, nlDatum, bridgeAsFetch } from '../game/js/livetrains.js';
import { createLiveTrains, createTrainLive, kiesFetch } from '../game/js/treinlive.js';

// --- een kleine protobuf-schrijver voor het nepbestand (GTFS-RT TripUpdate met de OVapi-uitbreiding) ---
const vi = (n) => { const o = []; let b = BigInt(n); if (b < 0n) b += 1n << 64n; while (b > 127n) { o.push(Number(b & 127n) | 128); b >>= 7n; } o.push(Number(b)); return o; };
const key = (f, w) => vi(f * 8 + w);
const len = (f, b) => [...key(f, 2), ...vi(b.length), ...b];
const varf = (f, n) => [...key(f, 0), ...vi(n)];
const str = (f, s) => len(f, [...Buffer.from(s)]);
const event = (delay, time) => [...varf(1, delay), ...varf(2, time)];
function halte({ code, spoor, arr = null, dep = null, weg = 0 }) {
  return len(2, [...(arr ? len(2, event(arr.delay, arr.time)) : []), ...(dep ? len(3, event(dep.delay, dep.time)) : []), ...str(4, '2992735'), ...(weg ? varf(5, weg) : []), ...len(1003, [...str(2, spoor), ...str(4, code)])]);
}
function rit({ nummer, datum, halten, vervalt = false }) {
  const trip = [...str(1, '394267884'), ...str(2, '11:40:00'), ...str(3, datum), ...(vervalt ? varf(4, 3) : varf(4, 0)), ...str(5, '165473'), ...len(1003, [...str(1, `IFF:ST:${nummer}`), ...str(2, nummer)])];
  return len(2, [...str(1, `e${nummer}`), ...len(3, [...len(1, trip), ...halten.flat()])]);
}
const feed = (...vs) => new Uint8Array([...len(1, [...str(1, '2.0')]), ...vs.flat()]);
const respons = (bytes, { ok = true, status = 200, cl = null } = {}) => ({ ok, status, headers: { get: (k) => (k === 'content-length' && cl != null ? String(cl) : null) }, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

// 2026-11-21 09:00 NL (UTC+1) = 08:00 UTC
const T0 = Date.UTC(2026, 10, 21, 8, 0, 0) / 1000;
const CODES = new Set(['gn', 'hrn']);
const demo = () => feed(
  rit({ nummer: '37819', datum: '20261121', halten: [halte({ code: 'gn', spoor: '5', dep: { delay: 180, time: T0 + 600 + 180 } }), halte({ code: 'hrn', spoor: '2', arr: { delay: 120, time: T0 + 900 }, dep: { delay: 120, time: T0 + 960 } })] }),
  rit({ nummer: '6140', datum: '20261121', halten: [halte({ code: 'gn', spoor: '6', dep: { delay: -60, time: T0 + 1200 - 60 } })] }),
  rit({ nummer: '100', datum: '20261121', vervalt: true, halten: [halte({ code: 'gn', spoor: '1', dep: { delay: 0, time: T0 + 1800 } })] }),
  rit({ nummer: '200', datum: '20261121', halten: [halte({ code: 'gn', spoor: '3', dep: { delay: 0, time: T0 + 2400 }, weg: 1 })] }),
  rit({ nummer: '300', datum: '20261122', halten: [halte({ code: 'gn', spoor: '4', dep: { delay: 300, time: T0 + 90000 + 300 } })] }),    // morgen
  rit({ nummer: '400', datum: '20261121', halten: [halte({ code: 'ut', spoor: '4', dep: { delay: 60, time: T0 + 100 } })] }),                // ander station
);

// --- lezen ---
{
  const m = parseTrainReports(demo(), CODES);
  const per = (n, c) => m.find((x) => x.nummer === n && x.code === c);
  assert.strictEqual(m.length, 6, 'alleen de stations uit het rooster (ut valt weg)');
  assert.deepStrictEqual([per('37819', 'gn').delay, per('37819', 'gn').spoor], [180, '5']);
  assert.strictEqual(per('37819', 'hrn').delay, 120, 'zonder vertrek telt de aankomst, met vertrek het vertrek');
  assert.strictEqual(per('6140', 'gn').delay, -60, 'een vroege trein (negatieve vertraging, 10-byte varint) wordt goed gelezen');
  assert.ok(per('100', 'gn').vervallen, 'een vervallen rit');
  assert.ok(per('200', 'gn').vervallen, 'een overgeslagen halte');
  assert.ok(!per('37819', 'gn').vervallen);
  assert.strictEqual(per('37819', 'gn').datum, '20261121');
  assert.strictEqual(parseTrainReports(demo()).length, 7, 'zonder filter alles');
  assert.throws(() => parseTrainReports(new Uint8Array([0x12, 0xff, 0x01, 0x00])));
  assert.strictEqual(parseTrainReports(new Uint8Array(0)).length, 0);
}

// --- tijd en sleutel ---
{
  assert.strictEqual(nlSecOfDay(T0), 9 * 3600, 'NL-tijd in de winter: UTC+1');
  assert.strictEqual(nlSecOfDay(Date.UTC(2027, 7, 18, 8, 0, 0) / 1000), 10 * 3600, 'NL-tijd in de zomer: UTC+2');
  assert.strictEqual(nlDatum(T0), '20261121');
  assert.strictEqual(nlDatum(Date.UTC(2026, 10, 21, 23, 30, 0) / 1000), '20261122', 'na 23:00 UTC is het in Nederland al de volgende dag');
  const m = parseTrainReports(demo(), CODES);
  const st = buildDelayMap(m, T0);
  // 37819: gepland = verwacht - vertraging = T0 + 600 -> 09:10 NL
  assert.deepStrictEqual(st.get(meldSleutel('37819', 'gn', 9 * 3600 + 600)), { vertraging: 180, vervallen: false });
  assert.deepStrictEqual(st.get(meldSleutel('6140', 'gn', 9 * 3600 + 1200)), { vertraging: 0, vervallen: false }, 'vroeg telt als op tijd');
  assert.ok(st.get(meldSleutel('100', 'gn', 9 * 3600 + 1800)).vervallen);
  assert.ok(![...st.keys()].some((k) => k.startsWith('300|')), 'meldingen voor morgen tellen niet mee voor vandaag');
  assert.strictEqual(buildDelayMap(m, T0, 2).size, 2, 'een maximum aan meldingen');
}

// --- de opvraag: niets van de speler ---
{
  let gezien = null;
  const f = async (url, o) => { gezien = { url, o }; return respons(demo()); };
  const r = await fetchLiveTrains({ fetchFn: f, codes: CODES });
  assert.ok(r.ok && r.meldingen.length === 6);
  assert.strictEqual(gezien.url, LIVE_TRAINS.url);
  assert.ok(/^https:\/\/gtfs\.ovapi\.nl\/nl\/trainUpdates\.pb$/.test(gezien.url), 'vaste url, geen querystring');
  assert.strictEqual(gezien.o.method, 'GET');
  assert.strictEqual(gezien.o.credentials, 'omit');
  assert.strictEqual(gezien.o.referrerPolicy, 'no-referrer');
  assert.ok(!('body' in gezien.o), 'geen body');
  assert.deepStrictEqual(Object.keys(gezien.o.headers).sort(), ['Accept', 'User-Agent']);
  const alles = JSON.stringify([gezien.url, REQUEST_OPTIONS]);
  assert.ok(!/gde-|player|speler|naam|name|token|key|id=|cookie|authorization/i.test(alles.replace(/Accept|User-Agent|OpenDataLezer/g, '')), 'geen spelergegevens in de opvraag');
  const src = fs.readFileSync(new URL('../game/js/livetrains.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage|sessionStorage|storagekeys|getSettings|document\.cookie|navigator\./.test(src), 'livetrains.js leest geen opslag of instellingen');
  const src2 = fs.readFileSync(new URL('../game/js/treinlive.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage|sessionStorage|storagekeys|document\.cookie|navigator\./.test(src2), 'treinlive.js leest geen opslag');
  assert.ok(!/https?:\/\//.test(src2.replace(/\/\/.*$/gm, '')), 'treinlive.js heeft geen eigen url');
}

// --- zacht falen ---
{
  const f = (res) => async () => res;
  assert.deepStrictEqual((await fetchLiveTrains({ fetchFn: f(respons(new Uint8Array(0), { ok: false, status: 503 })), codes: CODES })), { ok: false, reden: 'status', status: 503 });
  assert.strictEqual((await fetchLiveTrains({ fetchFn: async () => { throw new Error('x'); }, codes: CODES })).reden, 'netwerk');
  assert.strictEqual((await fetchLiveTrains({ fetchFn: f(respons(new Uint8Array([0x12, 0xff, 0x01]))), codes: CODES })).reden, 'ongeldig');
  assert.strictEqual((await fetchLiveTrains({ fetchFn: f(respons(feed(rit({ nummer: '1', datum: '20261121', halten: [halte({ code: 'ut', spoor: '1', dep: { delay: 0, time: T0 } })] })))), codes: CODES })).reden, 'leeg', 'geen melding voor onze stations');
  assert.strictEqual((await fetchLiveTrains({ fetchFn: f(respons(demo(), { cl: LIVE_TRAINS.maxBytes + 1 })), codes: CODES })).reden, 'te-groot');
  assert.strictEqual((await fetchLiveTrains({ fetchFn: undefined })).reden, 'netwerk');
  // time-out: de fetch hangt, de klok tikt
  let tikken = null;
  const hangt = fetchLiveTrains({ fetchFn: () => new Promise(() => {}), codes: CODES, setTimer: (fn) => { tikken = fn; return 1; }, clearTimer: () => {} });
  tikken();
  assert.strictEqual((await hangt).reden, 'time-out');
  // te groot bij streamen
  const groot = async () => ({ ok: true, status: 200, headers: { get: () => null }, body: { getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(LIVE_TRAINS.maxBytes + 1) }), cancel: async () => {} }) } });
  assert.strictEqual((await fetchLiveTrains({ fetchFn: groot, codes: CODES })).reden, 'te-groot');
}

// --- het ritme: een opvraag per minuut, backoff, spreiding, 429 ---
{
  let t = T0 * 1000, n = 0, volgende = () => respons(demo());
  const lt = createLiveTrains({ fetchFn: async () => { n++; return volgende(); }, nu: () => t, opts: { jitter: () => 1 } });
  assert.strictEqual(lt.vertragingen(t), null, 'voor de eerste opvraag: geen vertragingen, het bord toont het rooster');
  await lt.tick(true, CODES, t);
  assert.strictEqual(n, 1);
  assert.ok(lt.vertragingen(t).size >= 3 && lt.stand().laatsteOk === t);
  t += 30_000; assert.strictEqual(lt.tick(true, CODES, t), null); assert.strictEqual(n, 1, 'binnen een minuut geen nieuwe opvraag');
  t += 30_000; await lt.tick(true, CODES, t); assert.strictEqual(n, 2, 'na een minuut wel');
  // fouten: verdubbelend wachten tot 10 minuten
  volgende = () => respons(new Uint8Array(0), { ok: false, status: 500 });
  t += 60_000; await lt.tick(true, CODES, t); assert.strictEqual(lt.stand().fouten, 1);
  const w1 = lt.stand().volgendeOp - t;
  t = lt.stand().volgendeOp; await lt.tick(true, CODES, t);
  const w2 = lt.stand().volgendeOp - t;
  assert.ok(w2 > w1 && w2 <= LIVE_TRAINS.maxInterval, 'het wachten verdubbelt');
  assert.ok(lt.vertragingen(t) !== null || t - lt.stand().laatsteOk > LIVE_TRAINS.verouderd, 'de laatste goede stand blijft tot hij te oud is');
  t += LIVE_TRAINS.verouderd + 1; assert.strictEqual(lt.vertragingen(t), null, 'te oude gegevens tellen niet meer: terug naar het rooster');
  // 429 geeft meteen de lange rust
  const lt2 = createLiveTrains({ fetchFn: async () => respons(new Uint8Array(0), { ok: false, status: 429 }), nu: () => t, opts: { jitter: () => 1 } });
  await lt2.tick(true, CODES, t);
  assert.strictEqual(lt2.stand().volgendeOp - t, LIVE_TRAINS.maxInterval);
  // een lege feed is geen fout
  const lt3 = createLiveTrains({ fetchFn: async () => respons(feed()), nu: () => t, opts: { jitter: () => 1 } });
  await lt3.tick(true, CODES, t);
  assert.strictEqual(lt3.stand().fouten, 0);
  // spreiding: standaard +-15%
  const gezien = new Set();
  for (let i = 0; i < 30; i++) {
    const l = createLiveTrains({ fetchFn: async () => respons(demo()), nu: () => t });
    await l.tick(true, CODES, t);
    const d = l.stand().volgendeOp - t;
    assert.ok(d >= LIVE_TRAINS.interval * 0.85 - 1 && d <= LIVE_TRAINS.interval * 1.15 + 1);
    gezien.add(Math.round(d / 100));
  }
  assert.ok(gezien.size > 3, 'de intervallen zijn gespreid');
  // zonder stationscodes (geen rooster) of uit: geen opvraag
  let m = 0;
  const l4 = createLiveTrains({ fetchFn: async () => { m++; return respons(demo()); }, nu: () => t });
  assert.strictEqual(l4.tick(true, new Set(), t), null); assert.strictEqual(l4.tick(false, CODES, t), null); assert.strictEqual(m, 0);
}

// --- de bedrading: de brug, de uitzetter en de terugval ---
{
  let viaBrug = 0, viaFetch = 0;
  const brug = async () => { viaBrug++; return { ok: true, status: 200, bytes: demo() }; };
  const omg = { gdeDesktop: { liveTreinen: brug }, fetch: async () => { viaFetch++; throw new Error('x'); } };
  const via = await fetchLiveTrains({ fetchFn: kiesFetch(omg), codes: CODES });
  assert.ok(via.ok); assert.strictEqual(viaBrug, 1); assert.strictEqual(viaFetch, 0, 'de brug gaat voor de directe fetch');
  let direct = 0;
  await fetchLiveTrains({ fetchFn: kiesFetch({ fetch: async () => { direct++; return respons(demo()); } }), codes: CODES });
  assert.strictEqual(direct, 1);
  assert.strictEqual(kiesFetch({}), null, 'zonder netwerk geen bron');
  assert.ok((await bridgeAsFetch(async () => ({ ok: true, status: 200, bytes: new Uint8Array([1, 2]) }))()).ok);

  let t = 9_000_000, opgevraagd = 0, gezet = 'niets';
  let inst = { liveTreinen: false };
  const f = async () => { opgevraagd++; return respons(demo()); };
  const tl = createTrainLive({ fetchFn: f, nu: () => t, instellingen: () => inst, toegestaan: () => true, zetBron: (b) => { gezet = b; } });
  assert.ok(gezet && typeof gezet.vertragingen === 'function');
  assert.strictEqual(tl.tick(CODES, t), null); assert.strictEqual(opgevraagd, 0, 'instelling uit: geen opvraag');
  inst = { liveTreinen: true };
  await tl.tick(CODES, t);
  assert.strictEqual(opgevraagd, 1); assert.ok(tl.bron.vertragingen(t));
  const tl2 = createTrainLive({ fetchFn: f, nu: () => t, instellingen: () => ({ liveTreinen: true }), toegestaan: () => false });
  assert.strictEqual(tl2.tick(CODES, t), null); assert.strictEqual(opgevraagd, 1, 'een test- of devrun vraagt nooit op');
  inst = { liveTreinen: false };
  tl.tick(CODES, t);
  assert.strictEqual(tl.bron.vertragingen(t), null, 'uitgezet tijdens het spel: terug naar het rooster');
  assert.strictEqual(tl.stand().aantal, 0);
  tl.stop(); assert.strictEqual(gezet, null);
  const zonderNet = createTrainLive({ fetchFn: null, nu: () => t, instellingen: () => ({ liveTreinen: true }) });
  assert.strictEqual(zonderNet.tick(CODES, t), null);
}

// --- de desktop-opvraag (main-proces) heeft dezelfde url en grenzen ---
{
  const cjs = createRequire(import.meta.url)('../desktop/livetrains.cjs');
  assert.strictEqual(cjs.LIVE_URL, LIVE_TRAINS.url);
  assert.strictEqual(cjs.TIMEOUT, LIVE_TRAINS.timeout);
  assert.strictEqual(cjs.MAX_BYTES, LIVE_TRAINS.maxBytes);
  let gezien;
  const bytes = demo();
  const nepFetch = async (url, o) => { gezien = { url, o }; let gedaan = false; return { ok: true, status: 200, body: { getReader: () => ({ read: async () => (gedaan ? { done: true } : ((gedaan = true), { done: false, value: bytes })) }) } }; };
  const r = await cjs.haalLiveTreinen(nepFetch);
  assert.ok(r.ok && r.bytes.length === bytes.length);
  assert.strictEqual(gezien.url, LIVE_TRAINS.url); assert.strictEqual(gezien.o.method, 'GET'); assert.strictEqual(gezien.o.credentials, 'omit'); assert.strictEqual(gezien.o.referrerPolicy, 'no-referrer');
  assert.deepStrictEqual(Object.keys(gezien.o.headers).sort(), ['Accept', 'User-Agent']);
  assert.strictEqual((await cjs.haalLiveTreinen(async () => { throw new Error('x'); })).ok, false);
  assert.strictEqual((await cjs.haalLiveTreinen(async () => ({ ok: false, status: 404 }))).ok, false);
  const groot = async () => ({ ok: true, status: 200, body: { getReader: () => ({ read: async () => ({ done: false, value: new Uint8Array(cjs.MAX_BYTES + 1) }) }) } });
  assert.strictEqual((await cjs.haalLiveTreinen(groot)).ok, false, 'te groot');
  const pkg = fs.readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8');
  assert.ok(pkg.includes('livetrains.cjs'), 'in het pakket');
  const pre = fs.readFileSync(new URL('../desktop/preload.js', import.meta.url), 'utf8');
  assert.ok(/liveTreinen: \(\) => ipcRenderer\.invoke\('gde:live-treinen'\)/.test(pre), 'de brug neemt geen argumenten aan');
  const main = fs.readFileSync(new URL('../desktop/main.js', import.meta.url), 'utf8');
  assert.ok(/ipcMain\.handle\('gde:live-treinen', \(\) => haalLiveTreinen\(\)\)/.test(main), 'de handler geeft geen argumenten door');
}

// --- de echte feed (alleen als een afgehaalde kopie is aangeleverd: GDE_TRAIN_PB=<pad>) ---
if (process.env.GDE_TRAIN_PB) {
  const m = parseTrainReports(fs.readFileSync(process.env.GDE_TRAIN_PB), new Set(['gn', 'hrn', 'asn']));
  assert.ok(m.length > 50, 'de echte feed levert meldingen voor Groningen');
  assert.ok(m.every((x) => /^\d+$/.test(x.nummer) && Number.isFinite(x.delay) && x.delay > -3600 && x.delay < 86400));
  console.log('echte feed:', m.length, 'meldingen,', m.filter((x) => x.delay >= 60).length, 'met vertraging');
}

console.log('livetrains_test: ok');
