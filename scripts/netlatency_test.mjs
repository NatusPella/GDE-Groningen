// Effectieve latentie in Samen spelen (#806): meet met het echte interpolatie-
// en transportpad hoeveel vertraging een gast ziet. Geen netwerk en geen
// hardware: het geheugentransport (net/memtransport.js) simuleert latency,
// jitter en verlies, en SnapBuffer (net/session.js) is dezelfde buffer als in
// het spel.   node scripts/netlatency_test.mjs
import { createLink } from '../game/js/net/memtransport.js';
import { SnapBuffer, SNAP_HZ } from '../game/js/net/session.js';
import { INTERP_DELAY } from '../game/js/net/interp.js';

const DT = 1 / 60;
const PVP_MAX_MS = 200; // voorstel voor de PvP-arena (geen ranked, 18+ co-opspel)
const PVP_INTERP = 0.06; // voorgestelde kortere vertraging in PvP (#806)
const enc = new TextEncoder();
const dec = new TextDecoder();

// Eén run: de host verandert op hostT=1 zijn toestand (x 0 -> 1) en de gast
// stuurt op t=0,5 s een invoer. We meten wanneer de gast het beeld ziet en
// wanneer de host de invoer heeft.
function run({ latency, jitter, loss = 0, seed = 3, interpDelay = INTERP_DELAY } = {}) {
  const link = createLink({ latency, jitter, loss, seed });
  const buf = new SnapBuffer();
  const m = { guestInputAt: 0.5, hostGotAt: null, guestSawAt: null };
  let wall = 0, hostT = 0, sendAcc = 0, inputSent = false;
  link.a.onmessage = () => { if (m.hostGotAt == null) m.hostGotAt = wall; };
  link.b.onmessage = (bytes) => { try { buf.push(JSON.parse(dec.decode(bytes))); } catch (e) { /* kapot pakket telt niet mee */ } };
  while (wall < 4 && (m.guestSawAt == null || m.hostGotAt == null)) {
    wall += DT;
    hostT += DT;
    sendAcc += DT;
    while (sendAcc >= 1 / SNAP_HZ) {
      sendAcc -= 1 / SNAP_HZ;
      const x = hostT >= 1 ? 1 : 0; // de verandering die de gast moet zien
      const snapshot = { hostT, players: [{ slot: 0, x, y: 0, z: 0, angle: 0, alive: true, inVeh: false }], entities: [] };
      link.a.send(enc.encode(JSON.stringify(snapshot)));
    }
    if (!inputSent && wall >= m.guestInputAt) { link.b.send(enc.encode('input')); inputSent = true; }
    link.advance(DT);
    buf.advance(DT, interpDelay);
    const s = buf.sample();
    if (m.guestSawAt == null && s && s.players && s.players[0] && s.players[0].x >= 1) m.guestSawAt = wall;
  }
  return {
    guestToHostMs: m.hostGotAt == null ? null : Math.round((m.hostGotAt - m.guestInputAt) * 1000),
    hostToGuestMs: m.guestSawAt == null ? null : Math.round((m.guestSawAt - 1) * 1000),
    arrived: m.hostGotAt != null && m.guestSawAt != null,
  };
}

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const lan = run({ latency: 0.03, jitter: 0.01 });
const mobiel = run({ latency: 0.08, jitter: 0.03 });
const mobielPvp = run({ latency: 0.08, jitter: 0.03, interpDelay: PVP_INTERP });
console.log('LAN (30 ms, jitter 10 ms):', JSON.stringify(lan));
console.log('mobiel (80 ms, jitter 30 ms):', JSON.stringify(mobiel));
console.log(`mobiel met PvP-vertraging ${Math.round(PVP_INTERP * 1000)} ms:`, JSON.stringify(mobielPvp));

ok(lan.arrived && mobiel.arrived && mobielPvp.arrived, 'alle runs leveren een meting op');
ok(lan.guestToHostMs >= 30 && lan.guestToHostMs <= 30 + 16.7 + 10 + 5, 'gast naar host: latency + hooguit een frame', lan.guestToHostMs);
ok(lan.hostToGuestMs >= Math.round(INTERP_DELAY * 1000) && lan.hostToGuestMs <= Math.round(INTERP_DELAY * 1000 + 1000 / SNAP_HZ + 30 + 10 + 16.7 + 10),
  'host naar gast: interpoldtijd + snapshotinterval + latency + frame', lan.hostToGuestMs);
ok(mobiel.hostToGuestMs > lan.hostToGuestMs, 'een slechtere verbinding geeft meer vertraging', [lan.hostToGuestMs, mobiel.hostToGuestMs]);

// De drempel is een voorstel; de meting laat zien waar de standaard buiten valt.
console.log(`PvP-drempel ${PVP_MAX_MS} ms: LAN ${lan.hostToGuestMs <= PVP_MAX_MS ? 'gehaald' : 'NIET gehaald'} (${lan.hostToGuestMs} ms), mobiel ${mobiel.hostToGuestMs <= PVP_MAX_MS ? 'gehaald' : 'NIET gehaald'} (${mobiel.hostToGuestMs} ms)`);
ok(lan.hostToGuestMs <= PVP_MAX_MS, 'op een LAN haalt de standaard de PvP-drempel', lan.hostToGuestMs);
ok(mobiel.hostToGuestMs > PVP_MAX_MS, 'op een normale internetverbinding valt de standaard buiten de PvP-drempel: aanleiding voor een PvP-stand', mobiel.hostToGuestMs);
ok(mobielPvp.hostToGuestMs < mobiel.hostToGuestMs && mobielPvp.hostToGuestMs <= PVP_MAX_MS,
  `met ${Math.round(PVP_INTERP * 1000)} ms interpolatie haalt mobiel de drempel wel`, mobielPvp.hostToGuestMs);

console.log(fails ? `${fails} FAIL` : 'netlatency_test ok');
process.exit(fails ? 1 : 0);
