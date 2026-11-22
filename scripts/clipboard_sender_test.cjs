// De klembord-ipc (desktop/main.js) weigert een afzender die niet de eigen hoofdframe van het spel is.
const { isGameSender } = require('../desktop/externurl.cjs');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FOUT', m); } };
const main = {};
const sender = { mainFrame: main, getURL: () => 'app://game/index.html' };
ok(isGameSender({ senderFrame: Object.assign(main, { url: 'app://game/index.html' }), sender }, 'app', 'game'), 'eigen hoofdframe mag');
ok(!isGameSender({ senderFrame: { url: 'app://game/index.html' }, sender }, 'app', 'game'), 'subframe mag niet');
ok(!isGameSender({ senderFrame: { url: 'https://example.org/' }, sender: { mainFrame: null } }, 'app', 'game'), 'vreemde pagina mag niet');
ok(!isGameSender({ senderFrame: { url: 'app://evil/' }, sender: { mainFrame: null } }, 'app', 'game'), 'andere host mag niet');
ok(isGameSender({ sender: { getURL: () => 'app://game/x.html' } }, 'app', 'game'), 'zonder senderFrame: getURL');
ok(!isGameSender({}, 'app', 'game') && !isGameSender(null, 'app', 'game'), 'leeg: nee');
if (fails) process.exit(1);
console.log('clipboard_sender_test: ok');
