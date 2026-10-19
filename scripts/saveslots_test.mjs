// Save slots (#208), the pure side:  node scripts/saveslots_test.mjs
// Never touches real storage: everything runs on an in-memory storage.
import { slotKey, slotRecoveryKey, KEYS, MAX_SLOTS } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
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
const save = (money, extra = {}) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 1000 + money, money, speeltijd: 3725, missions: { index: 1, completed: [0, 1], seen: [0, 1] }, character: 'tammo', ...extra });

// keys
ok(slotKey(1) === KEYS.save, 'slot 1 is the old save key');
ok(new Set(Array.from({ length: MAX_SLOTS }, (_, i) => slotKey(i + 1))).size === MAX_SLOTS, 'slot keys differ');
ok(slotKey(2) !== KEYS.save && slotRecoveryKey(1) !== slotKey(1) && slotRecoveryKey(2) !== slotKey(2), 'recovery keys differ');
ok(slotKey(2).startsWith('gde-'), 'slot keys are gde-*');

// names and text
ok(S.cleanName('  Mijn   <b>save</b>\n') === 'Mijn b save /b', 'cleanName strips markup and whitespace', S.cleanName('  Mijn   <b>save</b>\n'));
ok(S.cleanName('x'.repeat(100)).length === S.NAME_MAX, 'name length capped');
ok(S.cleanName('', 'Savegame 3') === 'Savegame 3', 'fallback name');
ok(S.formatPlaytime(0) === 'net begonnen' && S.formatPlaytime(540) === '9 min' && S.formatPlaytime(3725) === '1 u 02 min' && S.formatPlaytime(NaN) === 'net begonnen', 'formatPlaytime');
ok(S.exportFileName('Mijn Grunn-save!', new Date('2026-08-01T10:00:00Z')) === 'gde-save-mijn-grunn-save-2026-08-01.json', 'export file name');

// the single save of a 1.x player is slot 1, untouched
{
  const ls = new Mem();
  const text = JSON.stringify(save(500));
  ls.setItem(KEYS.save, text);
  const l = S.listSlots(ls);
  ok(l.length === 1 && l[0].n === 1 && l[0].active && l[0].name === 'Savegame 1' && l[0].state === 'ok', 'old save appears as slot 1');
  ok(l[0].summary.money === 500 && l[0].summary.playSeconds === 3725 && l[0].summary.missionsDone === 2, 'summary');
  ok(ls.getItem(KEYS.save) === text, 'listing does not change the save');
  ok(S.activeSlot(ls) === 1, 'active is 1 without a list');
}

// robust write: recovery copy of the previous good save
{
  const ls = new Mem();
  ok(S.writeSlot(ls, 1, save(1)), 'first write');
  ok(ls.getItem(slotRecoveryKey(1)) === null, 'no recovery copy for a first write');
  S.writeSlot(ls, 1, save(2));
  ok(JSON.parse(ls.getItem(slotRecoveryKey(1))).money === 1, 'previous save kept as recovery copy');
  // the main save breaks (cut off): read comes from the recovery copy
  ls.setItem(slotKey(1), '{"v":9,"money":');
  const r = S.readSlot(ls, 1);
  ok(r.state === 'hersteld' && r.data.money === 1, 'broken save read from recovery copy');
  // a broken save is not copied over the good recovery copy
  S.writeSlot(ls, 1, save(3));
  ok(JSON.parse(ls.getItem(slotRecoveryKey(1))).money === 1 && S.readSlot(ls, 1).state === 'ok', 'broken text never becomes the recovery copy');
  // both broken
  ls.setItem(slotKey(1), 'rommel'); ls.setItem(slotRecoveryKey(1), '[]');
  const r2 = S.readSlot(ls, 1);
  ok(r2.state === 'kapot' && !r2.data, 'both broken: state kapot');
  const l = S.listSlots(ls);
  ok(l.length === 1 && l[0].state === 'kapot' && l[0].summary === null, 'broken slot still listed');
}
// a write that reads back wrong puts the old save back
{
  const ls = new Mem();
  S.writeSlot(ls, 2, save(10));
  const set = ls.setItem.bind(ls);
  let torn = false;
  ls.setItem = (k, v) => { if (k === slotKey(2) && !torn) { torn = true; set(k, v.slice(0, 5)); return; } set(k, v); };
  ok(S.writeSlot(ls, 2, save(11)) === false, 'torn write reported');
  ls.setItem = set;
  ok(JSON.parse(ls.getItem(slotKey(2))).money === 10, 'old save restored after a torn write');
}
{
  // full storage: never loses the old save
  const ls = new Mem();
  S.writeSlot(ls, 1, save(1));
  const used = [...ls.m].reduce((a, [k, v]) => a + k.length + v.length, 0);
  ls.quota = used + 20;
  const res = S.writeSlot(ls, 1, save(2, { x: 'y'.repeat(10) }));
  ok(res || JSON.parse(ls.getItem(slotKey(1))).money === 1, 'full storage never loses the old save');
}
// newer game: not readable, but kept as recovery copy and not "kapot"
{
  const ls = new Mem();
  ls.setItem(slotKey(1), JSON.stringify({ v: SAVE_VERSION + 5, money: 9 }));
  ok(S.readSlot(ls, 1).state === 'nieuwer', 'newer save state');
  S.writeSlot(ls, 1, save(1));
  ok(JSON.parse(ls.getItem(slotRecoveryKey(1))).v === SAVE_VERSION + 5, 'newer save kept aside before overwrite');
}
// an old version migrates on read
{
  const ls = new Mem();
  ls.setItem(slotKey(1), JSON.stringify({ v: 1, money: 7, arc: ARC_ID, stats: { kills: 3 } }));
  const r = S.readSlot(ls, 1);
  ok(r.state === 'ok' && r.data.v === SAVE_VERSION && r.from === 1, 'old save migrated on read', r.state);
}

// create, rename, active, delete
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(1));
  const n2 = S.createSlot(ls, '  Tweede  ');
  ok(n2 === 2 && S.activeSlot(ls) === 2 && S.nameOf(ls, 2) === 'Tweede', 'createSlot picks the free slot and names it');
  ok(S.listSlots(ls).length === 1, 'empty new slot is not listed');
  S.writeSlot(ls, 2, save(2));
  ok(S.listSlots(ls).length === 2, 'listed after the first save');
  S.renameSlot(ls, 1, 'Eerste');
  ok(S.nameOf(ls, 1) === 'Eerste', 'rename');
  S.renameSlot(ls, 1, '');
  ok(S.nameOf(ls, 1) === 'Savegame 1', 'empty rename gives the default name');
  S.setActive(ls, 1);
  ok(S.activeSlot(ls) === 1, 'setActive');
  ok(S.deleteSlot(ls, 1) && ls.getItem(slotKey(1)) === null && ls.getItem(slotRecoveryKey(1)) === null, 'delete removes save and recovery copy');
  ok(S.activeSlot(ls) === 2 && S.listSlots(ls).length === 1, 'active moves to a slot that is left');
  ls.setItem(KEYS.saveSlots, '{"active":99,"names":{"x":"a","2":5}}');
  ok(S.activeSlot(ls) === 1 && S.nameOf(ls, 2) === 'Savegame 2', 'garbage list is tolerated');
  ls.setItem(KEYS.saveSlots, 'nonsense');
  ok(S.activeSlot(ls) === 1, 'unparsable list is tolerated');
}
// pickActive: a new game that never saved
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(5));
  S.createSlot(ls, 'Leeg');
  ok(S.activeSlot(ls) === 2 && S.pickActive(ls) === 1 && S.activeSlot(ls) === 1, 'empty active slot falls back to the last saved');
}
// all slots full
{
  const ls = new Mem();
  for (let i = 1; i <= MAX_SLOTS; i++) S.writeSlot(ls, i, save(i));
  ok(S.freeSlot(ls) === 0 && S.createSlot(ls, 'x') === 0, 'no slot left');
  ok(S.importAsNewSlot(ls, S.exportSlot(ls, 1).text).why === 'vol', 'import into a full list refused');
}

// export / import
{
  const a = new Mem();
  S.writeSlot(a, 1, save(42));
  S.renameSlot(a, 1, 'Zomer');
  const ex = S.exportSlot(a, 1, new Date('2026-08-01T10:00:00Z'));
  ok(ex.ok && ex.filename === 'gde-save-zomer-2026-08-01.json', 'export');
  const b = new Mem();
  S.writeSlot(b, 1, save(7));
  const im = S.importAsNewSlot(b, ex.text);
  ok(im.ok && im.n === 2 && im.name === 'Zomer' && S.readSlot(b, 2).data.money === 42, 'import round trip');
  ok(S.readSlot(b, 1).data.money === 7, 'import never touches existing slots');
  ok(S.parseImport(JSON.stringify(save(3))).ok, 'a bare save is accepted');
  ok(S.parseImport(JSON.stringify({ v: 1, money: 3, arc: ARC_ID })).ok, 'an old bare save is accepted and migrated');
  ok(S.parseImport('niets').why === 'kapot', 'not JSON');
  ok(S.parseImport('').why === 'kapot' && S.parseImport(null).why === 'kapot', 'empty');
  ok(S.parseImport('[1,2]').why === 'geen-save' && S.parseImport('{"a":1}').why === 'geen-save', 'other JSON is no save');
  ok(S.parseImport(JSON.stringify({ kind: 'GDE-save', save: 'x' })).why === 'geen-save', 'envelope without save');
  ok(S.parseImport(JSON.stringify({ kind: 'GDE-save', save: { v: SAVE_VERSION + 3, money: 1 } })).why === 'nieuwer', 'newer save refused');
  ok(S.parseImport('x'.repeat(S.MAX_IMPORT_CHARS + 1)).why === 'groot', 'too big');
  { // a save of the first version is not refused (#187): it carries on in the story that is left
    const r = S.parseImport(JSON.stringify({ kind: 'GDE-save', save: { v: 9, arc: 'oud', money: 1 } }));
    ok(r.ok === true, 'save of the first version accepted (migrated)', JSON.stringify(r).slice(0, 80));
  }
  const hostile = S.parseImport(JSON.stringify({ kind: 'GDE-save', name: '<img src=x onerror=1>', save: save(1) }));
  ok(hostile.ok && !/[<>]/.test(hostile.name), 'imported name is cleaned');
  ok(S.exportSlot(new Mem(), 3).ok === false, 'export of an empty slot');
  ok(S.importErrorText('kapot') && S.importErrorText('vol') && S.stateText('kapot') && S.stateText('ok') === '', 'texts');
}
// blocked storage never throws
{
  const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  let threw = false;
  try { S.listSlots(blocked); S.readSlot(blocked, 1); S.writeSlot(blocked, 1, save(1)); S.activeSlot(blocked); S.createSlot(blocked, 'a'); S.deleteSlot(blocked, 1); } catch (e) { threw = true; console.log(e); }
  ok(!threw, 'blocked storage does not throw');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
