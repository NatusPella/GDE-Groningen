// Coöp fase 5 (#95): lobby-toestandsmachine (game/js/lobby.js).
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const run = (...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby());

t('start biedt drie keuzes, allemaal Nederlands, zonder internet-belofte', () => {
  const v = L.view(L.createLobby());
  assert.equal(v.buttons.length, 3);
  assert.match(v.lines.join(' '), /niets via internet/);
});
t('host-pad: kies, code, antwoord, verbinden, verbonden', () => {
  let s = run({ t: 'kies', mode: L.MODES.HOST });
  assert.equal(s.step, 'host-maakt-code');
  s = L.reduce(s, { t: 'code', code: 'GDE1.O.abc.1234' });
  const v = L.view(s);
  assert.equal(v.code, 'GDE1.O.abc.1234'); assert.ok(v.input);
  assert.ok(v.buttons.some((b) => b.act === 'koppel'));
  s = L.reduce(L.reduce(s, { t: 'verbinden' }), { t: 'status', status: 'ok' });
  assert.equal(s.step, 'verbonden');
});
t('gast-pad: plak, antwoordcode, verbonden', () => {
  let s = run({ t: 'kies', mode: L.MODES.GAST });
  assert.equal(s.step, 'gast-plakt'); assert.ok(L.view(s).input);
  s = L.reduce(s, { t: 'code', code: 'GDE1.A.x.1' }); assert.equal(s.step, 'gast-wacht-host');
});
t('lag houdt de sessie, lost geeft hervatten, hervatten kiest weer het juiste pad', () => {
  let s = run({ t: 'kies', mode: L.MODES.HOST }, { t: 'status', status: 'ok' }, { t: 'status', status: 'lag' });
  assert.equal(s.step, 'verbonden'); assert.match(L.view(s).lines[0], /haperde/);
  s = L.reduce(s, { t: 'status', status: 'lost' }); assert.equal(s.step, 'verbroken');
  assert.ok(L.view(s).buttons.some((b) => b.act === 'hervat'));
  assert.equal(L.reduce(s, { t: 'hervat' }).step, 'host-maakt-code');
  const g = run({ t: 'kies', mode: L.MODES.GAST }, { t: 'status', status: 'lost' });
  assert.equal(L.reduce(g, { t: 'hervat' }).step, 'gast-plakt');
});
t('geweigerd toont de Nederlandse reden', () => {
  const s = run({ t: 'kies', mode: L.MODES.GAST }, { t: 'status', status: 'geweigerd', reason: 'versie' });
  assert.equal(L.view(s).lines[0], REASON_TEXT.versie);
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'start');
});
t('uit een lopende sessie ga je niet per ongeluk terug', () => {
  const s = run({ t: 'kies', mode: L.MODES.HOST }, { t: 'status', status: 'ok' });
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'verbonden');
  assert.equal(L.reduce(s, { t: 'verbreek' }).step, 'start');
});
t('fout blijft zichtbaar tot de volgende stap', () => {
  let s = run({ t: 'kies', mode: L.MODES.HOST }, { t: 'fout', msg: 'De code is beschadigd.' });
  assert.equal(L.view(s).error, 'De code is beschadigd.');
  s = L.reduce(s, { t: 'code', code: 'x' }); assert.equal(L.view(s).error, '');
});
t('elke stap heeft een weergave met alleen Nederlandse knoppen', () => {
  for (const step of ['start', 'lokaal', 'host-maakt-code', 'host-wacht-antwoord', 'gast-plakt', 'gast-wacht-host', 'verbinden', 'verbonden', 'verbroken', 'geweigerd']) {
    const v = L.view({ ...L.createLobby(), step, reason: 'tegels' });
    assert.ok(v.title && v.buttons.length >= 1, step);
    for (const b of v.buttons) assert.ok(/^[A-Z]/.test(b.label), b.label);
  }
});
t('statusbadge en lagbeleid', () => {
  assert.deepEqual(L.statusBadge('ok', 0.05), { level: 'goed', text: 'Verbonden' });
  assert.equal(L.statusBadge('ok', 0.4).level, 'traag');
  assert.equal(L.statusBadge('lost').text, 'Verbinding weg');
  assert.deepEqual(L.lagPolicy(0.1), { freezeRemote: false, badge: false, takeover: false });
  assert.deepEqual(L.lagPolicy(2), { freezeRemote: true, badge: true, takeover: false });
  assert.equal(L.lagPolicy(6).takeover, true);
});
console.log(`lobby_test: ${n}/${n} ok`);
