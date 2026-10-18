// Coöp (#95): lobby-toestandsmachine en menukeuze-logica (game/js/lobby.js).
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));
const ON = { online: true, actie: 'doorgaan' };

t('modus: in de webversie Alleen en Samen op één scherm; in de desktop-app ook online', () => {
  const web = L.view(L.createLobby({ actie: 'nieuw' }));
  assert.deepEqual(web.buttons.map((b) => b.act), ['kies-alleen', 'kies-lokaal', 'terug']);
  assert.match(web.lines.join(' '), /desktop-app/);
  const app = L.view(L.createLobby(ON));
  assert.deepEqual(app.buttons.map((b) => b.act), ['kies-alleen', 'kies-lokaal', 'kies-host', 'kies-gast', 'terug']);
  assert.match(app.lines.join(' '), /Tammo/);
});
t('de keuze is per sessie en geldt voor Nieuw spel én Doorgaan; de voortgang is één', () => {
  assert.equal(L.view(L.createLobby({ online: true, actie: 'nieuw' })).title, 'Nieuw spel');
  assert.equal(L.view(L.createLobby(ON)).title, 'Doorgaan');
  assert.match(L.view(L.createLobby(ON)).lines.join(' '), /één en dezelfde/);
});
t('online kiezen zonder desktop-app geeft een melding en blijft op de keuze', () => {
  const s = run({}, { t: 'kies', mode: L.MODES.HOST });
  assert.equal(s.step, 'modus'); assert.match(s.error, /desktop-app/);
  assert.equal(run({}, { t: 'kies', mode: L.MODES.GAST }).step, 'modus');
});
t('alleen en lokaal: bevestigingsstap, daarna starten', () => {
  assert.equal(run(ON, { t: 'kies', mode: L.MODES.ALLEEN }).step, 'alleen');
  const s = run(ON, { t: 'kies', mode: L.MODES.LOKAAL });
  assert.equal(s.step, 'lokaal'); assert.match(L.view(s).lines[0], /IJKL/);
  assert.deepEqual(L.view(s).buttons.map((b) => b.act), ['start-lokaal', 'terug']);
});
t('host-pad: kies, code (met router), gast sluit aan', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.HOST });
  assert.equal(s.step, 'host-maakt-code');
  s = L.reduce(s, { t: 'code', code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D' });
  const v = L.view(s);
  assert.equal(v.code, 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B');
  assert.match(v.lines.join(' '), /lokale code: GDE2-192/);
  s = L.reduce(s, { t: 'status', status: 'ok' }); assert.equal(s.step, 'verbonden');
});
t('mislukte UPnP: de melding en de lokale code staan in beeld, niet dubbel', () => {
  const s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'code', code: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', note: 'Je router antwoordt niet op automatisch poorten openen.' });
  const lines = L.view(s).lines.join(' ');
  assert.match(lines, /router antwoordt niet/); assert.doesNotMatch(lines, /lokale code:/);
});
t('gast-pad: de laatste code staat alvast ingevuld; geweigerd toont de reden', () => {
  let s = run({ ...ON, laatsteCode: 'GDE2-1.2.3.4:41000-ABCDEFGH-0000' }, { t: 'kies', mode: L.MODES.GAST });
  assert.equal(s.step, 'gast-typt'); assert.equal(L.view(s).input.value, 'GDE2-1.2.3.4:41000-ABCDEFGH-0000');
  s = L.reduce(L.reduce(s, { t: 'verbinden' }), { t: 'status', status: 'geweigerd', reason: 'versie' });
  assert.equal(L.view(s).lines[0], REASON_TEXT.versie);
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'modus');
});
t('wegvallen: spel pauzeert en wacht; host kan Alleen verder, gast Stoppen; hervatten per rol', () => {
  let h = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'status', status: 'ok' }, { t: 'status', status: 'lag' });
  assert.equal(h.step, 'verbonden'); assert.match(L.view(h).lines[0], /haperde/);
  h = L.reduce(h, { t: 'status', status: 'lost' });
  assert.equal(h.step, 'verbroken');
  assert.match(L.view(h).lines[0], /staat stil/);
  assert.deepEqual(L.view(h).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Alleen verder']);
  assert.equal(L.reduce(h, { t: 'hervat' }).step, 'host-maakt-code');
  const g = run(ON, { t: 'kies', mode: L.MODES.GAST }, { t: 'status', status: 'lost' });
  assert.deepEqual(L.view(g).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Stoppen']);
  assert.equal(L.reduce(g, { t: 'hervat' }).step, 'gast-typt');
});
t('het wacht-scherm tijdens het spel start direct op "verbroken"', () => {
  const s = L.createLobby({ online: true, start: 'verbroken', mode: L.MODES.HOST });
  assert.equal(s.step, 'verbroken'); assert.equal(L.view(s).buttons[1].label, 'Alleen verder');
});
t('uit een lopende sessie ga je alleen met verbreken; caps blijven bewaard', () => {
  const s = run(ON, { t: 'kies', mode: L.MODES.HOST }, { t: 'status', status: 'ok' });
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'verbonden');
  const v = L.reduce(s, { t: 'verbreek' }); assert.equal(v.step, 'modus'); assert.equal(v.caps.online, true);
});
t('fout blijft zichtbaar tot de volgende stap', () => {
  let s = run(ON, { t: 'kies', mode: L.MODES.GAST }, { t: 'fout', msg: 'De code klopt niet.' });
  assert.equal(L.view(s).error, 'De code klopt niet.');
  s = L.reduce(s, { t: 'verbinden' }); assert.equal(L.view(s).error, '');
});
t('elke stap heeft een weergave met Nederlandse knoppen', () => {
  for (const step of ['modus', 'alleen', 'lokaal', 'host-maakt-code', 'host-wacht', 'gast-typt', 'verbinden', 'verbonden', 'verbroken', 'geweigerd']) {
    const v = L.view({ ...L.createLobby(ON), step, reason: 'tegels' });
    assert.ok(v.title && v.buttons.length >= 1, step);
    for (const b of v.buttons) assert.ok(/^[A-Z]/.test(b.label), b.label);
  }
});
t('statusbadge en lagbeleid (na 5 s wacht het spel)', () => {
  assert.deepEqual(L.statusBadge('ok', 0.05), { level: 'goed', text: 'Verbonden' });
  assert.equal(L.statusBadge('ok', 0.4).level, 'traag'); assert.equal(L.statusBadge('lost').text, 'Verbinding weg');
  assert.deepEqual(L.lagPolicy(0.1), { freezeRemote: false, badge: false, hold: false });
  assert.deepEqual(L.lagPolicy(2), { freezeRemote: true, badge: true, hold: false });
  assert.equal(L.lagPolicy(6).hold, true);
});
console.log(`lobby_test: ${n}/${n} ok`);
