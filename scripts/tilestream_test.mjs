// Tegels zonder uitbarsting op de hoofdthread (#1052): de prioriteit van de rijen
// (addPriority), het stukje werk per frame van een achtergrondvenster (sliceFor,
// drainSliced), de poort met time-out (whenReady) en de volgorde en het annuleren
// van aanvragen in de TileStore (priorityOf). Puur: geen browser, geen three.js.
//   node scripts/tilestream_test.mjs
import {
  BACKGROUND_PRIORITY, BG_SLICE_MS, BG_DRAIN_MAX_MS, BG_HOLD_MAX_MS, JUMP_BUDGET_MS, addPriority, sliceFor, drainSliced, joinQueues, holdBackground, backgroundHeld, setHoldProbe, whenReady,
} from '../game/js/tilestream.js';
import { FrameQueue, TileStore, MemorySource } from '../game/js/tilestore.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// ---- 1. de prioriteit van de rijen van een tegel ------------------------
ok(addPriority(-1000) < addPriority(0) && addPriority(0) < addPriority(300) && addPriority(300) < addPriority(2500), 'dichterbij eerst');
ok(addPriority(2500) < addPriority(BACKGROUND_PRIORITY), 'een achtergrondvenster komt na alles wat de prefetch wil');
ok(addPriority(-1e9) >= 1 && addPriority(1e9) < 2, 'altijd tussen 1 en 2: een drop (0) gaat voor', `${addPriority(-1e9)} ${addPriority(1e9)}`);
ok(addPriority(NaN) === addPriority(0) && addPriority(undefined) === addPriority(0), 'onbekend telt als 0');

// de wachtrij werkt op die volgorde, drops eerst, en binnen gelijke prioriteit op aankomst
{
  const q = new FrameQueue(), order = [];
  q.add(() => order.push('ver'), addPriority(2000), 'add:ver');
  q.add(() => order.push('bg'), addPriority(BACKGROUND_PRIORITY), 'add:bg');
  q.add(() => order.push('dichtbij'), addPriority(50), 'add:dichtbij');
  q.add(() => order.push('drop'), 0, 'drop:x');
  q.add(() => order.push('dichtbij2'), addPriority(50), 'add:dichtbij2');
  q.run(1e9);
  ok(order.join() === 'drop,dichtbij,dichtbij2,ver,bg', 'volgorde in de wachtrij', order.join());
}

// ---- 2. het stukje werk per frame --------------------------------------
ok(sliceFor({ urgent: true, slice: 6 }) === 0, 'een dringend venster werkt alles in één keer');
ok(sliceFor({}) === BG_SLICE_MS && BG_SLICE_MS > 0 && BG_SLICE_MS <= 4, 'zonder eigen stuk: het achtergrondstuk');
ok(sliceFor({ slice: 6 }) === 6, 'een eigen stuk blijft staan');

// drainSliced: elk frame hooguit het budget (op een neppe klok), de rest volgt de volgende frame
{
  let t = 0;
  const now = () => t;
  const q = new FrameQueue();
  let done = 0;
  for (let i = 0; i < 40; i++) q.add(() => { t += 1; done++; }, 1, `add:${i}`); // elk item 1 ms
  let frames = 0;
  const calls = [];
  const nextFrame = async () => { frames++; calls.push(done); t += 16; };
  const f = await drainSliced(q, { sliceMs: 3, nextFrame, now, maxMs: 1e9 });
  ok(done === 40 && q.items.length === 0, 'alles wordt gewerkt', String(done));
  ok(f >= 13 && f <= 14, 'drie items per frame: 40 items in 14 frames', String(f));
  const per = calls.map((c, i) => c - (calls[i - 1] || 0));
  ok(Math.max(...per) <= 3, 'nooit meer dan het budget per frame', per.join());
}

// een wachtrij die blijft vollopen: het venster wacht alleen op zijn eigen tegels (until), nooit op de hele rij,
// en na maxMs neemt het grotere stukken (3x), nooit alles in één keer
{
  let t = 0;
  const now = () => t;
  const q = new FrameQueue();
  let ran = 0, eigenKlaar = false, maxPerCall = 0;
  const vul = (k) => q.add(() => { ran++; t += 1; if (ran === 30) eigenKlaar = true; vul(k + 1); }, 1, `add:${k}`); // blijft zich vervangen: nooit leeg
  vul(0);
  const f = await drainSliced(q, { sliceMs: 2, nextFrame: async () => { t += 16; }, now, maxMs: 1e9, until: () => eigenKlaar });
  ok(eigenKlaar && q.items.length > 0, 'een venster stopt als zijn eigen tegels erin zijn, ook als de rij nooit leeg raakt', `ran ${ran}`);
  ok(f <= 16, 'en niet na honderden frames', String(f));
  // na maxMs: bredere stukken, maar nog steeds een stuk (geen run(1e9))
  t = 0; ran = 0; eigenKlaar = false;
  const q2 = new FrameQueue();
  const eerste = q2.run.bind(q2);
  q2.run = (ms, nw) => { maxPerCall = Math.max(maxPerCall, ms); return eerste(ms, nw); };
  const vul2 = (k) => q2.add(() => { ran++; t += 1; if (ran === 200) eigenKlaar = true; vul2(k + 1); }, 1, `add:${k}`);
  vul2(0);
  await drainSliced(q2, { sliceMs: 2, nextFrame: async () => { t += 100; }, now, maxMs: 500, until: () => eigenKlaar });
  ok(maxPerCall === 6, 'na de time-out 3x het stuk, geen alles-in-één-keer', String(maxPerCall));
  ok(BG_DRAIN_MAX_MS >= 5000, 'een redelijke bovengrens voor het wachten');
}

// een vasthouding (een film of de benchmark): er wordt niets gewerkt zolang hij duurt, de gehouden tijd telt niet mee
{
  let t = 0, frame = 0;
  const q = new FrameQueue();
  let ran = 0;
  for (let i = 0; i < 6; i++) q.add(() => { ran++; t += 1; }, 1, `add:${i}`);
  const f = await drainSliced(q, { sliceMs: 3, nextFrame: async () => { frame++; t += 16; }, now: () => t, maxMs: 40, hold: () => frame < 10 });
  ok(ran === 6 && q.items.length === 0, 'na de vasthouding is alles gewerkt', String(ran));
  ok(f <= 3, 'in de vasthouding geen werk (geen frames geteld)', String(f));
  ok(!backgroundHeld(), 'zonder vasthouding: niet vast');
  holdBackground(true); holdBackground(true);
  ok(backgroundHeld(), 'een vasthouding houdt vast');
  holdBackground(false);
  ok(backgroundHeld(), 'geneste vasthoudingen: pas los als beide los zijn');
  holdBackground(false); holdBackground(false);
  ok(!backgroundHeld(), 'los, en nooit onder nul');
  // de spelsteun: een film of cutscene meldt zich met een probe
  let film = false;
  setHoldProbe(() => film);
  ok(!backgroundHeld(), 'de probe zegt: geen film');
  film = true;
  ok(backgroundHeld(), 'de probe zegt: een film speelt, de achtergrond wacht');
  setHoldProbe(() => { throw new Error('stuk'); });
  ok(!backgroundHeld(), 'een kapotte probe houdt nooit vast');
  setHoldProbe(null);
  ok(!backgroundHeld(), 'zonder probe: niet vast');
}

// een vasthouding die nooit eindigt houdt een venster niet voor altijd vast
{
  let t = 0, frames = 0;
  const q = new FrameQueue();
  q.add(() => { t += 1; }, 1, 'add:x');
  await drainSliced(q, { sliceMs: 3, nextFrame: async () => { frames++; t += 1000; if (frames > 1000) throw new Error('hangt'); }, now: () => t, maxMs: 1e9, hold: () => true });
  ok(q.items.length === 0 && frames <= BG_HOLD_MAX_MS / 1000 + 3, 'na BG_HOLD_MAX_MS gaat het werk toch door', String(frames));
}

// twee wachtrijen als één: de stroom eerst, de achtergrond krijgt wat van het stuk overblijft
{
  let t = 0;
  const now = () => t;
  const a = new FrameQueue(), b = new FrameQueue(), order = [];
  a.add(() => { order.push('a1'); t += 2; }, 1, 'add:a1');
  a.add(() => { order.push('a2'); t += 2; }, 1, 'add:a2');
  b.add(() => { order.push('b1'); t += 1; }, 1, 'add:b1');
  const j = joinQueues(a, b, now);
  ok(j.items.length === 3, 'de lengte telt beide wachtrijen');
  j.run(3);
  ok(order.join() === 'a1,a2', 'een volle stroom neemt het stuk (de achtergrond wacht)', order.join());
  j.run(3);
  ok(order.join() === 'a1,a2,b1' && j.items.length === 0, 'daarna de achtergrond', order.join());
  ok(joinQueues(a, null, now).items.length === 0, 'zonder tweede wachtrij');
}

// een lege wachtrij: geen frame nodig
{
  const f = await drainSliced(new FrameQueue(), { sliceMs: 3, nextFrame: async () => { throw new Error('geen frame nodig'); }, now: () => 0 });
  ok(f === 0, 'lege wachtrij: 0 frames');
}

// ---- 3. de poort met time-out ------------------------------------------
{
  let t = 0, missing = ['a', 'b'];
  const store = { missing: (keys) => keys.filter((k) => missing.includes(k)) };
  const wait = async () => { t += 100; if (t >= 300) missing = []; };
  const ready = await whenReady(store, ['a', 'b'], { budgetMs: 1500, now: () => t, wait });
  ok(ready === true && t === 300, 'poort gaat open zodra de tegels er zijn', `t ${t}`);
}
{
  let t = 0;
  const store = { missing: (keys) => keys }; // een tegel die nooit komt
  const ready = await whenReady(store, ['a'], { budgetMs: JUMP_BUDGET_MS, now: () => t, wait: async () => { t += 50; } });
  ok(ready === false, 'een tegel die nooit komt: de poort geeft op (false)');
  ok(t >= JUMP_BUDGET_MS && t < JUMP_BUDGET_MS + 100, 'en wel op tijd: geen deadlock', `t ${t}`);
}
ok(await whenReady(null, ['a'], { wait: async () => {} }) === true, 'zonder store: meteen open');
ok(await whenReady({ missing: () => [] }, [], { wait: async () => { throw new Error('geen wacht'); } }) === true, 'niets nodig: meteen open');

// ---- 4. de store: volgorde van aanvragen, annuleren, priorityOf --------
{
  const meta = (i, j) => ({ pack: 'p', off: 0, len: 1, raw: 100, i, j });
  const index = { tiles: {}, packs: { p: { file: 'p.bin' } } };
  const keys = [];
  for (let i = 0; i < 6; i++) { const k = `k${i}`; keys.push(k); index.tiles[k] = meta(i, 0); }
  const loaded = [];
  let release = null;
  const gate = new Promise((r) => { release = r; });
  const store = new TileStore({
    source: new MemorySource({ 'p.bin': new Uint8Array(8) }),
    index,
    decode: async (bytes, m) => { await gate; return { i: m.i, j: m.j, sections: [] }; },
    concurrency: 1,
    now: () => 0,
  });
  store.on('tile', (tile, key) => loaded.push(key));
  // k0 gaat meteen in de lading (concurrency 1); de rest wacht in de rij op prioriteit
  const ps = [];
  ps.push(store.request('k0', { priority: 10 }));
  ps.push(store.request('k1', { priority: BACKGROUND_PRIORITY }));
  ps.push(store.request('k2', { priority: 300 }));
  ps.push(store.request('k3', { priority: -1000 }));
  const cancelMe = store.request('k4', { priority: 50, token: 'weg' });
  cancelMe.catch(() => {});
  ok(store.priorityOf('k1') === BACKGROUND_PRIORITY && store.priorityOf('k3') === -1000, 'priorityOf geeft de aanvraagwaarde');
  ok(store.priorityOf('onbekend') === 0, 'priorityOf: onbekende tegel is 0');
  store.cancel('weg');
  ok(!store.entries.has('k4'), 'een geannuleerde aanvraag valt uit de rij');
  release();
  await Promise.all(ps);
  ok(loaded.join() === 'k0,k3,k2,k1', 'dichtbij eerst, achtergrond laatst, geannuleerde weg', loaded.join());
}

// ---- 5. determinisme: dezelfde aanvragen geven dezelfde tegels en dezelfde volgorde
{
  const run = async () => {
    const index = { tiles: {}, packs: { p: { file: 'p.bin' } } };
    for (let i = 0; i < 5; i++) index.tiles[`k${i}`] = { pack: 'p', off: 0, len: 1, raw: 10, i, j: 0 };
    const order = [];
    const st = new TileStore({ source: new MemorySource({ 'p.bin': new Uint8Array(4) }), index, decode: async (b, m) => ({ i: m.i, j: m.j, sections: [] }), concurrency: 1, now: () => 0 });
    st.on('tile', (t, k) => order.push(k));
    await Promise.all(['k4', 'k2', 'k0', 'k3', 'k1'].map((k, x) => st.request(k, { priority: [40, 20, 0, 30, 10][x] })));
    return order.join();
  };
  const a = await run(), b = await run();
  ok(a === b, 'dezelfde aanvragen: dezelfde volgorde (de wereld van de host blijft leidend; een gast laadt lokaal)', `${a} / ${b}`);
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
