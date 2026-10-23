// Samen spelen (#95): wat de duurtest (scripts/coop/duurtest.mjs) vond, als pure tests. Geen Electron, geen netwerk.
//   node scripts/coopduur_test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Reliable, RTO_TRAAG, REASON_TEXT } from '../game/js/net/protocol.js';
import { ClientSession, HELLO_TIMEOUT } from '../game/js/net/session.js';
import { hostRoom, joinRoom } from '../game/js/net/rtcroom.js';
import * as L from '../game/js/lobby.js';
import { T, readHeader, decodeJson } from '../game/js/net/codec.js';
import { createLink } from '../game/js/net/memtransport.js';
import { ipcTransport, listenForGuests } from '../game/js/net/ipctransport.js';
import { PENDING_MAX } from '../game/js/net/hub.js';
import { ruimMeshOp } from '../game/js/coopruim.js';
import * as N from '../game/js/coopnet.js';

let n = 0;
const t = (naam, f) => { f(); n++; };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// twee Reliable-kanten met een draad ertussen waarop we zelf volgorde en verlies bepalen
const draad = () => { const q = []; return { q, emit: (b) => { q.push(b); return true; } }; };
function lever(naar, bytes, uit) { // naar = Reliable die ontvangt; geeft de afgeleverde bodies
  const h = readHeader(bytes);
  if (h.type === T.ACK) { naar.onAck(h.ack, h.seq); return []; }
  const m = decodeJson(bytes);
  return naar.receive({ seq: m.seq, body: m.body, epoch: m.ack }, uit);
}

t('hervatten na een lange wegval: de host gooit zijn wachtrij weg en begint opnieuw, de gast ontvangt alles wat daarna komt (vroeger bleef de stroom voorgoed vastzitten)', () => {
  const host = new Reliable(), gast = new Reliable(), naarHost = draad(), naarGast = draad();
  // de gast heeft 55 berichten gehad (bevestigd); daarna valt hij weg en de host zet 30 berichten in de wachtrij
  for (let i = 0; i < 55; i++) { host.send({ i }, 0, naarGast.emit); lever(gast, naarGast.q.shift(), naarHost.emit); lever(host, naarHost.q.shift(), naarGast.emit); }
  for (let i = 0; i < 30; i++) host.send({ wacht: i }, 1, naarGast.emit);
  naarGast.q.length = 0; // allemaal verloren
  host.reset(); // de gast komt terug: de host begint opnieuw
  // het eerste bericht van de nieuwe stroom komt vóór de rest, maar de gast kent het nieuwe tijdperk nog niet: nummer 1 stapt over
  host.send({ k: 'resync' }, 2, naarGast.emit); host.send({ k: 'hek' }, 2, naarGast.emit); host.send({ k: 'missie' }, 2, naarGast.emit);
  const uit = [];
  // omgewisseld: eerst nummer 2, dan 3, dan pas 1
  const [b1, b2, b3] = naarGast.q.splice(0, 3);
  uit.push(...lever(gast, b2, naarHost.emit), ...lever(gast, b3, naarHost.emit));
  assert.equal(uit.length, 0, 'een bericht van een ander tijdperk zonder nummer 1 wacht');
  uit.push(...lever(gast, b1, naarHost.emit));
  assert.deepEqual(uit.map((b) => b.k), ['resync'], 'nummer 1 stapt over op het nieuwe tijdperk');
  host.tick(3, naarGast.emit); // de host herhaalt wat niet bevestigd is (de ACK van nummer 1 is onderweg, maar 2 en 3 niet)
  for (const b of naarHost.q.splice(0)) lever(host, b, naarGast.emit);
  host.tick(6, naarGast.emit);
  for (const b of naarGast.q.splice(0)) uit.push(...lever(gast, b, naarHost.emit));
  assert.deepEqual(uit.map((b) => b.k), ['resync', 'hek', 'missie'], 'daarna komt alles aan, in volgorde');
  for (const b of naarHost.q.splice(0)) lever(host, b, naarGast.emit);
  assert.equal(host.pending.length, 0, 'en is bevestigd');
});

t('een bevestiging uit een ouder tijdperk haalt niets uit de nieuwe wachtrij; een bericht uit een ouder tijdperk wordt niet bevestigd', () => {
  const a = new Reliable(), b = new Reliable(), draadA = draad();
  a.send({ x: 1 }, 0, draadA.emit); a.reset(); a.send({ x: 2 }, 0, draadA.emit);
  a.onAck(2, 1); // bevestiging van het oude tijdperk: negeren
  assert.equal(a.pending.length, 1);
  const o = draad(); b.receive({ seq: 1, body: {}, epoch: a.sendEpoch }, o.emit); // b stapt over
  const e = draad(); const uit = b.receive({ seq: 5, body: { oud: 1 }, epoch: 77 }, e.emit);
  assert.deepEqual(uit, []); assert.equal(e.q.length, 0, 'geen bevestiging voor een onbekend tijdperk');
});

t('een weggevallen gast: de host herhaalt zijn wachtrij hoogstens eens per RTO_TRAAG, niet 5 keer per seconde (32 berichten × 5 = 160 pakketten per seconde)', () => {
  const r = new Reliable(); const w = draad();
  for (let i = 0; i < 32; i++) r.send({ i }, 0, w.emit);
  w.q.length = 0;
  let verstuurd = 0; for (let s = 0.2; s <= 20; s += 0.2) { r.tick(s, w.emit, true); }
  verstuurd = w.q.length;
  assert.ok(verstuurd <= 32 * (Math.floor(20 / RTO_TRAAG) + 1), 'traag: ' + verstuurd);
  const r2 = new Reliable(); const w2 = draad(); for (let i = 0; i < 32; i++) r2.send({ i }, 0, w2.emit); w2.q.length = 0;
  for (let s = 0.2; s <= 20; s += 0.2) r2.tick(s, w2.emit, false);
  assert.ok(w2.q.length > verstuurd * 5, 'gewoon is veel meer: ' + w2.q.length);
});

// een kleine host met een wereld, zoals in de scenario-tests
const mkWorld = () => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false } });
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const stap = (hw, gs, s) => { for (let k = 0; k < Math.round(30 * s); k++) { N.tickCoopNet(hw, 1 / 30); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 30); g.link.advance(1 / 30); g.gw.time += 1 / 30; } hw.time += 1 / 30; } };

t('de hub houdt geen verbindingen vast die nooit hallo zeiden of geweigerd zijn: na PENDING_MAX seconden is de verbinding gesloten en vergeten', () => {
  const hw = mkWorld(); const hub = N.startHost(hw, INFO, { seed: 5, max: 4 });
  const gs = [];
  let fout = null, gf = null;
  for (let i = 0; i < 6; i++) { const link = createLink({ latency: 0.02, seed: 3 + i }); N.addGuest(hw, link.a); const gw = mkWorld(); N.startClient(gw, link.b, { ...INFO, version: '0.0.0' }, {}); gs.push({ link, gw }); if (!fout) { fout = link; gf = gw; } } // zes keer een andere versie
  stap(hw, gs, 2);
  assert.equal(hub.stats().wachtend, 6, 'meteen na het weigeren wachten ze (elke poging was er een erbij)');
  assert.equal(gf.coopWeigering, 'versie', 'de gast met een andere versie hoort waarom (versie)');
  stap(hw, gs, PENDING_MAX + 2);
  assert.equal(hub.stats().wachtend, 0, 'opgeruimd');
  assert.equal(fout.a.isOpen(), false, 'en de verbinding is dicht');
});

t('een plek die vrijkomt vergeet wat de extra wereld die speler vertelde: de volgende speler krijgt uiterlijken opnieuw (geen leeg poppetje voor 30 s)', () => {
  const hw = mkWorld(); const hub = N.startHost(hw, INFO, { seed: 5, max: 4 });
  const link = createLink({ latency: 0.02, seed: 9 }); N.addGuest(hw, link.a); const gw = mkWorld(); N.startClient(gw, link.b, INFO, {});
  const g = { link, gw };
  stap(hw, [g], 3);
  hub.cfg.sim.extra(1, 0); // de host vertelt slot 1 iets
  assert.equal(hub.cfg.sim.stats().geheugens, 1);
  N.stopCoopNet(gw); stap(hw, [g], 2);
  assert.equal(hub.roster.spelers.some((s) => s.slot === 1), false, 'de plek is vrij');
  assert.equal(hub.cfg.sim.stats().geheugens, 0, 'en het geheugen van die plek ook');
});

t('een ipc-transport meldt zich af bij de brug zodra de verbinding sluit: een speler die vaak terugkomt laat geen luisteraars achter', () => {
  const luisteraars = new Set(); const api = { send() {}, close() {}, onEvent: (f) => { luisteraars.add(f); return () => luisteraars.delete(f); } };
  const trs = [];
  const stop = listenForGuests(api, (tr) => trs.push(tr));
  for (let id = 1; id <= 50; id++) for (const f of [...luisteraars]) f('conn', { id });
  assert.equal(trs.length, 50); assert.equal(luisteraars.size, 51);
  for (let id = 1; id <= 25; id++) for (const f of [...luisteraars]) f('state', { id, state: 'closed' }); // de verbinding valt weg
  assert.equal(luisteraars.size, 26, 'de gesloten verbindingen zijn weg');
  for (const tr of trs.slice(25)) tr.close(); // de host sluit zelf
  assert.equal(luisteraars.size, 1, 'alleen de luisteraar naar nieuwe verbindingen blijft');
  trs[0].dispose(); // dubbel afmelden mag
  stop(); assert.equal(luisteraars.size, 0);
  const tr = ipcTransport(api, 0); assert.equal(luisteraars.size, 1); tr.close(); assert.equal(luisteraars.size, 0, 'een gast sluit zijn eigen verbinding en meldt zich af');
});

t('ruimMeshOp: eigen geometrie vrij, gedeelde niet; materialen met kaart alleen op verzoek; het object gaat uit de scene', () => {
  const tel = { g: 0, m: 0, k: 0 };
  const mesh = (naam) => ({ naam, geometry: { dispose: () => tel.g++ }, material: { map: { dispose: () => tel.k++ }, dispose: () => tel.m++ } });
  const groep = (kids) => ({ traverse(f) { f(this); kids.forEach(f); }, geometry: null, material: null });
  const scene = { weg: [], remove(o) { this.weg.push(o); } };
  const g = groep([mesh('a'), mesh('b')]);
  assert.equal(ruimMeshOp(scene, g), 2); assert.deepEqual(tel, { g: 2, m: 0, k: 0 }); assert.deepEqual(scene.weg, [g]);
  ruimMeshOp(scene, groep([mesh('c')]), { geometrie: false }); assert.deepEqual(tel, { g: 2, m: 0, k: 0 }, 'een echt voertuigmodel deelt zijn geometrie');
  ruimMeshOp(null, mesh('d'), { geometrie: false, materiaal: true }); assert.deepEqual(tel, { g: 2, m: 1, k: 1 });
  assert.equal(ruimMeshOp(scene, null), 0);
});

t('een gastheer die niet antwoordt (laadt, hangt of is weg): de gast geeft het na HELLO_TIMEOUT op met reden time-out en een Nederlandse melding; een gast die al meespeelde niet', () => {
  const link = createLink({ latency: 0.02, seed: 2 }); // aan de andere kant luistert niemand
  const ses = new ClientSession(link.b, { info: INFO, caps: [] }); const st = [];
  ses.onstatus = (x) => st.push(x);
  for (let s = 0; s < HELLO_TIMEOUT - 1; s += 0.1) { ses.tick(0.1); link.advance(0.1); }
  assert.equal(ses.status, 'verbinden', 'de eerste seconden blijft hij proberen (elke seconde een hallo)');
  for (let s = 0; s < 3; s += 0.1) { ses.tick(0.1); link.advance(0.1); }
  assert.equal(ses.status, 'geweigerd'); assert.equal(ses.rejected, 'time-out');
  assert.match(REASON_TEXT['time-out'], /gastheer antwoordt niet/);
  const lob = (reden, ander) => L.view([{ t: 'kies', rol: 'gast' }, { t: 'verbinden' }, { t: 'status', status: 'geweigerd', reason: reden, ander }].reduce((x, e) => L.reduce(x, e), L.createLobby({ direct: true, rtc: true }))).lines[0];
  assert.match(lob('time-out', ''), /antwoordt niet/); assert.match(lob('protocol', '0.42.0'), /versie 0\.42\.0/, 'een ander protocol toont de versie van de ander');
  // een andere versie van het protocol toont de versies en wat te doen
  assert.match(L.versieTekst('0.43.0', '0.42.0'), /0\.42\.0.*0\.43\.0/);
  assert.match(REASON_TEXT.protocol, /dezelfde versie/);
});

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
{ // de kamercodeverbinding: een fout bij het voorbereiden geeft een Nederlandse melding, geen systeemmelding
  const stappen = [];
  const pcKapot = () => ({ createDataChannel: () => ({ readyState: 'connecting' }), async createOffer() { throw new Error("Failed to execute 'createOffer' on 'RTCPeerConnection'"); }, setLocalDescription() {}, close() {}, iceGatheringState: 'complete', addEventListener() {}, removeEventListener() {} });
  const sig = { host() { stappen.push('host'); }, join() {}, close() { stappen.push('dicht'); } };
  const h = await hostRoom('ABCDE12345', { pcFactory: pcKapot, signaler: sig, timeouts: { wait: 5000, connect: 5000, gather: 10 }, onstate: (s, info) => stappen.push([s, info]) });
  assert.ok(stappen.some((x) => Array.isArray(x) && x[0] === 'fout' && /aanbod .* kon niet worden gemaakt/.test(x[1])), JSON.stringify(stappen));
  assert.ok(stappen.includes('dicht') && !stappen.includes('host'), 'de signaleerder is gesloten en er stond niets op de brokers');
  h.cancel();
  await assert.rejects(() => hostRoom('ABCDE12345', { pcFactory: () => { throw new Error('RTCPeerConnection is not defined'); }, signaler: sig, onstate() {} }), /Een kamercode werkt niet op dit apparaat/);
  await assert.rejects(() => joinRoom('ABCDE12345', { pcFactory: () => { throw new Error('x'); }, signaler: sig, onstate() {} }), /Een kamercode werkt niet op dit apparaat/);
  n++;
}

t('de duurtest in het geheugen (6 minuten virtueel, 7 spelers met wegvallen, terugkomen, weggaan, pauze en een stille gastheer) eindigt zonder problemen', () => {
  const r = spawnSync(process.execPath, ['--expose-gc', path.join(ROOT, 'scripts', 'coop', 'duurtest.mjs'), '--modus=mem', '--min=6'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').slice(-8).join('\n') + (r.stderr || ''));
  assert.match(r.stdout, /ALLES OK/);
});

console.log(`coopduur_test: ${n} testen ok`);
