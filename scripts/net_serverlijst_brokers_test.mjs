// Samen spelen (#438): de openbare sessielijst over nepbrokers (game/js/net/brokers.js LijstSignaler, net/serverlijst.js).
// Geen echte sockets: een nepnetwerk met een tracker en een MQTT-broker, en een nep-RTCPeerConnection voor het aansluiten.
import assert from 'node:assert/strict';
import * as B from '../game/js/net/brokers.js';
import { LIJST, codeer, maakId, maakAankondiger, Serverlijst } from '../game/js/net/serverlijst.js';
import { topicFor, makeRoom, formatRoom, parseRoom } from '../game/js/net/sigcrypto.js';
import { hostRoom, joinRoom } from '../game/js/net/rtcroom.js';
import { PROTO } from '../game/js/net/protocol.js';
import { makeRng } from '../game/js/net/memtransport.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (f, ms = 2000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('time-out'); await tick(3); } };
const CFG = { TRACKERS: ['wss://t1.test', 'wss://t2.test'], MQTT_BROKERS: ['wss://m1.test/mqtt'] };

// ----- nepnetwerk: tracker (onthoudt het laatste aanbod per peer en geeft het aan wie komt of vraagt) en MQTT (retain, #-filter)
function fakeNet({ down = [] } = {}) {
  const net = { seen: [], retained: new Map(), subs: [], tpeers: new Map(), verbonden: 0 };
  const later = (f) => setTimeout(f, 0);
  net.socket = (url) => {
    const ws = { url, closed: false, readyState: 1 };
    net.verbonden++;
    const deliver = (data) => later(() => { if (!ws.closed && ws.onmessage) ws.onmessage({ data }); });
    ws.close = () => { ws.closed = true; ws.readyState = 3; };
    if (down.some((d) => url.startsWith(d))) { later(() => ws.onerror && ws.onerror(new Error('niet bereikbaar'))); ws.send = () => {}; return ws; }
    const kind = url.includes('m1.test') ? 'mqtt' : 'tracker';
    later(() => ws.onopen && ws.onopen());
    ws.send = (data) => {
      net.seen.push({ kind, url, data: typeof data === 'string' ? data : Buffer.from(data).toString('latin1') });
      if (kind === 'tracker') {
        const m = JSON.parse(data);
        const mine = net.tpeers.get(m.peer_id) || { deliver, hash: m.info_hash, url, offer: null };
        mine.deliver = deliver; net.tpeers.set(m.peer_id, mine);
        deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, interval: 120 }));
        if (m.offers && m.offers.length) {
          mine.offer = m.offers[0];
          for (const [pid, p] of net.tpeers) if (pid !== m.peer_id && p.url === url && p.hash === m.info_hash) p.deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: m.offers[0].offer_id, offer: m.offers[0].offer }));
        } else {
          for (const [pid, p] of net.tpeers) if (pid !== m.peer_id && p.url === url && p.hash === m.info_hash && p.offer) deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: pid, offer_id: p.offer.offer_id, offer: p.offer.offer }));
        }
      } else {
        const u8 = new Uint8Array(data); const first = u8[0] >> 4;
        if (first === 1) deliver(Uint8Array.from([0x20, 2, 0, 0]));
        else if (first === 8) {
          const tl = (u8[4] << 8) | u8[5]; const filter = new TextDecoder().decode(u8.subarray(6, 6 + tl));
          net.subs.push({ filter, deliver }); deliver(Uint8Array.from([0x90, 3, 0, 1, 0]));
          for (const [tp, pl] of net.retained) if (pasOp(filter, tp)) deliver(B.mqtt.publish(tp, pl, true));
        } else if (first === 3) {
          const p = B.mqtt.parse(u8)[0];
          if (u8[0] & 1) { if (p.payload) net.retained.set(p.topic, p.payload); else net.retained.delete(p.topic); }
          for (const s of net.subs) if (s.deliver !== deliver && pasOp(s.filter, p.topic)) s.deliver(B.mqtt.publish(p.topic, p.payload));
        }
      }
    };
    return ws;
  };
  return net;
}
const pasOp = (filter, topic) => (filter.endsWith('/#') ? topic.startsWith(filter.slice(0, -1)) : filter === topic);

const ROOM = 'K3J9D8F2MN';
const env = (net, seed) => ({ socket: net.socket, rand: makeRng(seed) });
const lijstSig = (net, seed) => new B.LijstSignaler(CFG, env(net, seed), { brokerTimeout: 200, interval: 40 });

// Een host: kondigt aan met de stand van dat moment (spelers kunnen veranderen).
function maakHost(net, { naam = 'Zomeravond', room = ROOM, versie = '0.46.0', proto = PROTO, stand = { spelers: 1, max: 4 }, seed = 3, id = maakId(makeRng(seed)) } = {}) {
  const sig = lijstSig(net, seed);
  const tekst = maakAankondiger({ naam, versie, proto, hub: () => stand, room: () => room, id });
  return topicFor(LIJST.sleutel).then((topic) => { sig.kondig(topic, tekst); return { sig, stand, id, stop: () => sig.close() }; });
}
// Een speler die de lijst bekijkt; verzamelt in een Serverlijst en logt wat er binnenkwam.
async function maakLuisteraar(net, opts = {}) {
  const sig = lijstSig(net, opts.seed || 11), lijst = new Serverlijst({ proto: PROTO, versie: '0.46.0', minTussen: 10, ...opts }), ruw = [];
  sig.luister(await topicFor(LIJST.sleutel), (tekst) => { ruw.push(tekst); lijst.ontvang(tekst); });
  return { sig, lijst, ruw, stop: () => sig.close() };
}

await t('de host kondigt aan, een tweede speler ziet hem in de lijst, met naam, aantal spelers, maximum en versie', async () => {
  const net = fakeNet();
  const host = await maakHost(net);
  const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 1);
  const e = luis.lijst.lijst()[0];
  assert.deepEqual([e.naam, e.spelers, e.max, e.versie, e.kan, e.anders], ['Zomeravond', 1, 4, '0.46.0', true, false]);
  assert.equal(e.room, ROOM);
  host.stop(); luis.stop();
});
await t('de lijst loopt mee met de sessie: een speler erbij verandert het aantal, en elke aankondiging komt met een nieuwe tijdstempel', async () => {
  const net = fakeNet(); const host = await maakHost(net); const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 1);
  host.stand.spelers = 3;
  await waitFor(() => luis.lijst.lijst()[0].spelers === 3, 1500);
  host.stand.spelers = 4; await waitFor(() => luis.lijst.lijst()[0].vol === true, 1500);
  assert.equal(luis.lijst.lijst()[0].kan, false, 'vol: niet aan te sluiten');
  host.stop(); luis.stop();
});
await t('wie later komt ziet de sessie meteen (tracker en vastgehouden MQTT-bericht), ook als een tracker uitvalt', async () => {
  const net = fakeNet({ down: ['wss://t1.test'] }); const host = await maakHost(net);
  await tick(30);
  const luis = await maakLuisteraar(net, { seed: 21 });
  await waitFor(() => luis.lijst.lijst().length === 1);
  assert.ok(luis.ruw.length >= 1);
  host.stop(); luis.stop();
});
await t('aansluiten via de lijst: de kamercode uit de lijst loopt over de bestaande versleutelde route (hostRoom en joinRoom)', async () => {
  const net = fakeNet(); const room = makeRoom(makeRng(5));
  const host = await maakHost(net, { room }); const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 1);
  const gekozen = luis.lijst.lijst()[0];
  assert.equal(parseRoom(formatRoom(gekozen.room)).ok, true, 'een geldige kamercode');
  // de gewone kamer: dezelfde functies als in lobbyui.js, met een nep-RTCPeerConnection en een tussenhub
  const hub = { wire: [], offers: new Map(), answers: new Map() };
  const sig = () => ({ host(topic, blob, onAnswer) { hub.wire.push(blob); hub.offers.set(topic, blob); hub.answers.set(topic, onAnswer); }, join(topic, onOffer) { const go = () => { const o = hub.offers.get(topic); if (o) onOffer(o, (a) => { hub.wire.push(a); hub.answers.get(topic)(a); }); else setTimeout(go, 3); }; go(); }, close() {} });
  const reg = new Map(); let seq = 0;
  const mkCh = () => ({ readyState: 'connecting', onmessage: null, onopen: null, onclose: null, peer: null, binaryType: '', send(b) { setTimeout(() => this.peer.onmessage && this.peer.onmessage({ data: new Uint8Array(b).buffer }), 1); }, close() {} });
  const pcF = () => { const id = 'pc' + ++seq; const pc = { id, iceGatheringState: 'complete', addEventListener() {}, removeEventListener() {}, createDataChannel() { pc.channel = mkCh(); return pc.channel; }, async createOffer() { return { type: 'offer', sdp: 'v=0 FAKE ' + id }; }, async createAnswer() { return { type: 'answer', sdp: 'v=0 FAKE ' + id }; }, async setLocalDescription(d) { pc.localDescription = d; }, async setRemoteDescription(d) { if (d.type === 'answer') { const o = reg.get(/FAKE (pc\d+)/.exec(d.sdp)[1]); const a = pc.channel, b = mkCh(); a.peer = b; b.peer = a; setTimeout(() => { o.ondatachannel({ channel: b }); a.readyState = b.readyState = 'open'; a.onopen && a.onopen(); b.onopen && b.onopen(); }, 3); } }, close() {} }; reg.set(id, pc); return pc; };
  const TO = { connect: 800, gather: 30, broker: 100, fallbackAfter: 100 };
  const h = await hostRoom(room, { pcFactory: pcF, signaler: sig(), timeouts: TO });
  const g = await joinRoom(gekozen.room, { pcFactory: pcF, signaler: sig(), timeouts: TO });
  const gt = await g.opened; await waitFor(() => h.transport.isOpen() && gt.isOpen());
  const ontvangen = []; gt.onmessage = (b) => ontvangen.push([...b]); h.transport.send(Uint8Array.from([7, 8]));
  await waitFor(() => ontvangen.length); assert.deepEqual(ontvangen[0], [7, 8]);
  assert.ok(hub.wire.every((w) => !/v=0|FAKE/.test(w)), 'het aanbod en antwoord blijven versleuteld, ook voor een openbare sessie');
  host.stop(); luis.stop();
});
await t('een andere versie of een ander protocol staat in de lijst als "anders" en is niet aan te sluiten', async () => {
  const net = fakeNet();
  const a = await maakHost(net, { naam: 'Oud spel', room: 'A2B3C4D5E6', versie: '0.45.0', seed: 31 });
  const b = await maakHost(net, { naam: 'Nieuw protocol', room: 'B2B3C4D5E6', proto: PROTO + 1, seed: 32 });
  const c = await maakHost(net, { naam: 'Gelijk spel', room: 'C2B3C4D5E6', seed: 33 });
  const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 3);
  const per = Object.fromEntries(luis.lijst.lijst().map((x) => [x.naam, x]));
  assert.deepEqual([per['Oud spel'].anders, per['Oud spel'].kan, per['Nieuw protocol'].anders, per['Gelijk spel'].kan], [true, false, true, true]);
  assert.equal(luis.lijst.lijst()[0].naam, 'Gelijk spel', 'aan te sluiten staat bovenaan');
  [a, b, c].forEach((x) => x.stop()); luis.stop();
});
await t('verlopen: stopt de host met aankondigen, dan verdwijnt de sessie na 45 s (met een snelle klok), en het vastgehouden bericht wordt gewist', async () => {
  const net = fakeNet(); const k = { now: Date.now() };
  const host = await maakHost(net);
  const luis = await maakLuisteraar(net, { nu: () => k.now });
  await waitFor(() => luis.lijst.lijst(k.now).length === 1);
  const tussen = net.retained.size; assert.ok(tussen >= 1, 'de host heeft een vastgehouden bericht');
  host.stop(); await tick(20);
  assert.equal(net.retained.size, 0, 'bij stoppen wordt de aankondiging gewist');
  k.now += 44000; assert.equal(luis.lijst.lijst(k.now).length, 1, 'nog binnen 45 s');
  k.now += 1500; assert.equal(luis.lijst.lijst(k.now).length, 0, 'verlopen');
  luis.stop();
});
await t('een host die wegvalt zonder wissen (crash): een oud vastgehouden bericht komt niet meer in de lijst (tijdstempel te oud)', async () => {
  const net = fakeNet();
  const oud = codeer({ naam: 'Spook', spelers: 1, max: 4, versie: '0.46.0', proto: PROTO, room: ROOM, id: 'spooksessie', nu: Date.now() - 10 * 60 * 1000 });
  net.retained.set('gde/lijst/' + await topicFor(LIJST.sleutel) + '/gdeoudoudoud', oud);
  const luis = await maakLuisteraar(net);
  await waitFor(() => luis.ruw.length >= 1);
  await tick(30);
  assert.equal(luis.lijst.lijst().length, 0); assert.equal(luis.lijst.afgewezen.tijd, 1);
  luis.stop();
});
await t('misbruik: rommel, een vervalste naam en een vloed op de lijn komen niet in de lijst, en echte sessies blijven zichtbaar', async () => {
  const net = fakeNet(); const host = await maakHost(net); const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 1);
  // een aanvaller publiceert rechtstreeks op de broker (MQTT) met eigen onderwerpen
  const topic = await topicFor(LIJST.sleutel);
  const aanval = lijstSig(net, 99); aanval.backends = aanval._make();
  const mqtt = aanval.backends.find((b) => b.name === 'mqtt');
  mqtt.kondig(topic, () => 'dit is geen aankondiging', 200, 30);
  await tick(150);
  assert.ok(luis.lijst.afgewezen.json >= 1, 'rommel geteld');
  assert.equal(luis.lijst.lijst().length, 1);
  // een vloed van losse berichten met nieuwe id's: hoogstens 60 per minuut
  const l2 = new Serverlijst({ proto: PROTO, versie: '0.46.0' });
  const rng = makeRng(77); let toe = 0;
  for (let i = 0; i < 500; i++) { const r = l2.ontvang(codeer({ naam: 'Vloed ' + i, spelers: 1, max: 4, versie: '0.46.0', proto: PROTO, room: makeRoom(rng), id: maakId(rng), nu: Date.now() }), Date.now()); if (r.ok) toe++; }
  assert.equal(toe, LIJST.nieuwPerMinuut); assert.equal(l2.lijst().length, LIJST.maxGetoond);
  aanval.close(); host.stop(); luis.stop();
});
await t('melden: de gemelde sessie verdwijnt uit jouw lijst en blijft weg bij de volgende aankondiging, zonder dat er iets over de lijn gaat', async () => {
  const net = fakeNet(); const host = await maakHost(net); const luis = await maakLuisteraar(net);
  await waitFor(() => luis.lijst.lijst().length === 1);
  const voor = net.seen.length; luis.lijst.meld(host.id);
  assert.equal(luis.lijst.lijst().length, 0);
  await tick(120); // nog twee keer aangekondigd
  assert.equal(luis.lijst.lijst().length, 0, 'blijft weg');
  assert.ok(net.seen.slice(voor).every((m) => !/gemeld|meld/i.test(m.data)), 'Melden verstuurt niets');
  host.stop(); luis.stop();
});
await t('privacy: in de aankondiging op de lijn staat geen IP-adres, koppelcode of wachtwoord; een privé sessie plaatst niets', async () => {
  const net = fakeNet(); const luis0 = await maakLuisteraar(net, { seed: 41 });
  await tick(60); assert.equal(net.seen.filter((m) => /"offers":\[\{/.test(m.data) || /gde\/lijst/.test(m.data) && m.data.includes('"v":1')).length, 0, 'zonder host geen aankondiging');
  luis0.stop();
  const host = await maakHost(net); await tick(80);
  const plaatsingen = net.seen.filter((m) => m.data.includes('"v":1'));
  assert.ok(plaatsingen.length >= 2, 'de host plaatst herhaaldelijk');
  for (const m of plaatsingen) { assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(m.data), 'geen IP-adres'); assert.ok(!/GDE2|wachtwoord|password/i.test(m.data)); }
  host.stop();
});
await t('een luisteraar zonder bereikbare broker meldt dat (alleFout), zodat de lijst "geen verbinding" kan tonen', async () => {
  const net = fakeNet({ down: ['wss://t', 'wss://m'] });
  const luis = await maakLuisteraar(net);
  await waitFor(() => luis.sig.alleFout()); assert.equal(luis.sig.bereikbaar(), false);
  luis.stop();
});
await t('de eigen lijst-signaler maakt nooit verbinding voor hij gestart wordt (constructie is stil)', async () => {
  const net = fakeNet(); lijstSig(net, 1); await tick(30); assert.equal(net.verbonden, 0);
});

console.log(`net_serverlijst_brokers_test: ${n}/${n} ok`);
process.exit(0);
