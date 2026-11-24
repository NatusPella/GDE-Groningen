// Samen spelen (24-11): iedereen kan een gezamenlijke keuze voorstellen (tijd, slapen, reizen, laden, cheats, stoppen); geen hostrecht.
// Wie weg is, laadt of in een scène zit telt niet mee; cheats aan vraagt een eenstemmig ja; een nieuwe stemsoort is achterwaarts compatibel met een oude client.
// Dezelfde koppeling als in het spel (coopnet.js, hub, sessies) op een nep-wereld per speler, over een geheugentransport. Geen DOM, geen Electron.
//   node scripts/coop/samenstem_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import * as G from '../../game/js/coopgroep.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const tekstIn = (w, re) => w.messages.some((m) => re.test(m));

// een sessie met een host en `gasten` (elk met eigen wereld en eigen link)
function sessie(gasten = 1) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5, max: 6 });
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  }
  const step = (secs, f) => { for (let k = 0; k < 60 * secs; k++) { if (f) f(k); N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step };
}

const tijd = (w) => w.clock;

t('een gast stelt slapen voor: de host legt het de groep voor, de voorsteller telt als ja en de klok verspringt bij een eenstemmig ja', () => {
  const s = sessie(2); s.step(1);
  s.hw.clock = 22;
  let klaar = false;
  assert.equal(G.groepAkkoord(s.gs[0].gw, 'slapen', null, () => { klaar = true; }, null, { uur: 7.5 }), true, 'een gast mag voorstellen');
  s.step(0.3);
  const st = s.hw.coopNet.stem && s.hw.coopNet.stem.st;
  assert.ok(st && st.soort === 'slapen', 'de host opent de stemming');
  assert.equal(st.keuze[1], 'ja', 'de voorsteller telt als ja');
  assert.equal(st.keuze[0], 'wacht', 'de opener stemt ook mee, hij is niet de baas');
  assert.ok(s.gs[1].gw.coopStem, 'de andere gast ziet de vraag');
  assert.equal(s.gs[0].gw.coopStem, null, 'de voorsteller krijgt geen vraag');
  assert.equal(N.gastStem(s.gs[1].gw, true), true);
  assert.equal(N.hostStem(s.hw, true), true, 'de opener stemt ja');
  s.step(0.5);
  assert.equal(tijd(s.hw), 7.5, 'de klok van de wereld verspringt');
  assert.equal(klaar, true, 'de voorsteller voert zijn eigen deel uit');
});
t('een nee of geen antwoord laat de klok staan en loslaten roept naNee', () => {
  const s = sessie(2); s.step(1); s.hw.clock = 22;
  let nee = false;
  G.groepAkkoord(s.gs[0].gw, 'slapen', null, () => assert.fail('geen akkoord'), () => { nee = true; }, { uur: 7.5 });
  s.step(0.3);
  N.gastStem(s.gs[1].gw, false); N.hostStem(s.hw, true);
  s.step(0.5);
  assert.equal(tijd(s.hw), 22); assert.equal(nee, true);
  const s2 = sessie(2); s2.step(1); s2.hw.clock = 22;
  G.groepAkkoord(s2.gs[0].gw, 'slapen', null, () => assert.fail('geen akkoord'), null, { uur: 7.5 });
  s2.step(G.STEM_SEC + 1);
  assert.equal(tijd(s2.hw), 22, 'geen antwoord is nee');
});
t('wie in een scène zit of laadt telt niet mee', () => {
  const s = sessie(2); s.step(1); s.hw.clock = 22;
  s.gs[1].gw.coopCutBezig = 3; // de tweede gast zit in een scène
  let klaar = false;
  G.groepAkkoord(s.gs[0].gw, 'slapen', null, () => { klaar = true; }, null, { uur: 8 });
  s.step(0.3);
  assert.ok(!s.gs[1].gw.coopStem, 'de gast in de scène krijgt geen vraag');
  N.hostStem(s.hw, true); s.step(0.5);
  assert.equal(tijd(s.hw), 8, 'de rest was akkoord, de afwezige blokkeert niet'); assert.equal(klaar, true);
  const s2 = sessie(2); s2.step(1); s2.hw.clock = 22; s2.hw.coopCutBezig = 1; // de opener zit zelf in een scène
  G.groepAkkoord(s2.gs[0].gw, 'slapen', null, () => {}, null, { uur: 8 });
  s2.step(0.3); N.gastStem(s2.gs[1].gw, true); s2.step(0.5);
  assert.equal(tijd(s2.hw), 8, 'ook de opener telt niet mee als hij in een scène zit');
});
t('cheats aan vraagt een eenstemmig ja en geldt dan voor iedereen', () => {
  const s = sessie(2); s.step(1);
  assert.equal(G.cheatsUit(s.hw), true); assert.equal(G.cheatsUit(s.gs[0].gw), true);
  G.groepAkkoord(s.gs[0].gw, 'cheats', null, () => {});
  s.step(0.3);
  N.gastStem(s.gs[1].gw, true); N.hostStem(s.hw, false); s.step(0.5);
  assert.equal(G.cheatsUit(s.hw), true, 'een nee: cheats blijven uit');
  G.groepAkkoord(s.gs[0].gw, 'cheats', null, () => {});
  s.step(0.3);
  N.gastStem(s.gs[1].gw, true); N.hostStem(s.hw, true); s.step(0.6);
  assert.equal(G.cheatsUit(s.hw), false, 'iedereen ja: cheats aan');
  assert.equal(G.cheatsUit(s.gs[0].gw), false, 'ook bij de gast die het voorstelde'); assert.equal(G.cheatsUit(s.gs[1].gw), false, 'en bij de anderen');
});
t('een ander spel laden is een voorstel: bij ja stopt de sessie voor iedereen, de voorsteller laadt daarna zelf', () => {
  const s = sessie(1); s.step(1);
  let laad = false;
  G.groepAkkoord(s.gs[0].gw, 'laden', null, () => { laad = true; });
  s.step(0.3);
  assert.ok(s.hw.coopNet.stem && s.hw.coopNet.stem.st.soort === 'laden');
  N.hostStem(s.hw, true); s.step(3);
  assert.equal(laad, true, 'de voorsteller mag nu laden'); assert.equal(s.hw.coopNet, null, 'de sessie is gestopt');
});
t('de opener doet een voorstel op dezelfde manier als een gast: de anderen stemmen', () => {
  const s = sessie(1); s.step(1);
  let klaar = false;
  assert.equal(G.groepAkkoord(s.hw, 'onderduiken', null, () => { klaar = true; }), true);
  s.step(0.3); assert.ok(s.gs[0].gw.coopStem, 'de gast ziet de vraag');
  N.gastStem(s.gs[0].gw, true); s.step(0.5);
  assert.equal(klaar, true);
});
t('achterwaarts compatibel: een nieuwe soort gaat als oude soort over de draad, een oude client leest hem en een nieuwe client leest het echte woord', () => {
  const OUD = ['slapen', 'onderduiken', 'stoppen', 'keuze', 'moeilijkheid']; // wat een oude client accepteert
  for (const soort of ['laden', 'cheats', 'reizen']) {
    const ev = G.stemEvent({ id: 1, soort, tekst: 'Iris wil iets.', rest: 10 });
    assert.ok(OUD.includes(ev.soort), `${soort} gaat als ${ev.soort} over de draad`);
    assert.equal(typeof ev.tekst, 'string');
    assert.equal(G.leesStemEvent(ev).soort, soort, 'een nieuwe client herkent hem');
    assert.deepEqual(Object.keys(ev).filter((k) => !['k', 'id', 'soort', 'wat', 'tekst', 'sec'].includes(k)), [], 'geen onverwachte velden');
  }
  const gewoon = G.stemEvent({ id: 2, soort: 'slapen', tekst: 'x', rest: 10 });
  assert.equal(gewoon.wat, undefined, 'een oude soort heeft geen extra veld');
  assert.equal(G.leesStemEvent({ k: 'stem', id: 3, soort: 'moeilijkheid', wat: 'slapen', tekst: 't' }).soort, 'moeilijkheid', 'een wat dat niet bij de draadsoort hoort wordt genegeerd');
});
t('het stemverzoek en het afwezig-antwoord worden gecontroleerd bij ontvangst', () => {
  assert.equal(G.leesStemVerzoek({ k: 'stemverzoek', soort: 'hacken' }), null);
  assert.equal(G.leesStemVerzoek({ k: 'stemverzoek', soort: 'slapen', uur: 31 }).uur, 7, 'het uur wordt rond gemaakt');
  assert.equal(G.leesStemVerzoek({ k: 'stemverzoek', soort: 'onderduiken', uren: 999 }).uren, 24);
  assert.equal(G.leesStemAntwoord({ k: 'stemantwoord', id: 1, ja: true, afwezig: 'ja' }).afwezig, false, 'alleen echt true telt');
  assert.equal(G.leesStemAntwoord({ k: 'stemantwoord', id: 1, ja: false }).afwezig, false, 'een oud antwoord heeft geen afwezig');
});
t('met één speler blijft alles meteen zoals het was', () => {
  const solo = mkWorld(); let klaar = false;
  assert.equal(G.groepAkkoord(solo, 'slapen', null, () => { klaar = true; }), true); assert.equal(klaar, true);
  assert.equal(G.cheatsUit(solo), false);
});
t('nu zonder de weggevallen speler verder: elke speler kan het vragen en niemand wordt verwijderd', () => {
  const s = sessie(2); s.step(1);
  s.hw.coopHold = true;
  assert.equal(N.vraagWachtVerder(s.gs[0].gw), true);
  s.step(0.3);
  assert.equal(s.hw.coopHoldVerder, true, 'de host hoort het verzoek van een gast');
  assert.equal(s.hw.coopNet.hub.roster.spelers.length, 3, 'de roster blijft ongewijzigd: niemand is verwijderd');
  const z = sessie(1); z.step(1); assert.equal(N.handleEvent(z.hw, { k: 'wachtverder' }, 1), false, 'zonder wachtscherm doet het niets');
});
console.log(`samenstem_test: ${n} tests ok`);
