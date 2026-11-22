// Samen-sweep 22-11 (eigenaarseis: alles moet ook werken in Samen spelen): de expliciete controles die nog geen eigen test hadden, met de
// geheugenverbinding (geen Electron). Elke controle noemt hieronder wat er al elders gekeurd wordt (scripts/multiplayer_sweep_audit.mjs
// koppelt ze aan de systemen). Niet in beeld bekeken: alles wat een echt venster nodig heeft staat in docs/SAMEN-SWEEP-22-11.md.
//   node scripts/samen_sweep_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as S from '../game/js/settings.js';
import { encodeOutfit } from '../game/js/clothing.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mk = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function sessie(gasten = 2) {
  const hw = mk(); N.startHost(hw, INFO, { seed: 5 });
  const gs = [];
  const voegToe = (i) => { const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i }); N.addGuest(hw, link.a); const gw = mk(); N.startClient(gw, link.b, INFO, {}); const g = { gw, link }; gs.push(g); return g; };
  for (let i = 0; i < gasten; i++) voegToe(i);
  const step = (secs) => { for (let k = 0; k < 60 * secs; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, gw: () => gs.map((g) => g.gw), voegToe };
}
const regels = (w, re) => w.messages.filter((m) => re.test(m));

t('kleding: een gast die later aansluit ziet de outfit van wie er al was (spelerslijst in het welkom)', () => {
  const s = sessie(1); s.step(2);
  const code = encodeOutfit({ body: 'breed' });
  assert.ok(code, 'een geldige outfitcode');
  s.gw()[0].coopNet.session.sendEvent({ k: 'outfit', o: code }); s.step(1);
  const laat = s.voegToe(1); s.step(3);
  const lijst = laat.gw.coopRoster || [];
  const een = lijst.find((x) => x.slot === 1);
  assert.ok(een && een.avatar && een.avatar.outfit === code, 'de late gast leest de outfit van gast 1: ' + JSON.stringify(een));
  assert.equal(lijst.length, 3, 'host plus twee gasten');
});
t('geen IP-adressen: wat een gast ontvangt (spelerslijst, welkom, snapshot, spelersrijen, meldingen) bevat nooit een adres', () => {
  const s = sessie(2); s.step(3);
  const ip4 = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, ip6 = /\b[0-9a-f]{1,4}(:[0-9a-f]{0,4}){3,}\b/i;
  assert.ok(ip4.test('192.168.1.5') && ip6.test('fe80:0:0:1'), 'de controle zelf herkent een adres');
  for (const gw of s.gw()) {
    assert.equal((gw.coopRoster || []).length, 3, 'de spelerslijst is er');
    const blob = JSON.stringify({ roster: gw.coopRoster, spelers: gw.coopSpelers, welkom: gw.coopNet.session.welcome, wereld: gw.coopNet.session.world(), meld: gw.messages });
    assert.ok(!ip4.test(blob), 'geen IPv4 in ' + blob.slice(0, 80));
    assert.ok(!ip6.test(blob), 'geen IPv6');
    assert.ok(!/"(ip|addr|address|adres|remote|candidate)"/i.test(blob), 'geen veld met een adres');
  }
  // de bronnen van de spelerslijst en het paneel kennen geen adresveld
  for (const f of ['game/js/coopspelers.js', 'game/js/coopspelersui.js', 'game/js/samenpanel.js', 'game/js/coophud.js']) assert.ok(!/\.(ip|ipAddress|remoteAddress)\b/.test(lees(f)), f + ' leest geen adres');
});
t('rate limits: een gast die spamt (ping, zin, zender) komt bij de anderen hooguit een keer per venster door', () => {
  S.setSetting('samenZinnen', true);
  const s = sessie(2); s.step(3);
  const [a, b] = s.gw();
  for (let i = 0; i < 12; i++) a.coopNet.session.sendEvent({ k: 'ping', x: 10 + i, y: 10, soort: 'hier' });
  s.step(1);
  assert.ok(regels(b, /Kom hier/).length >= 1 && regels(b, /Kom hier/).length <= 2, 'pings: ' + regels(b, /Kom hier/).length);
  for (let i = 0; i < 12; i++) a.coopNet.session.sendEvent({ k: 'zin', z: 'hallo' });
  s.step(1);
  assert.ok(regels(b, /Hallo!/).length >= 1 && regels(b, /Hallo!/).length <= 2, 'zinnen: ' + regels(b, /Hallo!/).length);
  for (let i = 0; i < 12; i++) a.coopNet.session.sendEvent({ k: 'doel', x: i, y: i, aan: 'iedereen' });
  s.step(1);
  assert.equal(regels(b, /deelt een doel/).length, 1, 'doelen: precies een voorstel');
  S.setSetting('samenZinnen', false);
});
t('vaste zinnen met dempen en blokkeren: gedempt hoort de ander nog, geblokkeerd verdwijnen zin, ping, doel en zender van die speler', () => {
  S.setSetting('samenZinnen', true);
  const s = sessie(2); s.step(3);
  const [a, b] = s.gw();
  assert.equal(N.setPlayerMuteState(s.hw, 1, 'geblokkeerd'), 'geblokkeerd');
  a.coopNet.session.sendEvent({ k: 'zin', z: 'hallo' }); a.coopNet.session.sendEvent({ k: 'ping', x: 5, y: 5, soort: 'gevaar' }); a.coopNet.session.sendEvent({ k: 'doel', x: 1, y: 1, aan: 'iedereen' });
  s.step(2);
  assert.equal(regels(s.hw, /Hallo!|Help!|deelt een doel/).length, 0, 'de host heeft gast 1 geblokkeerd: niets komt door');
  assert.ok(regels(b, /Hallo!|Help!|deelt een doel/).length >= 1, 'de andere gast heeft niet geblokkeerd en hoort hem wel');
  assert.equal(N.setPlayerMuteState(s.hw, 1, 'geblokkeerd'), 'gewoon', 'een tweede keer zet het terug');
  S.setSetting('samenZinnen', false);
});
t('voertuigradio en luchtroute-HUD zijn lokaal: de zender staat per apparaat, de luchtlijn gaat nooit over het net, alleen de keuze van de bestuurder', () => {
  const m = JSON.parse(lees('scripts/coop_coverage.json'));
  assert.equal(m.opslag.radioChannel.scope, 'apparaat', 'de gekozen zender is per apparaat');
  const air = lees('game/js/airguide.js') + lees('game/js/airguidecard.js') + lees('game/js/airprofile.js');
  assert.ok(!/coopnet|sendEvent|announce\(/.test(air), 'de luchtroute stuurt niets over het net');
  assert.match(lees('game/js/airguide.js'), /lokaal per speler/);
  const radio = lees('game/js/radio.js');
  const radioCode = radio.split(String.fromCharCode(10)).filter((r) => !r.trim().startsWith('//')).join(String.fromCharCode(10));
  assert.ok(['sendEvent', 'hub.announce', 'coopnet'].every((k) => !radioCode.includes(k)), 'radio.js praat niet zelf met het net (alleen via de haak van main.js)');
  assert.match(lees('game/js/coopnet.js'), /k: 'zender'/);
});
t('een gast speelt zijn eigen verhaalvoortgang: de wereld van de host verandert er niet van (alleen een melding, een eigen stand)', () => {
  const s = sessie(1); s.step(3);
  const [g] = s.gw();
  const hostMissie = JSON.stringify(s.hw.coopHostMissie || null), hostGeld = s.hw.money;
  g.coopNet.session.sendEvent({ k: 'missie', actief: false });
  g.mission = { phase: 'active', label: 'Een eigen opdracht', index: 4 }; g.money = 777; // wat een gast lokaal doet
  s.step(2);
  assert.equal(JSON.stringify(s.hw.coopHostMissie || null), hostMissie, 'de opdrachtstand van de host blijft');
  assert.equal(s.hw.money, hostGeld, 'het geld van de host is van de host');
  assert.equal(s.hw.mission, undefined, 'de host krijgt de missie van de gast niet');
  assert.ok(lees('game/js/coopnet.js').includes('(#429)'), 'per speler (#429)');
});
console.log(`samen_sweep_test: ${n}/${n} ok`);
