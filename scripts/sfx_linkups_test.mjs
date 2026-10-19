// Sound design linkups (issue #173): the table of game events -> effects.
//   node scripts/sfx_linkups_test.mjs
// Every new effect has exactly one source, the rules fire once per change
// (not every frame), and the sources named in the table really push them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINK_RULES, SELF_PUSHED, createLinkups } from '../game/js/sfx/linkups.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- the table ---------------------------------------------------------------
const ids = new Set();
for (const r of LINK_RULES) {
  ok(!ids.has(r.id), `rule ${r.id}: unique id`);
  ids.add(r.id);
  ok(FX_INFO[r.fx], `rule ${r.id}: effect ${r.fx} exists`);
  ok(typeof r.source === 'string' && r.source.length > 10, `rule ${r.id}: names its source`);
}
for (const s of SELF_PUSHED) ok(FX_INFO[s.fx], `self-pushed ${s.fx} exists`);
const linked = new Set([...LINK_RULES.flatMap((r) => [r.fx, ...(r.also || [])]), ...SELF_PUSHED.map((s) => s.fx)]);
// carbid and explosion are played by audio.js for their own events; door, fuse and
// the splash come from events that already exist
// siren_pass, car_pass and tyre_screech: played by cutscenes via cutaudio.js (scripts/cutscene_audio_test.mjs)
const OTHER = new Set(['carbid_boom_0', 'carbid_boom_1', 'carbid_boom_2', 'carbid_fuse', 'explosion_boom_0', 'explosion_boom_1', 'siren_pass', 'car_pass', 'tyre_screech']);
// still only in ?sfxtest: no game event for a wooden building door yet (the door_open event is the car/secret door of playDoor)
const PENDING = new Set();
// played by audio.js for door_open/door_close events that carry wood: true (geheimen.js, the Martinitoren door)
OTHER.add('door_wood_open'); OTHER.add('door_wood_close');
for (const name of Object.keys(FX_INFO)) ok(linked.has(name) || OTHER.has(name) || PENDING.has(name), `${name}: has a source`);
// no double playback: an effect is pushed by one place only
for (const s of SELF_PUSHED) ok(!LINK_RULES.some((r) => r.fx === s.fx), `${s.fx}: not both linked and self-pushed`);
ok(new Set(LINK_RULES.map((r) => r.fx)).size === LINK_RULES.length, 'one rule per effect');
ok(/wood: true/.test(src('geheimen.js')) && /e.wood/.test(src('audio.js')), 'wooden door: geheimen.js asks, audio.js plays door_wood_*');
const pushers = { shop_bell: ['shops.js'], kermis_ding: ['kermis.js'] };
for (const [fx, files] of Object.entries(pushers)) for (const f of files) ok(new RegExp(`name: '${fx}'`).test(src(f)), `${f} pushes ${fx}`);
for (const fx of ['shop_bell', 'kermis_ding']) {
  const count = fs.readdirSync(JS).filter((f) => f.endsWith('.js')).reduce((a, f) => a + (src(f).match(new RegExp(`['"]${fx}['"]`, 'g')) || []).length, 0);
  ok(count >= 1, `${fx} named somewhere`);
}
const audio = src('audio.js');
ok(/case 'fx': playFx\(/.test(audio), "audio.js plays 'fx' events");
ok(/FX_MIN_GAP/.test(audio), 'audio.js has the per-effect gap');
ok(/setSfxLinks\(/.test(src('main.js')), 'main.js hands the linkups their sources');
const lsrc = src('sfx/linkups.js');
ok(!/AudioContext|createGain|createBufferSource|setTimeout|setInterval|requestAnimationFrame/.test(lsrc.replace(/\/\/.*$/gm, '')), 'linkups: no audio nodes, no timers (nothing to leak)');

// -- behaviour on fake worlds ----------------------------------------------
const world = (t = 0, p = {}) => ({ time: t, paused: false, player: { x: 0, y: 0, swimming: false, ...p } });
const run = (L, w, env) => L.step(w, env).map((e) => ({ ...e }));

// bridges: one clunk per lift and per lock, a horn when a boat asks
{
  const boat = { x: 40, y: 5 };
  const b = { x: 10, y: 10, state: 'closed', boats: new Map() };
  const env = { bridges: () => [b], trains: () => [], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups();
  const w = world();
  ok(run(L, w, env).length === 0, 'bridge: nothing on the first frame');
  b.state = 'warn'; b.boats.set(boat, 1);
  let out = run(L, w, env);
  ok(out.length === 1 && out[0].name === 'ship_horn' && out[0].x === 40, 'bridge: boat asks -> one ship horn at the boat');
  ok(run(L, w, env).length === 0, 'bridge: horn not repeated while the state holds');
  for (const s of ['booms', 'clear']) { b.state = s; ok(run(L, w, env).length === 0, `bridge: ${s} is silent`); }
  b.state = 'opening'; out = run(L, w, env);
  ok(out.length === 1 && out[0].name === 'bridge_clunk', 'bridge: opening -> one clunk');
  for (let i = 0; i < 100; i++) ok(run(L, w, env).length === 0, 'bridge: held state is silent') || 0;
  b.state = 'open'; ok(run(L, w, env).length === 0, 'bridge: open is silent');
  b.state = 'closing'; ok(run(L, w, env).length === 0, 'bridge: closing is silent');
  b.state = 'up'; out = run(L, w, env);
  ok(out.length === 1 && out[0].name === 'bridge_clunk' && out[0].gain === 0.8, 'bridge: deck locked -> one softer clunk');
  b.state = 'closed'; ok(run(L, w, env).length === 0, 'bridge: closed is silent');
  // a bridge that appears mid-state (streamed in) does not clunk
  const b2 = { x: 0, y: 0, state: 'opening', boats: new Map() };
  const L2 = createLinkups();
  env.bridges = () => [b2];
  ok(run(L2, w, env).length === 0, 'bridge: appearing mid-lift is silent');
}

// trains: one pass per approach, a squeal on stopping, none for a parked train
{
  const t = { cars: [{ x: 300, y: 0 }], pv: 30 };
  const env = { bridges: () => [], trains: () => [t], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups();
  const w = world(0);
  run(L, w, env);
  let passes = 0, squeals = 0;
  for (let i = 1; i <= 400; i++) {
    w.time = i * 0.1;
    t.cars[0].x = 300 - 30 * w.time;
    for (const e of run(L, w, env)) { if (e.name === 'train_pass') passes++; if (e.name === 'rail_squeal') squeals++; }
  }
  ok(passes === 1, 'train: one pass for one approach', String(passes));
  ok(squeals === 0, 'train: no squeal while it keeps going');
  t.pv = 0;
  for (let i = 0; i < 20; i++) { w.time += 0.1; for (const e of run(L, w, env)) if (e.name === 'rail_squeal') squeals++; }
  ok(squeals === 1, 'train: one squeal when it stops', String(squeals));
  const parked = { cars: [{ x: 50, y: 0 }], pv: 0 };
  env.trains = () => [parked];
  const L3 = createLinkups();
  let any = 0;
  for (let i = 0; i < 100; i++) { w.time = 50 + i * 0.1; any += run(L3, w, env).length; }
  ok(any === 0, 'train: a parked train is silent');
  // moving away: no pass
  const away = { cars: [{ x: 20, y: 0 }], pv: 20 };
  env.trains = () => [away];
  const L4 = createLinkups();
  any = 0;
  for (let i = 0; i < 50; i++) { w.time = 100 + i * 0.1; away.cars[0].x = 20 + 20 * i * 0.1; any += run(L4, w, env).length; }
  ok(any === 0, 'train: leaving gives no pass');
}

// water: one big splash on entering, none while swimming
{
  const env = { bridges: () => [], trains: () => [], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups();
  const w = world(0, { swimming: false });
  run(L, w, env);
  w.player.swimming = true;
  const first = run(L, w, env).filter((e) => e.name === 'splash_big');
  let more = 0;
  for (let i = 0; i < 60; i++) more += run(L, w, env).length;
  ok(first.length === 1 && more === 0, 'water: one splash on entering, silence while swimming');
  w.player.swimming = false; run(L, w, env); w.player.swimming = true;
  ok(run(L, w, env).filter((e) => e.name === 'splash_big').length === 1, 'water: again on the next dive');
  const s = createLinkups();
  ok(s.step(world(0, { swimming: true }), env).length === 0, 'water: starting in the water is silent');
}

// vehicle parts: tear-off, bonnet slam, bus door hiss; each once per change, far away is silent
{
  const car = { x: 10, y: 0, doors: { loose: {}, open: {} } };
  const bus = { x: -10, y: 0, isBus: true, doors: { loose: {}, open: {} } };
  const far = { x: 900, y: 0, doors: { loose: {}, open: {} } };
  const env = { bridges: () => [], trains: () => [], vehicles: () => [car, bus, far], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups(), w = world();
  run(L, w, env);
  car.doors.loose.vl = true; far.doors.loose.vl = true;
  let r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'part_rip', 'parts: one tear-off for the near car, none for the far one');
  ok(run(L, w, env).length === 0, 'parts: silent while nothing changes');
  car.doors.open.kap = 1; ok(run(L, w, env).length === 0, 'parts: opening the bonnet is silent');
  car.doors.open.kap = 0; r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'hood_thump', 'parts: closing the bonnet bangs once');
  bus.doors.open.d1a = 1; bus.doors.open.d1b = 1; r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'bus_door_hiss', 'parts: a bus door pair hisses once');
  bus.doors.open.d1a = 0; bus.doors.open.d1b = 0; r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'bus_door_hiss', 'parts: and again when it shuts');
  ok(createLinkups().step(world(), { ...env, vehicles: undefined }).length === 0, 'parts: no vehicle source, no crash');
}

// locks: the gate groans when it starts to move, the water runs while levelling; one event per change
{
  const lock = { x: 5, y: 5, state: 'ready' };
  const env = { bridges: () => [], trains: () => [], locks: () => [lock], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups(), w = world();
  run(L, w, env);
  lock.state = 'closing'; let r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'sluis_poort', 'lock: gate closing groans');
  ok(run(L, w, env).length === 0, 'lock: silent while the gate moves');
  lock.state = 'levelling'; r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'sluis_stroom', 'lock: water runs while levelling');
  lock.state = 'opening'; r = run(L, w, env);
  ok(r.length === 1 && r[0].name === 'sluis_poort', 'lock: other gate opening groans');
  lock.state = 'ready'; ok(run(L, w, env).length === 0, 'lock: ready is silent');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
