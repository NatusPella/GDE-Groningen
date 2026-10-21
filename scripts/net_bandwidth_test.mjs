// Samen spelen (#95): bandbreedte per speler, gemeten aan de echte codec (net/codec.js) en de vaste frequenties (net/session.js).
// Slechtste geval: 4 spelers, het maximum van 64 voertuigen/doelen in elke snapshot. De host stuurt dat naar elke gast.
import assert from 'node:assert/strict';
import { encodeSnapshot, encodeInput, MAX_ENTITIES } from '../game/js/net/codec.js';
import { SNAP_HZ, INPUT_HZ } from '../game/js/net/session.js';

const speler = (slot) => ({ slot, x: 100.5, y: 200.25, z: 0, angle: 1.2, alive: true, inVeh: false, driver: false, run: true, health: 100, vehicle: null });
const snap = (ents) => ({ players: [0, 1, 2, 3].map(speler), shared: { money: 12345, wanted: 2, clock: 99.5 }, mission: { stage: 3, state: 'run', present: 15 }, entities: Array.from({ length: ents }, (_, i) => ({ id: i, kind: 1, x: i * 3.5, z: i * 2.5, angle: 0.5 })) });
const leeg = encodeSnapshot(1, 1, 0, snap(0)).length;
const vol = encodeSnapshot(1, 1, 0, snap(MAX_ENTITIES)).length;
const inp = encodeInput(1, 1, 0, { mx: 1, my: 0, buttons: 1, yaw: 0.3 }).length;
const NET = 1.2; // ruwe opslag voor TCP/IP- of WebRTC-kopjes en lengteprefix
const perGastNaar = (b) => b * SNAP_HZ * NET;            // host -> gast, bytes per seconde
const perGastVan = inp * INPUT_HZ * NET;                 // gast -> host
console.log(`  snapshot: ${leeg} B zonder voertuigen, ${vol} B met ${MAX_ENTITIES}; invoer ${inp} B`);
console.log(`  host -> gast: ${(perGastNaar(leeg) / 1024).toFixed(1)}..${(perGastNaar(vol) / 1024).toFixed(1)} kB/s (${(perGastNaar(vol) * 8 / 1e6).toFixed(2)} Mbit/s); gast -> host ${(perGastVan / 1024).toFixed(1)} kB/s`);
console.log(`  host met 3 gasten: ${(3 * perGastNaar(vol) * 8 / 1e6).toFixed(2)} Mbit/s omhoog in het slechtste geval; een gast 0,${Math.round(perGastNaar(vol) * 8 / 1e5)} Mbit/s omlaag`);
// een gewone thuisverbinding heeft 5-10 Mbit/s omhoog: het slechtste geval met 3 gasten moet daar ruim onder blijven
assert.ok(3 * perGastNaar(vol) * 8 / 1e6 < 2, 'host met 3 gasten blijft onder 2 Mbit/s omhoog');
assert.ok(perGastVan * 8 / 1e6 < 0.1, 'een gast stuurt minder dan 0,1 Mbit/s');
assert.ok(vol <= 1024, 'een snapshot past in één pakket (1 kB)');
console.log('net_bandwidth_test: ok');
