// Samen spelen: de volledige regressie bij 2, 4, 8 en 16 spelers, zonder Electron (donderdag 22-10, voor de test van vrijdag 23-10):
//   node scripts/coop/regressie_test.mjs [--n=2,4,8,16]
// Dezelfde koppeling als in het spel (coopnet.js, hub, sessies) op een nep-wereld per speler, over een in-memory transport met vertraging.
// Per aantal spelers, in deze volgorde: lobby (lijst, namen, kleuren, vormen, een speler te veel), het hek van de wachtkamer, een filmpje,
// de opdracht van de gastheer (stappen, gelukt, mislukt, gestopt #390), de pauze van de gastheer (iedereen blijft beweegbaar) en de eigen
// pauze van een gast, een kaartdoel ver weg en een teleport, in- en uitstappen (3 plekken in een auto, 6 in een bus), beloningen met
// loopbaan (#381), roepjes van iedereen tegelijk, wegvallen van een speler, en dat een Stuntavond (#392) alleen bij de gastheer speelt.
// De echte TCP-kant staat in scripts/coop/regressie_tcp_test.mjs, de Electron-kant in docs/COOP-TESTBANK.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import { coopStep } from '../../game/js/coopglue.js';
import { setGate, gateOn } from '../../game/js/coopgate.js';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const AANTALLEN = String(arg('n', '2,4,8,16')).split(',').map(Number).filter((x) => x >= 2 && x <= 16);
let checks = 0;
const bron = (p) => fs.readFileSync(new URL('../../game/js/' + p, import.meta.url), 'utf8');
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
const match = (s, re, m) => { checks++; assert.match(s, re, m); };
const nomatch = (s, re, m) => { checks++; assert.doesNotMatch(s, re, m); };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita', vx: 0, vy: 0, radius: 0.4 }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });
const tekst = (w) => w.messages.join(' | ');
const aantal = (w, re) => w.messages.filter((m) => re.test(m)).length;

// host + gasten; de host draait ook "companion.js": Tessa loopt op de invoer van haar speler zolang het spel niet op pauze staat
function avond(spelers, { max = spelers, scene } = {}) {
  const hw = mkWorld(), gs = [], holds = [];
  N.startHost(hw, INFO, { seed: 5, max, scene, onHold: (r, slot, reden) => holds.push([r, slot, reden]) });
  const sluit = (i) => {
    const link = createLink({ latency: 0.04, jitter: 0.015, loss: 0, seed: 11 + i * 7 });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    const g = { gw, link }; gs.push(g); return g;
  };
  for (let i = 0; i < spelers - 1; i++) sluit(i);
  const step = (secs, f) => {
    for (let k = 0; k < Math.round(60 * secs); k++) {
      if (f) f(k);
      if (!hw.paused && !hw.companion.inVehicle) coopStep(hw.companion, 1 / 60, hw, hw.coopMove || ((q, d) => { q.x += q.vx * d; q.y += q.vy * d; }));
      N.tickCoopNet(hw, 1 / 60);
      for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; }
      hw.time += 1 / 60;
    }
  };
  return { hw, gs, holds, step, sluit, all: () => [hw, ...gs.map((g) => g.gw)] };
}

for (const spelers of AANTALLEN) {
  const t0 = Date.now();
  const gasten = spelers - 1;
  let filmpje = false, hostW = null;
  const s = avond(spelers, { max: Math.max(spelers, 4), scene: () => ({ filmpje, pauze: !!(hostW && hostW.paused && !hostW.coopHold), regel: filmpje ? { wie: 'Tessa', tekst: 'Dit is het.' } : null, keuze: null }) });
  hostW = s.hw;
  s.step(4);
  const gw = s.gs.map((g) => g.gw), tessa = gw[0];
  const figs = () => Object.values(s.hw.coopFigures).sort((a, b) => a.slot - b.slot);

  // ---- 1. lobby
  eq(s.hw.coopRoster.length, spelers, `${spelers}: de lijst van de gastheer`);
  eq(new Set(s.hw.coopRoster.map((r) => r.naam)).size, spelers, `${spelers}: eigen namen`);
  eq(new Set(s.hw.coopRoster.map((r) => r.kleur)).size, spelers, `${spelers}: eigen kleuren`);
  eq(new Set(s.hw.coopRoster.map((r) => r.vorm)).size, spelers, `${spelers}: eigen vormen (kleur is nooit het enige signaal)`);
  for (const w of gw) { eq(w.coopRoster.length, spelers, `${spelers}: elke gast ziet ${spelers} spelers`); eq(w.coopPartners.length, spelers - 1, `${spelers}: en ${spelers - 1} anderen op de kaart`); eq(w.coopNet.session.status, 'ok', `${spelers}: verbonden`); }
  eq(s.hw.coopSpelers.length, spelers, `${spelers}: de Tab-lijst heeft ${spelers} rijen`);
  eq(s.hw.coopSpelers[0].jij, true, `${spelers}: de gastheer staat bovenaan`);
  if (spelers >= 4) { // het maximum is bereikt: een speler te veel wordt netjes geweigerd
    const max = Math.max(spelers, 4), vol = avond(max, { max });
    vol.step(3); const extra = vol.sluit(max); vol.step(3);
    eq(vol.hw.coopRoster.length, max, `${max}: de lijst blijft ${max}`);
    ok(extra.gw.coopWeigering, `${max}: de speler te veel krijgt een reden: ${extra.gw.coopWeigering}`);
    eq(extra.gw.coopNet, null, `${max}: en speelt weer zelf`);
  }

  // ---- 2. het hek van de wachtkamer (een nieuw spel: niemand begint voor de gastheer start)
  setGate(true); s.hw.coopNet.hub.announce({ k: 'hek', aan: true }); s.step(1);
  ok(gw.every((w) => w.coopHek === true) && gateOn(), `${spelers}: het hek is dicht bij iedereen`);
  N.openHek(s.hw); s.step(1);
  ok(gw.every((w) => w.coopHek === false) && !gateOn(), `${spelers}: Spel starten opent het hek bij iedereen`);

  // ---- 3. een filmpje van de gastheer: iedereen wacht, daarna loopt iedereen weer
  for (const w of gw) w.input.axis = () => [1, 0];
  filmpje = true; s.step(2);
  ok(gw.every((w) => w.coopScene && w.coopScene.filmpje && w.coopNet.session.pendingInput.mx === 0), `${spelers}: iedereen staat stil tijdens het filmpje`);
  match(tekst(tessa), /Tammo kijkt een filmpje/, `${spelers}: en weet waarom`);
  filmpje = false; s.step(2);
  ok(gw.every((w) => !w.coopScene && w.coopNet.session.pendingInput.mx === 1), `${spelers}: daarna weer in beweging`);
  for (const w of gw) w.input.axis = () => [0, 0];

  // ---- 4. de opdracht van de gastheer: stap, gelukt, mislukt, gestopt (#390)
  s.hw.mission = { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', marker: { x: 30, y: 30 } }; s.step(3);
  for (const w of gw) { match(tekst(w), /Tammo speelt: Het Loket/, `${spelers}: opdracht gemeld`); eq(w.coopHost.doelen.length, 1, `${spelers}: het doel staat op de kaart`); }
  s.hw.mission.progressText = 'Rij naar het loket'; s.step(2);
  ok(gw.every((w) => /volgende stap: Rij naar het loket/.test(tekst(w))), `${spelers}: de volgende stap`);
  s.hw.coopUitslag(true, 'Het Loket', '', 400); s.step(1);
  ok(gw.every((w) => /Het Loket gelukt! Tammo en jij hebben het samen gedaan\. Jouw deel: €200\./.test(tekst(w))), `${spelers}: gelukt met jouw deel`);
  s.hw.coopUitslag(false, 'De Kluis', 'te laat', 0); s.step(1);
  ok(gw.every((w) => /De Kluis mislukt: te laat/.test(tekst(w))), `${spelers}: mislukt met reden`);
  s.hw.coopUitslag(false, 'Het Loket', '', 0, true); s.hw.mission = { phase: 'idle' }; s.step(2);
  for (const w of gw) { match(tekst(w), /Tammo heeft Het Loket gestopt, voor iedereen\. Tammo kan hem opnieuw starten\./, `${spelers}: gestopt, voor iedereen`); eq(w.coopHostMissie.actief, false, `${spelers}: geen opdracht meer`); eq(w.coopHost.doelen.length, 0, `${spelers}: geen doel meer`); }
  nomatch(tekst(tessa), /Het Loket mislukt/, `${spelers}: gestopt is geen mislukking`);

  // ---- 5. de pauze van de gastheer (menu, kaart, winkel): iedereen blijft beweegbaar; de eigen pauze van een gast is alleen zijn eigen
  for (const w of gw) w.input.axis = () => [0, -1];
  const voor = [s.hw.companion.x, ...figs().map((f) => f.x)];
  s.hw.paused = true; s.step(2);
  const na = [s.hw.companion.x, ...figs().map((f) => f.x)];
  ok(na.every((x, i) => x - voor[i] > 4), `${spelers}: iedereen loopt door tijdens de pauze van de gastheer: ${na.map((x, i) => (x - voor[i]).toFixed(1)).join(' ')}`);
  ok(gw.every((w) => w.coopScene && w.coopScene.pauze), `${spelers}: iedereen leest dat de gastheer pauzeert (laag met de tekst)`);
  const laatste = gw[gw.length - 1]; laatste.paused = true; s.step(1);
  eq(laatste.coopNet.session.pendingInput.mx, 0, `${spelers}: een gast in zijn eigen menu staat stil`);
  ok(gw.slice(0, -1).every((w) => w.coopNet.session.pendingInput.my !== 0) || spelers === 2, `${spelers}: en de rest loopt door`);
  laatste.paused = false; s.hw.paused = false; for (const w of gw) w.input.axis = () => [0, 0]; s.step(1);

  // ---- 6. een kaartdoel ver weg en een teleport van de gastheer: wie meeloopt wordt bij de groep gezet, niemand blijft vastzitten
  s.hw.player.x = 5000; s.hw.player.y = 100; s.step(1.5);
  ok([s.hw.companion, ...figs()].every((f) => Math.hypot(f.x - 5000, f.y - 100) < 6), `${spelers}: na een teleport staat iedereen bij de gastheer`);
  tessa.input.axis = () => [0, -1]; tessa.input.isDown = (k) => k === 'shift';
  const c = s.hw.companion; let ver = 0; s.step(24, () => { ver = Math.max(ver, Math.hypot(c.x - s.hw.player.x, c.y - s.hw.player.y)); });
  ok(ver > 76, `${spelers}: Tessa kan ver voorbij de oude lijn van 38 m: ${ver.toFixed(0)}`);
  match(tekst(tessa), /Blijf bij de groep/, `${spelers}: met een waarschuwing`);
  tessa.input.axis = () => [0, 0]; tessa.input.isDown = () => false; s.step(1); N.bijGroepGebaar(tessa); s.step(2);
  ok(Math.hypot(c.x - s.hw.player.x, c.y - s.hw.player.y) < 6, `${spelers}: en daarna weer bij de groep`);

  // ---- 7. in- en uitstappen
  const auto = { id: 7, x: 5000, y: 100, angle: 0, speed: 0, halfWid: 1, model: { len: 4 } };
  s.hw.vehicles = [auto]; s.hw.player.inVehicle = auto; s.step(1);
  match(tekst(tessa), /Tammo zit in een voertuig\. Druk bij het voertuig op E om mee te rijden\./, `${spelers}: Tessa leest hoe ze meerijdt`);
  ok(!tessa.coopInVoertuig, `${spelers}: ze gaat niet vanzelf mee`);
  if (figs().length) {
    for (const f of figs()) { f.x = 5000 + 2; f.y = 100 + f.slot * 0.3; }
    for (const [i, w] of gw.entries()) if (i >= 1) w.coopNet.session.sendEvent({ k: 'gebruik' });
    s.step(2);
    const erin = figs().filter((f) => f.inVeh === auto).length, plekken = Math.min(figs().length, 3);
    eq(erin, plekken, `${spelers}: een auto heeft drie plekken voor extra spelers (${erin} van ${figs().length})`);
    if (figs().length > 3) ok(gw.slice(1).filter((w) => /Er is geen plek meer/.test(tekst(w))).length === figs().length - 3, `${spelers}: wie geen plek krijgt leest waarom`);
    auto.speed = 20; s.step(1, () => { auto.x += 20 / 60; s.hw.player.x = auto.x; });
    ok(figs().filter((f) => f.inVeh === auto).every((f) => Math.abs(f.x - auto.x) < 0.5), `${spelers}: wie meerijdt rijdt mee`);
    auto.speed = 0; for (const [i, w] of gw.entries()) if (i >= 1) w.coopNet.session.sendEvent({ k: 'gebruik' }); s.step(2);
    eq(figs().filter((f) => f.inVeh).length, 0, `${spelers}: bij stilstand stappen ze uit met E`);
    // een bus heeft zes plekken; de gastheer stapt uit: dan staat iedereen ernaast
    const bus = { id: 9, x: auto.x, y: auto.y, angle: 0, speed: 0, isBus: true, halfWid: 1.3, model: { len: 11 } };
    s.hw.player.inVehicle = bus; for (const f of figs()) { f.x = bus.x + 2; f.y = bus.y + f.slot * 0.3; f.inVeh = null; }
    for (const [i, w] of gw.entries()) if (i >= 1) w.coopNet.session.sendEvent({ k: 'gebruik' }); s.step(2);
    eq(figs().filter((f) => f.inVeh === bus).length, Math.min(figs().length, 6), `${spelers}: een bus heeft zes plekken`);
    s.hw.player.inVehicle = null; s.step(1);
    eq(figs().filter((f) => f.inVeh).length, 0, `${spelers}: stapt de gastheer uit, dan stapt iedereen uit`);
  }
  s.hw.player.inVehicle = null; s.hw.vehicles = []; s.step(1);

  // ---- 8. beloningen met loopbaan (#381): elke gast zijn eigen deel, het bedrag nooit uit het niets
  const geld0 = gw.map((w) => w.money || 0);
  eq(N.deelMetGasten(s.hw, 1000, { vak: 'bijbaan', basis: 1000, xp: 20 }), gasten, `${spelers}: elke verbonden gast krijgt zijn deel`); s.step(1.5);
  ok(gw.every((w, i) => (w.money || 0) - geld0[i] >= 500 - 1 && aantal(w, /^Beloning: €/) >= 1), `${spelers}: in zijn eigen portemonnee: ${gw.map((w, i) => (w.money || 0) - geld0[i]).join(',')}`);
  eq(s.hw.money, 0, `${spelers}: de gastheer krijgt niets extra uit het delen`);

  // ---- 9. roepjes: iedereen tegelijk
  for (const w of s.all()) { w.audioEvents = []; w.messages.length = 0; w.input.s.add('7'); }
  s.step(2);
  for (const w of s.all()) { eq(w.coopPingMarks.length, spelers, `${spelers}: een baken per speler`); eq(new Set(w.coopPingMarks.map((m) => m.naam)).size, spelers, `${spelers}: elk met een eigen naam`); eq(w.audioEvents.length, spelers - 1, `${spelers}: een pling per ander`); }
  s.step(10); ok(s.all().every((w) => w.coopPingMarks.length === 0), `${spelers}: na 8 s zijn ze weg`);

  // ---- 10. neergaan en gepakt worden
  s.hw.pendingRespawn = { busted: true }; s.step(1.5);
  ok(gw.every((w) => aantal(w, /Tammo is door de politie gepakt/) === 1 && w.coopPartners.find((p) => p.naam === 'Tammo').status === 'neer'), `${spelers}: gepakt, één keer, label 'neer'`);
  s.hw.pendingRespawn = null; s.step(1);
  ok(gw.every((w) => w.coopPartners.find((p) => p.naam === 'Tammo').status !== 'neer'), `${spelers}: weer op de been`);

  // ---- 11. een speler valt weg: de rest speelt door (Tessa houdt het spel op)
  const laatsteLink = s.gs[s.gs.length - 1].link; laatsteLink.cut(); s.step(8);
  eq(s.hw.coopRoster[s.hw.coopRoster.length - 1].verbinding, 'lost', `${spelers}: de laatste speler is weg`);
  ok(!s.holds.some((h) => h[0] === 'host'), `${spelers}: een speler weg houdt het spel niet op (#452)`);
  eq(N.deelMetGasten(s.hw, 1000), gasten - 1, `${spelers}: wie weg is krijgt geen beloning`);

  console.log(`  ${spelers} spelers: ok (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// ---- de Stuntavond (#392) en omverrijden: alleen bij de gastheer, niets voor een gast in een sessie
{
  const o = bron('omverrijden.js'); match(o, /coopRole === 'client'/, 'omverrijden: een gast krijgt niets');
  const m = bron('missions.js'); match(m, /world\.coopDeel\(reward/, 'de beloning van de Stuntavond (een opdracht) wordt gedeeld');
}
console.log(`regressie_test: ${checks} controles ok (spelers: ${AANTALLEN.join(', ')})`);
