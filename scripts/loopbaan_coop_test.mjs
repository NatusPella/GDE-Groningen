// Loopbaan en Samen spelen (#381, #95): iedereen heeft zijn eigen voortgang op zijn eigen apparaat.
//   node scripts/loopbaan_coop_test.mjs
// Een proces heeft één loopbaanprofiel (zoals een apparaat); deze test laat de spelers om de beurt aan de beurt: de gastheer en elke
// gast hebben hun eigen profiel, dat vóór zijn eigen tick wordt ingezet en erna weer wordt bewaard. Zo zie je wat er op elk
// apparaat gebeurt. De gastheer en de gasten praten over de echte netcode (coopnet.js) met een nep-verbinding in het geheugen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const metXp = (niveaus) => { const p = L.nieuwProfiel(); for (const [vak, niv] of Object.entries(niveaus)) p.vakken[vak].xp = L.XP_DREMPELS[niv - 1]; return p; };

// De avond: de gastheer en gasten met elk een eigen profiel (niveaus per vak).
function avond(gastNiveaus, hostNiveaus = {}) {
  const hw = mkWorld(), gs = [];
  const max = gastNiveaus.length + 1;
  N.startHost(hw, INFO, { seed: 5, max });
  const host = { w: hw, profiel: metXp(hostNiveaus) };
  gastNiveaus.forEach((niv, i) => {
    const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 + i * 7 });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, { wens: i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined });
    gs.push({ w: gw, link, profiel: metXp(niv) });
  });
  const alsSpeler = (s, f) => { Live.zetProfielVoorTest(s.profiel); try { return f(); } finally { s.profiel = Live.getProfiel(); } };
  const step = (secs) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      alsSpeler(host, () => N.tickCoopNet(hw, 1 / 60));
      for (const g of gs) { if (g.w.coopNet) alsSpeler(g, () => N.tickCoopNet(g.w, 1 / 60)); g.link.advance(1 / 60); g.w.time += 1 / 60; }
      hw.time += 1 / 60;
    }
  };
  return { host, gs, step, alsSpeler };
}

t('3 gasten met verschillende niveaus: elk verdient volgens zijn eigen niveau, de gastheer volgens het zijne', () => {
  const s = avond([{ bus: 3 }, { bus: 6 }, {}], { bus: 2 });
  s.step(4);
  // de gastheer rondt een bijbaanronde af: 100 euro basis, 10 punten
  const betaald = s.host.profiel && s.alsSpeler(s.host, () => Live.loopbaanVerdien(s.host.w, 'bus', 100, { xp: 10, n: 1, uniek: 'lijn' }));
  assert.equal(betaald, 105, 'niveau 2 betaalt 5% meer');
  s.step(2);
  // 100 basis: elke meespeler krijgt het volle bedrag (#452), elk met zijn eigen factor: 10%, 30%, 0%
  const verwacht = [110, 130, 100];
  assert.deepEqual(s.gs.map((g) => g.w.money), verwacht, 'het volle bedrag, en elk zijn eigen factor');
  assert.deepEqual(s.gs.map((g) => g.w.coopVerdiend), verwacht, 'het geld gaat in de eigen save van elke gast');
  assert.equal(s.host.w.money, 105, 'de gastheer krijgt zoals altijd zijn volle bedrag');
  for (const g of s.gs) assert.doesNotMatch(g.w.messages.join(' '), /Samenwerkbonus/);
  for (const g of s.gs) assert.match(g.w.messages.join(' '), /Beloning: €\d+/);
  // punten: de volle punten van de gastheer, elk in zijn eigen profiel
  assert.deepEqual(s.gs.map((g) => g.profiel.vakken.bus.xp), [L.XP_DREMPELS[2] + 10, L.XP_DREMPELS[5] + 10, 10]);
  assert.equal(s.host.profiel.vakken.bus.xp, L.XP_DREMPELS[1] + 10 + L.UNIEK_XP, 'de gastheer kreeg zijn eigen punten en de nieuwe lijn');
  assert.equal(s.gs[2].profiel.vakken.bus.n, 0, 'de teller van een gast loopt niet mee met die van de gastheer (hij reed niet zelf)');
});

t('de loopbaan van de gastheer verandert niet door wat de gasten doen, en andersom', () => {
  const s = avond([{ taxi: 4 }, { padel: 5 }]);
  s.step(3);
  const voorHost = JSON.stringify(s.host.profiel);
  s.alsSpeler(s.gs[0], () => Live.loopbaanTel(s.gs[0].w, 'taxi', { xp: 40, n: 3 }));
  s.alsSpeler(s.gs[1], () => Live.loopbaanTel(s.gs[1].w, 'padel', { xp: 40, n: 3 }));
  assert.equal(JSON.stringify(s.host.profiel), voorHost);
  assert.equal(s.gs[0].profiel.vakken.padel.xp, 0); assert.equal(s.gs[1].profiel.vakken.taxi.xp, 0);
});

t('een niveau omhoog bij een gast komt als kaartje bij die gast, niet bij de anderen', () => {
  const s = avond([{}, {}, {}]);
  s.step(4);
  s.gs[1].profiel.vakken.bus.xp = 48; // twee punten voor niveau 2
  s.alsSpeler(s.host, () => Live.loopbaanVerdien(s.host.w, 'bus', 60, { xp: 10 }));
  s.step(2);
  const heeft = (w) => w.messages.some((m) => /Invalchauffeur: Bus niveau 2, 5% meer loon/.test(m));
  assert.deepEqual(s.gs.map((g) => heeft(g.w)), [false, true, false]);
  assert.equal(heeft(s.host.w), false);
  assert.equal(L.niveauVoorVak(s.gs[1].profiel, 'bus'), 2);
});

t('een ander vak, een ander niveau: padel van de gast telt niet voor een bijbaanronde in een bus', () => {
  const s = avond([{ padel: 6 }]);
  s.step(3);
  s.alsSpeler(s.host, () => Live.loopbaanVerdien(s.host.w, 'bus', 100, { xp: 10 }));
  s.step(2);
  assert.equal(s.gs[0].w.money, 100, 'het hoge padelniveau van de gast maakt zijn buswerk niet beter betaald');
  s.alsSpeler(s.host, () => Live.loopbaanVerdien(s.host.w, 'padel', 100, { xp: 10 }));
  s.step(2);
  assert.equal(s.gs[0].w.money, 100 + 130);
});

t('een beloning zonder vak (een missie) is voor elke meespeler het volle bedrag', () => {
  const s = avond([{ bus: 6 }, {}]);
  s.step(3);
  s.host.w.coopDeel(400);
  s.step(2);
  assert.deepEqual(s.gs.map((g) => g.w.money), [400, 400]);
  assert.deepEqual(s.gs.map((g) => g.profiel.vakken.bus.xp), [L.XP_DREMPELS[5], 0]);
});

t('slechte berichten: onbekend vak, rare punten en een vak als object veranderen niets of blijven begrensd', () => {
  const s = avond([{ bus: 3 }]);
  s.step(3);
  const g = s.gs[0];
  const stuur = (body) => s.alsSpeler(g, () => N.handleEvent(g.w, { k: 'beloning', ...body }));
  assert.equal(stuur({ geld: 100, vak: 'bestaatniet', xp: 50 }), true); assert.equal(g.w.money, 100); assert.equal(g.profiel.vakken.bus.xp, L.XP_DREMPELS[2]);
  stuur({ geld: 100, vak: { x: 1 }, xp: 50 }); assert.equal(g.w.money, 200);
  stuur({ geld: 100, vak: 'bus', xp: -50 }); assert.equal(g.profiel.vakken.bus.xp, L.XP_DREMPELS[2], 'negatieve punten tellen niet');
  stuur({ geld: 100, vak: 'bus', xp: NaN }); stuur({ geld: 100, vak: 'bus', xp: 'veel' }); assert.equal(g.profiel.vakken.bus.xp, L.XP_DREMPELS[2]);
  stuur({ geld: 100, vak: 'bus', xp: 1e12 }); assert.equal(g.profiel.vakken.bus.xp, L.XP_DREMPELS[2] + 500, 'een bericht geeft hooguit 500 punten');
  assert.equal(stuur({ geld: -5, vak: 'bus', xp: 20 }), false); assert.equal(stuur({ geld: 0, vak: 'bus', xp: 20 }), false);
  assert.equal(g.profiel.vakken.bus.xp, L.XP_DREMPELS[2] + 500, 'een ongeldige beloning telt ook geen punten');
  assert.equal(N.handleEvent(s.host.w, { k: 'beloning', geld: 100, vak: 'bus', xp: 20 }), false, 'de gastheer luistert er niet naar');
  assert.equal(s.host.profiel.vakken.bus.xp, 0);
});

for (const spelers of [8, 16]) {
  t(`${spelers} spelers met elk een ander niveau: iedereen krijgt zijn eigen bedrag`, () => {
    const niveaus = Array.from({ length: spelers - 1 }, (_, i) => ({ trein: (i % 6) + 1 }));
    const s = avond(niveaus);
    s.step(4);
    s.alsSpeler(s.host, () => Live.loopbaanVerdien(s.host.w, 'trein', 200, { xp: 20 }));
    s.step(3);
    s.gs.forEach((g, i) => {
      assert.equal(g.w.money, L.loon(metXp(niveaus[i]), 'trein', 200), `speler ${i + 1}: niveau ${(i % 6) + 1}`);
      assert.equal(g.profiel.vakken.trein.xp, L.XP_DREMPELS[i % 6] + 20);
    });
    assert.equal(new Set(s.gs.map((g) => g.w.money)).size, 6, 'zes verschillende bedragen voor zes niveaus');
  });
}

t('een gast neemt zijn loopbaan mee naar een andere wereld: de opslag is van hem, niet van wie het spel opende', () => {
  const opslag = new Map();
  const st = { getItem: (k) => (opslag.has(k) ? opslag.get(k) : null), setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
  Live.initLoopbaan({ opslag: st });
  const w = mkWorld();
  Live.loopbaanGast(w, 50, 'bus', 400);
  Live.schrijfNu();
  assert.deepEqual([...opslag.keys()], ['gde-loopbaan-v1'], 'alleen de eigen sleutel');
  // een andere wereld, later: dezelfde speler, hetzelfde apparaat
  const p = Live.initLoopbaan({ opslag: st });
  assert.equal(p.vakken.bus.xp, 400); assert.equal(L.niveauVoorVak(p, 'bus'), 4);
  Live.zetProfielVoorTest(null, null);
});

t('de savegame van een gast bevat geen loopbaan: coopsave.js bewaart alleen geld en spullen', () => {
  const bron = fs.readFileSync(new URL('../game/js/coopsave.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
  assert.ok(!/loopbaan/i.test(bron));
});

console.log(`loopbaan_coop_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
