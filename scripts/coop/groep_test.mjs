// Samen spelen (#452): gezamenlijke keuzes. Alle spelers zijn gelijkwaardig: schermen pauzeren de wereld alleen met één speler, tijdsprongen
// (slapen, onderduiken, reizen met de klok) vragen akkoord van de anderen, cheats en het testmenu staan uit met meer spelers.
// Dezelfde koppeling als in het spel (coopnet.js, hub, sessies) op een nep-wereld per speler, over een geheugentransport. Geen DOM, geen Electron.
//   node scripts/coop/groep_test.mjs
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

// ---------------------------------------------------------------- punt 9: schermen pauzeren de wereld alleen met één speler
t('zachte pauze: afspeel-vooruit, snelreis, laden, fotomodus en hulpaanbod laten de wereld doorlopen, een filmpje niet', () => {
  const s = sessie(1); s.step(2);
  const hw = s.hw; hw.paused = true;
  for (const bron of ['afspeelvooruit', 'reisrit', 'laden', 'fotomodus', 'hulpaanbod']) {
    hw.uiPaused = true; G.zachtePauze(hw, bron, true);
    assert.equal(N.coopWereldDoorloop(hw, false), true, `${bron}: de wereld loopt door`);
    assert.equal(N.coopWereldDoorloop(hw, true), true, `${bron}: ook met een menu open`);
    hw.uiHard = true; assert.equal(N.coopWereldDoorloop(hw), false, `${bron}: een filmpje pauzeert voor iedereen`); hw.uiHard = false;
    hw.coopHold = true; assert.equal(N.coopWereldDoorloop(hw), false, `${bron}: een wachtscherm pauzeert`); hw.coopHold = false;
    G.zachtePauze(hw, bron, false); hw.uiPaused = false;
  }
  hw.uiPaused = true; assert.equal(N.coopWereldDoorloop(hw, false), false, 'een uiPaused zonder zachte bron (minigame-scherm) pauzeert');
  assert.equal(N.coopWereldDoorloop(hw, true), false);
  assert.equal(N.coopWereldDoorloop(s.gs[0].gw, false), false, 'een gast draait de wereld niet');
});
t('zachte pauze: met één speler blijft alles zoals het is', () => {
  const solo = mkWorld(); solo.paused = true; solo.uiPaused = true; G.zachtePauze(solo, 'laden', true);
  assert.equal(N.coopWereldDoorloop(solo, false), false);
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 5 }); hw.paused = true; hw.uiPaused = true; G.zachtePauze(hw, 'reisrit', true);
  assert.equal(N.coopWereldDoorloop(hw, false), false, 'wel een sessie, nog geen gast');
  assert.equal(G.meerSpelers(solo), false); assert.equal(G.meerSpelers(hw), false);
});
t('zachte pauze: bronnen komen en gaan los van elkaar', () => {
  const w = mkWorld(); G.zachtePauze(w, 'a', true); G.zachtePauze(w, 'b', true); G.zachtePauze(w, 'a', false);
  assert.equal(G.zachtAan(w), true); G.zachtePauze(w, 'b', false); assert.equal(G.zachtAan(w), false);
  w.uiPaused = true; assert.equal(G.zachtAlleen(w), false, 'geen bron: geen zachte pauze');
});

// ---------------------------------------------------------------- punten 8 en 10: een tijdsprong vraagt akkoord van de anderen
t('stemming (pure logica): iedereen ja is ja, een nee is nee, geen antwoord is nee, wie weggaat telt niet mee', () => {
  let st = G.stemBegin(1, 'slapen', 'Tammo wil slapen.', [1, 2]);
  assert.equal(st.uitslag, null); assert.deepEqual(G.stemWachtOp(st), [1, 2]);
  assert.equal(G.stemAntwoord(st, 1, true), true); assert.equal(st.uitslag, null, 'nog een antwoord te gaan');
  assert.equal(G.stemAntwoord(st, 1, false), false, 'één keer antwoorden');
  assert.equal(G.stemAntwoord(st, 7, true), false, 'een onbekende speler telt niet');
  G.stemAntwoord(st, 2, true); assert.equal(st.uitslag, 'ja');
  st = G.stemBegin(2, 'slapen', 'x', [1, 2]); G.stemAntwoord(st, 2, false); assert.equal(st.uitslag, 'nee', 'een nee is genoeg');
  st = G.stemBegin(3, 'slapen', 'x', [1, 2]); G.stemAntwoord(st, 1, true);
  assert.equal(G.stemTik(st, 9.9), null); assert.equal(G.stemTik(st, 0.2), 'nee'); assert.equal(st.reden, 'geen antwoord');
  st = G.stemBegin(4, 'onderduiken', 'x', [1, 2]); G.stemAntwoord(st, 1, true); G.stemVerval(st, 2); assert.equal(st.uitslag, 'ja', 'de speler die wegging telt niet meer');
  assert.equal(G.stemBegin(5, 'slapen', 'x', []).uitslag, 'ja', 'wie alleen is beslist zelf');
  assert.equal(G.stemBegin(6, 'slapen', 'x', [0, -1, 1.5, 'a']).uitslag, 'ja', 'alleen echte gastplekken doen mee');
});
t('stemming: berichten worden gecontroleerd', () => {
  assert.equal(G.leesStemEvent({ k: 'stem', id: 1, soort: 'cheat', tekst: 'x' }), null);
  assert.equal(G.leesStemEvent({ k: 'stem', id: 'a', soort: 'slapen', tekst: 'x' }), null);
  assert.equal(G.leesStemEvent({ k: 'stem', id: 1, soort: 'slapen', tekst: 5 }), null);
  assert.equal(G.leesStemEvent({ k: 'stem', id: 1, soort: 'slapen', tekst: 'x'.repeat(500), sec: 9999 }).tekst.length, 90);
  assert.equal(G.leesStemEvent({ k: 'stem', id: 1, soort: 'slapen', tekst: 'x', sec: 9999 }).rest, 30);
  assert.equal(G.leesStemAntwoord({ k: 'stemantwoord', id: 1.5, ja: true }), null);
  assert.deepEqual(G.leesStemUitslag({ k: 'stemuitslag', id: 2, ok: 1, reden: 'iets' }), { id: 2, ok: true, reden: '' });
});
t('alleen of zonder sessie: slapen, onderduiken en reizen gaan meteen', () => {
  let k = 0; const solo = mkWorld();
  assert.equal(G.groepAkkoord(solo, 'slapen', 'Tammo', () => k++), true); assert.equal(k, 1);
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 5 });
  assert.equal(G.groepAkkoord(hw, 'onderduiken', 'Tammo', () => k++), true); assert.equal(k, 2, 'een sessie zonder gast is alleen zijn');
  assert.equal(G.klokSprongMag(solo), true); assert.equal(G.klokSprongMag(hw), true);
});
t('stemming over slapen: alle gasten ja, dan springt de tijd', () => {
  const s = sessie(2); s.step(2);
  let ok = 0, nee = 0;
  assert.equal(G.groepAkkoord(s.hw, 'slapen', 'Tammo', () => ok++, () => nee++), true);
  assert.equal(ok, 0, 'nog niet: de gasten hebben nog niet geantwoord');
  s.step(1);
  for (const g of s.gs) { assert.ok(g.gw.coopStem, 'elke gast krijgt de vraag'); assert.ok(tekstIn(g.gw, /Tammo wil slapen.*J = ja, N = nee/)); }
  s.gs[0].gw.input.s.add('j'); s.step(1);
  assert.equal(ok, 0, 'één gast is niet genoeg');
  s.gs[1].gw.input.s.add('j'); s.step(1);
  assert.equal(ok, 1, 'iedereen akkoord'); assert.equal(nee, 0);
  assert.ok(tekstIn(s.hw, /Iedereen is akkoord/));
  s.step(1); for (const g of s.gs) assert.equal(g.gw.coopStem, null, 'de vraag is weg'); assert.equal(s.hw.coopNet.stem, null);
});
t('stemming over onderduiken: één nee houdt de klok vast', () => {
  const s = sessie(2); s.step(2);
  let ok = 0, nee = 0;
  G.groepAkkoord(s.hw, 'onderduiken', 'Tammo', () => ok++, () => nee++); s.step(1);
  s.gs[0].gw.input.s.add('j'); s.gs[1].gw.input.s.add('n'); s.step(1);
  assert.equal(ok, 0); assert.equal(nee, 1);
  assert.ok(tekstIn(s.hw, /Niet iedereen is akkoord/));
  assert.equal(s.gs[0].gw.coopStem, null, 'ook de gast die ja zei hoort de uitslag');
  assert.ok(tekstIn(s.gs[0].gw, /Niet iedereen is akkoord/));
});
t('stemming: geen antwoord is nee na ongeveer 10 seconden', () => {
  const s = sessie(2); s.step(2);
  let ok = 0, nee = 0;
  G.groepAkkoord(s.hw, 'slapen', 'Tammo', () => ok++, () => nee++);
  s.gs[0].gw.input.s.add('j'); s.step(8);
  assert.equal(nee, 0, 'na 8 seconden nog geen uitslag');
  s.step(3);
  assert.equal(nee, 1); assert.equal(ok, 0);
  assert.ok(tekstIn(s.hw, /Niet iedereen antwoordde/));
});
t('stemming: een gast die wegvalt telt niet mee; een tweede vraag tegelijk mag niet', () => {
  const s = sessie(2); s.step(2);
  let ok = 0;
  G.groepAkkoord(s.hw, 'slapen', 'Tammo', () => ok++); s.step(1);
  assert.equal(G.groepAkkoord(s.hw, 'slapen', 'Tammo', () => { throw new Error('mag niet'); }), false, 'er loopt al een stemming');
  assert.ok(tekstIn(s.hw, /Er loopt al een stemming/));
  s.gs[0].gw.input.s.add('j'); s.gs[1].link.cut(); s.step(8);
  assert.equal(ok, 1, 'de gast die wegviel hoeft niet meer te antwoorden');
});
t('stemming: een gast kan de tijd niet zelf verzetten; een antwoord van buiten de stemming doet niets', () => {
  const s = sessie(1); s.step(2);
  assert.equal(G.groepAkkoord(s.gs[0].gw, 'slapen', 'Tessa', () => { throw new Error('mag niet'); }), false);
  assert.ok(tekstIn(s.gs[0].gw, /verspringt alleen als iedereen akkoord is/));
  assert.equal(N.handleEvent(s.hw, { k: 'stemantwoord', id: 1, ja: true }, 1), false, 'geen lopende stemming');
  let ok = 0; G.groepAkkoord(s.hw, 'slapen', 'Tammo', () => ok++);
  assert.equal(N.handleEvent(s.hw, { k: 'stemantwoord', id: 99, ja: true }, 1), false, 'een verkeerd nummer');
  assert.equal(N.handleEvent(s.hw, { k: 'stemantwoord', id: 1, ja: true }, 0), false, 'de host stemt niet mee');
  assert.equal(N.handleEvent(s.gs[0].gw, { k: 'stemantwoord', id: 1, ja: true }, 0), false, 'een gast luistert niet naar antwoorden');
  assert.equal(N.handleEvent(s.hw, { k: 'stem', id: 1, soort: 'slapen', tekst: 'x' }, 1), false, 'een gast kan geen stemming starten');
  s.step(1); assert.equal(ok, 0);
});

// ---------------------------------------------------------------- snelreizen: voor jezelf zonder akkoord, een tijdsprong niet
import { applyTravel, placeParty } from '../../game/js/storytravel.js';
t('snelreis voor jezelf: met meer spelers verzet de klok niet en blijven de anderen staan', () => {
  const s = sessie(1); s.step(2);
  const w = s.hw; w.clock = 10; w.player.x = 0; w.companion.x = 5; w.map = null;
  assert.equal(G.klokSprongMag(w), false, 'met een gast mag de klok niet zomaar springen');
  placeParty(w, { x: 9000, y: 0 });
  assert.equal(w.player.x, 9000, 'jij reist');
  assert.equal(w.companion.x, 5, 'de andere speler blijft staan');
  assert.equal(w.clock, 10);
  // wie alleen is: zoals altijd
  const solo = mkWorld({ clock: 10 }); solo.companion.state = 'ok';
  placeParty(solo, { x: 9000, y: 0 });
  assert.ok(solo.companion.x > 8990, 'alleen: Tessa (de volg-AI) reist mee');
});
t('snelreis: de klok springt alleen als je alleen speelt', () => {
  const beat = { length: 28000, ride: 'trein', lines: ['Tessa: Kijk, daar is het.'] };
  const solo = mkWorld({ clock: 10 }); solo.companion.state = 'ok';
  assert.ok(applyTravel(solo, beat, 'overslaan', { x: 28000, y: 0 }));
  assert.ok(solo.clock > 10.2, 'alleen: de klok loopt de reistijd mee');
  const s = sessie(1); s.step(2);
  const w = s.hw; w.clock = 10; w.companion.x = 5;
  assert.ok(applyTravel(w, beat, 'overslaan', { x: 28000, y: 0 }));
  assert.equal(w.clock, 10, 'met een gast: geen tijdsprong zonder akkoord');
  assert.equal(w.player.x, 28000, 'jij staat op de bestemming');
  assert.equal(w.companion.x, 5, 'de ander blijft waar hij is');
});

// ---------------------------------------------------------------- punt 30: cheats en testmenu zijn uit met meer spelers
t('cheats en testmenu: uit in een sessie met meer spelers, aan met één speler', () => {
  const solo = mkWorld(); assert.equal(G.cheatsUit(solo), false);
  const hw = mkWorld(); N.startHost(hw, INFO, { seed: 5 }); assert.equal(G.cheatsUit(hw), false, 'een sessie zonder gast is alleen zijn');
  const s = sessie(1); s.step(2);
  assert.equal(G.cheatsUit(s.hw), true, 'host met een gast'); assert.equal(G.cheatsUit(s.gs[0].gw), true, 'de gast zelf ook');
  s.gs[0].link.cut(); s.step(8);
  assert.equal(G.cheatsUit(s.hw), false, 'de gast is weggevallen: weer alleen');
  assert.match(G.CHEATS_UIT_TEKST, /Samen spelen/);
});

console.log(`groep_test: ${n} tests ok`);
