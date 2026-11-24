// Samen spelen (#1293): de betrouwbare stroom (game/js/net/protocol.js Reliable) over een ongeordend kanaal. Een laat bericht 1 van
// het VORIGE tijdperk (een herhaling die nog onderweg was toen de zender opnieuw begon, bij hervatten of een nieuwe sessie) mag de
// ontvanger niet terugzetten: anders komt het dubbel aan, dragen de bevestigingen het oude tijdperk (die de zender negeert) en blijft
// de rest van de nieuwe stroom liggen. Puur, zonder netwerk.
import assert from 'node:assert/strict';
import { Reliable, readHeader, decodeJson, epochNewer } from '../game/js/net/protocol.js';

let n = 0;
const t = (name, f) => { f(); n++; console.log('ok  ', name); };
const acks = [];
const emit = (b) => { const h = readHeader(b); acks.push({ epoch: h.seq, expected: h.ack }); };
const msg = (seq, epoch, body) => ({ seq, epoch, body });

t('een laat bericht 1 van het vorige tijdperk wordt niet nog eens afgeleverd en zet de ontvanger niet terug', () => {
  const r = new Reliable();
  assert.deepEqual(r.receive(msg(1, 1, 'a'), emit), ['a']);
  assert.deepEqual(r.receive(msg(2, 1, 'b'), emit), ['b']);
  assert.deepEqual(r.receive(msg(1, 2, 'c'), emit), ['c']); // de zender begon opnieuw (hervatten)
  acks.length = 0;
  assert.deepEqual(r.receive(msg(1, 1, 'a'), emit), [], 'de oude herhaling komt niet dubbel aan');
  assert.equal(acks[0].epoch, 2, 'de bevestiging hoort bij het huidige tijdperk (die telt bij de zender)');
  assert.deepEqual(r.receive(msg(2, 2, 'd'), emit), ['d'], 'de nieuwe stroom gaat gewoon door');
});

t('de zender telt vooruit: tijdperk 3 na 2 wordt gewoon opgepakt', () => {
  const s = new Reliable(), r = new Reliable(), uit = [];
  const draad = (b) => uit.push(b);
  s.send({ x: 1 }, 0, draad); s.reset(); s.send({ x: 2 }, 0, draad); s.reset(); s.send({ x: 3 }, 0, draad);
  const ontv = [];
  for (const b of uit) { const m = decodeJson(b); ontv.push(...r.receive({ seq: m.seq, body: m.body, epoch: m.ack }, emit)); }
  assert.deepEqual(ontv.map((b) => b.x), [1, 2, 3]);
  // en nu komen de oude herhalingen nog eens langs, in willekeurige volgorde: niets dubbel
  for (const b of [uit[1], uit[0], uit[1]]) { const m = decodeJson(b); assert.deepEqual(r.receive({ seq: m.seq, body: m.body, epoch: m.ack }, emit), []); }
});

t('een nieuwe sessie (ontvangtellers op nul, zoals session.js bij een welkom met een nieuw token) neemt elk tijdperk aan', () => {
  const r = new Reliable();
  r.receive(msg(1, 1, 'a'), emit); r.receive(msg(1, 5, 'b'), emit);
  r.recvEpoch = 0; r.expected = 1; r.ahead.clear();
  assert.deepEqual(r.receive(msg(1, 1, 'nieuw'), emit), ['nieuw'], 'tijdperk 1 van de nieuwe host-sessie komt aan');
});

t('tijdperken lopen rond: 1 na 255 is nieuwer, 255 na 1 niet', () => {
  assert.ok(epochNewer(2, 1) && epochNewer(1, 255) && epochNewer(3, 254));
  assert.ok(!epochNewer(1, 2) && !epochNewer(255, 1) && !epochNewer(7, 7));
  const r = new Reliable(); r.recvEpoch = 255;
  assert.deepEqual(r.receive(msg(1, 1, 'rond'), emit), ['rond']);
  assert.deepEqual(r.receive(msg(1, 255, 'oud'), emit), []);
});

console.log(`net_reliable_tijdperk_test: ${n}/4 ok`);
