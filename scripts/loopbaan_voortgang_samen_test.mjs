// Audit Samen spelen bij alle loopbanen (#1380, deel 1): de voortgang is per speler. Rang, geziene rangmomenten en geld staan op
// het eigen apparaat van elke speler; wie het spel opende, een gast, een gast die later aansluit en een nieuwe host na een wissel
// houden elk hun eigen stand, ook als iemand wegvalt. Gedrag, geen bronregex: de echte netcode (coopnet.js, memtransport) en de
// echte opslaglagen (loopbaanlive, boerderijlive, bezitlive, voetbalcarrierelive) met een eigen nepopslag per apparaat.
//   node scripts/loopbaan_voortgang_samen_test.mjs
// Loopbanen: vervoer (bus, taxi, trein), water (binnenvaart), lucht (ballon), horeca (snackwagen), landbouw (boerderij) en voetbal.
// Schrijft nooit naar echte opslag. Ontwerp: docs/COOP-GAST.md ("Loopbanen en Samen spelen").
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as BZ from '../game/js/bezitlive.js';
import * as CL from '../game/js/voetbalcarrierelive.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as F from '../game/js/footballrank.js';
import * as V from '../game/js/footballstory.js';
import * as SM from '../game/js/snackrankscenes.js';
import PARKDATA from '../game/js/voetbalparkendata.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import { rankMomentsOf } from '../game/js/rankmoments.js';
import '../game/js/vervoer.js';          // meldt de rangmomenten van bus, taxi en trein aan
import '../game/js/binnenvaartrules.js'; // water en lucht: de regels hebben geen eigen opslag, de voortgang is het vak in het profiel
import '../game/js/balloonflight.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const rustig = { started: true, held: [] };
SM.registerSnackMoments();
const index = makeParkIndex(PARKDATA);

// ---- een apparaat: een eigen opslag met alle spelersleutels en een eigen portemonnee ----
const toestel = (naam, char = 'tammo') => ({ naam, char, ls: nepOpslag(), money: 0, gespeeld: [] });
function activeer(d) {
  Live.zetProfielVoorTest(null, d.ls); Live.rankHook.leeg();
  BL.zetBoerderijVoorTest(null, d.ls); BZ.zetBezitVoorTest(null, d.ls); CL.useStorage(d.ls); CL.useParkData(PARKDATA);
}
function bewaar(d) { Live.schrijfNu(); BL.schrijfNu(); BZ.schrijfNu(); CL.flush(); }
// Wat aan de beurt komt in de wachtrij van de haak speelt meteen op dit apparaat (rustig): de wachtrij is van het proces, het profiel is van de speler.
const leegWacht = (d) => { for (let i = 0; i < 60; i++) { const id = Live.rankHook.tik(1, null, rustig); if (id) d.gespeeld.push(id); } };
const alsToestel = (d, f) => { activeer(d); try { return f(); } finally { leegWacht(d); bewaar(d); } };
const profiel = (d) => alsToestel(d, () => JSON.parse(JSON.stringify(Live.getProfiel())));
const rang = (d, vak) => L.niveauVoorVak(profiel(d), vak);
const momenten = (d) => profiel(d).momenten.slice().sort();
// De momenten van dit apparaat afspelen (rustig, zonder melding): wat de speler zag komt in zijn eigen profiel.
const speelMomenten = (d) => d.gespeeld.splice(0);
const metXp = (niveaus) => { const p = L.nieuwProfiel(); for (const [vak, niv] of Object.entries(niveaus)) p.vakken[vak].xp = L.XP_DREMPELS[niv - 1]; return p; };
const zetProfiel = (d, p) => { d.ls.setItem('gde-loopbaan-v1', JSON.stringify(p)); };

// ---- een sessie: één host en gasten, over de echte netcode ----
function sessie(hostD, gastDs) {
  const mk = (d) => ({ player: { x: 0, y: 0, angle: 0, character: d.char, vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: d.money, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets() });
  const hw = mk(hostD); N.startHost(hw, INFO, { seed: 5, max: 8 });
  const s = { hw, host: hostD, gasten: [], stap(secs) {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      alsToestel(hostD, () => N.tickCoopNet(hw, 1 / 60));
      for (const g of s.gasten) { if (g.w.coopNet) alsToestel(g.d, () => N.tickCoopNet(g.w, 1 / 60)); alsToestel(g.d, () => g.link.advance(1 / 60)); g.w.time += 1 / 60; }
      hw.time += 1 / 60;
    }
  } };
  s.sluit = (d) => {
    const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 + s.gasten.length * 7 });
    N.addGuest(hw, link.a);
    const gw = mk(d); gw.player.character = d.char === 'tammo' ? 'anita' : 'tammo';
    N.startClient(gw, link.b, INFO, {});
    s.gasten.push({ d, w: gw, link });
    return gw;
  };
  s.val = (d) => { const i = s.gasten.findIndex((g) => g.d === d); if (i < 0) return; const g = s.gasten[i]; d.money = g.w.money; try { N.stopCoopNet(g.w); } catch (e) { /* al weg */ } s.gasten.splice(i, 1); };
  s.einde = () => { for (const g of s.gasten) { g.d.money = g.w.money; try { N.stopCoopNet(g.w); } catch (e) { /* weg */ } } hostD.money = hw.money; try { N.stopCoopNet(hw); } catch (e) { /* weg */ } s.gasten = []; };
  gastDs.forEach((d) => s.sluit(d));
  s.stap(4);
  return s;
}
const verdien = (s, vak, basis, xp) => alsToestel(s.host, () => Live.loopbaanVerdien(s.hw, vak, basis, { xp, n: 1 }));

const VERVOER = ['bus', 'taxi', 'trein'];
const ALLE_VAKKEN = [...VERVOER, 'water', 'lucht', 'horeca', 'landbouw'];

t('elke loopbaan staat op een speler-sleutel, nooit in de savegame (opslagregister)', () => {
  const cov = JSON.parse(fs.readFileSync(new URL('./coop_coverage.json', import.meta.url), 'utf8'));
  for (const sleutel of ['loopbaan', 'boerderij', 'bezit', 'voetbalCarriere']) assert.equal(cov.opslag[sleutel] && cov.opslag[sleutel].scope, 'speler', `${sleutel} is van de speler`);
  for (const vak of ALLE_VAKKEN) assert.ok(L.vakInfo(vak), `${vak} is een vak in het profiel`);
});

for (const vak of ALLE_VAKKEN) {
  t(`${vak}: host en gast houden elk hun eigen rang, momenten en geld`, () => {
    const A = toestel('host-' + vak), B = toestel('gast-' + vak, 'anita');
    zetProfiel(B, metXp({ [vak]: 5 }));                                  // B is al ver; A begint bij niveau 1
    const s = sessie(A, [B]);
    const betaald = verdien(s, vak, 400, 150);                           // A rondt een dienst af: 150 punten, niveau 3
    s.stap(2);
    const gw = s.gasten[0].w;
    assert.equal(betaald, 400, 'niveau 1 betaalt het basisbedrag');
    assert.equal(s.hw.money, 400, 'de host krijgt zijn geld');
    assert.equal(gw.money, L.loon(metXp({ [vak]: 5 }), vak, 400), 'de gast krijgt het volle bedrag met zijn eigen factor');
    s.einde();
    assert.equal(rang(A, vak), 3, 'A: 150 punten is niveau 3');
    assert.equal(rang(B, vak), 5, 'B: blijft op zijn eigen niveau 5 (zijn punten tellen erbij, geen niveausprong)');
    const gespeeld = speelMomenten(A);
    const verwacht = vak === 'horeca' ? [] : rankMomentsOf(vak).filter((m) => m.rang <= 3).map((m) => m.id); // horeca: de snackmomenten hangen aan de snackrang, die A nog niet haalde
    assert.deepEqual(gespeeld, verwacht, `${vak}: A ziet de momenten van rang 2 en 3 (indien aangemeld)`);
    assert.deepEqual(momenten(A), gespeeld.slice().sort(), 'en ze staan in het profiel van A');
    assert.deepEqual(momenten(B), [], 'B ziet niets van het moment van A en zijn eigen stand verandert niet');
    assert.equal(profiel(A).vakken[vak].xp, 150); assert.equal(profiel(B).vakken[vak].xp, L.XP_DREMPELS[4] + 150);
    // opnieuw laden uit de opslag: dezelfde stand (de opslag is de waarheid, niet het geheugen)
    assert.equal(rang(A, vak), 3); assert.equal(A.money + B.money, 400 + L.loon(metXp({ [vak]: 5 }), vak, 400));
  });
}

t('de vervoerslijnen: een gast die een rang haalt speelt zijn eigen moment op zijn eigen apparaat, de host niet', () => {
  const A = toestel('host'), B = toestel('gast', 'anita');
  zetProfiel(B, metXp({ bus: 1 })); B.ls.m.set('gde-loopbaan-v1', JSON.stringify({ ...JSON.parse(B.ls.m.get('gde-loopbaan-v1')), vakken: { ...JSON.parse(B.ls.m.get('gde-loopbaan-v1')).vakken, bus: { xp: 40, n: 0, uniek: [] } } }));
  const s = sessie(A, [B]);
  verdien(s, 'bus', 100, 20);                                            // A: 20 punten (niveau 1); B: 40 + 20 = 60, niveau 2
  s.stap(2);
  s.einde();
  assert.equal(rang(B, 'bus'), 2, 'de beloning van de host brengt de gast omhoog');
  assert.deepEqual(speelMomenten(A), [], 'A bleef op niveau 1: geen moment');
  assert.deepEqual(speelMomenten(B), ['vervoer-bus-rang2'], 'B ziet zijn eigen moment');
  assert.deepEqual(momenten(A), []); assert.deepEqual(momenten(B), ['vervoer-bus-rang2']);
});

t('wegvallen: wie wegvalt verliest niets, de rest speelt door en krijgt niets dubbel', () => {
  const A = toestel('host'), B = toestel('gast-1', 'anita'), Z = toestel('gast-2', 'anita');
  const s = sessie(A, [B, Z]);
  verdien(s, 'taxi', 200, 60); s.stap(2);
  const bGeld = s.gasten[0].w.money, zGeld = s.gasten[1].w.money;
  assert.equal(bGeld, 200); assert.equal(zGeld, 200);
  const bXp = profiel(B).vakken.taxi.xp;
  s.val(B);                                                              // B valt weg (verbinding weg)
  assert.equal(B.money, bGeld, 'het geld van B blijft bij B');
  verdien(s, 'taxi', 200, 60); s.stap(2);
  assert.equal(s.gasten[0].w.money, 410, 'Z krijgt de volgende dienst ook, nu met niveau 2 (5% meer)');
  s.einde();
  assert.equal(profiel(B).vakken.taxi.xp, bXp, 'de punten van B veranderen niet nadat hij weg is');
  assert.equal(B.money, 200, 'en zijn geld ook niet');
  assert.equal(Z.money, 410); assert.equal(A.money, 410);
  assert.equal(profiel(Z).vakken.taxi.xp, 120); assert.equal(profiel(B).vakken.taxi.xp, 60);
});

t('later aansluiten: een nieuwe gast begint op zijn eigen stand en krijgt niets met terugwerkende kracht', () => {
  const A = toestel('host'), B = toestel('gast-1', 'anita'), Z = toestel('laat', 'anita');
  zetProfiel(Z, metXp({ trein: 4 }));
  const s = sessie(A, [B]);
  verdien(s, 'trein', 100, 30); s.stap(2);
  const gz = s.sluit(Z); s.stap(4);                                      // Z sluit later aan
  assert.equal(gz.money, 0, 'de eerste dienst was er al: Z krijgt hem niet achteraf');
  assert.equal(profiel(Z).vakken.trein.xp, L.XP_DREMPELS[3], 'zijn eigen punten staan er nog zoals hij ze meebracht');
  verdien(s, 'trein', 100, 30); s.stap(2);
  assert.equal(gz.money, L.loon(metXp({ trein: 4 }), 'trein', 100), 'de volgende dienst krijgt hij met zijn eigen factor');
  s.einde();
  assert.equal(profiel(Z).vakken.trein.xp, L.XP_DREMPELS[3] + 30);
  assert.equal(B.money, 200, 'B kreeg beide diensten');
});

t('hostwissel: de oude gast opent het spel, de oude host sluit aan; niemand verliest iets en de punten blijven per speler', () => {
  const A = toestel('eerste host'), B = toestel('eerste gast', 'anita');
  zetProfiel(B, metXp({ water: 3 }));
  const s1 = sessie(A, [B]);
  verdien(s1, 'water', 300, 100); s1.stap(2); s1.einde();
  const na1 = { a: profiel(A), b: profiel(B), geldA: A.money, geldB: B.money };
  assert.equal(na1.geldA, 300); assert.equal(na1.geldB, L.loon(metXp({ water: 3 }), 'water', 300));
  const s2 = sessie(B, [A]);                                             // B host, A gast: dezelfde apparaten, een nieuwe sessie
  assert.deepEqual(profiel(A), na1.a, 'A verloor niets bij de wissel'); assert.deepEqual(profiel(B), na1.b, 'B ook niet');
  verdien(s2, 'water', 300, 100); s2.stap(2); s2.einde();
  assert.equal(B.money, na1.geldB + L.loon(na1.b, 'water', 300), 'B verdient nu als host met zijn eigen factor');
  assert.equal(A.money, na1.geldA + L.loon(na1.a, 'water', 300), 'A krijgt als gast het volle bedrag met zijn eigen factor');
  assert.equal(profiel(A).vakken.water.xp, 200); assert.equal(profiel(B).vakken.water.xp, na1.b.vakken.water.xp + 100);
});

t('hetzelfde bericht telt nooit twee keer (#448): een tweede levering met dezelfde id geeft niets', () => {
  const A = toestel('host'), B = toestel('gast', 'anita');
  const s = sessie(A, [B]);
  const g = s.gasten[0];
  const stuur = () => alsToestel(B, () => N.handleEvent(g.w, { k: 'beloning', geld: 100, vak: 'bus', xp: 10, id: 'dienst-77' }));
  assert.equal(stuur(), true); assert.equal(stuur(), false, 'dezelfde id: genegeerd');
  assert.equal(g.w.money, 100); assert.equal(profiel(B).vakken.bus.xp, 10);
  s.einde();
});

t('boerderij: het erf en de akker zijn van de speler die ze heeft; een gast of een andere host raakt ze niet', () => {
  const A = toestel('boer'), B = toestel('buurman', 'anita');
  alsToestel(A, () => { BL.zetPerceel({ x: 100, y: 200, a: 0 }); });
  assert.equal(alsToestel(A, () => BL.heeftEigenAkker()), true);
  assert.equal(alsToestel(B, () => BL.heeftEigenAkker()), false, 'B heeft geen akker van A gekregen');
  const s = sessie(B, [A]);                                              // B opent het spel, A is gast: A houdt zijn akker
  s.stap(2); s.einde();
  assert.equal(alsToestel(A, () => BL.heeftEigenAkker()), true); assert.equal(alsToestel(B, () => BL.heeftEigenAkker()), false);
  assert.ok(!A.ls.m.has('gde-save-v1'), 'niets van de boerderij in een savegame');
});

t('snackwagen: de rang en de geziene momenten zijn per speler', () => {
  const A = toestel('wagen'), B = toestel('gast', 'anita');
  alsToestel(A, () => { const S = BZ.snackState(); S.rang = 3; BZ.markeer(); Live.rankHook.omhoog({ addMessage() {} }, { vak: 'horeca', van: 1, naar: 3 }); });
  const wachtA = speelMomenten(A);
  assert.deepEqual(wachtA, ['snack-rang2-standplaats', 'snack-rang3-wagenbaas'], 'A zag de snack-momenten van zijn eigen rang');
  assert.equal(alsToestel(A, () => BZ.snackState().rang), 3); assert.equal(alsToestel(B, () => BZ.snackState().rang), 1, 'B begint op rang 1');
  assert.deepEqual(momenten(B), []);
  const s = sessie(B, [A]); s.stap(2); s.einde();
  assert.equal(alsToestel(A, () => BZ.snackState().rang), 3, 'na een hostwissel is de rang van A er nog');
});

t('voetbal: carrière en rang zijn van de speler; een gast ziet het moment van de host niet', () => {
  const A = toestel('speler'), B = toestel('gast', 'anita');
  const w = { money: 0, clock: 12, time: 1500, msgs: [], addMessage(x) { this.msgs.push(x); } };
  const start = () => C.createCareer({ char: 'anita', index, home: V.storyHome(index) });
  const opRang = (c, r) => ({ ...c, flags: { ...c.flags, ...(r >= 2 ? { debut: true } : {}), ...(r >= 4 ? { bid: true } : {}) }, stats: { ...c.stats, ...(r >= 3 ? { promotions: 1 } : {}) } });
  alsToestel(A, () => { let c = F.feedFootballRank(start(), Live.rankHook, w).career; c = F.feedFootballRank(opRang(c, 3), Live.rankHook, w).career; CL.replaceCareer(c); });
  const gespeeld = speelMomenten(A);
  assert.deepEqual(gespeeld, ['voetbal-rang2-debuut', 'voetbal-rang3-selectie']);
  assert.equal(alsToestel(A, () => CL.getCareer().flags.rankSeen), 3);
  assert.equal(alsToestel(B, () => CL.hasCareer()), false, 'B heeft geen carrière van A');
  assert.deepEqual(momenten(B), []);
  const s = sessie(B, [A]); s.stap(2); s.einde();                         // wissel: A is nu gast
  assert.equal(alsToestel(A, () => CL.getCareer().flags.rankSeen), 3, 'de carrière van A overleeft de hostwissel');
  assert.deepEqual(momenten(A), gespeeld.slice().sort(), 'en zijn geziene momenten ook');
});

t('geen apparaat kan het profiel van een ander overschrijven: elke opslag heeft precies zijn eigen sleutels', () => {
  const A = toestel('a'), B = toestel('b', 'anita');
  const s = sessie(A, [B]); verdien(s, 'bus', 100, 10); s.stap(2); s.einde();
  for (const d of [A, B]) assert.ok([...d.ls.m.keys()].every((k) => /^gde-(loopbaan|boerderij|bezit|voetbalcarriere)-v1$/.test(k)), `${d.naam}: ${[...d.ls.m.keys()]}`);
});

Live.zetProfielVoorTest(null, nepOpslag());
console.log(`loopbaan_voortgang_samen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
