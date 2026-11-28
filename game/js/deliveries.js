// A shared notion of "goods" and "deliveries" (#1379, task X1 of docs/verhaal/bijbel-28-11/audits/vervoer-water-lucht.md): one fixed list of goods and one way to move
// them from one store to another, so farm, freight, water and the snack van never grow their own half-transactions. Pure: no DOM, no storage, no clock, no network
// (scripts/deliveries_test.mjs). The caller supplies the two stores as small adapters; this module only keeps the order of the steps and the journal.
//
// The problem it solves is a transfer over TWO stores that are written separately (the farm in gde-boerderij-v1, the snack van in bezit.x.snack inside gde-bezit-v1):
// a crash or a full target between the two writes must neither duplicate nor lose goods (feedback lessons #1293, #1295). The order is fixed:
//   1. take from the source and write the delivery in the source's journal in ONE write ("pending", the goods are now only in the journal);
//   2. give to the target, which remembers the delivery id and the amount it took (so asking twice changes nothing), and write the target;
//   3. put back what the target did not take, then close the delivery in the source journal ("done").
// A crash after 1 or 2 is finished by resume() on the next load: step 2 is idempotent by id, so the goods arrive exactly once.
//
// Multiplayer: a delivery belongs to one player (field `player`, the owner of the source and of the booking, per player progress #429). `toPlayer` is data only for
// the later trade between players (#1380, a first step after the host agrees); nothing here sends it over the network. A guest books only in his own stores.

import { gebeurtenisId } from './coopbeloning.js';

// The fixed list. unit 'kg' or 'pcs'; kind 'crop' goods have the id of a crop in boerderij.js GEWASSEN (a test keeps them in step).
export const GOODS = {
  bieten: { label: 'Suikerbieten', unit: 'kg', kind: 'crop' },
  graan: { label: 'Graan', unit: 'kg', kind: 'crop' },
  aardappelen: { label: 'Aardappelen', unit: 'kg', kind: 'crop' },
  uien: { label: 'Uien', unit: 'kg', kind: 'crop' },
  kisten: { label: 'Kisten', unit: 'pcs', kind: 'cargo' },
  zand: { label: 'Zand', unit: 'kg', kind: 'cargo' },
  pakketten: { label: 'Pakketten', unit: 'pcs', kind: 'cargo' },
};
export const GOOD_IDS = Object.keys(GOODS);
export const isGood = (id) => Object.prototype.hasOwnProperty.call(GOODS, id);
export const KINDS = ['estate', 'van', 'quay', 'address', 'stop'];    // where goods lie: a farm estate, a snack van, a quay, a delivery address, a bus or train stop
export const MAX_AMOUNT = 1e6;
export const JOURNAL_DONE_MAX = 60;
export const PENDING_MAX = 20;

const whole = (x) => { const n = Math.floor(Number(x)); return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_AMOUNT) : 0; };
const place = (p) => (p && typeof p === 'object' && KINDS.includes(p.kind) && typeof p.id === 'string' && /^[a-z0-9:_-]{1,40}$/i.test(p.id) ? { kind: p.kind, id: p.id } : null);

// A delivery from raw data, or null when anything essential is wrong. Unknown fields are dropped.
export function normalizeDelivery(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !/^\S{1,48}$/.test(raw.id)) return null;
  const from = place(raw.from), to = place(raw.to), amount = whole(raw.amount);
  if (!from || !to || !isGood(raw.good) || !amount) return null;
  const d = { id: raw.id, from, to, good: raw.good, amount, player: typeof raw.player === 'string' && raw.player ? raw.player.slice(0, 16) : 'ik' };
  if (typeof raw.toPlayer === 'string' && raw.toPlayer) d.toPlayer = raw.toPlayer.slice(0, 16);
  if (raw.back === true) d.back = true;     // the target took (part of) it; what is left only has to go back to the source
  return d;
}

// ---- the journal (lives in the source store) ----
export const newJournal = () => ({ seq: 0, pending: {}, done: [] });
export function normalizeJournal(raw) {
  const j = newJournal();
  if (!raw || typeof raw !== 'object') return j;
  j.seq = Math.min(1e9, whole(raw.seq) || 0);
  if (raw.pending && typeof raw.pending === 'object') {
    for (const id of Object.keys(raw.pending).slice(0, PENDING_MAX)) { const d = normalizeDelivery({ ...raw.pending[id], id }); if (d) j.pending[id] = d; }
  }
  j.done = (Array.isArray(raw.done) ? raw.done : []).filter((s) => typeof s === 'string' && s && s.length <= 48).slice(-JOURNAL_DONE_MAX);
  return j;
}
export const isKnown = (j, id) => !!j && (!!j.pending[id] || j.done.includes(id));
export const pendingList = (j) => Object.values(j.pending);

// A new delivery with the next id of this player (id from coopbeloning.gebeurtenisId: player, kind 'lev', number). null for wrong data.
export function makeDelivery(j, { from, to, good, amount, player = 'ik', toPlayer }) {
  const id = gebeurtenisId(player, 'lev', j.seq + 1);
  const d = normalizeDelivery({ id, from, to, good, amount, player, toPlayer });
  if (d) j.seq++;
  return d;
}

// ---- the steps ----
// io (all synchronous, all small):
//   take(d)     -> { ok, amount }   remove from the source, at most d.amount; a refusal gives { ok: false, reason }
//   give(d)     -> { ok, amount, duplicate? }   add to the target; must remember d.id, and answer a known id with { ok: true, duplicate: true, amount: what it took then }
//   putBack(d)  -> { ok }           give d.amount back to the source
//   saveSource(), saveTarget()      write the store (may throw: the delivery then stays pending and resume() finishes it)
const guard = (fn) => { try { fn(); return true; } catch (e) { return false; } };

function close(j, id, io) {
  delete j.pending[id];
  j.done = [...j.done.filter((x) => x !== id), id].slice(-JOURNAL_DONE_MAX);
  guard(() => io.saveSource());
}

// Steps 2 and 3 for a delivery that is already in the journal. Returns { ok, delivered, returned, state: 'done' | 'pending' }.
function settle(j, d, io) {
  let delivered = 0, rest = d.amount;
  if (!d.back) {
    let g;
    try { g = io.give(d); } catch (e) { g = null; }
    if (!g) return { ok: false, delivered: 0, returned: 0, state: 'pending', reason: 'give-failed' };
    delivered = g.ok ? Math.min(d.amount, Math.max(0, Math.floor(g.amount) || 0)) : 0;
    if (g.ok && g.duplicate !== true) { if (!guard(() => io.saveTarget())) return { ok: false, delivered, returned: 0, state: 'pending', reason: 'save-failed' }; }
    rest = d.amount - delivered;
    if (rest > 0) { j.pending[d.id] = { ...d, amount: rest, back: true }; }
  }
  let returned = 0;
  if (rest > 0) {
    let pb;
    try { pb = io.putBack({ ...d, amount: rest }); } catch (e) { pb = null; }
    if (!pb || !pb.ok) { guard(() => io.saveSource()); return { ok: false, delivered, returned: 0, state: 'pending', reason: 'putback-failed' }; }
    returned = rest;
  }
  close(j, d.id, io);
  return { ok: delivered > 0, delivered, returned, state: 'done', ...(delivered > 0 ? {} : { reason: 'target-refused' }) };
}

// One delivery, start to finish. { ok: false, reason } when nothing was taken (the stores are then untouched).
export function transfer(j, raw, io) {
  const d = normalizeDelivery(raw);
  if (!d) return { ok: false, reason: 'invalid' };
  if (isKnown(j, d.id)) return { ok: false, reason: 'known' };
  if (Object.keys(j.pending).length >= PENDING_MAX) return { ok: false, reason: 'too-many-pending' };
  let t;
  try { t = io.take(d); } catch (e) { t = null; }
  const took = t && t.ok ? Math.min(d.amount, whole(t.amount)) : 0;
  if (!took) return { ok: false, reason: (t && t.reason) || 'nothing-to-take' };
  const sent = { ...d, amount: took };
  j.pending[d.id] = sent;
  if (!guard(() => io.saveSource())) {            // the journal could not be written: undo, as if nothing happened
    delete j.pending[d.id];
    let back = false;
    try { back = !!io.putBack(sent).ok; } catch (e) { back = false; }
    if (!back) j.pending[d.id] = { ...sent, back: true };
    return { ok: false, reason: 'save-failed' };
  }
  const r = settle(j, sent, io);
  return { ...r, id: d.id, good: d.good, requested: d.amount, taken: took };
}

// Finish every delivery that was left pending (a crash, a full store, a closed target): call it after loading and when a day passes.
export function resume(j, io) {
  const out = [];
  for (const d of pendingList(j)) out.push({ id: d.id, ...settle(j, d, io) });
  return out;
}
