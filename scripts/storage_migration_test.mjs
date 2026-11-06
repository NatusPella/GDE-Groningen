// The gte-* -> gde-* rename (0.29) loses nothing:
//   node scripts/storage_migration_test.mjs
// - game/js/storagekeys.js: old keys are copied, a newer new key is never
//   overwritten, a second run changes nothing, a full storage still gets the
//   save across, and every key the modules use is in KEYS. (KEYS here is BASE_KEYS: the new
//   story arc's own keys, the same with '-nieuw', never receive a copy of an old save.)
// - desktop/userdata.js: the old "GTE VI" userData folder is copied once,
//   left untouched, and a failed copy falls back to the old folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { slotKey, slotRecoveryKey } from '../game/js/storagekeys.js';
import * as Slots from '../game/js/saveslots.js';
import { migrateStorage, removeLegacyKeys, KEYS as ARC_KEYS, BASE_KEYS as KEYS, SESSION_KEYS, LEGACY_KEYS, LEGACY_CACHE_KEYS, MIGRATED_KEY } from '../game/js/storagekeys.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chooseUserData, MARKER } = require('../desktop/userdata.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

class MemStorage {
  constructor(init = {}, quota = Infinity) { this.m = new Map(Object.entries(init)); this.quota = quota; }
  size() { let s = 0; for (const [k, v] of this.m) s += k.length + v.length; return s; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    v = String(v);
    const before = this.m.get(k);
    this.m.set(k, v);
    if (this.size() > this.quota) {
      if (before === undefined) this.m.delete(k); else this.m.set(k, before);
      const e = new Error('full'); e.name = 'QuotaExceededError'; throw e;
    }
  }
  removeItem(k) { this.m.delete(k); }
}

const SAVE = JSON.stringify({ v: 9, money: 1234, story: 'h7' });

// 1. a 0.28 player: every old key is copied, the old ones stay
{
  const init = {};
  for (const [from] of LEGACY_KEYS) init[from] = from === 'gte-save-v1' ? SAVE : `value of ${from}`;
  init['gte-snapshots'] = 'big cache';
  init['gte-dev:gte-save-v1'] = 'dev save';
  const ls = new MemStorage(init);
  const ss = new MemStorage({ 'gte-benchmark-pending': '1' });
  const r = migrateStorage(ls, ss);
  ok(ls.getItem(KEYS.save) === SAVE, 'save copied');
  for (const [from, to] of LEGACY_KEYS) {
    ok(ls.getItem(to) === init[from], `copied ${from}`);
    ok(ls.getItem(from) === init[from], `old ${from} kept`);
  }
  ok(ls.getItem('gde-dev:gde-save-v1') === 'dev save', 'dev key copied');
  ok(ls.getItem(KEYS.snapshots) === null, 'render cache not copied');
  ok(ls.getItem(MIGRATED_KEY) === '1', 'marked done');
  ok(ss.getItem(SESSION_KEYS.benchmarkPending) === '1' && ss.getItem('gte-benchmark-pending') === null, 'session key moved');
  ok(r.copied.length === LEGACY_KEYS.length + 1 && !r.failed.length, 'report', JSON.stringify(r));

  // 2. idempotent: a second boot does nothing, also after the player saved
  ls.setItem(KEYS.save, 'newer');
  ls.setItem('gte-save-v1', 'older, written by a downgraded 0.28');
  const before = JSON.stringify([...ls.m]);
  const r2 = migrateStorage(ls, null);
  ok(r2.skipped && JSON.stringify([...ls.m]) === before, 'second run changes nothing');
}

// 2b. #590: after a downgraded 0.28 build wrote a newer save under the old key, it still comes
// across (a later savedAt wins); an older one or a key without a timestamp never does, and a
// deleted new key is not revived.
{
  const cur = JSON.stringify({ v: 9, savedAt: 5000, money: 100 });
  const newer = JSON.stringify({ v: 8, savedAt: 9000, money: 50 });
  const older = JSON.stringify({ v: 8, savedAt: 1000, money: 10 });
  const ls = new MemStorage({ [MIGRATED_KEY]: '1', 'gte-save-v1': newer, [KEYS.save]: cur });
  const r = migrateStorage(ls, null);
  ok(r.skipped && r.copied.includes(KEYS.save) && ls.getItem(KEYS.save) === newer, 'a newer old-key save is copied after the marker', JSON.stringify(r));
  const same = new MemStorage({ [MIGRATED_KEY]: '1', 'gte-save-v1': older, [KEYS.save]: cur });
  const r2 = migrateStorage(same, null);
  ok(!r2.copied.length && same.getItem(KEYS.save) === cur, 'an older old-key save never wins');
  const gone = new MemStorage({ [MIGRATED_KEY]: '1', 'gte-save-v1': newer });
  ok(!migrateStorage(gone, null).copied.length && gone.getItem(KEYS.save) === null, 'a deleted new key is not revived');
  const settings = new MemStorage({ [MIGRATED_KEY]: '1', 'gte-settings': 'old', [KEYS.settings]: 'new' });
  ok(!migrateStorage(settings, null).copied.length && settings.getItem(KEYS.settings) === 'new', 'keys without a timestamp are left alone');
}

// 3. a newer new key is never overwritten (marker missing, e.g. it ran out of space before)
{
  const ls = new MemStorage({ 'gte-save-v1': 'old', [KEYS.save]: 'new', 'gte-settings': 'old settings' });
  const r = migrateStorage(ls, null);
  ok(ls.getItem(KEYS.save) === 'new', 'newer save kept');
  ok(ls.getItem(KEYS.settings) === 'old settings', 'missing key still copied');
  ok(r.kept.includes(KEYS.save), 'kept reported');
}

// 4. a fresh player: nothing to copy, just the marker
{
  const ls = new MemStorage();
  const r = migrateStorage(ls, null);
  ok(!r.copied.length && ls.getItem(MIGRATED_KEY) === '1' && ls.m.size === 1, 'fresh install');
}

// 5. storage nearly full: the save gets across (old twins of copied keys and caches make room)
{
  const big = 'x'.repeat(3000);
  const init = { 'gte-save-v1': big, 'gte-settings': 's', 'gte-fog': 'f'.repeat(2000), 'gte6.placeshots': 'p'.repeat(2500) };
  let used = 0; for (const [k, v] of Object.entries(init)) used += k.length + v.length;
  const ls = new MemStorage(init, used + 200);
  const r = migrateStorage(ls, null);
  ok(ls.getItem(KEYS.save) === big, 'save copied when full', JSON.stringify(r));
  ok(ls.getItem(KEYS.fog) === init['gte-fog'] || ls.getItem('gte-fog') === init['gte-fog'], 'fog not lost when full', JSON.stringify(r));
  ok(ls.getItem(KEYS.settings) === 's', 'settings copied when full');
}

// 6. storage that refuses every new write: marker stays unset, old save kept, retried next boot
{
  const ls = new MemStorage({ 'gte-save-v1': 'old save' });
  const set = ls.setItem.bind(ls);
  ls.setItem = (k, v) => { if (k.startsWith('gde-')) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } set(k, v); };
  const r = migrateStorage(ls, null);
  ok(r.failed.includes(KEYS.save) && ls.getItem(MIGRATED_KEY) === null && ls.getItem('gte-save-v1') === 'old save', 'hopeless case keeps the old save and retries', JSON.stringify(r));
}

// 7. storage that throws (blocked): no crash
{
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  let threw = false;
  try { migrateStorage(blocked, blocked); } catch (e) { threw = true; }
  ok(!threw, 'blocked storage does not throw');
}

// 8. removeLegacyKeys (for a later release) leaves the new keys alone
{
  const ls = new MemStorage({ 'gte-save-v1': 'a', [KEYS.save]: 'b', 'gte-dev:gte-settings': 'c', 'gte6.placeshots': 'd' });
  removeLegacyKeys(ls);
  ok(ls.m.size === 1 && ls.getItem(KEYS.save) === 'b', 'removeLegacyKeys');
}

// 9. no module uses a storage key outside KEYS / SESSION_KEYS
{
  const known = new Set([...Object.values(KEYS), ...Object.values(ARC_KEYS), ...Object.values(SESSION_KEYS), MIGRATED_KEY]);
  const dir = path.join(ROOT, 'game/js');
  const stray = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'storagekeys.js')) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/(?:local|session)Storage\.(?:get|set|remove)Item\(\s*'([^']+)'/g)) if (!known.has(m[1])) stray.push(`${f}: ${m[1]}`);
    for (const m of src.matchAll(/'(g[td]e[6-]?[-.:][\w.:-]*)'/g)) {
      const k = m[1];
      if (/^gde-(ahead|benchmark|engine|dev:)$/.test(k) || k.startsWith('gde:')) continue;
      if (!known.has(k) && k !== 'gte-minimap-layers') stray.push(`${f}: ${k}`);
    }
  }
  ok(!stray.length, 'every storage key is in storagekeys.js', stray.join(', '));
  ok(LEGACY_CACHE_KEYS.every((k) => !LEGACY_KEYS.some(([from]) => from === k)), 'caches are not also copied');
  const main = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');
  const firstImport = main.split(/\r?\n/).find((l) => l.startsWith('import '));
  ok(firstImport === "import './storagekeys.js';", 'storagekeys.js is the first import of main.js', firstImport);
}

// 10. desktop userData: copied once from "GTE VI", old folder untouched
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-userdata-test-'));
  try {
    const legacy = path.join(tmp, 'GTE VI');
    fs.mkdirSync(path.join(legacy, 'Local Storage', 'leveldb'), { recursive: true });
    fs.writeFileSync(path.join(legacy, 'Local Storage', 'leveldb', '000003.log'), 'save data');
    fs.writeFileSync(path.join(legacy, 'window-state.json'), '{"fullscreen":false}');
    fs.mkdirSync(path.join(legacy, 'GPUCache'));
    fs.writeFileSync(path.join(legacy, 'GPUCache', 'data_0'), 'cache');
    const logs = [];
    const r = chooseUserData(tmp, 'GDE Groningen', { log: (m) => logs.push(m) });
    const target = path.join(tmp, 'GDE Groningen');
    ok(r.action === 'migrated' && r.dir === target, 'userData migrated', JSON.stringify(r));
    ok(fs.readFileSync(path.join(target, 'Local Storage', 'leveldb', '000003.log'), 'utf8') === 'save data', 'localStorage copied');
    ok(fs.existsSync(path.join(target, 'window-state.json')), 'window state copied');
    ok(!fs.existsSync(path.join(target, 'GPUCache')), 'caches left out');
    ok(fs.existsSync(path.join(target, MARKER)), 'marker written');
    ok(fs.existsSync(path.join(legacy, 'Local Storage', 'leveldb', '000003.log')) && fs.existsSync(path.join(legacy, 'GPUCache')), 'old folder untouched');
    ok(!fs.readdirSync(tmp).some((f) => f.includes('.migrating-')), 'no temporary folder left');
    // second start: uses the new folder, copies nothing again
    fs.writeFileSync(path.join(target, 'Local Storage', 'leveldb', '000003.log'), 'newer');
    const r2 = chooseUserData(tmp, 'GDE Groningen');
    ok(r2.action === 'current' && fs.readFileSync(path.join(target, 'Local Storage', 'leveldb', '000003.log'), 'utf8') === 'newer', 'second start keeps the new folder');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
{
  // a new folder with only caches in it (made by Electron before the copy) is kept aside, not deleted
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-userdata-test-'));
  try {
    fs.mkdirSync(path.join(tmp, 'GTE VI', 'Local Storage'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'GDE Groningen', 'Crashpad'), { recursive: true });
    const r = chooseUserData(tmp, 'GDE Groningen');
    ok(r.action === 'migrated' && fs.readdirSync(tmp).some((f) => f.startsWith('GDE Groningen.before-migration-')), 'cache-only new folder kept aside');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
{
  // fresh install: nothing to copy
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-userdata-test-'));
  try {
    const r = chooseUserData(tmp, 'GDE Groningen');
    ok(r.action === 'fresh' && !fs.existsSync(path.join(tmp, 'GDE Groningen')), 'fresh install');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.platform !== 'win32' && process.getuid && process.getuid() !== 0) {
  // copy fails (unreadable old folder): run on the old folder, as before
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-userdata-test-'));
  const locked = path.join(tmp, 'GTE VI', 'Local Storage', 'leveldb');
  try {
    fs.mkdirSync(locked, { recursive: true });
    fs.writeFileSync(path.join(locked, 'x'), 'y');
    fs.chmodSync(locked, 0o000);
    const r = chooseUserData(tmp, 'GDE Groningen');
    ok(r.action === 'legacy' && r.dir === path.join(tmp, 'GTE VI'), 'failed copy falls back to the old folder', JSON.stringify(r));
    ok(!fs.existsSync(path.join(tmp, 'GDE Groningen')) && !fs.readdirSync(tmp).some((f) => f.includes('.migrating-')), 'failed copy leaves nothing behind');
  } finally { try { fs.chmodSync(locked, 0o755); } catch (e) { /* ignore */ } fs.rmSync(tmp, { recursive: true, force: true }); }
}

// 10. save slots (#208): the single save of 0.28 / 1.x becomes slot 1 without moving a byte
{
  const arcSave = JSON.stringify({ v: 9, arc: ARC_KEYS.save.endsWith('-nieuw') ? 'nieuw' : 'oud', money: 1234, savedAt: 5, speeltijd: 60 });
  const ls = new MemStorage({ 'gte-save-v1': arcSave });
  migrateStorage(ls, null);
  ok(slotKey(1) === ARC_KEYS.save && ls.getItem(slotKey(1)) === ls.getItem('gte-save-v1') || ARC_KEYS.save.endsWith('-nieuw'), 'slot 1 is the migrated save key');
  ok(slotKey(1) !== slotKey(2) && slotRecoveryKey(1) !== slotKey(1), 'slot keys are distinct');
  const before = ls.getItem(KEYS.save);
  const l = Slots.listSlots(ls);
  ok(before === arcSave && ls.getItem(KEYS.save) === before, 'listing slots leaves the migrated save as it was');
  ok(!ARC_KEYS.save.endsWith('-nieuw') ? l.length === 1 && l[0].n === 1 && l[0].active : true, 'migrated save shows as the active slot 1');
  ok(ARC_KEYS.saveSlots.startsWith('gde-') && !ARC_KEYS.saveSlots.startsWith('gte-'), 'slot list key is gde-*');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
