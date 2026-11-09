// #582: een hangende tegel-fetch of een dode decoder-worker mag de wereld niet
// bevriezen. Een source die nooit antwoordt, een decoder die blijft hangen en
// een worker-dubbel dat sterft of blijft zwijgen: de vier laadslots komen vrij
// en de wachtrij loopt daarna gewoon door.
//   node scripts/tilestore_timeout_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileStore, HttpRangeSource, makeWorkerDecoder, HTTP_TIMEOUT_MS, READ_GUARD_MS, WORKER_TIMEOUT_MS, DECODE_GUARD_MS, BOOT_HTTP_FACTOR, BOOT_READ_FACTOR, BOOT_DECODE_FACTOR, BOOT_WORKER_FACTOR } from '../game/js/tilestore.js';
import { tileIndexOf, tileKey } from '../game/js/gdt.js';

let n = 0, fails = 0;
const t = async (name, f) => {
  try { await f(); n++; console.log(`ok ${name}`); }
  catch (e) { fails++; console.log(`FAIL ${name}: ${(e && e.stack) || e}`); }
};
const until = async (fn, ms = 2500, wat = 'voorwaarde') => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error(`time-out in de test zelf: ${wat}`);
    await new Promise((r) => setTimeout(r, 5));
  }
};
// de waarschuwingen van de store zijn deel van het gedrag: één per pakket, niet één per frame
const warns = [];
const echteWarn = console.warn;
console.warn = (...a) => warns.push(a.join(' '));

// een index met een rij losse tegels in één pack; welke tegel waar ligt maakt voor deze test niet uit
const [i0, j0] = tileIndexOf(0, 0);
const keys = [];
const tiles = {};
for (let k = 0; k < 8; k++) {
  const key = tileKey(i0 + 10 * k, j0);
  keys.push(key);
  tiles[key] = { i: i0 + 10 * k, j: j0, pack: 'a', off: k * 10, len: 10, raw: 1 };
}
const index = { packs: { a: { file: 'a-1.gdp', size: 80 } }, tiles };
const readOnce = async () => new Uint8Array(10);

await t('een source die nooit antwoordt: de vier laadslots komen vrij en de wachtrij loopt door', async () => {
  let hang = true;
  const signalen = [];
  const source = {
    read(file, off, len, signal) { signalen.push(signal); if (hang) return new Promise(() => {}); return readOnce(); },
    readAll: async () => new Uint8Array(),
  };
  const store = new TileStore({ source, index, decode: async () => ({ ok: true }), concurrency: 4, readMs: 30, decodeMs: 1000 });
  const uitkomsten = keys.slice(0, 6).map((key) => store.request(key).then(() => null, (e) => e));
  await until(() => store.active === 0 && store.queue.length === 0, 2500, 'de zes hangende reads');
  const fouten = await Promise.all(uitkomsten);
  assert.equal(fouten.filter((e) => e && e.timeout === true).length, 6, 'elke vastgelopen read is als time-out afgewezen');
  assert.equal(store.stats.errors, 6);
  assert.equal(store.active, 0, 'geen slot bezet');
  assert.equal(store.queue.length, 0, 'geen tegel blijft in de wachtrij staan');
  assert.ok(signalen.length >= 4, 'de source kreeg een annuleersignaal');
  assert.ok(signalen.some((s) => s && s.aborted), 'de vastgelopen read is geannuleerd');

  // dezelfde wachtrij doet daarna gewoon weer werk: de source antwoordt nu
  hang = false;
  const tile = await store.request(keys[0]);
  assert.deepEqual(tile, { ok: true });
  await until(() => store.active === 0 && store.queue.length === 0, 2500, 'slots na de geslaagde tegel');
  assert.equal(store.active, 0);
});

await t('een decoder die blijft hangen: de decode-guard maakt het slot vrij en een volgende tegel laadt wel', async () => {
  let decodeHang = true;
  const store = new TileStore({
    source: { read: readOnce, readAll: async () => new Uint8Array() }, index,
    decode: () => (decodeHang ? new Promise(() => {}) : Promise.resolve({ geladen: true })),
    concurrency: 2, readMs: 1000, decodeMs: 30,
  });
  const uitkomsten = keys.slice(0, 3).map((key) => store.request(key).then(() => null, (e) => e));
  await until(() => store.active === 0 && store.queue.length === 0, 2500, 'de drie hangende decodes');
  const fouten = await Promise.all(uitkomsten);
  assert.equal(fouten.filter((e) => e && e.timeout === true).length, 3);
  assert.equal(store.active, 0);
  assert.equal(store.queue.length, 0);
  decodeHang = false;
  assert.deepEqual(await store.request(keys[0]), { geladen: true });
});

await t('HttpRangeSource: elke read heeft een time-out, ook als de body blijft hangen', async () => {
  assert.equal(HTTP_TIMEOUT_MS, 30000);
  const origFetch = globalThis.fetch;
  try {
    const nooit = (url, opties = {}) => new Promise((resolve, reject) => {
      const s = opties.signal;
      if (!s) return;
      const fout = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      if (s.aborted) return fout();
      s.addEventListener('abort', fout, { once: true });
    });
    globalThis.fetch = nooit;
    const src = new HttpRangeSource('', { timeoutMs: 25 });
    await assert.rejects(src.read('a-1.gdp', 0, 10), (e) => e.timeout === true && /timed out after 25 ms/.test(e.message));
    await assert.rejects(src.readAll('index.json'), (e) => e.timeout === true);

    // de caller annuleert: dat is geen time-out maar een gewone afbreking
    const ctl = new AbortController();
    const p = src.read('b-1.gdp', 0, 10, ctl.signal);
    setTimeout(() => ctl.abort(), 5);
    await assert.rejects(p, (e) => !e.timeout && e.name === 'AbortError');

    // headers komen terug, de body nooit: de race dekt ook de body
    globalThis.fetch = () => Promise.resolve({ ok: true, status: 206, arrayBuffer: () => new Promise(() => {}) });
    await assert.rejects(src.read('c-1.gdp', 0, 10), (e) => e.timeout === true);
  } finally {
    globalThis.fetch = origFetch;
  }
});

await t('boot-grenzen: ruim, maar onder de bootgrens van main.js (MAP_LOAD_MS)', async () => {
  // #749: de harde grens rond loadTileWorld staat in main.js; lees hem daar, zodat deze test niet
  // achterloopt als de boot-deadline-ladder verschuift (tegelgrens < MAP_LOAD_MS < BOOT_WATCHDOG_MS).
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  const MAP_LOAD_MS = Number(/const MAP_LOAD_MS = (\d+);/.exec(main)[1]);
  assert.ok(Number.isFinite(MAP_LOAD_MS), 'main.js noemt MAP_LOAD_MS');
  assert.equal(HTTP_TIMEOUT_MS, 30000);
  assert.equal(READ_GUARD_MS, 30000);
  assert.equal(WORKER_TIMEOUT_MS, 30000);
  assert.equal(DECODE_GUARD_MS, 30000);
  for (const [naam, ms, factor] of [['http', HTTP_TIMEOUT_MS, BOOT_HTTP_FACTOR], ['read', READ_GUARD_MS, BOOT_READ_FACTOR], ['decode', DECODE_GUARD_MS, BOOT_DECODE_FACTOR], ['worker', WORKER_TIMEOUT_MS, BOOT_WORKER_FACTOR]]) {
    const boot = ms * factor;
    assert.ok(boot > ms, `${naam}: bootgrens ${boot} ms is ruimer dan de gewone ${ms} ms`);
    assert.ok(boot < MAP_LOAD_MS, `${naam}: bootgrens ${boot} ms moet onder de bootgrens ${MAP_LOAD_MS} ms blijven`);
  }
  // #749: één koude tegel kan tijdens de boot een read én een decode kosten; die twee samen horen
  // binnen de harde grens van loadTileWorld te passen, anders loopt de boot alsnog op de tegel-stap stuk.
  const samen = READ_GUARD_MS * BOOT_READ_FACTOR + DECODE_GUARD_MS * BOOT_DECODE_FACTOR;
  assert.ok(samen < MAP_LOAD_MS, `read+decode tijdens de boot (${samen} ms) past binnen loadTileWorld (${MAP_LOAD_MS} ms)`);
});

// een worker-dubbel dat meteen sterft (onerror) en nooit antwoordt
class StervendeWorker {
  static gemaakt = 0;
  static alle = [];
  constructor(url, opties) { this.url = url; this.opties = opties; this.terminated = false; StervendeWorker.gemaakt++; StervendeWorker.alle.push(this); }
  postMessage() { queueMicrotask(() => { if (!this.terminated && this.onerror) this.onerror({ message: 'nep-worker sterft' }); }); }
  terminate() { this.terminated = true; }
}
// een worker-dubbel dat blijft zwijgen zonder fout (alleen de worker-time-out redt hem)
class StilleWorker {
  static gemaakt = 0;
  static alle = [];
  constructor() { this.terminated = false; StilleWorker.gemaakt++; StilleWorker.alle.push(this); }
  postMessage() { /* nooit antwoorden */ }
  terminate() { this.terminated = true; }
}

await t('een gezonde worker: de gewone weg blijft werken (en de aside gaat mee)', async () => {
  const origWorker = globalThis.Worker;
  const gezien = [];
  class AntwoordWorker {
    constructor() { this.terminated = false; }
    postMessage(msg) {
      gezien.push({ aside: msg.aside, bytes: [...msg.bytes] });
      queueMicrotask(() => { if (this.onmessage) this.onmessage({ data: { id: msg.id, tile: { waarde: [...msg.bytes] } } }); });
    }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = AntwoordWorker;
  try {
    const decode = makeWorkerDecoder('ok-tileworker.js', 2, 'mijn-aside', { timeoutMs: 500 });
    assert.deepEqual(await decode(new Uint8Array([3, 4])), { waarde: [3, 4] });
    assert.equal(gezien.length, 1);
    assert.equal(gezien[0].aside, 'mijn-aside');
    assert.deepEqual(gezien[0].bytes, [3, 4]);
  } finally {
    globalThis.Worker = origWorker;
  }
});

await t('een dode worker: vervangen, zijn taken op de hoofdthread, en de volgende decode werkt ook', async () => {
  const origWorker = globalThis.Worker;
  globalThis.Worker = StervendeWorker;
  try {
    const fallback = async (bytes) => ({ via: 'hoofdthread', bytes: [...bytes] });
    const decode = makeWorkerDecoder('nep-tileworker.js', 1, null, { timeoutMs: 200, fallback });
    assert.ok(decode, 'de decoder bestaat');
    assert.deepEqual(await decode(new Uint8Array([1, 2, 3])), { via: 'hoofdthread', bytes: [1, 2, 3] });
    assert.deepEqual(await decode(new Uint8Array([4])), { via: 'hoofdthread', bytes: [4] });
    assert.ok(StervendeWorker.gemaakt >= 2, 'de dode worker is vervangen door een nieuwe');
    assert.ok(StervendeWorker.alle.some((w) => w.terminated), 'de dode worker is opgeruimd');
  } finally {
    globalThis.Worker = origWorker;
  }
});

await t('een stille worker: na de worker-time-out naar de hoofdthread, twee parallelle decodes blijven niet hangen', async () => {
  const origWorker = globalThis.Worker;
  globalThis.Worker = StilleWorker;
  try {
    const fallback = async () => ({ via: 'hoofdthread' });
    const decode = makeWorkerDecoder('stil-tileworker.js', 2, null, { timeoutMs: 25, fallback });
    const [a, b] = await Promise.all([decode(new Uint8Array([1])), decode(new Uint8Array([2]))]);
    assert.equal(a.via, 'hoofdthread');
    assert.equal(b.via, 'hoofdthread');
    assert.ok(StilleWorker.alle.some((w) => w.terminated), 'de stille worker is beëindigd');
  } finally {
    globalThis.Worker = origWorker;
  }
});

await t('TileStore met de stervende worker-decoder: vier tegels, twee slots, de wachtrij loopt door', async () => {
  const origWorker = globalThis.Worker;
  globalThis.Worker = StervendeWorker;
  try {
    const vorige = StervendeWorker.gemaakt;
    const decode = makeWorkerDecoder('nep-tileworker.js', 2, null, { timeoutMs: 200, fallback: async () => ({ van: 'hoofdthread' }) });
    const store = new TileStore({
      source: { read: readOnce, readAll: async () => new Uint8Array() }, index, decode,
      concurrency: 2, readMs: 1000, decodeMs: 500,
    });
    const tegels = await Promise.all(keys.slice(0, 4).map((key) => store.request(key)));
    assert.equal(tegels.length, 4);
    assert.ok(tegels.every((x) => x && x.van === 'hoofdthread'), 'alle vier via de hoofdthread gedecodeerd');
    await until(() => store.active === 0 && store.queue.length === 0, 2500, 'slots na de vier tegels');
    assert.equal(store.active, 0, 'geen slot bezet');
    assert.equal(store.queue.length, 0);
    assert.ok(StervendeWorker.gemaakt > vorige, 'de pool heeft nieuwe workers gemaakt');
  } finally {
    globalThis.Worker = origWorker;
  }
});

await t('een worker die niet vervangen kan worden: meteen naar de hoofdthread', async () => {
  const origWorker = globalThis.Worker;
  let gemaakt = 0;
  class EenmaligeWorker {
    constructor() {
      if (gemaakt++) throw new Error('geen nieuwe worker');
      this.terminated = false;
    }
    postMessage() { queueMicrotask(() => { if (!this.terminated && this.onerror) this.onerror({ message: 'nep-worker sterft' }); }); }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = EenmaligeWorker;
  try {
    const decode = makeWorkerDecoder('eenmalig-tileworker.js', 1, null, { timeoutMs: 200, fallback: async () => ({ via: 'hoofdthread' }) });
    assert.ok(decode, 'de eerste worker bestaat nog');
    assert.deepEqual(await decode(new Uint8Array([7])), { via: 'hoofdthread' });
    assert.deepEqual(await decode(new Uint8Array([8])), { via: 'hoofdthread' }, 'zonder levende worker gaat het nog steeds goed');
    assert.ok(warns.some((w) => /decoderen gebeurt nu op de hoofdthread/.test(w)), warns.join(' | '));
  } finally {
    globalThis.Worker = origWorker;
  }
});

// #799: de bootgrens is echte gedraging, geen constante. Tijdens de boot (body zonder
// game-started) verdubbelt de HTTP-grens; een ByteSource die nooit antwoordt valt dan na
// BOOT_HTTP_FACTOR * timeoutMs af in plaats van eeuwig te wachten, en de gewone grens blijft
// daarna gewoon staan. De bron is een fetch die nooit antwoordt (geen netwerk).
await t('boot: een ByteSource die nooit antwoordt valt binnen de verdubbelde bootgrens af', async () => {
  const origFetch = globalThis.fetch;
  const origDoc = globalThis.document;
  const nooit = () => new Promise(() => {});
  globalThis.fetch = nooit;
  try {
    globalThis.document = { body: { classList: { contains: (c) => c !== 'game-started' } } };
    const bootSrc = new HttpRangeSource('', { timeoutMs: 30 });
    let bootFout = null;
    const t0 = Date.now();
    try { await bootSrc.read('a-1.gdp', 0, 10); } catch (e) { bootFout = e; }
    const bootDuur = Date.now() - t0;
    assert.ok(bootFout && bootFout.timeout === true, 'tijdens de boot: time-out, geen hang');
    assert.match(bootFout.message, new RegExp('after ' + (30 * BOOT_HTTP_FACTOR) + ' ms'), 'de bootgrens is de verdubbelde grens');
    assert.ok(bootDuur >= 40 && bootDuur < 2000, `de bootgrens is begrensd (${bootDuur} ms)`);

    // na game-started geldt de gewone grens weer
    globalThis.document = { body: { classList: { contains: (c) => c === 'game-started' } } };
    const normSrc = new HttpRangeSource('', { timeoutMs: 30 });
    let normFout = null;
    try { await normSrc.read('a-1.gdp', 0, 10); } catch (e) { normFout = e; }
    assert.ok(normFout && normFout.timeout === true, 'na de boot: ook een begrensde time-out');
    assert.match(normFout.message, /after 30 ms/, 'de gewone grens is de basisgrens');
  } finally {
    globalThis.fetch = origFetch;
    if (origDoc === undefined) delete globalThis.document; else globalThis.document = origDoc;
  }
});

await t('waarschuwingen: een time-out wordt gemeld, niet stil ingeslikt', async () => {
  assert.ok(warns.some((w) => /timed out/.test(w)), warns.join(' | '));
});

console.warn = echteWarn;
console.log(`tilestore_timeout_test: ${n}/${n + fails} ok`);
if (fails) process.exit(1);
