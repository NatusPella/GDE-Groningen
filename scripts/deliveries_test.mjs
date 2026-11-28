// The shared goods and deliveries (#1379 X1, game/js/deliveries.js): the fixed list, tolerant loading, and above all a transfer over two stores that is never doubled or lost,
// also when the game stops between the two writes (every possible stopping point is tried).   node scripts/deliveries_test.mjs
import assert from 'node:assert/strict';
import * as DL from '../game/js/deliveries.js';
import { GEWASSEN } from '../game/js/boerderij.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };

// Two stores with their own "disk": a write copies the memory to the disk; once the budget is used up writes do nothing, as if the game had stopped.
const FROM = { kind: 'estate', id: 'zonnehoek' }, TO = { kind: 'van', id: 'own' };
function fresh(total = 500, cap = 1000) {
  return { src: JSON.stringify({ stock: total, j: DL.newJournal() }), dst: JSON.stringify({ stock: 0, cap, received: {} }) };
}
function load(disk) {
  const src = JSON.parse(disk.src), dst = JSON.parse(disk.dst);
  src.j = DL.normalizeJournal(src.j);
  return { src, dst };
}
function ioOn(mem, disk, budget) {
  const write = (k) => { if (budget.left > 0) { budget.left--; disk[k] = JSON.stringify(mem[k]); } };
  return {
    take(d) { const k = Math.min(d.amount, mem.src.stock); if (k <= 0) return { ok: false, reason: 'empty' }; mem.src.stock -= k; return { ok: true, amount: k }; },
    give(d) {
      if (mem.dst.received[d.id] !== undefined) return { ok: true, duplicate: true, amount: mem.dst.received[d.id] };
      const k = Math.min(d.amount, mem.dst.cap - mem.dst.stock); if (k <= 0) return { ok: false, reason: 'full' };
      mem.dst.stock += k; mem.dst.received[d.id] = k; return { ok: true, amount: k };
    },
    putBack(d) { mem.src.stock += d.amount; return { ok: true }; },
    saveSource: () => write('src'), saveTarget: () => write('dst'),
  };
}
const request = (mem, amount = 500) => DL.makeDelivery(mem.src.j, { from: FROM, to: TO, good: 'aardappelen', amount });

t('the list of goods: fixed, with units, and every crop is a crop of the farm', () => {
  assert.deepEqual(DL.GOOD_IDS, ['bieten', 'graan', 'aardappelen', 'uien', 'kisten', 'zand', 'pakketten']);
  for (const id of DL.GOOD_IDS) assert.ok(['kg', 'pcs'].includes(DL.GOODS[id].unit) && DL.GOODS[id].label, id);
  for (const id of DL.GOOD_IDS.filter((g) => DL.GOODS[g].kind === 'crop')) assert.ok(GEWASSEN[id], id + ' is a crop of boerderij.js');
  assert.equal(DL.isGood('toString'), false); assert.equal(DL.isGood('goud'), false);
});

t('a delivery: wrong or missing data gives null, unknown fields are dropped, ids count up per player', () => {
  const j = DL.newJournal();
  assert.equal(DL.makeDelivery(j, { from: FROM, to: TO, good: 'goud', amount: 5 }), null);
  assert.equal(DL.makeDelivery(j, { from: FROM, to: TO, good: 'zand', amount: 0 }), null);
  assert.equal(DL.makeDelivery(j, { from: { kind: 'zee', id: 'x' }, to: TO, good: 'zand', amount: 5 }), null);
  assert.equal(j.seq, 0, 'a refused delivery does not use up a number');
  const a = DL.makeDelivery(j, { from: FROM, to: TO, good: 'zand', amount: 5.9, player: 'speler-een' });
  const b = DL.makeDelivery(j, { from: FROM, to: TO, good: 'zand', amount: 5 });
  assert.equal(a.amount, 5); assert.notEqual(a.id, b.id); assert.match(a.id, /^speler-een:lev:1$/);
  assert.equal(DL.normalizeDelivery({ ...a, extra: 1 }).extra, undefined);
  assert.equal(DL.normalizeDelivery({ ...a, amount: 1e12 }).amount, DL.MAX_AMOUNT);
});

t('the journal loads tolerantly: nothing, rubbish, half of it', () => {
  for (const raw of [undefined, null, 5, 'x', [], {}, { pending: 7, done: 'x' }, { pending: { a: { good: 'goud' } }, done: [1, null, {}] }]) {
    const j = DL.normalizeJournal(raw);
    assert.deepEqual(Object.keys(j).sort(), ['done', 'pending', 'seq']); assert.deepEqual(j.pending, {}); assert.deepEqual(j.done, []); assert.equal(j.seq, 0);
  }
  const d = DL.makeDelivery(DL.newJournal(), { from: FROM, to: TO, good: 'uien', amount: 40 });
  const j = DL.normalizeJournal({ seq: 3, pending: { [d.id]: d }, done: ['a', 'b'] });
  assert.equal(j.seq, 3); assert.equal(j.pending[d.id].amount, 40); assert.deepEqual(j.done, ['a', 'b']);
  assert.equal(DL.normalizeJournal({ done: Array.from({ length: 200 }, (_, i) => 'id' + i) }).done.length, DL.JOURNAL_DONE_MAX);
});

t('a normal transfer: the goods leave one store and arrive in the other once', () => {
  const disk = fresh(500, 1000), mem = load(disk), budget = { left: 99 };
  const d = request(mem, 300);
  const r = DL.transfer(mem.src.j, d, ioOn(mem, disk, budget));
  assert.ok(r.ok && r.delivered === 300 && r.returned === 0 && r.state === 'done');
  const after = load(disk);
  assert.equal(after.src.stock, 200); assert.equal(after.dst.stock, 300);
  assert.deepEqual(after.src.j.pending, {}); assert.equal(after.src.j.done.length, 1);
  assert.equal(DL.transfer(after.src.j, d, ioOn(after, disk, budget)).reason, 'known');
  assert.equal(after.src.stock, 200, 'the same id again changes nothing');
});

t('asking for more than there is takes what there is; nothing there is a refusal that touches nothing', () => {
  const disk = fresh(120), mem = load(disk);
  const r = DL.transfer(mem.src.j, request(mem, 500), ioOn(mem, disk, { left: 9 }));
  assert.equal(r.delivered, 120); assert.equal(r.requested, 500); assert.equal(r.taken, 120);
  const disk2 = fresh(0), mem2 = load(disk2);
  const r2 = DL.transfer(mem2.src.j, request(mem2, 10), ioOn(mem2, disk2, { left: 9 }));
  assert.equal(r2.ok, false); assert.equal(r2.reason, 'empty');
  assert.deepEqual(mem2.src.j.pending, {}); assert.equal(mem2.src.stock, 0); assert.equal(mem2.dst.stock, 0);
});

t('a full target: what does not fit goes back to the source', () => {
  const disk = fresh(500, 200), mem = load(disk);
  const r = DL.transfer(mem.src.j, request(mem, 500), ioOn(mem, disk, { left: 9 }));
  assert.ok(r.ok); assert.equal(r.delivered, 200); assert.equal(r.returned, 300);
  const after = load(disk);
  assert.equal(after.src.stock, 300); assert.equal(after.dst.stock, 200);
  assert.deepEqual(after.src.j.pending, {});
});

t('a target that takes nothing: everything is back, the delivery is closed, nothing is delivered', () => {
  const disk = fresh(500, 0), mem = load(disk);
  const r = DL.transfer(mem.src.j, request(mem, 500), ioOn(mem, disk, { left: 9 }));
  assert.equal(r.ok, false); assert.equal(r.reason, 'target-refused'); assert.equal(r.returned, 500);
  const after = load(disk); assert.equal(after.src.stock, 500); assert.equal(after.dst.stock, 0); assert.deepEqual(after.src.j.pending, {});
});

// The game stops after k writes (k = 0 ... 6), is loaded again from what is on disk, and resume() finishes the job: always the same end state.
for (const [label, cap, expectDst] of [['everything fits', 1000, 500], ['only part fits', 200, 200]]) {
  t(`stopping at every moment (${label}): after loading and resume nothing is lost and nothing is doubled`, () => {
    for (let k = 0; k <= 6; k++) {
      const disk = fresh(500, cap), mem = load(disk);
      DL.transfer(mem.src.j, request(mem, 500), ioOn(mem, disk, { left: k }));   // the game "stops" after k writes
      const again = load(disk);                                                  // loaded again from disk
      DL.resume(again.src.j, ioOn(again, disk, { left: 99 }));
      const end = load(disk);
      assert.equal(end.src.stock + end.dst.stock, 500, `k=${k}: conservation`);
      assert.equal(end.dst.stock, k === 0 ? 0 : expectDst, `k=${k}: arrived once (k=0: the game stopped before anything was written, so nothing happened)`);
      assert.deepEqual(end.src.j.pending, {}, `k=${k}: nothing pending`);
      if (k > 0) assert.equal(end.src.j.done.length, 1, `k=${k}: closed`);
      // a second resume and a second load change nothing
      const snapshot = JSON.stringify(end);
      const e2 = load(disk); DL.resume(e2.src.j, ioOn(e2, disk, { left: 99 }));
      assert.equal(JSON.stringify(load(disk)), snapshot, `k=${k}: idempotent`);
    }
  });
}

t('a write that fails at the start: the goods are put back as if nothing happened', () => {
  const disk = fresh(500), mem = load(disk), io = ioOn(mem, disk, { left: 9 });
  io.saveSource = () => { throw new Error('opslag vol'); };
  const r = DL.transfer(mem.src.j, request(mem, 500), io);
  assert.equal(r.ok, false); assert.equal(r.reason, 'save-failed');
  assert.equal(mem.src.stock, 500); assert.equal(mem.dst.stock, 0); assert.deepEqual(mem.src.j.pending, {});
});

t('a target that cannot be written: the delivery stays pending and arrives (once) later', () => {
  const disk = fresh(500), mem = load(disk), io = ioOn(mem, disk, { left: 99 });
  const real = io.saveTarget; let broken = true;
  io.saveTarget = () => { if (broken) throw new Error('weg'); real(); };
  const r = DL.transfer(mem.src.j, request(mem, 500), io);
  assert.equal(r.state, 'pending'); assert.equal(Object.keys(mem.src.j.pending).length, 1);
  broken = false;
  const out = DL.resume(mem.src.j, io);
  assert.equal(out.length, 1);
  assert.equal(mem.src.stock + mem.dst.stock, 500); assert.equal(mem.dst.stock, 500);
});

t('too many pending deliveries are refused instead of piling up', () => {
  const disk = fresh(1e5), mem = load(disk), io = ioOn(mem, disk, { left: 999 });
  io.give = () => { throw new Error('dicht'); };
  for (let i = 0; i < DL.PENDING_MAX; i++) assert.equal(DL.transfer(mem.src.j, request(mem, 1), io).state, 'pending');
  assert.equal(DL.transfer(mem.src.j, request(mem, 1), io).reason, 'too-many-pending');
});

console.log(`deliveries_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
