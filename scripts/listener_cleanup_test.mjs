// Controleert dat multiplayer-UI zijn event-listeners via AbortController opruimt bij sluiten.
//   node scripts/listener_cleanup_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';

globalThis.navigator ??= {};
if (!globalThis.document.body) globalThis.document.body = globalThis.document.createElement('body');

const { mountLobby } = await import('../game/js/lobbyui.js');
const { koppelWissel, stopWisselUi } = await import('../game/js/multiplayerhostwisselui.js');

const winAdded = [];
globalThis.window.addEventListener = (ev, fn, opts) => winAdded.push({ ev, fn, opts });

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

const rootAdded = [];
const mockRoot = {
  innerHTML: '',
  querySelector: () => null,
  contains: () => true,
  addEventListener(ev, fn, opts) { rootAdded.push({ ev, fn, opts }); },
};

const lobby = mountLobby(mockRoot, { disconnect() {}, kick() {} });
ok(rootAdded.length === 5, 'lobbyui hangt 5 listeners aan root');
ok(rootAdded.every((x) => x.opts && x.opts.signal && x.opts.signal.aborted === false), 'alle lobby-listeners starten met actief AbortSignal');
const clickListener = rootAdded.find((x) => x.ev === 'click');
const terugBtn = { dataset: { act: 'terug' }, closest: () => terugBtn };
clickListener.fn({ target: terugBtn });
ok(rootAdded.every((x) => x.opts.signal.aborted === false), 'terug-klik laat lobby-listeners actief');
lobby.close();
ok(rootAdded.every((x) => x.opts.signal.aborted === true), 'lobby.close() abort alle listeners op root');

const world = { player: { x: 0, y: 0 }, coopWissel: null, coopWisselUi: null };
koppelWissel(world);
ok(winAdded.length === 1 && winAdded[0].ev === 'keydown', 'koppelWissel hangt keydown-listener aan window');
ok(winAdded[0].opts && winAdded[0].opts.signal && winAdded[0].opts.signal.aborted === false, 'wissel-listener heeft actief AbortSignal');
const world2 = { player: { x: 1, y: 1 }, coopWissel: null, coopWisselUi: null };
koppelWissel(world2);
ok(winAdded.length === 2 && winAdded[1].ev === 'keydown', 'koppelWissel voor nieuwe wereld hangt nieuwe window-listener');
ok(winAdded[0].opts.signal.aborted === true && winAdded[1].opts.signal.aborted === false, 'vorige wissel-listener is geabort bij wissel naar nieuwe wereld');
stopWisselUi();
ok(winAdded[1].opts.signal.aborted === true, 'stopWisselUi() abort de window-listener');

console.log(`listener_cleanup_test: ${n} checks ok`);
