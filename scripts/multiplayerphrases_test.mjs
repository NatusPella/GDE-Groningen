// Samen spelen (#1159): snelle zinnen, emotes, dempen en blokkeren (game/js/multiplayerphrases.js) en het pad door coopnet.js met een geheugenverbinding.
// Pure en mock-test, geen Electron. Niet in beeld bekeken: het wiel (multiplayerphrasesradial.js) is alleen DOM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as Z from '../game/js/multiplayerphrases.js';
import * as N from '../game/js/coopnet.js';
import * as S from '../game/js/settings.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const staat = Z.createPhraseState;

// ---- de lijst en het lezen
t('de lijst: Nederlandse vaste zinnen, geen merken, elk id uniek, acht per pagina', () => {
  const ids = Z.PHRASES.map((z) => z.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of Z.RADIAL_PAGES) assert.ok(Z.makeRadial(p).length <= Z.RADIAL_SLOTS && Z.makeRadial(p).length >= 6, p);
  for (const z of Z.PHRASES) assert.ok(z.tekst.length > 3 && z.tekst.length <= 30, z.id);
  assert.ok(Z.PHRASES.some((z) => z.soort === 'emote') && Z.PHRASES.some((z) => z.soort === 'zin'));
});
t('readPhrase: alleen een bekend id; eigen tekst, een doel-id en rommel vallen weg', () => {
  assert.equal(Z.readPhrase({ k: 'zin', z: 'dank' }).tekst, 'Dank je!');
  assert.equal(Z.readPhrase({ k: 'zin', z: 'zwaai' }).soort, 'emote');
  assert.equal(Z.readPhrase({ k: 'zin', z: 'doel-deel' }), null, 'een kaartactie gaat nooit als zin over het net');
  assert.equal(Z.readPhrase({ k: 'zin', z: 'Kom maar op!', tekst: 'vrije tekst' }), null);
  assert.equal(Z.readPhrase({ k: 'zin', z: 5 }), null); assert.equal(Z.readPhrase(null), null); assert.equal(Z.readPhrase({ k: 'ping', z: 'dank' }), null);
  assert.deepEqual(Z.phraseEvent('dank'), { k: 'zin', z: 'dank' }, 'over het net gaat alleen het id');
});
t('de regel: een zin tussen aanhalingstekens, een emote als handeling', () => {
  assert.equal(Z.phraseLine(Z.readPhrase({ k: 'zin', z: 'dank' }), 'Tessa'), 'Tessa: "Dank je!"');
  assert.equal(Z.phraseLine(Z.readPhrase({ k: 'zin', z: 'zwaai' }), 'Tessa'), 'Tessa zwaait.');
  assert.equal(Z.phraseLine(Z.readPhrase({ k: 'zin', z: 'dank' }), ''), '"Dank je!"');
});

// ---- dempen en blokkeren
t('dempen: geen zinnen en emotes, wel pings en doelen; blokkeren: niets; terugzetten kan', () => {
  const s = staat(), tessa = { slot: 1, naam: 'Tessa' };
  assert.equal(Z.muteStateOf(s, tessa), 'gewoon');
  assert.equal(Z.toggleMuteState(s, tessa, 'gedempt'), 'gedempt');
  assert.deepEqual(['zin', 'emote', 'ping', 'doel'].map((x) => Z.mayReceive(s, tessa, x)), [false, false, true, true]);
  assert.equal(Z.toggleMuteState(s, tessa, 'geblokkeerd'), 'geblokkeerd');
  assert.deepEqual(['zin', 'emote', 'ping', 'doel'].map((x) => Z.mayReceive(s, tessa, x)), [false, false, false, false]);
  assert.equal(Z.toggleMuteState(s, tessa, 'geblokkeerd'), 'gewoon', 'dezelfde knop nog eens zet terug');
  assert.ok(Z.mayReceive(s, tessa, 'zin'));
  assert.equal(Z.setMuteState(s, { slot: 0, naam: 'Tammo' }, 'gedempt', true), null, 'jezelf dempen kan niet');
  assert.equal(Z.setMuteState(s, tessa, 'raar'), null);
});
t('de stand blijft op naam: na een hostwissel (andere plekken) blijft Tessa gedempt en een ander niet', () => {
  const s = staat();
  Z.setMuteState(s, { slot: 1, naam: 'Tessa' }, 'gedempt');
  assert.equal(Z.muteStateOf(s, { slot: 3, naam: 'tessa' }), 'gedempt', 'zelfde naam, nieuwe plek');
  assert.equal(Z.muteStateOf(s, { slot: 1, naam: 'Rik' }), 'gewoon', 'de oude plek is nu een ander');
  Z.clearMuteStates(s); assert.equal(Z.muteStateOf(s, { slot: 3, naam: 'Tessa' }), 'gewoon');
});
t('zonder opslag: de standen staan niet in localStorage of de savegame', () => {
  const bron = fs.readFileSync(new URL('../game/js/multiplayerphrases.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/localStorage|sessionStorage|setSetting|JSON\.stringify/.test(bron), 'multiplayerphrases.js schrijft nergens');
});

// ---- rate limit en opt-in
t('rate limit: 1,5 s tussen zinnen en vijf per venster; per speler apart', () => {
  const s = staat();
  assert.equal(Z.allowPhrase(s, 1, 0), true); assert.equal(Z.allowPhrase(s, 1, 0.5), false, 'te snel');
  assert.equal(Z.allowPhrase(s, 2, 0.5), true, 'een andere speler heeft zijn eigen teller');
  for (let i = 1; i < 5; i++) assert.equal(Z.allowPhrase(s, 1, i * 2), true);
  assert.equal(Z.allowPhrase(s, 1, 10), false, 'zes in tien seconden: een te veel');
  assert.equal(Z.allowPhrase(s, 1, 40), true, 'later weer');
});
t('receivePhrase: opt-in, dempen en rate limit in één pad', () => {
  const s = staat(), a = { slot: 1, naam: 'Tessa' }, b = { k: 'zin', z: 'hallo' };
  assert.equal(Z.receivePhrase(s, b, a, 0, false).reden, 'uit', 'zonder opt-in ziet niemand iets');
  const r = Z.receivePhrase(s, b, a, 0, true); assert.ok(r.toon); assert.equal(r.regel, 'Tessa: "Hallo!"');
  assert.equal(Z.receivePhrase(s, b, a, 0.2, true).reden, 'te-snel');
  Z.setMuteState(s, a, 'gedempt'); assert.equal(Z.receivePhrase(s, b, a, 9, true).reden, 'gedempt');
  assert.equal(Z.receivePhrase(s, { k: 'zin', z: 'nep' }, a, 9, true).reden, 'onbekend');
});

// ---- het wiel
t('het wiel: acht plekken, toets 1 t/m 8 in de knop, de stick kiest op richting', () => {
  const w = Z.makeRadial('zinnen');
  assert.deepEqual(w.map((x) => x.toets), ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.equal(Z.radialFromKey('zinnen', '2').id, w[1].id); assert.equal(Z.radialFromKey('zinnen', '9'), null);
  assert.equal(Z.radialFromStick('zinnen', 0, -1).id, w[0].id, 'omhoog is plek 1');
  assert.equal(Z.radialFromStick('zinnen', 1, 0).id, w[2].id, 'rechts is plek 3');
  assert.equal(Z.radialFromStick('zinnen', 0, 1).id, w[4].id, 'omlaag is plek 5');
  assert.equal(Z.radialFromStick('zinnen', -1, 0).id, w[6].id, 'links is plek 7');
  assert.equal(Z.radialFromStick('zinnen', 0.1, 0.1), null, 'binnen de dode zone niets');
  assert.equal(Z.radialFromStick('zinnen', NaN, 1), null);
  assert.equal(Z.nextPage('zinnen'), 'emotes'); assert.equal(Z.nextPage('emotes'), 'zinnen');
  assert.ok(Z.makeRadial('emotes').some((x) => x.soort === 'doel'), 'doel delen en pingen staan op de tweede pagina');
});
t('de knoppen: toets in de knop en controller in de bron van het wiel; geen vrij invoerveld', () => {
  const ui = fs.readFileSync(new URL('../game/js/multiplayerphrasesradial.js', import.meta.url), 'utf8');
  assert.match(ui, /glyphHtml\(w\.toets\)/, 'de toets staat in de knop (keycap)');
  assert.match(ui, /getGamepads/, 'de controller kiest met de stick');
  assert.ok(!/<input|<textarea|contenteditable/.test(ui), 'geen vrije tekst (constitutie 10)');
  const c = fs.readFileSync(new URL('../game/js/controls.js', import.meta.url), 'utf8');
  assert.match(c, /\['t', 'Samen spelen: het wiel/); assert.match(c, /x: 't'/);
});

// ---- over de geheugenverbinding: host en twee gasten
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mk = () => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false } });
function session(gasten = 2) {
  const hw = mk(); N.startHost(hw, INFO, { seed: 5 });
  const gs = [];
  for (let i = 0; i < gasten; i++) { const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i }); N.addGuest(hw, link.a); const gw = mk(); N.startClient(gw, link.b, INFO, {}); gs.push({ gw, link }); }
  const step = (secs) => { for (let k = 0; k < 60 * secs; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, gw: gs.map((g) => g.gw) };
}
const phraseLines = (w) => w.messages.filter((m) => /"|zwaait|klapt|lacht/.test(m));

t('opt-in: zonder instelling verstuurt een speler niets en ziet hij niets', () => {
  S.setSetting('samenZinnen', false);
  const s = session(2); s.step(2);
  assert.equal(N.sayPhrase(s.gw[0], 'hallo'), false, 'zonder opt-in geen zin');
  assert.equal(N.sayPhrase(s.hw, 'hallo'), false);
  S.setSetting('samenZinnen', true);
  assert.equal(N.sayPhrase(s.gw[0], 'hallo'), true);
  S.setSetting('samenZinnen', false);
  s.step(1);
  assert.deepEqual(phraseLines(s.hw).concat(phraseLines(s.gw[1])), [], 'wie niet heeft aangezet ziet de zin niet');
});
t('een gast zegt iets: de host en de andere gast zien de zin met de naam van de afzender', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  assert.equal(N.sayPhrase(s.gw[0], 'dank'), true); s.step(1);
  assert.ok(phraseLines(s.hw).some((m) => /"Dank je!"/.test(m)), 'host ziet de zin');
  assert.ok(phraseLines(s.gw[1]).some((m) => /"Dank je!"/.test(m)), 'de andere gast ook');
  assert.ok(!phraseLines(s.gw[0]).some((m) => /Tessa: "Dank je!"|Tammo: "Dank je!"/.test(m)), 'de afzender krijgt geen echo van een ander');
  assert.equal(N.sayPhrase(s.gw[0], 'hulp'), false, 'binnen 1,5 s nog een zin kan niet (rate limit)');
  assert.equal(N.sayPhrase(s.gw[0], 'tekst-van-mij'), false, 'een onbekend id gaat nergens heen');
  S.setSetting('samenZinnen', false);
});
t('de host zegt iets en een gast dempt hem: geen zin, wel een ping; blokkeren stopt ook de ping', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  const [a, b] = s.gw;
  assert.equal(N.setPlayerMuteState(a, 0, 'gedempt'), 'gedempt'); assert.equal(N.playerMuteState(a, 0), 'gedempt');
  assert.equal(N.sayPhrase(s.hw, 'zwaai'), true); s.step(1);
  assert.ok(phraseLines(b).some((m) => /zwaait/.test(m)), 'gast 2 had niet gedempt');
  assert.ok(!phraseLines(a).some((m) => /zwaait/.test(m)), 'gast 1 heeft hem gedempt');
  N.sendPing(s.hw, 5, 6, 'hier'); s.step(1);
  assert.ok(a.coopPings.lijst.some((p) => p.van === '0'), 'een ping van een gedempte speler komt wel aan');
  N.setPlayerMuteState(a, 0, 'gedempt'); N.setPlayerMuteState(a, 0, 'geblokkeerd'); s.step(4);
  const voor = a.coopPings.lijst.length;
  N.sendPing(s.hw, 50, 60, 'hier'); s.step(1);
  assert.equal(a.coopPings.lijst.filter((p) => p.x === 50).length, 0, 'een geblokkeerde speler pingt niet bij je');
  assert.ok(b.coopPings.lijst.some((p) => p.x === 50), 'de ander ziet de ping wel');
  assert.ok(voor >= 0);
  assert.equal(N.setPlayerMuteState(a, 1, 'gedempt'), null, 'jezelf dempen kan niet (plek 1 is gast 1)');
  S.setSetting('samenZinnen', false);
});
t('de host begrenst wat hij doorstuurt: een gast die spamt bereikt de anderen niet vaker dan de rate limit', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  const before = phraseLines(s.gw[1]).length;
  for (let i = 0; i < 12; i++) { s.gw[0].coopNet.session.sendEvent({ k: 'zin', z: 'hallo' }); }
  s.step(2);
  assert.ok(phraseLines(s.gw[1]).length - before <= 1, 'twaalf berichten in een oogwenk: hoogstens één komt door');
  S.setSetting('samenZinnen', false);
});

console.log(`multiplayerphrases_test: ${n} ok`);
process.exit(0);
