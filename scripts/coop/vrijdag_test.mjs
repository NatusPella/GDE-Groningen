// Samen spelen (#95): de avond van vrijdag 23-10 met vier spelers, zonder Electron. Dezelfde koppeling als in het spel
// (coopnet.js, hub, sessies) op een nep-wereld per speler, over een in-memory transport met vertraging en verlies.
// Dekt wat een groep van vier tegenkomt: iedereen ziet elkaar met naam en kleur, het weer en de klok zijn gelijk, de
// opdracht en de filmpjes van de gastheer komen bij iedereen aan, beloningen gaan naar ieders eigen portemonnee, de
// roepjes (7, 8, 9) komen overal aan, een speler te ver weg wordt teruggezet, wegvallen en terugkomen, en de
// hoeveelheid verkeer per speler blijft klein.
//   node scripts/coop/vrijdag_test.mjs
import assert from 'node:assert/strict';
import { createLink } from '../../game/js/net/memtransport.js';
import * as N from '../../game/js/coopnet.js';
import { createWeatherState, stepWeather, regionWeather, REGION_IDS } from '../../game/js/weatherstate.js';
import { pingMarkers, pingPlek, KIJK_AFSTAND, PING_TOETSEN } from '../../game/js/coopping.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets(), ...extra });

// host + gasten, met een teller van verstuurde bytes
function avond(gasten = 3, { loss = 0, latency = 0.04, hostExtra, max, scene } = {}) {
  const hw = mkWorld(hostExtra), holds = [], bytes = { op: 0, neer: 0 };
  N.startHost(hw, INFO, { seed: 5, max, scene, onHold: (r, slot, reden) => holds.push([r, slot, reden]) });
  const gs = [];
  const sluit = (i, wens) => {
    const link = createLink({ latency, jitter: 0.015, loss, seed: 11 + i * 7 });
    const a = link.a.send.bind(link.a), b = link.b.send.bind(link.b);
    link.a.send = (buf, rel) => { bytes.neer += buf.length; return a(buf, rel); }; // gastheer naar gast
    link.b.send = (buf, rel) => { bytes.op += buf.length; return b(buf, rel); };   // gast naar gastheer
    N.addGuest(hw, link.a);
    const gw = mkWorld({ player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' }, clock: 3 + i });
    N.startClient(gw, link.b, INFO, { onHold: (r, slot) => holds.push([r + i, slot]), wens });
    const g = { gw, link }; gs.push(g); return g;
  };
  for (let i = 0; i < gasten; i++) sluit(i, i === 1 ? 'bram' : i === 2 ? 'lotte' : undefined);
  const tick = (f, k) => { if (f) f(k); N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; };
  const step = (secs, f) => { for (let k = 0; k < Math.round(60 * secs); k++) tick(f, k); };
  return { hw, gs, holds, bytes, step, sluit };
}

t('vier spelers: iedereen krijgt een eigen plek, naam, kleur en vorm; de lijst is bij iedereen gelijk', () => {
  const s = avond(3); s.step(3);
  assert.deepEqual(s.hw.coopRoster.map((r) => r.naam), ['Tammo', 'Tessa', 'Bram', 'Lotte']);
  assert.equal(new Set(s.hw.coopRoster.map((r) => r.kleur)).size, 4, 'vier kleuren');
  assert.equal(new Set(s.hw.coopRoster.map((r) => r.vorm)).size, 4, 'vier vormen (kleur is nooit het enige signaal)');
  for (const g of s.gs) {
    assert.equal(g.gw.coopRoster.length, 4); assert.equal(g.gw.coopPartners.length, 3, 'drie anderen in beeld');
    assert.ok(g.gw.coopPartners.every((p) => p.naam && p.kleur && p.vorm && p.tekst), 'elk label heeft naam, kleur, vorm en status');
  }
  assert.equal(s.hw.coopPartners.length, 3);
});

t('het weer is van de gastheer: een bui boven de stad is bij elke gast hetzelfde, ook bij wie later aansluit', () => {
  const ws = createWeatherState(99); for (let i = 0; i < 600; i++) stepWeather(ws, 1, 14); // een tijd later
  ws.regions.stad.kind = 'onweer'; ws.regions.stad.rain = 0.85; ws.regions.stad.overcast = 0.95; ws.regions.noord.kind = 'mist'; ws.regions.noord.mist = 0.6;
  const s = avond(3, { hostExtra: { weatherState: ws } });
  s.step(6);
  for (const g of s.gs) {
    const w = g.gw.weatherState; assert.ok(w, 'de gast heeft de weerstaat van de gastheer');
    for (const id of REGION_IDS) { const a = regionWeather(w, id), b = regionWeather(ws, id); assert.equal(a.kind, b.kind, 'soort in ' + id); for (const k of ['rain', 'overcast', 'mist', 'windAngle']) assert.ok(Math.abs(a[k] - b[k]) < 0.002, k + ' in ' + id); }
  }
  const laat = s.sluit(3); s.step(3);
  assert.equal(regionWeather(laat.gw.weatherState, 'stad').kind, 'onweer', 'de late speler hoort het weer meteen');
  assert.equal(N.handleEvent(s.hw, { k: 'weer', f: 0.5, w: 1, r: {} }), false, 'een gastheer luistert niet naar weerberichten');
  assert.equal(N.handleEvent(s.gs[0].gw, { k: 'weer', f: 7, w: 1, r: {} }), false, 'onzin wordt genegeerd');
});

t('de speelklok loopt gelijk met de gastheer voor alle drie de gasten', () => {
  const s = avond(3, { hostExtra: { clock: 20.5 } });
  s.step(20, () => { s.hw.clock = (s.hw.clock + 0.02 / 60) % 24; });
  for (const g of s.gs) assert.ok(Math.abs(((g.gw.clock - s.hw.clock + 36) % 24) - 12) < 0.3, 'klok ' + g.gw.clock + ' tegen ' + s.hw.clock);
});

t('geld en beloningen: missies en bijbanen leveren elke verbonden gast de helft, in zijn eigen portemonnee; wie weg is krijgt niets', () => {
  const s = avond(3, { hostExtra: { money: 500 } }); s.step(3);
  assert.equal(typeof s.hw.coopDeel, 'function', 'de gastheer zet de haak voor missies, bijbanen en prijzen');
  s.hw.coopDeel(1000); s.step(1);
  assert.deepEqual(s.gs.map((g) => g.gw.money), [500, 500, 500]);
  assert.deepEqual(s.gs.map((g) => g.gw.coopVerdiend), [500, 500, 500], 'bijgehouden voor de eigen save van elke gast');
  assert.equal(s.hw.money, 500, 'de gastheer krijgt zijn geld van de missie zelf');
  s.gs[2].link.cut(); s.step(8);
  s.hw.coopDeel(300); s.step(1);
  assert.deepEqual(s.gs.map((g) => g.gw.money), [650, 650, 500], 'de speler die weg is mist het');
  assert.equal(N.deelMetGasten(s.hw, 1), 0, 'een bedrag van 1 geeft geen halve euro');
  assert.equal(N.deelMetGasten(s.gs[0].gw, 100), 0, 'een gast deelt niets uit');
});

t('de opdracht van de gastheer: alle spelers lezen wat gespeeld wordt, de volgende stap en het einde', () => {
  const s = avond(3, { hostExtra: { mission: { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', marker: { x: 30, y: 30 } } } });
  s.step(3);
  for (const g of s.gs) { assert.match(g.gw.messages.join(' '), /Tammo speelt: Het Loket/); assert.equal(g.gw.coopHost.doelen.length, 1, 'het doel staat op ieders kaart'); }
  s.hw.mission.progressText = 'Rij naar het loket'; s.step(2);
  for (const g of s.gs) assert.match(g.gw.messages.join(' '), /volgende stap: Rij naar het loket/);
  s.hw.mission = { phase: 'idle' }; s.step(2);
  for (const g of s.gs) { assert.equal(g.gw.coopHostMissie.actief, false); assert.equal(g.gw.coopHost.doelen.length, 0, 'na de opdracht geen doel meer'); }
});

t('filmpjes en keuzes: iedereen wacht synchroon en het wachten eindigt altijd (ook als de gastheer overslaat of wegvalt)', () => {
  let sc = { filmpje: false, regel: null, keuze: null };
  const s = avond(3, { scene: () => sc }); s.step(2);
  for (const g of s.gs) g.gw.input.axis = () => [1, 0];
  sc = { filmpje: true, regel: { wie: 'Tessa', tekst: 'Dit is het.' }, keuze: null }; s.step(2);
  for (const g of s.gs) { assert.equal(g.gw.coopScene.filmpje, true); assert.equal(g.gw.coopNet.session.pendingInput.mx, 0, 'staat stil tijdens het filmpje'); }
  sc = { filmpje: false, regel: null, keuze: { tekst: 'Wat nu?', opties: ['Rijden', 'Lopen'] } }; s.step(2);
  for (const g of s.gs) { assert.equal(g.gw.coopScene.filmpje, false); assert.deepEqual(g.gw.coopScene.keuze.opties, ['Rijden', 'Lopen'], 'de gast ziet wat de gastheer kiest'); assert.equal(g.gw.coopNet.session.pendingInput.mx, 1, 'weer in beweging'); }
  sc = { filmpje: false, regel: null, keuze: null }; s.step(2);
  for (const g of s.gs) assert.equal(g.gw.coopScene, null);
  sc = { filmpje: true, regel: null, keuze: null }; s.step(2); // en de gastheer valt midden in een filmpje weg
  N.stopCoopNet(s.hw); s.step(4);
  for (const g of s.gs) { assert.equal(g.gw.coopNet, null, 'speelt weer zelf: geen eeuwig wachten'); assert.equal(g.gw.coopScene, null); }
});

t('wanted is gedeeld en volgt de gastheer', () => {
  const s = avond(3); s.step(2);
  s.hw.wanted = 4; s.step(2);
  assert.deepEqual(s.gs.map((g) => g.gw.wanted), [4, 4, 4]);
  s.hw.wanted = 0; s.step(2);
  assert.deepEqual(s.gs.map((g) => g.gw.wanted), [0, 0, 0]);
});

t('neergeslagen en gepakt: de anderen horen het, het label toont de status, en Tessa hoort dat zij geraakt is', () => {
  const s = avond(3); s.step(2);
  s.hw.pendingRespawn = { busted: true }; s.step(1);
  for (const g of s.gs) { assert.match(g.gw.messages.join(' '), /Tammo is door de politie gepakt/); assert.equal(g.gw.coopPartners.find((p) => p.naam === 'Tammo').status, 'neer'); }
  s.hw.pendingRespawn = null; s.step(1);
  assert.equal(s.gs[0].gw.coopPartners.find((p) => p.naam === 'Tammo').status, 'voet', 'weer op de been');
  s.hw.pendingRespawn = { busted: false }; s.step(1); s.hw.pendingRespawn = null;
  assert.match(s.gs[2].gw.messages.join(' '), /Tammo is neergeslagen/);
  s.hw.companion.state = 'dead'; s.step(1);
  assert.match(s.gs[0].gw.messages.join(' '), /Je bent geraakt/); assert.doesNotMatch(s.gs[1].gw.messages.join(' '), /Je bent geraakt/, 'alleen Tessa hoort dat');
  assert.equal(s.gs[1].gw.coopPartners.find((p) => p.naam === 'Tessa').status, 'neer');
  s.hw.companion.state = 'alive'; s.step(1);
  assert.match(s.gs[0].gw.messages.join(' '), /Je staat weer/);
});

t('roepjes: 7, 8 en 9 geven bij iedereen een baken met naam, kleur en regel; te snel achter elkaar kan niet; na 8 s zijn ze weg', () => {
  const s = avond(3); s.step(3);
  const [tessa, bram, lotte] = s.gs.map((g) => g.gw);
  bram.player.x = 40; bram.player.y = 10; bram.player.angle = 0;
  bram.input.s.add('7'); s.step(0.5);
  assert.equal(bram.coopPings.lijst.length, 1, 'Bram ziet zijn eigen roep');
  s.step(1);
  for (const w of [s.hw, tessa, lotte]) {
    const m = w.coopPingMarks; assert.equal(m.length, 1, 'baken bij ' + w.player.character);
    assert.equal(m[0].naam, 'Bram'); assert.equal(m[0].tekst, 'Kom hier'); assert.match(m[0].kleur, /^#[0-9a-f]{6}$/i);
    assert.match(w.messages.join(' '), /Bram: Kom hier/);
  }
  assert.equal(bram.coopPingMarks[0].naam, 'Bram', 'ook de afzender ziet wie riep');
  bram.input.s.add('8'); s.step(0.3);
  assert.equal(s.hw.coopPingMarks.length, 1, 'nog geen 1,5 s: tweede roep geweigerd');
  s.step(1.5); bram.input.s.add('9'); s.step(1);
  assert.equal(s.hw.coopPingMarks.length, 2);
  const daar = s.hw.coopPingMarks.find((m) => m.tekst === 'Kijk daar'); assert.ok(daar);
  assert.ok(Math.abs(daar.x - (bram.player.x + KIJK_AFSTAND)) < 1, 'Kijk daar wijst vooruit, niet op de speler');
  s.step(10); assert.equal(s.hw.coopPingMarks.length, 0); assert.equal(lotte.coopPingMarks.length, 0);
  s.hw.input.s.add('8'); s.step(1);
  assert.equal(tessa.coopPingMarks[0].tekst, 'Help!'); assert.equal(tessa.coopPingMarks[0].naam, 'Tammo');
  assert.deepEqual(PING_TOETSEN.map((k) => k.toets), ['7', '8', '9']);
  assert.equal(pingPlek(null, 'hier'), null);
  assert.deepEqual(pingMarkers({ lijst: [{ x: 1, y: 2, van: '9', soort: 'hier', tot: 99 }] }, [], 0, 0).map((m) => m.naam), [''], 'een onbekende afzender breekt niets');
});

t('roepen kan niet in een menu, bij het wachtscherm of voor je er echt bij bent', () => {
  const s = avond(1); s.step(2);
  const g = s.gs[0].gw;
  g.paused = true; g.input.s.add('7'); s.step(0.5); assert.equal(g.coopPings.lijst.length, 0);
  g.input.s.clear(); g.paused = false; g.coopHold = true; g.input.s.add('7'); s.step(0.5); assert.equal(g.coopPings.lijst.length, 0);
});

t('derde en vierde speler: botsingen en een band — wie te ver weg is wordt na een paar seconden bij de groep gezet, met een melding', () => {
  const s = avond(3); s.step(3);
  const bram = s.gs[1].gw, f = s.hw.coopFigures[2];
  s.hw.coopMove = (fig, dt) => { const nx = fig.x + fig.vx * dt; fig.x = nx > 30 ? 30 : nx; fig.y += fig.vy * dt; }; // een muur op x = 30
  bram.input.axis = () => [0, -1]; // schermrichting omhoog = vooruit (yaw 0: wereld +x)
  s.hw.player.x = 0; s.hw.player.y = 0; f.x = 5; f.y = 0;
  s.step(6, () => { s.hw.companion.x = 0; s.hw.companion.y = 0; });
  assert.ok(f.x <= 30.01, 'de figuur loopt niet door de muur: ' + f.x);
  s.hw.coopMove = null; bram.input.axis = () => [0, 0]; f.x = 150; f.y = 0; f.gewaarschuwd = false;
  s.step(1.5, () => { s.hw.companion.x = 0; s.hw.companion.y = 0; });
  assert.match(bram.messages.join(' '), /Blijf bij de groep/);
  s.step(5, () => { s.hw.companion.x = 0; s.hw.companion.y = 0; });
  assert.ok(Math.hypot(f.x - s.hw.player.x, f.y - s.hw.player.y) < 5, 'weer bij de groep: ' + f.x);
  assert.match(bram.messages.join(' '), /weer bij de groep/);
  assert.ok(N.FIGUUR_BAND > N.FIGUUR_WAARSCHUWING);
});

t('Tessa valt weg: het spel pauzeert voor de gastheer; een extra speler niet; geen dubbele of verdwenen figuren', () => {
  const s = avond(3); s.step(3);
  s.gs[1].link.cut(); s.step(8);
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host'), [], 'Bram weg: de rest speelt door');
  assert.equal(s.hw.coopRoster.find((r) => r.slot === 2).verbinding, 'lost');
  for (const g of [s.gs[0], s.gs[2]]) assert.equal(g.gw.coopPartners.find((p) => p.naam === 'Bram').status, 'weg', 'de anderen zien dat Bram weg is');
  s.gs[0].link.cut(); s.step(8);
  assert.deepEqual(s.holds.filter((h) => h[0] === 'host').map((h) => h[1]), [1], 'Tessa weg: wachtscherm voor de gastheer');
  assert.equal(Object.keys(s.hw.coopFigures).length, 2, 'geen extra figuren of verdwenen figuren');
});

t('uit het spel en erbij: een speler vertrekt, een nieuwe neemt de plek, de rest merkt niets; de gastheer stopt: iedereen is weer alleen', () => {
  const s = avond(3); s.step(3);
  N.stopCoopNet(s.gs[2].gw); s.step(3);
  assert.deepEqual(s.hw.coopRoster.map((r) => r.slot), [0, 1, 2]);
  const nieuw = s.sluit(3, 'daan'); s.step(4);
  assert.equal(nieuw.gw.coopNet.session.status, 'ok'); assert.equal(s.hw.coopRoster.length, 4);
  assert.equal(nieuw.gw.coopPartners.length, 3);
  N.stopCoopNet(s.hw); s.step(4);
  for (const g of s.gs) if (g.gw.coopNet) assert.notEqual(g.gw.coopNet.session.status, 'ok');
  assert.equal(s.hw.coopRole, null);
});

t('een slecht netwerk (120 ms, 8% verlies): vier spelers blijven synchroon en de lijst klopt', () => {
  const s = avond(3, { loss: 0.08, latency: 0.12, hostExtra: { wanted: 2, clock: 9 } });
  s.step(25, () => { s.hw.clock = (s.hw.clock + 0.01 / 60) % 24; });
  for (const g of s.gs) { assert.equal(g.gw.wanted, 2); assert.ok(['ok', 'lag'].includes(g.gw.coopNet.session.status)); assert.equal(g.gw.coopRoster.length, 4); }
  assert.deepEqual(s.holds, [], 'geen pauze door alleen een slechte verbinding');
});

t('verkeer: met vier spelers blijft het per speler klein (gastheer naar gast en terug)', () => {
  const s = avond(3, { hostExtra: { vehicles: Array.from({ length: 40 }, (_, i) => ({ id: i + 1, x: (i % 8) * 15, y: Math.floor(i / 8) * 15, angle: i * 0.3, model: { len: 4 } })) } });
  s.step(5); s.bytes.op = 0; s.bytes.neer = 0;
  s.step(20, (k) => { s.gs.forEach((g, i) => { g.gw.input.axis = () => [Math.sin(k / 50 + i), 0.5]; }); s.hw.vehicles.forEach((v) => { v.x += 0.1; }); });
  const perGast = { neer: s.bytes.neer / 3 / 20, op: s.bytes.op / 3 / 20 };
  console.log(`  verkeer per gast: naar de gast ${(perGast.neer / 1024).toFixed(1)} kB/s, naar de gastheer ${(perGast.op / 1024).toFixed(2)} kB/s (gastheer totaal ${(s.bytes.neer / 20 / 1024).toFixed(1)} kB/s omhoog)`);
  assert.ok(perGast.neer < 24 * 1024, 'naar een gast minder dan 24 kB/s');
  assert.ok(perGast.op < 4 * 1024, 'van een gast minder dan 4 kB/s');
  assert.ok(s.bytes.neer / 20 < 80 * 1024, 'de gastheer verstuurt met drie gasten minder dan 80 kB/s');
});

console.log(`vrijdag_test: ${n}/${n} ok`);
