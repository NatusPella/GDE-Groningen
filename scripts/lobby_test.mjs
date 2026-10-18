// Samen spelen (#95): uitnodigscherm als toestandsmachine (game/js/lobby.js).
import assert from 'node:assert/strict';
import * as L from '../game/js/lobby.js';
import { REASON_TEXT } from '../game/js/net/protocol.js';
import { makeCode } from '../game/js/net/pairing.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const run = (caps, ...evs) => evs.reduce((s, e) => L.reduce(s, e), L.createLobby(caps));
const APP = { direct: true, rtc: true };
const WEB = { direct: false, rtc: true };
const DIRECT_CODE = makeCode({ ip: '84.12.34.56', port: 41000, key: 'ABCDEFGH' });

t('start: twee keuzes, geen keuze per save of bij het starten', () => {
  const v = L.view(L.createLobby(APP));
  assert.deepEqual(v.buttons.map((b) => b.act), ['kies-host', 'kies-gast']);
  assert.deepEqual(v.buttons.map((b) => b.label), ['Iemand uitnodigen', 'Code of adres invoeren']);
  assert.match(v.lines[0], /eigen voortgang/); assert.match(v.lines[0], /Tammo/);
});
t('methode: kamercode altijd, IP-adres alleen in de desktop-app', () => {
  assert.deepEqual(L.view(run(APP, { t: 'kies', rol: 'host' })).buttons.map((b) => b.act), ['route-kamer', 'route-direct', 'terug']);
  assert.deepEqual(L.view(run(WEB, { t: 'kies', rol: 'host' })).buttons.map((b) => b.act), ['route-kamer', 'terug']);
  const s = run(WEB, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' });
  assert.equal(s.step, 'methode'); assert.match(s.error, /desktop-app/);
});
t('nooit stilzwijgend verbinden: de toestemming komt eerst, met de vaste tekst', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' });
  assert.equal(s.step, 'toestemming');
  const v = L.view(s);
  assert.equal(v.lines[0], 'Voor samen spelen wordt je IP-adres gedeeld met je medespeler en worden openbare servers gebruikt om elkaar te vinden.');
  assert.deepEqual(v.buttons.map((b) => b.label), ['Akkoord en verbinden', 'Annuleren']);
  assert.match(L.view(run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' })).lines[0], /geen servers van anderen/);
  assert.equal(L.reduce(s, { t: 'code', code: 'x' }).step, 'host-wacht', 'code zonder akkoord komt niet voor in de UI: akkoord vooraf');
  assert.equal(L.reduce(run(APP, { t: 'kies', rol: 'host' }), { t: 'akkoord' }).step, 'methode', 'akkoord werkt alleen op het toestemmingsscherm');
});
t('host-pad (kamercode): akkoord, code tonen, gast verbindt, Tessa naast je', () => {
  let s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'kamer' }, { t: 'akkoord' });
  assert.equal(s.step, 'host-maakt-code');
  s = L.reduce(s, { t: 'code', code: 'K3J9D-8F2MN' });
  const v = L.view(s); assert.equal(v.code, 'K3J9D-8F2MN'); assert.match(v.lines[0], /Tessa naast je/);
  s = L.reduce(s, { t: 'status', status: 'ok' });
  assert.equal(s.step, 'verbonden'); assert.match(L.view(s).lines[0], /Tessa/);
  assert.equal(L.view(s).buttons[0].label, 'Gast verwijderen');
});
t('host-pad (IP-adres): zonder UPnP de melding en de lokale code in beeld, niet dubbel', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'route', route: 'direct' }, { t: 'akkoord' },
    { t: 'code', code: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', lanCode: 'GDE2-192.168.1.5:41000-ABCDEFGH-3C4D', note: 'Je router antwoordt niet op automatisch poorten openen.' });
  const lines = L.view(s).lines.join(' ');
  assert.match(lines, /router antwoordt niet/); assert.doesNotMatch(lines, /lokale code:/);
});
t('gast typt: kamercode of koppelcode wordt herkend, rommel krijgt een Nederlandse melding', () => {
  assert.deepEqual(L.classifyInput('k3j9d-8f2mn'), { ok: true, route: 'kamer', room: 'K3J9D8F2MN' });
  assert.equal(L.classifyInput(DIRECT_CODE).route, 'direct');
  assert.match(L.classifyInput('').reason, /niets/);
  assert.match(L.classifyInput('hallo wereld').reason, /geen kamercode/);
  assert.match(L.classifyInput('GDE2-1.2.3.4:41000-ABCDEFGH-0000').reason, /klopt niet/);
});
t('gast-pad: invoer, toestemming, akkoord, verbinden, verbonden', () => {
  let s = run(WEB, { t: 'kies', rol: 'gast' });
  assert.ok(L.view(s).input);
  s = L.reduce(s, { t: 'invoer', text: 'K3J9D-8F2MN' });
  assert.equal(s.step, 'toestemming'); assert.equal(s.invoer.room, 'K3J9D8F2MN');
  s = L.reduce(s, { t: 'akkoord' }); assert.equal(s.step, 'verbinden');
  s = L.reduce(s, { t: 'status', status: 'ok' });
  assert.equal(s.step, 'verbonden'); assert.equal(L.view(s).buttons[0].label, 'Spel verlaten');
  assert.match(L.view(s).lines.join(' '), /terug waar je was/);
});
t('gast in de browser kan geen adres van de directe route gebruiken', () => {
  const s = run(WEB, { t: 'kies', rol: 'gast' }, { t: 'invoer', text: DIRECT_CODE });
  assert.equal(s.step, 'gast-typt'); assert.match(s.error, /desktop-app/);
});
t('de laatste code staat alvast ingevuld; geweigerd toont de reden en terug gaat naar start', () => {
  let s = run({ ...APP, laatsteCode: 'K3J9D-8F2MN' }, { t: 'kies', rol: 'gast' });
  assert.equal(L.view(s).input.value, 'K3J9D-8F2MN');
  s = L.reduce(L.reduce(s, { t: 'verbinden' }), { t: 'status', status: 'geweigerd', reason: 'versie' });
  assert.equal(L.view(s).lines[0], REASON_TEXT.versie);
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'start');
});
t('wegvallen: spel pauzeert en wacht; host kan Alleen verder, gast Stoppen; hervatten per rol', () => {
  let h = run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' }, { t: 'status', status: 'lag' });
  assert.match(L.view(h).lines.join(' '), /haperde/);
  h = L.reduce(h, { t: 'status', status: 'lost' });
  assert.match(L.view(h).lines[0], /staat stil/);
  assert.deepEqual(L.view(h).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Alleen verder']);
  assert.equal(L.reduce(h, { t: 'hervat' }).step, 'host-maakt-code');
  const g = run(APP, { t: 'kies', rol: 'gast' }, { t: 'status', status: 'lost' });
  assert.deepEqual(L.view(g).buttons.map((b) => b.label), ['Opnieuw verbinden', 'Stoppen']);
  assert.equal(L.reduce(g, { t: 'hervat' }).step, 'gast-typt');
});
t('het wacht-scherm tijdens het spel start direct op "verbroken"', () => {
  const s = L.createLobby({ direct: true, start: 'verbroken', rol: 'host' });
  assert.equal(L.view(s).buttons[1].label, 'Alleen verder');
});
t('uit een lopende sessie ga je alleen met verbreken; de ander weg zet alles terug', () => {
  const s = run(APP, { t: 'kies', rol: 'host' }, { t: 'status', status: 'ok' });
  assert.equal(L.reduce(s, { t: 'terug' }).step, 'verbonden');
  assert.equal(L.reduce(s, { t: 'verbreek' }).step, 'start');
  assert.equal(L.reduce(s, { t: 'status', status: 'weg' }).step, 'start');
});
t('elke stap heeft een weergave met Nederlandse knoppen', () => {
  for (const step of ['start', 'methode', 'toestemming', 'host-maakt-code', 'host-wacht', 'gast-typt', 'verbinden', 'verbonden', 'verbroken', 'geweigerd']) {
    const v = L.view({ ...L.createLobby(APP), step, route: 'kamer', rol: 'host', reason: 'tegels' });
    assert.ok(v.title && v.buttons.length >= 1, step);
    for (const b of v.buttons) assert.ok(/^[A-Z]/.test(b.label), b.label);
  }
});
t('statusbadge en lagbeleid (na 5 s wacht het spel)', () => {
  assert.deepEqual(L.statusBadge('ok', 0.05), { level: 'goed', text: 'Verbonden' });
  assert.equal(L.statusBadge('ok', 0.4).level, 'traag'); assert.equal(L.statusBadge('lost').text, 'Verbinding weg');
  assert.deepEqual(L.lagPolicy(0.1), { freezeRemote: false, badge: false, hold: false });
  assert.equal(L.lagPolicy(6).hold, true);
});
console.log(`lobby_test: ${n}/${n} ok`);
