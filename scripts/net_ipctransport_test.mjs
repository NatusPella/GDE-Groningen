// Samen spelen (#95): transport per verbinding bovenop de IPC-brug (game/js/net/ipctransport.js) met een nep-api.
import assert from 'node:assert/strict';
import { ipcTransport, listenForGuests } from '../game/js/net/ipctransport.js';

let n = 0;
const t = (name, f) => { f(); n++; };

function fakeApi() {
  const ls = new Set(); const sent = []; const closed = [];
  return { sent, closed, emit: (k, p) => { for (const f of ls) f(k, p); }, send: (id, b) => sent.push([id, [...b]]), close: (id) => closed.push(id), onEvent: (f) => { ls.add(f); return () => ls.delete(f); }, listeners: ls };
}

t('elke verbinding heeft een eigen transport: berichten en status gaan naar de juiste', () => {
  const api = fakeApi(); const a = ipcTransport(api, 1, { open: true }), b = ipcTransport(api, 2, { open: true });
  const ga = [], gb = []; a.onmessage = (x) => ga.push([...x]); b.onmessage = (x) => gb.push([...x]);
  api.emit('msg', { id: 2, data: [5, 6] }); api.emit('msg', { id: 1, data: [9] });
  assert.deepEqual(ga, [[9]]); assert.deepEqual(gb, [[5, 6]]);
  a.send(Uint8Array.from([1])); b.send(Uint8Array.from([2]));
  assert.deepEqual(api.sent, [[1, [1]], [2, [2]]]);
  const st = []; b.onstate = (s) => st.push(s);
  api.emit('state', { id: 1, state: 'closed' }); assert.equal(a.isOpen(), false); assert.equal(b.isOpen(), true); assert.deepEqual(st, []);
  api.emit('state', { id: 2, state: 'closed' }); assert.deepEqual(st, ['closed']);
});
t('een gesloten transport verstuurt niets; sluiten meldt de id', () => {
  const api = fakeApi(); const a = ipcTransport(api, 3);
  assert.equal(a.send(Uint8Array.from([1])), false);
  api.emit('state', { id: 3, state: 'open' }); assert.equal(a.send(Uint8Array.from([1])), true);
  a.close(); assert.deepEqual(api.closed, [3]); assert.equal(a.isOpen(), false);
});
t('de host krijgt voor elke nieuwe verbinding een transport (id vanaf 1, niet 0)', () => {
  const api = fakeApi(); const got = [];
  const off = listenForGuests(api, (tr) => got.push(tr.id));
  api.emit('conn', { id: 1 }); api.emit('conn', { id: 2 }); api.emit('conn', { id: 0 }); api.emit('conn', { id: 'x' }); api.emit('conn', null);
  assert.deepEqual(got, [1, 2]);
  off(); api.emit('conn', { id: 3 }); assert.deepEqual(got, [1, 2]);
});
t('opruimen: dispose haalt de luisteraar weg', () => {
  const api = fakeApi(); const a = ipcTransport(api, 1); assert.equal(api.listeners.size, 1); a.dispose(); assert.equal(api.listeners.size, 0);
});
console.log(`net_ipctransport_test: ${n}/${n} ok`);
