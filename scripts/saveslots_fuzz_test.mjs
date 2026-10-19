// Save slots under bad input (#208, #187):  node scripts/saveslots_fuzz_test.mjs
// Old save fixtures through the slots, cut-off and hostile imports, full storage, the migration of
// old keys. Everything runs on an in-memory storage, never the real one.
import fs from 'node:fs';
import { KEYS, BASE_KEYS, slotKey, slotRecoveryKey, migrateStorage } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import { migrateOudeOpslag, mergeLife } from '../game/js/oudmigratie.js';
import * as S from '../game/js/saveslots.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
class Mem {
  constructor(quota = Infinity) { this.m = new Map(); this.quota = quota; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    v = String(v);
    const before = this.m.get(k);
    this.m.set(k, v);
    let size = 0; for (const [a, b] of this.m) size += a.length + b.length;
    if (size > this.quota) { if (before === undefined) this.m.delete(k); else this.m.set(k, before); const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
  }
  removeItem(k) { this.m.delete(k); }
}
const save = (money, extra = {}) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 1000 + money, money, speeltijd: 60, missions: { completed: [] }, character: 'tammo', ...extra });
const noThrow = (f, name) => { try { return f(); } catch (e) { ok(false, name + ' throws', String(e && e.message).slice(0, 80)); return undefined; } };

// every fixture of an old save: through a slot, listed, exported, imported again
const dir = new URL('./fixtures/saves/', import.meta.url);
for (const f of fs.readdirSync(dir).filter((x) => /^0\..*\.json$/.test(x))) {
  const fx = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  if (!fx.save) continue;
  const text = JSON.stringify(fx.save);
  const ls = new Mem();
  ls.setItem(KEYS.save, text);
  const r = noThrow(() => S.readSlot(ls, 1), f + ' readSlot');
  ok(r && r.state === 'ok' && r.data.v === SAVE_VERSION, f + ' loads', r && r.state);
  ok(ls.getItem(KEYS.save) === text, f + ' listing leaves the save as it was');
  const ex = S.exportSlot(ls, 1);
  ok(ex.ok, f + ' exports');
  const im = ex.ok && S.importAsNewSlot(ls, ex.text);
  ok(im && im.ok && im.n === 2 && S.readSlot(ls, 2).state === 'ok', f + ' export -> import');
  // cut off anywhere: never throws, never "ok" with a half save
  for (const cut of [1, text.length >> 2, text.length >> 1, text.length - 2]) {
    const l2 = new Mem(); l2.setItem(KEYS.save, text.slice(0, cut));
    const rr = noThrow(() => S.readSlot(l2, 1), f + ' cut readSlot');
    ok(rr && rr.state !== 'ok', f + ' cut at ' + cut + ' is not ok', rr && rr.state);
    noThrow(() => S.listSlots(l2), f + ' cut listSlots');
  }
}

// hostile / odd imports
const evil = [
  '{"v":10,"money":1,"__proto__":{"polluted":1}}',
  '{"kind":"GDE-save","save":{"v":10,"money":1,"constructor":{"prototype":{"polluted":1}}},"name":"__proto__"}',
  '{"v":10,"money":1,"stats":{"__proto__":{"polluted":2}}}',
  '{"kind":"GDE-save","save":[1,2,3]}', '[]', 'null', '1', '"x"', '{}', '{"v":1}', '{"v":0,"money":1}', '{"v":-1,"money":1}', '{"v":1.5,"money":1}', '{"v":"10","money":1}',
  '{"v":99999999999,"money":1}', '{"v":10,"money":"1e999"}', '{"v":10,"money":1e999}',
  '\u0000\u0001', '﻿{"v":10,"money":1}', '{"v":10,"money":1}garbage',
];
for (const t of evil) {
  const ls = new Mem();
  const r = noThrow(() => S.importAsNewSlot(ls, t), 'import ' + t.slice(0, 30));
  ok(r && typeof r.ok === 'boolean', 'import answers ' + t.slice(0, 30));
  ok({}.polluted === undefined && Object.prototype.polluted === undefined, 'no prototype pollution ' + t.slice(0, 30));
  if (r && r.ok) noThrow(() => S.readSlot(ls, r.n), 'read imported');
}
// deep nesting and big arrays inside the size cap
{
  const depth = 200000;
  const deep = '{"v":10,"money":1,"x":' + '['.repeat(depth) + ']'.repeat(depth) + '}';
  const r = noThrow(() => S.importAsNewSlot(new Mem(), deep), 'deeply nested import');
  ok(r && typeof r.ok === 'boolean', 'deeply nested import is answered');
  const big = '{"v":10,"arc":"nieuw","money":1,"visitedLandmarks":[' + '0,'.repeat(900000) + '0]}';
  const t0 = Date.now();
  const r2 = noThrow(() => S.importAsNewSlot(new Mem(), big), 'big array import');
  ok(Date.now() - t0 < 5000, 'big array import is quick');
  ok(!!r2, 'big array answered');
  const huge = noThrow(() => S.parseImport('x'.repeat(S.MAX_IMPORT_CHARS + 1)), 'huge');
  ok(huge && huge.why === 'groot', 'over the cap is refused');
}
// names from a file
{
  const ls = new Mem();
  const r = S.importAsNewSlot(ls, JSON.stringify({ kind: S.FILE_KIND, v: 1, name: '<img src=x onerror=1>\n'.repeat(5), save: save(5) }));
  ok(r.ok && !/[<>\n]/.test(S.nameOf(ls, r.n)) && S.nameOf(ls, r.n).length <= S.NAME_MAX, 'imported name is clean');
  const idx = new Mem(); idx.setItem(KEYS.saveSlots, '{"active":99,"names":{"__proto__":"x","0":"y","9":"z","2":5}}');
  const i = S.readIndex(idx);
  ok(i.active === 1 && Object.keys(i.names).length === 0, 'index with junk is cleaned', JSON.stringify(i));
  idx.setItem(KEYS.saveSlots, 'not json');
  ok(S.readIndex(idx).active === 1, 'index not json');
}

// the recovery copy must not be replaced by junk
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(1)); S.writeSlot(ls, 1, save(2));
  ls.setItem(slotKey(1), '{"x":1}'); // parses, is no save
  S.writeSlot(ls, 1, save(3));
  const rec = S.inspectRaw(ls.getItem(slotRecoveryKey(1)));
  ok(rec.ok, 'recovery copy still a real save after a junk main', JSON.stringify(rec).slice(0, 80));
}
// full storage: a bigger save still gets in by giving up the recovery copy; the old one never gets lost
{
  const a = JSON.stringify(save(1, { pad: 'x'.repeat(400) })), b = JSON.stringify(save(2, { pad: 'x'.repeat(520) }));
  const ls = new Mem(a.length * 2 + 200);
  ok(S.writeSlotRaw(ls, 1, a), 'first write'); ok(S.writeSlotRaw(ls, 1, a.replace('"money":1', '"money":3')), 'second write');
  ok(S.writeSlotRaw(ls, 1, b), 'bigger save fits after dropping the recovery copy');
  ok(S.readSlot(ls, 1).data.money === 2, 'and it is the one stored');
  const tiny = new Mem(10);
  ok(S.writeSlotRaw(tiny, 1, a) === false, 'no room at all: false, no throw');
  const tight = new Mem(a.length + 60);
  tight.setItem(slotKey(1), a);
  ok(S.writeSlotRaw(tight, 1, b) === false && tight.getItem(slotKey(1)) === a, 'too big: old save stays');
}
// storage that throws on everything
{
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  noThrow(() => S.listSlots(bad), 'listSlots broken storage'); noThrow(() => S.readSlot(bad, 1), 'readSlot broken');
  noThrow(() => S.deleteSlot(bad, 1), 'deleteSlot broken'); noThrow(() => S.createSlot(bad, 'x'), 'createSlot broken');
  noThrow(() => S.pickActive(bad), 'pickActive broken'); noThrow(() => S.renameSlot(bad, 1, 'x'), 'rename broken');
}
// delete / rename / create bookkeeping
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(1)); const two = S.createSlot(ls, 'Twee'); S.writeSlot(ls, two, save(2));
  ok(two === 2 && S.activeSlot(ls) === 2 && S.nameOf(ls, 2) === 'Twee', 'create');
  S.renameSlot(ls, 2, '   '); ok(S.nameOf(ls, 2) === 'Opgeslagen spel 2', 'blank rename resets');
  S.renameSlot(ls, 2, 'Een Twee'); S.deleteSlot(ls, 2);
  ok(S.listSlots(ls).length === 1 && S.activeSlot(ls) === 1 && S.nameOf(ls, 2) === 'Opgeslagen spel 2', 'delete forgets name, moves active');
  ok(ls.getItem(slotKey(2)) === null && ls.getItem(slotRecoveryKey(2)) === null, 'delete removes the recovery copy');
  const im = S.importAsNewSlot(ls, JSON.stringify(save(9)));
  ok(im.ok && im.n === 2 && S.nameOf(ls, 2) === 'Opgeslagen spel 2', 'import into a freed number gets no old name');
  for (let i = 0; i < 20; i++) S.createSlot(ls, 'x' + i);
  ok(S.listSlots(ls).length <= 8, 'never more than MAX_SLOTS');
}

// gte-* -> gde-* and the old story save
{
  const ls = new Mem();
  const old = JSON.stringify(save(7));
  ls.setItem('gte-save-v1', old); ls.setItem('gte-prestaties-v1', '{"v":1}');
  migrateStorage(ls, null);
  ok(ls.getItem('gde-save-v1') === old && ls.getItem('gte-save-v1') === old, 'gte save copied, old stays');
  const rep = migrateOudeOpslag(ls);
  ok(rep.save && ls.getItem(KEYS.save) === old, 'old save copied to the -nieuw key as it was');
  ok(ls.getItem(BASE_KEYS.save) === old, 'old key untouched');
  const again = migrateOudeOpslag(ls);
  ok(again.skipped, 'once');
  const l2 = new Mem(); l2.setItem(BASE_KEYS.save, old); l2.setItem(KEYS.save, JSON.stringify(save(99)));
  migrateOudeOpslag(l2); ok(JSON.parse(l2.getItem(KEYS.save)).money === 99, 'existing story save kept');
  for (const junk of ['not json', 'null', '[]', '{"sets":{"__proto__":["a"]}}', '{"unlocked":{"__proto__":5},"stats":{"__proto__":3}}', '{"missions":{"__proto__":{"best":1}}}']) {
    const l3 = new Mem(); l3.setItem(BASE_KEYS.achievements, junk); l3.setItem(KEYS.achievements, '{"v":1,"unlocked":{"a":5}}');
    noThrow(() => migrateOudeOpslag(l3), 'oudmigratie junk ' + junk);
    ok(l3.getItem(BASE_KEYS.oudGemigreerd) === '1', 'migration completes with junk prestaties ' + junk);
    ok(JSON.parse(l3.getItem(KEYS.achievements)).unlocked.a === 5, 'new prestaties survive ' + junk);
    ok({}.polluted === undefined && Object.getPrototypeOf({}) === Object.prototype, 'no pollution ' + junk);
  }
  ok(mergeLife(null, null).v === 1, 'mergeLife of nothing');
}
console.log(fails ? `${fails} FAILED of ${n}` : `saveslots_fuzz_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
