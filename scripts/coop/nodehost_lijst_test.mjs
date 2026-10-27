// Samen spelen (#450, slice B): een koploze gastheer (scripts/coop/nodehost.mjs) in de openbare sessielijst.
// Geen echte sockets: een nepnetwerk met trackers en een MQTT-broker (retain en #-filter) zoals in
// scripts/net_serverlijst_brokers_test.mjs, en de echte LijstSignaler, Serverlijst en maakAankondiger.
// Dekt: de host verschijnt met dezelfde velden als een gewone host (naam, aantal spelers, maximum, versie), zonder IP-adres,
// koppelcode of wachtwoord; plek 0 (de gastheer zonder speler) telt niet mee; een tweede gastheer op dezelfde poort geeft
// geen tweede regel; stoppen en "openbaar uit" ruimen de regel op (het vastgehouden bericht wordt gewist).
//   node scripts/coop/nodehost_lijst_test.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { startKoplozeHost } from './nodehost.mjs';
import * as B from '../../game/js/net/brokers.js';
import { LIJST, Serverlijst } from '../../game/js/net/serverlijst.js';
import { PROTO } from '../../game/js/net/protocol.js';
import { VERSION } from '../../game/js/version.js';
import { topicFor } from '../../game/js/net/sigcrypto.js';
import { makeRng } from '../../game/js/net/memtransport.js';

let n = 0;
const t = async (naam, f) => { await f(); n++; console.log('  ' + naam); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, wat) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(20); } throw new Error('time-out: ' + wat); };
const vrijePoort = () => new Promise((res, rej) => { const s = createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

// ----- nepnetwerk: trackers (het laatste aanbod per peer, doorgegeven aan wie op hetzelfde onderwerp luistert) en MQTT
// (retain plus een #-abonnement). Precies het gedrag dat de lijst nodig heeft; verder komt er niets over de lijn.
function nepBrokers() {
  const net = { retained: new Map(), subs: [], tpeers: new Map(), seen: [], publicaties: [], verbonden: 0 };
  const later = (f) => setTimeout(f, 0);
  net.socket = (url) => {
    const ws = { url, closed: false, readyState: 1 };
    net.verbonden++;
    const deliver = (data) => later(() => { if (!ws.closed && ws.onmessage) ws.onmessage({ data }); });
    ws.close = () => { ws.closed = true; ws.readyState = 3; };
    const soort = /mqtt|mosquitto|emqx|hivemq/i.test(url) ? 'mqtt' : 'tracker';
    later(() => ws.onopen && ws.onopen());
    ws.send = (data) => {
      net.seen.push({ soort, url, data });
      if (soort === 'tracker') {
        const m = JSON.parse(data);
        const mij = net.tpeers.get(m.peer_id) || { hash: m.info_hash, url, offer: null };
        mij.deliver = deliver; net.tpeers.set(m.peer_id, mij);
        deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, interval: 120 }));
        if (m.offers && m.offers.length) {
          mij.offer = m.offers[0];
          for (const [pid, p] of net.tpeers) if (pid !== m.peer_id && p.url === url && p.hash === m.info_hash) p.deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: m.peer_id, offer_id: mij.offer.offer_id, offer: mij.offer.offer }));
        } else {
          for (const [pid, p] of net.tpeers) if (pid !== m.peer_id && p.url === url && p.hash === m.info_hash && p.offer) deliver(JSON.stringify({ action: 'announce', info_hash: m.info_hash, peer_id: pid, offer_id: p.offer.offer_id, offer: p.offer.offer }));
        }
        return;
      }
      const u8 = new Uint8Array(data), first = u8[0] >> 4;
      if (first === 1) { deliver(Uint8Array.from([0x20, 2, 0, 0])); return; } // CONNECT → CONNACK
      if (first === 8) { // SUBSCRIBE → SUBACK en alles wat er al vastgehouden staat
        const tl = (u8[4] << 8) | u8[5], filter = new TextDecoder().decode(u8.subarray(6, 6 + tl));
        net.subs.push({ filter, deliver }); deliver(Uint8Array.from([0x90, 3, 0, 1, 0]));
        for (const [tp, pl] of net.retained) if (past(filter, tp)) deliver(B.mqtt.publish(tp, pl, true));
        return;
      }
      if (first === 3) { // PUBLISH
        const p = B.mqtt.parse(u8)[0]; if (!p) return;
        net.publicaties.push(p);
        if (u8[0] & 1) { if (p.payload) net.retained.set(p.topic, p.payload); else net.retained.delete(p.topic); }
        for (const s of net.subs) if (s.deliver !== deliver && past(s.filter, p.topic)) s.deliver(B.mqtt.publish(p.topic, p.payload));
      }
    };
    return ws;
  };
  return net;
}
const past = (filter, topic) => (filter.endsWith('/#') ? topic.startsWith(filter.slice(0, -1)) : filter === topic);

const ROOM = 'K3J9D8F2MN';
const lijstSignaal = (net, seed = 11) => new B.LijstSignaler(
  { TRACKERS: ['wss://tracker.een.test'], MQTT_BROKERS: ['wss://broker.een.test/mqtt'] },
  { socket: net.socket, rand: makeRng(seed) },
  { brokerTimeout: 200, interval: 40 },
);
// De lijst bij een speler: dezelfde klasse als in lobbyui.js, met een vaste klok zodat verlopen te testen is.
async function luisteraar(net, k = { now: Date.now() }) {
  const l = new Serverlijst({ proto: PROTO, versie: VERSION, minTussen: 0, nu: () => k.now });
  const sig = lijstSignaal(net, 7);
  sig.luister(await topicFor(LIJST.sleutel), (tekst) => l.ontvang(tekst));
  return { sig, lijst: l, k, stop: () => sig.close() };
}
const aankondigingen = (net) => net.publicaties.filter((p) => p.topic.startsWith('gde/lijst/') && p.payload.startsWith('{')).map((p) => JSON.parse(p.payload));

// De koploze gastheer draait zonder venster: deze omgeving heeft geen document of window.
delete globalThis.document;
delete globalThis.window;

const poort = await vrijePoort();
const net = nepBrokers();
const luis = await luisteraar(net);
let host = null, host2 = null, host3 = null;
try {
  await t('de koploze gastheer staat in de lijst met dezelfde gegevens als een gewone host', async () => {
    host = await startKoplozeHost({ max: 4, wachtwoord: 'geheim', localIp: '127.0.0.1', port: poort, openbaar: true, naam: 'Zomeravond', kamer: ROOM, lijstSocket: net.socket, lijstInterval: 40 });
    await until(() => luis.lijst.lijst(luis.k.now).length === 1, 4000, 'de host in de lijst');
    const [rij] = luis.lijst.lijst(luis.k.now);
    assert.equal(rij.naam, 'Zomeravond');
    assert.equal(rij.spelers, 1, 'de sessie zelf, niet de spelerloze plek 0');
    assert.equal(rij.max, 4);
    assert.equal(rij.versie, VERSION);
    assert.equal(rij.room, ROOM);
    assert.equal(rij.id, host.world.coopNet.hub.id, 'het vaste id van deze sessie');
    assert.deepEqual([rij.anders, rij.vol, rij.kan], [false, false, true], 'aan te sluiten volgens de lijst');
    // de rij heeft precies de velden die de UI leest: er is geen apart veld voor een koploze host nodig
    assert.deepEqual(Object.keys(rij).sort(), ['anders', 'dim', 'gezien', 'id', 'kan', 'max', 'naam', 'ouderdom', 'room', 'spelers', 'versie', 'vol']);
    assert.deepEqual(host.publiek(), { id: host.world.coopNet.hub.id, naam: 'Zomeravond', spelers: 1, max: 4 });
    assert.equal(host.kamer, ROOM);
    return `${rij.naam}: ${rij.spelers}/${rij.max}, versie ${rij.versie}`;
  });

  await t('wat er de deur uit gaat: naam, spelers, maximum, versie en de kamercode; geen adres, koppelcode of wachtwoord', async () => {
    assert.ok(net.publicaties.length >= 1);
    const a = aankondigingen(net);
    assert.ok(a.length >= 1, 'de host plaatst herhaaldelijk');
    assert.deepEqual(Object.keys(a[0]).sort(), ['c', 'g', 'i', 'k', 'm', 'n', 'p', 's', 't', 'v'], 'dezelfde velden als een gewone host');
    assert.deepEqual([a[0].n, a[0].s, a[0].m, a[0].g, a[0].p, a[0].k], ['Zomeravond', 1, 4, VERSION, PROTO, ROOM]);
    assert.ok(/^[a-z0-9]{8,16}$/.test(a[0].i), 'het id van de sessie');
    for (const m of net.seen) {
      const tekst = typeof m.data === 'string' ? m.data : Buffer.from(m.data).toString('latin1');
      assert.ok(!/\d+\.\d+\.\d+\.\d+/.test(tekst), 'geen IP-adres');
      assert.ok(!/GDE2|geheim|wachtwoord|password/i.test(tekst), 'geen koppelcode en geen wachtwoord');
    }
    return `${a.length} aankondigingen, alleen ${Object.keys(a[0]).join(',')}`;
  });

  await t('een gast erbij telt mee, de gastheer zonder speler niet (plek 0)', async () => {
    const spelers = host.world.coopNet.hub.roster.spelers; // de hub telt hieruit, niet uit de afgeleide world.coopRoster
    const basis = spelers.length;
    assert.equal(basis, 1, 'alleen plek 0');
    spelers.push({ slot: 1, char: 'anita', rol: 'gast', verbinding: 'ok' });
    await until(() => (luis.lijst.lijst(luis.k.now)[0] || {}).spelers === 1, 3000, 'nog steeds 1 met één gast');
    spelers.push({ slot: 2, char: 'brigitte', rol: 'gast', verbinding: 'ok' });
    await until(() => (luis.lijst.lijst(luis.k.now)[0] || {}).spelers === 2, 3000, '2 met twee gasten');
    spelers.length = basis;
    await until(() => (luis.lijst.lijst(luis.k.now)[0] || {}).spelers === 1, 3000, 'weer 1 zonder gasten');
    return 'plek 0 telt niet mee';
  });

  await t('een tweede gastheer op dezelfde poort geeft geen tweede regel', async () => {
    const voor = aankondigingen(net).length;
    await assert.rejects(
      () => startKoplozeHost({ port: poort, localIp: '127.0.0.1', openbaar: true, naam: 'Tweede', lijstSocket: net.socket, lijstInterval: 40 }),
      (e) => new RegExp(`poort ${poort}`, 'i').test(e.message) && /bezet/i.test(e.message),
    );
    await sleep(250); // ruim tijd voor een aankondiging die er niet mag komen
    const rijen = luis.lijst.lijst(luis.k.now);
    assert.equal(rijen.length, 1, 'één regel, geen dubbele vermelding');
    assert.equal(rijen[0].naam, 'Zomeravond');
    assert.equal(rijen[0].id, host.world.coopNet.hub.id);
    const nieuw = aankondigingen(net).slice(voor);
    assert.ok(nieuw.every((x) => x.i === host.world.coopNet.hub.id), 'de tweede gastheer kondigt niets aan');
    return 'één regel, één id';
  });

  await t('stoppen: de aankondiging stopt en het vastgehouden bericht wordt gewist', async () => {
    assert.ok(net.retained.size >= 1, 'de host stond vastgehouden in de broker');
    await host.stop();
    assert.equal(host.publiek(), null, 'de sessie is weg');
    assert.equal(net.retained.size, 0, 'bij stoppen wordt de aankondiging gewist');
    const voor = net.seen.length;
    await sleep(200); // nog een paar intervallen: er mag niets meer bij
    assert.ok(net.seen.slice(voor).every((m) => !(typeof m.data === 'string' && m.data.includes('"v":1'))), 'geen aankondiging meer');
    luis.k.now += LIJST.verloop + 1000;
    assert.equal(luis.lijst.lijst(luis.k.now).length, 0, 'na het verloop is de regel weg');
    luis.k.now = Date.now();
    host = null;
    return 'weg uit de lijst, bericht gewist';
  });

  await t('de sessie eindigt (stopCoopNet): de aankondiging gaat uit zonder dat het proces stopt', async () => {
    host3 = await startKoplozeHost({ port: await vrijePoort(), localIp: '127.0.0.1', openbaar: true, naam: 'Korte sessie', lijstSocket: net.socket, lijstInterval: 40 });
    await until(() => luis.lijst.lijst(luis.k.now).length === 1, 4000, 'de korte sessie in de lijst');
    assert.equal(luis.lijst.lijst(luis.k.now)[0].naam, 'Korte sessie');
    assert.ok(net.retained.size >= 1);
    host3.N.stopCoopNet(host3.world); // de sessie stopt (de hub sluit), het proces blijft draaien
    await sleep(100);
    assert.equal(host3.publiek(), null, 'de sessie is weg');
    assert.equal(net.retained.size, 0, 'closeAll wist het vastgehouden bericht');
    const voor = net.seen.length;
    await sleep(200);
    assert.ok(net.seen.slice(voor).every((m) => !(typeof m.data === 'string' && m.data.includes('"v":1'))), 'geen aankondiging meer');
    luis.k.now += LIJST.verloop + 1000;
    assert.equal(luis.lijst.lijst(luis.k.now).length, 0, 'de regel verloopt');
    luis.k.now = Date.now();
    await host3.stop();
    host3 = null;
    return 'de aankondiging hangt aan de sessie';
  });

  await t('zonder openbaar geen aankondiging; daarna aan en weer uit met dezelfde regel', async () => {
    const voor = net.publicaties.length;
    host2 = await startKoplozeHost({ max: 4, localIp: '127.0.0.1', openbaar: false, lijstSocket: net.socket, lijstInterval: 40 });
    await sleep(250);
    assert.equal(net.publicaties.length, voor, 'privé: er gaat niets naar de brokers');
    assert.equal(host2.publiek(), null);
    assert.equal(host2.kamer, '', 'een privé sessie heeft geen kamercode in de lijst');
    const r = await host2.zetOpenbaar(true, 'Weer open');
    assert.equal(r.ok, true);
    assert.equal(r.naam, 'Weer open');
    assert.match(host2.kamer, /^[A-HJ-NP-Z2-9]{10}$/, 'de gastheer kiest zelf een kamercode');
    await until(() => luis.lijst.lijst(luis.k.now).length === 1, 4000, 'weer in de lijst');
    assert.equal(luis.lijst.lijst(luis.k.now)[0].naam, 'Weer open');
    assert.ok(net.retained.size >= 1);
    await host2.zetOpenbaar(false);
    await sleep(100);
    assert.equal(net.retained.size, 0, 'uitzetten wist het vastgehouden bericht');
    luis.k.now += LIJST.verloop + 1000;
    await until(() => luis.lijst.lijst(luis.k.now).length === 0, 2000, 'weg na het verloop');
    luis.k.now = Date.now();
    return 'uit is uit';
  });

  await t('een ongeldige naam of kamercode geeft een nette melding en start niets', async () => {
    await assert.rejects(() => startKoplozeHost({ kamer: 'te-kort', localIp: '127.0.0.1', openbaar: true, naam: 'X' }), /kamercode/i);
    await assert.rejects(() => startKoplozeHost({ openbaar: true, naam: 'Kanker', localIp: '127.0.0.1' }), /kan niet/i);
    return 'geen halve sessie';
  });
} finally {
  for (const h of [host, host2, host3]) { try { if (h) await h.stop(); } catch (e) { /* al weg */ } }
  try { luis.stop(); } catch (e) { /* al weg */ }
}
console.log(`nodehost_lijst_test: ${n}/${n} ok`);
process.exit(0);
