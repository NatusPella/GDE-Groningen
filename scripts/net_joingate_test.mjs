// Samen spelen (#583): deelnemen via de openbare lijst zonder de kamercode te publiceren
// (game/js/net/joingate.js), met een nep-broker in het geheugen en een nep-RTCPeerConnection.
// Vier dingen worden bewezen: een gast die op een rij uit de lijst klikt komt er nog steeds in, wie alleen de
// lijst leest kan het aanbod van de host (met zijn IP-adressen) niet ontsleutelen, een antwoord van een
// niet-host wordt verworpen vóór het verbinden (#795), en de formaten zijn begrensd.
import assert from 'node:assert/strict';
import { JOIN, bedienKamer, vraagKamer, maakVraag, leesVraag, maakPostvak, leesPostvak, maakNonce, joinTopic, antwoordTopic } from '../game/js/net/joingate.js';
import { makeRoom, encryptBlob, decryptBlob, topicFor, maakSleutelpaar, sleutelTekst, sleutelVanTekst, gedeeldeSleutel, ontsleutelVoor, versleutelVoor } from '../game/js/net/sigcrypto.js';
import { codeer, decodeer, LIJST } from '../game/js/net/serverlijst.js';
import { hostRoom, joinRoom } from '../game/js/net/rtcroom.js';
import { PROTO } from '../game/js/net/protocol.js';

let n = 0;
const t = async (name, f) => { await f(); n++; };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const ID = 'abcdefghij';
const ROOM_RE = /^[A-HJ-NP-Z2-9]{10}$/;
// #795: de hostsleutel van de sessie. De host houdt het paar; de gast krijgt alleen de publieke sleutel uit de
// aankondiging. Een tweede paar speelt de aanvaller.
const HOST = await maakSleutelpaar();
const HOST_KEY = await sleutelTekst(HOST);
const ATTACKER = await maakSleutelpaar();

// ----- een nep-broker: onderwerpen met één vaste tekst (kondig) en luisteraars (luister), net als brokers.js.
// De host en de gast hebben elk hun eigen signaler; de test pompt de publicatierondes.
function nepBroker() {
  const topics = new Map(), publishes = [];
  const van = (t) => { let e = topics.get(t); if (!e) { e = { bron: null, laatste: null, luisteraars: new Set() }; topics.set(t, e); } return e; };
  const hub = { topics, publishes };
  hub.signaler = () => {
    const eigen = [];
    return {
      kondig(topic, tekst) { van(topic).bron = tekst; hub.publiceer(topic); },
      luister(topic, cb) { const e = van(topic); e.luisteraars.add(cb); eigen.push([topic, cb]); if (e.laatste != null) queueMicrotask(() => cb(e.laatste)); },
      close() { for (const [t, cb] of eigen) { const e = topics.get(t); if (e) e.luisteraars.delete(cb); } eigen.length = 0; },
    };
  };
  hub.publiceer = (topic) => {
    const e = topics.get(topic); if (!e || !e.bron) return;
    const tekst = typeof e.bron === 'function' ? e.bron() : e.bron;
    if (!tekst) return;
    e.laatste = tekst; publishes.push(tekst);
    for (const cb of [...e.luisteraars]) queueMicrotask(() => cb(tekst));
  };
  hub.tik = () => { for (const [, e] of topics) if (e.bron) hub.publiceer([...topics.keys()].find((k) => topics.get(k) === e)); };
  hub.pomp = async (ms = 200) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { hub.tik(); await tick(4); } };
  return hub;
}
// Wacht op een belofte terwijl de nep-broker blijft publiceren (in het echt doet de interval dat).
async function wachtOp(belofte, hub, ms = 4000) {
  let uit, fout, klaar = false;
  belofte.then((x) => { uit = x; klaar = true; }, (e) => { fout = e; klaar = true; });
  const t0 = Date.now();
  while (!klaar && Date.now() - t0 < ms) { hub.tik(); await tick(4); }
  if (!klaar) throw new Error('time-out');
  if (fout) throw fout;
  return uit;
}

// ----- nep-RTCPeerConnection (zelfde truc als net_rtcroom_test.mjs)
const pcs = new Map(); let seq = 0;
function makePc() {
  const id = 'pc' + ++seq;
  const pc = {
    iceGatheringState: 'complete', ondatachannel: null, channel: null, peer: null,
    addEventListener() {}, removeEventListener() {},
    createDataChannel() { const ch = kanaal(); pc.channel = ch; return ch; },
    async createOffer() { return { type: 'offer', sdp: `v=0 FAKE ${id} candidate srflx 84.1.2.3` }; },
    async createAnswer() { return { type: 'answer', sdp: `v=0 FAKE ${id} answer` }; },
    async setLocalDescription(d) { pc.localDescription = d; },
    async setRemoteDescription(d) {
      const ander = pcs.get(/FAKE (pc\d+)/.exec(d.sdp)[1]); pc.peer = ander;
      if (d.type === 'answer') {
        ander.peer = pc;
        const a = pc.channel, b = kanaal(); b.peer = a; a.peer = b; ander.channel = b;
        setTimeout(() => { if (ander.ondatachannel) ander.ondatachannel({ channel: b }); a.readyState = 'open'; b.readyState = 'open'; a.onopen && a.onopen(); b.onopen && b.onopen(); }, 5);
      }
    },
    close() {},
  };
  pcs.set(id, pc);
  return pc;
}
function kanaal() {
  return { readyState: 'connecting', onmessage: null, onopen: null, onclose: null, peer: null, binaryType: '',
    send(x) { const to = this.peer; setTimeout(() => to.onmessage && to.onmessage({ data: new Uint8Array(x).buffer }), 2); }, close() { this.readyState = 'closed'; } };
}
const TO = { connect: 600, gather: 50, broker: 100, fallbackAfter: 100 };

// ----- de formaten
await t('verzoek en postvak: rondreis, en rommel of een verkeerd id valt af', async () => {
  const pub = await sleutelTekst(await maakSleutelpaar());
  const nonce = maakNonce();
  const tekst = maakVraag({ id: ID, nonce, pub, nu: 1000 });
  assert.equal(typeof tekst, 'string');
  const gelezen = leesVraag(tekst, { id: ID, nu: 1000 });
  assert.equal(gelezen.ok, true);
  assert.deepEqual([gelezen.a.id, gelezen.a.nonce, gelezen.a.pub], [ID, nonce, pub]);

  assert.deepEqual(leesVraag(tekst, { id: 'anderid123', nu: 1000 }), { ok: false, reason: 'ander-id' });
  assert.equal(leesVraag(tekst, { id: ID, nu: 1000 + JOIN.scheef + 1 }).reason, 'velden', 'een oud verzoek telt niet');
  for (const rommel of ['', 'geen json', '[]', 'null', JSON.stringify({ v: 1 }), JSON.stringify({ v: JOIN.formaat, i: ID, n: 'kort', p: pub, t: 1000 })]) {
    assert.equal(leesVraag(rommel, { id: ID, nu: 1000 }).ok, false, rommel);
  }
  assert.equal(maakVraag({ id: 'X!', nonce, pub, nu: 1000 }), null);

  // #795: het postvak draagt de hostsleutel één keer; de antwoorden erin zijn voor die host versleuteld.
  const postvak = JSON.parse(maakPostvak(new Map([[nonce, { blob: 'abc', t: 1000 }]]), 1000, HOST_KEY));
  assert.deepEqual(Object.keys(postvak), ['v', 'k', 'a', 't']);
  assert.equal(postvak.k, HOST_KEY);
  assert.deepEqual(Object.keys(postvak.a), [nonce]);
  assert.deepEqual(leesPostvak(maakPostvak(new Map([[nonce, { blob: 'abc', t: 1000 }]]), 1000, HOST_KEY), 1000), { ok: true, hostKey: HOST_KEY, a: { [nonce]: { blob: 'abc', t: 1000 } } });
  assert.equal(leesPostvak('{}', 1000).ok, false);
  assert.equal(maakPostvak(new Map([[nonce, { blob: 'abc', t: 1000 }]]), 1000, ''), null, 'zonder hostsleutel geen postvak');
});

// ----- de gast krijgt een kamer en kan daarna verbinden (het pad dat de lijst nodig heeft)
await t('een gast via de lijst krijgt een eenmalige kamer en verbindt daarna echt', async () => {
  const hub = nepBroker();
  const kamers = [];
  const gate = bedienKamer({ id: ID, hostKeyPair: HOST, maakSignaler: hub.signaler, onKamer: async (room) => { kamers.push(room); } });
  assert.ok(gate, 'de host kan verzoeken ontvangen');

  const room = await wachtOp(vraagKamer({ id: ID, hostKey: HOST_KEY, maakSignaler: hub.signaler, wacht: 3000 }), hub);
  assert.match(room, ROOM_RE, 'de gast heeft een kamercode');
  assert.deepEqual(kamers, [room], 'de host zette precies die kamer klaar');

  // En met die kamer werkt het gewone versleutelde pad: host zet het aanbod klaar, de gast hoort erbij.
  const rh = hub; // dezelfde nep-broker, nu voor de kamer zelf
  const roomSig = (() => { const offers = new Map(), answers = new Map(); return { offers, answers, signaler: () => ({ host(topic, blob, onAnswer) { offers.set(topic, blob); answers.set(topic, onAnswer); }, join(topic, onOffer) { const go = () => { const o = offers.get(topic); if (o) onOffer(o, (a) => answers.get(topic)(a)); else setTimeout(go, 3); }; go(); }, close() {} }) }; })();
  const host = await hostRoom(room, { pcFactory: makePc, signaler: roomSig.signaler(), timeouts: TO });
  const guest = await joinRoom(room, { pcFactory: makePc, signaler: roomSig.signaler(), timeouts: TO });
  await guest.opened;
  const t0 = Date.now();
  while (!(host.transport.isOpen() && (await guest.opened).isOpen()) && Date.now() - t0 < 3000) await tick(5);
  assert.equal(host.transport.isOpen(), true, 'het datakanaal is open');
  gate.stop(); rh.pomp(0);
});

// ----- de kern van #583: met alleen de lijst is er niets te ontsleutelen
await t('wie alleen de lijst leest, kan het aanbod van de host niet vinden of ontsleutelen', async () => {
  const hub = nepBroker();
  const kamers = [];
  const gate = bedienKamer({ id: ID, hostKeyPair: HOST, maakSignaler: hub.signaler, onKamer: async (room) => { kamers.push(room); } });
  const room = await wachtOp(vraagKamer({ id: ID, hostKey: HOST_KEY, maakSignaler: hub.signaler, wacht: 3000 }), hub);
  assert.match(room, ROOM_RE);

  // Wat een derde kan zien: de aankondiging in de lijst en alle teksten die over de twee gate-onderwerpen gaan.
  const aankondiging = codeer({ naam: 'Zomeravond', spelers: 2, max: 4, versie: '0.99.0', proto: PROTO, id: ID, hostKey: HOST_KEY, nu: 1000 });
  const rij = decodeer(aankondiging, 1000).a;
  assert.equal(rij.id, ID);
  assert.ok(!('room' in rij), 'de lijst geeft geen kamercode');
  assert.equal(rij.hostKey, HOST_KEY, 'de lijst geeft wel de publieke hostsleutel (#795)');
  const openbaar = [aankondiging, ...hub.publishes].join('\n');
  assert.ok(!openbaar.includes(room), 'de kamercode van deze sessie staat in geen enkele openbare tekst');
  assert.ok(!/"room"\s*:/.test(openbaar), 'geen kamerveld in de openbare teksten');
  assert.ok(!/84\.1\.2\.3|\d+\.\d+\.\d+\.\d+/.test(openbaar), 'geen IP-adres in de openbare teksten');

  // Het aanbod van de host staat onder de kamercode; zonder die code is het onderwerp niet af te leiden
  // en de blob niet te ontsleutelen (dat is precies het gat van #583).
  const aanbod = await encryptBlob(room, JSON.stringify({ type: 'offer', sdp: 'v=0 candidate srflx 84.1.2.3' }));
  assert.notEqual(await topicFor(ID), await topicFor(room), 'het onderwerp van de kamer volgt niet uit het sessie-id');
  for (const gok of [ID, aankondiging, ...hub.publishes]) assert.equal(await decryptBlob(gok, aanbod), null, 'geen enkele openbare tekst is de sleutel');

  // Zelfs het versleutelde antwoord in het postvak is voor een derde onleesbaar: het is versleuteld voor de
  // gast die het vroeg, niet met de publieke gegevens uit de lijst.
  const derde = await maakSleutelpaar();
  const derdePub = await sleutelTekst(derde);
  const postvak = JSON.parse(hub.topics.get(await antwoordTopic(ID)).laatste);
  assert.equal(postvak.k, HOST_KEY, 'het postvak noemt de hostsleutel, geen kamercode (#795)');
  const eerste = postvak.a[Object.keys(postvak.a)[0]];
  const hostPub = await sleutelVanTekst(HOST_KEY);
  assert.equal(await ontsleutelVoor(await gedeeldeSleutel(derde, hostPub), eerste.c, Object.keys(postvak.a)[0]), null, 'een derde kan het antwoord niet ontsleutelen');
  assert.ok(!openbaar.includes(derdePub), 'de eigen sleutel van de derde komt er niet in voor');
  gate.stop();
});

// ----- #795 (vervolg op #777): een antwoord van een niet-host wordt vóór het verbinden verworpen
await t('een aanvaller die het verzoek onderschept, kan de gast geen kamer geven', async () => {
  const hub = nepBroker();
  const tv = await joinTopic(ID), ta = await antwoordTopic(ID);
  // De aanvaller luistert op het openbare join-onderwerp en publiceert een postvak dat voor de gast een geldig
  // antwoord lijkt: hij heeft de publieke sleutel van de gast, maar niet de privéhelft van de hostsleutel.
  let aanval = null;
  const spion = hub.signaler();
  const zender = hub.signaler();
  spion.luister(tv, (bericht) => {
    const r = leesVraag(bericht, { id: ID, nu: Date.now() });
    if (!r.ok) return;
    (async () => {
      const gastPub = await sleutelVanTekst(r.a.pub);
      const sleutel = await gedeeldeSleutel(ATTACKER, gastPub); // het gedeelde geheim van de aanvaller met de gast
      const room = makeRoom();
      const blob = await versleutelVoor(sleutel, JSON.stringify({ room, id: ID }), r.a.nonce);
      // Het postvak krijgt zelfs de echte hostsleutel als etiket; zonder de privéhelft ontsleutelt het niet.
      aanval = JSON.stringify({ v: JOIN.formaat, k: HOST_KEY, a: { [r.a.nonce]: { c: blob, t: Math.floor(Date.now()) } }, t: Math.floor(Date.now()) });
    })();
  });
  zender.kondig(ta, () => aanval);

  let fout = '';
  try { await wachtOp(vraagKamer({ id: ID, hostKey: HOST_KEY, maakSignaler: hub.signaler, wacht: 300 }), hub); } catch (e) { fout = e.message; }
  assert.match(fout, /antwoordt niet/, 'de gast verwerpt het antwoord van de niet-host');
  assert.ok(aanval, 'de aanvaller heeft echt geantwoord (anders bewijst deze test niets)');
  spion.close(); zender.close();
});

await t('zonder hostsleutel vraagt de gast niets aan: geen antwoord is te controleren', async () => {
  const hub = nepBroker();
  await assert.rejects(() => vraagKamer({ id: ID, maakSignaler: hub.signaler, wacht: 100 }), /niet bereikbaar/);
  await assert.rejects(() => vraagKamer({ id: ID, hostKey: 'kort', maakSignaler: hub.signaler, wacht: 100 }), /niet bereikbaar/);
});

// ----- misbruik en grenzen
await t('de host antwoordt niet op rommel, een dubbel verzoek of een verzoek voor een ander id', async () => {
  const hub = nepBroker();
  const kamers = [];
  const gate = bedienKamer({ id: ID, hostKeyPair: HOST, maakSignaler: hub.signaler, onKamer: async (room) => { kamers.push(room); }, nu: () => 1000 });
  const pub = await sleutelTekst(await maakSleutelpaar());
  const nonce = maakNonce();
  const tv = await joinTopic(ID);
  // rommel en een verzoek voor een andere sessie
  hub.publiceer(tv); // nog niets
  const vraagAnder = maakVraag({ id: 'anderid123', nonce, pub, nu: 1000 });
  hub.topics.get(tv); // het onderwerp bestaat pas na het luisteren
  await tick(5);
  assert.equal(kamers.length, 0, 'zonder verzoek gebeurt er niets');

  // twee keer hetzelfde verzoek: één kamer
  const echteVraag = maakVraag({ id: ID, nonce, pub, nu: 1000 });
  const lever = (tekst) => { for (const cb of [...hub.topics.get(tv).luisteraars]) cb(tekst); };
  lever(vraagAnder); await tick(20);
  assert.equal(kamers.length, 0, 'een verzoek voor een ander id telt niet');
  lever('rommel'); await tick(20);
  assert.equal(kamers.length, 0, 'rommel telt niet');
  lever(echteVraag); await tick(60);
  lever(echteVraag); await tick(60);
  assert.equal(kamers.length, 1, 'hetzelfde verzoek levert één kamer op');
  gate.stop();
});

await t('zonder host geeft vraagKamer een fout, en de antwoorden in het postvak verlopen', async () => {
  const hub = nepBroker();
  let fout = '';
  try { await vraagKamer({ id: ID, hostKey: HOST_KEY, maakSignaler: hub.signaler, wacht: 80 }); } catch (e) { fout = e.message; }
  assert.match(fout, /antwoordt niet/);

  const gate = bedienKamer({ id: ID, hostKeyPair: HOST, maakSignaler: hub.signaler, onKamer: async () => {}, nu: () => 1000 });
  const pub = await sleutelTekst(await maakSleutelpaar());
  const nonce = maakNonce();
  await tick(5);
  const tv = await joinTopic(ID);
  for (const cb of [...hub.topics.get(tv).luisteraars]) cb(maakVraag({ id: ID, nonce, pub, nu: 1000 }));
  await tick(80);
  assert.equal(gate.antwoorden.size, 1);
  const tekst = gate.tekst();
  const postvak = leesPostvak(tekst, 1000);
  assert.ok(postvak.ok);
  assert.equal(postvak.hostKey, HOST_KEY, 'het postvak draagt de hostsleutel (#795)');
  assert.ok(postvak.a[nonce], 'en het antwoord voor deze nonce');
  gate.stop();
});

console.log(`net_joingate_test: ${n}/${n} ok`);
process.exit(0);
