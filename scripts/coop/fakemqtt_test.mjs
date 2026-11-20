// Samen spelen-testbank (#983): de nep-MQTT-broker (scripts/coop/fakemqtt.mjs) met de echte LijstSignaler, Serverlijst
// en MultiSignaler van het spel. Geen echt netwerk: alleen 127.0.0.1.
//   node scripts/coop/fakemqtt_test.mjs
import assert from 'node:assert/strict';
import { startFakeMqtt } from './fakemqtt.mjs';
import { LijstSignaler, MultiSignaler } from '../../game/js/net/brokers.js';
import { LIJST, Serverlijst, maakAankondiger } from '../../game/js/net/serverlijst.js';
import { PROTO } from '../../game/js/net/protocol.js';
import { topicFor } from '../../game/js/net/sigcrypto.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms, wat) => { const e = Date.now() + ms; while (Date.now() < e) { if (f()) return; await sleep(30); } throw new Error('time-out: ' + wat); };
let n = 0; const t = async (naam, f) => { await f(); n++; console.log('  ' + naam); };
const broker = await startFakeMqtt();
const CFG = { TRACKERS: [], MQTT_BROKERS: [`ws://127.0.0.1:${broker.port}`], PEERJS: { host: '127.0.0.1', port: 1, path: '/', key: 'x', secure: false } };
const env = { socket: (url) => { const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; return ws; } };
const sluit = [];
try {
  await t('een aankondiging komt in de lijst van een tweede speler, zonder IP-adres of kamercode', async () => {
    const topic = await topicFor(LIJST.sleutel);
    const host = new LijstSignaler(CFG, env, { interval: 200 }); sluit.push(host);
    host.kondig(topic, maakAankondiger({ naam: 'Testspel', versie: '0.0.1', proto: PROTO, id: 'abcd12345', hub: () => ({ spelers: 1, max: 4, hostKey: 'k'.repeat(87) }) }));
    const lijst = new Serverlijst({ proto: PROTO, versie: '0.0.1' });
    const gast = new LijstSignaler(CFG, env); sluit.push(gast);
    gast.luister(topic, (tekst) => lijst.ontvang(tekst));
    await until(() => lijst.lijst().length === 1, 5000, 'rij in de lijst');
    const r = lijst.lijst()[0];
    assert.equal(r.naam, 'Testspel'); assert.equal(r.spelers, 1); assert.equal(r.max, 4); assert.equal(r.kan, true);
    for (const g of broker.gezien) assert.doesNotMatch(g.tekst, /\d+\.\d+\.\d+\.\d+/, 'geen IP-adres in een bericht');
  });
  await t('stoppen wist de vastgehouden rij', async () => {
    sluit[0].close(); await sleep(300);
    assert.equal([...broker.retained.keys()].filter((k) => k.startsWith('gde/lijst/')).length, 0);
  });
  await t('kamer: aanbod en antwoord via de broker (MultiSignaler)', async () => {
    const h = new MultiSignaler(CFG, env), g = new MultiSignaler(CFG, env); sluit.push(h, g);
    let antwoord = null, aanbod = null;
    h.host('topicx', 'AANBOD', (a) => { antwoord = a; });
    g.join('topicx', (o, reply) => { aanbod = o; reply('ANTWOORD'); });
    await until(() => antwoord && aanbod, 5000, 'aanbod en antwoord');
    assert.equal(aanbod, 'AANBOD'); assert.equal(antwoord, 'ANTWOORD');
  });
} finally { for (const s of sluit) { try { s.close(); } catch (e) { /* weg */ } } broker.close(); }
console.log(`fakemqtt_test: ${n}/3 ok`);
process.exit(n === 3 ? 0 : 1);
