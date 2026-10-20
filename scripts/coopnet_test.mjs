// Samen spelen (#95): host en gasten aan wereld-achtige objecten gekoppeld over een in-memory
// transport (game/js/coopnet.js, coopclient.js, coopglue.js): naadloos erin en eruit, eigen
// voortgang voor ieder, vaste personages, N spelers (4 en meer), verwijderen, beloning, pings,
// pauze bij wegvallen per speler.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as C from '../game/js/coopclient.js';
import { remoteP2, cameraRelative } from '../game/js/coop.js';
import { coopStep } from '../game/js/coopglue.js';

let n = 0;
const t = (name, f) => { f(); n++; };

const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 3, vy: 3 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0.5, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [1, 0], isDown: () => false }, ...extra });

// een sessie met een host en `gasten` (elk met eigen wereld en eigen link)
function sessie(gasten = 1, { hostExtra, gastExtra = [], opts = {}, wens = [] } = {}) {
  const hw = mkWorld(hostExtra), fades = [], holds = [];
  N.startHost(hw, INFO, { seed: 5, max: opts.max, fade: (d) => fades.push('h:' + d), onHold: (r, slot, reden) => holds.push([r, slot, reden]) });
  const gs = [];
  for (let i = 0; i < gasten; i++) {
    const link = createLink({ latency: 0.03, jitter: 0.01, seed: 2 + i });
    N.addGuest(hw, link.a);
    const gw = mkWorld(gastExtra[i]);
    N.startClient(gw, link.b, INFO, { fade: (d) => fades.push(`g${i + 1}:` + d), onHold: (r, slot) => holds.push([r + i, slot]), wens: wens[i] });
    gs.push({ gw, link });
  }
  const step = (secs, f) => { for (let k = 0; k < 60 * secs; k++) { if (f) f(k); N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  return { hw, gs, fades, holds, step };
}

t('vaste personages: host Tammo, gast Tessa, extra spelers een eigen figuur', () => {
  const h = mkWorld(), g = mkWorld(), x = mkWorld();
  C.setFixedCharacters(h, 0); C.setFixedCharacters(g, 1); C.setFixedCharacters(x, 2, 'bram');
  assert.deepEqual([h.player.character, h.companion.character], ['tammo', 'anita']);
  assert.deepEqual([g.player.character, g.companion.character], ['anita', 'tammo']);
  assert.equal(x.player.coopChar, 'bram'); assert.equal(x.companion.character, 'tammo');
  assert.equal(C.mySlotOf('host'), 0); assert.equal(C.mySlotOf('client'), 1); assert.equal(C.mySlotOf(3), 3);
});
t('lichamen per plek: wie is mijn lichaam, wie mijn metgezel, wie een figuur', () => {
  const w = mkWorld();
  assert.equal(C.bodyFor(w, 1, 1), w.player); assert.equal(C.bodyFor(w, 1, 0), w.companion); assert.equal(C.bodyFor(w, 1, 2), null);
  assert.equal(C.bodyFor(w, 0, 0), w.player); assert.equal(C.bodyFor(w, 0, 1), w.companion);
  assert.equal(C.bodyFor(w, 3, 3), w.player); assert.equal(C.bodyFor(w, 3, 0), w.companion);
  const f = C.ensureFigure(w, 2, 'sanne'); assert.equal(f.naam, 'Sanne'); assert.equal(C.bodyFor(w, 3, 2), f); assert.equal(C.bodyFor(w, 0, 2), f);
});
t('aansluiten kan niet midden in iets: voertuig, duif, filmpje', () => {
  assert.equal(N.canJoin(mkWorld()).ok, true);
  assert.match(N.canJoin(mkWorld({ player: { inVehicle: {} } })).reason, /uit je voertuig/);
  assert.match(N.canJoin(mkWorld({ pigeonMode: true })).reason, /duif/);
  assert.match(N.canJoin(mkWorld({ cameraOverride: {} })).reason, /filmpje/);
  assert.throws(() => N.startClient(mkWorld({ player: { inVehicle: {} } }), createLink().b, INFO), /voertuig/);
});
t('invoer van de camerahoek: schermrichting wordt wereldrichting', () => {
  assert.deepEqual(C.makeClientInput([1, -1], true, 0.5), { mx: 1, my: -1, buttons: 1, yaw: 0.5 });
  const d = cameraRelative({ x: 1, y: 0 }, 0); assert.equal(d.x + 0, 0); assert.equal(d.y, 1);
  const e = cameraRelative({ x: 0, y: -1 }, 0); assert.deepEqual([e.x, e.y], [1, 0]);
});
t('twee spelers end-to-end: invoer naar de host, toestand terug, fade, Tessa als metgezel', () => {
  const s = sessie(1, { hostExtra: { money: 250, wanted: 2 }, gastExtra: [{ money: 40 }] });
  s.step(2, () => { s.hw.player.x = 10; s.hw.companion.x = 20; s.hw.companion.y = 5; });
  const gw = s.gs[0].gw;
  assert.equal(gw.coopNet.session.status, 'ok'); assert.equal(gw.coopNet.session.slot, 1);
  assert.equal(s.hw.coop.remote, true); assert.ok(Math.abs(s.hw.coop.remoteInput.yaw - 0.5) < 0.01);
  assert.equal(remoteP2(s.hw.coop.remoteInput).x, 1);
  assert.ok(Math.abs(gw.companion.x - 10) < 0.5 && Math.abs(gw.player.x - 20) < 0.5);
  assert.equal(gw.wanted, 2, 'wanted is gedeeld'); assert.equal(gw.money, 40); assert.equal(s.hw.money, 250);
  assert.ok(s.fades.includes('g1:in') && s.fades.includes('h:in'));
  assert.equal(s.hw.coopPartner.naam, 'Tessa'); assert.equal(gw.coopPartner.naam, 'Tammo');
});
t('vier spelers: iedereen krijgt zijn eigen figuur, ziet de anderen met naam en kleur, en beweegt zijn eigen figuur via de host', () => {
  const s = sessie(3, { wens: [undefined, 'bram', 'lotte'] });
  s.step(2);
  const [g1, g2, g3] = s.gs.map((x) => x.gw);
  assert.deepEqual(s.gs.map((x) => x.gw.coopNet.session.slot), [1, 2, 3]);
  assert.equal(g2.player.coopChar, 'bram'); assert.equal(g3.player.coopChar, 'lotte');
  assert.deepEqual(s.hw.coopRoster.map((r) => r.naam), ['Tammo', 'Tessa', 'Bram', 'Lotte']);
  // bewegen: gast 2 (Bram) loopt naar rechts; de host simuleert zijn figuur
  g2.input = { axis: () => [1, 0], isDown: () => false }; g2.camYaw = 0;
  const f0 = s.hw.coopFigures[2];
  const x0 = f0.x; s.step(2);
  assert.ok(Math.hypot(f0.x - x0, f0.y - s.hw.player.y - 1.5) > 2 || Math.abs(f0.x - x0) > 2 || Math.abs(f0.y - (s.hw.player.y + 1.5)) > 2, 'Bram is gelopen');
  // iedereen ziet iedereen
  s.step(1);
  assert.deepEqual(g1.coopPartners.map((p) => p.naam).sort(), ['Bram', 'Lotte', 'Tammo']);
  assert.deepEqual(g3.coopPartners.map((p) => p.naam).sort(), ['Bram', 'Tammo', 'Tessa']);
  assert.equal(Object.keys(g3.coopFigures).length, 2, 'op Lotte staan Tessa en Bram als figuur');
  assert.ok(Math.abs(g3.coopFigures[2].x - f0.x) < 2, 'de figuur van Bram staat op de client waar hij op de host staat');
  assert.deepEqual(new Set(s.hw.coopPartners.map((p) => p.kleur)).size, 3);
});
t('eigen voortgang voor ieder: het geld van elke gast blijft van hem; beloningen per speler', () => {
  const s = sessie(2, { hostExtra: { money: 250 }, gastExtra: [{ money: 40 }, { money: 7 }] });
  s.step(2);
  assert.equal(N.payGuest(s.hw, 100, 1), true); assert.equal(N.payGuest(s.hw, 30, 2), true);
  s.step(1);
  assert.deepEqual([s.hw.money, s.gs[0].gw.money, s.gs[1].gw.money], [250, 140, 37]);
  N.payGuest(s.hw, 5); s.step(1);
  assert.deepEqual([s.gs[0].gw.money, s.gs[1].gw.money], [145, 42], 'zonder plek krijgt iedereen het');
});
t('een beloning wordt ook bijgehouden voor de eigen save van de gast', () => {
  const s = sessie(2, { hostExtra: { money: 0 }, gastExtra: [{ money: 40 }] });
  s.step(2); N.payGuest(s.hw, 100, 1); s.step(1); N.payGuest(s.hw, 20, 1); s.step(1);
  assert.equal(s.gs[0].gw.coopVerdiend, 120); assert.equal(s.hw.coopVerdiend, undefined, 'de host krijgt zijn geld gewoon in zijn save');
});
t('na het vertrek staat de bijgehouden beloning op nul (het geld zit in world.money), zodat een volgende sessie het niet nog eens in de save zet', () => {
  const s = sessie(1, { gastExtra: [{ money: 40 }] }); s.step(2);
  N.payGuest(s.hw, 100, 1); s.step(1);
  const g = s.gs[0].gw; assert.equal(g.coopVerdiend, 100); assert.equal(g.money, 140);
  N.stopCoopNet(g);
  assert.equal(g.coopVerdiend, 0); assert.equal(g.money, 140);
});
t('beloningen worden begrensd en alleen gasten ontvangen ze', () => {
  const s = sessie(1); s.step(1);
  const gw = s.gs[0].gw;
  assert.equal(N.handleEvent(gw, { k: 'beloning', geld: -5 }), false);
  assert.equal(N.handleEvent(gw, { k: 'beloning', geld: 'veel' }), false);
  N.handleEvent(gw, { k: 'beloning', geld: 9e12 }); assert.equal(gw.money, N.MAX_REWARD);
  assert.equal(N.handleEvent(s.hw, { k: 'beloning', geld: 100 }), false); assert.equal(s.hw.money, 0);
  assert.equal(N.payGuest(gw, 5), false, 'een gast kan niemand betalen');
});
t('vertrek van een gast: terug op de eigen plek, met eigen wanted, personage en beloning; de rest speelt door', () => {
  const s = sessie(2, { hostExtra: { wanted: 3 }, gastExtra: [{ wanted: 1, player: { x: 77, y: 88, angle: 1.25, character: 'anita', vx: 0, vy: 0 } }, {}] });
  const g1 = s.gs[0].gw;
  s.step(2, () => { s.hw.player.x = 500; s.hw.companion.x = 520; });
  assert.equal(g1.wanted, 3); assert.ok(g1.player.x > 400);
  N.payGuest(s.hw, 150, 1); s.step(1);
  N.stopCoopNet(g1);
  assert.deepEqual([g1.player.x, g1.player.y, g1.player.angle, g1.wanted], [77, 88, 1.25, 1]);
  assert.equal(g1.player.character, 'anita'); assert.equal(g1.coop.fixedChars, false); assert.equal(g1.money, 150);
  assert.equal(g1.coopRole, null);
  s.step(2);
  assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 2], 'de plek van Tessa is vrij');
  assert.equal(s.gs[1].gw.coopNet.session.status, 'ok');
});
t('host verwijdert één speler: bericht, dan verbreken; de rest speelt door', () => {
  const s = sessie(2, { gastExtra: [{}, { player: { x: 5, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 } }] }); s.step(2);
  const [a, b] = s.gs.map((x) => x.gw);
  assert.equal(N.removeGuest(a, 1), false, 'een gast kan niemand verwijderen');
  assert.equal(N.removeGuest(s.hw, 2), true); assert.equal(N.removeGuest(s.hw, 9), false);
  s.step(2);
  assert.equal(b.coopNet, null); assert.equal(b.player.x, 5); assert.equal(b.coopRole, null);
  assert.match(b.messages.join(' '), /uit het spel van de gastheer gehaald/);
  assert.equal(a.coopNet.session.status, 'ok'); assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 1]);
});
t('pings: komen bij iedereen aan met de afzender; cooldown; ongeldige of onbekende worden genegeerd', () => {
  const s = sessie(2); s.step(2);
  const [a, b] = s.gs.map((x) => x.gw);
  assert.equal(N.sendPing(a, 12, 34, 'doel'), true); assert.equal(N.sendPing(a, 1, 1), false, 'te snel');
  s.step(1);
  assert.ok(s.hw.coopPings.lijst.some((p) => p.van === '1' && p.x === 12), 'host ziet de ping van plek 1');
  assert.ok(b.coopPings.lijst.some((p) => p.van === '1' && p.x === 12), 'de andere gast ook');
  assert.equal(N.handleEvent(b, { k: 'ping', x: NaN, y: 0 }), false);
  assert.equal(N.handleEvent(b, { k: 'iets-nieuws', x: 1 }), false);
  N.sendPing(s.hw, 5, 6); s.step(1);
  assert.ok(a.coopPings.lijst.some((p) => p.van === '0'));
});
t('pauze per speler: Tessa houdt het spel op; een extra speler niet, tenzij de opdracht hem nodig heeft', () => {
  const s = sessie(3); s.step(2);
  s.gs[2].link.cut(); s.step(7);
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host'), [], 'een extra speler valt weg: geen pauze voor de rest');
  assert.equal(s.hw.coopRoster.find((r) => r.slot === 3).verbinding, 'lost');
  assert.equal(s.hw.coopNet.hub.status(1), 'ok');
  s.hw.coopVereist = [2]; s.gs[1].link.cut(); s.step(7);
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host').map((h) => h[1]), [2], 'de opdracht had plek 2 nodig');
  s.gs[0].link.cut(); s.step(7);
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host').map((h) => h[1]), [2, 1], 'Tessa houdt het spel altijd op');
  assert.equal(s.hw.coop.remote, false, 'Tessa valt terug op de volg-AI');
});
t('maximum: instelbaar (hier 4); de vijfde moet wachten tot het maximum omhoog gaat', () => {
  const s = sessie(4, { opts: { max: 4 } }); s.step(3);
  assert.equal(s.gs[3].gw.coopNet.session.status, 'geweigerd'); assert.equal(s.gs[3].gw.coopNet.session.rejected, 'vol');
  assert.equal(N.setMaxPlayers(s.hw, 8), 8);
  const hw = s.hw, link = createLink({ latency: 0.03, seed: 50 }); N.addGuest(hw, link.a);
  const gw = mkWorld(); N.startClient(gw, link.b, INFO);
  for (let k = 0; k < 180; k++) { N.tickCoopNet(hw, 1 / 60); N.tickCoopNet(gw, 1 / 60); link.advance(1 / 60); }
  assert.equal(gw.coopNet.session.status, 'ok'); assert.equal(hw.coopRoster.length, 5);
});
t('zonder gast loopt de metgezel op de volg-AI; met gast stuurt de gast, zonder toetsenbord', () => {
  const w = mkWorld(); let moved = 0;
  w.coop.local = false; w.coop.remote = false;
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), false);
  w.coop.remote = true; w.coop.remoteInput = { mx: 1, my: 0, buttons: 0, yaw: 0 };
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), true); assert.equal(moved, 1);
  w.coop.input = w.input; w.coop.remote = false; w.coop.local = true;
  assert.equal(coopStep(w.companion, 0.016, w, () => { moved++; }), true);
});
t('de host stopt: alle gasten gaan eruit, de host is weer alleen en het oude gedrag is terug', () => {
  const s = sessie(2); s.step(2);
  N.stopCoopNet(s.hw);
  assert.equal(s.hw.coopNet, null); assert.equal(s.hw.coopRole, null); assert.equal(s.hw.coop.local, true); assert.equal(s.hw.coop.fixedChars, false);
  for (const g of s.gs) { for (let k = 0; k < 90; k++) { N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); } }
  assert.ok(s.gs.every((g) => g.gw.coopNet === null || g.gw.coopNet.session.status !== 'ok'));
});
t('de wereld van de host: voertuigen en doel komen bij de gasten aan, en de opdracht wordt gemeld (ook aan wie later komt)', () => {
  const vehicles = [{ id: 11, x: 5, y: 5, angle: 1, isBus: true, model: { len: 11 } }, { id: 12, x: 900, y: 0, angle: 0, model: { len: 4 } }];
  const s = sessie(1, { hostExtra: { vehicles, mission: { phase: 'active', label: 'Berend telt de krassen', type: 'delivery', index: 2, marker: { x: 50, y: 60 } } } });
  s.step(2);
  const gw = s.gs[0].gw;
  assert.deepEqual(gw.coopHost.voertuigen.map((v) => v.soort), ['bus'], 'alleen wat dicht bij een speler is');
  assert.equal(gw.coopHost.doelen.length, 1); assert.ok(Math.abs(gw.coopHost.doelen[0].x - 50) < 0.01);
  assert.match(gw.messages.join(' '), /De gastheer speelt: Berend telt de krassen\. Doe mee waar het kan/);
  assert.equal(gw.coopHostMissie.label, 'Berend telt de krassen');
  s.hw.mission = { phase: 'idle' }; s.step(1);
  assert.equal(gw.coopHostMissie.actief, false);
});
t('een extra speler hoort dat hij in de open wereld meeloopt', () => {
  const s = sessie(2, { hostExtra: { mission: { phase: 'active', label: 'Kluisklus', index: 1, marker: { x: 1, y: 1 } } } });
  s.step(3);
  assert.match(s.gs[0].gw.messages.join(' '), /Doe mee waar het kan/);
  assert.match(s.gs[1].gw.messages.join(' '), /Jij loopt mee in de open wereld/);
});
t('gedeelde camera: alleen de eerste twee delen hem; extra spelers hebben hun eigen camera', () => {
  const s = sessie(2); s.step(3, () => { s.hw.player.x = 0; s.hw.companion.x = 10; s.hw.companion.y = 0; });
  const [tessa, bram] = s.gs.map((g) => g.gw);
  assert.ok(s.hw.coopCam && Math.abs(s.hw.coopCam.x - 5) < 6, 'de host deelt met Tessa');
  assert.ok(tessa.coopCam, 'Tessa deelt met Tammo');
  assert.equal(bram.coopCam, null, 'plek 2 heeft een eigen camera');
  s.step(1, () => { s.hw.companion.x = 400; });
  assert.equal(s.hw.coopCam, null, 'te ver uit elkaar: ieder zijn eigen camera');
});
t('gedeelde speelklok: de tijd van de dag van de gast volgt die van de host, ook met 3 gasten', () => {
  const s = sessie(3, { hostExtra: { clock: 9 }, gastExtra: [{ clock: 20 }, { clock: 3 }, { clock: 12 }] });
  s.step(2, (k) => { s.hw.clock = (s.hw.clock + 0.02 / 60) % 24; s.hw.time = (s.hw.time || 0) + 1 / 60; for (const g of s.gs) g.gw.time = (g.gw.time || 0) + 1 / 60; });
  s.step(30, (k) => { s.hw.clock = (s.hw.clock + 0.02 / 60) % 24; s.hw.time = (s.hw.time || 0) + 1 / 60; for (const g of s.gs) g.gw.time = (g.gw.time || 0) + 1 / 60; });
  for (const g of s.gs) {
    const d = Math.abs(((g.gw.clock - s.hw.clock + 36) % 24) - 12);
    assert.ok(d < 0.3, 'gast binnen 0,3 uur van de host: ' + g.gw.clock + ' vs ' + s.hw.clock);
  }
});
t('desync: dezelfde toestand geeft geen alarm; een afwijkend wanted leidt na drie meldingen tot een hersync', () => {
  const s = sessie(1, { hostExtra: { clock: 9, wanted: 2, mission: { phase: 'active', index: 3 } } });
  s.step(16);
  const gw = s.gs[0].gw;
  assert.equal(gw.coopDesync, undefined, 'geen afwijking zolang beide hetzelfde zien');
  // de gast ziet door een fout iets anders: het verhaalstuk van de snapshot klopt niet met de hash van de host
  const n = gw.coopNet; const echt = n.session.world.bind(n.session);
  n.session.world = () => { const w = echt(); return w && { ...w, mission: { ...w.mission, stage: 9 } }; };
  let resync = 0; const orig = n.session.requestResync.bind(n.session); n.session.requestResync = () => { resync++; orig(); };
  gw.wanted = 0; s.hw.wanted = 4;
  s.step(20);
  assert.ok(gw.coopDesync && gw.coopDesync.velden.includes('stage'), 'afwijking benoemd');
  assert.ok(resync >= 1, 'hersync gevraagd');
  assert.equal(gw.wanted, 4, 'na de hersync heeft de gast het wanted van de host');
});
t('touch-client: een gast met een aanraakstick (analoge as, stick via padAxis) stuurt Tessa zacht of vol, en rent met de sprinttoets', () => {
  const touch = (ax, ay, sprint) => ({ axis: () => [ax, ay], isDown: (k) => !!sprint && k === 'shift' });
  const s = sessie(1, { gastExtra: [{ input: touch(0.4, 0, false) }] });
  s.step(2);
  const r = s.hw.coop.remoteInput;
  assert.ok(r && Math.abs(r.mx - 0.4) < 0.02 && r.my === 0 && !(r.buttons & 1), 'halve stick komt als halve stick aan: ' + JSON.stringify(r));
  s.gs[0].gw.input = touch(1, 0, true); s.step(1);
  assert.ok(s.hw.coop.remoteInput.mx > 0.98 && (s.hw.coop.remoteInput.buttons & 1) === 1, 'volle stick met sprint');
  s.gs[0].gw.input = touch(0, 0, false); s.step(1);
  assert.equal(s.hw.coop.remoteInput.mx, 0); assert.equal(s.hw.coop.remoteInput.my, 0);
});
t('missiestappen: de gast ziet de opdracht en daarna elke volgende stap van de gastheer', () => {
  const s = sessie(2, { hostExtra: { mission: { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', marker: { x: 5, y: 5 } } } });
  s.step(2);
  for (const g of s.gs) {
    assert.match(g.gw.messages.join(' '), /De gastheer speelt: Het Loket/);
    assert.equal(g.gw.coopHostMissie.stap, 'Stap in de auto');
  }
  s.hw.mission.progressText = 'Rij naar het loket'; s.step(2);
  for (const g of s.gs) assert.match(g.gw.messages.join(' '), /Gastheer, volgende stap: Rij naar het loket/);
  assert.equal(s.gs[1].gw.messages.filter((m) => /De gastheer speelt/.test(m)).length, 1, 'de opdracht zelf wordt maar één keer gemeld');
});
t('filmpje van de host: de gasten zien het (na een korte tijd), staan stil en lezen de regel mee; wie later aansluit hoort het ook', () => {
  let sc = { filmpje: false, regel: null, keuze: null };
  const hw = mkWorld(), fades = [];
  N.startHost(hw, INFO, { seed: 5, scene: () => sc });
  const mk = () => { const link = createLink({ latency: 0.03, seed: 4 + Math.floor(Math.random() * 50) }); N.addGuest(hw, link.a); const gw = mkWorld({ input: { axis: () => [1, 0], isDown: () => false } }); N.startClient(gw, link.b, INFO, {}); return { gw, link }; };
  const gs = [mk()];
  const step = (secs) => { for (let k = 0; k < 60 * secs; k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  step(2);
  sc = { filmpje: true, regel: { wie: 'Tessa', tekst: 'Wacht even.' }, keuze: null }; step(0.4);
  assert.equal(gs[0].gw.coopScene && gs[0].gw.coopScene.filmpje, false, 'een kort kaartje (minder dan 0,7 s) is geen filmpje');
  step(1);
  const g = gs[0].gw;
  assert.equal(g.coopScene.filmpje, true); assert.equal(g.coopScene.regel.tekst, 'Wacht even.');
  assert.match(g.messages.join(' '), /De gastheer kijkt een filmpje/);
  assert.equal(g.coopNet.session.pendingInput.mx, 0, 'tijdens het filmpje stuurt de gast geen invoer');
  gs.push(mk()); step(2);
  assert.equal(gs[1].gw.coopScene && gs[1].gw.coopScene.filmpje, true, 'een late gast hoort het filmpje ook');
  sc = { filmpje: false, regel: null, keuze: { tekst: 'Wat doe je?', opties: ['Rijden', 'Lopen'] } }; step(1);
  assert.equal(g.coopScene.filmpje, false); assert.deepEqual(g.coopScene.keuze.opties, ['Rijden', 'Lopen']);
  assert.equal(g.coopNet.session.pendingInput.mx, 1, 'na het filmpje stuurt de gast weer');
  sc = { filmpje: false, regel: null, keuze: null }; step(1);
  assert.equal(g.coopScene, null);
  assert.equal(N.handleEvent(hw, { k: 'scene', filmpje: true }), false, 'een host luistert niet naar scène-berichten');
  N.stopCoopNet(g); assert.equal(g.coopScene, null);
});
console.log(`coopnet_test: ${n}/${n} ok`);
