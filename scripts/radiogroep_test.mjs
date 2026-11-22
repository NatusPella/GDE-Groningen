// Samen spelen (22-11, ADR 0046): de radiozender in een gedeeld voertuig (game/js/radiogroep.js en het pad door coopnet.js met een
// geheugenverbinding). Bestuurder kiest, passagier volgt of kiest voor zichzelf en stemt, te voet hoort niets, de host begrenst en
// een geblokkeerde speler telt niet. Pure en mock-test, geen Electron; het afspelen zelf (radio.js, audio) is niet in beeld bekeken.
//   node scripts/radiogroep_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as R from '../game/js/radiogroep.js';
import * as N from '../game/js/coopnet.js';
import * as S from '../game/js/settings.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const auto = { id: 'auto-1', x: 0, y: 0, angle: 0 }, bus = { id: 'bus-1' };
const fig = (slot, inVeh, extra = {}) => ({ slot, x: 0, y: 0, angle: 0, inVeh, ...extra });
const OPEN = ['gmusic', 'nachtstreek', 'wierde', 'noordkust']; // zonder de geheime Ruisradio

t('readZender: alleen een bekend zender-id, nooit tekst', () => {
  assert.deepEqual(R.readZender({ k: 'zender', id: 'wierde' }), { id: 'wierde', stem: false });
  assert.equal(R.readZender({ k: 'zender', id: 'wierde', stem: true }).stem, true);
  for (const x of [null, {}, { k: 'zender' }, { k: 'zender', id: 'nepzender' }, { k: 'zender', id: 7 }, { k: 'zender', id: '__proto__' }, { k: 'zender', id: 'x'.repeat(40) }, { k: 'doel', id: 'wierde' }]) assert.equal(R.readZender(x), null, JSON.stringify(x));
  assert.deepEqual(R.zenderEvent('wierde'), { k: 'zender', id: 'wierde' });
  assert.deepEqual(R.zenderEvent('wierde', true), { k: 'zender', id: 'wierde', stem: true });
});
t('naar wie: de bestuurder naar wie meerijdt, een stem alleen naar de bestuurder, te voet niemand', () => {
  const bez = [{ slot: 0, voertuig: bus, bestuurder: true }, { slot: 1, voertuig: bus, bestuurder: false }, { slot: 2, voertuig: bus, bestuurder: false }, { slot: 3, voertuig: null, bestuurder: false }, { slot: 4, voertuig: auto, bestuurder: true }];
  assert.deepEqual(R.zenderOntvangers(0, false, bez), [1, 2]);
  assert.deepEqual(R.zenderOntvangers(1, true, bez), [0]);
  assert.deepEqual(R.zenderOntvangers(1, false, bez), [], 'een passagier kiest niet voor de bestuurder');
  assert.deepEqual(R.zenderOntvangers(0, true, bez), [], 'de bestuurder stemt niet');
  assert.deepEqual(R.zenderOntvangers(3, false, bez), []); assert.deepEqual(R.zenderOntvangers(9, false, bez), []);
  assert.deepEqual(R.zenderOntvangers(4, false, bez), [], 'een auto zonder passagiers');
});
t('ontvangZender: de keuze van de bestuurder, een stem, uit, geblokkeerd en te snel', () => {
  const st = R.createRadioGroep(), a = { slot: 0, naam: 'Tammo' };
  assert.equal(R.ontvangZender(st, { k: 'zender', id: 'wierde' }, a, 10, { aan: false }).reden, 'uit');
  assert.equal(R.ontvangZender(st, { k: 'zender', id: 'wierde' }, a, 10, { mag: false }).reden, 'geblokkeerd');
  assert.equal(R.ontvangZender(st, { k: 'zender', id: 'nep' }, a, 10).reden, 'onbekend');
  assert.equal(R.ontvangZender(st, { k: 'zender', id: 'wierde' }, null, 10).reden, 'onbekend');
  const r = R.ontvangZender(st, { k: 'zender', id: 'wierde' }, a, 10, { voertuig: bus });
  assert.ok(r.toon); assert.match(r.regel, /Tammo zet Wierde Radio op/);
  assert.equal(st.bestuurder.id, 'wierde'); assert.equal(st.bestuurder.voertuig, bus);
  assert.equal(R.ontvangZender(st, { k: 'zender', id: 'gmusic' }, a, 10.5).reden, 'te-snel');
  const v = R.ontvangZender(st, { k: 'zender', id: 'noordkust', stem: true }, { slot: 2, naam: 'Tessa' }, 11);
  assert.match(v.regel, /Tessa stemt op Radio Noordkust/); assert.equal(st.votes[2], 'noordkust');
  assert.equal(R.groepSuggestie(st, OPEN), 'noordkust', 'een stem is een suggestie');
  R.ontvangZender(st, { k: 'zender', id: 'gmusic' }, a, 20, { voertuig: bus });
  assert.deepEqual(st.votes, {}, 'een nieuwe keuze van de bestuurder maakt de oude stemmen af');
});
t('groepKanaal: een passagier volgt de bestuurder, kiest hij zelf dan houdt hij dat; te voet of aan het stuur: niets', () => {
  const st = R.createRadioGroep();
  R.ontvangZender(st, { k: 'zender', id: 'wierde' }, { slot: 0, naam: 'Tammo' }, 1, { voertuig: bus });
  const bez = (v, b) => [{ slot: 1, voertuig: v, bestuurder: b }];
  assert.equal(R.groepKanaal(st, 1, bez(bus, false), OPEN), 'wierde');
  assert.equal(R.groepKanaal(st, 1, bez(null, false), OPEN), null, 'te voet');
  assert.equal(R.groepKanaal(st, 1, bez(bus, true), OPEN), null, 'zelf aan het stuur');
  assert.equal(R.groepKanaal(st, 1, bez(auto, false), OPEN), null, 'een ander voertuig heeft een andere zender');
  st.volgt = false; st.eigen = 'nachtstreek';
  assert.equal(R.groepKanaal(st, 1, bez(bus, false), OPEN), 'nachtstreek');
  st.volgt = true;
  const geheim = R.createRadioGroep(); R.ontvangZender(geheim, { k: 'zender', id: 'ruis' }, { slot: 0, naam: 'T' }, 1, { voertuig: bus });
  assert.equal(R.groepKanaal(geheim, 1, bez(bus, false), OPEN), 'gmusic', 'een gast zonder de geheime zender valt terug op G-Music');
  assert.equal(R.groepKanaal(geheim, 1, bez(bus, false), [...OPEN, 'ruis']), 'ruis', 'met de geheime zender hoort hij hem');
  assert.equal(R.groepKanaal(R.createRadioGroep(), 1, bez(bus, false), OPEN), null, 'zonder keuze blijft de eigen zender');
});
t('wegvallen: de stem gaat mee, het voertuig houdt zijn zender; te voet vergeet de keuze', () => {
  const st = R.createRadioGroep();
  R.ontvangZender(st, { k: 'zender', id: 'wierde' }, { slot: 0, naam: 'Tammo' }, 1, { voertuig: bus });
  R.ontvangZender(st, { k: 'zender', id: 'gmusic', stem: true }, { slot: 2, naam: 'Tessa' }, 5);
  R.groepVertrek(st, 2); assert.deepEqual(st.votes, {});
  R.groepVertrek(st, 0); assert.equal(st.bestuurder.id, 'wierde', 'het voertuig houdt zijn zender');
  assert.equal(R.groepKanaal(st, 1, [{ slot: 1, voertuig: bus, bestuurder: false }], OPEN), 'wierde');
  assert.equal(R.groepVoetgangerReset(st, 1, [{ slot: 1, voertuig: null, bestuurder: false }], 2), false, 'een net binnengekomen keuze blijft even staan (de stoel kan nog onderweg zijn)');
  assert.equal(R.groepVoetgangerReset(st, 1, [{ slot: 1, voertuig: null, bestuurder: false }], 60), true);
  assert.equal(st.bestuurder, null);
  assert.equal(R.groepVoetgangerReset(st, 1, [{ slot: 1, voertuig: null, bestuurder: false }], 61), false, 'tweede keer niets te doen');
});
t('zenderNaInstappen: wie later instapt hoort de keuze één keer; uitstappen vergeet', () => {
  const laatste = { 0: 'wierde' }, gemeld = {};
  const bez = [{ slot: 0, voertuig: bus, bestuurder: true }, { slot: 1, voertuig: bus, bestuurder: false }, { slot: 2, voertuig: null, bestuurder: false }];
  assert.deepEqual(R.zenderNaInstappen(bez, laatste, gemeld), [{ naar: 1, van: 0, id: 'wierde' }]);
  assert.deepEqual(R.zenderNaInstappen(bez, laatste, gemeld), [], 'maar één keer');
  bez[2].voertuig = bus;
  assert.deepEqual(R.zenderNaInstappen(bez, laatste, gemeld), [{ naar: 2, van: 0, id: 'wierde' }], 'de nieuwe passagier alsnog');
  bez[1].voertuig = null;
  R.zenderNaInstappen(bez, laatste, gemeld); assert.equal(gemeld[1], undefined);
  laatste[0] = 'gmusic';
  assert.deepEqual(R.zenderNaInstappen(bez, laatste, gemeld), [{ naar: 2, van: 0, id: 'gmusic' }], 'een nieuwe keuze bereikt wie al meerijdt');
});

// ---- over de geheugenverbinding
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mk = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
function session(gasten = 2) {
  const hw = mk(); N.startHost(hw, INFO, { seed: 5 });
  const gs = [];
  for (let i = 0; i < gasten; i++) { const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i }); N.addGuest(hw, link.a); const gw = mk(); N.startClient(gw, link.b, INFO, {}); gs.push({ gw, link }); }
  const step = (secs) => { for (let k = 0; k < 60 * secs; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, step, gw: gs.map((g) => g.gw) };
}
const regels = (w, re) => w.messages.filter((m) => re.test(m));
// host rijdt, gast 1 is bijrijder, gast 2 loopt rond
const inAuto = (s) => { s.hw.player.inVehicle = auto; s.hw.coopFigures = { 1: fig(1, auto), 2: fig(2, null) }; };

t('de bestuurder (host) kiest een zender: de bijrijder volgt, wie te voet loopt hoort niets', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2); inAuto(s);
  assert.equal(N.deelZender(s.hw, 'wierde'), true); s.step(1);
  assert.equal(regels(s.gw[0], /zet Wierde Radio op/).length, 1, 'de bijrijder hoort het');
  assert.equal(regels(s.gw[1], /zet .* op/).length, 0, 'te voet: niets');
  assert.equal(N.groepZender(s.gw[0], OPEN), 'wierde');
  assert.equal(N.groepZender(s.gw[1], OPEN), null);
  s.gw[0].coopInVoertuig = false; s.gw[0].coopZitId = null; s.gw[0].time += 5; // uitgestapt (zonder tik: de test voert het snapshot niet na)
  assert.equal(N.groepZender(s.gw[0], OPEN), null, 'uitgestapt: weer de eigen zender');
  S.setSetting('samenZinnen', false);
});
t('een passagier kiest voor zichzelf en stemt: de bestuurder ziet de stem en beslist', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2); inAuto(s);
  N.deelZender(s.hw, 'wierde'); s.step(1);
  assert.equal(N.deelZender(s.gw[0], 'noordkust'), true); s.step(1);
  assert.equal(regels(s.hw, /stemt op Radio Noordkust/).length, 1);
  assert.equal(N.groepZender(s.gw[0], OPEN), 'noordkust', 'zijn eigen keuze houdt hij');
  assert.equal(N.groepZender(s.hw, OPEN), null, 'de bestuurder wordt nooit gedwongen');
  assert.equal(N.deelZender(s.gw[1], 'wierde'), false, 'te voet: niets over het net');
  S.setSetting('samenZinnen', false);
});
t('wie later instapt hoort de zender van het voertuig; de host begrenst een spammer', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2); inAuto(s);
  N.deelZender(s.hw, 'nachtstreek'); s.step(1);
  s.hw.coopFigures[2].inVeh = auto;
  s.step(2.5);
  assert.equal(N.groepZender(s.gw[1], OPEN), 'nachtstreek', 'de late instapper volgt de bestuurder');
  const voor = s.gw[0].messages.length;
  for (let i = 0; i < 8; i++) N.deelZender(s.hw, i % 2 ? 'wierde' : 'gmusic');
  s.step(1);
  assert.ok(s.gw[0].messages.length - voor <= 1, 'acht keuzes in een oogwenk: hooguit een komt door');
  S.setSetting('samenZinnen', false);
});
t('een gast die bestuurt kiest voor zijn passagiers; een geblokkeerde bestuurder wordt genegeerd; zonder opt-in niets', () => {
  S.setSetting('samenZinnen', true);
  const s = session(2); s.step(2);
  s.hw.player.inVehicle = auto; s.hw.coopWielSlot = 1;
  s.hw.coopFigures = { 1: fig(1, auto, { coopBestuurt: true }), 2: fig(2, null) };
  s.step(1); // het snapshot vertelt de gast dat hij bestuurt
  assert.equal(N.deelZender(s.gw[0], 'wierde'), true); s.step(1);
  assert.equal(regels(s.hw, /zet Wierde Radio op/).length, 1, 'de host zit mee en hoort de gast');
  assert.equal(N.setPlayerMuteState(s.hw, 1, 'geblokkeerd'), 'geblokkeerd');
  s.step(3); N.deelZender(s.gw[0], 'gmusic'); s.step(1);
  assert.equal(regels(s.hw, /zet G-Music op/).length, 0, 'geblokkeerd: geen keuze meer');
  S.setSetting('samenZinnen', false);
  const s2 = session(1); s2.step(2); s2.hw.player.inVehicle = auto; s2.hw.coopFigures = { 1: fig(1, auto) };
  N.deelZender(s2.hw, 'wierde'); s2.step(1);
  assert.equal(regels(s2.gw[0], /zet .* op/).length, 0, 'zonder samenZinnen (opt-in) komt er niets in beeld');
  assert.equal(N.groepZender(s2.gw[0], OPEN), null);
});
t('solo of zonder sessie: niets te delen en niets te volgen', () => {
  assert.equal(N.deelZender(mk(), 'wierde'), false);
  assert.equal(N.groepZender(mk(), OPEN), null);
  assert.equal(N.handleEvent(mk(), { k: 'zender', id: 'wierde' }, 1), false);
});
t('de haken: radio.js en main.js kennen de groep, het net kent het bericht', () => {
  const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
  assert.match(lees('radio.js'), /setRadioGroup/); assert.match(lees('radio.js'), /groep: true/);
  assert.match(lees('main.js'), /setRadioGroup\(\{ bron/);
  assert.match(lees('coopnet.js'), /case 'zender'/);
});
console.log(`radiogroep_test: ${n}/${n} ok`);
