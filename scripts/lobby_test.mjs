// Coöp (#95): lobby-toestandsmachine (game/js/lobby.js).
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));
const ON = { online: true, hasCoopSave: true, hasSoloSave: true };

t('start: in de webversie alleen "Op één scherm"; in de desktop-app ook online', () => {
  assert.equal(L.view(L.createLobby({})).buttons.length, 1);
  assert.match(L.view(L.createLobby({})).lines.join(' '), /desktop-app/);
  assert.equal(L.view(L.createLobby(ON)).buttons.length, 3);
  assert.match(L.view(L.createLobby(ON)).lines.join(' '), /Tammo/);
});
t('online kiezen zonder desktop-app geeft een melding en blijft op start', () => {
  const s = run({}, { t: 'kies', mode: L.MODES.HOST });
  assert.equal(s.step, 'start'); assert.match(s.error, /desktop-app/);
});
t('save kiezen: verder alleen met coöp-save, solo alleen met solosave; solosave blijft ongemoeid', () => {
  const s = run(ON, { t: 'kies', mode: L.MODES.HOST });
  const acts = L.view(s).buttons.map((b) => b.act);
  assert.deepEqual(acts, ['bewaar-verder', 'bewaar-nieuw', 'bewaar-solo', 'terug']);
  const none = L.view(run({ online: true }, { t: 'kies', mode: L.MODES.HOST })).buttons.map((b) => b.act);
  assert.deepEqual(none, ['bewaar-nieuw', 'terug']);
  assert.match(L.view(s).lines.join(' '), /ongemoeid/);
});
t('host-pad: kies, save, code (met router), gast sluit aan', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'bewaar', src: L.SAVES.NIEUW });
  assert.equal(s.step, 'host-maakt-code'); assert.equal(s.save, 'nieuw');
  s = L.reduce(s, { t: 'code', code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D' });
  const v = L.view(s);
  assert.equal(v.code, 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B');
  assert.match(v.lines.join(' '), /lokale code: GDE2-192/);
  s = L.reduce(s, { t: 'status', status: 'ok' }); assert.equal(s.step, 'verbonden');
});
t('mislukte UPnP: de melding en de lokale code staan in beeld', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'bewaar', src: 'nieuw' }, { t: 'code', code: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', note: 'Je router antwoordt niet op automatisch poorten openen.' });
  const lines = L.view(s).lines.join(' ');
  assert.match(lines, /router antwoordt niet/); assert.doesNotMatch(lines, /lokale code:/, 'niet dubbel');
});
t('gast-pad: code typen, verbinden, verbonden; geweigerd toont de reden', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.GAST });
  assert.equal(s.step, 'gast-typt'); assert.ok(L.view(s).input);
  s = L.reduce(L.reduce(s, { t: 'verbinden' }), { t: 'status', status: 'geweigerd', reason: 'versie' });
  assert.equal(L.view(s).lines[0], REASON_TEXT.versie);
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'start');
});
t('lokaal-pad', () => {
  const s = run(ON, { t: 'kies', mode: L.MODES.LOKAAL }, { t: 'bewaar', src: 'verder' });
  assert.equal(s.step, 'lokaal'); assert.match(L.view(s).lines[0], /IJKL/);
});
t('lag houdt de sessie, lost geeft hervatten per rol', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'bewaar', src: 'nieuw' }, { t: 'status', status: 'ok' }, { t: 'status', status: 'lag' });
  assert.equal(s.step, 'verbonden'); assert.match(L.view(s).lines[0], /haperde/);
  s = L.reduce(s, { t: 'status', status: 'lost' }); assert.equal(s.step, 'verbroken');
  assert.equal(L.reduce(s, { t: 'hervat' }).step, 'host-wacht');
  const g = run(ON, { t: 'kies', mode: L.MODES.GAST }, { t: 'status', status: 'lost' });
  assert.equal(L.reduce(g, { t: 'hervat' }).step, 'gast-typt');
});
t('uit een lopende sessie ga je alleen met verbreken; caps blijven bewaard', () => {
  const s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'bewaar', src: 'nieuw' }, { t: 'status', status: 'ok' });
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'verbonden');
  const v = L.reduce(s, { t: 'verbreek' }); assert.equal(v.step, 'start'); assert.equal(v.caps.online, true);
});
t('fout blijft zichtbaar tot de volgende stap', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.GAST }, { t: 'fout', msg: 'De code klopt niet.' });
  assert.equal(L.view(s).error, 'De code klopt niet.');
  s = L.reduce(s, { t: 'verbinden' }); assert.equal(L.view(s).error, '');
});
t('elke stap heeft een weergave met Nederlandse knoppen', () => {
  for (const step of ['start', 'save-kiezen', 'lokaal', 'host-maakt-code', 'host-wacht', 'gast-typt', 'verbinden', 'verbonden', 'verbroken', 'geweigerd']) {
    const v = L.view({ ...L.createLobby(ON), step, reason: 'tegels' });
    assert.ok(v.title && v.buttons.length >= 1, step);
    for (const b of v.buttons) assert.ok(/^[A-Z]/.test(b.label), b.label);
  }
});
t('statusbadge en lagbeleid', () => {
  assert.deepEqual(L.statusBadge('ok', 0.05), { level: 'goed', text: 'Verbonden' });
  assert.equal(L.statusBadge('ok', 0.4).level, 'traag'); assert.equal(L.statusBadge('lost').text, 'Verbinding weg');
  assert.deepEqual(L.lagPolicy(0.1), { freezeRemote: false, badge: false, takeover: false });
  assert.deepEqual(L.lagPolicy(2), { freezeRemote: true, badge: true, takeover: false });
  assert.equal(L.lagPolicy(6).takeover, true);
});
console.log(`lobby_test: ${n}/${n} ok`);
